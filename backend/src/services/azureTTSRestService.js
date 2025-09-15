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

    return await this.getAuthToken();
  }

  async getAuthToken() {
    const authId = `AUTH_${Date.now()}`;
    const authStartTime = Date.now();
    logger.info(`🔐 [${authId}] ===== AZURE AUTHENTICATION START =====`);
    logger.info(`🔐 [${authId}] Región: ${this.region}`);
    logger.info(`🔐 [${authId}] Key presente: ${!!this.subscriptionKey}`);
    logger.info(`🔐 [${authId}] Key length: ${this.subscriptionKey ? this.subscriptionKey.length : 0}`);
    logger.info(`🔐 [${authId}] Key preview: ${this.subscriptionKey ? this.subscriptionKey.substring(0, 8) + '...' : 'MISSING'}`);
    
    const tokenUrl = `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    logger.info(`🔐 [${authId}] Token URL: ${tokenUrl}`);

    try {
      const hrtimeStart = process.hrtime();
      const memBefore = process.memoryUsage();
      
      logger.info(`🔐 [${authId}] 🚀 PASO 1: Iniciando petición de token`);
      logger.info(`🔐 [${authId}] 📊 Memoria inicial: RSS=${Math.round(memBefore.rss/1024/1024)}MB, Heap=${Math.round(memBefore.heapUsed/1024/1024)}MB`);
      
      // Monitorear event loop lag
      const eventLoopStart = process.hrtime();
      setImmediate(() => {
        const [seconds, nanoseconds] = process.hrtime(eventLoopStart);
        const lagMs = Math.round(seconds * 1000 + nanoseconds / 1000000);
        if (lagMs > 10) {
          logger.warn(`🔐 [${authId}] ⚠️ Event loop lag detectado: ${lagMs}ms`);
        }
      });
      
      logger.info(`🔐 [${authId}] 🚀 PASO 2: Creando timeout promise`);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const [seconds, nanoseconds] = process.hrtime(hrtimeStart);
          const elapsedMs = Math.round(seconds * 1000 + nanoseconds / 1000000);
          const memAfter = process.memoryUsage();
          logger.error(`🔐 [${authId}] ❌ TIMEOUT TRIGGERED después de ${elapsedMs}ms`);
          logger.error(`🔐 [${authId}] 📊 Memoria al timeout: RSS=${Math.round(memAfter.rss/1024/1024)}MB, Heap=${Math.round(memAfter.heapUsed/1024/1024)}MB`);
          reject(new Error(`AGGRESSIVE_TIMEOUT: Auth request hung after ${elapsedMs}ms`));
        }, 3000);
      });
      
      logger.info(`🔐 [${authId}] 🚀 PASO 3: Creando axios request`);
      const axiosStart = process.hrtime();
      
      // Interceptar eventos de axios para debugging
      const axiosInstance = axios.create({
        timeout: 5000,
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Interceptor de request
      axiosInstance.interceptors.request.use(config => {
        const [seconds, nanoseconds] = process.hrtime(axiosStart);
        const setupTime = Math.round(seconds * 1000 + nanoseconds / 1000000);
        logger.info(`🔐 [${authId}] 📤 Request interceptor: setup tomó ${setupTime}ms`);
        logger.info(`🔐 [${authId}] 📤 URL: ${config.url}`);
        return config;
      });
      
      // Interceptor de response
      axiosInstance.interceptors.response.use(
        response => {
          const [seconds, nanoseconds] = process.hrtime(axiosStart);
          const totalTime = Math.round(seconds * 1000 + nanoseconds / 1000000);
          logger.info(`🔐 [${authId}] 📥 Response recibida en ${totalTime}ms`);
          logger.info(`🔐 [${authId}] 📥 Status: ${response.status}`);
          return response;
        },
        error => {
          const [seconds, nanoseconds] = process.hrtime(axiosStart);
          const totalTime = Math.round(seconds * 1000 + nanoseconds / 1000000);
          logger.error(`🔐 [${authId}] ❌ Error en axios después de ${totalTime}ms: ${error.message}`);
          if (error.code) logger.error(`🔐 [${authId}] ❌ Error code: ${error.code}`);
          return Promise.reject(error);
        }
      );
      
      logger.info(`🔐 [${authId}] 🚀 PASO 4: Ejecutando POST request`);
      const requestPromise = axiosInstance.post(tokenUrl, null);
      
      logger.info(`🔐 [${authId}] 🚀 PASO 5: Iniciando Promise.race`);
      const raceStart = process.hrtime();
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      const [raceSeconds, raceNanoseconds] = process.hrtime(raceStart);
      const raceDuration = Math.round(raceSeconds * 1000 + raceNanoseconds / 1000000);
      logger.info(`🔐 [${authId}] ✅ Promise.race completado en ${raceDuration}ms`);

      const authDuration = Date.now() - authStartTime;
      logger.info(`🔐 [${authId}] ✅ Token obtenido exitosamente en ${authDuration}ms`);
      logger.info(`🔐 [${authId}] Response status: ${response.status}`);
      logger.info(`🔐 [${authId}] Token length: ${response.data ? response.data.length : 0}`);
      
      this.token = response.data;
      this.tokenExpiration = Date.now() + 9 * 60 * 1000; // 9 minutos de validez
      return this.token;

    } catch (error) {
      const [totalSeconds, totalNanoseconds] = process.hrtime(hrtimeStart);
      const totalDuration = Math.round(totalSeconds * 1000 + totalNanoseconds / 1000000);
      const memFinal = process.memoryUsage();
      const authDuration = Date.now() - authStartTime;
      
      logger.error(`❌ [${authId}] Error después de ${totalDuration}ms: ${error.message}`);
      logger.error(`❌ [${authId}] 📊 Memoria final: RSS=${Math.round(memFinal.rss/1024/1024)}MB, Heap=${Math.round(memFinal.heapUsed/1024/1024)}MB`);
      
      // Análisis detallado del error
      if (error.code) {
        logger.error(`❌ [${authId}] Error code: ${error.code}`);
      }
      if (error.errno) {
        logger.error(`❌ [${authId}] Error errno: ${error.errno}`);
      }
      if (error.syscall) {
        logger.error(`❌ [${authId}] Error syscall: ${error.syscall}`);
      }
      if (error.hostname) {
        logger.error(`❌ [${authId}] Error hostname: ${error.hostname}`);
      }
      
      // Detectar tipo específico de error
      if (error.message && error.message.includes('AGGRESSIVE_TIMEOUT')) {
        logger.error(`❌ [${authId}] 🚨 AZURE TTS HANGING DETECTADO - Timeout agresivo tras ${totalDuration}ms`);
        logger.error(`❌ [${authId}] 🚨 Request nunca completó - posible bloqueo en red o event loop`);
        error.isAzureHanging = true;
      } else if (error.code === 'ECONNRESET') {
        logger.error(`❌ [${authId}] 🚨 Conexión reseteada por Azure`);
      } else if (error.code === 'ENOTFOUND') {
        logger.error(`❌ [${authId}] 🚨 Error de DNS - no se pudo resolver hostname`);
      } else if (error.code === 'ECONNREFUSED') {
        logger.error(`❌ [${authId}] 🚨 Conexión rechazada por Azure`);
      } else if (error.code === 'ETIMEDOUT') {
        logger.error(`❌ [${authId}] 🚨 Timeout de conexión TCP`);
      } else if (error.response?.status === 401) {
        logger.error(`🔐 [${authId}]   ├── 🎯 UNAUTHORIZED - Key inválida o expirada`);
        logger.error(`🔐 [${authId}]   └── 🔧 SOLUCIÓN: Verificar AZURE_SPEECH_KEY`);
      } else if (error.response?.status === 403) {
        logger.error(`🔐 [${authId}]   ├── 🎯 FORBIDDEN - Sin permisos para TTS`);
        logger.error(`🔐 [${authId}]   └── 🔧 SOLUCIÓN: Verificar permisos de Speech Services`);
      } else if (error.response?.status === 429) {
        logger.error(`🔐 [${authId}]   ├── 🎯 RATE LIMIT - Demasiadas peticiones`);
        logger.error(`🔐 [${authId}]   └── 🔧 SOLUCIÓN: Esperar antes de reintentar`);
      } else if (!error.response) {
        logger.error(`🔐 [${authId}]   ├── 🎯 NETWORK ERROR - Sin respuesta del servidor`);
        logger.error(`🔐 [${authId}]   └── 🔧 SOLUCIÓN: Verificar conectividad a Azure`);
      }
      
      if (error.response?.data) {
        const errorData = Buffer.isBuffer(error.response.data) 
          ? error.response.data.toString('utf8') 
          : error.response.data;
        logger.error(`🔐 [${authId}]   └── Azure Response: ${errorData}`);
      }
      
      logger.error(`🔐 [${authId}] ===== AZURE AUTHENTICATION FAILED =====`);
      throw error;
    }
  }

  async generateSpeech(text, voice = 'es-ES-DarioNeural', format = 'riff-16khz-16bit-mono-pcm') {
    const speechStartTime = Date.now();
    const startTime = speechStartTime;
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
      console.log(`  ├── Format: "${format}" (PCM para conversión a mulaw)`);
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
      console.log(`🔊 Formato: "${format}" (PCM 16kHz 16-bit mono)`);
      console.log(`🔊 Razón del formato: PCM es fácil de convertir a mulaw para Twilio`);
      
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
      
      // 🔍 VALIDACIÓN DE CONTENIDO DE AUDIO (SILENCIO)
      const nonZeroBytes = buffer.filter(byte => byte !== 0).length;
      const zeroPercentage = ((buffer.length - nonZeroBytes) / buffer.length * 100);
      
      if (zeroPercentage > 95) {
        console.error(`❌ SILENT AUDIO DETECTED:`);
        console.error(`  ├── Audio buffer is ${zeroPercentage.toFixed(1)}% zeros`);
        console.error(`  ├── Non-zero bytes: ${nonZeroBytes}/${buffer.length}`);
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
      console.log(`  ├── Valid RIFF/PCM format: ✓`);
      console.log(`  ├── Audio content present: ✓ (${zeroPercentage.toFixed(1)}% zeros)`);
      console.log(`  ├── Buffer size: ${buffer.length} bytes`);
      console.log(`  └── Ready for mulaw conversion and Twilio streaming`);
      
      return {
        success: true,
        audioBuffer: response.data,
        contentType: response.headers['content-type'],
        audioAnalysis: {
          format: 'RIFF/PCM',
          bufferSize: buffer.length,
          zeroPercentage: zeroPercentage,
          nonZeroBytes: nonZeroBytes,
          isValid: true
        }
      };

    } catch (error) {
      const errorDuration = Date.now() - startTime;
      console.error('🔊 ===== AZURE TTS ERROR ANALYSIS =====');
      console.error('❌ VOZ USADA EN ERROR:', voice);
      console.error('❌ TEXTO ENVIADO:', text.substring(0, 100));
      console.error('❌ FORMATO SOLICITADO:', format);
      console.error('❌ REGIÓN AZURE:', this.region);
      console.error('❌ ERROR DURATION:', errorDuration + 'ms');
      
      // DETECTAR TIMEOUT ESPECÍFICAMENTE (incluyendo el agresivo)
      if (error.message?.includes('TTS_AGGRESSIVE_TIMEOUT')) {
        console.error('🔊 ===== AGGRESSIVE TTS TIMEOUT DETECTED =====');
        console.error('⏰ AGGRESSIVE TIMEOUT ANALYSIS:');
        console.error(`  ├── Duration: ${errorDuration}ms`);
        console.error(`  ├── Aggressive Timeout Limit: 7000ms`);
        console.error(`  ├── Region: ${this.region}`);
        console.error(`  ├── Text Length: ${text?.length || 0} chars`);
        console.error('  └── 🎯 ROOT CAUSE: TTS se colgó en producción (Render issue)');
        console.error('      ├── Azure TTS hanging in containerized environment');
        console.error('      ├── Render resource limits causing process hang');
        console.error('      ├── Event loop blocking in production');
        console.error('      └── Network/DNS resolution issues');
        
        return {
          success: false,
          error: 'Azure TTS colgado en producción - usando fallback',
          cause: 'TTS_HANGING_IN_PRODUCTION',
          duration: errorDuration,
          timeout: 7000,
          region: this.region,
          isProductionHang: true,
          recommendations: [
            'Usar audio de fallback inmediatamente',
            'Implementar cache de audio pre-generado',
            'Considerar servicio TTS alternativo',
            'Monitorear recursos de Render'
          ]
        };
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('🔊 ===== STANDARD TIMEOUT ERROR DETECTED =====');
        console.error('⏰ TIMEOUT ANALYSIS:');
        console.error(`  ├── Duration: ${errorDuration}ms`);
        console.error(`  ├── Timeout Limit: 10000ms`);
        console.error(`  ├── Region: ${this.region}`);
        console.error(`  ├── Text Length: ${text?.length || 0} chars`);
        console.error('  └── 🎯 ROOT CAUSE ANALYSIS:');
        console.error('      ├── Azure TTS service is slow in production');
        console.error('      ├── Network latency from Render to Azure westeurope');
        console.error('      ├── Render resource limits affecting HTTP requests');
        console.error('      └── Azure service overload or maintenance');
        
        return {
          success: false,
          error: 'Azure TTS timeout - servicio no responde',
          cause: 'TIMEOUT_ERROR',
          duration: errorDuration,
          timeout: 10000,
          region: this.region,
          recommendations: [
            'Cambiar región a eastus o centralus',
            'Reducir longitud del texto',
            'Implementar cache de audio',
            'Usar audio pre-generado como fallback'
          ]
        };
      }
      
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
