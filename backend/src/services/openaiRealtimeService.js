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
    this.model = 'gpt-4o-realtime-preview-2024-10-01'; // MODELO OFICIAL CORRECTO
    this.temperature = 0.8; // Del código oficial
    this.voice = 'alloy'; // Del código oficial
    this.activeConnections = new Map(); // streamSid -> connection data
    
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

      // FORMATO OFICIAL: URL con temperature y model
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.model}&temperature=${this.temperature}`;
      const openAiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      // Almacenar datos de conexión + variables del código oficial
      const connectionData = {
        ws: openAiWs,
        status: 'connecting',
        streamSid: streamSid,
        clientConfig: clientConfig,
        messageCount: 0,
        startTime: Date.now(),
        // VARIABLES DEL CÓDIGO OFICIAL COMPLETAS
        latestMediaTimestamp: 0,
        lastAssistantItem: null,
        markQueue: [],
        responseStartTimestampTwilio: null,
        // ✅ NUEVAS VARIABLES PARA FLUJO TEXTO
        accumulatedText: '', // Texto acumulado de OpenAI
        textResponseCount: 0 // Contador de respuestas de texto
      };

      this.activeConnections.set(streamSid, connectionData);

      return new Promise((resolve, reject) => {
        // Manejar conexión establecida
        openAiWs.on('open', () => {
          logger.info(`✅ [${streamSid}] Conexión OpenAI Realtime establecida`);
          logger.info(`🔍 [${streamSid}] URL conectada: ${wsUrl}`);
          logger.info(`🔍 [${streamSid}] Modelo: ${this.model}`);
          logger.info(`🔍 [${streamSid}] Temperature: ${this.temperature}`);
          connectionData.status = 'connected';
          
          // Enviar inicialización de sesión (formato oficial)
          setTimeout(() => this.initializeSession(streamSid, clientConfig), 100);
          
          resolve(openAiWs);
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
   * FORMATO OFICIAL: Inicializar sesión OpenAI (copiado exacto del código oficial)
   * @param {string} streamSid - ID del stream
   * @param {Object} clientConfig - Configuración del cliente
   */
  initializeSession(streamSid, clientConfig) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData || connectionData.status !== 'connected') {
      logger.error(`❌ [${streamSid}] No hay conexión OpenAI activa para configurar`);
      return;
    }

    // Personalizar mensaje del sistema según el cliente
    const companyName = clientConfig.companyName || 'la empresa';
    const companyDescription = clientConfig.companyDescription || '';
    
    const customSystemMessage = `You are Susan, the professional receptionist for ${companyName}. ${companyDescription ? `The company is dedicated to: ${companyDescription}.` : ''} Be helpful, friendly and direct. Answer briefly and ask how you can help. Maintain a professional but warm tone. Your goal is to help the customer and direct them correctly. If asked about specific services, contact information or hours, provide available information.`;

    // ✅ CONFIGURACIÓN OFICIAL SEGÚN DOCUMENTACIÓN OPENAI
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: customSystemMessage
      },
    };

    logger.info(`⚙️ [${streamSid}] Enviando configuración de sesión (formato oficial)`);
    logger.info(`🔧 [${streamSid}] Config completo: ${JSON.stringify(sessionUpdate, null, 2)}`);
    
    // ✅ CONFIGURACIÓN OFICIAL OPENAI
    logger.info(`🔍 [${streamSid}] ✅ CONFIGURACIÓN OFICIAL OPENAI:`);
    logger.info(`🔍 [${streamSid}] ├── Session Type: ${sessionUpdate.session.type}`);
    logger.info(`🔍 [${streamSid}] ├── Instructions Length: ${sessionUpdate.session.instructions.length} chars`);
    logger.info(`🔍 [${streamSid}] └── ✅ FLUJO: Documentación oficial OpenAI - Solo type + instructions`);
    
    // ENVÍO CON LOG ADICIONAL
    logger.info(`📤 [${streamSid}] Enviando session.update a OpenAI...`);
    connectionData.ws.send(JSON.stringify(sessionUpdate));
    logger.info(`✅ [${streamSid}] session.update enviado - Esperando session.updated...`);
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

      // ✅ EVENTOS PARA FLUJO TEXTO (OpenAI → Azure TTS)
      const LOG_EVENT_TYPES = [
        'error',
        'response.content.done',
        'response.text.done',        // ✅ NUEVO: Texto completado
        'response.text.delta',       // ✅ NUEVO: Texto streaming
        'rate_limits.updated',
        'response.done',
        'input_audio_buffer.committed',
        'input_audio_buffer.speech_stopped',
        'input_audio_buffer.speech_started',
        'session.created',
        'session.updated',
        'conversation.item.input_audio_transcription.completed',
        'conversation.item.input_audio_transcription.failed',
        'response.created'
      ];

      if (LOG_EVENT_TYPES.includes(response.type)) {
        logger.info(`📨 [${streamSid}] OpenAI Event: ${response.type}`, response);
      }

      // Procesar diferentes tipos de mensajes
      switch (response.type) {
        case 'session.updated':
          logger.info(`✅ [${streamSid}] Sesión OpenAI configurada correctamente`);
          logger.info(`🔍 [${streamSid}] 📊 SESSION.UPDATED COMPLETO: ${JSON.stringify(response, null, 2)}`);
          
          // DEBUG: Verificar configuración aplicada OFICIAL
          if (response.session) {
            logger.info(`🔍 [${streamSid}] ✅ CONFIGURACIÓN APLICADA POR OPENAI:`);
            logger.info(`🔍 [${streamSid}] ├── Session Type: ${response.session.type || 'N/A'}`);
            logger.info(`🔍 [${streamSid}] ├── Model aplicado: ${response.session.model || 'N/A'}`);
            logger.info(`🔍 [${streamSid}] ├── Instructions aplicadas: ${response.session.instructions ? 'SI' : 'NO'}`);
            if (response.session.audio) {
              logger.info(`🔍 [${streamSid}] ├── Audio config: DEFAULTS aplicados por OpenAI`);
              logger.info(`🔍 [${streamSid}] ├── VAD: ${response.session.audio.input?.turn_detection?.type || 'default'}`);
            }
            logger.info(`🔍 [${streamSid}] └── ✅ CONFIGURACIÓN OFICIAL APLICADA CORRECTAMENTE`);
          }
          
          connectionData.status = 'ready';
          logger.info(`🚀 [${streamSid}] ✅ OpenAI LISTO para recibir audio - Status: ready`);
          break;

        case 'response.text.delta':
          // ✅ NUEVO FLUJO: Acumular texto de OpenAI para Azure TTS
          if (response.delta) {
            logger.info(`📝 [${streamSid}] ✅ RECIBIENDO texto delta de OpenAI`);
            logger.debug(`🔍 [${streamSid}] Texto delta: "${response.delta}"`);
            
            // Acumular texto (como código oficial acumula audio)
            if (!connectionData.accumulatedText) {
              connectionData.accumulatedText = '';
            }
            connectionData.accumulatedText += response.delta;
            
            if (response.item_id) {
              connectionData.lastAssistantItem = response.item_id;
              logger.debug(`🆔 [${streamSid}] Assistant item ID: ${response.item_id}`);
            }
          }
          break;

        case 'response.text.done':
          // ✅ NUEVO FLUJO: Texto completo listo para Azure TTS
          logger.info(`📝 [${streamSid}] ✅ TEXTO COMPLETO de OpenAI - Enviando a Azure TTS`);
          logger.debug(`🔍 [${streamSid}] 📊 Text.done DETAILS: ${JSON.stringify(response)}`);
          
          if (connectionData.accumulatedText) {
            logger.info(`🚀 [${streamSid}] Texto para Azure TTS: "${connectionData.accumulatedText}"`);
            logger.debug(`🔍 [${streamSid}] 📊 AccumulatedText length: ${connectionData.accumulatedText.length} chars`);
            
            // Enviar texto completo a Azure TTS (como saludo inicial)
            this.processTextWithAzureTTS(streamSid, connectionData.accumulatedText);
            
            // Limpiar texto acumulado
            connectionData.accumulatedText = '';
          } else {
            logger.warn(`⚠️ [${streamSid}] No hay texto acumulado para Azure TTS`);
            logger.debug(`🔍 [${streamSid}] 📊 ConnectionData keys: ${Object.keys(connectionData)}`);
          }
          break;


        case 'response.done':
          logger.info(`✅ [${streamSid}] 📝 OpenAI response.done - Solo logging (NO procesamos audio aquí)`);
          
          // 🔍 DEBUG: ANALIZAR RESPUESTA OPENAI para logs
          logger.info(`🔍 [${streamSid}] 📊 RESPONSE STATS:`);
          logger.info(`🔍 [${streamSid}] ├── Response ID: ${response.response?.id || 'N/A'}`);
          logger.info(`🔍 [${streamSid}] ├── Status: ${response.response?.status || 'N/A'}`);
          logger.info(`🔍 [${streamSid}] └── ✅ Audio YA PROCESADO por deltas individuales`);
          
          break;

        case 'input_audio_buffer.speech_started':
          logger.info(`🎤 [${streamSid}] OpenAI detectó inicio de habla del usuario`);
          logger.info(`🔍 [${streamSid}] 📊 SPEECH_STARTED COMPLETO: ${JSON.stringify(response, null, 2)}`);
          // CÓDIGO OFICIAL: Manejar interrupciones
          this.handleSpeechStartedEvent(streamSid);
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.info(`🎤 [${streamSid}] OpenAI detectó fin de habla del usuario`);
          logger.info(`🚀 [${streamSid}] ESPERANDO respuesta automática de OpenAI...`);
          logger.info(`🔍 [${streamSid}] 📊 SPEECH_STOPPED COMPLETO: ${JSON.stringify(response, null, 2)}`);
          
          // DEBUG CRÍTICO: Estado de la sesión cuando se detecta fin de habla
          logger.info(`🔍 [${streamSid}] ✅ ESTADO ESPERADO DESPUÉS DE SPEECH_STOPPED:`);
          logger.info(`🔍 [${streamSid}] ├── Debería llegar: conversation.item.input_audio_transcription.completed`);
          logger.info(`🔍 [${streamSid}] ├── Luego debería llegar: response.created`);
          logger.info(`🔍 [${streamSid}] ├── Luego debería llegar: response.text.delta(s)`);
          logger.info(`🔍 [${streamSid}] └── Finalmente: response.text.done`);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          logger.info(`📝 [${streamSid}] ✅ TRANSCRIPCIÓN COMPLETADA - ÉXITO!`);
          logger.info(`🔍 [${streamSid}] 📊 TRANSCRIPTION COMPLETA: ${JSON.stringify(response, null, 2)}`);
          
          // Extraer texto transcrito
          const transcript = response.transcript || response.content || 'N/A';
          logger.info(`🗣️ [${streamSid}] TEXTO TRANSCRITO: "${transcript}"`);
          break;

        case 'conversation.item.input_audio_transcription.failed':
          logger.error(`❌ [${streamSid}] TRANSCRIPCIÓN FALLÓ - ERROR CRÍTICO!`);
          logger.error(`🔍 [${streamSid}] 📊 TRANSCRIPTION ERROR: ${JSON.stringify(response, null, 2)}`);
          
          // Diagnóstico del error
          const error = response.error || 'Error desconocido';
          logger.error(`💥 [${streamSid}] CAUSA DEL ERROR: ${JSON.stringify(error)}`);
          break;

        case 'response.created':
          logger.info(`🚀 [${streamSid}] ✅ OpenAI GENERANDO RESPUESTA - ÉXITO!`);
          logger.info(`🔍 [${streamSid}] 📊 RESPONSE.CREATED COMPLETO: ${JSON.stringify(response, null, 2)}`);
          
          // Debug del response ID
          const responseId = response.response?.id || 'N/A';
          logger.info(`🆔 [${streamSid}] Response ID: ${responseId}`);
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
    if (!connectionData || connectionData.status !== 'ready') {
      return; // No hay conexión lista
    }

    try {
      // CÓDIGO OFICIAL: Actualizar timestamp
      if (mediaTimestamp) {
        connectionData.latestMediaTimestamp = mediaTimestamp;
        logger.debug(`⏱️ [${streamSid}] Updated media timestamp: ${mediaTimestamp}ms`);
      }

      // 🎯 FIX APLICADO: Enviar mulaw directo a OpenAI (formato correcto)
      const mulawBuffer = Buffer.from(audioPayload, 'base64');
      logger.debug(`🔍 [${streamSid}] Twilio mulaw: ${mulawBuffer.length} bytes → OpenAI directamente`);
      
      // ✅ SOLUCIÓN: OpenAI espera audio/pcmu (mulaw), enviamos mulaw directo
      const audioMessage = {
        type: 'input_audio_buffer.append',
        audio: audioPayload  // mulaw directo de Twilio - NO conversion needed!
      };

      connectionData.ws.send(JSON.stringify(audioMessage));
      logger.debug(`✅ [${streamSid}] Audio mulaw enviado directamente (${audioPayload.length} chars base64)`);
      logger.debug(`🎙️ [${streamSid}] Audio enviado a OpenAI Realtime`);
      
      // DEBUG ADICIONAL: Estado de la conexión y contadores
      connectionData.audioSent = (connectionData.audioSent || 0) + 1;
      if (connectionData.audioSent % 50 === 0) {  // Log cada 50 chunks
        logger.info(`📊 [${streamSid}] Audio chunks enviados: ${connectionData.audioSent}`);
        logger.info(`📊 [${streamSid}] Conexión status: ${connectionData.status}`);
        logger.info(`📊 [${streamSid}] WebSocket readyState: ${connectionData.ws.readyState}`);
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
    return connectionData && connectionData.status === 'ready';
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
