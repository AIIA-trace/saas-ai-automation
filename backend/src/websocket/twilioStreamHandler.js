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
    
    // INICIALIZACIÓN FALTANTE - Servicios críticos:
    this.openaiService = new OpenAIService(); // ✅ INICIALIZAR
    this.conversationState = new Map(); // ✅ INICIALIZAR
    this.pendingMarks = new Map(); // ✅ INICIALIZAR - CRÍTICO PARA EVITAR ERRORES

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
    this.speechDetection = new Map();
    this.silenceStartTime = new Map();
    this.lastResponseTime = new Map();
    this.energySamples = new Map(); // Para umbrales adaptativos VAD
    this.audioPreprocessor = new AudioPreprocessor();

    // Configurar transcripción en tiempo real
    this.transcriptionService = new RealtimeTranscription();
    this.fallbackAudio = this.generateFallbackAudio();

    // Voice mapping from user-friendly names to Azure TTS voice identifiers
    // Voz única para todos los usuarios: Isidora Multilingüe (soporte SSML completo)
    this.defaultVoice = 'es-ES-IsidoraMultilingualNeural';
    
    // LOGS DE DIAGNÓSTICO - Verificar inicialización
    logger.info('🔍 DIAGNÓSTICO - Servicios inicializados:');
    logger.info(`🔍 - openaiService: ${!!this.openaiService}`);
    logger.info(`🔍 - conversationState: ${!!this.conversationState}`);
    logger.info(`🔍 - pendingMarks: ${!!this.pendingMarks} (size: ${this.pendingMarks.size})`);
    logger.info(`🔍 - transcriptionActive: ${!!this.transcriptionActive}`);
    logger.info(`🔍 - transcriptionService: ${!!this.transcriptionService}`);
    
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
      case 'mark':
        this.handleMark(data);
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
    
    if (!markName) {
      logger.warn(`⚠️ [${streamSid}] Mensaje mark sin nombre recibido - IGNORANDO`);
      return;
    }
    
    logger.info(`🎯 [${streamSid}] Marca recibida: ${markName}`);
    logger.info(`🔍 [${streamSid}] DEBUG handleMark: markData = ${JSON.stringify(data.mark)}`);
    
    // Verificar si tenemos una acción pendiente para esta marca
    if (!this.pendingMarks) {
      logger.warn(`⚠️ [${streamSid}] pendingMarks no inicializado - IGNORANDO marca ${markName}`);
      logger.error(`🔍 DEBUG: pendingMarks is undefined! Checking constructor initialization.`);
      return;
    }
    
    if (!this.pendingMarks.has(markName)) {
      logger.warn(`⚠️ [${streamSid}] Marca ${markName} no esperada (no está en pendingMarks) - IGNORANDO. pendingMarks entries: ${Array.from(this.pendingMarks.keys()).join(', ')}`);
      return;
    }
    
    const markData = this.pendingMarks.get(markName);
    logger.info(`🚀 [${streamSid}] Ejecutando acción para marca ${markName}: ${markData.action}`);
    logger.info(`🔍 [${streamSid}] DEBUG handleMark: pendingMarks has ${this.pendingMarks.size} entries`);
    
    // Ejecutar la acción correspondiente
    switch (markData.action) {
      case 'activate_transcription':
        logger.info(`🎤 [${streamSid}] ACTIVANDO transcripción tras saludo (marca: ${markName})`);
        // Activar transcripción directamente
        this.transcriptionActive.set(streamSid, true);
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.state = 'listening';
          streamData.greetingCompletedAt = Date.now();
        }
        logger.info(`✅ [${streamSid}] Transcripción activada tras saludo - usuario puede hablar`);
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
        lastActivity: Date.now()
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
        lastActivity: Date.now()
      });
    }

    // VERIFICACIÓN CRÍTICA: Solo enviar saludo si no se ha enviado ya
    const existingStreamData = this.activeStreams.get(streamSid);
    if (existingStreamData?.greetingSent) {
      logger.info(`⚠️ [${streamSid}] Saludo ya enviado (greetingSent=true), omitiendo`);
      return;
    }

    logger.info(`🔍 [${streamSid}] greetingSent status: ${existingStreamData?.greetingSent}`);

    // Inicializar sistemas necesarios
    this.initializeSpeechDetection(streamSid);
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
    this.transcriptionActive.delete(streamSid);
    this.responseInProgress.delete(streamSid);
    this.silenceStartTime.delete(streamSid);
    this.lastResponseTime.delete(streamSid);
    this.speechDetection.delete(streamSid);
    this.echoBlanking.delete(streamSid);
    this.pendingMarks.delete(streamSid);
    if (this.energySamples) {
      this.energySamples.delete(streamSid);
    }
    
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
    
    switch (event) {
      case 'connected':
        await this.handleConnected(ws, data);
        break;
      case 'start':
        await this.handleStart(ws, data);
        break;
      case 'media':
        await this.handleMediaEvent(ws, data);
        break;
      case 'mark':
        await this.handleMark(ws, data);
        break;
    }
  }

  /**
   * Stream conectado - SOLO registrar conexión
   */

  /**
   * Generar saludo inicial - SOLO UNA VEZ POR STREAM
   */
  async sendInitialGreeting(ws, { streamSid, callSid }) {
    logger.info(`🔍 [${streamSid}] INICIANDO sendInitialGreeting`);
    const streamData = this.activeStreams.get(streamSid);
    if (!streamData?.client) {
      logger.error(`❌ [${streamSid}] Sin configuración de cliente`);
      return;
    }

    // Marcar como saludo enviado para evitar duplicados
    streamData.greetingSent = true;
    logger.info(`🔍 [${streamSid}] Marcando saludo como enviado`);

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
      logger.info(`🎭 [${streamSid}] SSML generado: ${humanizedGreeting.substring(0, 100)}...`);
      
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
        
        logger.info(`🔍 [${streamSid}] ANTES de sendRawMulawToTwilio`);
        
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
    }
    logger.info(`🔍 [${streamSid}] FINALIZANDO sendInitialGreeting`);
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
    const buffer = Buffer.alloc(160, 0xff); // Silencio digital
    return buffer;
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
      energyThreshold: 5, // Bajado de 10 a 5 para mayor sensibilidad
      adaptiveThreshold: 5, // Bajado de 10 a 5
      
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
   * Decodificar byte μ-law a valor PCM lineal de 16-bit
   * @param {number} mulawByte - Byte μ-law (0-255)
   * @returns {number} Valor PCM lineal (-32768 a 32767)
   */
  decodeMulaw(mulawByte) {
    // μ-law decoding algorithm
    mulawByte = ~mulawByte & 0xFF; // Invertir bits

    let sign = (mulawByte & 0x80) ? -1 : 1;
    let exponent = (mulawByte >> 4) & 0x07;
    let mantissa = mulawByte & 0x0F;

    let value = mantissa << 4; // Base value

    // Agregar bias basado en exponent
    switch (exponent) {
      case 0: value += 0; break;
      case 1: value += 16; break;
      case 2: value += 32; break;
      case 3: value += 64; break;
      case 4: value += 128; break;
      case 5: value += 256; break;
      case 6: value += 512; break;
      case 7: value += 1024; break;
    }

    // Ajustar para rango completo
    if (exponent > 1) {
      value += 33; // Bias para μ-law
    }

    return sign * value * 4; // Escalar a 16-bit range
  }

  /**
   * Detectar actividad de voz en tiempo real usando VAD (Voice Activity Detection)
   * Ahora con correcta decodificación μ-law
   */
  detectVoiceActivity(audioChunk, streamSid) {
    const mulawBytes = new Uint8Array(audioChunk);

    // 🔧 CRITICAL FIX: Validar datos de entrada
    if (!mulawBytes || mulawBytes.length === 0) {
      logger.warn(`⚠️ [${streamSid}] VAD: Datos μ-law inválidos o vacíos`);
      return { shouldProcess: false, isActive: false, energy: '0.0', threshold: '5.0' };
    }

    let energy = 0;
    let validSamples = 0;

    try {
      // 🔧 CRITICAL FIX: Decodificar μ-law a PCM lineal correctamente
      for (let i = 0; i < mulawBytes.length; i++) {
        const mulawByte = mulawBytes[i];

        // Validar que sea un byte válido (0-255)
        if (typeof mulawByte !== 'number' || mulawByte < 0 || mulawByte > 255) {
          logger.warn(`⚠️ [${streamSid}] VAD: Byte μ-law inválido en posición ${i}: ${mulawByte}`);
          continue;
        }

        // Decodificar μ-law a PCM lineal
        const pcmValue = this.decodeMulaw(mulawByte);

        // Validar resultado de decodificación
        if (isNaN(pcmValue) || !isFinite(pcmValue)) {
          logger.warn(`⚠️ [${streamSid}] VAD: Valor PCM inválido de byte ${mulawByte}: ${pcmValue}`);
          continue;
        }

        // Calcular energía del valor PCM (normalizar a 0-1)
        const normalizedValue = Math.abs(pcmValue) / 32768.0;
        energy += normalizedValue * normalizedValue;
        validSamples++;
      }

      // Calcular energía promedio
      if (validSamples > 0) {
        energy = Math.sqrt(energy / validSamples);
      } else {
        energy = 0;
      }

      // Validar resultado final de energía
      if (isNaN(energy) || !isFinite(energy)) {
        logger.warn(`⚠️ [${streamSid}] VAD: Energía final inválida: ${energy}, usando 0`);
        energy = 0;
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] VAD: Error calculando energía: ${error.message}`);
      energy = 0;
    }

    const detection = this.speechDetection.get(streamSid);

    // 🔍 DEBUG: Verificar estado del detection
    logger.info(`🔍 [${streamSid}] VAD Debug - detection exists: ${!!detection}`);
    if (detection) {
      logger.info(`🔍 [${streamSid}] VAD Debug - adaptiveThreshold: ${detection.adaptiveThreshold}, type: ${typeof detection.adaptiveThreshold}`);
      logger.info(`🔍 [${streamSid}] VAD Debug - energyThreshold: ${detection.energyThreshold}, type: ${typeof detection.energyThreshold}`);
      logger.info(`🔍 [${streamSid}] VAD Debug - valid samples: ${validSamples}/${mulawBytes.length}`);
    }

    if (!detection) {
      logger.error(`❌ [${streamSid}] VAD: No hay configuración speechDetection`);
      return { shouldProcess: false, isActive: false, energy: energy.toFixed(1), threshold: '5.0' };
    }

    // 🔧 CRITICAL FIX: Inicializar adaptiveThreshold si es undefined
    if (typeof detection.adaptiveThreshold !== 'number' || isNaN(detection.adaptiveThreshold)) {
      logger.warn(`⚠️ [${streamSid}] VAD: adaptiveThreshold inválido (${detection.adaptiveThreshold}), inicializando...`);

      if (typeof detection.energyThreshold === 'number' && !isNaN(detection.energyThreshold)) {
        detection.adaptiveThreshold = detection.energyThreshold;
        logger.info(`✅ [${streamSid}] VAD: Usando energyThreshold como fallback: ${detection.adaptiveThreshold}`);
      } else {
        detection.adaptiveThreshold = 0.1; // Valor optimizado para μ-law normalizado (0-1)
        logger.info(`✅ [${streamSid}] VAD: Usando valor por defecto: ${detection.adaptiveThreshold}`);
      }
    }

    const isActive = energy > detection.adaptiveThreshold;

    logger.info(`🎤 [${streamSid}] VAD: energy=${energy.toFixed(3)}, threshold=${detection.adaptiveThreshold.toFixed(3)}, isActive=${isActive}, samples=${validSamples}`);

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

    // 🔧 CRITICAL FIX: Adaptar threshold dinámicamente
    if (detection.energyHistory && detection.energyHistory.length > 0) {
      const avgEnergy = detection.energyHistory.reduce((a, b) => a + b, 0) / detection.energyHistory.length;
      if (!isNaN(avgEnergy) && avgEnergy > 0) {
        // Ajuste gradual del threshold basado en el historial
        detection.adaptiveThreshold = detection.adaptiveThreshold * 0.9 + avgEnergy * 0.1;
      }
    }

    // Mantener historial de energía para adaptación
    if (!detection.energyHistory) detection.energyHistory = [];
    detection.energyHistory.push(energy);
    if (detection.energyHistory.length > 50) {
      detection.energyHistory.shift(); // Mantener solo los últimos 50 valores
    }

    return {
      shouldProcess: isActive,
      isActive: detection.isActive,
      energy: energy.toFixed(3),
      threshold: detection.adaptiveThreshold.toFixed(3)
    };
  }

  /**
   * Analizar calidad y características del buffer de audio
   */

  /**
   * Manejar eventos de media (audio del caller)
   */
  async handleMediaEvent(ws, data) {
    const { streamSid } = data;
    const streamData = this.activeStreams.get(streamSid);
    
    if (!streamData || streamData.state !== 'listening') {
      return;
    }

    const payload = data.media?.payload;
    if (!payload) return;

    const rawAudioChunk = Buffer.from(payload, 'base64');
    const normalizedAudio = this.audioPreprocessor.normalizeAudio(rawAudioChunk, 0.7);
    
    const streamAudioBuffer = this.audioBuffers.get(streamSid) || [];
    streamAudioBuffer.push(normalizedAudio);
    this.audioBuffers.set(streamSid, streamAudioBuffer);
    
    // Log detallado para debug
    logger.info(`🎙️ [${streamSid}] Chunk de audio recibido: ${normalizedAudio.length} bytes, buffer size: ${streamAudioBuffer.length}`);
    
    const vadResult = this.detectVoiceActivity(streamSid, normalizedAudio);
    
    logger.info(`🔍 [${streamSid}] VAD Result: shouldProcess=${vadResult.shouldProcess}, isActive=${vadResult.isActive}, energy=${vadResult.energy}, threshold=${vadResult.threshold}`);
    
    if (vadResult.shouldProcess) {
      const collectedAudio = this.audioBuffers.get(streamSid);
      this.audioBuffers.set(streamSid, []);
      if (collectedAudio && collectedAudio.length > 0) {
        logger.info(`🚀 [${streamSid}] Procesando ${collectedAudio.length} chunks de audio acumulado`);
        this.processCollectedAudio(ws, streamSid, collectedAudio);
      }
    }
  }

  /**
   * NUEVO: Procesar audio acumulado cuando se detecta fin de turno
   */
  async processCollectedAudio(ws, streamSid, collectedAudio) {
    const streamData = this.activeStreams.get(streamSid);
    logger.info(`🚀 [${streamSid}] INICIANDO processCollectedAudio con ${collectedAudio.length} chunks`);
    
    if (!collectedAudio || collectedAudio.length === 0) {
      logger.warn(`⚠️ [${streamSid}] No hay audio acumulado para procesar`);
      return;
    }

    // Combinar chunks en un solo buffer
    const combinedBuffer = Buffer.concat(collectedAudio);
    logger.info(`🔧 [${streamSid}] Audio combinado: ${combinedBuffer.length} bytes`);

    // Verificar si el audio tiene contenido (no es silencio)
    const silentBytes = combinedBuffer.filter(byte => byte === 0xFF).length;
    const totalBytes = combinedBuffer.length;
    const silencePercentage = (silentBytes / totalBytes) * 100;
    logger.info(`🔇 [${streamSid}] Silencio: ${silencePercentage.toFixed(1)}% (${silentBytes}/${totalBytes} bytes)`);

    if (silencePercentage > 95) {
      logger.warn(`⚠️ [${streamSid}] Audio es casi silencio (${silencePercentage.toFixed(1)}%), omitiendo`);
      return;
    }

    // Procesar audio con transcripción
    try {
      logger.info(`🎤 [${streamSid}] Enviando audio a transcripción (${combinedBuffer.length} bytes)`);
      const transcriptionResult = await this.transcriptionService.transcribeAudio(combinedBuffer);
      
      logger.info(`📝 [${streamSid}] Transcripción result: ${JSON.stringify(transcriptionResult)}`);
      
      if (transcriptionResult.success && transcriptionResult.text) {
        logger.info(`💬 [${streamSid}] Texto transcrito: "${transcriptionResult.text}"`);
        
        // Generar respuesta con OpenAI
        logger.info(`🤖 [${streamSid}] Enviando a OpenAI para respuesta`);
        const openaiResponse = await this.openaiService.generateResponse(transcriptionResult.text, streamData);
        
        if (openaiResponse.success) {
          logger.info(`✅ [${streamSid}] Respuesta de OpenAI: "${openaiResponse.response.substring(0, 50)}..."`);
          
          // Generar TTS con la respuesta
          logger.info(`🔊 [${streamSid}] Generando TTS para respuesta`);
          const ttsResult = await this.ttsService.generateSpeech(openaiResponse.response, 'es-ES-IsidoraMultilingualNeural', 'raw-8khz-8bit-mono-mulaw');
          
          if (ttsResult.success) {
            logger.info(`✅ [${streamSid}] TTS generado, enviando audio`);
            
            // Activar echo blanking
            this.activateEchoBlanking(streamSid);
            
            // Enviar audio de respuesta
            await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
            
            // Desactivar echo blanking después
            setTimeout(() => {
              this.deactivateEchoBlanking(streamSid);
            }, Math.ceil((ttsResult.audioBuffer.length / 8000) * 1000) + 500);
          } else {
            logger.error(`❌ [${streamSid}] Error en TTS de respuesta: ${ttsResult.error}`);
          }
        } else {
          logger.error(`❌ [${streamSid}] Error en OpenAI: ${openaiResponse.error}`);
        }
      } else {
        logger.warn(`⚠️ [${streamSid}] Transcripción fallida o sin texto: ${transcriptionResult.error}`);
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error procesando audio: ${error.message}`);
    }
    logger.info(`🔚 [${streamSid}] FINALIZANDO processCollectedAudio`);
  }
}

module.exports = TwilioStreamHandler;
