const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function executeMigration() {
  const prisma = new PrismaClient({
    log: ['error', 'warn', 'info'],
    errorFormat: 'pretty'
  });
  
  try {
    console.log('🔧 EJECUTANDO MIGRACIÓN MANUAL...\n');
    
    // Leer el archivo SQL de migración
    const migrationSQL = fs.readFileSync('./migration-complete-fields.sql', 'utf8');
    
    // Dividir en comandos individuales
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 0);
    
    console.log(`📋 Ejecutando ${commands.length} comandos SQL...\n`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.includes('ALTER TABLE')) {
        console.log(`${i + 1}. Ejecutando: ${command.substring(0, 50)}...`);
        
        try {
          await prisma.$executeRawUnsafe(command);
          console.log('   ✅ Exitoso');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('   ⚪ Campo ya existe (omitido)');
          } else {
            console.log('   ❌ Error:', error.message);
          }
        }
      }
    }
    
    console.log('\n🔍 VERIFICANDO ESTRUCTURA ACTUALIZADA...');
    
    // Verificar que los campos se agregaron
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'Client' 
        ORDER BY ordinal_position;
      `;
      
      console.log('\n📋 CAMPOS ACTUALES EN LA TABLA Client:');
      testQuery.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'Opcional' : 'Requerido'}`);
      });
      
      // Verificar campos específicos que necesitamos
      const requiredFields = ['companyDescription', 'industry', 'website', 'address', 'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'];
      
      console.log('\n🎯 VERIFICACIÓN DE CAMPOS NUEVOS:');
      requiredFields.forEach(field => {
        const exists = testQuery.some(col => col.column_name === field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTA'}`);
      });
      
    } catch (error) {
      console.error('❌ Error verificando estructura:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
executeMigration()
  .then(() => {
    console.log('\n🎉 Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
