const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const OpenAIRealtimeService = require('../services/openaiRealtimeService');
const fs = require('fs');

class TwilioStreamHandler {
  constructor(prisma, ttsService) {
    this.prisma = prisma;
    this.ttsService = ttsService; // FIX: Asignar el servicio TTS
    
    // NUEVO: Servicio OpenAI Realtime (reemplaza sistema conversacional complejo)
    this.openaiRealtimeService = new OpenAIRealtimeService();
    
    // CRÍTICO PARA SISTEMA DE MARCAS: Conservar para saludo inicial
    this.pendingMarks = new Map(); // ✅ CRÍTICO PARA EVITAR ERRORES

    // Verificar inmediatamente después de inicializar
    if (!this.pendingMarks || !(this.pendingMarks instanceof Map)) {
      logger.error('🚨 CRÍTICO: pendingMarks no se inicializó correctamente en constructor');
      throw new Error('pendingMarks initialization failed');
    }

    // Mapas para gestión de estado y audio
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.audioBuffer = new Map(); // FIX: Inicializar audioBuffer para evitar error 'set' undefined
    this.echoBlanking = new Map();
    this.transcriptionActive = new Map();
    this.responseInProgress = new Map();
    // REMOVIDO: speechDetection (VAD obsoleto - ahora usa OpenAI server VAD)
    this.silenceStartTime = new Map();
    this.lastResponseTime = new Map();

    // NUEVO: Set para trackear streamSids ya procesados - evita duplicados
    this.processedStreamSids = new Set();

    // NUEVO: Cache de clientes para evitar consultas duplicadas
    this.clientCache = new Map();

    this.fallbackAudio = this.generateFallbackAudio();

    // Voice mapping from user-friendly names to Azure TTS voice identifiers
    // Voz única para todos los usuarios: Isidora Multilingüe (soporte SSML completo)
    this.defaultVoice = 'es-ES-IsidoraMultilingualNeural';
    
    // 📊 MÉTRICAS PARA MONITOREO PRODUCCIÓN
    this.metrics = {
      totalCalls: 0,
      activeCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageCallDuration: 0,
      openaiFailures: 0,
      azureFailures: 0,
      lastReset: Date.now()
    };

    // Configurar event listeners para OpenAI Realtime Service
    this.openaiRealtimeService.on('audioResponse', (data) => {
      this.handleOpenAIAudioResponse(data);
    });

    // NUEVOS EVENT LISTENERS del código oficial
    this.openaiRealtimeService.on('clearAudio', (data) => {
      this.handleClearAudio(data);
    });

    this.openaiRealtimeService.on('sendMark', (data) => {
      this.handleSendMark(data);
    });

    // ✅ NUEVO FLUJO SIMPLE: Texto de OpenAI → Azure TTS (como saludo inicial)
    this.openaiRealtimeService.on('processTextWithAzure', (data) => {
      this.handleProcessTextWithAzure(data);
    });

    // LOGS DE DIAGNÓSTICO - Verificar inicialización
    logger.info('🔍 DIAGNÓSTICO - Servicios inicializados:');
    logger.info(`🔍 - openaiRealtimeService: ${!!this.openaiRealtimeService}`);
    logger.info(`🔍 - pendingMarks: ${!!this.pendingMarks} (size: ${this.pendingMarks.size})`);
    logger.info(`🔍 - transcriptionActive: ${!!this.transcriptionActive}`);

    logger.info('🚀 TwilioStreamHandler inicializado con OpenAI Realtime API');
  }

  /**
   * Manejar respuesta de audio desde OpenAI Realtime Service
   * @param {Object} data - Datos del audio response {streamSid, audioBuffer}
   */
  async handleOpenAIAudioResponse(data) {
    const { streamSid, audioBuffer } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData || !streamData.twilioWs) {
      logger.warn(`⚠️ [${streamSid}] No hay conexión Twilio activa para enviar respuesta OpenAI`);
      return;
    }

    logger.info(`🤖 [${streamSid}] Enviando respuesta de audio OpenAI a Twilio (${audioBuffer.length} bytes)`);

    try {
      // Activar echo blanking durante respuesta del bot
      this.activateEchoBlanking(streamSid);
      
      // Enviar audio de OpenAI a Twilio usando el sistema de marcas
      const markId = `openai_response_${Date.now()}`;
      this.pendingMarks.set(markId, {
        streamSid: streamSid,
        action: 'deactivate_echo_blanking',
        timestamp: Date.now()
      });
      
      await this.sendRawMulawToTwilioWithMark(streamData.twilioWs, audioBuffer, streamSid, markId);
      logger.info(`✅ [${streamSid}] Respuesta OpenAI enviada con marca ${markId}`);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando respuesta OpenAI: ${error.message}`);
      // Desactivar echo blanking en caso de error
      this.deactivateEchoBlanking(streamSid);
    }
  }

  /**
   * Inicializar conexión OpenAI Realtime después del saludo inicial
   * @param {string} streamSid - ID del stream
   */
  async initializeOpenAIRealtimeConnection(streamSid) {
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData) {
      logger.error(`❌ [${streamSid}] No se encontró streamData para conectar OpenAI Realtime`);
      return;
    }

    try {
      logger.info(`🤖 [${streamSid}] Inicializando OpenAI Realtime Service con configuración del cliente`);
      
      // Preparar configuración del cliente
      const clientConfig = {
        companyName: streamData.client?.companyName || 'la empresa',
        companyDescription: streamData.client?.companyDescription || '',
        industry: streamData.client?.industry || '',
        ...streamData.client // Incluir toda la configuración disponible
      };

      // Inicializar conexión OpenAI Realtime
      await this.openaiRealtimeService.initializeConnection(streamSid, clientConfig);
      logger.info(`✅ [${streamSid}] OpenAI Realtime Service inicializado correctamente`);

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error crítico inicializando OpenAI Realtime: ${error.message}`, error.stack);
      
      // 🔧 MANEJO ROBUSTO: El sistema puede funcionar sin OpenAI Realtime (solo saludo inicial)
      logger.warn(`⚠️ [${streamSid}] Sistema continuará solo con saludo inicial - conversación inteligente deshabilitada`);
      
