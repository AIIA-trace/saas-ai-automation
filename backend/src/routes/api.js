const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Health check endpoint para Render
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const twilioService = require('../services/twilioService');
const emailService = require('../services/emailService');
const elevenlabsService = require('../services/elevenlabsService');
const authService = require('../services/authService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Middleware para verificar la autenticación JWT
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verificar JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Buscar el cliente por ID del token
    const client = await prisma.client.findUnique({
      where: {
        id: decoded.id
      }
    });
    
    if (!client) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si el cliente está activo
    if (!client.isActive) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }
    
    // Añadir cliente a la request
    req.client = client;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    logger.error(`Error de autenticación: ${error.message}`);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
};

// === ENDPOINTS PARA CLIENTES ===

// Obtener configuración actual del cliente
router.get('/config', authenticate, async (req, res) => {
  try {
    // Obtener la configuración del cliente
    const clientConfig = await prisma.client.findUnique({
      where: { id: req.client.id },
      include: {
        twilioNumbers: true,
      }
    });
    
    if (!clientConfig) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    // No enviamos datos sensibles como API keys
    const { apiKey, ...safeConfig } = clientConfig;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

// Obtener perfil del cliente
router.get('/profile', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        website: true,
        industry: true,
        address: true,
        timezone: true,
        language: true,
        createdAt: true,
        updatedAt: true
        // Excluir password y apiKey por seguridad
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    return res.json({
      success: true,
      client: client
    });
  } catch (error) {
    logger.error(`Error obteniendo perfil: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// Actualizar perfil del cliente
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { 
      companyName, 
      contactName, 
      email, 
      phone, 
      website, 
      industry, 
      address, 
      timezone, 
      language 
    } = req.body;
    
    // Validar email si se proporciona
    if (email && email !== req.client.email) {
      const existingClient = await prisma.client.findUnique({
        where: { email }
      });
      if (existingClient) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
    }
    
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        companyName: companyName || undefined,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        industry: industry || undefined,
        address: address || undefined,
        timezone: timezone || undefined,
        language: language || undefined,
      }
    });
    
    // No enviar datos sensibles
    const { password, apiKey, ...safeClient } = updatedClient;
    
    return res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      client: safeClient
    });
  } catch (error) {
    logger.error(`Error actualizando perfil: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando perfil' });
  }
});

// Cambiar contraseña
router.put('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validar que se proporcionen ambas contraseñas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requiere la contraseña actual y la nueva contraseña' });
    }
    
    // Validar longitud mínima de la nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    // Verificar contraseña actual
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.client.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    
    // Encriptar nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: { password: hashedNewPassword }
    });
    
    logger.info(`Contraseña actualizada para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    logger.error(`Error cambiando contraseña: ${error.message}`);
    return res.status(500).json({ error: 'Error cambiando contraseña' });
  }
});

// Guardar información de facturación
router.put('/billing/info', authenticate, async (req, res) => {
  try {
    const { 
      company, 
      taxId, 
      address, 
      postalCode, 
      city, 
      country 
    } = req.body;
    
    // Validar campos requeridos
    if (!company || !taxId || !address || !postalCode || !city) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios excepto el país' });
    }
    
    // Crear objeto de información de facturación
    const billingInfo = {
      company,
      taxId,
      address,
      postalCode,
      city,
      country: country || 'España'
    };
    
    // Actualizar en la base de datos
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: { billingInfo }
    });
    
    logger.info(`Información de facturación actualizada para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Información de facturación guardada correctamente',
      billingInfo
    });
  } catch (error) {
    logger.error(`Error guardando información de facturación: ${error.message}`);
    return res.status(500).json({ error: 'Error guardando información de facturación' });
  }
});

// Obtener información de facturación
router.get('/billing/info', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { billingInfo: true }
    });
    
    return res.json({
      success: true,
      billingInfo: client.billingInfo || {}
    });
  } catch (error) {
    logger.error(`Error obteniendo información de facturación: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo información de facturación' });
  }
});

// Guardar método de pago
router.post('/payment/method', authenticate, async (req, res) => {
  try {
    const { 
      type, // 'card', 'paypal', 'bank_transfer'
      cardNumber,
      expiryDate,
      cardholderName,
      isDefault
    } = req.body;
    
    // Validar campos requeridos según el tipo
    if (type === 'card') {
      if (!cardNumber || !expiryDate || !cardholderName) {
        return res.status(400).json({ error: 'Todos los campos de la tarjeta son obligatorios' });
      }
    }
    
    // Obtener métodos de pago existentes
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { paymentMethods: true }
    });
    
    const existingMethods = client.paymentMethods || [];
    
    // Crear nuevo método de pago (enmascarar datos sensibles)
    const newMethod = {
      id: Date.now().toString(),
      type,
      cardholderName: cardholderName || null,
      cardNumber: cardNumber ? `****-****-****-${cardNumber.slice(-4)}` : null,
      expiryDate: expiryDate || null,
      isDefault: isDefault || existingMethods.length === 0, // Primer método es default
      createdAt: new Date().toISOString()
    };
    
    // Si este método es default, quitar default de otros
    if (newMethod.isDefault) {
      existingMethods.forEach(method => method.isDefault = false);
    }
    
    // Agregar nuevo método
    const updatedMethods = [...existingMethods, newMethod];
    
    // Actualizar en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: { paymentMethods: updatedMethods }
    });
    
    logger.info(`Método de pago agregado para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Método de pago guardado correctamente',
      method: newMethod
    });
  } catch (error) {
    logger.error(`Error guardando método de pago: ${error.message}`);
    return res.status(500).json({ error: 'Error guardando método de pago' });
  }
});

