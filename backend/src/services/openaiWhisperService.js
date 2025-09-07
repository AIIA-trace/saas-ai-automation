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
    const startTime = Date.now();
    logger.info(`🎤 [WHISPER-DEBUG] Iniciando transcripción con Whisper`);
    logger.info(`🎤 [WHISPER-DEBUG] Audio URL: ${audioUrl}`);
    logger.info(`🎤 [WHISPER-DEBUG] Idioma solicitado: ${language}`);
    
    try {
      // 1. Validar URL de audio
      if (!this.isValidAudioUrl(audioUrl)) {
        logger.error(`❌ [WHISPER-DEBUG] URL de audio inválida: ${audioUrl}`);
        return null;
      }
      
      // 2. Verificar API Key de OpenAI
      if (!process.env.OPENAI_API_KEY) {
        logger.error(`❌ [WHISPER-DEBUG] OPENAI_API_KEY no configurada`);
        return null;
      }
      logger.info(`✅ [WHISPER-DEBUG] API Key OpenAI configurada: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
      
      // 3. Descargar el audio de Twilio
      logger.info(`🔄 [WHISPER-DEBUG] Descargando audio de Twilio...`);
      const downloadStart = Date.now();
      
      const audioResponse = await axios.get(audioUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 segundos timeout
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });
      
      const downloadTime = Date.now() - downloadStart;
      logger.info(`✅ [WHISPER-DEBUG] Audio descargado en ${downloadTime}ms`);
      logger.info(`✅ [WHISPER-DEBUG] Content-Type: ${audioResponse.headers['content-type']}`);
      logger.info(`✅ [WHISPER-DEBUG] Content-Length: ${audioResponse.headers['content-length']} bytes`);

      // 4. Enviar a OpenAI Whisper
      logger.info(`🔄 [WHISPER-DEBUG] Enviando audio a OpenAI Whisper (idioma: ${language})`);
      const whisperStart = Date.now();
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioResponse.data,
        model: 'whisper-1',
        language: language,
        response_format: 'text'
      });
      
      const whisperTime = Date.now() - whisperStart;
      const totalTime = Date.now() - startTime;
      
      const transcribedText = transcription.trim();
      logger.info(`✅ [WHISPER-DEBUG] Transcripción completada en ${whisperTime}ms`);
      logger.info(`✅ [WHISPER-DEBUG] Tiempo total: ${totalTime}ms`);
      logger.info(`✅ [WHISPER-DEBUG] Texto transcrito: "${transcribedText}"`);
      logger.info(`✅ [WHISPER-DEBUG] Longitud del texto: ${transcribedText.length} caracteres`);
      
      return transcribedText;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`❌ [WHISPER-DEBUG] Error en transcripción después de ${totalTime}ms`);
      logger.error(`❌ [WHISPER-DEBUG] Error tipo: ${error.constructor.name}`);
      logger.error(`❌ [WHISPER-DEBUG] Error mensaje: ${error.message}`);
      logger.error(`❌ [WHISPER-DEBUG] Error stack: ${error.stack}`);
      
      if (error.response) {
        logger.error(`❌ [WHISPER-DEBUG] HTTP Status: ${error.response.status}`);
        logger.error(`❌ [WHISPER-DEBUG] HTTP Data: ${JSON.stringify(error.response.data)}`);
      }
      
      if (error.code) {
        logger.error(`❌ [WHISPER-DEBUG] Error code: ${error.code}`);
      }
      
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
