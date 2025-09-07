const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class RealtimeTranscription {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  /**
   * Asegurar que existe directorio temporal
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      logger.info(`📁 Directorio temporal creado: ${this.tempDir}`);
    }
  }

  /**
   * Transcribir buffer de audio con Whisper
   */
  async transcribeAudioBuffer(audioBuffer, language = 'es') {
    const transcriptionId = this.generateTranscriptionId();
    
    try {
      logger.info(`🎤 [${transcriptionId}] Iniciando transcripción (${audioBuffer.length} bytes)`);

      // Convertir buffer a formato WAV temporal
      const tempFilePath = await this.bufferToTempFile(audioBuffer, transcriptionId);
      
      // Transcribir con Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: language,
        response_format: 'json',
        temperature: 0.2 // Más determinístico
      });

      // Limpiar archivo temporal
      this.cleanupTempFile(tempFilePath);

      const text = transcription.text?.trim();
      
      if (text && text.length > 0) {
        logger.info(`✅ [${transcriptionId}] Transcripción: "${text}"`);
        return {
          success: true,
          text: text,
          confidence: this.estimateConfidence(text),
          duration: transcription.duration || 0
        };
      } else {
        logger.warn(`⚠️ [${transcriptionId}] Transcripción vacía`);
        return {
          success: false,
          text: '',
          error: 'Transcripción vacía'
        };
      }

    } catch (error) {
      logger.error(`❌ [${transcriptionId}] Error transcribiendo: ${error.message}`);
      return {
        success: false,
        text: '',
        error: error.message
      };
    }
  }

  /**
   * Convertir buffer de audio a archivo temporal WAV
   */
  async bufferToTempFile(audioBuffer, transcriptionId) {
    const tempFilePath = path.join(this.tempDir, `audio_${transcriptionId}.wav`);
    
    try {
      // Crear header WAV para audio mulaw 8kHz mono
      const wavHeader = this.createWavHeader(audioBuffer.length);
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
      
      // Escribir archivo temporal
      fs.writeFileSync(tempFilePath, wavBuffer);
      
      logger.debug(`📁 [${transcriptionId}] Archivo temporal creado: ${tempFilePath}`);
      return tempFilePath;
      
    } catch (error) {
      logger.error(`❌ [${transcriptionId}] Error creando archivo temporal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crear header WAV para audio mulaw 8kHz mono
   */
  createWavHeader(dataLength) {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(7, 20);  // format (mulaw)
    header.writeUInt16LE(1, 22);  // channels
    header.writeUInt32LE(8000, 24); // sample rate
    header.writeUInt32LE(8000, 28); // byte rate
    header.writeUInt16LE(1, 32);  // block align
    header.writeUInt16LE(8, 34);  // bits per sample
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  /**
   * Limpiar archivo temporal
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`🗑️ Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      logger.warn(`⚠️ Error eliminando archivo temporal: ${error.message}`);
    }
  }

  /**
   * Estimar confianza de transcripción
   */
  estimateConfidence(text) {
    // Heurísticas simples para estimar confianza
    let confidence = 0.5; // Base
    
    // Longitud del texto
    if (text.length > 10) confidence += 0.2;
    if (text.length > 30) confidence += 0.1;
    
    // Presencia de palabras comunes en español
    const commonWords = ['hola', 'gracias', 'por favor', 'sí', 'no', 'bien', 'mal'];
    const foundWords = commonWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    confidence += foundWords * 0.05;
    
    // Penalizar texto muy corto o con muchos caracteres raros
    if (text.length < 3) confidence -= 0.3;
    if (/[^\w\s\.,\?¿¡!áéíóúñü]/gi.test(text)) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Detectar si el usuario ha terminado de hablar
   */
  detectSpeechEnd(audioBuffer, silenceThreshold = 0.01, silenceDuration = 1000) {
    // Análisis simple de amplitud para detectar silencio
    const samples = new Uint8Array(audioBuffer);
    let silentSamples = 0;
    
    for (const sample of samples) {
      // Convertir mulaw a amplitud aproximada
      const amplitude = Math.abs(sample - 127) / 127;
      if (amplitude < silenceThreshold) {
        silentSamples++;
      }
    }
    
    const silenceRatio = silentSamples / samples.length;
    const estimatedSilenceDuration = silenceRatio * (samples.length / 8); // 8kHz
    
    return estimatedSilenceDuration > silenceDuration;
  }

  /**
   * Procesar audio en chunks con detección de final de frase
   */
  async processAudioChunks(audioChunks, language = 'es') {
    const combinedBuffer = Buffer.concat(audioChunks);
    
    // Detectar si hay suficiente audio para transcribir
    if (combinedBuffer.length < 1600) { // ~200ms a 8kHz
      return {
        success: false,
        text: '',
        error: 'Audio insuficiente'
      };
    }
    
    // Detectar final de frase
    const speechEnded = this.detectSpeechEnd(combinedBuffer);
    
    if (speechEnded) {
      logger.debug(`🎤 Final de frase detectado, transcribiendo...`);
      return await this.transcribeAudioBuffer(combinedBuffer, language);
    } else {
      return {
        success: false,
        text: '',
        error: 'Usuario aún hablando'
      };
    }
  }

  /**
   * Limpiar directorio temporal
   */
  cleanupTempDirectory() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        // Eliminar archivos más antiguos de 5 minutos
        if (now - stats.mtime.getTime() > 5 * 60 * 1000) {
          fs.unlinkSync(filePath);
          logger.debug(`🗑️ Archivo temporal antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Error limpiando directorio temporal: ${error.message}`);
    }
  }

  /**
   * Generar ID único para transcripción
   */
  generateTranscriptionId() {
    return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Test de transcripción
   */
  async testTranscription() {
    try {
      // Crear buffer de audio de prueba (silencio)
      const testBuffer = Buffer.alloc(8000); // 1 segundo de silencio
      
      const result = await this.transcribeAudioBuffer(testBuffer);
      
      if (result.success || result.error === 'Transcripción vacía') {
        logger.info('✅ Test de transcripción exitoso');
        return true;
      } else {
        logger.error(`❌ Test de transcripción falló: ${result.error}`);
        return false;
      }
      
    } catch (error) {
      logger.error(`❌ Test de transcripción falló: ${error.message}`);
      return false;
    }
  }

  /**
   * Iniciar limpieza automática
   */
  startAutoCleanup() {
    // Limpiar archivos temporales cada 5 minutos
    setInterval(() => {
      this.cleanupTempDirectory();
    }, 5 * 60 * 1000);
    
    logger.info('🧹 Auto-limpieza de archivos temporales iniciada');
  }
}

module.exports = RealtimeTranscription;
