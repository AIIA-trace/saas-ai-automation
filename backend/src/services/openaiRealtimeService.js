const WebSocket = require('ws');
const logger = require('../utils/logger');

/**
 * Servicio especializado para OpenAI Realtime API
 * Maneja la comunicación bidireccional de audio en tiempo real
 * Documentación oficial: https://platform.openai.com/docs/guides/realtime
 */
class OpenAIRealtimeService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-realtime'; // ✅ MODELO GA OFICIAL
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.8;
    this.voice = process.env.OPENAI_VOICE || 'alloy';
    this.activeConnections = new Map(); // streamSid -> connection data
    this.messageCount = 0;
    this.responseTimeouts = new Map(); // streamSid -> timeout ID
    
    // 🔒 VALIDACIÓN CRÍTICA PARA PRODUCCIÓN
    if (!this.apiKey) {
      throw new Error('❌ OPENAI_API_KEY no definida en variables de entorno');
    }
    
    // 📊 RATE LIMITING Y CONFIGURACIÓN PRODUCCIÓN
    this.maxConcurrentConnections = parseInt(process.env.MAX_CONCURRENT_OPENAI_CONNECTIONS) || 50;
    this.connectionRetryAttempts = 3;
    this.connectionTimeout = 15000; // 15 segundos
    
    // 📈 MÉTRICAS PARA MONITOREO
    this.metrics = {
      totalConnections: 0,
      failedConnections: 0,
      activeConnections: 0,
      lastReset: Date.now()
    };
    
    // SISTEMA MENSAJE BASE (se personaliza por cliente)
    this.baseSystemMessage = `You are Susan, a professional receptionist. Be helpful, friendly and direct. Answer briefly and ask how you can help. Maintain a professional but warm tone.`;
  }

  /**
   * Inicializar conexión OpenAI Realtime para un stream específico
   * @param {string} streamSid - ID del stream de Twilio
   * @param {Object} clientConfig - Configuración del cliente desde DB
   * @returns {Promise<WebSocket>} - Conexión WebSocket establecida
   */
  async initializeConnection(streamSid, clientConfig = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY no está definida');
      }
      if (this.activeConnections.has(streamSid)) {
        logger.warn(`⚠️ [${streamSid}] Conexión OpenAI ya existe, cerrando anterior`);
        await this.closeConnection(streamSid);
      }

      logger.info(`🤖 [${streamSid}] Inicializando conexión OpenAI Realtime (formato oficial)`);

      // ✅ URL CON FORMATO DE AUDIO - según documentación oficial
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.model}`;
      const openAiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Preparar customSystemMessage
      const companyName = clientConfig.companyName || 'la empresa';
      const companyDescription = clientConfig.companyDescription || '';
      const customSystemMessage = `Eres Susan, la recepcionista SÚPER amigable y entusiasta de ${companyName}. ${companyDescription ? `La empresa se dedica a: ${companyDescription}.` : ''} 

🎭 PERSONALIDAD Y TONO:
- Habla con ENERGÍA y ENTUSIASMO, como si estuvieras genuinamente emocionada de ayudar
- Usa exclamaciones naturales: "¡Claro!", "¡Por supuesto!", "¡Genial!", "¡Perfecto!"
- Sé cálida, cercana y expresiva - NO robótica ni formal en exceso
- Sonríe al hablar (se nota en el tono)
- Usa un lenguaje natural y conversacional, como hablarías con un amigo

📋 RESPUESTAS CONSISTENTES:
- Si preguntan por horarios: "¡Claro! Nuestro horario es de [horario]. ¿Hay algo más en lo que pueda ayudarte?"
- Si preguntan por servicios: "¡Perfecto! Te cuento, ofrecemos [servicios]. ¿Te gustaría saber más sobre alguno en particular?"
- Si no entiendes: "¡Uy! No te he entendido bien, ¿puedes repetir eso por favor?"
- Si piden hablar con alguien: "¡Por supuesto! Te paso enseguida. Un momentito."

⚡ ESTILO DE COMUNICACIÓN:
- Respuestas CORTAS y DIRECTAS (máximo 2-3 frases)
- Habla RÁPIDO pero claro
- NO uses frases largas ni complejas
- Sé proactiva: ofrece ayuda adicional
- SIEMPRE termina preguntando si necesitan algo más

🚫 NUNCA HAGAS:
- Respuestas genéricas o vagas
- Frases robóticas como "Le informo que...", "Procedo a..."
- Explicaciones largas sin que las pidan
- Repetir información innecesariamente

