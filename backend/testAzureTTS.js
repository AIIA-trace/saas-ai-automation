const tts = require('./src/services/azureTTSRestService');
const fs = require('fs');

async function test() {
  const result = await tts.generateSpeech(
    "Texto de prueba para verificar el servicio TTS",
    "es-ES-DarioNeural",
    "raw-8khz-8bit-mono-mulaw"
  );
  
  if (result.success) {
    fs.writeFileSync('test.wav', result.audioBuffer);
    console.log("✅ Audio guardado en test.wav");
  } else {
    console.error("❌ Error:", result.error);
  }
}

test();
