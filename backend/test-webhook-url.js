#!/usr/bin/env node

/**
 * Script para probar una URL de webhook N8N específica
 * Uso: node test-webhook-url.js <webhook-url>
 */

// Importar fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (error) {
  console.error('❌ Error: fetch no disponible');
  process.exit(1);
}

async function testWebhookUrl(webhookUrl) {
  console.log('🧪 === TEST DE WEBHOOK N8N ===\n');
  console.log(`📡 URL a probar: ${webhookUrl}\n`);
  
  const testPayload = {
    clientId: 'test-client-123',
    botType: 'call',
    enabled: true,
    config: {
      enabled: true,
      greeting: 'Test greeting from manual test'
    },
    timestamp: new Date().toISOString(),
    action: 'test-activation'
  };
  
  console.log('📤 Enviando payload de prueba:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('');
  
  try {
    console.log('⏳ Enviando request...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIIA-Backend-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`📊 Respuesta HTTP: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ ¡Webhook funciona correctamente!');
      
      try {
        const responseText = await response.text();
        if (responseText) {
          console.log(`📄 Respuesta del servidor: ${responseText}`);
        } else {
          console.log('📄 (Sin contenido en la respuesta)');
        }
      } catch (e) {
        console.log('📄 (No se pudo leer la respuesta)');
      }
      
      console.log('\n🎉 El webhook está funcionando. Ahora configura esta URL en:');
      console.log('   1. Render Dashboard > Environment Variables > N8N_WEBHOOK_CALL');
      console.log('   2. Local .env file > N8N_WEBHOOK_CALL=' + webhookUrl);
      
      return true;
    } else {
      console.log('❌ El webhook no responde correctamente');
      
      try {
        const errorText = await response.text();
        if (errorText) {
          console.log(`📄 Error del servidor: ${errorText}`);
        }
      } catch (e) {
        console.log('📄 (No se pudo leer el error)');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error de conectividad: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('   → El dominio no se puede resolver');
      console.log('   → Verifica que la URL sea correcta');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   → Conexión rechazada por el servidor');
      console.log('   → Verifica que N8N esté ejecutándose');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Timeout - el servidor no responde');
      console.log('   → Verifica la conectividad de red');
    }
    
    return false;
  }
}

// Obtener URL desde argumentos de línea de comandos
const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.log('❌ Error: Debes proporcionar la URL del webhook');
  console.log('');
  console.log('Uso:');
  console.log('   node test-webhook-url.js <webhook-url>');
  console.log('');
  console.log('Ejemplo:');
  console.log('   node test-webhook-url.js https://your-n8n-instance.app.n8n.cloud/webhook/call-bot');
  process.exit(1);
}

// Validar que la URL sea válida
try {
  new URL(webhookUrl);
} catch (error) {
  console.log('❌ Error: URL inválida');
  console.log(`   URL proporcionada: ${webhookUrl}`);
  console.log('   Debe ser una URL completa (https://...)');
  process.exit(1);
}

// Ejecutar test
testWebhookUrl(webhookUrl)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error crítico:', error);
    process.exit(1);
  });
