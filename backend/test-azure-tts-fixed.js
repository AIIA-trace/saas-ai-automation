const ttsService = require('./src/services/azureTTSRestService');

async function testAzureTTS() {
  try {
    console.log('🚀 Probando Azure TTS localmente...');
    const result = await ttsService.generateSpeech("Hola, esto es una prueba", "es-ES-DarioNeural");
    
    if (result.success) {
      console.log(`✅ Audio generado: ${result.audioBuffer?.length} bytes`);
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testAzureTTS();
