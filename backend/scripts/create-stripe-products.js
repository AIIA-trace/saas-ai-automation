/**
 * Script para crear productos y precios en Stripe
 * Ejecutar una sola vez: node backend/scripts/create-stripe-products.js
 * 
 * Requiere variable de entorno: STRIPE_SECRET_KEY
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  console.log('🚀 Creando productos en Stripe...\n');

  try {
    // ============================================
    // PLAN STARTER - €99/mes
    // ============================================
    console.log('📦 Creando producto: Starter');
    const starterProduct = await stripe.products.create({
      name: 'IA Receptionist - Starter',
      description: '300 llamadas/mes + 1,000 emails/mes. Perfecto para autónomos y pequeñas empresas.',
      metadata: {
        plan: 'starter',
        calls_limit: '300',
        emails_limit: '1000',
        features: 'callBot,emailBot,voiceCustomization,callRecording,callTranscription'
      }
    });
    console.log(`✅ Producto Starter creado: ${starterProduct.id}`);

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 9900, // €99.00 en centavos
      currency: 'eur',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'starter'
      }
    });
    console.log(`✅ Precio Starter creado: ${starterPrice.id}`);
    console.log(`   Precio: €${starterPrice.unit_amount / 100}/mes\n`);

    // ============================================
    // PLAN PROFESSIONAL - €249/mes
    // ============================================
    console.log('📦 Creando producto: Professional');
    const professionalProduct = await stripe.products.create({
      name: 'IA Receptionist - Professional',
      description: '1,000 llamadas/mes + 3,000 emails/mes. Ideal para PYMEs y clínicas.',
      metadata: {
        plan: 'professional',
        calls_limit: '1000',
        emails_limit: '3000',
        features: 'callBot,emailBot,voiceCustomization,callRecording,callTranscription,analytics,prioritySupport,monthlyReports'
      }
    });
    console.log(`✅ Producto Professional creado: ${professionalProduct.id}`);

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 24900, // €249.00 en centavos
      currency: 'eur',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'professional'
      }
    });
    console.log(`✅ Precio Professional creado: ${professionalPrice.id}`);
    console.log(`   Precio: €${professionalPrice.unit_amount / 100}/mes\n`);

    // ============================================
    // RESUMEN
    // ============================================
    console.log('🎉 ¡Productos creados exitosamente!\n');
    console.log('📋 PRICE IDs para configurar en el código:\n');
    console.log(`STRIPE_PRICE_STARTER="${starterPrice.id}"`);
    console.log(`STRIPE_PRICE_PROFESSIONAL="${professionalPrice.id}"`);
    console.log('\n💡 Añade estas variables a tu archivo .env\n');

    // Guardar en archivo para referencia
    const fs = require('fs');
    const config = {
      starter: {
        productId: starterProduct.id,
        priceId: starterPrice.id,
        price: 99
      },
      professional: {
        productId: professionalProduct.id,
        priceId: professionalPrice.id,
        price: 249
      }
    };
    
    fs.writeFileSync(
      './backend/stripe-products.json',
      JSON.stringify(config, null, 2)
    );
    console.log('✅ Configuración guardada en: backend/stripe-products.json');

  } catch (error) {
    console.error('❌ Error creando productos:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('⚠️  Verifica que la API key de Stripe sea correcta');
    }
  }
}

createProducts();
