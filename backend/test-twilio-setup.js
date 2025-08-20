#!/usr/bin/env node

/**
 * Script para probar la configuración de Twilio
 * Uso: node test-twilio-setup.js <jwt-token> <account-sid> <auth-token> [phone-number]
 */

require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

async function testTwilioSetup() {
  console.log('🧪 === TEST DE CONFIGURACIÓN TWILIO ===\n');
  
  // Obtener argumentos de línea de comandos
  const [,, jwtToken, accountSid, authToken, phoneNumber] = process.argv;
  
  if (!jwtToken || !accountSid || !authToken) {
    console.log('❌ Error: Faltan argumentos');
    console.log('');
    console.log('Uso:');
    console.log('   node test-twilio-setup.js <jwt-token> <account-sid> <auth-token> [phone-number]');
    console.log('');
    console.log('Ejemplo:');
    console.log('   node test-twilio-setup.js eyJ0eXAi... ACxxxx... your-auth-token +34612345678');
    process.exit(1);
  }
  
  console.log('📋 Datos de configuración:');
  console.log(`   Account SID: ${accountSid.substring(0, 10)}...${accountSid.slice(-4)}`);
  console.log(`   Auth Token: ${authToken.substring(0, 8)}...${authToken.slice(-4)}`);
  console.log(`   Phone Number: ${phoneNumber || 'No proporcionado'}`);
  console.log('');
  
  try {
    // 1. Test del endpoint de configuración
    console.log('🔧 1. Configurando Twilio...');
    
    const setupResponse = await fetch(`${BASE_URL}/api/setup/twilio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        accountSid,
        authToken,
        phoneNumber
      })
    });
    
    const setupResult = await setupResponse.json();
    
    if (setupResponse.ok && setupResult.success) {
      console.log('   ✅ Twilio configurado correctamente');
      console.log(`   📞 Account SID: ${setupResult.config.accountSid}`);
      if (setupResult.config.phoneNumber) {
        console.log(`   📱 Número: ${setupResult.config.phoneNumber}`);
      }
    } else {
      console.log('   ❌ Error configurando Twilio');
      console.log(`   Error: ${setupResult.error}`);
      return false;
    }
    
    console.log('');
    
    // 2. Test del estado de configuración
    console.log('📊 2. Verificando estado de configuración...');
    
    const statusResponse = await fetch(`${BASE_URL}/api/setup/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const statusResult = await statusResponse.json();
    
    if (statusResponse.ok && statusResult.success) {
      console.log('   ✅ Estado obtenido correctamente');
      console.log(`   Twilio configurado: ${statusResult.setup.twilio.configured ? '✅' : '❌'}`);
      console.log(`   Tiene número: ${statusResult.setup.twilio.hasPhoneNumber ? '✅' : '❌'}`);
      console.log(`   ElevenLabs configurado: ${statusResult.setup.elevenlabs.configured ? '✅' : '❌'}`);
      
      if (statusResult.setup.twilio.phoneNumbers.length > 0) {
        console.log('   📞 Números configurados:');
        statusResult.setup.twilio.phoneNumbers.forEach(num => {
          console.log(`      - ${num.number} (${num.status})`);
        });
      }
    } else {
      console.log('   ❌ Error obteniendo estado');
      console.log(`   Error: ${statusResult.error}`);
    }
    
    console.log('');
    
    // 3. Test de activación del bot de llamadas
    console.log('🤖 3. Probando activación del bot de llamadas...');
    
    const callConfig = {
      enabled: true,
      recordCalls: false,
      transcribeCalls: false,
      voiceId: 'female',
      language: 'es-ES',
      greeting: 'Hola, gracias por llamar. Soy el asistente virtual de la empresa.',
      volume: '1.0',
      speed: '1.0',
      pitch: '1.0'
    };
    
    const botResponse = await fetch(`${BASE_URL}/api/client`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        callConfig
      })
    });
    
    const botResult = await botResponse.json();
    
    if (botResponse.ok && botResult.success) {
      console.log('   ✅ Bot de llamadas activado correctamente');
      console.log('   🔔 Notificación enviada a N8N');
    } else {
      console.log('   ❌ Error activando bot de llamadas');
      console.log(`   Error: ${botResult.error}`);
    }
    
    console.log('');
    console.log('🎉 ¡Configuración de Twilio completada!');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Configurar ElevenLabs: node test-elevenlabs-setup.js <jwt> <api-key>');
    console.log('   2. Probar llamada real desde N8N');
    console.log('   3. Verificar webhooks de Twilio');
    
    return true;
    
  } catch (error) {
    console.log(`❌ Error crítico: ${error.message}`);
    return false;
  }
}

// Ejecutar test
testTwilioSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
