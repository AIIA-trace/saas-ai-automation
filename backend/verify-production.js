const { Client } = require('pg');

async function verifyProduction() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada');
    console.log('💡 Asegúrate de que DATABASE_URL esté en las variables de entorno');
    process.exit(1);
  }
  
  console.log('🔍 VERIFICANDO DATOS EN BASE DE DATOS DE PRODUCCIÓN...\n');
  console.log('🔗 Conectando a:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos de producción\n');
    
    // Buscar usuario específico: mibrotel@gmail.com
    console.log('🎯 BUSCANDO USUARIO: mibrotel@gmail.com');
    
    const userResult = await client.query('SELECT * FROM "Client" WHERE email = $1', ['mibrotel@gmail.com']);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('\n✅ USUARIO ENCONTRADO:');
      console.log('   📧 Email:', user.email);
      console.log('   🏢 Empresa:', user.companyName || 'No especificada');
      console.log('   👨‍💼 Contacto:', user.contactName || 'No especificado');
      console.log('   📞 Teléfono:', user.phone || 'No especificado');
      console.log('   📅 Registrado:', new Date(user.createdAt).toLocaleString());
      
      console.log('\n📋 TODOS LOS DATOS DEL USUARIO:');
      Object.entries(user).forEach(([key, value]) => {
        if (key === 'password') {
          console.log(`   🔒 ${key}: [PROTEGIDO]`);
        } else if (value === null || value === undefined) {
          console.log(`   ⚪ ${key}: [VACÍO]`);
        } else if (value instanceof Date) {
          console.log(`   📅 ${key}: ${value.toLocaleString()}`);
        } else {
          console.log(`   ✅ ${key}: "${value}"`);
        }
      });
      
      // Verificar campos nuevos específicamente
      const newFields = ['companyDescription', 'industry', 'website', 'address', 'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'];
      
      console.log('\n🆕 VERIFICACIÓN DE CAMPOS NUEVOS:');
      newFields.forEach(field => {
        const hasField = user.hasOwnProperty(field);
        const value = user[field];
        console.log(`   ${hasField ? '✅' : '❌'} ${field}: ${hasField ? (value || '[VACÍO]') : 'NO EXISTE'}`);
      });
      
    } else {
      console.log('\n❌ USUARIO mibrotel@gmail.com NO ENCONTRADO');
    }
    
    // Mostrar todos los usuarios
    const allUsersResult = await client.query('SELECT email, "companyName", "createdAt" FROM "Client" ORDER BY "createdAt" DESC;');
    
    console.log(`\n📊 TODOS LOS USUARIOS EN PRODUCCIÓN (${allUsersResult.rows.length}):`);
    allUsersResult.rows.forEach((user, index) => {
      const isTarget = user.email === 'mibrotel@gmail.com';
      const marker = isTarget ? '🎯' : '  ';
      console.log(`${marker} ${index + 1}. ${user.email} - ${user.companyName || 'Sin empresa'} - ${new Date(user.createdAt).toLocaleString()}`);
    });
    
    // Verificar estructura de la tabla
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 ESTRUCTURA DE LA TABLA Client (${structureResult.rows.length} campos):`);
    structureResult.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    // Verificar si faltan campos del schema
    const requiredFields = ['companyDescription', 'industry', 'website', 'address', 'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'];
    
    console.log('\n🎯 CAMPOS REQUERIDOS DEL SCHEMA:');
    requiredFields.forEach(field => {
      const exists = structureResult.rows.some(col => col.column_name === field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTA'}`);
    });
    
    const missingFields = requiredFields.filter(field => 
      !structureResult.rows.some(col => col.column_name === field)
    );
    
    if (missingFields.length > 0) {
      console.log(`\n🚨 CAMPOS FALTANTES (${missingFields.length}):`);
      missingFields.forEach(field => {
        console.log(`   ❌ ${field}`);
      });
      console.log('\n💡 Ejecuta migrate-production.js para agregar estos campos');
    } else {
      console.log('\n🎉 TODOS LOS CAMPOS DEL SCHEMA ESTÁN PRESENTES');
    }
    
  } catch (error) {
    console.error('❌ Error verificando producción:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.end();
  }
}

// Ejecutar verificación
verifyProduction()
  .then(() => {
    console.log('\n🎉 Verificación de producción completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
