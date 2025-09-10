const twilio = require('twilio');
const logger = require('../utils/logger');

class StreamingTwiMLService {
  constructor() {
    this.VoiceResponse = twilio.twiml.VoiceResponse;
  }

  /**
   * Generar TwiML para iniciar Stream con WebSocket
   */
  generateStreamTwiml(clientData, callSid = null) {
    return this.createStreamTwiML(clientData, callSid);
  }

  /**
   * Crear TwiML para iniciar Stream con WebSocket
   */
  createStreamTwiML(clientData, callSid = null) {
    const twiml = new this.VoiceResponse();
    
    try {
      // Configurar URL del WebSocket
      const wsUrl = this.getWebSocketUrl();
      
      logger.info(`🔍 DEBUG TWIML: Creando TwiML Stream para ${clientData.companyName}`);
      logger.info(`🔍 DEBUG TWIML: Cliente ID: ${clientData.id}`);
      logger.info(`🔍 DEBUG TWIML: CallSid: ${callSid}`);
      logger.info(`🔍 DEBUG TWIML: WebSocket URL: ${wsUrl}`);
      logger.info(`🔍 DEBUG TWIML: Datos del cliente recibidos:`);
      logger.info(`🔍 DEBUG TWIML: - companyInfo: ${!!clientData.companyInfo}`);
      logger.info(`🔍 DEBUG TWIML: - botConfig: ${!!clientData.botConfig}`);
      logger.info(`🔍 DEBUG TWIML: - businessHours: ${clientData.businessHours?.length || 0}`);
      logger.info(`🔍 DEBUG TWIML: - faqs: ${clientData.faqs?.length || 0}`);
      logger.info(`🔍 DEBUG TWIML: - contextFiles: ${clientData.contextFiles?.length || 0}`);
      logger.info(`🎵 Creando TwiML Stream para ${clientData.companyName}`);
      logger.info(`🔌 WebSocket URL: ${wsUrl}`);

      // Contestar la llamada inmediatamente (sin audio audible)
      twiml.say('');
      
      // Iniciar stream para Azure TTS
      const start = twiml.start();
      const stream = start.stream({
        url: wsUrl,
        track: 'both_tracks'
      });
      
      // Parámetros del stream - incluir toda la configuración del cliente
      stream.parameter({
        name: 'clientId',
        value: clientData.id.toString()
      });
      
      stream.parameter({
        name: 'companyName',
        value: clientData.companyName || 'Sistema de Atención'
      });
      
      // Pasar configuración de llamadas
      if (clientData.callConfig) {
        stream.parameter({
          name: 'greeting',
          value: clientData.callConfig.greeting || 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?'
        });
        
        stream.parameter({
          name: 'voiceId',
          value: clientData.callConfig.voiceId || 'lola'
        });
        
        stream.parameter({
          name: 'enabled',
          value: clientData.callConfig.enabled ? 'true' : 'false'
        });
      } else {
        // Configuración por defecto si no existe
        stream.parameter({
          name: 'greeting',
          value: 'Hola, gracias por llamar. Soy el asistente virtual. ¿En qué puedo ayudarte?'
        });
        
        stream.parameter({
          name: 'voiceId',
          value: 'lola'
        });
        
        stream.parameter({
          name: 'enabled',
          value: 'true'
        });
      }

      // Pasar TODA la información como parámetros - CÓDIGO EXACTO DEL TEST
      if (clientData.companyInfo) {
        stream.parameter({
          name: 'companyInfo',
          value: typeof clientData.companyInfo === 'string' ? clientData.companyInfo : JSON.stringify(clientData.companyInfo)
        });
      }

      if (clientData.botConfig) {
        stream.parameter({
          name: 'botConfig',
          value: typeof clientData.botConfig === 'string' ? clientData.botConfig : JSON.stringify(clientData.botConfig)
        });
      }

      if (clientData.businessHours) {
        stream.parameter({
          name: 'businessHours',
          value: JSON.stringify(clientData.businessHours)
        });
      }

      if (clientData.notificationConfig) {
        stream.parameter({
          name: 'notificationConfig',
          value: JSON.stringify(clientData.notificationConfig)
        });
      }

      // Pasar FAQs y contextFiles - CÓDIGO EXACTO DEL TEST
      if (clientData.faqs) {
        stream.parameter({
          name: 'faqs',
          value: typeof clientData.faqs === 'string' ? clientData.faqs : JSON.stringify(clientData.faqs)
        });
        logger.info(`🔍 DEBUG TWIML: FAQs agregadas como parámetro`);
      } else {
        logger.info(`🔍 DEBUG TWIML: No hay FAQs para agregar`);
      }

      if (clientData.contextFiles) {
        stream.parameter({
          name: 'contextFiles',
          value: typeof clientData.contextFiles === 'string' ? clientData.contextFiles : JSON.stringify(clientData.contextFiles)
        });
        logger.info(`🔍 DEBUG TWIML: ContextFiles agregados como parámetro`);
      } else {
        logger.info(`🔍 DEBUG TWIML: No hay archivos de contexto para agregar`);
      }
      
      if (callSid) {
        stream.parameter({
          name: 'callSid',
          value: callSid
        });
      }
      
      // Pausa para mantener la llamada activa
      twiml.pause({ length: 3600 }); // 1 hora máximo

      const twimlString = twiml.toString();
      logger.info(`✅ TwiML Stream generado: ${twimlString.length} caracteres`);
      
      return twimlString;

    } catch (error) {
      logger.error(`❌ Error generando TwiML Stream: ${error.message}`);
      return this.createFallbackTwiML(clientData);
    }
  }

