const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const twilioService = require('../services/twilioService');
const StreamingTwiMLService = require('../services/streamingTwiMLService');
const streamingTwiMLService = new StreamingTwiMLService();
// REMOVIDO: openaiService obsoleto - ahora usa OpenAI Realtime en TwilioStreamHandler
const emailService = require('../services/emailService');
const { PLAN_LIMITS } = require('../middleware/checkUsageLimits');

const prisma = new PrismaClient();

class WebhookController {
  
  // Manejar llamada entrante
  async handleIncomingCall(req, res) {
    try {
      const { CallSid, From, To } = req.body;
      
      // Normalizar formato de números
      const fromNumber = From.startsWith('+') ? From : `+${From.trim()}`;
      const toNumber = To.startsWith('+') ? To : `+${To.trim()}`;
      
      logger.info(`📞 LLAMADA RECIBIDA: ${fromNumber} → ${toNumber} (${CallSid})`);
      
      // CONSULTA COMPLETA A LA BASE DE DATOS ANTES DE DESCOLGAR
      const twilioNumber = await prisma.twilioNumber.findUnique({
        where: { phoneNumber: toNumber },
        include: { 
          client: true
        }
      });
      
      if (!twilioNumber?.client) {
        logger.error(`❌ Cliente no encontrado para número: ${toNumber}`);
        const errorTwiml = twilioService.generateErrorTwiML("Número no configurado");
        res.type('text/xml');
        return res.status(404).send(errorTwiml.toString());
      }

      // Manejar callConfig como objeto o JSON string
      const client = twilioNumber.client;
      let callConfig = null;
      
      if (client.callConfig) {
        if (typeof client.callConfig === 'string') {
          try {
            callConfig = JSON.parse(client.callConfig);
          } catch (error) {
            logger.error(`❌ Error parsing callConfig JSON: ${error.message}`);
            callConfig = null;
          }
        } else if (typeof client.callConfig === 'object') {
          callConfig = client.callConfig;
        }
      }
      
      if (!callConfig?.enabled) {
        logger.error(`❌ Bot desactivado para cliente: ${client.companyName}`);
        const errorTwiml = twilioService.generateErrorTwiML("Bot no disponible");
        res.type('text/xml');
        return res.status(404).send(errorTwiml.toString());
      }
      
      // Agregar callConfig procesado al cliente
      const targetClient = { ...twilioNumber.client, callConfig };
      logger.info(`✅ Cliente identificado: ${targetClient.companyName} (ID: ${targetClient.id})`);
      
      // ============================================
      // VERIFICAR LÍMITES DEL PLAN
      // ============================================
      const plan = targetClient.subscriptionPlan || 'starter';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
      
      // Obtener uso del mes actual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const callsThisMonth = await prisma.callLog.count({
        where: {
          clientId: targetClient.id,
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      
      logger.info(`📊 Cliente ${targetClient.id} - Llamadas este mes: ${callsThisMonth}/${limits.calls} (límite duro: ${limits.hardLimit.calls})`);
      
      // Verificar límite duro
      if (callsThisMonth >= limits.hardLimit.calls) {
        logger.warn(`🚫 Cliente ${targetClient.id} ha excedido el límite duro de llamadas (${callsThisMonth}/${limits.hardLimit.calls})`);
        const limitTwiml = twilioService.generateErrorTwiML(
          `Lo sentimos, has alcanzado el límite máximo de ${limits.hardLimit.calls} llamadas este mes. Por favor, actualiza tu plan para continuar usando el servicio.`
        );
        res.type('text/xml');
        return res.send(limitTwiml.toString());
      }
      
      // Registrar llamada
      const callLog = await prisma.callLog.create({
        data: {
          clientId: targetClient.id,
          twilioCallSid: CallSid,
          callerNumber: fromNumber,
          callStatus: 'in-progress'
        }
      });
      
      logger.info(`📞 [call_${CallSid}] Llamada entrante de ${fromNumber} a ${toNumber}`);
      logger.info(`✅ [call_${CallSid}] Cliente encontrado: ${targetClient.companyName}`);
      logger.info(`🎵 [call_${CallSid}] Iniciando conversación con Twilio Streams`);
      
      // GENERAR TWIML CON TODA LA CONFIGURACIÓN
      const twiml = streamingTwiMLService.createStreamTwiML(targetClient, CallSid);
      
      res.type('text/xml');
      return res.send(twiml.toString());
    } catch (error) {
      logger.error(`❌ Error en handleIncomingCall: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      
      const errorTwiml = twilioService.generateErrorTwiML("Se produjo un error. Inténtelo más tarde.");
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
      
      // Procesamiento completado - grabación guardada
      
      return res.status(200).send("Processing recording");
    } catch (error) {
      logger.error(`Error en handleRecording: ${error.message}`);
      return res.status(500).send("Error processing recording");
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
      
      if (!twilioNumber?.client) {
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
      
      // SMS procesado y guardado
      
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
      
      // ============================================
      // VERIFICAR LÍMITES DEL PLAN
      // ============================================
      const plan = client.subscriptionPlan || 'starter';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
      
      // Obtener uso del mes actual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const emailsThisMonth = await prisma.emailLog.count({
        where: {
          clientId: client.id,
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth
          }
        }
      });
      
      logger.info(`📊 Cliente ${client.id} - Emails este mes: ${emailsThisMonth}/${limits.emails} (límite duro: ${limits.hardLimit.emails})`);
      
      // Verificar límite duro
      if (emailsThisMonth >= limits.hardLimit.emails) {
        logger.warn(`🚫 Cliente ${client.id} ha excedido el límite duro de emails (${emailsThisMonth}/${limits.hardLimit.emails})`);
        return res.status(429).send("Email limit exceeded. Please upgrade your plan.");
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
      
      // Email procesado y guardado
      
      return res.status(200).send("Processing email");
    } catch (error) {
      logger.error(`Error en handleIncomingEmail: ${error.message}`);
      return res.status(500).send("Error processing email");
    }
  }
  
  // Procesar resultados de análisis de IA
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
