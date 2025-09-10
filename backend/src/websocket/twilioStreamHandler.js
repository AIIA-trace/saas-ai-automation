const logger = require('../utils/logger');
const azureTTSService = require('../services/azureTTSService');
const openaiService = require('../services/openaiService');
const ContextBuilder = require('../utils/contextBuilder');
const { OpenAI } = require('openai');

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
    
    // LOG DETALLADO PARA DEBUGGING
    logger.info(`📨 ===== EVENTO TWILIO RECIBIDO =====`);
    logger.info(`📨 Evento: ${event}`);
    logger.info(`📨 StreamSid: ${streamSid}`);
    logger.info(`📨 Datos completos: ${JSON.stringify(data, null, 2)}`);
    logger.info(`📨 =====================================`);
    
    try {
      // Procesar eventos de forma secuencial y explícita
      switch (event) {
        case "connected":
          logger.info('🔌 ===== EVENTO CONNECTED =====');
          logger.info('🔌 Media WS: Connected event received');
          logger.info(`🔌 Datos: ${JSON.stringify(data, null, 2)}`);
          await this.handleStreamConnected(ws, data);
          logger.info('🔌 ===== FIN EVENTO CONNECTED =====');
          break;
          
        case "start":
          logger.info('🎤 ===== EVENTO START RECIBIDO =====');
          logger.info('🎤 Media WS: Start event received');
          logger.info(`🎤 Datos completos del start: ${JSON.stringify(data, null, 2)}`);
          logger.info(`🎤 CustomParameters: ${JSON.stringify(data.start?.customParameters, null, 2)}`);
          // Asegurar que el start se procese completamente antes de continuar
          await this.handleStreamStart(ws, data);
          logger.info(`✅ Start event procesado completamente para stream: ${streamSid}`);
          logger.info('🎤 ===== FIN EVENTO START =====');
          break;
          
        case "media":
          // Verificar que el stream esté registrado antes de procesar media
          if (!this.activeStreams.has(streamSid)) {
            logger.warn(`⚠️ ===== MEDIA SIN STREAM REGISTRADO =====`);
            logger.warn(`⚠️ Media event recibido para stream no registrado: ${streamSid}`);
            logger.warn(`📊 Streams activos: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
            logger.warn(`⚠️ Esto indica que el evento START nunca llegó o falló`);
            logger.warn(`⚠️ =========================================`);
            return;
          }
          await this.handleMediaChunk(ws, data);
          break;
          
        case "stop":
          logger.info('🛑 ===== EVENTO STOP =====');
          logger.info('🛑 Media WS: Stop event received');
          logger.info(`🛑 Datos: ${JSON.stringify(data, null, 2)}`);
          await this.handleStreamStop(ws, data);
          logger.info('🛑 ===== FIN EVENTO STOP =====');
          break;
          
        default:
          logger.warn(`⚠️ ===== EVENTO DESCONOCIDO =====`);
          logger.warn(`⚠️ Evento desconocido: ${event}`);
          logger.warn(`⚠️ Datos: ${JSON.stringify(data, null, 2)}`);
          logger.warn(`⚠️ ===============================`);
      }
    } catch (error) {
      logger.error(`❌ ===== ERROR PROCESANDO EVENTO =====`);
      logger.error(`❌ Error procesando evento ${event} para stream ${streamSid}: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      logger.error(`❌ Datos del evento: ${JSON.stringify(data, null, 2)}`);
      
      // Log adicional del estado actual
      logger.error(`📊 Estado actual - Streams activos: ${this.activeStreams.size}`);
      logger.error(`🗂️ Stream IDs: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
      logger.error(`❌ ====================================`);
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

    logger.info(`🎤 ===== INICIO handleStreamStart =====`);
    logger.info(`🎤 Processing start event:`);
    logger.info(`🎤 Stream starting: ${streamSid} for call ${callSid}, clientId: ${clientId}`);
    logger.info(`🎤 Data completa: ${JSON.stringify(data, null, 2)}`);

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
      logger.info('🔍 PASO 1: Obteniendo configuración del cliente desde parámetros...');
      
      // OBTENER CONFIGURACIÓN COMPLETA DESDE PARÁMETROS - CÓDIGO EXACTO DEL TEST
      const clientConfig = {
        id: clientId ? parseInt(clientId) : 1,
        companyName: customParameters?.companyName || 'Sistema de Atención',
        email: customParameters?.email || '',
        callConfig: {
          greeting: customParameters?.greeting || 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?',
          voiceId: customParameters?.voiceId || 'lola',
          enabled: customParameters?.enabled !== 'false'
        },
        // Campos JSON exactos como en el test
        companyInfo: customParameters?.companyInfo || null,
        botConfig: customParameters?.botConfig || null,
        businessHours: customParameters?.businessHours || null,
        notificationConfig: customParameters?.notificationConfig || null,
        faqs: customParameters?.faqs || null,
        contextFiles: customParameters?.contextFiles || null,
        // Relación con números Twilio
        twilioNumbers: [{
          phoneNumber: customParameters?.phoneNumber || '',
          status: 'active'
        }]
      };

      logger.info(`🔍 DEBUG STREAM: Parámetros recibidos del WebSocket:`);
      logger.info(`🔍 DEBUG STREAM: - clientId: ${customParameters?.clientId}`);
      logger.info(`🔍 DEBUG STREAM: - companyName: ${customParameters?.companyName}`);
      logger.info(`🔍 DEBUG STREAM: - greeting: "${customParameters?.greeting}"`);
      logger.info(`🔍 DEBUG STREAM: - voiceId: ${customParameters?.voiceId}`);
      logger.info(`🔍 DEBUG STREAM: - companyInfo presente: ${!!customParameters?.companyInfo}`);
      logger.info(`🔍 DEBUG STREAM: - botConfig presente: ${!!customParameters?.botConfig}`);
      logger.info(`🔍 DEBUG STREAM: - businessHours presente: ${!!customParameters?.businessHours}`);
      logger.info(`🔍 DEBUG STREAM: - faqs presente: ${!!customParameters?.faqs}`);
      logger.info(`🔍 DEBUG STREAM: - contextFiles presente: ${!!customParameters?.contextFiles}`);
      
      logger.info(`🔍 PASO 2: Cliente configurado: ${clientConfig.companyName}`);
      logger.info(`🔍 PASO 2a: Saludo: "${clientConfig.callConfig?.greeting || 'Sin saludo configurado'}"`);
      logger.info(`🔍 PASO 2b: Voz: "${clientConfig.callConfig?.voiceId || 'Sin voz configurada'}"`);
      logger.info(`🔍 PASO 2c: FAQs cargadas: ${clientConfig.faqs?.length || 0}`);
      logger.info(`🔍 PASO 2d: Archivos contexto: ${clientConfig.contextFiles?.length || 0}`);

      // GENERAR CONTEXTO COMPLETO PARA OPENAI
      const systemPrompt = ContextBuilder.buildSystemPrompt(clientConfig);
      logger.info(`📋 PASO 2e: Contexto generado: ${systemPrompt.length} caracteres`);

      // ACTUALIZAR EL STREAM CON CONFIGURACIÓN REAL Y CONTEXTO
      const streamData = this.activeStreams.get(streamSid);
      streamData.client = clientConfig;
      streamData.systemPrompt = systemPrompt; // Contexto completo disponible
      streamData.isInitializing = false;
      
      logger.info(`🔄 PASO 3: Stream actualizado con configuración real y contexto completo`);

      logger.info('🔍 PASO 4: Enviando saludo inicial con configuración real...');
      
      // Enviar saludo con configuración real
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
      let voiceId = 'lola'; // Voz por defecto de Azure TTS
      if (client.callConfig && client.callConfig.voiceId) {
        voiceId = client.callConfig.voiceId;
      }

      logger.info(`🎵 PASO 4: Saludo preparado: "${greeting}"`);
      logger.info(`🎵 PASO 4a: Voz seleccionada: ${voiceId}`);

      // Generar audio con Azure TTS - CÓDIGO EXACTO DEL TEST QUE FUNCIONA
      try {
        logger.info('🎵 PASO 5: Generando audio con Azure TTS...');
        logger.info(`🎵 Texto: "${greeting}"`);
        logger.info(`🎵 Voz configurada: ${voiceId}`);
        
        const audioResult = await this.ttsService.generateSpeech(greeting, voiceId);
        
        if (!audioResult || !audioResult.success) {
          throw new Error(`Azure TTS falló: ${audioResult?.error || 'Error desconocido'}`);
        }

        logger.info(`✅ Audio generado exitosamente:`);
        logger.info(`   Resultado: ${audioResult.success ? 'Éxito' : 'Fallo'}`);
        logger.info(`   Datos: ${audioResult.audioBuffer ? audioResult.audioBuffer.byteLength + ' bytes' : 'Sin datos'}`);
        logger.info(`   Voz usada: ${voiceId}`);
        
        if (audioResult.audioBuffer) {
          const audioBuffer = Buffer.from(audioResult.audioBuffer);
          logger.info(`✅ Audio buffer creado: ${audioBuffer.length} bytes`);
          logger.info(`✅ Formato: μ-law 8kHz mono (optimizado para Twilio)`);
          
          logger.info('🎵 PASO 7: Enviando audio a Twilio...');
          await this.sendAudioToTwilio(ws, audioBuffer, streamSid);
          logger.info('🎵 PASO 8: ✅ Audio enviado correctamente');
        } else {
          logger.warn('⚠️ Audio generado sin datos de buffer');
          logger.info('🔄 FALLBACK: Enviando saludo como mensaje de texto...');
          this.sendTextFallback(ws, greeting, streamSid);
        }
      } catch (error) {
        logger.error(`❌ Error en Azure TTS: ${error.message}`);
        logger.error(`❌ Stack: ${error.stack}`);
        logger.info('🔄 FALLBACK: Enviando saludo como mensaje de texto...');
        this.sendTextFallback(ws, greeting, streamSid);
      }

    } catch (error) {
      logger.error(`❌ Error enviando saludo inicial: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
    }
  }

  /**
   * Enviar audio a Twilio via WebSocket
   */
  async sendAudioToTwilio(ws, audioBuffer, streamSid) {
    try {
      if (!ws || ws.readyState !== 1) {
        logger.error('❌ WebSocket no está disponible para enviar audio');
        return;
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        logger.error('❌ Buffer de audio vacío');
        return;
      }

      // Control de concurrencia - evitar múltiples envíos simultáneos
      const streamData = this.activeStreams.get(streamSid);
      if (streamData && streamData.isSendingTTS) {
        logger.warn(`⚠️ Ya se está enviando audio para ${streamSid}, omitiendo`);
        return;
      }

      logger.info(`🎵 Enviando audio a Twilio: ${audioBuffer.length} bytes`);

      // Convertir buffer a base64 para Twilio
      const base64Audio = audioBuffer.toString('base64');
      
      // Dividir en chunks de 8KB (recomendado por Twilio)
      const chunkSize = 8192;
      const totalChunks = Math.ceil(base64Audio.length / chunkSize);
      
      logger.info(`🎵 Dividiendo en ${totalChunks} chunks de ${chunkSize} bytes`);

      for (let i = 0; i < base64Audio.length; i += chunkSize) {
        const chunk = base64Audio.slice(i, i + chunkSize);
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: chunk
          }
        };

        // Enviar chunk
        ws.send(JSON.stringify(mediaMessage));
        
        // Log cada 10 chunks para no saturar
        if ((Math.floor(i/chunkSize) + 1) % 10 === 0) {
          logger.info(`🎵 Enviado chunk ${Math.floor(i/chunkSize) + 1}/${totalChunks}`);
        }

        // Pequeña pausa entre chunks para simular tiempo real
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      logger.info(`✅ Audio enviado correctamente: ${totalChunks} chunks`);

      // Enviar mark para indicar fin del audio
      const markMessage = {
        event: 'mark',
        streamSid: streamSid,
        mark: {
          name: `audio_end_${Date.now()}`
        }
      };
      
      ws.send(JSON.stringify(markMessage));
      logger.info('🏁 Mark de fin de audio enviado');

    } catch (error) {
      logger.error(`❌ Error enviando audio a Twilio: ${error.message}`);
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

      // Usar el contexto completo del cliente para generar respuesta con OpenAI
      const systemPrompt = streamData.systemPrompt || `Eres un asistente virtual para ${streamData.client?.companyName || 'la empresa'}.`;
      
      // Aquí iría la transcripción del audio (por ahora simulamos)
      const userMessage = "Usuario habló"; // Placeholder para transcripción real
      
      // Generar respuesta usando OpenAI con contexto completo
      const response = await this.generateAIResponse(userMessage, systemPrompt, streamData);
      
      // Generar respuesta de audio con Azure TTS usando la voz del usuario
      const voiceId = streamData.client?.callConfig?.voiceId || 'lola';
      const ttsResult = await this.ttsService.generateSpeech(response, voiceId);
      
      if (ttsResult && ttsResult.success && ttsResult.audioBuffer) {
        streamData.isSendingTTS = true;
        await this.sendAudioToTwilio(streamData.ws, ttsResult.audioBuffer, streamSid);
        streamData.isSendingTTS = false;
      }

      // Verificar que el WebSocket esté abierto
      if (ws.readyState !== 1) { // WebSocket.OPEN = 1
        logger.error(`❌ WebSocket no está abierto (readyState: ${ws.readyState})`);
        streamData.isSendingTTS = false;
        return;
      }

      // Extraer datos PCM del WAV y convertir a mulaw
      const wavData = this.extractPCMFromWAV(audioBuffer);
      if (!wavData) {
        logger.error(`❌ No se pudo extraer PCM del audio WAV`);
        streamData.isSendingTTS = false;
        return;
      }
      
      const mulawData = this.convertPCMToMulaw(wavData);
      const chunkSize = 160; // 20ms de audio a 8kHz mulaw
      const totalChunks = Math.ceil(mulawData.length / chunkSize);
      
      logger.info(`🎵 Audio WAV convertido a mulaw: ${mulawData.length} bytes`);
      logger.info(`🎵 Enviando ${totalChunks} chunks de audio...`);
      
      for (let i = 0; i < mulawData.length; i += chunkSize) {
        const chunk = mulawData.slice(i, i + chunkSize);
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

  /**
   * Extraer datos PCM de un archivo WAV
   */
  extractPCMFromWAV(wavBuffer) {
    try {
      // Verificar header WAV
      if (wavBuffer.length < 44) {
        logger.error('❌ Buffer WAV demasiado pequeño');
        return null;
      }

      // Verificar RIFF header
      const riffHeader = wavBuffer.toString('ascii', 0, 4);
      if (riffHeader !== 'RIFF') {
        logger.error('❌ No es un archivo WAV válido (falta RIFF)');
        return null;
      }

      // Verificar WAVE header
      const waveHeader = wavBuffer.toString('ascii', 8, 12);
      if (waveHeader !== 'WAVE') {
        logger.error('❌ No es un archivo WAV válido (falta WAVE)');
        return null;
      }

      // Buscar chunk de datos
      let dataOffset = 12;
      while (dataOffset < wavBuffer.length - 8) {
        const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
        const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
        
        if (chunkId === 'data') {
          // Encontrado el chunk de datos
          const pcmData = wavBuffer.slice(dataOffset + 8, dataOffset + 8 + chunkSize);
          logger.info(`🎵 PCM extraído: ${pcmData.length} bytes`);
          return pcmData;
        }
        
        dataOffset += 8 + chunkSize;
      }

      logger.error('❌ No se encontró chunk de datos en WAV');
      return null;
    } catch (error) {
      logger.error(`❌ Error extrayendo PCM: ${error.message}`);
      return null;
    }
  }

  /**
   * Convertir PCM 16-bit a mulaw 8-bit
   */
  convertPCMToMulaw(pcmBuffer) {
    try {
      const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);
      
      for (let i = 0; i < pcmBuffer.length; i += 2) {
        // Leer sample PCM 16-bit little endian
        const pcmSample = pcmBuffer.readInt16LE(i);
        
        // Convertir a mulaw
        const mulawSample = this.linearToMulaw(pcmSample);
        mulawBuffer[i / 2] = mulawSample;
      }
      
      logger.info(`🎵 PCM convertido a mulaw: ${mulawBuffer.length} bytes`);
      return mulawBuffer;
    } catch (error) {
      logger.error(`❌ Error convirtiendo a mulaw: ${error.message}`);
      return Buffer.alloc(0);
    }
  }

  /**
   * Convertir sample linear PCM a mulaw
   */
  linearToMulaw(pcmSample) {
    // Tabla de conversión mulaw
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;
    
    let sign = 0;
    let position = 0;
    let lsb = 0;
    
    if (pcmSample < 0) {
      pcmSample = -pcmSample;
      sign = 0x80;
    }
    
    pcmSample += MULAW_BIAS;
    if (pcmSample > MULAW_MAX) pcmSample = MULAW_MAX;
    
    // Encontrar posición del bit más significativo
    for (position = 12; position >= 5; position--) {
      if (pcmSample & (1 << position)) break;
    }
    
    lsb = (pcmSample >> (position - 4)) & 0x0F;
    return (~(sign | ((position - 5) << 4) | lsb)) & 0xFF;
  }
}

module.exports = TwilioStreamHandler;
