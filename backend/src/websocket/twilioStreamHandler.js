const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');

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
    const streamSid = data.streamSid;
    logger.info(`✅ [${streamSid}] Stream conectado - registrando`);
    
    // SOLO registrar el stream - NO hacer nada más
    this.activeStreams.set(streamSid, {
      ws: ws,
      streamSid: streamSid,
      isConnected: true,
      greetingSent: false,
      isInitializing: true
    });
    
    logger.info(`✅ [${streamSid}] Stream registrado - esperando 'start'`);
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
        include: { callConfig: true }
      });

      if (!clientConfig) {
        logger.error(`❌ [${streamSid}] Cliente no encontrado: ${clientId}`);
        return;
      }

      // Actualizar stream con configuración
      const streamData = this.activeStreams.get(streamSid);
      streamData.client = clientConfig;
      streamData.isInitializing = false;
      
      logger.info(`✅ [${streamSid}] Cliente configurado: ${clientConfig.company_name}`);

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
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData?.client) {
      logger.error(`❌ [${streamSid}] Sin configuración de cliente`);
      return;
    }

    const clientConfig = await this.prisma.client.findUnique({
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

    const greeting = clientConfig.callConfig.greeting;
    const voiceId = streamData.client.callConfig?.voiceId || 'es-ES-DarioNeural';
    
    logger.info(`🔊 [${streamSid}] Generando saludo: "${greeting.substring(0, 50)}..."`);
    
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
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // 4. Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      await this.sendAudioToTwilio(ws, this.fallbackAudio, streamSid);
    }
  }

  async sendRawMulawToTwilio(ws, mulawBuffer, streamSid) {
    const chunkSize = 160;
    let offset = 0;

    while (offset < mulawBuffer.length) {
      const chunk = mulawBuffer.subarray(offset, offset + chunkSize);
      const base64Chunk = chunk.toString('base64');
      
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: base64Chunk }
      }));
      
      offset += chunkSize;
    }
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
    logger.info(`🔌 Nueva conexión WebSocket desde ${req.socket.remoteAddress}`);
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
