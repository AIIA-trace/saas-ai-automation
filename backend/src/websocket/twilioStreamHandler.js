const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const fs = require('fs');

class TwilioStreamHandler {
  constructor() {
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.conversationState = new Map();
    this.outboundAudioQueue = new Map();
    this.ttsInProgress = new Map();
    this.prisma = new PrismaClient();
    this.ttsService = azureTTSRestService;
    this.fallbackAudio = this.generateFallbackAudio(); // Audio pregenerado
    this.preConvertedAudio = new Map(); // Cache de conversiones
    this.azureToken = null; // Token reutilizable
    this.validateAzureConfig(); // Validación crítica al iniciar
  }

  /**
   * Procesar eventos de Twilio Stream - FLUJO LIMPIO
   */
  async processStreamEvent(ws, data) {
    const event = data.event;
    const streamSid = data.streamSid || data.start?.streamSid || 'unknown';
    
    logger.info(`📡 [${streamSid}] Evento: ${event}`);
    
    try {
      switch (event) {
        case 'connected':
          await this.handleStreamConnected(ws, data);
          break;
        case 'start':
          await this.handleStreamStart(ws, data);
          break;
        case 'media':
          await this.handleMediaEvent(ws, data);
          break;
        case 'stop':
          await this.handleStreamStop(ws, data);
          break;
        default:
          logger.warn(`⚠️ [${streamSid}] Evento desconocido: ${event}`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando evento ${event}: ${error.message}`);
    }
  }

  /**
   * Stream conectado - SOLO registrar conexión
   */
  async handleStreamConnected(ws, data) {
    // En el evento 'connected', streamSid no está disponible aún
    // Registramos la conexión con un ID temporal
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`✅ [${tempId}] Stream conectado - registrando temporalmente`);
    
    // Registrar con ID temporal - se actualizará en 'start'
    this.activeStreams.set(tempId, {
      ws: ws,
      tempId: tempId,
      isConnected: true,
      greetingSent: false,
      isInitializing: true
    });
    
    // También guardar referencia por WebSocket para poder encontrarlo en 'start'
    ws.tempStreamId = tempId;
    
    logger.info(`✅ [${tempId}] Stream registrado temporalmente - esperando 'start'`);
  }

  /**
   * Stream iniciado - configurar cliente Y enviar saludo UNA VEZ
   */
  async handleStreamStart(ws, data) {
    const { streamSid, callSid, customParameters } = data.start;
    const clientId = customParameters?.clientId;

    logger.info(`🎤 [${streamSid}] Iniciando stream para cliente: ${clientId}`);
    
    try {
      // Obtener configuración del cliente
      const clientConfig = await this.prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          id: true,
          callConfig: true,
          companyName: true,
          botLanguage: true
        }
      });

      if (!clientConfig) {
        logger.error(`❌ [${streamSid}] Cliente no encontrado: ${clientId}`);
        return;
      }

      // Actualizar stream con configuración
      const tempId = ws.tempStreamId;
      const streamData = this.activeStreams.get(tempId);
      
      if (!streamData) {
        logger.error(`❌ [${streamSid}] No se encontró stream temporal: ${tempId}`);
        return;
      }
      
      // Migrar de ID temporal a streamSid real
      streamData.streamSid = streamSid;
      streamData.client = clientConfig;
      streamData.isInitializing = false;
      
      // Actualizar en el Map con la clave real
      this.activeStreams.delete(tempId);
      this.activeStreams.set(streamSid, streamData);
      
      logger.info(`✅ [${streamSid}] Cliente configurado: ${clientConfig.companyName}`);
      logger.info(`🔄 [${streamSid}] Migrado desde ID temporal: ${tempId}`);
      
      // VERIFICACIÓN ESTRICTA: Solo generar saludo UNA VEZ
      if (streamData.greetingSent) {
        logger.warn(`⚠️ [${streamSid}] DUPLICADO DETECTADO - Saludo ya enviado, OMITIENDO`);
        return;
      }
      
      // Marcar ANTES de generar para evitar condiciones de carrera
      streamData.greetingSent = true;
      
      try {
        logger.info(`🔊 [${streamSid}] Generando ÚNICO saludo...`);
        await this.sendInitialGreeting(ws, { streamSid, callSid });
        logger.info(`✅ [${streamSid}] Saludo único enviado correctamente`);
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error en saludo: ${error.message}`);
        // Resetear flag si falla para permitir reintento
        streamData.greetingSent = false;
      }

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en handleStreamStart: ${error.message}`);
    }
  }

  /**
   * Generar saludo inicial - SOLO UNA VEZ POR STREAM
   */
  async sendInitialGreeting(ws, { streamSid, callSid }) {
    const streamData = this.activeStreams.get(ws.tempStreamId);
    if (!streamData?.client) {
      logger.error(`❌ [${streamSid}] Sin configuración de cliente`);
      return;
    }

    const clientConfigData = await this.prisma.client.findUnique({
      where: { id: parseInt(streamData.client.id) },
      select: {
        callConfig: {
          select: {
            greeting: true,
            lastUpdated: true
          }
        }
      }
    });

    const greeting = clientConfigData.callConfig.greeting;
    logger.info(`🔊 [${streamSid}] Using greeting from DB: "${greeting}"`);
    logger.info(`🔊 [${streamSid}] Greeting text: ${greeting}`);
    logger.info(`🔊 [${streamSid}] Greeting text: ${greeting}`);
    
    const voiceId = streamData.client.callConfig?.voiceId || 'es-ES-DarioNeural';
    
    logger.info(`🔊 [${streamSid}] Generando saludo: "${greeting.substring(0, 50)}..."`);
    
    // Verificar longitud mínima (10 caracteres)
    if (greeting.length < 10) {
      logger.warn(`⚠️ [${streamSid}] Saludo muy corto (${greeting.length} chars). Usando saludo extendido.`);
      return await this.sendExtendedGreeting(ws, streamSid, clientConfigData);
    }
    
    try {
      // 1. Reutilizar token o obtener nuevo
      if (!this.azureToken || this.azureToken.expiry < Date.now()) {
        this.azureToken = await this.ttsService.getToken();
      }

      // 2. Generar TTS con timeout de 5s
      const ttsResult = await Promise.race([
        this.ttsService.generateSpeech(greeting, voiceId, 'raw-8khz-8bit-mono-mulaw', this.azureToken),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TTS timeout')), 5000)
        )
      ]);

      // 3. Enviar directamente SIN conversiones
      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // 4. Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      await this.sendAudioToTwilio(ws, this.fallbackAudio, streamSid);
    }
  }

  async sendExtendedGreeting(ws, streamSid, clientConfigData) {
    const fallbackGreeting = "Gracias por llamar. Estamos conectándote con un asistente. Por favor, espera un momento.";
    const voiceId = clientConfigData.callConfig?.voiceId || 'es-ES-DarioNeural';
  
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback con voz: ${voiceId}`);
  
    const ttsResult = await this.ttsService.generateSpeech(
      fallbackGreeting,
      voiceId,
      'raw-8khz-8bit-mono-mulaw'
    );
  
    if (ttsResult.success) {
      // Save audio to file
      const fileName = `debug_${Date.now()}_${streamSid}.wav`;
      fs.writeFileSync(fileName, ttsResult.audioBuffer);
      logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
      
      await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
      logger.debug(`🔊 [${streamSid}] Llamada a sendRawMulawToTwilio completada (fallback)`);
    }
  }

