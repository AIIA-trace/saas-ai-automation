const logger = require('./logger');

/**
 * Sistema de timeouts seguro para producción - NO usa setTimeout
 * Basado en eventos media y contadores para funcionar en Render
 */
class ProductionSafeTimeouts {
  constructor() {
    // Timeouts activos por stream
    this.activeTimeouts = new Map();
    
    // Contadores de eventos por timeout
    this.eventCounters = new Map();
    
    // Configuración de timeouts
    this.timeoutConfigs = new Map();
    
    logger.info('⏰ ProductionSafeTimeouts inicializado - Sistema SIN setTimeout');
  }

  /**
   * Crear timeout basado en eventos media (NO setTimeout)
   */
  createEventBasedTimeout(streamSid, timeoutId, config) {
    const {
      eventThreshold = 150, // ~3 segundos a 50 eventos/segundo
      callback,
      description = 'timeout',
      maxChecks = 10 // máximo número de verificaciones
    } = config;

    // Configurar timeout
    this.timeoutConfigs.set(`${streamSid}_${timeoutId}`, {
      eventThreshold,
      callback,
      description,
      maxChecks,
      createdAt: Date.now(),
      checksPerformed: 0,
      isActive: true
    });

    // Inicializar contador
    this.eventCounters.set(`${streamSid}_${timeoutId}`, 0);

    logger.info(`⏰ [${streamSid}] Timeout creado: ${timeoutId} (${eventThreshold} eventos, ${description})`);
  }

  /**
   * Procesar evento media para todos los timeouts del stream
   */
  onMediaEvent(streamSid) {
    // Incrementar contadores de todos los timeouts activos de este stream
    for (const [key, config] of this.timeoutConfigs.entries()) {
      if (key.startsWith(`${streamSid}_`) && config.isActive) {
        const currentCount = this.eventCounters.get(key) || 0;
        this.eventCounters.set(key, currentCount + 1);
        
        // Verificar si debe ejecutarse el timeout
        this.checkTimeout(key, config);
      }
    }
  }

  /**
   * Verificar si un timeout debe ejecutarse
   */
  checkTimeout(key, config) {
    const eventCount = this.eventCounters.get(key) || 0;
    
    if (eventCount >= config.eventThreshold) {
      const [streamSid, timeoutId] = key.split('_');
      
      logger.info(`⏰ [${streamSid}] TIMEOUT EJECUTÁNDOSE: ${timeoutId} (${eventCount} eventos)`);
      
      try {
        // Ejecutar callback
        config.callback();
        
        // Marcar como ejecutado
        config.isActive = false;
        
        logger.info(`✅ [${streamSid}] Timeout ${timeoutId} ejecutado exitosamente`);
        
      } catch (error) {
        logger.error(`❌ [${streamSid}] Error ejecutando timeout ${timeoutId}: ${error.message}`);
      }
      
      // Limpiar timeout
      this.clearTimeout(streamSid, timeoutId);
    }
  }

  /**
   * Cancelar timeout específico
   */
  clearTimeout(streamSid, timeoutId) {
    const key = `${streamSid}_${timeoutId}`;
    
    const config = this.timeoutConfigs.get(key);
    if (config) {
      config.isActive = false;
      this.timeoutConfigs.delete(key);
      this.eventCounters.delete(key);
      
      logger.info(`🚫 [${streamSid}] Timeout cancelado: ${timeoutId}`);
    }
  }

  /**
   * Cancelar todos los timeouts de un stream
   */
  clearAllTimeouts(streamSid) {
    const keysToDelete = [];
    
    for (const key of this.timeoutConfigs.keys()) {
      if (key.startsWith(`${streamSid}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      const [, timeoutId] = key.split('_');
      this.clearTimeout(streamSid, timeoutId);
    });
    
    logger.info(`🧹 [${streamSid}] Todos los timeouts cancelados (${keysToDelete.length})`);
  }

  /**
   * Verificar timeouts por tiempo transcurrido (fallback)
   */
  checkTimeoutsByAge() {
    const now = Date.now();
    
    for (const [key, config] of this.timeoutConfigs.entries()) {
      if (!config.isActive) continue;
      
      const age = now - config.createdAt;
      const [streamSid, timeoutId] = key.split('_');
      
      // Si el timeout es muy viejo (>30 segundos), forzar ejecución
      if (age > 30000) {
        logger.warn(`⚠️ [${streamSid}] Timeout ${timeoutId} muy viejo (${age}ms) - forzando ejecución`);
        
        try {
          config.callback();
        } catch (error) {
          logger.error(`❌ [${streamSid}] Error en timeout forzado ${timeoutId}: ${error.message}`);
        }
        
        this.clearTimeout(streamSid, timeoutId);
      }
    }
  }

  /**
   * Obtener estadísticas de timeouts
   */
  getTimeoutStats(streamSid) {
    const stats = {
      activeTimeouts: 0,
      totalTimeouts: 0,
      timeouts: []
    };
    
    for (const [key, config] of this.timeoutConfigs.entries()) {
      if (key.startsWith(`${streamSid}_`)) {
        stats.totalTimeouts++;
        
        if (config.isActive) {
          stats.activeTimeouts++;
          
          const [, timeoutId] = key.split('_');
          const eventCount = this.eventCounters.get(key) || 0;
          
          stats.timeouts.push({
            id: timeoutId,
            description: config.description,
            eventCount,
            threshold: config.eventThreshold,
            progress: Math.round((eventCount / config.eventThreshold) * 100),
            age: Date.now() - config.createdAt
          });
        }
      }
    }
    
    return stats;
  }

  /**
   * Crear timeout de transición de estado
   */
  createStateTransitionTimeout(streamSid, fromState, toState, callback) {
    this.createEventBasedTimeout(streamSid, `transition_${fromState}_to_${toState}`, {
      eventThreshold: 150, // ~3 segundos
      callback,
      description: `Transición ${fromState} → ${toState}`
    });
  }

  /**
   * Crear timeout de inactividad
   */
  createInactivityTimeout(streamSid, callback) {
    this.createEventBasedTimeout(streamSid, 'inactivity', {
      eventThreshold: 750, // ~15 segundos
      callback,
      description: 'Timeout de inactividad'
    });
  }

  /**
   * Crear timeout de respuesta TTS
   */
  createTTSResponseTimeout(streamSid, estimatedDuration, callback) {
    // Convertir duración estimada a eventos (50 eventos/segundo)
    const eventThreshold = Math.max(100, Math.floor(estimatedDuration / 20));
    
    this.createEventBasedTimeout(streamSid, 'tts_response', {
      eventThreshold,
      callback,
      description: `Respuesta TTS (${estimatedDuration}ms)`
    });
  }

  /**
   * Iniciar verificación periódica de timeouts viejos
   */
  startPeriodicCheck() {
    // Usar setInterval solo para verificación de emergencia (cada 30s)
    // Este es el único setTimeout que mantenemos como último recurso
    setInterval(() => {
      this.checkTimeoutsByAge();
    }, 30000);
    
    logger.info('🔄 Verificación periódica de timeouts iniciada (cada 30s)');
  }
}

module.exports = ProductionSafeTimeouts;
