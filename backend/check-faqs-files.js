const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFaqsAndFiles() {
  try {
    console.log('🔍 REVISANDO DATOS EN BASE DE DATOS...');
    console.log('🕰️ Timestamp:', new Date().toISOString());
    
    // Obtener el cliente (asumiendo que hay uno)
    const client = await prisma.client.findFirst({
      select: {
        id: true,
        companyName: true,
        email: true,
        faqs: true,
        contextFiles: true,
        emailConfig: true,
        callConfig: true,
        businessHoursConfig: true
      }
    });
    
    if (!client) {
      console.log('❌ No se encontró ningún cliente en la base de datos');
      return;
    }
    
    console.log('👤 Cliente encontrado:', client.companyName || 'Sin nombre');
    console.log('📧 Email:', client.email || 'Sin email');
    console.log('🆔 ID del cliente:', client.id);
    
    // Revisar FAQs
    console.log('\n📋 PREGUNTAS FRECUENTES:');
    if (client.faqs && client.faqs.length > 0) {
      console.log('✅ FAQs encontradas:', client.faqs.length);
      client.faqs.forEach((faq, index) => {
        console.log(`  ${index + 1}. "${faq.question}" -> "${faq.answer}"`);
      });
    } else {
      console.log('❌ No hay FAQs guardadas en la base de datos');
      console.log('🔍 Valor de faqs:', client.faqs);
    }
    
    // Revisar archivos
    console.log('\n📁 ARCHIVOS DE CONTEXTO:');
    if (client.contextFiles && client.contextFiles.length > 0) {
      console.log('✅ Archivos encontrados:', client.contextFiles.length);
      client.contextFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. "${file.name}" (${file.size} bytes, tipo: ${file.type})`);
      });
    } else {
      console.log('❌ No hay archivos guardados en la base de datos');
      console.log('🔍 Valor de contextFiles:', client.contextFiles);
    }
    
    // Revisar configuraciones para contexto
    console.log('\n⚙️ CONFIGURACIONES:');
    console.log('📧 emailConfig:', client.emailConfig ? 'EXISTE' : 'NO EXISTE');
    if (client.emailConfig) {
      console.log('   - enabled:', client.emailConfig.enabled);
      console.log('   - provider:', client.emailConfig.provider);
      console.log('   - outgoingEmail:', client.emailConfig.outgoingEmail);
    }
    
    console.log('📞 callConfig:', client.callConfig ? 'EXISTE' : 'NO EXISTE');
    if (client.callConfig) {
      console.log('   - enabled:', client.callConfig.enabled);
    }
    
    console.log('🕰️ businessHoursConfig:', client.businessHoursConfig ? 'EXISTE' : 'NO EXISTE');
    if (client.businessHoursConfig) {
      console.log('   - enabled:', client.businessHoursConfig.enabled);
    }
    
  } catch (error) {
    console.error('❌ Error al revisar la base de datos:', error.message);
    console.error('📄 Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFaqsAndFiles();
