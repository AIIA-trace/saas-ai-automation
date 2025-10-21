const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQiromediaFull() {
  try {
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' }
    });
    
    if (!client) {
      console.log('❌ No se encontró Qiromedia');
      return;
    }
    
    console.log('✅ DATOS COMPLETOS DE QIROMEDIA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 PERFIL:');
    console.log('  ID:', client.id);
    console.log('  Email:', client.email);
    console.log('  Nombre Empresa:', client.companyName);
    console.log('  Descripción:', client.companyDescription);
    console.log('  Contacto:', client.contactName);
    console.log('  Teléfono:', client.phone);
    console.log('  Posición:', client.position);
    console.log('  Industria:', client.industry);
    console.log('  Dirección:', client.address);
    console.log('  Website:', client.website);
    
    console.log('\n🤖 BOT:');
    console.log('  Nombre Bot:', client.botName);
    console.log('  Idioma Bot:', client.botLanguage);
    console.log('  Personalidad:', client.botPersonality);
    console.log('  Mensaje Bienvenida:', client.welcomeMessage);
    console.log('  Mensaje Confirmación:', client.confirmationMessage);
    
    console.log('\n📞 CALL CONFIG:');
    console.log(JSON.stringify(client.callConfig, null, 2));
    
    console.log('\n🏢 COMPANY INFO:');
    console.log(JSON.stringify(client.companyInfo, null, 2));
    
    console.log('\n📧 EMAIL CONFIG:');
    console.log(JSON.stringify(client.emailConfig, null, 2));
    
    console.log('\n⏰ BUSINESS HOURS:');
    console.log(JSON.stringify(client.businessHours, null, 2));
    
    console.log('\n❓ FAQs:');
    console.log(JSON.stringify(client.faqs, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQiromediaFull();
