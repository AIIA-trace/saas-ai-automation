const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const googleEmailService = require('../services/googleEmailService');
const microsoftEmailService = require('../services/microsoftEmailService');
const openaiEmailService = require('../services/openaiEmailService');
const emailSpamPrevention = require('../services/emailSpamPrevention');
const EmailServiceFactory = require('../services/email/emailServiceFactory');
const outlookAuthRouter = require('./email/outlookAuth');
const { authenticate } = require('./auth');

const prisma = new PrismaClient();

// Montar rutas de autenticación de Outlook
router.use('/oauth/outlook', outlookAuthRouter);

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
 * Obtener emails enviados
 * GET /api/email/sent
 */
router.get('/sent', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const maxResults = parseInt(req.query.limit) || 50;
    const pageToken = req.query.pageToken || null;

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

    let result = {};

    // Obtener emails enviados según el proveedor
    if (emailAccount.provider === 'google') {
      result = await googleEmailService.getSent(clientId, maxResults, pageToken);
    } else if (emailAccount.provider === 'microsoft') {
      result = await microsoftEmailService.getSent(clientId, maxResults, pageToken);
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
      emails: result.emails || result,
      count: (result.emails || result).length,
      nextPageToken: result.nextPageToken || null
    });

  } catch (error) {
    logger.error(`❌ Error obteniendo emails enviados: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Obtener bandeja de entrada
 * GET /api/email/inbox
 */
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const maxResults = parseInt(req.query.limit) || 50;
    const pageToken = req.query.pageToken || null;

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

    let result = {};

    // Obtener emails según el proveedor
    if (emailAccount.provider === 'google') {
      result = await googleEmailService.getInbox(clientId, maxResults, pageToken);
    } else if (emailAccount.provider === 'microsoft') {
      result = await microsoftEmailService.getInbox(clientId, maxResults, pageToken);
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      result = await emailService.listMessages(maxResults, pageToken);
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
      emails: result.emails || result,
      count: (result.emails || result).length,
      nextPageToken: result.nextPageToken || null
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
 * Descargar adjunto
 * GET /api/email/:emailId/attachment/:attachmentId
 */
router.get('/:emailId/attachment/:attachmentId', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { emailId, attachmentId } = req.params;

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

    let attachmentData;

    // Obtener adjunto según el proveedor
    if (emailAccount.provider === 'google') {
      attachmentData = await googleEmailService.getAttachment(clientId, emailId, attachmentId);
    } else if (emailAccount.provider === 'microsoft') {
      attachmentData = await microsoftEmailService.getAttachment(clientId, emailId, attachmentId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    // Enviar archivo
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(attachmentData);

  } catch (error) {
    logger.error(`❌ Error descargando adjunto: ${error.message}`);
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
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      await emailService.markAsRead(emailId);
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
 * Eliminar email (mover a papelera)
 * DELETE /api/email/:emailId
 */
router.delete('/:emailId', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { emailId } = req.params;

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

    // Eliminar según el proveedor
    if (emailAccount.provider === 'google') {
      await googleEmailService.deleteEmail(clientId, emailId);
    } else if (emailAccount.provider === 'microsoft') {
      await microsoftEmailService.deleteEmail(clientId, emailId);
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      await emailService.deleteMessage(emailId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      message: 'Email eliminado correctamente'
    });

  } catch (error) {
    logger.error(`❌ Error eliminando email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Marcar/desmarcar email como importante
 * POST /api/email/toggle-starred
 */
router.post('/toggle-starred', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { emailId, starred } = req.body;

    if (!emailId || typeof starred !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'emailId y starred (boolean) son requeridos'
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

    // Cambiar estado según el proveedor
    if (emailAccount.provider === 'google') {
      await googleEmailService.toggleStarred(clientId, emailId, starred);
    } else if (emailAccount.provider === 'microsoft') {
      await microsoftEmailService.toggleStarred(clientId, emailId, starred);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      message: starred ? 'Email marcado como importante' : 'Email desmarcado como importante'
    });

  } catch (error) {
    logger.error(`❌ Error cambiando estado de importante: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Obtener detalles de un email (incluyendo hilo)
 * GET /api/email/:emailId/details
 */
router.get('/:emailId/details', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const emailId = req.params.emailId;

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

    let details = {};

    // Obtener detalles según el proveedor
    if (emailAccount.provider === 'google') {
      details = await googleEmailService.getEmailDetails(clientId, emailId);
    } else if (emailAccount.provider === 'microsoft') {
      details = await microsoftEmailService.getEmailDetails(clientId, emailId);
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      const email = await emailService.getMessage(emailId);
      const thread = await emailService.getThread(email.threadId);
      details = {
        email: email,
        thread: thread,
        threadId: email.threadId
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    res.json({
      success: true,
      ...details
    });

  } catch (error) {
    logger.error(`❌ Error obteniendo detalles del email: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Agregar firma al cuerpo del email (solo si está habilitada)
 */
async function addSignatureToBody(clientId, body) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { emailConfig: true }
    });

    const emailConfig = client?.emailConfig || {};
    
    // Verificar si la firma está habilitada
    if (!emailConfig.emailSignatureEnabled) {
      logger.info('⚠️ Firma de email deshabilitada, no se agrega');
      return body;
    }
    
    const signature = emailConfig.emailSignature;
    
    if (!signature || signature.trim() === '') {
      logger.info('⚠️ No hay firma configurada');
      return body;
    }

    // Si el body ya contiene la firma, no agregarla de nuevo
    if (body.includes(signature)) {
      logger.info('✅ El body ya contiene la firma');
      return body;
    }

    // Formatear firma con HTML
    const lines = signature.split('\n').filter(line => line.trim());
    const name = lines[0] || '';
    const company = lines[1] || '';
    const rest = lines.slice(2).join('<br>');
    
    const formattedSignature = `
      <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd;">
        <p style="margin: 5px 0;"><strong style="font-size: 16px;">${name}</strong></p>
        ${company ? `<p style="margin: 5px 0;"><strong>${company}</strong></p>` : ''}
        ${rest ? `<p style="margin: 5px 0;">${rest}</p>` : ''}
      </div>
    `;

    logger.info(`📝 Agregando firma de email`);
    
    return `${body}${formattedSignature}`;
  } catch (error) {
    logger.error(`⚠️ Error agregando firma: ${error.message}`);
    return body;
  }
}

