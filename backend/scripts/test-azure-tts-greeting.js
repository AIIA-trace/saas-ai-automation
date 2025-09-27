/**
 * Script para probar Azure TTS con el saludo configurado
 */

const azureTTSRestService = require('../src/services/azureTTSRestService');
const fs = require('fs');

async function testAzureTTSGreeting() {
    console.log('🔊 Probando Azure TTS con el saludo configurado...');
    
    try {
        
        // Texto del saludo desde la base de datos
        const greeting = "Hola, soy el asistente virtual de Comercial Intacon. ¿En qué puedo ayudarte hoy?";
        const voiceId = 'es-ES-IsidoraMultilingualNeural';
        const format = 'raw-8khz-8bit-mono-mulaw';
        
        console.log(`📝 Texto: "${greeting}"`);
        console.log(`🎵 Voz: ${voiceId}`);
        console.log(`🔧 Formato: ${format}`);
        
        // Usar texto simple sin SSML para la prueba
        const humanizedGreeting = greeting;
        
        console.log('\n🎭 Texto humanizado con SSML:');
        console.log(humanizedGreeting);
        
        console.log('\n🔄 Iniciando Azure TTS...');
        const startTime = Date.now();
        
        const result = await azureTTSRestService.generateSpeech(
            humanizedGreeting,
            voiceId,
            format
        );
        
        const duration = Date.now() - startTime;
        console.log(`⏱️ Tiempo de generación: ${duration}ms`);
        
        if (result.success) {
            console.log('✅ TTS exitoso');
            console.log(`📊 Tamaño del audio: ${result.audioBuffer.length} bytes`);
            
            // Guardar archivo de prueba
            const fileName = `test_greeting_${Date.now()}.wav`;
            fs.writeFileSync(fileName, result.audioBuffer);
            console.log(`💾 Audio guardado en: ${fileName}`);
            
            // Calcular duración estimada
            const estimatedDuration = Math.max(2000, (result.audioBuffer.length / 8) + 1000);
            console.log(`🕐 Duración estimada: ${estimatedDuration}ms`);
            
        } else {
            console.log('❌ TTS falló');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error(error.stack);
    }
}

// Ejecutar prueba
testAzureTTSGreeting();
