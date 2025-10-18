const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateQiromedia() {
  try {
    console.log('🔍 Buscando cliente Intacon...');
    
    // Buscar cliente por nombre de empresa
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { companyName: { contains: 'Intacon', mode: 'insensitive' } },
          { companyName: { contains: 'Qiromedia', mode: 'insensitive' } }
        ]
      }
    });

    if (!client) {
      console.log('❌ No se encontró el cliente Intacon/Qiromedia');
      return;
    }

    console.log(`✅ Cliente encontrado: ${client.companyName} (ID: ${client.id})`);
    console.log(`📧 Email: ${client.email}`);

    // Obtener callConfig actual
    const currentCallConfig = client.callConfig || {};
    
    // Actualizar información
    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        companyName: 'Qiromedia',
        companyDescription: 'Qiromedia ofrece servicios de marketing digital, análisis de datos y ayuda a la digitalización de empresas e industrias 4.0',
        welcomeMessage: '¡Hola! Has llamado a Qiromedia, ¿en qué puedo ayudarte?',
        callConfig: {
          ...currentCallConfig,
          greeting: '¡Hola! Has llamado a Qiromedia, ¿en qué puedo ayudarte?'
        }
      }
    });

    console.log('\n✅ Cliente actualizado exitosamente:');
    console.log(`📛 Nombre: ${updated.companyName}`);
    console.log(`📝 Descripción: ${updated.companyDescription}`);
    console.log(`👋 Saludo: ${updated.welcomeMessage}`);

  } catch (error) {
    console.error('❌ Error actualizando cliente:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateQiromedia();
