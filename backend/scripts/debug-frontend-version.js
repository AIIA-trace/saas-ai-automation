const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO VERSIÓN DEL FRONTEND EN PRODUCCIÓN');
console.log('==================================================');

// Ruta del archivo JavaScript del frontend
const frontendJsPath = path.join(__dirname, '../../frontend/js/dashboard-simple-clean.js');

try {
    // Leer el archivo
    const content = fs.readFileSync(frontendJsPath, 'utf8');
    
    // Buscar la línea con la versión
    const versionMatch = content.match(/FRONTEND ACTUALIZADO - VERSIÓN ([^']+)/);
    
    if (versionMatch) {
        console.log('✅ Versión encontrada:', versionMatch[1]);
    } else {
        console.log('❌ No se encontró la línea de versión');
    }
    
    // Verificar si existe la función collectBusinessHoursConfig
    const hasCollectFunction = content.includes('collectBusinessHoursConfig');
    console.log('✅ Función collectBusinessHoursConfig existe:', hasCollectFunction);
    
    // Verificar si existe el mapeo de días (no debería existir)
    const hasDayMapping = content.includes('dayMapping');
    console.log('❌ Mapeo de días (no debería existir):', hasDayMapping);
    
    // Verificar líneas específicas
    const hasAsyncCollection = content.includes('Se recopilará de forma asíncrona después');
    console.log('✅ Recopilación asíncrona configurada:', hasAsyncCollection);
    
    // Buscar la línea exacta donde se recopila businessHoursConfig
    const lines = content.split('\n');
    let foundConfigLine = false;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('config.businessHoursConfig = collectBusinessHoursConfig()')) {
            console.log('✅ Línea de recopilación encontrada en línea:', i + 1);
            foundConfigLine = true;
            break;
        }
    }
    
    if (!foundConfigLine) {
        console.log('❌ No se encontró la línea de recopilación de businessHoursConfig');
    }
    
    console.log('\n📊 RESUMEN:');
    console.log('- Archivo existe:', fs.existsSync(frontendJsPath));
    console.log('- Tamaño del archivo:', content.length, 'caracteres');
    console.log('- Última modificación:', fs.statSync(frontendJsPath).mtime);
    
} catch (error) {
    console.error('❌ Error leyendo el archivo:', error.message);
}