/**
 * Enviar email (con soporte para respuestas y adjuntos)
 * POST /api/email/send
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { to, cc, bcc, subject, body, threadId, inReplyTo, references, attachments } = req.body;

    logger.info(`📧 POST /send - Datos recibidos:`, { 
      to, 
      cc,
      bcc,
      subject, 
      threadId, 
      inReplyTo,
      bodyLength: body?.length,
      allKeys: Object.keys(req.body),
      fullBody: req.body  // Ver TODO el body para debug
    });

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

    // Agregar firma si está habilitada
    const bodyWithSignature = await addSignatureToBody(clientId, body);

    // Validar email para prevenir spam
    const validation = emailSpamPrevention.validateEmail({
      to,
      subject,
      body: bodyWithSignature
    });

    // Log de validación
    logger.info(`📊 Validación anti-spam:`, {
      spamScore: validation.spamScore,
      riskLevel: validation.riskLevel,
      warningsCount: validation.warnings.length
    });

    if (validation.warnings.length > 0) {
      logger.warn(`⚠️ Advertencias de spam:`, validation.warnings);
    }

    // Si el riesgo es muy alto, advertir pero permitir envío
    if (validation.riskLevel === 'high') {
      logger.warn(`🚨 ALTO RIESGO DE SPAM (score: ${validation.spamScore})`);
      logger.warn(`💡 Sugerencias:`, validation.suggestions);
    }

    const emailData = {
      to,
      cc: cc || null,
      bcc: bcc || null,
      subject,
      body: validation.emailData.body, // Usar body mejorado
      threadId,
      inReplyTo,
      references,
      attachments: attachments || []
    };

    let result;

    // Enviar email según el proveedor
    logger.info(`📧 Enviando email con proveedor: ${emailAccount.provider}`);
    logger.info(`📧 Email account: ${emailAccount.email}`);
    
    if (emailAccount.provider === 'google') {
      result = await googleEmailService.sendEmail(clientId, emailData);
    } else if (emailAccount.provider === 'microsoft') {
      // Para Microsoft, si no hay inReplyTo pero hay threadId, obtener el último mensaje del thread
      if (!emailData.inReplyTo && emailData.threadId) {
        logger.info(`📧 No hay inReplyTo, pero hay threadId. Obteniendo último mensaje del thread...`);
        try {
          const threadData = await microsoftEmailService.getThread(clientId, emailData.threadId);
          if (threadData.messages && threadData.messages.length > 0) {
            // Obtener el último mensaje del thread (el más reciente)
            const lastMessage = threadData.messages[threadData.messages.length - 1];
            emailData.inReplyTo = lastMessage.id;
            logger.info(`✅ inReplyTo establecido a: ${emailData.inReplyTo}`);
          }
        } catch (error) {
          logger.warn(`⚠️ No se pudo obtener el thread, enviando como email nuevo: ${error.message}`);
        }
      }
      
      // Si inReplyTo es un conversationId (empieza con AQQk), convertir a null
      if (emailData.inReplyTo && emailData.inReplyTo.startsWith('AQQk')) {
        logger.warn(`⚠️ inReplyTo es un conversationId, no un messageId. Enviando como email nuevo.`);
        emailData.inReplyTo = null;
      }
      
      result = await microsoftEmailService.sendEmail(clientId, emailData);
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      
      // Si es una respuesta (tiene threadId o inReplyTo), usar sendReply
      if (emailData.inReplyTo || emailData.threadId) {
        result = await emailService.sendReply(emailData.inReplyTo, bodyWithSignature, {
          cc: emailData.cc,
          bcc: emailData.bcc
        });
      } else {
        // Email nuevo
        result = await emailService.sendMessage(to, subject, bodyWithSignature, {
          cc: emailData.cc,
          bcc: emailData.bcc,
          inReplyTo: emailData.inReplyTo
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    logger.info(`✅ Email enviado con firma a ${to}`);

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

// ===== IA PARA EMAILS =====

/**
 * Generar respuesta inteligente para un email
 * POST /api/email/generate-reply
 */
