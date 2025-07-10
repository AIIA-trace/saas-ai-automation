const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthService {
  // Generar JWT para un cliente
  async generateToken(client) {
    try {
      const payload = {
        id: client.id,
        email: client.email,
        role: client.role || 'client'
      };
      
      return jwt.sign(
        payload, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' } // Token válido por 7 días
      );
    } catch (error) {
      logger.error(`Error generando token: ${error.message}`);
      throw new Error('Error al generar token de autenticación');
    }
  }

  // Validar JWT
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      logger.error(`Token inválido: ${error.message}`);
      return null;
    }
  }

  // Hash de contraseña
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verificar contraseña
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Registrar un nuevo cliente
  async registerClient(clientData) {
    try {
      const { email, password, companyName, contactPhone } = clientData;
      
      // Verificar si ya existe un cliente con ese email
      const existingClient = await prisma.client.findUnique({
        where: { email }
      });
      
      if (existingClient) {
        return { 
          success: false, 
          error: 'Ya existe un cliente con ese email' 
        };
      }
      
      // Generar hash de la contraseña
      const hashedPassword = await this.hashPassword(password);
      
      // Generar API key única
      const apiKey = crypto.randomBytes(32).toString('hex');
      
      // Crear configuraciones por defecto como objetos JSON
      const defaultBotConfig = {
        welcomeMessage: "Gracias por llamar. Esta llamada será grabada para mejorar nuestro servicio.",
        confirmationMessage: "Gracias por la información. Alguien se pondrá en contacto con usted a la brevedad.",
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'default',
        language: "es-ES",
        dtmfOptions: []
      };
      
      const defaultEmailConfig = {
        forwardingRules: [],
        defaultRecipients: [email],
        autoReply: true,
        autoReplyMessage: "Gracias por su email. Lo hemos recibido y será atendido a la brevedad."
      };
      
      const defaultNotificationConfig = {
        defaultRecipients: [email],
        urgencyRules: {},
        classificationRules: []
      };
      
      // Crear el cliente en la base de datos
      const client = await prisma.client.create({
        data: {
          email,
          password: hashedPassword,
          companyName,
          contactName: companyName,
          phone: contactPhone,
          apiKey,
          role: 'client',
          isActive: true,
          subscriptionStatus: 'trial',
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          botConfig: defaultBotConfig,
          emailConfig: defaultEmailConfig,
          notificationConfig: defaultNotificationConfig
        }
      });
      
      // Generar token
      const token = await this.generateToken(client);
      
      // No devolver datos sensibles
      const { password: _, apiKey: __, ...safeClient } = client;
      
      return {
        success: true,
        client: safeClient,
        token
      };
    } catch (error) {
      logger.error(`Error registrando cliente: ${error.message}`);
      return {
        success: false,
        error: 'Error al registrar el cliente'
      };
    }
  }

  // Login de cliente
  async loginClient(email, password) {
    try {
      // Buscar cliente por email
      const client = await prisma.client.findUnique({
        where: { email }
      });
      
      // Si no existe o está inactivo
      if (!client || !client.isActive) {
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }
      
      // Verificar contraseña
      const validPassword = await this.verifyPassword(password, client.password);
      if (!validPassword) {
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }
      
      // Generar token
      const token = await this.generateToken(client);
      
      // No devolver datos sensibles
      const { password: _, apiKey: __, ...safeClient } = client;
      
      return {
        success: true,
        client: safeClient,
        token
      };
    } catch (error) {
      logger.error(`Error en login: ${error.message}`);
      return {
        success: false,
        error: 'Error en autenticación'
      };
    }
  }

  // Generar nueva API key para un cliente
  async generateApiKey(clientId) {
    try {
      // Generar nueva API key
      const newApiKey = crypto.randomBytes(32).toString('hex');
      
      // Actualizar en base de datos
      await prisma.client.update({
        where: { id: clientId },
        data: { apiKey: newApiKey }
      });
      
      return {
        success: true,
        apiKey: newApiKey
      };
    } catch (error) {
      logger.error(`Error generando API key: ${error.message}`);
      return {
        success: false,
        error: 'Error generando API key'
      };
    }
  }

  // Cambiar contraseña
  async changePassword(clientId, currentPassword, newPassword) {
    try {
      // Buscar cliente
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });
      
      if (!client) {
        return {
          success: false,
          error: 'Cliente no encontrado'
        };
      }
      
      // Verificar contraseña actual
      const validPassword = await this.verifyPassword(currentPassword, client.password);
      if (!validPassword) {
        return {
          success: false,
          error: 'Contraseña actual incorrecta'
        };
      }
      
      // Hash de nueva contraseña
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Actualizar contraseña
      await prisma.client.update({
        where: { id: clientId },
        data: { password: hashedPassword }
      });
      
      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
    } catch (error) {
      logger.error(`Error cambiando contraseña: ${error.message}`);
      return {
        success: false,
        error: 'Error cambiando contraseña'
      };
    }
  }
  
  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email) {
    try {
      // Buscar cliente por email
      const client = await prisma.client.findUnique({
        where: { email }
      });
      
      // Siempre devolvemos éxito incluso si el email no existe (seguridad)
      if (!client) {
        return {
          success: true,
          message: 'Si el email existe, se enviará un enlace para restablecer la contraseña'
        };
      }
      
      // Generar token único
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      
      // Guardar token en base de datos
      await prisma.client.update({
        where: { id: client.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });
      
      // En un sistema real, aquí enviaríamos un email con el token
      // Para el MVP, solo devolvemos el token
      return {
        success: true,
        resetToken,
        message: 'Token generado correctamente'
      };
    } catch (error) {
      logger.error(`Error solicitando reset de contraseña: ${error.message}`);
      return {
        success: false,
        error: 'Error al procesar la solicitud'
      };
    }
  }
  
  // Restablecer contraseña con token
  async resetPassword(resetToken, newPassword) {
    try {
      // Buscar cliente por token
      const client = await prisma.client.findFirst({
        where: {
          resetToken,
          resetTokenExpiry: {
            gt: new Date() // Token no expirado
          }
        }
      });
      
      if (!client) {
        return {
          success: false,
          error: 'Token inválido o expirado'
        };
      }
      
      // Hash de nueva contraseña
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Actualizar contraseña y limpiar token
      await prisma.client.update({
        where: { id: client.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });
      
      return {
        success: true,
        message: 'Contraseña restablecida correctamente'
      };
    } catch (error) {
      logger.error(`Error restableciendo contraseña: ${error.message}`);
      return {
        success: false,
        error: 'Error restableciendo contraseña'
      };
    }
  }
}

module.exports = new AuthService();