// Obtener métodos de pago
router.get('/payment/methods', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { paymentMethods: true }
    });
    
    return res.json({
      success: true,
      methods: client.paymentMethods || []
    });
  } catch (error) {
    logger.error(`Error obteniendo métodos de pago: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo métodos de pago' });
  }
});

// Eliminar método de pago
router.delete('/payment/method/:methodId', authenticate, async (req, res) => {
  try {
    const { methodId } = req.params;
    
    // Obtener métodos de pago existentes
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { paymentMethods: true }
    });
    
    const existingMethods = client.paymentMethods || [];
    const updatedMethods = existingMethods.filter(method => method.id !== methodId);
    
    // Actualizar en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: { paymentMethods: updatedMethods }
    });
    
    logger.info(`Método de pago eliminado para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Método de pago eliminado correctamente'
    });
  } catch (error) {
    logger.error(`Error eliminando método de pago: ${error.message}`);
    return res.status(500).json({ error: 'Error eliminando método de pago' });
  }
});

// Obtener configuración del bot
router.get('/config/bot', authenticate, async (req, res) => {
  try {
    // Obtener la configuración del cliente
    const clientConfig = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        botConfig: true,
        companyInfo: true,
        emailConfig: true
      }
    });
    
    if (!clientConfig) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    // Devolver la configuración del bot con estructura completa
    const botConfig = clientConfig.botConfig || {};
    
    // Agregar información de empresa desde companyInfo si existe
    if (clientConfig.companyInfo) {
      botConfig.company = clientConfig.companyInfo;
    }
    
    // Agregar configuración de email si existe
    if (clientConfig.emailConfig) {
      botConfig.emailConfig = clientConfig.emailConfig;
    }
    
    return res.json(botConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración del bot: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo configuración del bot' });
  }
});

// Actualizar configuración del bot
router.put('/config/bot', authenticate, async (req, res) => {
  try {
    const {
      // Información de empresa
      companyName,
      companyDescription,
      companySector,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      
      // Configuración general
      botName,
      botPersonality,
      welcomeMessage,
      businessHours,
      
      // Configuración de horarios
      workingHours,
      workingDays,
      
      // Configuración de llamadas
      callConfig,
      
      // Configuración de emails
      emailConfig,
      
      // Configuración manual de email (IMAP/SMTP)
      emailManualConfig,
      
      // Configuración SMTP
      smtpConfig,
      
      // Configuración de IA
      aiConfig,
      
      // FAQs
      faqs,
      
      // Archivos de contexto
      contextFiles,
      files,
      
      // Campos legacy para compatibilidad
      voiceId,
      language,
      confirmationMessage,
      dtmfOptions,
      personality
    } = req.body;
    
    // Obtener configuración actual del bot
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    const currentBotConfig = currentClient.botConfig || {};
    const currentCompanyInfo = currentClient.companyInfo || {};
    const currentEmailConfig = currentClient.emailConfig || {};
    
    // Construir nueva configuración del bot
    const newBotConfig = {
      ...currentBotConfig,
      // Configuración general
      botName: botName || currentBotConfig.botName || 'Asistente Virtual',
      botPersonality: botPersonality || personality || currentBotConfig.botPersonality || currentBotConfig.personality || 'professional',
      welcomeMessage: welcomeMessage || currentBotConfig.welcomeMessage || "Bienvenido a nuestro asistente virtual",
      businessHours: businessHours || currentBotConfig.businessHours || 'Lun-Vie: 9:00-18:00',
      
      // Configuración de horarios
      workingHours: workingHours || currentBotConfig.workingHours || { opening: "09:00", closing: "18:00" },
      workingDays: workingDays || currentBotConfig.workingDays || {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      
      // Configuración de llamadas
      callConfig: callConfig || currentBotConfig.callConfig || {
        enabled: false,
        recordCalls: false,
        transcribeCalls: false,
        voiceId: voiceId || currentBotConfig.voiceId || process.env.ELEVENLABS_VOICE_ID,
        language: language || currentBotConfig.language || "es-ES",
        confirmationMessage: confirmationMessage || currentBotConfig.confirmationMessage || "Gracias por la información. Alguien se pondrá en contacto con usted a la brevedad."
      },
      
      // Configuración de IA
      aiConfig: aiConfig || currentBotConfig.aiConfig || {
        temperature: 0.7,
        maxTokens: 150,
        model: 'gpt-3.5-turbo'
      },
      
      // FAQs
      faqs: faqs || currentBotConfig.faqs || [],
      
      // Archivos de contexto
      contextFiles: files || contextFiles || currentBotConfig.contextFiles || {},
      
      // Campos legacy para compatibilidad
      voiceId: voiceId || callConfig?.voiceId || currentBotConfig.voiceId || process.env.ELEVENLABS_VOICE_ID,
      language: language || callConfig?.language || currentBotConfig.language || "es-ES",
      confirmationMessage: confirmationMessage || callConfig?.confirmationMessage || currentBotConfig.confirmationMessage || "Gracias por la información. Alguien se pondrá en contacto con usted a la brevedad.",
      dtmfOptions: dtmfOptions || currentBotConfig.dtmfOptions || [],
      personality: personality || botPersonality || currentBotConfig.personality || "professional"
    };
    
    // Construir información de empresa
    const newCompanyInfo = {
      ...currentCompanyInfo,
      name: companyName || currentCompanyInfo.name || '',
      description: companyDescription || currentCompanyInfo.description || '',
      sector: companySector || currentCompanyInfo.sector || '',
      address: companyAddress || currentCompanyInfo.address || '',
      phone: companyPhone || currentCompanyInfo.phone || '',
      email: companyEmail || currentCompanyInfo.email || '',
      website: companyWebsite || currentCompanyInfo.website || ''
    };
    
    // Construir configuración de email
    const newEmailConfig = {
      ...currentEmailConfig,
      ...emailConfig,
      smtpConfig: smtpConfig || currentEmailConfig.smtpConfig || {},
      emailManualConfig: emailManualConfig || currentEmailConfig.emailManualConfig || null
    };
    
    // Actualizar cliente con toda la configuración
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        botConfig: newBotConfig,
        companyInfo: newCompanyInfo,
        emailConfig: newEmailConfig
      }
    });
    
    return res.json({
      success: true,
      message: 'Configuración completa actualizada correctamente',
      botConfig: newBotConfig,
      companyInfo: newCompanyInfo,
      emailConfig: newEmailConfig
    });
  } catch (error) {
    logger.error(`Error actualizando configuración del bot: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando configuración del bot' });
  }
});

// Eliminar archivos de contexto
router.post('/config/delete-context-files', authenticate, async (req, res) => {
  try {
    const { filesToDelete } = req.body;
    
    if (!filesToDelete || !Array.isArray(filesToDelete) || filesToDelete.length === 0) {
      return res.status(400).json({ error: 'Se requiere una lista de archivos para eliminar' });
    }
    
    // Obtener configuración actual del bot
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    const currentBotConfig = currentClient.botConfig || {};
    const currentContextFiles = currentBotConfig.contextFiles || {};
    
    // Crear una copia del objeto de archivos de contexto
    const updatedContextFiles = { ...currentContextFiles };
    
    // Eliminar los archivos indicados
    let deletedCount = 0;
    filesToDelete.forEach(fileName => {
      // Buscar el archivo por nombre en todas las categorías
      Object.keys(updatedContextFiles).forEach(fileType => {
        if (updatedContextFiles[fileType] && updatedContextFiles[fileType].fileName === fileName) {
          delete updatedContextFiles[fileType];
          deletedCount++;
        }
      });
    });
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'No se encontraron los archivos para eliminar' });
    }
    
    // Actualizar la configuración del bot
    const updatedBotConfig = {
      ...currentBotConfig,
      contextFiles: updatedContextFiles
    };
    
    // Guardar en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: {
        botConfig: updatedBotConfig
      }
    });
    
    return res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} archivos de contexto`,
      deletedCount
    });
  } catch (error) {
    logger.error(`Error eliminando archivos de contexto: ${error.message}`);
    return res.status(500).json({ error: 'Error eliminando archivos de contexto' });
  }
});

