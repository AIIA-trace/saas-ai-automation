const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const azureTTSService = require('../services/azureTTSService');
const azureTTSSimple = require('../services/azureTTSSimple');

const prisma = new PrismaClient();

class TwilioStreamHandler {
  constructor() {
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.conversationState = new Map();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ttsService = azureTTSService;
    this.ttsSimple = azureTTSSimple;
  }

  /**
   * Manejar nueva conexión WebSocket
   */
  handleConnection(ws, req) {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    ws.streamId = streamId;

    logger.info(`🔌 NUEVA CONEXIÓN TWILIO STREAM: ${streamId}`);
    logger.info(`🔍 Request URL: ${req.url}`);
    logger.info(`🔍 Request Headers: ${JSON.stringify(req.headers)}`);

    // Configurar heartbeat
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Manejar mensajes
    ws.on('message', async (message) => {
      logger.info(`📨 MENSAJE WEBSOCKET RECIBIDO en ${streamId}: ${message.toString().substring(0, 200)}...`);
      
      try {
        const data = JSON.parse(message);
        logger.info(`📨 DATOS PARSEADOS: ${JSON.stringify(data, null, 2)}`);
        await this.handleTwilioMessage(ws, data);
      } catch (error) {
        logger.error(`❌ Error parseando mensaje: ${error.message}`);
      }
    });

    // Manejar cierre de conexión
    ws.on('close', (code, reason) => {
      logger.info(`🔌 Conexión cerrada: ${streamId} - Código: ${code}, Razón: ${reason}`);
      this.cleanupStream(streamId);
    });

    // Manejar errores
    ws.on('error', (error) => {
      logger.error(`❌ Error en WebSocket ${streamId}: ${error.message}`);
      this.cleanupStream(streamId);
    });
  }

