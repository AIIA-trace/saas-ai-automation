const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Inicializar Prisma
const prisma = new PrismaClient();

/**
 * Middleware de autenticación para N8N
 * Verifica que la petición venga de N8N usando API key
 */
const authenticateN8N = (req, res, next) => {
  const apiKey = req.headers['x-n8n-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    logger.warn('🚫 Intento de acceso no autorizado a endpoints N8N');
    return res.status(401).json({ 
      success: false, 
      error: 'API key inválida para N8N' 
    });
  }
  
  next();
};

/**
 * @route GET /api/n8n/client/:clientId/config
 * @desc Obtiene la configuración completa del cliente para N8N workflows
 * @access N8N Only
 */
router.get('/client/:clientId/config', authenticateN8N, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    logger.info(`🔧 N8N solicitando configuración para cliente ${clientId}`);
    
    const client = await prisma.client.findUnique({
      where: { id: parseInt(clientId) },
      select: {
        id: true,
        companyName: true,
        companyDescription: true,
        industry: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        
        // Configuraciones del bot
        botName: true,
        botPersonality: true,
        welcomeMessage: true,
        confirmationMessage: true,
        botLanguage: true,
        
        // Configuraciones JSON
        callConfig: true,
        emailConfig: true,
        businessHoursConfig: true,
        notificationConfig: true,
        faqs: true,
        contextFiles: true
      }
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // Formatear respuesta para N8N
    const config = {
      client: {
        id: client.id,
        companyName: client.companyName,
        companyDescription: client.companyDescription || '',
        industry: client.industry || '',
        contactInfo: {
          phone: client.phone,
          email: client.email,
          website: client.website,
          address: client.address
        }
      },
      bot: {
        name: client.botName || 'Asistente Virtual',
        personality: client.botPersonality || 'profesional y amigable',
        welcomeMessage: client.welcomeMessage || 'Hola, soy tu asistente virtual. ¿En qué puedo ayudarte?',
        confirmationMessage: client.confirmationMessage || 'Gracias por contactarnos.',
        language: client.botLanguage || 'es'
      },
      callConfig: client.callConfig || {
        enabled: false,
        recordCalls: false,
        transcribeCalls: false,
        voiceId: 'neutral',
        language: 'es-ES',
        greeting: 'Hola, ha llamado a nuestra empresa. Soy el asistente virtual.'
      },
      emailConfig: client.emailConfig || {
        enabled: false,
        provider: '',
        autoReply: false,
        signature: ''
      },
      businessHours: client.businessHoursConfig || {
        enabled: false,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        openingTime: '09:00',
        closingTime: '18:00'
      },
      faqs: client.faqs || [],
      contextFiles: client.contextFiles || []
    };
    
    logger.info(`✅ Configuración enviada a N8N para cliente ${clientId}`);
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    logger.error(`❌ Error obteniendo configuración para N8N: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/n8n/client/:clientId/call/result
 * @desc Recibe y guarda el resultado del procesamiento de llamada desde N8N
 * @access N8N Only
 */
router.post('/client/:clientId/call/result', authenticateN8N, async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      callId,
      callerNumber,
      duration,
      transcription,
      analysis,
      recordingUrl,
      status,
      metadata
    } = req.body;
    
    logger.info(`📞 N8N enviando resultado de llamada para cliente ${clientId}`);
    
    // Guardar log de llamada
    const callLog = await prisma.callLog.create({
      data: {
        clientId: parseInt(clientId),
        callId: callId,
        callerNumber: callerNumber,
        duration: duration || 0,
        transcription: transcription || '',
        analysis: analysis || {},
        recordingUrl: recordingUrl || '',
        status: status || 'completed',
        metadata: metadata || {},
        createdAt: new Date()
      }
    });
    
    logger.info(`✅ Resultado de llamada guardado: ${callLog.id}`);
    
    res.json({
      success: true,
      message: 'Resultado de llamada guardado correctamente',
      callLogId: callLog.id
    });
    
  } catch (error) {
    logger.error(`❌ Error guardando resultado de llamada: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error guardando resultado de llamada'
    });
  }
});

/**
 * @route POST /api/n8n/client/:clientId/email/result
 * @desc Recibe y guarda el resultado del procesamiento de email desde N8N
 * @access N8N Only
 */
router.post('/client/:clientId/email/result', authenticateN8N, async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      emailId,
      fromAddress,
      subject,
      body,
      analysis,
      response,
      status,
      metadata
    } = req.body;
    
    logger.info(`📧 N8N enviando resultado de email para cliente ${clientId}`);
    
    // Guardar log de email
    const emailLog = await prisma.emailLog.create({
      data: {
        clientId: parseInt(clientId),
        emailId: emailId,
        fromAddress: fromAddress,
        subject: subject || '',
        body: body || '',
        analysis: analysis || {},
        response: response || '',
        status: status || 'processed',
        metadata: metadata || {},
        createdAt: new Date()
      }
    });
    
    logger.info(`✅ Resultado de email guardado: ${emailLog.id}`);
    
    res.json({
      success: true,
      message: 'Resultado de email guardado correctamente',
      emailLogId: emailLog.id
    });
    
  } catch (error) {
    logger.error(`❌ Error guardando resultado de email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error guardando resultado de email'
    });
  }
});

/**
 * @route POST /api/n8n/client/:clientId/bot/activate
 * @desc Activa o desactiva bots específicos para un cliente
 * @access N8N Only
 */
router.post('/client/:clientId/bot/activate', authenticateN8N, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { botType, enabled, config } = req.body; // botType: 'call' | 'email'
    
    logger.info(`🤖 N8N ${enabled ? 'activando' : 'desactivando'} bot ${botType} para cliente ${clientId}`);
    
    // Actualizar configuración del bot
    const updateData = {};
    
    if (botType === 'call') {
      updateData.callConfig = {
        ...config,
        enabled: enabled
      };
    } else if (botType === 'email') {
      updateData.emailConfig = {
        ...config,
        enabled: enabled
      };
    }
    
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(clientId) },
      data: updateData
    });
    
    logger.info(`✅ Bot ${botType} ${enabled ? 'activado' : 'desactivado'} para cliente ${clientId}`);
    
    res.json({
      success: true,
      message: `Bot ${botType} ${enabled ? 'activado' : 'desactivado'} correctamente`
    });
    
  } catch (error) {
    logger.error(`❌ Error activando/desactivando bot: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Error activando/desactivando bot'
    });
  }
});

/**
 * @route GET /api/n8n/health
 * @desc Health check específico para N8N
 * @access N8N Only
 */
router.get('/health', authenticateN8N, (req, res) => {
  res.json({
    success: true,
    message: 'N8N API endpoints funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
