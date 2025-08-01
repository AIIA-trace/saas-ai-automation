const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Health check endpoint para Render
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
const { PrismaClient } = require('@prisma/client');

// INICIALIZAR PRISMA CON MANEJO DE ERRORES
let prisma;
try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });
  
  // Verificar conexión al inicializar
  prisma.$connect().then(() => {
    console.log('✅ Prisma conectado exitosamente a la base de datos');
  }).catch((error) => {
    console.error('❌ Error conectando Prisma:', error.message);
  });
  
} catch (error) {
  console.error('❌ Error inicializando Prisma:', error.message);
  prisma = null;
}
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

// === ENDPOINTS UNIFICADOS DEL CLIENTE (NUEVA API) ===

/**
 * ENDPOINT UNIFICADO para obtener TODOS los datos del cliente
 * - Esta es la ÚNICA fuente de verdad para datos del cliente
 * - Reemplaza múltiples endpoints fragmentados
 * - Elimina duplicaciones y posibles inconsistencias
 */
router.get('/client', authenticate, async (req, res) => {
  try {
    logger.info('🚀 INICIANDO GET /client - ENDPOINT UNIFICADO');
    logger.info(`🔑 Cliente autenticado ID: ${req.client?.id}`);
    
    // Obtener datos completos del cliente
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        // Datos de perfil
        id: true,
        email: true,
        companyName: true,
        contactName: true,
        phone: true,
        industry: true,
        address: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        
        // Datos de suscripción
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        
        // Configuraciones (objetos JSON)
        botConfig: true,
        companyInfo: true,
        emailConfig: true,
        notificationConfig: true
      }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // NORMALIZAR estructura de datos para frontend
    const responseData = {
      // Datos de perfil
      profile: {
        id: client.id,
        email: client.email || '',
        companyName: client.companyName || '',
        contactName: client.contactName || '',
        phone: client.phone || '',
        industry: client.industry || 
                (client.companyInfo?.sector) || '',
        address: client.address || 
                (client.companyInfo?.address) || '',
        website: client.website || 
                (client.companyInfo?.website) || ''
      },
      
      // Datos del bot
      bot: {
        name: client.botConfig?.name || 'Asistente Virtual',
        personality: client.botConfig?.personality || '',
        workingHours: client.botConfig?.workingHours || {
          opening: '09:00',
          closing: '18:00'
        },
        workingDays: client.botConfig?.workingDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      },
      
      // Configuración de llamadas
      calls: {
        enabled: client.botConfig?.callConfig?.enabled || false,
        voiceId: client.botConfig?.callConfig?.voiceId || 'es-ES-Standard-A',
        language: client.botConfig?.callConfig?.language || 'es-ES',
        recordCalls: client.botConfig?.callConfig?.recordCalls || true,
        greeting: client.botConfig?.callConfig?.greeting || ''
      },
      
      // Configuración de email
      email: client.emailConfig || {
        emailProvider: '',
        imapHost: '',
        imapPort: '',
        imapUser: '',
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        emailSignature: '',
        useSSL: false
      },
      
      // Configuración de IA
      aiConfig: client.botConfig?.aiConfig || {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 800
      },
      
      // FAQs y archivos de contexto
      faqs: client.botConfig?.faqs || [],
      contextFiles: client.botConfig?.contextFiles || [],
      
      // Datos de suscripción
      subscription: {
        status: client.subscriptionStatus || 'inactive',
        expiresAt: client.subscriptionExpiresAt || null
      }
    };
    
    // Enviar respuesta exitosa
    const successResponse = {
      success: true,
      data: responseData
    };
    
    const jsonString = JSON.stringify(successResponse);
    logger.info(`📤 Enviando respuesta unificada exitosa (${jsonString.length} bytes)`);
    logger.info('🏁 FINALIZANDO GET /client exitosamente');
    
    return res.json(successResponse);
  } catch (error) {
    logger.error(`❌ ERROR en GET /client: ${error.message}`);
    logger.error(`📋 Stack trace: ${error.stack}`);
    
    return res.status(500).json({
      success: false,
      error: 'Error obteniendo datos del cliente',
      details: error.message
    });
  }
});

/**
 * ENDPOINT UNIFICADO para actualizar TODOS los datos del cliente
 * - Esta es la ÚNICA forma de actualizar datos del cliente
 * - Reemplaza múltiples endpoints fragmentados
 * - Garantiza consistencia de datos
 */
