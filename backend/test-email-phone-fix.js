const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testEmailPhoneFix() {
  console.log('🔧 TESTING EMAIL AND PHONE FIELD FIX');
  console.log('=====================================\n');

  try {
    // 1. Obtener datos actuales del usuario
    console.log('1. Consultando datos actuales...');
    const currentUser = await prisma.client.findUnique({
      where: { email: 'test@test.com' }
    });

    if (!currentUser) {
      console.error('❌ Usuario test@test.com no encontrado');
      return;
    }

    console.log('📋 Datos actuales:');
    console.log(`   Email: ${currentUser.email}`);
    console.log(`   Phone: ${currentUser.phone}`);
    console.log(`   Company: ${currentUser.companyName}`);
    console.log(`   Contact: ${currentUser.contactName}\n`);

    // 2. Simular login para obtener token
    console.log('2. Obteniendo token de autenticación...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Error en login:', loginData.error);
      return;
    }

    const token = loginData.token;
    console.log('✅ Token obtenido correctamente\n');

    // 3. Probar actualización con nuevos valores
    console.log('3. Probando actualización de email y phone...');
    const newEmail = 'updated@test.com';
    const newPhone = '+34 611 222 333';

    const updateData = {
      profile: {
        email: newEmail,
        phone: newPhone,
        companyName: currentUser.companyName,
        contactName: currentUser.contactName,
        industry: currentUser.industry || 'Technology',
        address: currentUser.address || 'Test Address',
        website: currentUser.website || 'https://test.com'
      }
    };

    console.log('📤 Enviando datos:', JSON.stringify(updateData, null, 2));

    const updateResponse = await fetch('http://localhost:3000/api/client', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      console.error('❌ Error en actualización:', updateResult.error);
      return;
    }

    console.log('✅ Actualización exitosa\n');

    // 4. Verificar cambios en la base de datos
    console.log('4. Verificando cambios en la base de datos...');
    const updatedUser = await prisma.client.findUnique({
      where: { id: currentUser.id }
    });

    console.log('📋 Datos después de la actualización:');
    console.log(`   Email: ${updatedUser.email} ${updatedUser.email === newEmail ? '✅' : '❌'}`);
    console.log(`   Phone: ${updatedUser.phone} ${updatedUser.phone === newPhone ? '✅' : '❌'}`);
    console.log(`   Company: ${updatedUser.companyName}`);
    console.log(`   Contact: ${updatedUser.contactName}\n`);

    // 5. Verificar también en companyInfo
    const companyInfo = updatedUser.companyInfo || {};
    console.log('📋 Datos en companyInfo:');
    console.log(`   Email: ${companyInfo.email} ${companyInfo.email === newEmail ? '✅' : '❌'}`);
    console.log(`   Phone: ${companyInfo.phone} ${companyInfo.phone === newPhone ? '✅' : '❌'}\n`);

    // 6. Restaurar valores originales
    console.log('5. Restaurando valores originales...');
    const restoreData = {
      profile: {
        email: 'test@test.com',
        phone: '+34 600 000 000',
        companyName: currentUser.companyName,
        contactName: currentUser.contactName,
        industry: currentUser.industry || 'Technology',
        address: currentUser.address || 'Test Address',
        website: currentUser.website || 'https://test.com'
      }
    };

    const restoreResponse = await fetch('http://localhost:3000/api/client', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(restoreData)
    });

    const restoreResult = await restoreResponse.json();
    
    if (restoreResult.success) {
      console.log('✅ Valores originales restaurados');
    } else {
      console.error('❌ Error restaurando valores:', restoreResult.error);
    }

    console.log('\n🎯 RESUMEN DEL TEST:');
    console.log('==================');
    
    if (updatedUser.email === newEmail && updatedUser.phone === newPhone) {
      console.log('✅ EMAIL Y PHONE SE ACTUALIZAN CORRECTAMENTE');
      console.log('✅ El problema ha sido SOLUCIONADO');
    } else {
      console.log('❌ EMAIL Y/O PHONE NO SE ACTUALIZAN');
      console.log('❌ El problema PERSISTE');
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
  testEmailPhoneFix();
}

module.exports = { testEmailPhoneFix };
