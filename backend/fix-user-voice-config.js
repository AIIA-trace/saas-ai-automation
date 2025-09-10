const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserVoiceConfig() {
  console.log('🔧 CORRIGIENDO configuración de voz del usuario en DB');
  console.log('==================================================');
  
  try {
    // 1. Buscar usuarios con voces incorrectas
    console.log('\n1. BUSCANDO CONFIGURACIONES INCORRECTAS:');
    
    const clients = await prisma.client.findMany({
      where: {
        callConfig: {
          not: undefined
        }
      },
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });
    
    console.log(`   - Clientes encontrados: ${clients.length}`);
    
    // 2. Identificar y corregir voces incorrectas
    console.log('\n2. ANALIZANDO CONFIGURACIONES:');
    
    const voiceMapping = {
      'es-ES-LolaNeural': 'lola',
      'es-ES-DarioNeural': 'dario',
      'en-US-LolaMultilingualNeural': 'lola'
    };
    
    let corrected = 0;
    
    for (const client of clients) {
      const currentVoice = client.callConfig?.voiceId;
      
      console.log(`\n   Cliente: ${client.companyName} (ID: ${client.id})`);
      console.log(`   - Voz actual: "${currentVoice}"`);
      
      if (currentVoice && voiceMapping[currentVoice]) {
        const correctVoice = voiceMapping[currentVoice];
        console.log(`   - ⚠️ Voz incorrecta detectada`);
        console.log(`   - 🔧 Corrigiendo: "${currentVoice}" → "${correctVoice}"`);
        
        // Actualizar configuración
        const updatedCallConfig = {
          ...client.callConfig,
          voiceId: correctVoice
        };
        
        await prisma.client.update({
          where: { id: client.id },
          data: {
            callConfig: updatedCallConfig
          }
        });
        
        console.log(`   - ✅ Configuración actualizada`);
        corrected++;
        
      } else if (currentVoice === 'lola' || currentVoice === 'dario') {
        console.log(`   - ✅ Voz correcta: "${currentVoice}"`);
      } else {
        console.log(`   - ⚠️ Voz desconocida: "${currentVoice}" - estableciendo "lola" por defecto`);
        
        const updatedCallConfig = {
          ...client.callConfig,
          voiceId: 'lola'
        };
        
        await prisma.client.update({
          where: { id: client.id },
          data: {
            callConfig: updatedCallConfig
          }
        });
        
        console.log(`   - ✅ Establecida voz por defecto: "lola"`);
        corrected++;
      }
    }
    
    // 3. Verificar correcciones
    console.log('\n3. VERIFICANDO CORRECCIONES:');
    
    const updatedClients = await prisma.client.findMany({
      where: {
        callConfig: {
          not: undefined
        }
      },
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });
    
    console.log(`\n   Configuraciones después de la corrección:`);
    updatedClients.forEach(client => {
      const voice = client.callConfig?.voiceId;
      const greeting = client.callConfig?.greeting;
      console.log(`   - ${client.companyName}: voz="${voice}", saludo="${greeting?.substring(0, 50)}..."`);
    });
    
    console.log(`\n✅ CORRECCIÓN COMPLETADA:`);
    console.log(`   - Clientes corregidos: ${corrected}`);
    console.log(`   - Total clientes: ${clients.length}`);
    console.log(`   - Todas las voces ahora son: "lola" o "dario"`);
    
  } catch (error) {
    console.error(`❌ Error corrigiendo configuraciones: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar corrección
fixUserVoiceConfig().then(() => {
  console.log('\n🏁 Corrección de configuraciones completada');
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Corrección falló: ${error.message}`);
  process.exit(1);
});
