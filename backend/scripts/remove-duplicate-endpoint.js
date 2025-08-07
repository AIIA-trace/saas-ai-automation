const fs = require('fs');
const path = require('path');

// Script para eliminar el segundo endpoint PUT /client duplicado
const apiFilePath = path.join(__dirname, '../src/routes/api.js');

console.log('🔧 Eliminando segundo endpoint PUT /client duplicado...');

// Leer el archivo
let content = fs.readFileSync(apiFilePath, 'utf8');
const lines = content.split('\n');

console.log(`📄 Archivo tiene ${lines.length} líneas`);

// Encontrar las líneas de los endpoints PUT /client
const putClientLines = [];
lines.forEach((line, index) => {
  if (line.includes("router.put('/client'")) {
    putClientLines.push(index + 1); // +1 porque las líneas empiezan en 1
  }
});

console.log(`🔍 Endpoints PUT /client encontrados en líneas: ${putClientLines.join(', ')}`);

if (putClientLines.length !== 2) {
  console.error(`❌ Error: Se esperaban 2 endpoints, pero se encontraron ${putClientLines.length}`);
  process.exit(1);
}

// El segundo endpoint empieza en la línea putClientLines[1]
// Necesitamos encontrar dónde termina (buscar el }) que cierra la función
const secondEndpointStart = putClientLines[1] - 1; // -1 porque el array empieza en 0

console.log(`🎯 Segundo endpoint empieza en línea ${secondEndpointStart + 1}`);

// Buscar el final del segundo endpoint
let braceCount = 0;
let secondEndpointEnd = -1;
let foundStart = false;

for (let i = secondEndpointStart; i < lines.length; i++) {
  const line = lines[i];
  
  // Contar llaves de apertura y cierre
  const openBraces = (line.match(/{/g) || []).length;
  const closeBraces = (line.match(/}/g) || []).length;
  
  if (line.includes("router.put('/client'")) {
    foundStart = true;
    braceCount += openBraces - closeBraces;
  } else if (foundStart) {
    braceCount += openBraces - closeBraces;
  }
  
  // Si llegamos a 0 llaves y ya encontramos el inicio, hemos terminado
  if (foundStart && braceCount === 0 && line.includes('});')) {
    secondEndpointEnd = i;
    break;
  }
}

if (secondEndpointEnd === -1) {
  console.error('❌ Error: No se pudo encontrar el final del segundo endpoint');
  process.exit(1);
}

console.log(`🎯 Segundo endpoint termina en línea ${secondEndpointEnd + 1}`);
console.log(`📏 Eliminando líneas ${secondEndpointStart + 1} a ${secondEndpointEnd + 1} (${secondEndpointEnd - secondEndpointStart + 1} líneas)`);

// Eliminar las líneas del segundo endpoint
const newLines = [
  ...lines.slice(0, secondEndpointStart),
  '// SEGUNDO ENDPOINT PUT /client ELIMINADO - Solo debe existir el primer endpoint con el fix',
  '',
  ...lines.slice(secondEndpointEnd + 1)
];

// Escribir el archivo modificado
const newContent = newLines.join('\n');
fs.writeFileSync(apiFilePath, newContent, 'utf8');

console.log('✅ Segundo endpoint PUT /client eliminado exitosamente');
console.log(`📄 Archivo ahora tiene ${newLines.length} líneas (eliminadas ${lines.length - newLines.length} líneas)`);

// Verificar que solo queda un endpoint
const newContentCheck = fs.readFileSync(apiFilePath, 'utf8');
const remainingEndpoints = (newContentCheck.match(/router\.put\('\/client'/g) || []).length;
console.log(`🔍 Endpoints PUT /client restantes: ${remainingEndpoints}`);

if (remainingEndpoints === 1) {
  console.log('✅ Perfecto: Solo queda un endpoint PUT /client');
} else {
  console.error(`❌ Error: Quedan ${remainingEndpoints} endpoints, debería ser 1`);
}