✅ SIEMPRE:
- Responde en español de España (castellano)
- Mantén el entusiasmo ALTO
- Sé breve pero completa
- Pregunta si necesitan más ayuda`;

      // Almacenar datos de conexión + variables del código oficial
      const connectionData = {
        ws: openAiWs,
        status: 'connecting',
        streamSid: streamSid,
        clientConfig: clientConfig,
        customSystemMessage: customSystemMessage,
        messageCount: 0,
        startTime: Date.now(),
        // VARIABLES DEL CÓDIGO OFICIAL COMPLETAS
        latestMediaTimestamp: 0,
        lastAssistantItem: null,
        markQueue: [],
        responseStartTimestampTwilio: null,
        // ✅ NUEVAS VARIABLES PARA FLUJO TEXTO
        accumulatedText: '', // Texto acumulado de OpenAI
        textResponseCount: 0, // Contador de respuestas de texto
        // 🚀 STREAMING: Variables para envío incremental a Azure
        audioTranscript: '', // Buffer de transcripción
        lastSentLength: 0 // Última posición enviada
      };

      this.activeConnections.set(streamSid, connectionData);

      return new Promise((resolve, reject) => {
        // Variable para resolver cuando la sesión esté lista
        let sessionReadyResolver = null;
        const sessionReadyPromise = new Promise((res) => {
          sessionReadyResolver = res;
        });
        
        // Guardar el resolver en connectionData para usarlo en handleOpenAIMessage
        connectionData.sessionReadyResolver = sessionReadyResolver;
        
        // Manejar conexión establecida
        openAiWs.on('open', () => {
          logger.info(`✅ [${streamSid}] Conexión OpenAI Realtime establecida`);
          logger.info(`🔍 [${streamSid}] URL conectada: ${wsUrl}`);
          logger.info(`🔍 [${streamSid}] Modelo: ${this.model}`);
          logger.info(`🔍 [${streamSid}] Temperature: ${this.temperature}`);
          connectionData.status = 'connected';
          
          // ✅ CONFIGURAR SESIÓN INICIAL (según documentación oficial)
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],  // ✅ REQUERIDO: OpenAI no permite solo ['audio']
              instructions: customSystemMessage + '\n\n🎤 INSTRUCCIONES DE VOZ:\n- Habla con ENERGÍA y entusiasmo\n- Usa entonación expresiva y variada\n- Habla a ritmo RÁPIDO pero claro\n- Enfatiza palabras clave con emoción\n- Sonríe al hablar (se nota en el tono)',
              voice: 'shimmer',  // 🎤 Voz femenina cálida y expresiva
              input_audio_format: 'g711_ulaw',
              output_audio_format: 'g711_ulaw',  // 🚀 mulaw directo compatible con Twilio
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.3,
                prefix_padding_ms: 300,
                silence_duration_ms: 300
              },
              temperature: 0.9,  // 🔥 Aumentado para respuestas más variadas y naturales (antes: 0.8)
              max_response_output_tokens: 150,  // 🚀 Limitar respuestas cortas
              speed: 1.15  // ⚡ Velocidad de habla: 1.0 = normal, 1.15 = 15% más rápido (rango: 0.25 - 4.0)
            }
          };
          
          openAiWs.send(JSON.stringify(sessionConfig));
          logger.info(`🔧 [${streamSid}] Configuración de sesión enviada - esperando confirmación...`);
          
          // ✅ NO RESOLVER INMEDIATAMENTE - Esperar session.updated
          sessionReadyPromise.then(() => {
            logger.info(`✅ [${streamSid}] Sesión OpenAI confirmada y lista para recibir audio`);
            resolve(openAiWs);
          });
        });

        // Manejar mensajes de OpenAI
        openAiWs.on('message', (data) => {
          connectionData.messageCount++;
          this.handleOpenAIMessage(streamSid, data);
        });

        // Manejar errores
        openAiWs.on('error', (error) => {
          logger.error(`❌ [${streamSid}] Error en conexión OpenAI: ${error.message}`);
          connectionData.status = 'error';
          reject(error);
        });

        // Manejar cierre
        openAiWs.on('close', (code, reason) => {
          logger.warn(`⚠️ [${streamSid}] Conexión OpenAI cerrada - Code: ${code}, Reason: ${reason}`);
          connectionData.status = 'closed';
          this.activeConnections.delete(streamSid);
        });

        // Timeout de conexión
        setTimeout(() => {
          if (connectionData.status === 'connecting') {
            reject(new Error('Timeout conectando con OpenAI Realtime API'));
          }
        }, 10000);
      });

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error inicializando OpenAI Realtime: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generar audio de saludo usando OpenAI TTS
   * @param {string} streamSid - ID del stream
   * @param {string} greetingText - Texto del saludo
   * @returns {Promise<{success: boolean, audioBuffer?: Buffer, error?: string}>}
   */
  async generateGreetingAudio(streamSid, greetingText) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) {
      return { success: false, error: 'No active connection' };
    }

    return new Promise((resolve, reject) => {
      const audioChunks = [];
      let isCollecting = false;

      // Listener temporal para recolectar audio
      const audioListener = (data) => {
        try {
          const response = JSON.parse(data.toString());
          
          if (response.type === 'response.audio.delta' && isCollecting) {
            // Convertir base64 a Buffer
            const audioBuffer = Buffer.from(response.delta, 'base64');
            audioChunks.push(audioBuffer);
            logger.debug(`🎵 [${streamSid}] Chunk de saludo recibido: ${audioBuffer.length} bytes`);
          }
          
          // ✅ CAMBIO: Detectar cuando termina la respuesta completa (no solo el audio)
          if (response.type === 'response.done' && isCollecting) {
            isCollecting = false;
            
            // Combinar todos los chunks
            const fullAudio = Buffer.concat(audioChunks);
            logger.info(`✅ [${streamSid}] Saludo completo: ${fullAudio.length} bytes`);
            
            // Limpiar listener
            connectionData.ws.removeListener('message', audioListener);
            
            if (fullAudio.length > 0) {
              resolve({ success: true, audioBuffer: fullAudio });
            } else {
              reject(new Error('No audio generated'));
            }
          }
          
          if (response.type === 'error') {
            connectionData.ws.removeListener('message', audioListener);
            reject(new Error(response.error.message));
          }
        } catch (err) {
          logger.error(`❌ [${streamSid}] Error procesando audio de saludo: ${err.message}`);
        }
      };

      // Agregar listener temporal
      connectionData.ws.on('message', audioListener);

      try {
        // 1. Crear un mensaje del asistente con el texto del saludo
        const conversationItem = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'text',  // ✅ Debe ser 'text', no 'input_text'
                text: greetingText
              }
            ]
          }
        };
        
        connectionData.ws.send(JSON.stringify(conversationItem));
        logger.info(`📝 [${streamSid}] Mensaje de saludo creado en conversación`);
        
        // 2. Generar audio del mensaje (SOLO audio, sin texto para evitar respuestas automáticas)
        const responseConfig = {
          type: 'response.create',
          response: {
            modalities: ['audio']  // ✅ SOLO AUDIO - evita que OpenAI genere respuestas automáticas
          }
        };
        
        connectionData.ws.send(JSON.stringify(responseConfig));
        isCollecting = true;
        logger.info(`🚀 [${streamSid}] Solicitando generación de audio del saludo`);
        
        // Timeout de 10 segundos
        setTimeout(() => {
          if (isCollecting) {
            connectionData.ws.removeListener('message', audioListener);
            reject(new Error('Timeout generating greeting audio'));
          }
        }, 10000);
      } catch (error) {
        connectionData.ws.removeListener('message', audioListener);
        reject(error);
      }
    });
  }

  /**
   * Crear respuesta texto-only de OpenAI
   * @param {string} streamSid - ID del stream
   */
  createOpenAIResponse(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) {
      logger.warn(`⚠️ [${streamSid}] No hay conexión para crear respuesta`);
      return;
    }

    // ✅ VERIFICAR si ya hay una respuesta activa
    if (connectionData.activeResponseId) {
      logger.warn(`⚠️ [${streamSid}] Ya hay una respuesta activa (${connectionData.activeResponseId}) - ignorando nueva solicitud`);
      return;
    }

    // 🚀 AUDIO NATIVO: OpenAI genera audio directamente (sin Azure TTS)
    const responseConfig = {
      type: 'response.create',
      response: {
        modalities: ['audio'],  // 🚀 SOLO AUDIO - streaming directo
        instructions: 'Responde en español (castellano) con un tono natural y profesional.'
      }
    };

    try {
      connectionData.ws.send(JSON.stringify(responseConfig));
      logger.info(`🚀 [${streamSid}] Solicitud de respuesta texto-only enviada`);
      // Marcar que hay una respuesta en progreso (se limpiará en response.done)
      connectionData.activeResponseId = 'pending';
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando response.create: ${error.message}`);
    }
  }

  /**
   * Manejar mensajes recibidos de OpenAI
   * @param {string} streamSid - ID del stream
   * @param {Buffer} data - Datos del mensaje
   */
  handleOpenAIMessage(streamSid, data) {
    try {
      const response = JSON.parse(data.toString());
      const connectionData = this.activeConnections.get(streamSid);

      if (!connectionData) {
        logger.warn(`⚠️ [${streamSid}] Mensaje OpenAI recibido pero no hay conexión activa`);
        return;
      }

      // 🔥 SOLO LOGS CRÍTICOS - eliminar duplicados
      const CRITICAL_EVENTS = {
        'session.updated': true,
        'input_audio_buffer.speech_started': true, 
        'input_audio_buffer.speech_stopped': true,
        'conversation.item.input_audio_transcription.completed': true,
        'conversation.item.created': true,
        'response.done': true,
        'error': true
      };

      if (CRITICAL_EVENTS[response.type]) {
        logger.info(`🎯 [${streamSid}] ${response.type}`, {
          // Solo información esencial
          has_delta: !!response.delta,
          has_transcript: !!response.transcript
        });
      }

      // 🔥 DEBUG ESPECÍFICO PARA PROBLEMAS COMUNES
      switch (response.type) {
        case 'session.created':
          logger.info(`🔍 [${streamSid}] Sesión creada por OpenAI - Verificando configuración inicial`);
          logger.info(`🔍 [${streamSid}] Session created event completo: ${JSON.stringify(response)}`);
          
          // Verificar qué configuró OpenAI por defecto
          if (response.session && response.session.output_modalities) {
            const defaultModalities = response.session.output_modalities;
            logger.info(`🔍 [${streamSid}] OpenAI configuró por defecto: ${JSON.stringify(defaultModalities)}`);
            
            if (defaultModalities.includes('audio')) {
              logger.warn(`⚠️ [${streamSid}] OpenAI está configurado con audio por defecto - nuestra configuración se enviará ahora`);
            }
          }
          
          // ✅ FALLBACK: Si no llega session.updated en 2 segundos, activar de todos modos
          setTimeout(() => {
            if (connectionData.status === 'connected' && connectionData.sessionReadyResolver) {
              logger.warn(`⚠️ [${streamSid}] session.updated no llegó - activando de todos modos`);
              connectionData.status = 'ready';
              connectionData.sessionReadyResolver();
              delete connectionData.sessionReadyResolver;
            }
          }, 2000);
          break;

        case 'session.updated':
          // ✅ UNIFICADO: Combinar ambos handlers
          logger.info(`🔧 [${streamSid}] CONFIGURACIÓN APLICADA:`, {
            modalities: response.session?.modalities,
            output_modalities: response.session?.output_modalities,
            voice: response.session?.voice,
            turn_detection: response.session?.turn_detection,
            input_audio_transcription: response.session?.input_audio_transcription
          });

          // Verificar configuración
          if (response.session?.modalities?.includes('text') && response.session?.modalities?.includes('audio')) {
            logger.info(`🎯 [${streamSid}] ✅ AUDIO+TEXTO CONFIGURADO CORRECTAMENTE`);
            connectionData.status = 'ready';
            logger.info(`✅ [${streamSid}] OpenAI listo para recibir audio y generar texto`);
            
            // ✅ RESOLVER LA PROMESA DE INICIALIZACIÓN
            if (connectionData.sessionReadyResolver) {
              connectionData.sessionReadyResolver();
              delete connectionData.sessionReadyResolver; // Limpiar
            }
          } else {
            logger.error(`🚨 [${streamSid}] CONFIGURACIÓN FALLÓ - OpenAI usa modalities: ${JSON.stringify(response.session?.modalities)}`);
          }
          break;

        case 'input_audio_buffer.speech_started':
          // ✅ UNIFICADO
          logger.info(`🎤 [${streamSid}] ✅ VAD DETECTÓ INICIO DE VOZ`);
          // Actualizar timestamp de VAD activity
          if (connectionData) {
            connectionData.lastVadActivity = Date.now();
          }
          this.handleSpeechStartedEvent(streamSid);
          break;

        case 'input_audio_buffer.speech_stopped':
          // ✅ UNIFICADO  
          logger.info(`🔇 [${streamSid}] VAD DETECTÓ FIN DE VOZ - Procesando...`);
          
          // ✅ ENVIAR chunks restantes si hay (pueden quedar < 15 chunks sin enviar)
          if (connectionData.audioBuffer && connectionData.audioBuffer.length > 0) {
            const remainingBuffer = Buffer.concat(connectionData.audioBuffer);
            logger.info(`📦 [${streamSid}] Enviando chunks restantes (${connectionData.audioBuffer.length} chunks, ${remainingBuffer.length} bytes)`);
            
            connectionData.ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: remainingBuffer.toString('base64')
            }));
            
            // Limpiar buffer temporal
            connectionData.audioBuffer = [];
          } else {
            logger.info(`✅ [${streamSid}] No hay chunks pendientes - todo el audio ya fue enviado`);
          }
          
          // ❌ NO ENVIAR COMMIT MANUAL con server_vad
          // OpenAI hace commit automáticamente cuando detecta speech_stopped
          logger.info(`✅ [${streamSid}] OpenAI hará commit automático (server_vad activo)`);
          
          // ✅ CREAR RESPUESTA con retardo de 100ms
          setTimeout(() => {
            this.createOpenAIResponse(streamSid);
          }, 100);
          
          // ✅ Timeout aumentado a 15 segundos
          this.responseTimeouts.set(streamSid, setTimeout(() => {
            logger.error(`⏰ [${streamSid}] TIMEOUT: OpenAI no respondió en 15 segundos`);
            this.responseTimeouts.delete(streamSid);
          }, 15000));
          break;

        case 'conversation.item.input_audio_transcription.completed':
          logger.info(`📝 [${streamSid}] ✅ TRANSCRIPCIÓN COMPLETADA`);
          const transcript = response.transcript || response.content || '';
          const transcriptClean = transcript.trim();
          
          logger.info(`🗣️ [${streamSid}] TEXTO TRANSCRITO: "${transcriptClean}"`);
          
          // ⚠️ VALIDAR: Si la transcripción está vacía, cancelar generación de respuesta
          // PERO SOLO si no hay respuesta ya completada (evitar error response_cancel_not_active)
          if (!transcriptClean || transcriptClean.length < 2) {
            logger.warn(`⚠️ [${streamSid}] Transcripción vacía o muy corta - probablemente ruido. Ignorando.`);
            
            // Solo cancelar si hay texto acumulado (indica respuesta en progreso)
            if (connectionData.accumulatedText && connectionData.accumulatedText.length > 0) {
              logger.info(`🔍 [${streamSid}] Respuesta en progreso detectada - cancelando...`);
              
              if (connectionData.ws && connectionData.ws.readyState === 1) {
                connectionData.ws.send(JSON.stringify({
                  type: 'response.cancel'
                }));
                logger.info(`🚫 [${streamSid}] Respuesta cancelada por transcripción vacía`);
              }
            } else {
              logger.info(`ℹ️ [${streamSid}] No hay respuesta activa - ignorando transcripción vacía`);
            }
          }
          break;

        case 'response.created':
          logger.info(`🚀 [${streamSid}] ✅ OpenAI GENERANDO RESPUESTA`);
          const responseId = response.response?.id || 'N/A';
          logger.info(`🆔 [${streamSid}] Response ID: ${responseId}`);
          // Guardar el ID de la respuesta activa
          connectionData.activeResponseId = responseId;
          break;

        case 'conversation.item.created':
          // ✅ MEJOR FLUJO: Obtener texto completo de una vez
          if (response.item?.role === 'assistant' && response.item?.type === 'message') {
            const content = response.item.content;
            
            // Buscar el contenido de texto
            let fullText = '';
            if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === 'text' && part.text) {
                  fullText += part.text;
                }
              }
            }
            
            if (fullText) {
              logger.info(`🎯 [${streamSid}] ✅ TEXTO COMPLETO de OpenAI (${fullText.length} chars): "${fullText}"`);
              
              // ✅ PROTECCIÓN: Solo textos razonables para TTS
              if (fullText.length > 500) {
                logger.warn(`⚠️ [${streamSid}] TEXTO DEMASIADO LARGO - Truncando a 500 chars`);
                fullText = fullText.substring(0, 500);
              }
              
              // ✅ NO usar Azure TTS - OpenAI genera el audio directamente
              logger.info(`🎯 [${streamSid}] Texto recibido de OpenAI (audio se genera automáticamente): "${fullText.substring(0, 50)}..."`);
            } else {
              logger.debug(`🔍 [${streamSid}] Item creado sin texto: ${JSON.stringify(response.item)}`);
            }
          }
          break;

        case 'response.done':
          // ✅ Respuesta completada - limpiar timeouts
          if (this.responseTimeouts.has(streamSid)) {
            clearTimeout(this.responseTimeouts.get(streamSid));
            this.responseTimeouts.delete(streamSid);
          }
          logger.info(`✅ [${streamSid}] Respuesta de OpenAI completada`);
          break;

        case 'response.audio_transcript.delta':
        case 'response.audio_transcript.done':
          // 🗑️ OBSOLETO: Ya no usamos Azure TTS, solo audio nativo de OpenAI
          logger.debug(`🔇 [${streamSid}] Evento de transcripción ignorado: ${response.type}`);
          break;

        case 'response.audio.delta':
          // 🚀 AUDIO NATIVO: Enviar directamente a Twilio (mulaw)
          if (response.delta) {
            const audioData = response.delta; // Base64 mulaw de OpenAI
            logger.debug(`🎵 [${streamSid}] Audio delta recibido (${audioData.length} chars base64)`);
            
            // Enviar directamente a Twilio via evento
            this.emit('audioFromOpenAI', {
              streamSid: streamSid,
              audio: audioData,
              timestamp: Date.now()
            });
          }
          break;

        case 'response.audio.done':
          logger.info(`✅ [${streamSid}] Audio de OpenAI completado`);
          break;

        case 'response.output_audio_transcript.done':
          // Ignorar - ya no usamos transcripción
          break;

        case 'response.output_audio_transcript.delta':
          // ✅ PROCESAR transcripción de audio generado por OpenAI
          logger.info(`📝 [${streamSid}] ✅ TRANSCRIPCIÓN AUDIO DELTA de OpenAI`);
          if (response.delta) {
            logger.debug(`🔍 [${streamSid}] Transcripción delta: "${response.delta}"`);
            
            // Acumular transcripción del audio generado
            if (!connectionData.audioTranscript) {
              connectionData.audioTranscript = '';
            }
            connectionData.audioTranscript += response.delta;
            logger.debug(`🔍 [${streamSid}] Transcripción acumulada: "${connectionData.audioTranscript}"`);
          }
          break;


        case 'response.done':
          logger.info(`✅ [${streamSid}] 📝 OpenAI response.done - Procesando transcripción acumulada`);
          
          // 🔍 DEBUG: ANALIZAR RESPUESTA OPENAI para logs
          logger.info(`🔍 [${streamSid}] 📊 RESPONSE STATS:`);
          logger.info(`🔍 [${streamSid}] ├── Response ID: ${response.response?.id || 'N/A'}`);
          logger.info(`🔍 [${streamSid}] ├── Status: ${response.response?.status || 'N/A'}`);
          
          // ✅ LIMPIAR FLAG DE RESPUESTA ACTIVA
          connectionData.activeResponseId = null;
          logger.info(`🔓 [${streamSid}] Respuesta finalizada - sistema listo para nueva solicitud`);
          
          // ✅ PROCESAR TRANSCRIPCIÓN ACUMULADA → Azure TTS
          if (connectionData.audioTranscript) {
            logger.info(`🚀 [${streamSid}] Enviando transcripción completa a Azure TTS: "${connectionData.audioTranscript}"`);
            logger.debug(`🔍 [${streamSid}] 📊 Transcripción length: ${connectionData.audioTranscript.length} chars`);
            
            // ✅ NO usar Azure TTS - OpenAI ya generó el audio
            logger.info(`🎯 [${streamSid}] Transcripción completa recibida (audio ya enviado): "${connectionData.audioTranscript.substring(0, 50)}..."`);
            
            // Limpiar transcripción acumulada
            connectionData.audioTranscript = '';
          } else {
            logger.warn(`⚠️ [${streamSid}] No hay transcripción acumulada para procesar`);
          }
          
          logger.info(`🔍 [${streamSid}] └── ✅ Respuesta procesada completamente`);
          break;



        case 'conversation.item.input_audio_transcription.failed':
          logger.error(`❌ [${streamSid}] TRANSCRIPCIÓN FALLÓ`);
          const error = response.error || 'Error desconocido';
          logger.error(`💥 [${streamSid}] CAUSA: ${JSON.stringify(error)}`);
          break;

        case 'response.output_audio.started':
          logger.info(`🎵 [${streamSid}] ✅ OpenAI INICIANDO AUDIO DE RESPUESTA`);
          break;

        case 'error':
          logger.error(`❌ [${streamSid}] ERROR CRÍTICO DE OPENAI`);
          logger.error(`🔍 [${streamSid}] 📊 ERROR COMPLETO: ${JSON.stringify(response, null, 2)}`);
          
          // Diagnóstico específico del error
          if (response.error) {
            logger.error(`💥 [${streamSid}] Error Type: ${response.error.type || 'N/A'}`);
            logger.error(`💥 [${streamSid}] Error Code: ${response.error.code || 'N/A'}`);
            logger.error(`💥 [${streamSid}] Error Message: ${response.error.message || 'N/A'}`);
            
            // Errores específicos de configuración
            if (response.error.message && response.error.message.includes('Unknown parameter')) {
              logger.error(`⚠️ [${streamSid}] PROBLEMA DE CONFIGURACIÓN detectado!`);
            }
          }
          break;

        default:
          // Capturar eventos no esperados que podrían ser importantes
          if (!['rate_limits.updated', 'conversation.item.done', 'response.output_item.done'].includes(response.type)) {
            logger.info(`📨 [${streamSid}] Evento OpenAI no manejado: ${response.type}`);
            logger.debug(`🔍 [${streamSid}] 📊 Evento completo: ${JSON.stringify(response, null, 2)}`);
          } else {
            logger.debug(`📨 [${streamSid}] Mensaje OpenAI: ${response.type}`);
          }
      }

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando mensaje OpenAI: ${error.message}`);
    }
  }

  /**
   * CÓDIGO OFICIAL: Handle interruption when the caller's speech starts
   * @param {string} streamSid - Stream ID
   */
  handleSpeechStartedEvent(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) return;

    // 🔍 DEBUG: Estado actual antes de procesar interrupción
    logger.info(`🎤 [${streamSid}] SPEECH STARTED - Estado del stream:`);
    logger.info(`🎤 [${streamSid}] ├── markQueue.length: ${connectionData.markQueue.length}`);
    logger.info(`🎤 [${streamSid}] ├── responseStartTimestamp: ${connectionData.responseStartTimestampTwilio}`);
    logger.info(`🎤 [${streamSid}] ├── lastAssistantItem: ${connectionData.lastAssistantItem}`);
    logger.info(`🎤 [${streamSid}] └── latestMediaTimestamp: ${connectionData.latestMediaTimestamp}`);

    // CÁLCULO EXACTO del código oficial - SOLO interrumpir si hay respuesta activa
    if (connectionData.markQueue.length > 0 && connectionData.responseStartTimestampTwilio != null) {
      const elapsedTime = connectionData.latestMediaTimestamp - connectionData.responseStartTimestampTwilio;
      logger.info(`⏱️ [${streamSid}] ✅ HAY RESPUESTA ACTIVA - Interrumpiendo`);
      logger.info(`⏱️ [${streamSid}] Calculating elapsed time: ${connectionData.latestMediaTimestamp} - ${connectionData.responseStartTimestampTwilio} = ${elapsedTime}ms`);

      if (connectionData.lastAssistantItem) {
        const truncateEvent = {
          type: 'conversation.item.truncate',
          item_id: connectionData.lastAssistantItem,
          content_index: 0,
          audio_end_ms: elapsedTime
        };
        logger.info(`🔄 [${streamSid}] Sending truncation event: ${JSON.stringify(truncateEvent)}`);
        connectionData.ws.send(JSON.stringify(truncateEvent));
      }

      // EMITIR CLEAR EVENT para Twilio (será manejado por TwilioStreamHandler)
      this.emit('clearAudio', {
        streamSid: streamSid
      });

      // Reset (exacto del código oficial)
      connectionData.markQueue = [];
      connectionData.lastAssistantItem = null;
      connectionData.responseStartTimestampTwilio = null;
      
      logger.info(`✅ [${streamSid}] Interrupción procesada y estado reseteado`);
    } else {
      // 🎯 CLAVE: Si no hay respuesta activa, NO interrumpir
      logger.info(`⚠️ [${streamSid}] NO HAY RESPUESTA ACTIVA - Ignorando speech_started`);
      logger.info(`⚠️ [${streamSid}] markQueue: ${connectionData.markQueue.length}, responseStart: ${connectionData.responseStartTimestampTwilio}`);
    }
  }


  // 🗑️ MÉTODO OBSOLETO ELIMINADO: processAudioDeltaImmediate()
  // RAZÓN: Solo usamos transcripción de OpenAI → Azure TTS, no audio directo

  /**
   * ✅ NUEVO FLUJO SIMPLE: Procesar texto de OpenAI con Azure TTS (como saludo inicial)
   * @param {string} streamSid - Stream ID
   * @param {string} text - Texto completo de OpenAI
   */
  async processTextWithAzureTTS(streamSid, text) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) {
      logger.error(`❌ [${streamSid}] No connection data para procesar texto`);
      return;
    }

    try {
      logger.info(`🚀 [${streamSid}] ✅ PROCESANDO texto con Azure TTS: "${text}"`);
      
      // Emitir evento simple para TwilioStreamHandler (como saludo inicial)
      this.emit('processTextWithAzure', {
        streamSid: streamSid,
        text: text, // ✅ SIMPLE: Solo texto
        timestamp: Date.now()
      });
      
      logger.debug(`✅ [${streamSid}] Texto enviado para Azure TTS`);

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando texto: ${error.message}`);
    }
  }

  /**
   * Enviar audio del usuario a OpenAI (mulaw de Twilio → PCM16 para OpenAI)
   * @param {string} streamSid - ID del stream
   * @param {string} audioPayload - Audio en base64 desde Twilio (mulaw)
   */
  sendAudioToOpenAI(streamSid, audioPayload, mediaTimestamp) {
    const connectionData = this.activeConnections.get(streamSid);
    // ✅ PERMITIR audio en 'connected' Y 'ready' - conexión WebSocket ya está abierta
    if (!connectionData || (connectionData.status !== 'connected' && connectionData.status !== 'ready')) {
      logger.debug(`⚠️ [${streamSid}] Conexión no lista para audio - Status: ${connectionData?.status || 'N/A'}`);
      return; // No hay conexión lista
    }

    try {
      // CÓDIGO OFICIAL: Actualizar timestamp
      if (mediaTimestamp) {
        connectionData.latestMediaTimestamp = mediaTimestamp;
        logger.debug(`⏱️ [${streamSid}] Updated media timestamp: ${mediaTimestamp}ms`);
      }

      // 🎯 ENVIAR MULAW DIRECTO (SIN CONVERSIÓN)
      const mulawBuffer = Buffer.from(audioPayload, 'base64');
      
      // ✅ VALIDACIÓN DE CALIDAD DE AUDIO
      const silentBytes = mulawBuffer.filter(byte => byte === 0xFF || byte === 0x00).length;
      const audioPercent = ((mulawBuffer.length - silentBytes) / mulawBuffer.length * 100);
      
      // Inicializar y actualizar contador
      if (!connectionData.audioSent) {
        connectionData.audioSent = 0;
      }
      connectionData.audioSent++;
      
      // ✅ ACUMULAR CHUNKS en buffer temporal (mínimo 300ms = 15 chunks de 20ms)
      if (!connectionData.audioBuffer) {
        connectionData.audioBuffer = [];
      }
      connectionData.audioBuffer.push(mulawBuffer);
      
      // ✅ ENVIAR solo cuando tenemos suficiente audio acumulado
      if (connectionData.audioBuffer.length >= 15) {
        const combinedBuffer = Buffer.concat(connectionData.audioBuffer);
        connectionData.audioBuffer = []; // Limpiar buffer temporal
        
        const audioMessage = {
          type: 'input_audio_buffer.append',
          audio: combinedBuffer.toString('base64')
        };
        
        connectionData.ws.send(JSON.stringify(audioMessage));
        logger.debug(`🎙️ [${streamSid}] Audio acumulado enviado a OpenAI Realtime (${combinedBuffer.length} bytes)`);
      }
      
      // 📊 DIAGNÓSTICO PERIÓDICO
      if (connectionData.audioSent % 50 === 0) {
        logger.info(`📊 [${streamSid}] ===== DIAGNÓSTICO VAD CRÍTICO =====`);
        logger.info(`📊 [${streamSid}] ├── Audio chunks enviados: ${connectionData.audioSent}`);
        logger.info(`📊 [${streamSid}] ├── Conexión status: ${connectionData.status}`);
        logger.info(`📊 [${streamSid}] ├── WebSocket readyState: ${connectionData.ws.readyState}`);
        logger.info(`📊 [${streamSid}] ├── Audio content: ${audioPercent.toFixed(1)}% non-silent`);
        logger.info(`📊 [${streamSid}] ├── Último chunk: ${mulawBuffer.length} bytes, ${silentBytes} silent`);
        logger.info(`📊 [${streamSid}] └── 🚨 Si >30% audio y NO hay speech_started = PROBLEMA VAD`);
      }
      
      // 🚨 ALERTA CRÍTICA
      if (audioPercent > 30) {
        logger.warn(`🚨 [${streamSid}] AUDIO REAL DETECTADO: ${audioPercent.toFixed(1)}% content - VAD debería detectar!`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio a OpenAI: ${error.message}`);
    }
  }

  /**
   * 🚨 DEBUG: Extraer texto de respuesta OpenAI para análisis
{{ ... }}
   * @returns {string} - Texto extraído
   */
  extractTextFromResponse(response) {
    try {
      // Buscar en diferentes ubicaciones donde OpenAI puede poner el texto
      if (response.response?.output?.[0]?.content?.[0]?.transcript) {
        return response.response.output[0].content[0].transcript;
      }
      
      // Buscar en items de la respuesta
      if (response.response?.output?.[0]?.content) {
        const content = response.response.output[0].content;
        for (const item of content) {
          if (item.transcript) return item.transcript;
          if (item.text) return item.text;
        }
      }
      
      
      return 'N/A';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * CÓDIGO OFICIAL: Send mark messages to Media Streams 
   * @param {string} streamSid - Stream ID
   */
  sendMark(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) return;

    // Emitir evento para que TwilioStreamHandler envíe la marca a Twilio
    this.emit('sendMark', {
      streamSid: streamSid,
      markName: 'responsePart'
    });

    // Agregar a queue como en código oficial
    connectionData.markQueue.push('responsePart');
  }




  /**
   * Cerrar conexión OpenAI para un stream
   * @param {string} streamSid - ID del stream
   */
  async closeConnection(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) {
      return;
    }

    logger.info(`🔌 [${streamSid}] Cerrando conexión OpenAI Realtime`);
    
    try {
      if (connectionData.ws && connectionData.ws.readyState === WebSocket.OPEN) {
        connectionData.ws.close(1000, 'Stream ended');
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error cerrando conexión OpenAI: ${error.message}`);
    }

    this.activeConnections.delete(streamSid);
  }

  /**
   * Convertir audio mulaw 8kHz (Twilio) a PCM 24kHz (OpenAI)
   * @param {Buffer} mulawBuffer - Buffer mulaw de Twilio
   * @returns {Buffer} - Buffer PCM 16-bit 24kHz para OpenAI
   */
  convertMulawToPCM24k(mulawBuffer) {
    // 🎯 TABLA DE CONVERSIÓN μ-law → PCM lineal (estándar ITU-T G.711)
    const MULAW_TO_LINEAR = [
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
      -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
      -876, -844, -812, -780, -748, -716, -684, -652,
      -620, -588, -556, -524, -492, -460, -428, -396,
      -372, -356, -340, -324, -308, -292, -276, -260,
      -244, -228, -212, -196, -180, -164, -148, -132,
      -120, -112, -104, -96, -88, -80, -72, -64,
      -56, -48, -40, -32, -24, -16, -8, 0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
      7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
      5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
      3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
      2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
      1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
      1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
      876, 844, 812, 780, 748, 716, 684, 652,
      620, 588, 556, 524, 492, 460, 428, 396,
      372, 356, 340, 324, 308, 292, 276, 260,
      244, 228, 212, 196, 180, 164, 148, 132,
      120, 112, 104, 96, 88, 80, 72, 64,
      56, 48, 40, 32, 24, 16, 8, 0
    ];

    // 🔄 PASO 1: Convertir μ-law → PCM 16-bit
    const pcm8k = Buffer.alloc(mulawBuffer.length * 2); // 2 bytes por sample
    for (let i = 0; i < mulawBuffer.length; i++) {
      const linear = MULAW_TO_LINEAR[mulawBuffer[i]];
      pcm8k.writeInt16LE(linear, i * 2);
    }

    // 🔄 PASO 2: Upsample 8kHz → 24kHz (factor 3) con interpolación lineal
    const pcm24k = Buffer.alloc(pcm8k.length * 3); // 3x más samples
    const samples8k = pcm8k.length / 2;
    
    for (let i = 0; i < samples8k; i++) {
      const currentSample = pcm8k.readInt16LE(i * 2);
      const nextSample = i < samples8k - 1 ? pcm8k.readInt16LE((i + 1) * 2) : currentSample;
      
      // 🔥 MEJORA: Interpolación lineal entre samples para mejor calidad
      pcm24k.writeInt16LE(currentSample, (i * 3) * 2);
      pcm24k.writeInt16LE(
        Math.floor((currentSample * 2 + nextSample) / 3), 
        (i * 3 + 1) * 2
      );
      pcm24k.writeInt16LE(
        Math.floor((currentSample + nextSample * 2) / 3), 
        (i * 3 + 2) * 2
      );
    }

    return pcm24k;
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats() {
    const connections = Array.from(this.activeConnections.values());
    return {
      activeConnections: connections.length,
      connectionsByStatus: connections.reduce((acc, conn) => {
        acc[conn.status] = (acc[conn.status] || 0) + 1;
        return acc;
      }, {}),
      totalMessages: connections.reduce((sum, conn) => sum + conn.messageCount, 0)
    };
  }

  /**
   * Verificar si hay conexión activa para un stream
   * @param {string} streamSid - ID del stream
   * @returns {boolean}
   */
  isConnectionActive(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    // ✅ PERMITIR audio en 'connected' Y 'ready' - conexión WebSocket ya está abierta
    return connectionData && (connectionData.status === 'connected' || connectionData.status === 'ready');
  }

  /**
   * CÓDIGO OFICIAL: Process mark completion (como en el código original)
   * @param {string} streamSid - Stream ID
   * @param {string} markName - Nombre de la marca procesada
   */
  processMarkCompletion(streamSid, markName) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) return;

    // EXACTO del código oficial: remover del queue
    if (connectionData.markQueue.length > 0) {
      connectionData.markQueue.shift();
      logger.debug(`📍 [${streamSid}] Marca ${markName} removida del queue (${connectionData.markQueue.length} restantes)`);
    }
  }

  /**
   * Convierte audio mulaw (8-bit) a PCM16 (16-bit little-endian)
   * OpenAI Realtime API requiere PCM16, pero Twilio envía mulaw
   * @param {Buffer} mulawBuffer - Buffer con audio mulaw
   * @returns {Buffer} - Buffer con audio PCM16
   */
  convertMulawToPCM16(mulawBuffer) {
    // Tabla de conversión mulaw a PCM16 (estándar ITU-T G.711)
    const MULAW_TO_PCM16 = [
      -32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,
      -23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
      -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,
      -11900,-11388,-10876,-10364,-9852,-9340,-8828,-8316,
      -7932,-7676,-7420,-7164,-6908,-6652,-6396,-6140,
      -5884,-5628,-5372,-5116,-4860,-4604,-4348,-4092,
      -3900,-3772,-3644,-3516,-3388,-3260,-3132,-3004,
      -2876,-2748,-2620,-2492,-2364,-2236,-2108,-1980,
      -1884,-1820,-1756,-1692,-1628,-1564,-1500,-1436,
      -1372,-1308,-1244,-1180,-1116,-1052,-988,-924,
      -876,-844,-812,-780,-748,-716,-684,-652,
      -620,-588,-556,-524,-492,-460,-428,-396,
      -372,-356,-340,-324,-308,-292,-276,-260,
      -244,-228,-212,-196,-180,-164,-148,-132,
      -120,-112,-104,-96,-88,-80,-72,-64,
      -56,-48,-40,-32,-24,-16,-8,0,
      32124,31100,30076,29052,28028,27004,25980,24956,
      23932,22908,21884,20860,19836,18812,17788,16764,
      15996,15484,14972,14460,13948,13436,12924,12412,
      11900,11388,10876,10364,9852,9340,8828,8316,
      7932,7676,7420,7164,6908,6652,6396,6140,
      5884,5628,5372,5116,4860,4604,4348,4092,
      3900,3772,3644,3516,3388,3260,3132,3004,
      2876,2748,2620,2492,2364,2236,2108,1980,
      1884,1820,1756,1692,1628,1564,1500,1436,
      1372,1308,1244,1180,1116,1052,988,924,
      876,844,812,780,748,716,684,652,
      620,588,556,524,492,460,428,396,
      372,356,340,324,308,292,276,260,
      244,228,212,196,180,164,148,132,
      120,112,104,96,88,80,72,64,
      56,48,40,32,24,16,8,0
    ];

    const pcm16Buffer = Buffer.alloc(mulawBuffer.length * 2); // PCM16 es 2 bytes por sample
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      const mulawByte = mulawBuffer[i];
      const pcm16Value = MULAW_TO_PCM16[mulawByte];
      
      // Escribir como little-endian 16-bit signed integer
      pcm16Buffer.writeInt16LE(pcm16Value, i * 2);
    }
    
    return pcm16Buffer;
  }
}

// Agregar EventEmitter CORRECTO - mixina en la clase original
const { EventEmitter } = require('events');

// MIXINA CORRECTA: Agregar EventEmitter a la clase existente sin herencia
Object.assign(OpenAIRealtimeService.prototype, EventEmitter.prototype);

// Llamar constructor EventEmitter en constructor original
const originalConstructor = OpenAIRealtimeService.prototype.constructor;
OpenAIRealtimeService.prototype.constructor = function(...args) {
  originalConstructor.apply(this, args);
  EventEmitter.call(this);
};

module.exports = OpenAIRealtimeService;
