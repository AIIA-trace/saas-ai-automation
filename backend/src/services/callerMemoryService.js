const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Servicio para gestionar la memoria de llamadas de clientes
 */
class CallerMemoryService {
  /**
   * Normalizar número de teléfono (eliminar espacios, guiones, etc.)
   */
  normalizePhone(phone) {
    if (!phone) return null;
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Obtener o crear memoria de un llamante
   * @param {number} clientId - ID del cliente (empresa)
   * @param {string} callerPhone - Número de teléfono del llamante
   * @returns {Promise<Object>} - Memoria del llamante
   */
  async getOrCreateCallerMemory(clientId, callerPhone) {
    try {
      // ⚠️ VALIDACIÓN ESTRICTA DE PARÁMETROS
      if (!clientId) {
        logger.error('❌ CRÍTICO: clientId es null/undefined');
        return null;
      }
      
      if (!callerPhone) {
        logger.error('❌ CRÍTICO: callerPhone es null/undefined');
        return null;
      }
      
      const normalizedPhone = this.normalizePhone(callerPhone);
      if (!normalizedPhone) {
        logger.error(`❌ CRÍTICO: Número de teléfono inválido: "${callerPhone}"`);
        return null;
      }
      
      // 🔍 LOG de búsqueda
      logger.info(`🔍 Buscando memoria: clientId=${clientId}, phone=${normalizedPhone}`);

      // Buscar memoria existente
      let memory = await prisma.callerMemory.findUnique({
        where: {
          clientId_callerPhone: {
            clientId: clientId,
            callerPhone: normalizedPhone
          }
        }
      });

      if (memory) {
        // Actualizar última llamada y contador
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 días desde ahora

        memory = await prisma.callerMemory.update({
          where: { id: memory.id },
          data: {
            lastCallDate: new Date(),
            callCount: memory.callCount + 1,
            expiresAt: expiresAt
          }
        });

        logger.info(`🧠 [Cliente ${clientId}] Memoria recuperada para ${normalizedPhone} (${memory.callCount} llamadas)`);
      } else {
        // Crear nueva memoria
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 días desde ahora

        memory = await prisma.callerMemory.create({
          data: {
            clientId: clientId,
            callerPhone: normalizedPhone,
            lastCallDate: new Date(),
            callCount: 1,
            expiresAt: expiresAt,
            conversationHistory: {}
          }
        });

        logger.info(`🆕 [Cliente ${clientId}] Nueva memoria creada para ${normalizedPhone}`);
      }

      return memory;
    } catch (error) {
      logger.error(`❌ Error obteniendo/creando memoria: ${error.message}`);
      return null;
    }
  }

  /**
   * Actualizar información del llamante
   * @param {number} memoryId - ID de la memoria
   * @param {Object} data - Datos a actualizar (callerName, callerCompany, notes)
   */
  async updateCallerInfo(memoryId, data) {
    try {
      const updateData = {};
      
      if (data.callerName) updateData.callerName = data.callerName;
      if (data.callerCompany) updateData.callerCompany = data.callerCompany;
      if (data.notes) updateData.notes = data.notes;

      const memory = await prisma.callerMemory.update({
        where: { id: memoryId },
        data: updateData
      });

      logger.info(`✅ [Memoria ${memoryId}] Información actualizada`);
      return memory;
    } catch (error) {
      logger.error(`❌ Error actualizando información del llamante: ${error.message}`);
      return null;
    }
  }

  /**
   * Agregar conversación al historial
   * @param {number} memoryId - ID de la memoria
   * @param {Object} conversation - Datos de la conversación
   */
  async addConversationToHistory(memoryId, conversation) {
    try {
      logger.info(`🔍 [Memoria ${memoryId}] Iniciando addConversationToHistory`);
      logger.info(`🔍 [Memoria ${memoryId}] Conversation data: ${JSON.stringify(conversation)}`);
      
      const memory = await prisma.callerMemory.findUnique({
        where: { id: memoryId }
      });

      if (!memory) {
        logger.warn(`⚠️ Memoria ${memoryId} no encontrada`);
        return null;
      }

      logger.info(`✅ [Memoria ${memoryId}] Memoria encontrada`);

      // Obtener historial actual
      const history = memory.conversationHistory || { conversations: [] };
      logger.info(`🔍 [Memoria ${memoryId}] Historial actual: ${history.conversations?.length || 0} conversaciones`);
      
      // Agregar nueva conversación (solo resumen, NO transcripción completa)
      history.conversations = history.conversations || [];
      const newConversation = {
        date: new Date().toISOString(),
        summary: conversation.summary || '',
        topics: conversation.topics || [],
        duration: conversation.duration || 0,
        requestDetails: conversation.requestDetails || {}
      };
      
      logger.info(`📝 [Memoria ${memoryId}] Nueva conversación: ${JSON.stringify(newConversation)}`);
      history.conversations.push(newConversation);

      // Mantener solo las últimas 10 conversaciones
      if (history.conversations.length > 10) {
        history.conversations = history.conversations.slice(-10);
      }

      logger.info(`💾 [Memoria ${memoryId}] Actualizando BD con ${history.conversations.length} conversaciones`);

      // Actualizar memoria
      const updatedMemory = await prisma.callerMemory.update({
        where: { id: memoryId },
        data: {
          conversationHistory: history
        }
      });

      logger.info(`✅ [Memoria ${memoryId}] Conversación agregada al historial exitosamente`);
      return updatedMemory;
    } catch (error) {
      logger.error(`❌ Error agregando conversación al historial: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtener contexto de memoria para el prompt
   * @param {Object} memory - Objeto de memoria
   * @returns {string} - Contexto formateado para el prompt
   */
  getMemoryContext(memory) {
    if (!memory) return '';
    
    // ⚠️ VALIDACIÓN DE SEGURIDAD: Verificar que la memoria tiene datos válidos
    if (!memory.callerPhone || !memory.clientId) {
      logger.error('❌ CRÍTICO: Memoria sin datos válidos - NO SE USARÁ CONTEXTO');
      return '';
    }

    let context = '\n\n🧠 CONTEXTO DEL LLAMANTE:\n';
    context += `⚠️ VERIFICADO: Número ${memory.callerPhone} - Cliente ID ${memory.clientId}\n`;
    
    // 🎯 INSTRUCCIONES DE USO DEL CONTEXTO
    if (memory.callCount === 1) {
      context += `\n⚠️ CLIENTE NUEVO: Esta es su primera llamada.\n`;
      context += `- Salúdalo normalmente y pregunta su nombre y empresa.\n`;
    } else {
      // Cliente recurrente - dar instrucciones específicas
      context += `\n⚠️ CLIENTE RECURRENTE: Este número ya ha llamado ${memory.callCount - 1} ${memory.callCount === 2 ? 'vez' : 'veces'} antes.\n`;
      
      context += `\n🚨 PROTOCOLO OBLIGATORIO - VERIFICACIÓN DE IDENTIDAD:\n`;
      context += `\n❌ ❌ ❌ NUNCA NUNCA NUNCA saludes con el nombre del cliente ❌ ❌ ❌\n`;
      context += `❌ ❌ ❌ NUNCA digas "Hola Rafa" o "Hola ${memory.callerName || '[nombre]'}" al inicio ❌ ❌ ❌\n`;
      context += `\n✅ SIEMPRE sigue este protocolo EXACTO:\n`;
      context += `\n1️⃣ SALUDO INICIAL (SIN NOMBRE):\n`;
      context += `   Saluda de forma genérica: "¡Hola! ¿En qué puedo ayudarte?" o "¡Hola! ¿De parte de quién?"\n`;
      context += `   ❌ NO menciones ningún nombre\n`;
      context += `   ❌ NO digas "Hola de nuevo"\n`;
      context += `   ❌ NO uses datos del historial\n`;
      context += `\n2️⃣ ESPERA A QUE EL CLIENTE DIGA SU NOMBRE:\n`;
      context += `   - Si el cliente dice su nombre en el saludo → Continúa al paso 3\n`;
      context += `   - Si NO lo dice → Pregunta: "¿Me dices tu nombre y de qué empresa llamas?"\n`;
      context += `\n3️⃣ DESPUÉS de que el cliente diga su nombre, VERIFICA:\n`;
      
      if (memory.callerName) {
        context += `   - Nombre registrado en sistema: ${memory.callerName}\n`;
      }
      
      if (memory.callerCompany) {
        context += `   - Empresa registrada en sistema: ${memory.callerCompany}\n`;
      }
      
      context += `\n   SI el cliente dice "${memory.callerName}" → Es la MISMA persona:\n`;
      context += `      ✅ AHORA SÍ puedes reconocerlo: "¡Ah, ${memory.callerName}! ¿Cómo estás? ¿Llamas por lo de [tema anterior]?"\n`;
      context += `      ✅ PUEDES dar detalles de conversaciones previas\n`;
      context += `\n   SI dice OTRO nombre (ej: "Miguel", "Juan", etc.) → Es OTRA persona:\n`;
      context += `      ⚠️ Pregunta: "Perfecto, Miguel. ¿Llamas por algo relacionado con ${memory.callerCompany || 'tu empresa'}?"\n`;
      context += `      ❌ NO menciones el nombre "${memory.callerName}" a menos que sea relevante\n`;
      context += `      ❌ NO des detalles de conversaciones anteriores sin confirmar\n`;
      context += `\n⚠️ RESUMEN: NUNCA uses el nombre del historial HASTA que el cliente se identifique primero.\n`;
      context += `\n⚠️ CRÍTICO - OCULTACIÓN DE IDENTIDAD:\n`;
      context += `   ❌ NUNCA menciones que eres un bot, IA o sistema automatizado\n`;
      context += `   ❌ NUNCA menciones información de OTRAS empresas o clientes\n`;
      context += `   ❌ NUNCA digas "he sido programado para..." o "mi misión es..."\n`;
      context += `   ✅ Si preguntan si eres un bot: "jajaja ¿por qué lo dices? ¿En qué te puedo ayudar?"\n`;
      context += `   ✅ Si preguntan sobre otras empresas: "No sé de qué me hablas. ¿Necesitas algo?"\n`;
      context += `   ✅ Actúa como una persona real con humor y naturalidad\n`;

      // Últimas conversaciones (COMPLETAS - sin cortar)
      if (memory.conversationHistory?.conversations?.length > 0) {
        context += `\n📞 ÚLTIMAS CONVERSACIONES (para referencia):\n`;
        context += `⚠️ IMPORTANTE: Estos resúmenes contienen TODOS los datos específicos (números, importes, fechas, etc.)\n`;
        context += `Si el cliente pregunta por algo mencionado aquí, PUEDES recordárselo.\n\n`;
        
        memory.conversationHistory.conversations.slice(-3).forEach((conv, index) => {
          const dateStr = new Date(conv.date).toLocaleDateString('es-ES');
          // ⚠️ CRÍTICO: Mostrar resumen COMPLETO sin cortar para que el bot tenga TODOS los datos
          context += `${index + 1}. ${dateStr}: ${conv.summary}\n`;
          if (conv.topics && conv.topics.length > 0) {
            context += `   Temas: ${conv.topics.join(', ')}\n`;
          }
          context += `\n`;
        });
      }
    }

    if (memory.notes) {
      context += `\n📝 NOTAS IMPORTANTES: ${memory.notes}\n`;
    }

    return context;
  }

  /**
   * Limpiar memorias expiradas (ejecutar diariamente)
   */
  async cleanExpiredMemories() {
    try {
      const now = new Date();
      
      const result = await prisma.callerMemory.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });

      logger.info(`🗑️ Memorias expiradas eliminadas: ${result.count}`);
      return result.count;
    } catch (error) {
      logger.error(`❌ Error limpiando memorias expiradas: ${error.message}`);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de memoria
   * @param {number} clientId - ID del cliente
   */
  async getMemoryStats(clientId) {
    try {
      const totalMemories = await prisma.callerMemory.count({
        where: { clientId }
      });

      const recentCallers = await prisma.callerMemory.findMany({
        where: { clientId },
        orderBy: { lastCallDate: 'desc' },
        take: 10,
        select: {
          callerPhone: true,
          callerName: true,
          callerCompany: true,
          callCount: true,
          lastCallDate: true
        }
      });

      return {
        totalMemories,
        recentCallers
      };
    } catch (error) {
      logger.error(`❌ Error obteniendo estadísticas de memoria: ${error.message}`);
      return null;
    }
  }
}

module.exports = new CallerMemoryService();
