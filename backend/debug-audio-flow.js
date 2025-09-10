#!/usr/bin/env node

/**
 * Script de diagnóstico completo para el flujo de audio
 * Prueba cada paso del proceso para identificar dónde falla
 */

// Cargar variables de entorno PRIMERO
require('dotenv').config();

const WebSocket = require('ws');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuración
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://saas-ai-automation.onrender.com'
  : 'http://localhost:10000';

const WS_URL = BASE_URL.replace(/^https?/, BASE_URL.startsWith('https') ? 'wss' : 'ws') + '/websocket/twilio-stream';

async function testCompleteAudioFlow() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DEL FLUJO DE AUDIO ===\n');
  
  // Test 1: Verificar que el webhook funciona
  console.log('📞 TEST 1: Verificar webhook HTTP');
  try {
    const webhookResponse = await axios.post(`${BASE_URL}/webhooks/call`, 
      'CallSid=CA_debug_test&From=%2B34600000000&To=%2B16672209354',
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );
    
    console.log(`   ✅ Webhook responde: ${webhookResponse.status}`);
    console.log(`   ✅ TwiML generado: ${webhookResponse.data.length} caracteres`);
    
    if (webhookResponse.data.includes('<Stream')) {
      console.log(`   ✅ TwiML contiene Stream WebSocket`);
      
      // Extraer URL del WebSocket del TwiML
      const wsUrlMatch = webhookResponse.data.match(/url="([^"]+)"/);
      if (wsUrlMatch) {
        console.log(`   ✅ WebSocket URL encontrada: ${wsUrlMatch[1]}`);
      }
    } else {
      console.log(`   ❌ TwiML NO contiene Stream`);
      return;
    }
  } catch (error) {
    console.log(`   ❌ Error en webhook: ${error.message}`);
    return;
  }
  
  console.log('');
  
  // Test 2: Probar conexión WebSocket
  console.log('🔌 TEST 2: Probar conexión WebSocket');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let connected = false;
    let startReceived = false;
    let audioSent = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('   ❌ Timeout: WebSocket no se conectó en 10 segundos');
      }
      ws.close();
      resolve();
    }, 10000);
    
    ws.on('open', () => {
      connected = true;
      console.log('   ✅ WebSocket conectado');
      
      // Simular evento "connected" de Twilio
      const connectedEvent = {
        event: 'connected',
        protocol: 'Call',
        version: '1.0.0'
      };
      
      console.log('   📤 Enviando evento connected...');
      ws.send(JSON.stringify(connectedEvent));
      
      // Simular evento "start" de Twilio con parámetros reales
      setTimeout(() => {
        const startEvent = {
          event: 'start',
          sequenceNumber: '1',
          start: {
            streamSid: 'MZ_debug_test_stream',
            accountSid: 'AC_test',
            callSid: 'CA_debug_test',
            tracks: ['inbound', 'outbound'],
            mediaFormat: {
              encoding: 'audio/x-mulaw',
              sampleRate: 8000,
              channels: 1
            },
            customParameters: {
              clientId: '3',
              companyName: 'Test Company',
              greeting: 'Hola, soy el asistente virtual de prueba',
              voiceId: 'lola',
              enabled: 'true'
            }
          },
          streamSid: 'MZ_debug_test_stream'
        };
        
        console.log('   📤 Enviando evento start...');
        ws.send(JSON.stringify(startEvent));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`   📥 Mensaje recibido: ${message.event}`);
        
        if (message.event === 'media') {
          if (!audioSent) {
            audioSent = true;
            console.log(`   ✅ AUDIO RECIBIDO! Payload: ${message.media?.payload?.length || 0} caracteres`);
          }
        } else if (message.event === 'mark') {
          console.log(`   ✅ Mark recibido: ${message.mark?.name}`);
        }
      } catch (error) {
        console.log(`   📥 Mensaje no JSON: ${data.toString().substring(0, 100)}...`);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ Error WebSocket: ${error.message}`);
      clearTimeout(timeout);
      resolve();
    });
    
    ws.on('close', (code, reason) => {
      console.log(`   🔌 WebSocket cerrado: ${code} - ${reason}`);
      
      // Resumen final
      console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
      console.log(`   Conexión WebSocket: ${connected ? '✅' : '❌'}`);
      console.log(`   Evento start procesado: ${startReceived ? '✅' : '❌'}`);
      console.log(`   Audio enviado: ${audioSent ? '✅' : '❌'}`);
      
      if (!audioSent) {
        console.log('\n❌ PROBLEMA IDENTIFICADO: No se está enviando audio');
        console.log('   Posibles causas:');
        console.log('   1. Azure TTS no está funcionando');
        console.log('   2. El método sendAudioToTwilio tiene un error');
        console.log('   3. Los parámetros del cliente no se están procesando');
        console.log('   4. Hay un error en el manejo del evento start');
      } else {
        console.log('\n✅ El flujo parece estar funcionando correctamente');
      }
      
      clearTimeout(timeout);
      resolve();
    });
  });
}

// Test 3: Verificar Azure TTS directamente
async function testAzureTTS() {
  console.log('\n🎤 TEST 3: Verificar Azure TTS');
  
  try {
    // Importar el servicio TTS
    const azureTTSService = require('./src/services/azureTTSService');
    
    console.log('   📤 Generando audio de prueba...');
    const testText = 'Hola, esta es una prueba de audio';
    const audioBuffer = await azureTTSService.generateSpeech(testText, 'lola');
    
    if (audioBuffer && audioBuffer.length > 0) {
      console.log(`   ✅ Audio generado: ${audioBuffer.length} bytes`);
      
      // Verificar que el buffer contiene datos válidos
      const base64 = audioBuffer.toString('base64');
      console.log(`   ✅ Conversión a base64: ${base64.length} caracteres`);
      
      return true;
    } else {
      console.log('   ❌ No se generó audio');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error en Azure TTS: ${error.message}`);
    return false;
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  try {
    await testCompleteAudioFlow();
    await testAzureTTS();
    
    console.log('\n🏁 DIAGNÓSTICO COMPLETADO');
    console.log('Revisa los logs de producción para más detalles.');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests();
}

module.exports = { testCompleteAudioFlow, testAzureTTS };
