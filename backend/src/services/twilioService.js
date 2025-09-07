const twilio = require('twilio');
const logger = require('../utils/logger');
const AzureTTSService = require('./azureTTSService');
const azureTTSService = new AzureTTSService();
const { processUserMessage } = require('./aiConversationService');
const { makeTextNatural, getVoiceSettings } = require('./naturalPersonalityService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Cache para respuestas de clientes (evita consultas repetidas)
const clientCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
    
    // PERSONALIDAD ULTRA-REALISTA GLOBAL (Común para todos los clientes)
    this.globalPersonality = {
      // NATURALIDAD POR IDIOMA
      naturalness: {
        // 🎭 PAUTAS DE NATURALIDAD POR IDIOMA (NO frases hardcodeadas)
        languageGuidelines: {
          'es-ES': {
            muletillas: "Usar muletillas españolas naturales como 'eh', 'bueno', 'pues', 'vale', 'a ver'",
            pausas: "Incluir pausas naturales, respiración y momentos de reflexión",
            transiciones: "Conectar ideas con 'entonces', 'bueno', 'por tanto', 'en ese caso'",
            confirmaciones: "Confirmar comprensión con 'sí', 'exacto', 'perfecto', 'entiendo'",
            rellenos: "Usar rellenos conversacionales como '¿sabes?', '¿vale?', '¿no?'"
          },
          'en-US': {
            muletillas: "Use natural English fillers like 'uh', 'um', 'well', 'so', 'like', 'you know'",
            pausas: "Include natural pauses, breathing and thinking moments",
            transiciones: "Connect ideas with 'so', 'well', 'therefore', 'in that case'",
            confirmaciones: "Confirm understanding with 'yes', 'exactly', 'perfect', 'I see'",
            rellenos: "Use conversational fillers like 'you know?', 'right?', 'okay?'"
          },
          'fr-FR': {
            muletillas: "Utiliser des hésitations françaises naturelles comme 'euh', 'bon', 'alors', 'voilà', 'donc'",
            pausas: "Inclure des pauses naturelles, respiration et moments de réflexion",
            transiciones: "Connecter les idées avec 'donc', 'alors', 'par conséquent', 'dans ce cas'",
            confirmaciones: "Confirmer la compréhension avec 'oui', 'exactement', 'parfait', 'je vois'",
            rellenos: "Utiliser des mots de remplissage comme 'vous voyez?', 'd'accord?', 'n'est-ce pas?'"
          }
        }
      },
      
      // 🎵 SONIDOS DE FONDO REALISTAS
      backgroundSounds: {
        enabled: true,
        officeAmbient: {
          keyboardTyping: ["*tecleo suave*", "*click de ratón*"],
          paperSounds: ["*hoja de papel*", "*escribiendo*"],
          phoneRings: ["*teléfono de fondo*"],
          voicesDistance: ["*voces lejanas*", "*conversación de fondo*"],
          chairSounds: ["*silla girando*"],
          probability: 0.15 // 15% probabilidad de añadir sonido
        },
        naturalBreathing: {
          enabled: true,
          sounds: ["*respira*", "*suspira ligeramente*"],
          probability: 0.25 // 25% probabilidad
        }
      },
      
      // 🎯 CONFIGURACIÓN DE VOZ POR DEFECTO
      voiceConfig: {
        azureVoice: 'es-ES-LolaNeural',
        language: 'es-ES',
        rate: '0.95', // Ligeramente más lento para naturalidad
        pitch: '0', // Tono neutro
        volume: '0' // Volumen neutro
      },
      
      // 🎭 CONFIGURACIÓN DE NATURALIDAD (Solo elementos técnicos, no frases)
      naturalnessProbabilities: {
        muletillas: 0.4,        // 40% probabilidad de añadir muletillas
        breathing: 0.25,        // 25% probabilidad de respiración
        transitions: 0.3,       // 30% probabilidad de transiciones
        fillers: 0.25,          // 25% probabilidad de rellenos
        backgroundSounds: 0.15  // 15% probabilidad de sonidos de fondo
      }
    };
  }

  /**
   * MÉTODO PRINCIPAL: Generar respuesta completa para llamada entrante
   */
  async generateCallResponse({ client, callerNumber, callSid }) {
    try {
      logger.info(`🎯 Generando respuesta para ${client.companyName} (${callSid})`);
      
      // 1. Obtener datos del cliente (con caché)
      const clientData = await this.getClientDataCached(client.id);
      
      // 2. Verificar horarios comerciales
      const isOpen = this.checkBusinessHours(clientData.businessHoursConfig);
      
      // 3. Generar saludo personalizado
      const greeting = this.generateNaturalGreeting(clientData, isOpen);
      
      // 4. Generar audio con Azure TTS
      const audioUrl = await this.generateAzureAudio(greeting, clientData);
      
      // 5. Crear TwiML optimizado
      const twiml = this.createOptimizedTwiML(audioUrl, greeting, clientData);
      
      logger.info(`✅ Respuesta generada para ${client.companyName}: ${greeting.substring(0, 50)}...`);
      return twiml;
      
    } catch (error) {
      logger.error(`❌ Error generando respuesta: ${error.message}`);
      return this.generateErrorTwiML();
    }
  }

  /**
   * Procesar respuesta del usuario durante la llamada
   */
  async processUserResponse({ client, userInput, callSid }) {
    try {
      logger.info(`🎤 Procesando respuesta: "${userInput}" para ${client.companyName}`);
      
      // 1. Obtener datos completos del cliente (con contexto empresarial)
      const clientData = await this.getClientDataCached(client.id);
      
      // 2. Procesar con IA conversacional CON CONTEXTO EMPRESARIAL + PAUTAS DE COMPORTAMIENTO
      const aiResponse = await processUserMessage(
        client.id,           // clientId
        callSid,            // sessionId
        userInput,          // userMessage
        {                   // context
          context: 'phone_call',
        language: clientData.language || 'es-ES',
        
        // 🏢 CONTEXTO EMPRESARIAL COMPLETO PARA IA
        companyInfo: {
          name: clientData.companyName,
          description: clientData.companyDescription,
          industry: clientData.industry,
          phone: clientData.phone,
          address: clientData.address,
          website: clientData.website,
          businessHours: clientData.businessHoursConfig
        },
        faqs: clientData.faqs || [],
        contextFiles: clientData.contextFiles || [],
        botPersonality: clientData.botPersonality || 'profesional y amigable',
        
        // 🎭 PAUTAS DE COMPORTAMIENTO HUMANO (NO frases hardcodeadas)
        behaviorGuidelines: this.globalPersonality.behaviorGuidelines
        }
      );
      
      // 2. Hacer respuesta natural CON COMPORTAMIENTO HUMANO
      const naturalResponse = this.makeResponseNatural(aiResponse, clientData, userInput);
      
      // 3. Generar audio con Azure TTS
      const audioUrl = await this.generateAzureAudio(naturalResponse, client);
      
      // 4. Crear TwiML de continuación
      const twiml = this.createContinuationTwiML(audioUrl, naturalResponse, client);
      
      return twiml;
      
    } catch (error) {
      logger.error(`❌ Error procesando respuesta: ${error.message}`);
      return this.generateErrorTwiML('Disculpa, no he entendido bien. ¿Puedes repetir?');
    }
  }

  /**
   * Obtener datos del cliente con caché
   */
  async getClientDataCached(clientId) {
    const cacheKey = `client_${clientId}`;
    const cached = clientCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      logger.info(`📋 Usando datos cacheados para cliente ${clientId}`);
      return cached.data;
    }
    
    logger.info(`🔄 Obteniendo datos frescos para cliente ${clientId}`);
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        email: true,
        industry: true,
        businessHoursConfig: true,
        botName: true,
        botPersonality: true,
        welcomeMessage: true,
        language: true,
        // Configuración de voz personalizada
        emailConfig: true,  // Contiene voiceSettings
        
        // 🏢 CONTEXTO EMPRESARIAL COMPLETO
        companyDescription: true,  // Descripción de la empresa
        phone: true,              // Teléfono de contacto
        address: true,            // Dirección física
        website: true,            // Sitio web
        faqs: true,              // Preguntas frecuentes
        contextFiles: true       // Archivos de contexto/documentos
      }
    });
    
    // Guardar en caché
    clientCache.set(cacheKey, {
      data: clientData,
      timestamp: Date.now()
    });
    
    return clientData;
  }

  /**
   * Verificar horarios comerciales
   */
  checkBusinessHours(businessHoursConfig) {
    if (!businessHoursConfig || !businessHoursConfig.enabled) {
      return true; // Siempre abierto si no hay configuración
    }
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);
    
    const isWorkingDay = businessHoursConfig.workingDays && businessHoursConfig.workingDays[currentDay];
    const isWithinHours = currentTime >= businessHoursConfig.openingTime && 
                         currentTime <= businessHoursConfig.closingTime;
    
    return isWorkingDay && isWithinHours;
  }

  /**
   * 🎭 Generar saludo ULTRA-REALISTA usando datos de la base de datos
   */
  generateNaturalGreeting(clientData, isOpen) {
    let greeting;
    
    // 🎯 USAR EL welcomeMessage CONFIGURADO EN LA BD
    if (clientData.welcomeMessage) {
      logger.info(`🎭 Usando mensaje de bienvenida configurado: ${clientData.welcomeMessage}`);
      greeting = clientData.welcomeMessage;
    } else {
      // 🔄 FALLBACK: Generar saludo básico SIN frases hardcodeadas
      logger.warn(`⚠️ Cliente ${clientData.companyName} no tiene welcomeMessage configurado. Generando fallback simple.`);
      
      // Saludo simple sin muletillas hardcodeadas (la IA las añadirá según las pautas)
      greeting = `Hola, has llamado a ${clientData.companyName}. Soy tu asistente.`;
      
      if (isOpen) {
        greeting += ` ¿En qué puedo ayudarte?`;
      } else {
        greeting += " Ahora mismo estamos cerrados. ¿Quieres dejar algún mensaje?";
      }
    }
    
    // 🎵 APLICAR SOLO SONIDOS DE OFICINA (las pautas van a la IA)
    greeting = this.makeResponseNatural(greeting, clientData);
    
    return greeting;
  }

  /**
   * Generar audio con Azure TTS (optimizado) - CON RECONOCIMIENTO DINÁMICO
   */
  async generateAzureAudio(text, clientData) {
    try {
      // 🎯 RECONOCIMIENTO DINÁMICO DE VOZ POR USUARIO (SOLO LOLA Y DARIO)
      let requestedVoice = this.globalPersonality.voiceConfig.azureVoice; // Fallback
      let selectedLanguage = 'es-ES'; // Fallback
      
      // 1. Verificar configuración de voz del usuario
      if (clientData.emailConfig && clientData.emailConfig.voiceSettings) {
        const voiceSettings = clientData.emailConfig.voiceSettings;
        
        if (voiceSettings.azureVoice) {
          requestedVoice = voiceSettings.azureVoice;
          logger.info(`🎭 Voz solicitada por el usuario: ${requestedVoice}`);
        }
        
        if (voiceSettings.language) {
          selectedLanguage = voiceSettings.language;
          logger.info(`🌍 Usando idioma personalizado del usuario: ${selectedLanguage}`);
        }
      }
      
      // 2. Verificar idioma del cliente (campo directo)
      if (clientData.language) {
        selectedLanguage = clientData.language;
        logger.info(`🌍 Usando idioma del cliente: ${selectedLanguage}`);
      }
      
      // 3. VALIDAR Y OBTENER VOZ PERMITIDA (SOLO LOLA Y DARIO)
      const selectedVoice = this.validateAndGetVoice(requestedVoice);
      logger.info(`✅ Voz validada y seleccionada: ${selectedVoice}`);
      
      logger.info(`🎯 CONFIGURACIÓN FINAL - Voz: ${selectedVoice}, Idioma: ${selectedLanguage}`);
      
      const result = await azureTTSService.generateBotResponse(text, selectedVoice);
      
      if (result.success) {
        logger.info(`✅ Audio Azure TTS generado: ${result.audioUrl}`);
        return result.audioUrl;
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      logger.error(`❌ Error Azure TTS: ${error.message}`);
      return null; // Fallback a Polly
    }
  }
  
  /**
   * Validar y obtener voz permitida (solo Lola o Dario)
   */
  validateAndGetVoice(requestedVoice) {
    const allowedVoices = {
      'lola': 'es-ES-LolaNeural',
      'dario': 'es-ES-DarioNeural',
      'es-ES-LolaNeural': 'es-ES-LolaNeural',
      'es-ES-DarioNeural': 'es-ES-DarioNeural'
    };
    
    // Normalizar entrada a minúsculas
    const normalizedVoice = requestedVoice?.toLowerCase();
    
    // Validar si la voz está permitida
    if (allowedVoices[normalizedVoice]) {
      return allowedVoices[normalizedVoice];
    }
    
    // Fallback por defecto: Lola
    logger.warn(`⚠️ Voz no permitida: ${requestedVoice}. Usando Lola por defecto.`);
    return 'es-ES-LolaNeural';
  }

  /**
   * Mapear idioma a voz Azure TTS apropiada (SOLO LOLA Y DARIO)
   */
  getAzureVoiceForLanguage(language) {
    // Solo permitimos Lola y Dario - por defecto Lola
    return 'es-ES-LolaNeural';
  }

  /**
   * Crear TwiML optimizado para respuesta inicial
   */
  createOptimizedTwiML(audioUrl, greeting, clientData) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    if (audioUrl) {
      // Usar Azure TTS
      twiml.play(audioUrl);
      logger.info('🎵 Usando Azure TTS para respuesta');
    } else {
      // Fallback a Polly
      twiml.say({
        voice: 'Polly.Conchita',
        language: 'es-ES'
      }, greeting);
      logger.info('🔄 Fallback a Polly');
    }
    
    // Recoger respuesta del usuario
    twiml.gather({
      input: 'speech',
      language: 'es-ES',
      speechTimeout: 5,
      timeout: 15,
      action: '/api/twilio/webhook/response',
      method: 'POST'
    });
    
    // Mensaje si no responde
    twiml.say({
      voice: 'Polly.Conchita',
      language: 'es-ES'
    }, 'Si necesitas algo más, puedes llamarnos en nuestro horario de atención. ¡Hasta pronto!');
    
    return twiml.toString();
  }

  /**
   * Crear TwiML para continuación de conversación
   */
  createContinuationTwiML(audioUrl, response, clientData) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    if (audioUrl) {
      twiml.play(audioUrl);
    } else {
      twiml.say({
        voice: 'Polly.Conchita',
        language: 'es-ES'
      }, response);
    }
    
    // Verificar si debe continuar la conversación
    if (!this.isEndingConversation(response)) {
      twiml.gather({
        input: 'speech',
        language: 'es-ES',
        speechTimeout: 5,
        timeout: 15,
        action: '/api/twilio/webhook/response',
        method: 'POST'
      });
      
      twiml.say({
        voice: 'Polly.Conchita',
        language: 'es-ES'
      }, '¿Hay algo más en lo que pueda ayudarte?');
    } else {
      twiml.hangup();
    }
    
    return twiml.toString();
  }

  /**
   * 🎭 APLICAR SOLO SONIDOS DE OFICINA (Las pautas ya están en el contexto de IA)
   */
  makeResponseNatural(aiResponse, clientData, userInput = '') {
    // 1. Detectar idioma del cliente
    const language = clientData.language || 'es-ES';
    
    logger.info(`🎭 Aplicando sonidos de oficina para idioma: ${language}`);
    logger.info(`🎭 Las pautas de comportamiento y naturalidad ya fueron enviadas a la IA`);
    
    // 2. Aplicar SOLO sonidos de oficina (NO muletillas - eso lo hace la IA)
    aiResponse = this.addNaturalness(aiResponse, clientData, language);
    
    // 3. Personalizar por empresa
    aiResponse = aiResponse.replace(/\[EMPRESA\]/g, clientData.companyName);
    
    logger.info(`🎵 Respuesta con sonidos de oficina: "${aiResponse.substring(0, 100)}..."`);
    
    return aiResponse;
  }
  
  /**
   * 🤖 Detectar si preguntan sobre IA
   */
  isAskingAboutAI(userInput) {
    const aiKeywords = [
      'inteligencia artificial', 'ia', 'ai', 'robot', 'bot', 'chatbot', 
      'artificial', 'máquina', 'algoritmo', 'eres una ia', 'eres un robot',
      'eres artificial', 'eres humano', 'persona real'
    ];
    
    const input = userInput.toLowerCase();
    return aiKeywords.some(keyword => input.includes(keyword));
  }
  
  /**
   * 🎯 Detectar si preguntan sobre objetivos/propósitos (NUNCA RESPONDER)
   */
  isAskingAboutObjective(userInput) {
    const objectiveKeywords = [
      'objetivo', 'propósito', 'para qué', 'por qué', 'cuál es tu función',
      'para que sirves', 'qué haces', 'tu trabajo', 'tu misión', 'creado para',
      'diseñado para', 'programado para', 'entrenado para'
    ];
    
    const input = userInput.toLowerCase();
    return objectiveKeywords.some(keyword => input.includes(keyword));
  }
  
  /**
   * 🔍 Detectar consulta compleja que requiere "búsqueda"
   */
  isComplexQuery(userInput) {
    const complexTriggers = this.globalPersonality.conversationPatterns.complexQuery.triggers;
    const input = userInput.toLowerCase();
    return complexTriggers.some(trigger => input.includes(trigger));
  }
  
  /**
   * ✅ Detectar respuesta directa (info básica)
   */
  isDirectResponse(userInput) {
    const directTriggers = this.globalPersonality.conversationPatterns.directResponse.triggers;
    const input = userInput.toLowerCase();
    return directTriggers.some(trigger => input.includes(trigger));
  }
  
  /**
   * 🎵 Añadir naturalidad usando SOLO sonidos de oficina (las pautas van a la IA)
   */
  addNaturalness(response, clientData, language) {
    const probabilities = this.globalPersonality.naturalnessProbabilities;
    
    // SOLO añadir sonidos de fondo de oficina (NO muletillas - eso lo hace la IA)
    if (this.globalPersonality.backgroundSounds.enabled && Math.random() < probabilities.backgroundSounds) {
      response = this.addBackgroundSounds(response, language);
    }
    
    // SOLO añadir pausas y respiración natural
    if (Math.random() < probabilities.breathing) {
      const breathSound = this.globalPersonality.backgroundSounds.naturalBreathing.sounds[
        Math.floor(Math.random() * this.globalPersonality.backgroundSounds.naturalBreathing.sounds.length)
      ];
      response = `${breathSound} ${response}`;
    }
    
    return response;
  }
  
  /**
   * 🎵 Añadir naturalidad básica (SIN sonidos de oficina) - Solo para negaciones de IA
   */
  addBasicNaturalness(response, naturalness, language) {
    // 🚫 NO añadir sonidos de oficina (tecleo, papel, etc.)
    
    // Añadir muletillas naturales por idioma
    if (Math.random() < 0.4) {
      const muletilla = naturalness.muletillas[Math.floor(Math.random() * naturalness.muletillas.length)];
      response = `${muletilla} ${response}`;
    }
    
    // Añadir pausas y respiración natural
    if (Math.random() < this.globalPersonality.backgroundSounds.naturalBreathing.probability) {
      const breathSound = this.globalPersonality.backgroundSounds.naturalBreathing.sounds[
        Math.floor(Math.random() * this.globalPersonality.backgroundSounds.naturalBreathing.sounds.length)
      ];
      response = `${breathSound} ${response}`;
    }
    
    // Añadir transiciones naturales
    if (response.includes('.') && Math.random() < 0.3) {
      const transicion = naturalness.transiciones[Math.floor(Math.random() * naturalness.transiciones.length)];
      response = response.replace('.', `, ${transicion},`);
    }
    
    // NO añadir rellenos en negaciones de IA (sería raro)
    
    return response;
  }
  
  /**
   * 🎵 Añadir sonidos de fondo de oficina realistas
   */
  addBackgroundSounds(response, language) {
    const { officeAmbient } = this.globalPersonality.backgroundSounds;
    
    // Probabilidad de añadir sonido de fondo
    if (Math.random() > officeAmbient.probability) {
      return response;
    }
    
    // Seleccionar tipo de sonido aleatorio
    const soundTypes = ['keyboardTyping', 'paperSounds', 'chairSounds'];
    const randomType = soundTypes[Math.floor(Math.random() * soundTypes.length)];
    const sounds = officeAmbient[randomType];
    const selectedSound = sounds[Math.floor(Math.random() * sounds.length)];
    
    // Posición aleatoria en la respuesta
    const words = response.split(' ');
    const insertPosition = Math.floor(Math.random() * words.length);
    
    words.splice(insertPosition, 0, selectedSound);
    
    logger.info(`🎵 Sonido de fondo añadido: ${selectedSound}`);
    
    return words.join(' ');
  }
  
  /**
   * 🎯 Obtener configuración de naturalidad por idioma
   */
  getNaturalnessForLanguage(language) {
    return this.globalPersonality.naturalness[language] || this.globalPersonality.naturalness['es-ES'];
  }

  /**
   * Limpiar caché de cliente (cuando se actualiza)
   */
  clearClientCache(clientId) {
    const cacheKey = `client_${clientId}`;
    clientCache.delete(cacheKey);
    logger.info(`🗑️ Caché limpiado para cliente ${clientId}`);
  }

  // Generar audio premium con Azure TTS (voces españolas)
  async generatePremiumAudio(text, botConfig) {
    try {
      // Verificar si Azure TTS está configurado
      const hasAzure = azureTTSService.isConfigured();
      
      logger.info(`🔍 DEBUG - Azure TTS configurado: ${hasAzure}`);
      
      if (hasAzure) {
        try {
          // Obtener y validar voz preferida del usuario (solo Lola o Dario)
          const requestedVoice = botConfig?.voiceSettings?.azureVoice || 'lola';
          const preferredVoice = this.validateAndGetVoice(requestedVoice);
          
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
        voiceUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/webhooks/call/natural/${clientId}`,
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
      const greetingMessage = client.callConfig?.greetingMessage || 
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
      
      // Añadir información del contexto de la llamada
      const enhancedContext = {
        ...context,
        from: context.from || context.phoneNumber,
        phoneNumber: context.from || context.phoneNumber
      };
      
      // Procesar con IA natural
      const aiResult = await processUserMessage(clientId, callSid, userInput, enhancedContext);
      
      if (!aiResult.success) {
        throw new Error(aiResult.error);
      }
      
      logger.info(`🤖 IA responde: ${aiResult.response}`);
      
      // Determinar si debe colgar automáticamente
      const shouldHangup = aiResult.shouldHangup || this.isEndingConversation(aiResult.response);
      
      if (shouldHangup) {
        logger.info(`📞 Despedida detectada - La llamada se colgará automáticamente`);
      }
      
      return {
        success: true,
        response: aiResult.response,
        voiceSettings: aiResult.voiceSettings,
        shouldContinue: !shouldHangup,
        shouldHangup: shouldHangup
      };
      
    } catch (error) {
      logger.error(`❌ Error procesando respuesta: ${error.message}`);
      
      const fallbackResponse = makeTextNatural(
        "Disculpa, no he entendido bien. ¿Podrías repetir lo que necesitas?",
        { sessionId: callSid, userInput: userInput }
      );
      
      return {
        success: false,
        response: fallbackResponse,
        voiceSettings: getVoiceSettings(),
        shouldContinue: true,
        shouldHangup: false,
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
          callConfig: true,
          language: true,
          companyName: true
        }
      });
      
      const voiceConfig = client?.callConfig?.voiceSettings || {};
      const language = client?.language || 'es-ES';
      
      // Procesar mensaje con personalidad natural
      const naturalMessage = makeTextNatural(message, {
        sessionId: context.callSid,
        needsConsulting: context.needsConsulting || false
      });
      
      logger.info(`🎭 Mensaje natural generado: ${naturalMessage}`);
      
      // FORZAR uso de Azure TTS - NO usar OpenAI
      logger.info(`🎵 FORZANDO uso de Azure TTS para voz natural española`);
      
      // Obtener voz preferida del usuario (por defecto: lola - voz femenina española)
      const requestedVoice = voiceConfig?.azureVoice || 'lola';
      const preferredVoice = this.validateAndGetVoice(requestedVoice);
      logger.info(`🎭 Usando voz Azure: ${preferredVoice}`);
      
      const audioResult = await this.generatePremiumAudio(naturalMessage, {
        voiceSettings: { azureVoice: preferredVoice },
        language: language
      });
      
      if (audioResult && audioResult.success) {
        // Usar audio premium de Azure TTS
        twiml.play(audioResult.audioUrl);
        logger.info(`🎵 ✅ Audio Azure TTS generado: ${audioResult.provider} - ${audioResult.voice}`);
      } else {
        // Fallback a Polly SOLO si Azure falla
        const voiceSettings = getVoiceSettings();
        twiml.say({
          voice: this.getPollyVoiceForLanguage(language),
          language: language,
          rate: voiceSettings.rate || '0.9'
        }, naturalMessage);
        logger.info(`🔄 Fallback a Polly (Azure no disponible)`);
      }
      
      // Continuar conversación - SIEMPRE activa para interacción natural
      twiml.gather({
        input: 'speech',
        language: language,
        speechTimeout: 5,        // Más tiempo para responder
        timeout: 15,             // Más tiempo total
        action: `/webhooks/call/response/${clientId}`,
        method: 'POST',
        finishOnKey: '#'         // Permitir terminar con #
      });
      
      // Mensaje si no responde
      twiml.say({
        voice: this.getPollyVoiceForLanguage(language),
        language: language
      }, 'Si necesitas algo más, puedes decírmelo. Estoy aquí para ayudarte.');
      
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

  /**
   * Generar TwiML de error para manejo de fallos
   */
  generateErrorTwiML(errorMessage = 'Lo siento, ha ocurrido un error técnico. Por favor, inténtalo de nuevo más tarde.') {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Mensaje de error con voz natural
    twiml.say({
      voice: 'Polly.Conchita',
      language: 'es-ES'
    }, errorMessage);
    
    // Colgar después del mensaje
    twiml.hangup();
    
    logger.info(`🚨 TwiML de error generado: ${errorMessage}`);
    return twiml.toString();
  }
}

module.exports = new TwilioService();