// Verificar configuración del bot en base de datos
router.get('/config/verify-bot-config', authenticate, async (req, res) => {
  try {
    // Obtener la configuración actual del bot directamente de la base de datos
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        id: true,
        email: true,
        companyName: true,
        botConfig: true
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // Extraer información sobre archivos de contexto
    const contextFiles = client.botConfig?.contextFiles || {};
    const filesInfo = Object.entries(contextFiles).map(([fileType, fileInfo]) => ({
      fileType,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      uploadedAt: fileInfo.uploadedAt,
      status: fileInfo.status
    }));
    
    return res.json({
      success: true,
      clientId: client.id,
      email: client.email,
      companyName: client.companyName,
      botConfig: client.botConfig,
      contextFiles: filesInfo,
      contextFilesCount: filesInfo.length
    });
  } catch (error) {
    logger.error(`Error verificando configuración del bot: ${error.message}`);
    return res.status(500).json({ error: 'Error verificando configuración del bot' });
  }
});

// Subir archivo de contexto para el bot
router.post('/bot/upload-context', authenticate, async (req, res) => {
  try {
    const { fileType, fileName, fileContent, fileSize } = req.body;
    
    if (!fileType || !fileName || !fileContent) {
      return res.status(400).json({ error: 'Faltan datos del archivo' });
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['inventory', 'catalog', 'pricing', 'menu', 'samples', 'info'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }
    
    // Validar tamaño (10MB máximo)
    if (fileSize > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Archivo muy grande (máximo 10MB)' });
    }
    
    // Obtener configuración actual del bot
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    const currentBotConfig = currentClient.botConfig || {};
    const currentContextFiles = currentBotConfig.contextFiles || {};
    
    // En producción, aquí se subiría el archivo a un servicio de almacenamiento
    // Por ahora, simulamos guardando la información del archivo
    const fileInfo = {
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      status: 'processed'
    };
    
    // Actualizar archivos de contexto
    const updatedContextFiles = {
      ...currentContextFiles,
      [fileType]: fileInfo
    };
    
    const updatedBotConfig = {
      ...currentBotConfig,
      contextFiles: updatedContextFiles
    };
    
    // Actualizar en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: {
        botConfig: updatedBotConfig
      }
    });
    
    return res.json({
      success: true,
      message: 'Archivo de contexto subido correctamente',
      fileInfo
    });
  } catch (error) {
    logger.error(`Error subiendo archivo de contexto: ${error.message}`);
    return res.status(500).json({ error: 'Error subiendo archivo de contexto' });
  }
});

// Actualizar configuración de emails
router.put('/config/email', authenticate, async (req, res) => {
  try {
    const { forwardingRules, defaultRecipients, autoReply, autoReplyMessage } = req.body;
    
    const emailConfig = await prisma.emailConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        forwardingRules: forwardingRules ? JSON.stringify(forwardingRules) : undefined,
        defaultRecipients: defaultRecipients ? JSON.stringify(defaultRecipients) : undefined,
        autoReply: autoReply !== undefined ? autoReply : undefined,
        autoReplyMessage: autoReplyMessage || undefined,
      },
      create: {
        clientId: req.client.id,
        forwardingRules: forwardingRules ? JSON.stringify(forwardingRules) : "[]",
        defaultRecipients: defaultRecipients ? JSON.stringify(defaultRecipients) : "[]",
        autoReply: autoReply !== undefined ? autoReply : true,
        autoReplyMessage: autoReplyMessage || "Gracias por su email. Lo hemos recibido y será atendido a la brevedad.",
      }
    });
    
    return res.json({
      ...emailConfig,
      forwardingRules: JSON.parse(emailConfig.forwardingRules || "[]"),
      defaultRecipients: JSON.parse(emailConfig.defaultRecipients || "[]")
    });
  } catch (error) {
    logger.error(`Error actualizando configuración de emails: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando configuración de emails' });
  }
});

// Actualizar configuración de notificaciones
router.put('/config/notifications', authenticate, async (req, res) => {
  try {
    const { defaultRecipients, urgencyRules, classificationRules } = req.body;
    
    const notificationConfig = await prisma.notificationConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        defaultRecipients: defaultRecipients ? JSON.stringify(defaultRecipients) : undefined,
        urgencyRules: urgencyRules ? JSON.stringify(urgencyRules) : undefined,
        classificationRules: classificationRules ? JSON.stringify(classificationRules) : undefined,
      },
      create: {
        clientId: req.client.id,
        defaultRecipients: defaultRecipients ? JSON.stringify(defaultRecipients) : "[]",
        urgencyRules: urgencyRules ? JSON.stringify(urgencyRules) : "{}",
        classificationRules: classificationRules ? JSON.stringify(classificationRules) : "[]",
      }
    });
    
    return res.json({
      ...notificationConfig,
      defaultRecipients: JSON.parse(notificationConfig.defaultRecipients || "[]"),
      urgencyRules: JSON.parse(notificationConfig.urgencyRules || "{}"),
      classificationRules: JSON.parse(notificationConfig.classificationRules || "[]")
    });
  } catch (error) {
    logger.error(`Error actualizando configuración de notificaciones: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando configuración de notificaciones' });
  }
});

