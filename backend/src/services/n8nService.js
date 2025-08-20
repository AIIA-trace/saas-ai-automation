const logger = require('../utils/logger');

// Importar fetch para Node.js (compatibilidad con versiones < 18)
let fetch;
try {
  // Node.js 18+ tiene fetch nativo
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback para versiones anteriores
    fetch = require('node-fetch');
  }
} catch (error) {
  logger.error('❌ Error importando fetch:', error.message);
  throw new Error('fetch no disponible. Instalar node-fetch: npm install node-fetch');
}

/**
 * Servicio para comunicación con N8N
 * Maneja notificaciones proactivas cuando cambian configuraciones de bots
 */
class N8NService {
  
  /**
   * Notifica a N8N cuando se activa/desactiva el bot de llamadas
   * @param {number} clientId - ID del cliente
   * @param {boolean} enabled - Estado del bot (activado/desactivado)
   * @param {object} callConfig - Configuración completa del bot de llamadas
   */
  static async notifyCallBotStatusChange(clientId, enabled, callConfig) {
    const webhookUrl = process.env.N8N_WEBHOOK_CALL;
    
    if (!webhookUrl) {
      logger.warn('⚠️ N8N_WEBHOOK_CALL no configurado - saltando notificación');
      return { success: false, reason: 'webhook_not_configured' };
    }
    
    const payload = {
      clientId: clientId,
      botType: 'call',
      enabled: enabled,
      config: callConfig,
      timestamp: new Date().toISOString(),
      action: enabled ? 'activate' : 'deactivate'
    };
    
    try {
      logger.info(`🚀 Notificando a N8N: Bot de llamadas ${enabled ? 'ACTIVADO' : 'DESACTIVADO'} para cliente ${clientId}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIIA-Backend/1.0'
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 segundos timeout
      });
      
      if (response.ok) {
        logger.info(`✅ N8N notificado exitosamente - Status: ${response.status}`);
        return { success: true, status: response.status };
      } else {
        logger.error(`❌ Error en respuesta N8N - Status: ${response.status} ${response.statusText}`);
        return { success: false, status: response.status, error: response.statusText };
      }
      
    } catch (error) {
      logger.error(`❌ Error notificando a N8N: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Notifica a N8N cuando se activa/desactiva el bot de email
   * @param {number} clientId - ID del cliente
   * @param {boolean} enabled - Estado del bot (activado/desactivado)
   * @param {object} emailConfig - Configuración completa del bot de email
   */
  static async notifyEmailBotStatusChange(clientId, enabled, emailConfig) {
    const webhookUrl = process.env.N8N_WEBHOOK_EMAIL;
    
    if (!webhookUrl) {
      logger.warn('⚠️ N8N_WEBHOOK_EMAIL no configurado - saltando notificación');
      return { success: false, reason: 'webhook_not_configured' };
    }
    
    const payload = {
      clientId: clientId,
      botType: 'email',
      enabled: enabled,
      config: emailConfig,
      timestamp: new Date().toISOString(),
      action: enabled ? 'activate' : 'deactivate'
    };
    
    try {
      logger.info(`📧 Notificando a N8N: Bot de email ${enabled ? 'ACTIVADO' : 'DESACTIVADO'} para cliente ${clientId}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIIA-Backend/1.0'
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 segundos timeout
      });
      
      if (response.ok) {
        logger.info(`✅ N8N notificado exitosamente - Status: ${response.status}`);
        return { success: true, status: response.status };
      } else {
        logger.error(`❌ Error en respuesta N8N - Status: ${response.status} ${response.statusText}`);
        return { success: false, status: response.status, error: response.statusText };
      }
      
    } catch (error) {
      logger.error(`❌ Error notificando a N8N: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verifica si N8N está disponible y responde
   */
  static async healthCheck() {
    const webhookCall = process.env.N8N_WEBHOOK_CALL;
    const webhookEmail = process.env.N8N_WEBHOOK_EMAIL;
    
    const results = {
      call: { configured: !!webhookCall, available: false },
      email: { configured: !!webhookEmail, available: false }
    };
    
    // Test webhook de llamadas
    if (webhookCall) {
      try {
        const response = await fetch(webhookCall, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
          timeout: 5000
        });
        results.call.available = response.ok;
        results.call.status = response.status;
      } catch (error) {
        results.call.error = error.message;
      }
    }
    
    // Test webhook de email
    if (webhookEmail) {
      try {
        const response = await fetch(webhookEmail, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
          timeout: 5000
        });
        results.email.available = response.ok;
        results.email.status = response.status;
      } catch (error) {
        results.email.error = error.message;
      }
    }
    
    return results;
  }
}

module.exports = N8NService;
