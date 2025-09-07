/**
 * Configuración de Debug para el sistema OpenAI Whisper
 * Permite activar/desactivar logs detallados por módulo
 */

const debugConfig = {
  // 🎤 LOGS DE WHISPER
  whisper: {
    enabled: process.env.DEBUG_WHISPER === 'true' || process.env.NODE_ENV === 'development',
    logAudioDownload: true,
    logTranscriptionDetails: true,
    logTimings: true,
    logErrors: true
  },
  
  // 🎙️ LOGS DE AUDIO WEBHOOK
  audioWebhook: {
    enabled: process.env.DEBUG_AUDIO_WEBHOOK === 'true' || process.env.NODE_ENV === 'development',
    logHeaders: true,
    logBody: true,
    logClientLookup: true,
    logTimings: true,
    logErrors: true
  },
  
  // 🎵 LOGS DE AZURE TTS
  azureTTS: {
    enabled: process.env.DEBUG_AZURE_TTS === 'true' || process.env.NODE_ENV === 'development',
    logTextToSynthesize: true,
    logVoiceSelection: true,
    logTimings: true,
    logErrors: true
  },
  
  // 🤖 LOGS DE PROCESAMIENTO IA
  aiProcessing: {
    enabled: process.env.DEBUG_AI_PROCESSING === 'true' || process.env.NODE_ENV === 'development',
    logContext: true,
    logResponses: true,
    logTimings: true,
    logErrors: true
  },
  
  // 💾 LOGS DE BASE DE DATOS
  database: {
    enabled: process.env.DEBUG_DATABASE === 'true' || process.env.NODE_ENV === 'development',
    logQueries: true,
    logResults: true,
    logTimings: true,
    logErrors: true
  },
  
  // 📝 LOGS DE TWIML
  twiml: {
    enabled: process.env.DEBUG_TWIML === 'true' || process.env.NODE_ENV === 'development',
    logGeneration: true,
    logContent: true,
    logTimings: true,
    logErrors: true
  }
};

/**
 * Helper para generar ID único de debug
 */
function generateDebugId(prefix = 'DEBUG') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper para formatear tiempo transcurrido
 */
function formatElapsedTime(startTime) {
  return `${Date.now() - startTime}ms`;
}

/**
 * Helper para logs condicionales
 */
function conditionalLog(category, subcategory, level, message, ...args) {
  const config = debugConfig[category];
  
  if (!config || !config.enabled || !config[subcategory]) {
    return;
  }
  
  const logger = require('../utils/logger');
  
  switch (level) {
    case 'info':
      logger.info(message, ...args);
      break;
    case 'warn':
      logger.warn(message, ...args);
      break;
    case 'error':
      logger.error(message, ...args);
      break;
    default:
      logger.info(message, ...args);
  }
}

module.exports = {
  debugConfig,
  generateDebugId,
  formatElapsedTime,
  conditionalLog
};
