#!/usr/bin/env node

/**
 * TEST DE VERIFICACIÓN DE PRODUCCIÓN
 * Verifica que el sistema de producción funciona exactamente igual que el test
 * Simula una llamada real completa usando el servidor en funcionamiento
 */

require('dotenv').config();
const WebSocket = require('ws');
const { exec } = require('child_process');

async function testProductionSystem() {
  console.log('🔍 === VERIFICACIÓN DEL SISTEMA DE PRODUCCIÓN ===\n');

  try {
    // PASO 1: Verificar que el servidor está corriendo
    console.log('📡 PASO 1: Verificando servidor...');
    
    const serverCheck = await new Promise((resolve) => {
      exec('curl -s http://localhost:10000/health || echo "SERVER_DOWN"', (error, stdout) => {
        resolve(stdout.includes('SERVER_DOWN') ? false : true);
      });
    });

    if (!serverCheck) {
      throw new Error('Servidor no está corriendo en localhost:10000');
    }
    console.log('✅ Servidor corriendo correctamente');

    // PASO 2: Simular llamada al webhook
    console.log('\n📞 PASO 2: Simulando llamada al webhook...');
    const callSid = `CA_production_test_${Date.now()}`;
    
    const webhookResponse = await new Promise((resolve, reject) => {
      const curlCommand = `curl -s -X POST http://localhost:10000/webhooks/call -H "Content-Type: application/x-www-form-urlencoded" -d "CallSid=${callSid}&From=%2B34600000000&To=%2B16672209354"`;
      
      exec(curlCommand, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });

    console.log('✅ Webhook respondió correctamente');
    
    // Verificar que el TwiML contiene WebSocket Stream
    if (!webhookResponse.includes('<Stream')) {
      throw new Error('TwiML no contiene elemento Stream');
    }
    
    // Extraer parámetros del TwiML
    const clientIdMatch = webhookResponse.match(/Parameter name="clientId" value="(\d+)"/);
    const greetingMatch = webhookResponse.match(/Parameter name="greeting" value="([^"]+)"/);
    const voiceIdMatch = webhookResponse.match(/Parameter name="voiceId" value="([^"]+)"/);
    
    if (!clientIdMatch || !greetingMatch || !voiceIdMatch) {
      throw new Error('TwiML no contiene todos los parámetros necesarios');
    }

    const clientId = clientIdMatch[1];
    const greeting = greetingMatch[1];
    const voiceId = voiceIdMatch[1];

    console.log(`✅ Parámetros extraídos del TwiML:`);
    console.log(`   - Cliente ID: ${clientId}`);
    console.log(`   - Saludo: "${greeting.substring(0, 50)}..."`);
    console.log(`   - Voz: ${voiceId}`);

    // PASO 3: Simular conexión WebSocket
    console.log('\n🔌 PASO 3: Simulando conexión WebSocket...');
    
    const wsUrl = 'ws://localhost:10000/websocket/twilio-stream';
    const ws = new WebSocket(wsUrl);
    
    let wsConnected = false;
    let audioReceived = false;
    let greetingSent = false;

    const wsPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout después de 10 segundos'));
      }, 10000);

      ws.on('open', () => {
        console.log('✅ WebSocket conectado');
        wsConnected = true;
        
        // Simular mensaje de inicio de Twilio
        const startMessage = {
          event: 'start',
          start: {
            streamSid: `MZ_test_${Date.now()}`,
            callSid: callSid,
            customParameters: {
              clientId: clientId,
              companyName: 'Teteo soft',
              greeting: greeting,
              voiceId: voiceId,
              enabled: 'true'
            }
          }
        };
        
        console.log('📤 Enviando mensaje de inicio...');
        ws.send(JSON.stringify(startMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.event === 'media') {
            if (!audioReceived) {
              console.log('✅ Audio recibido del servidor');
              audioReceived = true;
            }
          }
          
          if (message.event === 'mark') {
            if (!greetingSent) {
              console.log('✅ Saludo enviado correctamente');
              greetingSent = true;
            }
          }
          
          // Si hemos recibido todo lo esperado, cerrar conexión
          if (audioReceived && greetingSent) {
            clearTimeout(timeout);
            ws.close();
            resolve({
              connected: wsConnected,
              audioReceived: audioReceived,
              greetingSent: greetingSent
            });
          }
        } catch (error) {
          console.log(`📨 Mensaje WebSocket: ${data.toString().substring(0, 100)}...`);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        if (!audioReceived || !greetingSent) {
          // Dar tiempo para procesar mensajes
          setTimeout(() => {
            resolve({
              connected: wsConnected,
              audioReceived: audioReceived,
              greetingSent: greetingSent
            });
          }, 1000);
        }
      });
    });

    const wsResult = await wsPromise;
    
    console.log(`✅ Resultados WebSocket:`);
    console.log(`   - Conectado: ${wsResult.connected}`);
    console.log(`   - Audio recibido: ${wsResult.audioReceived}`);
    console.log(`   - Saludo enviado: ${wsResult.greetingSent}`);

    // RESUMEN FINAL
    console.log('\n🎯 === RESUMEN DE VERIFICACIÓN ===');
    console.log('✅ 1. Servidor de producción funcionando');
    console.log('✅ 2. Webhook procesa llamadas correctamente');
    console.log('✅ 3. TwiML generado con parámetros completos');
    console.log('✅ 4. WebSocket acepta conexiones');
    console.log(`${wsResult.audioReceived ? '✅' : '⚠️'} 5. Sistema genera y envía audio`);
    console.log(`${wsResult.greetingSent ? '✅' : '⚠️'} 6. Saludo personalizado enviado`);
    
    if (wsResult.connected && wsResult.audioReceived && wsResult.greetingSent) {
      console.log('\n🚀 SISTEMA DE PRODUCCIÓN VERIFICADO - TODO FUNCIONAL');
    } else {
      console.log('\n⚠️ SISTEMA PARCIALMENTE FUNCIONAL - REVISAR LOGS');
    }

  } catch (error) {
    console.error(`❌ Error en verificación: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  }
}

// Ejecutar verificación
testProductionSystem().catch(console.error);
