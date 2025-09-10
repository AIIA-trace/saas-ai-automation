const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const twilioService = require('../services/twilioService');
const openaiService = require('../services/openaiService');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

class WebhookController {
  
  // Manejar llamada entrante
  async handleIncomingCall(req, res) {
    try {
      const { CallSid, From, To } = req.body;
      
      logger.info(`🔍 DEBUG WEBHOOK: Datos recibidos de Twilio`);
      logger.info(`🔍 DEBUG: CallSid = ${CallSid}`);
      logger.info(`🔍 DEBUG: From = ${From}`);
      logger.info(`🔍 DEBUG: To = ${To}`);
      logger.info(`🔍 DEBUG: Body completo = ${JSON.stringify(req.body, null, 2)}`);
      
      // Normalizar formato de números (asegurar que tengan +)
      const fromNumber = From.startsWith('+') ? From : `+${From.trim()}`;
      const toNumber = To.startsWith('+') ? To : `+${To.trim()}`;
      
      logger.info(`🔍 DEBUG: Números normalizados - From: ${fromNumber}, To: ${toNumber}`);
      logger.info(`📞 Llamada entrante desde ${fromNumber} a ${toNumber}, SID: ${CallSid}`);
      
      // Buscar cliente por número Twilio llamado
      let targetClient = null;
      
      // Primero intentar buscar por número Twilio específico - CARGAR TODA LA INFORMACIÓN
      logger.info(`🔍 DEBUG DB: Buscando número Twilio en base de datos: ${toNumber}`);
      
      const twilioNumber = await prisma.twilioNumber.findUnique({
        where: { phoneNumber: toNumber },
        include: { 
          client: {
            include: {
              twilioNumbers: true,
              // Cargar TODA la información del cliente para el contexto
              companyInfo: true,
              botConfig: true,
              notificationConfig: true,
              businessHours: true,
              // Incluir FAQs y archivos de contexto
              faqs: true,
              contextFiles: true
            }
          }
        }
      });
      
      logger.info(`🔍 DEBUG DB: Resultado búsqueda - Encontrado: ${!!twilioNumber}`);
      if (twilioNumber) {
        logger.info(`🔍 DEBUG DB: Cliente asociado: ${twilioNumber.client?.companyName || 'Sin nombre'}`);
        logger.info(`🔍 DEBUG DB: Cliente ID: ${twilioNumber.client?.id}`);
        logger.info(`🔍 DEBUG DB: Bot activo: ${twilioNumber.client?.callConfig?.enabled}`);
        logger.info(`🔍 DEBUG DB: FAQs: ${twilioNumber.client?.faqs?.length || 0}`);
        logger.info(`🔍 DEBUG DB: Archivos contexto: ${twilioNumber.client?.contextFiles?.length || 0}`);
        logger.info(`🔍 DEBUG DB: Horarios comerciales: ${twilioNumber.client?.businessHours?.length || 0}`);
      }
      
      if (twilioNumber && twilioNumber.client) {
        // Verificar que el cliente tenga bot activo
        const clientCallConfig = twilioNumber.client.callConfig;
        if (clientCallConfig && clientCallConfig.enabled) {
          targetClient = twilioNumber.client;
          logger.info(`✅ Cliente encontrado por número Twilio: ${toNumber} → ${targetClient.companyName}`);
        } else {
          logger.warn(`⚠️ Cliente encontrado pero bot desactivado para número: ${toNumber}`);
        }
      }
      
      // Si no se encuentra cliente específico, rechazar la llamada
      if (!targetClient) {
        logger.error(`❌ DEBUG: No se encontró cliente para número Twilio: ${toNumber}`);
        logger.error(`❌ DEBUG: Verificar que el número ${toNumber} esté registrado en tabla twilioNumbers`);
        logger.error(`❌ DEBUG: Verificar que el cliente asociado tenga callConfig.enabled = true`);
        const errorTwiml = twilioService.generateErrorTwiml("Número no configurado");
        res.type('text/xml');
        return res.status(404).send(errorTwiml.toString());
      }
      
      logger.info(`✅ DEBUG: Cliente identificado correctamente`);
      logger.info(`✅ DEBUG: Cliente ID: ${targetClient.id}`);
      logger.info(`✅ DEBUG: Empresa: ${targetClient.companyName || 'Sin nombre'}`);
      logger.info(`✅ DEBUG: Email: ${targetClient.email}`);
      logger.info(`✅ DEBUG: Saludo configurado: "${targetClient.callConfig?.greeting || 'No configurado'}"`);
      logger.info(`✅ DEBUG: Voz configurada: ${targetClient.callConfig?.voiceId || 'No configurada'}`);
      logger.info(`✅ Llamada asignada a cliente: ${targetClient.email} (${targetClient.companyName || 'Sin nombre'})`);
      
      // Registrar la llamada en la BD
      const callLog = await prisma.callLog.create({
        data: {
          clientId: targetClient.id,
          twilioCallSid: CallSid,
          callerNumber: fromNumber,
          callStatus: 'in-progress'
        }
      });
      
      logger.info(`📝 Llamada registrada con ID: ${callLog.id}`);
      
      // Generar TwiML para contestar la llamada
      const botConfig = targetClient.callConfig || {};
      const twiml = await twilioService.generateWelcomeTwiml(botConfig);
      
      res.type('text/xml');
      return res.send(twiml.toString());
    } catch (error) {
      logger.error(`❌ Error en handleIncomingCall: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      
      const errorTwiml = twilioService.generateErrorTwiml("Se produjo un error. Inténtelo más tarde.");
      res.type('text/xml');
      return res.send(errorTwiml.toString());
    }
  }
  
  // Manejar grabación de llamada
  async handleRecording(req, res) {
    try {
      const { CallSid, RecordingUrl, RecordingDuration } = req.body;
      
      // Buscar la llamada en nuestra BD
      const callLog = await prisma.callLog.findFirst({
        where: { twilioCallSid: CallSid },
        include: { client: true }
      });
      
      if (!callLog) {
        logger.error(`Llamada no encontrada para SID: ${CallSid}`);
        return res.status(404).send("Call not found");
      }
      
      // Actualizar log con URL de grabación
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingUrl: RecordingUrl,
          callDuration: parseInt(RecordingDuration)
        }
      });
      
      // Procesamiento asíncrono (enviar a n8n)
      const n8nWebhook = process.env.N8N_WEBHOOK_CALL;
      
      // Enviar los datos al flujo de n8n para procesamiento
      const n8nPayload = {
        callId: callLog.id,
        clientId: callLog.clientId,
        recordingUrl: RecordingUrl,
        callerNumber: callLog.callerNumber,
        companyInfo: callLog.client.companyInfo,
        botConfig: callLog.client.botConfig,
        notificationConfig: callLog.client.notificationConfig
      };
      
      // Iniciar procesamiento asíncrono (no esperamos respuesta)
      fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload)
      }).catch(err => logger.error(`Error enviando a n8n: ${err.message}`));
      
      return res.status(200).send("Processing recording");
    } catch (error) {
      logger.error(`Error en handleRecording: ${error.message}`);
      return res.status(500).send("Error processing recording");
    }
  }
  
  // Manejar recolección de información mediante teclado (DTMF) o voz
  async handleGatherInput(req, res) {
    try {
      // LEGACY CODE - DEPRECATED: Usar OpenAI Whisper en su lugar
      logger.warn('⚠️ Webhook controller legacy llamado. Migrar a OpenAI Whisper.');
      const input = '';
      
      // Buscar la llamada en nuestra BD
      const callLog = await prisma.callLog.findFirst({
        where: { twilioCallSid: CallSid },
        include: { client: true }
      });
      
      if (!callLog) {
        logger.error(`Llamada no encontrada para SID: ${CallSid}`);
        return res.status(404).send(twilioService.generateErrorTwiml("Error en el procesamiento"));
      }
      
      // Determinar el siguiente paso basado en la configuración del cliente
      const botConfig = callLog.client.botConfig;
      const twiml = await twilioService.generateGatherResponse(input, botConfig);
      
      res.type('text/xml');
      return res.send(twiml.toString());
    } catch (error) {
      logger.error(`Error en handleGatherInput: ${error.message}`);
      const twiml = twilioService.generateErrorTwiml("Se produjo un error. Inténtelo más tarde.");
      res.type('text/xml');
      return res.send(twiml.toString());
    }
  }
  
  // Manejar cambios de estado de llamada
  async handleCallStatus(req, res) {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      logger.info(`Estado de llamada ${CallSid}: ${CallStatus}`);
      
      // Buscar la llamada en nuestra BD
      const callLog = await prisma.callLog.findFirst({
        where: { twilioCallSid: CallSid }
      });
      
      if (!callLog) {
        logger.warn(`Llamada no encontrada para SID: ${CallSid}`);
        return res.status(200).send("OK");
      }
      
      // Actualizar estado de la llamada
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          callStatus: CallStatus,
          callDuration: CallDuration ? parseInt(CallDuration) : null,
          endedAt: ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus) ? new Date() : null
        }
      });
      
      return res.status(200).send("OK");
    } catch (error) {
      logger.error(`Error en handleCallStatus: ${error.message}`);
      return res.status(500).send("Error");
    }
  }
  
  // Manejar SMS entrante
  async handleIncomingSMS(req, res) {
    try {
      const { MessageSid, From, To, Body } = req.body;
      logger.info(`SMS entrante desde ${From} a ${To}: ${Body}`);
      
      // Buscar el número en nuestra base de datos
      const twilioNumber = await prisma.twilioNumber.findUnique({
        where: { phoneNumber: To },
        include: { client: true }
      });
      
      if (!twilioNumber) {
        logger.error(`Número Twilio no encontrado en la base de datos: ${To}`);
        return res.status(404).send("Number not configured");
      }
      
      // Registrar el SMS en la BD (usando la tabla de emails por ahora)
      const smsLog = await prisma.emailLog.create({
        data: {
          clientId: twilioNumber.clientId,
          messageId: MessageSid,
          fromAddress: From,
          toAddress: To,
          subject: 'SMS Message',
          bodyPlain: Body,
          bodyHtml: `<p>${Body}</p>`
        }
      });
      
      // Enviar a N8N para procesamiento
      const n8nWebhook = process.env.N8N_WEBHOOK_EMAIL; // Usar el mismo webhook de email
      
      const n8nPayload = {
        type: 'sms',
        smsId: smsLog.id,
        clientId: twilioNumber.clientId,
        fromNumber: From,
        message: Body,
        emailConfig: twilioNumber.client.emailConfig,
        companyInfo: twilioNumber.client.companyInfo
      };
      
      // Enviar a N8N de forma asíncrona
      fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload)
      }).catch(err => logger.error(`Error enviando SMS a n8n: ${err.message}`));
      
      return res.status(200).send("SMS processed");
    } catch (error) {
      logger.error(`Error en handleIncomingSMS: ${error.message}`);
      return res.status(500).send("Error processing SMS");
    }
  }
  
  // Manejar email entrante
  async handleIncomingEmail(req, res) {
    try {
      const { messageId, from, to, subject, textBody, htmlBody, attachments } = req.body;
      
      // Extraer dominio del email destinatario
      const toDomain = to.split('@')[1];
      
      // Buscar cliente basado en dominio de email
      const client = await prisma.client.findFirst({
        where: {
          emailConfig: {
            path: ['domain'],
            equals: toDomain
          }
        }
      });
      
      if (!client) {
        logger.error(`Cliente no encontrado para dominio de email: ${toDomain}`);
        return res.status(404).send("Client not found");
      }
      
      // Registrar el email
      const emailLog = await prisma.emailLog.create({
        data: {
          clientId: client.id,
          messageId,
          fromAddress: from,
          fromName: from.split('<')[0].trim() || null,
          toAddress: to,
          subject,
          bodyPlain: textBody,
          bodyHtml: htmlBody,
          attachments: attachments || [],
        }
      });
      
      // Procesamiento asíncrono (enviar a n8n)
      const n8nWebhook = process.env.N8N_WEBHOOK_EMAIL;
      
      // Enviar los datos al flujo de n8n para procesamiento
      const n8nPayload = {
        emailId: emailLog.id,
        clientId: client.id,
        fromAddress: from,
        subject,
        body: textBody,
        emailConfig: client.emailConfig,
        companyInfo: client.companyInfo,
        notificationConfig: client.notificationConfig
      };
      
      // Iniciar procesamiento asíncrono (no esperamos respuesta)
      fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload)
      }).catch(err => logger.error(`Error enviando a n8n: ${err.message}`));
      
      return res.status(200).send("Processing email");
    } catch (error) {
      logger.error(`Error en handleIncomingEmail: ${error.message}`);
      return res.status(500).send("Error processing email");
    }
  }
  
  // Recibir y procesar los resultados del análisis de IA de n8n
  async handleAIProcessingResults(req, res) {
    try {
      const { type, id, aiSummary, aiClassification, contactInfo, urgencyLevel, callPurpose, forwardedTo, notifiedTo } = req.body;
      
      if (type === 'call') {
        await prisma.callLog.update({
          where: { id },
          data: {
            aiSummary,
            aiClassification,
            urgencyLevel,
            callPurpose,
            contactInfo: contactInfo || {},
            notificationSent: notifiedTo ? true : false,
            notifiedTo: notifiedTo || []
          }
        });
      } else if (type === 'email') {
        await prisma.emailLog.update({
          where: { id },
          data: {
            aiSummary,
            aiClassification,
            forwardedTo: forwardedTo || []
          }
        });
      }
      
      return res.status(200).send("Results processed");
    } catch (error) {
      logger.error(`Error en handleAIProcessingResults: ${error.message}`);
      return res.status(500).send("Error processing AI results");
    }
  }
}

module.exports = new WebhookController();
