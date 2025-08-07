const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugBusinessHoursFlow() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DEL FLUJO DE BUSINESS HOURS');
    console.log('='.repeat(70));
    
    // 1. Estado actual en BD
    const client = await prisma.client.findUnique({
      where: { id: 18 },
      select: {
        id: true,
        email: true,
        companyName: true,
        businessHoursConfig: true,
        updatedAt: true
      }
    });

    if (!client) {
      console.log('❌ Cliente ID 18 no encontrado');
      return;
    }

    console.log('\n📊 ESTADO ACTUAL EN BASE DE DATOS:');
    console.log('='.repeat(50));
    console.log(`👤 Cliente: ${client.companyName} (${client.email})`);
    console.log(`🔄 Última actualización: ${client.updatedAt}`);
    
    const now = new Date();
    const lastUpdate = new Date(client.updatedAt);
    const diffSeconds = Math.floor((now - lastUpdate) / 1000);
    console.log(`⏰ Hace: ${diffSeconds} segundos`);
    
    if (client.businessHoursConfig) {
      console.log('\n🕐 BUSINESS HOURS CONFIG ACTUAL:');
      console.log('='.repeat(40));
      console.log(JSON.stringify(client.businessHoursConfig, null, 2));
      
      const config = client.businessHoursConfig;
      console.log('\n📋 ANÁLISIS DETALLADO:');
      console.log(`- Habilitado: ${config.enabled ? '✅' : '❌'}`);
      console.log(`- Hora apertura: ${config.openingTime || 'No definida'}`);
      console.log(`- Hora cierre: ${config.closingTime || 'No definida'}`);
      
      if (config.workingDays && Array.isArray(config.workingDays)) {
        console.log(`- Días laborables (${config.workingDays.length}):`);
        
        const dayNames = {
          'monday': 'Lunes',
          'tuesday': 'Martes', 
          'wednesday': 'Miércoles',
          'thursday': 'Jueves',
          'friday': 'Viernes',
          'saturday': 'Sábado',
          'sunday': 'Domingo'
        };
        
        config.workingDays.forEach((day, index) => {
          const spanishName = dayNames[day] || 'Desconocido';
          console.log(`  ${index + 1}. ${day} (${spanishName})`);
        });
        
        // Verificar si hay días en español (indicaría que el mapeo no funcionó)
        const spanishDays = config.workingDays.filter(day => 
          ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].includes(day)
        );
        
        if (spanishDays.length > 0) {
          console.log('\n🚨 PROBLEMA DETECTADO:');
          console.log('❌ Se encontraron días en ESPAÑOL en la BD:', spanishDays);
          console.log('   Esto indica que el mapeo español→inglés NO funcionó');
        } else {
          console.log('\n✅ MAPEO CORRECTO:');
          console.log('   Todos los días están en inglés como se esperaba');
        }
        
      } else {
        console.log('- Días laborables: ❌ No definidos o formato incorrecto');
      }
      
    } else {
      console.log('\n❌ NO HAY BUSINESS HOURS CONFIG en la BD');
    }
    
    // 2. Verificar actualizaciones muy recientes
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    console.log('\n🔍 VERIFICACIÓN DE ACTUALIZACIONES RECIENTES:');
    console.log('='.repeat(50));
    console.log(`⏰ Buscando actualizaciones desde: ${oneMinuteAgo.toLocaleString()}`);
    
    if (lastUpdate > oneMinuteAgo) {
      console.log('✅ HAY actualizaciones MUY recientes (último minuto)');
      console.log('   El sistema SÍ está guardando datos');
    } else {
      console.log('⚠️ NO hay actualizaciones muy recientes');
      console.log('   Posible problema en el guardado');
    }
    
    // 3. Análisis de problemas comunes
    console.log('\n🔧 ANÁLISIS DE PROBLEMAS COMUNES:');
    console.log('='.repeat(50));
    
    if (!client.businessHoursConfig) {
      console.log('❌ PROBLEMA: businessHoursConfig es NULL');
      console.log('   - El frontend no está enviando el campo');
      console.log('   - El backend no está procesando el campo');
      console.log('   - Hay un error en la transmisión de datos');
    } else if (client.businessHoursConfig.workingDays && client.businessHoursConfig.workingDays.length === 0) {
      console.log('❌ PROBLEMA: workingDays está vacío');
      console.log('   - Los checkboxes no se están leyendo correctamente');
      console.log('   - El selector de elementos es incorrecto');
    } else if (client.businessHoursConfig.workingDays) {
      const spanishDaysInDB = client.businessHoursConfig.workingDays.filter(day => 
        ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].includes(day)
      );
      
      if (spanishDaysInDB.length > 0) {
        console.log('❌ PROBLEMA: Días en español en la BD');
        console.log('   - El mapeo español→inglés no se ejecutó');
        console.log('   - El código actualizado no se está cargando');
        console.log('   - Hay cache del navegador');
      } else {
        console.log('✅ MAPEO FUNCIONANDO: Días en inglés correctos');
        console.log('   - El problema puede estar en la selección de elementos');
        console.log('   - O en la lógica de qué días se consideran seleccionados');
      }
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS RECOMENDADOS:');
    console.log('='.repeat(50));
    console.log('1. Verificar logs del navegador al guardar');
    console.log('2. Confirmar que el código actualizado se está ejecutando');
    console.log('3. Verificar que los selectores de elementos son correctos');
    console.log('4. Revisar logs del backend para ver datos recibidos');
    
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar diagnóstico
debugBusinessHoursFlow();