// Obtener números de teléfono disponibles por código de país/área
router.get('/phone/available', authenticate, async (req, res) => {
  try {
    const { countryCode, areaCode } = req.query;
    
    if (!countryCode) {
      return res.status(400).json({ error: 'Se requiere el código de país' });
    }
    
    const availableNumbers = await twilioService.listAvailableNumbers(countryCode, areaCode);
    
    if (!availableNumbers.success) {
      return res.status(500).json({ error: availableNumbers.error });
    }
    
    return res.json(availableNumbers.numbers);
  } catch (error) {
    logger.error(`Error obteniendo números disponibles: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo números disponibles' });
  }
});

// Comprar un nuevo número de teléfono
router.post('/phone/purchase', authenticate, async (req, res) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Se requiere el número de teléfono' });
    }
    
    // Comprar el número a través de Twilio
    const result = await twilioService.purchaseNumber(phoneNumber, req.client.id);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    // Guardar en base de datos
    const twilioNumber = await prisma.twilioNumber.create({
      data: {
        clientId: req.client.id,
        phoneNumber: result.phoneNumber,
        sid: result.sid,
        friendlyName: friendlyName || `Número ${result.phoneNumber}`,
        isActive: true
      }
    });
    
    return res.json(twilioNumber);
  } catch (error) {
    logger.error(`Error comprando número de teléfono: ${error.message}`);
    return res.status(500).json({ error: 'Error comprando número de teléfono' });
  }
});

// Obtener logs de llamadas
router.get('/logs/calls', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtro de fecha
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // Consulta con paginación
    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where: {
          clientId: req.client.id,
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.callLog.count({
        where: {
          clientId: req.client.id,
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        }
      })
    ]);
    
    return res.json({
      data: callLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo logs de llamadas: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo logs de llamadas' });
  }
});

// Obtener logs de emails
router.get('/logs/emails', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir filtro de fecha
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // Consulta con paginación
    const [emailLogs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where: {
          clientId: req.client.id,
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.emailLog.count({
        where: {
          clientId: req.client.id,
          ...(startDate || endDate ? { createdAt: dateFilter } : {})
        }
      })
    ]);
    
    return res.json({
      data: emailLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo logs de emails: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo logs de emails' });
  }
});

// === ENDPOINTS PARA OPERACIONES INDIVIDUALES DE LLAMADAS Y EMAILS ===

// Marcar llamada como gestionada
router.put('/calls/:callId/status', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const { managed } = req.body;
    
    const updatedCall = await prisma.callLog.update({
      where: { 
        id: parseInt(callId),
        clientId: req.client.id 
      },
      data: { managed: managed }
    });
    
    return res.json({ success: true, call: updatedCall });
  } catch (error) {
    logger.error(`Error actualizando estado de llamada: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando llamada' });
  }
});

// Obtener grabación de llamada
router.get('/calls/:callId/recording', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await prisma.callLog.findFirst({
      where: { 
        id: parseInt(callId),
        clientId: req.client.id 
      }
    });
    
    if (!call || !call.recordingUrl) {
      return res.status(404).json({ error: 'Grabación no encontrada' });
    }
    
    return res.json({ success: true, recordingUrl: call.recordingUrl });
  } catch (error) {
    logger.error(`Error obteniendo grabación: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo grabación' });
  }
});

// Marcar llamada como importante
router.put('/calls/:callId/importance', authenticate, async (req, res) => {
  try {
    const { callId } = req.params;
    const { important } = req.body;
    
    const updatedCall = await prisma.callLog.update({
      where: { 
        id: parseInt(callId),
        clientId: req.client.id 
      },
      data: { important: important }
    });
    
    return res.json({ success: true, call: updatedCall });
  } catch (error) {
    logger.error(`Error actualizando importancia de llamada: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando llamada' });
  }
});

// Marcar email como favorito
router.put('/emails/:emailId/favorite', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { favorite } = req.body;
    
    const updatedEmail = await prisma.emailLog.update({
      where: { 
        id: parseInt(emailId),
        clientId: req.client.id 
      },
      data: { favorite: favorite }
    });
    
    return res.json({ success: true, email: updatedEmail });
  } catch (error) {
    logger.error(`Error actualizando favorito de email: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando email' });
  }
});

// Marcar email como leído
router.put('/emails/:emailId/read', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;
    const { read } = req.body;
    
    const updatedEmail = await prisma.emailLog.update({
      where: { 
        id: parseInt(emailId),
        clientId: req.client.id 
      },
      data: { isRead: read }
    });
    
    return res.json({ success: true, email: updatedEmail });
  } catch (error) {
    logger.error(`Error actualizando estado de lectura: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando email' });
  }
});

// === ENDPOINTS PARA CONFIGURACIÓN DE VOZ Y LLAMADAS ===

