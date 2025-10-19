const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCallerMemory() {
  try {
    console.log('🔍 Consultando memoria de llamadas...\n');

    // Obtener todos los registros de memoria
    const memories = await prisma.callerMemory.findMany({
      orderBy: {
        lastCallDate: 'desc'
      }
    });

    console.log(`📊 Total de registros: ${memories.length}\n`);

    if (memories.length === 0) {
      console.log('⚠️ No hay registros de memoria en la base de datos');
      return;
    }

    // Mostrar cada registro
    memories.forEach((memory, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📞 REGISTRO ${index + 1}:`);
      console.log(`${'='.repeat(80)}`);
      console.log(`ID: ${memory.id}`);
      console.log(`Cliente ID: ${memory.clientId}`);
      console.log(`Teléfono: ${memory.callerPhone}`);
      console.log(`Nombre: ${memory.callerName || 'N/A'}`);
      console.log(`Empresa: ${memory.callerCompany || 'N/A'}`);
      console.log(`Número de llamadas: ${memory.callCount}`);
      console.log(`Última llamada: ${memory.lastCallDate}`);
      console.log(`Expira: ${memory.expiresAt}`);
      
      if (memory.notes) {
        console.log(`Notas: ${memory.notes}`);
      }

      // Mostrar historial de conversaciones
      if (memory.conversationHistory) {
        const history = typeof memory.conversationHistory === 'string' 
          ? JSON.parse(memory.conversationHistory) 
          : memory.conversationHistory;

        if (history.conversations && history.conversations.length > 0) {
          console.log(`\n📝 HISTORIAL DE CONVERSACIONES (${history.conversations.length}):`);
          
          history.conversations.forEach((conv, convIndex) => {
            console.log(`\n  ${convIndex + 1}. Llamada del ${new Date(conv.date).toLocaleString('es-ES')}:`);
            console.log(`     Duración: ${conv.duration}s`);
            console.log(`     Resumen: ${conv.summary}`);
            
            if (conv.topics && conv.topics.length > 0) {
              console.log(`     Temas: ${conv.topics.join(', ')}`);
            }
            
            if (conv.fullTranscript) {
              console.log(`     Transcripción completa (${conv.fullTranscript.length} chars):`);
              console.log(`     ${'-'.repeat(70)}`);
              console.log(`     ${conv.fullTranscript}`);
              console.log(`     ${'-'.repeat(70)}`);
            } else {
              console.log(`     ⚠️ Sin transcripción completa`);
            }
          });
        } else {
          console.log(`\n⚠️ Sin conversaciones en el historial`);
        }
      } else {
        console.log(`\n⚠️ Sin historial de conversaciones`);
      }
    });

    console.log(`\n${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Error consultando memoria:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallerMemory();
