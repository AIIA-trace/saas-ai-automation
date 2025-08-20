const logger = require('../utils/logger');
const SubscriptionService = require('./subscriptionService');

/**
 * Servicio para validación de límites en flujos N8N
 * Procesa notificaciones y valida según el plan de suscripción
 */
class N8NValidationService {
  
  /**
   * Procesa una notificación de activación de bot de llamadas
   * Valida límites y permisos según el plan
   * @param {object} payload - Payload del webhook N8N
   * @param {object} prisma - Cliente Prisma
   * @returns {object} Resultado de la validación
   */
  static async processCallBotNotification(payload, prisma) {
    try {
      const { clientId, enabled, config } = payload;
      
      logger.info(`🔍 Procesando notificación N8N para cliente ${clientId}: Bot ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
      
      // Obtener cliente de la base de datos
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          id: true,
          subscriptionPlan: true,
          callsUsedThisMonth: true,
          usageResetDate: true,
          subscriptionStatus: true,
          email: true
        }
      });
      
      if (!client) {
        return {
          success: false,
          error: 'Cliente no encontrado',
          action: 'block'
        };
      }
      
      // Si se está desactivando, siempre permitir
      if (!enabled) {
        return {
          success: true,
          action: 'deactivate',
          message: 'Bot de llamadas desactivado correctamente',
          client: {
            id: client.id,
            email: client.email,
            plan: client.subscriptionPlan
          }
        };
      }
      
      // Validar si el cliente tiene acceso a bot de llamadas
      if (!SubscriptionService.hasFeature(client, 'callBot')) {
        return {
          success: false,
          error: 'Plan no incluye bot de llamadas',
          action: 'upgrade_required',
          suggestedPlan: 'basic'
        };
      }
      
      // Obtener estado de límites
      const callStatus = SubscriptionService.checkCallLimit(client);
      const planConfig = SubscriptionService.getPlanConfig(client.subscriptionPlan);
      
      // Validar características específicas del config
      const validationResult = this.validateCallConfig(config, client);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          action: 'upgrade_required',
          suggestedPlan: validationResult.suggestedPlan
        };
      }
      
      return {
        success: true,
        action: 'activate',
        message: 'Bot de llamadas activado correctamente',
        client: {
          id: client.id,
          email: client.email,
          plan: client.subscriptionPlan
        },
        limits: {
          callsUsed: callStatus.callsUsed,
          callsRemaining: callStatus.callsRemaining,
          isUnlimited: callStatus.isUnlimited,
          overageRate: callStatus.overageRate
        },
        features: planConfig.features,
        config: {
          validated: config,
          allowedFeatures: this.filterConfigByPlan(config, client)
        }
      };
      
    } catch (error) {
      logger.error(`Error procesando notificación N8N: ${error.message}`);
      return {
        success: false,
        error: 'Error interno del servidor',
        action: 'retry'
      };
    }
  }
  
  /**
   * Valida la configuración de llamadas según el plan
   * @param {object} config - Configuración del bot de llamadas
   * @param {object} client - Cliente de la base de datos
   * @returns {object} Resultado de validación
   */
  static validateCallConfig(config, client) {
    const planConfig = SubscriptionService.getPlanConfig(client.subscriptionPlan);
    
    // Validar grabación de llamadas
    if (config.recordCalls && !planConfig.features.callRecording) {
      return {
        valid: false,
        error: 'Grabación de llamadas no disponible en tu plan',
        suggestedPlan: 'pro'
      };
    }
    
    // Validar transcripción
    if (config.transcribeCalls && !planConfig.features.callTranscription) {
      return {
        valid: false,
        error: 'Transcripción de llamadas no disponible en tu plan',
        suggestedPlan: 'pro'
      };
    }
    
    // Validar personalización de voz
    if (config.useCustomVoice && !planConfig.features.voiceCustomization) {
      return {
        valid: false,
        error: 'Personalización de voz no disponible en tu plan',
        suggestedPlan: 'pro'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Filtra la configuración según las características del plan
   * @param {object} config - Configuración original
   * @param {object} client - Cliente de la base de datos
   * @returns {object} Configuración filtrada
   */
  static filterConfigByPlan(config, client) {
    const planConfig = SubscriptionService.getPlanConfig(client.subscriptionPlan);
    const filteredConfig = { ...config };
    
    // Desactivar características no disponibles
    if (!planConfig.features.callRecording) {
      filteredConfig.recordCalls = false;
    }
    
    if (!planConfig.features.callTranscription) {
      filteredConfig.transcribeCalls = false;
    }
    
    if (!planConfig.features.voiceCustomization) {
      filteredConfig.useCustomVoice = false;
      filteredConfig.customVoiceId = '';
    }
    
    return filteredConfig;
  }
  
  /**
   * Procesa notificación de uso de llamada (para conteo)
   * @param {object} payload - Datos de la llamada
   * @param {object} prisma - Cliente Prisma
   * @returns {object} Resultado del procesamiento
   */
  static async processCallUsage(payload, prisma) {
    try {
      const { clientId, duration, callId } = payload;
      
      logger.info(`📊 Procesando uso de llamada para cliente ${clientId}: ${duration} minutos`);
      
      // Incrementar contador de llamadas
      const result = await SubscriptionService.incrementCallUsage(
        prisma, 
        parseInt(clientId), 
        Math.ceil(duration) // Redondear hacia arriba
      );
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }
      
      // Verificar si se ha superado el límite
      const client = result.client;
      const callStatus = SubscriptionService.checkCallLimit(client);
      
      // Generar alertas si es necesario
      const alerts = [];
      
      if (callStatus.isOverLimit) {
        const overageCost = SubscriptionService.calculateOverageCost(
          client, 
          client.callsUsedThisMonth
        );
        
        alerts.push({
          type: 'overage',
          message: `Has superado tu límite mensual. Costo adicional: $${overageCost.overageCost.toFixed(2)}`,
          overageCost: overageCost.overageCost,
          overageMinutes: overageCost.overageMinutes
        });
      } else if (callStatus.callsRemaining <= 10) {
        alerts.push({
          type: 'warning',
          message: `Te quedan ${callStatus.callsRemaining} llamadas este mes`,
          callsRemaining: callStatus.callsRemaining
        });
      }
      
      return {
        success: true,
        callsUsed: result.callsUsed,
        wasReset: result.wasReset,
        limits: callStatus,
        alerts,
        callId
      };
      
    } catch (error) {
      logger.error(`Error procesando uso de llamada: ${error.message}`);
      return {
        success: false,
        error: 'Error procesando uso de llamada'
      };
    }
  }
  
  /**
   * Procesa notificación de bot de email
   * @param {object} payload - Payload del webhook N8N
   * @param {object} prisma - Cliente Prisma
   * @returns {object} Resultado de la validación
   */
  static async processEmailBotNotification(payload, prisma) {
    try {
      const { clientId, enabled, config } = payload;
      
      logger.info(`📧 Procesando notificación email N8N para cliente ${clientId}: Bot ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
      
      // Obtener cliente
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          id: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          email: true
        }
      });
      