// Obtener lista de voces disponibles
router.get('/voices', authenticate, async (req, res) => {
  try {
    const voices = await elevenlabsService.listVoices();
    if (!voices.success) {
      throw new Error(voices.error || 'Error al obtener voces');
    }
    return res.json(voices);
  } catch (error) {
    logger.error(`Error obteniendo voces: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo voces disponibles' });
  }
});

// Obtener configuración de voz actual
router.get('/voice-config', authenticate, async (req, res) => {
  try {
    const botConfig = await prisma.botConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    if (!botConfig) {
      return res.json({
        voiceId: process.env.ELEVENLABS_VOICE_ID,
        language: 'es-ES',
        welcomeMessage: 'Gracias por llamar. ¿En qué podemos ayudarle?',
        gatherPrompt: 'Por favor, indique su nombre y el motivo de su llamada.',
        retryPrompt: 'No he podido entenderle. Por favor, intente de nuevo.',
        followUpPrompt: '¿Hay algo más que le gustaría añadir?',
        goodbyeMessage: 'Gracias por contactar con nosotros.'
      });
    }
    
    // Extraer los campos relevantes para la configuración de voz
    return res.json({
      voiceId: botConfig.voiceId || process.env.ELEVENLABS_VOICE_ID,
      language: botConfig.language || 'es-ES',
      welcomeMessage: botConfig.welcomeMessage,
      gatherPrompt: botConfig.gatherPrompt,
      retryPrompt: botConfig.retryPrompt,
      followUpPrompt: botConfig.followUpPrompt,
      goodbyeMessage: botConfig.goodbyeMessage
    });
  } catch (error) {
    logger.error(`Error obteniendo configuración de voz: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo configuración de voz' });
  }
});

// Actualizar configuración de voz
router.post('/voice-config', authenticate, async (req, res) => {
  try {
    const { voiceId, language } = req.body;
    
    if (!voiceId) {
      return res.status(400).json({ error: 'Se requiere el ID de voz' });
    }
    
    const botConfig = await prisma.botConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        voiceId,
        language: language || 'es-ES'
      },
      create: {
        clientId: req.client.id,
        voiceId,
        language: language || 'es-ES',
        welcomeMessage: 'Gracias por llamar. ¿En qué podemos ayudarle?',
        gatherPrompt: 'Por favor, indique su nombre y el motivo de su llamada.',
        retryPrompt: 'No he podido entenderle. Por favor, intente de nuevo.',
        followUpPrompt: '¿Hay algo más que le gustaría añadir?',
        goodbyeMessage: 'Gracias por contactar con nosotros.'
      }
    });
    
    return res.json({
      voiceId: botConfig.voiceId,
      language: botConfig.language
    });
  } catch (error) {
    logger.error(`Error actualizando configuración de voz: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando configuración de voz' });
  }
});

// Actualizar mensajes de llamada
router.post('/call-messages', authenticate, async (req, res) => {
  try {
    const { welcomeMessage, gatherPrompt, retryPrompt, followUpPrompt, goodbyeMessage } = req.body;
    
    const botConfig = await prisma.botConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        welcomeMessage: welcomeMessage || undefined,
        gatherPrompt: gatherPrompt || undefined,
        retryPrompt: retryPrompt || undefined,
        followUpPrompt: followUpPrompt || undefined,
        goodbyeMessage: goodbyeMessage || undefined
      },
      create: {
        clientId: req.client.id,
        voiceId: process.env.ELEVENLABS_VOICE_ID,
        language: 'es-ES',
        welcomeMessage: welcomeMessage || 'Gracias por llamar. ¿En qué podemos ayudarle?',
        gatherPrompt: gatherPrompt || 'Por favor, indique su nombre y el motivo de su llamada.',
        retryPrompt: retryPrompt || 'No he podido entenderle. Por favor, intente de nuevo.',
        followUpPrompt: followUpPrompt || '¿Hay algo más que le gustaría añadir?',
        goodbyeMessage: goodbyeMessage || 'Gracias por contactar con nosotros.'
      }
    });
    
    return res.json({
      welcomeMessage: botConfig.welcomeMessage,
      gatherPrompt: botConfig.gatherPrompt,
      retryPrompt: botConfig.retryPrompt,
      followUpPrompt: botConfig.followUpPrompt,
      goodbyeMessage: botConfig.goodbyeMessage
    });
  } catch (error) {
    logger.error(`Error actualizando mensajes de llamada: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando mensajes de llamada' });
  }
});

// Previsualización de voz
router.post('/voice-preview', authenticate, async (req, res) => {
  try {
    const { voiceId, text } = req.body;
    
    if (!voiceId || !text) {
      return res.status(400).json({ error: 'Se requieren voiceId y text' });
    }
    
    const result = await elevenlabsService.generateBotResponse(text, voiceId);
    
    if (!result.success) {
      throw new Error(result.error || 'Error generando audio');
    }
    
    return res.json({
      success: true,
      audioUrl: result.audioUrl,
      durationEstimate: result.durationEstimate
    });
  } catch (error) {
    logger.error(`Error generando previsualización de voz: ${error.message}`);
    return res.status(500).json({ error: 'Error generando previsualización de voz' });
  }
});

