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
   * Transcribir buffer de audio con Whisper (OPTIMIZADO)
   */
  async transcribeAudioBuffer(audioBuffer, language = 'es') {
    const transcriptionId = this.generateTranscriptionId();
    
    try {
      logger.info(`🎤 [${transcriptionId}] Iniciando transcripción optimizada (${audioBuffer.length} bytes)`);

      // Convertir mulaw a PCM para mejor calidad
      const pcmBuffer = this.convertMulawToPCM(audioBuffer);
      
      // Crear archivo WAV con audio PCM
      const tempFilePath = await this.bufferToTempFile(pcmBuffer, transcriptionId, 'pcm');
      
      // Transcribir con Whisper OPTIMIZADO
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: language,
        response_format: 'verbose_json', // Más información
        temperature: 0.0, // Máxima determinismo
        prompt: "Esta es una conversación telefónica de una recepcionista. Transcribe exactamente lo que dice el cliente." // Contexto específico
      });

      // Limpiar archivo temporal
      this.cleanupTempFile(tempFilePath);

      let text = transcription.text?.trim();
      
      if (text && text.length > 0) {
        // Post-procesamiento para limpiar transcripción
        text = this.cleanTranscription(text);
        
        // Usar confianza real de Whisper si está disponible
        const confidence = transcription.segments ? 
          this.calculateRealConfidence(transcription.segments) : 
          this.estimateConfidence(text);
        
        logger.info(`✅ [${transcriptionId}] Transcripción limpia: "${text}" (confianza: ${confidence})`);
        return {
          success: true,
          text: text,
          confidence: confidence,
          duration: transcription.duration || 0,
          language: transcription.language || language
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
  async bufferToTempFile(audioBuffer, transcriptionId, format = 'mulaw') {
    const tempFilePath = path.join(this.tempDir, `audio_${transcriptionId}.wav`);
    
    try {
      // Crear header WAV según el formato
      const wavHeader = format === 'pcm' ? 
        this.createPCMWavHeader(audioBuffer.length) : 
        this.createWavHeader(audioBuffer.length);
      
      const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);
      
      // Escribir archivo temporal
      fs.writeFileSync(tempFilePath, wavBuffer);
      
      logger.debug(`📁 [${transcriptionId}] Archivo ${format.toUpperCase()} creado: ${tempFilePath}`);
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
   * Crear header WAV para audio PCM 16-bit 8kHz mono
   */
  createPCMWavHeader(dataLength) {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20);  // format (PCM)
    header.writeUInt16LE(1, 22);  // channels
    header.writeUInt32LE(8000, 24); // sample rate
    header.writeUInt32LE(16000, 28); // byte rate (8000 * 2)
    header.writeUInt16LE(2, 32);  // block align
    header.writeUInt16LE(16, 34); // bits per sample
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  /**
   * Convertir audio mulaw a PCM 16-bit para mejor calidad
   */
  convertMulawToPCM(mulawBuffer) {
    const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
    
    // Tabla de conversión mulaw a PCM
    const mulawToPcm = [
      -32124,-31100,-30076,-29052,-28028,-27004,-25980,-24956,
      -23932,-22908,-21884,-20860,-19836,-18812,-17788,-16764,
      -15996,-15484,-14972,-14460,-13948,-13436,-12924,-12412,
      -11900,-11388,-10876,-10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052,  -988,  -924,
      -876,  -844,  -812,  -780,  -748,  -716,  -684,  -652,
      -620,  -588,  -556,  -524,  -492,  -460,  -428,  -396,
      -372,  -356,  -340,  -324,  -308,  -292,  -276,  -260,
      -244,  -228,  -212,  -196,  -180,  -164,  -148,  -132,
      -120,  -112,  -104,   -96,   -88,   -80,   -72,   -64,
      -56,   -48,   -40,   -32,   -24,   -16,    -8,     0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364,  9852,  9340,  8828,  8316,
      7932,  7676,  7420,  7164,  6908,  6652,  6396,  6140,
      5884,  5628,  5372,  5116,  4860,  4604,  4348,  4092,
      3900,  3772,  3644,  3516,  3388,  3260,  3132,  3004,
      2876,  2748,  2620,  2492,  2364,  2236,  2108,  1980,
      1884,  1820,  1756,  1692,  1628,  1564,  1500,  1436,
      1372,  1308,  1244,  1180,  1116,  1052,   988,   924,
      876,   844,   812,   780,   748,   716,   684,   652,
      620,   588,   556,   524,   492,   460,   428,   396,
      372,   356,   340,   324,   308,   292,   276,   260,
      244,   228,   212,   196,   180,   164,   148,   132,
      120,   112,   104,    96,    88,    80,    72,    64,
      56,    48,    40,    32,    24,    16,     8,     0
    ];
    
    for (let i = 0; i < mulawBuffer.length; i++) {
      const pcmValue = mulawToPcm[mulawBuffer[i]];
      pcmBuffer.writeInt16LE(pcmValue, i * 2);
    }
    
    return pcmBuffer;
  }

  /**
   * Limpiar transcripción de artefactos comunes
   */
  cleanTranscription(text) {
    return text
      // Eliminar repeticiones excesivas
      .replace(/(.)\1{3,}/g, '$1$1')
      // Limpiar espacios múltiples
      .replace(/\s+/g, ' ')
      // Eliminar caracteres extraños al inicio/final
      .replace(/^[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+|[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9.!?]+$/g, '')
      // Capitalizar primera letra
      .replace(/^[a-záéíóúñ]/, match => match.toUpperCase())
      .trim();
  }

  /**
   * Calcular confianza real basada en segmentos de Whisper
   */
  calculateRealConfidence(segments) {
    if (!segments || segments.length === 0) return 0.5;
    
    const avgConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || -1.0);
    }, 0) / segments.length;
    
    // Convertir logprob a confianza (aproximado)
    return Math.max(0, Math.min(1, (avgConfidence + 1.0) / 1.0));
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
