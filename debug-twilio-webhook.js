const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function debugTwilioWebhook() {
  console.log('🔍 DIAGNÓSTICO WEBHOOK TWILIO\n');
  
  try {
    // 1. Verificar números Twilio en BD
    console.log('1. NÚMEROS TWILIO EN BASE DE DATOS:');
    const twilioNumbers = await prisma.twilioNumber.findMany({
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            callConfig: true
          }
        }
      }
    });
    
    if (twilioNumbers.length === 0) {
      console.log('❌ NO HAY NÚMEROS TWILIO EN LA BASE DE DATOS');
      return;
    }
    
    twilioNumbers.forEach(num => {
      console.log(`📞 ${num.phoneNumber} (${num.status})`);
      console.log(`   Cliente: ${num.client.companyName} (ID: ${num.client.id})`);
      console.log(`   SID: ${num.sid}`);
      console.log(`   Greeting: ${num.client.callConfig?.greeting || 'No configurado'}`);
      console.log('');
    });
    
    // 2. URLs que debe configurar Twilio
    console.log('2. URLS QUE DEBE CONFIGURAR TWILIO:');
    console.log('📡 Webhook URL (Voice): https://saas-ai-automation.onrender.com/api/twilio/webhook');
    console.log('🎙️ Audio Webhook URL: https://saas-ai-automation.onrender.com/api/twilio/webhook/audio');
    console.log('🔌 WebSocket URL: wss://saas-ai-automation.onrender.com/websocket/twilio-stream');
    console.log('');
    
    // 3. Verificar variables de entorno críticas
    console.log('3. VARIABLES DE ENTORNO:');
    console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Falta'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Configurado' : '❌ Falta'}`);
    console.log(`AZURE_SPEECH_KEY: ${process.env.AZURE_SPEECH_KEY ? '✅ Configurado' : '❌ Falta'}`);
    console.log(`AZURE_SPEECH_REGION: ${process.env.AZURE_SPEECH_REGION ? '✅ Configurado' : '❌ Falta'}`);
    console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configurado' : '❌ Falta'}`);
    console.log('');
    
    // 4. Test de conectividad a Twilio
    console.log('4. TEST DE CONECTIVIDAD TWILIO:');
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        // Verificar cuenta
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(`✅ Conexión Twilio exitosa - Cuenta: ${account.friendlyName}`);
        
        // Verificar números comprados
        const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
        console.log(`📞 Números en Twilio: ${numbers.length}`);
        
        numbers.forEach(num => {
          console.log(`   ${num.phoneNumber} - Voice URL: ${num.voiceUrl || 'NO CONFIGURADO'}`);
        });
        
      } catch (error) {
        console.log(`❌ Error conectando a Twilio: ${error.message}`);
      }
    } else {
      console.log('❌ Credenciales Twilio no configuradas');
    }
    
    console.log('\n🔧 PASOS PARA SOLUCIONAR:');
    console.log('1. Verificar que el número Twilio tenga configurado el Voice Webhook URL');
    console.log('2. En Twilio Console > Phone Numbers > Manage > Active numbers');
    console.log('3. Seleccionar el número y configurar:');
    console.log('   - Voice & Fax > Webhook: https://saas-ai-automation.onrender.com/api/twilio/webhook');
    console.log('   - HTTP Method: POST');
    console.log('4. Guardar configuración y probar llamada');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTwilioWebhook();
