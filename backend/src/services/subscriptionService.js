const logger = require('../utils/logger');

/**
 * Servicio para gestión de planes de suscripción y límites
 * Integra con la lógica Stripe existente
 */
class SubscriptionService {
  
  // Definición de planes y sus características (ACTUALIZADOS 2025)
  static PLANS = {
    starter: {
      name: 'Starter',
      price: 99, // €99/mes
      monthlyCallLimit: 300,
      monthlyEmailLimit: 1000,
      maxContextFiles: 2,
      maxPhoneNumbers: 1,
      maxEmailAccounts: 1,
      callOverageRate: 0.50, // €0.50 por llamada extra
      emailOverageRate: 0.10, // €0.10 por email extra
      hardLimits: {
        calls: 450,  // Límite duro antes de bloqueo
        emails: 1500
      },
      features: {
        callBot: true,
        emailBot: true,
        voiceCustomization: true,
        callSummary: true,
        callTranscription: true,
        outOfHoursEmail: true,
        analytics: false,
        apiAccess: false,
        prioritySupport: false,
        supportResponseTime: '48h'
      },
      stripePriceId: 'price_1SVGOZ30HCn0xeAPiB7SHe8g' // Stripe Price ID
    },
    professional: {
      name: 'Professional',
      price: 249, // €249/mes
      monthlyCallLimit: 1000,
      monthlyEmailLimit: 3000,
      maxContextFiles: 5,
      maxPhoneNumbers: 1,
      maxEmailAccounts: 1,
      callOverageRate: 0.35, // €0.35 por llamada extra
      emailOverageRate: 0.07, // €0.07 por email extra
      hardLimits: {
        calls: 1500,
        emails: 4500
      },
      features: {
        callBot: true,
        emailBot: true,
        voiceCustomization: true,
        callSummary: true,
        callTranscription: true,
        outOfHoursEmail: true,
        apiAccess: false,
        prioritySupport: true,
        supportResponseTime: '24h'
      },
      stripePriceId: 'price_1SVGOa30HCn0xeAPgKYXOlLe' // Stripe Price ID
    },
    // Aliases para compatibilidad
    basic: {
      name: 'Starter',
      price: 99,
      monthlyCallLimit: 300,
      monthlyEmailLimit: 1000,
      maxContextFiles: 2,
      maxPhoneNumbers: 1,
      maxEmailAccounts: 1,
      callOverageRate: 0.50,
      emailOverageRate: 0.10,
      hardLimits: {
        calls: 450,
        emails: 1500
      },
      features: {
        callBot: true,
        emailBot: true,
        voiceCustomization: true,
        callSummary: true,
        callTranscription: true,
        outOfHoursEmail: true,
        analytics: false,
        apiAccess: false,
        prioritySupport: false,
        supportResponseTime: '48h'
      },
      stripePriceId: 'price_1SVGOZ30HCn0xeAPiB7SHe8g'
    },
    pro: {
      name: 'Professional',
      price: 249,
      monthlyCallLimit: 1000,
      monthlyEmailLimit: 3000,
      maxContextFiles: 5,
      maxPhoneNumbers: 1,
      maxEmailAccounts: 1,
      callOverageRate: 0.35,
      emailOverageRate: 0.07,
      hardLimits: {
        calls: 1500,
        emails: 4500
      },
      features: {
        callBot: true,
        emailBot: true,
        voiceCustomization: true,
        callSummary: true,
        callTranscription: true,
        outOfHoursEmail: true,
        apiAccess: false,
        prioritySupport: true,
        supportResponseTime: '24h'
      },
      stripePriceId: 'price_1SVGOa30HCn0xeAPgKYXOlLe'
    }
  };

  /**
   * Obtiene la configuración de un plan específico
   * @param {string} planName - Nombre del plan (basic, pro, enterprise)
   * @returns {object} Configuración del plan
   */
  static getPlanConfig(planName) {
    const plan = this.PLANS[planName];
    if (!plan) {
      logger.warn(`Plan no encontrado: ${planName}, usando plan básico por defecto`);
      return this.PLANS.basic;
    }
    return plan;
  }

