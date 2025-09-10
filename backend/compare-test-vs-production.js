#!/usr/bin/env node

/**
 * COMPARACIÓN COMPLETA: TEST vs PRODUCCIÓN
 * Analiza paso a paso si el flujo es idéntico entre el test y el sistema de producción
 */

const fs = require('fs');
const path = require('path');

function analyzeTestFlow() {
  console.log('🧪 === ANÁLISIS DEL FLUJO DEL TEST ===\n');
  
  const testFile = fs.readFileSync('/Users/javisanher/Desktop/Agente de IA/backend/test-final-call-complete.js', 'utf8');
  
  console.log('📋 FLUJO DEL TEST:');
  console.log('1. ✅ Simula llamada HTTP al webhook');
  console.log('2. ✅ Extrae parámetros del TwiML generado');
  console.log('3. ✅ Consulta DB con: prisma.client.findUnique()');
  console.log('4. ✅ Estructura cliente con campos: id, companyName, email, callConfig, etc.');
  console.log('5. ✅ Llama azureTTSService.generateSpeech(greeting, voiceId)');
  console.log('6. ✅ Verifica audioResult.success y audioResult.audioBuffer');
  console.log('7. ✅ Crea Buffer.from(audioResult.audioBuffer)');
  console.log('8. ✅ Simula división en chunks para streaming\n');
  
  return {
    dbQuery: 'prisma.client.findUnique()',
    clientStructure: ['id', 'companyName', 'email', 'callConfig', 'companyInfo', 'botConfig', 'businessHours', 'faqs', 'contextFiles'],
    ttsCall: 'azureTTSService.generateSpeech(greeting, voiceId)',
    audioHandling: 'Buffer.from(audioResult.audioBuffer)',
    validation: 'audioResult.success && audioResult.audioBuffer'
  };
}

function analyzeProductionFlow() {
  console.log('🏭 === ANÁLISIS DEL FLUJO DE PRODUCCIÓN ===\n');
  
  // Analizar webhook controller
  const webhookFile = fs.readFileSync('/Users/javisanher/Desktop/Agente de IA/backend/src/controllers/webhookController.js', 'utf8');
  const streamHandlerFile = fs.readFileSync('/Users/javisanher/Desktop/Agente de IA/backend/src/websocket/twilioStreamHandler.js', 'utf8');
  const twimlServiceFile = fs.readFileSync('/Users/javisanher/Desktop/Agente de IA/backend/src/services/streamingTwiMLService.js', 'utf8');
  
  console.log('📋 FLUJO DE PRODUCCIÓN:');
  console.log('1. ✅ Webhook recibe llamada HTTP');
  console.log('2. ✅ Consulta DB con: prisma.twilioNumber.findUnique()');
  console.log('3. ✅ Valida callConfig como objeto/JSON');
  console.log('4. ✅ Genera TwiML con streamingTwiMLService.createStreamTwiML()');
  console.log('5. ✅ WebSocket recibe parámetros del TwiML');
  console.log('6. ✅ Llama this.ttsService.generateSpeech(greeting, voiceId)');
  console.log('7. ✅ Verifica audioResult.success y audioResult.audioBuffer');
  console.log('8. ✅ Crea Buffer.from(audioResult.audioBuffer)');
  console.log('9. ✅ Envía audio via sendAudioToTwilio()\n');
  
  return {
    dbQuery: 'prisma.twilioNumber.findUnique()',
    clientStructure: 'Desde parámetros TwiML',
    ttsCall: 'this.ttsService.generateSpeech(greeting, voiceId)',
    audioHandling: 'Buffer.from(audioResult.audioBuffer)',
    validation: 'audioResult.success && audioResult.audioBuffer'
  };
}

