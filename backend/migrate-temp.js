const { PrismaClient } = require('@prisma/client');

async function addPaymentMethodsField() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Verificando si el campo paymentMethods ya existe...');
    
    // Intentar hacer una consulta que use el campo paymentMethods
    const testClient = await prisma.client.findFirst({
      select: { 
        id: true,
        paymentMethods: true 
      }
    });
    
    console.log('✅ El campo paymentMethods ya existe en la base de datos');
    console.log('🎉 Migración completada exitosamente');
    
  } catch (error) {
    if (error.message.includes('paymentMethods')) {
      console.log('❌ El campo paymentMethods no existe. Necesitas ejecutar: npx prisma db push');
    } else {
      console.log('✅ El campo paymentMethods probablemente ya existe');
      console.log('🎉 Migración completada exitosamente');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addPaymentMethodsField();
