const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AzureTTSService {
  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
    this.region = process.env.AZURE_SPEECH_REGION || 'westeurope';
    
    // Voces españolas disponibles
    this.availableVoices = [
      {
        id: 'lola',
        name: 'Lola (Femenina España)',
        azureName: 'es-ES-LolaNeural',
        description: 'Voz femenina española con ceceo natural'
      },
      {
        id: 'dario',
        name: 'Dario (Masculino España)', 
        azureName: 'es-ES-DarioNeural',
        description: 'Voz masculina española con ceceo natural'
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
    
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    
    // FORZAR el uso del endpoint REST en lugar de WebSocket
    const restEndpoint = `https://${this.region}.api.cognitive.microsoft.com/`;
    speechConfig.endpointId = restEndpoint;
    
    // Configurar formato de salida
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
    logger.info(`🔍 DEBUG Azure TTS - Usando endpoint REST: ${restEndpoint}`);
    
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
      logger.info(`🔍 DEBUG Azure TTS - Texto: "${text.substring(0, 50)}..."`);
      
      const speechConfig = this.getSpeechConfig();
      speechConfig.speechSynthesisVoiceName = selectedVoice.azureName;
      
      // Configurar salida
      let audioConfig;
      if (outputPath) {
        audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
      } else {
        audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
      }
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
      
      return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              logger.info(`🎵 Audio Azure generado exitosamente`);
              
              if (outputPath) {
                logger.info(`🎵 Audio Azure guardado en ${outputPath}`);
                resolve({
                  success: true,
                  outputPath,
                  audioBuffer: result.audioData
                });
              } else {
                resolve({
                  success: true,
                  audioBuffer: result.audioData
                });
              }
            } else {
              logger.error(`❌ Error Azure TTS: ${result.errorDetails}`);
              reject(new Error(result.errorDetails));
            }
            synthesizer.close();
          },
          (error) => {
            logger.error(`❌ Error Azure TTS: ${error}`);
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

  // Generar audio para una respuesta del bot de llamadas
  async generateBotResponse(responseText, voiceId = null) {
    try {
      logger.info(`🔍 DEBUG Azure TTS - generateBotResponse iniciado con texto: "${responseText.substring(0, 50)}..."`);  
      logger.info(`🔍 DEBUG Azure TTS - voz recibida: ${voiceId || this.defaultVoice}`);
      
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
      
      // Generar el audio
      const result = await this.generateSpeech(responseText, voiceId, outputPath);
      
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

module.exports = AzureTTSService;
