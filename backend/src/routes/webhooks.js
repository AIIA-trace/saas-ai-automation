const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const webhookController = require('../controllers/webhookController');
const logger = require('../utils/logger');

// Middleware para validar webhook de Twilio
const validateTwilioWebhook = (req, res, next) => {
  // En un entorno de producción, deberías validar la firma de Twilio
  // Usando la librería twilio.webhook y el auth token
  next();
};

// Middleware para validar webhook de Stripe
const validateStripeWebhook = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    return res.status(400).json({ error: 'Falta la firma de Stripe' });
  }
  
  try {
    // En un entorno real, aquí validaríamos la firma con el secreto de webhook
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );
    // req.stripeEvent = event;
    next();
  } catch (error) {
    logger.error(`Error validando webhook de Stripe: ${error.message}`);
    return res.status(400).json({ error: 'Firma de Stripe inválida' });
  }
};

// === WEBHOOKS DE TWILIO ===

// Ruta principal que usa TwilioService (REQUERIDA)
router.post('/call', validateTwilioWebhook, webhookController.handleIncomingCall);
router.post('/recording', validateTwilioWebhook, webhookController.handleRecording);
router.post('/fallback', validateTwilioWebhook, webhookController.handleIncomingCall);

// DEPRECATED: gather endpoint - usar WebSocket streaming
// router.post('/gather', validateTwilioWebhook, webhookController.handleGatherInput);

// Rutas que coinciden con la configuración de Twilio
router.post('/twilio/voice', validateTwilioWebhook, webhookController.handleIncomingCall);
router.post('/twilio/status', validateTwilioWebhook, webhookController.handleCallStatus);
router.post('/twilio/sms', validateTwilioWebhook, webhookController.handleIncomingSMS);

// Rutas legacy (mantener por compatibilidad)
router.post('/voice/incoming', validateTwilioWebhook, webhookController.handleIncomingCall);
router.post('/voice/recording', validateTwilioWebhook, webhookController.handleRecording);
// DEPRECATED: router.post('/voice/dtmf', validateTwilioWebhook, webhookController.handleGatherInput);

// Webhook para procesamiento de IA
router.post('/ai/results', webhookController.handleAIProcessingResults);

// === WEBHOOKS DE IA NATURAL ===

// DEPRECATED: Webhook obsoleto - usar /webhook/incoming-call en su lugar
// Este endpoint usa funciones deprecated del twilioService

// DEPRECATED: Endpoint obsoleto - usar WebSocket streaming en su lugar
router.post('/call/response/:clientId', validateTwilioWebhook, async (req, res) => {
  try {
    logger.warn('⚠️ Endpoint /call/response/:clientId está deprecated. Usar WebSocket streaming.');
    
    // Responder con error para forzar migración
    res.set('Content-Type', 'text/xml');
    res.send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Error de configuración. Por favor, contacta con soporte técnico.</Say>
        <Hangup/>
      </Response>
    `);
    
  } catch (error) {
    logger.error(`❌ Endpoint deprecated llamado: ${error.message}`);
    res.status(500).send('<Response><Hangup/></Response>');
  }
});

// === WEBHOOKS DE EMAIL ===

// Webhook para emails entrantes
router.post('/email/incoming', webhookController.handleIncomingEmail);

// === WEBHOOKS DE PROCESAMIENTO IA ===

// Webhook para recibir resultados del procesamiento de IA
router.post('/ai-results', webhookController.handleAIProcessingResults);

// === WEBHOOKS DE STRIPE ===

// Webhook para eventos de Stripe (pagos, suscripciones, etc.)
router.post('/stripe', validateStripeWebhook, async (req, res) => {
  try {
    const event = req.stripeEvent || req.body;
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const clientId = session.metadata?.clientId;
        
        if (!clientId) {
          logger.error('No se encontró clientId en los metadatos de la sesión');
          return res.status(400).json({ error: 'Falta clientId en los metadatos' });
        }
        
        // Actualizar cliente con información de suscripción
        await prisma.client.update({
          where: { id: clientId },
          data: {
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
            subscriptionPlanId: session.metadata?.priceId || null,
            subscriptionStartDate: new Date()
          }
        });
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = invoice.subscription;
        const customerId = invoice.customer;
        
        if (!subscription || !customerId) {
          return res.status(400).json({ error: 'Falta información de suscripción' });
        }
        
        // Obtener cliente asociado con el customer ID de Stripe
        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId }
        });
        
        if (!client) {
          logger.error(`No se encontró cliente para Stripe Customer ID: ${customerId}`);
          return res.status(400).json({ error: 'No se encontró cliente' });
        }
        
        // Actualizar estado de suscripción y fecha de renovación
        await prisma.client.update({
          where: { id: client.id },
          data: {
            subscriptionStatus: 'active',
            subscriptionRenewalDate: new Date(invoice.period_end * 1000)
          }
        });
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        if (!customerId) {
          return res.status(400).json({ error: 'Falta customer ID' });
        }
        
        // Obtener cliente asociado con el customer ID de Stripe
        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId }
        });
        
        if (!client) {
          logger.error(`No se encontró cliente para Stripe Customer ID: ${customerId}`);
          return res.status(400).json({ error: 'No se encontró cliente' });
        }
        
        // Marcar suscripción como inactiva
        await prisma.client.update({
          where: { id: client.id },
          data: {
            subscriptionStatus: 'payment_failed'
          }
        });
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        if (!customerId) {
          return res.status(400).json({ error: 'Falta customer ID' });
        }
        
        // Obtener cliente asociado con el customer ID de Stripe
        const client = await prisma.client.findFirst({
          where: { stripeCustomerId: customerId }
        });
        
        if (!client) {
          logger.error(`No se encontró cliente para Stripe Customer ID: ${customerId}`);
          return res.status(400).json({ error: 'No se encontró cliente' });
        }
        
        // Marcar suscripción como cancelada
        await prisma.client.update({
          where: { id: client.id },
          data: {
            subscriptionStatus: 'cancelled',
            subscriptionEndDate: new Date(subscription.current_period_end * 1000)
          }
        });
        
        break;
      }
      
      default:
        // Para otros eventos, simplemente logueamos
        logger.info(`Evento de Stripe recibido: ${event.type}`);
    }
    
    // Responder con éxito
    return res.json({ received: true });
  } catch (error) {
    logger.error(`Error procesando webhook de Stripe: ${error.message}`);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
});

module.exports = router;
