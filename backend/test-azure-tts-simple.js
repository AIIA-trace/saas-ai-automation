#!/usr/bin/env node

// Test aislado para Azure TTS Simple
require('dotenv').config();
const AzureTTSSimple = require('./src/services/azureTTSSimple');

async function testAzureCredentials() {
  console.log('🔍 Verificando credenciales de Azure...');
  
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  
  console.log('🔍 AZURE_SPEECH_KEY:', key ? `${key.substring(0, 8)}...` : 'NO DEFINIDA');
  console.log('🔍 AZURE_SPEECH_REGION:', region || 'NO DEFINIDA');
  console.log('🔍 Longitud de la clave:', key ? key.length : 0);
  
  // Verificar formato de la clave 
  if (key) {
    const is32CharFormat = /^[a-zA-Z0-9]{32}$/.test(key);
    const is80CharFormat = key.length >= 70 && key.length <= 90;
    console.log('🔍 Formato 32 chars:', is32CharFormat ? 'SÍ' : 'NO');
    console.log('🔍 Formato 80+ chars:', is80CharFormat ? 'SÍ' : 'NO');
    
    if (!is32CharFormat && !is80CharFormat) {
      console.log('⚠️ La clave no tiene un formato reconocido');
    } else {
      console.log('✅ Formato de clave aceptable, probando autenticación...');
    }
  }
  
  return { key, region };
}

async function testAzureEndpoint(key, region) {
  console.log('🌐 Probando conectividad con Azure Speech Service...');
  
  const https = require('https');
  
  // Test de conectividad básica - probar diferentes endpoints
  console.log('🔍 Probando endpoint 1: tts.speech.microsoft.com');
  
  const testSSML = `<speak version='1.0' xml:lang='es-ES'><voice xml:lang='es-ES' name='es-ES-DarioNeural'>Test</voice></speak>`;
  
  const options = {
    hostname: `${region}.tts.speech.microsoft.com`,
    port: 443,
    path: '/cognitiveservices/v1',
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-8khz-8bit-mono-mulaw',
      'User-Agent': 'Test-Client',
      'Content-Length': Buffer.byteLength(testSSML)
    }
  };
  
  console.log('🔍 URL completa:', `https://${options.hostname}${options.path}`);
  console.log('🔍 Headers:', JSON.stringify(options.headers, null, 2));
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('⏱️ Timeout de conexión');
      resolve({ success: false, error: 'Timeout' });
    }, 5000);
    
    const req = https.request(options, (res) => {
      clearTimeout(timeout);
      console.log(`📡 Respuesta HTTP: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('❌ Error 401 - Credenciales inválidas');
          console.log('📄 Respuesta:', data);
        } else if (res.statusCode === 200) {
          console.log('✅ Conexión exitosa con Azure');
        } else {
          console.log(`⚠️ Código inesperado: ${res.statusCode}`);
          console.log('📄 Respuesta:', data);
        }
        resolve({ success: res.statusCode === 200, statusCode: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Error de conexión:', error.message);
      resolve({ success: false, error: error.message });
    });
    
    req.write(testSSML);
    req.end();
  });
}

async function testAzureTTS() {
  console.log('🧪 Iniciando diagnóstico completo de Azure TTS...');
  
  // Paso 1: Verificar credenciales
  const { key, region } = await testAzureCredentials();
  
  if (!key || !region) {
    console.error('❌ Credenciales faltantes');
    process.exit(1);
  }
  
  // Paso 2: Test de conectividad
  const connectivityResult = await testAzureEndpoint(key, region);
  
  if (!connectivityResult.success) {
    console.error('❌ Fallo en conectividad con Azure');
    if (connectivityResult.statusCode === 401) {
      console.log('💡 Posibles causas del error 401:');
      console.log('   1. Clave de suscripción incorrecta o expirada');
      console.log('   2. Región incorrecta');
      console.log('   3. Servicio no habilitado en la suscripción');
      console.log('   4. Límites de cuota excedidos');
    }
    process.exit(1);
  }
  
  // Paso 3: Test con nuestro servicio
  console.log('🔍 Probando con nuestro servicio Azure TTS Simple...');
  
  const testText = 'Hola, este es un test de Azure TTS.';
  
  try {
    const startTime = Date.now();
    const result = await AzureTTSSimple.generateSpeech(testText);
    const endTime = Date.now();
    
    console.log(`⏱️ Tiempo transcurrido: ${endTime - startTime}ms`);
    
    if (result.success) {
      console.log('🎵 ¡Éxito! Audio generado correctamente');
      console.log(`📊 Tamaño del audio: ${result.audioBuffer.length} bytes`);
      console.log('✅ Test completado exitosamente');
    } else {
      console.error('❌ Error en la síntesis:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
    process.exit(1);
  }
}

// Ejecutar test
testAzureTTS();
