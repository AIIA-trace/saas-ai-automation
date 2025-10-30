const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');
const axios = require('axios');
const { authenticate } = require('../auth');

const prisma = new PrismaClient();

/**
 * Iniciar flujo de autenticación OAuth con Microsoft
 */
router.get('/authorize', authenticate, (req, res) => {
    try {
        const clientId = req.client.id;
        
        if (!clientId) {
            return res.status(400).json({ error: 'Cliente no encontrado' });
        }

        // Construir URL de autorización de Microsoft
        const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        
        authUrl.searchParams.append('client_id', process.env.MICROSOFT_CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI);
        authUrl.searchParams.append('response_mode', 'query');
        authUrl.searchParams.append('scope', 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access');
        authUrl.searchParams.append('state', clientId.toString());
        authUrl.searchParams.append('prompt', 'select_account'); // Forzar selección de cuenta siempre

        logger.info(`🔐 Iniciando OAuth de Outlook para cliente ${clientId}`);
        logger.info(`📍 Redirect URI: ${process.env.MICROSOFT_REDIRECT_URI}`);

        // Devolver URL como JSON (igual que Google) en lugar de redirigir
        res.json({
            success: true,
            authUrl: authUrl.toString()
        });
    } catch (error) {
        logger.error('❌ Error en autorización de Outlook:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error iniciando autenticación' 
        });
    }
});

/**
 * Callback de OAuth - Recibir código de autorización
 * NO requiere autenticación porque viene desde Microsoft
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state: clientId, error, error_description } = req.query;

        if (error) {
            logger.error(`❌ Error en callback de Outlook: ${error} - ${error_description}`);
            return res.redirect(`/dashboard.html?error=outlook_auth_failed&message=${encodeURIComponent(error_description)}`);
        }

        if (!code || !clientId) {
            logger.error('❌ Código o clientId faltante en callback de Outlook');
            return res.redirect('/dashboard.html?error=outlook_auth_failed&message=Missing+code+or+state');
        }

        logger.info(`✅ Código de autorización recibido para cliente ${clientId}`);
        logger.info(`🔑 Client ID: ${process.env.MICROSOFT_CLIENT_ID}`);
        logger.info(`🔑 Redirect URI: ${process.env.MICROSOFT_REDIRECT_URI}`);
        logger.info(`🔑 Client Secret presente: ${process.env.MICROSOFT_CLIENT_SECRET ? 'Sí' : 'No'}`);

        // Intercambiar código por tokens
        const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET,
            code: code,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).catch(error => {
            logger.error('❌ Error detallado de Microsoft:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
            throw error;
        });

        const tokenData = tokenResponse.data;

        if (tokenData.error) {
            logger.error('❌ Error obteniendo tokens de Outlook:', tokenData);
            return res.redirect(`/dashboard.html?error=outlook_token_failed&message=${encodeURIComponent(tokenData.error_description)}`);
        }

        logger.info('✅ Tokens obtenidos de Outlook');
        logger.info(`🔑 Access token recibido (primeros 50 chars): ${tokenData.access_token?.substring(0, 50)}...`);
        logger.info(`🔑 Refresh token presente: ${tokenData.refresh_token ? 'Sí' : 'No'}`);
        logger.info(`🔑 Expires in: ${tokenData.expires_in} segundos`);

        // Obtener información del usuario de Microsoft Graph
        logger.info('📧 Obteniendo información del usuario de Microsoft Graph...');
        const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        }).catch(error => {
            logger.error('❌ Error obteniendo info de usuario de Microsoft Graph:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers
            });
            throw error;
        });

        const userData = userResponse.data;
        
        // Log completo de lo que Microsoft devuelve
        logger.info(`📧 DEBUG - Datos completos de Microsoft Graph:`);
        logger.info(`   mail: ${userData.mail}`);
        logger.info(`   userPrincipalName: ${userData.userPrincipalName}`);
        logger.info(`   proxyAddresses: ${JSON.stringify(userData.proxyAddresses || [])}`);
        logger.info(`   otherMails: ${JSON.stringify(userData.otherMails || [])}`);
        
        const userEmail = userData.mail || userData.userPrincipalName;
        logger.info(`📧 Email de Outlook seleccionado: ${userEmail}`);

        // Desactivar todas las cuentas Microsoft anteriores del cliente
        await prisma.emailAccount.updateMany({
            where: {
                clientId: parseInt(clientId),
                provider: 'microsoft',
                isActive: true
            },
            data: {
                isActive: false
            }
        });

        logger.info(`🔄 Cuentas Microsoft anteriores desactivadas para cliente ${clientId}`);

        // Guardar o actualizar cuenta en base de datos
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        const emailAccount = await prisma.emailAccount.upsert({
            where: {
                clientId_email: {
                    clientId: parseInt(clientId),
                    email: userEmail
                }
            },
            update: {
                provider: 'microsoft',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiry: expiresAt,
                isActive: true
            },
            create: {
                clientId: parseInt(clientId),
                email: userEmail,
                provider: 'microsoft',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiry: expiresAt,
                isActive: true
            }
        });

        logger.info(`✅ Cuenta de Outlook guardada: ${emailAccount.email}`);

        // Obtener emailConfig actual
        const currentClient = await prisma.client.findUnique({
            where: { id: parseInt(clientId) },
            select: { emailConfig: true }
        });
        
        const currentEmailConfig = currentClient?.emailConfig || {};
        const existingEmail = currentEmailConfig.outgoingEmail;
        
        // Si NO hay email configurado, usar el de OAuth
        // Si YA hay email configurado, respetarlo
        const emailToUse = existingEmail || userEmail;
        
        logger.info(`📧 Email configurado previamente: ${existingEmail || 'Ninguno'}`);
        logger.info(`📧 Email de OAuth: ${userEmail}`);
        logger.info(`📧 Email que se usará: ${emailToUse}`);

        // Actualizar emailConfig preservando lo que ya existe
        await prisma.client.update({
            where: { id: parseInt(clientId) },
            data: {
                emailConfig: {
                    ...currentEmailConfig,
                    enabled: true,
                    provider: 'microsoft',
                    outgoingEmail: emailToUse,
                    consentGiven: true
                }
            }
        });

        logger.info(`✅ emailConfig actualizado en Client para ${userEmail}`);

        // Redirigir al dashboard con éxito
        res.redirect('/dashboard.html?success=outlook_connected&email=' + encodeURIComponent(userEmail));
    } catch (error) {
        logger.error('❌ Error en callback de Outlook:', error);
        res.redirect('/dashboard.html?error=outlook_callback_failed&message=' + encodeURIComponent(error.message));
    }
});

/**
 * Refrescar token de acceso
 */
