const ttsService = require('./src/services/azureTTSService');

async function testAzureTTS() {
  try {
    console.log('🚀 Probando Azure TTS localmente...');
    
    // Usamos la instancia exportada directamente
    const result = await ttsService.generateSpeech("Hola, esto es una prueba de audio", "neutral");
    
    if (result.success) {
      console.log(`✅ Audio generado correctamente: ${result.audioBuffer?.length || 0} bytes`);
      console.log(`ℹ️ Si el tamaño es >0, Azure TTS funciona localmente`);
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testAzureTTS();
