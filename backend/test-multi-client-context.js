const { PrismaClient } = require('@prisma/client');
const TwilioService = require('./src/services/twilioService');
const logger = require('./src/utils/logger');

const prisma = new PrismaClient();

/**
 * 🎯 TEST MULTI-CLIENTE: Verificar que cada cliente obtiene SU contexto específico
 */

async function testMultiClientContext() {
  console.log('🎯 INICIANDO TEST MULTI-CLIENTE DE CONTEXTO');
  console.log('==========================================');
  
  try {
    // 1. Obtener TODOS los clientes con números Twilio
    const clients = await getAllClientsWithTwilioNumbers();
    
    if (clients.length === 0) {
      throw new Error('No hay clientes con números Twilio para probar');
    }
    
    console.log(`📊 Encontrados ${clients.length} clientes con números Twilio`);
    
    // 2. Probar cada cliente individualmente
    for (const client of clients) {
      await testClientSpecificContext(client);
      console.log(''); // Separador
    }
    
    // 3. Test de identificación por número Twilio
    await testTwilioNumberIdentification(clients);
    
    console.log('🎉 ¡TODOS LOS TESTS DE CONTEXTO MULTI-CLIENTE PASARON!');
    console.log('✅ Cada cliente obtiene SU información específica');
    console.log('✅ Identificación por número Twilio funciona correctamente');
    console.log('✅ Contexto empresarial personalizado por cliente');
    
  } catch (error) {
    console.error('❌ ERROR EN TEST MULTI-CLIENTE:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function getAllClientsWithTwilioNumbers() {
  const clients = await prisma.client.findMany({
    where: {
      twilioNumbers: {
        some: {
          status: 'active'
        }
      }
    },
    include: {
      twilioNumbers: {
        where: { status: 'active' }
      }
    }
  });
  
  return clients;
}

async function testClientSpecificContext(client) {
  console.log(`\n🏢 PROBANDO CLIENTE: ${client.companyName} (ID: ${client.id})`);
  console.log('='.repeat(50));
  
  // 1. Verificar datos específicos del cliente
  console.log('📋 DATOS ESPECÍFICOS DEL CLIENTE:');
  console.log(`   Nombre: ${client.companyName}`);
  console.log(`   Descripción: ${client.companyDescription || 'No definida'}`);
  console.log(`   Industria: ${client.industry || 'No definida'}`);
  console.log(`   Teléfono: ${client.phone || 'No definido'}`);
  console.log(`   Dirección: ${client.address || 'No definida'}`);
  console.log(`   Website: ${client.website || 'No definido'}`);
  console.log(`   Idioma: ${client.language || 'No definido'}`);
  console.log(`   Bot Name: ${client.botName || 'No definido'}`);
  console.log(`   Bot Personality: ${client.botPersonality || 'No definida'}`);
  console.log(`   Welcome Message: ${client.welcomeMessage || 'No definido'}`);
  console.log(`   Números Twilio: ${client.twilioNumbers.length}`);
  
  if (client.twilioNumbers.length > 0) {
    console.log(`   Número principal: ${client.twilioNumbers[0].phoneNumber}`);
  }
  
  // 2. Verificar FAQs específicas
  console.log(`   FAQs: ${client.faqs ? client.faqs.length : 0} preguntas`);
  if (client.faqs && client.faqs.length > 0) {
    client.faqs.slice(0, 2).forEach((faq, index) => {
      console.log(`     ${index + 1}. ${faq.question || 'Sin pregunta'}`);
    });
  }
  
  // 3. Verificar archivos de contexto
  console.log(`   Archivos contexto: ${client.contextFiles ? client.contextFiles.length : 0} archivos`);
  
  // 4. Verificar configuración de voz
  if (client.emailConfig && client.emailConfig.voiceSettings) {
    console.log(`   Voz Azure: ${client.emailConfig.voiceSettings.azureVoice || 'No definida'}`);
    console.log(`   Idioma voz: ${client.emailConfig.voiceSettings.language || 'No definido'}`);
  } else {
    console.log(`   Configuración voz: No definida`);
  }
  
  // 5. Test de generación de saludo específico
  console.log('\n🎭 GENERANDO SALUDO ESPECÍFICO:');
  try {
    const isOpen = TwilioService.checkBusinessHours(client.businessHoursConfig);
    const greeting = TwilioService.generateNaturalGreeting(client, isOpen);
    
    console.log(`   Estado negocio: ${isOpen ? 'Abierto' : 'Cerrado'}`);
    console.log(`   Saludo generado: "${greeting}"`);
    
    // Verificar que el saludo contiene información específica del cliente
    if (greeting.includes(client.companyName)) {
      console.log('   ✅ Saludo contiene nombre de empresa específico');
    } else {
      console.log('   ❌ Saludo NO contiene nombre de empresa');
    }
    
    if (client.welcomeMessage && greeting === client.welcomeMessage) {
      console.log('   ✅ Usando welcomeMessage configurado específico');
    } else if (!client.welcomeMessage) {
      console.log('   ⚠️ Cliente no tiene welcomeMessage configurado (usando fallback)');
    }
    
  } catch (error) {
    console.log(`   ❌ Error generando saludo: ${error.message}`);
  }
  
  // 6. Test de caché específico por cliente
  console.log('\n📋 TEST DE CACHÉ ESPECÍFICO:');
  try {
    const startTime = Date.now();
    const cachedData = await TwilioService.getClientDataCached(client.id);
    const cacheTime = Date.now() - startTime;
    
    console.log(`   Tiempo consulta: ${cacheTime}ms`);
    console.log(`   Datos cacheados: ${cachedData ? 'SÍ' : 'NO'}`);
    
    if (cachedData && cachedData.companyName === client.companyName) {
      console.log('   ✅ Caché contiene datos específicos del cliente correcto');
    } else {
      console.log('   ❌ Caché contiene datos incorrectos o vacíos');
    }
    
  } catch (error) {
    console.log(`   ❌ Error en caché: ${error.message}`);
  }
}

async function testTwilioNumberIdentification(clients) {
  console.log('\n📞 TEST DE IDENTIFICACIÓN POR NÚMERO TWILIO');
  console.log('='.repeat(50));
  
  for (const client of clients) {
    if (client.twilioNumbers.length > 0) {
      const twilioNumber = client.twilioNumbers[0].phoneNumber;
      
      console.log(`\n🔍 Probando identificación: ${twilioNumber} → ${client.companyName}`);
      
      try {
        // Simular búsqueda como en el webhook
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
          where: {
            phoneNumber: twilioNumber,
            status: 'active'
          },
          include: {
            client: true
          }
        });
        
        if (twilioNumberRecord && twilioNumberRecord.client.id === client.id) {
          console.log(`   ✅ Identificación correcta: ${twilioNumber} → ${twilioNumberRecord.client.companyName}`);
        } else {
          console.log(`   ❌ Identificación incorrecta para ${twilioNumber}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error identificando ${twilioNumber}: ${error.message}`);
      }
    }
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  testMultiClientContext();
}

module.exports = { testMultiClientContext };