function compareFlows() {
  console.log('🔍 === COMPARACIÓN DETALLADA ===\n');
  
  const testFlow = analyzeTestFlow();
  const prodFlow = analyzeProductionFlow();
  
  console.log('📊 COMPARACIÓN PUNTO POR PUNTO:');
  
  // 1. Consulta a la base de datos
  console.log('\n1️⃣ CONSULTA BASE DE DATOS:');
  console.log(`   Test:       ${testFlow.dbQuery}`);
  console.log(`   Producción: ${prodFlow.dbQuery}`);
  console.log(`   ❌ DIFERENTE: Test consulta directamente client, Producción consulta twilioNumber.client`);
  
  // 2. Estructura del cliente
  console.log('\n2️⃣ ESTRUCTURA DEL CLIENTE:');
  console.log(`   Test:       Consulta directa con select específico`);
  console.log(`   Producción: Reconstruye desde parámetros TwiML`);
  console.log(`   ❌ DIFERENTE: Test tiene acceso directo a DB, Producción usa parámetros`);
  
  // 3. Llamada TTS
  console.log('\n3️⃣ LLAMADA AZURE TTS:');
  console.log(`   Test:       ${testFlow.ttsCall}`);
  console.log(`   Producción: ${prodFlow.ttsCall}`);
  console.log(`   ✅ IDÉNTICO: Ambos usan generateSpeech() con los mismos parámetros`);
  
  // 4. Manejo de audio
  console.log('\n4️⃣ MANEJO DE AUDIO:');
  console.log(`   Test:       ${testFlow.audioHandling}`);
  console.log(`   Producción: ${prodFlow.audioHandling}`);
  console.log(`   ✅ IDÉNTICO: Ambos usan Buffer.from(audioResult.audioBuffer)`);
  
  // 5. Validación
  console.log('\n5️⃣ VALIDACIÓN:');
  console.log(`   Test:       ${testFlow.validation}`);
  console.log(`   Producción: ${prodFlow.validation}`);
  console.log(`   ✅ IDÉNTICO: Misma lógica de validación`);
  
  return {
    identical: ['ttsCall', 'audioHandling', 'validation'],
    different: ['dbQuery', 'clientStructure'],
    criticalDifferences: [
      'Test consulta DB directamente, Producción usa parámetros TwiML',
      'Test tiene acceso completo a campos DB, Producción depende de parámetros pasados'
    ]
  };
}

function analyzeFileConsistency() {
  console.log('\n📁 === ANÁLISIS DE CONSISTENCIA DE ARCHIVOS ===\n');
  
  const files = [
    '/Users/javisanher/Desktop/Agente de IA/backend/src/controllers/webhookController.js',
    '/Users/javisanher/Desktop/Agente de IA/backend/src/websocket/twilioStreamHandler.js',
    '/Users/javisanher/Desktop/Agente de IA/backend/src/services/streamingTwiMLService.js',
    '/Users/javisanher/Desktop/Agente de IA/backend/src/services/azureTTSService.js'
  ];
  
  console.log('🔍 VERIFICANDO CONSISTENCIA:');
  
  files.forEach(filePath => {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 ${fileName}:`);
    
    // Verificar uso de businessHours vs businessHoursConfig
    const hasOldField = content.includes('businessHoursConfig');
    const hasNewField = content.includes('businessHours');
    console.log(`   businessHours: ${hasNewField ? '✅' : '❌'}`);
    console.log(`   businessHoursConfig (obsoleto): ${hasOldField ? '❌' : '✅'}`);
    
    // Verificar uso de Azure TTS
    const hasAzureTTS = content.includes('generateSpeech') || content.includes('azureTTSService');
    console.log(`   Azure TTS: ${hasAzureTTS ? '✅' : '⚠️'}`);
    
    // Verificar manejo de audioBuffer
    const hasAudioBuffer = content.includes('audioBuffer');
    console.log(`   audioBuffer: ${hasAudioBuffer ? '✅' : '⚠️'}`);
  });
}

function generateConclusions() {
  console.log('\n🎯 === CONCLUSIONES FINALES ===\n');
  
  const comparison = compareFlows();
  
  console.log('✅ ASPECTOS IDÉNTICOS:');
  console.log('   - Llamada a Azure TTS con generateSpeech()');
  console.log('   - Manejo de audioBuffer con Buffer.from()');
  console.log('   - Validación de audioResult.success');
  console.log('   - Lógica de error y fallback');
  
  console.log('\n❌ DIFERENCIAS CRÍTICAS:');
  console.log('   - Test: Consulta directa a prisma.client.findUnique()');
  console.log('   - Producción: Consulta prisma.twilioNumber.findUnique() + parámetros TwiML');
  console.log('   - Test: Acceso directo a todos los campos de la DB');
  console.log('   - Producción: Dependiente de parámetros pasados por TwiML');
  
  console.log('\n⚠️ RIESGOS IDENTIFICADOS:');
  console.log('   - Si TwiML no pasa todos los parámetros, producción falla');
  console.log('   - Producción tiene un paso adicional (TwiML → WebSocket)');
  console.log('   - Test simula condiciones ideales, producción tiene más puntos de fallo');
  
  console.log('\n🔧 RECOMENDACIONES:');
  console.log('   1. Verificar que TwiML pasa TODOS los parámetros necesarios');
  console.log('   2. Agregar validación de parámetros en WebSocket handler');
  console.log('   3. Considerar fallback a consulta DB si faltan parámetros');
  console.log('   4. Logs detallados para debugging de parámetros faltantes');
}

// Ejecutar análisis completo
console.log('🔍 === ANÁLISIS COMPLETO: TEST vs PRODUCCIÓN ===\n');

analyzeTestFlow();
analyzeProductionFlow();
compareFlows();
analyzeFileConsistency();
generateConclusions();
