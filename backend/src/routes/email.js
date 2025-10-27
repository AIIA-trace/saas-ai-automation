const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const googleEmailService = require('../services/googleEmailService');
const microsoftEmailService = require('../services/microsoftEmailService');
const { authenticate } = require('./auth');

const prisma = new PrismaClient();

// ===== GOOGLE OAUTH =====

/**
 * Iniciar flujo OAuth de Google
 * GET /api/email/oauth/google
 */
router.get('/oauth/google', authenticate, (req, res) => {
  try {
    const clientId = req.client.id;
    const authUrl = googleEmailService.getAuthUrl(clientId);
    
    logger.info(`🔗 URL de autorización de Google generada para cliente ${clientId}`);
    
    res.json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    logger.error(`❌ Error generando URL de Google OAuth: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Callback de Google OAuth
 * GET /api/email/oauth/google/callback
 */
router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Si Google envió un error, manejarlo
    if (error) {
      logger.error(`❌ Error de Google OAuth: ${error}`);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?email_error=google&reason=${error}`);
    }

    if (!code) {
      logger.error('❌ Código de autorización no proporcionado');
      return res.status(400).send('Código de autorización no proporcionado');
    }

    // Extraer clientId del state
    const { clientId } = JSON.parse(state);
    logger.info(`✅ Callback de Google recibido para cliente ${clientId}`);

    // Intercambiar código por tokens
    const result = await googleEmailService.exchangeCodeForTokens(code, clientId);

    logger.info(`✅ Tokens de Google obtenidos exitosamente para ${result.email}`);

    // Redirigir al dashboard con mensaje de éxito
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?email_connected=google&email=${result.email}`);

  } catch (error) {
    logger.error(`❌ Error en callback de Google OAuth: ${error.message}`);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?email_error=google`);
  }
});

// ===== MICROSOFT OAUTH =====

/**
 * Iniciar flujo OAuth de Microsoft
 * GET /api/email/oauth/microsoft
 */
router.get('/oauth/microsoft', authenticate, (req, res) => {
  try {
    const clientId = req.client.id;
    const authUrl = microsoftEmailService.getAuthUrl(clientId);
    
    logger.info(`🔗 URL de autorización de Microsoft generada para cliente ${clientId}`);
    
    res.json({
      success: true,
      authUrl: authUrl
    });

  } catch (error) {
    logger.error(`❌ Error generando URL de Microsoft OAuth: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Callback de Microsoft OAuth
 * GET /api/email/oauth/microsoft/callback
 */
router.get('/oauth/microsoft/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Código de autorización no proporcionado');
    }

    // Extraer clientId del state
    const { clientId } = JSON.parse(state);

    // Intercambiar código por tokens
    const result = await microsoftEmailService.exchangeCodeForTokens(code, clientId);

    // Redirigir al dashboard con mensaje de éxito
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?email_connected=microsoft&email=${result.email}`);

  } catch (error) {
    logger.error(`❌ Error en callback de Microsoft OAuth: ${error.message}`);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard.html?email_error=microsoft`);
  }
});

// ===== GESTIÓN DE CUENTAS =====

/**
 * Obtener cuentas de email conectadas
 * GET /api/email/accounts
 */
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;

    const accounts = await prisma.emailAccount.findMany({
      where: {
        clientId: clientId,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        email: true,
        isActive: true,
        lastSync: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      accounts: accounts
    });

  } catch (error) {
    logger.error(`❌ Error obteniendo cuentas de email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Desconectar cuenta de email
 * DELETE /api/email/accounts/:provider
 */
router.delete('/accounts/:provider', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const provider = req.params.provider;

    if (provider === 'google') {
      await googleEmailService.disconnectAccount(clientId);
    } else if (provider === 'microsoft') {
      await microsoftEmailService.disconnectAccount(clientId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      message: 'Cuenta desconectada exitosamente'
    });

  } catch (error) {
    logger.error(`❌ Error desconectando cuenta: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== BANDEJA DE ENTRADA =====

/**
 * Obtener bandeja de entrada
 * GET /api/email/inbox
 */
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const maxResults = parseInt(req.query.limit) || 50;

    // Obtener cuenta activa
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        error: 'No hay cuenta de email conectada'
      });
    }

    let emails = [];

    // Obtener emails según el proveedor
    if (emailAccount.provider === 'google') {
      emails = await googleEmailService.getInbox(clientId, maxResults);
    } else if (emailAccount.provider === 'microsoft') {
      emails = await microsoftEmailService.getInbox(clientId, maxResults);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      provider: emailAccount.provider,
      email: emailAccount.email,
      emails: emails,
      count: emails.length
    });

  } catch (error) {
    logger.error(`❌ Error obteniendo bandeja de entrada: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Marcar email como leído
 * POST /api/email/mark-read
 */
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { emailId } = req.body;

    if (!emailId) {
      return res.status(400).json({
        success: false,
        error: 'emailId es requerido'
      });
    }

    // Obtener cuenta activa
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        error: 'No hay cuenta de email conectada'
      });
    }

    // Marcar como leído según el proveedor
    if (emailAccount.provider === 'google') {
      await googleEmailService.markAsRead(clientId, emailId);
    } else if (emailAccount.provider === 'microsoft') {
      await microsoftEmailService.markAsRead(clientId, emailId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      message: 'Email marcado como leído'
    });

  } catch (error) {
    logger.error(`❌ Error marcando email como leído: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enviar email
 * POST /api/email/send
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos (to, subject, body)'
      });
    }

    // Obtener cuenta activa
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        error: 'No hay cuenta de email conectada'
      });
    }

    let result;

    // Enviar email según el proveedor
    if (emailAccount.provider === 'google') {
      result = await googleEmailService.sendEmail(clientId, { to, subject, body });
    } else if (emailAccount.provider === 'microsoft') {
      result = await microsoftEmailService.sendEmail(clientId, { to, subject, body });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error(`❌ Error enviando email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
