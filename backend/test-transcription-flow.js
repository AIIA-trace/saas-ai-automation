/**
 * Complete test to verify transcription activation flow
 */

const TwilioStreamHandler = require('./src/websocket/twilioStreamHandler');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('./src/services/azureTTSRestService');

// Mock WebSocket
const mockWs = {
  send: (data) => {
    const parsed = JSON.parse(data);
    console.log(`📤 Mock WS Send: ${parsed.event} (${parsed.media ? 'audio chunk' : 'control'})`);
  },
  readyState: 1, // OPEN
  OPEN: 1
};

async function testCompleteTranscriptionFlow() {
  console.log('🧪 Testing complete transcription activation flow...');
  
  try {
    // Initialize services
    const prisma = new PrismaClient();
    const handler = new TwilioStreamHandler(prisma, azureTTSRestService);
    
    const testStreamSid = 'test_stream_' + Date.now();
    const testCallSid = 'test_call_' + Date.now();
    
    console.log(`📞 Stream SID: ${testStreamSid}`);
    
    // Test 1: Simulate stream connected event (initializes activeStreams)
    console.log('\n🔍 Test 1: Simulating stream connected');
    await handler.handleStreamConnected(mockWs, {
      connected: {
        protocol: 'websocket'
      }
    });
    
    // Test 2: Simulate stream start event (should trigger greeting and transcription activation)
    console.log('\n🔍 Test 2: Simulating stream start');
    await handler.handleStreamStart(mockWs, {
      start: {
        streamSid: testStreamSid,
        callSid: testCallSid,
        customParameters: {} // No clientId - should use default config
      }
    });
    
    // Check transcription state immediately after start
    const stateAfterStart = handler.transcriptionActive.get(testStreamSid);
    console.log(`Transcription state after start: ${stateAfterStart}`);
    
    // Test 3: Wait for transcription activation (should happen after 3 seconds)
    console.log('\n🔍 Test 3: Waiting for transcription activation...');
    
    setTimeout(() => {
      const stateAfterDelay = handler.transcriptionActive.get(testStreamSid);
      console.log(`Transcription state after 3.5s delay: ${stateAfterDelay}`);
      
      if (stateAfterDelay === true) {
        console.log('✅ SUCCESS: Transcription was activated after greeting!');
      } else {
        console.log('❌ FAIL: Transcription was not activated');
      }
      
      // Test 4: Simulate user audio input
      console.log('\n🔍 Test 4: Simulating user audio input');
      handler.handleMediaEvent(mockWs, {
        media: {
          track: 'inbound',
          chunk: '1',
          timestamp: Date.now().toString(),
          payload: Buffer.alloc(160, 0x80).toString('base64')
        },
        streamSid: testStreamSid,
        sequenceNumber: 1
      });
      
      // Cleanup
      setTimeout(() => {
        handler.cleanup(testStreamSid);
        prisma.$disconnect();
        console.log('\n✅ Test completed');
      }, 1000);
      
    }, 3500);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCompleteTranscriptionFlow();
