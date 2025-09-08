const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const azureTTSService = require('../services/azureTTSService');

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
    logger.info('🎤 Processing start event:', JSON.stringify(data, null, 2));
    
    const streamSid = data.streamSid;
    const callSid = data.start?.callSid;
    const customParameters = data.start?.customParameters || {};
    const clientId = customParameters.clientId;

    if (!streamSid) {
      logger.error('❌ No streamSid found in start event');
      throw new Error('No streamSid found in start event');
    }

    logger.info(`🎤 Stream starting: ${streamSid} for call ${callSid}, clientId: ${clientId}`);

    // Verificar si el stream ya existe (evitar duplicados)
    if (this.activeStreams.has(streamSid)) {
      logger.warn(`⚠️ Stream ${streamSid} ya existe en activeStreams`);
      return;
    }

    try {
      logger.info('🔍 PASO 1: Iniciando búsqueda de cliente...');
      
      let client = null;
      if (clientId) {
        logger.info(`🔍 PASO 2: Buscando cliente con ID: ${clientId}`);
        client = await prisma.client.findUnique({
          where: { id: parseInt(clientId) },
          include: { twilioNumbers: true, callConfig: true }
        });
        logger.info(`🔍 PASO 3: Cliente encontrado: ${client ? 'SÍ' : 'NO'}`);
        if (client) {
          logger.info(`🔍 PASO 3b: Cliente: ${client.companyName}, callConfig: ${client.callConfig ? 'SÍ' : 'NO'}`);
        }
      }

      if (!client) {
        logger.error(`❌ Client not found for clientId: ${clientId}`);
        throw new Error(`Client not found for clientId: ${clientId}`);
      }

      logger.info(`✅ Client found: ${client.companyName} (ID: ${client.id})`);

      logger.info('🔍 PASO 4: Creando streamData...');
      const streamData = {
        streamSid,
        ws,
        client,
        callSid,
        audioBuffer: [],
        conversationHistory: [],
        lastActivity: Date.now(),
        isProcessing: false,
        isSendingTTS: false
      };
      logger.info('🔍 PASO 4b: streamData creado correctamente');

      logger.info('🔍 PASO 5: Registrando stream en activeStreams...');
      logger.info(`🔍 PASO 5a: Antes del registro - activeStreams.size: ${this.activeStreams.size}`);
      
      this.activeStreams.set(streamSid, streamData);
      this.audioBuffers.set(streamSid, []);
      this.conversationState.set(streamSid, []);

      logger.info(`🔍 PASO 5b: Después del registro - activeStreams.size: ${this.activeStreams.size}`);
      logger.info(`🔍 PASO 5c: Verificando si existe: ${this.activeStreams.has(streamSid)}`);
      
      // Verificación adicional inmediata
      const retrievedStream = this.activeStreams.get(streamSid);
      logger.info(`🔍 PASO 5d: Stream recuperado: ${retrievedStream ? 'SÍ' : 'NO'}`);

      logger.info(`✅ Stream registered: ${streamSid}`);
      logger.info(`📊 Active streams: ${this.activeStreams.size}`);
      logger.info(`🗂️ Stream IDs: [${Array.from(this.activeStreams.keys()).join(', ')}]`);

      logger.info('🔍 PASO 6: Enviando saludo inicial...');
      await this.sendInitialGreeting(ws, { streamSid, callSid });
      
      logger.info('🔍 PASO 7: ✅ handleStreamStart COMPLETADO EXITOSAMENTE');

      // Verificación final
      logger.info(`🔍 VERIFICACIÓN FINAL: Stream ${streamSid} existe: ${this.activeStreams.has(streamSid)}`);

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
      const { streamSid, callSid } = data;
      
      const streamData = this.activeStreams.get(streamSid);
      if (!streamData) {
        logger.error(`❌ No se encontró stream data para ${streamSid}`);
        return;
      }

      const { client } = streamData;
      
      // Obtener el saludo desde callConfig.greeting
      let greeting = 'Hola, gracias por llamar. ¿En qué puedo ayudarte?';
      
      if (client.callConfig && client.callConfig.greeting) {
        greeting = client.callConfig.greeting;
      }

      logger.info(`🎵 Enviando saludo inicial: "${greeting}"`);

      // Generar audio con Azure TTS
      const audioBuffer = await this.ttsService.synthesizeSpeech(greeting);
      
      if (audioBuffer) {
        // Enviar audio a Twilio
        await this.sendAudioToTwilio(ws, audioBuffer, streamSid);
        logger.info(`✅ Saludo inicial enviado correctamente`);
      } else {
        logger.error(`❌ No se pudo generar audio para el saludo`);
      }

    } catch (error) {
      logger.error(`❌ Error enviando saludo inicial: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
    }
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
      logger.warn(`⚠️ Comparando "${streamSid}" con streams disponibles:`);
      Array.from(this.activeStreams.keys()).forEach(key => {
        logger.warn(`   - "${key}" === "${streamSid}": ${key === streamSid}`);
      });
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
      const responseAudio = await this.ttsService.synthesizeSpeech(response);
      
      if (responseAudio) {
        await this.sendAudioToTwilio(streamData.ws, responseAudio, streamSid);
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
      const streamData = this.activeStreams.get(streamSid);
      if (!streamData || streamData.isSendingTTS) {
        return;
      }

      streamData.isSendingTTS = true;

      // Convertir audio a formato mulaw y enviar en chunks
      const chunkSize = 160; // 20ms de audio a 8kHz
      
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        const base64Chunk = chunk.toString('base64');
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: base64Chunk
          }
        };

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(mediaMessage));
        }

        // Pequeña pausa entre chunks
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      streamData.isSendingTTS = false;
      logger.info(`✅ Audio enviado correctamente a ${streamSid}`);

    } catch (error) {
      logger.error(`❌ Error enviando audio: ${error.message}`);
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
