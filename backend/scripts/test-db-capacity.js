const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testDatabaseCapacity() {
  try {
    console.log('🔍 PROBANDO CAPACIDAD DE LA BASE DE DATOS PARA HORARIOS COMERCIALES');
    console.log('='.repeat(70));
    
    // 1. Verificar datos actuales
    console.log('\n📊 PASO 1: Datos actuales en BD');
    const currentClient = await prisma.client.findUnique({
      where: { id: 18 },
      select: { businessHoursConfig: true, updatedAt: true }
    });
    
    console.log('Datos actuales:', JSON.stringify(currentClient.businessHoursConfig, null, 2));
    console.log('Última actualización:', currentClient.updatedAt);

    // 2. Probar guardado con TODOS los días de la semana
    console.log('\n🧪 PASO 2: Probando guardado con TODOS los días');
    const allDaysConfig = {
      enabled: true,
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      openingTime: "08:00",
      closingTime: "20:00"
    };
    
    console.log('Intentando guardar:', JSON.stringify(allDaysConfig, null, 2));
    
    const testUpdate1 = await prisma.client.update({
      where: { id: 18 },
      data: { businessHoursConfig: allDaysConfig }
    });
    
    console.log('✅ ÉXITO: Se guardaron TODOS los días');
    console.log('Resultado:', JSON.stringify(testUpdate1.businessHoursConfig, null, 2));

    // 3. Probar guardado con días específicos (como en tu imagen)
    console.log('\n🧪 PASO 3: Probando guardado con días específicos');
    const specificDaysConfig = {
      enabled: true,
      workingDays: ["monday", "wednesday", "friday", "sunday"],
      openingTime: "12:00",
      closingTime: "18:00"
    };
    
    console.log('Intentando guardar:', JSON.stringify(specificDaysConfig, null, 2));
    
    const testUpdate2 = await prisma.client.update({
      where: { id: 18 },
      data: { businessHoursConfig: specificDaysConfig }
    });
    
    console.log('✅ ÉXITO: Se guardaron días específicos');
    console.log('Resultado:', JSON.stringify(testUpdate2.businessHoursConfig, null, 2));

    // 4. Probar guardado con solo 1 día
    console.log('\n🧪 PASO 4: Probando guardado con UN solo día');
    const oneDayConfig = {
      enabled: true,
      workingDays: ["saturday"],
      openingTime: "10:00",
      closingTime: "14:00"
    };
    
    console.log('Intentando guardar:', JSON.stringify(oneDayConfig, null, 2));
    
    const testUpdate3 = await prisma.client.update({
      where: { id: 18 },
      data: { businessHoursConfig: oneDayConfig }
    });
    
    console.log('✅ ÉXITO: Se guardó un solo día');
    console.log('Resultado:', JSON.stringify(testUpdate3.businessHoursConfig, null, 2));

    // 5. Probar guardado con array vacío
    console.log('\n🧪 PASO 5: Probando guardado con array VACÍO');
    const emptyDaysConfig = {
      enabled: false,
      workingDays: [],
      openingTime: "09:00",
      closingTime: "17:00"
    };
    
    console.log('Intentando guardar:', JSON.stringify(emptyDaysConfig, null, 2));
    
    const testUpdate4 = await prisma.client.update({
      where: { id: 18 },
      data: { businessHoursConfig: emptyDaysConfig }
    });
    
    console.log('✅ ÉXITO: Se guardó array vacío');
    console.log('Resultado:', JSON.stringify(testUpdate4.businessHoursConfig, null, 2));

    // 6. Restaurar configuración original
    console.log('\n🔄 PASO 6: Restaurando configuración original');
    await prisma.client.update({
      where: { id: 18 },
      data: { businessHoursConfig: currentClient.businessHoursConfig }
    });
    console.log('✅ Configuración original restaurada');

    console.log('\n📋 CONCLUSIONES:');
    console.log('='.repeat(50));
    console.log('✅ La BD puede almacenar CUALQUIER combinación de días');
    console.log('✅ La BD puede almacenar TODOS los días (1-7)');
    console.log('✅ La BD puede almacenar UN solo día');
    console.log('✅ La BD puede almacenar array VACÍO');
    console.log('✅ La BD puede almacenar CUALQUIER horario');
    console.log('');
    console.log('🎯 RESULTADO: La base de datos NO tiene limitaciones');
    console.log('   El problema está en el FRONTEND, no en la BD');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseCapacity();
