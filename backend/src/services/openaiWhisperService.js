const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

class OpenAIWhisperService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio from URL using OpenAI Whisper
   * @param {string} audioUrl - URL del audio de Twilio
   * @param {string} language - Idioma del audio (es, en, etc.)
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeAudio(audioUrl, language = 'es') {
    try {
      logger.info(`🎤 Iniciando transcripción con Whisper: ${audioUrl}`);
      
      // 1. Descargar el audio de Twilio
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'stream',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      // 2. Crear FormData para OpenAI
      const formData = new FormData();
      formData.append('file', audioResponse.data, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', language);
      formData.append('response_format', 'text');

      // 3. Enviar a OpenAI Whisper
      logger.info(`🔄 Enviando audio a OpenAI Whisper (idioma: ${language})`);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioResponse.data,
        model: 'whisper-1',
        language: language,
        response_format: 'text'
      });

      const transcribedText = transcription.trim();
      logger.info(`✅ Transcripción completada: "${transcribedText}"`);
      
      return transcribedText;
      
    } catch (error) {
      logger.error(`❌ Error en transcripción Whisper: ${error.message}`);
      
      // Fallback: devolver null para manejar el error gracefully
      return null;
    }
  }

  /**
   * Transcribe audio with retry logic
   * @param {string} audioUrl - URL del audio
   * @param {string} language - Idioma
   * @param {number} maxRetries - Número máximo de reintentos
   * @returns {Promise<string|null>}
   */
  async transcribeWithRetry(audioUrl, language = 'es', maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔄 Intento ${attempt}/${maxRetries} de transcripción`);
        
        const result = await this.transcribeAudio(audioUrl, language);
        
        if (result && result.length > 0) {
          return result;
        }
        
        logger.warn(`⚠️ Intento ${attempt} falló: transcripción vacía`);
        
      } catch (error) {
        logger.error(`❌ Intento ${attempt} falló: ${error.message}`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return null;
  }

  /**
   * Validate audio URL format
   * @param {string} audioUrl 
   * @returns {boolean}
   */
  isValidAudioUrl(audioUrl) {
    if (!audioUrl || typeof audioUrl !== 'string') {
      return false;
    }
    
    // Verificar que sea una URL de Twilio válida
    return audioUrl.includes('api.twilio.com') && 
           (audioUrl.includes('.wav') || audioUrl.includes('.mp3'));
  }
}

module.exports = new OpenAIWhisperService();
