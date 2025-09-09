require('dotenv').config();
const axios = require('axios');

async function testWebhookEndpoint() {
  try {
    console.log('🧪 Probando endpoint webhook...\n');
    
    const webhookUrl = 'https://saas-ai-automation.onrender.com/api/twilio/webhook';
    
    // Simular una llamada de Twilio
    const testData = {
      CallSid: 'CAtest123456789',
      From: '+34600000000',
      To: '+16672209354',
      CallStatus: 'ringing',
      Direction: 'inbound'
    };
    
    console.log(`📞 Simulando llamada desde ${testData.From} a ${testData.To}`);
    console.log(`🌐 Endpoint: ${webhookUrl}`);
    
    const response = await axios.post(webhookUrl, testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    
    console.log(`✅ Respuesta HTTP: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers['content-type']}`);
    console.log(`📄 Respuesta TwiML:`);
    console.log(response.data);
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error HTTP ${error.response.status}: ${error.response.statusText}`);
      console.log(`📄 Respuesta:`, error.response.data);
    } else {
      console.error('❌ Error de conexión:', error.message);
    }
  }
}

testWebhookEndpoint();
