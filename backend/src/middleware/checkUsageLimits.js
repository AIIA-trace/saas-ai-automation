const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Middleware para verificar límites de uso según el plan del cliente
 * Bloquea llamadas/emails si se exceden los límites
 */

// Definición de límites por plan
const PLAN_LIMITS = {
  starter: {
    calls: 300,
    emails: 1000,
    hardLimit: {
      calls: 450,  // 50% extra antes de bloqueo total
      emails: 1500
    }
  },
  professional: {
    calls: 1000,
    emails: 3000,
    hardLimit: {
      calls: 1500,
      emails: 4500
    }
  },
  basic: {  // Alias para starter (compatibilidad)
    calls: 300,
    emails: 1000,
    hardLimit: {
      calls: 450,
      emails: 1500
    }
  },
  pro: {  // Alias para professional (compatibilidad)
    calls: 1000,
    emails: 3000,
    hardLimit: {
      calls: 1500,
      emails: 4500
    }
  }
};

/**
 * Verificar límite de llamadas
 */
async function checkCallLimit(req, res, next) {
  try {
    const clientId = req.client.id;
    const plan = req.client.subscriptionPlan || 'starter';
    
    // VERIFICAR SI EL TRIAL HA EXPIRADO
    if (req.client.subscriptionStatus === 'trial' && req.client.subscriptionExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(req.client.subscriptionExpiresAt);
      
      if (now > expiresAt) {
        logger.warn(`🚫 Cliente ${clientId} - Trial expirado (${expiresAt.toLocaleDateString()})`);
        return res.status(403).json({
          error: 'Trial expirado',
          message: 'Tu período de prueba ha finalizado. Por favor, suscríbete a un plan para continuar usando el servicio.',
          trialEndedAt: expiresAt,
          upgradeUrl: '/dashboard#billing-content'
        });
      }
    }
    
    // VERIFICAR SI LA SUSCRIPCIÓN HA EXPIRADO
    if (req.client.subscriptionStatus === 'active' && req.client.subscriptionExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(req.client.subscriptionExpiresAt);
      
      if (now > expiresAt) {
        logger.warn(`🚫 Cliente ${clientId} - Suscripción expirada (${expiresAt.toLocaleDateString()})`);
        return res.status(403).json({
          error: 'Suscripción expirada',
          message: 'Tu suscripción ha expirado. Por favor, renueva tu plan para continuar usando el servicio.',
          subscriptionEndedAt: expiresAt,
          upgradeUrl: '/dashboard#billing-content'
        });
      }
    }
    
    // Obtener límites del plan
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    
    // Obtener uso del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const callsThisMonth = await prisma.callLog.count({
      where: {
        clientId: clientId,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });
    
    logger.info(`📊 Cliente ${clientId} - Llamadas este mes: ${callsThisMonth}/${limits.calls} (límite duro: ${limits.hardLimit.calls})`);
    
    // Verificar límite duro
    if (callsThisMonth >= limits.hardLimit.calls) {
      logger.warn(`🚫 Cliente ${clientId} ha excedido el límite duro de llamadas (${callsThisMonth}/${limits.hardLimit.calls})`);
      return res.status(429).json({
        error: 'Límite de llamadas excedido',
        message: `Has alcanzado el límite máximo de ${limits.hardLimit.calls} llamadas este mes. Por favor, actualiza tu plan o espera al próximo ciclo de facturación.`,
        usage: {
          current: callsThisMonth,
          limit: limits.calls,
          hardLimit: limits.hardLimit.calls
        },
        upgradeUrl: '/dashboard#billing-content'
      });
    }
    
    // Advertencia si está cerca del límite
    if (callsThisMonth >= limits.calls) {
      const overageCount = callsThisMonth - limits.calls;
      logger.warn(`⚠️ Cliente ${clientId} en excedente: ${overageCount} llamadas sobre el límite`);
      
      // Añadir info de excedente a la request
      req.usageInfo = {
        inOverage: true,
        overageCount: overageCount,
        overageRate: plan === 'starter' ? 0.50 : 0.35,
        estimatedCharge: overageCount * (plan === 'starter' ? 0.50 : 0.35)
      };
    }
    
    next();
    
  } catch (error) {
    logger.error(`Error verificando límite de llamadas: ${error.message}`);
    // En caso de error, permitir la llamada (fail-open)
    next();
  }
}

