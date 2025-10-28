const { Client } = require('@microsoft/microsoft-graph-client');
const logger = require('../../utils/logger');

/**
 * Servicio para interactuar con Microsoft Graph API (Outlook/Office 365)
 */
class OutlookService {
    constructor(account) {
        this.account = account;
        this.client = Client.init({
            authProvider: (done) => {
                done(null, account.accessToken);
            }
        });
    }

    /**
     * Listar mensajes de la bandeja de entrada
     */
    async listMessages(maxResults = 50, pageToken = null) {
        try {
            logger.info('📧 Listando mensajes de Outlook...');

            let query = this.client
                .api('/me/messages')
                .top(maxResults)
                .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,hasAttachments,conversationId')
                .orderby('receivedDateTime DESC');

            if (pageToken) {
                query = query.skipToken(pageToken);
            }

            const response = await query.get();

            const messages = response.value.map(msg => ({
                id: msg.id,
                threadId: msg.conversationId,
                subject: msg.subject || '(Sin asunto)',
                from: msg.from?.emailAddress?.address || 'Desconocido',
                to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
                date: msg.receivedDateTime,
                snippet: msg.bodyPreview || '',
                isRead: msg.isRead,
                hasAttachments: msg.hasAttachments || false,
                labelIds: msg.isRead ? [] : ['UNREAD']
            }));

            logger.info(`✅ ${messages.length} mensajes obtenidos de Outlook`);

            return {
                messages,
                nextPageToken: response['@odata.nextLink'] ? 'next' : null
            };
        } catch (error) {
            logger.error('❌ Error listando mensajes de Outlook:', error);
            throw error;
        }
    }

    /**
     * Obtener un mensaje específico
     */
    async getMessage(messageId) {
        try {
            logger.info(`📧 Obteniendo mensaje ${messageId} de Outlook...`);

            const message = await this.client
                .api(`/me/messages/${messageId}`)
                .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,body,receivedDateTime,conversationId,hasAttachments,internetMessageId')
                .expand('attachments')
                .get();

            const result = {
                id: message.id,
                threadId: message.conversationId,
                messageId: message.internetMessageId,
                subject: message.subject || '(Sin asunto)',
                from: message.from?.emailAddress?.address || 'Desconocido',
                to: message.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
                cc: message.ccRecipients?.map(r => r.emailAddress.address).join(', ') || null,
                bcc: message.bccRecipients?.map(r => r.emailAddress.address).join(', ') || null,
                date: message.receivedDateTime,
                body: message.body?.content || '',
                snippet: message.body?.content?.substring(0, 200) || '',
                isRead: message.isRead,
                attachments: message.attachments?.map(att => ({
                    id: att.id,
                    filename: att.name,
                    mimeType: att.contentType,
                    size: att.size
                })) || []
            };

            logger.info('✅ Mensaje obtenido de Outlook');
            return result;
        } catch (error) {
            logger.error('❌ Error obteniendo mensaje de Outlook:', error);
            throw error;
        }
    }

    /**
     * Obtener thread/conversación completa
     */
    async getThread(conversationId) {
        try {
            logger.info(`📧 Obteniendo thread ${conversationId} de Outlook...`);

            const response = await this.client
                .api('/me/messages')
                .filter(`conversationId eq '${conversationId}'`)
                .select('id,subject,from,toRecipients,body,receivedDateTime,isRead,internetMessageId')
                .orderby('receivedDateTime DESC')
                .get();

            const messages = response.value.map(msg => ({
                id: msg.id,
                messageId: msg.internetMessageId,
                subject: msg.subject || '(Sin asunto)',
                from: msg.from?.emailAddress?.address || 'Desconocido',
                to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
                date: msg.receivedDateTime,
                body: msg.body?.content || '',
                snippet: msg.body?.content?.substring(0, 200) || ''
            }));

            logger.info(`✅ Thread con ${messages.length} mensajes obtenido de Outlook`);
            return messages;
        } catch (error) {
            logger.error('❌ Error obteniendo thread de Outlook:', error);
            throw error;
        }
    }

