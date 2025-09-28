const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const OpenAIService = require('../services/openaiService');
const RealtimeTranscription = require('../services/realtimeTranscription');
// ELIMINADO: EventBasedStateManager y ProductionSafeTimeouts - reemplazados por patrón start/stop simple
const fs = require('fs');

/**
 * Preprocesador de audio para detectar y corregir saturación
 */
class AudioPreprocessor {
  constructor() {
    this.gainReduction = 0.7; // Reducir ganancia al 70%
  }
  
  /**
   * Detectar saturación temprana en el audio
   */
  detectSaturation(audioData, threshold = 254) {
    const samples = new Uint8Array(audioData);
    const saturatedSamples = samples.filter(s => s >= threshold || s <= 3).length;
    const ratio = saturatedSamples / samples.length;
    
    const stats = {
      max: Math.max(...samples),
      min: Math.min(...samples),
      avg: samples.reduce((a, b) => a + b) / samples.length
    };
    
    // Condiciones múltiples para detectar saturación (umbrales más permisivos)
    const rejectionConditions = [
      stats.max >= 254 && stats.min >= 240,  // Solo si REALMENTE saturado (max Y min altos)
      stats.min >= 230,                      // Mínimo extremadamente alto
      stats.avg >= 230,                      // Promedio extremadamente alto
      stats.max - stats.min < 5,             // Rango dinámico casi nulo
      ratio > 0.3                            // >30% de muestras saturadas
    ];
    
    return {
      isSaturated: rejectionConditions.some(condition => condition),
      ratio: ratio,
      saturatedCount: saturatedSamples,
      stats: stats,
      rejectionReasons: rejectionConditions.map((cond, i) => cond ? i : null).filter(x => x !== null)
    };
  }
  
  /**
   * Aplicar reducción de ganancia agresiva
   */
  applyGainReduction(audioData) {
    const samples = new Uint8Array(audioData);
    return samples.map(sample => {
      // Convertir de uint8 a int8, aplicar ganancia, volver a uint8
      const intSample = sample - 128;
      const reduced = intSample * this.gainReduction;
      return Math.max(0, Math.min(255, reduced + 128));
    });
  }
  
  /**
   * Normalización agresiva para audio saturado
   */
  normalizeAudio(audioData, targetGain = 0.7) {
    const samples = new Uint8Array(audioData);
    const maxVal = Math.max(...samples.map(s => Math.abs(s - 127)));
    
    if (maxVal === 0) return samples;
    
    // Normalización agresiva para reducir saturación
    const scaleFactor = Math.min(targetGain, 80 / maxVal);
    return samples.map(sample => {
      const centered = sample - 127;
      const scaled = centered * scaleFactor;
      return Math.round(Math.max(0, Math.min(255, scaled + 127)));
    });
  }
}

class TwilioStreamHandler {
  constructor(prisma, ttsService) {
    this.prisma = prisma;
    this.ttsService = ttsService; // FIX: Asignar el servicio TTS
    // Mapas para gestión de estado y audio
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.vadState = new Map(); // FIX: Nombre consistente
    this.echoBlanking = new Map();
    this.transcriptionActive = new Map();
    this.pendingMediaEvents = new Map();
    this.consecutiveSaturatedChunks = new Map(); // Contador para evitar ciclos infinitos
    this.audioPreprocessor = new AudioPreprocessor(); // Preprocesador de audio
    
    // NUEVO: Patrón start/stop transcription
    this.silenceStartTime = new Map();
    
    // VAD y detección de voz
    this.speechDetection = new Map();
    
    // Inicializar audioBuffer como array para cada stream
    this.audioBuffer = new Map(); // FIX: Inicializar audioBuffer
    
    // NUEVO: Parámetros de timeout inteligentes (inspirados en AssemblyAI)
    this.timeoutParams = {
      minEndOfTurnSilenceWhenConfident: 700, // ms - silencio mínimo para fin de turno cuando hay confianza
      minEndOfTurnSilenceWhenNotConfident: 1200, // ms - silencio mínimo cuando no hay confianza
      maxSpeechDuration: 30000, // ms - duración máxima de habla continua
      confidenceThreshold: 0.8, // umbral de confianza para transcripción
      energyThreshold: 100 // umbral de energía para detectar actividad
    };

    // Cache de conversiones
    this.responseInProgress = new Map(); // Prevenir respuestas concurrentes
    this.lastResponseTime = new Map(); // Control de tiempo entre respuestas
    this.azureToken = null; // Token reutilizable
    this.validateAzureConfig(); // Validación crítica al iniciar

    // Configurar transcripción en tiempo real
    this.transcriptionService = new RealtimeTranscription();
    this.fallbackAudio = this.generateFallbackAudio();

    // Voice mapping from user-friendly names to Azure TTS voice identifiers
    // Voz única para todos los usuarios: Isidora Multilingüe (soporte SSML completo)
    this.defaultVoice = 'es-ES-IsidoraMultilingualNeural';
    
    logger.info('🚀 TwilioStreamHandler inicializado con patrón Start/Stop simplificado');
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

    ws.on('close', () => {
      logger.info(`🔌 Conexión WebSocket cerrada: ${ws.connectionId}`);
      this.cleanup(ws.connectionId);
    });
  }