      // Marcar que OpenAI falló para el futuro
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.openaiRealtimeFailed = true;
      }
    }
  }

  /**
   * Maneja conexión WebSocket establecida
   */
  handleConnection(ws) {
    logger.info(`🔌 NUEVA CONEXIÓN WEBSOCKET ESTABLECIDA`);
    
    ws.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    logger.info(`🔌 Connection ID asignado: ${ws.connectionId}`);
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info(`📨 [${ws.connectionId}] Mensaje recibido: ${data.event}`);
        await this.handleMessage(ws, data);
      } catch (error) {
        logger.error(`❌ Error procesando mensaje: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      logger.error(`❌ Error en WebSocket ${ws.connectionId}: ${error.message}`);
    });

    ws.on('close', async () => {
      logger.info(`🔌 Conexión WebSocket cerrada: ${ws.connectionId}`);
      await this.cleanup(ws.connectionId);
    });
  }

  /**
   * Maneja mensajes WebSocket entrantes
   * @param {WebSocket} ws - Conexión WebSocket
   * @param {Object} data - Datos del mensaje
   */
  async handleMessage(ws, data) {
    const { event } = data;
    
    switch (event) {
      case 'connected':
        this.handleConnected(ws, data);
        break;
      case 'start':
        this.handleStart(ws, data);
        break;
      case 'media':
        await this.handleMediaEvent(ws, data);
        break;
      case 'mark':
        this.handleMark(data);
        break;
      case 'stop':
        await this.handleStop(ws, data);
        break;
      default:
        logger.warn(`⚠️ Evento WebSocket no reconocido: ${event}`);
    }
  }

  /**
   * Maneja evento 'connected' de Twilio
   */
  handleConnected(ws, data) {
    logger.info(`🔌 STREAM CONECTADO: ${JSON.stringify(data)}`);
    logger.info(`🔌 [${ws.connectionId}] Twilio Stream conectado exitosamente`);

    // IMPORTANTE: El evento 'connected' NO incluye streamSid, por lo que necesitamos usar un ID temporal
    // Usaremos el connectionId como ID temporal hasta que llegue el 'start' con streamSid real
    const tempId = ws.connectionId; // Usar connectionId como ID temporal

    // Obtener datos del cliente usando la información de la llamada
    // Nota: En 'connected', no tenemos streamSid, pero tenemos callSid en el TwiML
    // Sin embargo, para simplicidad, intentaremos obtener el cliente si está disponible
    // Si no, lo haremos en 'start' cuando tengamos streamSid
    this.activeStreams.set(tempId, {
      callSid: data.callSid || 'unknown', // Si callSid está disponible en 'connected'
      state: 'connected',
      startTime: Date.now(),
      lastActivity: Date.now(),
      tempId: tempId // Marcar como temporal
    });

    logger.info(`🔄 [${tempId}] Stream registrado con ID temporal (esperando streamSid en 'start')`);
  }

  /**
   * Maneja evento 'mark' de Twilio - CRÍTICO para activar transcripción
   */
  handleMark(data) {
    const streamSid = data.streamSid;
    const markName = data.mark?.name;

    // 🔧 MEJORA: Validar que tenemos streamSid
    if (!streamSid) {
      logger.warn(`⚠️ Mensaje mark sin streamSid recibido - IGNORANDO. Datos: ${JSON.stringify(data)}`);
      return;
    }

    if (!markName) {
      logger.warn(`⚠️ [${streamSid}] Mensaje mark sin nombre recibido - IGNORANDO`);
      return;
    }

    logger.info(`🎯 [${streamSid}] Marca recibida: ${markName}`);
    // logger.info(`🔍 [${streamSid}] DEBUG handleMark: markData = ${JSON.stringify(data.mark)}`);

    // Verificar si tenemos una acción pendiente para esta marca
    if (!this.pendingMarks) {
      logger.warn(`⚠️ [${streamSid}] pendingMarks no inicializado - IGNORANDO marca ${markName}`);
      logger.error(`🔍 DEBUG: pendingMarks is undefined! Checking constructor initialization.`);
      return;
    }

    if (!this.pendingMarks.has(markName)) {
      // logger.warn(`⚠️ [${streamSid}] Marca ${markName} no esperada (no está en pendingMarks) - IGNORANDO. pendingMarks entries: ${Array.from(this.pendingMarks.keys()).join(', ')}`);
      return;
    }

    const markData = this.pendingMarks.get(markName);
    logger.info(`🚀 [${streamSid}] Ejecutando acción para marca ${markName}: ${markData.action}`);
    // logger.info(`🔍 [${streamSid}] DEBUG handleMark: pendingMarks has ${this.pendingMarks.size} entries`);

    // Ejecutar la acción correspondiente
    switch (markData.action) {
      case 'activate_transcription':
        logger.info(`🎤 [${streamSid}] ACTIVANDO transcripción tras saludo (marca: ${markName})`);
        
        // ✅ CRÍTICO: Inicializar OpenAI SOLO cuando el saludo termine completamente
        logger.info(`🤖 [${streamSid}] Inicializando OpenAI Realtime API tras completar saludo`);
        this.initializeOpenAIRealtimeConnection(streamSid);
        
        // Activar transcripción directamente
        this.transcriptionActive.set(streamSid, true);
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.state = 'listening';
          streamData.greetingCompletedAt = Date.now();
        }
        logger.info(`✅ [${streamSid}] OpenAI inicializado y transcripción activada - usuario puede hablar`);
        break;
      case 'deactivate_echo_blanking':
        logger.info(`⚡ [${streamSid}] DESACTIVANDO echo blanking tras completar respuesta (marca: ${markName})`);
        this.deactivateEchoBlanking(streamSid);
        this.responseInProgress.delete(streamSid);
        logger.info(`✅ [${streamSid}] Echo blanking desactivado - usuario puede hablar de nuevo`);
        break;
      default:
        logger.warn(`⚠️ [${streamSid}] Acción desconocida para marca ${markName}: ${markData.action} - IGNORANDO`);
    }

    // CÓDIGO OFICIAL: Manejar marks del sistema OpenAI Realtime (responsePart)
    if (markName === 'responsePart') {
      logger.debug(`📍 [${streamSid}] Procesando marca responsePart del código oficial`);
      // Notificar al OpenAI Realtime Service que la marca fue procesada
      this.openaiRealtimeService.processMarkCompletion(streamSid, markName);
      logger.debug(`✅ [${streamSid}] Marca responsePart procesada y removida del queue`);
    }

    // Limpiar la marca procesada
    this.pendingMarks.delete(markName);
    logger.info(`🧹 [${streamSid}] Marca ${markName} procesada y limpiada`);
  }

  /**
   * Activa la transcripción después de que el audio termine (llamado por handleMark)
   */
  activateTranscriptionAfterAudio(streamSid) {
    logger.info(`🔍 [${streamSid}] Estado ANTES de activar transcripción:`);
    logger.info(`🔍 [${streamSid}] - echoBlanking activo: ${this.echoBlanking.get(streamSid)?.active}`);
    logger.info(`🔍 [${streamSid}] - transcripción activa: ${this.transcriptionActive.get(streamSid)}`);
    logger.info(`🔍 [${streamSid}] - streamData state: ${this.activeStreams.get(streamSid)?.state}`);
    
    // Desactivar echo blanking (esto activa la transcripción automáticamente)
    this.deactivateEchoBlanking(streamSid);
    
    // ACTIVACIÓN EXPLÍCITA COMO FALLBACK
    if (!this.transcriptionActive.get(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] Transcripción no se activó automáticamente - activando manualmente`);
      this.transcriptionActive.set(streamSid, true);
      
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.state = 'listening';
      }
    }
    
    logger.info(`🔍 [${streamSid}] Estado DESPUÉS de activar transcripción:`);
    logger.info(`🔍 [${streamSid}] - echoBlanking activo: ${this.echoBlanking.get(streamSid)?.active}`);
    logger.info(`🔍 [${streamSid}] - transcripción activa: ${this.transcriptionActive.get(streamSid)}`);
    logger.info(`🔍 [${streamSid}] - streamData state: ${this.activeStreams.get(streamSid)?.state}`);
    
    logger.info(`✅ [${streamSid}] Transcripción activada exitosamente - el usuario ya puede hablar`);
  }

  /**
   * Obtener datos del cliente para un stream usando callSid
   * @param {string} streamSid - Stream SID
   * @param {string} callSid - Call SID
   */
  async getClientForStream(streamSid, callSid) {
    try {
      logger.info(`🔍 [${streamSid}] Obteniendo cliente para callSid: ${callSid}`);

      // 🔧 OPTIMIZAR: Verificar cache primero para evitar consultas duplicadas
      if (this.clientCache.has(callSid)) {
        const cachedClient = this.clientCache.get(callSid);
        logger.info(`⚡ [${streamSid}] Cliente obtenido de cache: ${cachedClient.name || cachedClient.id}`);

        // Actualizar streamData con el cliente del cache
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.client = cachedClient;
        }
        return cachedClient;
      }

      // Buscar el cliente en la base de datos usando callSid
      // Nota: En producción, callSid puede no estar directamente en la DB, pero lo intentamos
      const client = await this.prisma.client.findFirst({
        where: {
          // Si tienes una relación con llamadas, úsala aquí
          // Por ahora, asumimos que callSid no está en la DB, así que usamos un cliente por defecto
          // O implementa la lógica real si tienes callSid en tu esquema
        }
      });

      if (client) {
        // Cachear el cliente encontrado
        this.clientCache.set(callSid, client);

        // Actualizar streamData con el cliente
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.client = client;
          logger.info(`✅ [${streamSid}] Cliente obtenido: ${client.name || client.id}`);
        }
      } else {
        logger.warn(`⚠️ [${streamSid}] No se encontró cliente para callSid: ${callSid} - usando cliente por defecto`);
        // Usar cliente por defecto o manejar error
        // Por simplicidad, asumir cliente ID 1 como antes
        const defaultClient = await this.prisma.client.findUnique({
          where: { id: 1 }
        });
        if (defaultClient) {
          // Cachear el cliente por defecto
          this.clientCache.set(callSid, defaultClient);

          const streamData = this.activeStreams.get(streamSid);
          if (streamData) {
            streamData.client = defaultClient;
            logger.info(`✅ [${streamSid}] Cliente por defecto obtenido: ${defaultClient.name}`);
          }
        } else {
          logger.error(`❌ [${streamSid}] No se pudo obtener cliente por defecto`);
        }
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error obteniendo cliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja evento 'start' de Twilio Stream
   */
  handleStart(ws, data) {
    const streamSid = data.start?.streamSid;
    const callSid = data.start?.callSid;

    if (!streamSid) {
      logger.error('❌ No se recibió streamSid en evento start');
      return;
    }

    // 🔒 VERIFICACIÓN CRÍTICA: Evitar procesamiento duplicado de streamSid
    if (this.processedStreamSids.has(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] StreamSid ya procesado anteriormente - IGNORANDO DUPLICADO`);
      return;
    }

    // 📊 INCREMENTAR MÉTRICAS
    this.updateMetrics('start');
    
    logger.info(`🎵 [${streamSid}] Stream iniciado para llamada ${callSid}`);

    // Buscar el stream temporal usando connectionId
    const tempId = ws.connectionId;
    const tempStreamData = this.activeStreams.get(tempId);

    if (tempStreamData) {
      // Migrar del ID temporal al streamSid real
      this.activeStreams.set(streamSid, {
        ...tempStreamData,
        streamSid: streamSid,
        callSid: callSid,
        state: 'connected',
        startTime: Date.now(),
        lastActivity: Date.now(),
        greetingSent: false, // 🔧 EXPLÍCITO: Inicializar como false
        twilioWs: ws // NUEVO: Almacenar referencia WebSocket para OpenAI Realtime
      });

      // Eliminar el registro temporal
      this.activeStreams.delete(tempId);

      logger.info(`🔄 [${streamSid}] Migrado de ID temporal ${tempId} a streamSid real`);
    } else {
      // Si no hay stream temporal, inicializar directamente
      this.activeStreams.set(streamSid, {
        callSid,
        streamSid,
        state: 'connected',
        startTime: Date.now(),
        lastActivity: Date.now(),
        greetingSent: false, // 🔧 EXPLÍCITO: Inicializar como false
        twilioWs: ws // NUEVO: Almacenar referencia WebSocket para OpenAI Realtime
      });
    }

    // ✅ Marcar streamSid como procesado para evitar duplicados
    this.processedStreamSids.add(streamSid);

    // VERIFICACIÓN CRÍTICA: Solo enviar saludo si no se ha enviado ya
    const existingStreamData = this.activeStreams.get(streamSid);
    if (existingStreamData?.greetingSent) {
      logger.info(`⚠️ [${streamSid}] Saludo ya enviado (greetingSent=true), omitiendo`);
      return;
    }

    logger.info(`🔍 [${streamSid}] greetingSent status: ${existingStreamData?.greetingSent}`);

    // Inicializar sistemas necesarios
    // REMOVIDO: initializeSpeechDetection (VAD obsoleto - ahora usa OpenAI server VAD)
    this.initializeEchoBlanking(streamSid);

    // Obtener cliente y enviar saludo UNA SOLA VEZ
    this.getClientForStream(streamSid, callSid).then(() => {
      // Verificar de nuevo antes de enviar (doble verificación)
      const streamData = this.activeStreams.get(streamSid);
      if (streamData?.greetingSent) {
        logger.info(`⚠️ [${streamSid}] Saludo ya enviado durante getClientForStream (greetingSent=true), omitiendo`);
        return;
      }

      logger.info(`🔍 [${streamSid}] Enviando saludo después de getClientForStream - greetingSent: ${streamData?.greetingSent}`);

      this.sendInitialGreeting(ws, { streamSid, callSid }).catch(error => {
        logger.error(`❌ [${streamSid}] Error en saludo inicial: ${error.message}`);
      });
    }).catch(error => {
      logger.error(`❌ [${streamSid}] Error obteniendo cliente: ${error.message}`);
    });

    // Inicializar buffers y estados
    this.audioBuffers.set(streamSid, []);
    this.audioBuffer.set(streamSid, []);
    this.transcriptionActive.set(streamSid, false);
    this.responseInProgress.set(streamSid, false);
  }

  /**
   * Maneja evento 'stop' de Twilio Stream
   */
  async handleStop(ws, data) {
    const streamSid = data.stop?.streamSid;

    if (streamSid) {
      logger.info(`🛑 [${streamSid}] Stream detenido`);
      await this.cleanup(streamSid);
    }
  }

  /**
   * Limpia recursos asociados a un stream
   */
  async cleanup(streamSid) {
    // 📊 CALCULAR DURACIÓN DE LLAMADA PARA MÉTRICAS
    const streamData = this.activeStreams.get(streamSid);
    const callDuration = streamData ? Date.now() - streamData.startTime : 0;
    const companyName = streamData?.client?.companyName || 'UNKNOWN';
    const callSid = streamData?.callSid || 'NO-SID';
    
    // 🔍 CORRELATION ID PARA DEBUGGING
    const correlationId = this.generateCorrelationId(streamSid, callSid, companyName);
    
    logger.info(`🧹 [${correlationId}] Iniciando limpieza de recursos (duration: ${callDuration}ms)`);

    // 📊 ACTUALIZAR MÉTRICAS DE FINALIZACIÓN
    if (callDuration > 0) {
      this.updateMetrics('success', callDuration);
    }

    // NUEVO: Cerrar conexión OpenAI Realtime
    if (this.openaiRealtimeService.isConnectionActive(streamSid)) {
      logger.info(`🤖 [${correlationId}] Cerrando conexión OpenAI Realtime`);
      await this.openaiRealtimeService.closeConnection(streamSid);
    }

    // 🔧 NUEVO: Limpiar clientCache entries relacionadas ANTES de borrar streamData
    if (streamData?.callSid) {
      this.clientCache.delete(streamData.callSid);
      logger.debug(`🧹 [${correlationId}] ClientCache limpiado para callSid: ${streamData.callSid}`);
    }

    // Limpiar todos los mapas y recursos
    this.activeStreams.delete(streamSid);
    this.audioBuffers.delete(streamSid);
    this.transcriptionActive.delete(streamSid);
    this.responseInProgress.delete(streamSid);
    this.silenceStartTime.delete(streamSid);
    this.lastResponseTime.delete(streamSid);
    // REMOVIDO: speechDetection y energySamples (VAD obsoleto)
    this.echoBlanking.delete(streamSid);
    this.pendingMarks.delete(streamSid);

    // 🔧 CRÍTICO: Limpiar processedStreamSids para evitar memory leaks
    this.processedStreamSids.delete(streamSid);

    logger.info(`✅ [${streamSid}] Recursos limpiados correctamente`);
  }

  /**
   * 🔍 GENERAR CORRELATION ID PARA DEBUGGING
   * @param {string} streamSid - Stream SID
   * @param {string} callSid - Call SID  
   * @param {string} companyName - Nombre de empresa
   * @returns {string} Correlation ID único
   */
  generateCorrelationId(streamSid, callSid, companyName = 'UNKNOWN') {
    const shortStreamSid = streamSid ? streamSid.slice(-8) : 'NO-SID';
    const shortCallSid = callSid ? callSid.slice(-8) : 'NO-CALL';
    const company = companyName.substring(0, 10).toUpperCase();
    return `${company}|${shortStreamSid}|${shortCallSid}`;
  }

  /**
   * 📊 OBTENER MÉTRICAS PARA MONITOREO
   * @returns {Object} Métricas actuales del sistema
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeStreams: this.activeStreams.size,
      pendingMarks: this.pendingMarks.size,
      clientCacheSize: this.clientCache.size,
      uptime: Date.now() - this.metrics.lastReset
    };
  }

  /**
   * 📊 ACTUALIZAR MÉTRICAS DE LLAMADA
   * @param {string} type - Tipo de evento (start|success|fail)
   * @param {number} duration - Duración en ms (opcional)
   */
  updateMetrics(type, duration = 0) {
    switch (type) {
      case 'start':
        this.metrics.totalCalls++;
        this.metrics.activeCalls++;
        break;
      case 'success':
        this.metrics.successfulCalls++;
        this.metrics.activeCalls--;
        if (duration > 0) {
          const avgDuration = this.metrics.averageCallDuration;
          const totalSuccessful = this.metrics.successfulCalls;
          this.metrics.averageCallDuration = ((avgDuration * (totalSuccessful - 1)) + duration) / totalSuccessful;
        }
        break;
      case 'fail':
        this.metrics.failedCalls++;
        this.metrics.activeCalls--;
        break;
      case 'openai_fail':
        this.metrics.openaiFailures++;
        break;
      case 'azure_fail':
        this.metrics.azureFailures++;
        break;
    }
  }

  /**
   * Maps a user-friendly voice name to a valid Azure TTS voice identifier
   * @param {string} voiceId - User-friendly voice name
   * @param {string} language - Language code (e.g., 'es-ES', 'en-US')
   * @returns {string} Valid Azure TTS voice identifier
   */
  mapVoiceToAzure(voiceId, language = 'es-ES') {
    // Siempre usar Isidora Multilingüe para todos los usuarios (configuración optimizada)
    // logger.info(`🎵 Using Isidora Multilingual voice for all users: ${this.defaultVoice}`);
    return this.defaultVoice;
  }

  /**
   * Humanizar texto con SSML para que Isidora Multilingüe suene más natural
   * @param {string} text - Texto a humanizar
   * @param {string} style - Estilo SSML: 'chat', 'empathetic', 'friendly', 'calm'
   * @returns {string} Texto con SSML aplicado (solo contenido interno)
   */
  humanizeTextWithSSML(text, style = 'chat') {
    // Limpiar texto de posibles caracteres problemáticos
    const cleanText = text.replace(/[<>&"']/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
      return entities[match];
    });

    // Solo devolver el contenido SSML interno (sin <speak> wrapper)
    // El servicio TTS ya agrega el wrapper completo
    // Estilos optimizados para Isidora Multilingüe - velocidad 1.1 en todos
    const styleSettings = {
      'chat': { rate: '1.1', pitch: '-2%', volume: '90%', breakTime: '400ms' },
      'empathetic': { rate: '1.1', pitch: '-3%', volume: '85%', breakTime: '500ms' },
      'friendly': { rate: '1.1', pitch: '+1%', volume: '95%', breakTime: '250ms' },
      'calm': { rate: '1.1', pitch: '-4%', volume: '80%', breakTime: '600ms' },
      'cheerful': { rate: '1.1', pitch: '+2%', volume: '95%', breakTime: '300ms' }
    };
    
    const settings = styleSettings[style] || styleSettings['chat'];
    
    const ssmlContent = `
          <mstts:express-as style="${style}">
            <prosody rate="${settings.rate}" pitch="${settings.pitch}" volume="${settings.volume}">
              ${cleanText.replace(/\./g, `.<break time="${settings.breakTime}"/>`)}
            </prosody>
          </mstts:express-as>
    `.trim();

    logger.info(`🎭 SSML humanizado aplicado: ${ssmlContent.substring(0, 100)}...`);
    return ssmlContent;
  }  

  /**
   * Stream conectado - SOLO registrar conexión
   */

  // Generar saludo inicial - SOLO UNA VEZ POR STREAM
  async sendInitialGreeting(ws, { streamSid, callSid }) {
    logger.info(`🔍 [${streamSid}] INICIANDO sendInitialGreeting`);
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData?.client) {
      logger.error(`❌ [${streamSid}] Sin configuración de cliente`);
      return;
    }

    // Marcar como saludo enviado para evitar duplicados
    streamData.greetingSent = true;
    // logger.info(`🔍 [${streamSid}] Marcando saludo como enviado`);

    const clientConfigData = await this.prisma.client.findUnique({
      where: { id: parseInt(streamData.client.id) },
      select: {
        callConfig: true
      }
    });

    const greeting = clientConfigData.callConfig?.greeting;
    logger.info(`🔊 [${streamSid}] Using greeting from DB: "${greeting}"`);
    
    // Get voice configuration and map to valid Azure voice
    const rawVoiceId = streamData.client.callConfig?.voiceId || 
                      clientConfigData.callConfig?.voiceId || 
                      'isidora';
    const language = streamData.client.callConfig?.language || 
                    clientConfigData.callConfig?.language || 
                    'es-ES';
    
    // DEBUG: Log complete callConfig structure (solo si hay problemas)
    // logger.info(`🔍 [${streamSid}] Complete callConfig from streamData: ${JSON.stringify(streamData.client.callConfig, null, 2)}`);
    // logger.info(`🔍 [${streamSid}] Complete callConfig from DB: ${JSON.stringify(clientConfigData.callConfig, null, 2)}`);
    
    const voiceId = this.mapVoiceToAzure(rawVoiceId, language);
    
    logger.info(`🎵 [${streamSid}] Raw voice from DB: "${rawVoiceId}"`);
    logger.info(`🎵 [${streamSid}] Mapped Azure voice: "${voiceId}"`);
    logger.info(`🌍 [${streamSid}] Language: "${language}"`);
  
    logger.info(`🔊 [${streamSid}] Generando saludo: "${greeting?.substring(0, 50)}..."`);

    // Verificar longitud mínima (10 caracteres)
    if (!greeting || greeting.length < 10) {
      logger.warn(`⚠️ [${streamSid}] Saludo muy corto o vacío: "${greeting}" - usando fallback`);
      await this.sendExtendedGreeting(ws, streamSid, streamData.client);
      return;
    }

    try {
      // 3. Humanizar el saludo con SSML
      const humanizedGreeting = this.humanizeTextWithSSML(greeting);
      // logger.info(`🎭 [${streamSid}] SSML generado: ${humanizedGreeting.substring(0, 100)}...`);
      
      // 4. Generar audio con Azure TTS usando SSML humanizado con timeout
      logger.info(`🔊 [${streamSid}] Iniciando Azure TTS con timeout de 10s...`);
      const ttsPromise = this.ttsService.generateSpeech(
        humanizedGreeting,
        voiceId,
        'raw-8khz-8bit-mono-mulaw'
      );
      
      // Agregar timeout para evitar que Azure TTS se cuelgue en producción
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Azure TTS timeout after 10 seconds')), 10000);
      });
      
      const ttsResult = await Promise.race([ttsPromise, timeoutPromise]);
      logger.info(`🔍 [${streamSid}] TTS Result: success=${ttsResult?.success}, audioBuffer length=${ttsResult?.audioBuffer?.length}`);
      
      // ECHO BLANKING: Activar blanking antes de enviar audio del bot
      this.activateEchoBlanking(streamSid);

      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        // logger.info(`🔍 [${streamSid}] ANTES de sendRawMulawToTwilio`);
        
        // Calcular duración aproximada del audio para timing correcto
        const audioLengthMs = Math.ceil((ttsResult.audioBuffer.length / 8000) * 1000); // 8kHz mulaw
        logger.info(`🔍 [${streamSid}] Audio length: ${ttsResult.audioBuffer.length} bytes = ~${audioLengthMs}ms`);
        
        // Usar sistema de marcas para activar transcripción después del saludo
        const markId = `greeting_end_${Date.now()}`;
        logger.info(`🎯 [${streamSid}] Enviando saludo con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para activar transcripción
        this.pendingMarks = this.pendingMarks || new Map();
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'activate_transcription',
          timestamp: Date.now()
        });
        
        // Enviar audio con marca al final
        await this.sendRawMulawToTwilioWithMark(ws, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Audio del saludo enviado con marca ${markId}`);

        // 🚫 REMOVIDO: setTimeout para desactivar echo blanking
        // RAZÓN: Ahora usamos SOLO el sistema de marcas para mayor precisión
        // El echo blanking se mantendrá activo hasta que Twilio confirme que terminó de reproducir
      } else {
        logger.error(`❌ [${streamSid}] TTS falló: ${ttsResult?.error || 'Unknown error'}`);
        throw new Error('TTS failed');
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // 4. Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      
      // Activar echo blanking durante fallback
      this.activateEchoBlanking(streamSid);
      
      // Usar sistema de marcas para activar transcripción después del fallback
      const markId = `fallback_end_${Date.now()}`;
      logger.info(`🎯 [${streamSid}] Enviando fallback con marca: ${markId}`);
      
      // Registrar que esperamos esta marca para activar transcripción
      this.pendingMarks = this.pendingMarks || new Map();
      this.pendingMarks.set(markId, {
        streamSid: streamSid,
        action: 'activate_transcription',
        timestamp: Date.now()
      });
      
      // Enviar fallback con marca al final
      await this.sendRawMulawToTwilioWithMark(ws, this.fallbackAudio, streamSid, markId);
      logger.info(`✅ [${streamSid}] Audio fallback del saludo enviado con marca ${markId}`);

      // 🚫 REMOVIDO: setTimeout para desactivar echo blanking del fallback
      // RAZÓN: Consistente con saludo normal, usamos SOLO sistema de marcas
    }
    
    // 🚫 REMOVIDO: NO inicializar OpenAI aquí - se hará cuando termine el saludo
    // Motivo: Evitar que OpenAI detecte el echo del saludo como voz del usuario
    
    logger.info(`🔍 [${streamSid}] FINALIZANDO sendInitialGreeting - OpenAI se inicializará al terminar el saludo`);
  }

  async sendExtendedGreeting(ws, streamSid, clientConfigData) {
    const fallbackGreeting = "Gracias por llamar. Estamos conectándote con un asistente. Por favor, espera un momento.";
    
    // Get voice configuration and map to valid Azure voice
    const rawVoiceId = clientConfigData.callConfig?.voiceId || 
                      'isidora';
    const language = clientConfigData.callConfig?.language || 
                    'es-ES';
    
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback`);
    logger.info(`🎵 [${streamSid}] Raw voice: "${rawVoiceId}" → Mapped: "${this.mapVoiceToAzure(rawVoiceId, language)}"`);
  
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback con voz: ${this.mapVoiceToAzure(rawVoiceId, language)}`);
  
    // Humanizar el saludo de fallback con SSML
    const humanizedFallback = this.humanizeTextWithSSML(fallbackGreeting);
    
    try {
      logger.info(`🔊 [${streamSid}] Iniciando Azure TTS para saludo extendido con timeout de 10s...`);
      const ttsPromise = this.ttsService.generateSpeech(
        humanizedFallback,
        this.mapVoiceToAzure(rawVoiceId, language),
        'raw-8khz-8bit-mono-mulaw'
      );
      
      // Agregar timeout para evitar que Azure TTS se cuelgue en producción
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Azure TTS timeout after 10 seconds')), 10000);
      });
      
      const ttsResult = await Promise.race([ttsPromise, timeoutPromise]);
      
      // ECHO BLANKING: Activar blanking antes de enviar audio del bot
      this.activateEchoBlanking(streamSid);
    
      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        // Calcular duración aproximada del audio para timing correcto
        const audioLengthMs = Math.ceil((ttsResult.audioBuffer.length / 8000) * 1000); // 8kHz mulaw
        logger.info(`🔍 [${streamSid}] Audio length: ${ttsResult.audioBuffer.length} bytes = ~${audioLengthMs}ms`);
        
        // Usar sistema de marcas para activar transcripción
        const markId = `extended_greeting_end_${Date.now()}`;
        logger.info(`🎯 [${streamSid}] Enviando saludo extendido con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para activar transcripción
        this.pendingMarks = this.pendingMarks || new Map();
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'activate_transcription',
          timestamp: Date.now()
        });
        
        // Enviar audio con marca al final
        await this.sendRawMulawToTwilioWithMark(ws, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Saludo extendido enviado con marca ${markId}`);

        // 🔧 CRÍTICO: Desactivar echo blanking después del audio
        // Cálculo correcto: audio mulaw 8kHz = 1 byte per sample = 8000 bytes/segundo
        const audioDurationMs = Math.ceil((ttsResult.audioBuffer.length / 8000) * 1000);
        const safetyMarginMs = 3000; // 3 segundos de margen de seguridad  
        const totalBlankingTime = audioDurationMs + safetyMarginMs;
        
        logger.info(`🔊 [${streamSid}] EXTENDIDO: Echo blanking calculado: ${audioDurationMs}ms audio + ${safetyMarginMs}ms margen = ${totalBlankingTime}ms total`);
        
        setTimeout(() => {
          this.deactivateEchoBlanking(streamSid);
          logger.info(`🔊 [${streamSid}] EXTENDIDO: Echo blanking TIMEOUT desactivado tras ${totalBlankingTime}ms`);
        }, totalBlankingTime);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en saludo extendido: ${error.message}`);
      
      // Usar audio de fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback para saludo extendido`);
      
      // Activar echo blanking durante fallback
      this.activateEchoBlanking(streamSid);
      
      // Usar sistema de marcas para activar transcripción después del fallback extendido
      const markId = `extended_fallback_end_${Date.now()}`;
      logger.info(`🎯 [${streamSid}] Enviando fallback extendido con marca: ${markId}`);
      
      // Registrar que esperamos esta marca para activar transcripción
      this.pendingMarks = this.pendingMarks || new Map();
      this.pendingMarks.set(markId, {
        streamSid: streamSid,
        action: 'activate_transcription',
        timestamp: Date.now()
      });
      
      // Enviar fallback con marca al final
      await this.sendRawMulawToTwilioWithMark(ws, this.fallbackAudio, streamSid, markId);
      logger.info(`✅ [${streamSid}] Fallback del saludo extendido enviado con marca ${markId}`);

      // 🔧 CRÍTICO: Desactivar echo blanking después del audio de fallback
      setTimeout(() => {
        this.deactivateEchoBlanking(streamSid);
      }, 2000); // 2 segundos para el audio de fallback
    }
  }

  async sendRawMulawToTwilio(ws, mulawBuffer, streamSid) {
    const chunkSize = 160;
    let offset = 0;
    
    while (offset < mulawBuffer.length) {
      const chunk = mulawBuffer.subarray(offset, offset + chunkSize);
      const base64Chunk = chunk.toString('base64');
      
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: base64Chunk }
      }));
      
      offset += chunkSize;
    }
    
    logger.info(`✅ [${streamSid}] Audio enviado: ${Math.ceil(mulawBuffer.length / chunkSize)} chunks`);
  }

  /**
   * Enviar audio con marca para detectar cuando termina la reproducción
   */
  async sendRawMulawToTwilioWithMark(ws, mulawBuffer, streamSid, markId) {
    logger.info(`🔊 [${streamSid}] Enviando audio con marca: ${markId}`);
    logger.info(`🔊 Tamaño del buffer de audio: ${mulawBuffer.length} bytes`);
    
    // Ensure minimum audio length (1 second = 8000 bytes)
    if (mulawBuffer.length < 8000) {
      const padding = Buffer.alloc(8000 - mulawBuffer.length, 0xFF);
      mulawBuffer = Buffer.concat([mulawBuffer, padding]);
      logger.info(`🔊 [${streamSid}] Añadido padding de audio: ${padding.length} bytes`);
    }
    
    const chunkSize = 160;
    let offset = 0;
    let chunkCount = 0;
    
    logger.info(`🎵 [${streamSid}] Iniciando transmisión de audio con marca (${mulawBuffer.length} bytes)`);
    
    // Enviar todos los chunks de audio
    while (offset < mulawBuffer.length) {
      const chunk = mulawBuffer.subarray(offset, offset + chunkSize);
      const base64Chunk = chunk.toString('base64');
      
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: base64Chunk }
      }));
      
      chunkCount++;
      offset += chunkSize;
    }
    
    // CRÍTICO: Enviar marca DESPUÉS del audio para detectar cuando termina
    ws.send(JSON.stringify({
      event: 'mark',
      streamSid: streamSid,
      mark: { name: markId }
    }));
    
    logger.info(`✅ [${streamSid}] Audio enviado (${chunkCount} chunks) + marca ${markId}`);
  }

  generateFallbackAudio() {
    // Crear audio de 2 segundos (8000 samples * 2 = 16000 bytes) en lugar de 160 bytes
    const buffer = Buffer.alloc(16000, 0xFF); // Silencio audible de 2 segundos
    return buffer;
  };

  // REMOVIDO: initializeSpeechDetection() - VAD obsoleto, ahora usa OpenAI server VAD

  /**
   * Inicializar sistema de echo blanking para un stream
   */
  initializeEchoBlanking(streamSid) {
    this.echoBlanking.set(streamSid, {
      active: false,
      endTime: 0,
      lastActivation: 0
    });
    logger.info(`🔇 [${streamSid}] Echo blanking inicializado`);
  }

  /**
   * Activar Echo Blanking cuando el bot va a hablar
   */
  activateEchoBlanking(streamSid) {
    const echoBlanking = this.echoBlanking.get(streamSid);
    if (echoBlanking) {
      const now = Date.now();
      const duration = 2000; // 2 seconds echo blanking duration
      echoBlanking.active = true;
      echoBlanking.endTime = now + duration;
      logger.info(`🔇 [${streamSid}] Echo Blanking ACTIVADO por ${duration}ms`);
    }
  }

  /**
   * Desactivar Echo Blanking manualmente
   */
  deactivateEchoBlanking(streamSid) {
    logger.info(`🔍 [${streamSid}] INICIANDO deactivateEchoBlanking()`);
    
    const echoBlanking = this.echoBlanking.get(streamSid);
    logger.info(`🔍 [${streamSid}] echoBlanking obtenido:`, echoBlanking);
    
    if (!echoBlanking) {
      logger.error(`❌ [${streamSid}] NO HAY echoBlanking en el mapa`);
      return;
    }
    
    logger.info(`🔍 [${streamSid}] echoBlanking.active = ${echoBlanking.active}`);
    
    if (echoBlanking && echoBlanking.active) {
      logger.info(`🔍 [${streamSid}] Desactivando echo blanking...`);
      echoBlanking.active = false;
      echoBlanking.endTime = 0;
      logger.info(`🔇 [${streamSid}] Echo Blanking DESACTIVADO`);
      
      // Activar transcripción automáticamente cuando se desactiva echo blanking
      const streamData = this.activeStreams.get(streamSid);
      logger.info(`🔍 [${streamSid}] streamData obtenido:`, streamData ? 'EXISTS' : 'NULL');
      
      const currentTranscriptionState = this.transcriptionActive.get(streamSid);
      logger.info(`🔍 [${streamSid}] Estado actual transcripción: ${currentTranscriptionState}`);
      
      if (streamData && !this.transcriptionActive.get(streamSid)) {
        logger.info(`🔍 [${streamSid}] ACTIVANDO TRANSCRIPCIÓN...`);
        this.transcriptionActive.set(streamSid, true);
        streamData.state = 'listening';
        streamData.greetingCompletedAt = Date.now();
        
        // Verificar que se activó correctamente
        const newTranscriptionState = this.transcriptionActive.get(streamSid);
        logger.info(`🚀 [${streamSid}] Transcripción activada! Nuevo estado: ${newTranscriptionState}`);
        logger.info(`🚀 [${streamSid}] streamData.state = ${streamData.state}`);
      } else {
        logger.warn(`⚠️ [${streamSid}] NO se activó transcripción:`);
        logger.warn(`⚠️ [${streamSid}] - streamData existe: ${!!streamData}`);
        logger.warn(`⚠️ [${streamSid}] - transcripción ya activa: ${this.transcriptionActive.get(streamSid)}`);
      }
    } else {
      logger.warn(`⚠️ [${streamSid}] Echo blanking NO estaba activo o no existe`);
      logger.warn(`⚠️ [${streamSid}] - echoBlanking existe: ${!!echoBlanking}`);
      logger.warn(`⚠️ [${streamSid}] - echoBlanking.active: ${echoBlanking?.active}`);
    }
    
    logger.info(`🔍 [${streamSid}] FINALIZANDO deactivateEchoBlanking()`);
  }

  /**
   * Verificar si Echo Blanking está activo
   */
  isEchoBlankingActive(streamSid) {
    const echoBlanking = this.echoBlanking.get(streamSid);
    if (!echoBlanking) return false;
    
    const now = Date.now();
    if (echoBlanking.active && now > echoBlanking.endTime) {
      echoBlanking.active = false;
      logger.info(`🔊 [${streamSid}] Echo Blanking DESACTIVADO`);
    }
    
    return echoBlanking.active;
  }

  /**
   * Analizar calidad y características del buffer de audio
   */

  /**
   * HÍBRIDO: Manejar eventos de media con timestamps del código oficial
   */
  async handleMediaEvent(ws, data) {
    const { streamSid } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    // Solo procesar si transcripción está activa (después del saludo)
    if (!streamData || !this.transcriptionActive.get(streamSid)) {
      return;
    }

    // No procesar si echo blanking está activo (bot hablando)
    if (this.isEchoBlankingActive(streamSid)) {
      return;
    }

    const payload = data.media?.payload;
    const mediaTimestamp = data.media?.timestamp; // CÓDIGO OFICIAL: Capturar timestamp
    const track = data.media?.track; // VALIDACIÓN: Verificar track type
    
    // 🔧 VALIDACIÓN: Solo procesar audio inbound según estándares Twilio
    if (!payload || track !== 'inbound') {
      logger.debug(`🔍 [${streamSid}] Ignorando media: payload=${!!payload}, track=${track}`);
      return;
    }

    // 🔧 SEGURIDAD: Validar tamaño de chunk según límites Twilio (16KB máximo)
    try {
      const audioBuffer = Buffer.from(payload, 'base64');
      if (audioBuffer.length > 16384) { // 16KB máximo por chunk Twilio
        logger.warn(`⚠️ [${streamSid}] Chunk de audio demasiado grande: ${audioBuffer.length} bytes (máximo: 16KB)`);
        return;
      }
    } catch (error) {
      logger.warn(`⚠️ [${streamSid}] Error decodificando payload de audio: ${error.message}`);
      return;
    }

    // Verificar si OpenAI Realtime está conectado
    if (!this.openaiRealtimeService.isConnectionActive(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] OpenAI Realtime no está activo, ignorando audio`);
      return;
    }

    // CÓDIGO OFICIAL: Log timestamps para debugging
    if (mediaTimestamp) {
      logger.debug(`⏱️ [${streamSid}] Received media with timestamp: ${mediaTimestamp}ms`);
    }

    // Enviar audio a OpenAI Realtime con timestamp
    try {
      this.openaiRealtimeService.sendAudioToOpenAI(streamSid, payload, mediaTimestamp);
      logger.debug(`🎙️ [${streamSid}] Audio enviado a OpenAI Realtime`);
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio a OpenAI: ${error.message}`);
    }
  }

  /**
   * CÓDIGO OFICIAL: Handle clear audio event (interrupciones)
   * @param {Object} data - {streamSid}
   */
  handleClearAudio(data) {
    const { streamSid } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (streamData && streamData.twilioWs) {
      logger.info(`🔄 [${streamSid}] Enviando clear event a Twilio (interrupción)`);
      
      streamData.twilioWs.send(JSON.stringify({
        event: 'clear',
        streamSid: streamSid
      }));
    }
  }

  /**
   * CÓDIGO OFICIAL: Handle send mark event
   * @param {Object} data - {streamSid, markName}
   */
  handleSendMark(data) {
    const { streamSid, markName } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (streamData && streamData.twilioWs) {
      logger.debug(`📍 [${streamSid}] Enviando marca a Twilio: ${markName}`);
      
      streamData.twilioWs.send(JSON.stringify({
        event: 'mark',
        streamSid: streamSid,
        mark: { name: markName }
      }));
    }
  }

  /**
   * ✅ NUEVO FLUJO SIMPLE: Procesar texto de OpenAI con Azure TTS (como saludo inicial)
   * @param {Object} data - {streamSid, text, timestamp}
   */
  async handleProcessTextWithAzure(data) {
    const { streamSid, text, timestamp } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData) {
      logger.warn(`⚠️ [${streamSid}] No hay streamData para procesar texto con Azure`);
      return;
    }

    logger.info(`🚀 [${streamSid}] ✅ PROCESANDO TEXTO con Azure TTS`);
    logger.info(`📝 [${streamSid}] Texto: "${text}"`);

    try {
      // ✅ EXACTAMENTE como sendInitialGreeting: texto → Azure TTS → Twilio
      const ttsResult = await this.ttsService.generateSpeech(
        text, 
        this.defaultVoice, 
        'raw-8khz-8bit-mono-mulaw'
      );
      
      if (ttsResult.success) {
        logger.info(`✅ [${streamSid}] Azure TTS completado (${ttsResult.audioBuffer.length} bytes)`);
        
        // Activar echo blanking para respuesta
        this.activateEchoBlanking(streamSid);
        
        // Enviar audio con marca (como saludo inicial)
        const markId = `response_${Date.now()}`;
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'deactivate_echo_blanking',
          timestamp: Date.now()
        });
        
        await this.sendRawMulawToTwilioWithMark(streamData.twilioWs, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Respuesta enviada con marca ${markId}`);
        
      } else {
        logger.error(`❌ [${streamSid}] Error en Azure TTS: ${ttsResult.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando texto con Azure: ${error.message}`, error.stack);
      
      // En caso de error, desactivar echo blanking
      try {
        this.deactivateEchoBlanking(streamSid);
        logger.warn(`⚡ [${streamSid}] Echo blanking desactivado tras error`);
      } catch (emergencyError) {
        logger.error(`💥 [${streamSid}] Error en desactivación de emergencia: ${emergencyError.message}`);
      }
    }
  }

  // 🗑️ FUNCIONES OBSOLETAS ELIMINADAS: 
  // - handleProcessAudioWithAzure() 
  // - processAudioDeltaWithAzure()
  // 
  // RAZÓN: Solo usamos transcripción de OpenAI → Azure TTS, no audio directo

}

module.exports = TwilioStreamHandler;
