require('dotenv').config();
const sdk = require('microsoft-cognitiveservices-speech-sdk');

console.log('🔍 Testing Azure TTS connection...');
console.log(`Key: ${process.env.AZURE_SPEECH_KEY ? 'CONFIGURED' : 'MISSING'}`);
console.log(`Region: ${process.env.AZURE_SPEECH_REGION}`);

async function testAzureConnection() {
  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY, 
      process.env.AZURE_SPEECH_REGION
    );
    
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;
    speechConfig.speechSynthesisVoiceName = 'en-US-LolaMultilingualNeural';
    speechConfig.speechSynthesisLanguage = 'es-ES';
    
    console.log('✅ SpeechConfig created successfully');
    
    // Test with null AudioConfig (memory output)
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
    console.log('✅ SpeechSynthesizer created successfully');
    
    const testText = "Hola, esto es una prueba";
    console.log(`🎵 Testing synthesis with: "${testText}"`);
    
    const startTime = Date.now();
    
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⏰ TIMEOUT after 15 seconds');
        synthesizer.close();
        reject(new Error('Timeout'));
      }, 15000);
      
      synthesizer.speakTextAsync(
        testText,
        (result) => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          console.log(`✅ Synthesis completed in ${duration}ms`);
          console.log(`Result reason: ${result.reason}`);
          console.log(`Audio data length: ${result.audioData ? result.audioData.byteLength : 0} bytes`);
          synthesizer.close();
          resolve(result);
        },
        (error) => {
          clearTimeout(timeout);
          console.log(`❌ Synthesis error: ${error}`);
          synthesizer.close();
          reject(error);
        }
      );
    });
    
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log('🎉 SUCCESS: Azure TTS is working correctly!');
    } else {
      console.log('❌ FAILED: Synthesis did not complete successfully');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testAzureConnection();
