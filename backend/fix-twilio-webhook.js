require('dotenv').config();
const twilio = require('twilio');

async function fixTwilioWebhook() {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('🔧 Corrigiendo configuración webhook de Twilio...\n');
    
    // Obtener el número
    const numbers = await client.incomingPhoneNumbers.list();
    
    if (numbers.length === 0) {
      console.log('❌ No hay números configurados');
      return;
    }
    
    const phoneNumber = numbers[0];
    console.log(`📞 Configurando número: ${phoneNumber.phoneNumber}`);
    
    // URL correcta para el webhook
    const correctWebhookUrl = 'https://saas-ai-automation.onrender.com/api/twilio/webhook';
    
    console.log(`🎯 URL webhook: ${correctWebhookUrl}`);
    
    // Actualizar configuración
    const updatedNumber = await client.incomingPhoneNumbers(phoneNumber.sid).update({
      voiceUrl: correctWebhookUrl,
      voiceMethod: 'POST',
      voiceFallbackUrl: correctWebhookUrl,
      voiceFallbackMethod: 'POST'
    });
    
    console.log('✅ Webhook actualizado correctamente');
    console.log(`📋 Voice URL: ${updatedNumber.voiceUrl}`);
    console.log(`📋 Voice Method: ${updatedNumber.voiceMethod}`);
    console.log(`📋 Fallback URL: ${updatedNumber.voiceFallbackUrl}`);
    
    console.log('\n🎉 ¡Configuración completada! Ahora puedes probar llamando al número.');
    
  } catch (error) {
    console.error('❌ Error configurando webhook:', error.message);
  }
}

fixTwilioWebhook();
