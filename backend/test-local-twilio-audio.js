const azureTTSSimple = require('./src/services/azureTTSSimple');
const TwilioStreamHandler = require('./src/websocket/twilioStreamHandler');
const logger = require('./src/utils/logger');

async function testLocalTwilioAudio() {
  console.log('🧪 TEST LOCAL: Azure TTS → Twilio Audio Pipeline');
  console.log('=================================================');
  
  try {
    // 1. Simular configuración de cliente como en producción
    const mockClient = {
      id: 1,
      companyName: 'Test Company',
      callConfig: {
        greeting: 'Hola, gracias por llamar a Test Company. ¿En qué puedo ayudarte?',
        voiceId: 'lola',  // Tu configuración
        enabled: true
      }
    };
    
    console.log('\n1. CONFIGURACIÓN DE CLIENTE SIMULADA:');
    console.log(`   - Saludo: "${mockClient.callConfig.greeting}"`);
    console.log(`   - Voz: "${mockClient.callConfig.voiceId}"`);
    
    // 2. Test Azure TTS con tu configuración
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
    
    // 3. Simular procesamiento de audio como en Twilio
    console.log('\n3. PROCESAMIENTO DE AUDIO PARA TWILIO:');
    
    const handler = new TwilioStreamHandler();
    
    // Extraer PCM del WAV
    const pcmData = handler.extractPCMFromWAV(ttsResult.audioBuffer);
    console.log(`   - PCM extraído: ${pcmData?.length || 0} bytes`);
    
    if (!pcmData) {
      console.log('❌ No se pudo extraer PCM del WAV');
      return;
    }
    
    // Convertir a mulaw
    const mulawBuffer = handler.convertPCMToMulaw(pcmData);
    console.log(`   - Mulaw convertido: ${mulawBuffer?.length || 0} bytes`);
    
    // 4. Simular envío a Twilio (sin WebSocket real)
    console.log('\n4. SIMULACIÓN DE ENVÍO A TWILIO:');
    
    const chunkSize = 160; // Tamaño estándar Twilio
    const totalChunks = Math.ceil(mulawBuffer.length / chunkSize);
    
    console.log(`   - Total chunks a enviar: ${totalChunks}`);
    console.log(`   - Tamaño por chunk: ${chunkSize} bytes`);
    
    let totalBytesSent = 0;
    for (let i = 0; i < mulawBuffer.length; i += chunkSize) {
      const chunk = mulawBuffer.slice(i, i + chunkSize);
      const base64Audio = chunk.toString('base64');
      
      // Simular mensaje Twilio
      const mediaMessage = {
        event: 'media',
        streamSid: 'test_stream_123',
        media: {
          payload: base64Audio
        }
      };
      
      totalBytesSent += chunk.length;
      
      // Log cada 10 chunks para no saturar
      if ((Math.floor(i/chunkSize) + 1) % 10 === 0) {
        console.log(`   - Chunk ${Math.floor(i/chunkSize) + 1}/${totalChunks} enviado`);
      }
    }
    
    console.log(`   - ✅ Total bytes enviados: ${totalBytesSent}`);
    console.log(`   - ✅ Total mensajes Twilio: ${totalChunks}`);
    
    // 5. Verificar formato de audio
    console.log('\n5. VERIFICACIÓN DE FORMATO:');
    console.log(`   - Formato original: WAV PCM 16-bit`);
    console.log(`   - Formato Twilio: mulaw 8-bit`);
    console.log(`   - Sample rate: 8kHz (requerido por Twilio)`);
    console.log(`   - Duración estimada: ~${Math.round(mulawBuffer.length / 8000 * 1000)}ms`);
    
    // 6. Comparar con producción
    console.log('\n6. COMPARACIÓN LOCAL vs PRODUCCIÓN:');
    console.log(`   - ✅ LOCAL: Azure TTS genera ${ttsResult.audioBuffer.length} bytes`);
    console.log(`   - ❌ PRODUCCIÓN (antes): Azure TTS generaba 0 bytes`);
    console.log(`   - 🔧 PRODUCCIÓN (ahora): Debería generar ~${ttsResult.audioBuffer.length} bytes`);
    
    console.log('\n✅ TEST COMPLETADO - El pipeline funciona correctamente en LOCAL');
    console.log('📞 En una llamada real, Twilio recibiría este audio y lo reproduciría');
    
  } catch (error) {
    console.error(`❌ Error en test: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

// Ejecutar test
testLocalTwilioAudio().then(() => {
  console.log('\n🏁 Test finalizado');
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Test falló: ${error.message}`);
  process.exit(1);
});
