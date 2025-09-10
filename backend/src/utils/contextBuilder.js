const logger = require('./logger');

class ContextBuilder {
  /**
   * Construir contexto completo del cliente para OpenAI
   */
  static buildClientContext(clientConfig) {
    try {
      logger.info(`🔍 DEBUG CONTEXT: Construyendo contexto para ${clientConfig.companyName}`);
      logger.info(`🔍 DEBUG CONTEXT: Datos disponibles:`);
      logger.info(`🔍 DEBUG CONTEXT: - companyInfo: ${!!clientConfig.companyInfo}`);
      logger.info(`🔍 DEBUG CONTEXT: - businessHours: ${clientConfig.businessHours?.length || 0} horarios`);
      logger.info(`🔍 DEBUG CONTEXT: - faqs: ${clientConfig.faqs?.length || 0} preguntas`);
      logger.info(`🔍 DEBUG CONTEXT: - contextFiles: ${clientConfig.contextFiles?.length || 0} archivos`);
      logger.info(`🔍 DEBUG CONTEXT: - botConfig: ${!!clientConfig.botConfig}`);
      
      let context = '';
      
      // Información básica de la empresa
      context += `=== INFORMACIÓN DE LA EMPRESA ===\n`;
      context += `Empresa: ${clientConfig.companyName}\n`;
      
      if (clientConfig.companyInfo) {
        const info = clientConfig.companyInfo;
        if (info.description) context += `Descripción: ${info.description}\n`;
        if (info.industry) context += `Sector: ${info.industry}\n`;
        if (info.website) context += `Sitio web: ${info.website}\n`;
        if (info.address) context += `Dirección: ${info.address}\n`;
        if (info.phone) context += `Teléfono: ${info.phone}\n`;
        if (info.email) context += `Email: ${info.email}\n`;
      }
      
      // Horarios comerciales
      if (clientConfig.businessHours && clientConfig.businessHours.length > 0) {
        context += `\n=== HORARIOS COMERCIALES ===\n`;
        clientConfig.businessHours.forEach(schedule => {
          const day = this.getDayName(schedule.dayOfWeek);
          if (schedule.isOpen) {
            context += `${day}: ${schedule.openTime} - ${schedule.closeTime}\n`;
          } else {
            context += `${day}: CERRADO\n`;
          }
        });
        
        // Verificar si está abierto ahora
        const currentStatus = this.getCurrentBusinessStatus(clientConfig.businessHours);
        context += `\nEstado actual: ${currentStatus.isOpen ? 'ABIERTO' : 'CERRADO'}\n`;
        if (!currentStatus.isOpen && currentStatus.nextOpen) {
          context += `Próxima apertura: ${currentStatus.nextOpen}\n`;
        }
      }
      
      // Preguntas frecuentes
      if (clientConfig.faqs && clientConfig.faqs.length > 0) {
        context += `\n=== PREGUNTAS FRECUENTES ===\n`;
        clientConfig.faqs.forEach((faq, index) => {
          context += `${index + 1}. PREGUNTA: ${faq.question}\n`;
          context += `   RESPUESTA: ${faq.answer}\n\n`;
        });
      }
      
      // Archivos de contexto
      if (clientConfig.contextFiles && clientConfig.contextFiles.length > 0) {
        context += `\n=== INFORMACIÓN ADICIONAL ===\n`;
        clientConfig.contextFiles.forEach(file => {
          context += `--- ${file.name} ---\n`;
          if (file.content) {
            context += `${file.content}\n\n`;
          } else if (file.description) {
            context += `${file.description}\n\n`;
          }
        });
      }
      
      // Configuración del bot
      if (clientConfig.botConfig) {
        const botConfig = clientConfig.botConfig;
        context += `\n=== CONFIGURACIÓN DEL ASISTENTE ===\n`;
        if (botConfig.personality) context += `Personalidad: ${botConfig.personality}\n`;
        if (botConfig.tone) context += `Tono: ${botConfig.tone}\n`;
        if (botConfig.language) context += `Idioma: ${botConfig.language}\n`;
        if (botConfig.instructions) context += `Instrucciones especiales: ${botConfig.instructions}\n`;
      }
      
      context += `\n=== INSTRUCCIONES IMPORTANTES ===\n`;
      context += `- Responde siempre de manera profesional y amigable\n`;
      context += `- Usa la información proporcionada para dar respuestas precisas\n`;
      context += `- Si no tienes información específica, indica que transferirás la consulta\n`;
      context += `- Mantén las respuestas concisas pero completas\n`;
      context += `- Siempre confirma los horarios comerciales si es relevante\n`;
      
      logger.info(`📋 Contexto generado: ${context.length} caracteres`);
      return context;
      
    } catch (error) {
      logger.error(`❌ Error generando contexto: ${error.message}`);
      return `Empresa: ${clientConfig.companyName}\nAsistente virtual disponible para ayudarte.`;
    }
  }
  
  /**
   * Obtener nombre del día
   */
  static getDayName(dayOfWeek) {
    const days = {
      0: 'Domingo',
      1: 'Lunes', 
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };
    return days[dayOfWeek] || 'Día desconocido';
  }
  
  /**
   * Verificar estado actual del negocio
   */
  static getCurrentBusinessStatus(businessHours) {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      
      // Buscar horario del día actual
      const todaySchedule = businessHours.find(schedule => schedule.dayOfWeek === currentDay);
      
      if (!todaySchedule || !todaySchedule.isOpen) {
        return { isOpen: false, nextOpen: this.getNextOpenTime(businessHours) };
      }
      
      // Verificar si está dentro del horario
      const isOpen = currentTime >= todaySchedule.openTime && currentTime <= todaySchedule.closeTime;
      
      return { 
        isOpen, 
        nextOpen: isOpen ? null : this.getNextOpenTime(businessHours)
      };
      
    } catch (error) {
      logger.error(`❌ Error verificando horario: ${error.message}`);
      return { isOpen: true, nextOpen: null };
    }
  }
  
  /**
   * Obtener próximo horario de apertura
   */
  static getNextOpenTime(businessHours) {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      
      // Buscar el próximo día abierto
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const schedule = businessHours.find(s => s.dayOfWeek === checkDay && s.isOpen);
        
        if (schedule) {
          const dayName = this.getDayName(checkDay);
          return `${dayName} a las ${schedule.openTime}`;
        }
      }
      
      return 'Consultar horarios';
    } catch (error) {
      return 'Consultar horarios';
    }
  }
  
  /**
   * Generar prompt del sistema para OpenAI
   */
  static buildSystemPrompt(clientConfig) {
    const context = this.buildClientContext(clientConfig);
    
    return `Eres un asistente virtual profesional para ${clientConfig.companyName}. 

${context}

Tu objetivo es ayudar a los clientes de manera eficiente y profesional. Usa toda la información proporcionada para dar respuestas precisas y útiles.`;
  }
}

module.exports = ContextBuilder;