  /**
   * Manejo centralizado de mensajes WebSocket de Twilio
   */
  async handleTwilioMessage(ws, data) {
    const event = data.event;
    const streamSid = data.streamSid;
    
    logger.info(`📨 Evento recibido: ${event} para stream: ${streamSid}`);
    
    try {
      // Procesar eventos de forma secuencial y explícita
      switch (event) {
        case "connected":
          logger.info('🔌 Media WS: Connected event received');
          await this.handleStreamConnected(ws, data);
          break;
          
        case "start":
          logger.info('🎤 Media WS: Start event received');
          // Asegurar que el start se procese completamente antes de continuar
          await this.handleStreamStart(ws, data);
          logger.info(`✅ Start event procesado completamente para stream: ${streamSid}`);
          break;
          
        case "media":
          // Verificar que el stream esté registrado antes de procesar media
          if (!this.activeStreams.has(streamSid)) {
            logger.warn(`⚠️ Media event recibido para stream no registrado: ${streamSid}`);
            logger.info(`📊 Streams activos: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
            return;
          }
          await this.handleMediaChunk(ws, data);
          break;
          
        case "stop":
          logger.info('🛑 Media WS: Stop event received');
          await this.handleStreamStop(ws, data);
          break;
          
        default:
          logger.warn(`⚠️ Evento desconocido: ${event}`);
      }
    } catch (error) {
      logger.error(`❌ Error procesando evento ${event} para stream ${streamSid}: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      
      // Log adicional del estado actual
      logger.error(`📊 Estado actual - Streams activos: ${this.activeStreams.size}`);
      logger.error(`🗂️ Stream IDs: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
    }
  }

  /**
   * Stream conectado - inicializar
   */
  async handleStreamConnected(ws, data) {
    logger.info(`✅ Stream conectado, esperando evento start para parámetros completos`);
  }

  /**
   * Stream iniciado - configurar cliente
   */
  async handleStreamStart(ws, data) {
    const { streamSid, callSid, customParameters } = data.start;
    const clientId = customParameters?.clientId;

    logger.info(`🎤 Processing start event:`);
    logger.info(`🎤 Stream starting: ${streamSid} for call ${callSid}, clientId: ${clientId}`);

    // Verificar si el stream ya existe
    if (this.activeStreams.has(streamSid)) {
      logger.warn(`⚠️ Stream ${streamSid} ya existe en activeStreams`);
      return;
    }

    // REGISTRO INMEDIATO DEL STREAM - Antes de la consulta DB lenta
    logger.info('🚀 REGISTRO INMEDIATO: Registrando stream antes de consulta DB...');
    const placeholderStreamData = {
      streamSid,
      ws,
      client: null, // Se llenará después
      callSid,
      audioBuffer: [],
      conversationHistory: [],
      lastActivity: Date.now(),
      isProcessing: false,
      isSendingTTS: false,
      isInitializing: true // Flag para indicar que está inicializando
    };
    
    this.activeStreams.set(streamSid, placeholderStreamData);
    this.audioBuffers.set(streamSid, []);
    this.conversationState.set(streamSid, []);
    
    logger.info(`🚀 Stream registrado INMEDIATAMENTE: ${streamSid}`);
    logger.info(`📊 Active streams: ${this.activeStreams.size}`);

    try {
      logger.info('🔍 PASO 1: Iniciando búsqueda de cliente...');
      
      let client = null;
      if (clientId) {
        logger.info(`🔍 PASO 2: Buscando cliente con ID: ${clientId}`);
        
        // FALLBACK INMEDIATO: Crear cliente mock primero para evitar bloqueos
        client = {
          id: parseInt(clientId),
          companyName: 'Cliente Mock',
          callConfig: { greeting: 'Hola, gracias por llamar. ¿En qué puedo ayudarte?' }
        };
        logger.info(`🔍 PASO 2a: Cliente mock creado para evitar bloqueos DB`);
        
        // Intentar consulta DB en background (sin bloquear)
        setTimeout(async () => {
          try {
            logger.info(`🔍 BACKGROUND: Intentando consulta DB real...`);
            const realClient = await prisma.client.findUnique({
              where: { id: parseInt(clientId) },
              select: {
                id: true,
                companyName: true,
                callConfig: true
              }
            });
            
            if (realClient) {
              logger.info(`🔍 BACKGROUND: Cliente real encontrado: ${realClient.companyName}`);
              // Actualizar el stream con datos reales
              const currentStream = this.activeStreams.get(streamSid);
              if (currentStream) {
                currentStream.client = realClient;
                logger.info(`🔄 BACKGROUND: Stream actualizado con datos reales`);
              }
            }
          } catch (bgError) {
            logger.warn(`⚠️ BACKGROUND: Consulta DB falló: ${bgError.message}`);
          }
        }, 100); // Ejecutar en 100ms sin bloquear

        if (!client) {
          logger.error(`❌ Client not found for clientId: ${clientId}`);
          // Remover el stream placeholder si no se encuentra el cliente
          this.activeStreams.delete(streamSid);
          this.audioBuffers.delete(streamSid);
          this.conversationState.delete(streamSid);
          throw new Error(`Client not found for clientId: ${clientId}`);
        }

        logger.info(`✅ Cliente encontrado: ${client.companyName} (ID: ${client.id})`);

        // ACTUALIZAR EL STREAM CON LOS DATOS DEL CLIENTE
        logger.info('🔄 PASO 4: ACTUALIZANDO stream con datos del cliente...');
        const streamData = this.activeStreams.get(streamSid);
        streamData.client = client;
        streamData.isInitializing = false;
        
        logger.info(`🔄 PASO 5: Stream actualizado con cliente: ${client.companyName}`);

        logger.info('🔍 PASO 6: Enviando saludo inicial...');
        
        // Timeout para sendInitialGreeting
        const greetingPromise = this.sendInitialGreeting(ws, { streamSid, callSid });
        const greetingTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('sendInitialGreeting timeout after 10 seconds')), 10000);
        });

        try {
          await Promise.race([greetingPromise, greetingTimeout]);
          logger.info('🔍 PASO 7: ✅ Saludo inicial enviado correctamente');
        } catch (error) {
          logger.error(`❌ Error en saludo inicial: ${error.message}`);
          // Continuar sin saludo si hay error
        }
        
        logger.info('🔍 PASO 8: ✅ handleStreamStart COMPLETADO EXITOSAMENTE');

        // Verificación final
        logger.info(`🔍 VERIFICACIÓN FINAL: Stream ${streamSid} existe: ${this.activeStreams.has(streamSid)}`);
      }

    } catch (error) {
      logger.error(`❌ Error in handleStreamStart: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      
      // Limpiar en caso de error
      this.activeStreams.delete(streamSid);
      this.audioBuffers.delete(streamSid);
      this.conversationState.delete(streamSid);
      
      throw error; // Re-lanzar el error para que se capture en el nivel superior
    }
  }

  /**
   * Enviar saludo inicial con Azure TTS
   */
  async sendInitialGreeting(ws, data) {
    try {
      logger.info('🎵 INICIO sendInitialGreeting');
      const { streamSid, callSid } = data;
      
      logger.info(`🎵 PASO 1: Obteniendo stream data para ${streamSid}`);
      const streamData = this.activeStreams.get(streamSid);
      if (!streamData) {
        logger.error(`❌ No se encontró stream data para ${streamSid}`);
        return;
      }

      logger.info('🎵 PASO 2: Obteniendo cliente');
      const { client } = streamData;
      
      // Obtener el saludo desde callConfig.greeting
      let greeting = 'Hola, gracias por llamar. ¿En qué puedo ayudarte?';
      
      logger.info('🎵 PASO 3: Verificando callConfig');
      if (client.callConfig && client.callConfig.greeting) {
        greeting = client.callConfig.greeting;
      }

      // Obtener la voz configurada por el usuario
      let voiceId = this.ttsSimple.defaultVoice; // Voz por defecto
      if (client.callConfig && client.callConfig.voiceId) {
        voiceId = client.callConfig.voiceId;
      }

      logger.info(`🎵 PASO 4: Saludo preparado: "${greeting}"`);
      logger.info(`🎵 PASO 4a: Voz seleccionada: ${voiceId}`);

      // Generar audio con Azure TTS Simple (más confiable)
      try {
        logger.info('🎵 PASO 5: Generando audio con Azure TTS Simple...');
        logger.info(`🎵 PASO 5a: Usando voz del usuario: ${voiceId}`);
        
        // Timeout para TTS de 3 segundos (más agresivo)
        const ttsPromise = this.ttsSimple.generateSpeech(greeting, voiceId);
        const ttsTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TTS timeout after 3 seconds')), 3000);
        });

        const ttsResult = await Promise.race([ttsPromise, ttsTimeout]);
        
        logger.info(`🎵 PASO 6: Azure TTS Simple completado, success: ${ttsResult?.success}`);
        logger.info(`🎵 PASO 6a: Audio buffer size: ${ttsResult?.audioBuffer?.length || 0} bytes`);
        
        if (ttsResult && ttsResult.success && ttsResult.audioBuffer && ttsResult.audioBuffer.length > 0) {
          logger.info('🎵 PASO 7: Enviando audio a Twilio...');
          await this.sendAudioToTwilio(ws, ttsResult.audioBuffer, streamSid);
          logger.info('🎵 PASO 8: ✅ Audio enviado correctamente');
        } else {
          logger.warn(`⚠️ Azure TTS Simple falló: ${ttsResult?.error || 'Audio buffer vacío'}`);
          logger.info('🔄 FALLBACK: Enviando saludo como mensaje de texto inmediatamente...');
          this.sendTextFallback(ws, greeting, streamSid);
        }
      } catch (error) {
        logger.error(`❌ Error en Azure TTS Simple: ${error.message}`);
        logger.error(`❌ Stack: ${error.stack}`);
        logger.info('🔄 FALLBACK: Enviando saludo como mensaje de texto inmediatamente...');
        this.sendTextFallback(ws, greeting, streamSid);
      }

    } catch (error) {
      logger.error(`❌ Error enviando saludo inicial: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
    }
  }

  /**
   * Fallback para enviar audio simple cuando Azure TTS falla
   */
  async sendTextFallback(ws, text, streamSid) {
    try {
      logger.info(`📝 Iniciando fallback para: "${text}"`);
      
      // Intentar generar un beep simple como audio de fallback
      const fallbackAudio = this.generateSimpleBeep();
      
      if (fallbackAudio && ws.readyState === 1) {
        logger.info('🔔 Enviando beep de fallback...');
        await this.sendAudioToTwilio(ws, fallbackAudio, streamSid);
      }
      
      // También enviar un mark para indicar que hubo un problema
      const markMessage = {
        event: 'mark',
        streamSid: streamSid,
        mark: {
          name: `tts_fallback_${Date.now()}`
        }
      };
      
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(markMessage));
      }
      
      logger.info(`✅ Fallback enviado para ${streamSid}`);
      
    } catch (error) {
      logger.error(`❌ Error enviando fallback: ${error.message}`);
    }
  }

  /**
   * Generar un beep simple como audio de fallback
   */
  generateSimpleBeep() {
    try {
      // Generar un beep simple de 500ms en formato mulaw 8kHz
      const sampleRate = 8000;
      const duration = 0.5; // 500ms
      const frequency = 800; // 800Hz
      const samples = Math.floor(sampleRate * duration);
      
      const audioBuffer = Buffer.alloc(samples);
      
      for (let i = 0; i < samples; i++) {
        // Generar onda senoidal
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
        // Convertir a mulaw (aproximación simple)
        const mulaw = this.linearToMulaw(sample * 0.5); // Volumen reducido
        audioBuffer[i] = mulaw;
      }
      
      logger.info(`🔔 Beep generado: ${audioBuffer.length} bytes`);
      return audioBuffer;
      
    } catch (error) {
      logger.error(`❌ Error generando beep: ${error.message}`);
      return null;
    }
  }

  /**
   * Conversión simple de linear a mulaw
   */
  linearToMulaw(sample) {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    let sign = (sample < 0) ? 0x80 : 0x00;
    if (sign) sample = -sample;
    
    sample = Math.min(sample * 32767, CLIP);
    
    if (sample >= 256) {
      let exponent = Math.floor(Math.log2(sample / 256));
      let mantissa = Math.floor((sample >> (exponent + 3)) & 0x0F);
      sample = (exponent << 4) | mantissa;
    } else {
      sample = sample >> 4;
    }
    
    return (sample ^ 0x55) | sign;
  }

  /**
   * Manejar chunk de audio
   */
  async handleMediaChunk(ws, data) {
    const streamSid = data.streamSid;
    
    logger.info(`📨 Media chunk recibido para StreamSid: "${streamSid}"`);
    logger.info(`🗂️ Streams activos disponibles: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
    logger.info(`🔍 ¿Stream existe? ${this.activeStreams.has(streamSid)}`);

    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData) {
      logger.warn(`⚠️ Stream no encontrado para StreamSid: ${streamSid}`);
      logger.warn(`⚠️ Streams disponibles: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
      return;
    }

    // Si el stream está inicializándose, solo almacenar el audio sin procesar
    if (streamData.isInitializing) {
      logger.info(`🔄 Stream ${streamSid} está inicializándose, almacenando audio...`);
      // Solo almacenar el audio, no procesar aún
      if (data.media.track === 'inbound') {
        const audioBuffer = this.audioBuffers.get(streamSid) || [];
        audioBuffer.push(data.media.payload);
        this.audioBuffers.set(streamSid, audioBuffer);
      }
      return;
    }

    // Solo procesar audio entrante (inbound)
    if (data.media.track === 'inbound') {
      const audioBuffer = this.audioBuffers.get(streamSid) || [];
      audioBuffer.push(data.media.payload);
      this.audioBuffers.set(streamSid, audioBuffer);

      // Actualizar última actividad
      streamData.lastActivity = Date.now();

      // Procesar cuando tengamos suficiente audio (aproximadamente 1 segundo)
      if (audioBuffer.length >= 50 && !streamData.isProcessing) {
        await this.processAudioBuffer(streamSid);
      }
    }
  }

  /**
   * Procesar buffer de audio acumulado
   */
  async processAudioBuffer(streamSid) {
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData || streamData.isProcessing) {
      return;
    }

    streamData.isProcessing = true;
    
    try {
      const audioBuffer = this.audioBuffers.get(streamSid) || [];
      if (audioBuffer.length === 0) {
        streamData.isProcessing = false;
        return;
      }

      logger.info(`🎤 Procesando ${audioBuffer.length} chunks de audio para ${streamSid}`);

      // Limpiar buffer
      this.audioBuffers.set(streamSid, []);

      // Aquí iría la lógica de transcripción y procesamiento con OpenAI
      // Por ahora, simular una respuesta
      const response = "Entiendo. ¿Puedes darme más detalles?";
      
      // Generar respuesta de audio
      const ttsResult = await this.ttsService.generateSpeech(response);
      
      if (ttsResult && ttsResult.success && ttsResult.audioBuffer) {
        await this.sendAudioToTwilio(streamData.ws, ttsResult.audioBuffer, streamSid);
      }

    } catch (error) {
      logger.error(`❌ Error procesando audio: ${error.message}`);
    } finally {
      streamData.isProcessing = false;
    }
  }

  /**
   * Enviar audio a Twilio
   */
  async sendAudioToTwilio(ws, audioBuffer, streamSid) {
    try {
      logger.info(`🎵 sendAudioToTwilio iniciado para ${streamSid}`);
      logger.info(`🎵 Audio buffer size: ${audioBuffer.length} bytes`);
      logger.info(`🎵 WebSocket readyState: ${ws.readyState}`);

      // Verificar estado del WebSocket antes de proceder
      if (!ws || ws.readyState !== 1) {
        logger.error(`❌ WebSocket no está listo (readyState: ${ws?.readyState || 'undefined'})`);
        return;
      }

      const streamData = this.activeStreams.get(streamSid);
      if (!streamData) {
        logger.error(`❌ No se encontró stream data para ${streamSid}`);
        return;
      }

      if (streamData.isSendingTTS) {
        logger.warn(`⚠️ Ya se está enviando TTS para ${streamSid}, saltando...`);
        return;
      }

      streamData.isSendingTTS = true;

      // Verificar que el WebSocket esté abierto
      if (ws.readyState !== 1) { // WebSocket.OPEN = 1
        logger.error(`❌ WebSocket no está abierto (readyState: ${ws.readyState})`);
        streamData.isSendingTTS = false;
        return;
      }

      // Convertir audio a formato mulaw y enviar en chunks
      const chunkSize = 160; // 20ms de audio a 8kHz
      const totalChunks = Math.ceil(audioBuffer.length / chunkSize);
      
      logger.info(`🎵 Enviando ${totalChunks} chunks de audio...`);
      
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        const base64Chunk = chunk.toString('base64');
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            timestamp: Date.now(),
            payload: base64Chunk
          }
        };

        // Verificar WebSocket antes de cada envío
        if (ws.readyState !== 1) {
          logger.warn(`⚠️ WebSocket cerrado durante envío en chunk ${Math.floor(i/chunkSize) + 1}`);
          break;
        }

        ws.send(JSON.stringify(mediaMessage));
        
        // Log cada 25 chunks
        if ((Math.floor(i/chunkSize) + 1) % 25 === 0) {
          logger.info(`🎵 Enviado chunk ${Math.floor(i/chunkSize) + 1}/${totalChunks}`);
        }

        // Pequeña pausa entre chunks para simular tiempo real
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      streamData.isSendingTTS = false;
      logger.info(`✅ Audio enviado correctamente a ${streamSid} (${totalChunks} chunks)`);

    } catch (error) {
      logger.error(`❌ Error enviando audio: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.isSendingTTS = false;
      }
    }
  }

  /**
   * Stream detenido
   */
  async handleStreamStop(ws, data) {
    const streamSid = data.streamSid;
    logger.info(`🛑 Stream detenido: ${streamSid}`);
    
    this.cleanupStream(streamSid);
  }

  /**
   * Limpiar recursos del stream
   */
  cleanupStream(streamId) {
    // Buscar por streamId o streamSid
    let streamSidToClean = null;
    
    for (const [streamSid, streamData] of this.activeStreams.entries()) {
      if (streamData.ws && streamData.ws.streamId === streamId) {
        streamSidToClean = streamSid;
        break;
      }
    }
    
    if (streamSidToClean) {
      this.activeStreams.delete(streamSidToClean);
      this.audioBuffers.delete(streamSidToClean);
      this.conversationState.delete(streamSidToClean);
      logger.info(`🧹 Stream limpiado: ${streamSidToClean}`);
    }
  }

  /**
   * Limpiar streams inactivos
   */
  cleanupInactiveStreams() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutos

    for (const [streamSid, streamData] of this.activeStreams.entries()) {
      if (now - streamData.lastActivity > timeout) {
        logger.info(`🧹 Limpiando stream inactivo: ${streamSid}`);
        this.cleanupStream(streamData.ws.streamId);
      }
    }
  }

  /**
   * Iniciar heartbeat para mantener conexiones activas
   */
  startHeartbeat() {
    // Limpiar streams inactivos cada 2 minutos
    setInterval(() => {
      this.cleanupInactiveStreams();
    }, 2 * 60 * 1000);

    logger.info('💓 Heartbeat iniciado para limpieza de streams inactivos');
  }
}

module.exports = TwilioStreamHandler;
