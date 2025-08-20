#!/usr/bin/env node

/**
 * Script de prueba para validar la integración N8N
 * Verifica configuración de variables de entorno y conectividad
 */

require('dotenv').config();

// Verificar si fetch está disponible
let fetch;
try {
  // Node.js 18+ tiene fetch nativo
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback para versiones anteriores
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Error: fetch no disponible. Instalar node-fetch: npm install node-fetch');
  process.exit(1);
}

const logger = require('./src/utils/logger');

async function testN8NIntegration() {
  console.log('🧪 === TEST DE INTEGRACIÓN N8N ===\n');
  
  // 1. Verificar variables de entorno
  console.log('📋 1. Verificando variables de entorno...');
  const webhookCall = process.env.N8N_WEBHOOK_CALL;
  const webhookEmail = process.env.N8N_WEBHOOK_EMAIL;
  const apiKey = process.env.N8N_API_KEY;
  
  console.log(`   N8N_WEBHOOK_CALL: ${webhookCall ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   N8N_WEBHOOK_EMAIL: ${webhookEmail ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   N8N_API_KEY: ${apiKey ? '✅ Configurado' : '⚠️ No configurado (opcional)'}`);
  
  if (!webhookCall) {
    console.log('\n❌ ERROR: N8N_WEBHOOK_CALL no está configurado');
    console.log('   Configurar en Render Dashboard > Environment Variables');
    return false;
  }
  
  console.log(`\n   URL del webhook: ${webhookCall}`);
  
  // 2. Test de conectividad básica
  console.log('\n🌐 2. Probando conectividad con N8N...');
  
  const testPayload = {
    clientId: 'test-client-123',
    botType: 'call',
    enabled: true,
    config: {
      enabled: true,
      greeting: 'Test greeting'
    },
    timestamp: new Date().toISOString(),
    action: 'test'
  };
  
  try {
    console.log('   Enviando payload de prueba...');
    console.log('   Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(webhookCall, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIIA-Backend-Test/1.0'
      },
      body: JSON.stringify(testPayload),
      timeout: 15000
    });
    
    console.log(`   Respuesta HTTP: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('   ✅ Webhook responde correctamente');
      
      // Intentar leer el body de la respuesta
      try {
        const responseText = await response.text();
        if (responseText) {
          console.log(`   Respuesta del servidor: ${responseText}`);
        }
      } catch (e) {
        console.log('   (Sin contenido en la respuesta)');
      }
      
      return true;
    } else {
      console.log('   ❌ Webhook no responde correctamente');
      
      // Intentar leer el error
      try {
        const errorText = await response.text();
        if (errorText) {
          console.log(`   Error del servidor: ${errorText}`);
        }
      } catch (e) {
        console.log('   (No se pudo leer el error del servidor)');
      }
      
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error de conectividad: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('   → El dominio no se puede resolver');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   → Conexión rechazada por el servidor');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Timeout - el servidor no responde');
    }
    
    return false;
  }
}

async function testN8NService() {
  console.log('\n🔧 3. Probando N8NService directamente...');
  
  try {
    const N8NService = require('./src/services/n8nService');
    
    const result = await N8NService.notifyCallBotStatusChange(
      'test-client-456',
      true,
      {
        enabled: true,
        greeting: 'Test greeting from N8NService',
        language: 'es-ES'
      }
    );
    
    console.log('   Resultado del servicio:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('   ✅ N8NService funciona correctamente');
      return true;
    } else {
      console.log('   ❌ N8NService reporta error');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error en N8NService: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

async function main() {
  console.log('Node.js version:', process.version);
  console.log('Fetch available:', typeof fetch !== 'undefined' ? '✅' : '❌');
  console.log('');
  
  const connectivityOk = await testN8NIntegration();
  const serviceOk = await testN8NService();
  
  console.log('\n📊 === RESUMEN ===');
  console.log(`Conectividad N8N: ${connectivityOk ? '✅ OK' : '❌ FALLO'}`);
  console.log(`Servicio N8N: ${serviceOk ? '✅ OK' : '❌ FALLO'}`);
  
  if (connectivityOk && serviceOk) {
    console.log('\n🎉 ¡Integración N8N funcionando correctamente!');
    console.log('   El problema puede estar en el flujo de activación del switch.');
    console.log('   Revisar logs del backend cuando se active/desactive el bot.');
  } else {
    console.log('\n🚨 Problemas detectados en la integración N8N');
    console.log('   Revisar configuración y conectividad antes de continuar.');
  }
  
  process.exit(connectivityOk && serviceOk ? 0 : 1);
}

// Ejecutar test
main().catch(error => {
  console.error('💥 Error crítico en el test:', error);
  process.exit(1);
});
