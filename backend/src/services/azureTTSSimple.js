const https = require('https');
const logger = require('../utils/logger');

class AzureTTSSimple {
  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
    this.region = process.env.AZURE_SPEECH_REGION || 'westeurope';
    
    // DEBUG EXHAUSTIVO - Variables de entorno
    logger.info(`🔍 [DEBUG-ENV] AZURE_SPEECH_KEY existe: ${!!this.subscriptionKey}`);
    logger.info(`🔍 [DEBUG-ENV] AZURE_SPEECH_KEY length: ${this.subscriptionKey?.length || 0}`);
    logger.info(`🔍 [DEBUG-ENV] AZURE_SPEECH_KEY primeros 8 chars: ${this.subscriptionKey?.substring(0, 8) || 'UNDEFINED'}`);
    logger.info(`🔍 [DEBUG-ENV] AZURE_SPEECH_REGION: "${this.region}"`);
    logger.info(`🔍 [DEBUG-ENV] process.env keys relacionados: ${Object.keys(process.env).filter(k => k.includes('AZURE')).join(', ')}`);
    
    // Configuración simplificada - USAR SOLO VOCES VÁLIDAS
    this.defaultVoice = 'es-ES-LolaNeural';  // Cambiado de DarioNeural a LolaNeural (funciona)
    this.outputFormat = 'riff-8khz-16bit-mono-pcm';
    
    // DEBUG - Configuración final
    logger.info(`🔍 [DEBUG-CONFIG] defaultVoice: "${this.defaultVoice}"`);
    logger.info(`🔍 [DEBUG-CONFIG] outputFormat: "${this.outputFormat}"`);
    