      if (!client) {
        return {
          success: false,
          error: 'Cliente no encontrado',
          action: 'block'
        };
      }
      
      // Validar acceso a bot de email
      if (enabled && !SubscriptionService.hasFeature(client, 'emailBot')) {
        return {
          success: false,
          error: 'Plan no incluye bot de email',
          action: 'upgrade_required',
          suggestedPlan: 'basic'
        };
      }
      
      // Validar respuesta fuera de horario
      if (config.outOfHoursReply && !SubscriptionService.hasFeature(client, 'outOfHoursEmail')) {
        return {
          success: false,
          error: 'Respuesta fuera de horario no disponible en tu plan',
          action: 'upgrade_required',
          suggestedPlan: 'pro'
        };
      }
      
      const planConfig = SubscriptionService.getPlanConfig(client.subscriptionPlan);
      
      return {
        success: true,
        action: enabled ? 'activate' : 'deactivate',
        message: `Bot de email ${enabled ? 'activado' : 'desactivado'} correctamente`,
        client: {
          id: client.id,
          email: client.email,
          plan: client.subscriptionPlan
        },
        features: planConfig.features,
        config: {
          validated: config,
          allowedFeatures: this.filterEmailConfigByPlan(config, client)
        }
      };
      
    } catch (error) {
      logger.error(`Error procesando notificación email N8N: ${error.message}`);
      return {
        success: false,
        error: 'Error interno del servidor',
        action: 'retry'
      };
    }
  }
  
  /**
   * Filtra configuración de email según el plan
   * @param {object} config - Configuración original
   * @param {object} client - Cliente de la base de datos
   * @returns {object} Configuración filtrada
   */
  static filterEmailConfigByPlan(config, client) {
    const planConfig = SubscriptionService.getPlanConfig(client.subscriptionPlan);
    const filteredConfig = { ...config };
    
    // Desactivar respuesta fuera de horario si no está disponible
    if (!planConfig.features.outOfHoursEmail) {
      filteredConfig.outOfHoursReply = false;
    }
    
    return filteredConfig;
  }
}

module.exports = N8NValidationService;
