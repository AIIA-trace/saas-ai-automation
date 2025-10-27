const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const { getInstance: getOpenAIRealtimeService } = require('../services/openaiRealtimeService');
const callerMemoryService = require('../services/callerMemoryService');
const fs = require('fs');

class TwilioStreamHandler {
  constructor(prisma, ttsService) {
    this.prisma = prisma;
    this.ttsService = ttsService; // FIX: Asignar el servicio TTS
    
    // NUEVO: Servicio OpenAI Realtime (SINGLETON - compartido globalmente)
    this.openaiRealtimeService = getOpenAIRealtimeService();
    
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

    // 🚀 AUDIO NATIVO: Audio directo de OpenAI → Twilio (sin Azure TTS)
    this.openaiRealtimeService.on('audioFromOpenAI', (data) => {
      this.handleAudioFromOpenAI(data);
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
      
      // 🔇 DESACTIVAR VAD de OpenAI mientras el bot habla
      if (streamData.openAiService) {
        await streamData.openAiService.disableVAD(streamSid);
      }
      
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
      
      // 🎤 REACTIVAR VAD en caso de error
      const streamData = this.activeStreams.get(streamSid);
      if (streamData?.openAiService) {
        await streamData.openAiService.enableVAD(streamSid);
      }
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
      
      // Obtener contexto de memoria del llamante si existe
      const callerMemoryService = require('../services/callerMemoryService');
      let memoryContext = '';
      if (streamData.callerMemory) {
        memoryContext = callerMemoryService.getMemoryContext(streamData.callerMemory);
        logger.info(`🧠 [${streamSid}] Contexto de memoria obtenido: ${memoryContext.length} caracteres`);
      }

      // Inicializar conexión OpenAI Realtime con callback de despedida
      await this.openaiRealtimeService.initializeConnection(streamSid, clientConfig, memoryContext);
      logger.info(`✅ [${streamSid}] OpenAI Realtime Service inicializado correctamente`);
      
      // Configurar callback de despedida para colgar llamada automáticamente
      const connectionData = this.openaiRealtimeService.activeConnections.get(streamSid);
      if (connectionData) {
        connectionData.onFarewell = () => {
          logger.info(`📞 [${streamSid}] Ejecutando cierre de llamada por despedida`);
          const streamData = this.activeStreams.get(streamSid);
          if (streamData?.twilioWs && streamData.twilioWs.readyState === 1) {
            logger.info(`🔌 [${streamSid}] Cerrando WebSocket de Twilio`);
            streamData.twilioWs.close(1000, 'Farewell completed');
          }
        };
      }

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
      
      // Buscar el streamSid real asociado a este WebSocket
      let streamSidToClean = null;
      for (const [sid, data] of this.activeStreams.entries()) {
        if (data.twilioWs === ws) {
          streamSidToClean = sid;
          break;
        }
      }
      
      if (streamSidToClean) {
        logger.info(`🔍 [${ws.connectionId}] Encontrado streamSid: ${streamSidToClean}`);
        await this.cleanup(streamSidToClean);
      } else {
        logger.warn(`⚠️ [${ws.connectionId}] No se encontró streamSid asociado - intentando con connectionId`);
        await this.cleanup(ws.connectionId);
      }
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
        await this.handleMark(data);
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
  async handleMark(data) {
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
        
        // ✅ OpenAI ya está inicializado desde antes del saludo
        // Solo activar transcripción
        this.transcriptionActive.set(streamSid, true);
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.state = 'listening';
          streamData.greetingCompletedAt = Date.now();
        }
        
        // Desactivar echo blanking
        this.deactivateEchoBlanking(streamSid);
        
        logger.info(`✅ [${streamSid}] Transcripción activada - usuario puede hablar`);
        break;
      case 'deactivate_echo_blanking':
        logger.info(`⚡ [${streamSid}] DESACTIVANDO echo blanking tras completar respuesta (marca: ${markName})`);
        this.deactivateEchoBlanking(streamSid);
        this.responseInProgress.delete(streamSid);
        
        // 🎤 REACTIVAR VAD de OpenAI - usuario puede interrumpir ahora
        const streamDataForVAD = this.activeStreams.get(streamSid);
        if (streamDataForVAD?.openAiService) {
          await streamDataForVAD.openAiService.enableVAD(streamSid);
        }
        
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
    logger.info(`🎤 [${streamSid}] ACTIVANDO transcripción tras saludo (marca: greeting_end)`);
    
    // Desactivar echo blanking
    this.deactivateEchoBlanking(streamSid);
    
    // Activar transcripción
    this.transcriptionActive.set(streamSid, true);
    
    const streamData = this.activeStreams.get(streamSid);
    if (streamData) {
      streamData.state = 'listening';
      streamData.greetingCompletedAt = Date.now();
    }
    
    // ✅ NO REINICIALIZAR OPENAI - La conexión ya existe desde el saludo
    logger.info(`✅ [${streamSid}] OpenAI inicializado y transcripción activada - usuario puede hablar`);
  }

  /**
   * Obtener datos del cliente para un stream usando callSid
   * @param {string} streamSid - Stream SID
   * @param {string} callSid - Call SID
   */
  async getClientForStream(streamSid, callSid, clientId = null) {
    try {
      logger.info(`🔍 [${streamSid}] Obteniendo cliente para callSid: ${callSid}, clientId: ${clientId}`);

      // 🔧 OPTIMIZAR: Verificar cache primero para evitar consultas duplicadas
      const cacheKey = clientId || callSid;
      if (this.clientCache.has(cacheKey)) {
        const cachedClient = this.clientCache.get(cacheKey);
        logger.info(`⚡ [${streamSid}] Cliente obtenido de cache: ${cachedClient.companyName || cachedClient.id}`);

        // Actualizar streamData con el cliente del cache
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.client = cachedClient;
        }
        return cachedClient;
      }

      // 🎯 PRIORIDAD 1: Si tenemos clientId de customParameters, usarlo directamente
      if (clientId) {
        logger.info(`🎯 [${streamSid}] Usando clientId de customParameters: ${clientId}`);
        const client = await this.prisma.client.findUnique({
          where: { id: parseInt(clientId) }
        });

        if (client) {
          logger.info(`✅ [${streamSid}] Cliente encontrado por ID: ${client.companyName} (ID: ${client.id})`);
          
          // Cachear el cliente encontrado
          this.clientCache.set(cacheKey, client);

          // Actualizar streamData con el cliente
          const streamData = this.activeStreams.get(streamSid);
          if (streamData) {
            streamData.client = client;
          }
          return client;
        } else {
          logger.error(`❌ [${streamSid}] Cliente con ID ${clientId} no encontrado en BD`);
        }
      }

      // 🎯 PRIORIDAD 2: Si no hay clientId, usar cliente por defecto (ID 1)
      logger.warn(`⚠️ [${streamSid}] No se proporcionó clientId - usando cliente por defecto (ID 1)`);
      const defaultClient = await this.prisma.client.findUnique({
        where: { id: 1 }
      });
      
      if (defaultClient) {
        logger.info(`✅ [${streamSid}] Usando cliente por defecto: ${defaultClient.companyName} (ID: ${defaultClient.id})`);
        
        // Cachear el cliente por defecto
        this.clientCache.set(cacheKey, defaultClient);

        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.client = defaultClient;
          logger.info(`✅ [${streamSid}] Cliente por defecto obtenido: ${defaultClient.companyName}`);
        }
      } else {
        logger.error(`❌ [${streamSid}] No se pudo obtener cliente por defecto`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error obteniendo cliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja evento 'start' de Twilio Stream
   */
  async handleStart(ws, data) {
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

    // 🎯 EXTRAER clientId de customParameters ANTES de obtener cliente
    const clientId = data.start?.customParameters?.clientId;
    logger.info(`🔍 [${streamSid}] customParameters recibidos: ${JSON.stringify(data.start?.customParameters)}`);
    logger.info(`🎯 [${streamSid}] ClientId extraído: ${clientId || 'NO DISPONIBLE'}`);

    // 🚀 VERIFICAR SI HAY SESIÓN PRE-INICIALIZADA
    const preSessionId = `pre_${callSid}`;
    const hasPreInitSession = this.openaiRealtimeService.activeConnections.has(preSessionId);
    
    if (hasPreInitSession) {
      logger.info(`✅ [${streamSid}] REUTILIZANDO sesión pre-inicializada: ${preSessionId}`);
      
      // 🔍 CRÍTICO: Extraer callerPhone de customParameters
      const callerPhone = data.start?.customParameters?.From || data.start?.customParameters?.from;
      logger.info(`🔍 [${streamSid}] Extrayendo callerPhone: ${callerPhone || 'NO DETECTADO'}`);
      
      // Transferir sesión al streamSid real
      try {
        const connectionData = this.openaiRealtimeService.activeConnections.get(preSessionId);
        
        // ✅ VALIDAR que la sesión esté en buen estado
        if (!connectionData || !connectionData.ws || connectionData.ws.readyState !== 1) {
          logger.warn(`⚠️ [${streamSid}] Sesión pre-inicializada en mal estado, usando flujo normal`);
          this.openaiRealtimeService.activeConnections.delete(preSessionId);
          throw new Error('Pre-initialized session in bad state');
        }
        
        this.openaiRealtimeService.activeConnections.set(streamSid, connectionData);
        this.openaiRealtimeService.activeConnections.delete(preSessionId);
        logger.info(`🔄 [${streamSid}] Conexión transferida: ${preSessionId} → ${streamSid}`);
        
        // Obtener cliente y memoria (ya están cargados pero necesitamos en streamData)
        await this.getClientForStream(streamSid, callSid, clientId);
        
        // 💾 CRÍTICO: Guardar callerPhone en streamData
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          if (callerPhone) {
            streamData.callerPhone = callerPhone;
            logger.info(`✅ [${streamSid}] callerPhone guardado: ${callerPhone}`);
          } else if (streamData.callerMemory?.callerPhone) {
            streamData.callerPhone = streamData.callerMemory.callerPhone;
            logger.info(`✅ [${streamSid}] callerPhone desde memoria: ${streamData.callerMemory.callerPhone}`);
          }
          logger.info(`🔍 [${streamSid}] Verificación - callerPhone: ${this.activeStreams.get(streamSid)?.callerPhone}`);
        }
        
        // Enviar saludo INMEDIATAMENTE (sesión ya lista)
        await this.sendInitialGreeting(this.activeStreams.get(streamSid)?.ws || null, { streamSid, callSid });
        logger.info(`🎤 [${streamSid}] Saludo enviado con sesión pre-inicializada`);
        
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error transfiriendo sesión: ${error.message}`);
        // Fallback a flujo normal
        this.getClientForStream(streamSid, callSid, clientId).then(async () => {
          await this.sendInitialGreeting(this.activeStreams.get(streamSid)?.ws || null, { streamSid, callSid });
        });
      }
      
      return; // Salir temprano, sesión ya lista
    }
    
    // Flujo normal si NO hay sesión pre-inicializada
    logger.warn(`⚠️ [${streamSid}] No hay sesión pre-inicializada, creando nueva...`);
    
    // Obtener cliente, memoria del llamante y enviar saludo UNA SOLA VEZ
    this.getClientForStream(streamSid, callSid, clientId).then(async () => {
      // 🔍 DEBUG: Mostrar TODOS los customParameters
      logger.info(`🔍 [${streamSid}] DEBUG customParameters completos:`);
      logger.info(`🔍 [${streamSid}] ${JSON.stringify(data.start?.customParameters, null, 2)}`);
      
      const callerPhone = data.start?.customParameters?.From || data.start?.customParameters?.from;
      
      // ⚠️ VALIDACIÓN ESTRICTA DEL NÚMERO
      if (!callerPhone) {
        logger.error(`❌ [${streamSid}] CRÍTICO: No se pudo detectar número del llamante`);
        logger.error(`❌ [${streamSid}] customParameters.From: ${data.start?.customParameters?.From}`);
        logger.error(`❌ [${streamSid}] customParameters.from: ${data.start?.customParameters?.from}`);
        logger.error(`❌ [${streamSid}] Todas las keys: ${Object.keys(data.start?.customParameters || {}).join(', ')}`);
        logger.error(`❌ [${streamSid}] NO SE CARGARÁ MEMORIA - Bot responderá como cliente nuevo`);
      } else {
        logger.info(`✅ [${streamSid}] Número del llamante detectado: ${callerPhone}`);
        // 💾 CRÍTICO: Guardar DIRECTAMENTE en activeStreams para garantizar persistencia
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.callerPhone = callerPhone;
          // ✅ Verificar que se guardó correctamente
          logger.info(`✅ [${streamSid}] callerPhone guardado en streamData: ${this.activeStreams.get(streamSid)?.callerPhone}`);
        } else {
          logger.error(`❌ [${streamSid}] streamData no existe en activeStreams - NO SE PUEDE GUARDAR callerPhone`);
        }
      }
      
      // Obtener streamData actualizado DESPUÉS de guardar callerPhone
      let streamData = this.activeStreams.get(streamSid);
      
      logger.info(`🏢 [${streamSid}] Cliente ID: ${streamData?.client?.id || 'NO DISPONIBLE'}`);
      
      // ⚠️ SOLO cargar memoria si tenemos AMBOS datos confirmados
      if (streamData?.client?.id && callerPhone) {
        logger.info(`🧠 [${streamSid}] ✅ Datos completos - Obteniendo memoria para ${callerPhone}`);
        
        try {
          const memory = await callerMemoryService.getOrCreateCallerMemory(
            streamData.client.id,
            callerPhone
          );
          
          if (memory) {
            // ⚠️ CRÍTICO: Actualizar directamente en activeStreams para que persista
            const currentStreamData = this.activeStreams.get(streamSid);
            if (currentStreamData) {
              currentStreamData.callerMemory = memory;
              
              // 🔍 LOGGING DETALLADO PARA VERIFICACIÓN
              logger.info(`✅ [${streamSid}] MEMORIA CARGADA EXITOSAMENTE:`);
              logger.info(`   - Memoria ID: ${memory.id}`);
              logger.info(`   - Teléfono: ${memory.callerPhone}`);
              logger.info(`   - Nombre: ${memory.callerName || 'N/A'}`);
              logger.info(`   - Empresa: ${memory.callerCompany || 'N/A'}`);
              logger.info(`   - Llamadas previas: ${memory.callCount - 1}`);
              logger.info(`   - Es cliente recurrente: ${memory.callCount > 1 ? 'SÍ' : 'NO'}`);
              
              // ⚠️ ADVERTENCIA si es cliente recurrente
              if (memory.callCount > 1) {
                logger.warn(`⚠️ [${streamSid}] CLIENTE RECURRENTE DETECTADO - Bot usará contexto personalizado`);
              }
            }
          } else {
            logger.error(`❌ [${streamSid}] No se pudo crear/obtener memoria para ${callerPhone}`);
          }
        } catch (error) {
          logger.error(`❌ [${streamSid}] Error obteniendo memoria: ${error.message}`);
          logger.error(`❌ [${streamSid}] Stack: ${error.stack}`);
        }
      } else {
        logger.error(`❌ [${streamSid}] DATOS INCOMPLETOS - NO SE CARGARÁ MEMORIA`);
        logger.error(`   - Cliente ID: ${streamData?.client?.id || 'FALTA'}`);
        logger.error(`   - Teléfono: ${callerPhone || 'FALTA'}`);
        logger.error(`   - Bot responderá como CLIENTE NUEVO por seguridad`);
      }
      
      // Verificar de nuevo antes de enviar (doble verificación)
      streamData = this.activeStreams.get(streamSid);
      
      // 🔍 VERIFICAR que la memoria persiste después de reasignar streamData
      logger.info(`🔍 [${streamSid}] Memoria después de reasignación - existe: ${!!streamData?.callerMemory}, callCount: ${streamData?.callerMemory?.callCount || 'N/A'}`);
      
      if (streamData?.greetingSent) {
        logger.info(`⚠️ [${streamSid}] Saludo ya enviado durante getClientForStream (greetingSent=true), omitiendo`);
        return;
      }

      logger.info(`🔍 [${streamSid}] Enviando saludo después de getClientForStream - greetingSent: ${streamData?.greetingSent}`);

      // ⏳ ESPERAR a que se complete la carga de memoria antes de enviar saludo
      await this.sendInitialGreeting(ws, { streamSid, callSid }).catch(error => {
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
    const callSid = data.stop?.callSid;

    logger.info(`🔍 handleStop llamado - callSid: ${callSid}`);
    logger.info(`🔍 data.stop completo: ${JSON.stringify(data.stop)}`);
    logger.info(`🔍 activeStreams keys: ${Array.from(this.activeStreams.keys()).join(', ')}`);

    if (!callSid) {
      logger.error(`❌ handleStop: callSid es undefined/null`);
      return;
    }

    // Buscar streamSid usando callSid
    let streamSidToClean = null;
    for (const [sid, streamData] of this.activeStreams.entries()) {
      if (streamData.callSid === callSid) {
        streamSidToClean = sid;
        break;
      }
    }

    if (streamSidToClean) {
      logger.info(`🛑 [${streamSidToClean}] Stream detenido (callSid: ${callSid})`);
      await this.cleanup(streamSidToClean);
    } else {
      logger.error(`❌ handleStop: No se encontró stream para callSid ${callSid}`);
    }
  }

  /**
   * Limpia recursos asociados a un stream
   */
  async cleanup(streamSid) {
    // 📊 CALCULAR DURACIÓN DE LLAMADA PARA MÉTRICAS
    const streamData = this.activeStreams.get(streamSid);
    
    // ⚠️ EVITAR DUPLICADOS: Si ya se limpió, salir
    if (!streamData) {
      logger.debug(`⏭️ [${streamSid}] Ya limpiado - saltando`);
      return;
    }
    
    // Marcar como en proceso de limpieza para evitar ejecuciones concurrentes
    if (streamData.cleaningInProgress) {
      logger.warn(`⚠️ [${streamSid}] Limpieza ya en progreso - saltando`);
      return;
    }
    streamData.cleaningInProgress = true;
    
    const callDuration = Date.now() - streamData.startTime;
    const companyName = streamData?.client?.companyName || 'UNKNOWN';
    const callSid = streamData?.callSid || 'NO-SID';
    
    // 🔍 CORRELATION ID PARA DEBUGGING
    const correlationId = this.generateCorrelationId(streamSid, callSid, companyName);
    
    logger.info(`🧹 [${correlationId}] Iniciando limpieza de recursos (duration: ${callDuration}ms)`);

    // 📊 ACTUALIZAR MÉTRICAS DE FINALIZACIÓN
    if (callDuration > 0) {
      this.updateMetrics('success', callDuration);
    }

    // 🧠 ACTUALIZAR MEMORIA DEL LLAMANTE Y GUARDAR EN DASHBOARD
    if (streamData?.callerMemory || streamData?.client) {
      try {
        // 🚀 Obtener historial de conversación de OpenAI Realtime (con resumen generado por IA)
        const conversationHistory = await this.openaiRealtimeService.getConversationHistory(streamSid);
        
        logger.info(`🔍 [${correlationId}] Historial obtenido de OpenAI:`);
        logger.info(`  - Summary: ${conversationHistory?.summary || 'N/A'}`);
        logger.info(`  - Topics: ${conversationHistory?.topics?.join(', ') || 'N/A'}`);
        logger.info(`  - Caller Name: ${conversationHistory?.callerName || 'N/A'}`);
        logger.info(`  - Caller Company: ${conversationHistory?.callerCompany || 'N/A'}`);
        logger.info(`  - Caller Phone: ${conversationHistory?.callerPhone || streamData?.callerPhone || 'N/A'}`);
        logger.info(`  - Request Details: ${JSON.stringify(conversationHistory?.requestDetails || {})}`);
        
        // 📝 Actualizar información del llamante si OpenAI la extrajo
        if (streamData?.callerMemory) {
          const updates = {};
          if (conversationHistory?.callerName) updates.callerName = conversationHistory.callerName;
          if (conversationHistory?.callerCompany) updates.callerCompany = conversationHistory.callerCompany;
          
          if (Object.keys(updates).length > 0) {
            await callerMemoryService.updateCallerInfo(streamData.callerMemory.id, updates);
            logger.info(`✅ [${correlationId}] Información del llamante actualizada: ${JSON.stringify(updates)}`);
          }
        }
        
        // 💾 Crear resumen de conversación con los detalles extraídos por IA
        const conversationSummary = {
          summary: conversationHistory?.summary || `Llamada de ${Math.round(callDuration / 1000)}s`,
          duration: Math.round(callDuration / 1000),
          topics: conversationHistory?.topics || [],
          requestDetails: conversationHistory?.requestDetails || {}
        };
        
        logger.info(`💾 [${correlationId}] Guardando en DB: ${JSON.stringify({
          summary: conversationSummary.summary.substring(0, 100),
          topics: conversationSummary.topics,
          requestDetails: conversationSummary.requestDetails
        })}`);
        
        // 💾 Guardar en memoria del llamante (CallerMemory)
        if (streamData?.callerMemory) {
          await callerMemoryService.addConversationToHistory(
            streamData.callerMemory.id,
            conversationSummary
          );
          logger.info(`✅ [${correlationId}] Conversación guardada en memoria ID: ${streamData.callerMemory.id}`);
        }
        
        // 📊 GUARDAR EN DASHBOARD (CallLog) para que aparezca en el panel del cliente
        if (streamData?.client?.id) {
          try {
            // Obtener número de teléfono del llamante
            const callerNumber = streamData?.callerPhone || 'Desconocido';
            
            // 🔍 DEBUG CRÍTICO: Verificar de dónde viene el número
            logger.warn(`🔍 [${correlationId}] GUARDANDO CALLLOG:`);
            logger.warn(`🔍 [${correlationId}]   - streamData.callerPhone: ${streamData?.callerPhone}`);
            logger.warn(`🔍 [${correlationId}]   - callerNumber final: ${callerNumber}`);
            logger.warn(`🔍 [${correlationId}]   - streamData keys: ${Object.keys(streamData || {}).join(', ')}`);
            
            // Determinar tipo de contacto basado en empresa
            const contactType = conversationHistory?.callerCompany ? 'Cliente' : 'Prospecto';
            
            // Determinar clasificación y urgencia
            const classification = conversationHistory?.topics?.[0] || 'sin clasificar';
            const urgency = this.determineUrgency(conversationHistory?.summary || '', conversationHistory?.topics || []);
            
            const callLogData = {
              clientId: streamData.client.id,
              twilioCallSid: callSid || null,
              callerNumber: callerNumber,
              callerName: conversationHistory?.callerName || null,
              duration: Math.round(callDuration / 1000),
              status: 'completed',
              aiSummary: conversationHistory?.summary || `Llamada de ${Math.round(callDuration / 1000)}s`,
              aiClassification: classification,
              callPurpose: conversationHistory?.topics?.[0] || null,
              contactInfo: conversationHistory?.callerCompany || null,
              urgencyLevel: urgency,
              metadata: {
                topics: conversationHistory?.topics || [],
                requestDetails: conversationHistory?.requestDetails || {},
                callerCompany: conversationHistory?.callerCompany || null,
                contactType: contactType,
                urgency: urgency,
                confidence: 'undefined%'
              },
              callStatus: 'completed',
              callDuration: Math.round(callDuration / 1000)
            };
            
            const callLog = await this.prisma.callLog.create({
              data: callLogData
            });
            
            logger.info(`✅ [${correlationId}] Llamada guardada en dashboard (CallLog ID: ${callLog.id})`);
            logger.info(`📊 [${correlationId}] Dashboard actualizado para cliente ${streamData.client.companyName}`);
          } catch (dashboardError) {
            logger.error(`❌ [${correlationId}] Error guardando en dashboard: ${dashboardError.message}`);
            logger.error(`❌ [${correlationId}] Stack: ${dashboardError.stack}`);
          }
        }
      } catch (error) {
        logger.error(`❌ [${correlationId}] Error actualizando memoria: ${error.message}`);
      }
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
   * 🎯 DETERMINAR NIVEL DE URGENCIA
   * @param {string} summary - Resumen de la llamada
   * @param {Array} topics - Temas de la llamada
   * @returns {string} - Nivel de urgencia: 'urgent', 'high', 'normal'
   */
  determineUrgency(summary, topics) {
    const urgentKeywords = ['urgente', 'emergencia', 'inmediato', 'ya', 'ahora', 'problema grave', 'crítico'];
    const highKeywords = ['importante', 'pronto', 'cuanto antes', 'rápido', 'necesito'];
    
    const summaryLower = summary.toLowerCase();
    const topicsLower = topics.map(t => t.toLowerCase()).join(' ');
    const fullText = `${summaryLower} ${topicsLower}`;
    
    // Verificar palabras clave de urgencia
    if (urgentKeywords.some(keyword => fullText.includes(keyword))) {
      return 'urgent';
    }
    
    if (highKeywords.some(keyword => fullText.includes(keyword))) {
      return 'high';
    }
    
    return 'normal';
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

    // 🎯 ESTRATEGIA: Inicializar OpenAI PRIMERO, generar saludo, enviarlo, y LUEGO activar transcripción
    // Esto evita que OpenAI detecte su propio saludo como voz del usuario
    
    // ✅ SOLUCIÓN: Inicializar OpenAI y enviar mensaje para que genere el saludo
    
    try {
      // 1. Obtener contexto de memoria del llamante si existe
      const callerMemoryService = require('../services/callerMemoryService');
      let memoryContext = '';
      
      logger.info(`🔍 [${streamSid}] DEBUG - streamData.callerMemory existe: ${!!streamData.callerMemory}`);
      if (streamData.callerMemory) {
        logger.info(`🔍 [${streamSid}] DEBUG - callerMemory.callCount: ${streamData.callerMemory.callCount}`);
        memoryContext = callerMemoryService.getMemoryContext(streamData.callerMemory);
        logger.info(`🧠 [${streamSid}] Contexto de memoria obtenido: ${memoryContext.length} caracteres`);
        logger.info(`📝 [${streamSid}] Primeras 200 chars del contexto: ${memoryContext.substring(0, 200)}`);
      } else {
        logger.warn(`⚠️ [${streamSid}] NO HAY MEMORIA DEL LLAMANTE - se enviará sin contexto histórico`);
      }
      
      // 2. Inicializar OpenAI Realtime con contexto de memoria
      logger.info(`🤖 [${streamSid}] Inicializando OpenAI Realtime...`);
      await this.openaiRealtimeService.initializeConnection(streamSid, streamData.client, memoryContext);
      logger.info(`✅ [${streamSid}] OpenAI Realtime inicializado`);
      
      // 2. Enviar mensaje para activar el saludo
      logger.info(`📤 [${streamSid}] Enviando trigger para generar saludo: "${greeting}"`);
      await this.openaiRealtimeService.sendGreetingTrigger(streamSid, greeting);
      
      // 3. Activar transcripción para que el usuario pueda hablar después
      this.transcriptionActive.set(streamSid, true);
      streamData.state = 'listening';
      
      logger.info(`✅ [${streamSid}] Sistema listo - OpenAI generará saludo`);
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error inicializando OpenAI: ${error.message}`);
    }
    
    logger.info(`🔍 [${streamSid}] FINALIZANDO sendInitialGreeting`);
  }

  async sendExtendedGreeting(ws, streamSid, clientConfigData) {
    const fallbackGreeting = "Hola, bienvenido. ¿En qué puedo ayudarte?";
    
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback con OpenAI`);
    
    try {
      // Obtener contexto de memoria del llamante si existe
      const streamData = this.activeStreams.get(streamSid);
      const callerMemoryService = require('../services/callerMemoryService');
      let memoryContext = '';
      if (streamData?.callerMemory) {
        memoryContext = callerMemoryService.getMemoryContext(streamData.callerMemory);
        logger.info(`🧠 [${streamSid}] Contexto de memoria obtenido: ${memoryContext.length} caracteres`);
      }
      
      // 1. Inicializar OpenAI Realtime
      logger.info(`🤖 [${streamSid}] Inicializando OpenAI Realtime para saludo extendido...`);
      await this.openaiRealtimeService.initializeConnection(streamSid, clientConfigData, memoryContext);
      logger.info(`✅ [${streamSid}] OpenAI Realtime inicializado`);
      
      // 2. Generar audio del saludo con OpenAI TTS
      logger.info(`🔊 [${streamSid}] Generando saludo extendido con OpenAI TTS...`);
      const openaiTTSResult = await this.openaiRealtimeService.generateGreetingAudio(streamSid, fallbackGreeting);
      
      if (openaiTTSResult.success) {
        logger.info(`✅ [${streamSid}] Audio de saludo extendido generado (${openaiTTSResult.audioBuffer.length} bytes)`);
        
        // ECHO BLANKING: Activar blanking antes de enviar audio del bot
        this.activateEchoBlanking(streamSid);
        
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
        await this.sendRawMulawToTwilioWithMark(ws, openaiTTSResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Saludo extendido enviado con marca ${markId}`);
      } else {
        throw new Error('OpenAI TTS failed for extended greeting');
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

  /**
   * 🚀 AUDIO NATIVO: Manejar audio directo de OpenAI (sin Azure TTS)
   * @param {Object} data - {streamSid, audio, timestamp}
   */
  async handleAudioFromOpenAI(data) {
    const { streamSid, audio, timestamp, flush } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData || !streamData.twilioWs) {
      logger.warn(`⚠️ [${streamSid}] No hay conexión Twilio para audio de OpenAI`);
      return;
    }

    try {
      // 🎯 BUFFERING: Acumular chunks pequeños para enviar en bloques más grandes
      if (!streamData.audioOutputBuffer) {
        streamData.audioOutputBuffer = '';
        streamData.audioChunkCount = 0;
      }
      
      // Si es señal de flush, enviar lo que quede en el buffer
      if (flush) {
        if (streamData.audioOutputBuffer.length > 0) {
          const mediaMessage = {
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: streamData.audioOutputBuffer
            }
          };
          streamData.twilioWs.send(JSON.stringify(mediaMessage));
          logger.debug(`🎵 [${streamSid}] Audio buffer final enviado (flush) - ${streamData.audioOutputBuffer.length} chars`);
        }
        // Limpiar buffer
        streamData.audioOutputBuffer = '';
        streamData.audioChunkCount = 0;
        return;
      }
      
      streamData.audioOutputBuffer += audio;
      streamData.audioChunkCount++;
      
      // Enviar cuando tengamos suficiente audio (cada 3 chunks o >1500 chars)
      const shouldFlush = streamData.audioChunkCount >= 3 || streamData.audioOutputBuffer.length >= 1500;
      
      if (shouldFlush) {
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: streamData.audioOutputBuffer  // Base64 mulaw acumulado
          }
        };

        streamData.twilioWs.send(JSON.stringify(mediaMessage));
        logger.debug(`🎵 [${streamSid}] Audio buffer enviado a Twilio (${streamData.audioOutputBuffer.length} chars, ${streamData.audioChunkCount} chunks)`);
        
        // Limpiar buffer
        streamData.audioOutputBuffer = '';
        streamData.audioChunkCount = 0;
      }
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio de OpenAI a Twilio: ${error.message}`);
    }
  }

  // 🗑️ FUNCIONES OBSOLETAS ELIMINADAS: 
  // - handleProcessAudioWithAzure() 
  // - processAudioDeltaWithAzure()
  // 
  // RAZÓN: Solo usamos transcripción de OpenAI → Azure TTS, no audio directo

}

module.exports = TwilioStreamHandler;
