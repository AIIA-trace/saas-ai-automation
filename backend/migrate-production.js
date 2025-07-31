const { Client } = require('pg');

async function migrateProduction() {
  // URL de la base de datos de producción (Render)
  // Esta debería estar en las variables de entorno de Render
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada');
    console.log('💡 Asegúrate de que DATABASE_URL esté en las variables de entorno');
    process.exit(1);
  }
  
  console.log('🔧 EJECUTANDO MIGRACIÓN EN BASE DE DATOS DE PRODUCCIÓN...\n');
  console.log('🔗 Conectando a:', DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Ocultar password
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Para Render
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos de producción\n');
    
    // Lista de migraciones a ejecutar
    const migrations = [
      {
        name: 'companyDescription',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "companyDescription" TEXT;`
      },
      {
        name: 'industry',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "industry" TEXT;`
      },
      {
        name: 'website',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "website" TEXT;`
      },
      {
        name: 'address',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address" TEXT;`
      },
      {
        name: 'role',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'client';`
      },
      {
        name: 'isActive',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;`
      },
      {
        name: 'avatar',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "avatar" TEXT;`
      },
      {
        name: 'timezone',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';`
      },
      {
        name: 'language',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'es';`
      },
      {
        name: 'trialEndDate',
        sql: `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP;`
      }
    ];
    
    console.log(`📋 Ejecutando ${migrations.length} migraciones...\n`);
    
    for (const migration of migrations) {
      console.log(`🔧 Agregando campo: ${migration.name}`);
      
      try {
        await client.query(migration.sql);
        console.log('   ✅ Exitoso');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('   ⚪ Campo ya existe (omitido)');
        } else {
          console.log('   ❌ Error:', error.message);
        }
      }
    }
    
    console.log('\n🔍 VERIFICANDO ESTRUCTURA ACTUALIZADA...');
    
    // Verificar estructura de la tabla
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 CAMPOS ACTUALES EN LA TABLA Client:');
    result.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'Opcional' : 'Requerido'}`);
    });
    
    // Verificar campos específicos que necesitamos
    const requiredFields = ['companyDescription', 'industry', 'website', 'address', 'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'];
    
    console.log('\n🎯 VERIFICACIÓN DE CAMPOS NUEVOS:');
    requiredFields.forEach(field => {
      const exists = result.rows.some(col => col.column_name === field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTA'}`);
    });
    
    const existingFields = requiredFields.filter(field => 
      result.rows.some(col => col.column_name === field)
    );
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   📋 Total de campos: ${result.rows.length}`);
    console.log(`   🆕 Campos nuevos: ${existingFields.length}/${requiredFields.length}`);
    console.log(`   📈 Completitud: ${Math.round((existingFields.length / requiredFields.length) * 100)}%`);
    
    // Verificar usuarios existentes
    const usersResult = await client.query('SELECT email, "companyName", "createdAt" FROM "Client" ORDER BY "createdAt" DESC LIMIT 5;');
    
    console.log(`\n👥 USUARIOS EN PRODUCCIÓN (${usersResult.rows.length}):`);
    usersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.companyName || 'Sin empresa'} - ${new Date(user.createdAt).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   - DATABASE_URL incorrecta');
      console.log('   - Base de datos no accesible');
      console.log('   - Credenciales incorrectas');
    }
    
    console.error('Stack completo:', error.stack);
  } finally {
    await client.end();
  }
}

// Ejecutar migración
migrateProduction()
  .then(() => {
    console.log('\n🎉 Migración de producción completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
