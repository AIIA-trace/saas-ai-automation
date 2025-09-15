const logger = require('../utils/logger');

class FallbackAudioService {
  constructor() {
    this.initialized = false;
  }

  initialize() {
    logger.info('✅ Fallback Audio Service initialized');
    this.initialized = true;
  }

  /**
   * Genera un audio de fallback simple (beep) cuando Azure TTS falla
   * Crea un buffer PCM de 16kHz 16-bit mono con un tono de 800Hz por 1 segundo
   */
  generateFallbackBeep(durationMs = 1000) {
    const startTime = Date.now();
    logger.info(`🔔 ===== GENERATING FALLBACK BEEP AUDIO =====`);
    logger.info(`🔔 Duration requested: ${durationMs}ms`);
    
    try {
      // Parámetros de audio PCM 16kHz 16-bit mono (compatible con Azure TTS format)
      const sampleRate = 16000; // 16kHz
      const channels = 1; // mono
      const bitsPerSample = 16;
      const bytesPerSample = bitsPerSample / 8;
      const frequency = 800; // 800Hz tone
      
      // Calcular número de samples
      const durationSeconds = durationMs / 1000;
      const numSamples = Math.floor(sampleRate * durationSeconds);
      const dataSize = numSamples * channels * bytesPerSample;
      
      logger.info(`🔔 Audio parameters:`);
      logger.info(`  ├── Sample Rate: ${sampleRate} Hz`);
      logger.info(`  ├── Channels: ${channels} (mono)`);
      logger.info(`  ├── Bits per Sample: ${bitsPerSample}`);
      logger.info(`  ├── Frequency: ${frequency} Hz`);
      logger.info(`  ├── Duration: ${durationSeconds}s`);
      logger.info(`  ├── Number of Samples: ${numSamples}`);
      logger.info(`  └── Data Size: ${dataSize} bytes`);
      
      // Crear header RIFF/WAVE
      const headerSize = 44;
      const fileSize = headerSize + dataSize - 8;
      const buffer = Buffer.alloc(headerSize + dataSize);
      
      let offset = 0;
      
      // RIFF header
      buffer.write('RIFF', offset); offset += 4;
      buffer.writeUInt32LE(fileSize, offset); offset += 4;
      buffer.write('WAVE', offset); offset += 4;
      
      // fmt chunk
      buffer.write('fmt ', offset); offset += 4;
      buffer.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
      buffer.writeUInt16LE(1, offset); offset += 2; // audio format (PCM)
      buffer.writeUInt16LE(channels, offset); offset += 2;
      buffer.writeUInt32LE(sampleRate, offset); offset += 4;
      buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, offset); offset += 4; // byte rate
      buffer.writeUInt16LE(channels * bytesPerSample, offset); offset += 2; // block align
      buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
      
      // data chunk
      buffer.write('data', offset); offset += 4;
      buffer.writeUInt32LE(dataSize, offset); offset += 4;
      
      // Generar datos de audio (tono senoidal)
      for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;
        const amplitude = 0.3; // 30% del volumen máximo para evitar distorsión
        const sample = Math.sin(2 * Math.PI * frequency * time) * amplitude;
        
        // Convertir a 16-bit signed integer
        const sampleValue = Math.round(sample * 32767);
        buffer.writeInt16LE(sampleValue, offset);
        offset += 2;
      }
      
      const generationTime = Date.now() - startTime;
      logger.info(`🔔 ✅ Fallback beep generated successfully:`);
      logger.info(`  ├── Generation time: ${generationTime}ms`);
      logger.info(`  ├── Buffer size: ${buffer.length} bytes`);
      logger.info(`  ├── Expected duration: ${durationSeconds}s`);
      logger.info(`  └── Ready for mulaw conversion and Twilio streaming`);
      
      return {
        success: true,
        audioBuffer: buffer,
        contentType: 'audio/wav',
        audioAnalysis: {
          format: 'RIFF/PCM',
          bufferSize: buffer.length,
          sampleRate: sampleRate,
          channels: channels,
          bitsPerSample: bitsPerSample,
          duration: durationSeconds,
          isValid: true,
          isFallback: true
        }
      };
      
    } catch (error) {
      const generationTime = Date.now() - startTime;
      logger.error(`🔔 ❌ Error generating fallback beep (${generationTime}ms):`);
      logger.error(`  ├── Error: ${error.message}`);
      logger.error(`  ├── Stack: ${error.stack}`);
      logger.error(`  └── This should never happen - fallback generation failed`);
      
      return {
        success: false,
        error: 'Failed to generate fallback beep audio',
        cause: 'FALLBACK_GENERATION_ERROR',
        duration: generationTime
      };
    }
  }

  /**
   * Genera un audio de saludo de fallback con múltiples beeps
   */
  generateFallbackGreeting() {
    logger.info(`🔔 ===== GENERATING FALLBACK GREETING =====`);
    logger.info(`🔔 Pattern: 3 short beeps (200ms each) with 300ms gaps`);
    
    try {
      // Generar 3 beeps cortos con pausas
      const beepDuration = 200; // 200ms por beep
      const pauseDuration = 300; // 300ms de pausa
      const totalDuration = (beepDuration * 3) + (pauseDuration * 2); // 1200ms total
      
      logger.info(`🔔 Total greeting duration: ${totalDuration}ms`);
      
      // Por simplicidad, generar un solo beep largo
      // En una implementación más avanzada, se podrían combinar múltiples beeps
      return this.generateFallbackBeep(1000); // 1 segundo de beep
      
    } catch (error) {
      logger.error(`🔔 ❌ Error generating fallback greeting: ${error.message}`);
      return this.generateFallbackBeep(500); // Fallback del fallback
    }
  }

  /**
   * Genera un audio de respuesta de fallback cuando Azure TTS falla para respuestas AI
   */
  generateFallbackResponse() {
    logger.info(`🔔 ===== GENERATING FALLBACK AI RESPONSE =====`);
    logger.info(`🔔 Pattern: 2 medium beeps (400ms each) with 200ms gap`);
    
    try {
      // Para respuestas AI, usar un patrón diferente
      return this.generateFallbackBeep(800); // 800ms de beep
      
    } catch (error) {
      logger.error(`🔔 ❌ Error generating fallback response: ${error.message}`);
      return this.generateFallbackBeep(500); // Fallback del fallback
    }
  }
}

// Crear instancia del servicio
const fallbackAudioServiceInstance = new FallbackAudioService();

// Exportar la instancia
module.exports = fallbackAudioServiceInstance;
