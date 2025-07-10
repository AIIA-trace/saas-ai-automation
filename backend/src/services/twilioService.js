const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    // Solo inicializar Twilio si hay credenciales
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      this.client = null;
      logger.warn('Twilio credentials not configured');
    }
  }

  // Generar TwiML para dar la bienvenida al llamante
  async generateWelcomeTwiml(botConfig) {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      // Obtener mensaje de bienvenida de la configuración o usar uno predeterminado
      const welcomeMessage = botConfig?.welcomeMessage || 
        'Gracias por llamar. Por favor, indique su nombre y el motivo de su llamada.';
      
      // Configurar la voz y el idioma
      const voiceSettings = {
        voice: botConfig?.voice || 'Polly.Conchita',
        language: botConfig?.language || 'es-ES'
      };

      // Flujo de bienvenida
      twiml.say(voiceSettings, welcomeMessage);
      
      // Recopilar la entrada del usuario (usando reconocimiento de voz)
      const gather = twiml.gather({
        input: 'speech dtmf',
        timeout: '5',
        speechTimeout: 'auto',
        language: botConfig?.language || 'es-ES',
        action: '/webhooks/gather',
        method: 'POST'
      });
      
      gather.say(voiceSettings, botConfig?.gatherPrompt || 
        'Por favor, indique su nombre y el motivo de su llamada después del tono.');
      
      // Si no hay respuesta, grabar mensaje
      twiml.record({
        action: '/webhooks/recording',
        method: 'POST',
        maxLength: '120',
        playBeep: true,
        transcribe: false,
        timeout: 5
      });
      
      twiml.say(voiceSettings, 'Gracias por su mensaje. Nos pondremos en contacto con usted lo antes posible.');
      twiml.hangup();
      
      return twiml;
    } catch (error) {
      logger.error(`Error generando Welcome TwiML: ${error.message}`);
      return this.generateErrorTwiml('Lo sentimos, ha ocurrido un error en el sistema.');
    }
  }
  
  // Generar respuesta basada en la entrada del usuario
  async generateGatherResponse(input, botConfig) {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      // Configurar voz
      const voiceSettings = {
        voice: botConfig?.voice || 'Polly.Conchita',
        language: botConfig?.language || 'es-ES'
      };
      
      // Si tenemos entrada, agradecer y seguir con más preguntas según el flujo configurado
      if (input && input.trim().length > 0) {
        twiml.say(voiceSettings, 'Gracias por la información.');
        
        // Obtener el siguiente paso del flujo de la llamada
        const nextPrompt = botConfig?.followUpPrompt || 
          '¿Hay algo más que le gustaría añadir? Por favor, indique un número de contacto si desea que nos comuniquemos con usted.';
        
        const gather = twiml.gather({
          input: 'speech dtmf',
          timeout: '5',
          speechTimeout: 'auto',
          language: botConfig?.language || 'es-ES',
          action: '/webhooks/gather',
          method: 'POST'
        });
        
        gather.say(voiceSettings, nextPrompt);
      } else {
        // Si no se detectó entrada, volver a intentarlo
        const retryPrompt = botConfig?.retryPrompt || 
          'No he podido entenderle. Por favor, intente de nuevo.';
        
        const gather = twiml.gather({
          input: 'speech dtmf',
          timeout: '5',
          speechTimeout: 'auto',
          language: botConfig?.language || 'es-ES',
          action: '/webhooks/gather',
          method: 'POST'
        });
        
        gather.say(voiceSettings, retryPrompt);
      }
      
      // Si no hay respuesta después de los reintentos
      twiml.record({
        action: '/webhooks/recording',
        method: 'POST',
        maxLength: '120',
        playBeep: true,
        transcribe: false,
        timeout: 5
      });
      
      twiml.say(voiceSettings, botConfig?.goodbyeMessage || 
        'Gracias por contactar con nosotros. Su mensaje ha sido registrado y nos pondremos en contacto con usted lo antes posible.');
      twiml.hangup();
      
      return twiml;
    } catch (error) {
      logger.error(`Error generando Gather Response TwiML: ${error.message}`);
      return this.generateErrorTwiml('Lo sentimos, ha ocurrido un error en el sistema.');
    }
  }
  
  // Generar TwiML para errores
  generateErrorTwiml(message) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Conchita',
      language: 'es-ES'
    }, message || 'Ha ocurrido un error. Por favor, inténtelo de nuevo más tarde.');
    
    twiml.hangup();
    return twiml;
  }
  
  // Comprar nuevo número para un cliente
  async purchaseNumber(clientId, areaCode, capabilities) {
    try {
      // Buscar números disponibles
      const searchParams = {
        areaCode: areaCode || '34', // España por defecto
        capabilities: capabilities || { voice: true },
        limit: 1
      };
      
      const availableNumbers = await this.client.availablePhoneNumbers('ES')
                                               .local.list(searchParams);
      
      if (!availableNumbers || availableNumbers.length === 0) {
        throw new Error('No hay números disponibles con los criterios especificados');
      }
      
      // Comprar el primer número disponible
      const phoneNumberToBuy = availableNumbers[0].phoneNumber;
      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumberToBuy,
        friendlyName: `Cliente ${clientId}`,
        voiceUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/webhooks/call`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/webhooks/fallback`,
        voiceFallbackMethod: 'POST'
      });
      
      return {
        success: true,
        phoneNumber: purchasedNumber.phoneNumber,
        twilioSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName
      };
    } catch (error) {
      logger.error(`Error comprando número Twilio: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Configurar webhooks para un número existente
  async configureNumberWebhooks(twilioSid) {
    try {
      await this.client.incomingPhoneNumbers(twilioSid).update({
        voiceUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/webhooks/call`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/webhooks/fallback`,
        voiceFallbackMethod: 'POST'
      });
      
      return {
        success: true,
        message: 'Webhooks configurados correctamente'
      };
    } catch (error) {
      logger.error(`Error configurando webhooks: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Liberar un número (cuando un cliente cancela)
  async releaseNumber(twilioSid) {
    try {
      await this.client.incomingPhoneNumbers(twilioSid).remove();
      return {
        success: true,
        message: 'Número liberado correctamente'
      };
    } catch (error) {
      logger.error(`Error liberando número: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TwilioService();
