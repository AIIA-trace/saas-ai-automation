const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const { AzureTTSService } = require('../services/azureTTSService');

const prisma = new PrismaClient();

class TwilioStreamHandler {
  constructor() {
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.conversationState = new Map();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ttsService = new AzureTTSService();
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
   * Manejar eventos de Twilio Stream
   */
  async handleTwilioMessage(ws, data) {
    const event = data.event;
    
    try {
      if (event === "connected") {
        logger.info('🔌 Media WS: Connected event received');
        await this.handleStreamConnected(ws, data);
      }
      
      if (event === "start") {
        logger.info('🎤 Media WS: Start event received');
        await this.handleStreamStart(ws, data);
      }
      
      if (event === "media") {
        await this.handleMediaChunk(ws, data);
      }
      
      if (event === "stop") {
        logger.info('🛑 Media WS: Stop event received');
        await this.handleStreamStop(ws, data);
      }
    } catch (error) {
      logger.error(`❌ Error procesando evento ${event}: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
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
      return;
    }

    logger.info(`🎤 Stream starting: ${streamSid} for call ${callSid}, clientId: ${clientId}`);

    try {
      // Find client in database
      let client = null;
      
      if (clientId) {
        client = await prisma.client.findUnique({
          where: { id: parseInt(clientId) },
          include: {
            twilioNumbers: true,
            callConfig: true
          }
        });
      }

      if (!client) {
        logger.error(`❌ Client not found for clientId: ${clientId}`);
        return;
      }

      logger.info(`✅ Client found: ${client.companyName} (ID: ${client.id})`);

      // Store stream data
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

      this.activeStreams.set(streamSid, streamData);
      this.audioBuffers.set(streamSid, []);
      this.conversationState.set(streamSid, []);

      logger.info(`✅ Stream registered: ${streamSid}`);
      logger.info(`📊 Active streams: ${this.activeStreams.size}`);
      logger.info(`🗂️ Stream IDs: [${Array.from(this.activeStreams.keys()).join(', ')}]`);

      // Send initial greeting
      await this.sendInitialGreeting(ws, { streamSid, callSid });

    } catch (error) {
      logger.error(`❌ Error in handleStreamStart: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
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
}

module.exports = TwilioStreamHandler;
