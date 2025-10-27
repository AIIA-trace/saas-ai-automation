const OpenAI = require('openai');
const logger = require('../utils/logger');
const { getClientContext, buildSystemPrompt: buildBaseSystemPrompt } = require('../utils/clientContextHelper');

class OpenAIEmailService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generar respuesta inteligente para un email basado en el hilo completo
   * @param {Array} threadMessages - Mensajes del hilo ordenados cronológicamente
   * @param {Object} currentEmail - Email actual al que se responde
   * @param {number} clientId - ID del cliente
   * @returns {String} - Respuesta generada por IA
   */
  async generateEmailReply(threadMessages, currentEmail, clientId) {
    try {
      logger.info('🎬 ===== INICIO generateEmailReply =====');
      logger.info('🤖 Generando respuesta de email con IA...');
      logger.info(`📊 Datos recibidos:`, {
        threadMessagesCount: threadMessages.length,
        currentEmailFrom: currentEmail.from,
        currentEmailSubject: currentEmail.subject,
        clientId: clientId
      });

      // Obtener contexto completo del cliente desde la base de datos
      logger.info('🔍 Obteniendo contexto del cliente...');
      const clientContext = await getClientContext(clientId);
      logger.info(`📋 Contexto cargado para ${clientContext.companyName}`);
      logger.info(`📋 Contexto incluye:`, {
        companyName: clientContext.companyName,
        industry: clientContext.industry,
        servicesCount: clientContext.services?.length || 0,
        hasFAQs: !!clientContext.faqs,
        hasContextFiles: !!clientContext.contextFiles
      });

      // Construir contexto del hilo
      logger.info('📝 Construyendo contexto del hilo...');
      const threadContext = this.buildThreadContext(threadMessages);
      logger.info(`✅ Contexto del hilo construido: ${threadContext.length} caracteres`);
      
      // Construir prompt
      logger.info('📝 Construyendo prompts...');
      const systemPrompt = this.buildSystemPrompt(clientContext);
      const userPrompt = this.buildUserPrompt(threadContext, currentEmail);
      
      logger.info(`✅ System prompt: ${systemPrompt.length} caracteres`);
      logger.info(`✅ User prompt: ${userPrompt.length} caracteres`);

      // Llamar a OpenAI
      logger.info('🚀 Llamando a OpenAI API...');
      logger.info(`📍 Modelo: gpt-4o`);
      logger.info(`🌡️ Temperature: 0.7`);
      logger.info(`📏 Max tokens: 1000`);
      logger.info(`🔑 API Key configurada: ${!!process.env.OPENAI_API_KEY}`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      logger.info('✅ Respuesta recibida de OpenAI');
      logger.info(`📊 Completion info:`, {
        id: completion.id,
        model: completion.model,
        usage: completion.usage
      });

      const generatedReply = completion.choices[0].message.content.trim();
      
      logger.info('✅ Respuesta generada exitosamente');
      logger.info(`📝 Longitud: ${generatedReply.length} caracteres`);
      logger.info(`📄 Primeros 150 caracteres: ${generatedReply.substring(0, 150)}...`);
      logger.info('🏁 ===== FIN generateEmailReply EXITOSO =====');
      
      return generatedReply;

    } catch (error) {
      logger.error('❌ ===== ERROR EN generateEmailReply =====');
      logger.error('❌ Error generando respuesta con IA:', error);
      logger.error('❌ Error message:', error.message);
      logger.error('❌ Error stack:', error.stack);
      if (error.response) {
        logger.error('❌ OpenAI API response:', error.response.data);
      }
      throw new Error(`Error al generar respuesta: ${error.message}`);
    }
  }

  /**
   * Construir contexto del hilo de emails
   */
  buildThreadContext(threadMessages) {
    if (!threadMessages || threadMessages.length === 0) {
      return 'No hay mensajes anteriores en el hilo.';
    }

    let context = 'HISTORIAL DEL HILO DE EMAILS:\n\n';
    
    threadMessages.forEach((msg, index) => {
      const date = new Date(msg.date).toLocaleString('es-ES');
      context += `--- Mensaje ${index + 1} (${date}) ---\n`;
      context += `De: ${msg.from}\n`;
      context += `Para: ${msg.to}\n`;
      if (msg.cc) context += `CC: ${msg.cc}\n`;
      context += `Asunto: ${msg.subject}\n\n`;
      context += `${msg.body || msg.snippet}\n\n`;
      context += '---\n\n';
    });

    return context;
  }

  /**
   * Construir prompt del sistema con contexto de la empresa
   */
  buildSystemPrompt(clientContext) {
    const { companyName, userName, companyDescription, industry, services, businessHours, faqs, contextFiles, contactInfo } = clientContext;

    let prompt = `Eres un asistente de IA profesional que ayuda a ${userName} de ${companyName} a responder emails de manera efectiva.`;

    // Agregar información de la empresa
    if (companyDescription) {
      prompt += `\n\nSOBRE LA EMPRESA:\n${companyDescription}`;
    }

    if (industry) {
      prompt += `\n\nINDUSTRIA: ${industry}`;
    }

    if (services && services.length > 0) {
      prompt += `\n\nSERVICIOS QUE OFRECEMOS:\n${services.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    }

    if (businessHours) {
      prompt += `\n\nHORARIO DE ATENCIÓN:\n${businessHours}`;
    }

    if (faqs) {
      prompt += `\n\nPREGUNTAS FRECUENTES (úsalas para responder si son relevantes):\n${faqs}`;
    }

    if (contextFiles) {
      prompt += `\n\nDOCUMENTACIÓN ADICIONAL:\n${contextFiles}`;
    }

    if (contactInfo.email || contactInfo.phone || contactInfo.website) {
      prompt += `\n\nINFORMACIÓN DE CONTACTO:`;
      if (contactInfo.email) prompt += `\nEmail: ${contactInfo.email}`;
      if (contactInfo.phone) prompt += `\nTeléfono: ${contactInfo.phone}`;
      if (contactInfo.website) prompt += `\nWeb: ${contactInfo.website}`;
    }

    prompt += `\n\nTU MISIÓN AL RESPONDER:
- Analizar el hilo completo de emails para entender el contexto
- Usar la información de la empresa proporcionada arriba
- Generar una respuesta profesional, clara y contextualizada
- Mantener un tono cordial pero profesional
- Responder directamente a las preguntas o solicitudes del remitente
- Ser conciso pero completo

REGLAS CRÍTICAS - COMPORTAMIENTO HUMANO:
1. SIEMPRE responde como una PERSONA REAL, no como un asistente de IA
2. NUNCA digas cosas como "no tengo suficiente información", "no puedo ayudarte", "parece que no hay información"
3. Si falta información, pide los detalles específicos de manera natural: "Para poder ayudarte mejor, ¿podrías indicarme...?"
4. Responde con confianza y naturalidad, como lo haría un profesional humano
5. Si algo no está claro, reformula la pregunta de manera amigable sin sonar robótico
6. NUNCA menciones que eres una IA o que tienes limitaciones
7. Actúa como si fueras ${userName} respondiendo personalmente

REGLAS TÉCNICAS:
1. USA la información de la empresa proporcionada arriba
2. Analiza TODO el hilo de emails para entender el contexto completo
3. Mantén el mismo idioma del email original
4. NO incluyas saludos de cierre como "Atentamente" o firmas (se agregarán automáticamente)
5. Responde en primera persona representando a ${userName}
6. Si el email requiere acción específica, menciónala claramente
7. Si hay información en las FAQs o documentación que responde la pregunta, úsala

FORMATO DE RESPUESTA:
- Comienza directamente con el contenido (puedes usar "Hola" o el nombre si lo conoces)
- Usa párrafos cortos y claros
- Si hay múltiples puntos, usa listas numeradas o con viñetas
- Termina con una frase de cierre apropiada pero SIN firma
- Escribe como escribiría un humano: natural, cálido, profesional`;

    return prompt;
  }

  /**
   * Construir prompt del usuario
   */
  buildUserPrompt(threadContext, currentEmail) {
    return `${threadContext}

EMAIL ACTUAL AL QUE DEBES RESPONDER:
De: ${currentEmail.from}
Para: ${currentEmail.to || 'mí'}
Asunto: ${currentEmail.subject}

${currentEmail.body || currentEmail.snippet}

---

INSTRUCCIONES:
Basándote en todo el hilo de emails anterior, genera una respuesta profesional y contextualizada para el email actual.

La respuesta debe:
1. Demostrar que has leído y entendido todo el hilo
2. Responder específicamente a lo que se pregunta o solicita en el último email
3. Mantener coherencia con los mensajes anteriores
4. Ser clara, profesional y útil
5. IMPORTANTE: Responde como una PERSONA REAL. Si necesitas más información, pídela de manera natural y específica
6. NO uses frases robóticas como "no tengo información suficiente" - en su lugar, pregunta específicamente qué necesitas saber

GENERA LA RESPUESTA (escribe como un humano profesional):`;
  }

  /**
   * Generar email desde cero (composición)
   * @param {string} purpose - Propósito del email (ej: "responder consulta sobre precios")
   * @param {string} recipient - Destinatario (opcional)
   * @param {number} clientId - ID del cliente
   * @returns {Object} - { subject, body }
   */
  async generateNewEmail(purpose, recipient, clientId) {
    try {
      logger.info('✉️ Generando email nuevo con IA...');

      // Obtener contexto completo del cliente
      const clientContext = await getClientContext(clientId);
      logger.info(`📋 Contexto cargado para ${clientContext.companyName}`);

      // Construir prompt para email nuevo
      const systemPrompt = this.buildSystemPrompt(clientContext);
      const userPrompt = `Genera un email profesional con el siguiente propósito: ${purpose}

${recipient ? `Destinatario: ${recipient}\n` : ''}
INSTRUCCIONES:
1. Genera un asunto apropiado
2. Escribe el cuerpo del email de manera profesional
3. Usa la información de la empresa del contexto
4. Mantén un tono cordial pero profesional
5. NO incluyas firma (se agregará automáticamente)

FORMATO DE RESPUESTA (JSON):
{
  "subject": "Asunto del email",
  "body": "Cuerpo del email"
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content.trim());
      
      logger.info('✅ Email nuevo generado exitosamente');
      return result;

    } catch (error) {
      logger.error('❌ Error generando email nuevo:', error);
      throw new Error(`Error al generar email: ${error.message}`);
    }
  }

  /**
   * Generar resumen del hilo de emails
   */
  async generateThreadSummary(threadMessages) {
    try {
      logger.info('📝 Generando resumen del hilo...');

      const threadContext = this.buildThreadContext(threadMessages);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente que genera resúmenes concisos de hilos de emails. Resume los puntos clave en 2-3 oraciones.'
          },
          {
            role: 'user',
            content: `Resume este hilo de emails:\n\n${threadContext}`
          }
        ],
        temperature: 0.5,
        max_tokens: 200
      });

      const summary = completion.choices[0].message.content.trim();
      logger.info('✅ Resumen generado');
      return summary;

    } catch (error) {
      logger.error('❌ Error generando resumen:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIEmailService();
