const express = require('express');
const router = express.Router();
const { authenticate } = require('./auth');
const twilioService = require('../services/twilioService');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/twilio/my-numbers
 * Obtener números Twilio del usuario autenticado
 */
router.get('/my-numbers', authenticate, async (req, res) => {
    try {
        logger.info(`📞 Obteniendo números Twilio para cliente ${req.client.id}`);
        
        // Buscar números Twilio del usuario en la base de datos
        const twilioNumbers = await prisma.twilioNumber.findMany({
            where: {
                clientId: req.client.id,
                status: 'active'
            },
            select: {
                id: true,
                phoneNumber: true,
                friendlyName: true,
                sid: true,
                status: true,
                capabilities: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        logger.info(`✅ Encontrados ${twilioNumbers.length} números para cliente ${req.client.id}`);
        
        res.json({
            success: true,
            numbers: twilioNumbers
        });
        
    } catch (error) {
        logger.error(`❌ Error obteniendo números Twilio: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo números Twilio'
        });
    }
});

/**
 * POST /api/twilio/purchase-number
 * Comprar un nuevo número Twilio para el usuario
 */
router.post('/purchase-number', authenticate, async (req, res) => {
    try {
        const { countryCode = 'US', areaCode } = req.body;
        
        logger.info(`💰 Comprando número Twilio para cliente ${req.client.id}`, {
            countryCode,
            areaCode
        });
        
        // Verificar si ya tiene un número activo
        const existingNumber = await prisma.twilioNumber.findFirst({
            where: {
                clientId: req.client.id,
                status: 'active'
            }
        });
        
        if (existingNumber) {
            logger.info(`ℹ️ Cliente ${req.client.id} ya tiene número activo: ${existingNumber.phoneNumber}`);
            return res.json({
                success: true,
                phoneNumber: existingNumber.phoneNumber,
                message: 'Ya tienes un número Twilio asignado'
            });
        }
        
        // Comprar nuevo número usando TwilioService
        const result = await twilioService.purchaseNumber(req.client.id, {
            countryCode,
            areaCode
        });
        
        logger.info(`✅ Número Twilio comprado exitosamente para cliente ${req.client.id}: ${result.phoneNumber}`);
        
        res.json({
            success: true,
            phoneNumber: result.phoneNumber,
            sid: result.twilioSid,
            message: 'Número Twilio comprado exitosamente'
        });
        
    } catch (error) {
        logger.error(`❌ Error comprando número Twilio: ${error.message}`);
        
        // Si es un error de "ya tiene número", no es un error real
        if (error.message.includes('already has')) {
            return res.status(400).json({
                success: false,
                error: 'Ya tienes un número Twilio asignado'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Error comprando número Twilio'
        });
    }
});

/**
 * DELETE /api/twilio/release-number/:numberId
 * Liberar un número Twilio específico
 */
router.delete('/release-number/:numberId', authenticate, async (req, res) => {
    try {
        const { numberId } = req.params;
        
        logger.info(`🗑️ Liberando número Twilio ${numberId} para cliente ${req.client.id}`);
        
        // Verificar que el número pertenece al usuario
        const twilioNumber = await prisma.twilioNumber.findFirst({
            where: {
                id: parseInt(numberId),
                clientId: req.client.id
            }
        });
        
        if (!twilioNumber) {
            return res.status(404).json({
                success: false,
                error: 'Número no encontrado'
            });
        }
        
        // Liberar el número en Twilio
        await twilioService.releaseNumber(twilioNumber.sid);
        
        // Actualizar estado en base de datos
        await prisma.twilioNumber.update({
            where: { id: parseInt(numberId) },
            data: { status: 'released' }
        });
        
        logger.info(`✅ Número Twilio liberado exitosamente: ${twilioNumber.phoneNumber}`);
        
        res.json({
            success: true,
            message: 'Número liberado exitosamente'
        });
        
    } catch (error) {
        logger.error(`❌ Error liberando número Twilio: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error liberando número Twilio'
        });
    }
});

/**
 * POST /api/twilio/webhook
 * Webhook principal para manejar llamadas de Twilio
 * NO requiere autenticación (viene de Twilio)
 */
router.post('/webhook', async (req, res) => {
    try {
        const { To: twilioNumber, From: callerNumber, CallSid } = req.body;
        
        logger.info(`📞 LLAMADA RECIBIDA: ${callerNumber} → ${twilioNumber} (${CallSid})`);
        
        const startTime = Date.now();
        
        // 1. Identificar cliente por número Twilio
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
            where: {
                phoneNumber: twilioNumber,
                status: 'active'
            },
            include: {
                client: true  // Incluir TODOS los datos del cliente
            }
        });
        
        if (!twilioNumberRecord) {
            logger.error(`❌ Número Twilio no encontrado: ${twilioNumber}`);
            return res.status(404).send(`
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>Lo siento, este número no está configurado.</Say>
                </Response>
            `);
        }
        
        const client = twilioNumberRecord.client;
        logger.info(`✅ Cliente identificado: ${client.companyName} (ID: ${client.id})`);
        
        // 🚀 PRE-INICIALIZACIÓN: Preparar OpenAI ANTES de descolgar
        const callerMemoryService = require('../services/callerMemoryService');
        const { getInstance: getOpenAIRealtimeService } = require('../services/openaiRealtimeService');
        const openaiRealtimeService = getOpenAIRealtimeService();
        
        // 2. Pre-cargar memoria del llamante
        let callerMemory = null;
        let memoryContext = '';
        try {
            callerMemory = await callerMemoryService.getOrCreateCallerMemory(
                client.id,
                callerNumber
            );
            memoryContext = callerMemoryService.getMemoryContext(callerMemory);
            logger.info(`🧠 [${CallSid}] Memoria pre-cargada: ${callerMemory.callCount} llamadas`);
        } catch (error) {
            logger.warn(`⚠️ [${CallSid}] No se pudo cargar memoria: ${error.message}`);
        }
        
        // 3. Preparar configuración del cliente
        const clientConfig = {
            companyName: client.companyName,
            companyDescription: client.companyDescription,
            phone: client.phone,
            email: client.email,
            website: client.website,
            address: client.address,
            businessHours: client.businessHours,
            faqs: client.faqs,
            contextFiles: client.contextFiles,
            companyInfo: client.companyInfo,
            callConfig: client.callConfig
        };
        
        // 4. PRE-INICIALIZAR OpenAI Realtime (mientras suenan tonos)
        const preSessionId = `pre_${CallSid}`;
        try {
            logger.info(`🤖 [${CallSid}] PRE-inicializando OpenAI Realtime...`);
            await openaiRealtimeService.initializeConnection(
                preSessionId,
                clientConfig,
                memoryContext
            );
            logger.info(`✅ [${CallSid}] OpenAI pre-inicializado exitosamente`);
        } catch (error) {
            logger.error(`❌ [${CallSid}] Error pre-inicializando OpenAI: ${error.message}`);
            // Continuar sin pre-inicialización (fallback a flujo normal)
        }
        
        // 5. Generar TwiML
        const twimlResponse = await twilioService.handleIncomingCall(
            callerNumber,
            twilioNumber,
            CallSid
        );
        
        logger.info(`🎵 [${CallSid}] TwiML generado para ${client.companyName}`);
        
        // 6. DELAY ESTRATÉGICO: Esperar para que suenen tonos (~2-3 tonos)
        const elapsedTime = Date.now() - startTime;
        const targetDelay = 3000; // 3 segundos = ~2-3 tonos completos
        const remainingDelay = Math.max(0, targetDelay - elapsedTime);
        
        if (remainingDelay > 0) {
            logger.info(`⏳ [${CallSid}] Esperando ${remainingDelay}ms para tonos (total: ${targetDelay}ms)`);
            await new Promise(resolve => setTimeout(resolve, remainingDelay));
        } else {
            logger.info(`⚡ [${CallSid}] Procesamiento lento (${elapsedTime}ms), sin delay adicional`);
        }
        
        const totalTime = Date.now() - startTime;
        logger.info(`✅ [${CallSid}] DESCOLGANDO después de ${totalTime}ms (OpenAI listo)`);
        
        // 7. Devolver TwiML (DESCOLGAR - todo listo)
        res.set('Content-Type', 'text/xml');
        res.send(twimlResponse);
        
    } catch (error) {
        logger.error(`❌ Error en webhook Twilio: ${error.message}`, error);
        
        // Respuesta de fallback
        res.set('Content-Type', 'text/xml');
        res.send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>Lo siento, hay un problema técnico. Inténtalo más tarde.</Say>
            </Response>
        `);
    }
});

// NUEVO ENDPOINT: Maneja audio grabado de Twilio y usa OpenAI Whisper
router.post('/webhook/audio', async (req, res) => {
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] ===== NUEVA PETICIÓN DE AUDIO =====`);
    logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] Headers recibidos: ${JSON.stringify(req.headers)}`);
    logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] Body completo: ${JSON.stringify(req.body)}`);
    
    try {
        const { RecordingUrl, CallSid, To: twilioNumber, RecordingDuration, From: callerNumber } = req.body;
        
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] Datos extraídos:`);
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] - RecordingUrl: ${RecordingUrl}`);
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] - CallSid: ${CallSid}`);
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] - TwilioNumber: ${twilioNumber}`);
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] - CallerNumber: ${callerNumber}`);
        logger.info(`🎙️ [AUDIO-DEBUG-${requestId}] - Duration: ${RecordingDuration}s`);
        
        // Identificar cliente
        logger.info(`🔍 [AUDIO-DEBUG-${requestId}] Buscando cliente para número: ${twilioNumber}`);
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
            where: { phoneNumber: twilioNumber, status: 'active' },
            include: { client: true }
        });
        
        if (!twilioNumberRecord) {
            logger.error(`❌ [AUDIO-DEBUG-${requestId}] Cliente no encontrado para número: ${twilioNumber}`);
            logger.error(`❌ [AUDIO-DEBUG-${requestId}] Números disponibles en BD:`);
            
            // Debug: mostrar números disponibles
            const availableNumbers = await prisma.twilioNumber.findMany({
                select: { phoneNumber: true, status: true, client: { select: { companyName: true } } }
            });
            availableNumbers.forEach(num => {
                logger.error(`❌ [AUDIO-DEBUG-${requestId}] - ${num.phoneNumber} (${num.status}) - ${num.client?.companyName}`);
            });
            
            return res.status(404).send('<Response><Hangup/></Response>');
        }
        
        logger.info(`✅ [AUDIO-DEBUG-${requestId}] Cliente encontrado: ${twilioNumberRecord.client.companyName} (ID: ${twilioNumberRecord.client.id})`);
        
        // Validar que tenemos URL de grabación
        if (!RecordingUrl) {
            logger.warn(`⚠️ [AUDIO-DEBUG-${requestId}] Sin URL de grabación para ${CallSid}`);
            const errorTwiml = twilioService.generateErrorTwiML("No he podido escuchar tu respuesta. ¿Puedes repetir tu pregunta?");
            return res.set('Content-Type', 'text/xml').send(errorTwiml);
        }
        
        // Validar formato de URL de grabación
        if (!RecordingUrl.includes('api.twilio.com')) {
            logger.warn(`⚠️ [AUDIO-DEBUG-${requestId}] URL de grabación sospechosa: ${RecordingUrl}`);
        }

        // Procesar audio con OpenAI Whisper y generar respuesta
        logger.info(`🔄 [AUDIO-DEBUG-${requestId}] Iniciando procesamiento de audio...`);
        const processStart = Date.now();
        
        const aiResponse = await twilioService.processUserAudio({
            client: twilioNumberRecord.client,
            audioUrl: RecordingUrl,
            callSid: CallSid,
            duration: RecordingDuration
        });
        
        const processTime = Date.now() - processStart;
        const totalTime = Date.now() - startTime;
        
        logger.info(`✅ [AUDIO-DEBUG-${requestId}] Procesamiento completado en ${processTime}ms`);
        logger.info(`✅ [AUDIO-DEBUG-${requestId}] Tiempo total de request: ${totalTime}ms`);
        logger.info(`✅ [AUDIO-DEBUG-${requestId}] Respuesta IA generada para ${twilioNumberRecord.client.companyName}`);
        logger.info(`✅ [AUDIO-DEBUG-${requestId}] TwiML response length: ${aiResponse?.length || 0} caracteres`);
        
        res.set('Content-Type', 'text/xml');
        res.send(aiResponse);
        
        logger.info(`🎉 [AUDIO-DEBUG-${requestId}] ===== REQUEST COMPLETADO EXITOSAMENTE =====`);
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        logger.error(`❌ [AUDIO-DEBUG-${requestId}] Error después de ${totalTime}ms`);
        logger.error(`❌ [AUDIO-DEBUG-${requestId}] Error tipo: ${error.constructor.name}`);
        logger.error(`❌ [AUDIO-DEBUG-${requestId}] Error mensaje: ${error.message}`);
        logger.error(`❌ [AUDIO-DEBUG-${requestId}] Error stack: ${error.stack}`);
        
        res.status(500).send('<Response><Hangup/></Response>');
        
        logger.error(`💥 [AUDIO-DEBUG-${requestId}] ===== REQUEST FALLÓ =====`);
    }
});

/**
 * POST /api/twilio/identify
 * Identificar cliente por número Twilio (para N8N u otros servicios)
 */
router.post('/identify', async (req, res) => {
    try {
        const { twilioNumber } = req.body;
        
        if (!twilioNumber) {
            return res.status(400).json({
                success: false,
                error: 'Número Twilio requerido'
            });
        }
        
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
            where: {
                phoneNumber: twilioNumber,
                status: 'active'
            },
            include: {
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        email: true,
                        profile: true,
                        businessHours: true
                    }
                }
            }
        });
        
        if (!twilioNumberRecord) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }
        
        res.json({
            success: true,
            client: twilioNumberRecord.client
        });
        
    } catch (error) {
        logger.error(`❌ Error identificando cliente: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error identificando cliente'
        });
    }
});

/**
 * GET /api/twilio/status
 * Obtener estado general de la configuración Twilio
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const twilioNumbers = await prisma.twilioNumber.findMany({
            where: {
                clientId: req.client.id,
                status: 'active'
            }
        });
        
        res.json({
            success: true,
            hasNumbers: twilioNumbers.length > 0,
            numbersCount: twilioNumbers.length,
            isConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN
        });
        
    } catch (error) {
        logger.error(`❌ Error obteniendo estado Twilio: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado Twilio'
        });
    }
});

module.exports = router;
