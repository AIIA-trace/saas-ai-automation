const fs = require('fs');
const path = require('path');

const apiFilePath = path.join(__dirname, '../src/routes/api.js');

try {
    let content = fs.readFileSync(apiFilePath, 'utf8');
    
    // Buscar el select del endpoint GET /profile y agregar position
    const selectPattern = /(\s+phone: true,)(\s+website: true,)/;
    
    if (selectPattern.test(content)) {
        content = content.replace(selectPattern, '$1\n          position: true,$2');
        
        fs.writeFileSync(apiFilePath, content, 'utf8');
        console.log('✅ Campo position agregado exitosamente al endpoint GET /profile');
    } else {
        console.log('❌ No se pudo encontrar el patrón para agregar position');
    }
} catch (error) {
    console.error('❌ Error al agregar position:', error.message);
}
