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

// Ejecutar verificación
verifyRegistrationData()
  .then(() => {
    console.log('\n🎉 Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
