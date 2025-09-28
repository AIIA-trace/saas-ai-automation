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
      
      // Ahora intentar obtener el cliente usando callSid si no se hizo antes
      this.getClientForStream(streamSid, callSid).then(() => {
        // Enviar saludo inicial después de obtener el cliente
        this.sendInitialGreeting(ws, { streamSid, callSid }).catch(error => {
          logger.error(`❌ [${streamSid}] Error en saludo inicial: ${error.message}`);
        });
      }).catch(error => {
        logger.error(`❌ [${streamSid}] Error obteniendo cliente: ${error.message}`);
      });
    } else {
      // Si no hay stream temporal, inicializar directamente
      this.activeStreams.set(streamSid, {
        callSid,
        streamSid,
        state: 'connected',
        startTime: Date.now(),
        lastActivity: Date.now()
      });
      
      // Obtener cliente y enviar saludo
      this.getClientForStream(streamSid, callSid).then(() => {
        this.sendInitialGreeting(ws, { streamSid, callSid }).catch(error => {
          logger.error(`❌ [${streamSid}] Error en saludo inicial: ${error.message}`);
        });
      }).catch(error => {
        logger.error(`❌ [${streamSid}] Error obteniendo cliente: ${error.message}`);
      });
    }
    
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
        
        // Enviar audio directamente (sin marca)
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        logger.info(`✅ [${streamSid}] Audio del saludo enviado directamente`);
        
        // Usar setTimeout para activar transcripción después del audio (versión anterior)
        setTimeout(() => {
          logger.info(`⏰ [${streamSid}] Activando transcripción después del saludo (setTimeout)`);
          this.transcriptionActive.set(streamSid, true);
          const streamData = this.activeStreams.get(streamSid);
          if (streamData) {
            streamData.state = 'listening';
          }
        }, audioLengthMs + 500); // +500ms buffer
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
      
      // Enviar fallback directamente
      await this.sendRawMulawToTwilio(ws, this.fallbackAudio, streamSid);
      logger.info(`✅ [${streamSid}] Audio fallback del saludo enviado`);
      
      // Activar transcripción con setTimeout para fallback
      setTimeout(() => {
        logger.info(`⏰ [${streamSid}] Activando transcripción después del fallback (setTimeout)`);
        this.transcriptionActive.set(streamSid, true);
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.state = 'listening';
        }
      }, 2000); // 2 segundos para fallback
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
        
        // Enviar audio directamente (sin marca)
        await this.sendRawMulawToTwilio(ws, ttsResult.audioBuffer, streamSid);
        logger.info(`✅ [${streamSid}] Saludo extendido enviado directamente`);
        
        // Usar setTimeout para activar transcripción después del audio (versión anterior)
        setTimeout(() => {
          logger.info(`⏰ [${streamSid}] Activando transcripción después del saludo extendido (setTimeout)`);
          this.transcriptionActive.set(streamSid, true);
          const streamData = this.activeStreams.get(streamSid);
          if (streamData) {
            streamData.state = 'listening';
          }
        }, audioLengthMs + 500); // +500ms buffer
      }
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en saludo extendido: ${error.message}`);
      
      // Usar audio de fallback si TTS falla
      logger.warn(`⚠️ [${streamSid}] Usando audio de fallback para saludo extendido`);
      
      // Activar echo blanking durante fallback
      this.activateEchoBlanking(streamSid);
      
      // Enviar fallback directamente
      await this.sendRawMulawToTwilio(ws, this.fallbackAudio, streamSid);
      logger.info(`✅ [${streamSid}] Fallback del saludo extendido enviado`);
      
      // Activar transcripción con setTimeout para fallback
      setTimeout(() => {
        logger.info(`⏰ [${streamSid}] Activando transcripción después del fallback extendido (setTimeout)`);
        this.transcriptionActive.set(streamSid, true);
        const streamData = this.activeStreams.get(streamSid);
        if (streamData) {
          streamData.state = 'listening';
        }
      }, 2000); // 2 segundos para fallback
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
      energyThreshold: 20, // Umbral base para habla real vs ruido telefónico
      adaptiveThreshold: 20,
      
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
   * Detectar actividad de voz en tiempo real usando VAD (Voice Activity Detection)
   */
  detectVoiceActivity(audioChunk, streamSid) {
    const samples = new Uint8Array(audioChunk);
    let energy = 0;
    
    for (const sample of samples) {
      const amplitude = Math.abs(sample - 127);
      energy += amplitude * amplitude;
    }
    energy = Math.sqrt(energy / samples.length);
    
    const detection = this.speechDetection.get(streamSid);
    if (!detection) return { shouldProcess: false, isActive: false, energy: energy.toFixed(1) };
    
    const isActive = energy > detection.adaptiveThreshold;
    
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
      energy: energy.toFixed(1),
      threshold: detection.adaptiveThreshold.toFixed(1)
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
    
    const vadResult = this.processVAD(streamSid, normalizedAudio);
    
    if (vadResult.shouldProcess) {
      const collectedAudio = this.audioBuffers.get(streamSid);
      this.audioBuffers.set(streamSid, []);
      if (collectedAudio && collectedAudio.length > 0) {
        this.processCollectedAudio(ws, streamSid, collectedAudio);
      }
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
      
      // LLAMADA REAL A TRANSCRIPCIÓN - esto faltaba!
      const transcriptionResult = await this.transcriptionService.transcribeAudio(combinedBuffer);
      
      if (!transcriptionResult || !transcriptionResult.text || transcriptionResult.text.trim().length === 0) {
        logger.warn(`🚫 [${streamSid}] Transcripción vacía o inválida - ignorando`);
        return;
      }
      
      logger.info(`📝 [${streamSid}] Transcripción exitosa: "${transcriptionResult.text}"`);          
      logger.info(`🔍 [DEBUG] Llamada a generateAndSendResponse con transcripción: "${transcriptionResult.text}"`);
      
      // CRÍTICO: Actualizar actividad del usuario en StateManager
      // Cambiar estado a procesando
      streamData.state = 'processing';
      streamData.lastUserInput = transcriptionResult.text;
      
      // Guardar última transcripción
      streamData.lastTranscription = transcriptionResult.text;
      
      // Generar respuesta conversacional
      await this.generateAndSendResponse(ws, streamSid, transcriptionResult.text, streamData.client);
      
      // La transcripción se reactiva automáticamente cuando termina el audio (via marca)
      
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
      // La transcripción se mantiene activa automáticamente
      
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
        
        // Activar echo blanking durante la reproducción
        this.activateEchoBlanking(streamSid);
        
        // Enviar audio con marca para detectar cuando termina
        const markId = `response_end_${Date.now()}`;
        logger.info(`🚀 [${streamSid}] Enviando respuesta con marca: ${markId}`);
        
        // Registrar que esperamos esta marca para desactivar echo blanking
        this.pendingMarks = this.pendingMarks || new Map();
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
          this.pendingMarks = this.pendingMarks || new Map();
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
      // La transcripción se mantiene activa automáticamente
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
      
      // La transcripción se reactiva automáticamente cuando termina el audio (via marca)
      // No necesitamos setTimeout ya que usamos el patrón event-driven
      
    } catch (error) {
      logger.error(`❌ [${streamSid}] Error en sendFallbackResponse: ${error.message}`);
      
      // Último recurso: limpiar estado
      this.responseInProgress.delete(streamSid);
      // La transcripción se mantiene activa automáticamente
    }
  }

  // Métodos startListening y startTranscription eliminados - ahora usamos patrón event-driven con marcas
  
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
    const detection = this.speechDetection.get(streamSid);
    if (!detection) return { shouldProcess: false, isActive: false, energy: 0, threshold: 0 };
    
    const samples = new Uint8Array(audioChunk);
    let energy = 0;
    for (const sample of samples) {
      const amplitude = Math.abs(sample - 127);
      energy += amplitude * amplitude;
    }
    energy = Math.sqrt(energy / samples.length);
    
    const isActive = energy > detection.adaptiveThreshold;
    
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
      energy: energy.toFixed(1),
      threshold: detection.adaptiveThreshold.toFixed(1)
    };
  }

  /**
   * Resetear estado VAD para audio constantemente saturado
   */

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
