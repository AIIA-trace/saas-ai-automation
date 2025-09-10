/**
 * DEBUG: Verificar URL del WebSocket en producción
 */

console.log('🔍 DEBUG: URLs del WebSocket');
console.log('========================');

// Simular entorno de producción
process.env.NODE_ENV = 'production';

const StreamingTwiMLService = require('./src/services/streamingTwiMLService');
const service = new StreamingTwiMLService();

console.log('\n📋 VARIABLES DE ENTORNO:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL}`);

console.log('\n🔗 URL GENERADA:');
const wsUrl = service.getWebSocketUrl();
console.log(`WebSocket URL: ${wsUrl}`);

console.log('\n✅ URL ESPERADA EN RENDER:');
console.log('wss://saas-ai-automation.onrender.com/websocket/twilio-stream');

console.log('\n🎯 VERIFICACIONES:');
console.log(`¿URL usa WSS? ${wsUrl.startsWith('wss://') ? '✅' : '❌'}`);
console.log(`¿Dominio correcto? ${wsUrl.includes('saas-ai-automation.onrender.com') ? '✅' : '❌'}`);
console.log(`¿Ruta correcta? ${wsUrl.includes('/websocket/twilio-stream') ? '✅' : '❌'}`);

// Test de generación de TwiML
console.log('\n🧪 TEST DE TWIML:');
const testClient = {
  id: 1,
  companyName: 'Test Company',
  callConfig: {
    greeting: 'Hola test',
    voiceId: 'lola',
    enabled: true
  },
  companyInfo: { name: 'Test' },
  botConfig: { model: 'gpt-4' },
  businessHours: [{ day: 'monday', open: '09:00', close: '18:00' }],
  faqs: [{ question: 'Test?', answer: 'Test answer' }],
  contextFiles: [{ name: 'test.txt', content: 'Test content' }]
};

const twiml = service.createStreamTwiML(testClient, 'TEST_CALL_SID');
console.log(`TwiML generado: ${twiml.length} caracteres`);
console.log(`¿Contiene Stream? ${twiml.includes('<Stream') ? '✅' : '❌'}`);
console.log(`¿Contiene parámetros? ${twiml.includes('<Parameter') ? '✅' : '❌'}`);

// Extraer URL del TwiML
const urlMatch = twiml.match(/url="([^"]+)"/);
if (urlMatch) {
  console.log(`URL en TwiML: ${urlMatch[1]}`);
} else {
  console.log('❌ No se encontró URL en TwiML');
}

console.log('\n📋 SIGUIENTE PASO:');
console.log('1. Verificar que RENDER_EXTERNAL_URL esté configurada en Render');
console.log('2. Confirmar que la ruta /websocket/twilio-stream esté disponible');
console.log('3. Verificar que el WebSocket handler esté registrado correctamente');