    /**
     * Enviar un mensaje nuevo
     */
    async sendMessage(to, subject, body, options = {}) {
        try {
            logger.info(`📤 Enviando mensaje a ${to} desde Outlook...`);

            const message = {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: body
                },
                toRecipients: to.split(',').map(email => ({
                    emailAddress: { address: email.trim() }
                }))
            };

            if (options.cc) {
                message.ccRecipients = options.cc.split(',').map(email => ({
                    emailAddress: { address: email.trim() }
                }));
            }

            if (options.bcc) {
                message.bccRecipients = options.bcc.split(',').map(email => ({
                    emailAddress: { address: email.trim() }
                }));
            }

            if (options.inReplyTo) {
                message.internetMessageId = options.inReplyTo;
            }

            await this.client.api('/me/sendMail').post({
                message: message,
                saveToSentItems: true
            });

            logger.info('✅ Mensaje enviado desde Outlook');
            return { success: true, messageId: 'sent' };
        } catch (error) {
            logger.error('❌ Error enviando mensaje desde Outlook:', error);
            throw error;
        }
    }

    /**
     * Responder a un mensaje
     */
    async sendReply(messageId, body, options = {}) {
        try {
            logger.info(`📤 Respondiendo mensaje ${messageId} en Outlook...`);

            const replyData = {
                message: {
                    body: {
                        contentType: 'HTML',
                        content: body
                    }
                }
            };

            if (options.cc) {
                replyData.message.ccRecipients = options.cc.split(',').map(email => ({
                    emailAddress: { address: email.trim() }
                }));
            }

            if (options.bcc) {
                replyData.message.bccRecipients = options.bcc.split(',').map(email => ({
                    emailAddress: { address: email.trim() }
                }));
            }

            await this.client
                .api(`/me/messages/${messageId}/reply`)
                .post(replyData);

            logger.info('✅ Respuesta enviada desde Outlook');
            return { success: true };
        } catch (error) {
            logger.error('❌ Error enviando respuesta desde Outlook:', error);
            throw error;
        }
    }

    /**
     * Marcar mensaje como leído
     */
    async markAsRead(messageId) {
        try {
            logger.info(`📧 Marcando mensaje ${messageId} como leído en Outlook...`);

            await this.client
                .api(`/me/messages/${messageId}`)
                .patch({ isRead: true });

            logger.info('✅ Mensaje marcado como leído en Outlook');
            return { success: true };
        } catch (error) {
            logger.error('❌ Error marcando mensaje como leído en Outlook:', error);
            throw error;
        }
    }

    /**
     * Eliminar mensaje
     */
    async deleteMessage(messageId) {
        try {
            logger.info(`🗑️ Eliminando mensaje ${messageId} de Outlook...`);

            await this.client
                .api(`/me/messages/${messageId}`)
                .delete();

            logger.info('✅ Mensaje eliminado de Outlook');
            return { success: true };
        } catch (error) {
            logger.error('❌ Error eliminando mensaje de Outlook:', error);
            throw error;
        }
    }

    /**
     * Obtener adjunto
     */
    async getAttachment(messageId, attachmentId) {
        try {
            logger.info(`📎 Obteniendo adjunto ${attachmentId} del mensaje ${messageId} de Outlook...`);

            const attachment = await this.client
                .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
                .get();

            logger.info('✅ Adjunto obtenido de Outlook');
            return {
                filename: attachment.name,
                mimeType: attachment.contentType,
                data: attachment.contentBytes // Base64
            };
        } catch (error) {
            logger.error('❌ Error obteniendo adjunto de Outlook:', error);
            throw error;
        }
    }

    /**
     * Refrescar token de acceso
     */
    async refreshAccessToken() {
        try {
            logger.info('🔄 Refrescando token de Outlook...');

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                    refresh_token: this.account.refreshToken,
                    grant_type: 'refresh_token',
                    scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Error refrescando token: ${data.error_description}`);
            }

            logger.info('✅ Token de Outlook refrescado');
            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || this.account.refreshToken,
                expiresAt: new Date(Date.now() + data.expires_in * 1000)
            };
        } catch (error) {
            logger.error('❌ Error refrescando token de Outlook:', error);
            throw error;
        }
    }
}

module.exports = OutlookService;
