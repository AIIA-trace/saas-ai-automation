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
      const normalizedPhone = this.normalizePhone(callerPhone);
      if (!normalizedPhone) {
        logger.warn('📞 Número de teléfono inválido para memoria');
        return null;
      }

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

    let context = '\n\n🧠 CONTEXTO DEL LLAMANTE:\n';
    
    // 🎯 INSTRUCCIONES DE USO DEL CONTEXTO
    if (memory.callCount === 1) {
      context += `\n⚠️ CLIENTE NUEVO: Esta es su primera llamada.\n`;
      context += `- Salúdalo normalmente y pregunta su nombre y empresa.\n`;
    } else {
      // Cliente recurrente - dar instrucciones específicas
      context += `\n⚠️ CLIENTE RECURRENTE: ${memory.callerName || 'Este cliente'} ya ha llamado ${memory.callCount - 1} ${memory.callCount === 2 ? 'vez' : 'veces'} antes.\n`;
      
      if (memory.callerName) {
        context += `- Nombre: ${memory.callerName}\n`;
      }
      
      if (memory.callerCompany) {
        context += `- Empresa: ${memory.callerCompany}\n`;
      }
      
      context += `\n🎯 CÓMO USAR ESTE CONTEXTO:\n`;
      context += `1. SALÚDALO POR SU NOMBRE de forma natural: "¡Hola ${memory.callerName || 'de nuevo'}!"\n`;
      context += `2. MENCIONA BREVEMENTE la última conversación de forma casual\n`;
      context += `3. PREGUNTA si llama por lo mismo o por algo nuevo\n`;
      
      context += `\n📝 EJEMPLO DE SALUDO NATURAL:\n`;
      if (memory.conversationHistory?.conversations?.length > 0) {
        const lastConv = memory.conversationHistory.conversations[memory.conversationHistory.conversations.length - 1];
        const lastTopic = lastConv.topics?.[0] || 'lo que hablamos';
        context += `"¡Hola ${memory.callerName || 'de nuevo'}! ¿Llamas por lo de ${lastTopic} o necesitas algo más?"\n`;
      } else {
        context += `"¡Hola ${memory.callerName || 'de nuevo'}! ¿En qué puedo ayudarte hoy?"\n`;
      }

      // Últimas conversaciones (resumidas)
      if (memory.conversationHistory?.conversations?.length > 0) {
        context += `\n📞 ÚLTIMAS CONVERSACIONES (para referencia):\n`;
        memory.conversationHistory.conversations.slice(-3).forEach((conv, index) => {
          const dateStr = new Date(conv.date).toLocaleDateString('es-ES');
          context += `\n${index + 1}. ${dateStr}: ${conv.summary.substring(0, 100)}...\n`;
          if (conv.topics && conv.topics.length > 0) {
            context += `   Temas: ${conv.topics.join(', ')}\n`;
          }
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
