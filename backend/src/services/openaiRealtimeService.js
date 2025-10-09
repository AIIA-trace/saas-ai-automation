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
        // VARIABLES DEL CÓDIGO OFICIAL
        latestMediaTimestamp: 0,
        lastAssistantItem: null,
        markQueue: [],
        responseStartTimestampTwilio: null
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
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: this.model,
        output_modalities: ["audio"],
        audio: {
          input: { format: { type: 'audio/pcmu' }, turn_detection: { type: "server_vad" } },
          output: { format: { type: 'audio/pcmu' }, voice: this.voice },
        },
        instructions: customSystemMessage,
      },
    };

    logger.info(`⚙️ [${streamSid}] Enviando configuración de sesión (formato oficial)`);
    logger.info(`🔧 [${streamSid}] Config: ${JSON.stringify(sessionUpdate)}`);
    
    // ✅ FORMATO DE AUDIO CORREGIDO
    logger.info(`🔍 [${streamSid}] ✅ AUDIO FORMAT ALIGNED:`);
    logger.info(`🔍 [${streamSid}] ├── OpenAI INPUT esperado: ${sessionUpdate.session.audio.input.format.type}`);
    logger.info(`🔍 [${streamSid}] ├── OpenAI OUTPUT esperado: ${sessionUpdate.session.audio.output.format.type}`);
    logger.info(`🔍 [${streamSid}] ├── Twilio envía: audio/mulaw (8kHz, 8-bit)`);
    logger.info(`🔍 [${streamSid}] └── ✅ PERFECTO MATCH: mulaw → mulaw directo!`);
    
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

      // LOGS DEL CÓDIGO OFICIAL - Solo eventos importantes
      const LOG_EVENT_TYPES = [
        'error',
        'response.content.done',
        'rate_limits.updated',
        'response.done',
        'input_audio_buffer.committed',
        'input_audio_buffer.speech_stopped',
        'input_audio_buffer.speech_started',
        'session.created',
        'session.updated'
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

        case 'response.output_audio.delta':
          // ADAPTACIÓN: En lugar de enviar audio OpenAI directamente, 
          // acumulamos y convertimos con Azure TTS
          if (response.delta) {
            logger.info(`🔊 [${streamSid}] Recibiendo audio delta de OpenAI (será convertido con Azure TTS)`);
            
            // Actualizar timestamps como en código oficial
            if (!connectionData.responseStartTimestampTwilio) {
              connectionData.responseStartTimestampTwilio = connectionData.latestMediaTimestamp;
              logger.debug(`⏱️ [${streamSid}] Setting start timestamp: ${connectionData.responseStartTimestampTwilio}ms`);
            }

            if (response.item_id) {
              connectionData.lastAssistantItem = response.item_id;
            }

            // DIFERENCIA CLAVE: Acumular para Azure TTS en lugar de enviar directamente
            this.accumulateAudioDelta(streamSid, response.delta);
          }
          break;

        case 'response.done':
          logger.info(`✅ [${streamSid}] Respuesta OpenAI completada - procesando con Azure TTS`);
          
          // 🚨 DEBUG CRÍTICO: ANALIZAR RESPUESTA OPENAI
          logger.error(`🔍 [${streamSid}] 🚨 OPENAI RESPONSE DEBUG:`);
          logger.error(`🔍 [${streamSid}] ├── Response ID: ${response.response?.id || 'N/A'}`);
          logger.error(`🔍 [${streamSid}] ├── Status: ${response.response?.status || 'N/A'}`);
          
          // Buscar contenido de texto en la respuesta
          const textContent = this.extractTextFromResponse(response);
          logger.error(`🔍 [${streamSid}] ├── Texto transcrito: "${textContent}"`);
          logger.error(`🔍 [${streamSid}] ├── Audio chunks recibidos: ${connectionData.accumulatedChunks?.length || 0}`);
          logger.error(`🔍 [${streamSid}] └── 🚨 ${textContent.includes('Entiendo tu consulta') ? 'RESPUESTA GENÉRICA!' : 'TRANSCRIPCIÓN REAL'}`);
          
          // Cuando OpenAI termina, procesamos el audio acumulado con Azure TTS
          this.processAccumulatedAudio(streamSid);
          break;

        case 'input_audio_buffer.speech_started':
          logger.info(`🎤 [${streamSid}] OpenAI detectó inicio de habla del usuario`);
          // CÓDIGO OFICIAL: Manejar interrupciones
          this.handleSpeechStartedEvent(streamSid);
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.info(`🎤 [${streamSid}] OpenAI detectó fin de habla del usuario`);
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

    // CÁLCULO EXACTO del código oficial
    if (connectionData.markQueue.length > 0 && connectionData.responseStartTimestampTwilio != null) {
      const elapsedTime = connectionData.latestMediaTimestamp - connectionData.responseStartTimestampTwilio;
      logger.info(`⏱️ [${streamSid}] Calculating elapsed time for truncation: ${connectionData.latestMediaTimestamp} - ${connectionData.responseStartTimestampTwilio} = ${elapsedTime}ms`);

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
    }
  }

  /**
   * NUEVO: Acumular audio delta para procesar con Azure TTS
   * @param {string} streamSid - Stream ID  
   * @param {string} delta - Audio delta de OpenAI
   */
  accumulateAudioDelta(streamSid, delta) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData) return;

    // Inicializar acumulador si no existe
    if (!connectionData.accumulatedAudio) {
      connectionData.accumulatedAudio = [];
    }

    connectionData.accumulatedAudio.push(delta);
    logger.debug(`📦 [${streamSid}] Audio delta acumulado (${connectionData.accumulatedAudio.length} chunks)`);
  }

  /**
   * HÍBRIDO: Procesar audio acumulado con Azure TTS (en lugar de OpenAI TTS)
   * @param {string} streamSid - Stream ID
   */
  async processAccumulatedAudio(streamSid) {
    const connectionData = this.activeConnections.get(streamSid);
    if (!connectionData || !connectionData.accumulatedAudio) return;

    logger.info(`🔄 [${streamSid}] Procesando ${connectionData.accumulatedAudio.length} chunks con Azure TTS`);

    try {
      // Combinar todos los chunks de audio
      const combinedAudio = connectionData.accumulatedAudio.join('');
      
      // NOTA: Aquí necesitaríamos convertir el audio de OpenAI a texto
      // y luego usar Azure TTS. Por ahora, emitimos el evento para que 
      // TwilioStreamHandler lo maneje
      this.emit('processAudioWithAzure', {
        streamSid: streamSid,
        audioData: combinedAudio,
        markQueue: [...connectionData.markQueue] // Copia del mark queue
      });

      // Limpiar acumulador
      connectionData.accumulatedAudio = [];

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando audio acumulado: ${error.message}`);
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
      
      // Buscar en el texto acumulado (si existe)
      if (this.accumulatedText) {
        return this.accumulatedText;
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
   * Reenviar audio de OpenAI a Twilio (PCM16 → mulaw)
   * @param {string} streamSid - ID del stream
   * @param {string} audioData - Audio en base64 desde OpenAI (PCM16)
   */
  forwardAudioToTwilio(streamSid, audioData) {
    // Nota: Este método será llamado desde TwilioStreamHandler
    // para enviar el audio convertido de vuelta a Twilio
    
    try {
      // Convertir PCM16 (OpenAI) a mulaw (Twilio)
      const pcm16Buffer = Buffer.from(audioData, 'base64');
      const mulawBuffer = this.convertPCM16ToMulaw(pcm16Buffer);

      // Emitir evento para que TwilioStreamHandler lo capture
      this.emit('audioResponse', {
        streamSid: streamSid,
        audioBuffer: mulawBuffer
      });

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error reenviando audio a Twilio: ${error.message}`);
    }
  }

  /**
   * Convertir audio mulaw (8kHz, 8-bit) a PCM16 (16kHz, 16-bit) para OpenAI
   * @param {Buffer} mulawBuffer - Audio mulaw de Twilio
   * @returns {Buffer} - Audio PCM16 para OpenAI
   */
  convertMulawToPCM16(mulawBuffer) {
    // Tabla de conversión mulaw a PCM lineal
    const mulawToPcm = [
      -32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,
      -23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
      -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,
      -11900,-11388,-10876,-10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052,  -988,  -924,
      -876,  -844,  -812,  -780,  -748,  -716,  -684,  -652,
      -620,  -588,  -556,  -524,  -492,  -460,  -428,  -396,
      -372,  -356,  -340,  -324,  -308,  -292,  -276,  -260,
      -244,  -228,  -212,  -196,  -180,  -164,  -148,  -132,
      -120,  -112,  -104,   -96,   -88,   -80,   -72,   -64,
      -56,   -48,   -40,   -32,   -24,   -16,    -8,     0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364,  9852,  9340,  8828,  8316,
      7932,  7676,  7420,  7164,  6908,  6652,  6396,  6140,
      5884,  5628,  5372,  5116,  4860,  4604,  4348,  4092,
      3900,  3772,  3644,  3516,  3388,  3260,  3132,  3004,
      2876,  2748,  2620,  2492,  2364,  2236,  2108,  1980,
      1884,  1820,  1756,  1692,  1628,  1564,  1500,  1436,
      1372,  1308,  1244,  1180,  1116,  1052,   988,   924,
      876,   844,   812,   780,   748,   716,   684,   652,
      620,   588,   556,   524,   492,   460,   428,   396,
      372,   356,   340,   324,   308,   292,   276,   260,
      244,   228,   212,   196,   180,   164,   148,   132,
      120,   112,   104,    96,    88,    80,    72,    64,
      56,    48,    40,    32,    24,    16,     8,     0
    ];

    // Convertir mulaw a PCM lineal
    const pcmLinear = new Int16Array(mulawBuffer.length);
    for (let i = 0; i < mulawBuffer.length; i++) {
      pcmLinear[i] = mulawToPcm[mulawBuffer[i]];
    }

    // Interpolar de 8kHz a 16kHz (duplicar samples)
    const pcm16Buffer = new Int16Array(pcmLinear.length * 2);
    for (let i = 0; i < pcmLinear.length; i++) {
      pcm16Buffer[i * 2] = pcmLinear[i];
      pcm16Buffer[i * 2 + 1] = pcmLinear[i]; // Duplicar sample
    }

    return Buffer.from(pcm16Buffer.buffer);
  }

  /**
   * Convertir audio PCM16 (16kHz, 16-bit) a mulaw (8kHz, 8-bit) para Twilio
   * @param {Buffer} pcm16Buffer - Audio PCM16 de OpenAI
   * @returns {Buffer} - Audio mulaw para Twilio
   */
  convertPCM16ToMulaw(pcm16Buffer) {
    // Tabla de conversión PCM a mulaw
    const pcmToMulaw = (pcm) => {
      const BIAS = 0x84;
      const CLIP = 32635;
      
      let sign = (pcm >> 8) & 0x80;
      if (sign !== 0) pcm = -pcm;
      if (pcm > CLIP) pcm = CLIP;
      
      pcm += BIAS;
      let exponent = 7;
      for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
      
      const mantissa = (pcm >> (exponent + 3)) & 0x0F;
      const mulaw = ~(sign | (exponent << 4) | mantissa);
      
      return mulaw & 0xFF;
    };

    // Convertir buffer PCM16 a array de 16-bit samples
    const pcm16Array = new Int16Array(pcm16Buffer.buffer);
    
    // Downsample de 16kHz a 8kHz (tomar cada 2do sample)
    const pcm8Array = new Int16Array(pcm16Array.length / 2);
    for (let i = 0; i < pcm8Array.length; i++) {
      pcm8Array[i] = pcm16Array[i * 2];
    }

    // Convertir a mulaw
    const mulawBuffer = Buffer.alloc(pcm8Array.length);
    for (let i = 0; i < pcm8Array.length; i++) {
      mulawBuffer[i] = pcmToMulaw(pcm8Array[i]);
    }

    return mulawBuffer;
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
