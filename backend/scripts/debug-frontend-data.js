const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugFrontendData() {
  try {
    console.log('🔍 ANÁLISIS COMPLETO DE DATOS DE HORARIOS COMERCIALES');
    console.log('='.repeat(60));
    
    // 1. Verificar datos actuales en BD
    const client = await prisma.client.findUnique({
      where: { id: 18 },
      select: {
        id: true,
        email: true,
        businessHoursConfig: true,
        updatedAt: true
      }
    });

    if (!client) {
      console.log('❌ Cliente ID 18 no encontrado');
      return;
    }

    console.log('\n📊 DATOS ACTUALES EN BASE DE DATOS:');
    console.log('='.repeat(40));
    console.log(`👤 Cliente ID: ${client.id}`);
    console.log(`📧 Email: ${client.email}`);
    console.log(`📅 Última actualización: ${client.updatedAt}`);
    
    if (client.businessHoursConfig) {
      console.log('\n🕐 businessHoursConfig ACTUAL:');
      console.log(JSON.stringify(client.businessHoursConfig, null, 2));
      
      console.log('\n📋 ANÁLISIS DETALLADO:');
      console.log(`- enabled: ${client.businessHoursConfig.enabled} (${typeof client.businessHoursConfig.enabled})`);
      console.log(`- workingDays: ${JSON.stringify(client.businessHoursConfig.workingDays)} (${Array.isArray(client.businessHoursConfig.workingDays) ? 'array' : typeof client.businessHoursConfig.workingDays})`);
      console.log(`- openingTime: "${client.businessHoursConfig.openingTime}" (${typeof client.businessHoursConfig.openingTime})`);
      console.log(`- closingTime: "${client.businessHoursConfig.closingTime}" (${typeof client.businessHoursConfig.closingTime})`);
      
      if (Array.isArray(client.businessHoursConfig.workingDays)) {
        console.log('\n📅 DÍAS LABORABLES DETALLADOS:');
        client.businessHoursConfig.workingDays.forEach((day, index) => {
          console.log(`  ${index + 1}. "${day}" (${typeof day})`);
        });
      }
    } else {
      console.log('\n❌ businessHoursConfig NO EXISTE en BD');
    }

    console.log('\n🎯 FORMATO ESPERADO POR EL SISTEMA:');
    console.log('='.repeat(40));
    const expectedFormat = {
      enabled: true,
      workingDays: ["monday", "wednesday", "friday", "sunday"],
      openingTime: "12:00",
      closingTime: "18:00"
    };
    console.log(JSON.stringify(expectedFormat, null, 2));
    
    console.log('\n🔍 COMPARACIÓN:');
    console.log('='.repeat(40));
    if (client.businessHoursConfig) {
      const current = client.businessHoursConfig;
      console.log(`✅ enabled coincide: ${current.enabled === expectedFormat.enabled}`);
      console.log(`✅ openingTime coincide: ${current.openingTime === expectedFormat.openingTime}`);
      console.log(`✅ closingTime coincide: ${current.closingTime === expectedFormat.closingTime}`);
      
      const currentDays = JSON.stringify(current.workingDays?.sort());
      const expectedDays = JSON.stringify(expectedFormat.workingDays.sort());
      console.log(`❌ workingDays coincide: ${currentDays === expectedDays}`);
      console.log(`   Actual: ${currentDays}`);
      console.log(`   Esperado: ${expectedDays}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFrontendData();
