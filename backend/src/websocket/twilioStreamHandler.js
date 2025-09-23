const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('../services/azureTTSRestService');
const OpenAIService = require('../services/openaiService');
const RealtimeTranscription = require('../services/realtimeTranscription');
const fs = require('fs');

class TwilioStreamHandler {
  constructor(prisma, ttsService) {
    this.prisma = prisma;
    this.ttsService = ttsService;
    this.activeStreams = new Map();
    this.audioBuffers = new Map();
    this.conversationState = new Map();
    this.outboundAudioQueue = new Map();
    this.ttsInProgress = new Map();
    this.preConvertedAudio = new Map(); // Cache de conversiones
    this.responseInProgress = new Map(); // Prevenir respuestas concurrentes
    this.lastResponseTime = new Map(); // Control de tiempo entre respuestas
    this.azureToken = null; // Token reutilizable
    this.validateAzureConfig(); // Validación crítica al iniciar

    // Inicializar servicios de IA
    this.openaiService = new OpenAIService();
    this.transcriptionService = new RealtimeTranscription();

    // Sistema avanzado de detección de habla
    this.speechDetection = new Map(); // Estado de detección por stream
    
    // Buffer temporal para eventos media durante configuración inicial
    this.pendingMediaEvents = new Map(); // Buffer de eventos media por stream

    // Voice mapping from user-friendly names to Azure TTS voice identifiers
    // Voz única para todos los usuarios: Isidora Multilingüe (soporte SSML completo)
    this.defaultVoice = 'es-ES-IsidoraMultilingualNeural';
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
      botSpeaking: false,
      conversationTurn: 'greeting', // Iniciar con saludo
      lastUserInput: null
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
          botConfig: true,
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

      // Actualizar stream con configuración
      const tempId = ws.tempStreamId;
      const streamData = this.activeStreams.get(tempId);
      
      if (!streamData) {
        logger.error(`❌ [${streamSid}] No se encontró stream temporal: ${tempId}`);
        return;
      }
      
      // Migrar de ID temporal a streamSid real
      streamData.streamSid = streamSid;
      streamData.client = clientConfig;
      streamData.isInitializing = false;
      
      // Actualizar en el Map con la clave real
      this.activeStreams.delete(tempId);
      this.activeStreams.set(streamSid, streamData);

      logger.info(`🎯 [${streamSid}] Stream configurado - Estado inicial: ${streamData.conversationTurn}, esperando transición a listening`);
      
      logger.info(`✅ [${streamSid}] Cliente configurado: ${clientConfig.companyName}`);
      logger.info(`🔄 [${streamSid}] Migrado desde ID temporal: ${tempId}`);
      
      // VERIFICACIÓN ESTRICTA: Solo generar saludo UNA VEZ
      if (streamData.greetingSent) {
        logger.warn(`⚠️ [${streamSid}] DUPLICADO DETECTADO - Saludo ya enviado, OMITIENDO`);
        return;
      }
      
      // Marcar ANTES de generar para evitar condiciones de carrera
      streamData.greetingSent = true;
      streamData.conversationTurn = 'speaking';
      
      try {
        logger.info(`🔊 [${streamSid}] Generando ÚNICO saludo...`);
        await this.sendInitialGreeting(ws, { streamSid, callSid });
        logger.info(`✅ [${streamSid}] Saludo único enviado correctamente`);
        
        // CRÍTICO: Implementar sistema robusto de transición de estado
        // El setTimeout falla en producción Render, usar múltiples mecanismos
        logger.info(`⏰ [${streamSid}] Implementando transición robusta speaking → listening...`);
        
        // Almacenar timestamp para verificación
        const streamData = this.activeStreams.get(streamSid);
        streamData.greetingCompletedAt = Date.now();
        streamData.transitionScheduled = true;
        
        // Mecanismo 1: setTimeout tradicional
        const timeoutId = setTimeout(() => {
          logger.info(`⏰ [${streamSid}] TIMEOUT EJECUTÁNDOSE - verificando stream activo...`);
          this.activateListeningMode(streamSid, ws, 'setTimeout');
        }, 3000);
        
        // Mecanismo 2: setImmediate + Promise para evitar bloqueo del event loop
        setImmediate(() => {
          setTimeout(() => {
            logger.info(`⏰ [${streamSid}] BACKUP TIMEOUT ejecutándose...`);
            this.activateListeningMode(streamSid, ws, 'setImmediate+setTimeout');
          }, 3500); // 500ms después del timeout principal
        });
        
        // Mecanismo 3: Verificación en próximo evento media (fallback)
        streamData.needsTransitionCheck = true;
        
        logger.info(`⏰ [${streamSid}] Timeout programado con ID: ${timeoutId} + mecanismos de respaldo`)
        
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error en saludo: ${error.message}`);
        // Resetear flag si falla para permitir reintento
        streamData.greetingSent = false;
        streamData.conversationTurn = 'waiting';
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
                      'ximena';
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
      
      // 4. Generar audio con Azure TTS usando SSML humanizado
      const ttsResult = await this.ttsService.generateSpeech(
        humanizedGreeting,
        voiceId,
        'raw-8khz-8bit-mono-mulaw'
      );
      
      // ECHO BLANKING: Activar blanking antes de enviar audio del bot
      this.activateEchoBlanking(streamSid);

      if (ttsResult.success) {
        // Save audio to file
        const fileName = `debug_${Date.now()}_${streamSid}.wav`;
        fs.writeFileSync(fileName, ttsResult.audioBuffer);
        logger.info(`🔧 [${streamSid}] Audio guardado en ${fileName}`);
        
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error TTS: ${error.message}`);
      
      // 4. Usar fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback`);
      await this.sendAudioToTwilio(ws, this.fallbackAudio, streamSid);
    }
  }

  async sendExtendedGreeting(ws, streamSid, clientConfigData) {
    const fallbackGreeting = "Gracias por llamar. Estamos conectándote con un asistente. Por favor, espera un momento.";
    
    // Get voice configuration and map to valid Azure voice
    const rawVoiceId = clientConfigData.callConfig?.voiceId || 
                      'ximena';
    const language = clientConfigData.callConfig?.language || 
                    'es-ES';
    
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback`);
    logger.info(`🎵 [${streamSid}] Raw voice: "${rawVoiceId}" → Mapped: "${this.mapVoiceToAzure(rawVoiceId, language)}"`);
  
    logger.info(`🔊 [${streamSid}] Generando saludo extendido de fallback con voz: ${this.mapVoiceToAzure(rawVoiceId, language)}`);
  
    // Humanizar el saludo de fallback con SSML
    const humanizedFallback = this.humanizeTextWithSSML(fallbackGreeting);
    
    const ttsResult = await this.ttsService.generateSpeech(
      humanizedFallback,
      this.mapVoiceToAzure(rawVoiceId, language),
      'raw-8khz-8bit-mono-mulaw'
    );
    
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
      
      // Intentar esperar hasta 500ms por reconexión
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
    this.speechDetection.set(streamSid, {
      isActive: false,
      silenceCount: 0,
      speechCount: 0,
      lastActivity: Date.now(),
      energyHistory: [],
      minSpeechDuration: 3, // chunks mínimos para considerar habla (60ms) - MÁS SENSIBLE
      maxSilenceDuration: 4, // chunks máximos de silencio antes de procesar (80ms) - ULTRA RÁPIDO
      energyThreshold: 5, // umbral de energía para detectar habla - MÁS BAJO
      adaptiveThreshold: 5, // umbral adaptativo basado en historial - MÁS BAJO
      
      // MEJORES PRÁCTICAS: Echo Blanking + Hangover Timer
      echoBlanking: false, // true cuando el bot está hablando o acabó de hablar
      echoBlankingUntil: 0, // timestamp hasta cuando ignorar VAD por eco
      hangoverTimer: 0, // timestamp hasta cuando mantener isActive después de último speech
      hangoverDuration: 300, // ms para mantener activo después de speech (300ms)
      echoBlankingDuration: 500 // ms para ignorar VAD después de TTS (500ms)
    });
  }

  /**
   * Activar Echo Blanking cuando el bot va a hablar
   */
  activateEchoBlanking(streamSid) {
    const detection = this.speechDetection.get(streamSid);
    if (detection) {
      const now = Date.now();
      detection.echoBlanking = true;
      detection.echoBlankingUntil = now + detection.echoBlankingDuration;
      logger.info(`🔇 [${streamSid}] Echo Blanking ACTIVADO por ${detection.echoBlankingDuration}ms`);
    }
  }

  /**
   * Verificar si Echo Blanking está activo
   */
  isEchoBlankingActive(streamSid) {
    const detection = this.speechDetection.get(streamSid);
    if (!detection) return false;
    
    const now = Date.now();
    if (detection.echoBlanking && now > detection.echoBlankingUntil) {
      detection.echoBlanking = false;
      logger.info(`🔊 [${streamSid}] Echo Blanking DESACTIVADO`);
    }
    
    return detection.echoBlanking;
  }

  /**
   * Detectar actividad de voz en tiempo real usando VAD (Voice Activity Detection)
   */
  detectVoiceActivity(audioChunk, streamSid) {
    try {
      const detection = this.speechDetection.get(streamSid);
      if (!detection) {
        logger.error(`🚨 [${streamSid}] No detection config found`);
        return { shouldProcess: false, reason: 'no_detection_config' };
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

    // Calcular energía del chunk actual
    const samples = new Uint8Array(audioChunk);
    let energy = 0;
    let maxAmplitude = 0;
    let sampleSum = 0;
    let zeroSamples = 0;
    let silentSamples = 0;
    
    // Análisis detallado de muestras para diagnóstico
    const sampleAnalysis = [];
    for (let i = 0; i < Math.min(10, samples.length); i++) {
      sampleAnalysis.push(samples[i]);
    }
    
    for (const sample of samples) {
      // CORRECCIÓN CRÍTICA: En mu-law, silence = 0xFF (255), no 127
      // Detectar muestras de silencio real primero
      if (sample === 0xFF) {
        // Silencio real en mu-law - energía = 0
        silentSamples++;
        sampleSum += sample;
        continue;
      }
      
      // Para muestras no-silenciosas, usar conversión mu-law estándar
      const amplitude = Math.abs(sample - 127); // Solo para muestras con audio real
      energy += amplitude * amplitude; // energía cuadrática
      maxAmplitude = Math.max(maxAmplitude, amplitude);
      sampleSum += sample;
      
      if (sample === 0x7F) zeroSamples++;
      if (amplitude < 5) silentSamples++;
    }
    
    // CORRECCIÓN CRÍTICA: Calcular energía solo sobre muestras no-silenciosas
    const nonSilentSamples = samples.length - silentSamples;
    if (nonSilentSamples > 0) {
      energy = Math.sqrt(energy / nonSilentSamples); // RMS energy solo de audio real
    } else {
      energy = 0; // Todo silencio = energía 0
    }
    const avgSample = sampleSum / samples.length;
    const silenceRatio = silentSamples / samples.length;
    
    // LOG CRÍTICO: Análisis detallado de muestras
    logger.info(`🔬 [${streamSid}] ANÁLISIS AUDIO: energy=${energy.toFixed(1)}, maxAmp=${maxAmplitude}, avgSample=${avgSample.toFixed(1)}, silenceRatio=${(silenceRatio*100).toFixed(1)}%, primeras10=${sampleAnalysis.join(',')}`)
    
    // Mantener historial de energía para umbral adaptativo
    detection.energyHistory.push(energy);
    if (detection.energyHistory.length > 50) { // mantener últimos 50 chunks (1 segundo)
      detection.energyHistory.shift();
    }
    
    // Calcular umbral adaptativo basado en promedio del ruido de fondo
    const avgEnergy = detection.energyHistory.reduce((a, b) => a + b, 0) / detection.energyHistory.length;
  
    // Si la energía actual es muy baja, reducir umbral inmediatamente
    if (energy < 10) {
      detection.adaptiveThreshold = Math.max(3, energy * 1.5); // Umbral muy bajo para silencio
      logger.info(`🔧 [${streamSid}] UMBRAL INMEDIATO: energy=${energy.toFixed(1)} < 10 → threshold=${detection.adaptiveThreshold.toFixed(1)}`);
    } else {
      detection.adaptiveThreshold = Math.max(5, avgEnergy * 0.8); // Umbral normal
      logger.info(`🔧 [${streamSid}] UMBRAL NORMAL: energy=${energy.toFixed(1)} ≥ 10 → threshold=${detection.adaptiveThreshold.toFixed(1)}`);
    }
  
    // Detectar si hay actividad de voz - UMBRAL MÁS BAJO
    const isSpeech = energy > detection.adaptiveThreshold && maxAmplitude > 2;
    
    // LOG CRÍTICO: Mostrar decisión de speech detection
    logger.info(`🎯 [${streamSid}] SPEECH DECISION: energy=${energy.toFixed(1)} > threshold=${detection.adaptiveThreshold.toFixed(1)}? ${energy > detection.adaptiveThreshold}, maxAmp=${maxAmplitude} > 2? ${maxAmplitude > 2}, isSpeech=${isSpeech}`);
    
    if (isSpeech) {
      detection.speechCount++;
      detection.silenceCount = 0;
      detection.lastActivity = now;
      
      // HANGOVER TIMER: Establecer timer para mantener activo después de speech
      detection.hangoverTimer = now + detection.hangoverDuration;
      
      // LOG CRÍTICO: Mostrar progreso hacia activación
      logger.info(`🔢 [${streamSid}] SPEECH COUNT: ${detection.speechCount}/${detection.minSpeechDuration}, isActive=${detection.isActive}`);
      
      if (!detection.isActive && detection.speechCount >= detection.minSpeechDuration) {
        detection.isActive = true;
        logger.info(`🎙️ [${streamSid}] Inicio de habla detectado (energía: ${energy.toFixed(1)}, umbral: ${detection.adaptiveThreshold.toFixed(1)})`);
      }
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
    
    // Detectar final de habla (lógica original + forzado)
    const shouldProcess = (detection.isActive && 
                          detection.silenceCount >= detection.maxSilenceDuration &&
                          timeActive > 200) || forceProcess; // mínimo 200ms de silencio O forzado
    
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

    // MECANISMO 3: Verificación fallback para transición forzada
    if (streamData.needsTransitionCheck && streamData.greetingCompletedAt) {
      const timeSinceGreeting = Date.now() - streamData.greetingCompletedAt;
      if (timeSinceGreeting > 4000) { // 4 segundos de gracia
        logger.warn(`⚠️ [${streamSid}] TIMEOUT FALLIDO - Forzando transición después de ${timeSinceGreeting}ms`);
        this.activateListeningMode(streamSid, ws, 'fallback-media-event');
      }
    }
    
    // DIAGNÓSTICO CRÍTICO: Mostrar estado actual SIEMPRE
    logger.info(`🔍 [${streamSid}] ESTADO ACTUAL: conversationTurn="${streamData.conversationTurn}", botSpeaking=${streamData.botSpeaking}, greetingSent=${streamData.greetingSent}`);
    
    // Verificar estado de conversación - solo procesar si estamos escuchando
    if (streamData.conversationTurn !== 'listening') {
      logger.warn(`🚫 [${streamSid}] BLOQUEADO por conversationTurn: "${streamData.conversationTurn}" !== "listening" - ignorando audio del usuario`);
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
      const audioChunk = Buffer.from(payload, 'base64');
      
      // Detectar actividad de voz usando VAD avanzado
      const vadResult = this.detectVoiceActivity(audioChunk, streamSid);
      
      // DEBUG CRÍTICO: Logs detallados del VAD
      logger.info(`🎤 [${streamSid}] VAD Result: shouldProcess=${vadResult.shouldProcess}, isActive=${vadResult.isActive}, energy=${vadResult.energy}, threshold=${vadResult.threshold}`);
      
      // Acumular chunks de audio en buffer solo si hay actividad o estamos en una sesión activa
      let audioBuffer = this.audioBuffers.get(streamSid) || [];
      
      if (vadResult.isActive || vadResult.shouldProcess) {
        audioBuffer.push(audioChunk);
        this.audioBuffers.set(streamSid, audioBuffer);
        logger.info(`🎤 [${streamSid}] Audio acumulado: ${audioBuffer.length} chunks`);
      }
      
      logger.debug(`🎤 [${streamSid}] Audio chunk: energía=${vadResult.energy}, umbral=${vadResult.threshold}, activo=${vadResult.isActive}, buffer=${audioBuffer.length} chunks`);
      
      // Procesar transcripción cuando VAD detecte final de habla
      if (vadResult.shouldProcess && audioBuffer.length > 0) {
        const combinedBuffer = Buffer.concat(audioBuffer);
        this.audioBuffers.set(streamSid, []); // Limpiar buffer
        
        logger.info(`🎙️ [${streamSid}] VAD detectó final de habla (${vadResult.reason}) - procesando ${combinedBuffer.length} bytes de ${audioBuffer.length} chunks`);
        
        // Filtro de duración mínima - evitar procesar audio muy corto
        if (audioBuffer.length < 6) { // menos de 120ms
          logger.debug(`🚫 [${streamSid}] Audio muy corto (${audioBuffer.length} chunks) - ignorando`);
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
          
          // Marcar transcripción en progreso para bloquear otras
          this.responseInProgress.set(streamSid, true);
          logger.info(`🔒 [${streamSid}] Transcripción iniciada - bloqueando otras transcripciones`);
          
          // Transcribir audio con servicio optimizado y manejo robusto de errores
          try {
            const transcriptionResult = await this.transcriptionService.transcribeAudioBuffer(
              combinedBuffer,
              streamData.client.callConfig?.language || 'es'
            );
            
            if (transcriptionResult.success && transcriptionResult.text && transcriptionResult.text.trim().length > 0) {
              const currentText = transcriptionResult.text.trim();
              
              // Filtrar repeticiones exactas
              if (streamData.lastTranscription === currentText) {
                logger.warn(`🔁 [${streamSid}] Transcripción repetida ignorada: "${currentText}"`);
                return;
              }
              
              // Filtrar ecos del bot (frases específicas que el bot suele decir)
              const botPhrases = [
                'hola', 'gracias por llamar', 'en qué puedo ayudarte', 'un momento por favor',
                'te ayudo', 'dime', 'cuéntame', 'perfecto', 'entiendo', 'claro',
                'disculpa', 'lo siento', 'problemas técnicos', 'repetir tu consulta'
              ];
              
              const containsSpecificBotPhrase = botPhrases.some(phrase => 
                currentText.toLowerCase().includes(phrase.toLowerCase())
              );
              
              if (containsSpecificBotPhrase) {
                logger.warn(`🔊 [${streamSid}] Eco específico del bot detectado - ignorando: "${transcriptionResult.text}"`);
                return;
              }
              
              // DEBUG: Log para confirmar que transcripciones válidas pasan el filtro
              logger.info(`✅ [${streamSid}] Transcripción válida pasó filtros: "${transcriptionResult.text}"`);
              
              // Filtrar transcripciones muy cortas que probablemente sean ruido
              if (transcriptionResult.text.trim().length < 3) {
                logger.debug(`🔇 [${streamSid}] Transcripción muy corta ignorada: "${transcriptionResult.text}"`);
                return;
              }
              
              // Verificar que no hay respuesta en progreso
              if (this.responseInProgress.get(streamSid)) {
                logger.warn(`⚠️ [${streamSid}] Respuesta ya en progreso - ignorando nueva transcripción`);
                return;
              }
              
              // Control de tiempo mínimo entre respuestas (anti-spam)
              const lastResponse = this.lastResponseTime.get(streamSid) || 0;
              const timeSinceLastResponse = Date.now() - lastResponse;
              if (timeSinceLastResponse < 3000) { // Mínimo 3 segundos entre respuestas
                logger.warn(`⏰ [${streamSid}] Muy pronto para nueva respuesta (${timeSinceLastResponse}ms) - ignorando`);
                return;
              }
              
              logger.info(`📝 [${streamSid}] Transcripción exitosa: "${transcriptionResult.text}"`);          
              logger.info(`🔍 [DEBUG] Llamando a generateAndSendResponse con transcripción: "${transcriptionResult.text}"`);
              
              // Cambiar estado a procesando
              streamData.conversationTurn = 'processing';
              streamData.lastUserInput = transcriptionResult.text;
              
              // Guardar última transcripción
              streamData.lastTranscription = currentText;
              
              // Generar respuesta conversacional
              await this.generateAndSendResponse(ws, streamSid, transcriptionResult.text, streamData.client);
            } else {
              // Transcripción falló pero no es un error crítico - solo log debug
              logger.debug(`🔇 [${streamSid}] Sin transcripción válida: ${transcriptionResult.error || 'silencio detectado'}`);
              
              // CRÍTICO: Liberar bloqueo si transcripción vacía
              this.responseInProgress.delete(streamSid);
              logger.info(`🔓 [${streamSid}] Bloqueo liberado - transcripción vacía`);
              
              // Si hay múltiples fallos consecutivos, enviar mensaje de ayuda
              streamData.transcriptionFailCount = (streamData.transcriptionFailCount || 0) + 1;
              if (streamData.transcriptionFailCount >= 3) {
                logger.warn(`⚠️ [${streamSid}] Múltiples fallos de transcripción (${streamData.transcriptionFailCount}) - enviando mensaje de ayuda`);
                // Reactivar bloqueo para mensaje de ayuda
                this.responseInProgress.set(streamSid, true);
                await this.sendTranscriptionHelpResponse(ws, streamSid, streamData.client);
                streamData.transcriptionFailCount = 0; // Reset counter
              }
            }
          } catch (transcriptionError) {
            logger.error(`❌ [${streamSid}] Error crítico en transcripción: ${transcriptionError.message}`);
            logger.error(`❌ [${streamSid}] Stack trace transcripción:`, transcriptionError.stack);
            
            // CRÍTICO: Liberar bloqueo en caso de error
            this.responseInProgress.delete(streamSid);
            logger.info(`🔓 [${streamSid}] Bloqueo liberado - error en transcripción`);
            
            // Incrementar contador de errores críticos
            streamData.criticalTranscriptionErrors = (streamData.criticalTranscriptionErrors || 0) + 1;
            
            // Si hay demasiados errores críticos, usar fallback más agresivo
            if (streamData.criticalTranscriptionErrors >= 2) {
              logger.error(`🚨 [${streamSid}] Múltiples errores críticos de transcripción - usando fallback agresivo`);
              // Reactivar bloqueo para respuesta de error
              this.responseInProgress.set(streamSid, true);
              await this.sendCriticalTranscriptionErrorResponse(ws, streamSid, streamData.client);
              streamData.criticalTranscriptionErrors = 0; // Reset
            } else {
              // Primer error crítico - mensaje estándar
              this.responseInProgress.set(streamSid, true);
              await this.sendTranscriptionErrorResponse(ws, streamSid, streamData.client);
            }
          }
        } catch (error) {
          logger.error(`❌ [${streamSid}] Error procesando audio: ${error.message}`);
        }
      }
      
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
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
      }
      
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
      const rawVoiceId = clientConfig.callConfig?.voiceId || 'ximena';
      const language = clientConfig.callConfig?.language || 'es-ES';
      const voiceId = this.mapVoiceToAzure(rawVoiceId, language);
      
      logger.info(`🎵 Using Isidora Multilingual voice for all users: ${voiceId}`);
      
      // Humanizar texto con SSML
      const humanizedText = this.humanizeTextWithSSML(responseText);
      logger.info(`🎭 SSML humanizado aplicado: ${humanizedText.substring(0, 100)}...`);
      
      // Generar audio con Azure TTS
      logger.info(`🎵 Usando formato mulaw directo para Twilio: raw-8khz-8bit-mono-mulaw`);
      const ttsResult = await this.ttsService.generateSpeech(
        humanizedText,
        voiceId,
        'raw-8khz-8bit-mono-mulaw'
      );
      
      // ECHO BLANKING: Activar blanking antes de enviar audio del bot
      this.activateEchoBlanking(streamSid);
      
      if (ttsResult.success && ttsResult.audioBuffer) {
        logger.info(`🔊 Tamaño del buffer de audio: ${ttsResult.audioBuffer.length} bytes`);
        logger.info(`🔊 Primeros bytes: ${ttsResult.audioBuffer.subarray(0, 16).toString('hex')}`);
        
        // Enviar audio a Twilio
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        
        logger.info(`✅ [${streamSid}] Audio enviado exitosamente`);
        
        // Calcular duración aproximada del audio y agregar buffer
        const estimatedDuration = Math.max(3000, (ttsResult.audioBuffer.length / 8) + 2000); // ~1ms por byte + 2s buffer
        
        // Marcar que el bot terminó de hablar después de la duración estimada
        setTimeout(() => {
          const streamData = this.activeStreams.get(streamSid);
          if (streamData) {
            streamData.botSpeaking = false;
            streamData.conversationTurn = 'listening';
            logger.info(`🔇 [${streamSid}] Bot terminó de hablar (${estimatedDuration}ms) - reactivando escucha del usuario`);
          }
          // Limpiar estado de respuesta en progreso
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
        
        // ECHO BLANKING: Activar blanking antes de enviar audio del bot
        this.activateEchoBlanking(streamSid);
        
        if (fallbackResult.success) {
          await this.sendRawMulawToTwilio(ws, fallbackResult.audioBuffer, streamSid);
          
          // Calcular duración aproximada del audio fallback
          const fallbackDuration = Math.max(3000, (fallbackResult.audioBuffer.length / 8) + 2000);
          
          // Marcar que el bot terminó de hablar - CALCULADO
          setTimeout(() => {
            const streamData = this.activeStreams.get(streamSid);
            if (streamData) {
              streamData.botSpeaking = false;
              streamData.conversationTurn = 'listening';
              logger.info(`🔇 [${streamSid}] Bot terminó de hablar (fallback ${fallbackDuration}ms) - reactivando escucha del usuario`);
            }
            // Limpiar estado de respuesta en progreso
            this.responseInProgress.delete(streamSid);
          }, fallbackDuration);
        }
      }
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendResponseAsAudio: ${error.message}`);
      logger.error(`❌ [${streamSid}] Stack trace sendResponseAsAudio:`, error.stack);
      
      // Asegurar que se reactive la escucha en caso de error
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
      }
      // Limpiar estado de respuesta en progreso
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
      
      // Asegurar que el bot vuelve a escuchar después del fallback
      setTimeout(() => {
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.botSpeaking = false;
          streamData.conversationTurn = 'listening';
          logger.info(`👂 [${streamSid}] Bot reactivado para escuchar después de fallback OpenAI`);
        }
        this.responseInProgress.delete(streamSid);
      }, 4000); // 4 segundos para que termine de hablar
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendFallbackResponse: ${error.message}`);
      
      // Último recurso: reactivar escucha sin audio
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
      }
      this.responseInProgress.delete(streamSid);
    }
  }

  /**
   * Enviar respuesta específica para errores de transcripción
   */
  async sendTranscriptionErrorResponse(ws, streamSid, clientConfig) {
    try {
      logger.warn(`⚠️ [${streamSid}] Enviando respuesta por error de transcripción`);
      
      const transcriptionErrorText = "Lo siento, no he podido escucharte bien. ¿Podrías repetir lo que necesitas por favor?";
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = true;
        streamData.conversationTurn = 'speaking';
      }
      
      // Enviar mensaje de error como audio
      await this.sendResponseAsAudio(ws, streamSid, transcriptionErrorText, clientConfig);
      
      // CRÍTICO: Reactivar escucha después del mensaje de error
      setTimeout(() => {
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.botSpeaking = false;
          streamData.conversationTurn = 'listening';
          logger.info(`👂 [${streamSid}] Bot reactivado para escuchar después de error de transcripción`);
        }
      }, 5000); // 5 segundos para que termine de hablar el mensaje de error
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendTranscriptionErrorResponse: ${error.message}`);
      
      // Último recurso: reactivar escucha sin audio
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
        logger.info(`👂 [${streamSid}] Bot forzado a escuchar después de error crítico`);
      }
    }
  }

  /**
   * Enviar mensaje de ayuda cuando hay múltiples fallos de transcripción
   */
  async sendTranscriptionHelpResponse(ws, streamSid, clientConfig) {
    try {
      logger.warn(`⚠️ [${streamSid}] Enviando mensaje de ayuda por múltiples fallos de transcripción`);
      
      const helpText = "Parece que tengo dificultades para escucharte. Por favor, habla un poco más fuerte y claro. ¿En qué puedo ayudarte?";
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = true;
        streamData.conversationTurn = 'speaking';
      }
      
      // Enviar mensaje de ayuda como audio
      await this.sendResponseAsAudio(ws, streamSid, helpText, clientConfig);
      
      // Cambiar estado a 'listening' después del saludo con timeout de 8 segundos
        setTimeout(() => {
          const currentStreamData = this.activeStreams.get(streamSid);
          if (currentStreamData && currentStreamData.conversationTurn === 'greeting') {
            currentStreamData.conversationTurn = 'listening';
            logger.info(`🎧 [${streamSid}] ✅ ESTADO CAMBIADO A 'LISTENING' - Bot listo para recibir audio del usuario`);
            logger.info(`🎯 [${streamSid}] DIAGNÓSTICO: Ahora deberían llegar eventos 'media' con audio del usuario`);
          } else if (currentStreamData) {
            logger.warn(`⚠️ [${streamSid}] Estado inesperado en timeout: ${currentStreamData.conversationTurn}`);
          } else {
            logger.error(`❌ [${streamSid}] Stream no encontrado en timeout de listening`);
          }
        }, 8000); // 8 segundos después del saludo
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendTranscriptionHelpResponse: ${error.message}`);
      
      // Último recurso: reactivar escucha
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
      }
    }
  }

  /**
   * Enviar respuesta para errores críticos múltiples de transcripción
   */
  async sendCriticalTranscriptionErrorResponse(ws, streamSid, clientConfig) {
    try {
      logger.error(`🚨 [${streamSid}] Enviando respuesta por errores críticos de transcripción`);
      
      const criticalErrorText = "Estoy teniendo problemas técnicos con el audio. Te voy a transferir con un agente humano que podrá ayudarte mejor.";
      
      // Marcar que el bot va a hablar
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = true;
        streamData.conversationTurn = 'speaking';
      }
      
      // Enviar mensaje crítico como audio
      await this.sendResponseAsAudio(ws, streamSid, criticalErrorText, clientConfig);
      
      // Después del mensaje crítico, mantener el bot en escucha por si se recupera
      setTimeout(() => {
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.botSpeaking = false;
          streamData.conversationTurn = 'listening';
          logger.info(`👂 [${streamSid}] Bot reactivado para escuchar después de error crítico (transferencia sugerida)`);
        }
      }, 7000); // 7 segundos para mensaje de transferencia
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendCriticalTranscriptionErrorResponse: ${error.message}`);
      
      // Último recurso: reactivar escucha
      const streamData = this.activeStreams.get(streamSid);
      if (streamData) {
        streamData.botSpeaking = false;
        streamData.conversationTurn = 'listening';
      }
    }
  }

  /**
   * Stream terminado - limpiar recursos
   */
  async handleStreamStop(ws, data) {
    const streamSid = data.streamSid;
    logger.info(`🛑 [${streamSid}] Stream terminado - limpiando recursos`);
    
    // Limpiar todos los recursos
    this.activeStreams.delete(streamSid);
    this.audioBuffers.delete(streamSid);
    this.conversationState.delete(streamSid);
    this.outboundAudioQueue.delete(streamSid);
    this.ttsInProgress.delete(streamSid);
    this.preConvertedAudio.delete(streamSid);
    this.responseInProgress.delete(streamSid);
    this.lastResponseTime.delete(streamSid);
    this.speechDetection.delete(streamSid);
    this.pendingMediaEvents.delete(streamSid); // Limpiar buffer de eventos pendientes
    
    logger.info(`✅ [${streamSid}] Recursos limpiados`);
  }

  /**
   * Manejar nueva conexión
   */
  handleConnection(ws, req) {
    let ip = 'unknown';
    if (req) {
      ip = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    }
    logger.info(`🔌 Nueva conexión WebSocket desde ${ip}`);
    // Lógica básica de conexión
  }

  /**
   * Activar modo de escucha de forma robusta
   * Múltiples mecanismos para garantizar transición en producción
   */
  activateListeningMode(streamSid, ws, mechanism) {
    if (!this.activeStreams.has(streamSid)) {
      logger.error(`❌ [${streamSid}] TRANSICIÓN FALLIDA (${mechanism}) - Stream no encontrado`);
      return;
    }

    const streamData = this.activeStreams.get(streamSid);
    
    // Verificar si ya está en modo listening (evitar duplicados)
    if (streamData.conversationTurn === 'listening') {
      logger.info(`✅ [${streamSid}] Ya en modo listening (${mechanism}) - ignorando`);
      return;
    }
    
    // Verificar tiempo transcurrido desde el saludo
    const timeSinceGreeting = Date.now() - (streamData.greetingCompletedAt || 0);
    logger.info(`⏰ [${streamSid}] Transición por ${mechanism} después de ${timeSinceGreeting}ms`);
    
    // CRÍTICO: Cambiar estado
    streamData.conversationTurn = 'listening';
    streamData.botSpeaking = false;
    streamData.transitionScheduled = false;
    streamData.needsTransitionCheck = false;
    
    logger.info(`👂 [${streamSid}] MODO LISTENING ACTIVADO por ${mechanism}`);
    
    // Inicializar detección de voz
    this.initializeSpeechDetection(streamSid);
    logger.info(`🎯 [${streamSid}] Speech detection inicializado`);
    
    // Procesar eventos media pendientes
    this.processPendingMediaEvents(ws, streamSid);
    logger.info(`🔄 [${streamSid}] Eventos media pendientes procesados`);
  }

  // Validar variables Azure
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
