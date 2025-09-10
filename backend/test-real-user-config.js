const azureTTSSimple = require('./src/services/azureTTSSimple');
const { PrismaClient } = require('@prisma/client');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const prisma = new PrismaClient();

async function testRealUserConfig() {
  console.log('🔍 TEST: Configuración REAL del usuario desde base de datos');
  console.log('========================================================');
  
  try {
    // 1. Buscar un cliente real en la base de datos
    console.log('\n1. CONSULTANDO BASE DE DATOS:');
    
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
      },
      take: 5
    });
    
    console.log(`   - Clientes encontrados: ${clients.length}`);
    
    if (clients.length === 0) {
      console.log('❌ No se encontraron clientes con configuración de llamadas');
      return;
    }
    
    // 2. Mostrar configuraciones disponibles
    console.log('\n2. CONFIGURACIONES DISPONIBLES:');
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.companyName} (ID: ${client.id})`);
      console.log(`      - Saludo: "${client.callConfig?.greeting || 'No configurado'}"`);
      console.log(`      - Voz: "${client.callConfig?.voiceId || 'No configurada'}"`);
      console.log(`      - Habilitado: ${client.callConfig?.enabled ? '✅' : '❌'}`);
    });
    
    // 3. Usar el primer cliente con configuración completa
    const selectedClient = clients.find(c => 
      c.callConfig?.greeting && c.callConfig?.voiceId
    ) || clients[0];
    
    console.log(`\n3. CLIENTE SELECCIONADO: ${selectedClient.companyName}`);
    console.log(`   - ID: ${selectedClient.id}`);
    console.log(`   - Saludo: "${selectedClient.callConfig?.greeting || 'Saludo por defecto'}"`);
    console.log(`   - Voz: "${selectedClient.callConfig?.voiceId || 'lola'}"`);
    
    // 4. Generar audio con configuración real
    console.log('\n4. GENERANDO AUDIO CON CONFIGURACIÓN REAL:');
    
    const greeting = selectedClient.callConfig?.greeting || 'Hola, gracias por llamar. ¿En qué puedo ayudarte?';
    const voiceId = selectedClient.callConfig?.voiceId || 'lola';
    
    console.log(`   - Texto: "${greeting}"`);
    console.log(`   - Voz solicitada: "${voiceId}"`);
    
    const startTime = Date.now();
    const ttsResult = await azureTTSSimple.generateSpeech(greeting, voiceId);
    const duration = Date.now() - startTime;
    
    console.log(`   - Tiempo generación: ${duration}ms`);
    console.log(`   - Success: ${ttsResult?.success}`);
    console.log(`   - Audio buffer size: ${ttsResult?.audioBuffer?.length || 0} bytes`);
    console.log(`   - Error: ${ttsResult?.error || 'Ninguno'}`);
    
    if (!ttsResult?.success || !ttsResult?.audioBuffer) {
      console.log('❌ Azure TTS falló con configuración real del usuario');
      return;
    }
    
    // 5. Guardar y reproducir audio
    console.log('\n5. GUARDANDO Y REPRODUCIENDO AUDIO:');
    const audioPath = path.join(__dirname, 'test-real-user-audio.wav');
    
    fs.writeFileSync(audioPath, ttsResult.audioBuffer);
    console.log(`   - Archivo guardado: ${audioPath}`);
    console.log(`   - Tamaño: ${fs.statSync(audioPath).size} bytes`);
    
    // 6. Reproducir audio
    console.log('\n6. REPRODUCIENDO AUDIO REAL DEL USUARIO:');
    console.log('   - Reproduciendo con afplay...');
    
    return new Promise((resolve) => {
      exec(`afplay "${audioPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.log(`   - ❌ Error reproduciendo: ${error.message}`);
          console.log('   - 💡 Puedes reproducir manualmente: test-real-user-audio.wav');
        } else {
          console.log('   - ✅ Audio reproducido exitosamente');
        }
        
        console.log('\n7. VERIFICACIÓN FINAL:');
        console.log(`   - ✅ Configuración leída desde DB: ${selectedClient.companyName}`);
        console.log(`   - ✅ Saludo personalizado: "${greeting.substring(0, 50)}..."`);
        console.log(`   - ✅ Voz configurada: ${voiceId}`);
        console.log(`   - ✅ Audio generado: ${ttsResult.audioBuffer.length} bytes`);
        
        console.log('\n🎯 RESULTADO:');
        console.log('   - Este es exactamente el audio que se reproduciría en producción');
        console.log('   - Usa la configuración REAL del usuario desde la base de datos');
        console.log('   - El saludo y la voz son los configurados por el cliente');
        
        resolve();
      });
    });
    
  } catch (error) {
    console.error(`❌ Error en test: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar test
testRealUserConfig().then(() => {
  console.log('\n🏁 Test con configuración real completado');
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Test falló: ${error.message}`);
  process.exit(1);
});