router.put('/client', authenticate, async (req, res) => {
  try {
    logger.info('🚀 INICIANDO PUT /client - ENDPOINT UNIFICADO');
    logger.info(`🔑 Cliente autenticado ID: ${req.client?.id}`);
    
    // Extraer datos de la petición
    const { profile, bot, calls, email, aiConfig, faqs, contextFiles } = req.body;
    
    // Validar que hay datos para actualizar
    if (!profile && !bot && !calls && !email && !aiConfig && !faqs) {
      return res.status(400).json({
        success: false,
        error: 'No hay datos para actualizar'
      });
    }
    
    // Obtener cliente actual para preservar datos existentes
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        botConfig: true,
        companyInfo: true,
        emailConfig: true
      }
    });
    
    if (!currentClient) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // PREPARAR DATOS PARA ACTUALIZACIÓN
    
    // 1. Datos de perfil (campos directos en la tabla client)
    const profileData = profile ? {
      companyName: profile.companyName,
      contactName: profile.contactName,
      phone: profile.phone,
      industry: profile.industry,
      address: profile.address,
      website: profile.website
    } : {};
    
    // 2. Configuración del bot (objeto JSON botConfig)
    const currentBotConfig = currentClient.botConfig || {};
    let newBotConfig = { ...currentBotConfig };
    
    // Actualizar configuración general del bot
    if (bot) {
      newBotConfig = {
        ...newBotConfig,
        name: bot.name || newBotConfig.name || 'Asistente Virtual',
        personality: bot.personality || newBotConfig.personality || '',
        workingHours: bot.workingHours || newBotConfig.workingHours || {
          opening: '09:00',
          closing: '18:00'
        },
        workingDays: bot.workingDays || newBotConfig.workingDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      };
    }
    
    // Actualizar configuración de llamadas
    if (calls) {
      newBotConfig.callConfig = {
        ...newBotConfig.callConfig || {},
        enabled: calls.enabled !== undefined ? calls.enabled : 
                 newBotConfig.callConfig?.enabled || false,
        voiceId: calls.voiceId || newBotConfig.callConfig?.voiceId || 'es-ES-Standard-A',
        language: calls.language || newBotConfig.callConfig?.language || 'es-ES',
        recordCalls: calls.recordCalls !== undefined ? calls.recordCalls : 
                     newBotConfig.callConfig?.recordCalls || true,
        greeting: calls.greeting || newBotConfig.callConfig?.greeting || ''
      };
    }
    
    // Actualizar configuración de IA
    if (aiConfig) {
      newBotConfig.aiConfig = {
        ...newBotConfig.aiConfig || {},
        model: aiConfig.model || newBotConfig.aiConfig?.model || 'gpt-4',
        temperature: aiConfig.temperature || newBotConfig.aiConfig?.temperature || 0.7,
        maxTokens: aiConfig.maxTokens || newBotConfig.aiConfig?.maxTokens || 800
      };
    }
    
    // Actualizar FAQs
    if (faqs) {
      newBotConfig.faqs = faqs;
    }
    
    // Actualizar archivos de contexto
    if (contextFiles) {
      newBotConfig.contextFiles = contextFiles;
    }
    
    // 3. Información de la empresa (objeto JSON companyInfo)
    const currentCompanyInfo = currentClient.companyInfo || {};
    const newCompanyInfo = profile ? {
      ...currentCompanyInfo,
      name: profile.companyName || currentCompanyInfo.name || '',
      sector: profile.industry || currentCompanyInfo.sector || '',
      phone: profile.phone || currentCompanyInfo.phone || '',
      email: profile.email || currentCompanyInfo.email || '',
      address: profile.address || currentCompanyInfo.address || '',
      website: profile.website || currentCompanyInfo.website || ''
    } : currentCompanyInfo;
    
    // 4. Configuración de email (objeto JSON emailConfig)
    const newEmailConfig = email || currentClient.emailConfig || {};
    
    // EJECUTAR ACTUALIZACIÓN
    const updateData = {
      // Campos directos
      ...profileData,
      
      // Objetos JSON
      botConfig: newBotConfig,
      companyInfo: newCompanyInfo,
      emailConfig: newEmailConfig,
      
      // Timestamp de actualización
      updatedAt: new Date()
    };
    
    // Log de los datos que se van a actualizar (sin datos sensibles)
    const sanitizedUpdateData = { ...updateData };
    if (sanitizedUpdateData.emailConfig) {
      sanitizedUpdateData.emailConfig = { 
        ...sanitizedUpdateData.emailConfig,
        imapPassword: '[REDACTED]',
        smtpPassword: '[REDACTED]'
      };
    }
    logger.info(`📝 Datos a actualizar: ${JSON.stringify(sanitizedUpdateData)}`);
    
    // Actualizar en la base de datos
    await prisma.client.update({
      where: { id: req.client.id },
      data: updateData
    });
    
    logger.info('✅ Cliente actualizado exitosamente');
    logger.info('🏁 FINALIZANDO PUT /client exitosamente');
    
    return res.json({
      success: true,
      message: 'Cliente actualizado exitosamente'
    });
  } catch (error) {
    logger.error(`❌ ERROR en PUT /client: ${error.message}`);
    logger.error(`📋 Stack trace: ${error.stack}`);
    
    return res.status(500).json({
      success: false,
      error: 'Error actualizando datos del cliente',
      details: error.message
    });
  }
});

// === ENDPOINTS UNIFICADOS PARA ARCHIVOS DE CONTEXTO ===

// Subir archivos de contexto (endpoint unificado)
router.post('/client/context-files', authenticate, async (req, res) => {
  try {
    logger.info('🚀 INICIANDO POST /client/context-files - ENDPOINT UNIFICADO');
    logger.info(`🔑 Cliente autenticado ID: ${req.client?.id}`);
    
    const { fileType, fileName, fileContent, fileSize } = req.body;
    
    if (!fileType || !fileName || !fileContent) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan datos del archivo' 
      });
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['inventory', 'catalog', 'pricing', 'menu', 'samples', 'info'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Tipo de archivo no permitido' 
      });
    }
    
    // Validar tamaño (10MB máximo)
    if (fileSize > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false,
        error: 'Archivo muy grande (máximo 10MB)' 
      });
    }
    
    // Obtener configuración actual del bot
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    if (!currentClient) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
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
    
    logger.info(`✅ Archivo de contexto ${fileName} subido correctamente para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: 'Archivo de contexto subido correctamente',
      fileInfo
    });
  } catch (error) {
    logger.error(`❌ Error subiendo archivo de contexto: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    return res.status(500).json({
      success: false,
      error: 'Error interno al subir archivo de contexto',
      details: error.message
    });
  }
});