  /**
   * Obtener URL del WebSocket según el entorno
   */
  getWebSocketUrl() {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.RENDER_EXTERNAL_URL || 'https://saas-ai-automation.onrender.com')
      : `http://localhost:${process.env.PORT || 10000}`;
    
    // Convertir HTTP a WS
    const wsUrl = baseUrl.replace(/^https?/, baseUrl.startsWith('https') ? 'wss' : 'ws');
    
    return `${wsUrl}/websocket/twilio-stream`;
  }

  /**
   * TwiML de fallback si Stream falla
   */
  createFallbackTwiML(clientData) {
    const twiml = new this.VoiceResponse();
    
    try {
      // Mensaje de fallback personalizado
      const fallbackMessage = clientData.welcomeMessage || 
        `Has llamado a ${clientData.companyName}. Disculpa, nuestro sistema está temporalmente no disponible. Por favor, inténtalo más tarde.`;

      // Usar mensaje simple sin voz específica
      twiml.say(fallbackMessage);

      // Colgar después del mensaje
      twiml.hangup();

      logger.warn(`⚠️ TwiML fallback generado para ${clientData.companyName}`);
      return twiml.toString();

    } catch (error) {
      logger.error(`❌ Error generando TwiML fallback: ${error.message}`);
      
      // Fallback mínimo
      const minimalTwiml = new this.VoiceResponse();
      minimalTwiml.say('Lo sentimos, hay un problema técnico. Inténtalo más tarde.');
      minimalTwiml.hangup();
      
      return minimalTwiml.toString();
    }
  }

  /**
   * TwiML para error de cliente no encontrado
   */
  createClientNotFoundTwiML() {
    const twiml = new this.VoiceResponse();
    
    // Usar mensaje simple sin voz específica
    twiml.say('Lo sentimos, este número no está configurado correctamente. Por favor, contacta al administrador.');
    
    twiml.hangup();
    
    logger.warn('⚠️ TwiML generado para cliente no encontrado');
    return twiml.toString();
  }

  /**
   * TwiML para mantenimiento
   */
  createMaintenanceTwiML() {
    const twiml = new this.VoiceResponse();
    
    // Usar mensaje simple sin voz específica
    twiml.say('Nuestro servicio está temporalmente en mantenimiento. Por favor, inténtalo más tarde. Gracias por tu comprensión.');
    
    twiml.hangup();
    
    logger.info('🔧 TwiML de mantenimiento generado');
    return twiml.toString();
  }

  /**
   * Validar configuración para Streams
   */
  validateStreamConfig() {
    const errors = [];

    // Verificar variables de entorno necesarias
    if (!process.env.AZURE_SPEECH_KEY) {
      errors.push('AZURE_SPEECH_KEY no configurada');
    }

    if (!process.env.AZURE_SPEECH_REGION) {
      errors.push('AZURE_SPEECH_REGION no configurada');
    }

    if (!process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY no configurada');
    }

    if (errors.length > 0) {
      logger.error(`❌ Errores de configuración Stream: ${errors.join(', ')}`);
      return false;
    }

    logger.info('✅ Configuración Stream validada');
    return true;
  }

  /**
   * Test de generación TwiML
   */
  testTwiMLGeneration() {
    try {
      const testClient = {
        id: 999,
        companyName: 'Test Company',
        language: 'es',
        welcomeMessage: 'Bienvenido a Test Company'
      };

      const twiml = this.createStreamTwiML(testClient);
      
      if (twiml && twiml.includes('<Connect>') && twiml.includes('<Stream')) {
        logger.info('✅ Test TwiML Stream exitoso');
        return true;
      } else {
        logger.error('❌ Test TwiML Stream falló: formato incorrecto');
        return false;
      }

    } catch (error) {
      logger.error(`❌ Test TwiML Stream falló: ${error.message}`);
      return false;
    }
  }
}

module.exports = StreamingTwiMLService;