/**
 * Verificar límite de emails
 */
async function checkEmailLimit(req, res, next) {
  try {
    const clientId = req.client.id;
    const plan = req.client.subscriptionPlan || 'starter';
    
    // VERIFICAR SI EL TRIAL HA EXPIRADO
    if (req.client.subscriptionStatus === 'trial' && req.client.subscriptionExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(req.client.subscriptionExpiresAt);
      
      if (now > expiresAt) {
        logger.warn(`🚫 Cliente ${clientId} - Trial expirado (${expiresAt.toLocaleDateString()})`);
        return res.status(403).json({
          error: 'Trial expirado',
          message: 'Tu período de prueba ha finalizado. Por favor, suscríbete a un plan para continuar usando el servicio.',
          trialEndedAt: expiresAt,
          upgradeUrl: '/dashboard#billing-content'
        });
      }
    }
    
    // VERIFICAR SI LA SUSCRIPCIÓN HA EXPIRADO
    if (req.client.subscriptionStatus === 'active' && req.client.subscriptionExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(req.client.subscriptionExpiresAt);
      
      if (now > expiresAt) {
        logger.warn(`🚫 Cliente ${clientId} - Suscripción expirada (${expiresAt.toLocaleDateString()})`);
        return res.status(403).json({
          error: 'Suscripción expirada',
          message: 'Tu suscripción ha expirado. Por favor, renueva tu plan para continuar usando el servicio.',
          subscriptionEndedAt: expiresAt,
          upgradeUrl: '/dashboard#billing-content'
        });
      }
    }
    
    // Obtener límites del plan
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    
    // Obtener uso del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const emailsThisMonth = await prisma.emailLog.count({
      where: {
        clientId: clientId,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      }
    });
    
    logger.info(`📊 Cliente ${clientId} - Emails este mes: ${emailsThisMonth}/${limits.emails} (límite duro: ${limits.hardLimit.emails})`);
    
    // Verificar límite duro
    if (emailsThisMonth >= limits.hardLimit.emails) {
      logger.warn(`🚫 Cliente ${clientId} ha excedido el límite duro de emails (${emailsThisMonth}/${limits.hardLimit.emails})`);
      return res.status(429).json({
        error: 'Límite de emails excedido',
        message: `Has alcanzado el límite máximo de ${limits.hardLimit.emails} emails este mes. Por favor, actualiza tu plan o espera al próximo ciclo de facturación.`,
        usage: {
          current: emailsThisMonth,
          limit: limits.emails,
          hardLimit: limits.hardLimit.emails
        },
        upgradeUrl: '/dashboard#billing-content'
      });
    }
    
    // Advertencia si está cerca del límite
    if (emailsThisMonth >= limits.emails) {
      const overageCount = emailsThisMonth - limits.emails;
      logger.warn(`⚠️ Cliente ${clientId} en excedente: ${overageCount} emails sobre el límite`);
      
      // Añadir info de excedente a la request
      req.usageInfo = {
        inOverage: true,
        overageCount: overageCount,
        overageRate: plan === 'starter' ? 0.10 : 0.07,
        estimatedCharge: overageCount * (plan === 'starter' ? 0.10 : 0.07)
      };
    }
    
    next();
    
  } catch (error) {
    logger.error(`Error verificando límite de emails: ${error.message}`);
    // En caso de error, permitir el email (fail-open)
    next();
  }
}

/**
 * Enviar notificación cuando se alcanza el 80% del límite
 */
async function checkAndNotifyUsage(clientId, type, current, limit) {
  const percentage = (current / limit) * 100;
  
  if (percentage >= 80 && percentage < 90) {
    logger.warn(`⚠️ Cliente ${clientId} ha alcanzado el 80% del límite de ${type}`);
    // TODO: Enviar email de notificación
  } else if (percentage >= 90 && percentage < 100) {
    logger.warn(`⚠️ Cliente ${clientId} ha alcanzado el 90% del límite de ${type}`);
    // TODO: Enviar email de notificación urgente
  } else if (percentage >= 100) {
    logger.error(`🚫 Cliente ${clientId} ha excedido el 100% del límite de ${type}`);
    // TODO: Enviar email de límite excedido
  }
}

module.exports = {
  checkCallLimit,
  checkEmailLimit,
  PLAN_LIMITS
};
