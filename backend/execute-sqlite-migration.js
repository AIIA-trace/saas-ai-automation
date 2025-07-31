const { PrismaClient } = require('@prisma/client');

async function executeSQLiteMigration() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
  
  try {
    console.log('🔧 EJECUTANDO MIGRACIÓN PARA SQLITE...\n');
    
    // Lista de campos a agregar con sus tipos
    const fieldsToAdd = [
      { name: 'companyDescription', type: 'TEXT', default: null },
      { name: 'industry', type: 'TEXT', default: null },
      { name: 'website', type: 'TEXT', default: null },
      { name: 'address', type: 'TEXT', default: null },
      { name: 'role', type: 'TEXT', default: "'client'" },
      { name: 'isActive', type: 'BOOLEAN', default: 'true' },
      { name: 'avatar', type: 'TEXT', default: null },
      { name: 'timezone', type: 'TEXT', default: "'UTC'" },
      { name: 'language', type: 'TEXT', default: "'es'" },
      { name: 'trialEndDate', type: 'DATETIME', default: null }
    ];
    
    console.log(`📋 Agregando ${fieldsToAdd.length} campos...\n`);
    
    for (const field of fieldsToAdd) {
      console.log(`🔧 Agregando campo: ${field.name} (${field.type})`);
      
      try {
        let sql = `ALTER TABLE "Client" ADD COLUMN "${field.name}" ${field.type}`;
        if (field.default && field.default !== 'null') {
          sql += ` DEFAULT ${field.default}`;
        }
        
        await prisma.$executeRawUnsafe(sql);
        console.log('   ✅ Exitoso');
        
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('   ⚪ Campo ya existe (omitido)');
        } else {
          console.log('   ❌ Error:', error.message);
        }
      }
    }
    
    console.log('\n🔍 VERIFICANDO ESTRUCTURA ACTUALIZADA...');
    
    // Verificar usando PRAGMA para SQLite
    try {
      const columns = await prisma.$queryRaw`PRAGMA table_info(Client);`;
      
      console.log('\n📋 CAMPOS ACTUALES EN LA TABLA Client:');
      columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.name} (${col.type}) - ${col.notnull === 0 ? 'Opcional' : 'Requerido'}`);
      });
      
      // Verificar campos específicos que necesitamos
      const requiredFields = ['companyDescription', 'industry', 'website', 'address', 'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'];
      
      console.log('\n🎯 VERIFICACIÓN DE CAMPOS NUEVOS:');
      requiredFields.forEach(field => {
        const exists = columns.some(col => col.name === field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTA'}`);
      });
      
      // Contar campos totales
      const totalFields = columns.length;
      const newFields = requiredFields.filter(field => 
        columns.some(col => col.name === field)
      ).length;
      
      console.log(`\n📊 RESUMEN:`);
      console.log(`   📋 Total de campos: ${totalFields}`);
      console.log(`   🆕 Campos nuevos agregados: ${newFields}/${requiredFields.length}`);
      console.log(`   📈 Completitud: ${Math.round((newFields / requiredFields.length) * 100)}%`);
      
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
executeSQLiteMigration()
  .then(() => {
    console.log('\n🎉 Migración SQLite completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
