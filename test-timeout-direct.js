// Test directo del mecanismo setTimeout para verificar si funciona correctamente
console.log('🧪 Iniciando test directo de setTimeout...');

// Simular el mismo patrón que usa el código real
const activeStreams = new Map();
const streamSid = 'test_timeout_stream_123';

// Simular datos del stream
const streamData = {
    conversationTurn: 'speaking',
    botSpeaking: true,
    greetingSent: false
};

activeStreams.set(streamSid, streamData);

console.log(`⏰ [${streamSid}] Estado inicial: conversationTurn = ${streamData.conversationTurn}`);
console.log(`⏰ [${streamSid}] Programando timeout de 3 segundos para activar listening...`);

const timeoutId = setTimeout(() => {
    console.log(`⏰ [${streamSid}] TIMEOUT EJECUTÁNDOSE - verificando stream activo...`);
    
    if (activeStreams.has(streamSid)) {
        const currentStreamData = activeStreams.get(streamSid);
        console.log(`✅ [${streamSid}] Stream encontrado, cambiando estado: ${currentStreamData.conversationTurn} → listening`);
        
        currentStreamData.conversationTurn = 'listening';
        currentStreamData.botSpeaking = false;
        console.log(`👂 [${streamSid}] Activando escucha del usuario después del saludo`);
        console.log(`✅ [${streamSid}] Estado final: conversationTurn = ${currentStreamData.conversationTurn}`);
        
        console.log('🎉 TIMEOUT EJECUTADO CORRECTAMENTE - El mecanismo setTimeout funciona');
        
    } else {
        console.log(`❌ [${streamSid}] TIMEOUT FALLÓ - Stream no encontrado en activeStreams`);
    }
}, 3000);

console.log(`⏰ [${streamSid}] Timeout programado con ID: ${timeoutId}`);

// Verificar que el timeout se ejecute
setTimeout(() => {
    console.log('🔍 Verificando estado después de 4 segundos...');
    const finalState = activeStreams.get(streamSid);
    if (finalState && finalState.conversationTurn === 'listening') {
        console.log('✅ SUCCESS: El timeout se ejecutó y cambió el estado correctamente');
    } else {
        console.log('❌ FAILURE: El timeout no se ejecutó o no cambió el estado');
        console.log('Estado actual:', finalState);
    }
    process.exit(0);
}, 4000);
