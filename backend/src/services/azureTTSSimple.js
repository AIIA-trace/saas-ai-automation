const https = require('https');
const logger = require('../utils/logger');

class AzureTTSSimple {
  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
    this.region = process.env.AZURE_SPEECH_REGION || 'westeurope';
    
    logger.info(`🔍 Azure TTS Simple - Key: ${this.subscriptionKey ? 'SÍ' : 'NO'} (${this.subscriptionKey?.substring(0, 5)}...)`);
    logger.info(`🔍 Azure TTS Simple - Región: ${this.region}`);
    
    // Configuración simplificada
    this.defaultVoice = 'es-ES-DarioNeural'; // Voz por defecto, se puede sobrescribir
    this.outputFormat = 'riff-8khz-8bit-mono-mulaw'; // Compatible con Twilio
  }

  // Generar audio usando REST API de Azure
  async generateSpeech(text, voiceId = null) {
    return new Promise((resolve, reject) => {
      if (!this.subscriptionKey) {
        logger.error('❌ Azure Speech Key no configurada');
        return resolve({ success: false, error: 'Azure Speech Key no configurada' });
      }

      const voice = voiceId || this.defaultVoice;
      logger.info(`🔍 Azure TTS Simple - Generando con voz: ${voice}`);
      logger.info(`🔍 Azure TTS Simple - Texto: "${text.substring(0, 50)}..."`);

      // SSML simplificado
      const ssml = `
        <speak version='1.0' xml:lang='es-ES'>
          <voice xml:lang='es-ES' name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;

      const postData = ssml;
      
      const options = {
        hostname: `${this.region}.tts.speech.microsoft.com`,
        port: 443,
        path: '/cognitiveservices/v1',
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': this.outputFormat,
          'User-Agent': 'SaaS-AI-Automation'
        }
      };

      logger.info(`🔍 Azure TTS Simple - Enviando request a: ${options.hostname}${options.path}`);

      // Timeout de 8 segundos para la request HTTP
      const timeout = setTimeout(() => {
        logger.error('❌ Azure TTS Simple - Timeout de 8 segundos');
        req.destroy();
        resolve({ success: false, error: 'Timeout de Azure TTS después de 8 segundos' });
      }, 8000);

      const req = https.request(options, (res) => {
        clearTimeout(timeout);
        
        logger.info(`🔍 Azure TTS Simple - Status: ${res.statusCode}`);
        
        if (res.statusCode !== 200) {
          logger.error(`❌ Azure TTS Simple - Error HTTP: ${res.statusCode}`);
          let errorData = '';
          res.on('data', chunk => errorData += chunk);
          res.on('end', () => {
            logger.error(`❌ Azure TTS Simple - Error details: ${errorData}`);
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${errorData}` });
          });
          return;
        }

        // Recopilar datos de audio
        const audioChunks = [];
        res.on('data', (chunk) => {
          audioChunks.push(chunk);
        });

        res.on('end', () => {
          const audioBuffer = Buffer.concat(audioChunks);
          logger.info(`🎵 Azure TTS Simple - Audio generado: ${audioBuffer.length} bytes`);
          
          resolve({
            success: true,
            audioBuffer: audioBuffer
          });
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        logger.error(`❌ Azure TTS Simple - Request error: ${error.message}`);
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        logger.error('❌ Azure TTS Simple - Request timeout');
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      // Enviar datos
      req.write(postData);
      req.end();
    });
  }

  // Método de compatibilidad con la interfaz existente
  async generateBotResponse(responseText, voiceId = null) {
    try {
      logger.info(`🔍 Azure TTS Simple - generateBotResponse: "${responseText.substring(0, 50)}..."`);
      
      const result = await this.generateSpeech(responseText, voiceId);
      
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        audioBuffer: result.audioBuffer,
        durationEstimate: this.estimateAudioDuration(responseText)
      };
    } catch (error) {
      logger.error(`❌ Azure TTS Simple - Error en generateBotResponse: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Estimar duración del audio
  estimateAudioDuration(text) {
    const words = text.split(' ').length;
    const minutes = words / 150; // 150 palabras por minuto
    return Math.ceil(minutes * 60);
  }

  // Validar configuración
  isConfigured() {
    return !!this.subscriptionKey;
  }
}

module.exports = new AzureTTSSimple();
