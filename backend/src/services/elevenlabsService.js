const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel (voz por defecto)
    this.headers = {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'AIIA-Trace-Bot/1.0'
    };
  }

  // Listar voces disponibles
  async listVoices() {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: this.headers
      });
      
      return {
        success: true,
        voices: response.data.voices.map(voice => ({
          id: voice.voice_id,
          name: voice.name,
          preview: voice.preview_url
        }))
      };
    } catch (error) {
      logger.error(`Error obteniendo voces: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar audio a partir de texto
  async generateSpeech(text, voiceId = null, outputPath = null) {
    try {
      const selectedVoiceId = voiceId || this.defaultVoiceId;
      
      // Parámetros para una voz natural y clara
      const voiceSettings = {
        stability: 0.75, // Balance entre estabilidad y variedad
        similarity_boost: 0.75, // Similitud a la voz original
        use_speaker_boost: true // Mejora la claridad
      };
      
      // DEBUG: Log de la petición
      logger.info(`🔍 DEBUG - Intentando generar audio con voz: ${selectedVoiceId}`);
      logger.info(`🔍 DEBUG - URL: ${this.baseUrl}/text-to-speech/${selectedVoiceId}`);
      logger.info(`🔍 DEBUG - Headers: ${JSON.stringify(this.headers)}`);
      
      // Intentar una sola vez - si falla, usar fallback inmediatamente
      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/text-to-speech/${selectedVoiceId}`,
        data: {
          text,
          model_id: "eleven_monolingual_v1",
          // Removemos voice_settings temporalmente
        },
        headers: this.headers,
        responseType: 'arraybuffer',
        timeout: 5000 // 5 segundos timeout más rápido
      });
      
      logger.info(`🔍 DEBUG - Petición exitosa a ElevenLabs`);
      
      // Si se especificó un path de salida, guardar el archivo
      if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, Buffer.from(response.data));
        logger.info(`Audio guardado en ${outputPath}`);
        
        return {
          success: true,
          outputPath,
          audioBuffer: response.data
        };
      }
      
      // De lo contrario, devolver el buffer de audio
      return {
        success: true,
        audioBuffer: response.data
      };
    } catch (error) {
      logger.error(`Error generando audio: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar audio para una respuesta del bot de llamadas
  async generateBotResponse(responseText, voiceId = null) {
    try {
      logger.info(`🔍 DEBUG - generateBotResponse iniciado con texto: "${responseText.substring(0, 50)}..."`);  
      logger.info(`🔍 DEBUG - voiceId recibido: ${voiceId}`);
      
      // Crear nombre de archivo único
      const timestamp = Date.now();
      const fileName = `bot_response_${timestamp}.mp3`;
      const outputDir = path.join(__dirname, '../../public/audio');
      const outputPath = path.join(outputDir, fileName);
      
      logger.info(`🔍 DEBUG - Llamando a generateSpeech con outputPath: ${outputPath}`);
      
      // Generar el audio
      const result = await this.generateSpeech(responseText, voiceId, outputPath);
      
      logger.info(`🔍 DEBUG - generateSpeech completado, result.success: ${result?.success}`);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Calcular la URL pública
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const publicUrl = `${baseUrl}/audio/${fileName}`;
      
      return {
        success: true,
        audioUrl: publicUrl,
        audioPath: outputPath,
        durationEstimate: this.estimateAudioDuration(responseText)
      };
    } catch (error) {
      logger.error(`Error generando respuesta de bot: ${error.message}`);
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
}

module.exports = new ElevenLabsService();
