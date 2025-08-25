const express = require('express');
const router = express.Router();
const openaiTTSService = require('../services/openaiTTSService');
const logger = require('../utils/logger');

// Texto de prueba en español peninsular
const testText = "Hola, soy tu asistente de inteligencia artificial. Gracias por llamar a nuestra empresa. ¿En qué puedo ayudarte hoy? Mi pronunciación es clara y natural.";

// Lista de todas las voces disponibles en OpenAI TTS
const availableVoices = [
  { id: 'alloy', name: 'Alloy (Neutra)', description: 'Voz neutra y equilibrada' },
  { id: 'echo', name: 'Echo (Masculina cálida)', description: 'Voz masculina cálida y amigable' },
  { id: 'fable', name: 'Fable (Expresiva)', description: 'Voz expresiva y dramática' },
  { id: 'onyx', name: 'Onyx (Masculina profesional)', description: 'Voz masculina profunda y profesional' },
  { id: 'nova', name: 'Nova (Femenina neutra)', description: 'Voz femenina clara y neutra' },
  { id: 'shimmer', name: 'Shimmer (Femenina expresiva)', description: 'Voz femenina suave y expresiva' }
];

// Endpoint para listar todas las voces disponibles
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    voices: availableVoices,
    testText: testText,
    models: ['tts-1', 'tts-1-hd']
  });
});

// Endpoint para generar audio con una voz específica
router.post('/voice/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params;
    const { text, model } = req.body;
    
    const textToUse = text || testText;
    const modelToUse = model || 'tts-1-hd';
    
    logger.info(`🎵 Generando audio de prueba con voz: ${voiceId}, modelo: ${modelToUse}`);
    
    // Verificar que la voz existe
    const voice = availableVoices.find(v => v.id === voiceId);
    if (!voice) {
      return res.status(400).json({
        success: false,
        error: `Voz '${voiceId}' no encontrada`,
        availableVoices: availableVoices.map(v => v.id)
      });
    }
    
    // Generar el audio
    const result = await openaiTTSService.generateBotResponse(textToUse, voiceId);
    
    if (result.success) {
      res.json({
        success: true,
        voice: voice,
        model: modelToUse,
        audioUrl: result.audioUrl,
        duration: result.durationEstimate,
        text: textToUse
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error(`Error generando audio de prueba: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para generar todas las voces de una vez
router.post('/all-voices', async (req, res) => {
  try {
    const { text, model } = req.body;
    const textToUse = text || testText;
    const modelToUse = model || 'tts-1-hd';
    
    logger.info(`🎵 Generando audio para todas las voces con modelo: ${modelToUse}`);
    
    const results = [];
    
    for (const voice of availableVoices) {
      try {
        logger.info(`Generando audio para voz: ${voice.id}`);
        const result = await openaiTTSService.generateBotResponse(textToUse, voice.id);
        
        results.push({
          voice: voice,
          success: result.success,
          audioUrl: result.success ? result.audioUrl : null,
          duration: result.success ? result.durationEstimate : null,
          error: result.success ? null : result.error
        });
        
        // Pequeña pausa entre generaciones para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        logger.error(`Error con voz ${voice.id}: ${error.message}`);
        results.push({
          voice: voice,
          success: false,
          audioUrl: null,
          duration: null,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      model: modelToUse,
      text: textToUse,
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    logger.error(`Error generando todas las voces: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
