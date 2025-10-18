const cron = require('node-cron');
const callerMemoryService = require('../services/callerMemoryService');
const logger = require('../utils/logger');

/**
 * Job para limpiar memorias de llamantes expiradas (más de 7 días)
 * Se ejecuta diariamente a las 3:00 AM
 */
class CleanupMemoriesJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Iniciar el job de limpieza
   */
  start() {
    // Ejecutar diariamente a las 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      if (this.isRunning) {
        logger.warn('⚠️ Job de limpieza de memorias ya está en ejecución, omitiendo...');
        return;
      }

      this.isRunning = true;
      logger.info('🗑️ Iniciando job de limpieza de memorias expiradas...');

      try {
        const deletedCount = await callerMemoryService.cleanExpiredMemories();
        logger.info(`✅ Job de limpieza completado: ${deletedCount} memorias eliminadas`);
      } catch (error) {
        logger.error(`❌ Error en job de limpieza de memorias: ${error.message}`);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('✅ Job de limpieza de memorias programado (diario a las 3:00 AM)');
  }

  /**
   * Ejecutar limpieza manualmente (para testing)
   */
  async runNow() {
    if (this.isRunning) {
      logger.warn('⚠️ Job de limpieza ya está en ejecución');
      return;
    }

    this.isRunning = true;
    logger.info('🗑️ Ejecutando limpieza manual de memorias...');

    try {
      const deletedCount = await callerMemoryService.cleanExpiredMemories();
      logger.info(`✅ Limpieza manual completada: ${deletedCount} memorias eliminadas`);
      return deletedCount;
    } catch (error) {
      logger.error(`❌ Error en limpieza manual: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new CleanupMemoriesJob();
