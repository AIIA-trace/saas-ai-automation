/**
 * Script para actualizar la base de datos y cambiar voiceId de 'lola' a 'ximena'
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateVoiceToXimena() {
  try {
    console.log('🔄 Actualizando voiceId en base de datos...');
    
    // Buscar todos los clientes
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });

    // Filtrar clientes que tienen callConfig con voiceId
    const clientsToUpdate = allClients.filter(client => 
      client.callConfig && 
      client.callConfig.voiceId && 
      (client.callConfig.voiceId === 'lola' || client.callConfig.voiceId === 'elvira')
    );

    console.log(`📊 Encontrados ${clientsToUpdate.length} clientes para actualizar`);

    for (const client of clientsToUpdate) {
      const oldVoiceId = client.callConfig?.voiceId;
      
      // Actualizar callConfig manteniendo todas las otras propiedades
      const updatedCallConfig = {
        ...client.callConfig,
        voiceId: 'ximena'
      };

      await prisma.client.update({
        where: { id: client.id },
        data: {
          callConfig: updatedCallConfig
        }
      });

      console.log(`✅ Cliente "${client.companyName}" actualizado: ${oldVoiceId} → ximena`);
    }

    // Verificar los cambios
    console.log('\n🔍 Verificando cambios...');
    const updatedClients = await prisma.client.findMany({
      where: {
        callConfig: { path: ['voiceId'], equals: 'ximena' }
      },
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });

    console.log(`✅ ${updatedClients.length} clientes ahora usan voiceId 'ximena'`);
    
    updatedClients.forEach(client => {
      console.log(`   - ${client.companyName}: voiceId = ${client.callConfig?.voiceId}`);
    });

  } catch (error) {
    console.error('❌ Error actualizando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateVoiceToXimena();
