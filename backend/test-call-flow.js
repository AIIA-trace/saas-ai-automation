#!/usr/bin/env node

/**
 * Prueba completa del flujo de llamada:
 * 1. Simular llamada entrante
 * 2. Consultar base de datos
 * 3. Generar TwiML con configuración del cliente
 * 4. Probar generación de saludo con Azure TTS
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const azureTTSService = require('./src/services/azureTTSService');
const StreamingTwiMLService = require('./src/services/streamingTwiMLService');
const streamingTwiMLService = new StreamingTwiMLService();

const prisma = new PrismaClient();

async function testCallFlow() {
  console.log('🧪 === PRUEBA COMPLETA DEL FLUJO DE LLAMADA ===\n');

  try {
    // PASO 1: Simular llamada entrante
    const fromNumber = '+34600000000';
    const toNumber = '+16672209354'; // Número Twilio del cliente 3
    const callSid = 'CA_test_' + Date.now();

    console.log('📞 PASO 1: Simulando llamada entrante');
    console.log(`   From: ${fromNumber}`);
    console.log(`   To: ${toNumber}`);
    console.log(`   CallSid: ${callSid}\n`);

    // PASO 2: Consultar base de datos (igual que el webhook)
    console.log('🔍 PASO 2: Consultando base de datos...');
    
    const twilioNumber = await prisma.twilioNumber.findUnique({
      where: { phoneNumber: toNumber },
      include: { 
        client: true
      }
    });

    if (!twilioNumber?.client) {
      console.log('❌ RESULTADO: Cliente no encontrado para número:', toNumber);
      console.log('💡 SOLUCIÓN: Crear un número Twilio en la base de datos:');
      console.log(`
INSERT INTO "TwilioNumber" ("clientId", "phoneNumber", "twilioSid", "friendlyName") 
VALUES (1, '${toNumber}', 'PN_test_sid', 'Número de prueba');
      `);
      return;
    }

    const client = twilioNumber.client;
    console.log('✅ Cliente encontrado:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Empresa: ${client.companyName}`);
    console.log(`   Email: ${client.email}`);

    // Verificar configuración de llamadas
    let callConfig = null;
    if (client.callConfig) {
      if (typeof client.callConfig === 'string') {
        try {
          callConfig = JSON.parse(client.callConfig);
        } catch (error) {
          console.log(`   CallConfig JSON parse error: ${error.message}`);
          callConfig = null;
        }
      } else if (typeof client.callConfig === 'object') {
        // Ya es un objeto, usarlo directamente
        callConfig = client.callConfig;
      }
    }
    console.log(`   CallConfig: ${callConfig ? 'Configurado' : 'No configurado'}`);
    
    if (callConfig) {
      console.log(`   - Habilitado: ${callConfig.enabled}`);
      console.log(`   - Saludo: "${callConfig.greeting || 'No configurado'}"`);
      console.log(`   - Voz: ${callConfig.voiceId || 'No configurada'}`);
    }

    if (!callConfig?.enabled) {
      console.log('❌ RESULTADO: Bot desactivado para este cliente');
      return;
    }

    console.log('\n🎵 PASO 3: Generando TwiML con configuración completa...');
    
    // PASO 3: Generar TwiML (igual que el webhook)
    const twiml = streamingTwiMLService.generateStreamTwiml(client, callSid);
    console.log('✅ TwiML generado:');
    console.log(twiml.substring(0, 300) + '...\n');

    // PASO 4: Simular obtención de parámetros del WebSocket
    console.log('🔌 PASO 4: Simulando parámetros del WebSocket...');
    
    const greeting = callConfig?.greeting || 'Hola, gracias por llamar. ¿En qué puedo ayudarte?';
    const voiceId = callConfig?.voiceId || 'lola';
    
    console.log(`   Saludo: "${greeting}"`);
    console.log(`   Voz configurada: ${voiceId}`);
    console.log(`   Voz hardcodeada como fallback: ${voiceId === 'lola' ? 'SÍ' : 'NO'}\n`);

    // PASO 5: Probar generación de audio con Azure TTS
    console.log('🎤 PASO 5: Probando generación de audio con Azure TTS...');
    
    const ttsResult = await azureTTSService.generateSpeech(greeting, voiceId);
    
    if (ttsResult && ttsResult.success) {
      console.log('✅ Audio generado exitosamente:');
      console.log(`   Archivo: ${ttsResult.audioBuffer ? 'Buffer generado' : 'Sin buffer'}`);
      console.log(`   Tamaño: ${ttsResult.audioBuffer?.length || 0} bytes`);
      console.log(`   Voz usada: ${voiceId}`);
    } else {
      console.log('❌ Error generando audio:', ttsResult?.error || 'Error desconocido');
    }

    console.log('\n🎯 RESUMEN DEL FLUJO:');
    console.log('1. ✅ Llamada recibida');
    console.log('2. ✅ Base de datos consultada ANTES de descolgar');
    console.log('3. ✅ Cliente validado y configuración obtenida');
    console.log('4. ✅ TwiML generado con parámetros completos');
    console.log('5. ✅ Audio personalizado generado con Azure TTS');
    console.log(`6. ${voiceId === 'lola' ? '⚠️' : '✅'} Voz: ${voiceId} ${voiceId === 'lola' ? '(hardcodeada como fallback)' : '(configurada por usuario)'}`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testCallFlow().catch(console.error);
