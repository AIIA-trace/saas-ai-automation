const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 PROBANDO REGISTRO CON mibrotel@gmail.com...\n');
    
    const registrationData = {
      email: 'mibrotel@gmail.com',
      password: 'password123',
      companyName: 'Mi Brotel Company',
      companyDescription: 'Una empresa de prueba para verificar el registro',
      businessSector: 'Tecnología',
      contactPhone: '+34 666 777 888',
      plan: 'trial'
    };
    
    console.log('📤 DATOS DE REGISTRO:');
    console.log(JSON.stringify(registrationData, null, 2));
    
    console.log('\n🚀 Enviando petición al backend local...');
    
    const response = await axios.post('http://localhost:10000/api/auth/register', registrationData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('\n✅ REGISTRO EXITOSO:');
    console.log('Status:', response.status);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    
    // Verificar que el usuario se creó
    console.log('\n🔍 Verificando que el usuario se guardó...');
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const newUser = await prisma.client.findUnique({
      where: { email: 'mibrotel@gmail.com' }
    });
    
    if (newUser) {
      console.log('\n🎉 USUARIO ENCONTRADO EN BD:');
      console.log('   📧 Email:', newUser.email);
      console.log('   🏢 Empresa:', newUser.companyName);
      console.log('   👨‍💼 Contacto:', newUser.contactName);
      console.log('   📞 Teléfono:', newUser.phone);
      console.log('   📅 Registrado:', newUser.createdAt.toLocaleString());
      
      // Verificar campos específicos
      console.log('\n📋 VERIFICACIÓN DE CAMPOS:');
      console.log('   companyDescription:', newUser.companyDescription || 'NO EXISTE EN BD');
      console.log('   industry:', newUser.industry || 'NO EXISTE EN BD');
      console.log('   role:', newUser.role || 'NO EXISTE EN BD');
      console.log('   isActive:', newUser.isActive !== undefined ? newUser.isActive : 'NO EXISTE EN BD');
      
    } else {
      console.log('\n❌ USUARIO NO ENCONTRADO EN BD después del registro');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ ERROR EN REGISTRO:');
    console.error('Mensaje:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Respuesta:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 El servidor no está corriendo en localhost:10000');
    }
    
    console.error('Stack completo:', error.stack);
  }
}

// Ejecutar prueba
testRegistration()
  .then(() => {
    console.log('\n🎉 Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
