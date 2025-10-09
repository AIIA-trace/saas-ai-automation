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

    // FORMATO OFICIAL EXACTO del código que me pasaste
    // ✅ CONFIGURACIÓN COMPLETA: OpenAI transcribe + genera TEXTO, Azure TTS genera AUDIO
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: this.model,
        output_modalities: ["text"], // ✅ SOLO TEXTO: OpenAI → Azure TTS
        
        // ✅ TRANSCRIPCIÓN NECESARIA para respuestas automáticas
        input_audio_transcription: {
          model: "whisper-1"
        },
        
        // ✅ TURN DETECTION GLOBAL para respuestas automáticas
        turn_detection: {
          type: "server_vad"
        },
        
        audio: {
          input: { 
            format: { type: 'audio/pcmu' }, 
            turn_detection: { 
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          }
        },
        instructions: customSystemMessage,
      },
    };

    logger.info(`⚙️ [${streamSid}] Enviando configuración de sesión (formato oficial)`);
    logger.info(`🔧 [${streamSid}] Config: ${JSON.stringify(sessionUpdate)}`);
    
    // ✅ CONFIGURACIÓN COMPLETA PARA TRANSCRIPCIÓN
    logger.info(`🔍 [${streamSid}] ✅ CONFIGURACIÓN TRANSCRIPCIÓN HABILITADA:`);
    logger.info(`🔍 [${streamSid}] ├── OpenAI INPUT: ${sessionUpdate.session.audio.input.format.type}`);
    logger.info(`🔍 [${streamSid}] ├── Transcripción: ${sessionUpdate.session.input_audio_transcription.model}`);
    logger.info(`🔍 [${streamSid}] ├── Turn Detection: ${sessionUpdate.session.turn_detection.type}`);
    logger.info(`🔍 [${streamSid}] ├── OpenAI OUTPUT: texto solamente`);
    logger.info(`🔍 [${streamSid}] ├── Azure TTS: texto → audio mulaw`);
    logger.info(`🔍 [${streamSid}] └── ✅ FLUJO: Usuario (audio) → OpenAI (transcribe + texto) → Azure TTS → Twilio`);
    
    connectionData.ws.send(JSON.stringify(sessionUpdate));
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
          connectionData.status = 'ready';
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
          
          if (connectionData.accumulatedText) {
            logger.info(`🚀 [${streamSid}] Texto para Azure TTS: "${connectionData.accumulatedText}"`);
            
            // Enviar texto completo a Azure TTS (como saludo inicial)
            this.processTextWithAzureTTS(streamSid, connectionData.accumulatedText);
            
            // Limpiar texto acumulado
            connectionData.accumulatedText = '';
          } else {
            logger.warn(`⚠️ [${streamSid}] No hay texto acumulado para Azure TTS`);
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
          // CÓDIGO OFICIAL: Manejar interrupciones
          this.handleSpeechStartedEvent(streamSid);
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.info(`🎤 [${streamSid}] OpenAI detectó fin de habla del usuario`);
          logger.info(`🚀 [${streamSid}] ESPERANDO respuesta automática de OpenAI...`);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          logger.info(`📝 [${streamSid}] TRANSCRIPCIÓN COMPLETADA: ${JSON.stringify(response)}`);
          break;

        case 'conversation.item.input_audio_transcription.failed':
          logger.error(`❌ [${streamSid}] TRANSCRIPCIÓN FALLÓ: ${JSON.stringify(response)}`);
          break;

        case 'response.created':
          logger.info(`🚀 [${streamSid}] ✅ OpenAI GENERANDO RESPUESTA: ${response.response?.id || 'N/A'}`);
          break;

        case 'response.output_audio.started':
          logger.info(`🎵 [${streamSid}] ✅ OpenAI INICIANDO AUDIO DE RESPUESTA`);
          break;

        case 'error':
          logger.error(`❌ [${streamSid}] Error de OpenAI: ${JSON.stringify(response.error)}`);
          break;

        default:
          logger.debug(`📨 [${streamSid}] Mensaje OpenAI: ${response.type}`);
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

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio a OpenAI: ${error.message}`);
    }
  }

  /**
   * 🚨 DEBUG: Extraer texto de respuesta OpenAI para análisis
   * @param {Object} response - Respuesta de OpenAI
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
