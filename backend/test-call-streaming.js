require('dotenv').config();
const twilio = require('twilio');
const logger = require('./src/utils/logger');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioNumber) {
  console.error('❌ Variables de entorno de Twilio no configuradas');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testStreamingCall() {
  try {
    console.log('🧪 Iniciando test de llamada con streaming TTS...');
    console.log(`📞 Número Twilio: ${twilioNumber}`);
    
    // Realizar llamada de prueba
    const call = await client.calls.create({
      to: '+34123456789', // Número de prueba (cambiar por uno real para test)
      from: twilioNumber,
      url: `https://saas-ai-automation.onrender.com/api/twilio/webhook`,
      method: 'POST',
      record: false,
      timeout: 30
    });

    console.log(`✅ Llamada iniciada: ${call.sid}`);
    console.log(`📊 Estado: ${call.status}`);
    console.log(`🔗 URL Webhook: ${process.env.TWILIO_WEBHOOK_BASE_URL}/webhook/twilio/voice`);
    
    // Monitorear el estado de la llamada
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedCall = await client.calls(call.sid).fetch();
      console.log(`📊 Estado actual: ${updatedCall.status} (${updatedCall.duration}s)`);
      
      if (['completed', 'failed', 'busy', 'no-answer'].includes(updatedCall.status)) {
        console.log(`🏁 Llamada finalizada con estado: ${updatedCall.status}`);
        break;
      }
      
      attempts++;
    }
    
    console.log('✅ Test de llamada completado');
    
  } catch (error) {
    console.error('❌ Error en test de llamada:', error.message);
    if (error.code) {
      console.error(`🔢 Código de error: ${error.code}`);
    }
  }
}

// Función para verificar webhook
async function testWebhook() {
  try {
    console.log('🧪 Verificando webhook...');
    
    const webhookUrl = `https://saas-ai-automation.onrender.com/api/twilio/webhook`;
    console.log(`🔗 URL: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'CallSid': 'test-call-sid',
        'From': '+34123456789',
        'To': twilioNumber,
        'CallStatus': 'ringing'
      })
    });
    
    if (response.ok) {
      const twiml = await response.text();
      console.log('✅ Webhook responde correctamente');
      console.log('📄 TwiML generado:');
      console.log(twiml);
    } else {
      console.error(`❌ Webhook falló: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando webhook:', error.message);
  }
}

// Función para verificar WebSocket
async function testWebSocket() {
  try {
    console.log('🧪 Verificando servidor WebSocket...');
    
    const WebSocket = require('ws');
    const wsUrl = `wss://saas-ai-automation.onrender.com/websocket`;
    
    console.log(`🔗 URL WebSocket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'TwilioProxy/1.1'
      }
    });
    
    ws.on('open', () => {
      console.log('✅ Conexión WebSocket establecida');
      
      // Simular mensaje de Twilio
      const testMessage = {
        event: 'connected',
        protocol: 'Call',
        version: '1.0.0'
      };
      
      ws.send(JSON.stringify(testMessage));
      
      setTimeout(() => {
        ws.close();
      }, 2000);
    });
    
    ws.on('message', (data) => {
      console.log('📨 Mensaje recibido:', data.toString());
    });
    
    ws.on('close', () => {
      console.log('🔌 Conexión WebSocket cerrada');
    });
    
    ws.on('error', (error) => {
      console.error('❌ Error WebSocket:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Error verificando WebSocket:', error.message);
  }
}

// Ejecutar tests
async function runTests() {
  console.log('🚀 Iniciando tests del sistema de streaming TTS...\n');
  
  await testWebhook();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testWebSocket();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Comentar la siguiente línea para evitar hacer llamadas reales durante desarrollo
  // await testStreamingCall();
  
  console.log('🏁 Tests completados');
  process.exit(0);
}

runTests().catch(console.error);
