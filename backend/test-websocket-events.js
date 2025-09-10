// Script para simular y probar eventos WebSocket de Twilio
const WebSocket = require('ws');

console.log('🔍 Testing WebSocket events simulation...');

// Simular los eventos que Twilio debería enviar
const simulatedEvents = [
  {
    event: 'connected',
    protocol: 'Call',
    version: '1.0.0'
  },
  {
    event: 'start',
    sequenceNumber: '1',
    start: {
      streamSid: 'test_stream_123',
      callSid: 'test_call_456',
      customParameters: {
        clientId: '1',
        companyName: 'Test Company',
        greeting: 'Hola, gracias por llamar a Test Company',
        voiceId: 'lola'
      }
    }
  },
  {
    event: 'media',
    sequenceNumber: '2',
    media: {
      track: 'inbound',
      chunk: '1',
      timestamp: '1000',
      payload: 'dGVzdCBhdWRpbw==' // "test audio" en base64
    }
  }
];

console.log('📋 Eventos simulados:');
simulatedEvents.forEach((event, index) => {
  console.log(`${index + 1}. ${event.event}`);
  if (event.event === 'start') {
    console.log(`   - StreamSid: ${event.start.streamSid}`);
    console.log(`   - CallSid: ${event.start.callSid}`);
    console.log(`   - ClientId: ${event.start.customParameters.clientId}`);
  }
});

console.log('\n🎯 Para probar en producción, necesitamos ver estos eventos en los logs de Render.');
console.log('💡 Si no aparecen, el problema está en la configuración del TwiML Stream.');
