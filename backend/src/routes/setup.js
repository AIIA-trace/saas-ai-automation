const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware de autenticación (reutilizar del api.js)
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const clientId = decoded.clientId || decoded.id;
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    req.client = client;
    next();
  } catch (error) {
    logger.error(`Error de autenticación: ${error.message}`);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * Endpoint para configurar credenciales de Twilio
 * POST /setup/twilio
 */
router.post('/twilio', authenticate, async (req, res) => {
  try {
    const { accountSid, authToken, phoneNumber } = req.body;
    
    logger.info(`🔧 Configurando Twilio para cliente ${req.client.id}`);
    
    // Validar que se proporcionen todas las credenciales
    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Account SID y Auth Token son requeridos'
      });
    }
    
    // Validar credenciales con Twilio
    const twilio = require('twilio');
    let twilioClient;
    
    try {
      twilioClient = twilio(accountSid, authToken);
      // Test de conexión
      await twilioClient.api.accounts(accountSid).fetch();
      logger.info('✅ Credenciales de Twilio validadas correctamente');
    } catch (twilioError) {
      logger.error(`❌ Error validando credenciales Twilio: ${twilioError.message}`);
      return res.status(400).json({
        success: false,
        error: 'Credenciales de Twilio inválidas'
      });
    }
    
    // Guardar credenciales en la configuración del cliente
    const twilioConfig = {
      accountSid,
      authToken,
      phoneNumber: phoneNumber || null,
      configuredAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Actualizar cliente con configuración de Twilio
    await prisma.client.update({
      where: { id: req.client.id },
      data: {
        // Guardar en un campo JSON específico para Twilio
        companyInfo: {
          ...req.client.companyInfo,
          twilioConfig
        }
      }
    });
    
    // Si se proporcionó un número, guardarlo en la tabla TwilioNumber
    if (phoneNumber) {
      try {
        // Verificar que el número existe en Twilio
        const number = await twilioClient.incomingPhoneNumbers.list({
          phoneNumber: phoneNumber
        });
        
        if (number.length > 0) {
          // Guardar o actualizar el número en la base de datos
          await prisma.twilioNumber.upsert({
            where: {
              phoneNumber: phoneNumber
            },
            update: {
              clientId: req.client.id,
              twilioSid: number[0].sid,
              friendlyName: number[0].friendlyName,
              status: 'active'
            },
            create: {
              clientId: req.client.id,
              phoneNumber: phoneNumber,
              twilioSid: number[0].sid,
              friendlyName: number[0].friendlyName,
              status: 'active'
            }
          });
          
          logger.info(`📞 Número ${phoneNumber} configurado correctamente`);
        }
      } catch (numberError) {
        logger.warn(`⚠️ No se pudo verificar el número ${phoneNumber}: ${numberError.message}`);
        // No fallar la configuración por esto
      }
    }
    
    logger.info(`✅ Twilio configurado correctamente para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Twilio configurado correctamente',
      config: {
        accountSid: accountSid.substring(0, 10) + '...' + accountSid.slice(-4), // Parcialmente oculto
        phoneNumber,
        status: 'active'
      }
    });
    
  } catch (error) {
    logger.error(`❌ Error configurando Twilio: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error configurando Twilio',
      details: error.message
    });
  }
});

/**
 * Endpoint para configurar credenciales de ElevenLabs
 * POST /setup/elevenlabs
 */
router.post('/elevenlabs', authenticate, async (req, res) => {
  try {
    const { apiKey, voiceId } = req.body;
    
    logger.info(`🎤 Configurando ElevenLabs para cliente ${req.client.id}`);
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key de ElevenLabs es requerida'
      });
    }
    
    // Validar API Key con ElevenLabs
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error('API Key inválida');
      }
      
      const voices = await response.json();
      logger.info(`✅ ElevenLabs API Key validada - ${voices.voices?.length || 0} voces disponibles`);
      
    } catch (elevenError) {
      logger.error(`❌ Error validando ElevenLabs: ${elevenError.message}`);
      return res.status(400).json({
        success: false,
        error: 'API Key de ElevenLabs inválida'
      });
    }
    
    // Guardar configuración de ElevenLabs
    const elevenLabsConfig = {
      apiKey,
      voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM', // Rachel por defecto
      configuredAt: new Date().toISOString(),
      status: 'active'
    };
    
    await prisma.client.update({
      where: { id: req.client.id },
      data: {
        companyInfo: {
          ...req.client.companyInfo,
          elevenLabsConfig
        }
      }
    });
    
    logger.info(`✅ ElevenLabs configurado correctamente para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'ElevenLabs configurado correctamente',
      config: {
        apiKey: apiKey.substring(0, 8) + '...' + apiKey.slice(-4), // Parcialmente oculto
        voiceId,
        status: 'active'
      }
    });
    
  } catch (error) {
    logger.error(`❌ Error configurando ElevenLabs: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error configurando ElevenLabs',
      details: error.message
    });
  }
});

/**
 * Endpoint para obtener el estado de configuración
 * GET /setup/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        companyInfo: true,
        twilioNumbers: true
      }
    });
    
    const companyInfo = client.companyInfo || {};
    const twilioConfig = companyInfo.twilioConfig;
    const elevenLabsConfig = companyInfo.elevenLabsConfig;
    
    return res.json({
      success: true,
      setup: {
        twilio: {
          configured: !!twilioConfig,
          hasPhoneNumber: client.twilioNumbers.length > 0,
          phoneNumbers: client.twilioNumbers.map(n => ({
            number: n.phoneNumber,
            status: n.status
          }))
        },
        elevenlabs: {
          configured: !!elevenLabsConfig,
          voiceId: elevenLabsConfig?.voiceId
        }
      }
    });
    
  } catch (error) {
    logger.error(`Error obteniendo estado de configuración: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de configuración'
    });
  }
});

module.exports = router;