// Eliminar archivos de contexto (endpoint unificado)
router.post('/client/context-files/delete', authenticate, async (req, res) => {
  try {
    logger.info('🚀 INICIANDO POST /client/context-files/delete - ENDPOINT UNIFICADO');
    logger.info(`🔑 Cliente autenticado ID: ${req.client?.id}`);
    
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere una lista de archivos para eliminar' 
      });
    }
    
    // Obtener configuración actual del bot
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    if (!currentClient) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    const currentBotConfig = currentClient.botConfig || {};
    const currentContextFiles = currentBotConfig.contextFiles || {};
    
    // Crear una copia del objeto de archivos de contexto
    const updatedContextFiles = { ...currentContextFiles };
    
    // Eliminar los archivos indicados
    let deletedCount = 0;
    files.forEach(fileName => {
      // Buscar el archivo por nombre en todas las categorías
      Object.keys(updatedContextFiles).forEach(fileType => {
        if (updatedContextFiles[fileType] && updatedContextFiles[fileType].fileName === fileName) {
          delete updatedContextFiles[fileType];
          deletedCount++;
        }
      });
    });
    
    if (deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No se encontraron los archivos para eliminar' 
      });
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
    
    logger.info(`✅ Se eliminaron ${deletedCount} archivos de contexto para cliente ${req.client.id}`);
    
    return res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} archivos de contexto`,
      deletedCount
    });
  } catch (error) {
    logger.error(`❌ Error eliminando archivos de contexto: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    return res.status(500).json({
      success: false,
      error: 'Error interno al eliminar archivos de contexto',
      details: error.message
    });
  }
});

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

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado GET /api/client
 * Este endpoint será eliminado en futuras versiones
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    // LOGGING DETALLADO PARA DIAGNOSTICAR PROBLEMA JSON
    logger.info('🚀 INICIANDO GET /profile');
    logger.info(`📋 Headers recibidos: ${JSON.stringify(req.headers, null, 2)}`);
    logger.info(`🔑 Cliente autenticado: ${!!req.client}`);
    logger.info(`🆔 Cliente ID: ${req.client?.id}`);
    
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('❌ Prisma client no está inicializado');
      const errorResponse = { 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      };
      logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
      return res.status(500).json(errorResponse);
    }
    
    // VERIFICAR QUE EL CLIENTE ESTÉ AUTENTICADO
    if (!req.client || !req.client.id) {
      logger.error('❌ Cliente no autenticado en request');
      const errorResponse = { 
        error: 'Cliente no autenticado',
        success: false 
      };
      logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
      return res.status(401).json(errorResponse);
    }
    
    logger.info(`🔍 Obteniendo perfil para cliente ID: ${req.client.id}`);
    
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
          companyDescription: true, // Agregar campo nuevo
          createdAt: true,
          updatedAt: true
          // Excluir password y apiKey por seguridad
        }
      });
      
      logger.info(`📊 Cliente encontrado en BD: ${!!client}`);
      
      if (!client) {
        logger.error(`❌ Cliente no encontrado en BD: ${req.client.id}`);
        const errorResponse = { 
          error: 'Cliente no encontrado',
          success: false 
        };
        logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
        return res.status(404).json(errorResponse);
      }
      
      logger.info(`✅ Perfil obtenido exitosamente para: ${client.email}`);
      
      // Verificar que el cliente tenga los datos mínimos necesarios
      if (!client.companyName) {
        logger.warn(`⚠️ Cliente ${req.client.id} sin companyName`);
      }
      
      // Asegurar estructura completa del objeto cliente
      const clientData = {
        id: client.id,
        companyName: client.companyName || '',
        contactName: client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        website: client.website || '',
        industry: client.industry || '',
        address: client.address || '',
        timezone: client.timezone || 'Europe/Madrid',
        language: client.language || 'es',
        companyDescription: client.companyDescription || '',
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      };
      
      const successResponse = {
        success: true,
        client: clientData
      };
      
      // Verificar que la respuesta sea un JSON válido
      const jsonString = JSON.stringify(successResponse);
      if (!jsonString) {
        throw new Error('No se pudo convertir la respuesta a JSON string');
      }
      
      logger.info(`📤 Enviando respuesta exitosa (${jsonString.length} bytes)`);
      logger.info('🏁 FINALIZANDO GET /profile exitosamente');
      
      return res.json(successResponse);
    } catch (dbError) {
      // Manejo específico para errores de base de datos
      logger.error(`❌ ERROR DE BASE DE DATOS: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        error: 'Error accediendo a la base de datos',
        details: dbError.message
      });
    }
  } catch (error) {
    logger.error(`❌ ERROR CRÍTICO en GET /profile: ${error.message}`);
    logger.error(`📋 Stack trace completo: ${error.stack}`);
    logger.error(`🔍 Tipo de error: ${error.constructor.name}`);
    logger.error(`📊 Cliente ID en error: ${req.client?.id}`);
    
    // RESPUESTA SIEMPRE VÁLIDA JSON CON LOGGING DETALLADO
    const errorResponse = { 
      error: 'Error interno del servidor obteniendo perfil',
      success: false,
      details: error.message,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Verificar que podemos convertir a JSON antes de enviar
      const jsonString = JSON.stringify(errorResponse);
      if (!jsonString) {
        return res.status(500).send('{"error": "Error interno del servidor", "success": false}');
      }
      
      logger.info(`📤 Enviando respuesta de error crítico: ${jsonString}`);
      logger.info('🏁 FINALIZANDO GET /profile con error');
      
      return res.status(500).json(errorResponse);
    } catch (jsonError) {
      // Si ni siquiera podemos convertir el error a JSON, enviar respuesta de fallback
      logger.error(`❌ ERROR FATAL: No se pudo crear JSON de error: ${jsonError.message}`);
      return res.status(500).send('{"error": "Error interno del servidor", "success": false}');
    }
  }
});

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado GET /api/client
 * Este endpoint era un alias de /api/profile y será eliminado en futuras versiones
 */
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    // LOGGING DETALLADO PARA DIAGNOSTICAR PROBLEMA JSON
    logger.info('🚀 INICIANDO GET /auth/me (alias de /profile)');
    logger.info(`🔑 Cliente autenticado: ${!!req.client}`);
    logger.info(`🆔 Cliente ID: ${req.client?.id}`);
    
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('❌ Prisma client no está inicializado');
      const errorResponse = { 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      };
      logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
      return res.status(500).json(errorResponse);
    }
    
    // Asegurar que req.client exista después de autenticación
    if (!req.client || !req.client.id) {
      logger.error('❌ Cliente no autenticado correctamente');
      const errorResponse = {
        error: 'Autenticación no válida',
        success: false
      };
      logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
      return res.status(401).json(errorResponse);
    }
    
    logger.info(`🔍 Obteniendo perfil para cliente ID: ${req.client.id}`);
    
    try {
      // Consulta a la base de datos
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
          companyDescription: true,
          createdAt: true,
          updatedAt: true
          // Excluir password y apiKey por seguridad
        }
      });
      
      if (!client) {
        logger.warn(`⚠️ Cliente no encontrado en BD: ${req.client.id}`);
        const errorResponse = { 
          error: 'Cliente no encontrado',
          success: false 
        };
        logger.info(`📤 Enviando respuesta de error: ${JSON.stringify(errorResponse)}`);
        return res.status(404).json(errorResponse);
      }
      
      // Asegurar estructura completa del objeto cliente para evitar undefined
      const clientData = {
        id: client.id,
        companyName: client.companyName || '',
        contactName: client.contactName || '',
        email: client.email || '',
        phone: client.phone || '',
        website: client.website || '',
        industry: client.industry || '',
        address: client.address || '',
        timezone: client.timezone || 'Europe/Madrid',
        language: client.language || 'es',
        companyDescription: client.companyDescription || '',
        createdAt: client.createdAt || new Date(),
        updatedAt: client.updatedAt || new Date()
      };
      
      // Crear respuesta exitosa con estructura validada
      const successResponse = {
        success: true,
        client: clientData
      };
      
      // Validar que la respuesta sea JSON válido
      const jsonString = JSON.stringify(successResponse);
      JSON.parse(jsonString); // Verificar que se puede parsear sin errores
      
      logger.info(`📊 Cliente encontrado en BD: ${!!client}`);
      logger.info(`✅ Perfil obtenido exitosamente para: ${client.email}`);
      logger.info(`📤 Enviando respuesta exitosa (${jsonString.length} bytes)`);
      logger.info('🏁 FINALIZANDO GET /auth/me exitosamente');
      
      return res.json(successResponse);
      
    } catch (dbError) {
      // Manejo específico para errores de base de datos
      logger.error(`❌ ERROR DE BASE DE DATOS: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        error: 'Error accediendo a la base de datos',
        details: dbError.message
      });
    }
  } catch (error) {
    logger.error(`❌ ERROR CRÍTICO en GET /auth/me: ${error.message}`);
    logger.error(`📋 Stack trace completo: ${error.stack}`);
    logger.error(`🔍 Tipo de error: ${error.constructor.name}`);
    
    // Crear respuesta de error genérica pero con estructura garantizada
    const errorResponse = {
      error: 'Error interno del servidor obteniendo perfil',
      success: false,
      details: error.message,
      timestamp: new Date().toISOString()
    };
    
    // Asegurar que la respuesta sea un JSON válido
    try {
      const jsonString = JSON.stringify(errorResponse);
      JSON.parse(jsonString); // Verificar que se puede parsear sin errores
      logger.info(`📤 Enviando respuesta de error: ${jsonString}`);
      return res.status(500).json(errorResponse);
    } catch (jsonError) {
      logger.error(`❌ ERROR FATAL: No se pudo crear JSON de error: ${jsonError.message}`);
      return res.status(500).send('{"error": "Error interno del servidor", "success": false}');
    }
  }
});

