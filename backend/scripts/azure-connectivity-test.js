#!/usr/bin/env node

/**
 * Script de diagnóstico de conectividad y latencia con Azure TTS
 * Ejecutar desde Render para diagnosticar problemas de red
 */

const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const { performance } = require('perf_hooks');

// Configuración
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const AZURE_KEY = process.env.AZURE_SPEECH_KEY;

const endpoints = {
  token: `https://${AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
  tts: `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
  base: `${AZURE_REGION}.api.cognitive.microsoft.com`,
  ttsBase: `${AZURE_REGION}.tts.speech.microsoft.com`
};

console.log('🔍 AZURE CONNECTIVITY DIAGNOSTIC TOOL');
console.log('=====================================');
console.log(`📍 Region: ${AZURE_REGION}`);
console.log(`🔑 Key present: ${!!AZURE_KEY}`);
console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
console.log('');

async function testDNSResolution() {
  console.log('🌐 DNS RESOLUTION TEST');
  console.log('----------------------');
  
  for (const [name, hostname] of Object.entries({
    'Token API': endpoints.base,
    'TTS API': endpoints.ttsBase
  })) {
    try {
      const start = performance.now();
      const addresses = await dns.resolve4(hostname);
      const duration = Math.round(performance.now() - start);
      
      console.log(`✅ ${name}: ${hostname}`);
      console.log(`   ├── Resolved to: ${addresses.join(', ')}`);
      console.log(`   └── DNS time: ${duration}ms`);
    } catch (error) {
      console.log(`❌ ${name}: ${hostname}`);
      console.log(`   └── DNS Error: ${error.message}`);
    }
  }
  console.log('');
}

async function testTCPConnection() {
  console.log('🔌 TCP CONNECTION TEST');
  console.log('----------------------');
  
  for (const [name, hostname] of Object.entries({
    'Token API': endpoints.base,
    'TTS API': endpoints.ttsBase
  })) {
    await new Promise((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        const duration = Math.round(performance.now() - start);
        console.log(`✅ ${name}: ${hostname}:443`);
        console.log(`   └── TCP connect time: ${duration}ms`);
        socket.destroy();
        resolve();
      });
      
      socket.on('timeout', () => {
        console.log(`❌ ${name}: ${hostname}:443`);
        console.log(`   └── TCP timeout after 5000ms`);
        socket.destroy();
        resolve();
      });
      
      socket.on('error', (error) => {
        const duration = Math.round(performance.now() - start);
        console.log(`❌ ${name}: ${hostname}:443`);
        console.log(`   ├── TCP error after ${duration}ms`);
        console.log(`   └── Error: ${error.message}`);
        resolve();
      });
      
      socket.connect(443, hostname);
    });
  }
  console.log('');
}

async function testHTTPSLatency() {
  console.log('🚀 HTTPS LATENCY TEST');
  console.log('---------------------');
  
  for (const [name, url] of Object.entries({
    'Token endpoint': endpoints.token,
    'TTS endpoint': endpoints.tts
  })) {
    try {
      const start = performance.now();
      
      // Test simple GET request (expecting 405 or similar)
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      
      const duration = Math.round(performance.now() - start);
      
      console.log(`✅ ${name}`);
      console.log(`   ├── Status: ${response.status}`);
      console.log(`   ├── HTTPS time: ${duration}ms`);
      console.log(`   └── Headers: ${JSON.stringify(response.headers['server'] || 'N/A')}`);
      
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      console.log(`❌ ${name}`);
      console.log(`   ├── Error after ${duration}ms`);
      console.log(`   ├── Code: ${error.code || 'N/A'}`);
      console.log(`   └── Message: ${error.message}`);
    }
  }
  console.log('');
}

async function testAzureAuthentication() {
  console.log('🔐 AZURE AUTHENTICATION TEST');
  console.log('-----------------------------');
  
  if (!AZURE_KEY) {
    console.log('❌ No Azure key provided');
    console.log('   └── Set AZURE_SPEECH_KEY environment variable');
    return;
  }
  
  try {
    const start = performance.now();
    
    const response = await axios.post(endpoints.token, null, {
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    
    const duration = Math.round(performance.now() - start);
    
    console.log('✅ Azure Authentication');
    console.log(`   ├── Status: ${response.status}`);
    console.log(`   ├── Auth time: ${duration}ms`);
    console.log(`   ├── Token length: ${response.data ? response.data.length : 0}`);
    console.log(`   └── Token preview: ${response.data ? response.data.substring(0, 20) + '...' : 'N/A'}`);
    
    return response.data;
    
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.log('❌ Azure Authentication');
    console.log(`   ├── Error after ${duration}ms`);
    console.log(`   ├── Status: ${error.response?.status || 'N/A'}`);
    console.log(`   ├── Code: ${error.code || 'N/A'}`);
    console.log(`   └── Message: ${error.message}`);
    
    if (error.response?.data) {
      console.log(`   └── Azure response: ${error.response.data}`);
    }
  }
  console.log('');
}

async function testTTSGeneration(token) {
  if (!token) {
    console.log('⏭️  Skipping TTS test (no token)');
    console.log('');
    return;
  }
  
  console.log('🎤 TTS GENERATION TEST');
  console.log('----------------------');
  
  const ssml = `<speak version='1.0' xml:lang='es-ES'>
    <voice xml:lang='es-ES' xml:gender='Male' name='es-ES-DarioNeural'>
      Hola, esto es una prueba de conectividad.
    </voice>
  </speak>`;
  
  try {
    const start = performance.now();
    
    const response = await axios.post(endpoints.tts, ssml, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'riff-16khz-16bit-mono-pcm',
        'User-Agent': 'connectivity-test'
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });
    
    const duration = Math.round(performance.now() - start);
    
    console.log('✅ TTS Generation');
    console.log(`   ├── Status: ${response.status}`);
    console.log(`   ├── TTS time: ${duration}ms`);
    console.log(`   ├── Audio size: ${response.data ? response.data.byteLength : 0} bytes`);
    console.log(`   └── Content-Type: ${response.headers['content-type'] || 'N/A'}`);
    
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    console.log('❌ TTS Generation');
    console.log(`   ├── Error after ${duration}ms`);
    console.log(`   ├── Status: ${error.response?.status || 'N/A'}`);
    console.log(`   ├── Code: ${error.code || 'N/A'}`);
    console.log(`   └── Message: ${error.message}`);
  }
  console.log('');
}

async function testSystemInfo() {
  console.log('💻 SYSTEM INFORMATION');
  console.log('---------------------');
  console.log(`   ├── Node.js version: ${process.version}`);
  console.log(`   ├── Platform: ${process.platform}`);
  console.log(`   ├── Architecture: ${process.arch}`);
  console.log(`   ├── Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
  console.log(`   ├── Uptime: ${Math.round(process.uptime())}s`);
  console.log(`   └── Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}

async function runDiagnostics() {
  const overallStart = performance.now();
  
  try {
    await testSystemInfo();
    await testDNSResolution();
    await testTCPConnection();
    await testHTTPSLatency();
    const token = await testAzureAuthentication();
    await testTTSGeneration(token);
    
    const totalDuration = Math.round(performance.now() - overallStart);
    
    console.log('📊 SUMMARY');
    console.log('----------');
    console.log(`✅ Diagnostic completed in ${totalDuration}ms`);
    console.log(`🕐 Finished at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.log('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Ejecutar diagnósticos
runDiagnostics().catch(console.error);
