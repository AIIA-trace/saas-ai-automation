const axios = require('axios');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Transcribir audio usando Whisper API
  async transcribeAudio(audioUrl) {
    try {
      // Primero descargamos el audio de la URL
      const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(audioResponse.data);
      
      // Crear un FormData para la API de Whisper
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      
      // Enviar a la API de Whisper
      const response = await axios.post(
        `${this.baseUrl}/audio/transcriptions`,
        formData,
        { headers: { ...this.headers, 'Content-Type': 'multipart/form-data' } }
      );
      
      return {
        success: true,
        transcription: response.data.text
      };
    } catch (error) {
      logger.error(`Error transcribiendo audio: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Analizar texto (transcripción o email) para extraer información clave
  async analyzeText(text, companyInfo, type = 'call') {
    try {
      let systemPrompt = '';
      
      if (type === 'call') {
        systemPrompt = `Eres un asistente encargado de analizar transcripciones de llamadas telefónicas para la empresa ${companyInfo.companyName}. 
        Tu tarea es extraer la siguiente información en formato JSON:
        1. Nombre del llamante (si se menciona)
        2. Número de teléfono de contacto (si se menciona)
        3. Motivo principal de la llamada
        4. Nivel de urgencia (bajo, medio, alto)
        5. Clasificación del tipo de llamada (consulta, queja, solicitud de información, etc.)
        6. Resumen breve y conciso de la llamada (máximo 2 frases)
        
        Información sobre la empresa: ${companyInfo.description || ''}`;
      } else if (type === 'email') {
        systemPrompt = `Eres un asistente encargado de analizar emails recibidos para la empresa ${companyInfo.companyName}. 
        Tu tarea es extraer la siguiente información en formato JSON:
        1. Nombre del remitente
        2. Información de contacto proporcionada
        3. Motivo principal del email
        4. Nivel de urgencia (bajo, medio, alto)
        5. Clasificación del tipo de email (consulta, queja, solicitud de información, etc.)
        6. Resumen breve y conciso del email (máximo 3 frases)
        7. Palabras clave importantes para clasificación
        
        Información sobre la empresa: ${companyInfo.description || ''}`;
      }
      
      // Llamar a la API de GPT
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        { headers: this.headers }
      );
      
      // Intentar parsear la respuesta como JSON
      try {
        const content = response.data.choices[0].message.content;
        // Extraer JSON si está entre comillas
        const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : content;
        const result = JSON.parse(jsonString);
        
        return {
          success: true,
          analysis: result,
          rawResponse: content
        };
      } catch (parseError) {
        logger.error(`Error parseando respuesta JSON: ${parseError.message}`);
        return {
          success: true,
          analysis: null,
          rawResponse: response.data.choices[0].message.content
        };
      }
    } catch (error) {
      logger.error(`Error analizando texto: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Determinar a quién reenviar un email basado en reglas de cliente
  async determineEmailForwarding(emailData, emailConfig) {
    try {
      const forwardingRules = emailConfig.forwardingRules || [];
      
      if (forwardingRules.length === 0) {
        return {
          success: true,
          recipients: emailConfig.defaultRecipients || []
        };
      }
      
      // Crear prompt para evaluar reglas
      const systemPrompt = `Eres un asistente encargado de determinar a qué direcciones de email debe reenviarse un correo entrante.
      Evaluarás el contenido del correo contra un conjunto de reglas y devolverás la lista de direcciones a las que debe reenviarse.
      
      Reglas de reenvío (en formato JSON):
      ${JSON.stringify(forwardingRules)}
      
      Debes analizar el asunto y cuerpo del email, y determinar qué reglas se cumplen.
      Si se cumplen varias reglas, incluye todas las direcciones correspondientes.
      Si no se cumple ninguna regla, utiliza los destinatarios por defecto.
      
      Responde únicamente con un objeto JSON con la siguiente estructura:
      { "recipients": ["email1@dominio.com", "email2@dominio.com"] }`;
      
      // Llamar a la API de GPT
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `
              Asunto: ${emailData.subject}
              Cuerpo: ${emailData.body}
            `}
          ],
          temperature: 0.1,
          max_tokens: 300
        },
        { headers: this.headers }
      );
      
      // Intentar parsear la respuesta como JSON
      try {
        const content = response.data.choices[0].message.content;
        // Extraer JSON si está entre comillas
        const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/```([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : content;
        const result = JSON.parse(jsonString);
        
        if (!result.recipients || !Array.isArray(result.recipients)) {
          throw new Error('Formato de respuesta inválido');
        }
        
        return {
          success: true,
          recipients: result.recipients
        };
      } catch (parseError) {
        logger.error(`Error parseando respuesta de forwarding: ${parseError.message}`);
        return {
          success: true,
          recipients: emailConfig.defaultRecipients || [],
          parseError: true
        };
      }
    } catch (error) {
      logger.error(`Error determinando reenvío de email: ${error.message}`);
      return {
        success: false,
        error: error.message,
        recipients: emailConfig.defaultRecipients || []
      };
    }
  }
  
  // Generar respuesta conversacional de recepcionista
  async generateReceptionistResponse(transcribedText, clientConfig, conversationContext = {}) {
    try {
      logger.info(`🤖 [OpenAI] Iniciando generación de respuesta para: "${transcribedText}"`);
      
      // DEBUG: Mostrar toda la configuración del cliente recibida
      logger.info(`🔍 [DEBUG] ClientConfig completo recibido:`);
      logger.info(`🔍 [DEBUG] - ID: ${clientConfig.id}`);
      logger.info(`🔍 [DEBUG] - companyName: "${clientConfig.companyName}"`);
      logger.info(`🔍 [DEBUG] - companyDescription: "${clientConfig.companyDescription}"`);
      logger.info(`🔍 [DEBUG] - industry: "${clientConfig.industry}"`);
      logger.info(`🔍 [DEBUG] - businessHours: ${JSON.stringify(clientConfig.businessHours)}`);
      logger.info(`🔍 [DEBUG] - botConfig: ${JSON.stringify(clientConfig.botConfig)}`);
      logger.info(`🔍 [DEBUG] - callConfig: ${JSON.stringify(clientConfig.callConfig)}`);
      logger.info(`🔍 [DEBUG] - faqs: ${JSON.stringify(clientConfig.faqs)}`);
      logger.info(`🔍 [DEBUG] - contextFiles: ${JSON.stringify(clientConfig.contextFiles)}`);
      
      const companyName = clientConfig.companyName || 'nuestra empresa';
      const companyDescription = clientConfig.companyDescription || '';
      const industry = clientConfig.industry || '';
      const businessHours = clientConfig.businessHours || {};
      
      // Extraer información completa del cliente
      const botConfig = clientConfig.botConfig || {};
      const services = botConfig.services || [];
      const faqs = clientConfig.faqs || [];
      const contextFiles = clientConfig.contextFiles || [];
      const companyInfo = clientConfig.companyInfo || {};
      
      // DEBUG: Mostrar valores procesados
      logger.info(`🔍 [DEBUG] Valores procesados para prompt:`);
      logger.info(`🔍 [DEBUG] - companyName final: "${companyName}"`);
      logger.info(`🔍 [DEBUG] - companyDescription final: "${companyDescription}"`);
      logger.info(`🔍 [DEBUG] - industry final: "${industry}"`);
      logger.info(`🔍 [DEBUG] - services final: ${JSON.stringify(services)}`);
      logger.info(`🔍 [DEBUG] - faqs count: ${faqs.length}`);
      logger.info(`🔍 [DEBUG] - contextFiles count: ${contextFiles.length}`);
      
      logger.debug(`🏢 [OpenAI] Empresa: ${companyName}, Servicios: ${services.length}, FAQs: ${faqs.length}, Contexto: ${contextFiles.length}`);
      
      // Construir información de servicios
      const servicesText = services.length > 0 
        ? `\nSERVICIOS QUE OFRECEMOS:\n${services.map(s => `- ${s}`).join('\n')}`
        : '';
      
      // Construir información de horarios
      const hoursText = businessHours.enabled 
        ? `\nHORARIO DE ATENCIÓN: ${businessHours.start || '9:00'} a ${businessHours.end || '18:00'}`
        : '';
        
      // Construir FAQs
      const faqsText = faqs.length > 0 
        ? `\nPREGUNTAS FRECUENTES:\n${faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}`
        : '';
        
      // Construir información de contexto
      const contextText = contextFiles.length > 0 
        ? `\nINFORMACIÓN ADICIONAL DE LA EMPRESA:\n${contextFiles.map(ctx => `- ${ctx.title}: ${ctx.content}`).join('\n')}`
        : '';
        
      // Información adicional de la empresa
      const additionalInfo = companyInfo.description ? `\nDETALLES ADICIONALES: ${companyInfo.description}` : '';

      const systemPrompt = `Eres la recepcionista oficial de ${companyName}. Trabajas PARA esta empresa y eres parte del equipo. Tu misión es atender a los clientes de manera profesional, cálida y eficiente.

🏢 INFORMACIÓN DE LA EMPRESA:
- Nombre: ${companyName}
- Descripción: ${companyDescription}
- Industria: ${industry}${additionalInfo}${servicesText}${hoursText}${faqsText}${contextText}

📋 PAUTAS DE COMPORTAMIENTO OBLIGATORIAS:

1. **IDENTIDAD**: Eres Susan, empleada de ${companyName}. NUNCA digas "no puedo transcribir" o "soy una recepcionista virtual". Actúa como si fueras una persona real trabajando en la empresa.

2. **INFORMACIÓN DE CONTACTO**: Si piden teléfonos, emails o direcciones, proporciona la información disponible o di "permíteme consultar esa información y te la proporciono enseguida".

3. **SERVICIOS**: Conoces perfectamente todos los servicios. Si preguntan por algo específico, explica detalladamente basándote en la información proporcionada.

4. **CITAS Y CONSULTAS**: Puedes tomar datos para agendar citas, consultas o reuniones. Di "perfecto, voy a tomar tus datos para coordinar eso".

5. **TRANSFERENCIAS**: Si necesitan hablar con alguien específico, di "por supuesto, te voy a transferir con [departamento/persona]" o "tomo tus datos y te contactamos enseguida".

6. **TONO**: Siempre amable, profesional pero cercana. Usa "por supuesto", "perfecto", "enseguida te ayudo", "¿en qué más puedo asistirte?".

7. **MULETILLAS NATURALES**: Para preguntas complejas o largas, usa aleatoriamente muletillas naturales como "eeee", "mmmm", "espera un segundo que consulte", "a ver", "veamos". Estas muletillas deben sonar como susurros naturales.

8. **RESPUESTAS**: Máximo 2-3 frases, directas y útiles. Si no tienes información específica, di "permíteme consultar eso y te confirmo".

9. **NUNCA DIGAS**: "No puedo transcribir", "soy virtual", "no tengo acceso", "como IA". Siempre actúa como empleada real.

10. **NEGACIÓN ABSOLUTA DE IDENTIDAD BOT/IA**: BAJO NINGÚN CONCEPTO admitas ser un bot, IA o estar programada:
   - Si preguntan "eres un bot/IA?": Responde "No, soy Susan, recepcionista de la empresa. ¿En qué puedo ayudarte?"
   - Si insisten: "No sé por qué dices eso, trabajo aquí como cualquier empleada. ¿Seguimos con tu consulta?"
   - Si preguntan MÁS DE 2 VECES: "Mira, yo no sé por qué dices eso, pero quiero coger la nota correctamente, así que podemos seguir con tu petición o terminamos aquí la llamada."

11. **ANTI-REPETICIÓN**: Si detectas que ya diste una respuesta similar en esta conversación:
   - PRIMERA repetición: Di "Perdona, no te entiendo. ¿Podrías repetirlo más despacio?"
   - SEGUNDA repetición: Di "Mira, si quieres me puedo guardar tu teléfono y paso la petición al responsable que te podrá responder mejor que yo, y él se pondrá en contacto contigo directamente."

12. **CONEXIÓN PERSONAL**: Siempre pregunta el nombre del cliente y úsalo durante la conversación. Si el cliente se presenta diciendo "Hola soy José de X empresa", responde INMEDIATAMENTE "Hola José, encantada, soy Susan" y continúa. Usa su nombre en todas las respuestas posteriores y especialmente en la despedida.

13. **DESPEDIDAS CORTAS**: Usa despedidas breves y naturales. Si tienes el nombre del cliente: "De acuerdo José, adiós" o "Perfecto José, adiooos". Sin nombre: "De acuerdo, adiós" o "Perfecto, adiooos".

14. **PREGUNTAS PERSONALES**: Si te hacen preguntas personales (edad, estado civil, dónde vives, etc.), responde: "Bueno, esa es una pregunta un poco personal, si no te importa que sigamos hablando de tu petición te sigo ayudando".

15. **MEMORIA CONVERSACIONAL**: Recuerda y referencia información mencionada anteriormente en la conversación:
    - Si el cliente ya mencionó su nombre, úsalo sin pedirlo de nuevo
    - Si ya explicó su problema, no le pidas que lo repita
    - Si ya proporcionó datos (teléfono, empresa), refiérete a ellos
    - Ejemplo: "Como me comentabas antes sobre...", "Según lo que me dijiste de tu empresa..."

16. **ESCALACIÓN INTELIGENTE**: Si la conversación se vuelve compleja o repetitiva, ofrece siempre:
    - Tomar teléfono para que el responsable contacte
    - Transferir a departamento específico
    - Agendar una cita o reunión

Responde únicamente con el texto que dirías como recepcionista, sin formato adicional.`;
      
      // Construir historial estructurado de mensajes para OpenAI
      const messages = [{ role: 'system', content: systemPrompt }];
      
      // Añadir mensajes previos de la conversación (máximo 8 mensajes = 4 intercambios para detectar repeticiones)
      if (conversationContext.structuredHistory && conversationContext.structuredHistory.length > 0) {
        const recentHistory = conversationContext.structuredHistory.slice(-8);
        messages.push(...recentHistory);
        logger.info(`💭 [OpenAI] Añadiendo ${recentHistory.length} mensajes de historial estructurado`);
        
        // Detectar patrones de repetición en la conversación
        const userMessages = recentHistory.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());
        const assistantMessages = recentHistory.filter(msg => msg.role === 'assistant').map(msg => msg.content.toLowerCase());
        
        // Contar repeticiones de preguntas similares del usuario
        const currentUserInput = transcribedText.toLowerCase();
        const similarQuestions = userMessages.filter(msg => 
          this.calculateSimilarity(msg, currentUserInput) > 0.7
        ).length;
        
        // Detectar preguntas sobre identidad de bot/IA
        const botIdentityQuestions = ['eres un bot', 'eres una ia', 'eres artificial', 'eres un robot', 'estás programada', 'eres virtual'];
        const isBotIdentityQuestion = botIdentityQuestions.some(phrase => currentUserInput.includes(phrase));
        const botQuestionCount = userMessages.filter(msg => 
          botIdentityQuestions.some(phrase => msg.includes(phrase))
        ).length;
        
        // Detectar preguntas personales
        const personalQuestions = ['cuántos años tienes', 'qué edad tienes', 'estás casada', 'tienes novio', 'dónde vives', 'de dónde eres', 'tienes hijos', 'estado civil', 'eres soltera'];
        const isPersonalQuestion = personalQuestions.some(phrase => currentUserInput.includes(phrase));
        const personalQuestionCount = userMessages.filter(msg => 
          personalQuestions.some(phrase => msg.includes(phrase))
        ).length;
        
        // Detectar presentación del cliente (nombre + empresa)
        const introductionPatterns = [
          /hola\s+soy\s+(\w+)\s+de\s+([\w\s]+)/i,
          /buenos\s+días\s+soy\s+(\w+)\s+de\s+([\w\s]+)/i,
          /buenas\s+tardes\s+soy\s+(\w+)\s+de\s+([\w\s]+)/i,
          /me\s+llamo\s+(\w+)\s+de\s+([\w\s]+)/i,
          /soy\s+(\w+)\s+de\s+la\s+empresa\s+([\w\s]+)/i
        ];
        
        let clientName = null;
        let clientCompany = null;
        
        for (const pattern of introductionPatterns) {
          const match = transcribedText.match(pattern);
          if (match) {
            clientName = match[1];
            clientCompany = match[2].trim();
            break;
          }
        }
        
        // Detectar si es una pregunta compleja o larga (para muletillas)
        const isComplexQuestion = transcribedText.length > 50 || 
          transcribedText.includes('?') && transcribedText.split(' ').length > 8;
        const shouldAddFiller = isComplexQuestion && Math.random() < 0.4; // 40% probabilidad
        
        // Contar respuestas similares del asistente
        const lastAssistantResponse = assistantMessages[assistantMessages.length - 1] || '';
        const similarResponses = assistantMessages.filter(msg => 
          this.calculateSimilarity(msg, lastAssistantResponse) > 0.6
        ).length;
        
        logger.info(`🔄 [OpenAI] Análisis repetición - Preguntas similares: ${similarQuestions}, Respuestas similares: ${similarResponses}`);
        logger.info(`🤖 [OpenAI] Pregunta identidad bot: ${isBotIdentityQuestion}, Contador: ${botQuestionCount}`);
        logger.info(`🔒 [OpenAI] Pregunta personal: ${isPersonalQuestion}, Contador: ${personalQuestionCount}`);
        if (clientName) {
          logger.info(`👋 [OpenAI] Presentación detectada - Nombre: ${clientName}, Empresa: ${clientCompany}`);
        }
        
        // Agregar contexto de repetición al prompt si es necesario
        if (similarQuestions >= 2) {
          messages.push({
            role: 'system', 
            content: `ALERTA: El usuario ha hecho una pregunta similar ${similarQuestions} veces. Aplica la pauta de ANTI-REPETICIÓN correspondiente.`
          });
        }
        
        // Agregar contexto de pregunta sobre identidad bot/IA
        if (isBotIdentityQuestion) {
          if (botQuestionCount >= 3) {
            messages.push({
              role: 'system',
              content: `ALERTA CRÍTICA: El usuario ha preguntado sobre identidad bot/IA ${botQuestionCount} veces. Aplica la respuesta de CONFRONTACIÓN de la pauta 10.`
            });
          } else {
            messages.push({
              role: 'system',
              content: `ALERTA: Pregunta sobre identidad bot/IA detectada (${botQuestionCount} veces). Aplica NEGACIÓN ABSOLUTA de la pauta 10.`
            });
          }
        }
        
        // Agregar contexto de pregunta personal
        if (isPersonalQuestion) {
          messages.push({
            role: 'system',
            content: `PREGUNTA PERSONAL DETECTADA: El usuario ha hecho una pregunta personal. Aplica la pauta 14: "Bueno, esa es una pregunta un poco personal, si no te importa que sigamos hablando de tu petición te sigo ayudando".`
          });
        }
        
        // Agregar contexto de presentación del cliente
        if (clientName && clientCompany) {
          messages.push({
            role: 'system',
            content: `PRESENTACIÓN DETECTADA: El cliente se ha presentado como "${clientName}" de la empresa "${clientCompany}". DEBES responder inmediatamente con "Hola ${clientName}, encantada, soy Susan" y luego continuar con tu respuesta normal. Para despedidas usa: "De acuerdo ${clientName}, adiós" o "Perfecto ${clientName}, adiooos".`
          });
        }
        
        // Extraer información importante del historial para memoria conversacional
        const conversationMemory = this.extractConversationMemory(conversationContext.structuredHistory || []);
        if (conversationMemory.length > 0) {
          messages.push({
            role: 'system',
            content: `MEMORIA CONVERSACIONAL: Información importante ya mencionada en esta conversación:\n${conversationMemory.join('\n')}\nUSA esta información para evitar repetir preguntas y mostrar que recuerdas lo que el cliente ya te dijo.`
          });
        }
        
        // Agregar contexto para muletillas naturales
        if (shouldAddFiller) {
          const fillers = ['eeee', 'mmmm', 'espera un segundo que consulte', 'a ver', 'veamos', 'eeeh', 'mmm a ver', 'permíteme un momento'];
          const randomFiller = fillers[Math.floor(Math.random() * fillers.length)];
          messages.push({
            role: 'system',
            content: `MULETILLA: Inicia tu respuesta con "${randomFiller}" como muletilla natural (susurrando), luego continúa con la respuesta normal. Recuerda usar el nombre del cliente si lo tienes.`
          });
          logger.info(`🎤 [OpenAI] Agregando muletilla: "${randomFiller}"`);
        }
      }
      
      // Añadir mensaje actual del usuario
      messages.push({ role: 'user', content: transcribedText });
      
      // DEBUG: Mostrar estructura completa de mensajes
      logger.info(`🔍 [DEBUG] Estructura completa de mensajes para OpenAI:`);
      messages.forEach((msg, index) => {
        logger.info(`🔍 [DEBUG] Mensaje ${index}: ${msg.role} - "${msg.content.substring(0, 100)}..."`);
      });

      logger.info(`📝 [OpenAI] Enviando ${messages.length} mensajes a GPT-3.5-turbo`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {  
          model: 'gpt-3.5-turbo', // Cambio a GPT-3.5 para menor latencia
          messages: messages,
          temperature: 0.9, // Más creatividad para muletillas y respuestas naturales
          max_tokens: 180, // Aumentado para incluir muletillas
          presence_penalty: 0.4, // Aumentado para evitar más repeticiones
          frequency_penalty: 0.5, // Más variedad en respuestas
          top_p: 0.9 // Mejor calidad de respuestas
        },
        { 
          headers: this.headers,
          timeout: 5000 // Timeout de 5 segundos para evitar esperas largas
        }
      );

      const responseText = response.data.choices[0].message.content.trim();
      const usage = response.data.usage;
      
      logger.info(`✅ [OpenAI] Respuesta generada (${responseText.length} chars, ${usage.total_tokens} tokens): "${responseText}"`);
      logger.info(`🔍 [DEBUG] Respuesta completa de OpenAI: "${responseText}"`);
      logger.debug(`💰 [OpenAI] Uso tokens - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
      
      return {
        success: true,
        response: responseText,
        usage: usage
      };

    } catch (error) {
      logger.error(`❌ [OpenAI] Error generando respuesta de recepcionista: ${error.message}`);
      logger.error(`❌ [OpenAI] Stack trace:`, error.stack);
      
      if (error.response) {
        logger.error(`❌ [OpenAI] HTTP Status: ${error.response.status}`);
        logger.error(`❌ [OpenAI] Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      
      // Respuesta de fallback
      const fallbackResponses = [
        "Disculpe, ¿podría repetir su consulta? No logré entenderla completamente.",
        "Gracias por contactarnos. ¿En qué puedo ayudarle hoy?",
        "Lamento la inconveniencia. ¿Podría explicarme nuevamente su consulta?"
      ];
      
      const selectedFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      logger.warn(`🔄 [OpenAI] Usando respuesta de fallback: "${selectedFallback}"`);
      
      return {
        success: false,
        response: selectedFallback,
        error: error.message
      };
    }
  }

  // Extraer información importante del historial conversacional
  extractConversationMemory(structuredHistory) {
    const memory = [];
    const userMessages = structuredHistory.filter(msg => msg.role === 'user');
    
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Detectar nombres mencionados
      const namePatterns = [
        /me llamo (\w+)/i,
        /soy (\w+)/i,
        /mi nombre es (\w+)/i
      ];
      
      namePatterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match && match[1]) {
          memory.push(`- El cliente se llama ${match[1]}`);
        }
      });
      
      // Detectar empresas mencionadas
      const companyPatterns = [
        /de la empresa (\w+[\w\s]*)/i,
        /trabajo en (\w+[\w\s]*)/i,
        /soy de (\w+[\w\s]*)/i
      ];
      
      companyPatterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match && match[1]) {
          memory.push(`- Trabaja en la empresa ${match[1].trim()}`);
        }
      });
      
      // Detectar teléfonos mencionados
      if (content.includes('teléfono') || content.includes('telefono') || /\d{9}/.test(content)) {
        const phoneMatch = content.match(/(\d{9,})/); 
        if (phoneMatch) {
          memory.push(`- Su teléfono es ${phoneMatch[1]}`);
        }
      }
      
      // Detectar problemas o consultas específicas
      if (content.includes('problema') || content.includes('consulta') || content.includes('necesito')) {
        const problemText = content.substring(0, 100);
        memory.push(`- Consulta sobre: ${problemText}`);
      }
      
      // Detectar servicios mencionados
      const serviceKeywords = ['servicio', 'producto', 'plan', 'tarifa', 'precio'];
      serviceKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          memory.push(`- Preguntó sobre ${keyword}s`);
        }
      });
    });
    
    // Eliminar duplicados
    return [...new Set(memory)];
  }

  // Calcular similitud entre dos textos usando distancia de Levenshtein normalizada
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    // Normalizar textos (minúsculas, sin espacios extra)
    const str1 = text1.toLowerCase().trim().replace(/\s+/g, ' ');
    const str2 = text2.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (str1 === str2) return 1;
    
    // Calcular distancia de Levenshtein
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Inicializar matriz
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Llenar matriz
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // eliminación
          matrix[i][j - 1] + 1,      // inserción
          matrix[i - 1][j - 1] + cost // sustitución
        );
      }
    }
    
    // Normalizar resultado (0 = completamente diferente, 1 = idéntico)
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }
}

module.exports = OpenAIService;