// Endpoint para estado de conexión de email
router.get('/email/connection', authenticate, async (req, res) => {
  try {
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('Prisma client no está inicializado');
      return res.status(500).json({ 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      });
    }
    
    // VERIFICAR QUE EL CLIENTE ESTÉ AUTENTICADO
    if (!req.client || !req.client.id) {
      logger.error('Cliente no autenticado en request');
      return res.status(401).json({ 
        error: 'Cliente no autenticado',
        success: false 
      });
    }
    
    logger.info(`Obteniendo estado de conexión de email para cliente ID: ${req.client.id}`);
    
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        emailConfig: true
      }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado en BD: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {};
    const isConnected = !!(emailConfig.outgoingEmail && emailConfig.imapServer && emailConfig.smtpServer);
    
    logger.info(`Estado de conexión de email para cliente ${req.client.id}: ${isConnected}`);
    
    return res.json({
      success: true,
      connected: isConnected,
      hasConfig: !!emailConfig.outgoingEmail,
      provider: emailConfig.emailProvider || 'none'
    });
  } catch (error) {
    logger.error(`Error obteniendo estado de conexión de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor obteniendo estado de conexión',
      success: false,
      details: error.message 
    });
  }
});

// Endpoint para obtener FAQs del bot
// ENDPOINT OBSOLETO: Usar GET /api/client en su lugar y acceder a botConfig.faqs
router.get('/bot/faqs', authenticate, async (req, res) => {
  logger.warn(`⚠️ Endpoint obsoleto GET /bot/faqs usado por cliente ${req.client?.id}`);
  logger.warn('Este endpoint será eliminado próximamente. Usar GET /api/client en su lugar.');
  
  try {
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('Prisma client no está inicializado');
      return res.status(500).json({ 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      });
    }
    
    // VERIFICAR QUE EL CLIENTE ESTÉ AUTENTICADO
    if (!req.client || !req.client.id) {
      logger.error('Cliente no autenticado en request');
      return res.status(401).json({ 
        error: 'Cliente no autenticado',
        success: false 
      });
    }
    
    logger.info(`Obteniendo FAQs para cliente ID: ${req.client.id}`);
    
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: {
        botConfig: true
      }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado en BD: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const botConfig = client.botConfig || {};
    const faqs = botConfig.faqs || [];
    
    logger.info(`FAQs obtenidas para cliente ${req.client.id}: ${faqs.length} elementos`);
    
    return res.json({
      success: true,
      faqs: faqs
    });
  } catch (error) {
    logger.error(`Error obteniendo FAQs: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor obteniendo FAQs',
      success: false,
      details: error.message 
    });
  }
});

