require('dotenv').config();
const twilio = require('twilio');

async function checkTwilioNumbers() {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('🔍 Verificando números de Twilio configurados...\n');
    
    // Obtener todos los números
    const numbers = await client.incomingPhoneNumbers.list();
    
    if (numbers.length === 0) {
      console.log('❌ No hay números configurados en Twilio');
      return;
    }
    
    console.log(`📱 Números encontrados: ${numbers.length}\n`);
    
    numbers.forEach((number, index) => {
      console.log(`--- Número ${index + 1} ---`);
      console.log(`📞 Número: ${number.phoneNumber}`);
      console.log(`🏷️  Nombre: ${number.friendlyName}`);
      console.log(`🌐 Voice URL: ${number.voiceUrl || 'NO CONFIGURADO'}`);
      console.log(`📋 Voice Method: ${number.voiceMethod || 'NO CONFIGURADO'}`);
      console.log(`🔄 Fallback URL: ${number.voiceFallbackUrl || 'NO CONFIGURADO'}`);
      console.log(`📅 Creado: ${number.dateCreated}`);
      console.log('');
    });
    
    // Verificar URL base actual
    const expectedBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://saas-ai-automation.onrender.com';
    console.log(`🎯 URL base esperada: ${expectedBaseUrl}`);
    
    // Verificar si algún número tiene la URL correcta
    const correctlyConfigured = numbers.filter(number => 
      number.voiceUrl && number.voiceUrl.includes(expectedBaseUrl)
    );
    
    console.log(`✅ Números correctamente configurados: ${correctlyConfigured.length}`);
    
    if (correctlyConfigured.length === 0) {
      console.log('\n🚨 PROBLEMA ENCONTRADO: Ningún número tiene el webhook correcto');
      console.log('💡 Solución: Configurar webhook para recibir llamadas');
    }
    
  } catch (error) {
    console.error('❌ Error verificando números:', error.message);
  }
}

checkTwilioNumbers();
