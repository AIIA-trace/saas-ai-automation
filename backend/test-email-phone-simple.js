const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEmailPhoneInDatabase() {
  console.log('🔧 TESTING EMAIL AND PHONE IN DATABASE');
  console.log('======================================\n');

  try {
    // 1. Obtener datos actuales del usuario
    console.log('1. Consultando datos actuales en la base de datos...');
    const currentUser = await prisma.client.findUnique({
      where: { email: 'test@test.com' }
    });

    if (!currentUser) {
      console.error('❌ Usuario test@test.com no encontrado');
      return;
    }

    console.log('📋 Datos actuales en la tabla Client:');
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   Email: ${currentUser.email}`);
    console.log(`   Phone: ${currentUser.phone}`);
    console.log(`   Company: ${currentUser.companyName}`);
    console.log(`   Contact: ${currentUser.contactName}`);
    console.log(`   Industry: ${currentUser.industry}`);
    console.log(`   Address: ${currentUser.address}`);
    console.log(`   Website: ${currentUser.website}\n`);

    // 2. Verificar también en companyInfo
    const companyInfo = currentUser.companyInfo || {};
    console.log('📋 Datos en companyInfo (JSON):');
    console.log(`   Email: ${companyInfo.email || 'NULL'}`);
    console.log(`   Phone: ${companyInfo.phone || 'NULL'}`);
    console.log(`   Name: ${companyInfo.name || 'NULL'}`);
    console.log(`   Sector: ${companyInfo.sector || 'NULL'}`);
    console.log(`   Address: ${companyInfo.address || 'NULL'}`);
    console.log(`   Website: ${companyInfo.website || 'NULL'}\n`);

    // 3. Probar actualización directa con Prisma
    console.log('2. Probando actualización directa con nuevos valores...');
    const newEmail = 'updated@test.com';
    const newPhone = '+34 611 222 333';

    const updateResult = await prisma.client.update({
      where: { id: currentUser.id },
      data: {
        email: newEmail,
        phone: newPhone,
        companyInfo: {
          ...companyInfo,
          email: newEmail,
          phone: newPhone
        },
        updatedAt: new Date()
      }
    });

    console.log('✅ Actualización directa completada\n');

    // 4. Verificar cambios
    console.log('3. Verificando cambios después de la actualización...');
    const updatedUser = await prisma.client.findUnique({
      where: { id: currentUser.id }
    });

    console.log('📋 Datos después de la actualización:');
    console.log(`   Email: ${updatedUser.email} ${updatedUser.email === newEmail ? '✅' : '❌'}`);
    console.log(`   Phone: ${updatedUser.phone} ${updatedUser.phone === newPhone ? '✅' : '❌'}`);
    console.log(`   Company: ${updatedUser.companyName}`);
    console.log(`   Contact: ${updatedUser.contactName}\n`);

    const updatedCompanyInfo = updatedUser.companyInfo || {};
    console.log('📋 Datos en companyInfo después de la actualización:');
    console.log(`   Email: ${updatedCompanyInfo.email} ${updatedCompanyInfo.email === newEmail ? '✅' : '❌'}`);
    console.log(`   Phone: ${updatedCompanyInfo.phone} ${updatedCompanyInfo.phone === newPhone ? '✅' : '❌'}\n`);

    // 5. Restaurar valores originales
    console.log('4. Restaurando valores originales...');
    await prisma.client.update({
      where: { id: currentUser.id },
      data: {
        email: 'test@test.com',
        phone: '+34 600 000 000',
        companyInfo: {
          ...updatedCompanyInfo,
          email: 'test@test.com',
          phone: '+34 600 000 000'
        },
        updatedAt: new Date()
      }
    });

    console.log('✅ Valores originales restaurados\n');

    console.log('🎯 RESUMEN DEL TEST:');
    console.log('==================');
    
    if (updatedUser.email === newEmail && updatedUser.phone === newPhone) {
      console.log('✅ EMAIL Y PHONE SE PUEDEN ACTUALIZAR EN LA BASE DE DATOS');
      console.log('✅ La estructura de la base de datos es CORRECTA');
      console.log('✅ El problema debe estar en el endpoint PUT /api/client');
    } else {
      console.log('❌ EMAIL Y/O PHONE NO SE ACTUALIZAN EN LA BASE DE DATOS');
      console.log('❌ Problema en la estructura de la base de datos');
    }

  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test si se llama directamente
if (require.main === module) {
  testEmailPhoneInDatabase();
}

module.exports = { testEmailPhoneInDatabase };