// Actualizar perfil del cliente
/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado PUT /api/client
 * Este endpoint será eliminado en futuras versiones
 */
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
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('Prisma client no está inicializado');
      return res.status(500).json({ 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      });
    }
    
    // VERIFICAR QUE EL CLIENTE ESTÉ AUTENTICADO
    if (!req.client || !req.client.id) {
      logger.error('Cliente no autenticado en request');
      return res.status(401).json({ 
        error: 'Cliente no autenticado',
        success: false 
      });
    }
    
    logger.info(`Obteniendo métodos de pago para cliente ID: ${req.client.id}`);
    
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { paymentMethods: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado en BD: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const methods = client.paymentMethods || [];
    logger.info(`Métodos de pago obtenidos para cliente ${req.client.id}: ${methods.length} métodos`);
    
    return res.json({
      success: true,
      methods: methods
    });
  } catch (error) {
    logger.error(`Error obteniendo métodos de pago: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor obteniendo métodos de pago',
      success: false,
      details: error.message 
    });
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
/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado GET /api/client
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.get('/config/bot', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto GET /config/bot usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a GET /api/client antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('❌ Prisma client no está inicializado');
      return res.status(500).json({ 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      });
    }
    
    // VERIFICAR QUE EL CLIENTE ESTÉ AUTENTICADO
    if (!req.client || !req.client.id) {
      logger.error('❌ Cliente no autenticado en request');
      return res.status(401).json({ 
        error: 'Cliente no autenticado',
        success: false 
      });
    }
    
    logger.info(`🔍 Redirigiendo solicitud al nuevo endpoint unificado GET /client`);
    
    try {
      // Obtener la configuración completa del cliente
      const clientConfig = await prisma.client.findUnique({
        where: { id: req.client.id },
        select: {
          // Campos JSON de configuración
          botConfig: true,
          companyInfo: true,
          emailConfig: true,
          // Campos directos del cliente necesarios para el formulario
          companyName: true,
          companyDescription: true,
          contactName: true,
          phone: true,
          website: true,
          address: true,
          industry: true,
          language: true,
          email: true
        }
      });
      
      if (!clientConfig) {
        logger.error(`❌ Cliente no encontrado en BD: ${req.client.id}`);
        return res.status(404).json({ 
          error: 'Cliente no encontrado',
          success: false 
        });
      }
      
      logger.info(`✅ Cliente encontrado en BD: ${clientConfig.email || req.client.id}`);
      
      // Asegurar que todos los campos existan, incluso los que falten
      // Construir estructura de respuesta que espera el frontend con valores por defecto seguros
      const response = {
        // Configuración del bot
        botConfig: clientConfig.botConfig || {
          botName: 'Asistente Virtual',
          botPersonality: 'professional',
          welcomeMessage: 'Bienvenido a nuestro asistente virtual',
          businessHours: 'Lun-Vie: 9:00-18:00',
          callConfig: {
            enabled: false,
            recordCalls: false,
            transcribeCalls: false,
            voiceId: 'female',
            language: 'es-ES',
            greeting: 'Hola, ha llamado a nuestra empresa. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?'
          },
          aiConfig: {
            temperature: 0.7,
            maxTokens: 150,
            model: 'gpt-3.5-turbo'
          },
          faqs: [],
          contextFiles: {}
        },
        
        // Información de empresa
        companyInfo: {
          name: clientConfig.companyName || '',
          description: clientConfig.companyDescription || '',
          sector: clientConfig.industry || '',
          address: clientConfig.address || '',
          phone: clientConfig.phone || '',
          email: clientConfig.email || '',
          website: clientConfig.website || '',
          // Mantener cualquier información adicional de companyInfo JSON
          ...(clientConfig.companyInfo || {})
        },
        
        // Configuración de email
        emailConfig: clientConfig.emailConfig || {
          enabled: false,
          provider: '',
          outgoingEmail: '',
          recipientEmail: '',
          forwardRules: '',
          autoReply: false,
          autoReplyMessage: '',
          language: 'es-ES',
          emailSignature: '',
          emailConsent: false,
          imapServer: '',
          imapPort: 993,
          smtpServer: '',
          smtpPort: 587,
          useSSL: false
        },
        
        // Información adicional del cliente
        clientInfo: {
          contactName: clientConfig.contactName || '',
          language: clientConfig.language || 'es'
        }
      };
      
      // Verificar botConfig callConfig para evitar objeto nulo
      if (response.botConfig && !response.botConfig.callConfig) {
        response.botConfig.callConfig = {
          enabled: false,
          recordCalls: false,
          transcribeCalls: false,
          voiceId: 'female',
          language: 'es-ES',
          greeting: 'Hola, ha llamado a nuestra empresa. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?'
        };
      }
      
      // Verificar botConfig aiConfig para evitar objeto nulo
      if (response.botConfig && !response.botConfig.aiConfig) {
        response.botConfig.aiConfig = {
          temperature: 0.7,
          maxTokens: 150,
          model: 'gpt-3.5-turbo'
        };
      }
      
      logger.info(`✅ Configuración del bot obtenida exitosamente para cliente ${req.client.id}`);
      
      // Verificar que la respuesta sea un JSON válido
      try {
        const jsonString = JSON.stringify({
          success: true,
          ...response
        });
        
        if (!jsonString) {
          throw new Error('No se pudo convertir la respuesta a JSON string');
        }
        
        logger.info(`📤 Enviando respuesta exitosa (${jsonString.length} bytes)`);
        logger.info('🏁 FINALIZANDO GET /config/bot exitosamente');
        
        return res.json({
          success: true,
          ...response
        });
      } catch (jsonError) {
        logger.error(`❌ ERROR JSON STRINGIFY: ${jsonError.message}`);
        throw new Error(`Error al convertir configuración del bot a JSON: ${jsonError.message}`);
      }
    } catch (dbError) {
      // Manejo específico para errores de base de datos
      logger.error(`❌ ERROR DE BASE DE DATOS: ${dbError.message}`);
      return res.status(500).json({
        success: false,
        error: 'Error accediendo a la base de datos',
        details: dbError.message
      });
    }
  } catch (error) {
    logger.error(`❌ ERROR CRÍTICO en GET /config/bot: ${error.message}`);
    logger.error(`📋 Stack trace: ${error.stack}`);
    
    try {
      // Verificar que podemos convertir a JSON antes de enviar
      const errorResponse = { 
        error: 'Error interno del servidor obteniendo configuración del bot',
        success: false,
        details: error.message,
        timestamp: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(errorResponse);
      if (!jsonString) {
        return res.status(500).send('{"error": "Error interno del servidor", "success": false}');
      }
      
      logger.info(`📤 Enviando respuesta de error: ${jsonString.substring(0, 200)}`);
      return res.status(500).json(errorResponse);
    } catch (jsonError) {
      // Si ni siquiera podemos convertir el error a JSON, enviar respuesta de fallback
      logger.error(`❌ ERROR FATAL: No se pudo crear JSON de error: ${jsonError.message}`);
      return res.status(500).send('{"error": "Error interno del servidor", "success": false}');
    }
  }
});

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado PUT /api/client
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.put('/config/bot', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto PUT /config/bot usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a PUT /api/client antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
    // Extraer datos del request body
    const {
      // Información de empresa
      companyName, companyDescription, companySector, companyAddress, companyPhone, companyEmail, companyWebsite,
      // Configuración general
      botName, botPersonality, welcomeMessage, businessHours,
      // Configuración de horarios
      workingHours, workingDays,
      // Configuración de llamadas
      callConfig,
      // Configuración de emails
      emailConfig,
      // Configuración avanzada de IA
      aiConfig,
      // Preguntas frecuentes
      faqs,
      // Archivos de contexto
      files, contextFiles,
      // Campos legacy para compatibilidad
      voiceId, language, confirmationMessage, dtmfOptions, personality
    } = req.body;
    
    // Obtener configuración actual del cliente
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id }
    });
    
    if (!currentClient) {
      return res.status(404).json({ error: 'Cliente no encontrado', success: false });
    }
    
    // Preparar datos para actualización
    const updateData = {};
    
    // Construir configuración del bot
    const currentBotConfig = currentClient.botConfig || {};
    const newBotConfig = {
      ...currentBotConfig,
      // Información básica
      name: botName || currentBotConfig.name || 'Asistente Virtual',
      personality: botPersonality || personality || currentBotConfig.personality || 'professional',
      welcomeMessage: welcomeMessage || confirmationMessage || currentBotConfig.welcomeMessage || currentBotConfig.confirmationMessage || '',
      businessHours: businessHours || currentBotConfig.businessHours || '',
      
      // Configuración de horarios
      workingHours: workingHours || currentBotConfig.workingHours || {},
      workingDays: workingDays || currentBotConfig.workingDays || {},
      
      // Configuración de llamadas
      callConfig: callConfig ? {
        ...currentBotConfig.callConfig,
        ...callConfig
      } : currentBotConfig.callConfig || {},
      
      // Configuración avanzada de IA
      aiConfig: aiConfig ? {
        ...currentBotConfig.aiConfig,
        ...aiConfig
      } : currentBotConfig.aiConfig || {},
      
      // Preguntas frecuentes
      faqs: faqs || currentBotConfig.faqs || [],
      
      // Archivos de contexto
      contextFiles: contextFiles || files || currentBotConfig.contextFiles || {},
      
      // Campos legacy para compatibilidad
      voiceId: voiceId || callConfig?.voiceId || currentBotConfig.voiceId || process.env.ELEVENLABS_VOICE_ID || 'female',
      language: language || callConfig?.language || currentBotConfig.language || 'es-ES',
      confirmationMessage: confirmationMessage || welcomeMessage || callConfig?.greeting || currentBotConfig.confirmationMessage || '',
      dtmfOptions: dtmfOptions || currentBotConfig.dtmfOptions || []
    };
    
    updateData.botConfig = newBotConfig;
    
    // Construir información de empresa
    const currentCompanyInfo = currentClient.companyInfo || {};
    if (companyName || companyDescription || companySector || companyAddress || companyPhone || companyEmail || companyWebsite) {
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
      updateData.companyInfo = newCompanyInfo;
    }
    
    // Construir configuración de email
    const currentEmailConfig = currentClient.emailConfig || {};
    if (emailConfig) {
      const newEmailConfig = {
        ...currentEmailConfig,
        ...emailConfig
      };
      updateData.emailConfig = newEmailConfig;
    }
    
    // Actualizar también campos individuales del cliente para consistencia
    if (companyName) updateData.companyName = companyName;
    if (companySector) updateData.industry = companySector;
    
    logger.info('Datos preparados para actualización:', JSON.stringify(updateData, null, 2));
    
    // Actualizar cliente en la base de datos
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: updateData
    });
    
    logger.info('Cliente actualizado exitosamente');
    
    return res.json({
      success: true,
      message: 'Configuración del bot actualizada correctamente',
      botConfig: updatedClient.botConfig,
      companyInfo: updatedClient.companyInfo,
      emailConfig: updatedClient.emailConfig
    });
  } catch (error) {
    logger.error(`Error actualizando configuración del bot: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor actualizando configuración del bot',
      success: false,
      details: error.message 
    });
  }
});

