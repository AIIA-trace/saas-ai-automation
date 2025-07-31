const { PrismaClient } = require('@prisma/client');

async function verifyRegistrationData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 VERIFICANDO DATOS DE REGISTRO EN BASE DE DATOS...\n');
    
    // Primero verificar qué campos existen
    console.log('📋 Verificando estructura de la tabla Client...');
    
    // Obtener todos los clientes con campos básicos que sabemos que existen
    const clients = await prisma.client.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 TOTAL DE CLIENTES REGISTRADOS: ${clients.length}\n`);
    
    if (clients.length === 0) {
      console.log('❌ No hay clientes registrados en la base de datos');
      return;
    }
    
    // Mostrar datos de cada cliente (todos los campos disponibles)
    clients.forEach((client, index) => {
      console.log(`👤 CLIENTE ${index + 1}:`);
      console.log('   DATOS COMPLETOS:');
      
      // Mostrar todos los campos del cliente
      Object.entries(client).forEach(([key, value]) => {
        if (key === 'password') {
          console.log(`   🔒 ${key}: [OCULTO POR SEGURIDAD]`);
        } else if (key === 'apiKey') {
          console.log(`   🔑 ${key}: ${value ? '[EXISTE]' : '[NO DEFINIDO]'}`);
        } else if (value instanceof Date) {
          console.log(`   📅 ${key}: ${value.toLocaleString()}`);
        } else if (value === null || value === undefined) {
          console.log(`   ⚪ ${key}: [VACIÓ]`);
        } else {
          console.log(`   ✅ ${key}: "${value}"`);
        }
      });
      
      console.log('   ' + '─'.repeat(60));
    });
    
    // Verificar el cliente más reciente
    if (clients.length > 0) {
      const latestClient = clients[0];
      console.log('\n🆕 ÚLTIMO CLIENTE REGISTRADO:');
      
      // Mostrar campos principales si existen
      if (latestClient.email) console.log(`   📧 Email: ${latestClient.email}`);
      if (latestClient.companyName) console.log(`   🏢 Empresa: ${latestClient.companyName}`);
      if (latestClient.createdAt) console.log(`   📅 Registrado: ${latestClient.createdAt.toLocaleString()}`);
      
      console.log('\n🔍 ANÁLISIS DE CAMPOS:');
      
      // Contar campos no vacíos
      const allFields = Object.keys(latestClient);
      const filledFields = allFields.filter(field => {
        const value = latestClient[field];
        return value !== null && value !== undefined && value !== '';
      });
      
      console.log(`   📊 Campos totales: ${allFields.length}`);
      console.log(`   ✅ Campos con datos: ${filledFields.length}`);
      console.log(`   📈 Completitud: ${((filledFields.length / allFields.length) * 100).toFixed(1)}%`);
      
      // Mostrar campos vacíos
      const emptyFields = allFields.filter(field => {
        const value = latestClient[field];
        return value === null || value === undefined || value === '';
      });
      
      if (emptyFields.length > 0) {
        console.log(`\n⚪ CAMPOS VACÍOS (${emptyFields.length}):`);
        emptyFields.forEach(field => console.log(`   - ${field}`));
      }
      
      // Mostrar campos con datos
      console.log(`\n✅ CAMPOS CON DATOS (${filledFields.length}):`);
      filledFields.forEach(field => {
        const value = latestClient[field];
        if (field === 'password') {
          console.log(`   - ${field}: [PROTEGIDO]`);
        } else if (field === 'apiKey') {
          console.log(`   - ${field}: [EXISTE]`);
        } else {
          console.log(`   - ${field}: "${value}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verificar consistencia de campos entre formularios y base de datos
 */
async function verifyFieldConsistency() {
  console.log('\n🔍 ===== VERIFICANDO CONSISTENCIA DE CAMPOS =====');
  
  try {
    // Obtener esquema de la tabla Client
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      ORDER BY column_name;
    `;
    
    console.log('\n📋 CAMPOS EN BASE DE DATOS:');
    const dbFields = {};
    tableInfo.forEach(col => {
      dbFields[col.column_name] = {
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      };
      console.log(`  ✅ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
    // Verificar campos críticos para registro
    const criticalFields = [
      'email', 'companyName', 'companyDescription', 
      'industry', 'phone', 'address', 'website'
    ];
    
    console.log('\n🔍 VERIFICANDO CAMPOS CRÍTICOS:');
    let missingFields = [];
    
    criticalFields.forEach(field => {
      if (dbFields[field]) {
        console.log(`  ✅ ${field}: Existe en BD`);
      } else {
        console.log(`  ❌ ${field}: FALTA en BD`);
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      console.log(`\n⚠️ CAMPOS FALTANTES: ${missingFields.join(', ')}`);
      console.log('💡 Ejecuta la migración: ALTER TABLE "Client" ADD COLUMN "companyDescription" TEXT;');
    } else {
      console.log('\n✅ Todos los campos críticos están presentes');
    }
    
    // Mapeo de campos entre formularios
    console.log('\n📝 MAPEO DE CAMPOS:');
    const fieldMapping = {
      'email': { registration: 'email', botConfig: 'contact_email', db: 'email' },
      'phone': { registration: 'contactPhone', botConfig: 'main_phone', db: 'phone' },
      'companyName': { registration: 'companyName', botConfig: 'company_name', db: 'companyName' },
      'companyDescription': { registration: 'companyDescription', botConfig: 'company_description', db: 'companyDescription' },
      'industry': { registration: 'businessSector', botConfig: 'industry', db: 'industry' }
    };
    
    Object.entries(fieldMapping).forEach(([field, mapping]) => {
      console.log(`  🔄 ${field}:`);
      console.log(`    📝 Registro: ${mapping.registration}`);
      console.log(`    ⚙️ Bot Config: ${mapping.botConfig}`);
      console.log(`    🗄️ Base de Datos: ${mapping.db}`);
    });
    
    return { dbFields, missingFields, fieldMapping };
    
  } catch (error) {
    console.error('❌ Error verificando consistencia:', error);
    throw error;
  }
}

// Ejecutar verificaciones
async function runAllVerifications() {
  try {
    await verifyRegistrationData();
    await verifyFieldConsistency();
    
    console.log('\n🎉 ===== VERIFICACIÓN COMPLETADA =====');
    console.log('✅ Datos de registro verificados');
    console.log('✅ Consistencia de campos verificada');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Probar registro completo con test-field-consistency.html');
    console.log('2. Verificar carga de perfil en dashboard');
    console.log('3. Probar configuración de bot');
    console.log('4. Confirmar que no hay bucles de redirección');
    
  } catch (error) {
    console.error('💥 Error en verificaciones:', error);
    throw error;
  }
}

runAllVerifications()
  .then(() => {
    console.log('\n🎉 Todas las verificaciones completadas exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
