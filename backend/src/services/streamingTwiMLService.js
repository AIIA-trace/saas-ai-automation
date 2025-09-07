const twilio = require('twilio');
const logger = require('../utils/logger');

class StreamingTwiMLService {
  constructor() {
    this.VoiceResponse = twilio.twiml.VoiceResponse;
  }

  /**
   * Crear TwiML para iniciar Stream con WebSocket
   */
  createStreamTwiML(clientData, callSid = null) {
    const twiml = new this.VoiceResponse();
    
    try {
      // Configurar URL del WebSocket
      const wsUrl = this.getWebSocketUrl();
      
      logger.info(`🎵 Creando TwiML Stream para ${clientData.companyName}`);
      logger.info(`🔌 WebSocket URL: ${wsUrl}`);

      // Conectar a WebSocket Stream
      const connect = twiml.connect();
      const stream = connect.stream({
        url: wsUrl,
        track: 'inbound_track' // Solo audio del usuario
      });

      // Parámetros adicionales para el stream
      stream.parameter({
        name: 'clientId',
        value: clientData.id.toString()
      });

      stream.parameter({
        name: 'companyName',
        value: clientData.companyName
      });

      stream.parameter({
        name: 'language',
        value: clientData.language || 'es'
      });

      // Agregar CallSid si está disponible
      if (callSid) {
        stream.parameter({
          name: 'callSid',
          value: callSid
        });
      }

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
      // Mensaje de fallback
      const fallbackMessage = clientData.welcomeMessage || 
        `Hola, has llamado a ${clientData.companyName}. Disculpa, nuestro sistema está temporalmente no disponible. Por favor, inténtalo más tarde.`;

      twiml.say({
        voice: 'Polly.Conchita',
        language: 'es-ES'
      }, fallbackMessage);

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
    
    twiml.say({
      voice: 'Polly.Conchita',
      language: 'es-ES'
    }, 'Lo sentimos, este número no está configurado correctamente. Por favor, contacta al administrador.');
    
    twiml.hangup();
    
    logger.warn('⚠️ TwiML generado para cliente no encontrado');
    return twiml.toString();
  }

  /**
   * TwiML para mantenimiento
   */
  createMaintenanceTwiML() {
    const twiml = new this.VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Conchita',
      language: 'es-ES'
    }, 'Nuestro servicio está temporalmente en mantenimiento. Por favor, inténtalo más tarde. Gracias por tu comprensión.');
    
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
        welcomeMessage: 'Hola, este es un test'
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