// Eliminar archivos de contexto
// ENDPOINT OBSOLETO: Usar POST /api/client/context-files/delete en su lugar
/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado POST /api/client/context-files/delete
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.post('/config/delete-context-files', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto POST /config/delete-context-files usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a POST /api/client/context-files/delete antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
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
// ENDPOINT OBSOLETO: Usar POST /api/client/context-files en su lugar
/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado POST /api/client/context-files
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.post('/bot/upload-context', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto POST /bot/upload-context usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a POST /api/client/context-files antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
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

// ENDPOINT ELIMINADO: Duplicado de PUT /config/email
// El endpoint correcto está más abajo en el archivo y usa client.emailConfig JSON correctamente

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
    
    // Parsear JSON de forma segura para evitar errores
    let parsedDefaultRecipients, parsedUrgencyRules, parsedClassificationRules;
    
    try {
      parsedDefaultRecipients = JSON.parse(notificationConfig.defaultRecipients || "[]");
    } catch (e) {
      logger.warn(`Error parseando defaultRecipients: ${e.message}`);
      parsedDefaultRecipients = [];
    }
    
    try {
      parsedUrgencyRules = JSON.parse(notificationConfig.urgencyRules || "{}");
    } catch (e) {
      logger.warn(`Error parseando urgencyRules: ${e.message}`);
      parsedUrgencyRules = {};
    }
    
    try {
      parsedClassificationRules = JSON.parse(notificationConfig.classificationRules || "[]");
    } catch (e) {
      logger.warn(`Error parseando classificationRules: ${e.message}`);
      parsedClassificationRules = [];
    }
    
    return res.json({
      ...notificationConfig,
      defaultRecipients: parsedDefaultRecipients,
      urgencyRules: parsedUrgencyRules,
      classificationRules: parsedClassificationRules
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

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado GET /api/client
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.get('/config/email', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto GET /config/email usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a GET /api/client antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
    // VERIFICAR QUE PRISMA ESTÉ DISPONIBLE
    if (!prisma || !prisma.client) {
      logger.error('Prisma client no está inicializado');
      return res.status(500).json({ 
        error: 'Error de base de datos - Prisma no inicializado',
        success: false 
      });
    }
    
    // VERIFICAR AUTENTICACIÓN
    if (!req.client || !req.client.id) {
      logger.error('Cliente no autenticado en config/email');
      return res.status(401).json({ 
        error: 'Cliente no autenticado',
        success: false 
      });
    }
    
    logger.info(`Obteniendo configuración de email para cliente ID: ${req.client.id}`);
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {};
    
    // Si no hay configuración, devolver configuración por defecto
    if (!emailConfig || Object.keys(emailConfig).length === 0) {
      const defaultConfig = {
        enabled: false,
        provider: '',
        outgoingEmail: '',
        recipientEmail: '',
        forwardRules: '',
        autoReply: false,
        autoReplyMessage: '',
        language: 'es-ES',
        emailSignature: '',
        emailConsent: false,
        imapServer: '',
        imapPort: 993,
        smtpServer: '',
        smtpPort: 587,
        useSSL: false
      };
      return res.json(defaultConfig);
    }
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    delete safeConfig.emailPassword;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error obteniendo configuración de email',
      success: false,
      details: error.message
    });
  }
});

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado PUT /api/client
 * Este endpoint será eliminado en la próxima versión (V2.0)
 * Toda la funcionalidad ha sido migrada al endpoint unificado
 */
