const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPassword() {
  try {
    console.log('🔍 Verificando contraseña en la base de datos...');
    
    // Buscar el usuario por email
    const client = await prisma.client.findFirst({
      where: { email: 'javisanher99@gmail.com' },
      select: { 
        id: true,
        email: true, 
        companyName: true,
        password: true,
        updatedAt: true
      }
    });
    
    if (!client) {
      console.log('❌ Cliente no encontrado');
      return;
    }
    
    console.log('✅ Cliente encontrado:');
    console.log('📧 Email:', client.email);
    console.log('🏢 Empresa:', client.companyName);
    console.log('🆔 ID:', client.id);
    console.log('🕐 Última actualización:', client.updatedAt);
    console.log('');
    
    // Mostrar información de la contraseña hasheada
    console.log('🔐 INFORMACIÓN DE LA CONTRASEÑA:');
    console.log('📝 Hash completo:', client.password);
    console.log('📏 Longitud del hash:', client.password.length);
    console.log('🔧 Tipo de hash:', client.password.startsWith('$2b$') ? 'bcrypt' : 'desconocido');
    console.log('');
    
    // Probar algunas contraseñas comunes para verificar cuál funciona
    const testPasswords = [
      'password123',
      '123456789',
      'newpassword',
      'test123456',
      'admin123',
      'password',
      '12345678',
      'qwerty123'
    ];
    
    console.log('🧪 PROBANDO CONTRASEÑAS COMUNES:');
    for (const testPassword of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(testPassword, client.password);
        if (isMatch) {
          console.log(`✅ CONTRASEÑA ENCONTRADA: "${testPassword}"`);
          console.log('🎯 Esta es la contraseña actual del usuario');
          return;
        } else {
          console.log(`❌ "${testPassword}" - No coincide`);
        }
      } catch (error) {
        console.log(`⚠️ Error probando "${testPassword}":`, error.message);
      }
    }
    
    console.log('');
    console.log('🔍 ANÁLISIS DEL HASH:');
    console.log('Si ninguna de las contraseñas comunes funcionó, significa que:');
    console.log('1. La contraseña fue cambiada recientemente');
    console.log('2. Es una contraseña personalizada');
    console.log('3. Puedes probar manualmente con bcrypt.compare()');
    console.log('');
    console.log('💡 Para probar una contraseña específica, usa:');
    console.log('   const bcrypt = require("bcryptjs");');
    console.log(`   bcrypt.compare("tu_contraseña", "${client.password}");`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para probar una contraseña específica
async function testSpecificPassword(password) {
  try {
    const client = await prisma.client.findFirst({
      where: { email: 'javisanher99@gmail.com' },
      select: { password: true }
    });
    
    if (!client) {
      console.log('❌ Cliente no encontrado');
      return false;
    }
    
    const isMatch = await bcrypt.compare(password, client.password);
    console.log(`🔐 Probando contraseña "${password}": ${isMatch ? '✅ COINCIDE' : '❌ NO COINCIDE'}`);
    return isMatch;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
if (process.argv[2]) {
  // Si se pasa una contraseña como argumento, probarla específicamente
  testSpecificPassword(process.argv[2]);
} else {
  // Si no, hacer la verificación completa
  checkPassword();
}
