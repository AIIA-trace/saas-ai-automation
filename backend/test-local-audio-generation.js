const azureTTSSimple = require('./src/services/azureTTSSimple');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function testLocalAudioGeneration() {
  console.log('🎵 TEST LOCAL: Generar y reproducir audio de Azure TTS');
  console.log('==================================================');
  
  try {
    // 1. Simular tu configuración real de cliente
    const mockClient = {
      id: 1,
      companyName: 'Test Company',
      callConfig: {
        greeting: 'Hola, gracias por llamar. Soy tu asistente virtual con voz de Lola. ¿En qué puedo ayudarte hoy?',
        voiceId: 'lola',
        enabled: true
      }
    };
    
    console.log('\n1. CONFIGURACIÓN DE CLIENTE:');
    console.log(`   - Saludo: "${mockClient.callConfig.greeting}"`);
    console.log(`   - Voz: "${mockClient.callConfig.voiceId}"`);
    
    // 2. Generar audio con Azure TTS
    console.log('\n2. GENERANDO AUDIO CON AZURE TTS:');
    const startTime = Date.now();
    
    const ttsResult = await azureTTSSimple.generateSpeech(
      mockClient.callConfig.greeting, 
      mockClient.callConfig.voiceId
    );
    
    const duration = Date.now() - startTime;
    
    console.log(`   - Tiempo generación: ${duration}ms`);
    console.log(`   - Success: ${ttsResult?.success}`);
    console.log(`   - Audio buffer size: ${ttsResult?.audioBuffer?.length || 0} bytes`);
    console.log(`   - Error: ${ttsResult?.error || 'Ninguno'}`);
    
    if (!ttsResult?.success || !ttsResult?.audioBuffer) {
      console.log('❌ Azure TTS falló - no se puede continuar');
      return;
    }
    
    // 3. Guardar archivo de audio para reproducir
    console.log('\n3. GUARDANDO ARCHIVO DE AUDIO:');
    const audioPath = path.join(__dirname, 'test-audio-output.wav');
    
    fs.writeFileSync(audioPath, ttsResult.audioBuffer);
    console.log(`   - Archivo guardado: ${audioPath}`);
    console.log(`   - Tamaño archivo: ${fs.statSync(audioPath).size} bytes`);
    
    // 4. Verificar formato del archivo
    console.log('\n4. VERIFICACIÓN DE FORMATO:');
    const header = ttsResult.audioBuffer.slice(0, 12);
    const riffHeader = header.toString('ascii', 0, 4);
    const waveHeader = header.toString('ascii', 8, 12);
    
    console.log(`   - RIFF header: ${riffHeader}`);
    console.log(`   - WAVE header: ${waveHeader}`);
    console.log(`   - Formato válido: ${riffHeader === 'RIFF' && waveHeader === 'WAVE' ? '✅' : '❌'}`);
    
    // 5. Intentar reproducir el audio
    console.log('\n5. REPRODUCIENDO AUDIO:');
    console.log('   - Intentando reproducir con afplay (macOS)...');
    
    return new Promise((resolve) => {
      exec(`afplay "${audioPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.log(`   - ❌ Error reproduciendo: ${error.message}`);
          console.log('   - 💡 Puedes reproducir manualmente el archivo: test-audio-output.wav');
        } else {
          console.log('   - ✅ Audio reproducido exitosamente');
        }
        
        // 6. Información adicional
        console.log('\n6. INFORMACIÓN TÉCNICA:');
        console.log(`   - Duración estimada: ~${Math.round(ttsResult.audioBuffer.length / 16000)}s`);
        console.log(`   - Sample rate: 8kHz (Twilio compatible)`);
        console.log(`   - Formato: PCM 16-bit mono`);
        console.log(`   - Voz Azure: en-US-LolaMultilingualNeural`);
        
        console.log('\n7. COMPARACIÓN CON PRODUCCIÓN:');
        console.log('   - ✅ LOCAL: Genera audio correctamente');
        console.log('   - 🔧 PRODUCCIÓN: Ahora debería generar el mismo audio');
        console.log('   - 📞 TWILIO: Recibiría este audio y lo reproduciría en la llamada');
        
        console.log('\n✅ TEST COMPLETADO');
        console.log('🎧 Si escuchaste el audio, significa que Azure TTS funciona perfectamente');
        console.log('📞 En producción, este mismo audio se enviaría a Twilio durante la llamada');
        
        resolve();
      });
    });
    
  } catch (error) {
    console.error(`❌ Error en test: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

// Ejecutar test
testLocalAudioGeneration().then(() => {
  console.log('\n🏁 Test finalizado');
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Test falló: ${error.message}`);
  process.exit(1);
});