  async sendRawMulawToTwilio(ws, mulawBuffer, streamSid) {
    logger.info("🔊 Sending audio to WebSocket");
    logger.info(`🔊 Tamaño del buffer de audio: ${mulawBuffer.length} bytes`);
    logger.info(`🔊 Primeros bytes: ${mulawBuffer.slice(0, 16).toString('hex')}`);
    
    // Ensure minimum audio length (1 second = 8000 bytes)
    if (mulawBuffer.length < 8000) {
      const padding = Buffer.alloc(8000 - mulawBuffer.length, 0xFF);
      mulawBuffer = Buffer.concat([mulawBuffer, padding]);
      logger.info(`🔊 [${streamSid}] Añadido padding de audio: ${padding.length} bytes`);
    }
    
    const chunkSize = 160;
    let offset = 0;
    let chunkCount = 0;
    const startTime = Date.now();
    
    logger.info(`🎵 [${streamSid}] Starting audio transmission (${mulawBuffer.length} bytes)`);
    
    while (offset < mulawBuffer.length) {
      const chunk = mulawBuffer.subarray(offset, offset + chunkSize);
      const base64Chunk = chunk.toString('base64');
      
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: base64Chunk }
      }));
      
      console.log('🔌 WebSocket transmission debug:', {
        timestamp: Date.now(),
        chunkSize: chunk.length,
        streamSid: streamSid,
        isConnected: ws.readyState === ws.OPEN
      });
      
      chunkCount++;
      offset += chunkSize;
    }
    
    const duration = Date.now() - startTime;
    logger.info(`✅ [${streamSid}] Audio transmission completed: ${chunkCount} chunks sent`);
  }

  generateFallbackAudio() {
    // Implementación simple de audio de fallback
    const buffer = Buffer.alloc(160, 0xff); // Silencio digital
    return buffer;
  }

  /**
   * Enviar audio a Twilio - FORMATO OPTIMIZADO
   */
  async sendAudioToTwilio(ws, audioBuffer, streamSid) {
    if (!audioBuffer || audioBuffer.length === 0) {
      logger.error(`❌ [${streamSid}] Buffer de audio vacío`);
      return;
    }

    try {
      let processedBuffer = audioBuffer;
      
      // Detectar formato y procesar si es necesario
      if (audioBuffer.length > 44) {
        const header = audioBuffer.subarray(0, 4).toString('ascii');
        
        if (header === 'RIFF') {
          // Es PCM, extraer datos y convertir a mulaw
          const dataChunkIndex = audioBuffer.indexOf('data');
          if (dataChunkIndex !== -1) {
            const pcmData = audioBuffer.subarray(dataChunkIndex + 8);
            processedBuffer = this.convertPCMToMulaw(pcmData);
            logger.info(`🔄 [${streamSid}] Convertido PCM a mulaw: ${processedBuffer.length} bytes`);
          }
        }
      }

      console.log('🔊 Audio transmission started for stream:', streamSid);
      console.log('🔊 Chunk size:', 160, 'bytes');
      console.log('🔊 Total audio length:', processedBuffer.length, 'bytes');

      logger.info("🔊 Sending audio to WebSocket");
      logger.info(`🔊 Tamaño del buffer de audio: ${processedBuffer.length} bytes`);
      logger.info(`🔊 Primeros bytes: ${processedBuffer.slice(0, 16).toString('hex')}`);
      
      // Enviar en chunks de 160 bytes (20ms de audio mulaw)
      const chunkSize = 160;
      let offset = 0;

      while (offset < processedBuffer.length) {
        const chunk = processedBuffer.subarray(offset, offset + chunkSize);
        const base64Chunk = chunk.toString('base64');
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: base64Chunk
          }
        };

        console.log('🔌 Sending chunk:', {
          size: chunk.length,
          position: offset,
          streamSid: streamSid,
          timestamp: Date.now()
        });

        console.log('🔌 WebSocket transmission debug:', {
          timestamp: Date.now(),
          chunkSize: chunk.length,
          streamSid: streamSid,
          isConnected: ws.readyState === ws.OPEN
        });

        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(JSON.stringify(mediaMessage));
        }
        
        offset += chunkSize;
      }

      logger.info(`📤 [${streamSid}] Audio enviado: ${Math.ceil(processedBuffer.length / chunkSize)} chunks`);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio: ${error.message}`);
    }
  }

  /**
   * Convertir PCM 16-bit a mulaw 8-bit
   */
  convertPCMToMulaw(pcmBuffer) {
    const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);
    
    for (let i = 0; i < pcmBuffer.length; i += 2) {
      const sample = pcmBuffer.readInt16LE(i);
      const mulawByte = this.linearToMulaw(sample);
      mulawBuffer[i / 2] = mulawByte;
    }
    
    return mulawBuffer;
  }

  /**
   * Conversión linear a mulaw
   */
  linearToMulaw(sample) {
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > MULAW_MAX) sample = MULAW_MAX;
    sample = sample + MULAW_BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const mulawByte = ~(sign | (exponent << 4) | mantissa);
    return mulawByte & 0xFF;
  }

  /**
   * Manejar eventos de media (audio del caller)
   */
  async handleMediaEvent(ws, data) {
    const streamSid = data.streamSid;
    const payload = data.media.payload;
    
    // TODO: Implementar transcripción en el futuro
    logger.debug(`🎤 [${streamSid}] Audio recibido - Transcripción pendiente de implementación`);
  }

  /**
   * Stream terminado - limpiar recursos
   */
  async handleStreamStop(ws, data) {
    const streamSid = data.streamSid;
    logger.info(`🛑 [${streamSid}] Stream terminado - limpiando recursos`);
    
    // Limpiar todos los recursos
    this.activeStreams.delete(streamSid);
    this.audioBuffers.delete(streamSid);
    this.conversationState.delete(streamSid);
    this.outboundAudioQueue.delete(streamSid);
    this.ttsInProgress.delete(streamSid);
    
    logger.info(`✅ [${streamSid}] Recursos limpiados`);
  }

  /**
   * Manejar nueva conexión
   */
  handleConnection(ws, req) {
    let ip = 'unknown';
    if (req) {
      ip = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    }
    logger.info(`🔌 Nueva conexión WebSocket desde ${ip}`);
    // Lógica básica de conexión
  }

  // Validar variables Azure
  validateAzureConfig() {
    const requiredVars = [
      'AZURE_SPEECH_KEY',
      'AZURE_SPEECH_REGION'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        logger.error(`❌ CRÍTICO: Variable de entorno ${varName} no configurada`);
        process.exit(1);
      }
    });
  }
}

module.exports = TwilioStreamHandler;
