const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class OpenAITTSService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.defaultVoice = 'onyx'; // Voz masculina profesional, mejor para español peninsular
    this.model = 'tts-1'; // Modelo más rápido para velocidad
    this.cache = new Map(); // Cache para audio
    this.cacheTimeout = 300000; // 5 minutos
  }

  // Generar audio a partir de texto
  async generateSpeech(text, voice = null, outputPath = null) {
    try {
      const selectedVoice = voice || this.defaultVoice;
      
      // Cache: verificar si ya se generó
      const cacheKey = `${text}-${selectedVoice}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info('🔄 Usando audio cacheado');
          return cached.result;
        }
      }
      
      logger.info(`🔍 DEBUG OpenAI TTS - Generando audio con voz: ${selectedVoice}`);
      logger.info(`🔍 DEBUG OpenAI TTS - Texto: "${text.substring(0, 50)}..."`);
      
      const mp3 = await this.openai.audio.speech.create({
        model: this.model,
        voice: selectedVoice,
        input: text,
        response_format: 'mp3'
      });
      
      logger.info(`🔍 DEBUG OpenAI TTS - Audio generado exitosamente`);
      
      // Convertir a buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Cachear resultado
      this.cache.set(cacheKey, { result: { success: true, audioBuffer: buffer }, timestamp: Date.now() });
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      // Si se especificó un path de salida, guardar el archivo
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, buffer);
        logger.info(`🎵 Audio OpenAI guardado en ${outputPath}`);
        
        return {
          success: true,
          outputPath,
          audioBuffer: buffer
        };
      }
      
      // De lo contrario, devolver el buffer de audio
      return {
        success: true,
        audioBuffer: buffer
      };
    } catch (error) {
      logger.error(`❌ Error generando audio OpenAI TTS: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar audio para una respuesta del bot de llamadas
  async generateBotResponse(responseText, voice = null) {
    try {
      logger.info(`🔍 DEBUG OpenAI TTS - generateBotResponse iniciado con texto: "${responseText.substring(0, 50)}..."`);  
      logger.info(`🔍 DEBUG OpenAI TTS - voz recibida: ${voice || this.defaultVoice}`);
      
      // Crear nombre de archivo único
      const timestamp = Date.now();
      const fileName = `bot_response_openai_${timestamp}.mp3`;
      const outputDir = path.join(__dirname, '../../public/audio');
      const outputPath = path.join(outputDir, fileName);
      
      logger.info(`🔍 DEBUG OpenAI TTS - Llamando a generateSpeech con outputPath: ${outputPath}`);
      
      // Generar el audio
      const result = await this.generateSpeech(responseText, voice, outputPath);
      
      logger.info(`🔍 DEBUG OpenAI TTS - generateSpeech completado, result.success: ${result?.success}`);
      
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
        durationEstimate: this.estimateAudioDuration(responseText)
      };
    } catch (error) {
      logger.error(`❌ Error generando respuesta de bot OpenAI TTS: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Estimar duración del audio basado en el texto
  // (aproximación simple: ~3 palabras por segundo)
  estimateAudioDuration(text) {
    const words = text.split(/\s+/).length;
    const durationSeconds = Math.ceil(words / 3);
    return durationSeconds;
  }

  // Listar voces disponibles
  getAvailableVoices() {
    return [
      { id: 'nova', name: 'Nova (Femenina, neutra)', language: 'es' },
      { id: 'shimmer', name: 'Shimmer (Femenina, expresiva)', language: 'es' },
      { id: 'onyx', name: 'Onyx (Masculina, profesional)', language: 'es' },
      { id: 'echo', name: 'Echo (Masculina, cálida)', language: 'es' },
      { id: 'alloy', name: 'Alloy (Neutra)', language: 'es' },
      { id: 'fable', name: 'Fable (Expresiva)', language: 'es' }
    ];
  }
}

module.exports = OpenAITTSService;