router.put('/config/email', authenticate, async (req, res) => {
  try {
    logger.warn(`⚠️ DEPRECATED API: Endpoint obsoleto PUT /config/email usado por cliente ${req.client?.id}`);
    logger.warn('🛑 ACCIÓN REQUERIDA: Migrar a PUT /api/client antes de la próxima actualización');
    logger.warn('📝 Ver documentación: https://docs.example.com/api/migration-guide');
    
    logger.info(`Guardando configuración de email para cliente ${req.client.id}`);
    logger.info('Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    // Obtener configuración actual del cliente
    const currentClient = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!currentClient) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    // Combinar configuración existente con nueva configuración
    const currentEmailConfig = currentClient.emailConfig || {};
    const newEmailConfig = {
      ...currentEmailConfig,
      ...req.body, // Sobrescribir con nuevos valores
      updatedAt: new Date().toISOString()
    };
    
    // Actualizar el campo emailConfig JSON en la tabla Client
    const updatedClient = await prisma.client.update({
      where: { id: req.client.id },
      data: {
        emailConfig: newEmailConfig
      },
      select: { emailConfig: true }
    });
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...updatedClient.emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    delete safeConfig.emailPassword;
    
    logger.info(`Configuración de email actualizada exitosamente para cliente ${req.client.id}`);
    return res.json({
      success: true,
      emailConfig: safeConfig
    });
  } catch (error) {
    logger.error(`Error guardando configuración de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error guardando configuración de email',
      success: false,
      details: error.message
    });
  }
});

/**
 * @deprecated ENDPOINT OBSOLETO - Usar el nuevo endpoint unificado GET /api/client
 * Este endpoint será eliminado en futuras versiones
 */
router.get('/email/config', authenticate, async (req, res) => {
  try {
    logger.info(`Redirigiendo /email/config a /config/email para cliente ${req.client.id}`);
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {
      enabled: false,
      autoResponse: true,
      defaultRecipients: [],
      provider: '',
      outgoingEmail: ''
    };
    
    // No devolver contraseñas por seguridad
    const safeConfig = { ...emailConfig };
    delete safeConfig.imapPassword;
    delete safeConfig.smtpPassword;
    delete safeConfig.emailPassword;
    
    return res.json(safeConfig);
  } catch (error) {
    logger.error(`Error obteniendo configuración de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error obteniendo configuración de email',
      success: false,
      details: error.message
    });
  }
});

