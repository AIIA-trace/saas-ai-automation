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

      // Desactivar todas las cuentas Google anteriores del cliente
      await prisma.emailAccount.updateMany({
        where: {
          clientId: clientId,
          provider: 'google',
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      logger.info(`🔄 Cuentas Google anteriores desactivadas para cliente ${clientId}`);

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

      // Actualizar emailConfig en Client para que esté disponible inmediatamente
      await prisma.client.update({
        where: { id: clientId },
        data: {
          emailConfig: {
            enabled: true,
            provider: 'google',
            outgoingEmail: email,
            consentGiven: true,
            emailSignature: '',
            forwardingRules: ''
          }
        }
      });

      logger.info(`✅ emailConfig actualizado en Client para ${email}`);

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
   * @param {string} pageToken - Token para paginación
   * @returns {Promise<Object>} Lista de emails y nextPageToken
   */
  async getInbox(clientId, maxResults = 50, pageToken = null) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Obtener lista de mensajes
      const listParams = {
        userId: 'me',
        maxResults: maxResults,
        labelIds: ['INBOX']
      };

      // Agregar pageToken si existe
      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(listParams);

      const messages = response.data.messages || [];
      const nextPageToken = response.data.nextPageToken || null;

      // Obtener detalles de cada mensaje
      const emailPromises = messages.map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        return await this.parseGmailMessage(msg.data, gmail);
      });

      const emails = await Promise.all(emailPromises);

      logger.info(`📧 Obtenidos ${emails.length} emails de Gmail para cliente ${clientId} (nextPageToken: ${nextPageToken ? 'sí' : 'no'})`);

      return {
        emails: emails,
        nextPageToken: nextPageToken
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo inbox de Gmail: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener emails enviados (sent)
   * @param {number} clientId - ID del cliente
   * @param {number} maxResults - Número máximo de emails a obtener
   * @param {string} pageToken - Token para paginación
   * @returns {Promise<Object>} Lista de emails enviados y nextPageToken
   */
  async getSent(clientId, maxResults = 50, pageToken = null) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Obtener lista de mensajes enviados
      const listParams = {
        userId: 'me',
        maxResults: maxResults,
        labelIds: ['SENT']
      };

      // Agregar pageToken si existe
      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(listParams);

      const messages = response.data.messages || [];
      const nextPageToken = response.data.nextPageToken || null;

      // Obtener detalles de cada mensaje
      const emailPromises = messages.map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        return await this.parseGmailMessage(msg.data, gmail);
      });

      const emails = await Promise.all(emailPromises);

      logger.info(`📤 Obtenidos ${emails.length} emails enviados de Gmail para cliente ${clientId} (nextPageToken: ${nextPageToken ? 'sí' : 'no'})`);

      return {
        emails: emails,
        nextPageToken: nextPageToken
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo emails enviados de Gmail: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parsear mensaje de Gmail a formato estándar
   * @param {Object} message - Mensaje de Gmail
   * @returns {Object} Email parseado
   */
  async parseGmailMessage(message, gmail = null) {
    const headers = message.payload.headers;
    
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    let body = '';
    let htmlBody = '';
    const attachments = [];
    const inlineImages = []; // Para imágenes embebidas

    // Función recursiva para extraer partes del mensaje
    const extractParts = (parts) => {
      if (!parts) return;

      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data && !body) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.body.attachmentId) {
          // Verificar si es una imagen inline
          const isInline = part.headers?.some(h => 
            h.name.toLowerCase() === 'content-disposition' && 
            h.value.toLowerCase().includes('inline')
          );
          const contentId = part.headers?.find(h => 
            h.name.toLowerCase() === 'content-id'
          )?.value;

          if (isInline || contentId) {
            // Es una imagen embebida
            inlineImages.push({
              contentId: contentId ? contentId.replace(/[<>]/g, '') : null,
              attachmentId: part.body.attachmentId,
              mimeType: part.mimeType,
              filename: part.filename
            });
          } else if (part.filename) {
            // Es un adjunto normal
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              attachmentId: part.body.attachmentId
            });
          }
        }

        // Recursión para partes anidadas
        if (part.parts) {
          extractParts(part.parts);
        }
      }
    };

    // Extraer body y adjuntos
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      extractParts(message.payload.parts);
    }

    // Procesar imágenes inline si hay HTML body y cliente gmail disponible
    if (htmlBody && inlineImages.length > 0 && gmail) {
      logger.info(`🖼️ Procesando ${inlineImages.length} imágenes inline`);
      
      for (const img of inlineImages) {
        try {
          // Descargar la imagen inline
          const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: message.id,
            id: img.attachmentId
          });

          // Convertir a base64 data URL
          const dataUrl = `data:${img.mimeType};base64,${attachment.data.data}`;
          
          // Reemplazar referencias cid: en el HTML
          if (img.contentId) {
            const cidPattern = new RegExp(`cid:${img.contentId}`, 'gi');
            htmlBody = htmlBody.replace(cidPattern, dataUrl);
            logger.info(`✅ Imagen inline reemplazada: cid:${img.contentId}`);
          }
        } catch (error) {
          logger.warn(`⚠️ Error procesando imagen inline: ${error.message}`);
        }
      }
    } else if (inlineImages.length > 0 && !gmail) {
      logger.warn(`⚠️ ${inlineImages.length} imágenes inline detectadas pero no se puede procesar sin cliente gmail`);
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      bcc: getHeader('Bcc'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      messageId: getHeader('Message-ID'),
      references: getHeader('References'),
      body: htmlBody || body,
      snippet: message.snippet,
      labelIds: message.labelIds || [],
      isRead: !message.labelIds?.includes('UNREAD'),
      isStarred: message.labelIds?.includes('STARRED'),
      attachments: attachments
    };
  }

  /**
   * Obtener detalles completos de un email (incluyendo hilo)
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Detalles del email y su hilo
   */
  async getEmailDetails(clientId, emailId) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Obtener el mensaje
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      });

      const emailData = await this.parseGmailMessage(message.data, gmail);

      // Obtener el hilo completo
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: message.data.threadId,
        format: 'full'
      });

      // Parsear todos los mensajes del hilo
      const threadMessages = await Promise.all(
        thread.data.messages.map(msg => this.parseGmailMessage(msg, gmail))
      );

      return {
        email: emailData,
        thread: threadMessages,
        threadId: message.data.threadId
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo detalles del email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar email (con soporte para respuestas y adjuntos)
   * @param {number} clientId - ID del cliente
   * @param {Object} emailData - Datos del email
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail(clientId, emailData) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      let messageParts = [];
      const boundary = '===============' + Date.now() + '==';

      // Headers básicos
      messageParts.push(`To: ${emailData.to}`);
      
      // CC y BCC si existen
      if (emailData.cc) {
        messageParts.push(`Cc: ${emailData.cc}`);
      }
      if (emailData.bcc) {
        messageParts.push(`Bcc: ${emailData.bcc}`);
      }
      
      messageParts.push(`Subject: ${emailData.subject}`);
      
      // Si es una respuesta, agregar headers de threading
      if (emailData.inReplyTo) {
        messageParts.push(`In-Reply-To: ${emailData.inReplyTo}`);
        messageParts.push(`References: ${emailData.references || emailData.inReplyTo}`);
      }

      // Si hay adjuntos, usar multipart
      if (emailData.attachments && emailData.attachments.length > 0) {
        messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageParts.push('');
        
        // Parte del texto
        messageParts.push(`--${boundary}`);
        messageParts.push('Content-Type: text/html; charset="UTF-8"');
        messageParts.push('');
        messageParts.push(emailData.body);
        
        // Adjuntos
        for (const attachment of emailData.attachments) {
          logger.info(`📎 Procesando adjunto: ${attachment.filename}`);
          logger.info(`   - Tipo MIME: ${attachment.mimeType}`);
          logger.info(`   - Tamaño base64 original: ${attachment.data.length} caracteres`);
          
          messageParts.push(`--${boundary}`);
          messageParts.push(`Content-Type: ${attachment.mimeType}`);
          messageParts.push('Content-Transfer-Encoding: base64');
          messageParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
          messageParts.push('');
          
          // Dividir base64 en líneas de 76 caracteres (estándar RFC 2045)
          const base64Data = attachment.data;
          const lines = base64Data.match(/.{1,76}/g) || [];
          logger.info(`   - Líneas base64 generadas: ${lines.length}`);
          logger.info(`   - Primera línea (primeros 76 chars): ${lines[0]?.substring(0, 76)}`);
          logger.info(`   - Última línea (length): ${lines[lines.length - 1]?.length}`);
          
          messageParts.push(lines.join('\n'));
        }
        
        messageParts.push(`--${boundary}--`);
      } else {
        messageParts.push('Content-Type: text/html; charset="UTF-8"');
        messageParts.push('');
        messageParts.push(emailData.body);
      }

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const requestBody = {
        raw: encodedMessage
      };

      // Si es una respuesta, incluir threadId
      if (emailData.threadId) {
        requestBody.threadId = emailData.threadId;
      }

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: requestBody
      });

      logger.info(`✅ Email enviado exitosamente: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      };

    } catch (error) {
      logger.error(`❌ Error enviando email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener adjunto
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @param {string} attachmentId - ID del adjunto
   * @returns {Promise<Buffer>} Datos del adjunto
   */
  async getAttachment(clientId, emailId, attachmentId) {
    try {
      logger.info(`🔍 getAttachment - Obteniendo adjunto de Gmail`);
      logger.info(`   - emailId: ${emailId}`);
      logger.info(`   - attachmentId: ${attachmentId}`);

      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: emailId,
        id: attachmentId
      });

      logger.info(`   - Datos recibidos de Gmail API:`);
      logger.info(`     * Size: ${attachment.data.size || 'N/A'}`);
      logger.info(`     * Base64 length: ${attachment.data.data?.length || 0} caracteres`);
      logger.info(`     * Primeros 100 chars base64: ${attachment.data.data?.substring(0, 100)}`);

      // Limpiar base64 por seguridad (aunque Gmail suele enviarlo limpio)
      const cleanBase64 = attachment.data.data.replace(/[\r\n\s]/g, '');
      logger.info(`     * Base64 limpio length: ${cleanBase64.length} caracteres`);

      // Decodificar base64 usando el estándar de Node.js
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
   * Marcar email como leído
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async markAsRead(clientId, emailId) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Remover la etiqueta UNREAD
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      logger.info(`✅ Email ${emailId} marcado como leído para cliente ${clientId}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error marcando email como leído: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar/desmarcar email como importante (starred)
   * @param {number} clientId - ID del cliente
   * @param {string} emailId - ID del email
   * @param {boolean} starred - true para marcar, false para desmarcar
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async toggleStarred(clientId, emailId, starred) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Agregar o remover la etiqueta STARRED
      const requestBody = starred 
        ? { addLabelIds: ['STARRED'] }
        : { removeLabelIds: ['STARRED'] };

      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: requestBody
      });

      logger.info(`✅ Email ${emailId} ${starred ? 'marcado' : 'desmarcado'} como importante para cliente ${clientId}`);
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

      // Limpiar emailConfig en Client
      await prisma.client.update({
        where: { id: clientId },
        data: {
          emailConfig: {
            enabled: false,
            provider: '',
            outgoingEmail: '',
            consentGiven: false,
            emailSignature: '',
            forwardingRules: ''
          }
        }
      });

      logger.info(`✅ emailConfig limpiado en Client`);

      return true;

    } catch (error) {
      logger.error(`❌ Error desconectando cuenta: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener hilo completo de emails
   * @param {number} clientId - ID del cliente
   * @param {string} threadId - ID del hilo
   * @returns {Promise<Object>} Hilo con todos los mensajes
   */
  async getThread(clientId, threadId) {
    try {
      const auth = await this.getAuthenticatedClient(clientId);
      const gmail = google.gmail({ version: 'v1', auth });

      // Obtener el hilo completo
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });

      // Procesar mensajes del hilo
      const messages = thread.data.messages.map(msg => {
        const headers = msg.payload.headers;
        const getHeader = (name) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };

        // Extraer cuerpo del mensaje y adjuntos
        let body = '';
        const attachments = [];

        // Función para extraer adjuntos de las partes
        const extractAttachments = (parts) => {
          if (!parts) return;
          parts.forEach(part => {
            if (part.filename && part.body.attachmentId) {
              attachments.push({
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body.size,
                attachmentId: part.body.attachmentId
              });
            }
            if (part.parts) {
              extractAttachments(part.parts);
            }
          });
        };

        if (msg.payload.body && msg.payload.body.data) {
          body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        } else if (msg.payload.parts) {
          const textPart = msg.payload.parts.find(part => part.mimeType === 'text/plain' || part.mimeType === 'text/html');
          if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
          // Extraer adjuntos
          extractAttachments(msg.payload.parts);
        }

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          cc: getHeader('Cc'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          body: body,
          snippet: msg.snippet,
          attachments: attachments
        };
      });

      logger.info(`✅ Hilo ${threadId} obtenido con ${messages.length} mensajes`);

      return {
        id: threadId,
        messages: messages
      };

    } catch (error) {
      logger.error(`❌ Error obteniendo hilo: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GoogleEmailService();
