const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    this.activeConnections = new Map();
  }

  // Crear conexión IMAP
  createImapConnection(config) {
    return new Imap({
      user: config.imapUser,
      password: config.imapPassword,
      host: config.imapHost,
      port: config.imapPort || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
  }

  // Crear transporter SMTP
  createSmtpTransporter(config) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword
      }
    });
  }

  // Verificar conexión de email
  async testEmailConnection(config) {
    try {
      // Probar conexión SMTP
      const transporter = this.createSmtpTransporter(config);
      await transporter.verify();
      
      // Probar conexión IMAP
      return new Promise((resolve, reject) => {
        const imap = this.createImapConnection(config);
        
        imap.once('ready', () => {
          imap.end();
          resolve({ success: true, message: 'Conexión exitosa' });
        });
        
        imap.once('error', (err) => {
          reject({ success: false, message: err.message });
        });
        
        imap.connect();
      });
    } catch (error) {
      logger.error(`Error verificando conexión de email: ${error.message}`);
      throw { success: false, message: error.message };
    }
  }

  // Procesar emails entrantes
  async processIncomingEmails(clientId) {
    try {
      const emailAccounts = await prisma.emailAccount.findMany({
        where: { clientId, isActive: true }
      });

      for (const account of emailAccounts) {
        await this.processAccountEmails(account);
      }
    } catch (error) {
      logger.error(`Error procesando emails entrantes: ${error.message}`);
      throw error;
    }
  }

  // Procesar emails de una cuenta específica
  async processAccountEmails(account) {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(account);

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            logger.error(`Error abriendo INBOX: ${err.message}`);
            return reject(err);
          }

          // Buscar emails no leídos
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              logger.error(`Error buscando emails: ${err.message}`);
              return reject(err);
            }

            if (results.length === 0) {
              imap.end();
              return resolve([]);
            }

            const fetch = imap.fetch(results, { bodies: '' });
            const emails = [];

            fetch.on('message', (msg, seqno) => {
              let buffer = '';
              
              msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const emailData = {
                    messageId: parsed.messageId,
                    from: parsed.from?.text || '',
                    to: parsed.to?.text || '',
                    subject: parsed.subject || '',
                    text: parsed.text || '',
                    html: parsed.html || '',
                    date: parsed.date || new Date()
                  };

                  emails.push(emailData);
                  
                  // Procesar email con IA
                  await this.processEmailWithAI(account.clientId, emailData);
                  
                } catch (error) {
                  logger.error(`Error procesando email: ${error.message}`);
                }
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });

            fetch.once('error', (err) => {
              logger.error(`Error en fetch: ${err.message}`);
              imap.end();
              reject(err);
            });
          });
        });
      });

      imap.once('error', (err) => {
        logger.error(`Error de conexión IMAP: ${err.message}`);
        reject(err);
      });

      imap.connect();
    });
  }

  // Procesar email con IA
  async processEmailWithAI(clientId, emailData) {
    try {
      // Obtener configuración del cliente
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          botConfig: true,
          emailConfig: true
        }
      });

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      // Registrar email en la base de datos
      const emailLog = await prisma.emailLog.create({
        data: {
          clientId,
          messageId: emailData.messageId,
          fromEmail: emailData.from,
          toEmail: emailData.to,
          subject: emailData.subject,
          body: emailData.text,
          status: 'received'
        }
      });

      // Generar respuesta con IA (aquí integrarías con OpenAI o tu servicio de IA)
      const aiResponse = await this.generateAIResponse(emailData, client.botConfig);

      // Actualizar log con respuesta de IA
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          aiResponse: aiResponse.text,
          status: 'processed'
        }
      });

      // Enviar respuesta automática si está habilitada
      if (client.emailConfig?.autoReply) {
        await this.sendAutoReply(clientId, emailData, aiResponse);
      }

      // Aplicar reglas de reenvío
      if (client.emailConfig?.forwardingRules) {
        await this.applyForwardingRules(clientId, emailData, JSON.parse(client.emailConfig.forwardingRules));
      }

    } catch (error) {
      logger.error(`Error procesando email con IA: ${error.message}`);
      throw error;
    }
  }

  // Generar respuesta con IA
  async generateAIResponse(emailData, botConfig) {
    try {
      // Aquí integrarías con tu servicio de IA preferido (OpenAI, etc.)
      // Por ahora, devolvemos una respuesta básica
      
      const prompt = `
        Eres un asistente de IA para ${botConfig?.companyName || 'la empresa'}.
        
        Configuración del bot:
        - Personalidad: ${botConfig?.personality || 'profesional y amigable'}
        - Capacidades: ${botConfig?.capabilities || 'responder preguntas generales'}
        
        Email recibido:
        De: ${emailData.from}
        Asunto: ${emailData.subject}
        Contenido: ${emailData.text}
        
        Genera una respuesta profesional y útil.
      `;

      // Respuesta básica mientras no tengas integración con IA
      const basicResponse = {
        text: `Gracias por su email. Hemos recibido su mensaje sobre "${emailData.subject}" y será atendido a la brevedad por nuestro equipo. 
        
Si necesita atención inmediata, puede contactarnos por teléfono.

Saludos cordiales,
${botConfig?.companyName || 'Nuestro equipo'}`,
        confidence: 0.8
      };

      return basicResponse;
    } catch (error) {
      logger.error(`Error generando respuesta de IA: ${error.message}`);
      return {
        text: "Gracias por su email. Hemos recibido su mensaje y será atendido a la brevedad.",
        confidence: 0.5
      };
    }
  }

  // Enviar respuesta automática
  async sendAutoReply(clientId, originalEmail, aiResponse) {
    try {
      const emailAccount = await prisma.emailAccount.findFirst({
        where: { clientId, isActive: true }
      });

      if (!emailAccount) {
        throw new Error('No hay cuenta de email activa');
      }

      const transporter = this.createSmtpTransporter(emailAccount);

      const mailOptions = {
        from: emailAccount.email,
        to: originalEmail.from,
        subject: `Re: ${originalEmail.subject}`,
        text: aiResponse.text,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.messageId
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Registrar email enviado
      await prisma.emailLog.create({
        data: {
          clientId,
          fromEmail: emailAccount.email,
          toEmail: originalEmail.from,
          subject: mailOptions.subject,
          body: aiResponse.text,
          status: 'sent',
          aiResponse: aiResponse.text
        }
      });

      logger.info(`Respuesta automática enviada: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Error enviando respuesta automática: ${error.message}`);
      throw error;
    }
  }

  // Aplicar reglas de reenvío
  async applyForwardingRules(clientId, emailData, forwardingRules) {
    try {
      for (const rule of forwardingRules) {
        if (this.emailMatchesRule(emailData, rule)) {
          await this.forwardEmail(clientId, emailData, rule.recipients);
        }
      }
    } catch (error) {
      logger.error(`Error aplicando reglas de reenvío: ${error.message}`);
      throw error;
    }
  }

  // Verificar si email coincide con regla
  emailMatchesRule(emailData, rule) {
    if (rule.condition === 'subject_contains') {
      return emailData.subject.toLowerCase().includes(rule.value.toLowerCase());
    }
    if (rule.condition === 'from_contains') {
      return emailData.from.toLowerCase().includes(rule.value.toLowerCase());
    }
    if (rule.condition === 'body_contains') {
      return emailData.text.toLowerCase().includes(rule.value.toLowerCase());
    }
    return false;
  }

  // Reenviar email
  async forwardEmail(clientId, emailData, recipients) {
    try {
      const emailAccount = await prisma.emailAccount.findFirst({
        where: { clientId, isActive: true }
      });

      if (!emailAccount) {
        throw new Error('No hay cuenta de email activa');
      }

      const transporter = this.createSmtpTransporter(emailAccount);

      for (const recipient of recipients) {
        const mailOptions = {
          from: emailAccount.email,
          to: recipient,
          subject: `Fwd: ${emailData.subject}`,
          text: `---------- Mensaje reenviado ----------
De: ${emailData.from}
Fecha: ${emailData.date}
Asunto: ${emailData.subject}

${emailData.text}`
        };

        await transporter.sendMail(mailOptions);
        
        // Registrar reenvío
        await prisma.emailLog.create({
          data: {
            clientId,
            fromEmail: emailAccount.email,
            toEmail: recipient,
            subject: mailOptions.subject,
            body: mailOptions.text,
            status: 'forwarded'
          }
        });
      }
    } catch (error) {
      logger.error(`Error reenviando email: ${error.message}`);
      throw error;
    }
  }

  // Enviar email personalizado
  async sendCustomEmail(clientId, emailData) {
    try {
      const emailAccount = await prisma.emailAccount.findFirst({
        where: { clientId, isActive: true }
      });

      if (!emailAccount) {
        throw new Error('No hay cuenta de email activa');
      }

      const transporter = this.createSmtpTransporter(emailAccount);

      const mailOptions = {
        from: emailAccount.email,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Registrar email enviado
      await prisma.emailLog.create({
        data: {
          clientId,
          fromEmail: emailAccount.email,
          toEmail: emailData.to,
          subject: emailData.subject,
          body: emailData.text,
          status: 'sent'
        }
      });

      return result;
    } catch (error) {
      logger.error(`Error enviando email personalizado: ${error.message}`);
      throw error;
    }
  }

  // Iniciar monitoreo de emails
  async startEmailMonitoring(clientId) {
    try {
      // Procesar emails cada 5 minutos
      const interval = setInterval(async () => {
        try {
          await this.processIncomingEmails(clientId);
        } catch (error) {
          logger.error(`Error en monitoreo de emails: ${error.message}`);
        }
      }, 5 * 60 * 1000);

      this.activeConnections.set(clientId, interval);
      logger.info(`Monitoreo de emails iniciado para cliente ${clientId}`);
    } catch (error) {
      logger.error(`Error iniciando monitoreo de emails: ${error.message}`);
      throw error;
    }
  }

  // Detener monitoreo de emails
  stopEmailMonitoring(clientId) {
    const interval = this.activeConnections.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.activeConnections.delete(clientId);
      logger.info(`Monitoreo de emails detenido para cliente ${clientId}`);
    }
  }

  // Enviar email de recuperación de contraseña
  async sendPasswordResetEmail(email, resetToken) {
    try {
      // Crear transporter con configuración por defecto
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_FROM,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // URL de reset (ajustar según tu dominio)
      const resetUrl = `${process.env.FRONTEND_URL || 'https://saas-ai-automation.onrender.com'}/reset-password?token=${resetToken}`;

      // Plantilla HTML del email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recuperar Contraseña - AIIA Trace</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Recuperar Contraseña</h1>
            </div>
            <div class="content">
              <h2>Hola,</h2>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>AIIA Trace</strong>.</p>
              
              <p>Si fuiste tú quien solicitó este cambio, haz clic en el siguiente botón para crear una nueva contraseña:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este enlace es válido por <strong>1 hora</strong></li>
                  <li>Solo puedes usarlo una vez</li>
                  <li>Si no solicitaste este cambio, ignora este email</li>
                </ul>
              </div>
              
              <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
            </div>
            <div class="footer">
              <p>Este email fue enviado automáticamente. No respondas a este mensaje.</p>
              <p>© 2025 AIIA Trace - Sistema de Automatización con IA</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Configuración del email
      const mailOptions = {
        from: `"AIIA Trace" <${process.env.EMAIL_FROM || 'noreply@aiia-trace.com'}>`,
        to: email,
        subject: '🔐 Recuperar contraseña - AIIA Trace',
        html: htmlContent,
        text: `
Recuperar Contraseña - AIIA Trace

Hola,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

Para crear una nueva contraseña, visita este enlace:
${resetUrl}

Este enlace es válido por 1 hora y solo puedes usarlo una vez.

Si no solicitaste este cambio, ignora este email.

© 2025 AIIA Trace
        `
      };

      // Enviar email
      const result = await transporter.sendMail(mailOptions);
      
      logger.info(`Email de recuperación enviado a ${email}: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email de recuperación enviado correctamente'
      };
      
    } catch (error) {
      logger.error(`Error enviando email de recuperación: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
