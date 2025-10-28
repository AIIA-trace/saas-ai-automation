const { Client } = require('@microsoft/microsoft-graph-client');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const axios = require('axios');

const prisma = new PrismaClient();

class MicrosoftEmailService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/email/oauth/microsoft/callback`;
    this.authority = 'https://login.microsoftonline.com/common';
    this.tokenEndpoint = `${this.authority}/oauth2/v2.0/token`;
  }

  /**
   * Generar URL de autorización de Microsoft
   * @param {number} clientId - ID del cliente
   * @returns {string} URL de autorización
   */
  getAuthUrl(clientId) {
    if (!this.clientId) {
      throw new Error('Falta MICROSOFT_CLIENT_ID en variables de entorno');
    }

    const scopes = [
      'offline_access',
      'User.Read',
      'Mail.Read',
      'Mail.Send',
      'Mail.ReadWrite'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: JSON.stringify({ clientId })
    });

    return `${this.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Intercambiar código de autorización por tokens
   * @param {string} code - Código de autorización
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Object>} Información de la cuenta
   */
  async exchangeCodeForTokens(code, clientId) {
    try {
      // Intercambiar código por tokens
      const tokenResponse = await axios.post(this.tokenEndpoint, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = tokenResponse.data;

      // Obtener información del usuario
      const graphClient = this.createGraphClient(tokens.access_token);
      const userInfo = await graphClient.api('/me').get();

      const email = userInfo.mail || userInfo.userPrincipalName;

      // Calcular fecha de expiración del token
      const tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

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
          tokenExpiry: tokenExpiry,
          isActive: true,
          lastSync: new Date(),
          metadata: {
            scope: tokens.scope
          }
        },
        create: {
          clientId: clientId,
          provider: 'microsoft',
          email: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokenExpiry,
          isActive: true,
          lastSync: new Date(),
          metadata: {
            scope: tokens.scope
          }
        }
      });

      logger.info(`✅ Cuenta de Outlook conectada: ${email} para cliente ${clientId}`);

      return {
        success: true,
        email: email,
        accountId: emailAccount.id
      };

    } catch (error) {
      logger.error(`❌ Error intercambiando código por tokens: ${error.message}`);
      if (error.response) {
        logger.error(`Detalles: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Crear cliente de Microsoft Graph autenticado
   * @param {string} accessToken - Token de acceso
   * @returns {Client} Cliente de Graph
   */
  createGraphClient(accessToken) {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  /**
   * Refrescar token de acceso
   * @param {string} refreshToken - Token de refresco
   * @returns {Promise<Object>} Nuevos tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokenResponse = await axios.post(this.tokenEndpoint, new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return tokenResponse.data;

    } catch (error) {
      logger.error(`❌ Error refrescando token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener cliente Graph autenticado para un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<Client>} Cliente Graph autenticado
   */
  async getAuthenticatedClient(clientId) {
    try {
      // Obtener cuenta de email activa
      const emailAccount = await prisma.emailAccount.findFirst({
        where: {
          clientId: clientId,
          provider: 'microsoft',
          isActive: true
        }
      });

      if (!emailAccount) {
        throw new Error('No hay cuenta de Outlook conectada');
      }

      // Verificar si el token ha expirado
      if (emailAccount.tokenExpiry && new Date() >= emailAccount.tokenExpiry) {
        logger.info(`🔄 Token expirado, refrescando para cliente ${clientId}...`);

        const tokens = await this.refreshAccessToken(emailAccount.refreshToken);
        const tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

        // Actualizar tokens en la base de datos
        await prisma.emailAccount.update({
          where: { id: emailAccount.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || emailAccount.refreshToken,
            tokenExpiry: tokenExpiry
          }
        });

        logger.info(`✅ Token refrescado exitosamente`);

        return this.createGraphClient(tokens.access_token);
      }

      return this.createGraphClient(emailAccount.accessToken);

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
      const graphClient = await this.getAuthenticatedClient(clientId);

      // Obtener mensajes de la bandeja de entrada
      const response = await graphClient
        .api('/me/mailFolders/inbox/messages')
        .top(maxResults)
        .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,flag')
        .orderby('receivedDateTime DESC')
        .get();

      const emails = response.value.map(message => this.parseOutlookMessage(message));

      logger.info(`📧 Obtenidos ${emails.length} emails de Outlook para cliente ${clientId}`);

      return emails;

    } catch (error) {
      logger.error(`❌ Error obteniendo inbox de Outlook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parsear mensaje de Outlook a formato estándar
   * @param {Object} message - Mensaje de Outlook
   * @returns {Object} Email parseado
   */
  parseOutlookMessage(message) {
    return {
      id: message.id,
      from: message.from?.emailAddress?.address || '',
      fromName: message.from?.emailAddress?.name || '',
      to: message.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
      subject: message.subject || '(Sin asunto)',
      date: message.receivedDateTime,
      body: message.body?.content || '',
      bodyType: message.body?.contentType || 'text',
      snippet: message.bodyPreview || '',
      isRead: message.isRead,
      isStarred: message.flag?.flagStatus === 'flagged'
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
      const graphClient = await this.getAuthenticatedClient(clientId);

      const message = {
        subject: emailData.subject,
        body: {
          contentType: 'Text',
          content: emailData.body
        },
        toRecipients: [
          {
            emailAddress: {
              address: emailData.to
            }
          }
        ]
      };

      await graphClient
        .api('/me/sendMail')
        .post({
          message: message
        });

      logger.info(`✅ Email enviado exitosamente a ${emailData.to}`);

      return {
        success: true
      };

    } catch (error) {
      logger.error(`❌ Error enviando email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener emails enviados
   * @param {number} clientId - ID del cliente
   * @param {number} maxResults - Número máximo de emails a obtener
   * @returns {Promise<Array>} Lista de emails enviados
   */
  async getSent(clientId, maxResults = 50) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      // Obtener mensajes de la carpeta de enviados
      const response = await graphClient
        .api('/me/mailFolders/sentitems/messages')
        .top(maxResults)
        .select('id,subject,from,toRecipients,sentDateTime,bodyPreview,body,isRead')
        .orderby('sentDateTime DESC')
        .get();

      const emails = response.value.map(message => ({
        ...this.parseOutlookMessage(message),
        date: message.sentDateTime
      }));

      logger.info(`📧 Obtenidos ${emails.length} emails enviados de Outlook para cliente ${clientId}`);

      return emails;

    } catch (error) {
      logger.error(`❌ Error obteniendo emails enviados de Outlook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar email como leído
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Resultado de la operación
   */
  async markAsRead(clientId, emailId) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      await graphClient
        .api(`/me/messages/${emailId}`)
        .patch({
          isRead: true
        });

      logger.info(`✅ Email ${emailId} marcado como leído`);

      return {
        success: true
      };

    } catch (error) {
      logger.error(`❌ Error marcando email como leído: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener detalles de un email
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Detalles del email
   */
  async getEmailDetails(clientId, emailId) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      const message = await graphClient
        .api(`/me/messages/${emailId}`)
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,isRead,flag,hasAttachments,internetMessageId')
        .get();

      const emailDetails = {
        ...this.parseOutlookMessage(message),
        cc: message.ccRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        bcc: message.bccRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        hasAttachments: message.hasAttachments,
        messageId: message.internetMessageId
      };

      logger.info(`✅ Detalles del email ${emailId} obtenidos`);

      return emailDetails;

    } catch (error) {
      logger.error(`❌ Error obteniendo detalles del email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desconectar cuenta de Outlook
   * @param {number} clientId - ID del cliente
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async disconnectAccount(clientId) {
    try {
      await prisma.emailAccount.updateMany({
        where: {
          clientId: clientId,
          provider: 'microsoft'
        },
        data: {
          isActive: false
        }
      });

      logger.info(`✅ Cuenta de Outlook desconectada para cliente ${clientId}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error desconectando cuenta: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new MicrosoftEmailService();
