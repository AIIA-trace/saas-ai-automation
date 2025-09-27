const logger = require('./logger');

/**
 * Sistema de gestión de estados basado en eventos - SIN setTimeout
 * Diseñado para funcionar en entornos de producción donde setTimeout falla
 */
class EventBasedStateManager {
  constructor() {
    // Estados por stream
    this.streamStates = new Map();
    
    // Contadores de eventos por stream
    this.eventCounters = new Map();
    
    // Callbacks de transición por stream
    this.transitionCallbacks = new Map();
    
    // Configuración de transiciones automáticas
    this.transitionRules = new Map();
    
    // Heartbeat basado en eventos media
    this.mediaEventCounters = new Map();
    
    logger.info('🔄 EventBasedStateManager inicializado - Sistema SIN setTimeout');
  }

  /**
   * Inicializar stream con estado inicial
   */
  initializeStream(streamSid, initialState = 'greeting') {
    this.streamStates.set(streamSid, {
      currentState: initialState,
      previousState: null,
      stateStartTime: Date.now(),
      transitionCount: 0,
      lastMediaEvent: Date.now(),
      forceTransitionAfterEvents: null
    });
    
    this.eventCounters.set(streamSid, {
      mediaEvents: 0,
      transcriptionAttempts: 0,
      ttsCompletions: 0,
      stateTransitions: 0,
      inactivityChecks: 0
    });
    
    this.mediaEventCounters.set(streamSid, {
      totalEvents: 0,
      lastEventTime: Date.now(),
      eventsInCurrentSecond: 0,
      lastSecondTimestamp: Math.floor(Date.now() / 1000)
    });
    
    logger.info(`🎯 [${streamSid}] Stream inicializado - Estado: ${initialState}`);
  }

  /**
   * Obtener estado actual de un stream
   */
  getState(streamSid) {
    return this.streamStates.get(streamSid)?.currentState || null;
  }

  /**
   * Transición de estado con validación
   */
  transitionTo(streamSid, newState, reason = 'manual') {
    const streamData = this.streamStates.get(streamSid);
    if (!streamData) {
      logger.error(`❌ [${streamSid}] No se puede transicionar - stream no inicializado`);
      return false;
    }

    const oldState = streamData.currentState;
    
    // Validar transición
    if (!this.isValidTransition(oldState, newState)) {
      logger.warn(`⚠️ [${streamSid}] Transición inválida: ${oldState} → ${newState}`);
      return false;
    }

    // Ejecutar transición
    streamData.previousState = oldState;
    streamData.currentState = newState;
    streamData.stateStartTime = Date.now();
    streamData.transitionCount++;

    // Incrementar contador de transiciones
    const counters = this.eventCounters.get(streamSid);
    if (counters) {
      counters.stateTransitions++;
    }

    logger.info(`🔄 [${streamSid}] TRANSICIÓN: ${oldState} → ${newState} (${reason})`);

    // Ejecutar callback si existe
    this.executeTransitionCallback(streamSid, newState, oldState, reason);

    // Configurar próxima transición automática si aplica
    this.setupAutoTransition(streamSid, newState);

    return true;
  }

