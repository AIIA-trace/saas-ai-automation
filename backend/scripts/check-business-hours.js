const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkBusinessHours() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // Obtener el cliente ID 18 (tu usuario)
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

    console.log('\n📊 DATOS DEL CLIENTE:');
    console.log('='.repeat(50));
    console.log(`👤 ID: ${client.id}`);
    console.log(`📧 Email: ${client.email}`);
    console.log(`🏢 Empresa: ${client.companyName}`);
    console.log(`📅 Última actualización: ${client.updatedAt}`);
    
    console.log('\n🕐 BUSINESS HOURS CONFIG:');
    console.log('='.repeat(50));
    
    if (client.businessHoursConfig) {
      console.log('✅ businessHoursConfig EXISTE en la BD:');
      console.log(JSON.stringify(client.businessHoursConfig, null, 2));
      
      // Analizar contenido
      const config = client.businessHoursConfig;
      if (typeof config === 'object') {
        console.log('\n📋 ANÁLISIS DEL CONTENIDO:');
        console.log(`- Tipo: ${typeof config}`);
        console.log(`- Claves: ${Object.keys(config)}`);
        console.log(`- Está vacío: ${Object.keys(config).length === 0}`);
        
        // Buscar campos típicos de horarios comerciales
        const expectedFields = ['enabled', 'workingDays', 'openingTime', 'closingTime', 'timezone'];
        expectedFields.forEach(field => {
          console.log(`- ${field}: ${config[field] !== undefined ? '✅ Presente' : '❌ Ausente'}`);
        });
      }
    } else {
      console.log('❌ businessHoursConfig es NULL o no existe');
    }

    // Obtener historial de actualizaciones recientes
    console.log('\n📈 HISTORIAL DE ACTUALIZACIONES:');
    console.log('='.repeat(50));
    
    const recentUpdates = await prisma.client.findMany({
      where: { id: 18 },
      select: {
        updatedAt: true,
        businessHoursConfig: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 1
    });

    recentUpdates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.updatedAt} - Config: ${update.businessHoursConfig ? 'Presente' : 'Ausente'}`);
    });

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la verificación
checkBusinessHours();
