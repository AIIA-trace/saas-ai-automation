const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyQiromedia() {
  try {
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' }
    });

    if (!client) {
      console.log('❌ No se encontró Qiromedia');
      return;
    }

    console.log('✅ Información de Qiromedia:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📛 Nombre: ${client.companyName}`);
    console.log(`📝 Descripción: ${client.companyDescription}`);
    console.log(`👋 Welcome Message: ${client.welcomeMessage}`);
    console.log('\n📞 Call Config:');
    console.log(JSON.stringify(client.callConfig, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyQiromedia();
