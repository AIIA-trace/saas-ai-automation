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
    const startTime = Date.now();
    console.log(`🔊 ===== AZURE TTS AUDIO GENERATION START =====`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    try {
      // ANÁLISIS COMPLETO DE ENTRADA
      console.log(`📝 INPUT ANALYSIS:`);
      console.log(`  ├── Text received: "${text ? text.substring(0, 100) : 'NULL/UNDEFINED'}..."`);
      console.log(`  ├── Text type: ${typeof text}`);
      console.log(`  ├── Text length: ${text ? text.length : 0}`);
      console.log(`  ├── Text is empty: ${!text || text.trim().length === 0}`);
      console.log(`  ├── Voice requested: "${voice}"`);
      console.log(`  ├── Voice type: ${typeof voice}`);
      console.log(`  ├── Format: "${format}"`);
      console.log(`  └── Region: "${this.region}"`);
      
      // Validar que el texto no esté vacío
      if (!text || text.trim().length === 0) {
        console.error('❌ EMPTY TEXT ERROR:');
        console.error('  ├── Text is null/undefined or empty');
        console.error('  ├── This will cause empty audio generation');
        console.error('  └── Check database query and client configuration');
        return { 
          success: false, 
          error: 'Texto vacío o undefined',
          cause: 'EMPTY_TEXT',
          textReceived: text,
          voiceReceived: voice
        };
      }

      console.log(`🔊 ===== AZURE TTS DEBUG START =====`);
      console.log(`🔊 Texto: "${text.substring(0, 100)}..."`);
      console.log(`🔊 Voz solicitada: "${voice}"`);
      console.log(`🔊 Formato: "${format}"`);
      
      // Validar voz antes de usar
      const validVoices = [
        'es-ES-DarioNeural', 'es-ES-ElviraNeural', 'es-ES-AlvaroNeural',
        'en-US-LolaMultilingualNeural', 'es-ES-ArabellaMultilingualNeural'
      ];
      
      if (!validVoices.includes(voice)) {
        console.log(`⚠️ VOZ NO VÁLIDA: "${voice}" no está en la lista de voces válidas`);
        console.log(`⚠️ Voces válidas: ${validVoices.join(', ')}`);
        console.log(`⚠️ Usando fallback: es-ES-DarioNeural`);
        voice = 'es-ES-DarioNeural';
      } else {
        console.log(`✅ VOZ VÁLIDA: "${voice}" está en la lista de voces válidas`);
      }
      
      const token = await this.getToken();
      
      const ssml = `
        <speak version='1.0' xml:lang='es-ES'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;

      console.log(`🔍 SSML Final:`, ssml);
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
      
      console.log(`🚀 SENDING REQUEST TO AZURE...`);
      const requestStartTime = Date.now();
      
      const response = await axios.post(
        `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        requestConfig
      );

      const requestEndTime = Date.now();
      const requestDuration = requestEndTime - requestStartTime;
      
      console.log(`✅ AZURE RESPONSE ANALYSIS:`);
      console.log(`  ├── Status Code: ${response.status}`);
      console.log(`  ├── Content-Type: ${response.headers['content-type']}`);
      console.log(`  ├── Audio Buffer Length: ${response.data ? response.data.length : 0} bytes`);
      console.log(`  ├── Audio Buffer Type: ${response.data ? typeof response.data : 'undefined'}`);
      console.log(`  ├── Audio Buffer Empty: ${!response.data || response.data.length === 0}`);
      console.log(`  ├── Request Duration: ${requestDuration}ms`);
      console.log(`  └── Total Process Time: ${Date.now() - startTime}ms`);
      
      // VALIDAR AUDIO BUFFER
      if (!response.data || response.data.length === 0) {
        console.error(`❌ EMPTY AUDIO BUFFER DETECTED:`);
        console.error(`  ├── Azure returned empty or null audio data`);
        console.error(`  ├── This will cause silent audio playback`);
        console.error(`  ├── Status was ${response.status} but no audio content`);
        console.error(`  └── Check Azure TTS service status`);
        return {
          success: false,
          error: 'Audio buffer vacío desde Azure',
          cause: 'EMPTY_AUDIO_BUFFER',
          statusCode: response.status,
          contentType: response.headers['content-type']
        };
      }
      
      console.log(`🔊 ===== AZURE TTS DEBUG SUCCESS =====`);
      
      return {
        success: true,
        audioBuffer: response.data,
        contentType: response.headers['content-type']
      };

    } catch (error) {
      console.error('🔊 ===== AZURE TTS ERROR 400 ANALYSIS =====');
      console.error('❌ VOZ USADA EN ERROR:', voice);
      console.error('❌ TEXTO ENVIADO:', text.substring(0, 100));
      console.error('❌ FORMATO SOLICITADO:', format);
      console.error('❌ REGIÓN AZURE:', this.region);
      
      // ANÁLISIS ESPECÍFICO DEL ERROR 400
      if (error.response?.status === 400) {
        console.error('🔍 ERROR 400 - BAD REQUEST ANALYSIS:');
        console.error('  ├── Status Code:', error.response.status);
        console.error('  ├── Status Text:', error.response.statusText);
        console.error('  ├── Azure Region Used:', this.region);
        console.error('  ├── Voice Name Sent:', voice);
        console.error('  ├── SSML Length:', ssml?.length || 'undefined');
        console.error('  ├── Text Length:', text?.length || 'undefined');
        console.error('  ├── Format Requested:', format);
        
        // Analizar respuesta de Azure
        if (error.response.data) {
          const errorData = Buffer.isBuffer(error.response.data) 
            ? error.response.data.toString('utf8') 
            : error.response.data;
          console.error('  ├── Azure Error Response:', errorData);
          
          // Buscar mensajes específicos de error
          if (typeof errorData === 'string') {
            if (errorData.includes('voice')) {
              console.error('  ├── 🎯 VOICE ERROR DETECTED in response');
            }
            if (errorData.includes('Unsupported')) {
              console.error('  ├── 🎯 UNSUPPORTED ERROR DETECTED in response');
            }
            if (errorData.includes('Invalid')) {
              console.error('  ├── 🎯 INVALID ERROR DETECTED in response');
            }
          }
        }
        
        // Verificar headers de la petición
        console.error('  ├── Request Headers Sent:');
        console.error('  │   ├── Authorization:', error.config?.headers?.Authorization ? 'Present' : 'Missing');
        console.error('  │   ├── Content-Type:', error.config?.headers['Content-Type']);
        console.error('  │   └── X-Microsoft-OutputFormat:', error.config?.headers['X-Microsoft-OutputFormat']);
        
        // Verificar SSML
        console.error('  ├── SSML Analysis:');
        console.error('  │   ├── SSML Valid XML:', ssml ? 'Present' : 'Missing');
        console.error('  │   ├── Voice Tag:', ssml?.includes(`<voice name='${voice}'>`) ? 'Correct' : 'Incorrect');
        console.error('  │   └── Language Tag:', ssml?.includes("xml:lang='es-ES'") ? 'Present' : 'Missing');
        
        console.error('  └── 🔍 POSSIBLE CAUSES:');
        console.error('      ├── Invalid voice name for region');
        console.error('      ├── Unsupported output format');
        console.error('      ├── Malformed SSML');
        console.error('      └── Authentication/authorization issue');
      }
      
      console.error('❌ Full Error Details:');
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
        const errorText = Buffer.isBuffer(error.response.data) ? error.response.data.toString('utf8') : error.response.data;
        console.error('  Parsed Error Response:', errorText);
      }
      
      console.error('🔊 ===== AZURE TTS DEBUG ERROR END =====');
      
      // Log final de diagnóstico
      console.error('🔧 DIAGNOSTIC SUMMARY:');
      console.error(`  Voice: "${voice}" | Text: "${text.substring(0, 50)}..." | Status: ${error.response?.status}`);
      console.error(`  Region: ${this.region} | Format: ${format}`);
      
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        azureError: error.response?.data,
        voiceUsed: voice,
        textSent: text.substring(0, 100),
        region: this.region,
        format: format
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
