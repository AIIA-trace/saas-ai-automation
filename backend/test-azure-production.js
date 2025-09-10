const azureTTSSimple = require('./src/services/azureTTSSimple');
const logger = require('./src/utils/logger');

async function testAzureProductionVsLocal() {
  console.log('🔍 COMPARACIÓN AZURE TTS: PRODUCCIÓN vs LOCAL');
  console.log('================================================');
  
  try {
    // 1. Verificar credenciales
    console.log('\n1. VERIFICACIÓN DE CREDENCIALES:');
    console.log(`AZURE_SPEECH_KEY: ${process.env.AZURE_SPEECH_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
    console.log(`AZURE_SPEECH_REGION: ${process.env.AZURE_SPEECH_REGION || 'NO CONFIGURADA'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NO CONFIGURADA'}`);
    
    if (process.env.AZURE_SPEECH_KEY) {
      console.log(`Key preview: ${process.env.AZURE_SPEECH_KEY.substring(0, 8)}...`);
    }
    
    // 2. Test básico de Azure TTS
    console.log('\n2. TEST BÁSICO AZURE TTS:');
    const testText = "Hola, este es un test de Azure TTS en producción";
    
    console.log(`Generando audio para: "${testText}"`);
    const startTime = Date.now();
    
    const result = await azureTTSSimple.generateSpeech(testText, 'lola');
    const duration = Date.now() - startTime;
    
    console.log(`Tiempo de generación: ${duration}ms`);
    console.log(`Resultado success: ${result?.success}`);
    console.log(`Audio buffer length: ${result?.audioBuffer?.length || 0} bytes`);
    console.log(`Error: ${result?.error || 'Ninguno'}`);
    
    // 3. Test con diferentes voces (usando nombres oficiales Azure)
    console.log('\n3. TEST CON DIFERENTES VOCES:');
    const voices = ['lola', 'dario']; // Ambas voces oficiales
    
    for (const voice of voices) {
      try {
        console.log(`\nTesting voz: ${voice}`);
        const voiceResult = await azureTTSSimple.generateSpeech("Test de voz", voice);
        console.log(`  - Success: ${voiceResult?.success}`);
        console.log(`  - Audio size: ${voiceResult?.audioBuffer?.length || 0} bytes`);
        console.log(`  - Error: ${voiceResult?.error || 'Ninguno'}`);
      } catch (error) {
        console.log(`  - ERROR: ${error.message}`);
      }
    }
    
    // 4. Test de conectividad directa
    console.log('\n4. TEST DE CONECTIVIDAD AZURE:');
    try {
      const https = require('https');
      const testUrl = `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      const connectTest = new Promise((resolve, reject) => {
        const req = https.request(testUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
            'Content-Type': 'application/ssml+xml',
            'User-Agent': 'NodeJS-TTS-Client'
          },
          timeout: 5000
        }, (res) => {
          console.log(`Status de conectividad: ${res.statusCode}`);
          resolve(res.statusCode);
        });
        
        req.on('error', (error) => {
          console.log(`Error de conectividad: ${error.message}`);
          reject(error);
        });
        
        req.on('timeout', () => {
          console.log('Timeout de conectividad');
          req.destroy();
          reject(new Error('Timeout'));
        });
        
        req.write('<speak version="1.0" xml:lang="es-ES"><voice xml:lang="es-ES" xml:gender="Female" name="es-ES-LolaNeural">Test</voice></speak>');
        req.end();
      });
      
      await connectTest;
      
    } catch (error) {
      console.log(`Error en test de conectividad: ${error.message}`);
    }
    
    // 5. Comparación de configuración
    console.log('\n5. CONFIGURACIÓN ACTUAL:');
    console.log(`Región Azure: ${process.env.AZURE_SPEECH_REGION}`);
    console.log(`Render URL: ${process.env.RENDER_EXTERNAL_URL || 'No configurada'}`);
    console.log(`Puerto: ${process.env.PORT || 'No configurado'}`);
    
  } catch (error) {
    console.error(`❌ Error en test: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

// Ejecutar test
testAzureProductionVsLocal().then(() => {
  console.log('\n✅ Test completado');
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Test falló: ${error.message}`);
  process.exit(1);
});
