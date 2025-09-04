const twilio = require('twilio');
const logger = require('../utils/logger');
const AzureTTSService = require('./azureTTSService');
const azureTTSService = new AzureTTSService();
const { processUserMessage } = require('./aiConversationService');
const { makeTextNatural, getVoiceSettings } = require('./naturalPersonalityService');

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

  // Generar audio premium con Azure TTS (voces españolas)
  async generatePremiumAudio(text, botConfig) {
    try {
      // Verificar si Azure TTS está configurado
      const hasAzure = azureTTSService.isConfigured();
      
      logger.info(`🔍 DEBUG - Azure TTS configurado: ${hasAzure}`);
      
      if (hasAzure) {
        try {
          // Obtener voz preferida del usuario (por defecto: lola)
          const preferredVoice = botConfig?.voiceSettings?.azureVoice || 'lola';
          
          logger.info(`✅ Generando audio con Azure TTS (${preferredVoice} - español peninsular)...`);
          const result = await azureTTSService.generateBotResponse(text, preferredVoice);
          
          if (result.success) {
            logger.info('🎵 Audio Azure TTS generado exitosamente');
            return {
              success: true,
              audioUrl: result.audioUrl,
              provider: 'azure-tts',
              voice: preferredVoice,
              voiceInfo: result.voiceUsed,
              duration: result.durationEstimate
            };
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          logger.error(`Error generando audio Azure TTS: ${error.message}`);
          // Continuar con fallback a Polly
        }
      }
      
      // Fallback final: usar Polly (TwiML nativo)
      logger.info('🔊 Usando Polly como fallback para bienvenida');
      return null; // Esto hará que se use Polly en el TwiML
    } catch (error) {
      logger.error(`Error en generatePremiumAudio: ${error.message}`);
      return null;
    }
  }

  // Generar TwiML para dar la bienvenida al llamante
  async generateWelcomeTwiml(botConfig) {
    try {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      // Obtener mensaje de bienvenida de la configuración o usar uno predeterminado
      const welcomeMessage = botConfig?.greeting || botConfig?.welcomeMessage || 
        'Gracias por llamar. Por favor, indique su nombre y el motivo de su llamada.';
      
      // Configurar voiceSettings para Polly (siempre disponible como fallback)
      const voiceSettings = {
        voice: botConfig?.voice || 'Polly.Conchita',
        language: botConfig?.language || 'es-ES'
      };
      
      // Intentar generar audio premium primero
      const premiumAudioUrl = await this.generatePremiumAudio(welcomeMessage, botConfig);
      
      if (premiumAudioUrl) {
        // Usar audio premium de ElevenLabs
        twiml.play(premiumAudioUrl);
        logger.info('🎤 Usando voz premium de ElevenLabs para bienvenida');
      } else {
        // Fallback a Polly
        twiml.say(voiceSettings, welcomeMessage);
        logger.info('🔊 Usando Polly como fallback para bienvenida');
      }
      
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

  // ==========================================
  // SISTEMA DE IA NATURAL PARA LLAMADAS
  // ==========================================

  /**
   * Procesar llamada entrante con IA natural
   */
  async handleIncomingCallWithAI(clientId, callSid, from) {
    try {
      logger.info(`📞 Llamada entrante con IA - Cliente: ${clientId}, From: ${from}`);
      
      // Obtener configuración del cliente
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          companyName: true,
          businessHoursConfig: true,
          voiceSettings: true,
          greetingMessage: true
        }
      });
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      // Generar mensaje de bienvenida natural
      const greetingMessage = client.greetingMessage || 
        `Hola, has llamado a ${client.companyName || 'nuestra empresa'}. Soy tu asistente, ¿en qué puedo ayudarte?`;
      
      const naturalGreeting = makeTextNatural(greetingMessage, {
        sessionId: callSid,
        isGreeting: true
      });
      
      logger.info(`🎵 Mensaje de bienvenida natural: ${naturalGreeting}`);
      
      return {
        success: true,
        greeting: naturalGreeting,
        voiceSettings: getVoiceSettings(),
        clientConfig: client
      };
      
    } catch (error) {
      logger.error(`❌ Error procesando llamada con IA: ${error.message}`);
      return {
        success: false,
        error: error.message,
        greeting: "Hola, gracias por llamar. ¿En qué puedo ayudarte?",
        voiceSettings: getVoiceSettings()
      };
    }
  }

  /**
   * Procesar respuesta del usuario durante la llamada
   */
  async processCallResponse(clientId, callSid, userInput, context = {}) {
    try {
      logger.info(`🗣️ Procesando respuesta del usuario - Cliente: ${clientId}`);
      logger.info(`👤 Usuario dijo: ${userInput}`);
      
      // Procesar con IA natural
      const aiResult = await processUserMessage(clientId, callSid, userInput, context);
      
      if (!aiResult.success) {
        throw new Error(aiResult.error);
      }
      
      logger.info(`🤖 IA responde: ${aiResult.response}`);
      
      return {
        success: true,
        response: aiResult.response,
        voiceSettings: aiResult.voiceSettings,
        shouldContinue: !this.isEndingConversation(aiResult.response)
      };
      
    } catch (error) {
      logger.error(`❌ Error procesando respuesta: ${error.message}`);
      
      const fallbackResponse = makeTextNatural(
        "Disculpa, no he entendido bien. ¿Podrías repetir lo que necesitas?",
        { sessionId: callSid }
      );
      
      return {
        success: false,
        response: fallbackResponse,
        voiceSettings: getVoiceSettings(),
        shouldContinue: true,
        error: error.message
      };
    }
  }

  /**
   * Generar TwiML con IA natural y voz premium
   */
  async generateNaturalTwiML(clientId, message, context = {}) {
    try {
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Obtener configuración del cliente
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          voiceSettings: true,
          language: true
        }
      });
      
      const voiceConfig = client?.voiceSettings || {};
      const language = client?.language || 'es-ES';
      
      // Procesar mensaje con personalidad natural
      const naturalMessage = makeTextNatural(message, {
        sessionId: context.callSid,
        needsConsulting: context.needsConsulting || false
      });
      
      logger.info(`🎭 Mensaje natural generado: ${naturalMessage}`);
      
      // Generar audio premium con Azure TTS
      const audioResult = await this.generatePremiumAudio(naturalMessage, {
        voiceSettings: voiceConfig,
        language: language
      });
      
      if (audioResult.success) {
        // Usar audio premium
        twiml.play(audioResult.audioUrl);
        logger.info(`🎵 Usando audio premium: ${audioResult.provider}`);
      } else {
        // Fallback a Polly con configuración natural
        const voiceSettings = getVoiceSettings();
        twiml.say({
          voice: this.getPollyVoiceForLanguage(language),
          language: language,
          rate: voiceSettings.rate
        }, naturalMessage);
        logger.info(`🔄 Fallback a Polly con configuración natural`);
      }
      
      // Continuar conversación si es necesario
      if (context.shouldContinue !== false) {
        twiml.gather({
          input: 'speech',
          language: language,
          speechTimeout: 3,
          timeout: 10,
          action: `/webhooks/call/response/${clientId}`,
          method: 'POST'
        });
      } else {
        twiml.hangup();
      }
      
      return twiml;
      
    } catch (error) {
      logger.error(`❌ Error generando TwiML natural: ${error.message}`);
      return this.generateErrorTwiML(message);
    }
  }

  /**
   * Determinar si la conversación debería terminar
   */
  isEndingConversation(response) {
    const endingKeywords = [
      'adiós', 'hasta luego', 'gracias por llamar', 'que tengas buen día',
      'nos vemos', 'hasta pronto', 'fin de la llamada', 'colgar'
    ];
    
    const lowerResponse = response.toLowerCase();
    return endingKeywords.some(keyword => lowerResponse.includes(keyword));
  }

  /**
   * Obtener voz de Polly según el idioma
   */
  getPollyVoiceForLanguage(language) {
    const voiceMap = {
      'es-ES': 'Polly.Conchita',
      'en-US': 'Polly.Joanna',
      'fr-FR': 'Polly.Celine',
      'de-DE': 'Polly.Marlene'
    };
    
    return voiceMap[language] || 'Polly.Conchita';
  }
}

module.exports = new TwilioService();
