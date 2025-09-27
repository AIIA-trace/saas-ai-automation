/**
 * Test script to verify transcription activation after initial greeting
 */

const WebSocket = require('ws');

// Test configuration
const WS_URL = 'ws://localhost:10000/websocket/twilio-stream';
const TEST_STREAM_SID = 'test_stream_' + Date.now();
const TEST_CALL_SID = 'test_call_' + Date.now();

console.log('🧪 Iniciando test de activación de transcripción...');
console.log(`📞 Stream SID: ${TEST_STREAM_SID}`);
console.log(`📞 Call SID: ${TEST_CALL_SID}`);

// Create WebSocket connection
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket conectado');
  
  // Send start event to simulate Twilio stream start
  const startEvent = {
    event: 'start',
    start: {
      streamSid: TEST_STREAM_SID,
      callSid: TEST_CALL_SID,
      accountSid: 'test_account',
      tracks: ['inbound', 'outbound'],
      mediaFormat: {
        encoding: 'audio/x-mulaw',
        sampleRate: 8000,
        channels: 1
      }
    },
    sequenceNumber: 1
  };
  
  console.log('📤 Enviando evento start...');
  ws.send(JSON.stringify(startEvent));
  
  // Wait for greeting and transcription activation
  setTimeout(() => {
    console.log('🎤 Simulando audio del usuario después del saludo...');
    
    // Send media event to simulate user audio
    const mediaEvent = {
      event: 'media',
      streamSid: TEST_STREAM_SID,
      sequenceNumber: 2,
      media: {
        track: 'inbound',
        chunk: '1',
        timestamp: Date.now().toString(),
        payload: Buffer.alloc(160, 0x80).toString('base64') // Simulated mulaw audio
      }
    };
    
    ws.send(JSON.stringify(mediaEvent));
    
    // Send another chunk after a small delay
    setTimeout(() => {
      mediaEvent.sequenceNumber = 3;
      mediaEvent.media.chunk = '2';
      mediaEvent.media.timestamp = Date.now().toString();
      ws.send(JSON.stringify(mediaEvent));
      
      // Close connection after test
      setTimeout(() => {
        console.log('🛑 Cerrando conexión de test...');
        ws.close();
      }, 2000);
      
    }, 1000);
    
  }, 5000); // Wait 5 seconds for greeting to complete and transcription to activate
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Mensaje recibido:', message);
  } catch (error) {
    console.log('📨 Mensaje recibido (raw):', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ Error WebSocket:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket desconectado');
  console.log('✅ Test completado');
  process.exit(0);
});

// Timeout safety
setTimeout(() => {
  console.log('⏰ Timeout del test - cerrando...');
  ws.close();
  process.exit(1);
}, 15000);
