const express = require('express');
const router = express.Router();
const azureTTSRestService = require('../services/azureTTSRestService');
const logger = require('../utils/logger');

// Cache para audios generados (evita regenerar el mismo texto)
const audioCache = new Map();
const AUDIO_CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

/**
 * POST /api/azure-tts/generate
 * Generar audio con Azure TTS
 */
router.post('/generate', async (req, res) => {
    try {
        const { text, voice, clientId } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Texto requerido'
            });
        }
        
        // Crear clave de caché basada en texto y voz
        const cacheKey = `${text}_${voice || 'default'}`;
        const cached = audioCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < AUDIO_CACHE_DURATION) {
            logger.info(`🎵 Usando audio cacheado para: ${text.substring(0, 30)}...`);
            return res.json({
                success: true,
                audioUrl: cached.audioUrl,
                cached: true,
                voice: cached.voice
            });
        }
        
        logger.info(`🎵 Generando nuevo audio Azure TTS para cliente ${clientId}: ${text.substring(0, 50)}...`);
        
        // Usar voz por defecto si no se especifica
        const selectedVoice = voice || 'en-US-LolaMultilingualNeural';
        
        const result = await azureTTSRestService.generateBotResponse(text, selectedVoice);
        
        if (result.success) {
            // Guardar en caché
            audioCache.set(cacheKey, {
                audioUrl: result.audioUrl,
                voice: selectedVoice,
                timestamp: Date.now()
            });
            
            logger.info(`✅ Audio Azure TTS generado exitosamente: ${result.audioUrl}`);
            
            res.json({
                success: true,
                audioUrl: result.audioUrl,
                voice: selectedVoice,
                duration: result.durationEstimate,
                cached: false
            });
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        logger.error(`❌ Error generando audio Azure TTS: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error generando audio con Azure TTS'
        });
    }
});

/**
 * GET /api/azure-tts/voices
 * Obtener lista de voces disponibles
 */
router.get('/voices', async (req, res) => {
    try {
        const voices = [
            {
                id: 'lola',
                name: 'Lola (Multilingüe)',
                gender: 'Female',
                locale: 'es-ES',
                azureName: 'en-US-LolaMultilingualNeural'
            },
            {
                id: 'dario',
                name: 'Dario (Español)',
                gender: 'Male',
                locale: 'es-ES',
                azureName: 'es-ES-DarioNeural'
            }
        ];
        
        res.json({
            success: true,
            voices: voices
        });
        
    } catch (error) {
        logger.error(`❌ Error obteniendo voces: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo voces disponibles'
        });
    }
});

/**
 * DELETE /api/azure-tts/cache
 * Limpiar caché de audios
 */
router.delete('/cache', async (req, res) => {
    try {
        const cacheSize = audioCache.size;
        audioCache.clear();
        
        logger.info(`🗑️ Caché de audios limpiado: ${cacheSize} elementos eliminados`);
        
        res.json({
            success: true,
            message: `Caché limpiado: ${cacheSize} audios eliminados`
        });
        
    } catch (error) {
        logger.error(`❌ Error limpiando caché: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error limpiando caché'
        });
    }
});

/**
 * GET /api/azure-tts/status
 * Verificar estado de Azure TTS
 */
router.get('/status', async (req, res) => {
    try {
        const isConfigured = azureTTSRestService.isConfigured();
        
        res.json({
            success: true,
            configured: isConfigured,
            cacheSize: audioCache.size,
            service: 'Azure Text-to-Speech'
        });
        
    } catch (error) {
        logger.error(`❌ Error verificando estado Azure TTS: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error verificando estado'
        });
    }
});

module.exports = router;
