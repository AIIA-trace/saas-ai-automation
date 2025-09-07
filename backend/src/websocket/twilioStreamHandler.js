const WebSocket = require('ws');
const logger = require('../utils/logger');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const AzureTTSStreaming = require('../services/azureTTSStreaming');
const RealtimeTranscription = require('../services/realtimeTranscription');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const azureTTS = new AzureTTSStreaming();
const transcriptionService = new RealtimeTranscription();

class TwilioStreamHandler {
  constructor() {
    this.activeStreams = new Map(); // CallSid -> StreamData
    this.audioBuffers = new Map(); // CallSid -> Buffer chunks
    this.conversationState = new Map(); // CallSid -> conversation history
  }

  /**
   * Configurar nueva conexión WebSocket
   */
  handleConnection(ws, req) {
    const streamId = this.generateStreamId();
    ws.streamId = streamId;
    
    // Extraer parámetros de la URL del WebSocket
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;
    
    // Obtener parámetros del TwiML
    ws.callSid = params.get('callSid');
    ws.clientId = params.get('clientId');
    ws.companyName = params.get('companyName');
    ws.language = params.get('language');
    
    logger.info(`🔌 Nueva conexión WebSocket: ${streamId}`);
    logger.info(`📋 Parámetros WebSocket: CallSid=${ws.callSid}, ClientId=${ws.clientId}, Company=${ws.companyName}`);

    ws.streamId = streamId;
    ws.isAlive = true;

    // Heartbeat para mantener conexión
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Manejar mensajes de Twilio
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await this.handleTwilioMessage(ws, data);
      } catch (error) {
        logger.error(`❌ Error procesando mensaje WebSocket: ${error.message}`);
      }
    });

    // Limpiar al cerrar conexión
    ws.on('close', () => {
      this.cleanupStream(ws.streamId);
      logger.info(`🔌 Conexión WebSocket cerrada: ${streamId}`);
    });

    ws.on('error', (error) => {
      logger.error(`❌ Error WebSocket ${streamId}: ${error.message}`);
      this.cleanupStream(ws.streamId);
    });
  }

  /**
   * Procesar mensajes de Twilio Streams
   */
  async handleTwilioMessage(ws, data) {
    // Debug: log todos los mensajes que llegan
    logger.info(`📡 Mensaje WebSocket recibido:`, JSON.stringify(data, null, 2));
    
    const { event, streamSid, callSid } = data;
    logger.info(`📡 Evento: ${event}, StreamSid: ${streamSid}, CallSid: ${callSid}`);

    switch (event) {
      case 'connected':
        await this.handleStreamConnected(ws, data);
        break;
      
      case 'start':
        await this.handleStreamStart(ws, data);
        break;
      
      case 'media':
        await this.handleMediaChunk(ws, data);
        break;
      
      case 'stop':
        await this.handleStreamStop(ws, data);
        break;
      
      default:
        logger.debug(`📡 Evento WebSocket no manejado: ${event}`);
    }
  }

  /**
   * Stream conectado - inicializar (MOVER TODA LA LÓGICA AQUÍ)
   */
  async handleStreamConnected(ws, data) {
    const { streamSid } = data;
    logger.info(`✅ Stream conectado: ${streamSid}`);
    
    // Como el evento 'start' no llega, obtener CallSid desde el WebSocket o usar streamSid
    // El CallSid se pasa desde el TwiML como parámetro
    const callSid = ws.callSid || streamSid; // Fallback al streamSid si no hay CallSid
    
    logger.info(`🎤 Inicializando stream: ${streamSid} para llamada ${callSid}`);
    
    try {
      // Obtener datos completos del cliente usando el clientId
      if (!ws.clientId) {
        logger.error(`❌ No se encontró clientId en parámetros WebSocket`);
        return;
      }
      
      const clientData = await prisma.client.findUnique({
        where: { id: parseInt(ws.clientId) }
      });
      
      if (!clientData) {
        logger.error(`❌ Cliente no encontrado para ID: ${ws.clientId}`);
        return;
      }
      
      // Inicializar estado del stream
      this.activeStreams.set(callSid, {
        streamSid,
        callSid,
        clientId: clientData.id,
        clientData: clientData,
        callerNumber: ws.callerNumber,
        twilioNumber: ws.twilioNumber,
        ws,
        startTime: Date.now(),
        lastActivity: Date.now()
      });

      this.audioBuffers.set(callSid, []);
      this.conversationState.set(callSid, []);

      logger.info(`✅ Cliente identificado: ${clientData.companyName} (ID: ${clientData.id})`);

      // Enviar saludo inicial inmediatamente
      await this.sendInitialGreeting(ws, { streamSid, callSid });

    } catch (error) {
      logger.error(`❌ Error configurando stream: ${error.message}`);
    }
  }

  /**
   * Stream iniciado - configurar cliente
   */
  async handleStreamStart(ws, data) {
    const { streamSid } = data;
    
    // Debug: log completo del evento start para verificar estructura
    logger.info(`🔍 Evento start completo:`, JSON.stringify(data, null, 2));
    logger.info(`🔍 data.start:`, JSON.stringify(data.start, null, 2));
    logger.info(`🔍 Todas las keys en data:`, Object.keys(data));
    
    // Intentar múltiples formas de extraer los datos
    const startData = data.start || data;
    const twilioNumber = startData.to || data.to;
    const callerNumber = startData.from || data.from;
    const customParameters = startData.customParameters || data.customParameters;
    
    // Obtener CallSid desde parámetros personalizados o desde data
    const callSid = customParameters?.callSid || data.callSid || streamSid;

    logger.info(`🎤 Stream iniciado: ${streamSid} para llamada ${callSid}`);
    logger.info(`📞 ${callerNumber || 'undefined'} → ${twilioNumber || 'undefined'}`);

    try {
      // Buscar cliente por número de Twilio usando la tabla correcta
      const twilioNumberRecord = await prisma.twilioNumber.findFirst({
        where: { 
          phoneNumber: twilioNumber,
          status: 'active'
        },
        include: { client: true }
      });

      if (!twilioNumberRecord || !twilioNumberRecord.client) {
        logger.error(`❌ Cliente no encontrado para número: ${twilioNumber}`);
        return;
      }

      const client = twilioNumberRecord.client;

      // Inicializar estado del stream
      this.activeStreams.set(callSid, {
        streamSid,
        callSid,
        clientId: client.id,
        clientData: client,
        callerNumber,
        twilioNumber,
        ws,
        startTime: Date.now(),
        lastActivity: Date.now()
      });

      this.audioBuffers.set(callSid, []);
      this.conversationState.set(callSid, []);

      logger.info(`✅ Cliente identificado: ${client.companyName} (ID: ${client.id})`);

      // Ahora que tenemos el CallSid y el cliente configurado, enviar saludo inicial
      await this.sendInitialGreeting(ws, { streamSid, callSid });

    } catch (error) {
      logger.error(`❌ Error configurando stream: ${error.message}`);
    }
  }

  /**
   * Enviar saludo inicial con Azure TTS (OPCIONAL - ya se reprodujo en TwiML)
   */
  async sendInitialGreeting(ws, data) {
    try {
      const { streamSid, callSid } = data;
      
      // Obtener datos del stream para acceder al cliente
      const streamData = this.activeStreams.get(callSid);
      if (!streamData) {
        logger.warn(`⚠️ Stream no encontrado para CallSid: ${callSid}`);
        return;
      }
      
      logger.info(`🎵 Saludo inicial ya reproducido en TwiML para CallSid: ${callSid}`);
      logger.info(`🔌 WebSocket listo para conversación interactiva`);
      
      // NO enviar saludo duplicado - ya se reprodujo en el <Say> del TwiML
      
    } catch (error) {
      logger.error(`❌ Error en configuración inicial: ${error.message}`);
    }
  }

  /**
   * Procesar chunk de audio del usuario
   */
  async handleMediaChunk(ws, data) {
    const { streamSid, media } = data;
    
    // Buscar el CallSid correspondiente al streamSid
    let callSid = null;
    for (const [cid, streamData] of this.activeStreams.entries()) {
      if (streamData.streamSid === streamSid) {
        callSid = cid;
        break;
      }
    }
    
    if (!callSid || !this.activeStreams.has(callSid)) {
      logger.warn(`⚠️ Stream no encontrado para StreamSid: ${streamSid}`);
      return;
    }

    // Decodificar audio base64
    const audioChunk = Buffer.from(media.payload, 'base64');
    
    // Acumular chunks de audio
    const buffer = this.audioBuffers.get(callSid) || [];
    buffer.push(audioChunk);
    this.audioBuffers.set(callSid, buffer);

    // Actualizar actividad
    const streamData = this.activeStreams.get(callSid);
    streamData.lastActivity = Date.now();

    // Procesar cuando tengamos suficiente audio (ej: 1 segundo)
    const totalSize = buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalSize > 8000) { // ~1 segundo de audio a 8kHz
      await this.processAudioBuffer(callSid);
    }
  }

  /**
   * Procesar buffer de audio acumulado
   */
  async processAudioBuffer(callSid) {
    const buffer = this.audioBuffers.get(callSid);
    const streamData = this.activeStreams.get(callSid);

    if (!buffer || !streamData) return;

    try {
      // Combinar chunks en un solo buffer
      const audioData = Buffer.concat(buffer);
      
      // Limpiar buffer
      this.audioBuffers.set(callSid, []);

      // Transcribir con Whisper
      const transcription = await this.transcribeAudio(audioData);
      
      if (transcription && transcription.trim()) {
        logger.info(`🎤 Transcripción: "${transcription}"`);
        
        // Generar respuesta IA
        const aiResponse = await this.generateAIResponse(callSid, transcription);
        
        if (aiResponse) {
          logger.info(`🤖 Respuesta IA: "${aiResponse}"`);
          
          // Enviar respuesta con TTS
          await this.sendTTSAudio(streamData.ws, aiResponse);
        }
      }

    } catch (error) {
      logger.error(`❌ Error procesando audio: ${error.message}`);
    }
  }

  /**
   * Transcribir audio con servicio de transcripción en tiempo real
   */
  async transcribeAudio(audioBuffer) {
    try {
      const result = await transcriptionService.transcribeAudioBuffer(audioBuffer, 'es');
      
      if (result.success) {
        return result.text;
      } else {
        logger.warn(`⚠️ Transcripción falló: ${result.error}`);
        return null;
      }

    } catch (error) {
      logger.error(`❌ Error transcribiendo audio: ${error.message}`);
      return null;
    }
  }

  /**
   * Construir contexto completo del cliente para GPT-4
   */
  buildClientContext(clientData) {
    let context = `Eres un asistente virtual para ${clientData.companyName}.`;
    
    // Añadir descripción de la empresa
    if (clientData.companyDescription) {
      context += `\n\nDescripción de la empresa: ${clientData.companyDescription}`;
    }
    
    // Añadir información de la empresa desde JSON
    if (clientData.companyInfo) {
      const companyInfo = typeof clientData.companyInfo === 'string' 
        ? JSON.parse(clientData.companyInfo) 
        : clientData.companyInfo;
      
      if (companyInfo.services) context += `\nServicios: ${companyInfo.services}`;
      if (companyInfo.address) context += `\nDirección: ${companyInfo.address}`;
      if (companyInfo.phone) context += `\nTeléfono: ${companyInfo.phone}`;
      if (companyInfo.email) context += `\nEmail: ${companyInfo.email}`;
      if (companyInfo.website) context += `\nWeb: ${companyInfo.website}`;
    }
    
    // Añadir FAQs
    if (clientData.faqs) {
      const faqs = typeof clientData.faqs === 'string' 
        ? JSON.parse(clientData.faqs) 
        : clientData.faqs;
      
      if (Array.isArray(faqs) && faqs.length > 0) {
        context += `\n\nPreguntas frecuentes:`;
        faqs.forEach((faq, index) => {
          context += `\n${index + 1}. P: ${faq.question}\n   R: ${faq.answer}`;
        });
      }
    }
    
    // Añadir archivos de contexto
    if (clientData.contextFiles) {
      const contextFiles = typeof clientData.contextFiles === 'string' 
        ? JSON.parse(clientData.contextFiles) 
        : clientData.contextFiles;
      
      if (Array.isArray(contextFiles) && contextFiles.length > 0) {
        context += `\n\nInformación adicional:`;
        contextFiles.forEach(file => {
          if (file.content) context += `\n- ${file.content}`;
        });
      }
    }
    
    // Añadir horario comercial
    if (clientData.businessHoursConfig) {
      const businessHours = typeof clientData.businessHoursConfig === 'string' 
        ? JSON.parse(clientData.businessHoursConfig) 
        : clientData.businessHoursConfig;
      
      if (businessHours.schedule) {
        context += `\n\nHorario de atención: ${businessHours.schedule}`;
      }
    }
    
    // Añadir personalidad del bot
    if (clientData.botPersonality) {
      context += `\n\nPersonalidad: ${clientData.botPersonality}`;
    }
    
    context += `\n\nInstrucciones: Responde de forma natural, amigable y concisa. Máximo 2 frases por respuesta. Usa la información proporcionada para ayudar al cliente.`;
    
    return context;
  }

  /**
   * Generar respuesta con IA
   */
  async generateAIResponse(callSid, userInput) {
    const streamData = this.activeStreams.get(callSid);
    const conversation = this.conversationState.get(callSid) || [];

    try {
      // Añadir mensaje del usuario
      conversation.push({ role: 'user', content: userInput });

      // Construir contexto completo del cliente
      const clientContext = this.buildClientContext(streamData.clientData);
      
      // Generar respuesta con OpenAI usando contexto personalizado
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: clientContext
          },
          ...conversation
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      const aiResponse = completion.choices[0].message.content;
      
      // Añadir respuesta a la conversación
      conversation.push({ role: 'assistant', content: aiResponse });
      this.conversationState.set(callSid, conversation);

      return aiResponse;

    } catch (error) {
      logger.error(`❌ Error generando respuesta IA: ${error.message}`);
      return "Disculpa, no he entendido bien. ¿Puedes repetir?";
    }
  }

  /**
   * Enviar audio TTS al stream
   */
  async sendTTSAudio(ws, text) {
    try {
      logger.info(`🎵 Enviando TTS: "${text}"`);
      
      // Obtener streamSid y callSid del WebSocket
      const streamData = this.getStreamDataFromWs(ws);
      if (!streamData) {
        logger.error(`❌ No se encontró stream data para el WebSocket`);
        return;
      }
      
      const { streamSid, callSid } = streamData;
      logger.info(`🎵 Enviando TTS para CallSid ${callSid}: "${text}"`);
      
      // Generar audio con Azure TTS
      const audioBuffer = await azureTTS.synthesizeToStream(text);
      
      // Enviar por streaming
      await azureTTS.streamAudioToWebSocket(ws, audioBuffer, streamSid);
      
      logger.info(`✅ TTS enviado correctamente para CallSid: ${callSid}`);

    } catch (error) {
      logger.error(`❌ Error enviando TTS: ${error.message}`);
      // Fallback a mensaje de texto
      await this.sendFallbackMessage(ws, text);
    }
  }

  /**
   * Obtener streamSid desde WebSocket
   */
  getStreamSidFromWs(ws) {
    for (const [callSid, streamData] of this.activeStreams.entries()) {
      if (streamData.ws === ws) {
        return streamData.streamSid;
      }
    }
    return null;
  }

  /**
   * Obtener datos completos del stream desde WebSocket
   */
  getStreamDataFromWs(ws) {
    for (const [callSid, streamData] of this.activeStreams.entries()) {
      if (streamData.ws === ws) {
        return streamData;
      }
    }
    return null;
  }

  /**
   * Enviar mensaje de fallback cuando TTS falla
   */
  async sendFallbackMessage(ws, text) {
    try {
      const message = {
        event: 'mark',
        streamSid: this.getStreamSidFromWs(ws),
        mark: {
          name: 'tts_fallback'
        }
      };
      
      ws.send(JSON.stringify(message));
      logger.info(`📝 Fallback message enviado: "${text}"`);
      
    } catch (error) {
      logger.error(`❌ Error enviando fallback: ${error.message}`);
    }
  }

  /**
   * Stream terminado
   */
  async handleStreamStop(ws, data) {
    const { streamSid } = data;
    
    // Buscar el CallSid correspondiente al streamSid
    let callSid = null;
    for (const [cid, streamData] of this.activeStreams.entries()) {
      if (streamData.streamSid === streamSid) {
        callSid = cid;
        break;
      }
    }
    
    logger.info(`🛑 Stream terminado: ${callSid || streamSid}`);
    
    if (callSid) {
      this.cleanupStream(callSid);
    }
  }

  /**
   * Limpiar recursos del stream
   */
  cleanupStream(identifier) {
    // Puede ser streamId o callSid
    for (const [callSid, streamData] of this.activeStreams.entries()) {
      if (callSid === identifier || streamData.streamSid === identifier) {
        this.activeStreams.delete(callSid);
        this.audioBuffers.delete(callSid);
        this.conversationState.delete(callSid);
        logger.info(`🧹 Stream limpiado: ${callSid}`);
        break;
      }
    }
  }

  /**
   * Generar ID único para stream
   */
  generateStreamId() {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Heartbeat para mantener conexiones activas
   */
  startHeartbeat() {
    setInterval(() => {
      this.activeStreams.forEach((streamData, callSid) => {
        if (!streamData.ws.isAlive) {
          logger.warn(`💔 Conexión WebSocket muerta: ${callSid}`);
          streamData.ws.terminate();
          this.cleanupStream(callSid);
          return;
        }

        streamData.ws.isAlive = false;
        streamData.ws.ping();
      });
    }, 30000); // Cada 30 segundos
  }
}

module.exports = TwilioStreamHandler;
