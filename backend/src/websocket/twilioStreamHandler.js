const logger = require('../utils/logger');
const azureTTSService = require('../services/azureTTSRestService');
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
    
    logger.info(`📨 Evento recibido: ${event} para stream: ${streamSid}`);
    
    try {
      // Procesar eventos de forma secuencial y explícita
      switch (event) {
        case "connected":
          logger.info('🔌 Media WS: Connected event received');
          await this.handleStreamConnected(ws, data);
          break;
          
        case "start":
          logger.info('🎤 Media WS: Start event received');
          // Asegurar que el start se procese completamente antes de continuar
          await this.handleStreamStart(ws, data);
          logger.info(`✅ Start event procesado completamente para stream: ${streamSid}`);
          break;
          
        case "media":
          // Verificar que el stream esté registrado antes de procesar media
          if (!this.activeStreams.has(streamSid)) {
            logger.warn(`⚠️ Media event recibido para stream no registrado: ${streamSid}`);
            logger.info(`📊 Streams activos: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
            return;
          }
          await this.handleMediaChunk(ws, data);
          break;
          
        case "stop":
          logger.info('🛑 Media WS: Stop event received');
          await this.handleStreamStop(ws, data);
          break;
          
        default:
          logger.warn(`⚠️ Evento desconocido: ${event}`);
      }
    } catch (error) {
      logger.error(`❌ Error procesando evento ${event} para stream ${streamSid}: ${error.message}`);
      logger.error(`❌ Stack: ${error.stack}`);
      
      // Log adicional del estado actual
      logger.error(`📊 Estado actual - Streams activos: ${this.activeStreams.size}`);
      logger.error(`🗂️ Stream IDs: [${Array.from(this.activeStreams.keys()).join(', ')}]`);
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
      console.log(`🔍 ===== DATABASE CONFIGURATION ANALYSIS =====`);
      console.log(`⏰ Config Start Time: ${new Date().toISOString()}`);
      
      logger.info('🔍 PASO 1: Obteniendo configuración del cliente desde parámetros...');
      
      // ANÁLISIS COMPLETO DE PARÁMETROS RECIBIDOS
      console.log(`📝 PARAMETER VALIDATION:`);
      console.log(`  ├── ClientId: ${customParameters?.clientId || 'MISSING'}`);
      console.log(`  ├── CompanyName: ${customParameters?.companyName || 'MISSING'}`);
      console.log(`  ├── Greeting: ${customParameters?.greeting ? customParameters.greeting.substring(0, 50) + '...' : 'MISSING'}`);
      console.log(`  ├── VoiceId: ${customParameters?.voiceId || 'MISSING'}`);
      console.log(`  ├── Enabled: ${customParameters?.enabled || 'MISSING'}`);
      console.log(`  └── Email: ${customParameters?.email || 'MISSING'}`);
      
      // OBTENER CONFIGURACIÓN COMPLETA DESDE PARÁMETROS - CÓDIGO EXACTO DEL TEST
      const clientConfig = {
        id: clientId ? parseInt(clientId) : 1,
        companyName: customParameters?.companyName || 'Sistema de Atención',
        email: customParameters?.email || '',
        callConfig: {
          greeting: customParameters?.greeting || 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?',
          voiceId: customParameters?.voiceId || 'es-ES-DarioNeural',
          enabled: customParameters?.enabled !== 'false'
        },
        // Campos JSON exactos como en el test
        companyInfo: customParameters?.companyInfo || null,
        botConfig: customParameters?.botConfig || null,
        businessHours: customParameters?.businessHours || null,
        notificationConfig: customParameters?.notificationConfig || null,
        faqs: JSON.parse(customParameters?.faqs || '[]'), // Parsear como arreglo JSON
        contextFiles: JSON.parse(customParameters?.contextFiles || '[]'), // Parsear como arreglo JSON
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
      logger.info(`🔍 PASO 2a: Saludo: "${clientConfig.callConfig.greeting}"`);
      logger.info(`🔍 PASO 2b: Voz: "${clientConfig.callConfig.voiceId}"`);
      logger.info(`🔍 PASO 2c: FAQs cargadas: ${clientConfig.faqs.length}`);
      logger.info(`🔍 PASO 2d: Archivos contexto: ${clientConfig.contextFiles.length}`);

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
   * Enviar saludo inicial con Azure TTS - DEBUG ULTRA-DETALLADO
   */
  async sendInitialGreeting(ws, data) {
    const debugId = `DEBUG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 [${debugId}] ===== INICIO SALUDO INICIAL ULTRA-DEBUG =====`);
      logger.info(`🔍 [${debugId}] Timestamp: ${new Date().toISOString()}`);
      logger.info(`🔍 [${debugId}] WebSocket state: ${ws.readyState} (1=OPEN, 0=CONNECTING, 2=CLOSING, 3=CLOSED)`);
      
      const { streamSid, callSid } = data;
      logger.info(`🔍 [${debugId}] StreamSid: ${streamSid}`);
      logger.info(`🔍 [${debugId}] CallSid: ${callSid}`);
      
      // PASO 1: Verificar stream data
      logger.info(`🔍 [${debugId}] PASO 1: Verificando stream data...`);
      const streamData = this.activeStreams.get(streamSid);
      if (!streamData) {
        logger.error(`❌ [${debugId}] FALLO CRÍTICO: No se encontró stream data para ${streamSid}`);
        logger.error(`❌ [${debugId}] Active streams disponibles: ${Array.from(this.activeStreams.keys())}`);
        return;
      }
      logger.info(`✅ [${debugId}] Stream data encontrado`);

      // PASO 2: Verificar cliente
      logger.info(`🔍 [${debugId}] PASO 2: Verificando cliente...`);
      const { client } = streamData;
      if (!client) {
        logger.error(`❌ [${debugId}] FALLO CRÍTICO: No hay cliente en stream data`);
        return;
      }
      logger.info(`✅ [${debugId}] Cliente encontrado: ID=${client.id}, Email=${client.email}`);
      
      // PASO 3: Analizar callConfig en detalle
      logger.info(`🔍 [${debugId}] PASO 3: Analizando callConfig...`);
      logger.info(`🔍 [${debugId}] client.callConfig existe: ${!!client.callConfig}`);
      
      if (client.callConfig) {
        logger.info(`🔍 [${debugId}] callConfig tipo: ${typeof client.callConfig}`);
        logger.info(`🔍 [${debugId}] callConfig keys: ${Object.keys(client.callConfig)}`);
        logger.info(`🔍 [${debugId}] callConfig completo: ${JSON.stringify(client.callConfig, null, 2)}`);
      } else {
        logger.warn(`⚠️ [${debugId}] callConfig es null/undefined`);
      }
      
      // DIAGNÓSTICO COMPLETO DEL SALUDO
      logger.info(`🔍 [${debugId}] PASO 3a: DIAGNÓSTICO COMPLETO DEL SALUDO`);
      
      const expectedGreeting = 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?';
      let greeting = expectedGreeting;
      
      // Análisis detallado de por qué el saludo puede estar vacío
      logger.info(`📝 [${debugId}] ANÁLISIS DEL SALUDO:`);
      logger.info(`📝 [${debugId}]   ├── Saludo esperado: "${expectedGreeting}"`);
      logger.info(`📝 [${debugId}]   ├── client existe: ${!!client}`);
      logger.info(`📝 [${debugId}]   ├── client.callConfig existe: ${!!client?.callConfig}`);
      logger.info(`📝 [${debugId}]   ├── client.callConfig.greeting existe: ${!!client?.callConfig?.greeting}`);
      
      if (client?.callConfig?.greeting) {
        const receivedGreeting = client.callConfig.greeting;
        logger.info(`📝 [${debugId}]   ├── Saludo recibido: "${receivedGreeting}"`);
        logger.info(`📝 [${debugId}]   ├── Tipo: ${typeof receivedGreeting}`);
        logger.info(`📝 [${debugId}]   ├── Longitud: ${receivedGreeting.length}`);
        logger.info(`📝 [${debugId}]   └── Es vacío: ${!receivedGreeting || receivedGreeting.trim().length === 0}`);
        
        if (!receivedGreeting || receivedGreeting.trim().length === 0) {
          logger.error(`❌ [${debugId}] TEXTO VACÍO DETECTADO:`);
          logger.error(`❌ [${debugId}]   ├── PROBLEMA: client.callConfig.greeting está vacío o es null`);
          logger.error(`❌ [${debugId}]   ├── VALOR ESPERADO: "${expectedGreeting}"`);
          logger.error(`❌ [${debugId}]   ├── VALOR RECIBIDO: "${receivedGreeting}"`);
          logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Base de datos no tiene greeting configurado para el cliente`);
          logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Verificar tabla clients, campo callConfig.greeting`);
          logger.error(`❌ [${debugId}]   └── ACCIÓN: Usando saludo por defecto para evitar audio vacío`);
          greeting = expectedGreeting;
        } else {
          greeting = receivedGreeting;
          logger.info(`✅ [${debugId}] Saludo personalizado válido obtenido: "${greeting}"`);
        }
      } else {
        logger.warn(`⚠️ [${debugId}] CONFIGURACIÓN DE SALUDO FALTANTE:`);
        logger.warn(`⚠️ [${debugId}]   ├── PROBLEMA: No hay client.callConfig.greeting`);
        logger.warn(`⚠️ [${debugId}]   ├── POSIBLES CAUSAS:`);
        logger.warn(`⚠️ [${debugId}]   │   ├── Cliente no tiene callConfig en BD`);
        logger.warn(`⚠️ [${debugId}]   │   ├── callConfig.greeting es null en BD`);
        logger.warn(`⚠️ [${debugId}]   │   └── Error en consulta de BD o parámetros WebSocket`);
        logger.warn(`⚠️ [${debugId}]   ├── VALOR ESPERADO: "${expectedGreeting}"`);
        logger.warn(`⚠️ [${debugId}]   ├── ACCIÓN: Usando saludo por defecto`);
        logger.warn(`⚠️ [${debugId}]   └── RECOMENDACIÓN: Configurar greeting en dashboard del cliente`);
        greeting = expectedGreeting;
      }

      // DIAGNÓSTICO COMPLETO DE VOZ
      logger.info(`🔍 [${debugId}] PASO 3b: DIAGNÓSTICO COMPLETO DE VOZ`);
      
      const voiceMapping = {
        'neutral': 'es-ES-DarioNeural',
        'lola': 'en-US-LolaMultilingualNeural',
        'dario': 'es-ES-DarioNeural',
        'elvira': 'es-ES-ElviraNeural',
        'female': 'es-ES-ElviraNeural',
        'male': 'es-ES-DarioNeural'
      };
      
      const validAzureVoices = [
        'es-ES-DarioNeural', 'es-ES-ElviraNeural', 'es-ES-AlvaroNeural',
        'en-US-LolaMultilingualNeural', 'es-ES-ArabellaMultilingualNeural'
      ];
      
      const expectedVoice = 'es-ES-DarioNeural';
      let voiceId = expectedVoice;
      
      logger.info(`🎤 [${debugId}] ANÁLISIS DE VOZ:`);
      logger.info(`🎤 [${debugId}]   ├── Voz esperada por defecto: "${expectedVoice}"`);
      logger.info(`🎤 [${debugId}]   ├── Voces válidas Azure: [${validAzureVoices.join(', ')}]`);
      logger.info(`🎤 [${debugId}]   ├── Mapeo legacy disponible: ${JSON.stringify(voiceMapping, null, 2)}`);
      logger.info(`🎤 [${debugId}]   ├── client.callConfig.voiceId existe: ${!!client?.callConfig?.voiceId}`);
      
      if (client?.callConfig?.voiceId) {
        const userVoice = client.callConfig.voiceId;
        logger.info(`🎤 [${debugId}]   ├── Voz recibida del cliente: "${userVoice}"`);
        logger.info(`🎤 [${debugId}]   ├── Tipo: ${typeof userVoice}`);
        logger.info(`🎤 [${debugId}]   ├── Es legacy voice: ${!!voiceMapping[userVoice]}`);
        logger.info(`🎤 [${debugId}]   ├── Es voz Azure válida: ${validAzureVoices.includes(userVoice)}`);
        
        // Mapear voz legacy o usar directamente si es válida de Azure
        if (voiceMapping[userVoice]) {
          voiceId = voiceMapping[userVoice];
          logger.info(`✅ [${debugId}]   ├── MAPEO LEGACY: "${userVoice}" → "${voiceId}"`);
          logger.info(`✅ [${debugId}]   └── Voz final válida para Azure TTS`);
        } else if (validAzureVoices.includes(userVoice)) {
          voiceId = userVoice;
          logger.info(`✅ [${debugId}]   ├── VOZ AZURE VÁLIDA: "${userVoice}" usada directamente`);
          logger.info(`✅ [${debugId}]   └── No requiere mapeo`);
        } else {
          logger.error(`❌ [${debugId}] VOZ INVÁLIDA DETECTADA:`);
          logger.error(`❌ [${debugId}]   ├── PROBLEMA: Voz "${userVoice}" no es válida para Azure TTS`);
          logger.error(`❌ [${debugId}]   ├── VALOR ESPERADO: Una de [${validAzureVoices.join(', ')}]`);
          logger.error(`❌ [${debugId}]   ├── VALOR RECIBIDO: "${userVoice}"`);
          logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Base de datos tiene voiceId inválido o no mapeado`);
          logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Actualizar callConfig.voiceId en BD o añadir mapeo`);
          logger.error(`❌ [${debugId}]   ├── ACCIÓN: Usando voz por defecto "${expectedVoice}"`);
          logger.error(`❌ [${debugId}]   └── ESTO CAUSARÁ ERROR 400 EN AZURE TTS SI NO SE CORRIGE`);
          voiceId = expectedVoice;
        }
      } else {
        logger.warn(`⚠️ [${debugId}] CONFIGURACIÓN DE VOZ FALTANTE:`);
        logger.warn(`⚠️ [${debugId}]   ├── PROBLEMA: No hay client.callConfig.voiceId`);
        logger.warn(`⚠️ [${debugId}]   ├── POSIBLES CAUSAS:`);
        logger.warn(`⚠️ [${debugId}]   │   ├── Cliente no tiene callConfig en BD`);
        logger.warn(`⚠️ [${debugId}]   │   ├── callConfig.voiceId es null en BD`);
        logger.warn(`⚠️ [${debugId}]   │   └── Error en consulta de BD o parámetros WebSocket`);
        logger.warn(`⚠️ [${debugId}]   ├── VALOR ESPERADO: "${expectedVoice}" o una voz válida`);
        logger.warn(`⚠️ [${debugId}]   ├── ACCIÓN: Usando voz por defecto`);
        logger.warn(`⚠️ [${debugId}]   └── RECOMENDACIÓN: Configurar voiceId en dashboard del cliente`);
        voiceId = expectedVoice;
      }

      // DIAGNÓSTICO COMPLETO DE VARIABLES AZURE
      logger.info(`🔍 [${debugId}] PASO 4: DIAGNÓSTICO COMPLETO DE VARIABLES AZURE`);
      
      const expectedAzureKey = 'Una clave válida de 32+ caracteres de Azure Speech Service';
      const expectedAzureRegion = 'westeurope, eastus, etc.';
      
      const azureKey = process.env.AZURE_SPEECH_KEY;
      const azureRegion = process.env.AZURE_SPEECH_REGION;
      
      logger.info(`🔧 [${debugId}] ANÁLISIS DE VARIABLES AZURE:`);
      logger.info(`🔧 [${debugId}]   ├── AZURE_SPEECH_KEY esperada: ${expectedAzureKey}`);
      logger.info(`🔧 [${debugId}]   ├── AZURE_SPEECH_REGION esperada: ${expectedAzureRegion}`);
      logger.info(`🔧 [${debugId}]   ├── AZURE_SPEECH_KEY existe: ${!!azureKey}`);
      logger.info(`🔧 [${debugId}]   ├── AZURE_SPEECH_KEY longitud: ${azureKey?.length || 0}`);
      logger.info(`🔧 [${debugId}]   ├── AZURE_SPEECH_REGION recibida: "${azureRegion}"`);
      logger.info(`🔧 [${debugId}]   └── AZURE_SPEECH_REGION tipo: ${typeof azureRegion}`);
      
      if (!azureKey) {
        logger.error(`❌ [${debugId}] VARIABLE AZURE KEY FALTANTE:`);
        logger.error(`❌ [${debugId}]   ├── PROBLEMA: AZURE_SPEECH_KEY no está definida`);
        logger.error(`❌ [${debugId}]   ├── VALOR ESPERADO: ${expectedAzureKey}`);
        logger.error(`❌ [${debugId}]   ├── VALOR RECIBIDO: undefined/null`);
        logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Variable de entorno no configurada en servidor`);
        logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Configurar AZURE_SPEECH_KEY en .env o variables del sistema`);
        logger.error(`❌ [${debugId}]   └── ESTO CAUSARÁ FALLO TOTAL EN AZURE TTS`);
        throw new Error('AZURE_SPEECH_KEY no configurada');
      }
      
      if (!azureRegion) {
        logger.error(`❌ [${debugId}] VARIABLE AZURE REGION FALTANTE:`);
        logger.error(`❌ [${debugId}]   ├── PROBLEMA: AZURE_SPEECH_REGION no está definida`);
        logger.error(`❌ [${debugId}]   ├── VALOR ESPERADO: ${expectedAzureRegion}`);
        logger.error(`❌ [${debugId}]   ├── VALOR RECIBIDO: undefined/null`);
        logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Variable de entorno no configurada en servidor`);
        logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Configurar AZURE_SPEECH_REGION en .env o variables del sistema`);
        logger.error(`❌ [${debugId}]   └── ESTO CAUSARÁ FALLO TOTAL EN AZURE TTS`);
        throw new Error('AZURE_SPEECH_REGION no configurada');
      }
      
      if (azureKey.length < 32) {
        logger.error(`❌ [${debugId}] AZURE KEY INVÁLIDA:`);
        logger.error(`❌ [${debugId}]   ├── PROBLEMA: AZURE_SPEECH_KEY demasiado corta`);
        logger.error(`❌ [${debugId}]   ├── LONGITUD ESPERADA: 32+ caracteres`);
        logger.error(`❌ [${debugId}]   ├── LONGITUD RECIBIDA: ${azureKey.length}`);
        logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Clave incorrecta o truncada`);
        logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Verificar clave en Azure Portal > Speech Service > Keys`);
        logger.error(`❌ [${debugId}]   └── ESTO CAUSARÁ ERROR 401/403 EN AZURE TTS`);
      }
      
      logger.info(`✅ [${debugId}] Variables Azure configuradas correctamente`);
      logger.info(`✅ [${debugId}]   ├── Key: ${azureKey.substring(0, 8)}...${azureKey.substring(azureKey.length - 4)}`);
      logger.info(`✅ [${debugId}]   └── Region: ${azureRegion}`);
      
      // DIAGNÓSTICO DE WEBSOCKET
      logger.info(`🔍 [${debugId}] PASO 4b: DIAGNÓSTICO DE WEBSOCKET`);
      const expectedWebSocketState = 1; // OPEN
      const currentWebSocketState = ws.readyState;
      
      logger.info(`🔌 [${debugId}] ANÁLISIS DE WEBSOCKET:`);
      logger.info(`🔌 [${debugId}]   ├── Estado esperado: ${expectedWebSocketState} (OPEN)`);
      logger.info(`🔌 [${debugId}]   ├── Estado actual: ${currentWebSocketState}`);
      logger.info(`🔌 [${debugId}]   ├── Estados posibles: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED`);
      
      if (currentWebSocketState !== 1) {
        logger.error(`❌ [${debugId}] WEBSOCKET CERRADO/INVÁLIDO:`);
        logger.error(`❌ [${debugId}]   ├── PROBLEMA: WebSocket no está en estado OPEN`);
        logger.error(`❌ [${debugId}]   ├── ESTADO ESPERADO: 1 (OPEN)`);
        logger.error(`❌ [${debugId}]   ├── ESTADO ACTUAL: ${currentWebSocketState}`);
        logger.error(`❌ [${debugId}]   ├── CAUSA RAÍZ: Conexión cerrada prematuramente o timeout`);
        logger.error(`❌ [${debugId}]   ├── SOLUCIÓN: Verificar conectividad de red y timeouts`);
        logger.error(`❌ [${debugId}]   └── ESTO IMPEDIRÁ ENVÍO DE AUDIO A TWILIO`);
        throw new Error(`WebSocket cerrado: estado ${currentWebSocketState}`);
      }
      
      logger.info(`✅ [${debugId}] WebSocket en estado correcto para envío de audio`);

      // PASO 5: Generar audio con timing detallado
      logger.info(`🔍 [${debugId}] PASO 5: Iniciando generación de audio...`);
      logger.info(`🔍 [${debugId}] Texto a sintetizar: "${greeting}" (${greeting.length} caracteres)`);
      logger.info(`🔍 [${debugId}] Voz Azure: ${voiceId}`);
      logger.info(`🔍 [${debugId}] TTS Service disponible: ${!!this.ttsService}`);
      logger.info(`🔍 [${debugId}] Método generateSpeech disponible: ${typeof this.ttsService?.generateSpeech}`);
      
      const ttsStartTime = Date.now();
      
      try {
        logger.info(`🔍 [${debugId}] ⚡ LLAMANDO A AZURE TTS - INICIO`);
        logger.info(`🔍 [${debugId}] ⚡ Parámetros: texto="${greeting.substring(0, 50)}...", voz="${voiceId}"`);
        const audioResult = await this.ttsService.generateSpeech(greeting, voiceId);
        logger.info(`🔍 [${debugId}] ⚡ AZURE TTS COMPLETADO - resultado recibido`);
        logger.info(`🔍 [${debugId}] ⚡ Tipo de resultado: ${typeof audioResult}`);
        logger.info(`🔍 [${debugId}] ⚡ Resultado es objeto: ${audioResult !== null && typeof audioResult === 'object'}`);
        logger.info(`🔍 [${debugId}] ⚡ Keys del resultado: ${audioResult ? Object.keys(audioResult).join(', ') : 'N/A'}`);
        logger.info(`🔍 [${debugId}] ⚡ Success property: ${audioResult?.success}`);
        logger.info(`🔍 [${debugId}] ⚡ AudioBuffer exists: ${!!audioResult?.audioBuffer}`);
        logger.info(`🔍 [${debugId}] ⚡ AudioBuffer length: ${audioResult?.audioBuffer?.length || 0}`);
        logger.info(`🔍 [${debugId}] ⚡ Error property: ${audioResult?.error || 'none'}`);
        logger.info(`🔍 [${debugId}] ⚡ AZURE TTS ANÁLISIS COMPLETO`);
        
        if (audioResult?.audioBuffer && audioResult.audioBuffer.length > 0) {
          logger.info(`🔍 [${debugId}] ⚡ AUDIO VÁLIDO DETECTADO - ${audioResult.audioBuffer.length} bytes`);
        } else {
          logger.error(`🔍 [${debugId}] ⚡ AUDIO INVÁLIDO O VACÍO DETECTADO`);
        }
        const ttsEndTime = Date.now();
        const ttsDuration = ttsEndTime - ttsStartTime;
        
        logger.info(`🔍 [${debugId}] TTS completado en ${ttsDuration}ms`);
        logger.info(`🔍 [${debugId}] Resultado TTS:`);
        logger.info(`🔍 [${debugId}]   - success: ${audioResult?.success}`);
        logger.info(`🔍 [${debugId}]   - error: ${audioResult?.error || 'ninguno'}`);
        logger.info(`🔍 [${debugId}]   - audioBuffer existe: ${!!audioResult?.audioBuffer}`);
        
        if (audioResult?.audioBuffer) {
          logger.info(`🔍 [${debugId}]   - audioBuffer tipo: ${typeof audioResult.audioBuffer}`);
          logger.info(`🔍 [${debugId}]   - audioBuffer constructor: ${audioResult.audioBuffer.constructor.name}`);
          logger.info(`🔍 [${debugId}]   - audioBuffer length: ${audioResult.audioBuffer.byteLength || audioResult.audioBuffer.length}`);
        }
        
        if (!audioResult || !audioResult.success) {
          const errorMsg = `Azure TTS falló: ${audioResult?.error || 'Error desconocido'}`;
          logger.error(`❌ [${debugId}] ${errorMsg}`);
          throw new Error(errorMsg);
        }

        // PASO 6: Procesar buffer de audio
        logger.info(`🔍 [${debugId}] PASO 6: Procesando buffer de audio...`);
        
        if (!audioResult.audioBuffer) {
          logger.error(`❌ [${debugId}] FALLO: audioBuffer es null/undefined`);
          throw new Error('Audio buffer vacío');
        }
        
        const audioBuffer = Buffer.from(audioResult.audioBuffer);
        logger.info(`✅ [${debugId}] Buffer creado exitosamente:`);
        logger.info(`🔍 [${debugId}]   - Tamaño original: ${audioResult.audioBuffer.byteLength} bytes`);
        logger.info(`🔍 [${debugId}]   - Buffer Node.js: ${audioBuffer.length} bytes`);
        logger.info(`🔍 [${debugId}]   - Primeros 10 bytes: [${Array.from(audioBuffer.slice(0, 10)).join(', ')}]`);
        logger.info(`🔍 [${debugId}]   - Últimos 10 bytes: [${Array.from(audioBuffer.slice(-10)).join(', ')}]`);
        
        // Verificar formato de audio
        const isValidAudio = audioBuffer.length > 44; // Mínimo para WAV header
        logger.info(`🔍 [${debugId}]   - Audio válido (>44 bytes): ${isValidAudio}`);
        
        if (audioBuffer.length > 4) {
          const header = audioBuffer.slice(0, 4).toString('ascii');
          logger.info(`🔍 [${debugId}]   - Header detectado: "${header}"`);
        }

        // PASO 7: Verificar WebSocket antes de enviar
        logger.info(`🔍 [${debugId}] PASO 7: Verificando WebSocket...`);
        logger.info(`🔍 [${debugId}] WebSocket readyState: ${ws.readyState}`);
        logger.info(`🔍 [${debugId}] WebSocket bufferedAmount: ${ws.bufferedAmount}`);
        
        if (ws.readyState !== 1) {
          logger.error(`❌ [${debugId}] FALLO: WebSocket no está abierto (state: ${ws.readyState})`);
          throw new Error(`WebSocket no disponible (state: ${ws.readyState})`);
        }

        // PASO 8: Enviar audio a Twilio con timing
        logger.info(`🔍 [${debugId}] PASO 8: Enviando audio a Twilio...`);
        const sendStartTime = Date.now();
        
        await this.sendAudioToTwilio(ws, audioBuffer, streamSid);
        
        const sendEndTime = Date.now();
        const sendDuration = sendEndTime - sendStartTime;
        const totalDuration = sendEndTime - startTime;
        
        logger.info(`✅ [${debugId}] ÉXITO COMPLETO:`);
        logger.info(`🔍 [${debugId}]   - TTS generación: ${ttsDuration}ms`);
        logger.info(`🔍 [${debugId}]   - Envío a Twilio: ${sendDuration}ms`);
        logger.info(`🔍 [${debugId}]   - Tiempo total: ${totalDuration}ms`);
        logger.info(`🔍 [${debugId}]   - Audio enviado: ${audioBuffer.length} bytes`);
        
      } catch (ttsError) {
        const ttsEndTime = Date.now();
        const ttsDuration = ttsEndTime - ttsStartTime;
        
        logger.error(`❌ [${debugId}] ERROR EN TTS después de ${ttsDuration}ms:`);
        logger.error(`❌ [${debugId}] Error message: ${ttsError.message}`);
        logger.error(`❌ [${debugId}] Error stack: ${ttsError.stack}`);
        logger.error(`❌ [${debugId}] Error name: ${ttsError.name}`);
        
        if (ttsError.code) {
          logger.error(`❌ [${debugId}] Error code: ${ttsError.code}`);
        }
        
        logger.info(`🔄 [${debugId}] Activando fallback...`);
        await this.sendTextFallback(ws, greeting, streamSid);
        throw ttsError;
      }

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      logger.error(`❌ [${debugId}] ERROR GENERAL después de ${totalDuration}ms:`);
      logger.error(`❌ [${debugId}] Error: ${error.message}`);
      logger.error(`❌ [${debugId}] Stack: ${error.stack}`);
      logger.error(`❌ [${debugId}] ===== FIN SALUDO INICIAL (CON ERROR) =====`);
    }
  }

  /**
   * Fallback para enviar audio simple cuando Azure TTS falla - DEBUG DETALLADO
   */
  async sendTextFallback(ws, text, streamSid) {
    const fallbackId = `FALLBACK_${Date.now()}`;
    
    try {
      logger.info(`🔄 [${fallbackId}] ===== INICIANDO FALLBACK =====`);
      logger.info(`🔄 [${fallbackId}] Texto original: "${text}"`);
      logger.info(`🔄 [${fallbackId}] StreamSid: ${streamSid}`);
      logger.info(`🔄 [${fallbackId}] WebSocket state: ${ws.readyState}`);
      
      // DIAGNÓSTICO COMPLETO DEL MÉTODO sendAudioToTwilio
      logger.info(`🔍 [${fallbackId}] VERIFICANDO MÉTODO sendAudioToTwilio:`);
      logger.info(`🔍 [${fallbackId}]   ├── this existe: ${!!this}`);
      logger.info(`🔍 [${fallbackId}]   ├── this.sendAudioToTwilio existe: ${!!this.sendAudioToTwilio}`);
      logger.info(`🔍 [${fallbackId}]   ├── Tipo de sendAudioToTwilio: ${typeof this.sendAudioToTwilio}`);
      logger.info(`🔍 [${fallbackId}]   └── Es función: ${typeof this.sendAudioToTwilio === 'function'}`);
      
      if (typeof this.sendAudioToTwilio !== 'function') {
        logger.error(`❌ [${fallbackId}] MÉTODO sendAudioToTwilio NO DISPONIBLE:`);
        logger.error(`❌ [${fallbackId}]   ├── PROBLEMA: this.sendAudioToTwilio no es una función`);
        logger.error(`❌ [${fallbackId}]   ├── TIPO ACTUAL: ${typeof this.sendAudioToTwilio}`);
        logger.error(`❌ [${fallbackId}]   ├── ESPERADO: function`);
        logger.error(`❌ [${fallbackId}]   ├── CAUSA RAÍZ: Método no definido o contexto 'this' incorrecto`);
        logger.error(`❌ [${fallbackId}]   ├── SOLUCIÓN: Verificar definición de clase y binding`);
        logger.error(`❌ [${fallbackId}]   └── ACCIÓN: Saltando envío de beep, solo enviando mark`);
        
        // Solo enviar mark sin audio
        const markMessage = {
          event: 'mark',
          streamSid: streamSid,
          mark: {
            name: `tts_fallback_no_audio_${Date.now()}`
          }
        };
        
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(markMessage));
          logger.info(`✅ [${fallbackId}] Mark enviado sin audio debido a método faltante`);
        }
        return;
      }
      
      // Intentar generar un beep simple como audio de fallback
      logger.info(`🔄 [${fallbackId}] Generando beep de fallback...`);
      const fallbackAudio = this.generateSimpleBeep();
      
      if (fallbackAudio) {
        logger.info(`🔄 [${fallbackId}] Beep generado: ${fallbackAudio.length} bytes`);
        
        if (ws.readyState === 1) {
          logger.info(`🔄 [${fallbackId}] Enviando beep a Twilio...`);
          try {
            await this.sendAudioToTwilio(ws, fallbackAudio, streamSid);
            logger.info(`✅ [${fallbackId}] Beep enviado exitosamente`);
          } catch (sendError) {
            logger.error(`❌ [${fallbackId}] ERROR EN sendAudioToTwilio:`);
            logger.error(`❌ [${fallbackId}]   ├── Error: ${sendError.message}`);
            logger.error(`❌ [${fallbackId}]   ├── Stack: ${sendError.stack?.substring(0, 100)}...`);
            logger.error(`❌ [${fallbackId}]   ├── CAUSA RAÍZ: Excepción en método sendAudioToTwilio`);
            logger.error(`❌ [${fallbackId}]   └── ACCIÓN: Continuando con mark solamente`);
          }
        } else {
          logger.error(`❌ [${fallbackId}] WebSocket no disponible para beep (state: ${ws.readyState})`);
        }
      } else {
        logger.error(`❌ [${fallbackId}] BEEP NO GENERADO:`);
        logger.error(`❌ [${fallbackId}]   ├── PROBLEMA: generateSimpleBeep() devolvió null/undefined`);
        logger.error(`❌ [${fallbackId}]   ├── CAUSA RAÍZ: Error en generación de audio sintético`);
        logger.error(`❌ [${fallbackId}]   └── ACCIÓN: Continuando sin audio de fallback`);
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
   * Enviar audio a Twilio via WebSocket
   */
  async sendAudioToTwilio(ws, audioBuffer, streamSid) {
    const sendId = `SEND_${Date.now()}`;
    
    try {
      logger.info(`🔍 [${sendId}] ===== ENVIANDO AUDIO A TWILIO =====`);
      logger.info(`🔍 [${sendId}] StreamSid: ${streamSid}`);
      
      // DIAGNÓSTICO COMPLETO DEL BUFFER
      logger.info(`🎵 [${sendId}] ANÁLISIS DEL BUFFER RECIBIDO:`);
      logger.info(`🎵 [${sendId}]   ├── Buffer existe: ${!!audioBuffer}`);
      logger.info(`🎵 [${sendId}]   ├── Buffer tipo: ${audioBuffer ? audioBuffer.constructor.name : 'N/A'}`);
      logger.info(`🎵 [${sendId}]   ├── Buffer length: ${audioBuffer ? audioBuffer.length : 0} bytes`);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        logger.error(`❌ [${sendId}] BUFFER VACÍO DETECTADO:`);
        logger.error(`❌ [${sendId}]   ├── PROBLEMA: audioBuffer es null/undefined o tiene 0 bytes`);
        logger.error(`❌ [${sendId}]   ├── ESPERADO: Buffer válido con datos de audio`);
        logger.error(`❌ [${sendId}]   ├── RECIBIDO: ${audioBuffer ? `${audioBuffer.length} bytes` : 'null/undefined'}`);
        logger.error(`❌ [${sendId}]   ├── CAUSA RAÍZ: Azure TTS no generó audio o falló la conversión`);
        logger.error(`❌ [${sendId}]   └── ACCIÓN: Abortando envío para evitar error en Twilio`);
        return;
      }

      // DIAGNÓSTICO COMPLETO DEL WEBSOCKET
      logger.info(`🔌 [${sendId}] ANÁLISIS DEL WEBSOCKET:`);
      logger.info(`🔌 [${sendId}]   ├── WebSocket existe: ${!!ws}`);
      logger.info(`🔌 [${sendId}]   ├── ReadyState: ${ws.readyState}`);
      logger.info(`🔌 [${sendId}]   ├── BufferedAmount: ${ws.bufferedAmount} bytes`);
      logger.info(`🔌 [${sendId}]   └── Estados: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED`);
      
      if (ws.readyState !== 1) {
        logger.error(`❌ [${sendId}] WEBSOCKET NO DISPONIBLE:`);
        logger.error(`❌ [${sendId}]   ├── PROBLEMA: WebSocket no está en estado OPEN`);
        logger.error(`❌ [${sendId}]   ├── ESTADO ESPERADO: 1 (OPEN)`);
        logger.error(`❌ [${sendId}]   ├── ESTADO ACTUAL: ${ws.readyState}`);
        logger.error(`❌ [${sendId}]   ├── CAUSA RAÍZ: Conexión cerrada o timeout`);
        logger.error(`❌ [${sendId}]   └── ACCIÓN: Abortando envío, audio se perderá`);
        return;
      }

      // DIAGNÓSTICO COMPLETO DEL FORMATO DE AUDIO
      logger.info(`🔍 [${sendId}] PASO 1: ANÁLISIS DEL FORMATO DE AUDIO`);
      
      const expectedFormats = ['MP3', 'WAV', 'PCM', 'mulaw'];
      let detectedFormat = 'DESCONOCIDO';
      let processedAudio;
      
      // Analizar primeros bytes para detectar formato
      if (audioBuffer.length >= 2) {
        const byte1 = audioBuffer[0];
        const byte2 = audioBuffer[1];
        logger.info(`🎵 [${sendId}]   ├── Primeros 2 bytes: 0x${byte1.toString(16).padStart(2, '0')} 0x${byte2.toString(16).padStart(2, '0')}`);
        
        if (byte1 === 0xFF && (byte2 & 0xE0) === 0xE0) {
          detectedFormat = 'MP3';
        } else if (audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
          detectedFormat = 'WAV';
        } else if (audioBuffer.length >= 8 && audioBuffer.toString('ascii', 8, 12) === 'WAVE') {
          detectedFormat = 'WAV';
        } else {
          detectedFormat = 'PCM_O_MULAW';
        }
      }
      
      logger.info(`🎵 [${sendId}]   ├── Formato detectado: ${detectedFormat}`);
      logger.info(`🎵 [${sendId}]   ├── Formatos esperados: [${expectedFormats.join(', ')}]`);
      logger.info(`🎵 [${sendId}]   ├── Es formato válido: ${expectedFormats.includes(detectedFormat) || detectedFormat === 'PCM_O_MULAW'}`);
      
      // Procesar según formato detectado
      if (detectedFormat === 'MP3') {
        logger.info(`🎵 [${sendId}] PROCESANDO MP3:`);
        logger.info(`🎵 [${sendId}]   ├── PROBLEMA: MP3 requiere conversión a mulaw para Twilio`);
        logger.info(`🎵 [${sendId}]   ├── SOLUCIÓN ACTUAL: Enviar como está (Twilio puede manejar MP3)`);
        logger.info(`🎵 [${sendId}]   ├── RECOMENDACIÓN: Implementar conversión MP3→PCM→mulaw`);
        logger.info(`🎵 [${sendId}]   └── ACCIÓN: Usando MP3 directo`);
        processedAudio = audioBuffer;
      } else if (detectedFormat === 'WAV') {
        logger.info(`🎵 [${sendId}] PROCESANDO WAV:`);
        logger.info(`🎵 [${sendId}]   ├── Intentando extraer PCM del WAV...`);
        const pcmData = this.extractPCMFromWAV(audioBuffer);
        if (pcmData) {
          logger.info(`🎵 [${sendId}]   ├── PCM extraído: ${pcmData.length} bytes`);
          logger.info(`🎵 [${sendId}]   ├── Convirtiendo PCM a mulaw...`);
          processedAudio = this.convertPCMToMulaw(pcmData);
          logger.info(`🎵 [${sendId}]   └── Conversión completada: ${processedAudio.length} bytes mulaw`);
        } else {
          logger.error(`❌ [${sendId}] FALLO EN EXTRACCIÓN PCM:`);
          logger.error(`❌ [${sendId}]   ├── PROBLEMA: No se pudo extraer PCM del WAV`);
          logger.error(`❌ [${sendId}]   ├── CAUSA RAÍZ: WAV corrupto o formato no soportado`);
          logger.error(`❌ [${sendId}]   └── ACCIÓN: Usando WAV original sin conversión`);
          processedAudio = audioBuffer;
        }
      } else {
        logger.info(`🎵 [${sendId}] FORMATO DESCONOCIDO/PCM:`);
        logger.info(`🎵 [${sendId}]   ├── Asumiendo que ya está en formato correcto para Twilio`);
        logger.info(`🎵 [${sendId}]   ├── Si es PCM: debería convertirse a mulaw`);
        logger.info(`🎵 [${sendId}]   ├── Si es mulaw: listo para envío`);
        logger.info(`🎵 [${sendId}]   └── ACCIÓN: Usando datos sin modificar`);
        processedAudio = audioBuffer;
      }
      
      logger.info(`🎵 [${sendId}] RESULTADO DEL PROCESAMIENTO:`);
      logger.info(`🎵 [${sendId}]   ├── Audio original: ${audioBuffer.length} bytes`);
      logger.info(`🎵 [${sendId}]   ├── Audio procesado: ${processedAudio.length} bytes`);
      logger.info(`🎵 [${sendId}]   └── Reducción/expansión: ${((processedAudio.length - audioBuffer.length) / audioBuffer.length * 100).toFixed(1)}%`);

      // DIAGNÓSTICO COMPLETO DEL ENVÍO POR CHUNKS
      logger.info(`🔍 [${sendId}] PASO 2: PREPARANDO ENVÍO POR CHUNKS`);
      
      const chunkSize = 1024; // 1KB chunks
      const expectedBase64Length = Math.ceil(processedAudio.length * 4 / 3); // Base64 es ~33% más grande
      
      logger.info(`📦 [${sendId}] ANÁLISIS DE CHUNKS:`);
      logger.info(`📦 [${sendId}]   ├── Tamaño de chunk: ${chunkSize} bytes`);
      logger.info(`📦 [${sendId}]   ├── Audio procesado: ${processedAudio.length} bytes`);
      logger.info(`📦 [${sendId}]   ├── Base64 esperado: ~${expectedBase64Length} caracteres`);
      
      const base64Audio = processedAudio.toString('base64');
      const totalChunks = Math.ceil(base64Audio.length / chunkSize);
      
      logger.info(`📦 [${sendId}]   ├── Base64 real: ${base64Audio.length} caracteres`);
      logger.info(`📦 [${sendId}]   ├── Total chunks: ${totalChunks}`);
      logger.info(`📦 [${sendId}]   └── Tiempo estimado: ~${totalChunks * 10}ms (10ms por chunk)`);
      
      // Verificar que base64 no esté vacío
      if (base64Audio.length === 0) {
        logger.error(`❌ [${sendId}] BASE64 VACÍO:`);
        logger.error(`❌ [${sendId}]   ├── PROBLEMA: Conversión a base64 resultó en string vacío`);
        logger.error(`❌ [${sendId}]   ├── CAUSA RAÍZ: processedAudio está vacío o corrupto`);
        logger.error(`❌ [${sendId}]   └── ACCIÓN: Abortando envío`);
        return;
      }
      
      logger.info(`🔍 [${sendId}] PASO 3: ENVIANDO CHUNKS A TWILIO`);
      const sendStartTime = Date.now();
      let chunksSent = 0;
      let chunksError = 0;
      
      for (let i = 0; i < base64Audio.length; i += chunkSize) {
        const chunkIndex = Math.floor(i / chunkSize) + 1;
        const chunk = base64Audio.slice(i, i + chunkSize);
        
        logger.info(`📤 [${sendId}] Enviando chunk ${chunkIndex}/${totalChunks} (${chunk.length} chars)`);
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: chunk
          }
        };

        // Verificar WebSocket antes de cada chunk
        if (ws.readyState === 1) {
          try {
            ws.send(JSON.stringify(mediaMessage));
            chunksSent++;
            logger.info(`✅ [${sendId}] Chunk ${chunkIndex} enviado exitosamente`);
          } catch (sendError) {
            chunksError++;
            logger.error(`❌ [${sendId}] ERROR ENVIANDO CHUNK ${chunkIndex}:`);
            logger.error(`❌ [${sendId}]   ├── Error: ${sendError.message}`);
            logger.error(`❌ [${sendId}]   ├── WebSocket state: ${ws.readyState}`);
            logger.error(`❌ [${sendId}]   └── Continuando con siguiente chunk...`);
          }
        } else {
          chunksError++;
          logger.error(`❌ [${sendId}] WEBSOCKET CERRADO EN CHUNK ${chunkIndex}:`);
          logger.error(`❌ [${sendId}]   ├── Estado WebSocket: ${ws.readyState}`);
          logger.error(`❌ [${sendId}]   ├── Chunks enviados: ${chunksSent}/${totalChunks}`);
          logger.error(`❌ [${sendId}]   └── ACCIÓN: Abortando envío restante`);
          break;
        }
      }
      
      const sendEndTime = Date.now();
      const sendDuration = sendEndTime - sendStartTime;
      
      logger.info(`🔍 [${sendId}] RESUMEN DEL ENVÍO:`);
      logger.info(`📊 [${sendId}]   ├── Chunks enviados: ${chunksSent}/${totalChunks}`);
      logger.info(`📊 [${sendId}]   ├── Chunks con error: ${chunksError}`);
      logger.info(`📊 [${sendId}]   ├── Tasa de éxito: ${((chunksSent / totalChunks) * 100).toFixed(1)}%`);
      logger.info(`📊 [${sendId}]   ├── Tiempo total: ${sendDuration}ms`);
      logger.info(`📊 [${sendId}]   ├── Tiempo por chunk: ${(sendDuration / chunksSent).toFixed(1)}ms`);
      logger.info(`📊 [${sendId}]   └── Bytes enviados: ${processedAudio.length} bytes`);
      
      if (chunksSent === totalChunks) {
        logger.info(`✅ [${sendId}] ENVÍO COMPLETADO EXITOSAMENTE`);
      } else {
        logger.error(`❌ [${sendId}] ENVÍO INCOMPLETO: ${chunksSent}/${totalChunks} chunks`);
      }
      
    } catch (error) {
      logger.error(`❌ [${sendId}] EXCEPCIÓN CRÍTICA EN ENVÍO:`);
      logger.error(`❌ [${sendId}]   ├── Error: ${error.message}`);
      logger.error(`❌ [${sendId}]   ├── Stack: ${error.stack?.substring(0, 200)}...`);
      logger.error(`❌ [${sendId}]   ├── CAUSA RAÍZ: Exception durante envío a Twilio`);
      logger.error(`❌ [${sendId}]   ├── POSIBLES CAUSAS:`);
      logger.error(`❌ [${sendId}]   │   ├── WebSocket cerrado inesperadamente`);
      logger.error(`❌ [${sendId}]   │   ├── Error en conversión de formato de audio`);
      logger.error(`❌ [${sendId}]   │   ├── Memoria insuficiente para base64`);
      logger.error(`❌ [${sendId}]   │   └── Error de red con Twilio`);
      logger.error(`❌ [${sendId}]   └── ACCIÓN: Propagando error para activar fallback`);
      throw error;
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
      logger.info(`🔊 Procesando chunk de audio inbound: ${data.media.payload.length} bytes`);
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
      // Mapear voz del usuario con el mismo sistema que en handleStreamStart
      const voiceMapping = {
        'neutral': 'es-ES-DarioNeural',
        'lola': 'es-ES-ElviraNeural', 
        'dario': 'es-ES-DarioNeural',
        'elvira': 'es-ES-ElviraNeural',
        'female': 'es-ES-ElviraNeural',
        'male': 'es-ES-DarioNeural'
      };
      
      const userVoice = streamData.client?.callConfig?.voiceId;
      const voiceId = userVoice ? (voiceMapping[userVoice] || userVoice) : 'es-ES-DarioNeural';
      logger.info(`🔊 Generando audio para texto: ${response}`);
      const ttsResult = await this.ttsService.generateSpeech(response, voiceId);
      
      if (ttsResult && ttsResult.success && ttsResult.audioBuffer) {
        await this.sendAudioToTwilio(streamData.ws, ttsResult.audioBuffer, streamSid);
      }

      streamData.isSendingTTS = true;

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
