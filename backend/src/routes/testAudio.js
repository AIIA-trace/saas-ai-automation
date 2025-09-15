const express = require('express');
const router = express.Router();
const azureTTSService = require('../services/azureTTSRestService');
const logger = require('../utils/logger');

/**
 * Endpoint para generar y descargar audio de prueba desde Azure TTS
 * GET /api/test-audio?text=texto&voice=voz
 */
router.get('/', async (req, res) => {
  const testId = `TEST_${Date.now()}`;
  
  try {
    logger.info(`🎵 [${testId}] ===== GENERANDO AUDIO DE PRUEBA =====`);
    
    // Parámetros de la solicitud
    const text = req.query.text || 'Hola, ha llamado a Tech Solutions. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?';
    const voice = req.query.voice || 'es-ES-DarioNeural';
    const format = req.query.format || 'riff-16khz-16bit-mono-pcm';
    
    logger.info(`🎵 [${testId}] Parámetros:`);
    logger.info(`🎵 [${testId}]   - Texto: "${text.substring(0, 50)}..."`);
    logger.info(`🎵 [${testId}]   - Voz: ${voice}`);
    logger.info(`🎵 [${testId}]   - Formato: ${format}`);
    
    // Generar audio con Azure TTS
    const startTime = Date.now();
    const result = await azureTTSService.generateSpeech(text, voice, format);
    const duration = Date.now() - startTime;
    
    logger.info(`🎵 [${testId}] Azure TTS completado en ${duration}ms`);
    logger.info(`🎵 [${testId}] Resultado:`);
    logger.info(`🎵 [${testId}]   - Success: ${result?.success}`);
    logger.info(`🎵 [${testId}]   - Error: ${result?.error || 'ninguno'}`);
    logger.info(`🎵 [${testId}]   - Audio buffer: ${result?.audioBuffer ? result.audioBuffer.length + ' bytes' : 'null'}`);
    
    if (!result || !result.success || !result.audioBuffer) {
      logger.error(`❌ [${testId}] Azure TTS falló: ${result?.error || 'Error desconocido'}`);
      return res.status(500).json({
        success: false,
        error: result?.error || 'Azure TTS falló',
        testId: testId
      });
    }
    
    // Preparar respuesta con audio
    const audioBuffer = Buffer.from(result.audioBuffer);
    
    logger.info(`✅ [${testId}] Audio generado exitosamente:`);
    logger.info(`🎵 [${testId}]   - Tamaño: ${audioBuffer.length} bytes`);
    logger.info(`🎵 [${testId}]   - Duración generación: ${duration}ms`);
    
    // Detectar tipo MIME según formato
    let mimeType = 'audio/wav';
    let fileExtension = 'wav';
    
    if (format.includes('mp3')) {
      mimeType = 'audio/mpeg';
      fileExtension = 'mp3';
    } else if (format.includes('ogg')) {
      mimeType = 'audio/ogg';
      fileExtension = 'ogg';
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="azure-tts-test-${testId}.${fileExtension}"`);
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('X-Test-ID', testId);
    res.setHeader('X-Generation-Time', `${duration}ms`);
    res.setHeader('X-Audio-Size', `${audioBuffer.length} bytes`);
    res.setHeader('X-Voice-Used', voice);
    
    logger.info(`📤 [${testId}] Enviando audio al cliente...`);
    
    // Enviar audio
    res.send(audioBuffer);
    
    logger.info(`✅ [${testId}] Audio enviado exitosamente al cliente`);
    
  } catch (error) {
    logger.error(`❌ [${testId}] Error generando audio de prueba:`);
    logger.error(`❌ [${testId}]   - Error: ${error.message}`);
    logger.error(`❌ [${testId}]   - Stack: ${error.stack}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      testId: testId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Endpoint para listar voces disponibles
 * GET /api/test-audio/voices
 */
router.get('/voices', (req, res) => {
  const availableVoices = [
    { id: 'es-ES-DarioNeural', name: 'Dario (Español - Masculino)', language: 'es-ES' },
    { id: 'es-ES-ElviraNeural', name: 'Elvira (Español - Femenino)', language: 'es-ES' },
    { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Español - Masculino)', language: 'es-ES' },
    { id: 'en-US-LolaMultilingualNeural', name: 'Lola (Inglés/Multilingüe - Femenino)', language: 'en-US' },
    { id: 'es-ES-ArabellaMultilingualNeural', name: 'Arabella (Español/Multilingüe - Femenino)', language: 'es-ES' }
  ];
  
  res.json({
    success: true,
    voices: availableVoices,
    total: availableVoices.length
  });
});

/**
 * Endpoint para obtener formatos disponibles
 * GET /api/test-audio/formats
 */
router.get('/formats', (req, res) => {
  const availableFormats = [
    { id: 'riff-16khz-16bit-mono-pcm', name: 'WAV PCM 16kHz 16-bit Mono', extension: 'wav' },
    { id: 'audio-16khz-128kbitrate-mono-mp3', name: 'MP3 16kHz 128kbps Mono', extension: 'mp3' },
    { id: 'ogg-16khz-16bit-mono-opus', name: 'OGG Opus 16kHz 16-bit Mono', extension: 'ogg' },
    { id: 'riff-24khz-16bit-mono-pcm', name: 'WAV PCM 24kHz 16-bit Mono', extension: 'wav' }
  ];
  
  res.json({
    success: true,
    formats: availableFormats,
    total: availableFormats.length
  });
});

module.exports = router;