  /**
   * Maneja mensajes WebSocket entrantes
   * @param {WebSocket} ws - Conexión WebSocket
   * @param {Object} data - Datos del mensaje
   */
  handleMessage(ws, data) {
    const { event } = data;
    
    switch (event) {
      case 'connected':
        this.handleConnected(ws, data);
        break;
      case 'start':
        this.handleStart(ws, data);
        break;
      case 'media':
        this.handleMediaEvent(ws, data);
        break;
      case 'stop':
        this.handleStop(ws, data);
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

    logger.info(`🎵 [${streamSid}] Stream iniciado para llamada ${callSid}`);
    
    // Inicializar stream
    this.activeStreams.set(streamSid, {
      callSid,
      streamSid,
      state: 'connected',
      startTime: Date.now(),
      lastActivity: Date.now()
    });

    // Inicializar buffers
    this.audioBuffers.set(streamSid, []);
    this.audioBuffer.set(streamSid, []); // FIX: Inicializar audioBuffer para el stream
    this.transcriptionActive.set(streamSid, false);
    this.responseInProgress.set(streamSid, false);

    // La transcripción se activará automáticamente cuando se desactive el echo blanking
    // NO inicializar echo blanking aquí - se hace en initializeEchoBlanking()

    // Enviar saludo inicial
    this.sendInitialGreeting(ws, { streamSid, callSid }).then(() => {
      // Esperar un poco más para asegurar que el audio termine de reproducirse
      setTimeout(() => {
        logger.info(`⏰ [${streamSid}] TIMEOUT EJECUTADO - Desactivando echo blanking tras 3 segundos...`);
        this.deactivateEchoBlanking(streamSid);
        logger.info(`✅ [${streamSid}] deactivateEchoBlanking() llamado desde setTimeout`);
      }, 3000); // Delay de 3 segundos para asegurar que el saludo termine
    }).catch(error => {
      logger.error(`❌ [${streamSid}] Error en saludo inicial: ${error.message}`);
    });
  }

  /**
{{ ... }}
   * Maneja evento 'stop' de Twilio Stream
   */
  handleStop(ws, data) {
    const streamSid = data.stop?.streamSid;
    
    if (streamSid) {
      logger.info(`🛑 [${streamSid}] Stream detenido`);
      this.cleanup(streamSid);
    }
  }

  /**
   * Limpia recursos asociados a un stream
   */
  cleanup(streamSid) {
    this.activeStreams.delete(streamSid);
    this.audioBuffers.delete(streamSid);
    this.audioBuffer.delete(streamSid); // FIX: Limpiar audioBuffer también
    this.transcriptionActive.delete(streamSid);
    this.responseInProgress.delete(streamSid);
    this.silenceStartTime.delete(streamSid);
    this.vadState.delete(streamSid);
    this.lastResponseTime.delete(streamSid);
    this.speechDetection.delete(streamSid);
    this.echoBlanking.delete(streamSid);
    
    logger.info(`🧹 [${streamSid}] Recursos limpiados`);
  }

  /**
   * Maps a user-friendly voice name to a valid Azure TTS voice identifier
   * @param {string} voiceId - User-friendly voice name
   * @param {string} language - Language code (e.g., 'es-ES', 'en-US')
   * @returns {string} Valid Azure TTS voice identifier
   */
  mapVoiceToAzure(voiceId, language = 'es-ES') {
    // Siempre usar Isidora Multilingüe para todos los usuarios
    logger.info(`🎵 Using Isidora Multilingual voice for all users: ${this.defaultVoice}`);
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
   * Procesar eventos de Twilio Stream - FLUJO LIMPIO
   */
  async processStreamEvent(ws, data) {
    const event = data.event;
    const streamSid = data.streamSid || data.start?.streamSid || 'unknown';
    
    logger.info(`📡 [${streamSid}] Evento: ${event}`);
    
    // DEBUG: Registrar eventos recibidos
    if (event === 'media') {
      logger.debug(`🎤 [${streamSid}] Evento media recibido - payload: ${data.media?.payload ? 'presente' : 'ausente'}`);
    } else {
      logger.info(`📡 [${streamSid}] Evento: ${event}`);
    }
    
    try {
      switch (event) {
        case 'connected':
          await this.handleStreamConnected(ws, data);
          break;
        case 'start':
          await this.handleStreamStart(ws, data);
          break;
        case 'media':
          await this.handleMediaEvent(ws, data);
          break;
        case 'stop':
          await this.handleStreamStop(ws, data);
          break;
        default:
          logger.warn(`⚠️ [${streamSid}] Evento desconocido: ${event}`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando evento ${event}: ${error.message}`);
    }
  }

  /**
   * Stream conectado - SOLO registrar conexión
   */
  async handleStreamConnected(ws, data) {
    // En el evento 'connected', streamSid no está disponible aún
    // Registramos la conexión con un ID temporal
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`✅ [${tempId}] Stream conectado - registrando temporalmente`);
    
    // Registrar con ID temporal - se actualizará en 'start'
    this.activeStreams.set(tempId, {
      isConnected: true,
      greetingSent: false,
      isInitializing: true,
      state: 'greeting', // Estados simples: greeting, listening, processing, speaking
      lastUserInput: null,
      lastActivity: Date.now()
    });
    
    // También guardar referencia por WebSocket para poder encontrarlo en 'start'
    ws.tempStreamId = tempId;
    
    logger.info(`✅ [${tempId}] Stream registrado temporalmente - esperando 'start'`);
  }

  /**
   * Stream iniciado - configurar cliente Y enviar saludo UNA VEZ
   */
  async handleStreamStart(ws, data) {
    const { streamSid, callSid, customParameters } = data.start;
    const clientId = customParameters?.clientId;

    logger.info(`🎤 [${streamSid}] Iniciando stream para cliente: ${clientId}`);
    
    try {
      // Buscar el stream - primero por streamSid, luego por tempId del WebSocket
      let streamData = this.activeStreams.get(streamSid);
      
      if (!streamData && ws.tempStreamId) {
        // Migrar desde ID temporal al streamSid real
        streamData = this.activeStreams.get(ws.tempStreamId);
        if (streamData) {
          logger.info(`🔄 [${streamSid}] Migrando desde ID temporal: ${ws.tempStreamId}`);
          this.activeStreams.delete(ws.tempStreamId);
          this.activeStreams.set(streamSid, streamData);
        }
      }
      
      if (!streamData) {
        logger.error(`❌ [${streamSid}] Stream no encontrado en activeStreams`);
        return;
      }

      // Verificar si ya se envió el saludo
      if (streamData.greetingSent) {
        logger.warn(`⚠️ [${streamSid}] Saludo ya enviado - ignorando handleStreamStart duplicado`);
        return;
      }

      // Si no hay clientId, usar configuración por defecto para testing
      if (!clientId || isNaN(parseInt(clientId))) {
        logger.warn(`⚠️ [${streamSid}] ClientId no válido (${clientId}) - usando configuración por defecto`);
        
        // Configuración por defecto para testing
        const defaultConfig = {
          id: 1,
          companyName: 'Sistema de Prueba',
          callConfig: {
            enabled: true,
            greeting: 'Hola, gracias por llamar. Soy el asistente virtual de prueba. ¿En qué puedo ayudarte?',
            voiceId: 'lola',
            language: 'es-ES'
          }
        };
        
        streamData.client = defaultConfig;
        streamData.greetingSent = true;
        streamData.streamSid = streamSid;
        streamData.isInitializing = false;
        
        // Inicializar detección de voz ANTES del saludo
        this.initializeSpeechDetection(streamSid);
        this.initializeEchoBlanking(streamSid);
        logger.info(`🎯 [${streamSid}] Sistemas de detección inicializados`);
        
        // Enviar saludo y activar transcripción
        await this.sendInitialGreeting(ws, { streamSid, callSid });
        logger.info(`✅ [${streamSid}] Saludo de prueba enviado correctamente`);
        
        // La transcripción se activará automáticamente cuando se desactive el echo blanking
        
        return;
      }

      // Obtener configuración COMPLETA del cliente incluyendo contexto
      const clientConfig = await this.prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          id: true,
          callConfig: true,
          companyName: true,
          companyDescription: true,
          industry: true,
          botLanguage: true,
          contextFiles: true,
          faqs: true,
          companyInfo: true,
          businessHours: true
        }
      });

      if (!clientConfig) {
        logger.error(`❌ [${streamSid}] Cliente no encontrado: ${clientId}`);
        return;
      }

      // Marcar como enviado ANTES de enviar para evitar duplicados
      streamData.greetingSent = true;
      
      // Migrar de ID temporal a streamSid real
      streamData.streamSid = streamSid;
      streamData.client = clientConfig;
      streamData.isInitializing = false;
      
      // Actualizar en el Map con la clave real
      this.activeStreams.set(streamSid, streamData);

      logger.info(`✅ [${streamSid}] Cliente configurado: ${clientConfig.companyName}`);
      
      // Verificar si el bot está habilitado
      if (!clientConfig.callConfig?.enabled) {
        logger.warn(`⚠️ [${streamSid}] Bot deshabilitado para cliente ${clientId}`);
        return;
      }
      
      // Verificar horario comercial
      if (!this.isWithinBusinessHours(clientConfig.businessHours)) {
        logger.warn(`⚠️ [${streamSid}] Fuera de horario comercial`);
        return;
      }

      // Inicializar detección de voz ANTES del saludo
      this.initializeSpeechDetection(streamSid);
      this.initializeEchoBlanking(streamSid);
      logger.info(`🎯 [${streamSid}] Sistemas de detección inicializados`);

      // ENVÍO ÚNICO DEL SALUDO - SOLO AQUÍ
      try {
        logger.info(`🔊 [${streamSid}] Generando ÚNICO saludo...`);
        await this.sendInitialGreeting(ws, { streamSid, callSid });
        logger.info(`✅ [${streamSid}] Saludo único enviado correctamente`);
        
        // NUEVO: Patrón start/stop simplificado - activar transcripción después del saludo
        // La transcripción se activará automáticamente cuando se desactive el echo blanking
        
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error en saludo: ${error.message}`);
        // Resetear flag si falla para permitir reintento
        streamData.greetingSent = false;
        streamData.state = 'waiting';
      }

    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en handleStreamStart: ${error.message}`);
    }
  }

  /**
   * Generar saludo inicial - SOLO UNA VEZ POR STREAM
   */
  async sendInitialGreeting(ws, { streamSid, callSid }) {
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData?.client) {
      logger.error(`❌ [${streamSid}] Sin configuración de cliente`);
      return;
    }

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
    
    // DEBUG: Log complete callConfig structure
    logger.info(`🔍 [${streamSid}] Complete callConfig from streamData: ${JSON.stringify(streamData.client.callConfig, null, 2)}`);
    logger.info(`🔍 [${streamSid}] Complete callConfig from DB: ${JSON.stringify(clientConfigData.callConfig, null, 2)}`);
    
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
      
      // ECHO BLANKING: Activar blanking antes de enviar audio del bot
      this.activateEchoBlanking(streamSid);

      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        
        // Calcular duración del audio para activar transcripción después
        const audioDuration = Math.max(2000, (ttsResult.audioBuffer.length / 8) + 1000);
        logger.info(`🕐 [${streamSid}] Duración estimada del saludo: ${audioDuration}ms`);
        
        // Desactivar echo blanking después de que termine el audio
        logger.info(`⏰ [${streamSid}] Programando desactivación de echo blanking en ${audioDuration}ms`);
        const timeoutId = setTimeout(() => {
          logger.info(`⚡ [${streamSid}] EJECUTANDO timeout de desactivación de echo blanking`);
          this.deactivateEchoBlanking(streamSid);
          logger.info(`🔇 [${streamSid}] Echo blanking desactivado después del saludo`);
        }, audioDuration);
        
        // Guardar timeout ID para debugging
        if (!this.echoTimeouts) this.echoTimeouts = new Map();
        this.echoTimeouts.set(streamSid, timeoutId);
        
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // 4. Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      await this.sendAudioToTwilio(ws, this.fallbackAudio, streamSid);
      
      // También desactivar echo blanking para fallback
      setTimeout(() => {
        this.deactivateEchoBlanking(streamSid);
      }, 3000);
    }
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
        
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        logger.debug(`🔊 [${streamSid}] Llamada a sendRawMulawToTwilio completada (fallback)`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en saludo extendido: ${error.message}`);
      
      // Usar audio de fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback para saludo extendido`);
      await this.sendAudioToTwilio(ws, this.fallbackAudio, streamSid);
      
      // También desactivar echo blanking para fallback
      setTimeout(() => {
        this.deactivateEchoBlanking(streamSid);
      }, 3000);
    }
  }

  async sendRawMulawToTwilio(ws, mulawBuffer, streamSid) {
    logger.info("🔊 Sending audio to WebSocket");
    logger.info(`🔊 Tamaño del buffer de audio: ${mulawBuffer.length} bytes`);
    logger.info(`🔊 Primeros bytes: ${mulawBuffer.slice(0, 16).toString('hex')}`);
    
    // Ensure minimum audio length (1 second = 8000 bytes)
    if (mulawBuffer.length < 8000) {
      const padding = Buffer.alloc(8000 - mulawBuffer.length, 0xFF);
      mulawBuffer = Buffer.concat([mulawBuffer, padding]);
      logger.info(`🔊 [${streamSid}] Añadido padding de audio: ${padding.length} bytes`);
    }
    
    const chunkSize = 160;
    let offset = 0;
    let chunkCount = 0;
    const startTime = Date.now();
    
    logger.info(`🎵 [${streamSid}] Starting audio transmission (${mulawBuffer.length} bytes)`);
    
    while (offset < mulawBuffer.length) {
      const chunk = mulawBuffer.subarray(offset, offset + chunkSize);
      const base64Chunk = chunk.toString('base64');
      
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: { payload: base64Chunk }
      }));
      
