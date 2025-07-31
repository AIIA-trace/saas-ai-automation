const { PrismaClient } = require('@prisma/client');

async function findSpecificUser() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
  
  try {
    console.log('🔍 BUSCANDO USUARIO: mibrotel@gmail.com\n');
    
    // Buscar usuario específico
    const specificUser = await prisma.client.findUnique({
      where: { email: 'mibrotel@gmail.com' }
    });
    
    if (specificUser) {
      console.log('✅ USUARIO ENCONTRADO:');
      console.log('   📧 Email:', specificUser.email);
      console.log('   🏢 Empresa:', specificUser.companyName || 'No especificada');
      console.log('   👨‍💼 Contacto:', specificUser.contactName || 'No especificado');
      console.log('   📞 Teléfono:', specificUser.phone || 'No especificado');
      console.log('   📅 Registrado:', specificUser.createdAt.toLocaleString());
      console.log('   🔄 Actualizado:', specificUser.updatedAt.toLocaleString());
      
      console.log('\n📋 TODOS LOS DATOS DEL USUARIO:');
      Object.entries(specificUser).forEach(([key, value]) => {
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
      
    } else {
      console.log('❌ USUARIO NO ENCONTRADO: mibrotel@gmail.com');
      console.log('\n🔍 Verificando todos los usuarios disponibles...');
      
      // Mostrar todos los usuarios para comparar
      const allUsers = await prisma.client.findMany({
        select: {
          email: true,
          companyName: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`\n📊 USUARIOS DISPONIBLES (${allUsers.length}):`);
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.companyName || 'Sin empresa'} - ${user.createdAt.toLocaleString()}`);
      });
      
      // Buscar emails similares
      const similarEmails = allUsers.filter(user => 
        user.email.includes('mibrotel') || 
        user.email.includes('gmail') ||
        user.email.toLowerCase().includes('mi')
      );
      
      if (similarEmails.length > 0) {
        console.log('\n🔍 EMAILS SIMILARES ENCONTRADOS:');
        similarEmails.forEach(user => {
          console.log(`   - ${user.email}`);
        });
      }
    }
    
    // Verificar usuarios registrados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUsers = await prisma.client.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      select: {
        email: true,
        companyName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n📅 USUARIOS REGISTRADOS HOY (${todayUsers.length}):`);
    if (todayUsers.length > 0) {
      todayUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.createdAt.toLocaleTimeString()}`);
      });
    } else {
      console.log('   No hay usuarios registrados hoy');
    }
    
    // Verificar últimos 10 usuarios
    const recentUsers = await prisma.client.findMany({
      select: {
        email: true,
        companyName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`\n🕐 ÚLTIMOS 10 USUARIOS REGISTRADOS:`);
    recentUsers.forEach((user, index) => {
      const isTarget = user.email === 'mibrotel@gmail.com';
      const marker = isTarget ? '🎯' : '  ';
      console.log(`${marker} ${index + 1}. ${user.email} - ${user.createdAt.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error buscando usuario:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 POSIBLES CAUSAS:');
      console.log('   - Conexión a base de datos incorrecta');
      console.log('   - Usuario registrado en base de datos diferente');
      console.log('   - Variables de entorno diferentes');
    }
    
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar búsqueda
findSpecificUser()
  .then(() => {
    console.log('\n🎉 Búsqueda completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
