const { PrismaClient } = require('@prisma/client');

async function verifyCallConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando configuración de llamadas en la base de datos...');
    
    const client = await prisma.client.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        email: true,
        companyName: true,
        callConfig: true,
        updatedAt: true
      }
    });
    
    if (!client) {
      console.log('❌ Cliente no encontrado');
      return;
    }
    
    console.log('✅ Cliente encontrado:', client.email);
    console.log('🏢 Empresa:', client.companyName);
    console.log('🕐 Última actualización:', client.updatedAt);
    console.log('📞 Configuración de llamadas:');
    console.log(JSON.stringify(client.callConfig, null, 2));
    
    if (client.callConfig && client.callConfig.enabled !== undefined) {
      console.log(`🤖 Bot de llamadas: ${client.callConfig.enabled ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`);
    } else {
      console.log('⚠️ No hay configuración de llamadas guardada');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCallConfig();
