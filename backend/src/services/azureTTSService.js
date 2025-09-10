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
    try {
      const selectedVoice = this.getVoiceById(voiceId || this.defaultVoice);
      
      logger.info(`🔍 DEBUG Azure TTS - Generando audio con voz: ${selectedVoice.name}`);
      logger.info(`🔍 DEBUG Azure TTS - Texto completo: "${text}"`);
      logger.info(`🔍 DEBUG Azure TTS - Longitud del texto: ${text.length} caracteres`);
      logger.info(`🔍 DEBUG Azure TTS - Azure Voice Name: ${selectedVoice.azureName}`);
      logger.info(`🔍 DEBUG Azure TTS - Output Path: ${outputPath || 'MEMORIA (no archivo)'}`);
      
      const speechConfig = this.getSpeechConfig();
      speechConfig.speechSynthesisVoiceName = selectedVoice.azureName;
      
      logger.info(`🔍 DEBUG Azure TTS - SpeechConfig configurado con voz: ${selectedVoice.azureName}`);
      logger.info(`🔍 DEBUG Azure TTS - Formato de salida: ${speechConfig.speechSynthesisOutputFormat}`);
      logger.info(`🔍 DEBUG Azure TTS - Idioma configurado: ${speechConfig.speechSynthesisLanguage}`);
      
      // Configurar salida
      let audioConfig;
      if (outputPath) {
        // Asegurar que el directorio existe antes de crear el archivo
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          logger.info(`🔍 DEBUG Azure TTS - Directorio creado: ${outputDir}`);
        }
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
        logger.info(`🔍 DEBUG Azure TTS - AudioConfig configurado para archivo: ${outputPath}`);
      } else {
        // Para Twilio, necesitamos audio en memoria, no speaker output
        audioConfig = null; // Esto hará que Azure TTS devuelva el audio en result.audioData
        logger.info(`🔍 DEBUG Azure TTS - AudioConfig configurado para salida en memoria (null)`);
      }
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      logger.info(`🔍 DEBUG Azure TTS - SpeechSynthesizer creado, iniciando síntesis...`);
      
      return new Promise((resolve, reject) => {
        // Timeout de 30 segundos para Azure TTS
        const timeout = setTimeout(() => {
          logger.error(`❌ TIMEOUT Azure TTS después de 30 segundos`);
          synthesizer.close();
          reject(new Error('Azure TTS timeout después de 30 segundos'));
        }, 30000);

        synthesizer.speakTextAsync(
          text,
          (result) => {
            clearTimeout(timeout);
            logger.info(`🔍 DEBUG Azure TTS - Callback ejecutado, reason: ${result.reason}`);
            
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const audioSize = result.audioData ? result.audioData.byteLength : 0;
              logger.info(`🎵 AZURE TTS SUCCESS - Audio generado: ${audioSize} bytes`);
              logger.info(`🔍 AZURE TTS SUCCESS - Clave usada: ${this.subscriptionKey?.substring(0, 8)}...`);
              logger.info(`🔍 AZURE TTS SUCCESS - Tipo de audioData: ${typeof result.audioData}`);
              logger.info(`🔍 AZURE TTS SUCCESS - AudioData es Buffer: ${Buffer.isBuffer(result.audioData)}`);
              logger.info(`🔍 AZURE TTS SUCCESS - AudioData constructor: ${result.audioData?.constructor?.name}`);
              
              // Analizar primeros bytes del audio para verificar formato
              if (result.audioData && result.audioData.byteLength > 0) {
                const firstBytes = Array.from(result.audioData.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
                logger.info(`🔍 AZURE TTS SUCCESS - Primeros 16 bytes (hex): ${firstBytes}`);
                
                // Verificar si es formato μ-law (valores típicos entre 0x00-0xFF)
                const isValidMulaw = Array.from(result.audioData.slice(0, 100)).every(b => b >= 0 && b <= 255);
                logger.info(`🔍 AZURE TTS SUCCESS - Formato parece μ-law válido: ${isValidMulaw}`);
              }
              
              if (outputPath) {
                // Verificar que el archivo se creó correctamente
                if (fs.existsSync(outputPath)) {
                  const stats = fs.statSync(outputPath);
                  logger.info(`🎵 Audio Azure guardado en ${outputPath} (${stats.size} bytes)`);
                } else {
                  logger.warn(`⚠️ Archivo de audio no encontrado en ${outputPath}`);
                }
                
                resolve({
                  success: true,
                  outputPath,
                  audioBuffer: result.audioData
                });
              } else {
                logger.info(`🔍 AZURE TTS SUCCESS - Retornando buffer en memoria de ${audioSize} bytes`);
                resolve({
                  success: true,
                  audioBuffer: result.audioData,
                  audioSize: audioSize,
                  format: 'Raw8Khz8BitMonoMULaw'
                });
              }
            } else if (result.reason === sdk.ResultReason.Canceled) {
              const cancellation = sdk.CancellationDetails.fromResult(result);
              logger.error(`❌ AZURE TTS CANCELED - Reason: ${cancellation.reason}`);
              logger.error(`❌ AZURE TTS CANCELED - Error Code: ${cancellation.errorCode}`);
              logger.error(`❌ AZURE TTS CANCELED - Details: ${cancellation.errorDetails}`);
              logger.error(`❌ AZURE TTS CANCELED - Clave usada: ${this.subscriptionKey?.substring(0, 8)}...`);
              reject(new Error(`Azure TTS Cancelado: ${cancellation.errorDetails}`));
            } else {
              logger.error(`❌ Error Azure TTS - Reason: ${result.reason}`);
              logger.error(`❌ Error Azure TTS - Details: ${result.errorDetails || 'Sin detalles'}`);
              reject(new Error(result.errorDetails || `Error desconocido: ${result.reason}`));
            }
            synthesizer.close();
          },
          (error) => {
            clearTimeout(timeout);
            logger.error(`❌ Error Azure TTS en callback: ${error}`);
            logger.error(`❌ Error type: ${typeof error}`);
            logger.error(`❌ Error message: ${error.message || error}`);
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      logger.error(`❌ Error generando audio Azure TTS: ${error.message}`);
      return {
        success: false,
        error: error.message
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
      
      // Configurar Azure Speech SDK
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY,
        process.env.AZURE_SPEECH_REGION
      );
      
      let audioConfig;
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
      } else {
        audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
      }
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      return new Promise((resolve, reject) => {
        // Timeout de 30 segundos para Azure TTS
        const timeout = setTimeout(() => {
          logger.error(`❌ TIMEOUT Azure TTS después de 30 segundos`);
          synthesizer.close();
          reject(new Error('Azure TTS timeout después de 30 segundos'));
        }, 30000);

        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            clearTimeout(timeout);
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              logger.info(`🎵 Audio Azure con SSML generado exitosamente`);
              
              if (outputPath && fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                logger.info(`🎵 Audio guardado: ${outputPath} (${stats.size} bytes)`);
              }
              
              resolve({
                success: true,
                outputPath,
                audioBuffer: result.audioData,
                voiceSettings: settings
              });
            } else {
              logger.error(`❌ Error en síntesis SSML: ${result.reason}`);
              logger.error(`❌ Detalles del error: ${result.errorDetails || 'No hay detalles'}`);
              logger.error(`❌ Código de resultado: ${result.reason} (${sdk.ResultReason[result.reason] || 'Desconocido'})`);
              logger.error(`❌ SSML problemático: ${ssml.substring(0, 500)}`);
              reject(new Error(`Error en síntesis SSML: ${result.reason} - ${result.errorDetails || 'Sin detalles'}`));
            }
            synthesizer.close();
          },
          (error) => {
            clearTimeout(timeout);
            logger.error(`❌ Error SSML Azure TTS: ${error}`);
            synthesizer.close();
            reject(error);
          }
        );
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
      
      logger.info(`🔍 DEBUG Azure TTS - Llamando a generateSpeech con outputPath: ${outputPath}`);
      
      // Generar el audio con configuración de voz
      const result = await this.generateSpeechWithSSML(responseText, voiceId, outputPath, voiceSettings);
      
      logger.info(`🔍 DEBUG Azure TTS - generateSpeech completado, result.success: ${result?.success}`);
      
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
