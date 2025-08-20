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
      logger.info(`Llamada entrante desde ${From} a ${To}, SID: ${CallSid}`);
      
      // Buscar el número en nuestra base de datos
      const twilioNumber = await prisma.twilioNumber.findUnique({
        where: { phoneNumber: To },
        include: { client: true }
      });
      
      if (!twilioNumber) {
        logger.error(`Número Twilio no encontrado en la base de datos: ${To}`);
        return res.status(404).send(twilioService.generateErrorTwiml("Servicio no configurado"));
      }
      
      // Registrar la llamada en la BD
      const callLog = await prisma.callLog.create({
        data: {
          clientId: twilioNumber.clientId,
          twilioCallSid: CallSid,
          callerNumber: From,
          callStatus: 'in-progress'
        }
      });
      
      // Generar TwiML para contestar la llamada
      const botConfig = twilioNumber.client.botConfig;
      const twiml = await twilioService.generateWelcomeTwiml(botConfig);
      
      res.type('text/xml');
      return res.send(twiml.toString());
    } catch (error) {
      logger.error(`Error en handleIncomingCall: ${error.message}`);
      const twiml = twilioService.generateErrorTwiml("Se produjo un error. Inténtelo más tarde.");
      res.type('text/xml');
      return res.send(twiml.toString());
    }
  }
  
  // Manejar grabación de llamada
  async handleRecording(req, res) {
    try {
      const { CallSid, RecordingUrl, RecordingDuration } = req.body;
      
      // Buscar la llamada en nuestra BD
      const callLog = await prisma.callLog.findUnique({
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
      const { CallSid, SpeechResult, Digits } = req.body;
      const input = SpeechResult || Digits || '';
      
      // Buscar la llamada en nuestra BD
      const callLog = await prisma.callLog.findUnique({
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
      const callLog = await prisma.callLog.findUnique({
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
