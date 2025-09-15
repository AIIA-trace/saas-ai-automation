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
      console.log(`🔊 Llamada a Azure TTS para: ${text.substring(0, 50)}...`);
      const token = await this.getToken();
      
      const ssml = `
        <speak version='1.0' xml:lang='es-ES'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;

      console.log(`🔊 Llamada a Azure TTS para: ${text.substring(0, 50)}...`);
      console.log(`🔍 SSML Payload:`, ssml);
      console.log(`🔍 SSML Length:`, ssml.length);
      console.log(`🔍 Token exists:`, !!token);
      console.log(`🔍 Token length:`, token ? token.length : 0);
      console.log(`🔍 Request URL:`, `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`);
      
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': format,
          'User-Agent': 'TTS-Service'
        },
        responseType: 'arraybuffer'
      };
      
      console.log(`🔍 Request Headers:`, JSON.stringify(requestConfig.headers, null, 2));
      
      const response = await axios.post(
        `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        requestConfig
      );

      console.log(`✅ Audio generado: ${response.data.length} bytes`);
      return {
        success: true,
        audioBuffer: response.data,
        contentType: response.headers['content-type']
      };

    } catch (error) {
      console.error('❌ TTS Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
      console.error('  Response Data:', error.response?.data);
      console.error('  Response Headers:', error.response?.headers);
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Method:', error.config?.method);
      console.error('  Request Headers:', error.config?.headers);
      console.error('  Request Data Length:', error.config?.data?.length);
      console.error('  Error Message:', error.message);
      console.error('  Error Code:', error.code);
      
      // Si hay response data, intentar parsearlo
      if (error.response?.data) {
        try {
          const errorText = Buffer.isBuffer(error.response.data) 
            ? error.response.data.toString('utf8')
            : error.response.data;
          console.error('  Parsed Error Response:', errorText);
        } catch (parseError) {
          console.error('  Could not parse error response:', parseError.message);
        }
      }
      
      logger.error('❌ Error generando audio con Azure REST API:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        azureError: error.response?.data
      };
    }
  }
}

// Crear instancia del servicio
const azureTTSRestServiceInstance = new AzureTTSRestService();

// Añadir método initialize
azureTTSRestServiceInstance.initialize = function() {
  console.log('✅ Azure TTS REST Service initialized');
  // Configuración inicial si es necesaria
};

// Exportar la instancia
module.exports = azureTTSRestServiceInstance;