// Obtener números de teléfono del cliente
router.get('/phone-numbers', authenticate, async (req, res) => {
  try {
    const twilioNumbers = await prisma.twilioNumber.findMany({
      where: { clientId: req.client.id }
    });
    
    return res.json({ numbers: twilioNumbers });
  } catch (error) {
    logger.error(`Error obteniendo números de teléfono: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo números de teléfono' });
  }
});

// Comprar un nuevo número de teléfono
router.post('/phone-numbers', authenticate, async (req, res) => {
  try {
    const { areaCode, capabilities } = req.body;
    
    if (!areaCode) {
      return res.status(400).json({ error: 'Se requiere código de área' });
    }
    
    const result = await twilioService.purchaseNumber(req.client.id, areaCode, capabilities);
    
    if (!result.success) {
      throw new Error(result.error || 'Error comprando número');
    }
    
    // Guardar el número en la base de datos
    const twilioNumber = await prisma.twilioNumber.create({
      data: {
        clientId: req.client.id,
        phoneNumber: result.phoneNumber,
        twilioSid: result.twilioSid,
        friendlyName: result.friendlyName || `Número de ${req.client.companyName}`
      }
    });
    
    return res.json(twilioNumber);
  } catch (error) {
    logger.error(`Error comprando número de teléfono: ${error.message}`);
    return res.status(500).json({ error: 'Error comprando número de teléfono' });
  }
});

// Liberar un número de teléfono
router.delete('/phone-numbers/:sid', authenticate, async (req, res) => {
  try {
    const { sid } = req.params;
    
    // Verificar que el número pertenece al cliente
    const twilioNumber = await prisma.twilioNumber.findFirst({
      where: {
        twilioSid: sid,
        clientId: req.client.id
      }
    });
    
    if (!twilioNumber) {
      return res.status(404).json({ error: 'Número no encontrado' });
    }
    
    // Liberar el número en Twilio
    const result = await twilioService.releaseNumber(sid);
    
    if (!result.success) {
      throw new Error(result.error || 'Error liberando número');
    }
    
    // Eliminar el número de la base de datos
    await prisma.twilioNumber.delete({
      where: { id: twilioNumber.id }
    });
    
    return res.json({ success: true, message: 'Número liberado correctamente' });
  } catch (error) {
    logger.error(`Error liberando número de teléfono: ${error.message}`);
    return res.status(500).json({ error: 'Error liberando número de teléfono' });
  }
});

// === ENDPOINTS PARA PAGOS CON STRIPE ===

// Crear una sesión de checkout para suscripción
router.post('/billing/create-checkout', authenticate, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    
    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Se requieren priceId, successUrl y cancelUrl' });
    }
    
    // Crear o actualizar cliente en Stripe
    let stripeCustomer;
    if (!req.client.stripeCustomerId) {
      stripeCustomer = await stripe.customers.create({
        email: req.client.email,
        name: req.client.companyName,
        metadata: {
          clientId: req.client.id
        }
      });
      
      // Actualizar el cliente con el ID de Stripe
      await prisma.client.update({
        where: { id: req.client.id },
        data: { stripeCustomerId: stripeCustomer.id }
      });
    } else {
      stripeCustomer = { id: req.client.stripeCustomerId };
    }
    
    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        clientId: req.client.id
      }
    });
    
    return res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error(`Error creando sesión de checkout: ${error.message}`);
    return res.status(500).json({ error: 'Error creando sesión de checkout' });
  }
});

// Obtener facturas del cliente
router.get('/billing/invoices', authenticate, async (req, res) => {
  try {
    if (!req.client.stripeCustomerId) {
      return res.json({ data: [], pagination: { total: 0 } });
    }
    
    const invoices = await stripe.invoices.list({
      customer: req.client.stripeCustomerId,
      limit: 10,
    });
    
    return res.json({
      data: invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000).toISOString(),
        periodStart: new Date(invoice.period_start * 1000).toISOString(),
        periodEnd: new Date(invoice.period_end * 1000).toISOString(),
        receiptUrl: invoice.hosted_invoice_url
      })),
      pagination: {
        total: invoices.total_count
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo facturas: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo facturas' });
  }
});

// Cancelar suscripción
router.post('/billing/cancel-subscription', authenticate, async (req, res) => {
  try {
    if (!req.client.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No tiene una suscripción activa' });
    }
    
    // Cancelar suscripción en Stripe
    const subscription = await stripe.subscriptions.cancel(
      req.client.stripeSubscriptionId
    );
    
    // Actualizar estado en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: { 
        subscriptionStatus: 'cancelled',
        subscriptionEndDate: new Date(subscription.current_period_end * 1000)
      }
    });
    
    return res.json({ 
      status: 'cancelled', 
      endDate: new Date(subscription.current_period_end * 1000).toISOString() 
    });
  } catch (error) {
    logger.error(`Error cancelando suscripción: ${error.message}`);
    return res.status(500).json({ error: 'Error cancelando suscripción' });
  }
});

// Obtener métodos de pago
router.get('/payment/methods', authenticate, async (req, res) => {
  try {
    if (!req.client.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }
    
    // Obtener métodos de pago de Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.client.stripeCustomerId,
      type: 'card'
    });
    
    return res.json({ 
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: pm.id === req.client.defaultPaymentMethodId
      }))
    });
  } catch (error) {
    logger.error(`Error obteniendo métodos de pago: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo métodos de pago' });
  }
});

// Agregar método de pago
router.post('/payment/method', authenticate, async (req, res) => {
  try {
    const { paymentMethodId, setAsDefault } = req.body;
    
    if (!paymentMethodId) {
      return res.status(400).json({ error: 'ID del método de pago requerido' });
    }
    
    // Crear cliente en Stripe si no existe
    let stripeCustomerId = req.client.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.client.email,
        name: req.client.companyName
      });
      stripeCustomerId = customer.id;
      
      await prisma.client.update({
        where: { id: req.client.id },
        data: { stripeCustomerId }
      });
    }
    
    // Adjuntar método de pago al cliente
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId
    });
    
    // Establecer como predeterminado si se solicita
    if (setAsDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      
      await prisma.client.update({
        where: { id: req.client.id },
        data: { defaultPaymentMethodId: paymentMethodId }
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Método de pago agregado exitosamente' 
    });
  } catch (error) {
    logger.error(`Error agregando método de pago: ${error.message}`);
    return res.status(500).json({ error: 'Error agregando método de pago' });
  }
});

