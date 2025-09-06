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
                    <Say voice="Polly.Conchita" language="es-ES">Lo siento, este número no está configurado.</Say>
                </Response>
            `);
        }
        
        const client = twilioNumberRecord.client;
        logger.info(`✅ Cliente identificado: ${client.companyName} (ID: ${client.id})`);
        
        // 2. Generar respuesta personalizada con Azure TTS
        const twimlResponse = await twilioService.generateCallResponse({
            client: client,
            callerNumber: callerNumber,
            callSid: CallSid
        });
        
        logger.info(`🎵 Respuesta TwiML generada para ${client.companyName}`);
        
        // 3. Devolver TwiML
        res.set('Content-Type', 'text/xml');
        res.send(twimlResponse);
        
    } catch (error) {
        logger.error(`❌ Error en webhook Twilio: ${error.message}`, error);
        
        // Respuesta de fallback
        res.set('Content-Type', 'text/xml');
        res.send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="Polly.Conchita" language="es-ES">Lo siento, hay un problema técnico. Inténtalo más tarde.</Say>
            </Response>
        `);
    }
});

/**
 * POST /api/twilio/webhook/response
 * Manejar respuestas del usuario durante la llamada
 */
router.post('/webhook/response', async (req, res) => {
    try {
        const { SpeechResult, CallSid, To: twilioNumber } = req.body;
        
        logger.info(`🎤 RESPUESTA DEL USUARIO: "${SpeechResult}" (${CallSid})`);
        
        // Identificar cliente
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
            where: { phoneNumber: twilioNumber, status: 'active' },
            include: { client: true }
        });
        
        if (!twilioNumberRecord) {
            logger.error(`❌ Cliente no encontrado para respuesta: ${twilioNumber}`);
            return res.status(404).send('<Response><Hangup/></Response>');
        }
        
        // Procesar respuesta con IA
        const aiResponse = await twilioService.processUserResponse({
            client: twilioNumberRecord.client,
            userInput: SpeechResult,
            callSid: CallSid
        });
        
        logger.info(`🤖 Respuesta IA generada para ${twilioNumberRecord.client.companyName}`);
        
        res.set('Content-Type', 'text/xml');
        res.send(aiResponse);
        
    } catch (error) {
        logger.error(`❌ Error procesando respuesta: ${error.message}`, error);
        
        res.set('Content-Type', 'text/xml');
        res.send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="Polly.Conchita" language="es-ES">Gracias por llamar. ¡Hasta pronto!</Say>
                <Hangup/>
            </Response>
        `);
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
                        businessHoursConfig: true
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
