const { execSync } = require('child_process');

try {
  // Obtener el commit actual
  const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const shortCommit = currentCommit.substring(0, 7);
  
  console.log('=== DEPLOYMENT CHECK ===');
  console.log(`Current commit: ${shortCommit}`);
  console.log(`Full commit: ${currentCommit}`);
  console.log(`Expected: 3656846 (debugging extensivo)`);
  console.log(`Match: ${shortCommit === '3656846' ? 'YES' : 'NO'}`);
  
  // Verificar que los archivos modificados existen
  const fs = require('fs');
  const azureTTSPath = './src/services/azureTTSService.js';
  const twilioHandlerPath = './src/websocket/twilioStreamHandler.js';
  
  if (fs.existsSync(azureTTSPath)) {
    const azureContent = fs.readFileSync(azureTTSPath, 'utf8');
    const hasDebugging = azureContent.includes('AUDIO FLOW DEBUG');
    console.log(`Azure TTS debugging: ${hasDebugging ? 'YES' : 'NO'}`);
  }
  
  if (fs.existsSync(twilioHandlerPath)) {
    const twilioContent = fs.readFileSync(twilioHandlerPath, 'utf8');
    const hasDebugging = twilioContent.includes('TWILIO DEBUG');
    console.log(`Twilio debugging: ${hasDebugging ? 'YES' : 'NO'}`);
  }
  
  console.log('========================');
  
} catch (error) {
  console.error('Error checking deployment:', error.message);
}
