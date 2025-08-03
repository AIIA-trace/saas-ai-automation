const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// Nueva URL de la base de datos
const newDatabaseUrl = 'postgresql://saas_ai_database_mslf_user:7e6BgJ5KitklpOF79HTPgHmkLsLUVq7b@dpg-d1o2s3juibrs73a6quf0-a.frankfurt-postgres.render.com/saas_ai_database_mslf';

try {
  // Leer el archivo .env actual
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 Archivo .env encontrado');
  } else {
    console.log('📄 Creando nuevo archivo .env');
  }

  // Actualizar o agregar DATABASE_URL
  const lines = envContent.split('\n');
  let updated = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('DATABASE_URL=')) {
      lines[i] = `DATABASE_URL="${newDatabaseUrl}"`;
      updated = true;
      console.log('✅ DATABASE_URL actualizada');
      break;
    }
  }
  
  if (!updated) {
    lines.push(`DATABASE_URL="${newDatabaseUrl}"`);
    console.log('✅ DATABASE_URL agregada');
  }
  
  // Escribir el archivo actualizado
  fs.writeFileSync(envPath, lines.join('\n'));
  console.log('💾 Archivo .env guardado exitosamente');
  
  console.log('\n🔍 Verificando contenido:');
  const updatedContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlLine = updatedContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
  console.log('DATABASE_URL:', dbUrlLine ? 'Configurada correctamente' : 'No encontrada');
  
} catch (error) {
  console.error('❌ Error actualizando .env:', error.message);
}
