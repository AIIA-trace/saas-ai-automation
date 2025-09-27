/**
 * Simple test to verify transcription activation logic
 */

const TwilioStreamHandler = require('./src/websocket/twilioStreamHandler');
const { PrismaClient } = require('@prisma/client');
const azureTTSRestService = require('./src/services/azureTTSRestService');

// Mock WebSocket
const mockWs = {
  send: (data) => {
    console.log('📤 Mock WS Send:', JSON.parse(data).event);
  },
  readyState: 1, // OPEN
  OPEN: 1
};

async function testTranscriptionActivation() {
  console.log('🧪 Testing transcription activation logic...');
  
  try {
    // Initialize services
    const prisma = new PrismaClient();
    const handler = new TwilioStreamHandler(prisma, azureTTSRestService);
    
    const testStreamSid = 'test_stream_' + Date.now();
    const testCallSid = 'test_call_' + Date.now();
    
    console.log(`📞 Stream SID: ${testStreamSid}`);
    
    // Test 1: Check initial transcription state
    console.log('\n🔍 Test 1: Initial transcription state');
    const initialState = handler.transcriptionActive.get(testStreamSid);
    console.log(`Initial transcription state: ${initialState}`);
    
    // Test 2: Simulate stream start
    console.log('\n🔍 Test 2: Simulating stream start');
    await handler.handleStreamStart(mockWs, {
      start: {
        streamSid: testStreamSid,
        callSid: testCallSid,
        accountSid: 'test_account'
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
      
      // Cleanup
      handler.cleanup(testStreamSid);
      prisma.$disconnect();
      
    }, 3500);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testTranscriptionActivation();
