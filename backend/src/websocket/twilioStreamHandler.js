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
    
    logger.info(`🔌 Nueva conexión WebSocket: ${streamId}`);
    logger.info(`🔍 URL completa: ${req.url}`);
    logger.info(`🔍 Headers: ${JSON.stringify(req.headers, null, 2)}`);

    // Los parámetros de Twilio Stream se envían en los eventos, no en la URL
    // Inicializar como null hasta que lleguen en los eventos
    ws.callSid = null;
    ws.clientId = null;
    ws.companyName = null;
    ws.language = null;
    
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
   * Manejar eventos de Twilio Stream
   */
  async handleTwilioMessage(ws, data) {
    const { event } = data;
    
    logger.debug(`📨 Evento Twilio recibido: ${event}`);
    logger.debug(`📨 Datos completos del evento: ${JSON.stringify(data, null, 2)}`);
    
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
        logger.debug(`🔍 Evento no manejado: ${event}`);
    }
  }

  /**
   * Stream conectado - inicializar
   */
  async handleStreamConnected(ws, data) {
    const { streamSid } = data;
    logger.info(`✅ Stream conectado: ${streamSid}`);
    
    // Extraer parámetros del evento connected si están disponibles
    if (data.parameters) {
      logger.info(`🔍 Parámetros en evento connected: ${JSON.stringify(data.parameters)}`);
      
      // Extraer parámetros del stream
      const parameters = data.parameters || {};
      ws.clientId = parameters.clientId;
      ws.callSid = parameters.callSid;
    }
    
    // El evento connected no siempre tiene todos los parámetros
    // Esperar al evento start para obtener todos los parámetros
    logger.info(`🎤 Stream conectado, esperando evento start para parámetros completos`);
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
    
    // Extraer clientId de los parámetros personalizados
    let clientId = null;
    if (customParameters) {
      // Los parámetros pueden venir como objeto o array
      if (Array.isArray(customParameters)) {
        const clientIdParam = customParameters.find(p => p.name === 'clientId');
        clientId = clientIdParam ? clientIdParam.value : null;
      } else if (customParameters.clientId) {
        clientId = customParameters.clientId;
      }
    }
    
    // Obtener CallSid desde parámetros personalizados o desde data
    const callSid = customParameters?.callSid || data.callSid || streamSid;

    logger.info(`🎤 Stream iniciado: ${streamSid} para llamada ${callSid}`);
    logger.info(`📞 ${callerNumber || 'undefined'} → ${twilioNumber || 'undefined'}`);
    logger.info(`🆔 ClientId extraído: ${clientId}`);

    try {
      let client = null;
      
      // Si tenemos clientId, usarlo directamente
      if (clientId) {
        client = await prisma.client.findUnique({
          where: { id: parseInt(clientId) },
          include: {
            twilioNumbers: true
          }
        });
        
        if (client) {
          logger.info(`✅ Cliente encontrado por ID: ${client.companyName} (ID: ${client.id})`);
          logger.info(`🎵 WelcomeMessage: "${client.welcomeMessage || 'NO CONFIGURADO'}"`);
          logger.info(`🏢 CompanyInfo: "${client.companyInfo || 'NO CONFIGURADO'}"`);
        }
      }
      
      // Si no encontramos cliente por ID, buscar por número de Twilio
      if (!client && twilioNumber) {
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
          where: { 
            phoneNumber: twilioNumber,
            status: 'active'
          },
          include: { 
            client: {
              include: {
                twilioNumbers: true
              }
            }
          }
        });

        if (twilioNumberRecord && twilioNumberRecord.client) {
          client = twilioNumberRecord.client;
          logger.info(`✅ Cliente encontrado por número: ${client.companyName} (ID: ${client.id})`);
          logger.info(`🎵 WelcomeMessage: "${client.welcomeMessage || 'NO CONFIGURADO'}"`);
          logger.info(`🏢 CompanyInfo: "${client.companyInfo || 'NO CONFIGURADO'}"`);
        }
      }

      if (!client) {
        logger.error(`❌ Cliente no encontrado para número: ${twilioNumber} o ID: ${clientId}`);
        return;
      }

      // Debug: verificar datos del cliente antes de almacenar
      logger.info(`🔍 Datos del cliente antes de almacenar en stream:`, JSON.stringify({
        id: client.id,
        companyName: client.companyName,
        welcomeMessage: client.welcomeMessage,
        companyInfo: client.companyInfo,
        language: client.language
      }, null, 2));

      // Inicializar estado del stream USANDO STREAMSID COMO CLAVE
      this.activeStreams.set(streamSid, {
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

      this.audioBuffers.set(streamSid, []);
      this.conversationState.set(streamSid, []);

      logger.info(`✅ Cliente configurado: ${client.companyName} (ID: ${client.id})`);

      // Verificar que los datos se almacenaron correctamente
      const storedStreamData = this.activeStreams.get(streamSid);
      logger.info(`🔍 Datos almacenados en activeStreams:`, JSON.stringify({
        clientId: storedStreamData.clientId,
        companyName: storedStreamData.clientData.companyName,
        welcomeMessage: storedStreamData.clientData.welcomeMessage
      }, null, 2));

      // Ahora que tenemos el CallSid y el cliente configurado, enviar saludo inicial
      await this.sendInitialGreeting(ws, { streamSid, callSid });

    } catch (error) {
      logger.error(`❌ Error configurando stream: ${error.message}`);
    }
  }

  /**
   * Enviar saludo inicial con Azure TTS
   */
  async sendInitialGreeting(ws, data) {
    try {
      const { streamSid, callSid } = data;
      
      // Obtener datos del stream usando streamSid como clave
      const streamData = this.activeStreams.get(streamSid);
      if (!streamData) {
        logger.warn(`⚠️ Stream no encontrado para StreamSid: ${streamSid}`);
        return;
      }
      
      // Debug: mostrar todos los datos del cliente
      logger.info(`🔍 Datos completos del cliente:`, JSON.stringify({
        id: streamData.clientData.id,
        companyName: streamData.clientData.companyName,
        welcomeMessage: streamData.clientData.welcomeMessage,
        companyInfo: streamData.clientData.companyInfo,
        language: streamData.clientData.language,
        botPersonality: streamData.clientData.botPersonality
      }, null, 2));
      
      // Usar SOLO el mensaje de bienvenida personalizado del cliente
      const greetingText = streamData.clientData.welcomeMessage;
      
      if (!greetingText || greetingText.trim() === '') {
        logger.error(`❌ Cliente ${streamData.clientData.companyName} no tiene welcomeMessage configurado o está vacío`);
        logger.error(`❌ WelcomeMessage value: "${greetingText}"`);
        
        // Usar mensaje por defecto temporal
        const defaultGreeting = `Hola, gracias por llamar a ${streamData.clientData.companyName}. En este momento nuestro sistema está configurándose. Por favor, intente más tarde.`;
        
        logger.info(`🎵 Enviando saludo por defecto para ${streamData.clientData.companyName}`);
        
        const voice = 'es-ES-DarioNeural';
        const audioBuffer = await azureTTS.synthesizeToStream(defaultGreeting, voice);
        await azureTTS.streamAudioToWebSocket(ws, audioBuffer, streamSid);
        
        return;
      }
      
      logger.info(`🎵 Enviando saludo inicial para StreamSid ${streamSid}: "${greetingText}"`);
      
      // Generar audio con Azure TTS usando voz española
      const voice = 'es-ES-DarioNeural';
      const audioBuffer = await azureTTS.synthesizeToStream(greetingText, voice);
      await azureTTS.streamAudioToWebSocket(ws, audioBuffer, streamSid);
      
      logger.info(`✅ Saludo inicial enviado correctamente para StreamSid: ${streamSid}`);
      
    } catch (error) {
      logger.error(`❌ Error enviando saludo: ${error.message}`);
      const fallbackText = "Sistema temporalmente no disponible. Por favor, intente más tarde.";
      
      try {
        const voice = 'es-ES-DarioNeural';
        const audioBuffer = await azureTTS.synthesizeToStream(fallbackText, voice);
        await azureTTS.streamAudioToWebSocket(ws, audioBuffer, data.streamSid);
      } catch (fallbackError) {
        logger.error(`❌ Error enviando mensaje de fallback: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Procesar chunk de audio del usuario
   */
  async handleMediaChunk(ws, data) {
    const { streamSid, media } = data;
    
    // Usar streamSid directamente como clave
    if (!this.activeStreams.has(streamSid)) {
      logger.warn(`⚠️ Stream no encontrado para StreamSid: ${streamSid}`);
      return;
    }

    // Decodificar audio base64
    const audioChunk = Buffer.from(media.payload, 'base64');
    
    // Acumular chunks de audio usando streamSid
    const buffer = this.audioBuffers.get(streamSid) || [];
    buffer.push(audioChunk);
    this.audioBuffers.set(streamSid, buffer);

    // Actualizar actividad
    const streamData = this.activeStreams.get(streamSid);
    streamData.lastActivity = Date.now();

    // Procesar cuando tengamos suficiente audio (ej: 1 segundo)
    const totalSize = buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalSize > 8000) { // ~1 segundo de audio a 8kHz
      await this.processAudioBuffer(streamSid);
    }
  }

  /**
   * Procesar buffer de audio acumulado
   */
  async processAudioBuffer(streamSid) {
    const buffer = this.audioBuffers.get(streamSid);
    const streamData = this.activeStreams.get(streamSid);

    if (!buffer || !streamData) return;

    try {
      // Combinar chunks en un solo buffer
      const audioData = Buffer.concat(buffer);
      
      // Limpiar buffer
      this.audioBuffers.set(streamSid, []);

      // Transcribir con Whisper
      const transcription = await this.transcribeAudio(audioData);
      
      if (transcription && transcription.trim()) {
        logger.info(`🎤 Transcripción: "${transcription}"`);
        
        // Generar respuesta IA
        const aiResponse = await this.generateAIResponse(streamSid, transcription);
        
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
  async generateAIResponse(streamSid, userInput) {
    const streamData = this.activeStreams.get(streamSid);
    const conversation = this.conversationState.get(streamSid) || [];

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

      // Guardar respuesta en conversación
      conversation.push({ role: 'assistant', content: aiResponse });
      this.conversationState.set(streamSid, conversation);

      return aiResponse;

    } catch (error) {
      logger.error(`❌ Error generando respuesta IA: ${error.message}`);
      return null;
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
    for (const [streamSid, streamData] of this.activeStreams.entries()) {
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
    for (const [streamSid, streamData] of this.activeStreams.entries()) {
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
    
    logger.info(`🛑 Stream terminado: ${streamSid}`);
    
    if (this.activeStreams.has(streamSid)) {
      this.cleanupStream(streamSid);
    }
  }

  /**
   * Limpiar recursos del stream
   */
  cleanupStream(streamSid) {
    if (this.activeStreams.has(streamSid)) {
      this.activeStreams.delete(streamSid);
      this.audioBuffers.delete(streamSid);
      this.conversationState.delete(streamSid);
      logger.info(`🧹 Stream limpiado: ${streamSid}`);
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
      this.activeStreams.forEach((streamData, streamSid) => {
        if (!streamData.ws.isAlive) {
          logger.warn(`💔 Conexión WebSocket muerta: ${streamSid}`);
          streamData.ws.terminate();
          this.cleanupStream(streamSid);
          return;
        }

        streamData.ws.isAlive = false;
        streamData.ws.ping();
      });
    }, 30000); // Cada 30 segundos
  }
}

module.exports = TwilioStreamHandler;
