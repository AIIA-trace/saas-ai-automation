const GmailService = require('./gmailService');
const OutlookService = require('./outlookService');
const prisma = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Factory para crear el servicio de email apropiado según el proveedor
 */
class EmailServiceFactory {
    /**
     * Obtener servicio de email para un cliente
     * @param {number} clientId - ID del cliente
     * @returns {Promise<GmailService|OutlookService>}
     */
    static async getServiceForClient(clientId) {
        try {
            // Buscar cuenta de email del cliente
            const emailAccount = await prisma.emailAccount.findFirst({
                where: { clientId: clientId }
            });

            if (!emailAccount) {
                throw new Error('No se encontró cuenta de email configurada para este cliente');
            }

            return this.getServiceForAccount(emailAccount);
        } catch (error) {
            logger.error('❌ Error obteniendo servicio de email:', error);
            throw error;
        }
    }

    /**
     * Obtener servicio de email para una cuenta específica
     * @param {Object} account - Cuenta de email
     * @returns {GmailService|OutlookService}
     */
    static getServiceForAccount(account) {
        logger.info(`🔧 Creando servicio de email para proveedor: ${account.provider}`);

        switch (account.provider) {
            case 'google':
                return new GmailService(account);
            
            case 'outlook':
            case 'microsoft':
                return new OutlookService(account);
            
            default:
                throw new Error(`Proveedor de email no soportado: ${account.provider}`);
        }
    }

    /**
     * Obtener servicio de email para un usuario (por userId)
     * @param {number} userId - ID del usuario
     * @returns {Promise<GmailService|OutlookService>}
     */
    static async getServiceForUser(userId) {
        try {
            // Buscar cliente asociado al usuario
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { client: true }
            });

            if (!user || !user.client) {
                throw new Error('Usuario o cliente no encontrado');
            }

            return this.getServiceForClient(user.client.id);
        } catch (error) {
            logger.error('❌ Error obteniendo servicio de email para usuario:', error);
            throw error;
        }
    }

    /**
     * Verificar si un cliente tiene email configurado
     * @param {number} clientId - ID del cliente
     * @returns {Promise<boolean>}
     */
    static async hasEmailConfigured(clientId) {
        try {
            const emailAccount = await prisma.emailAccount.findFirst({
                where: { clientId: clientId }
            });

            return !!emailAccount;
        } catch (error) {
            logger.error('❌ Error verificando configuración de email:', error);
            return false;
        }
    }

    /**
     * Obtener información de la cuenta de email
     * @param {number} clientId - ID del cliente
     * @returns {Promise<Object|null>}
     */
    static async getAccountInfo(clientId) {
        try {
            const emailAccount = await prisma.emailAccount.findFirst({
                where: { clientId: clientId },
                select: {
                    id: true,
                    email: true,
                    provider: true,
                    createdAt: true
                }
            });

            return emailAccount;
        } catch (error) {
            logger.error('❌ Error obteniendo información de cuenta:', error);
            return null;
        }
    }
}

module.exports = EmailServiceFactory;
