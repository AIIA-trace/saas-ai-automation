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

    // Limitar a los últimos 15 mensajes para mantener contexto suficiente
    const recentMessages = threadMessages.slice(-15);
    
    logger.info(`📊 Construyendo contexto: ${threadMessages.length} mensajes → usando últimos ${recentMessages.length}`);

    let context = 'HISTORIAL DEL HILO DE EMAILS:\n\n';
    
    recentMessages.forEach((msg, index) => {
      const date = new Date(msg.date).toLocaleString('es-ES');
      context += `--- Mensaje ${index + 1} (${date}) ---\n`;
      context += `De: ${msg.from}\n`;
      context += `Para: ${msg.to}\n`;
      if (msg.cc) context += `CC: ${msg.cc}\n`;
      context += `Asunto: ${msg.subject}\n`;
      
      // Incluir adjuntos si existen
      if (msg.attachments && msg.attachments.length > 0) {
        context += `Adjuntos: ${msg.attachments.map(a => a.filename || a.name).join(', ')}\n`;
      }
      
      context += `\n`;
      
      // Limpiar el body: eliminar SOLO imágenes Base64, mantener todo el texto
      let cleanBody = this.cleanEmailBody(msg.body || msg.snippet || '');
      
      context += `${cleanBody}\n\n`;
      context += '---\n\n';
    });

    logger.info(`✅ Contexto construido: ${context.length} caracteres`);
    return context;
  }

  /**
   * Limpiar body del email: eliminar SOLO imágenes Base64 (que son enormes)
   * Mantener TODO el texto para no perder información crítica
   */
  cleanEmailBody(body) {
    if (!body) return '';

    let cleaned = body;

    // 1. Eliminar imágenes Base64 (estas son ENORMES y causan el problema de tokens)
    // Reemplazar con marcador para que la IA sepa que había una imagen
    cleaned = cleaned.replace(/<img[^>]*src="data:image\/[^"]*"[^>]*>/gi, '[Imagen adjunta]');
    cleaned = cleaned.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, '[Imagen Base64]');

    // 2. Eliminar estilos y scripts (no aportan contexto)
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // 3. Convertir HTML a texto manteniendo estructura
    // Mantener saltos de línea importantes
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
    cleaned = cleaned.replace(/<\/div>/gi, '\n');
    cleaned = cleaned.replace(/<li>/gi, '\n- ');
    
    // Eliminar el resto de tags HTML
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // 4. Decodificar entidades HTML
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");

    // 5. Limpiar espacios excesivos PERO mantener estructura
    cleaned = cleaned.replace(/ {2,}/g, ' '); // Múltiples espacios → 1 espacio
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n'); // Máximo 3 saltos de línea

    return cleaned.trim();
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

REGLAS CRÍTICAS - COMPORTAMIENTO HUMANO Y NATURALIDAD:
1. SIEMPRE responde como una PERSONA REAL, no como un asistente de IA
2. Responde de forma NATURAL al flujo de la conversación, como lo haría un humano en esa situación
3. NUNCA digas cosas como "no tengo suficiente información", "no puedo ayudarte", "parece que no hay información"
4. Si falta información, pide los detalles específicos de manera natural: "Para poder ayudarte mejor, ¿podrías indicarme...?"
5. Responde con confianza y naturalidad, como lo haría un profesional humano
6. Si algo no está claro, reformula la pregunta de manera amigable sin sonar robótico
7. NUNCA menciones que eres una IA o que tienes limitaciones
8. Actúa como si fueras ${userName} respondiendo personalmente

CONVERSACIÓN NATURAL Y OBJETIVOS:
- Lee el flujo completo de la conversación y responde de manera coherente con lo que viene después
- Mantén los objetivos de la empresa de forma SUTIL, sin ser comercial o insistente
- Si hay oportunidad de mencionar un servicio relevante, hazlo de forma natural en el contexto
- NO fuerces ventas ni menciones servicios que no son relevantes para la conversación
- Prioriza ayudar genuinamente al cliente - las ventas vienen de forma natural cuando ayudas bien
- Si el cliente pregunta algo específico, responde ESO primero, luego puedes mencionar algo relacionado
- Sé humano: usa expresiones naturales, empatía, y adapta tu respuesta al estado emocional del mensaje

REGLAS TÉCNICAS:
1. USA la información de la empresa proporcionada arriba
2. Analiza TODO el hilo de emails para entender el contexto completo
3. IDIOMA Y TONO: Responde en el MISMO IDIOMA que se usa en el hilo de conversación
   - Si el hilo está en español, responde en español
   - Si el hilo está en inglés, responde en inglés
   - Si el hilo está en otro idioma, responde en ese idioma
4. REGISTRO Y TONO: Adapta tu registro al tono del hilo
   - Si el hilo es formal, mantén un tono formal
   - Si el hilo es informal/cercano, usa un tono más relajado
   - Observa cómo se han comunicado previamente y mantén esa consistencia