  /**
   * Verifica si un cliente puede realizar una acción según su plan
   * @param {object} client - Objeto cliente de la base de datos
   * @param {string} feature - Característica a verificar
   * @returns {boolean} Si la característica está disponible
   */
  static hasFeature(client, feature) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    return planConfig.features[feature] || false;
  }

  /**
   * Verifica si un cliente puede realizar más llamadas
   * @param {object} client - Objeto cliente de la base de datos
   * @returns {object} Estado del límite de llamadas
   */
  static checkCallLimit(client) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    
    // Plan enterprise tiene llamadas ilimitadas
    if (planConfig.monthlyCallLimit === -1) {
      return {
        canMakeCall: true,
        isUnlimited: true,
        callsUsed: client.callsUsedThisMonth || 0,
        callsRemaining: -1,
        overageRate: 0
      };
    }

    const callsUsed = client.callsUsedThisMonth || 0;
    const callsRemaining = Math.max(0, planConfig.monthlyCallLimit - callsUsed);
    
    return {
      canMakeCall: true, // Siempre puede hacer llamadas (con overage si es necesario)
      isUnlimited: false,
      callsUsed,
      callsRemaining,
      monthlyLimit: planConfig.monthlyCallLimit,
      overageRate: planConfig.overageRate,
      isOverLimit: callsUsed >= planConfig.monthlyCallLimit
    };
  }

  /**
   * Verifica si un cliente puede subir más archivos de contexto
   * @param {object} client - Objeto cliente de la base de datos
   * @param {number} currentFiles - Número actual de archivos
   * @returns {boolean} Si puede subir más archivos
   */
  static canUploadMoreFiles(client, currentFiles = 0) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    return currentFiles < planConfig.maxContextFiles;
  }

  /**
   * Verifica si un cliente puede añadir más números telefónicos
   * @param {object} client - Objeto cliente de la base de datos
   * @param {number} currentNumbers - Número actual de números telefónicos
   * @returns {boolean} Si puede añadir más números
   */
  static canAddMoreNumbers(client, currentNumbers = 0) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    return currentNumbers < planConfig.maxPhoneNumbers;
  }

  /**
   * Calcula el costo de overages para un cliente
   * @param {object} client - Objeto cliente de la base de datos
   * @param {number} minutesUsed - Minutos de llamadas usados
   * @returns {object} Información de costos
   */
  static calculateOverageCost(client, minutesUsed) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    const callLimit = planConfig.monthlyCallLimit;
    
    // Sin overages para plan enterprise
    if (callLimit === -1) {
      return {
        overageMinutes: 0,
        overageCost: 0,
        totalCost: planConfig.price
      };
    }

    const overageMinutes = Math.max(0, minutesUsed - callLimit);
    const overageCost = overageMinutes * planConfig.overageRate;
    
    return {
      overageMinutes,
      overageCost,
      totalCost: planConfig.price + overageCost,
      basePrice: planConfig.price,
      overageRate: planConfig.overageRate
    };
  }

  /**
   * Incrementa el contador de llamadas de un cliente
   * @param {object} prisma - Cliente de Prisma
   * @param {number} clientId - ID del cliente
   * @param {number} minutes - Minutos de la llamada (por defecto 1)
   * @returns {object} Nuevo estado del cliente
   */
  static async incrementCallUsage(prisma, clientId, minutes = 1) {
    try {
      // Verificar si necesitamos resetear el contador mensual
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          callsUsedThisMonth: true,
          usageResetDate: true,
          subscriptionPlan: true
        }
      });

      if (!client) {
        throw new Error(`Cliente no encontrado: ${clientId}`);
      }

      const now = new Date();
      const resetDate = client.usageResetDate;
      let shouldReset = false;

      // Resetear si es el primer uso o si ha pasado un mes
      if (!resetDate || this.shouldResetUsage(resetDate, now)) {
        shouldReset = true;
      }

      const newCallsUsed = shouldReset ? minutes : (client.callsUsedThisMonth || 0) + minutes;
      const newResetDate = shouldReset ? now : resetDate;

      const updatedClient = await prisma.client.update({
        where: { id: clientId },
        data: {
          callsUsedThisMonth: newCallsUsed,
          usageResetDate: newResetDate
        }
      });

      logger.info(`📞 Usage actualizado para cliente ${clientId}: ${newCallsUsed} llamadas usadas`);
      
      return {
        success: true,
        callsUsed: newCallsUsed,
        wasReset: shouldReset,
        client: updatedClient
      };

    } catch (error) {
      logger.error(`Error incrementando usage de llamadas: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determina si el usage debe resetearse (nuevo período de facturación)
   * @param {Date} lastResetDate - Fecha del último reset
   * @param {Date} currentDate - Fecha actual
   * @returns {boolean} Si debe resetearse
   */
  static shouldResetUsage(lastResetDate, currentDate) {
    const lastReset = new Date(lastResetDate);
    const current = new Date(currentDate);
    
    // Resetear si ha pasado un mes desde el último reset
    const monthsDiff = (current.getFullYear() - lastReset.getFullYear()) * 12 + 
                      (current.getMonth() - lastReset.getMonth());
    
    return monthsDiff >= 1;
  }

  /**
   * Obtiene el resumen de usage para el dashboard
   * @param {object} client - Objeto cliente de la base de datos
   * @returns {object} Resumen de usage
   */
  static getUsageSummary(client) {
    const planConfig = this.getPlanConfig(client.subscriptionPlan || 'basic');
    const callStatus = this.checkCallLimit(client);
    
    return {
      plan: {
        name: planConfig.name,
        price: planConfig.price,
        current: client.subscriptionPlan || 'basic'
      },
      calls: callStatus,
      files: {
        used: 0, // Se calculará desde contextFiles JSON
        limit: planConfig.maxContextFiles,
        canUploadMore: true // Se calculará dinámicamente
      },
      phoneNumbers: {
        used: 0, // Se calculará desde TwilioNumber relation
        limit: planConfig.maxPhoneNumbers,
        canAddMore: true // Se calculará dinámicamente
      },
      features: planConfig.features,
      nextResetDate: client.usageResetDate ? 
        new Date(client.usageResetDate.getTime() + 30 * 24 * 60 * 60 * 1000) : // +30 días
        new Date()
    };
  }
}

module.exports = SubscriptionService;
