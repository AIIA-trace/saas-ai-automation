/**
 * Test script to verify voice mapping fix
 */

// Simulate the voice mapping object
const voiceMapping = {
  'lola': 'en-US-LolaMultilingualNeural',
  'dario': 'es-ES-DarioNeural'
};

function mapVoiceToAzure(voiceId, language = 'es-ES') {
  if (!voiceId) {
    return 'es-ES-DarioNeural'; // Default fallback
  }

  // Convert to lowercase for case-insensitive matching
  const normalizedVoiceId = voiceId.toLowerCase();
  
  // Check if it's already a valid Azure voice format (contains language code)
  if (normalizedVoiceId.includes('-') && normalizedVoiceId.includes('neural')) {
    console.log(`🎵 Voice already in Azure format: ${voiceId}`);
    return voiceId;
  }
  
  // Map user-friendly name to Azure voice
  const mappedVoice = voiceMapping[normalizedVoiceId];
  if (mappedVoice) {
    console.log(`🎵 Voice mapped: "${voiceId}" → "${mappedVoice}"`);
    return mappedVoice;
  }
  
  // If no mapping found, default to Dario
  console.warn(`⚠️ No mapping found for voice "${voiceId}", using default: es-ES-DarioNeural`);
  return 'es-ES-DarioNeural';
}

// Test cases
console.log('=== TESTING VOICE MAPPING FIX ===\n');

console.log('Test 1: lola voice mapping');
const lolaResult = mapVoiceToAzure('lola');
console.log(`Result: ${lolaResult}`);
console.log(`Expected: en-US-LolaMultilingualNeural`);
console.log(`✅ PASS: ${lolaResult === 'en-US-LolaMultilingualNeural'}\n`);

console.log('Test 2: dario voice mapping');
const darioResult = mapVoiceToAzure('dario');
console.log(`Result: ${darioResult}`);
console.log(`Expected: es-ES-DarioNeural`);
console.log(`✅ PASS: ${darioResult === 'es-ES-DarioNeural'}\n`);

console.log('Test 3: case insensitive - LOLA');
const lolaUpperResult = mapVoiceToAzure('LOLA');
console.log(`Result: ${lolaUpperResult}`);
console.log(`Expected: en-US-LolaMultilingualNeural`);
console.log(`✅ PASS: ${lolaUpperResult === 'en-US-LolaMultilingualNeural'}\n`);

console.log('Test 4: unknown voice fallback');
const unknownResult = mapVoiceToAzure('unknown');
console.log(`Result: ${unknownResult}`);
console.log(`Expected: es-ES-DarioNeural`);
console.log(`✅ PASS: ${unknownResult === 'es-ES-DarioNeural'}\n`);

console.log('Test 5: empty voice fallback');
const emptyResult = mapVoiceToAzure('');
console.log(`Result: ${emptyResult}`);
console.log(`Expected: es-ES-DarioNeural`);
console.log(`✅ PASS: ${emptyResult === 'es-ES-DarioNeural'}\n`);

console.log('=== ALL TESTS COMPLETED ===');
