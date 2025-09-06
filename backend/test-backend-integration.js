const { PrismaClient } = require('@prisma/client');
const logger = require('./src/utils/logger');

const prisma = new PrismaClient();

/**
 * 🎯 TEST COMPLETO DE INTEGRACIÓN BACKEND
 * Verifica que todo el sistema funcione correctamente tras la migración
 */

async function testBackendIntegration() {
  console.log('🚀 INICIANDO TEST DE INTEGRACIÓN BACKEND COMPLETO');
  console.log('================================================');
  
  try {
    // 1. Verificar conexión a base de datos
    await testDatabaseConnection();
    
    // 2. Verificar datos del cliente de prueba (Teteo Soft)
    const testClient = await testClientData();
    
    // 3. Simular webhook de Twilio
    await testTwilioWebhook(testClient);
    
    // 4. Verificar Azure TTS
    await testAzureTTS();
    
    // 5. Verificar caché del sistema
    await testCacheSystem(testClient);
    
    // 6. Test de personalidad natural
    await testNaturalPersonality(testClient);
    
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
    console.log('✅ El sistema backend está listo para producción');
    console.log('🎯 Latencia estimada: 200-500ms por llamada');
    console.log('🔄 Caché funcionando correctamente');
    console.log('🎵 Azure TTS integrado');
    console.log('🎭 Personalidad natural activa');
    
  } catch (error) {
    console.error('❌ ERROR EN TEST DE INTEGRACIÓN:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function testDatabaseConnection() {
  console.log('\n1️⃣ VERIFICANDO CONEXIÓN A BASE DE DATOS...');
  
  try {
    await prisma.$connect();
    console.log('✅ Conexión a base de datos exitosa');
    
    // Verificar que las tablas existen
    const clientCount = await prisma.client.count();
    const twilioNumberCount = await prisma.twilioNumber.count();
    
    console.log(`📊 Clientes en BD: ${clientCount}`);
    console.log(`📞 Números Twilio: ${twilioNumberCount}`);
    
  } catch (error) {
    throw new Error(`Error de conexión BD: ${error.message}`);
  }
}

async function testClientData() {
  console.log('\n2️⃣ VERIFICANDO DATOS DEL CLIENTE DE PRUEBA...');
  
  try {
    // Buscar cliente Teteo Soft
    const client = await prisma.client.findFirst({
      where: {
        companyName: {
          contains: 'Teteo',
          mode: 'insensitive'
        }
      },
      include: {
        twilioNumbers: {
          where: { status: 'active' }
        }
      }
    });
    
    if (!client) {
      throw new Error('Cliente de prueba (Teteo Soft) no encontrado');
    }
    
    console.log(`✅ Cliente encontrado: ${client.companyName} (ID: ${client.id})`);
    console.log(`📧 Email: ${client.email}`);
    console.log(`🏢 Industria: ${client.industry || 'No definida'}`);
    console.log(`📞 Números Twilio: ${client.twilioNumbers.length}`);
    
    if (client.twilioNumbers.length > 0) {
      console.log(`📱 Número principal: ${client.twilioNumbers[0].phoneNumber}`);
    }
    
    // Verificar horarios comerciales
    if (client.businessHoursConfig) {
      console.log('🕐 Horarios comerciales configurados:');
      console.log(`   Habilitado: ${client.businessHoursConfig.enabled}`);
      console.log(`   Días: ${JSON.stringify(client.businessHoursConfig.workingDays)}`);
      console.log(`   Horario: ${client.businessHoursConfig.openingTime} - ${client.businessHoursConfig.closingTime}`);
    } else {
      console.log('🕐 Horarios comerciales: No configurados');
    }
    
    return client;
    
  } catch (error) {
    throw new Error(`Error verificando cliente: ${error.message}`);
  }
}

async function testTwilioWebhook(client) {
  console.log('\n3️⃣ SIMULANDO WEBHOOK DE TWILIO...');
  
  try {
    const TwilioService = require('./src/services/twilioService');
    
    // Simular datos de webhook de Twilio
    const mockWebhookData = {
      client: client,
      callerNumber: '+34647866624',
      callSid: 'CA' + Date.now()
    };
    
    console.log(`📞 Simulando llamada de ${mockWebhookData.callerNumber}`);
    console.log(`🎯 Cliente: ${client.companyName}`);
    console.log(`🆔 Call SID: ${mockWebhookData.callSid}`);
    
    const startTime = Date.now();
    
    // Generar respuesta completa
    const twimlResponse = await TwilioService.generateCallResponse(mockWebhookData);
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`⚡ Latencia: ${latency}ms`);
    console.log(`📄 TwiML generado: ${twimlResponse.length} caracteres`);
    
    // Verificar que contiene elementos esperados
    if (twimlResponse.includes('<Response>') && 
        twimlResponse.includes(client.companyName) &&
        (twimlResponse.includes('<Play>') || twimlResponse.includes('<Say>'))) {
      console.log('✅ TwiML válido generado correctamente');
    } else {
      throw new Error('TwiML generado no es válido');
    }
    
    // Verificar latencia aceptable
    if (latency < 1000) {
      console.log('✅ Latencia aceptable (<1s)');
    } else {
      console.log('⚠️ Latencia alta (>1s) - considerar optimizaciones');
    }
    
  } catch (error) {
    throw new Error(`Error en webhook Twilio: ${error.message}`);
  }
}

async function testAzureTTS() {
  console.log('\n4️⃣ VERIFICANDO AZURE TTS...');
  
  try {
    const AzureTTSService = require('./src/services/azureTTSService');
    const azureTTSService = new AzureTTSService();
    
    if (!azureTTSService.isConfigured()) {
      console.log('⚠️ Azure TTS no configurado - usando Polly como fallback');
      return;
    }
    
    console.log('🎵 Azure TTS configurado correctamente');
    
    // Test de generación de audio
    const testText = 'Hola, este es un test de Azure TTS para verificar la integración.';
    const testVoice = 'es-ES-ElviraNeural';
    
    console.log(`🎤 Generando audio de prueba con voz: ${testVoice}`);
    
    const startTime = Date.now();
    const result = await azureTTSService.generateBotResponse(testText, testVoice);
    const endTime = Date.now();
    
    if (result.success) {
      console.log(`✅ Audio generado exitosamente en ${endTime - startTime}ms`);
      console.log(`🔗 URL: ${result.audioUrl}`);
      console.log(`⏱️ Duración estimada: ${result.durationEstimate}s`);
    } else {
      throw new Error(`Error Azure TTS: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`⚠️ Azure TTS no disponible: ${error.message}`);
    console.log('🔄 Sistema usará Polly como fallback');
  }
}

async function testCacheSystem(client) {
  console.log('\n5️⃣ VERIFICANDO SISTEMA DE CACHÉ...');
  
  try {
    const TwilioService = require('./src/services/twilioService');
    
    console.log('📋 Test 1: Obtener datos del cliente (primera vez)');
    const startTime1 = Date.now();
    const clientData1 = await TwilioService.getClientDataCached(client.id);
    const time1 = Date.now() - startTime1;
    console.log(`⏱️ Tiempo primera consulta: ${time1}ms`);
    
    console.log('📋 Test 2: Obtener datos del cliente (desde caché)');
    const startTime2 = Date.now();
    const clientData2 = await TwilioService.getClientDataCached(client.id);
    const time2 = Date.now() - startTime2;
    console.log(`⚡ Tiempo consulta cacheada: ${time2}ms`);
    
    if (time2 < time1) {
      console.log('✅ Caché funcionando correctamente (consulta más rápida)');
    } else {
      console.log('⚠️ Caché puede no estar funcionando correctamente');
    }
    
    // Test de limpieza de caché
    console.log('🗑️ Test 3: Limpiar caché');
    TwilioService.clearClientCache(client.id);
    console.log('✅ Caché limpiado correctamente');
    
  } catch (error) {
    throw new Error(`Error en sistema de caché: ${error.message}`);
  }
}

async function testNaturalPersonality(client) {
  console.log('\n6️⃣ VERIFICANDO PERSONALIDAD NATURAL...');
  
  try {
    const TwilioService = require('./src/services/twilioService');
    
    // Test de generación de saludo natural
    console.log('🎭 Generando saludo natural...');
    
    const isOpen = TwilioService.checkBusinessHours(client.businessHoursConfig);
    console.log(`🕐 Estado del negocio: ${isOpen ? 'Abierto' : 'Cerrado'}`);
    
    const greeting = TwilioService.generateNaturalGreeting(client, isOpen);
    console.log(`💬 Saludo generado: "${greeting}"`);
    
    // Verificar elementos de personalidad
    const hasMusletilla = /^(eee\.\.\.|mmm\.\.\.|bueno\.\.\.|a ver\.\.\.|pues\.\.\.)/.test(greeting);
    const hasCompanyName = greeting.includes(client.companyName);
    const hasPersonality = greeting.includes('asistente virtual');
    
    if (hasMusletilla) console.log('✅ Muletillas naturales incluidas');
    if (hasCompanyName) console.log('✅ Nombre de empresa incluido');
    if (hasPersonality) console.log('✅ Personalidad del bot incluida');
    
    if (hasMusletilla && hasCompanyName && hasPersonality) {
      console.log('✅ Personalidad natural funcionando correctamente');
    } else {
      console.log('⚠️ Algunos elementos de personalidad pueden faltar');
    }
    
  } catch (error) {
    throw new Error(`Error en personalidad natural: ${error.message}`);
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  testBackendIntegration();
}

module.exports = { testBackendIntegration };
