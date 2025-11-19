/**
 * Script para actualizar manualmente la suscripción de un cliente
 * Ejecutar: node backend/scripts/update-subscription-manually.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSubscription() {
  try {
    console.log('🔄 Actualizando suscripción manualmente...\n');

    // ID del cliente (tu usuario)
    const clientId = 1;
    
    // Obtener cliente actual
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      console.error('❌ Cliente no encontrado');
      return;
    }
    
    console.log('📊 Cliente actual:');
    console.log(`   Email: ${client.email}`);
    console.log(`   Plan actual: ${client.subscriptionPlan || 'ninguno'}`);
    console.log(`   Estado: ${client.subscriptionStatus || 'ninguno'}`);
    
    // Actualizar a plan Starter
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        subscriptionPlan: 'starter',
        subscriptionStatus: 'active',
        stripePriceId: 'price_1SVGOZ30HCn0xeAPiB7SHe8g',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      }
    });
    
    console.log('\n✅ Suscripción actualizada correctamente:');
    console.log(`   Plan nuevo: ${updated.subscriptionPlan}`);
    console.log(`   Estado: ${updated.subscriptionStatus}`);
    console.log(`   Expira: ${updated.subscriptionExpiresAt}`);
    console.log('\n🎉 ¡Listo! Recarga el dashboard para ver los cambios.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateSubscription();
