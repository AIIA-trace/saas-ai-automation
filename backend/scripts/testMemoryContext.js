const { PrismaClient } = require('@prisma/client');
const callerMemoryService = require('../src/services/callerMemoryService');

const prisma = new PrismaClient();

async function testMemoryContext() {
  try {
    console.log('🧠 TEST: Contexto de Memoria del Llamante\n');
    console.log('='.repeat(80));

    // Obtener una memoria de ejemplo
    const memory = await prisma.callerMemory.findFirst({
      orderBy: {
        lastCallDate: 'desc'
      }
    });

    if (!memory) {
      console.log('⚠️ No hay registros de memoria en la base de datos');
      console.log('\n📝 Creando memoria de prueba...\n');
      
      // Crear memoria de prueba
      const testMemory = await prisma.callerMemory.create({
        data: {
          clientId: 1,
          callerPhone: '+34647866624',
          callerName: 'Carlos García',
          callerCompany: 'Qirodata Solutions',
          lastCallDate: new Date(),
          callCount: 3,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          conversationHistory: {
            conversations: [
              {
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                summary: 'Consulta sobre servicios de transformación digital',
                topics: ['Transformación Digital', 'Consultoría IT'],
                duration: 180,
                fullTranscript: 'Cliente: Hola, soy Carlos de Qirodata. Estamos interesados en servicios de transformación digital.\nAsistente: Perfecto, Carlos. Te cuento sobre nuestros servicios de transformación digital...'
              },
              {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                summary: 'Seguimiento de propuesta comercial',
                topics: ['Propuesta', 'Precios'],
                duration: 120,
                fullTranscript: 'Cliente: Hola, llamo para hacer seguimiento de la propuesta que nos enviaron.\nAsistente: Claro, Carlos. Tomo nota y el equipo comercial te contactará para revisar la propuesta.'
              }
            ]
          },
          notes: 'Cliente potencial importante - interesado en transformación digital'
        }
      });
      
      console.log('✅ Memoria de prueba creada\n');
      return testMemoryContext(); // Llamar de nuevo para mostrar el contexto
    }

    console.log('📞 INFORMACIÓN DEL REGISTRO:');
    console.log(`   Cliente ID: ${memory.clientId}`);
    console.log(`   Teléfono: ${memory.callerPhone}`);
    console.log(`   Nombre: ${memory.callerName || 'N/A'}`);
    console.log(`   Empresa: ${memory.callerCompany || 'N/A'}`);
    console.log(`   Llamadas: ${memory.callCount}`);
    console.log(`   Última llamada: ${memory.lastCallDate.toLocaleString('es-ES')}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CONTEXTO GENERADO PARA OPENAI:');
    console.log('='.repeat(80) + '\n');

    // Generar contexto de memoria
    const context = callerMemoryService.getMemoryContext(memory);
    
    console.log(context);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ESTADÍSTICAS:');
    console.log('='.repeat(80));
    console.log(`Longitud del contexto: ${context.length} caracteres`);
    console.log(`Incluye nombre: ${context.includes(memory.callerName) ? '✅' : '❌'}`);
    console.log(`Incluye empresa: ${memory.callerCompany && context.includes(memory.callerCompany) ? '✅' : '❌'}`);
    console.log(`Incluye historial: ${context.includes('HISTORIAL DE CONVERSACIONES') ? '✅' : '❌'}`);
    console.log(`Incluye notas: ${memory.notes && context.includes(memory.notes) ? '✅' : '❌'}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETADO');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMemoryContext();
