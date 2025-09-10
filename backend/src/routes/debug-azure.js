const express = require('express');
const router = express.Router();
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const logger = require('../utils/logger');

// Endpoint para probar Azure TTS en producción
router.get('/test-azure-tts', async (req, res) => {
  try {
    logger.info('🔍 DIAGNÓSTICO: Iniciando test de Azure TTS en producción');
    
    // Verificar variables de entorno
    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION;
    
    logger.info(`🔍 DIAGNÓSTICO: Azure Key: ${azureKey ? 'CONFIGURADA' : 'FALTANTE'}`);
    logger.info(`🔍 DIAGNÓSTICO: Azure Region: ${azureRegion}`);
    
    if (!azureKey || !azureRegion) {
      return res.status(500).json({
        success: false,
        error: 'Variables de entorno Azure faltantes',
        key: !!azureKey,
        region: !!azureRegion
      });
    }
    
    // Configurar Azure TTS
    const speechConfig = sdk.SpeechConfig.fromSubscription(azureKey, azureRegion);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;
    speechConfig.speechSynthesisVoiceName = 'en-US-LolaMultilingualNeural';
    speechConfig.speechSynthesisLanguage = 'es-ES';
    
    logger.info('🔍 DIAGNÓSTICO: SpeechConfig creado correctamente');
    
    // Crear synthesizer con AudioConfig null (memoria)
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
    logger.info('🔍 DIAGNÓSTICO: SpeechSynthesizer creado correctamente');
    
    const testText = "Hola, esto es una prueba de Azure TTS en producción";
    const startTime = Date.now();
    
    logger.info(`🔍 DIAGNÓSTICO: Iniciando síntesis: "${testText}"`);
    
    // Test con timeout de 10 segundos
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.error('🔍 DIAGNÓSTICO: TIMEOUT después de 10 segundos');
        synthesizer.close();
        reject(new Error('Timeout después de 10 segundos'));
      }, 10000);
      
      synthesizer.speakTextAsync(
        testText,
        (result) => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          logger.info(`🔍 DIAGNÓSTICO: Síntesis completada en ${duration}ms`);
          logger.info(`🔍 DIAGNÓSTICO: Result reason: ${result.reason}`);
          logger.info(`🔍 DIAGNÓSTICO: Audio data: ${result.audioData ? result.audioData.byteLength : 0} bytes`);
          synthesizer.close();
          resolve(result);
        },
        (error) => {
          clearTimeout(timeout);
          logger.error(`🔍 DIAGNÓSTICO: Error en síntesis: ${error}`);
          synthesizer.close();
          reject(error);
        }
      );
    });
    
    const duration = Date.now() - startTime;
    
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      logger.info('🔍 DIAGNÓSTICO: ✅ SUCCESS - Azure TTS funciona en producción');
      res.json({
        success: true,
        message: 'Azure TTS funciona correctamente en producción',
        duration: duration,
        audioSize: result.audioData ? result.audioData.byteLength : 0,
        reason: result.reason
      });
    } else {
      logger.error('🔍 DIAGNÓSTICO: ❌ FAILED - Síntesis no completada');
      res.status(500).json({
        success: false,
        error: 'Síntesis no completada correctamente',
        reason: result.reason,
        duration: duration
      });
    }
    
  } catch (error) {
    logger.error(`🔍 DIAGNÓSTICO: ❌ ERROR: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
