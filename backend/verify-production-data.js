const { PrismaClient } = require('@prisma/client');

async function verifyProductionData() {
  // Usar la misma configuración que el servidor en producción
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
  
  try {
    console.log('🔍 VERIFICANDO DATOS EN BASE DE DATOS DE PRODUCCIÓN...\n');
    
    // Obtener todos los clientes registrados
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
    
    // Mostrar todos los clientes
    clients.forEach((client, index) => {
      console.log(`👤 CLIENTE ${index + 1}:`);
      console.log(`   📧 Email: ${client.email}`);
      console.log(`   🏢 Empresa: ${client.companyName || 'No especificada'}`);
      console.log(`   👨‍💼 Contacto: ${client.contactName || 'No especificado'}`);
      console.log(`   📞 Teléfono: ${client.phone || 'No especificado'}`);
      console.log(`   📅 Registrado: ${client.createdAt.toLocaleString()}`);
      
      // Verificar campos nuevos si existen
      if (client.companyDescription !== undefined) {
        console.log(`   📝 Descripción: ${client.companyDescription || 'No especificada'}`);
      }
      if (client.industry !== undefined) {
        console.log(`   🏭 Industria: ${client.industry || 'No especificada'}`);
      }
      if (client.website !== undefined) {
        console.log(`   🌐 Website: ${client.website || 'No especificado'}`);
      }
      if (client.address !== undefined) {
        console.log(`   📍 Dirección: ${client.address || 'No especificada'}`);
      }
      if (client.role !== undefined) {
        console.log(`   🔑 Rol: ${client.role}`);
      }
      if (client.isActive !== undefined) {
        console.log(`   ✅ Activo: ${client.isActive ? 'Sí' : 'No'}`);
      }
      if (client.trialEndDate !== undefined) {
        console.log(`   ⏰ Trial hasta: ${client.trialEndDate ? client.trialEndDate.toLocaleDateString() : 'No definido'}`);
      }
      
      console.log('   ' + '─'.repeat(60));
    });
    
    // Verificar estructura de la tabla
    console.log('\n🔍 VERIFICANDO ESTRUCTURA DE LA TABLA:');
    
    if (clients.length > 0) {
      const sampleClient = clients[0];
      const allFields = Object.keys(sampleClient);
      
      console.log(`📋 Campos disponibles (${allFields.length}):`);
      allFields.forEach(field => {
        console.log(`   - ${field}`);
      });
      
      // Verificar si los campos nuevos existen
      const expectedNewFields = [
        'companyDescription', 'industry', 'website', 'address', 
        'role', 'isActive', 'avatar', 'timezone', 'language', 'trialEndDate'
      ];
      
      console.log('\n🆕 CAMPOS NUEVOS DEL SCHEMA:');
      expectedNewFields.forEach(field => {
        const exists = allFields.includes(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'EXISTE' : 'FALTA'}`);
      });
    }
    
    // Mostrar usuarios registrados en las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentClients = clients.filter(client => client.createdAt > yesterday);
    
    if (recentClients.length > 0) {
      console.log(`\n🕐 REGISTROS RECIENTES (últimas 24h): ${recentClients.length}`);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.email} - ${client.createdAt.toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error.message);
    
    // Si es error de conexión, mostrar información útil
    if (error.message.includes('connect')) {
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   - Base de datos local no configurada');
      console.log('   - Variables de entorno diferentes entre local y producción');
      console.log('   - Conexión a base de datos incorrecta');
    }
    
    console.error('Stack completo:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verifyProductionData()
  .then(() => {
    console.log('\n🎉 Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
