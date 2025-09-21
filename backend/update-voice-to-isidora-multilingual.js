const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateVoiceToIsidoraMultilingual() {
  try {
    console.log('🔄 Actualizando configuración de voz a Isidora Multilingual...');
    
    // Actualizar todos los clientes para usar Isidora Multilingual con estilo cheerful
    const updateResult = await prisma.client.updateMany({
      data: {
        callConfig: {
          voice: 'es-ES-IsidoraMultilingualNeural',
          style: 'cheerful',
          rate: 1.05,
          role: 'OlderAdultFemale'
        }
      }
    });

    console.log(`✅ ${updateResult.count} clientes actualizados con voz Isidora Multilingual`);
    
    // Verificar la actualización
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });

    console.log('\n📊 Configuración actualizada:');
    clients.forEach(client => {
      console.log(`   ├── Cliente: ${client.companyName || client.id}`);
      console.log(`   ├── Voz: ${client.callConfig?.voice || 'No configurada'}`);
      console.log(`   ├── Estilo: ${client.callConfig?.style || 'No configurado'}`);
      console.log(`   ├── Velocidad: ${client.callConfig?.rate || 'No configurada'}`);
      console.log(`   └── Rol: ${client.callConfig?.role || 'No configurado'}`);
      console.log('');
    });

    console.log('🎉 Migración a Isidora Multilingual completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error actualizando voz:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVoiceToIsidoraMultilingual();
