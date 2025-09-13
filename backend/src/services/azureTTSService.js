const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AzureTTSService {
  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY || '123456dummy_key_for_testing';
    this.region = process.env.AZURE_SPEECH_REGION || 'westeurope';
    
    // LOGS CRÍTICOS PARA PRODUCCIÓN
    logger.info(`🔍 AZURE TTS INIT - Key: ${this.subscriptionKey ? 'CONFIGURADA' : 'NO CONFIGURADA'} (${this.subscriptionKey?.substring(0, 8)}...)`);  
    logger.info(`🔍 AZURE TTS INIT - Región: ${this.region}`);
    logger.info(`🔍 AZURE TTS INIT - NODE_ENV: ${process.env.NODE_ENV}`);
    
    // Verificar si es la clave dummy
    if (this.subscriptionKey === '123456dummy_key_for_testing') {
      logger.error(`❌ AZURE TTS USANDO CLAVE DUMMY - Variables de entorno no cargadas correctamente`);
    }
    
    // Voces españolas disponibles (nombres EXACTOS de Azure Speech Studio)
    this.availableVoices = [
      {
        id: 'lola',
        name: 'en-US-LolaMultilingualNeural',
        azureName: 'en-US-LolaMultilingualNeural',
        locale: 'es-ES',
        description: 'Voz Lola multilingüe (funciona en español)'
      },
      {
        id: 'dario',
        name: 'es-ES-DarioNeural', 
        azureName: 'es-ES-DarioNeural',
        locale: 'es-ES',
        description: 'Voz masculina española oficial'
      }
    ];
    
    this.defaultVoice = 'lola'; // Voz por defecto
    
    if (!this.subscriptionKey) {
      logger.warn('⚠️ AZURE_SPEECH_KEY no configurada. Azure TTS no funcionará.');
    }
  }

  // Obtener configuración de Azure Speech
  getSpeechConfig() {
    if (!this.subscriptionKey) {
      throw new Error('Azure Speech Key no configurada');
    }
    
    logger.info(`🔍 DEBUG Azure TTS - Configurando con región: ${this.region}`);
    logger.info(`🔍 DEBUG Azure TTS - Clave configurada: ${this.subscriptionKey ? 'SÍ' : 'NO'}`);
    
    // CONFIGURACIÓN OFICIAL SEGÚN DOCUMENTACIÓN DE MICROSOFT
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    
    // Configurar idioma español
    speechConfig.speechSynthesisLanguage = "es-ES";
    
    // Configurar formato de salida para Twilio (μ-law 8kHz mono)
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;
    
    logger.info(`🔍 DEBUG Azure TTS - SpeechConfig creado correctamente con fromSubscription`);
    
    return speechConfig;
  }

  // Obtener voz por ID
  getVoiceById(voiceId) {
    return this.availableVoices.find(v => v.id === voiceId) || this.availableVoices[0];
  }

  // Generar audio a partir de texto
  async generateSpeech(text, voiceId = null, outputPath = null) {
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 [${requestId}] ===== INICIANDO AZURE TTS SYNTHESIS =====`);
      logger.info(`🔍 [${requestId}] Texto: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      logger.info(`🔍 [${requestId}] Longitud: ${text.length} caracteres`);
      logger.info(`🔍 [${requestId}] VoiceId solicitado: ${voiceId || 'default'}`);
      logger.info(`🔍 [${requestId}] OutputPath: ${outputPath || 'MEMORIA'}`);
      
      const selectedVoice = this.getVoiceById(voiceId || this.defaultVoice);
      logger.info(`🔍 [${requestId}] Voz seleccionada: ${selectedVoice.name} (${selectedVoice.azureName})`);
      
      // STEP 1: Configurar Speech SDK
      logger.info(`🔍 [${requestId}] STEP 1: Configurando Speech SDK...`);
      const configStart = Date.now();
      
      // STEP 1.1: Verificar variables de entorno críticas
      logger.info(`🔍 [${requestId}] STEP 1.1: Verificando configuración Azure...`);
      logger.info(`🔍 [${requestId}] - AZURE_SPEECH_KEY: ${this.subscriptionKey ? `${this.subscriptionKey.substring(0, 8)}...` : 'NO CONFIGURADA'}`);
      logger.info(`🔍 [${requestId}] - AZURE_SPEECH_REGION: ${this.region}`);
      logger.info(`🔍 [${requestId}] - NODE_ENV: ${process.env.NODE_ENV}`);
      logger.info(`🔍 [${requestId}] - Process platform: ${process.platform}`);
      logger.info(`🔍 [${requestId}] - Process version: ${process.version}`);
      
      // STEP 1.2: Verificar conectividad de red básica
      logger.info(`🔍 [${requestId}] STEP 1.2: Verificando conectividad de red...`);
      try {
        const dns = require('dns');
        const azureEndpoint = `${this.region}.tts.speech.microsoft.com`;
        logger.info(`🔍 [${requestId}] - Resolviendo DNS para: ${azureEndpoint}`);
        
        dns.resolve4(azureEndpoint, (err, addresses) => {
          if (err) {
            logger.error(`❌ [${requestId}] DNS resolution failed: ${err.message}`);
          } else {
            logger.info(`🔍 [${requestId}] DNS resolved: ${addresses.join(', ')}`);
          }
        });
      } catch (dnsError) {
        logger.error(`❌ [${requestId}] DNS check error: ${dnsError.message}`);
      }
      
      // STEP 1.3: Crear SpeechConfig con logging detallado
      logger.info(`🔍 [${requestId}] STEP 1.3: Creando SpeechConfig...`);
      const speechConfig = this.getSpeechConfig();
      speechConfig.speechSynthesisVoiceName = selectedVoice.azureName;
      
      // STEP 1.4: Verificar propiedades del SpeechConfig
      logger.info(`🔍 [${requestId}] STEP 1.4: Verificando SpeechConfig properties...`);
      try {
        logger.info(`🔍 [${requestId}] - SpeechConfig constructor: ${speechConfig.constructor.name}`);
        logger.info(`🔍 [${requestId}] - SpeechConfig region: ${speechConfig.region || 'NO DEFINIDA'}`);
        logger.info(`🔍 [${requestId}] - SpeechConfig endpoint: ${speechConfig.endpointId || 'DEFAULT'}`);
      } catch (configError) {
        logger.error(`❌ [${requestId}] Error verificando SpeechConfig: ${configError.message}`);
      }
      
      const configTime = Date.now() - configStart;
      logger.info(`🔍 [${requestId}] STEP 1 COMPLETADO en ${configTime}ms`);
      logger.info(`🔍 [${requestId}] - Formato: ${speechConfig.speechSynthesisOutputFormat}`);
      logger.info(`🔍 [${requestId}] - Idioma: ${speechConfig.speechSynthesisLanguage}`);
      logger.info(`🔍 [${requestId}] - Voz: ${speechConfig.speechSynthesisVoiceName}`);
      
      // STEP 2: Configurar Audio Output
      logger.info(`🔍 [${requestId}] STEP 2: Configurando Audio Output...`);
      const audioConfigStart = Date.now();
      
      let audioConfig;
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          logger.info(`🔍 [${requestId}] Directorio creado: ${outputDir}`);
        }
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
        logger.info(`🔍 [${requestId}] AudioConfig: ARCHIVO (${outputPath})`);
      } else {
        audioConfig = null; // Para Twilio - audio en memoria
        logger.info(`🔍 [${requestId}] AudioConfig: MEMORIA (null para Twilio)`);
      }
      
      const audioConfigTime = Date.now() - audioConfigStart;
      logger.info(`🔍 [${requestId}] STEP 2 COMPLETADO en ${audioConfigTime}ms`);
      
      // STEP 3: Crear Synthesizer
      logger.info(`🔍 [${requestId}] STEP 3: Creando SpeechSynthesizer...`);
      const synthesizerStart = Date.now();
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      const synthesizerTime = Date.now() - synthesizerStart;
      logger.info(`🔍 [${requestId}] STEP 3 COMPLETADO en ${synthesizerTime}ms`);
      logger.info(`🔍 [${requestId}] SpeechSynthesizer creado exitosamente`);
      
      return new Promise((resolve, reject) => {
        // STEP 4: Configurar Timeout (reducido a 8 segundos para fallar más rápido)
        logger.info(`🔍 [${requestId}] STEP 4: Configurando timeout de 8 segundos...`);
        
        const timeout = setTimeout(() => {
          const timeoutTime = Date.now() - startTime;
          logger.error(`❌ [${requestId}] TIMEOUT después de ${timeoutTime}ms (8s configurados)`);
          logger.error(`❌ [${requestId}] CAUSA: Azure TTS no respondió en tiempo esperado`);
          logger.error(`❌ [${requestId}] DIAGNÓSTICO: Cuelgue en llamada a Azure SDK`);
          logger.error(`❌ [${requestId}] POSIBLES CAUSAS:`);
          logger.error(`❌ [${requestId}] - 1. Conectividad de red lenta/bloqueada`);
          logger.error(`❌ [${requestId}] - 2. Límites de rate limiting en Azure`);
          logger.error(`❌ [${requestId}] - 3. Problema con clave/región Azure`);
          logger.error(`❌ [${requestId}] - 4. Firewall bloqueando conexión HTTPS`);
          logger.error(`❌ [${requestId}] - 5. Azure SDK interno colgado`);
          
          try {
            synthesizer.close();
            logger.info(`🔍 [${requestId}] Synthesizer cerrado por timeout`);
          } catch (e) {
            logger.error(`❌ [${requestId}] Error cerrando synthesizer: ${e.message}`);
          }
          
          reject(new Error(`Azure TTS timeout después de 8 segundos (Request: ${requestId})`));
        }, 8000);

        // STEP 5: Ejecutar Síntesis
        setImmediate(() => {
          logger.info(`🔍 [${requestId}] STEP 5: Ejecutando síntesis en próximo tick...`);
          const synthesisStart = Date.now();
          
          // STEP 5.1: Log antes de llamar speakTextAsync
          logger.info(`🔍 [${requestId}] STEP 5.1: Llamando synthesizer.speakTextAsync...`);
          logger.info(`🔍 [${requestId}] - Synthesizer state: ${synthesizer ? 'VÁLIDO' : 'NULL'}`);
          logger.info(`🔍 [${requestId}] - Texto length: ${text.length}`);
          logger.info(`🔍 [${requestId}] - Timestamp antes de llamada: ${Date.now()}`);
          
          // STEP 5.2: Verificar estado del synthesizer antes de usar
          try {
            logger.info(`🔍 [${requestId}] STEP 5.2: Verificando synthesizer properties...`);
            logger.info(`🔍 [${requestId}] - Synthesizer constructor: ${synthesizer.constructor.name}`);
            logger.info(`🔍 [${requestId}] - Synthesizer toString: ${synthesizer.toString()}`);
          } catch (synthError) {
            logger.error(`❌ [${requestId}] Error verificando synthesizer: ${synthError.message}`);
          }
          
          // STEP 5.3: Log inmediatamente antes de la llamada crítica
          logger.info(`🔍 [${requestId}] STEP 5.3: ⚡ LLAMADA CRÍTICA - Iniciando speakTextAsync AHORA...`);
          
          // STEP 5.3.1: Monitorear si la llamada se cuelga inmediatamente
          const callStartTime = Date.now();
          logger.info(`🔍 [${requestId}] STEP 5.3.1: Timestamp EXACTO antes de speakTextAsync: ${callStartTime}`);
          
          // STEP 5.3.2: Usar un timer para detectar si la llamada nunca retorna
          const hangDetector = setTimeout(() => {
            const hangTime = Date.now() - callStartTime;
            logger.error(`🚨 [${requestId}] HANG DETECTADO: speakTextAsync no retornó después de ${hangTime}ms`);
            logger.error(`🚨 [${requestId}] CONFIRMADO: Azure SDK se colgó en la llamada interna`);
            logger.error(`🚨 [${requestId}] ESTADO: Ni callback ni error callback fueron llamados`);
          }, 3000); // Detectar hang después de 3 segundos
          
          synthesizer.speakTextAsync(
            text,
            (result) => {
              // STEP 5.4: Log inmediato al recibir callback
              clearTimeout(hangDetector); // Limpiar detector de hang
              logger.info(`🔍 [${requestId}] STEP 5.4: ✅ CALLBACK RECIBIDO - Azure respondió!`);
              logger.info(`🔍 [${requestId}] - Timestamp callback: ${Date.now()}`);
              logger.info(`🔍 [${requestId}] - Tiempo desde llamada: ${Date.now() - callStartTime}ms`);
              logger.info(`🔍 [${requestId}] - Result object: ${result ? 'VÁLIDO' : 'NULL'}`);
              logger.info(`🔍 [${requestId}] - Result reason: ${result?.reason}`);
              logger.info(`🔍 [${requestId}] - Result constructor: ${result?.constructor?.name}`);
              
              const synthesisTime = Date.now() - synthesisStart;
              const totalTime = Date.now() - startTime;
              
              clearTimeout(timeout);
              logger.info(`🔍 [${requestId}] CALLBACK RECIBIDO después de ${synthesisTime}ms`);
              logger.info(`🔍 [${requestId}] Reason: ${result.reason} (${sdk.ResultReason[result.reason] || 'Unknown'})`);
              
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                const audioSize = result.audioData ? result.audioData.byteLength : 0;
                logger.info(`🎵 [${requestId}] ✅ SUCCESS - Audio generado: ${audioSize} bytes`);
                logger.info(`🎵 [${requestId}] Tiempo total: ${totalTime}ms`);
                logger.info(`🎵 [${requestId}] - Config: ${configTime}ms`);
                logger.info(`🎵 [${requestId}] - AudioConfig: ${audioConfigTime}ms`);
                logger.info(`🎵 [${requestId}] - Synthesizer: ${synthesizerTime}ms`);
                logger.info(`🎵 [${requestId}] - Síntesis: ${synthesisTime}ms`);
                
                if (result.audioData && result.audioData.length > 0) {
                  logger.info(`🎵 [${requestId}] Audio válido - Primer byte: ${result.audioData[0]}`);
                } else {
                  logger.warn(`⚠️ [${requestId}] Audio buffer vacío o inválido`);
                }
                
                if (outputPath) {
                  if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    logger.info(`🎵 [${requestId}] Archivo guardado: ${outputPath} (${stats.size} bytes)`);
                  } else {
                    logger.warn(`⚠️ [${requestId}] Archivo no encontrado: ${outputPath}`);
                  }
                  
                  synthesizer.close();
                  resolve({
                    success: true,
                    outputPath,
                    audioBuffer: result.audioData,
                    requestId,
                    timing: { total: totalTime, synthesis: synthesisTime }
                  });
                } else {
                  synthesizer.close();
                  resolve({
                    success: true,
                    audioBuffer: result.audioData,
                    audioSize: audioSize,
                    format: 'Raw8Khz8BitMonoMULaw',
                    requestId,
                    timing: { total: totalTime, synthesis: synthesisTime }
                  });
                }
              } else if (result.reason === sdk.ResultReason.Canceled) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                logger.error(`❌ [${requestId}] ❌ CANCELED después de ${totalTime}ms`);
                logger.error(`❌ [${requestId}] Reason: ${cancellation.reason} (${sdk.CancellationReason[cancellation.reason] || 'Unknown'})`);
                logger.error(`❌ [${requestId}] ErrorCode: ${cancellation.errorCode} (${sdk.CancellationErrorCode[cancellation.errorCode] || 'Unknown'})`);
                logger.error(`❌ [${requestId}] Details: ${cancellation.errorDetails}`);
                logger.error(`❌ [${requestId}] Clave Azure: ${this.subscriptionKey?.substring(0, 8)}...`);
                logger.error(`❌ [${requestId}] Región Azure: ${this.region}`);
                
                // Diagnosticar causa específica
                if (cancellation.errorCode === sdk.CancellationErrorCode.AuthenticationFailure) {
                  logger.error(`❌ [${requestId}] CAUSA: Clave de Azure inválida o expirada`);
                } else if (cancellation.errorCode === sdk.CancellationErrorCode.ConnectionFailure) {
                  logger.error(`❌ [${requestId}] CAUSA: Fallo de conexión con Azure`);
                } else if (cancellation.errorCode === sdk.CancellationErrorCode.ServiceTimeout) {
                  logger.error(`❌ [${requestId}] CAUSA: Timeout del servicio Azure`);
                } else {
                  logger.error(`❌ [${requestId}] CAUSA: Error desconocido de Azure`);
                }
                
                synthesizer.close();
                reject(new Error(`Azure TTS Cancelado (${requestId}): ${cancellation.errorDetails}`));
              } else {
                logger.error(`❌ [${requestId}] ❌ ERROR después de ${totalTime}ms`);
                logger.error(`❌ [${requestId}] Reason: ${result.reason} (${sdk.ResultReason[result.reason] || 'Unknown'})`);
                logger.error(`❌ [${requestId}] Details: ${result.errorDetails || 'Sin detalles'}`);
                
                synthesizer.close();
                reject(new Error(`Azure TTS Error (${requestId}): ${result.errorDetails || result.reason}`));
              }
            },
            (error) => {
              // STEP 5.5: Log inmediato al recibir error callback
              clearTimeout(hangDetector); // Limpiar detector de hang
              logger.error(`❌ [${requestId}] STEP 5.5: ❌ ERROR CALLBACK RECIBIDO - Azure falló!`);
              logger.error(`❌ [${requestId}] - Timestamp error: ${Date.now()}`);
              logger.error(`❌ [${requestId}] - Tiempo desde llamada: ${Date.now() - callStartTime}ms`);
              logger.error(`❌ [${requestId}] - Error object: ${error ? 'VÁLIDO' : 'NULL'}`);
              logger.error(`❌ [${requestId}] - Error constructor: ${error?.constructor?.name}`);
              
              const errorTime = Date.now() - startTime;
              
              clearTimeout(timeout);
              logger.error(`❌ [${requestId}] ❌ EXCEPTION después de ${errorTime}ms`);
              logger.error(`❌ [${requestId}] Error type: ${error.constructor.name}`);
              logger.error(`❌ [${requestId}] Error message: ${error.message}`);
              logger.error(`❌ [${requestId}] Error stack: ${error.stack}`);
              
              // Diagnosticar tipo de error
              if (error.message.includes('network') || error.message.includes('connection')) {
                logger.error(`❌ [${requestId}] CAUSA: Problema de red/conexión`);
              } else if (error.message.includes('auth') || error.message.includes('key')) {
                logger.error(`❌ [${requestId}] CAUSA: Problema de autenticación`);
              } else {
                logger.error(`❌ [${requestId}] CAUSA: Error interno del SDK`);
              }
              
              synthesizer.close();
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`❌ [${requestId}] ❌ EXCEPTION GENERAL después de ${totalTime}ms`);
      logger.error(`❌ [${requestId}] Error type: ${error.constructor.name}`);
      logger.error(`❌ [${requestId}] Error message: ${error.message}`);
      logger.error(`❌ [${requestId}] Error stack: ${error.stack}`);
      
      // Diagnosticar causa del error
      if (error.message.includes('subscription') || error.message.includes('key')) {
        logger.error(`❌ [${requestId}] CAUSA: Problema con clave de Azure`);
      } else if (error.message.includes('region')) {
        logger.error(`❌ [${requestId}] CAUSA: Problema con región de Azure`);
      } else if (error.message.includes('SpeechConfig') || error.message.includes('AudioConfig')) {
        logger.error(`❌ [${requestId}] CAUSA: Error de configuración del SDK`);
      } else {
        logger.error(`❌ [${requestId}] CAUSA: Error desconocido en setup`);
      }
      
      return {
        success: false,
        error: error.message,
        requestId,
        timing: { total: totalTime }
      };
    }
  }

  // Añadir naturalidad universal al texto (funciona para Lola y Daría)
  addUniversalNaturalness(text) {
    let naturalText = text;
    
    // 🎭 PAUSAS NATURALES UNIVERSALES
    naturalText = naturalText
      // Pausas después de saludos
      .replace(/^(hola|buenas|buenos días|buenas tardes)/gi, '$1<break time="300ms"/>')
      // Pausas antes de preguntas
      .replace(/(\?)/g, '<break time="200ms"/>$1')
      // Pausas después de comas (respiración natural)
      .replace(/(,)/g, '$1<break time="150ms"/>')
      // Pausas en transiciones
      .replace(/\b(entonces|bueno|pues|vale)\b/gi, '<break time="200ms"/>$1<break time="150ms"/>');
    
    // 🎵 VARIACIONES DE VELOCIDAD UNIVERSALES
    naturalText = naturalText
      // Nombre de empresa más lento (énfasis)
      .replace(/\b([A-Z][a-záéíóúñ]+\s+[A-Z][a-záéíóúñ]+)\b/g, '<prosody rate="slow"><emphasis level="moderate">$1</emphasis></prosody>')
      // Números de teléfono más lentos
      .replace(/\b(\d{3}[\s-]?\d{3}[\s-]?\d{3})\b/g, '<prosody rate="slow">$1</prosody>')
      // Palabras importantes con énfasis
      .replace(/\b(importante|urgente|necesario|ayuda)\b/gi, '<emphasis level="strong">$1</emphasis>');
    
    // 🎪 MULETILLAS NATURALES UNIVERSALES (ocasionales)
    if (Math.random() < 0.3) { // 30% de probabilidad
      const muletillas = ['eee', 'mmm', 'pues'];
      const muletilla = muletillas[Math.floor(Math.random() * muletillas.length)];
      naturalText = `<break time="200ms"/>${muletilla}<break time="150ms"/> ${naturalText}`;
    }
    
    // 🎯 ALARGAMIENTO OCASIONAL DE PALABRAS (universal)
    if (Math.random() < 0.2) { // 20% de probabilidad
      naturalText = naturalText
        .replace(/\bvale\b/gi, 'vaaale')
        .replace(/\bbueno\b/gi, 'bueeeno')
        .replace(/\bsí\b/gi, 'sííí');
    }
    
    // 🔄 PAUSAS DE CONSULTA UNIVERSALES
    naturalText = naturalText
      .replace(/\b(déjame ver|un momento|espera)\b/gi, '<break time="250ms"/>$1<break time="400ms"/>')
      .replace(/\b(consultando|revisando|mirando)\b/gi, '<break time="200ms"/>$1<break time="300ms"/>');
    
    return naturalText;
  }

  // Generar audio con SSML para configuración avanzada de voz
  async generateSpeechWithSSML(text, voiceId = null, outputPath = null, voiceSettings = null) {
    try {
      const voice = this.getVoiceById(voiceId || this.defaultVoice);
      logger.info(`🎵 Generando audio Azure TTS con SSML - Voz: ${voice.name}`);
      
      // Configuración por defecto si no se proporciona
      const settings = {
        rate: voiceSettings?.rate || 'medium',           // slow, medium, fast, +20%, -10%
        pitch: voiceSettings?.pitch || 'medium',         // low, medium, high, +2st, -50Hz
        volume: voiceSettings?.volume || 'medium',       // silent, x-soft, soft, medium, loud, x-loud
        style: voiceSettings?.style || 'friendly',       // cheerful, sad, angry, excited, friendly, etc.
        emphasis: voiceSettings?.emphasis || 'moderate'   // strong, moderate, reduced
      };
      
      logger.info(`🎵 Configuración SSML: ${JSON.stringify(settings)}`);
      
      // Añadir naturalidad universal al texto (funciona para Lola y Daría)
      const naturalText = this.addUniversalNaturalness(text);
      logger.info(`🎭 Texto con naturalidad aplicada: ${naturalText.substring(0, 100)}...`);
      
      // Crear SSML con configuración avanzada
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
               xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${voice.locale}">
          <voice name="${voice.name}">
            <mstts:express-as style="${settings.style}">
              <prosody rate="${settings.rate}" pitch="${settings.pitch}" volume="${settings.volume}">
                ${naturalText}
              </prosody>
            </mstts:express-as>
          </voice>
        </speak>
      `;
      
      logger.info(`🎵 SSML generado: ${ssml.substring(0, 200)}...`);
      
      // Configurar Azure Speech SDK con configuración consistente
      const speechConfig = this.getSpeechConfig();
      speechConfig.speechSynthesisVoiceName = voice.azureName;
      
      // Configurar salida de audio de manera consistente
      let audioConfig;
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
        logger.info(`🔍 DEBUG Azure TTS SSML - AudioConfig configurado para archivo: ${outputPath}`);
      } else {
        // Para Twilio, necesitamos audio en memoria, no speaker output
        audioConfig = null; // Esto hará que Azure TTS devuelva el audio en result.audioData
        logger.info(`🔍 DEBUG Azure TTS SSML - AudioConfig configurado para salida en memoria (null)`);
      }
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      logger.info(`🔍 DEBUG Azure TTS SSML - SpeechSynthesizer creado, iniciando síntesis...`);
      
      return new Promise((resolve, reject) => {
        // Timeout consistente de 15 segundos para Azure TTS
        const timeout = setTimeout(() => {
          logger.error(`❌ TIMEOUT Azure TTS SSML después de 15 segundos`);
          try {
            synthesizer.close();
          } catch (e) {
            logger.error(`❌ Error cerrando synthesizer: ${e.message}`);
          }
          reject(new Error('Azure TTS SSML timeout después de 15 segundos'));
        }, 15000);

        // Usar setImmediate para evitar bloqueo del event loop
        setImmediate(() => {
          logger.info(`🔍 AUDIO FLOW DEBUG SSML - Ejecutando síntesis en próximo tick del event loop`);
          
          synthesizer.speakSsmlAsync(
            ssml,
            (result) => {
              clearTimeout(timeout);
              logger.info(`🔍 AUDIO FLOW DEBUG SSML - Síntesis completada, procesando resultado...`);
              
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                logger.info(`🎵 AZURE TTS SSML SUCCESS - Audio generado: ${result.audioData ? result.audioData.byteLength : 0} bytes`);
                
                const audioSize = result.audioData ? result.audioData.byteLength : 0;
                
                if (outputPath && fs.existsSync(outputPath)) {
                  const stats = fs.statSync(outputPath);
                  logger.info(`🎵 Audio Azure SSML guardado: ${outputPath} (${stats.size} bytes)`);
                }
                
                synthesizer.close();
                resolve({
                  success: true,
                  outputPath,
                  audioBuffer: result.audioData,
                  audioSize: audioSize,
                  format: 'Raw8Khz8BitMonoMULaw',
                  voiceSettings: settings
                });
              } else if (result.reason === sdk.ResultReason.Canceled) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                logger.error(`❌ AZURE TTS SSML CANCELED - Reason: ${cancellation.reason}`);
                logger.error(`❌ AZURE TTS SSML CANCELED - Error Code: ${cancellation.errorCode}`);
                logger.error(`❌ AZURE TTS SSML CANCELED - Details: ${cancellation.errorDetails}`);
                synthesizer.close();
                reject(new Error(`Azure TTS SSML Cancelado: ${cancellation.errorDetails}`));
              } else {
                logger.error(`❌ Error en síntesis SSML: ${result.reason}`);
                logger.error(`❌ Detalles del error: ${result.errorDetails || 'No hay detalles'}`);
                logger.error(`❌ Código de resultado: ${result.reason} (${sdk.ResultReason[result.reason] || 'Desconocido'})`);
                logger.error(`❌ SSML problemático: ${ssml.substring(0, 500)}`);
                synthesizer.close();
                reject(new Error(`Error en síntesis SSML: ${result.reason} - ${result.errorDetails || 'Sin detalles'}`));
              }
            },
            (error) => {
              clearTimeout(timeout);
              logger.error(`❌ Error SSML Azure TTS en callback: ${error}`);
              logger.error(`❌ Error type: ${typeof error}`);
              logger.error(`❌ Error message: ${error.message || error}`);
              synthesizer.close();
              reject(error);
            }
          );
        });
      });
    } catch (error) {
      logger.error(`❌ Error generando audio SSML Azure TTS: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar audio para una respuesta del bot de llamadas
  async generateBotResponse(responseText, voiceId = null, voiceSettings = null) {
    try {
      logger.info(`🔍 DEBUG Azure TTS - generateBotResponse iniciado con texto: "${responseText.substring(0, 50)}..."`);  
      logger.info(`🔍 DEBUG Azure TTS - voz recibida: ${voiceId || this.defaultVoice}`);
      logger.info(`🔍 DEBUG Azure TTS - configuración de voz: ${JSON.stringify(voiceSettings)}`);
      
      // Crear nombre de archivo único
      const timestamp = Date.now();
      const fileName = `bot_response_azure_${timestamp}.mp3`;
      const outputDir = path.join(__dirname, '../../public/audio');
      const outputPath = path.join(outputDir, fileName);
      
      // Crear directorio si no existe
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      logger.info(`🔍 DEBUG Azure TTS - Llamando a generateSpeechWithSSML con outputPath: ${outputPath}`);
      
      // Timeout wrapper para generateBotResponse
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('generateBotResponse timeout después de 20 segundos'));
        }, 20000);
      });
      
      // Generar el audio con configuración de voz usando Promise.race para timeout
      const result = await Promise.race([
        this.generateSpeechWithSSML(responseText, voiceId, outputPath, voiceSettings),
        timeoutPromise
      ]);
      
      logger.info(`🔍 DEBUG Azure TTS - generateSpeechWithSSML completado, result.success: ${result?.success}`);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Calcular la URL pública
      const baseUrl = process.env.BASE_URL || 'https://saas-ai-automation.onrender.com';
      const publicUrl = `${baseUrl}/audio/${fileName}`;
      
      return {
        success: true,
        audioUrl: publicUrl,
        audioPath: outputPath,
        durationEstimate: this.estimateAudioDuration(responseText),
        voiceUsed: this.getVoiceById(voiceId || this.defaultVoice)
      };
    } catch (error) {
      logger.error(`❌ Error generando respuesta de bot Azure TTS: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Estimar duración del audio (aproximado)
  estimateAudioDuration(text) {
    // Aproximadamente 150 palabras por minuto en español
    const words = text.split(' ').length;
    const minutes = words / 150;
    return Math.ceil(minutes * 60); // Devolver en segundos
  }

  // Obtener lista de voces disponibles
  getAvailableVoices() {
    return this.availableVoices;
  }

  // Validar configuración
  isConfigured() {
    return !!this.subscriptionKey;
  }
}

module.exports = new AzureTTSService();
