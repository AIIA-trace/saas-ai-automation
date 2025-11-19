/**
 * Script para configurar webhook de Stripe
 * Ejecutar: node backend/scripts/setup-stripe-webhook.js
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupWebhook() {
  console.log('🔧 Configurando webhook de Stripe...\n');

  try {
    // URL del webhook (producción)
    const webhookUrl = 'https://api.aiiatrace.com/webhooks/stripe';
    
    // Eventos que queremos escuchar
    const enabledEvents = [
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted'
    ];
    
    // Verificar si ya existe un webhook con esta URL
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const existingWebhook = existingWebhooks.data.find(wh => wh.url === webhookUrl);
    
    if (existingWebhook) {
      console.log('⚠️  Ya existe un webhook con esta URL');
      console.log(`   ID: ${existingWebhook.id}`);
      console.log(`   Status: ${existingWebhook.status}`);
      console.log(`   Events: ${existingWebhook.enabled_events.join(', ')}`);
      console.log('\n¿Deseas actualizarlo? (Ctrl+C para cancelar)\n');
      
      // Actualizar webhook existente
      const updated = await stripe.webhookEndpoints.update(existingWebhook.id, {
        enabled_events: enabledEvents
      });
      
      console.log('✅ Webhook actualizado correctamente');
      console.log(`\n📋 WEBHOOK SECRET (guárdalo en .env):`);
      console.log(`STRIPE_WEBHOOK_SECRET="${existingWebhook.secret}"\n`);
      
    } else {
      // Crear nuevo webhook
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: enabledEvents,
        description: 'IA Receptionist - Production Webhook'
      });
      
      console.log('✅ Webhook creado exitosamente\n');
      console.log(`📍 URL: ${webhook.url}`);
      console.log(`🆔 ID: ${webhook.id}`);
      console.log(`📋 Events: ${webhook.enabled_events.join(', ')}`);
      console.log(`\n🔐 WEBHOOK SECRET (guárdalo en .env):`);
      console.log(`STRIPE_WEBHOOK_SECRET="${webhook.secret}"\n`);
      console.log('⚠️  IMPORTANTE: Añade esta variable a tu archivo .env en producción\n');
    }
    
  } catch (error) {
    console.error('❌ Error configurando webhook:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('⚠️  Verifica que la API key de Stripe sea correcta');
    }
  }
}

setupWebhook();