router.post('/generate-reply', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { emailId, threadId } = req.body;

    logger.info('🎬 ===== INICIO GENERATE-REPLY =====');
    logger.info(`📥 Request recibido:`, { clientId, emailId, threadId });

    if (!emailId) {
      logger.error('❌ emailId faltante en request');
      return res.status(400).json({
        success: false,
        error: 'emailId es requerido'
      });
    }

    logger.info(`🤖 Generando respuesta IA para email ${emailId} del cliente ${clientId}`);

    // Obtener cuenta de email activa
    logger.info('🔍 Buscando cuenta de email activa...');
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      logger.error('❌ No hay cuenta de email activa');
      return res.status(404).json({
        success: false,
        error: 'No hay cuenta de email activa'
      });
    }

    logger.info(`✅ Cuenta encontrada: ${emailAccount.provider} - ${emailAccount.email}`);

    // Obtener detalles del email actual
    logger.info(`📧 Obteniendo detalles del email ${emailId}...`);
    let currentEmail;
    if (emailAccount.provider === 'google') {
      const emailDetails = await googleEmailService.getEmailDetails(clientId, emailId);
      currentEmail = emailDetails.email;
    } else if (emailAccount.provider === 'microsoft') {
      const emailDetails = await microsoftEmailService.getEmailDetails(clientId, emailId);
      currentEmail = emailDetails.email;
    } else if (emailAccount.provider === 'outlook') {
      // Usar el nuevo servicio de Outlook
      const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
      currentEmail = await emailService.getMessage(emailId);
    } else {
      logger.error(`❌ Proveedor no soportado: ${emailAccount.provider}`);
      return res.status(400).json({
        success: false,
        error: 'Proveedor no soportado'
      });
    }

    logger.info(`✅ Email obtenido:`, {
      from: currentEmail.from,
      subject: currentEmail.subject,
      date: currentEmail.date
    });

    // Obtener hilo completo si existe threadId
    let threadMessages = [];
    if (threadId) {
      logger.info(`📧 Cargando hilo completo: ${threadId}`);
      
      if (emailAccount.provider === 'google') {
        const threadData = await googleEmailService.getThread(clientId, threadId);
        threadMessages = threadData.messages || [];
        logger.info(`✅ Hilo cargado de Gmail: ${threadMessages.length} mensajes`);
      } else if (emailAccount.provider === 'microsoft') {
        // Microsoft usa conversationId para agrupar emails
        const threadData = await microsoftEmailService.getThread(clientId, threadId);
        threadMessages = threadData.messages || [];
        logger.info(`✅ Conversación cargada de Microsoft: ${threadMessages.length} mensajes`);
      } else if (emailAccount.provider === 'outlook') {
        // Usar el nuevo servicio de Outlook
        const emailService = EmailServiceFactory.getServiceForAccount(emailAccount);
        threadMessages = await emailService.getThread(threadId);
        logger.info(`✅ Conversación cargada de Outlook: ${threadMessages.length} mensajes`);
      }
    } else {
      logger.warn('⚠️ No se proporcionó threadId, usando solo email actual');
    }

    // Filtrar solo mensajes del mismo remitente/destinatario (hilo hermético)
    logger.info('🔍 Filtrando hilo hermético...');
    
    // Validar que currentEmail tenga los campos necesarios
    if (!currentEmail || !currentEmail.from) {
      logger.error('❌ currentEmail.from es undefined o null');
      logger.error('❌ currentEmail:', JSON.stringify(currentEmail, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Email actual no tiene remitente válido'
      });
    }
    
    const senderEmail = currentEmail.from.toLowerCase();
    const recipientEmail = currentEmail.to ? currentEmail.to.toLowerCase() : '';
    
    logger.info(`📧 Filtros: sender=${senderEmail}, recipient=${recipientEmail}`);
    logger.info(`📧 Mensajes en hilo antes de filtrar: ${threadMessages.length}`);
    
    // Log de los primeros 3 mensajes para debug
    threadMessages.slice(0, 3).forEach((msg, idx) => {
      logger.info(`📧 Mensaje ${idx + 1}: from="${msg.from}", to="${msg.to}"`);
    });
    
    const originalCount = threadMessages.length;
    threadMessages = threadMessages.filter(msg => {
      const msgFrom = (msg.from || '').toLowerCase();
      const msgTo = (msg.to || '').toLowerCase();
      
      // Solo incluir mensajes entre el remitente y el destinatario principal
      return (msgFrom === senderEmail || msgTo === senderEmail) &&
             (msgFrom === recipientEmail || msgTo === recipientEmail);
    });

    logger.info(`✅ Filtrado: ${originalCount} → ${threadMessages.length} mensajes`);

    // Ordenar mensajes cronológicamente (más antiguos primero)
    threadMessages.sort((a, b) => new Date(a.date) - new Date(b.date));
    logger.info(`📚 Hilo hermético ordenado: ${threadMessages.length} mensajes`);

    // Generar respuesta con IA (el servicio cargará el contexto completo del cliente)
    logger.info('🤖 Llamando a OpenAI Email Service...');
    logger.info(`📦 Datos enviados a IA:`, {
      threadMessagesCount: threadMessages.length,
      currentEmailFrom: currentEmail.from,
      currentEmailSubject: currentEmail.subject,
      clientId: clientId
    });

    const generatedReply = await openaiEmailService.generateEmailReply(
      threadMessages,
      currentEmail,
      clientId
    );

    logger.info('✅ Respuesta generada exitosamente por OpenAI');
    logger.info(`📝 Longitud de respuesta: ${generatedReply.length} caracteres`);
    logger.info(`📄 Primeros 100 caracteres: ${generatedReply.substring(0, 100)}...`);

    logger.info('📤 Enviando respuesta al frontend...');
    res.json({
      success: true,
      reply: generatedReply,
      threadMessagesCount: threadMessages.length
    });

    logger.info('🏁 ===== FIN GENERATE-REPLY EXITOSO =====');

  } catch (error) {
    logger.error(`❌ ===== ERROR EN GENERATE-REPLY =====`);
    logger.error(`❌ Error: ${error.message}`);
    logger.error(`❌ Stack: ${error.stack}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generar email nuevo desde cero con IA
 * POST /api/email/generate-new
 */
router.post('/generate-new', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { purpose, recipient } = req.body;

    if (!purpose) {
      return res.status(400).json({
        success: false,
        error: 'purpose es requerido'
      });
    }

    logger.info(`✉️ Generando email nuevo para cliente ${clientId}: ${purpose}`);

    // Generar email con IA
    const generatedEmail = await openaiEmailService.generateNewEmail(
      purpose,
      recipient,
      clientId
    );

    logger.info('✅ Email nuevo generado');

    res.json({
      success: true,
      subject: generatedEmail.subject,
      body: generatedEmail.body
    });

  } catch (error) {
    logger.error(`❌ Error generando email nuevo: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generar resumen del hilo de emails
 * POST /api/email/thread-summary
 */
router.post('/thread-summary', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const { threadId } = req.body;

    if (!threadId) {
      return res.status(400).json({
        success: false,
        error: 'threadId es requerido'
      });
    }

    logger.info(`📝 Generando resumen del hilo ${threadId}`);

    // Obtener cuenta de email activa
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        error: 'No hay cuenta de email activa'
      });
    }

    // Obtener hilo completo
    let threadMessages = [];
    if (emailAccount.provider === 'google') {
      const threadData = await googleEmailService.getThread(clientId, threadId);
      threadMessages = threadData.messages || [];
    } else if (emailAccount.provider === 'microsoft') {
      const threadData = await microsoftEmailService.getThread(clientId, threadId);
      threadMessages = threadData.messages || [];
    }

    // Generar resumen
    const summary = await openaiEmailService.generateThreadSummary(threadMessages);

    logger.info('✅ Resumen generado');

    res.json({
      success: true,
      summary: summary,
      messagesCount: threadMessages.length
    });

  } catch (error) {
    logger.error(`❌ Error generando resumen: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Obtener contactos frecuentes para autocompletado
 * GET /api/email/contacts/suggestions?q=search
 */
router.get('/contacts/suggestions', authenticate, async (req, res) => {
  try {
    const clientId = req.client.id;
    const query = req.query.q?.toLowerCase() || '';

    // Obtener cuenta activa
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        clientId: clientId,
        isActive: true
      }
    });

    if (!emailAccount) {
      return res.json({
        success: true,
        contacts: []
      });
    }

    let allEmails = [];

    // Obtener emails recientes para extraer contactos
    if (emailAccount.provider === 'google') {
      const inbox = await googleEmailService.getInbox(clientId, 100);
      const sent = await googleEmailService.getSent(clientId, 100);
      allEmails = [...inbox.emails, ...sent.emails];
    } else if (emailAccount.provider === 'microsoft') {
      const inbox = await microsoftEmailService.getInbox(clientId, 100);
      const sent = await microsoftEmailService.getSent(clientId, 100);
      allEmails = [...inbox, ...sent];
    }

    // Extraer contactos únicos
    const contactsMap = new Map();
    
    allEmails.forEach(email => {
      // Agregar remitente
      if (email.from && email.from !== emailAccount.email) {
        const key = email.from.toLowerCase();
        if (!contactsMap.has(key)) {
          contactsMap.set(key, {
            email: email.from,
            name: email.fromName || email.from,
            count: 0
          });
        }
        contactsMap.get(key).count++;
      }

      // Agregar destinatarios
      if (email.to) {
        const recipients = email.to.split(',').map(e => e.trim());
        recipients.forEach(recipient => {
          if (recipient && recipient !== emailAccount.email) {
            const key = recipient.toLowerCase();
            if (!contactsMap.has(key)) {
              contactsMap.set(key, {
                email: recipient,
                name: recipient,
                count: 0
              });
            }
            contactsMap.get(key).count++;
          }
        });
      }
    });

    // Convertir a array y filtrar por query
    let contacts = Array.from(contactsMap.values());
    
    if (query) {
      contacts = contacts.filter(contact => 
        contact.email.toLowerCase().includes(query) ||
        contact.name.toLowerCase().includes(query)
      );
    }

    // Ordenar por frecuencia y limitar a 10
    contacts = contacts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ email, name }) => ({ email, name }));

    logger.info(`✅ ${contacts.length} contactos sugeridos para query: "${query}"`);

    res.json({
      success: true,
      contacts: contacts
    });

  } catch (error) {
    logger.error(`❌ Error obteniendo sugerencias de contactos: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
