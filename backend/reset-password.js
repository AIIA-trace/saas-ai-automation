const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function resetPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Buscando usuario javisanher...');
    
    // Buscar usuario por email
    let user = await prisma.client.findFirst({
      where: {
        OR: [
          { email: 'javisanher@gmail.com' },
          { email: { contains: 'javisanher' } }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado. Listando todos los usuarios:');
      const allUsers = await prisma.client.findMany({
        select: { id: true, email: true, companyName: true, isActive: true }
      });
      console.table(allUsers);
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    console.log('📊 Estado actual:', user.isActive ? 'ACTIVO' : 'INACTIVO');
    
    // Resetear contraseña a "123456"
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.client.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        isActive: true  // Asegurar que esté activo
      }
    });
    
    console.log('✅ Contraseña reseteada exitosamente');
    console.log('🔑 Nueva contraseña:', newPassword);
    console.log('📧 Email:', user.email);
    console.log('🏢 Empresa:', user.companyName);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
