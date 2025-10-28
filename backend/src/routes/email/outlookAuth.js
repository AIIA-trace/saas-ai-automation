const express = require('express');
const router = express.Router();
const prisma = require('../../config/database');
const logger = require('../../config/logger');
const { authenticateToken } = require('../../middleware/auth');

/**
 * Iniciar flujo de autenticación OAuth con Microsoft
 */
router.get('/authorize', authenticateToken, (req, res) => {
    try {
        const clientId = req.user.clientId;
        
        if (!clientId) {
            return res.status(400).json({ error: 'Cliente no encontrado' });
        }

        // Construir URL de autorización de Microsoft
        const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        
        authUrl.searchParams.append('client_id', process.env.MICROSOFT_CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI);
        authUrl.searchParams.append('response_mode', 'query');
        authUrl.searchParams.append('scope', 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access');
        authUrl.searchParams.append('state', clientId.toString());

        logger.info(`🔐 Iniciando OAuth de Outlook para cliente ${clientId}`);
        logger.info(`📍 Redirect URI: ${process.env.MICROSOFT_REDIRECT_URI}`);

        res.redirect(authUrl.toString());
    } catch (error) {
        logger.error('❌ Error en autorización de Outlook:', error);
        res.status(500).json({ error: 'Error iniciando autenticación' });
    }
});

/**
 * Callback de OAuth - Recibir código de autorización
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

        // Intercambiar código por tokens
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
                grant_type: 'authorization_code',
                scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            logger.error('❌ Error obteniendo tokens de Outlook:', tokenData);
            return res.redirect(`/dashboard.html?error=outlook_token_failed&message=${encodeURIComponent(tokenData.error_description)}`);
        }

        logger.info('✅ Tokens obtenidos de Outlook');

        // Obtener información del usuario de Microsoft Graph
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();
        const userEmail = userData.mail || userData.userPrincipalName;

        logger.info(`📧 Email de Outlook: ${userEmail}`);

        // Guardar o actualizar cuenta en base de datos
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        const emailAccount = await prisma.emailAccount.upsert({
            where: {
                clientId_provider: {
                    clientId: parseInt(clientId),
                    provider: 'outlook'
                }
            },
            update: {
                email: userEmail,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: expiresAt
            },
            create: {
                clientId: parseInt(clientId),
                email: userEmail,
                provider: 'outlook',
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: expiresAt
            }
        });

        logger.info(`✅ Cuenta de Outlook guardada: ${emailAccount.email}`);

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
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const clientId = req.user.clientId;

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
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                refresh_token: emailAccount.refreshToken,
                grant_type: 'refresh_token',
                scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access'
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
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
router.delete('/disconnect', authenticateToken, async (req, res) => {
    try {
        const clientId = req.user.clientId;

        await prisma.emailAccount.deleteMany({
            where: {
                clientId: clientId,
                provider: 'outlook'
            }
        });

        logger.info(`✅ Cuenta de Outlook desconectada para cliente ${clientId}`);

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