// ENDPOINT ELIMINADO: Duplicado de PUT /config/email
// El endpoint correcto usa client.emailConfig JSON y está en la sección principal

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
    logger.info(`Iniciando monitoreo de emails para cliente ${req.client.id}`);
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {};
    
    if (!emailConfig.imapHost || !emailConfig.imapUser || !emailConfig.imapPassword) {
      return res.status(400).json({ 
        error: 'Configuración de email incompleta. Faltan datos IMAP.',
        success: false
      });
    }
    
    const result = await emailService.startEmailMonitoring(req.client.id, emailConfig);
    
    if (result.success) {
      logger.info(`Monitoreo de emails iniciado exitosamente para cliente ${req.client.id}`);
      return res.json({ success: true, message: 'Monitoreo de emails iniciado' });
    } else {
      logger.error(`Error en emailService: ${result.error}`);
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error(`Error iniciando monitoreo de emails: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error iniciando monitoreo de emails',
      success: false,
      details: error.message
    });
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
      return res.status(400).json({ 
        error: 'Faltan datos para enviar el email',
        success: false
      });
    }
    
    logger.info(`Enviando email de prueba para cliente ${req.client.id} a ${to}`);
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {};
    
    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
      return res.status(400).json({ 
        error: 'Configuración SMTP incompleta. Faltan datos de servidor.',
        success: false
      });
    }
    
    const result = await emailService.sendEmail(emailConfig, {
      to,
      subject: `[PRUEBA] ${subject}`,
      text: message,
      html: `<p>${message}</p>`
    });
    
    if (result.success) {
      logger.info(`Email de prueba enviado exitosamente a ${to}`);
      return res.json({ success: true, message: 'Email de prueba enviado correctamente' });
    } else {
      logger.error(`Error enviando email de prueba: ${result.error}`);
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error(`Error enviando email de prueba: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error enviando email de prueba',
      success: false,
      details: error.message
    });
  }
});

// Obtener plantillas de email
router.get('/email/templates', authenticate, async (req, res) => {
  try {
    logger.info(`Obteniendo plantillas de email para cliente ${req.client.id}`);
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const emailConfig = client.emailConfig || {};
    const templates = emailConfig.templates || [];
    
    logger.info(`Plantillas encontradas: ${templates.length}`);
    return res.json({ 
      success: true,
      templates 
    });
  } catch (error) {
    logger.error(`Error obteniendo plantillas de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error obteniendo plantillas de email',
      success: false,
      details: error.message
    });
  }
});

// Guardar plantilla de email
router.post('/email/templates', authenticate, async (req, res) => {
  try {
    logger.info(`Guardando plantilla de email para cliente ${req.client.id}`);
    const { name, subject, body, isDefault } = req.body;
    
    if (!name || !subject || !body) {
      return res.status(400).json({ 
        error: 'Faltan datos de la plantilla',
        success: false
      });
    }
    
    // Obtener cliente con su emailConfig JSON
    const client = await prisma.client.findUnique({
      where: { id: req.client.id },
      select: { emailConfig: true }
    });
    
    if (!client) {
      logger.error(`Cliente no encontrado: ${req.client.id}`);
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        success: false 
      });
    }
    
    const currentEmailConfig = client.emailConfig || {};
    let templates = currentEmailConfig.templates || [];
    
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
    
    // Actualizar emailConfig JSON en la tabla Client
    const updatedEmailConfig = {
      ...currentEmailConfig,
      templates,
      updatedAt: new Date().toISOString()
    };
    
    await prisma.client.update({
      where: { id: req.client.id },
      data: {
        emailConfig: updatedEmailConfig
      }
    });
    
    logger.info(`Plantilla guardada exitosamente: ${newTemplate.name}`);
    return res.json({ 
      success: true, 
      template: newTemplate 
    });
  } catch (error) {
    logger.error(`Error guardando plantilla de email: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Error guardando plantilla de email',
      success: false,
      details: error.message
    });
  }
});

module.exports = router;
