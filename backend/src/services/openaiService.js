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
      
      const companyName = clientConfig.companyName || 'nuestra empresa';
      const companyDescription = clientConfig.companyDescription || '';
      const industry = clientConfig.industry || '';
      const businessHours = clientConfig.businessHours || {};
      
      // Extraer servicios del botConfig si existe
      const botConfig = clientConfig.botConfig || {};
      const services = botConfig.services || [];
      
      // DEBUG: Mostrar valores procesados
      logger.info(`🔍 [DEBUG] Valores procesados para prompt:`);
      logger.info(`🔍 [DEBUG] - companyName final: "${companyName}"`);
      logger.info(`🔍 [DEBUG] - companyDescription final: "${companyDescription}"`);
      logger.info(`🔍 [DEBUG] - industry final: "${industry}"`);
      logger.info(`🔍 [DEBUG] - services final: ${JSON.stringify(services)}`);
      
      logger.debug(`🏢 [OpenAI] Empresa: ${companyName}, Servicios: ${services.length}, Horarios: ${businessHours.enabled ? 'Sí' : 'No'}`);
      
      // Construir información de servicios
      const servicesText = services.length > 0 
        ? `Nuestros servicios incluyen: ${services.join(', ')}.`
        : '';
      
      // Construir información de horarios
      const hoursText = businessHours.enabled 
        ? `Nuestro horario de atención es de ${businessHours.start || '9:00'} a ${businessHours.end || '18:00'}.`
        : '';

      const systemPrompt = `Eres una recepcionista virtual profesional, amable y eficiente para ${companyName}.

INFORMACIÓN DE LA EMPRESA:
- Nombre: ${companyName}
- Descripción: ${companyDescription}
- Industria: ${industry}
${servicesText}
${hoursText}

INSTRUCCIONES:
1. Responde de manera natural, cálida y profesional
2. Mantén respuestas concisas (máximo 2-3 frases)
3. Si preguntan por servicios específicos, proporciona información relevante
4. Si necesitan hablar con alguien, ofrece tomar un mensaje o transferir la llamada
5. Si preguntan por horarios, proporciona la información disponible
6. Usa un tono conversacional y humano, evita sonar robótica
7. Si no entiendes algo, pide aclaración de manera amable

Responde únicamente con el texto que dirías como recepcionista, sin formato adicional.`;
      
      // Construir historial estructurado de mensajes para OpenAI
      const messages = [{ role: 'system', content: systemPrompt }];
      
      // Añadir mensajes previos de la conversación (máximo 6 mensajes = 3 intercambios)
      if (conversationContext.structuredHistory && conversationContext.structuredHistory.length > 0) {
        const recentHistory = conversationContext.structuredHistory.slice(-6);
        messages.push(...recentHistory);
        logger.info(`💭 [OpenAI] Añadiendo ${recentHistory.length} mensajes de historial estructurado`);
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
          temperature: 0.7,
          max_tokens: 100, // Reducido para respuestas más concisas
          presence_penalty: 0.1,
          frequency_penalty: 0.1
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
}

module.exports = OpenAIService;
