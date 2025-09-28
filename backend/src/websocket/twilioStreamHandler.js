const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const OpenAIService = require('../services/openaiService'); // Servicio de chat/GPT
const RealtimeTranscription = require('../services/realtimeTranscription');
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
    this.ttsService = ttsService;

    // ✅ INICIALIZACIÓN CORREGIDA - Servicios críticos
    try {
      this.openaiService = new OpenAIService(); // Servicio de chat/GPT
      logger.info('✅ OpenAIService (chat) inicializado correctamente');
    } catch (error) {
      logger.error(`❌ Error crítico inicializando OpenAIService: ${error.message}`);
      this.openaiService = null;
    }

    // ✅ Inicializar todos los mapas necesarios
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.audioBuffer = new Map();
    this.transcriptionActive = new Map();
    this.responseInProgress = new Map();
    this.conversationState = new Map();
    this.pendingMarks = new Map();
    this.pendingMediaEvents = new Map();
    this.silenceStartTime = new Map();
    this.speechDetection = new Map();
    this.echoBlanking = new Map();
    this.lastResponseTime = new Map();
    this.consecutiveSaturatedChunks = new Map();
    
    // Preprocesador de audio
    this.audioPreprocessor = new AudioPreprocessor();
    
    // ✅ Inicializar servicios
    this.transcriptionService = new RealtimeTranscription();
    this.fallbackAudio = this.generateFallbackAudio();

    // Voice mapping
    this.defaultVoice = 'es-ES-IsidoraMultilingualNeural';
    
    // Parámetros de timeout inteligentes
    this.timeoutParams = {
      minEndOfTurnSilenceWhenConfident: 700,
      minEndOfTurnSilenceWhenNotConfident: 1200,
      maxSpeechDuration: 30000,
      confidenceThreshold: 0.8,
      energyThreshold: 100
    };

    // Cache de conversiones
    this.azureToken = null;
    this.validateAzureConfig();

    // ✅ DIAGNÓSTICO INICIAL
    logger.info('🔍 DIAGNÓSTICO INICIALIZACIÓN:');
    logger.info(`🔍 - openaiService: ${!!this.openaiService}`);
    logger.info(`🔍 - transcriptionService: ${!!this.transcriptionService}`);
    logger.info(`🔍 - ttsService: ${!!this.ttsService}`);
    
    if (this.openaiService) {
      logger.info(`🔍 - generateReceptionistResponse existe: ${typeof this.openaiService.generateReceptionistResponse === 'function'}`);
    }
    
    logger.info('🚀 TwilioStreamHandler inicializado con todos los servicios');
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
      case 'mark':
        this.handleMark(ws, data);
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
   * Maneja evento 'mark' de Twilio - CRÍTICO para activar transcripción
   */
  handleMark(ws, data) {
    const streamSid = data.streamSid;
    const markName = data.mark?.name;
    
    if (!markName) {
      logger.warn(`⚠️ [${streamSid}] Mensaje mark sin nombre recibido`);
      return;
    }
    
    logger.info(`🎯 [${streamSid}] Marca recibida: ${markName}`);
    
    // Verificar si tenemos una acción pendiente para esta marca
    if (!this.pendingMarks.has(markName)) {
      logger.debug(`🔍 [${streamSid}] Marca ${markName} no esperada - ignorando`);
      return;
    }
    
    const markData = this.pendingMarks.get(markName);
    logger.info(`🚀 [${streamSid}] Ejecutando acción para marca ${markName}: ${markData.action}`);
    
    // Ejecutar la acción correspondiente
    switch (markData.action) {
      case 'activate_transcription':
        logger.info(`🎤 [${streamSid}] ACTIVANDO transcripción tras completar audio (marca: ${markName})`);
        this.activateTranscriptionAfterAudio(streamSid);
        break;
      case 'deactivate_echo_blanking':
        logger.info(`⚡ [${streamSid}] DESACTIVANDO echo blanking tras completar respuesta (marca: ${markName})`);
        this.deactivateEchoBlanking(streamSid);
        this.responseInProgress.delete(streamSid);
        logger.info(`✅ [${streamSid}] Echo blanking desactivado - usuario puede hablar de nuevo`);
        break;
      default:
        logger.warn(`⚠️ [${streamSid}] Acción desconocida para marca ${markName}: ${markData.action}`);
    }
    
    // Limpiar la marca procesada
    this.pendingMarks.delete(markName);
  }

  /**
   * Activa la transcripción después de que el audio termine
   */
  activateTranscriptionAfterAudio(streamSid) {
    logger.info(`🔍 [${streamSid}] Estado ANTES de activar transcripción:`);
    logger.info(`🔍 [${streamSid}] - echoBlanking activo: ${this.echoBlanking.get(streamSid)?.active}`);
    logger.info(`🔍 [${streamSid}] - transcripción activa: ${this.transcriptionActive.get(streamSid)}`);
    
    // Desactivar echo blanking (esto activa la transcripción automáticamente)
    this.deactivateEchoBlanking(streamSid);
    
    // ✅ ACTIVACIÓN EXPLÍCITA COMO FALLBACK
    if (!this.transcriptionActive.get(streamSid)) {
      logger.warn(`⚠️ [${streamSid}] Transcripción no se activó automáticamente - activando manualmente`);
      this.transcriptionActive.set(streamSid, true);
      
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.state = 'listening';
        streamData.botSpeaking = false;
      }
    }
    
    logger.info(`🔍 [${streamSid}] Estado DESPUÉS de activar transcripción:`);
    logger.info(`🔍 [${streamSid}] - transcripción activa: ${this.transcriptionActive.get(streamSid)}`);
    logger.info(`🔍 [${streamSid}] - streamData state: ${this.activeStreams.get(streamSid)?.state}`);
    
    logger.info(`✅ [${streamSid}] Transcripción activada exitosamente - el usuario ya puede hablar`);
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
      lastActivity: Date.now(),
      greetingSent: false,
      isInitializing: true,
      botSpeaking: false
    });

    // Inicializar buffers
    this.audioBuffers.set(streamSid, []);
    this.audioBuffer.set(streamSid, []);
    this.transcriptionActive.set(streamSid, false);
    this.responseInProgress.set(streamSid, false);

    // Enviar saludo inicial
    this.sendInitialGreeting(ws, { streamSid, callSid }).catch(error => {
      logger.error(`❌ [${streamSid}] Error en saludo inicial: ${error.message}`);
    });
  }

  /**
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
    this.audioBuffer.delete(streamSid);
    this.transcriptionActive.delete(streamSid);
    this.responseInProgress.delete(streamSid);
    this.silenceStartTime.delete(streamSid);
    this.speechDetection.delete(streamSid);
    this.lastResponseTime.delete(streamSid);
    this.echoBlanking.delete(streamSid);
    this.conversationState.delete(streamSid);
    
    logger.info(`🧹 [${streamSid}] Recursos limpiados`);
  }

  /**
   * Maps a user-friendly voice name to a valid Azure TTS voice identifier
   */
  mapVoiceToAzure(voiceId, language = 'es-ES') {
    logger.info(`🎵 Using Isidora Multilingual voice for all users: ${this.defaultVoice}`);
    return this.defaultVoice;
  }

  /**
   * Humanizar texto con SSML para que Isidora Multilingüe suene más natural
   */
  humanizeTextWithSSML(text, style = 'chat') {
    // Limpiar texto de posibles caracteres problemáticos
    const cleanText = text.replace(/[<>&"']/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
      return entities[match];
    });

    // Solo devolver el contenido SSML interno (sin <speak> wrapper)
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
  async handleStreamConnected(ws, data) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`✅ [${tempId}] Stream conectado - registrando temporalmente`);
    
    // Registrar con ID temporal - se actualizará en 'start'
    this.activeStreams.set(tempId, {
      isConnected: true,
      greetingSent: false,
      isInitializing: true,
      state: 'greeting',
      lastUserInput: null,
      lastActivity: Date.now(),
      botSpeaking: false
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

      // ENVÍO ÚNICO DEL SALUDO
      try {
        logger.info(`🔊 [${streamSid}] Generando ÚNICO saludo...`);
        await this.sendInitialGreeting(ws, { streamSid, callSid });
        logger.info(`✅ [${streamSid}] Saludo único enviado correctamente`);
        
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
      // Humanizar el saludo con SSML
      const humanizedGreeting = this.humanizeTextWithSSML(greeting);
      
      // Generar audio con Azure TTS usando SSML humanizado con timeout
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

      logger.info(`🔍 [${streamSid}] TTS Result recibido: tipo=${typeof ttsResult}, success=${ttsResult?.success}, audioBuffer length=${ttsResult?.audioBuffer?.length}`);
      
      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        // Calcular duración aproximada del audio para timing correcto
        const audioLengthMs = Math.ceil((ttsResult.audioBuffer.length / 8000) * 1000);
        logger.info(`🔍 [${streamSid}] Audio length: ${ttsResult.audioBuffer.length} bytes = ~${audioLengthMs}ms`);
        
        // Enviar audio con marca para detectar cuando termina
        const markId = `greeting_end_${Date.now()}`;
        logger.info(`🚀 [${streamSid}] Enviando saludo con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para activar transcripción
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'activate_transcription',
          timestamp: Date.now()
        });
        
        // Enviar audio con marca al final
        await this.sendRawMulawToTwilioWithMark(ws, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`🔍 [${streamSid}] Audio del saludo enviado con marca ${markId}`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      
      // Activar echo blanking durante fallback
      this.activateEchoBlanking(streamSid);
      
      // Enviar fallback con marca para detectar cuando termina
      const fallbackMarkId = `greeting_fallback_end_${Date.now()}`;
      logger.info(`🚀 [${streamSid}] Enviando fallback del saludo con marca: ${fallbackMarkId}`);
      
      // Registrar que esperamos esta marca para activar transcripción
      this.pendingMarks.set(fallbackMarkId, {
        streamSid: streamSid,
        action: 'activate_transcription',
        timestamp: Date.now()
      });
      
      // Enviar audio fallback con marca al final
      await this.sendRawMulawToTwilioWithMark(ws, this.fallbackAudio, streamSid, fallbackMarkId);
      logger.info(`✅ [${streamSid}] Audio fallback del saludo enviado con marca ${fallbackMarkId}`);
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
        // Enviar saludo extendido con marca para detectar cuando termina
        const markId = `extended_greeting_end_${Date.now()}`;
        logger.info(`🚀 [${streamSid}] Enviando saludo extendido con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para activar transcripción
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'activate_transcription',
          timestamp: Date.now()
        });
        
        // Enviar audio con marca al final
        await this.sendRawMulawToTwilioWithMark(ws, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Saludo extendido enviado con marca ${markId}`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en saludo extendido: ${error.message}`);
      
      // Usar audio de fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback para saludo extendido`);
      
      // Enviar fallback con marca para detectar cuando termina
      const fallbackMarkId = `extended_greeting_fallback_end_${Date.now()}`;
      logger.info(`🚀 [${streamSid}] Enviando fallback del saludo extendido con marca: ${fallbackMarkId}`);
      
      // Registrar que esperamos esta marca para activar transcripción
      this.pendingMarks.set(fallbackMarkId, {
        streamSid: streamSid,
        action: 'activate_transcription',
        timestamp: Date.now()
      });
      
      // Enviar audio fallback con marca al final
      await this.sendRawMulawToTwilioWithMark(ws, this.fallbackAudio, streamSid, fallbackMarkId);
      logger.info(`✅ [${streamSid}] Fallback del saludo extendido enviado con marca ${fallbackMarkId}`);
    }
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
    // Implementación simple de audio de fallback
    const buffer = Buffer.alloc(160, 0xff); // Silencio digital
    return buffer;
  }

  /**
   * Inicializar sistema de detección de habla para un stream
   */
  initializeSpeechDetection(streamSid) {
    logger.info(`🎤 [${streamSid}] Inicializando detección de voz...`);
    
    const config = {
      isActive: false,
      silenceCount: 0,
      speechCount: 0,
      lastActivity: Date.now(),
      energyThreshold: 15,
      adaptiveThreshold: 15,
      maxSilenceDuration: 4,
      minSpeechDuration: 2,
      hangoverDuration: 500,
      hangoverTimer: 0,
      echoBlanking: false,
      echoBlankingUntil: 0,
      echoBlankingDuration: 500,
      energyHistory: []
    };
    
    this.speechDetection.set(streamSid, config);
    
    // Verificar que se guardó correctamente
    const verification = this.speechDetection.get(streamSid);
    if (verification) {
      logger.info(`✅ [${streamSid}] Speech detection initialized successfully`);
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
    logger.info(`🔍 [${streamSid}] INICIANDO deactivateEchoBlanking()`);
    
    const echoBlanking = this.echoBlanking.get(streamSid);
    
    if (!echoBlanking) {
      logger.error(`❌ [${streamSid}] NO HAY echoBlanking en el mapa`);
      return;
    }
    
    logger.info(`🔍 [${streamSid}] echoBlanking.active = ${echoBlanking.active}`);
    
    if (echoBlanking.active) {
      logger.info(`🔍 [${streamSid}] Desactivando echo blanking...`);
      echoBlanking.active = false;
      echoBlanking.endTime = 0;
      logger.info(`🔇 [${streamSid}] Echo Blanking DESACTIVADO`);
      
      // Activar transcripción automáticamente cuando se desactiva echo blanking
      const streamData = this.activeStreams.get(streamSid);
      
      if (streamData && !this.transcriptionActive.get(streamSid)) {
        logger.info(`🔍 [${streamSid}] ACTIVANDO TRANSCRIPCIÓN...`);
        this.transcriptionActive.set(streamSid, true);
        streamData.state = 'listening';
        streamData.botSpeaking = false;
        streamData.greetingCompletedAt = Date.now();
        
        // Verificar que se activó correctamente
        const newTranscriptionState = this.transcriptionActive.get(streamSid);
        logger.info(`🚀 [${streamSid}] Transcripción activada! Nuevo estado: ${newTranscriptionState}`);
      } else {
        logger.warn(`⚠️ [${streamSid}] NO se activó transcripción:`);
        logger.warn(`⚠️ [${streamSid}] - streamData existe: ${!!streamData}`);
        logger.warn(`⚠️ [${streamSid}] - transcripción ya activa: ${this.transcriptionActive.get(streamSid)}`);
      }
    } else {
      logger.warn(`⚠️ [${streamSid}] Echo blanking NO estaba activo o no existe`);
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

    // ✅ VERIFICACIÓN ROBUSTA DE ESTADO DE TRANSCRIPCIÓN
    const isTranscriptionActive = this.transcriptionActive && this.transcriptionActive.get(streamSid) === true;
    
    if (!isTranscriptionActive) {
      logger.warn(`🚫 [${streamSid}] Transcripción inactiva - estado: ${this.transcriptionActive?.get(streamSid)}`);
      logger.debug(`🔍 [${streamSid}] - echoBlanking: ${this.echoBlanking.get(streamSid)?.active}`);
      logger.debug(`🔍 [${streamSid}] - streamData state: ${streamData?.state}`);
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
      
      // Normalizar audio
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
      audioBuffer.push(normalizedAudio);
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
   * Procesar audio acumulado cuando se detecta fin de turno
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
      
      // LLAMADA REAL A TRANSCRIPCIÓN
      const transcriptionResult = await this.transcriptionService.transcribeAudio(combinedBuffer);
      
      if (!transcriptionResult || !transcriptionResult.text || transcriptionResult.text.trim().length === 0) {
        logger.warn(`🚫 [${streamSid}] Transcripción vacía o inválida - ignorando`);
        return;
      }
      
      logger.info(`📝 [${streamSid}] Transcripción exitosa: "${transcriptionResult.text}"`);          
      
      // CRÍTICO: Actualizar actividad del usuario
      streamData.state = 'processing';
      streamData.lastUserInput = transcriptionResult.text;
      streamData.lastTranscription = transcriptionResult.text;
      
      // Generar respuesta conversacional
      await this.generateAndSendResponse(ws, streamSid, transcriptionResult.text, streamData.client);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando audio: ${error.message}`);
    }
  }

  /**
   * Generar respuesta conversacional y enviar como audio
   */
  async generateAndSendResponse(ws, streamSid, transcribedText, clientConfig) {
    // ✅ VERIFICACIÓN CRÍTICA DE OPENAI SERVICE
    if (!this.openaiService) {
      logger.error(`❌ [${streamSid}] OpenAIService (chat) no está disponible`);
      
      // Respuesta de fallback directa sin OpenAI
      const fallbackText = "Gracias por su llamada. En este momento nuestro sistema de respuestas está temporalmente no disponible. Por favor, intente nuevamente en unos momentos o contacte con nosotros por otro medio.";
      await this.sendResponseAsAudio(ws, streamSid, fallbackText, clientConfig);
      return;
    }

    // ✅ Verificar que el método existe
    if (typeof this.openaiService.generateReceptionistResponse !== 'function') {
      logger.error(`❌ [${streamSid}] Método generateReceptionistResponse no existe en openaiService`);
      
      const fallbackText = "Disculpe, estamos teniendo dificultades técnicas. ¿Podría llamar más tarde?";
      await this.sendResponseAsAudio(ws, streamSid, fallbackText, clientConfig);
      return;
    }

    logger.info(`🤖 [${streamSid}] OpenAIService disponible, generando respuesta para: "${transcribedText}"`);
    
    try {
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
        streamData.state = 'processing';
      }
      
      // Obtener contexto de conversación
      const conversationContext = this.conversationState.get(streamSid) || { previousMessages: [], structuredHistory: [] };
      logger.info(`💭 [${streamSid}] Contexto conversación: ${conversationContext.structuredHistory?.length || 0} mensajes estructurados previos`);
      
      // Generar respuesta con OpenAI
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
      
      // Actualizar contexto conversacional
      conversationContext.structuredHistory = conversationContext.structuredHistory || [];
      conversationContext.structuredHistory.push(
        { role: 'user', content: transcribedText },
        { role: 'assistant', content: responseText }
      );
      
      // Mantener solo los últimos 6 mensajes (3 intercambios) para mayor velocidad
      if (conversationContext.structuredHistory.length > 6) {
        conversationContext.structuredHistory = conversationContext.structuredHistory.slice(-6);
      }
      
      this.conversationState.set(streamSid, conversationContext);
      
      // Convertir respuesta a audio y enviar
      await this.sendResponseAsAudio(ws, streamSid, responseText, clientConfig);
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error crítico en generación de respuesta: ${error.message}`);
      logger.error(`❌ [${streamSid}] Stack trace generación:`, error.stack);
      
      // Limpiar estado en caso de error
      this.responseInProgress.delete(streamSid);
      
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
      const humanizedText = this.humanizeTextWithSSML(responseText, 'chat');
      logger.info(`🎭 [${streamSid}] Texto humanizado: "${humanizedText.substring(0, 100)}..."`);
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.state = 'speaking';
        streamData.botSpeaking = true;
      }
      
      const ttsResult = await this.ttsService.generateSpeech(
        humanizedText,
        voiceId,
        'raw-8khz-8bit-mono-mulaw'
      );
      
      if (ttsResult.success && ttsResult.audioBuffer) {
        logger.info(`🔊 Tamaño del buffer de audio: ${ttsResult.audioBuffer.length} bytes`);
        
        // Activar echo blanking durante la reproducción
        this.activateEchoBlanking(streamSid);
        
        // Enviar audio con marca para detectar cuando termina
        const markId = `response_end_${Date.now()}`;
        logger.info(`🚀 [${streamSid}] Enviando respuesta con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para desactivar echo blanking
        this.pendingMarks.set(markId, {
          streamSid: streamSid,
          action: 'deactivate_echo_blanking',
          timestamp: Date.now()
        });
        
        // Enviar audio con marca al final
        await this.sendRawMulawToTwilioWithMark(ws, ttsResult.audioBuffer, streamSid, markId);
        logger.info(`✅ [${streamSid}] Audio de respuesta enviado con marca ${markId}`);
        
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
          // Activar echo blanking durante la reproducción del fallback
          this.activateEchoBlanking(streamSid);
          
          // Enviar audio fallback con marca para detectar cuando termina
          const fallbackMarkId = `fallback_end_${Date.now()}`;
          logger.info(`🚀 [${streamSid}] Enviando fallback con marca: ${fallbackMarkId}`);
          
          // Registrar que esperamos esta marca para desactivar echo blanking
          this.pendingMarks.set(fallbackMarkId, {
            streamSid: streamSid,
            action: 'deactivate_echo_blanking',
            timestamp: Date.now()
          });
          
          // Enviar audio fallback con marca al final
          await this.sendRawMulawToTwilioWithMark(ws, fallbackResult.audioBuffer, streamSid, fallbackMarkId);
          logger.info(`✅ [${streamSid}] Audio fallback enviado con marca ${fallbackMarkId}`);
        }
      }
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendResponseAsAudio: ${error.message}`);
      logger.error(`❌ [${streamSid}] Stack trace sendResponseAsAudio:`, error.stack);
      
      // Asegurar que se reactive la escucha en caso de error
      this.responseInProgress.delete(streamSid);
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
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendFallbackResponse: ${error.message}`);
      
      // Último recurso: limpiar estado
      this.responseInProgress.delete(streamSid);
    }
  }

  /**
   * Stop transcription - Detener escucha y procesar
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
   * Calcular duración de silencio para detección de fin de turno
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
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    // Mapear días de la semana
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[currentDay];

    // Detectar formato de configuración
    if (businessHours.workingDays && Array.isArray(businessHours.workingDays)) {
      // Formato nuevo
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
      // Formato antiguo
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
    
    logger.info(`✅ [${streamSid}] Recursos del stream limpiados correctamente`);
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
      const amplitude = Math.abs(sample - 127);
      totalAmplitude += amplitude;
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      
      if (amplitude < 5) {
        silentSamples++;
      }
      if (sample !== 0xFF && sample !== 0x7F) {
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