      console.log('🔌 WebSocket transmission debug:', {
        timestamp: Date.now(),
        chunkSize: chunk.length,
        streamSid: streamSid,
        isConnected: ws.readyState === ws.OPEN
      });
      
      chunkCount++;
      offset += chunkSize;
    }
    
    const duration = Date.now() - startTime;
    logger.info(`✅ [${streamSid}] Audio transmission completed: ${chunkCount} chunks sent`);
  }

  generateFallbackAudio() {
    // Implementación simple de audio de fallback
    const buffer = Buffer.alloc(160, 0xff); // Silencio digital
    return buffer;
  }

  /**
   * Enviar audio a Twilio - FORMATO OPTIMIZADO
   */
  async sendAudioToTwilio(ws, audioBuffer, streamSid) {
    if (!audioBuffer || audioBuffer.length === 0) {
      logger.error(`❌ [${streamSid}] Buffer de audio vacío`);
      return;
    }

    // Verificación inicial del estado de WebSocket
    if (ws.readyState !== ws.OPEN) {
      logger.error(`❌ [${streamSid}] WebSocket no está conectado al iniciar envío (readyState: ${ws.readyState})`);
      
      // Intentar esperar hasta 500ms por si se reconecta
      let attempts = 0;
      while (ws.readyState !== ws.OPEN && attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        logger.debug(`🔄 [${streamSid}] Esperando reconexión WebSocket (intento ${attempts}/5)`);
      }
      
      if (ws.readyState !== ws.OPEN) {
        logger.error(`❌ [${streamSid}] WebSocket no se reconectó - cancelando envío de audio`);
        return;
      }
      
      logger.info(`✅ [${streamSid}] WebSocket reconectado después de ${attempts} intentos`);
    }

    try {
      let processedBuffer = audioBuffer;
      
      // Detectar formato y procesar si es necesario
      if (audioBuffer.length > 44) {
        const header = audioBuffer.subarray(0, 4).toString('ascii');
        
        if (header === 'RIFF') {
          // Es PCM, extraer datos y convertir a mulaw
          const dataChunkIndex = audioBuffer.indexOf('data');
          if (dataChunkIndex !== -1) {
            const pcmData = audioBuffer.subarray(dataChunkIndex + 8);
            processedBuffer = this.convertPCMToMulaw(pcmData);
            logger.info(`🔄 [${streamSid}] Convertido PCM a mulaw: ${processedBuffer.length} bytes`);
          }
        }
      }

      console.log('🔊 Audio transmission started for stream:', streamSid);
      console.log('🔊 Chunk size:', 160, 'bytes');
      console.log('🔊 Total audio length:', processedBuffer.length, 'bytes');

      logger.info("🔊 Sending audio to WebSocket");
      logger.info(`🔊 Tamaño del buffer de audio: ${processedBuffer.length} bytes`);
      logger.info(`🔊 Primeros bytes: ${processedBuffer.slice(0, 16).toString('hex')}`);
      
      // Enviar en chunks de 160 bytes (20ms de audio mulaw)
      const chunkSize = 160;
      let offset = 0;

      while (offset < processedBuffer.length) {
        const chunk = processedBuffer.subarray(offset, offset + chunkSize);
        const base64Chunk = chunk.toString('base64');
        
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: base64Chunk
          }
        };

        console.log('🔌 Sending chunk:', {
          size: chunk.length,
          position: offset,
          streamSid: streamSid,
          timestamp: Date.now()
        });

        // Verificación robusta del estado de WebSocket
        const isConnected = ws.readyState === ws.OPEN;
        
        console.log('🔌 WebSocket transmission debug:', {
          timestamp: Date.now(),
          chunkSize: chunk.length,
          streamSid: streamSid,
          isConnected: isConnected,
          readyState: ws.readyState
        });

        if (!isConnected) {
          logger.error(`❌ [${streamSid}] WebSocket desconectado durante envío de audio (readyState: ${ws.readyState})`);
          
          // Intentar esperar un momento por si se reconecta
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (ws.readyState !== ws.OPEN) {
            logger.error(`❌ [${streamSid}] WebSocket sigue desconectado - abortando envío de audio`);
            return;
          }
        }

        try {
          ws.send(JSON.stringify(mediaMessage));
        } catch (sendError) {
          logger.error(`❌ [${streamSid}] Error enviando chunk de audio: ${sendError.message}`);
          return;
        }
        
        offset += chunkSize;
      }

      logger.info(`📤 [${streamSid}] Audio enviado: ${Math.ceil(processedBuffer.length / chunkSize)} chunks`);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error enviando audio: ${error.message}`);
    }
  }

  /**
   * Convertir PCM 16-bit a mulaw 8-bit
   */
  convertPCMToMulaw(pcmBuffer) {
    const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);
    
    for (let i = 0; i < pcmBuffer.length; i += 2) {
      const sample = pcmBuffer.readInt16LE(i);
      const mulawByte = this.linearToMulaw(sample);
      mulawBuffer[i / 2] = mulawByte;
    }
    
    return mulawBuffer;
  }

  /**
   * Inicializar sistema de detección de habla para un stream
   */
  initializeSpeechDetection(streamSid) {
    logger.info(`🎤 [${streamSid}] Inicializando detección de voz...`);
    
    // CONFIGURACIÓN VAD OPTIMIZADA PARA TWILIO
    // Basado en sistemas probados: OpenAI Whisper, Silero VAD, WebRTC
    const config = {
      isActive: false,
      silenceCount: 0,
      speechCount: 0,
      lastActivity: Date.now(),
      
      // UMBRALES OPTIMIZADOS PARA μ-LAW 8kHz
      energyThreshold: 15, // Umbral base para habla real vs ruido telefónico
      adaptiveThreshold: 15,
      
      // CONTEOS ESTÁNDAR PARA VAD
      maxSilenceDuration: 4, // 4 chunks = ~320ms de silencio para procesar
      minSpeechDuration: 2, // 2 chunks = ~160ms mínimo de habla
      
      // TIMERS ESTÁNDAR
      hangoverDuration: 500, // 500ms hangover después de habla
      hangoverTimer: 0,
      
      // ECHO BLANKING
      echoBlanking: false,
      echoBlankingUntil: 0,
      echoBlankingDuration: 500,
      
      // HISTORIAL PARA UMBRAL ADAPTATIVO
      energyHistory: []
    };
    
    this.speechDetection.set(streamSid, config);
    
    // Verificar que se guardó correctamente
    const verification = this.speechDetection.get(streamSid);
    if (verification) {
      logger.info(`✅ [${streamSid}] Speech detection initialized successfully`);
      logger.info(`🔍 [${streamSid}] Config keys: ${Object.keys(verification).join(', ')}`);
    } else {
      logger.error(`❌ [${streamSid}] Failed to initialize speech detection`);
    }
  }

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
    const echoBlanking = this.echoBlanking.get(streamSid);
    if (echoBlanking && echoBlanking.active) {
      echoBlanking.active = false;
      echoBlanking.endTime = 0;
      logger.info(`🔇 [${streamSid}] Echo Blanking DESACTIVADO`);
      
      // CRÍTICO: Activar transcripción automáticamente cuando se desactiva echo blanking
      const streamData = this.activeStreams.get(streamSid);
      if (streamData && !this.transcriptionActive.get(streamSid)) {
        logger.info(`🚀 [${streamSid}] Activando transcripción después de desactivar echo blanking...`);
        this.transcriptionActive.set(streamSid, true);
        streamData.state = 'listening';
        streamData.greetingCompletedAt = Date.now();
        logger.info(`✅ [${streamSid}] Transcripción activada - listo para escuchar`);
      } else if (this.transcriptionActive.get(streamSid)) {
        logger.info(`ℹ️ [${streamSid}] Transcripción ya estaba activa`);
      }
    }
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
   * Detectar actividad de voz en tiempo real usando VAD (Voice Activity Detection)
   */
  detectVoiceActivity(audioChunk, streamSid) {
    try {
      let detection = this.speechDetection.get(streamSid);
      if (!detection) {
        logger.warn(`⚠️ [${streamSid}] No detection config found, re-initializing...`);
        // Re-inicializar automáticamente si no existe
        this.initializeSpeechDetection(streamSid);
        detection = this.speechDetection.get(streamSid);
        
        if (!detection) {
          logger.error(`🚨 [${streamSid}] Failed to re-initialize detection config`);
          return { shouldProcess: false, reason: 'no_detection_config' };
        }
        logger.info(`✅ [${streamSid}] Detection config re-initialized successfully`);
      }

      const now = Date.now();

      // ECHO BLANKING: Ignorar VAD si el bot está hablando o acabó de hablar
      if (this.isEchoBlankingActive(streamSid)) {
        logger.info(`🔇 [${streamSid}] VAD IGNORADO por Echo Blanking (bot hablando/eco)`);
        return { 
          shouldProcess: false, 
          isActive: detection.isActive,
          energy: 0,
          threshold: detection.adaptiveThreshold,
          reason: 'echo_blanking'
        };
      }

    // PASO 1: Detectar audio saturado
    const samples = new Uint8Array(audioChunk);
    const maxSample = Math.max(...samples);
    const minSample = Math.min(...samples);
    const saturationCount = samples.filter(s => s >= 126 || s <= 1).length;
    const saturationRatio = saturationCount / samples.length;
    
    // Rechazar audio claramente saturado
    if (saturationRatio > 0.3 || maxSample >= 127) {
      logger.warn(`🚫 [${streamSid}] Audio saturado rechazado: saturation=${(saturationRatio*100).toFixed(1)}%, max=${maxSample}`);
      return { 
        shouldProcess: false, 
        reason: 'saturated_audio',
        energy: '127.0',
        maxAmplitude: maxSample,
        silenceRatio: (saturationRatio * 100).toFixed(1) + '%'
      };
    }
    
    // PASO 2: Calcular energía con límites realistas
    let energy = 0;
    let maxAmplitude = 0;
    let sampleSum = 0;
    let zeroSamples = 0;
    let silentSamples = 0;
    
    for (const sample of samples) {
      // Detectar silencio real en mu-law
      if (sample === 0xFF || sample === 127) {
        silentSamples++;
        sampleSum += sample;
        continue;
      }
      
      // Calcular amplitud con límites anti-saturación
      const amplitude = Math.abs(sample - 127);
      const limitedAmplitude = Math.min(amplitude, 100); // LÍMITE CRÍTICO: máximo 100
      
      energy += limitedAmplitude * limitedAmplitude;
      maxAmplitude = Math.max(maxAmplitude, limitedAmplitude);
      sampleSum += sample;
      
      if (sample === 0x7F) zeroSamples++;
      if (amplitude < 8) silentSamples++; // Umbral más alto para silencio
    }
    
    // PASO 3: Calcular energía RMS con límite máximo
    const nonSilentSamples = samples.length - silentSamples;
    if (nonSilentSamples > 0) {
      energy = Math.sqrt(energy / nonSilentSamples);
      energy = Math.min(energy, 80); // LÍMITE CRÍTICO: nunca superar 80
    } else {
      energy = 0;
    }
    
    const avgSample = sampleSum / samples.length;
    const silenceRatio = silentSamples / samples.length;
    
    // LOG CRÍTICO: Análisis detallado de muestras
    logger.info(`🔬 [${streamSid}] ANÁLISIS AUDIO: energy=${energy.toFixed(1)}, maxAmp=${maxAmplitude}, avgSample=${avgSample.toFixed(1)}, silenceRatio=${(silenceRatio*100).toFixed(1)}%`)
    
    // Mantener historial de energía para umbral adaptativo
    detection.energyHistory.push(energy);
    if (detection.energyHistory.length > 50) { // mantener últimos 50 chunks (1 segundo)
      detection.energyHistory.shift();
    }
    
    // Calcular umbral adaptativo basado en promedio del ruido de fondo
    const avgEnergy = detection.energyHistory.reduce((a, b) => a + b, 0) / detection.energyHistory.length;
  
    // CONFIGURACIÓN VAD ANTI-SATURACIÓN
    // Umbrales más altos para evitar falsos positivos por audio saturado
    if (energy < 20) {
      detection.adaptiveThreshold = Math.max(12, energy * 1.5); // Ruido de fondo más estricto
      logger.info(`🔧 [${streamSid}] UMBRAL RUIDO: energy=${energy.toFixed(1)} < 20 → threshold=${detection.adaptiveThreshold.toFixed(1)}`);
    } else {
      // Umbrales más altos para habla real vs ruido telefónico
      detection.adaptiveThreshold = Math.max(20, Math.min(40, avgEnergy * 1.2));
      logger.info(`🔧 [${streamSid}] UMBRAL HABLA: energy=${energy.toFixed(1)} ≥ 20 → threshold=${detection.adaptiveThreshold.toFixed(1)}`);
    }
  
    // VAD MEJORADO: Múltiples condiciones para evitar saturación
    const energyOK = energy > detection.adaptiveThreshold && energy <= 75; // Límite superior
    const amplitudeOK = maxAmplitude > 8 && maxAmplitude <= 80; // Rango realista
    const silenceOK = silenceRatio < 0.4; // Menos tolerancia al silencio
    
    const isSpeech = energyOK && amplitudeOK && silenceOK;
    
    // LOG CRÍTICO: Mostrar decisión de speech detection mejorada
    logger.info(`🎯 [${streamSid}] SPEECH DECISION: energyOK=${energyOK} (${energy.toFixed(1)} vs ${detection.adaptiveThreshold.toFixed(1)}), ampOK=${amplitudeOK} (${maxAmplitude}), silenceOK=${silenceOK} (${(silenceRatio*100).toFixed(1)}%), isSpeech=${isSpeech}`);
    
    if (isSpeech) {
      detection.speechCount++;
      detection.silenceCount = 0;
      detection.lastActivity = now;
      
      // Activar detección si no está activa
      if (!detection.isActive) {
        detection.isActive = true;
        logger.info(`🎤 [${streamSid}] VAD ACTIVADO: Habla detectada`);
      }
      
      // HANGOVER TIMER: Establecer timer para mantener activo después de speech
      detection.hangoverTimer = now + detection.hangoverDuration;
      
      // LOG CRÍTICO: Mostrar progreso hacia activación
      logger.info(`🔢 [${streamSid}] SPEECH COUNT: ${detection.speechCount}, isActive=${detection.isActive}`);
    } else {
      detection.silenceCount++;
      detection.speechCount = Math.max(0, detection.speechCount - 1); // decaimiento gradual
      
      // LOG CRÍTICO: Mostrar por qué no es speech
      logger.info(`❌ [${streamSid}] NO SPEECH: speechCount=${detection.speechCount} (decremented), silenceCount=${detection.silenceCount}`);
    }

    // HANGOVER TIMER: Mantener isActive si está dentro del período de hangover
    if (!detection.isActive && now <= detection.hangoverTimer) {
      detection.isActive = true;
      logger.info(`⏰ [${streamSid}] HANGOVER TIMER: Manteniendo isActive por ${detection.hangoverTimer - now}ms más`);
    }
    
    // Desactivar isActive si hangover timer expiró y no hay speech reciente
    if (detection.isActive && now > detection.hangoverTimer && !isSpeech) {
      // Solo desactivar si llevamos suficiente silencio
      if (detection.silenceCount >= detection.maxSilenceDuration) {
        logger.info(`⏰ [${streamSid}] HANGOVER TIMER EXPIRADO: Desactivando isActive`);
        // No desactivar aquí, dejar que la lógica normal de shouldProcess lo maneje
      }
    }
    
    // CONFIGURACIÓN BASADA EN OPENAI DOCS: 500ms = ~6-8 chunks a 8kHz
    const timeActive = now - detection.lastActivity;
    const forceProcess = detection.isActive && 
                        detection.speechCount > 8; // Basado en OpenAI: 500ms silence_duration_ms
    
    // Detectar final de habla - LÓGICA SIMPLIFICADA PARA TWILIO
    // Si hay habla activa Y (suficiente silencio O tiempo máximo excedido)
    const shouldProcess = detection.isActive && (
      (detection.silenceCount >= detection.maxSilenceDuration && timeActive > 200) ||
      (detection.speechCount >= 8) || // Forzar después de ~640ms de habla continua
      forceProcess
    );
    
    if (shouldProcess) {
      const silenceChunks = detection.silenceCount; // Guardar antes de resetear
      const speechChunks = detection.speechCount; // Guardar antes de resetear
      const reason = forceProcess ? 'forced_timeout' : 'speech_end_detected';
      
      if (forceProcess) {
        logger.warn(`⚡ [${streamSid}] PROCESAMIENTO FORZADO: speechCount=${speechChunks}, timeActive=${timeActive}ms`);
      }
      
      detection.isActive = false;
      detection.silenceCount = 0;
      detection.speechCount = 0;
      
      if (!forceProcess) {
        logger.info(`🔇 [${streamSid}] Final de habla detectado (silencio: ${silenceChunks} chunks)`);
      }
      
      return { shouldProcess: true, reason: reason };
    }
    
    // Timeout de seguridad - procesar si llevamos mucho tiempo acumulando
    const timeoutCheck = Date.now() - detection.lastActivity;
    if (detection.isActive && timeoutCheck > 8000) { // 8 segundos máximo
      logger.warn(`⏰ [${streamSid}] Timeout de seguridad - procesando audio acumulado`);
      detection.isActive = false;
      detection.silenceCount = 0;
      detection.speechCount = 0;
      return { shouldProcess: true, reason: 'timeout' };
    }
    
    return { 
      shouldProcess: false, 
      isActive: detection.isActive,
      energy: energy.toFixed(1),
      threshold: detection.adaptiveThreshold.toFixed(1),
      speechCount: detection.speechCount,
      silenceCount: detection.silenceCount
    };
    } catch (error) {
      logger.error(`🚨 [${streamSid}] Error in detectVoiceActivity: ${error.message}`);
      return { 
        shouldProcess: false, 
        reason: 'error',
        isActive: undefined,
        energy: undefined,
        threshold: undefined
      };
    }
  }

  /**
   * Analizar calidad y características del buffer de audio
   */
  analyzeAudioBuffer(audioBuffer) {
    const samples = new Uint8Array(audioBuffer);
    let totalAmplitude = 0;
    let maxAmplitude = 0;
    let silentSamples = 0;
    let nonZeroSamples = 0;
    
    for (const sample of samples) {
      const amplitude = Math.abs(sample - 127); // mulaw center is 127
      totalAmplitude += amplitude;
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      
      if (amplitude < 5) { // Very quiet threshold
        silentSamples++;
      }
      if (sample !== 0xFF && sample !== 0x7F) { // Not silence markers
        nonZeroSamples++;
      }
    }
    
    const avgAmplitude = totalAmplitude / samples.length;
    const silenceRatio = silentSamples / samples.length;
    const dataRatio = nonZeroSamples / samples.length;
    
    return {
      totalBytes: audioBuffer.length,
      avgAmplitude: Math.round(avgAmplitude * 100) / 100,
      maxAmplitude,
      silenceRatio: Math.round(silenceRatio * 100) / 100,
      dataRatio: Math.round(dataRatio * 100) / 100,
      quality: avgAmplitude > 10 && dataRatio > 0.3 ? 'good' : 'poor'
    };
  }

  /**
   * Conversión linear a mulaw
   */
  linearToMulaw(sample) {
    const MULAW_MAX = 0x1FFF;
    const MULAW_BIAS = 33;
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > MULAW_MAX) sample = MULAW_MAX;
    sample = sample + MULAW_BIAS;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const mulawByte = ~(sign | (exponent << 4) | mantissa);
    return mulawByte & 0xFF;
  }

  /**
   * Procesar eventos media que llegaron durante la configuración inicial
   */
  async processPendingMediaEvents(ws, streamSid) {
    const pendingEvents = this.pendingMediaEvents.get(streamSid);
    if (!pendingEvents || pendingEvents.length === 0) {
      return;
    }

    logger.info(`📦 [${streamSid}] Procesando ${pendingEvents.length} eventos media buffered`);
    
    // Procesar eventos en orden
    for (const eventData of pendingEvents) {
      try {
        await this.handleMediaEvent(ws, eventData);
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error procesando evento buffered: ${error.message}`);
      }
    }
    
    // Limpiar buffer
    this.pendingMediaEvents.delete(streamSid);
    logger.info(`✅ [${streamSid}] Eventos buffered procesados y buffer limpiado`);
  }

  /**
   * Manejar eventos de media (audio del caller)
   */
  async handleMediaEvent(ws, data) {
    const { streamSid } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData) {
      // Buffer temporal para eventos media que llegan durante configuración inicial
      if (!this.pendingMediaEvents.has(streamSid)) {
        this.pendingMediaEvents.set(streamSid, []);
        logger.info(`📦 [${streamSid}] Creando buffer temporal para eventos media durante setup`);
      }
      
      const buffer = this.pendingMediaEvents.get(streamSid);
      buffer.push(data);
      
      // Limitar buffer a 100 eventos para evitar memory leak
      if (buffer.length > 100) {
        buffer.shift();
      }
      
      logger.debug(`📦 [${streamSid}] Evento media buffered durante setup (${buffer.length} eventos)`);
      return;
    }

    // Verificar si la transcripción está activa (patrón start/stop)
    const isTranscriptionActive = this.transcriptionActive && this.transcriptionActive.get(streamSid);
    logger.debug(`🔍 [${streamSid}] Estado transcripción: ${isTranscriptionActive}, Map exists: ${!!this.transcriptionActive}`);
    
    if (!isTranscriptionActive) {
      logger.warn(`🚫 [${streamSid}] Transcripción inactiva - ignorando audio del usuario`);
      return;
    }

    if (streamData.state !== 'listening') {
      logger.warn(`🚫 [${streamSid}] Estado "${streamData.state}" !== "listening" - ignorando audio`);
      return;
    }
    
    // Verificar si el bot está hablando - no procesar audio del usuario
    if (streamData.botSpeaking) {
      logger.warn(`🚫 [${streamSid}] BLOQUEADO por botSpeaking=true - ignorando audio del usuario`);
      return;
    }
    
    // DEBUG: Confirmar que estamos procesando audio del usuario
    logger.info(`🔍 [DEBUG] Procesando audio del usuario en stream ${streamSid}`);

    try {
      const payload = data.media?.payload;
      if (!payload) {
        logger.debug(`🔇 [${streamSid}] Payload de audio vacío`);
        return;
      }

      // Decodificar audio de base64 a buffer
      const rawAudioChunk = Buffer.from(payload, 'base64');
      
      // NUEVO ORDEN: Primero normalizar
      const normalizedAudio = this.audioPreprocessor.normalizeAudio(rawAudioChunk, 0.7);
      
      // Detección de saturación en audio NORMALIZADO
      const saturationCheck = this.audioPreprocessor.detectSaturation(normalizedAudio);
      
      // Inicializar audioBuffer para este stream si no existe
      if (!this.audioBuffer.has(streamSid)) {
        this.audioBuffer.set(streamSid, []);
      }
      
      // Usar audio normalizado en VAD y buffer
      const streamAudioBuffer = this.audioBuffer.get(streamSid);
      streamAudioBuffer.push(...normalizedAudio);
      
      logger.debug(`🔧 [${streamSid}] Llamando processVAD con audio de ${normalizedAudio.length} bytes`);
      const vadResult = this.processVAD(streamSid, normalizedAudio);
      logger.info(`🎤 [${streamSid}] VAD Result: shouldProcess=${vadResult.shouldProcess}, isActive=${vadResult.isActive}, energy=${vadResult.energy}, threshold=${vadResult.threshold}`);
      
      // Acumular audio PREPROCESADO y detectar fin de turno con parámetros inteligentes
      const audioBuffer = this.audioBuffers.get(streamSid) || [];
      audioBuffer.push(normalizedAudio); // Usar audio preprocesado, no el original
      this.audioBuffers.set(streamSid, audioBuffer);
      
      logger.debug(`🎤 [${streamSid}] Audio chunk: energía=${vadResult.energy}, umbral=${vadResult.threshold}, activo=${vadResult.isActive}, buffer=${audioBuffer.length} chunks`);
      
      // Detectar fin de turno usando parámetros inteligentes
      const silenceDuration = this.calculateSilenceDuration(streamSid, vadResult);
      
      // Usar parámetros de timeout inteligentes
      if (silenceDuration >= this.timeoutParams.minEndOfTurnSilenceWhenConfident) {
        logger.info(`🔇 [${streamSid}] Fin de turno detectado (${silenceDuration}ms de silencio)`);
        const collectedAudio = this.stopTranscription(streamSid);
        if (collectedAudio && collectedAudio.length > 0) {
          this.processCollectedAudio(ws, streamSid, collectedAudio);
        }
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando audio: ${error.message}`);
    }
  }

  /**
   * NUEVO: Procesar audio acumulado cuando se detecta fin de turno
   */
  async processCollectedAudio(ws, streamSid, collectedAudio) {
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData) {
      logger.error(`❌ [${streamSid}] Stream no encontrado para procesar audio`);
      return;
    }

    const combinedBuffer = Buffer.concat(collectedAudio);
    logger.info(`🎙️ [${streamSid}] Procesando audio acumulado: ${combinedBuffer.length} bytes de ${collectedAudio.length} chunks`);
    
    // Filtro de duración mínima - evitar procesar audio muy corto
    if (collectedAudio.length < 6) { // menos de 120ms
      logger.debug(`🚫 [${streamSid}] Audio muy corto (${collectedAudio.length} chunks) - ignorando`);
      return;
    }
    
    try {
      logger.info(`🎤 [${streamSid}] Iniciando transcripción de ${combinedBuffer.length} bytes`);
      
      // DEBUG: Guardar audio para análisis manual
      const debugFileName = `debug_audio_${Date.now()}_${streamSid.slice(-6)}.wav`;
      const fs = require('fs');
      fs.writeFileSync(debugFileName, combinedBuffer);
      logger.info(`🔧 [${streamSid}] Audio guardado para debug: ${debugFileName}`);
      
      // DEBUG: Analizar calidad del audio antes de transcribir
      const audioStats = this.analyzeAudioBuffer(combinedBuffer);
      logger.info(`📊 [${streamSid}] Estadísticas de audio: ${JSON.stringify(audioStats)}`);
      
      // Filtro de calidad más permisivo ya que VAD pre-filtró el audio
      if (audioStats.avgAmplitude < 5) {
        logger.warn(`🚫 [${streamSid}] Audio de muy baja calidad detectado - ignorando transcripción (avg: ${audioStats.avgAmplitude})`);
        return;
      }
      
      // PROTECCIÓN CRÍTICA: Verificar que no hay transcripción o respuesta en progreso
      if (this.responseInProgress.get(streamSid)) {
        logger.warn(`🚫 [${streamSid}] Respuesta en progreso - ignorando nueva transcripción`);
        return;
      }
      
      // Verificar tiempo mínimo entre transcripciones para evitar spam
      const lastResponse = this.lastResponseTime.get(streamSid) || 0;
      const timeSinceLastResponse = Date.now() - lastResponse;
      if (timeSinceLastResponse < 2000) { // Mínimo 2 segundos entre transcripciones
        logger.warn(`⏰ [${streamSid}] Muy pronto para nueva transcripción (${timeSinceLastResponse}ms) - ignorando`);
        return;
      }
      
      logger.info(`📝 [${streamSid}] Transcripción exitosa: "${transcriptionResult.text}"`);          
      logger.info(`🔍 [DEBUG] Llamada a generateAndSendResponse con transcripción: "${transcriptionResult.text}"`);
      
      // CRÍTICO: Actualizar actividad del usuario en StateManager
      // Cambiar estado a procesando
      streamData.state = 'processing';
      streamData.lastUserInput = transcriptionResult.text;
      
      // Guardar última transcripción
      streamData.lastTranscription = currentText;
      
      // Generar respuesta conversacional
      await this.generateAndSendResponse(ws, streamSid, transcriptionResult.text, streamData.client);
      
      // NUEVO: Después de enviar respuesta, reactivar listening
      setTimeout(() => {
        this.startListening(streamSid);
      }, 1000); // 1 segundo de delay
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando audio: ${error.message}`);
    }
  }

  /**
   * Generar respuesta conversacional y enviar como audio
   */
  async generateAndSendResponse(ws, streamSid, transcribedText, clientConfig) {
    try {
      logger.info(`🤖 [${streamSid}] Iniciando generación de respuesta para: "${transcribedText}"`);      
      logger.info(`🔍 [DEBUG] ClientConfig recibido en generateAndSendResponse: ${JSON.stringify(clientConfig, null, 2)}`);
      
      // Verificar que no hay otra respuesta en progreso
      if (this.responseInProgress.get(streamSid)) {
        logger.warn(`⚠️ [${streamSid}] Respuesta ya en progreso - abortando nueva generación`);
        return;
      }
      
      // Marcar respuesta en progreso
      this.responseInProgress.set(streamSid, true);
      this.lastResponseTime.set(streamSid, Date.now());
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = true;
        streamData.conversationTurn = 'speaking';
      }
      
      // Obtener contexto de conversación
      const conversationContext = this.conversationState.get(streamSid) || { previousMessages: [], structuredHistory: [] };
      logger.info(`💭 [${streamSid}] Contexto conversación: ${conversationContext.structuredHistory?.length || 0} mensajes estructurados previos`);
      
      // DEBUG: Mostrar historial completo si existe
      if (conversationContext.structuredHistory && conversationContext.structuredHistory.length > 0) {
        logger.info(`🔍 [DEBUG] Historial conversacional existente:`);
        conversationContext.structuredHistory.forEach((msg, index) => {
          logger.info(`🔍 [DEBUG] ${index}: ${msg.role} - "${msg.content}"`);
        });
      } else {
        logger.warn(`⚠️ [${streamSid}] NO HAY HISTORIAL CONVERSACIONAL - Primera interacción o contexto perdido`);
      }
      
      // Generar respuesta con OpenAI (optimizado con GPT-3.5-turbo)
      const startTime = Date.now();
      const responseResult = await this.openaiService.generateReceptionistResponse(
        transcribedText,
        clientConfig,
        conversationContext
      );
      const openaiTime = Date.now() - startTime;
      
      logger.info(`⚡ [${streamSid}] OpenAI respuesta generada en ${openaiTime}ms`);
      
      if (!responseResult.success) {
        logger.error(`❌ [${streamSid}] Error generando respuesta: ${responseResult.error}`);
        await this.sendFallbackResponse(ws, streamSid, clientConfig);
        return;
      }
      
      const responseText = responseResult.response;
      logger.info(`📝 [${streamSid}] Respuesta generada: "${responseText}"`);
      
      // Actualizar contexto conversacional con estructura OpenAI (optimizado)
      conversationContext.structuredHistory = conversationContext.structuredHistory || [];
      conversationContext.structuredHistory.push(
        { role: 'user', content: transcribedText },
        { role: 'assistant', content: responseText }
      );
      
      // Mantener solo los últimos 6 mensajes (3 intercambios) para mayor velocidad
      if (conversationContext.structuredHistory.length > 6) {
        conversationContext.structuredHistory = conversationContext.structuredHistory.slice(-6);
      }
      
      // Mantener compatibilidad con formato anterior (opcional)
      conversationContext.previousMessages = conversationContext.previousMessages || [];
      conversationContext.previousMessages.push(`Usuario: ${transcribedText}`, `Asistente: ${responseText}`);
      if (conversationContext.previousMessages.length > 4) {
        conversationContext.previousMessages = conversationContext.previousMessages.slice(-4);
      }
      
      this.conversationState.set(streamSid, conversationContext);
      
      // Convertir respuesta a audio y enviar (optimizado)
      await this.sendResponseAsAudio(ws, streamSid, responseText, clientConfig);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error crítico en generación de respuesta: ${error.message}`);
      logger.error(`❌ [${streamSid}] Stack trace generación:`, error.stack);
      
      // Limpiar estado en caso de error
      this.responseInProgress.delete(streamSid);
      // Reactivar listening
      this.startListening(streamSid);
      
      // Respuesta de emergencia
      const fallbackText = "Disculpa, tengo problemas técnicos. ¿Podrías repetir tu consulta?";
      await this.sendResponseAsAudio(ws, streamSid, fallbackText, clientConfig);
    } finally {
      // Asegurar limpieza del estado
      this.responseInProgress.delete(streamSid);
    }
  }

  /**
   * Convertir texto a audio y enviar a Twilio
   */
  async sendResponseAsAudio(ws, streamSid, responseText, clientConfig) {
    try {
      logger.info(`🔊 [${streamSid}] Iniciando conversión TTS para: "${responseText}"`);
      
      // Obtener configuración de voz
      const rawVoiceId = clientConfig.callConfig?.voiceId || 'isidora';
      const language = clientConfig.callConfig?.language || 'es-ES';
      const voiceId = this.mapVoiceToAzure(rawVoiceId, language);
      
      logger.info(`🎵 Using Isidora Multilingual voice for all users: ${voiceId}`);
      
      // Humanizar texto con SSML
      const humanizedText = this.humanizeTextWithSSML(responseText, voiceId);
      logger.info(`🎭 [${streamSid}] Texto humanizado: "${humanizedText}"`);
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.state = 'speaking';
      }
      
      const ttsResult = await this.ttsService.generateSpeech(
        humanizedText,
        voiceId,
        'raw-8khz-8bit-mono-mulaw'
      );
      
      if (ttsResult.success && ttsResult.audioBuffer) {
        logger.info(`🔊 Tamaño del buffer de audio: ${ttsResult.audioBuffer.length} bytes`);
        logger.info(`🔊 Primeros bytes: ${ttsResult.audioBuffer.subarray(0, 16).toString('hex')}`);
        
        // Enviar audio a Twilio
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        
        logger.info(`✅ [${streamSid}] Audio enviado exitosamente`);
        
        // Calcular duración aproximada del audio y agregar buffer
        const estimatedDuration = Math.max(3000, (ttsResult.audioBuffer.length / 8) + 2000); // ~1ms por byte + 2s buffer
        
        // Activar echo blanking durante la reproducción
        this.activateEchoBlanking(streamSid);
        
        // Desactivar echo blanking después del audio
        setTimeout(() => {
          logger.info(`⚡ [${streamSid}] TTS completado - desactivando echo blanking`);
          this.deactivateEchoBlanking(streamSid);
          this.responseInProgress.delete(streamSid);
        }, estimatedDuration);
        
      } else {
        logger.error(`❌ [${streamSid}] Error generando TTS: ${ttsResult.error || 'Error desconocido'}`);
        
        // Fallback: enviar mensaje de error como audio
        const fallbackText = "Lo siento, ha habido un error técnico. ¿Puedo ayudarte de otra manera?";
        const fallbackHumanized = this.humanizeTextWithSSML(fallbackText);
        const fallbackResult = await this.ttsService.generateSpeech(
          fallbackHumanized,
          voiceId,
          'raw-8khz-8bit-mono-mulaw'
        );
        
        if (fallbackResult.success) {
          await this.sendRawMulawToTwilio(ws, fallbackResult.audioBuffer, streamSid);
          
          // Calcular duración aproximada del audio fallback
          const fallbackDuration = Math.max(3000, (fallbackResult.audioBuffer.length / 8) + 2000);
          
          // Activar echo blanking durante la reproducción del fallback
          this.activateEchoBlanking(streamSid);
          
          // Desactivar echo blanking después del audio fallback
          setTimeout(() => {
            logger.info(`⚡ [${streamSid}] Fallback TTS completado - desactivando echo blanking`);
            this.deactivateEchoBlanking(streamSid);
            this.responseInProgress.delete(streamSid);
          }, fallbackDuration);
        }
      }
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendResponseAsAudio: ${error.message}`);
      logger.error(`❌ [${streamSid}] Stack trace sendResponseAsAudio:`, error.stack);
      
      // Asegurar que se reactive la escucha en caso de error
      this.responseInProgress.delete(streamSid);
      // Reactivar listening después de error
      setTimeout(() => {
        this.startListening(streamSid);
      }, 1000);
    }
  }

  /**
   * Enviar respuesta de fallback cuando OpenAI falla
   */
  async sendFallbackResponse(ws, streamSid, clientConfig) {
    try {
      logger.warn(`⚠️ [${streamSid}] Enviando respuesta de fallback por error OpenAI`);
      
      const fallbackText = "Disculpa, tengo problemas técnicos momentáneos. ¿Podrías repetir tu consulta por favor?";
      
      // Enviar respuesta de fallback como audio
      await this.sendResponseAsAudio(ws, streamSid, fallbackText, clientConfig);
      
      // NUEVO: Programar transición a listening después del TTS (patrón simple)
      const estimatedDuration = Math.max(3000, fallbackText.length * 100); // Mínimo 3s
      setTimeout(() => {
        logger.info(`⚡ [${streamSid}] TTS completado - iniciando listening`);
        this.startListening(streamSid);
        this.responseInProgress.delete(streamSid);
      }, estimatedDuration);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendFallbackResponse: ${error.message}`);
      
      // Último recurso: reactivar listening
      this.responseInProgress.delete(streamSid);
      setTimeout(() => {
        this.startListening(streamSid);
      }, 1000);
    }
  }

  /**
   * NUEVO: Iniciar modo listening (patrón start/stop)
   */
  startListening(streamSid) {
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData) {
      logger.error(`❌ [${streamSid}] No se puede iniciar listening - stream no encontrado`);
      return;
    }
    
    streamData.state = 'listening';
    streamData.lastActivity = Date.now();
    
    // Iniciar transcripción
    this.startTranscription(streamSid);
    
    logger.info(`👂 [${streamSid}] LISTENING MODE ACTIVADO - transcripción iniciada`);
  }

  /**
   * NUEVO: Start transcription - Iniciar escucha activa
   */
  startTranscription(streamSid) {
    if (this.transcriptionActive && this.transcriptionActive.get(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] Transcripción ya activa - ignorando`);
      return;
    }
    
    if (!this.transcriptionActive) {
      this.transcriptionActive = new Map();
    }
    
    this.transcriptionActive.set(streamSid, true);
    
    if (!this.audioBuffers.has(streamSid)) {
      this.audioBuffers.set(streamSid, []);
    }
    
    logger.info(`🎙️ [${streamSid}] Transcripción INICIADA - escuchando activamente`);
  }
  
  /**
   * NUEVO: Stop transcription - Detener escucha y procesar
   */
  stopTranscription(streamSid) {
    if (!this.transcriptionActive || !this.transcriptionActive.get(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] Transcripción ya inactiva - ignorando`);
      return null;
    }
    
    this.transcriptionActive.set(streamSid, false);
    const audioBuffer = this.audioBuffers.get(streamSid) || [];
    
    // Limpiar buffers
    this.audioBuffers.set(streamSid, []);
    
    logger.info(`🛑 [${streamSid}] Transcripción DETENIDA - procesando ${audioBuffer.length} chunks`);
    
    return audioBuffer;
  }

  /**
   * NUEVO: Calcular duración de silencio para detección de fin de turno
   */
  calculateSilenceDuration(streamSid, vadResult) {
    if (!vadResult.isActive) {
      // Iniciar contador de silencio si no existe
      if (!this.silenceStartTime.has(streamSid)) {
        this.silenceStartTime.set(streamSid, Date.now());
      }
      
      // Calcular duración del silencio
      const silenceStart = this.silenceStartTime.get(streamSid);
      return Date.now() - silenceStart;
    } else {
      // Resetear contador si hay actividad
      this.silenceStartTime.delete(streamSid);
      return 0;
    }
  }

  /**
   * Verificar si está dentro del horario comercial
   */
  isWithinBusinessHours(businessHours) {
    // Si no hay configuración de horario, permitir siempre (24/7)
    if (!businessHours || typeof businessHours !== 'object') {
      logger.info('📅 No hay configuración de horario comercial - permitiendo 24/7');
      return true;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

    // Mapear días de la semana
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[currentDay];

    // NUEVO: Detectar formato de configuración
    if (businessHours.workingDays && Array.isArray(businessHours.workingDays)) {
      // Formato nuevo: {enabled: true, workingDays: [...], openingTime: '00:00', closingTime: '23:59'}
      logger.info(`📅 Usando formato nuevo de horarios comerciales`);
      
      if (!businessHours.enabled) {
        logger.info(`📅 Horarios comerciales deshabilitados globalmente`);
        return false;
      }
      
      if (!businessHours.workingDays.includes(todayName)) {
        logger.info(`📅 Día ${todayName} no está en workingDays: ${businessHours.workingDays.join(', ')}`);
        return false;
      }
      
      // Verificar horario del día
      const startTime = parseInt(businessHours.openingTime?.replace(':', '') || '0000');
      const endTime = parseInt(businessHours.closingTime?.replace(':', '') || '2359');
      
      const isWithinHours = currentTime >= startTime && currentTime <= endTime;
      
      logger.info(`📅 Horario comercial ${todayName}: ${businessHours.openingTime}-${businessHours.closingTime}, actual: ${Math.floor(currentTime/100)}:${String(currentTime%100).padStart(2,'0')}, permitido: ${isWithinHours}`);
      
      return isWithinHours;
    } else {
      // Formato antiguo: {sunday: {enabled: false}, monday: {enabled: true, start: '09:00', end: '18:00'}}
      logger.info(`📅 Usando formato antiguo de horarios comerciales`);
      
      const todayConfig = businessHours[todayName];
      if (!todayConfig || !todayConfig.enabled) {
        logger.info(`📅 Día ${todayName} no habilitado en horario comercial`);
        return false;
      }

      // Verificar horario del día
      const startTime = parseInt(todayConfig.start?.replace(':', '') || '0000');
      const endTime = parseInt(todayConfig.end?.replace(':', '') || '2359');

      const isWithinHours = currentTime >= startTime && currentTime <= endTime;
      
      logger.info(`📅 Horario comercial ${todayName}: ${todayConfig.start}-${todayConfig.end}, actual: ${Math.floor(currentTime/100)}:${String(currentTime%100).padStart(2,'0')}, permitido: ${isWithinHours}`);
      
      return isWithinHours;
    }
  }

  /**
   * Procesar audio con VAD usando la estructura existente de speechDetection
   */
  processVAD(streamSid, audioChunk) {
    logger.debug(`🔍 [${streamSid}] processVAD iniciado con chunk de ${audioChunk.length} bytes`);
    
    const detection = this.speechDetection.get(streamSid);
    if (!detection) {
      logger.error(`❌ [${streamSid}] No hay configuración de speech detection`);
      return { shouldProcess: false, isActive: false, energy: 0, threshold: 0 };
    }
    
    logger.debug(`🔍 [${streamSid}] Speech detection encontrado: ${Object.keys(detection)}`);

    // Calcular energía del audio
    const samples = new Uint8Array(audioChunk);
    let totalEnergy = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] - 127; // Centrar en 0
      totalEnergy += sample * sample;
    }
    const energy = Math.sqrt(totalEnergy / samples.length);

    // Actualizar historial de energía
    detection.energyHistory = detection.energyHistory || [];
    detection.energyHistory.push(energy);
    if (detection.energyHistory.length > 10) {
      detection.energyHistory.shift();
    }

    // Calcular umbral adaptativo
    const avgEnergy = detection.energyHistory.reduce((a, b) => a + b, 0) / detection.energyHistory.length;
    detection.adaptiveThreshold = Math.max(detection.energyThreshold, avgEnergy * 1.2);

    // Determinar si hay actividad de voz
    const isActive = energy > detection.adaptiveThreshold;
    
    // Actualizar contadores
    if (isActive) {
      detection.speechCount++;
      detection.silenceCount = 0;
      detection.isActive = true;
    } else {
      detection.silenceCount++;
      detection.speechCount = 0;
      if (detection.silenceCount > 5) {
        detection.isActive = false;
      }
    }

    detection.lastActivity = Date.now();

    return {
      shouldProcess: isActive,
      isActive: detection.isActive,
      energy: Math.round(energy * 100) / 100,
      threshold: Math.round(detection.adaptiveThreshold * 100) / 100
    };
  }

  /**
   * Resetear estado VAD para audio constantemente saturado
   */
  resetVADState(streamSid) {
    logger.warn(`🔄 [${streamSid}] Reseteando estado VAD por audio saturado`);
    
    // Limpiar estado VAD
    if (this.speechDetection.has(streamSid)) {
      const detection = this.speechDetection.get(streamSid);
      detection.isActive = false;
      detection.speechCount = 0;
      detection.silenceCount = 0;
      detection.energyHistory = [];
      detection.adaptiveThreshold = detection.energyThreshold || 15;
      detection.lastActivity = Date.now();
      logger.info(`🧹 [${streamSid}] Estado VAD reseteado`);
    }
    
    // Limpiar buffer de audio acumulado
    if (this.audioBuffers.has(streamSid)) {
      this.audioBuffers.set(streamSid, []);
      logger.info(`🧹 [${streamSid}] Buffer de audio limpiado`);
    }
  }

  /**
   * Manejar evento de parada del stream
   */
  async handleStreamStop(ws, data) {
    const streamSid = data.streamSid;
    logger.info(`🛑 [${streamSid}] Stream detenido`);
    
    try {
      // Limpiar recursos del stream
      if (this.audioBuffers.has(streamSid)) {
        this.audioBuffers.delete(streamSid);
        logger.info(`🧹 [${streamSid}] Buffer de audio limpiado`);
      }
      
      if (this.speechDetection.has(streamSid)) {
        this.speechDetection.delete(streamSid);
        logger.info(`🧹 [${streamSid}] Estado VAD limpiado`);
      }
      
      if (this.echoBlanking.has(streamSid)) {
        this.echoBlanking.delete(streamSid);
        logger.info(`🧹 [${streamSid}] Estado echo blanking limpiado`);
      }
      
      if (this.consecutiveSaturatedChunks.has(streamSid)) {
        this.consecutiveSaturatedChunks.delete(streamSid);
        logger.info(`🧹 [${streamSid}] Contador de saturación limpiado`);
      }
      
      logger.info(`✅ [${streamSid}] Recursos del stream limpiados correctamente`);
      
    } catch (error) {
      logger.error(`🚨 [${streamSid}] Error al limpiar recursos del stream: ${error.message}`);
    }
  }

  /**
   * Validar variables Azure
   */
  validateAzureConfig() {
    const requiredVars = [
      'AZURE_SPEECH_KEY',
      'AZURE_SPEECH_REGION'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        logger.error(`❌ CRÍTICO: Variable de entorno ${varName} no configurada`);
        process.exit(1);
      }
    });
  }
}

module.exports = TwilioStreamHandler;
