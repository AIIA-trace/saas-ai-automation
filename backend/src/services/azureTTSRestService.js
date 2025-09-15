const axios = require('axios');
const logger = require('../utils/logger');

class AzureTTSRestService {
  constructor() {
    // DEBUG: Credenciales hardcodeadas
    this.subscriptionKey = '3iouAt5oVcf6Nu91XSU9Igrpfjy6iLhD4W9YgKxZArDjS8Fhdnb7JQQJ99BIAC5RqLJXJ3w3AAAYACOGorTt';
    this.region = 'westeurope';
    this.token = null;
    this.tokenExpiration = 0;
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiration) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        null,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Length': '0'
          }
        }
      );

      this.token = response.data;
      this.tokenExpiration = Date.now() + 9 * 60 * 1000; // 9 minutos de validez
      return this.token;

    } catch (error) {
      logger.error('❌ Error obteniendo token Azure:', error.message);
      throw error;
    }
  }

  async generateSpeech(text, voice = 'es-ES-DarioNeural', format = 'audio-16khz-128kbitrate-mono-mp3') {
    try {
      const token = await this.getToken();
      
      const ssml = `
        <speak version='1.0' xml:lang='es-ES'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;

      console.log("🔍 URL:", `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`);
      console.log("🔍 Longitud SSML:", ssml.length);
      const response = await axios.post(
        `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': format,
            'User-Agent': 'ai-call-email-bot'
          },
          responseType: 'arraybuffer'
        }
      );

      return {
        success: true,
        audioBuffer: response.data,
        contentType: response.headers['content-type']
      };

    } catch (error) {
      logger.error('❌ Error generando audio con Azure REST API:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const azureTTSRestService = new AzureTTSRestService();

module.exports = azureTTSRestService;

// Inicializar el servicio
module.exports.initialize = function() {
  console.log('✅ Azure TTS REST Service initialized');
  // Configuración inicial si es necesaria
};
