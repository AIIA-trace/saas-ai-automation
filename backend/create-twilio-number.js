const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTwilioNumber() {
  try {
    console.log('🔍 Buscando cliente ID=1...');
    
    // Verificar cliente ID=1
    const client = await prisma.client.findFirst({
      where: { id: 1 }
    });
    
    if (!client) {
      console.log('❌ Cliente ID=1 no encontrado');
      return;
    }
    
    console.log('✅ Cliente encontrado:', client.email);
    
    // Verificar si ya existe el número
    const existingNumber = await prisma.twilioNumber.findFirst({
      where: { phoneNumber: '+16672209354' }
    });
    
    if (existingNumber) {
      console.log('⚠️ El número ya existe, actualizando cliente...');
      await prisma.twilioNumber.update({
        where: { id: existingNumber.id },
        data: { clientId: client.id }
      });
      console.log('✅ Número actualizado para cliente ID=1');
      return;
    }
    
    // Crear número Twilio
    const twilioNumber = await prisma.twilioNumber.create({
      data: {
        clientId: client.id,
        phoneNumber: '+16672209354',
        twilioSid: 'PN' + Math.random().toString(36).substring(2, 15),
        friendlyName: 'Greensboro MD Number',
        status: 'active',
        region: 'US',
        capabilities: JSON.stringify(['voice', 'sms'])
      }
    });
    
    console.log('✅ Número Twilio creado exitosamente:');
    console.log('- Cliente ID:', twilioNumber.clientId);
    console.log('- Número:', twilioNumber.phoneNumber);
    console.log('- Twilio SID:', twilioNumber.twilioSid);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTwilioNumber();
