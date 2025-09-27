const axios = require('axios');
const logger = require('../utils/logger');
const fs = require('fs');

class AzureTTSRestService {
  constructor() {
    // DEBUG: Credenciales hardcodeadas
    this.subscriptionKey = '3iouAt5oVcf6Nu91XSU9Igrpfjy6iLhD4W9YgKxZArDjS8Fhdnb7JQQJ99BIAC5RqLJXJ3w3AAAYACOGorTt';
    this.region = 'westeurope';
    this.token = null;
    this.tokenExpiration = 0;
    this.isWarmedUp = false;
    this.warmupPromise = null;
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiration) {
      return this.token;
    }

    return await this.getAuthToken();
  }

  /**
   * Pre-autentica Azure TTS para evitar cuelgues durante llamadas reales
   */
  async warmup() {
    if (this.isWarmedUp && this.warmupPromise) {
      logger.info('🔥 AZURE WARMUP: Ya está en progreso, esperando...');
      return await this.warmupPromise;
    }

    if (this.isWarmedUp) {
      logger.info('✅ AZURE WARMUP: Ya completado previamente');
      return true;
    }

    logger.info('🔥 AZURE WARMUP: Iniciando pre-autenticación...');
    
    this.warmupPromise = this._performWarmup();
    const result = await this.warmupPromise;
    
    if (result) {
      this.isWarmedUp = true;
      logger.info('✅ AZURE WARMUP: Completado exitosamente');
    } else {
      logger.error('❌ AZURE WARMUP: Falló');
    }
    
    return result;
  }

  async _performWarmup() {
    try {
      // Pre-autenticar para obtener token
      logger.info('🔥 WARMUP: Obteniendo token de autenticación...');
      const token = await this.getAuthToken();
      
      if (!token) {
        logger.error('❌ WARMUP: No se pudo obtener token');
        return false;
      }

      // Generar audio de prueba muy corto para calentar el pipeline
      logger.info('🔥 WARMUP: Generando audio de prueba...');
      const text = "Warmup";
      const testResult = await this.generateSpeech(text, 'es-ES-DarioNeural');
      
      if (!testResult.success) {
        logger.error('❌ WARMUP: Audio de prueba falló');
        return false;
      }

      logger.info('✅ WARMUP: Pipeline completo verificado');
      return true;
      
    } catch (error) {
      logger.error(`❌ WARMUP: Error durante warmup: ${error.message}`);
      return false;
    }
  }

  async getAuthToken() {
    const authId = `AUTH_${Date.now()}`;
    logger.info(`🔐 [${authId}] Solicitando NUEVO token de Azure...`);
    
    try {
      const response = await axios.post(
        `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        null,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );
      
      this.token = response.data;
      this.tokenExpiration = Date.now() + 9 * 60 * 1000; // 9 minutos de validez
      
      logger.info(`🔐 [${authId}] ✅ Token obtenido y cacheado por 9 minutos`);
      return this.token;

    } catch (error) {
      logger.error(`❌ [${authId}] Error obteniendo token: ${error.message}`);
      
      if (error.response?.status === 401) {
        logger.error(`🔐 [${authId}] UNAUTHORIZED - Key inválida`);
      } else if (error.response?.status === 403) {
        logger.error(`🔐 [${authId}] FORBIDDEN - Sin permisos`);
      } else if (error.response?.status === 429) {
        logger.error(`🔐 [${authId}] RATE LIMIT - Demasiadas peticiones`);
      }
      
      throw error;
    }
  }

  async generateSpeech(text, voice, format) {
    // Ignorar cualquier formato recibido y forzar mulaw
    const finalFormat = 'raw-8khz-8bit-mono-mulaw';
    
    // MAPEAR FORMATO PARA TWILIO COMPATIBILITY
    let azureFormat = finalFormat;
    if (finalFormat === 'raw-8khz-8bit-mono-mulaw') {
      azureFormat = 'raw-8khz-8bit-mono-mulaw';
      logger.info(`🎵 Usando formato mulaw directo para Twilio: ${azureFormat}`);
    }
    const speechStartTime = Date.now();
    const startTime = speechStartTime;
    console.log(`🔊 ===== AZURE TTS AUDIO GENERATION START =====`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    // ANÁLISIS COMPLETO DE ENTRADA
    console.log(`📝 INPUT ANALYSIS:`);
    console.log(`  ├── Text received: "${text ? text.substring(0, 100) : 'NULL/UNDEFINED'}..."`);
      console.log(`  ├── Text type: ${typeof text}`);
      console.log(`  ├── Text length: ${text ? text.length : 0}`);
      console.log(`  ├── Text is empty: ${!text || text.trim().length === 0}`);
      console.log(`  ├── Voice requested: "${voice}"`);
      console.log(`  ├── Voice type: ${typeof voice}`);
      console.log(`  ├── Format: "${finalFormat}" (PCM para conversión a mulaw)`);
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
      console.log(`🔊 Formato: "${finalFormat}" (PCM 16kHz 16-bit mono)`);
      console.log(`🔊 Razón del formato: PCM es fácil de convertir a mulaw para Twilio`);
      
      // Validar voz antes de usar
      const validVoices = [
        'es-ES-DarioNeural', 'es-ES-XimenaMultilingualNeural', 'es-ES-AlvaroNeural',
        'en-US-LolaMultilingualNeural', 'es-ES-ArabellaMultilingualNeural', 'es-ES-IsidoraMultilingualNeural'
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
      
      // Detectar si el texto ya es SSML completo o solo contenido interno
      let ssml;
      if (text.includes('<mstts:express-as') || text.includes('<prosody')) {
        // Es contenido SSML interno, envolver con estructura completa incluyendo namespace mstts
        ssml = `
        <speak version='1.0' xmlns="http://www.w3.org/2001/10/synthesis" 
               xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang='es-ES'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;
      } else {
        // Es texto plano, usar estructura SSML básica
        ssml = `
        <speak version='1.0' xml:lang='es-ES'>
          <voice name='${voice}'>
            ${text}
          </voice>
        </speak>
      `;
      }

      console.log(`🔍 SSML Final:`, ssml);
      console.log(`🔍 SSML Length:`, ssml.length);
      console.log(`🔍 Token exists:`, !!token);
      console.log(`🔍 Token length:`, token ? token.length : 0);
      console.log(`🔍 Request URL:`, `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`);
      
      console.log(`🔊 Texto enviado a Azure TTS: ${text}`);
      
      console.log(`🔊 Parámetros Azure TTS: voz=${voice}, formato=${format}, texto=${text.substring(0, 50)}...`);
      
      const requestConfig = {
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': finalFormat,
          'User-Agent': 'Mozilla/5.0 (compatible; TTS-Service/1.0)',
          'Accept': 'audio/wav, audio/*',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          // Headers adicionales para identificarse como aplicación legítima
          'X-Forwarded-For': '127.0.0.1',
          'X-Real-IP': '127.0.0.1',
          'Origin': 'https://speech.microsoft.com'
        },
        responseType: 'arraybuffer',
        timeout: 15000, // 15 segundos timeout explícito
        maxRedirects: 0 // No seguir redirects
      };
      
      console.log(`🔍 Request Headers:`, JSON.stringify(requestConfig.headers, null, 2));
      
      // NUEVO: Usar AbortController para timeout seguro en producción
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 segundos timeout
      
      // DETECTAR CONTEXTO DE LLAMADA
      const isInCall = process.env.TWILIO_CALL_ACTIVE === 'true' || global.activeTwilioStreams > 0;
      console.log(`🚀 Starting Azure TTS request with AbortController timeout...`);
      console.log(`📞 CONTEXTO DE LLAMADA:`);
      console.log(`  ├── En llamada activa: ${isInCall}`);
      console.log(`  ├── Streams activos: ${global.activeTwilioStreams || 0}`);
      console.log(`  ├── Variables entorno Twilio: ${Object.keys(process.env).filter(k => k.includes('TWILIO')).length}`);
      console.log(`  └── Timestamp: ${new Date().toISOString()}`);
      
      // Añadir AbortController al config
      requestConfig.signal = controller.signal;
      
    try {
      const response = await axios.post(
        `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        requestConfig
      );
        
        clearTimeout(timeoutId);
      
        console.log(`🔊 Azure TTS Response Status: ${response.status}`);
        console.log(`🔊 Azure TTS Response Headers: ${JSON.stringify(response.headers)}`);
        console.log(`🔊 Audio Buffer First 16 Bytes: ${response.data.slice(0, 16).toString('hex')}`);
      
        const requestEndTime = Date.now();
        const requestDuration = requestEndTime - speechStartTime;
      
        console.log(`✅ AZURE RESPONSE ANALYSIS:`);
        console.log(`  ├── Status Code: ${response.status}`);
        console.log(`  ├── Content-Type: ${response.headers['content-type']}`);
        console.log(`  ├── Audio Buffer Length: ${response.data ? response.data.length : 0} bytes`);
        console.log(`  ├── Audio Buffer Type: ${response.data ? typeof response.data : 'undefined'}`);
        console.log(`  ├── Audio Buffer Empty: ${!response.data || response.data.length === 0}`);
        console.log(`  ├── Request Duration: ${requestDuration}ms`);
        console.log(`  ├── Total Process Time: ${Date.now() - speechStartTime}ms`);
      
        // 🔍 ANÁLISIS DETALLADO DEL AUDIO BUFFER
        console.log(`  └── 🎵 AUDIO BUFFER DEEP ANALYSIS:`);
        if (response.data && response.data.length > 0) {
          const buffer = Buffer.from(response.data);
          console.log(`      ├── Buffer is valid: ${Buffer.isBuffer(buffer)}`);
          console.log(`      ├── Buffer length: ${buffer.length} bytes`);
          console.log(`      ├── First 16 bytes (hex): ${buffer.subarray(0, 16).toString('hex')}`);
          console.log(`      ├── First 16 bytes (ascii): ${buffer.subarray(0, 16).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
          
          // Verificar si es un archivo PCM válido (debe empezar con RIFF)
          const header = buffer.subarray(0, 4).toString('ascii');
          console.log(`      ├── Audio header: "${header}"`);
          console.log(`      ├── Is RIFF format: ${header === 'RIFF'}`);
          
          if (header === 'RIFF') {
            const waveHeader = buffer.subarray(8, 12).toString('ascii');
            console.log(`      ├── WAVE header: "${waveHeader}"`);
            console.log(`      ├── Is valid WAVE: ${waveHeader === 'WAVE'}`);
            
            // Obtener información del formato
            const fmtChunk = buffer.indexOf('fmt ');
            if (fmtChunk !== -1) {
              const audioFormat = buffer.readUInt16LE(fmtChunk + 8);
              const channels = buffer.readUInt16LE(fmtChunk + 10);
              const sampleRate = buffer.readUInt32LE(fmtChunk + 12);
              const bitsPerSample = buffer.readUInt16LE(fmtChunk + 22);
              
              console.log(`      ├── Audio Format: ${audioFormat} (1=PCM)`);
              console.log(`      ├── Channels: ${channels}`);
              console.log(`      ├── Sample Rate: ${sampleRate} Hz`);
              console.log(`      ├── Bits per Sample: ${bitsPerSample}`);
              
              // Buscar el chunk de datos
              const dataChunk = buffer.indexOf('data');
              if (dataChunk !== -1) {
                const dataSize = buffer.readUInt32LE(dataChunk + 4);
                console.log(`      ├── Data chunk size: ${dataSize} bytes`);
                console.log(`      ├── Audio duration: ~${(dataSize / (sampleRate * channels * (bitsPerSample/8))).toFixed(2)}s`);
                console.log(`      └── ✅ VALID PCM AUDIO DETECTED`);
              } else {
                console.log(`      └── ❌ NO DATA CHUNK FOUND - Invalid audio`);
              }
            } else {
              console.log(`      └── ❌ NO FMT CHUNK FOUND - Invalid audio`);
            }
          } else {
            console.log(`      ├── Unknown format header: "${header}"`);
            console.log(`      ├── Expected: "RIFF" for PCM audio`);
            console.log(`      └── ❌ INVALID AUDIO FORMAT - Not PCM`);
          }
          
          // Verificar si el buffer contiene solo zeros (audio silencioso)
          const nonZeroBytes = buffer.filter(byte => byte !== 0).length;
          const zeroPercentage = ((buffer.length - nonZeroBytes) / buffer.length * 100).toFixed(1);
          console.log(`      ├── Non-zero bytes: ${nonZeroBytes}/${buffer.length}`);
          console.log(`      ├── Zero percentage: ${zeroPercentage}%`);
          
          if (zeroPercentage > 95) {
            console.log(`      └── ⚠️ MOSTLY SILENT AUDIO - ${zeroPercentage}% zeros`);
          } else if (zeroPercentage > 50) {
            console.log(`      └── ⚠️ PARTIALLY SILENT AUDIO - ${zeroPercentage}% zeros`);
          } else {
            console.log(`      └── ✅ AUDIO HAS CONTENT - ${zeroPercentage}% zeros`);
          }
        } else {
          console.log(`      └── ❌ NO AUDIO BUFFER - Azure returned empty response`);
        }
      
        console.log(`  └── 🎯 LATENCY ANALYSIS:`);
      
        // ANÁLISIS DETALLADO DE LATENCIA
        if (requestDuration > 3000) {
          console.log(`      ├── ⚠️ HIGH LATENCY DETECTED: ${requestDuration}ms > 3000ms`);
          console.log(`      ├── 🔍 POSSIBLE CAUSES:`);
          console.log(`      │   ├── Network latency to Azure ${this.region}`);
          console.log(`      │   ├── Azure TTS service overload`);
          console.log(`      │   ├── Large text processing time`);
          console.log(`      │   └── Production environment resource limits`);
          console.log(`      └── 💡 RECOMMENDATIONS:`);
          console.log(`          ├── Try different Azure region (eastus, centralus)`);
          console.log(`          ├── Reduce text length or complexity`);
          console.log(`          ├── Pre-generate common phrases`);
          console.log(`          └── Implement caching for repeated texts`);
        } else if (requestDuration > 1000) {
          console.log(`      ├── ⚠️ MODERATE LATENCY: ${requestDuration}ms > 1000ms`);
          console.log(`      └── 💡 Consider optimization if this persists`);
        } else {
          console.log(`      └── ✅ GOOD LATENCY: ${requestDuration}ms < 1000ms`);
        }
      
        // 🔍 VALIDACIÓN EXHAUSTIVA DEL AUDIO BUFFER
        if (!response.data || response.data.length === 0) {
          console.error(`❌ EMPTY AUDIO BUFFER DETECTED:`);
          console.error(`  ├── Azure returned empty or null audio data`);
          console.error(`  ├── This will cause silent audio playback`);
          console.error(`  ├── Status was ${response.status} but no audio content`);
          console.error(`  ├── Content-Type: ${response.headers['content-type']}`);
          console.error(`  ├── Response Headers: ${JSON.stringify(response.headers)}`);
          console.error(`  └── 🎯 ROOT CAUSE: Azure TTS generated no audio`);
          
          return {
            success: false,
            error: 'Audio buffer vacío desde Azure - TTS no generó audio',
            cause: 'EMPTY_AUDIO_BUFFER',
            statusCode: response.status,
            contentType: response.headers['content-type'],
            responseHeaders: response.headers,
            diagnosis: 'Azure TTS responded with HTTP 200 but no audio content'
          };
        }
      
        // 🔍 VALIDACIÓN DE FORMATO DE AUDIO
        const buffer = Buffer.from(response.data);
        const header = buffer.subarray(0, 4).toString('ascii');
        
        // Validar formato según lo solicitado
        if (!finalFormat.includes('mulaw')) {
          logger.warn(`⚠️ Formato forzado a mulaw: ${finalFormat} no es nativo Twilio`);
          finalFormat = 'raw-8khz-8bit-mono-mulaw';
        }
        if (finalFormat === 'raw-8khz-8bit-mono-mulaw') {
          // Para mulaw, no esperamos header RIFF
          console.log(`🎵 MULAW FORMAT VALIDATION:`);
          console.log(`  ├── Format requested: ${finalFormat}`);
          console.log(`  ├── Buffer length: ${buffer.length} bytes`);
          console.log(`  ├── First 16 bytes: ${buffer.subarray(0, 16).toString('hex')}`);
          console.log(`  └── ✅ Raw mulaw format - no RIFF header expected`);
        } else {
          // Para PCM, esperamos header RIFF
          if (header !== 'RIFF') {
            console.error(`❌ INVALID AUDIO FORMAT DETECTED:`);
            console.error(`  ├── Expected: "RIFF" header for PCM audio`);
            console.error(`  ├── Received: "${header}" (${buffer.subarray(0, 4).toString('hex')})`);
            console.error(`  ├── Buffer length: ${buffer.length} bytes`);
            console.error(`  ├── First 32 bytes: ${buffer.subarray(0, 32).toString('hex')}`);
            console.error(`  └── 🎯 ROOT CAUSE: Azure returned invalid audio format`);
            
            return {
              success: false,
              error: 'Formato de audio inválido desde Azure',
              cause: 'INVALID_AUDIO_FORMAT',
              expectedHeader: 'RIFF',
              receivedHeader: header,
              bufferLength: buffer.length,
              diagnosis: 'Azure TTS returned data but not in expected PCM format'
            };
          }
        }
        
        // 🔍 VALIDACIÓN DE CONTENIDO DE AUDIO (SILENCIO)
        let nonZeroBytes, zeroPercentage;
        
        if (finalFormat === 'raw-8khz-8bit-mono-mulaw') {
          // Para mulaw, el silencio es 0xFF (255), no 0x00
          const silentBytes = buffer.filter(byte => byte === 0xFF).length;
          nonZeroBytes = buffer.length - silentBytes;
          zeroPercentage = (silentBytes / buffer.length * 100);
          
          console.log(`🎵 MULAW SILENCE ANALYSIS:`);
          console.log(`  ├── Silent bytes (0xFF): ${silentBytes}/${buffer.length}`);
          console.log(`  ├── Audio bytes: ${nonZeroBytes}/${buffer.length}`);
          console.log(`  └── Silence percentage: ${zeroPercentage.toFixed(1)}%`);
        } else {
          // Para PCM, el silencio es 0x00
          nonZeroBytes = buffer.filter(byte => byte !== 0).length;
          zeroPercentage = ((buffer.length - nonZeroBytes) / buffer.length * 100);
        }
        
        if (zeroPercentage > 95) {
          console.error(`❌ SILENT AUDIO DETECTED:`);
          console.error(`  ├── Audio buffer is ${zeroPercentage.toFixed(1)}% silent`);
          console.error(`  ├── Non-silent bytes: ${nonZeroBytes}/${buffer.length}`);
          console.error(`  ├── This will result in no audible sound`);
          console.error(`  └── 🎯 ROOT CAUSE: Azure generated silent/empty audio`);
          
          return {
            success: false,
            error: 'Audio silencioso generado por Azure',
            cause: 'SILENT_AUDIO',
            zeroPercentage: zeroPercentage,
            nonZeroBytes: nonZeroBytes,
            totalBytes: buffer.length,
            diagnosis: 'Azure TTS generated valid format but silent audio content'
          };
        }
        
        console.log(`🔊 ===== AZURE TTS DEBUG SUCCESS =====`);
        console.log(`✅ AUDIO VALIDATION PASSED:`);
        
        if (finalFormat === 'raw-8khz-8bit-mono-mulaw') {
          console.log(`  ├── Valid RAW mulaw format: ✓`);
          console.log(`  ├── Audio content present: ✓ (${zeroPercentage.toFixed(1)}% silent)`);
          console.log(`  ├── Buffer size: ${buffer.length} bytes`);
          console.log(`  └── Ready for direct Twilio streaming (no conversion needed)`);
        } else {
          console.log(`  ├── Valid RIFF/PCM format: ✓`);
          console.log(`  ├── Audio content present: ✓ (${zeroPercentage.toFixed(1)}% zeros)`);
          console.log(`  ├── Buffer size: ${buffer.length} bytes`);
          console.log(`  └── Ready for mulaw conversion and Twilio streaming`);
        }
        
        // Function to trim leading silence from raw mulaw buffer
        function trimLeadingSilence(audioBuffer) {
          // Mulaw silence is represented by 0xFF (or 0x7F in some encodings)
          // We'll skip all 0xFF bytes at the start
          let i = 0;
          const maxSilence = 24000; // Max 3 seconds of silence (8000 samples per second)
          
          while (i < audioBuffer.length && i < maxSilence) {
            if (audioBuffer[i] !== 0xFF) {
              break;
            }
            i++;
          }
          
          return audioBuffer.slice(i);
        }

        const trimmedBuffer = trimLeadingSilence(buffer);

        // Save audio to file
        const fileName = `/tmp/debug_${Date.now()}.wav`;
        try {
          fs.writeFileSync(fileName, trimmedBuffer);
          logger.info(`🔧 Audio guardado en ${fileName}`);
        } catch (error) {
          logger.error(`❌ Error guardando audio: ${error.message}`);
        }
        
        return {
          success: true,
          audioBuffer: trimmedBuffer,
          contentType: response.headers['content-type'],
          audioAnalysis: {
            format: finalFormat === 'raw-8khz-8bit-mono-mulaw' ? 'RAW_MULAW' : 'RIFF/PCM',
            bufferSize: buffer.length,
            zeroPercentage: zeroPercentage,
            nonZeroBytes: nonZeroBytes,
            isValid: true
          }
        };

    } catch (error) {
      clearTimeout(timeoutId);
      const errorDuration = Date.now() - speechStartTime;
      
      if (error.name === 'AbortError') {
        console.error('🔊 ===== AZURE TTS TIMEOUT DETECTED (AbortController) =====');
        console.error('⏰ TIMEOUT ANALYSIS:');
        console.error(`  ├── Duration: ${errorDuration}ms`);
        console.error(`  ├── Timeout Limit: 15000ms`);
        console.error(`  ├── Region: ${this.region}`);
        console.error(`  ├── Text Length: ${text?.length || 0} chars`);
        console.error('  └── 🎯 ROOT CAUSE: Azure TTS colgado en producción');
        
        return {
          success: false,
          error: 'Azure TTS timeout - operación cancelada',
          cause: 'ABORT_CONTROLLER_TIMEOUT',
          duration: errorDuration,
          timeout: 15000,
          region: this.region,
          isProductionHang: true,
          recommendations: [
            'Usar audio de fallback inmediatamente',
            'Implementar cache de audio pre-generado',
            'Considerar servicio TTS alternativo',
            'Monitorear recursos de Render'
          ]
        };
      }
         
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        azureError: error.response?.data,
        voiceUsed: voice,
        textSent: text.substring(0, 100),
        region: this.region,
        format: finalFormat
      };
    }
  }
}

// Crear instancia del servicio
var azureTTSRestService = new AzureTTSRestService();

// Exportar la instancia
module.exports = azureTTSRestService;