router.post('/refresh', authenticate, async (req, res) => {
    try {
        const clientId = req.client.id;

        // Buscar cuenta de Outlook
        const emailAccount = await prisma.emailAccount.findFirst({
            where: {
                clientId: clientId,
                provider: 'outlook'
            }
        });

        if (!emailAccount) {
            return res.status(404).json({ error: 'Cuenta de Outlook no encontrada' });
        }

        logger.info(`🔄 Refrescando token de Outlook para ${emailAccount.email}`);

        // Solicitar nuevo token
        const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET,
            refresh_token: emailAccount.refreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = tokenResponse.data;

        if (tokenData.error) {
            logger.error('❌ Error refrescando token de Outlook:', tokenData);
            return res.status(401).json({ error: 'Error refrescando token', details: tokenData.error_description });
        }

        // Actualizar tokens en base de datos
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        await prisma.emailAccount.update({
            where: { id: emailAccount.id },
            data: {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || emailAccount.refreshToken,
                tokenExpiresAt: expiresAt
            }
        });

        logger.info('✅ Token de Outlook refrescado');

        res.json({
            success: true,
            message: 'Token refrescado correctamente'
        });
    } catch (error) {
        logger.error('❌ Error refrescando token de Outlook:', error);
        res.status(500).json({ error: 'Error refrescando token' });
    }
});

/**
 * Desconectar cuenta de Outlook
 */
router.delete('/disconnect', authenticate, async (req, res) => {
    try {
        const clientId = req.client.id;

        await prisma.emailAccount.deleteMany({
            where: {
                clientId: clientId,
                provider: 'microsoft'
            }
        });

        logger.info(`✅ Cuenta de Microsoft/Outlook desconectada para cliente ${clientId}`);

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

        res.json({
            success: true,
            message: 'Cuenta de Outlook desconectada'
        });
    } catch (error) {
        logger.error('❌ Error desconectando Outlook:', error);
        res.status(500).json({ error: 'Error desconectando cuenta' });
    }
});

module.exports = router;
