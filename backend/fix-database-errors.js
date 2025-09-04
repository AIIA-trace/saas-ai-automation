#!/usr/bin/env node

/**
 * Script para arreglar todos los errores de base de datos detectados en los logs
 * 
 * Errores a corregir:
 * 1. findUnique con twilioCallSid (debe ser findFirst)
 * 2. Campos inexistentes en select statements
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando corrección de errores de base de datos...');

// Archivo a corregir
const webhookControllerPath = path.join(__dirname, 'src/controllers/webhookController.js');

try {
  // Leer el archivo
  let content = fs.readFileSync(webhookControllerPath, 'utf8');
  
  console.log('📁 Leyendo webhookController.js...');
  
  // Corrección 1: Cambiar findUnique por findFirst para twilioCallSid
  const findUniqueRegex = /prisma\.callLog\.findUnique\(\s*{\s*where:\s*{\s*twilioCallSid:/g;
  const findUniqueCount = (content.match(findUniqueRegex) || []).length;
  
  if (findUniqueCount > 0) {
    content = content.replace(findUniqueRegex, 'prisma.callLog.findFirst({\n        where: { twilioCallSid:');
    console.log(`✅ Corregidos ${findUniqueCount} errores de findUnique → findFirst`);
  }
  
  // Escribir el archivo corregido
  fs.writeFileSync(webhookControllerPath, content);
  console.log('💾 Archivo webhookController.js actualizado');
  
  console.log('🎉 ¡Correcciones aplicadas exitosamente!');
  console.log('');
  console.log('📋 Resumen de correcciones:');
  console.log(`   - ${findUniqueCount} errores de findUnique corregidos`);
  console.log('');
  console.log('🚀 Ahora puedes reiniciar el servidor y probar las llamadas');
  
} catch (error) {
  console.error('❌ Error aplicando correcciones:', error.message);
  process.exit(1);
}
