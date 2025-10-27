const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class GoogleEmailService {
  constructor() {
    this.oauth2Client = null;
  }

  /**
   * Inicializar cliente OAuth2 de Google
   */
  initOAuth2Client() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Faltan credenciales de Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
    }

    // Usar la URL del backend, no del frontend
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:10000'}/api/email/oauth/google/callback`;
    
    logger.info(`🔗 Google OAuth redirect URI: ${redirectUri}`);

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    return this.oauth2Client;
  }

  /**
   * Generar URL de autorización de Google
   * @param {number} clientId - ID del cliente
   * @returns {string} URL de autorización
   */
  getAuthUrl(clientId) {
    const oauth2Client = this.initOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: JSON.stringify({ clientId }) // Pasar clientId en el state
    });

    return authUrl;
  }

  /**
   * Intercambiar código de autorización por tokens
   * @param {string} code - Código de autorización
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Información de la cuenta
   */
  async exchangeCodeForTokens(code, clientId) {
    try {
      const oauth2Client = this.initOAuth2Client();

      // Intercambiar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Obtener información del usuario
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const email = userInfo.data.email;

      // Guardar o actualizar cuenta en la base de datos
      const emailAccount = await prisma.emailAccount.upsert({
        where: {
          clientId_email: {
            clientId: clientId,
            email: email
          }
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
          lastSync: new Date(),
          metadata: {
            scope: tokens.scope
          }
        },
        create: {
          clientId: clientId,
          provider: 'google',
          email: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
          lastSync: new Date(),
          metadata: {
            scope: tokens.scope
          }
        }
      });

      logger.info(`✅ Cuenta de Gmail conectada: ${email} para cliente ${clientId}`);

      return {
        success: true,
        email: email,
        accountId: emailAccount.id
      };

    } catch (error) {
      logger.error(`❌ Error intercambiando código por tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener cliente OAuth2 autenticado para un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Cliente OAuth2 autenticado
   */
  async getAuthenticatedClient(clientId) {
    try {
      // Obtener cuenta de email activa
      const emailAccount = await prisma.emailAccount.findFirst({
        where: {
          clientId: clientId,
          provider: 'google',
          isActive: true
        }
      });

      if (!emailAccount) {
        throw new Error('No hay cuenta de Gmail conectada');
      }

      const oauth2Client = this.initOAuth2Client();

      // Configurar tokens
      oauth2Client.setCredentials({
        access_token: emailAccount.accessToken,
        refresh_token: emailAccount.refreshToken,
        expiry_date: emailAccount.tokenExpiry ? emailAccount.tokenExpiry.getTime() : null
      });

      // Verificar si el token ha expirado y refrescarlo si es necesario
      if (emailAccount.tokenExpiry && new Date() >= emailAccount.tokenExpiry) {
        logger.info(`🔄 Token expirado, refrescando para cliente ${clientId}...`);
        
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        // Actualizar tokens en la base de datos
        await prisma.emailAccount.update({
          where: { id: emailAccount.id },
          data: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || emailAccount.refreshToken,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
          }
        });

        logger.info(`✅ Token refrescado exitosamente`);
      }

      return oauth2Client;

    } catch (error) {
      logger.error(`❌ Error obteniendo cliente autenticado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener bandeja de entrada (inbox)
   * @param {number} clientId - ID del cliente
   * @param {number} maxResults - Número máximo de emails a obtener
   * @returns {Promise<Array>} Lista de emails
   */
  async getInbox(clientId, maxResults = 50) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Obtener lista de mensajes
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        labelIds: ['INBOX']
      });

      const messages = response.data.messages || [];

      // Obtener detalles de cada mensaje
      const emailPromises = messages.map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        return this.parseGmailMessage(msg.data);
      });

      const emails = await Promise.all(emailPromises);

      logger.info(`📧 Obtenidos ${emails.length} emails de Gmail para cliente ${clientId}`);

      return emails;

    } catch (error) {
      logger.error(`❌ Error obteniendo inbox de Gmail: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parsear mensaje de Gmail a formato estándar
   * @param {Object} message - Mensaje de Gmail
   * @returns {Object} Email parseado
   */
  parseGmailMessage(message) {
    const headers = message.payload.headers;
    
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    let body = '';
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      snippet: message.snippet,
      labelIds: message.labelIds || [],
      isRead: !message.labelIds?.includes('UNREAD'),
      isStarred: message.labelIds?.includes('STARRED')
    };
  }

  /**
   * Enviar email
   * @param {number} clientId - ID del cliente
   * @param {Object} emailData - Datos del email
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail(clientId, emailData) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Construir mensaje en formato RFC 2822
      const message = [
        `To: ${emailData.to}`,
        `Subject: ${emailData.subject}`,
        '',
        emailData.body
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      logger.info(`✅ Email enviado exitosamente: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id
      };

    } catch (error) {
      logger.error(`❌ Error enviando email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desconectar cuenta de Gmail
   * @param {number} clientId - ID del cliente
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async disconnectAccount(clientId) {
    try {
      await prisma.emailAccount.updateMany({
        where: {
          clientId: clientId,
          provider: 'google'
        },
        data: {
          isActive: false
        }
      });

      logger.info(`✅ Cuenta de Gmail desconectada para cliente ${clientId}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error desconectando cuenta: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GoogleEmailService();