// Obtener información de suscripción
router.get('/billing/subscription', authenticate, async (req, res) => {
  try {
    if (!req.client.stripeSubscriptionId) {
      return res.json({ 
        hasSubscription: false,
        status: 'inactive',
        plan: null
      });
    }
    
    // Obtener suscripción de Stripe
    const subscription = await stripe.subscriptions.retrieve(
      req.client.stripeSubscriptionId
    );
    
    const product = await stripe.products.retrieve(
      subscription.items.data[0].price.product
    );
    
    return res.json({
      hasSubscription: true,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: {
        id: subscription.items.data[0].price.id,
        name: product.name,
        amount: subscription.items.data[0].price.unit_amount / 100,
        currency: subscription.items.data[0].price.currency,
        interval: subscription.items.data[0].price.recurring.interval
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo suscripción: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo información de suscripción' });
  }
});

// Estadísticas del dashboard
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Obtener estadísticas de llamadas
    const callStats = await prisma.callLog.aggregate({
      where: {
        clientId: req.client.id,
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _sum: { duration: true }
    });
    
    // Obtener estadísticas de emails
    const emailStats = await prisma.emailLog.aggregate({
      where: {
        clientId: req.client.id,
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });
    
    // Obtener llamadas por estado
    const callsByStatus = await prisma.callLog.groupBy({
      by: ['callStatus'],
      where: {
        clientId: req.client.id,
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });
    
    // Obtener actividad reciente
    const recentCalls = await prisma.callLog.findMany({
      where: { clientId: req.client.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        callerNumber: true,
        callStatus: true,
        duration: true,
        createdAt: true
      }
    });
    
    const recentEmails = await prisma.emailLog.findMany({
      where: { clientId: req.client.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fromEmail: true,
        subject: true,
        status: true,
        createdAt: true
      }
    });
    
    return res.json({
      calls: {
        total: callStats._count.id || 0,
        totalMinutes: Math.round((callStats._sum.duration || 0) / 60),
        byStatus: callsByStatus.reduce((acc, item) => {
          acc[item.callStatus] = item._count.id;
          return acc;
        }, {})
      },
      emails: {
        total: emailStats._count.id || 0
      },
      recentActivity: {
        calls: recentCalls,
        emails: recentEmails
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo estadísticas del dashboard: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo estadísticas del dashboard' });
  }
});

// Obtener logs de actividad
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { clientId: req.client.id };
    
    // Filtros opcionales
    if (status) {
      whereClause.callStatus = status;
    }
    
    let logs = [];
    let totalCount = 0;
    
    if (!type || type === 'calls') {
      const callLogs = await prisma.callLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit),
        select: {
          id: true,
          twilioCallSid: true,
          callerNumber: true,
          callStatus: true,
          duration: true,
          recordingUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      const callCount = await prisma.callLog.count({ where: whereClause });
      
      logs = [...logs, ...callLogs.map(log => ({ ...log, type: 'call' }))];
      totalCount += callCount;
    }
    
    if (!type || type === 'emails') {
      const emailLogs = await prisma.emailLog.findMany({
        where: { clientId: req.client.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit),
        select: {
          id: true,
          fromEmail: true,
          toEmail: true,
          subject: true,
          status: true,
          aiResponse: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      const emailCount = await prisma.emailLog.count({ where: { clientId: req.client.id } });
      
      logs = [...logs, ...emailLogs.map(log => ({ ...log, type: 'email' }))];
      totalCount += emailCount;
    }
    
    // Ordenar por fecha
    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.json({
      logs: logs.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error(`Error obteniendo logs: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo logs' });
  }
});

// Obtener configuración de cuenta
router.get('/account', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      include: {
        subscription: true
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    return res.json({
      id: client.id,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone,
      industry: client.industry,
      createdAt: client.createdAt,
      subscription: client.subscription
    });
  } catch (error) {
    logger.error(`Error obteniendo datos de cuenta: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo datos de cuenta' });
  }
});

// Actualizar configuración de cuenta
router.put('/account', authenticate, async (req, res) => {
  try {
    const { companyName, phone, industry } = req.body;
    
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        companyName: companyName || undefined,
        phone: phone || undefined,
        industry: industry || undefined
      },
      include: {
        subscription: true
      }
    });
    
    return res.json({
      id: updatedClient.id,
      companyName: updatedClient.companyName,
      email: updatedClient.email,
      phone: updatedClient.phone,
      industry: updatedClient.industry,
      createdAt: updatedClient.createdAt,
      subscription: updatedClient.subscription
    });
  } catch (error) {
    logger.error(`Error actualizando datos de cuenta: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando datos de cuenta' });
  }
});

// === ENDPOINTS PARA CONFIGURACIÓN DE EMAILS ===

// Obtener configuración de email (endpoint para frontend)
router.get('/config/email', authenticate, async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    if (!emailConfig) {
      const defaultConfig = {
        autoResponse: true,
        defaultRecipients: [],
        forwardRules: '',
        signature: '',
        provider: '',
        outgoingEmail: ''
      };
      return res.json(defaultConfig);
    }
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración de email: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo configuración de email' });
  }
});

// Guardar configuración de email (endpoint para frontend)
router.put('/config/email', authenticate, async (req, res) => {
  try {
    const {
      autoResponse,
      forwardRules,
      signature,
      provider,
      outgoingEmail,
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      defaultRecipients,
      templates
    } = req.body;
    
    const emailConfig = await prisma.emailConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        autoResponse: autoResponse !== undefined ? autoResponse : undefined,
        forwardRules: forwardRules || undefined,
        signature: signature || undefined,
        provider: provider || undefined,
        outgoingEmail: outgoingEmail || undefined,
        imapHost: imapHost || undefined,
        imapPort: imapPort || undefined,
        imapUser: imapUser || undefined,
        imapPassword: imapPassword || undefined,
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort || undefined,
        smtpUser: smtpUser || undefined,
        smtpPassword: smtpPassword || undefined,
        defaultRecipients: defaultRecipients || undefined,
        templates: templates || undefined
      },
      create: {
        clientId: req.client.id,
        autoResponse: autoResponse || true,
        forwardRules: forwardRules || '',
        signature: signature || '',
        provider: provider || '',
        outgoingEmail: outgoingEmail || '',
        imapHost: imapHost || '',
        imapPort: imapPort || 993,
        imapUser: imapUser || '',
        imapPassword: imapPassword || '',
        smtpHost: smtpHost || '',
        smtpPort: smtpPort || 587,
        smtpUser: smtpUser || '',
        smtpPassword: smtpPassword || '',
        defaultRecipients: defaultRecipients || [],
        templates: templates || []
      }
    });
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    
    logger.info(`Configuración de email actualizada para cliente ${req.client.id}`);
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error guardando configuración de email: ${error.message}`);
    return res.status(500).json({ error: 'Error guardando configuración de email' });
  }
});

// Obtener configuración de email
router.get('/email/config', authenticate, async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    if (!emailConfig) {
      const defaultConfig = await prisma.emailConfig.create({
        data: {
          clientId: req.client.id,
          autoResponse: true,
          defaultRecipients: []
        }
      });
      return res.json(defaultConfig);
    }
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración de email: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo configuración de email' });
  }
});

// Actualizar configuración de email
router.put('/email/config', authenticate, async (req, res) => {
  try {
    const {
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      autoResponse,
      forwardingRules,
      templates,
      signature,
      defaultRecipients
    } = req.body;
    
    const emailConfig = await prisma.emailConfig.upsert({
      where: { clientId: req.client.id },
      update: {
        imapHost: imapHost || undefined,
        imapPort: imapPort || undefined,
        imapUser: imapUser || undefined,
        imapPassword: imapPassword || undefined,
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort || undefined,
        smtpUser: smtpUser || undefined,
        smtpPassword: smtpPassword || undefined,
        autoResponse: autoResponse !== undefined ? autoResponse : undefined,
        forwardingRules: forwardingRules || undefined,
        templates: templates || undefined,
        signature: signature || undefined,
        defaultRecipients: defaultRecipients || undefined
      },
      create: {
        clientId: req.client.id,
        imapHost: imapHost || null,
        imapPort: imapPort || 993,
        imapUser: imapUser || null,
        imapPassword: imapPassword || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort || 587,
        smtpUser: smtpUser || null,
        smtpPassword: smtpPassword || null,
        autoResponse: autoResponse ?? true,
        forwardingRules: forwardingRules || null,
        templates: templates || null,
        signature: signature || null,
        defaultRecipients: defaultRecipients || []
      }
    });
    
    // No devolver contraseñas
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error actualizando configuración de email: ${error.message}`);
    return res.status(500).json({ error: 'Error actualizando configuración de email' });
  }
});

// Probar conexión de email
router.post('/email/test-connection', authenticate, async (req, res) => {
  try {
    const { imapHost, imapPort, imapUser, imapPassword, smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;
    
    if (!imapHost || !imapUser || !imapPassword || !smtpHost || !smtpUser || !smtpPassword) {
      return res.status(400).json({ error: 'Faltan datos de configuración de email' });
    }
    
    const config = {
      imapHost,
      imapPort: imapPort || 993,
      imapUser,
      imapPassword,
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpUser,
      smtpPassword
    };
    
    const result = await emailService.testEmailConnection(config);
    
    if (result.success) {
      return res.json({ success: true, message: 'Conexión exitosa' });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error(`Error probando conexión de email: ${error.message}`);
    return res.status(500).json({ error: 'Error probando conexión de email' });
  }
});

// Iniciar monitoreo de emails
router.post('/email/start-monitoring', authenticate, async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    if (!emailConfig || !emailConfig.imapHost || !emailConfig.imapUser || !emailConfig.imapPassword) {
      return res.status(400).json({ error: 'Configuración de email incompleta' });
    }
    
    const result = await emailService.startEmailMonitoring(req.client.id, emailConfig);
    
    if (result.success) {
      return res.json({ success: true, message: 'Monitoreo de emails iniciado' });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error(`Error iniciando monitoreo de emails: ${error.message}`);
    return res.status(500).json({ error: 'Error iniciando monitoreo de emails' });
  }
});

// Detener monitoreo de emails
router.post('/email/stop-monitoring', authenticate, async (req, res) => {
  try {
    const result = await emailService.stopEmailMonitoring(req.client.id);
    
    return res.json({ success: true, message: 'Monitoreo de emails detenido' });
  } catch (error) {
    logger.error(`Error deteniendo monitoreo de emails: ${error.message}`);
    return res.status(500).json({ error: 'Error deteniendo monitoreo de emails' });
  }
});

// Obtener estado del monitoreo de emails
router.get('/email/monitoring-status', authenticate, async (req, res) => {
  try {
    const isMonitoring = emailService.isMonitoring(req.client.id);
    
    return res.json({ 
      isMonitoring,
      status: isMonitoring ? 'active' : 'inactive'
    });
  } catch (error) {
    logger.error(`Error obteniendo estado de monitoreo: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo estado de monitoreo' });
  }
});

// Enviar email de prueba
router.post('/email/send-test', authenticate, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Faltan datos para enviar el email' });
    }
    
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    if (!emailConfig || !emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
      return res.status(400).json({ error: 'Configuración SMTP incompleta' });
    }
    
    const result = await emailService.sendEmail(emailConfig, {
      to,
      subject: `[PRUEBA] ${subject}`,
      text: message,
      html: `<p>${message}</p>`
    });
    
    if (result.success) {
      return res.json({ success: true, message: 'Email de prueba enviado correctamente' });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error(`Error enviando email de prueba: ${error.message}`);
    return res.status(500).json({ error: 'Error enviando email de prueba' });
  }
});

// Obtener plantillas de email
router.get('/email/templates', authenticate, async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    const templates = emailConfig?.templates || [];
    
    return res.json({ templates });
  } catch (error) {
    logger.error(`Error obteniendo plantillas de email: ${error.message}`);
    return res.status(500).json({ error: 'Error obteniendo plantillas de email' });
  }
});

// Guardar plantilla de email
router.post('/email/templates', authenticate, async (req, res) => {
  try {
    const { name, subject, body, isDefault } = req.body;
    
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Faltan datos de la plantilla' });
    }
    
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { clientId: req.client.id }
    });
    
    let templates = emailConfig?.templates || [];
    
    // Si es plantilla por defecto, quitar el flag de otras
    if (isDefault) {
      templates = templates.map(t => ({ ...t, isDefault: false }));
    }
    
    // Agregar nueva plantilla
    const newTemplate = {
      id: Date.now().toString(),
      name,
      subject,
      body,
      isDefault: isDefault || false,
      createdAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    
    await prisma.emailConfig.upsert({
      where: { clientId: req.client.id },
      update: { templates },
      create: {
        clientId: req.client.id,
        templates,
        autoResponse: true,
        defaultRecipients: []
      }
    });
    
    return res.json({ success: true, template: newTemplate });
  } catch (error) {
    logger.error(`Error guardando plantilla de email: ${error.message}`);
    return res.status(500).json({ error: 'Error guardando plantilla de email' });
  }
});

module.exports = router;
