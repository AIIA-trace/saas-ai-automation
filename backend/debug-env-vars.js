#!/usr/bin/env node

/**
 * Script para verificar variables de entorno en producción
 */

// Cargar variables de entorno
require('dotenv').config();

console.log('🔍 === VERIFICACIÓN DE VARIABLES DE ENTORNO ===\n');

// Variables críticas para Azure TTS
const criticalVars = [
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'NODE_ENV'
];

console.log('📋 Variables críticas:');
criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mostrar solo los primeros caracteres por seguridad
    const maskedValue = value.length > 10 
      ? `${value.substring(0, 8)}...` 
      : value;
    console.log(`   ✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`   ❌ ${varName}: NO CONFIGURADA`);
  }
});

console.log('\n🎯 Diagnóstico Azure TTS:');

// Probar Azure TTS directamente
try {
  const azureTTSService = require('./src/services/azureTTSService');
  
  console.log('   📤 Inicializando servicio Azure TTS...');
  
  // Verificar configuración
  if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    console.log('   ✅ Variables de Azure configuradas');
    
    // Intentar generar audio de prueba
    console.log('   📤 Generando audio de prueba...');
    
    azureTTSService.generateSpeech('Prueba de audio en producción', 'lola')
      .then(result => {
        if (result && result.audioBuffer && result.audioBuffer.length > 0) {
          console.log(`   ✅ Audio generado: ${result.audioBuffer.length} bytes`);
        } else {
          console.log('   ❌ No se generó audio válido');
        }
      })
      .catch(error => {
        console.log(`   ❌ Error generando audio: ${error.message}`);
      });
      
  } else {
    console.log('   ❌ Variables de Azure NO configuradas');
  }
  
} catch (error) {
  console.log(`   ❌ Error cargando servicio Azure TTS: ${error.message}`);
}

console.log('\n🏁 Verificación completada');