5. NO incluyas saludos de cierre como "Atentamente" o firmas (se agregarán automáticamente)
6. Responde en primera persona representando a ${userName}
7. Si el email requiere acción específica, menciónala claramente
8. Si hay información en las FAQs o documentación que responde la pregunta, úsala

FORMATO DE RESPUESTA:
- Comienza directamente con el contenido (puedes usar "Hola" o el nombre si lo conoces)
- Usa párrafos cortos y claros
- Si hay múltiples puntos, usa listas numeradas o con viñetas
- Termina con una frase de cierre apropiada pero SIN firma
- Escribe como escribiría un humano: natural, cálido, profesional
- IMPORTANTE: Mantén el mismo estilo de escritura que se observa en el hilo`;

    return prompt;
  }

  /**
   * Construir prompt del usuario
   */
  buildUserPrompt(threadContext, currentEmail) {
    // Limpiar el body del email actual (eliminar solo imágenes Base64)
    const cleanCurrentBody = this.cleanEmailBody(currentEmail.body || currentEmail.snippet || '');

    let emailInfo = `EMAIL ACTUAL AL QUE DEBES RESPONDER:
De: ${currentEmail.from}
Para: ${currentEmail.to || 'mí'}
Asunto: ${currentEmail.subject}`;

    // Incluir adjuntos si existen
    if (currentEmail.attachments && currentEmail.attachments.length > 0) {
      emailInfo += `\nAdjuntos: ${currentEmail.attachments.map(a => a.filename || a.name).join(', ')}`;
    }

    emailInfo += `\n\n${cleanCurrentBody}`;

    return `${threadContext}

${emailInfo}

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
7. Si se mencionan archivos adjuntos (facturas, documentos, etc.), reconócelos en tu respuesta

CRÍTICO - NATURALIDAD Y FLUJO:
- Responde de forma NATURAL, como la siguiente respuesta lógica en esta conversación
- NO suenes como un chatbot o asistente virtual - suena como un humano profesional
- Usa expresiones naturales del idioma (ej: "Claro", "Perfecto", "Entiendo", "Por supuesto")
- Si el cliente está frustrado, muestra empatía genuina
- Si el cliente está contento, refleja ese tono positivo
- Adapta tu energía y entusiasmo al del cliente

CRÍTICO - IDIOMA Y TONO:
- Analiza el IDIOMA usado en el hilo de conversación (español, inglés, etc.)
- Responde en el MISMO IDIOMA que se ha usado en el hilo
- Observa el TONO y REGISTRO de los mensajes anteriores (formal, informal, técnico, cercano)
- Mantén el MISMO TONO Y REGISTRO en tu respuesta
- Si el hilo es formal, sé formal. Si es cercano, sé cercano.
- Adapta tu estilo de escritura al estilo observado en la conversación

CRÍTICO - OBJETIVOS SUTILES:
- Si hay oportunidad de ayudar con un servicio de la empresa, menciónalo de forma NATURAL
- NO fuerces ventas - prioriza resolver el problema del cliente
- Menciona servicios solo si son REALMENTE relevantes para lo que el cliente necesita
- Sé sutil: en lugar de "Te ofrecemos X", di "Esto también te podría ayudar con..." o "Por cierto, si necesitas..."

GENERA LA RESPUESTA (escribe como un humano profesional, natural y empático en el idioma y tono del hilo):`;
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

  /**
   * Reescribir contenido con IA para mejorar redacción
   */
  async rewriteContent(content, clientId) {
    try {
      logger.info('✍️ Reescribiendo contenido con IA...');

      // Obtener contexto del cliente
      const clientContext = await getClientContext(clientId);

      // Limpiar HTML del contenido
      const cleanContent = this.cleanEmailBody(content);

      const systemPrompt = `Eres un asistente experto en redacción profesional de emails para ${clientContext.companyName}.

Tu tarea es MEJORAR y REESCRIBIR el contenido que te proporcionen, manteniendo:
- El mensaje principal y la intención
- Un tono profesional pero cercano
- Claridad y concisión
- Corrección gramatical y ortográfica

IMPORTANTE:
- NO agregues saludos ni despedidas (se agregarán automáticamente)
- Mantén la estructura si tiene bullets o listas
- Mejora la redacción pero mantén el sentido original
- Escribe en el mismo idioma del texto original`;

      const userPrompt = `Reescribe y mejora el siguiente contenido de email:

${cleanContent}

Devuelve SOLO el contenido mejorado, sin saludos ni despedidas.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const rewritten = completion.choices[0].message.content.trim();
      
      logger.info('✅ Contenido reescrito exitosamente');
      logger.info(`📝 Longitud original: ${cleanContent.length} → Reescrito: ${rewritten.length}`);

      // Convertir saltos de línea a HTML
      return rewritten.replace(/\n/g, '<br>');

    } catch (error) {
      logger.error('❌ Error reescribiendo contenido:', error);
      throw new Error(`Error al reescribir contenido: ${error.message}`);
    }
  }
}

module.exports = new OpenAIEmailService();