  /**
   * Validar si una transición es válida
   */
  isValidTransition(fromState, toState) {
    const validTransitions = {
      'greeting': ['speaking', 'listening', 'error'],
      'speaking': ['listening', 'error', 'processing'],
      'listening': ['processing', 'speaking', 'error'],
      'processing': ['speaking', 'listening', 'error'],
      'error': ['listening', 'speaking', 'greeting']
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * Configurar transición automática basada en eventos
   */
  setupAutoTransition(streamSid, currentState) {
    const rules = {
      'speaking': {
        // Después de hablar, transicionar a listening después de X eventos media
        triggerOnMediaEvents: 25, // ~500ms de eventos media (25 chunks de 20ms)
        targetState: 'listening',
        reason: 'auto-media-events'
      },
      'processing': {
        // Si procesamiento toma mucho, forzar a speaking
        triggerOnMediaEvents: 100, // ~2 segundos
        targetState: 'speaking',
        reason: 'auto-processing-timeout'
      }
    };

    const rule = rules[currentState];
    if (rule) {
      const streamData = this.streamStates.get(streamSid);
      streamData.forceTransitionAfterEvents = rule.triggerOnMediaEvents;
      
      logger.info(`⚡ [${streamSid}] Auto-transición configurada: ${currentState} → ${rule.targetState} después de ${rule.triggerOnMediaEvents} eventos`);
    }
  }

  /**
   * Procesar evento media - CORAZÓN DEL SISTEMA
   */
  onMediaEvent(streamSid, eventData) {
    // Actualizar contadores
    const counters = this.eventCounters.get(streamSid);
    const mediaCounters = this.mediaEventCounters.get(streamSid);
    const streamData = this.streamStates.get(streamSid);

    if (!counters || !mediaCounters || !streamData) {
      return;
    }

    // Incrementar contadores
    counters.mediaEvents++;
    mediaCounters.totalEvents++;
    mediaCounters.lastEventTime = Date.now();
    streamData.lastMediaEvent = Date.now();

    // Calcular eventos por segundo
    const currentSecond = Math.floor(Date.now() / 1000);
    if (currentSecond !== mediaCounters.lastSecondTimestamp) {
      mediaCounters.eventsInCurrentSecond = 1;
      mediaCounters.lastSecondTimestamp = currentSecond;
    } else {
      mediaCounters.eventsInCurrentSecond++;
    }

    // Verificar transición automática
    this.checkAutoTransition(streamSid);

    // Verificar inactividad basada en eventos
    this.checkInactivityByEvents(streamSid);
  }

  /**
   * Verificar si debe ejecutarse transición automática
   */
  checkAutoTransition(streamSid) {
    const streamData = this.streamStates.get(streamSid);
    const counters = this.eventCounters.get(streamSid);

    if (!streamData || !streamData.forceTransitionAfterEvents) {
      return;
    }

    // Contar eventos desde la última transición
    const eventsSinceTransition = counters.mediaEvents;
    
    if (eventsSinceTransition >= streamData.forceTransitionAfterEvents) {
      const currentState = streamData.currentState;
      
      // Determinar estado objetivo
      let targetState = 'listening';
      let reason = 'auto-media-events';
      
      if (currentState === 'speaking') {
        targetState = 'listening';
        reason = 'auto-speaking-complete';
      } else if (currentState === 'processing') {
        targetState = 'speaking';
        reason = 'auto-processing-timeout';
      }

      logger.warn(`⚡ [${streamSid}] TRANSICIÓN AUTOMÁTICA: ${eventsSinceTransition} eventos → ${targetState}`);
      
      // Ejecutar transición
      this.transitionTo(streamSid, targetState, reason);
      
      // Reset contador para próxima transición
      counters.mediaEvents = 0;
    }
  }

  /**
   * Verificar inactividad basada en eventos (no tiempo)
   */
  checkInactivityByEvents(streamSid) {
    const mediaCounters = this.mediaEventCounters.get(streamSid);
    const streamData = this.streamStates.get(streamSid);
    
    if (!mediaCounters || !streamData) return;

    // Si estamos en listening y no hay eventos por varios segundos
    if (streamData.currentState === 'listening') {
      const eventsPerSecond = mediaCounters.eventsInCurrentSecond;
      
      // Si menos de 5 eventos por segundo durante listening = posible inactividad
      if (eventsPerSecond < 5) {
        const counters = this.eventCounters.get(streamSid);
        counters.inactivityChecks++;
        
        // Después de 10 checks de baja actividad = inactividad
        if (counters.inactivityChecks >= 10) {
          logger.warn(`⚠️ [${streamSid}] INACTIVIDAD DETECTADA por eventos (${counters.inactivityChecks} checks)`);
          
          // Ejecutar callback de inactividad
          this.executeInactivityCallback(streamSid);
          
          // Reset contador
          counters.inactivityChecks = 0;
        }
      } else {
        // Reset contador si hay actividad
        const counters = this.eventCounters.get(streamSid);
        counters.inactivityChecks = 0;
      }
    }
  }

  /**
   * Registrar callback para transiciones
   */
  onTransition(streamSid, callback) {
    if (!this.transitionCallbacks.has(streamSid)) {
      this.transitionCallbacks.set(streamSid, []);
    }
    this.transitionCallbacks.get(streamSid).push(callback);
  }

  /**
   * Registrar callback para inactividad
   */
  onInactivity(streamSid, callback) {
    const streamData = this.streamStates.get(streamSid);
    if (streamData) {
      streamData.inactivityCallback = callback;
    }
  }

  /**
   * Ejecutar callbacks de transición
   */
  executeTransitionCallback(streamSid, newState, oldState, reason) {
    const callbacks = this.transitionCallbacks.get(streamSid);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newState, oldState, reason);
        } catch (error) {
          logger.error(`❌ [${streamSid}] Error en callback de transición: ${error.message}`);
        }
      });
    }
  }

  /**
   * Ejecutar callback de inactividad
   */
  executeInactivityCallback(streamSid) {
    const streamData = this.streamStates.get(streamSid);
    if (streamData?.inactivityCallback) {
      try {
        streamData.inactivityCallback();
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error en callback de inactividad: ${error.message}`);
      }
    }
  }

  /**
   * Forzar transición inmediata (para casos críticos)
   */
  forceTransition(streamSid, newState, reason = 'forced') {
    logger.warn(`🚨 [${streamSid}] TRANSICIÓN FORZADA: → ${newState} (${reason})`);
    return this.transitionTo(streamSid, newState, reason);
  }

  /**
   * Obtener estadísticas del stream
   */
  getStreamStats(streamSid) {
    const streamData = this.streamStates.get(streamSid);
    const counters = this.eventCounters.get(streamSid);
    const mediaCounters = this.mediaEventCounters.get(streamSid);

    if (!streamData || !counters || !mediaCounters) {
      return null;
    }

    return {
      currentState: streamData.currentState,
      previousState: streamData.previousState,
      stateAge: Date.now() - streamData.stateStartTime,
      transitionCount: streamData.transitionCount,
      mediaEvents: counters.mediaEvents,
      totalMediaEvents: mediaCounters.totalEvents,
      eventsPerSecond: mediaCounters.eventsInCurrentSecond,
      lastEventAge: Date.now() - mediaCounters.lastEventTime
    };
  }

  /**
   * Limpiar recursos del stream
   */
  cleanup(streamSid) {
    this.streamStates.delete(streamSid);
    this.eventCounters.delete(streamSid);
    this.transitionCallbacks.delete(streamSid);
    this.mediaEventCounters.delete(streamSid);
    
    logger.info(`🧹 [${streamSid}] StateManager limpiado`);
  }

  /**
   * Obtener resumen de todos los streams activos
   */
  getActiveStreams() {
    const streams = [];
    for (const [streamSid, data] of this.streamStates.entries()) {
      streams.push({
        streamSid,
        state: data.currentState,
        age: Date.now() - data.stateStartTime,
        transitions: data.transitionCount
      });
    }
    return streams;
  }
}

module.exports = EventBasedStateManager;