    // Validar configuración crítica
    if (!this.subscriptionKey) {
      logger.error(`❌ [DEBUG-ERROR] AZURE_SPEECH_KEY no está configurada en variables de entorno`);
    }
    if (!this.region) {
      logger.error(`❌ [DEBUG-ERROR] AZURE_SPEECH_REGION no está configurada`);
    }
  }

  // Mapear voces de usuario a nombres Azure CORRECTOS
  mapVoiceToAzure(voiceId) {
    const voiceMap = {
      'lola': 'en-US-LolaMultilingualNeural',
      'dario': 'es-ES-DarioNeural',  // CORRECTO según código oficial Azure
      // Permitir nombres Azure directos también
      'en-US-LolaMultilingualNeural': 'en-US-LolaMultilingualNeural',
      'es-ES-DarioNeural': 'es-ES-DarioNeural',
      'es-ES-LolaNeural': 'es-ES-LolaNeural'
    };
    
    return voiceMap[voiceId] || this.defaultVoice;
  }

  // Generar audio usando REST API de Azure
  async generateSpeech(text, voiceId = null) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    return new Promise((resolve, reject) => {
      logger.info(`🔍 [DEBUG-START] ${requestId} - Iniciando generateSpeech`);
      logger.info(`🔍 [DEBUG-INPUT] ${requestId} - text length: ${text?.length || 0}`);
      logger.info(`🔍 [DEBUG-INPUT] ${requestId} - text content: "${text?.substring(0, 100) || 'UNDEFINED'}..."`);
      logger.info(`🔍 [DEBUG-INPUT] ${requestId} - voiceId RAW: "${voiceId || 'null'}"`);
      
      if (!this.subscriptionKey) {
        logger.error(`❌ [DEBUG-ERROR] ${requestId} - Azure Speech Key no configurada`);
        return resolve({ success: false, error: 'Azure Speech Key no configurada' });
      }

      // MAPEAR la voz del usuario a nombre Azure correcto
      const voice = this.mapVoiceToAzure(voiceId);
      logger.info(`🔍 [DEBUG-VOICE] ${requestId} - voiceId "${voiceId}" mapeada a: "${voice}"`);

      // SSML corregido con xmlns completo según Microsoft docs
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-ES'><voice xml:lang='es-ES' name='${voice}'><![CDATA[${text}]]></voice></speak>`;

      logger.info(`🔧 [FIX-APPLIED] ${requestId} - SSML xmlns corregido: http://www.w3.org/2001/10/synthesis`);
      logger.info(`🔧 [FIX-APPLIED] ${requestId} - CDATA agregado para texto seguro`);
      logger.info(`🔍 [DEBUG-SSML] ${requestId} - SSML generado length: ${ssml.length}`);
      logger.info(`🔍 [DEBUG-SSML] ${requestId} - SSML content: ${ssml.replace(/\n\s*/g, ' ').trim()}`);

      const postData = ssml;
      
      const hostname = `${this.region}.tts.speech.microsoft.com`;
      const options = {
        hostname,
        port: 443,
        path: '/cognitiveservices/v1',
        method: 'POST',
        timeout: 15000, // Timeout más generoso
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': this.outputFormat,
          'User-Agent': 'Azure-TTS-Diagnostic/1.0',
          'Connection': 'Keep-Alive',
          'Accept': 'audio/*',
          'Content-Length': Buffer.byteLength(postData, 'utf8')
        }
      };

      // DEBUG EXHAUSTIVO - Request details
      logger.info(`🔧 [FIX-APPLIED] ${requestId} - User-Agent optimizado: "${options.headers['User-Agent']}"`);
      logger.info(`🔧 [FIX-APPLIED] ${requestId} - Connection Keep-Alive activado`);
      logger.info(`🔧 [FIX-APPLIED] ${requestId} - Accept header agregado: "${options.headers['Accept']}"`);
      logger.info(`🔧 [FIX-APPLIED] ${requestId} - Timeout aumentado a: ${options.timeout}ms`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - hostname: "${hostname}"`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - full URL: https://${hostname}${options.path}`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - method: ${options.method}`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - Content-Length: ${options.headers['Content-Length']}`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - Subscription Key length: ${options.headers['Ocp-Apim-Subscription-Key']?.length}`);
      logger.info(`🔍 [DEBUG-REQUEST] ${requestId} - Output Format: ${options.headers['X-Microsoft-OutputFormat']}`);
      
      // Verificar DNS resolution antes de hacer la request
      const dns = require('dns');
      logger.info(`🔍 [DEBUG-DNS] ${requestId} - Resolviendo DNS para: ${hostname}`);
      
      dns.lookup(hostname, (err, address, family) => {
        if (err) {
          logger.error(`❌ [DEBUG-DNS-ERROR] ${requestId} - DNS resolution failed: ${err.message}`);
        } else {
          logger.info(`🔍 [DEBUG-DNS-OK] ${requestId} - DNS resolved to: ${address} (IPv${family})`);
        }
      });

      let isResolved = false;
      let req = null;
      
      // Timeout más generoso - Azure necesita tiempo para procesar
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          logger.error(`❌ [DEBUG-TIMEOUT] ${requestId} - Timeout general de 15 segundos`);
          if (req) {
            logger.info(`🔍 [DEBUG-TIMEOUT] ${requestId} - Destruyendo request por timeout`);
            req.destroy();
          }
          resolve({ success: false, error: 'Timeout de Azure TTS después de 15 segundos' });
        }
      }, 15000);

      logger.info(`🔍 [DEBUG-HTTPS] ${requestId} - Creando request HTTPS...`);
      
      req = https.request(options, (res) => {
        if (isResolved) {
          logger.warn(`⚠️ [DEBUG-LATE] ${requestId} - Response recibida después de resolve`);
          return;
        }
        
        clearTimeout(timeout);
        
        logger.info(`🔍 [DEBUG-RESPONSE] ${requestId} - Status Code: ${res.statusCode}`);
        logger.info(`🔍 [DEBUG-RESPONSE] ${requestId} - Status Message: ${res.statusMessage}`);
        logger.info(`🔍 [DEBUG-RESPONSE] ${requestId} - Headers: ${JSON.stringify(res.headers)}`);
        
        // Timeout para la respuesta también - más generoso
        const responseTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            logger.error(`❌ [DEBUG-RESPONSE-TIMEOUT] ${requestId} - Timeout en lectura de respuesta (10s)`);
            res.destroy();
            resolve({ success: false, error: 'Timeout en respuesta de Azure TTS' });
          }
        }, 10000);
        
        if (res.statusCode !== 200) {
          clearTimeout(responseTimeout);
          if (isResolved) return;
          isResolved = true;
          
          logger.error(`❌ [DEBUG-HTTP-ERROR] ${requestId} - Status Code: ${res.statusCode}`);
          logger.error(`❌ [DEBUG-HTTP-ERROR] ${requestId} - Status Message: ${res.statusMessage}`);
          
          let errorData = '';
          res.on('data', chunk => {
            errorData += chunk;
            logger.info(`🔍 [DEBUG-ERROR-DATA] ${requestId} - Error chunk: ${chunk.length} bytes`);
          });
          res.on('end', () => {
            logger.error(`❌ [DEBUG-ERROR-COMPLETE] ${requestId} - Error body: ${errorData}`);
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${errorData}` });
          });
          res.on('error', (err) => {
            logger.error(`❌ [DEBUG-ERROR-STREAM] ${requestId} - Error reading error: ${err.message}`);
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          });
          return;
        }

        logger.info(`✅ [DEBUG-HTTP-OK] ${requestId} - HTTP 200 OK recibido`);

        // Recopilar datos de audio
        const audioChunks = [];
        let totalSize = 0;
        let chunkCount = 0;
        
        res.on('data', (chunk) => {
          if (isResolved) {
            logger.warn(`⚠️ [DEBUG-LATE-DATA] ${requestId} - Data chunk recibido después de resolve`);
            return;
          }
          
          chunkCount++;
          audioChunks.push(chunk);
          totalSize += chunk.length;
          
          logger.info(`🔍 [DEBUG-AUDIO-CHUNK] ${requestId} - Chunk ${chunkCount}: ${chunk.length} bytes (total: ${totalSize})`);
          
          // Limitar tamaño máximo (5MB)
          if (totalSize > 5 * 1024 * 1024) {
            clearTimeout(responseTimeout);
            if (!isResolved) {
              isResolved = true;
              logger.error(`❌ [DEBUG-SIZE-LIMIT] ${requestId} - Respuesta demasiado grande: ${totalSize} bytes`);
              res.destroy();
              resolve({ success: false, error: 'Respuesta de Azure TTS demasiado grande' });
            }
          }
        });

        res.on('end', () => {
          clearTimeout(responseTimeout);
          if (isResolved) {
            logger.warn(`⚠️ [DEBUG-LATE-END] ${requestId} - End event después de resolve`);
            return;
          }
          isResolved = true;
          
          const audioBuffer = Buffer.concat(audioChunks);
          logger.info(`✅ [DEBUG-AUDIO-SUCCESS] ${requestId} - Audio generado exitosamente`);
          logger.info(`🔍 [DEBUG-AUDIO-STATS] ${requestId} - Total chunks: ${chunkCount}, Total bytes: ${audioBuffer.length}`);
          logger.info(`🔍 [DEBUG-AUDIO-FORMAT] ${requestId} - Primeros 20 bytes: ${audioBuffer.slice(0, 20).toString('hex')}`);
          
          resolve({
            success: true,
            audioBuffer: audioBuffer
          });
        });

        res.on('error', (error) => {
          clearTimeout(responseTimeout);
          if (isResolved) {
            logger.warn(`⚠️ [DEBUG-LATE-ERROR] ${requestId} - Error después de resolve: ${error.message}`);
            return;
          }
          isResolved = true;
          
          logger.error(`❌ [DEBUG-RESPONSE-ERROR] ${requestId} - Response stream error: ${error.message}`);
          logger.error(`❌ [DEBUG-RESPONSE-ERROR] ${requestId} - Error code: ${error.code}`);
          resolve({ success: false, error: error.message });
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        if (isResolved) {
          logger.warn(`⚠️ [DEBUG-LATE-REQ-ERROR] ${requestId} - Request error después de resolve: ${error.message}`);
          return;
        }
        isResolved = true;
        
        logger.error(`❌ [DEBUG-REQUEST-ERROR] ${requestId} - Request error: ${error.message}`);
        logger.error(`❌ [DEBUG-REQUEST-ERROR] ${requestId} - Error code: ${error.code}`);
        logger.error(`❌ [DEBUG-REQUEST-ERROR] ${requestId} - Error syscall: ${error.syscall}`);
        logger.error(`❌ [DEBUG-REQUEST-ERROR] ${requestId} - Error address: ${error.address}`);
        logger.error(`❌ [DEBUG-REQUEST-ERROR] ${requestId} - Error port: ${error.port}`);
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        clearTimeout(timeout);
        if (isResolved) {
          logger.warn(`⚠️ [DEBUG-LATE-TIMEOUT] ${requestId} - Timeout después de resolve`);
          return;
        }
        isResolved = true;
        
        logger.error(`❌ [DEBUG-REQUEST-TIMEOUT] ${requestId} - Request timeout event`);
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.on('close', () => {
        logger.info(`🔍 [DEBUG-CONNECTION] ${requestId} - Connection closed`);
        if (!isResolved) {
          isResolved = true;
          logger.error(`❌ [DEBUG-UNEXPECTED-CLOSE] ${requestId} - Connection closed unexpectedly`);
          resolve({ success: false, error: 'Connection closed unexpectedly' });
        }
      });

      req.on('connect', () => {
        logger.info(`🔍 [DEBUG-CONNECTION] ${requestId} - HTTPS connection established`);
      });

      req.on('socket', (socket) => {
        logger.info(`🔍 [DEBUG-SOCKET] ${requestId} - Socket assigned`);
        
        socket.on('connect', () => {
          logger.info(`🔍 [DEBUG-SOCKET] ${requestId} - Socket connected`);
        });
        
        socket.on('secureConnect', () => {
          logger.info(`🔍 [DEBUG-SOCKET] ${requestId} - SSL/TLS connection established`);
          logger.info(`🔍 [DEBUG-SOCKET] ${requestId} - Cipher: ${socket.getCipher()?.name || 'unknown'}`);
        });
        
        socket.on('error', (err) => {
          logger.error(`❌ [DEBUG-SOCKET-ERROR] ${requestId} - Socket error: ${err.message}`);
        });
      });

      // Enviar datos
      try {
        logger.info(`🔍 [DEBUG-SEND] ${requestId} - Escribiendo datos SSML (${postData.length} bytes)...`);
        req.write(postData);
        logger.info(`🔍 [DEBUG-SEND] ${requestId} - Finalizando request...`);
        req.end();
        logger.info(`🔍 [DEBUG-SEND] ${requestId} - Request enviado exitosamente`);
      } catch (error) {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          logger.error(`❌ [DEBUG-WRITE-ERROR] ${requestId} - Write error: ${error.message}`);
          resolve({ success: false, error: error.message });
        }
      }
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
