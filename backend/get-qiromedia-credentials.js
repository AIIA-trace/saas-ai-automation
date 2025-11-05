const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getQiromediaCredentials() {
  try {
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' },
      select: {
        id: true,
        email: true,
        companyName: true,
        contactName: true
      }
    });
    
    if (!client) {
      console.log('❌ No se encontró Qiromedia');
      return;
    }
    
    console.log('✅ Credenciales de Qiromedia:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', client.email);
    console.log('🔑 Contraseña: (almacenada con hash bcrypt - usa la que configuraste)');
    console.log('👤 Contacto:', client.contactName);
    console.log('🆔 ID:', client.id);
    console.log('');
    console.log('💡 Para acceder al dashboard:');
    console.log('   URL: https://api.aiiatrace.com');
    console.log('   Email:', client.email);
    console.log('   Contraseña: La que se configuró al crear la cuenta');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getQiromediaCredentials();
