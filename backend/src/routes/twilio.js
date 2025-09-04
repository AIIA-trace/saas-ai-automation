const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
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
