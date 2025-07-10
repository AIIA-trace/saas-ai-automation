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
}

module.exports = new OpenAIService();
