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
   * Obtener email de la cuenta conectada
   * @param {number} clientId - ID del cliente
   * @returns {Promise<string>} Email de la cuenta
   */
  async getAccountEmail(clientId) {
    try {
      const emailAccount = await prisma.emailAccount.findFirst({
        where: {
          clientId: clientId,
          provider: 'microsoft',
          isActive: true
        }
      });
      
      return emailAccount?.email || null;
    } catch (error) {
      logger.error(`❌ Error obteniendo email de cuenta: ${error.message}`);
      return null;
    }
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

      // Obtener TODOS los mensajes recibidos (no solo inbox, incluye "Otros", etc.)
      // Excluir enviados y borradores
      const response = await graphClient
        .api('/me/messages')
        .top(maxResults)
        .select('id,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,body,isRead,flag,parentFolderId')
        .filter("isDraft eq false")
        .orderby('receivedDateTime DESC')
        .get();

      // Obtener email de la cuenta para filtrar
      const accountEmail = await this.getAccountEmail(clientId);
      
      logger.info(`📧 Total mensajes obtenidos de Microsoft: ${response.value.length}`);
      logger.info(`📧 Email de la cuenta: ${accountEmail}`);

      // Log TODOS los emails antes de filtrar
      logger.info(`📬 TODOS los mensajes (antes de filtrar):`, response.value.map(m => ({
        from: m.from?.emailAddress?.address,
        to: m.toRecipients?.map(r => r.emailAddress.address).join(', '),
        subject: m.subject,
        date: m.receivedDateTime
      })));

      // Filtrar manualmente los emails enviados (excluir los que YO envié)
      const emails = response.value
        .filter(message => {
          const fromEmail = message.from?.emailAddress?.address?.toLowerCase();
          const isFromMe = fromEmail === accountEmail?.toLowerCase();
          
          if (isFromMe) {
            logger.info(`🚫 Filtrando email enviado por mí: ${message.subject}`);
          }
          
          return !isFromMe;
        })
        .map(message => this.parseOutlookMessage(message));

      logger.info(`📧 Emails después de filtrar enviados: ${emails.length}`);
      
      // Log de los últimos 5 emails para debug
      if (emails.length > 0) {
        logger.info(`📬 Últimos emails (después de filtrar):`, emails.slice(0, 5).map(e => ({
          from: e.from,
          subject: e.subject,
          date: e.date
        })));
      } else {
        logger.warn(`⚠️ No hay emails después de filtrar. Verifica si todos son enviados por ti.`);
      }

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
    // Procesar adjuntos si existen
    const attachments = [];
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach(att => {
        if (att['@odata.type'] === '#microsoft.graph.fileAttachment') {
          attachments.push({
            attachmentId: att.id,
            filename: att.name,
            mimeType: att.contentType,
            size: att.size
          });
        }
      });
    }

    return {
      id: message.id,
      messageId: message.id,  // Agregar messageId para compatibilidad con frontend
      from: message.from?.emailAddress?.address || '',
      fromName: message.from?.emailAddress?.name || '',
      to: message.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
      subject: message.subject || '(Sin asunto)',
      date: message.receivedDateTime,
      body: message.body?.content || '',
      bodyType: message.body?.contentType || 'text',
      snippet: message.bodyPreview || '',
      isRead: message.isRead,
      isStarred: message.flag?.flagStatus === 'flagged',
      attachments: attachments
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

      logger.info(`📧 DEBUG - Datos de email a enviar:`);
      logger.info(`   To: ${emailData.to}`);
      logger.info(`   Subject: ${emailData.subject}`);
      logger.info(`   InReplyTo: ${emailData.inReplyTo || 'N/A'}`);

      // Construir destinatarios TO
      const toRecipients = emailData.to.split(',').map(email => ({
        emailAddress: { address: email.trim() }
      }));
      
      logger.info(`📧 Destinatarios construidos: ${JSON.stringify(toRecipients)}`);

      // Obtener el email configurado del cliente
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { emailConfig: true }
      });
      
      const fromEmail = client?.emailConfig?.outgoingEmail || null;
      logger.info(`📧 Email de envío configurado: ${fromEmail || 'No configurado, usar por defecto'}`);

      const message = {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',  // Cambiar a HTML para soportar formato
          content: emailData.body
        },
        toRecipients: toRecipients
      };
      
      // Si hay un email configurado diferente, especificarlo como remitente
      if (fromEmail) {
        message.from = {
          emailAddress: {
            address: fromEmail
          }
        };
        logger.info(`📧 Usando email personalizado como remitente: ${fromEmail}`);
      }

      // Agregar CC si existe
      if (emailData.cc) {
        message.ccRecipients = emailData.cc.split(',').map(email => ({
          emailAddress: { address: email.trim() }
        }));
      }

      // Agregar BCC si existe
      if (emailData.bcc) {
        message.bccRecipients = emailData.bcc.split(',').map(email => ({
          emailAddress: { address: email.trim() }
        }));
      }

      // Agregar adjuntos si existen
      if (emailData.attachments && emailData.attachments.length > 0) {
        logger.info(`📎 Procesando ${emailData.attachments.length} adjuntos para Microsoft`);
        
        message.attachments = emailData.attachments.map(att => {
          logger.info(`   - Adjunto: ${att.filename}`);
          logger.info(`     * Tipo MIME: ${att.mimeType}`);
          logger.info(`     * Tamaño base64 original: ${att.data.length} caracteres`);
          logger.info(`     * Primeros 100 chars: ${att.data.substring(0, 100)}`);
          
          // Limpiar base64: eliminar saltos de línea, espacios y caracteres no válidos
          const cleanBase64 = att.data.replace(/[\r\n\s]/g, '');
          logger.info(`     * Tamaño base64 limpio: ${cleanBase64.length} caracteres`);
          
          // Verificar que sea base64 válido
          const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64);
          logger.info(`     * Base64 válido: ${isValidBase64}`);
          
          return {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.filename,
            contentType: att.mimeType,
            contentBytes: cleanBase64  // Microsoft Graph requiere base64 limpio
          };
        });
        
        logger.info(`✅ ${emailData.attachments.length} adjuntos agregados al mensaje`);
      }

      // Si es una respuesta, usar reply endpoint
      if (emailData.inReplyTo) {
        logger.info(`📧 Respondiendo al email: ${emailData.inReplyTo}`);
        
        // Para reply con HTML, crear un draft y enviarlo
        const replyDraft = await graphClient
          .api(`/me/messages/${emailData.inReplyTo}/createReply`)
          .post();

        // Actualizar el draft con el contenido HTML
        const patchData = {
          body: {
            contentType: 'HTML',
            content: emailData.body
          }
        };

        // Agregar adjuntos al draft si existen
        if (emailData.attachments && emailData.attachments.length > 0) {
          logger.info(`📎 Procesando ${emailData.attachments.length} adjuntos para respuesta Microsoft`);
          
          patchData.attachments = emailData.attachments.map(att => {
            logger.info(`   - Adjunto: ${att.filename}`);
            logger.info(`     * Tipo MIME: ${att.mimeType}`);
            logger.info(`     * Tamaño base64 original: ${att.data.length} caracteres`);
            
            // Limpiar base64: eliminar saltos de línea, espacios y caracteres no válidos
            const cleanBase64 = att.data.replace(/[\r\n\s]/g, '');
            logger.info(`     * Tamaño base64 limpio: ${cleanBase64.length} caracteres`);
            
            // Verificar que sea base64 válido
            const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64);
            logger.info(`     * Base64 válido: ${isValidBase64}`);
            
            return {
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: att.filename,
              contentType: att.mimeType,
              contentBytes: cleanBase64  // Microsoft Graph requiere base64 limpio
            };
          });
          
          logger.info(`✅ ${emailData.attachments.length} adjuntos agregados a la respuesta`);
        }

        await graphClient
          .api(`/me/messages/${replyDraft.id}`)
          .patch(patchData);

        // Enviar el draft
        await graphClient
          .api(`/me/messages/${replyDraft.id}/send`)
          .post();

        logger.info(`✅ Respuesta enviada exitosamente a ${emailData.to}`);
      } else {
        // Email nuevo
        await graphClient
          .api('/me/sendMail')
          .post({
            message: message
          });

        logger.info(`✅ Email enviado exitosamente a ${emailData.to}`);
      }

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
   * @returns {Promise<Object>} Detalles del email con thread
   */
  async getEmailDetails(clientId, emailId) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      const message = await graphClient
        .api(`/me/messages/${emailId}`)
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,isRead,flag,hasAttachments,internetMessageId,conversationId')
        .get();

      const emailData = {
        ...this.parseOutlookMessage(message),
        cc: message.ccRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        bcc: message.bccRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        hasAttachments: message.hasAttachments,
        messageId: message.id,  // Usar el ID de Microsoft Graph API (no internetMessageId)
        internetMessageId: message.internetMessageId,  // Guardar también el header para referencias
        threadId: message.conversationId
      };

      // Obtener el hilo completo usando conversationId
      let threadMessages = [];
      if (message.conversationId) {
        try {
          const threadData = await this.getThread(clientId, message.conversationId);
          threadMessages = threadData.messages || [];
        } catch (error) {
          logger.warn(`⚠️ No se pudo obtener el hilo: ${error.message}`);
          // Si falla, usar solo el mensaje actual
          threadMessages = [emailData];
        }
      } else {
        // Si no hay conversationId, usar solo el mensaje actual
        threadMessages = [emailData];
      }

      logger.info(`✅ Detalles del email ${emailId} obtenidos con ${threadMessages.length} mensajes en el hilo`);

      return {
        email: emailData,
        thread: threadMessages,
        threadId: message.conversationId
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo detalles del email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar/desmarcar email como importante (starred/flagged)
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @param {boolean} starred - true para marcar, false para desmarcar
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async toggleStarred(clientId, emailId, starred) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      await graphClient
        .api(`/me/messages/${emailId}`)
        .patch({
          flag: {
            flagStatus: starred ? 'flagged' : 'notFlagged'
          }
        });

      logger.info(`✅ Email ${emailId} ${starred ? 'marcado' : 'desmarcado'} como importante`);
      return true;

    } catch (error) {
      logger.error(`❌ Error cambiando estado de importante: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar email (mover a papelera)
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async deleteEmail(clientId, emailId) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      await graphClient
        .api(`/me/messages/${emailId}`)
        .delete();

      logger.info(`✅ Email ${emailId} eliminado`);
      return true;

    } catch (error) {
      logger.error(`❌ Error eliminando email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener adjunto de un email
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @param {string} attachmentId - ID del adjunto
   * @returns {Promise<Buffer>} Datos del adjunto
   */
  async getAttachment(clientId, emailId, attachmentId) {
    try {
      logger.info(`🔍 getAttachment - Obteniendo adjunto de Microsoft Graph`);
      logger.info(`   - emailId: ${emailId}`);
      logger.info(`   - attachmentId: ${attachmentId}`);

      const graphClient = await this.getAuthenticatedClient(clientId);

      const attachment = await graphClient
        .api(`/me/messages/${emailId}/attachments/${attachmentId}`)
        .get();

      logger.info(`   - Datos recibidos de Microsoft Graph API:`);
      logger.info(`     * Name: ${attachment.name || 'N/A'}`);
      logger.info(`     * ContentType: ${attachment.contentType || 'N/A'}`);
      logger.info(`     * Size: ${attachment.size || 'N/A'}`);
      logger.info(`     * Base64 length: ${attachment.contentBytes?.length || 0} caracteres`);
      logger.info(`     * Primeros 100 chars base64: ${attachment.contentBytes?.substring(0, 100)}`);

      // Limpiar base64 - Microsoft puede enviar con saltos de línea o espacios
      const cleanBase64 = attachment.contentBytes.replace(/[\r\n\s]/g, '');
      logger.info(`     * Base64 limpio length: ${cleanBase64.length} caracteres`);

      // El contenido viene en base64 - decodificar usando estándar Node.js
      const data = Buffer.from(cleanBase64, 'base64');

      logger.info(`   - Después de decodificar:`);
      logger.info(`     * Buffer length: ${data.length} bytes`);
      logger.info(`     * Primeros 50 bytes (hex): ${data.slice(0, 50).toString('hex')}`);
      logger.info(`     * Magic number (primeros 4 bytes): ${data.slice(0, 4).toString('hex')}`);
      
      // Verificar si es un PDF válido (debe empezar con %PDF)
      const isPDF = data.slice(0, 4).toString('utf8') === '%PDF';
      logger.info(`     * Es PDF válido: ${isPDF}`);

      logger.info(`✅ Adjunto obtenido y decodificado correctamente: ${attachmentId}`);
      return data;

    } catch (error) {
      logger.error(`❌ Error obteniendo adjunto: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Obtener hilo completo de emails (conversación)
   * @param {number} clientId - ID del cliente
   * @param {string} conversationId - ID de la conversación
   * @returns {Promise<Object>} Hilo con todos los mensajes
   */
  async getThread(clientId, conversationId) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      // Obtener todos los mensajes recientes (últimos 50)
      // No podemos usar filter porque Microsoft Graph a veces lo rechaza
      const response = await graphClient
        .api('/me/messages')
        .top(50)
        .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,conversationId,hasAttachments')
        .expand('attachments')
        .orderby('receivedDateTime DESC')
        .get();

      // Filtrar manualmente por conversationId
      const messages = response.value
        .filter(msg => msg.conversationId === conversationId)
        .map(message => this.parseOutlookMessage(message))
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordenar ascendente por fecha

      logger.info(`✅ Hilo ${conversationId} obtenido con ${messages.length} mensajes`);

      return {
        id: conversationId,
        messages: messages
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo hilo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Responder a un email
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email original
   * @param {Object} replyData - Datos de la respuesta
   * @returns {Promise<Object>} Resultado del envío
   */
  async replyToEmail(clientId, emailId, replyData) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      // Microsoft Graph API reply endpoint espera 'comment' para el cuerpo
      // y automáticamente mantiene el thread
      const replyPayload = {
        message: {
          body: {
            contentType: 'HTML',
            content: replyData.body
          }
        },
        comment: replyData.body // También incluir como comment para compatibilidad
      };

      await graphClient
        .api(`/me/messages/${emailId}/reply`)
        .post(replyPayload);

      logger.info(`✅ Respuesta enviada al email ${emailId}`);

      return {
        success: true
      };

    } catch (error) {
      logger.error(`❌ Error respondiendo email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reenviar un email
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email original
   * @param {Object} forwardData - Datos del reenvío
   * @returns {Promise<Object>} Resultado del envío
   */
  async forwardEmail(clientId, emailId, forwardData) {
    try {
      const graphClient = await this.getAuthenticatedClient(clientId);

      const message = {
        comment: forwardData.body || '',
        toRecipients: forwardData.to.split(',').map(email => ({
          emailAddress: {
            address: email.trim()
          }
        }))
      };

      await graphClient
        .api(`/me/messages/${emailId}/forward`)
        .post(message);

      logger.info(`✅ Email ${emailId} reenviado a ${forwardData.to}`);

      return {
        success: true
      };

    } catch (error) {
      logger.error(`❌ Error reenviando email: ${error.message}`);
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
