// Test rápido para verificar variables de entorno
require('dotenv').config();

console.log('🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO');
console.log('=====================================');
console.log('AZURE_SPEECH_KEY:', process.env.AZURE_SPEECH_KEY ? `CONFIGURADA (${process.env.AZURE_SPEECH_KEY.substring(0,8)}...)` : 'NO CONFIGURADA');
console.log('AZURE_SPEECH_REGION:', process.env.AZURE_SPEECH_REGION || 'NO CONFIGURADA');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `CONFIGURADA (${process.env.OPENAI_API_KEY.substring(0,8)}...)` : 'NO CONFIGURADA');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `CONFIGURADA (${process.env.TWILIO_ACCOUNT_SID.substring(0,8)}...)` : 'NO CONFIGURADA');

// Test Azure TTS Simple
const AzureTTSSimple = require('./src/services/azureTTSSimple');
const azureTTS = new AzureTTSSimple();

console.log('\n🎤 VERIFICACIÓN AZURE TTS SERVICE');
console.log('=================================');
console.log('Subscription Key:', azureTTS.subscriptionKey ? `CONFIGURADA (${azureTTS.subscriptionKey.substring(0,8)}...)` : 'NO CONFIGURADA');
console.log('Region:', azureTTS.region);
