const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script de prueba para verificar que el bot recibe todos los datos del dashboard
 */
async function testBotContext() {
  try {
    console.log('🔍 VERIFICANDO DATOS QUE RECIBE EL BOT\n');
    
    // Obtener cliente de prueba (Qiromedia)
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' },
      select: {
        id: true,
        companyName: true,
        companyDescription: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        businessHours: true,
        faqs: true,
        contextFiles: true,
        companyInfo: true
      }
    });
    
    if (!client) {
      console.log('❌ No se encontró cliente Qiromedia');
      return;
    }
    
    console.log('✅ CLIENTE ENCONTRADO:', client.companyName);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Verificar cada campo
    console.log('📋 INFORMACIÓN BÁSICA:');
    console.log(`   ✅ Nombre: ${client.companyName}`);
    console.log(`   ${client.companyDescription ? '✅' : '❌'} Descripción: ${client.companyDescription ? 'Configurada' : 'NO configurada'}`);
    
    console.log('\n📞 DATOS DE CONTACTO:');
    console.log(`   ${client.phone ? '✅' : '❌'} Teléfono: ${client.phone || 'NO configurado'}`);
    console.log(`   ${client.email ? '✅' : '❌'} Email: ${client.email || 'NO configurado'}`);
    console.log(`   ${client.website ? '✅' : '❌'} Website: ${client.website || 'NO configurado'}`);
    console.log(`   ${client.address ? '✅' : '❌'} Dirección: ${client.address || 'NO configurada'}`);
    
    console.log('\n⏰ HORARIOS:');
    if (client.businessHours && client.businessHours.enabled) {
      console.log('   ✅ Horarios configurados:');
      const workingDays = client.businessHours.workingDays || {};
      const days = Object.entries(workingDays)
        .filter(([_, isWorking]) => isWorking)
        .map(([day, _]) => day);
      console.log(`      - Días: ${days.join(', ')}`);
      console.log(`      - Horario: ${client.businessHours.openingTime} - ${client.businessHours.closingTime}`);
    } else {
      console.log('   ❌ Horarios NO configurados');
    }
    
    console.log('\n❓ PREGUNTAS FRECUENTES (FAQs):');
    if (client.faqs && client.faqs.length > 0) {
      console.log(`   ✅ ${client.faqs.length} FAQs configuradas:`);
      client.faqs.forEach((faq, index) => {
        console.log(`      ${index + 1}. ${faq.question}`);
        console.log(`         → ${faq.answer.substring(0, 60)}...`);
      });
    } else {
      console.log('   ❌ NO hay FAQs configuradas');
    }
    
    console.log('\n📁 ARCHIVOS DE CONTEXTO:');
    if (client.contextFiles && client.contextFiles.length > 0) {
      console.log(`   ✅ ${client.contextFiles.length} archivos configurados:`);
      client.contextFiles.forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.name} (${file.type || 'documento'})`);
        if (file.content) {
          console.log(`         → Contenido: ${file.content.substring(0, 60)}...`);
        }
      });
    } else {
      console.log('   ❌ NO hay archivos de contexto');
    }
    
    console.log('\n🏢 INFORMACIÓN ADICIONAL:');
    if (client.companyInfo && Object.keys(client.companyInfo).length > 0) {
      console.log('   ✅ Información adicional configurada:');
      Object.entries(client.companyInfo).forEach(([key, value]) => {
        console.log(`      - ${key}: ${JSON.stringify(value).substring(0, 60)}...`);
      });
    } else {
      console.log('   ❌ NO hay información adicional');
    }
    
    // Resumen
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN:');
    
    const checks = [
      { name: 'Nombre empresa', value: !!client.companyName },
      { name: 'Descripción', value: !!client.companyDescription },
      { name: 'Teléfono', value: !!client.phone },
      { name: 'Email', value: !!client.email },
      { name: 'Website', value: !!client.website },
      { name: 'Dirección', value: !!client.address },
      { name: 'Horarios', value: !!(client.businessHours && client.businessHours.enabled) },
      { name: 'FAQs', value: !!(client.faqs && client.faqs.length > 0) },
      { name: 'Archivos', value: !!(client.contextFiles && client.contextFiles.length > 0) }
    ];
    
    const configured = checks.filter(c => c.value).length;
    const total = checks.length;
    const percentage = Math.round((configured / total) * 100);
    
    console.log(`\n   Datos configurados: ${configured}/${total} (${percentage}%)`);
    console.log('\n   Estado por campo:');
    checks.forEach(check => {
      console.log(`      ${check.value ? '✅' : '❌'} ${check.name}`);
    });
    
    if (percentage < 50) {
      console.log('\n⚠️ ADVERTENCIA: Menos del 50% de datos configurados');
      console.log('   El bot tendrá información limitada para responder preguntas.');
      console.log('   Recomendación: Configurar más datos en el dashboard.');
    } else if (percentage < 80) {
      console.log('\n✅ BIEN: Datos básicos configurados');
      console.log('   Recomendación: Agregar FAQs y archivos de contexto para mejorar respuestas.');
    } else {
      console.log('\n🎉 EXCELENTE: Datos completos configurados');
      console.log('   El bot tiene toda la información necesaria para responder preguntas.');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 PRÓXIMOS PASOS:');
    console.log('   1. Hacer una llamada de prueba');
    console.log('   2. Preguntar por horarios, teléfono, servicios');
    console.log('   3. Verificar que el bot responde con los datos correctos');
    console.log('   4. Si falta algo, configurarlo en el dashboard\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testBotContext();
