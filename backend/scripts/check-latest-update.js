const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkLatestUpdate() {
  try {
    console.log('🔍 Conectando a la base de datos para verificar último registro...');
    
    // Obtener el cliente con todos los detalles
    const client = await prisma.client.findUnique({
      where: { id: 18 },
      select: {
        id: true,
        email: true,
        companyName: true,
        businessHoursConfig: true,
        updatedAt: true,
        createdAt: true
      }
    });

    if (!client) {
      console.log('❌ Cliente ID 18 no encontrado');
      return;
    }

    console.log('\n📊 INFORMACIÓN COMPLETA DEL CLIENTE:');
    console.log('='.repeat(60));
    console.log(`👤 ID: ${client.id}`);
    console.log(`📧 Email: ${client.email}`);
    console.log(`🏢 Empresa: ${client.companyName}`);
    console.log(`📅 Creado: ${client.createdAt}`);
    console.log(`🔄 Última actualización: ${client.updatedAt}`);
    
    // Calcular tiempo transcurrido
    const now = new Date();
    const lastUpdate = new Date(client.updatedAt);
    const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
    const diffSeconds = Math.floor((now - lastUpdate) / 1000);
    
    console.log(`⏰ Tiempo desde última actualización: ${diffMinutes} minutos (${diffSeconds} segundos)`);
    
    console.log('\n🕐 BUSINESS HOURS CONFIG DETALLADO:');
    console.log('='.repeat(60));
    
    if (client.businessHoursConfig) {
      console.log('✅ businessHoursConfig EXISTE:');
      console.log(JSON.stringify(client.businessHoursConfig, null, 2));
      
      const config = client.businessHoursConfig;
      console.log('\n📋 ANÁLISIS DETALLADO:');
      console.log(`- Habilitado: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
      console.log(`- Hora apertura: ${config.openingTime || 'No definida'}`);
      console.log(`- Hora cierre: ${config.closingTime || 'No definida'}`);
      
      if (config.workingDays && Array.isArray(config.workingDays)) {
        console.log(`- Días laborables (${config.workingDays.length}):`);
        config.workingDays.forEach((day, index) => {
          const dayNames = {
            'monday': 'Lunes',
            'tuesday': 'Martes', 
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes',
            'saturday': 'Sábado',
            'sunday': 'Domingo'
          };
          console.log(`  ${index + 1}. ${day} (${dayNames[day] || 'Desconocido'})`);
        });
      } else {
        console.log('- Días laborables: ❌ No definidos o formato incorrecto');
      }
      
    } else {
      console.log('❌ businessHoursConfig es NULL o no existe');
    }

    // Verificar si hay actualizaciones muy recientes (últimos 5 minutos)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    console.log('\n🔍 VERIFICACIÓN DE ACTUALIZACIONES RECIENTES:');
    console.log('='.repeat(60));
    console.log(`⏰ Buscando actualizaciones desde: ${fiveMinutesAgo.toLocaleString()}`);
    
    if (lastUpdate > fiveMinutesAgo) {
      console.log('✅ HAY actualizaciones recientes (últimos 5 minutos)');
    } else {
      console.log('⚠️ NO hay actualizaciones recientes (últimos 5 minutos)');
      console.log('   Esto podría indicar que el último guardado falló');
    }

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la verificación
checkLatestUpdate();
