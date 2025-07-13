const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// Middleware para verificar autenticación
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = await authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    // Verificar si el cliente existe y está activo
    const client = await prisma.client.findUnique({
      where: { id: decoded.id }
    });
    
    if (!client || !client.isActive) {
      return res.status(401).json({ error: 'Cliente no encontrado o inactivo' });
    }
    
    req.client = client;
    next();
  } catch (error) {
    logger.error(`Error de autenticación: ${error.message}`);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
};

// === RUTAS DE AUTENTICACIÓN ===

// Registro de nuevo cliente
router.post('/register', async (req, res) => {
  try {
    const { email, password, companyName, companyDescription, contactPhone, plan } = req.body;
    
    // Validaciones básicas
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Registrar cliente
    const result = await authService.registerClient({
      email,
      password,
      companyName,
      contactPhone
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    return res.status(201).json({
      message: 'Cliente registrado exitosamente',
      client: result.client,
      token: result.token
    });
  } catch (error) {
    logger.error(`Error en registro: ${error.message}`);
    return res.status(500).json({ error: 'Error en el registro' });
  }
});

// Login de cliente
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Login
    const result = await authService.loginClient(email, password);
    
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    
    return res.json({
      message: 'Login exitoso',
      client: result.client,
      token: result.token
    });
  } catch (error) {
    logger.error(`Error en login: ${error.message}`);
    return res.status(500).json({ error: 'Error en login' });
  }
});

// Obtener información del cliente actual
router.get('/me', authenticate, async (req, res) => {
  try {
    // Obtener datos completos del cliente
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      include: {
        twilioNumbers: true,
        notifications: true,
        emailLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        callLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // No devolver datos sensibles
    const { password, apiKey, resetToken, resetTokenExpiry, ...safeClient } = client;
    
    // Parsear JSON strings en objetos
    if (safeClient.emailConfig) {
      safeClient.emailConfig.forwardingRules = JSON.parse(safeClient.emailConfig.forwardingRules || "[]");
      safeClient.emailConfig.defaultRecipients = JSON.parse(safeClient.emailConfig.defaultRecipients || "[]");
    }
    
    if (safeClient.botConfig) {
      safeClient.botConfig.dtmfOptions = JSON.parse(safeClient.botConfig.dtmfOptions || "[]");
    }
    
    if (safeClient.notificationConfig) {
      safeClient.notificationConfig.defaultRecipients = JSON.parse(safeClient.notificationConfig.defaultRecipients || "[]");
      safeClient.notificationConfig.urgencyRules = JSON.parse(safeClient.notificationConfig.urgencyRules || "{}");
      safeClient.notificationConfig.classificationRules = JSON.parse(safeClient.notificationConfig.classificationRules || "[]");
    }
    
    return res.json(safeClient);
  } catch (error) {
    logger.error(`Error obteniendo perfil: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// Actualizar perfil de cliente
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { companyName, contactPhone, companyDescription, contactEmail } = req.body;
    
    // Actualizar cliente
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        companyName: companyName || undefined,
        contactPhone: contactPhone || undefined,
        description: companyDescription || undefined,
        contactEmail: contactEmail || undefined
      }
    });
    
    // No devolver datos sensibles
    const { password, apiKey, resetToken, resetTokenExpiry, ...safeClient } = updatedClient;
    
    return res.json({
      message: 'Perfil actualizado exitosamente',
      client: safeClient
    });
  } catch (error) {
    logger.error(`Error actualizando perfil: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// Cambiar contraseña
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validaciones básicas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Faltan contraseñas' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    
    // Cambiar contraseña
    const result = await authService.changePassword(req.client.id, currentPassword, newPassword);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    return res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    logger.error(`Error cambiando contraseña: ${error.message}`);
    return res.status(500).json({ error: 'Error cambiando contraseña' });
  }
});

// Generar nueva API key
router.post('/api-key', authenticate, async (req, res) => {
  try {
    // Generar nueva API key
    const result = await authService.generateApiKey(req.client.id);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    return res.json({
      message: 'Nueva API key generada',
      apiKey: result.apiKey
    });
  } catch (error) {
    logger.error(`Error generando API key: ${error.message}`);
    return res.status(500).json({ error: 'Error generando API key' });
  }
});

// Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    
    // Solicitar reset
    const result = await authService.requestPasswordReset(email);
    
    // Siempre devolver éxito (no revelar si el email existe)
    return res.json({ 
      message: 'Si el email existe, se enviará un enlace para restablecer la contraseña',
      ...(process.env.NODE_ENV === 'development' ? { resetToken: result.resetToken } : {})
    });
  } catch (error) {
    logger.error(`Error en recuperación de contraseña: ${error.message}`);
    return res.status(500).json({ error: 'Error procesando solicitud' });
  }
});

// Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Restablecer contraseña
    const result = await authService.resetPassword(token, newPassword);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    return res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    logger.error(`Error restableciendo contraseña: ${error.message}`);
    return res.status(500).json({ error: 'Error restableciendo contraseña' });
  }
});

// Exportar el router y el middleware de autenticación
module.exports = { router, authenticate };
