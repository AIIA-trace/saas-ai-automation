const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Helper para obtener contexto completo del cliente desde la base de datos
 * Usado por servicios de IA (emails, llamadas, etc.)
 */

/**
 * Formatea horarios de atención para el prompt
 */
function formatBusinessHours(businessHours) {
  if (!businessHours || !businessHours.enabled) {
    return 'Horario de oficina estándar (9:00 - 18:00, lunes a viernes)';
  }
  
  const days = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  
  const workingDaysObj = businessHours.workingDays || {};
  const workingDays = Object.entries(workingDaysObj)
    .filter(([_, isWorking]) => isWorking)
    .map(([day, _]) => days[day])
    .join(', ');
  
  if (!workingDays) {
    return 'Horario de oficina estándar (9:00 - 18:00, lunes a viernes)';
  }
  
  return `${workingDays}: ${businessHours.openingTime || '09:00'} - ${businessHours.closingTime || '18:00'}`;
}

/**
 * Formatea FAQs para el prompt
 */
function formatFAQs(faqs) {
  if (!faqs || faqs.length === 0) {
    return '';
  }
  
  return faqs.map((faq, index) => 
    `${index + 1}. Pregunta: ${faq.question}\n   Respuesta: ${faq.answer}`
  ).join('\n\n');
}

/**
 * Formatea archivos de contexto para el prompt
 */
function formatContextFiles(contextFiles) {
  if (!contextFiles || contextFiles.length === 0) {
    return '';
  }
  
  return contextFiles.map((file, index) => {
    if (file.content && typeof file.content === 'string') {
      const content = file.content.length > 2000 
        ? file.content.substring(0, 2000) + '...' 
        : file.content;
      return `${index + 1}. ${file.name}:\n${content}`;
    }
    return `${index + 1}. ${file.name} (${file.type || 'documento'})`;
  }).join('\n\n');
}

/**
 * Obtener contexto completo del cliente desde la base de datos
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Object>} Contexto del cliente
 */
async function getClientContext(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        contactName: true,        // Cambio: name → contactName
        companyName: true,         // Cambio: company → companyName
        companyDescription: true,  // Agregado
        email: true,
        phone: true,
        website: true,
        industry: true,            // Agregado
        companyInfo: true,
        businessHours: true,
        faqs: true,
        contextFiles: true,
        emailConfig: true          // Cambio: emailSignature → emailConfig (contiene signature)
      }
    });

    if (!client) {
      logger.warn(`⚠️ Cliente ${clientId} no encontrado`);
      return {
        companyName: 'nuestra empresa',
        userName: 'el equipo',
        companyDescription: '',
        businessHours: '',
        faqs: '',
        contextFiles: '',
        contactInfo: {}
      };
    }

    // Extraer información de la empresa
    const companyInfo = client.companyInfo || {};
    const companyName = client.companyName || companyInfo.name || 'nuestra empresa';
    const userName = client.contactName || 'el equipo';
    const companyDescription = client.companyDescription || companyInfo.description || '';
    const industry = client.industry || companyInfo.industry || '';
    const services = companyInfo.services || [];

    // Formatear horarios
    const businessHours = formatBusinessHours(client.businessHours);

    // Formatear FAQs
    const faqs = formatFAQs(client.faqs);

    // Formatear archivos de contexto
    const contextFiles = formatContextFiles(client.contextFiles);

    // Información de contacto
    const contactInfo = {
      email: client.email,
      phone: client.phone,
      website: client.website
    };

    // Obtener firma desde emailConfig
    const emailConfig = client.emailConfig || {};
    const emailSignature = emailConfig.signature || '';

    return {
      companyName,
      userName,
      companyDescription,
      industry,
      services,
      businessHours,
      faqs,
      contextFiles,
      contactInfo,
      emailSignature
    };

  } catch (error) {
    logger.error(`❌ Error obteniendo contexto del cliente ${clientId}:`, error);
    return {
      companyName: 'nuestra empresa',
      userName: 'el equipo',
      companyDescription: '',
      businessHours: '',
      faqs: '',
      contextFiles: '',
      contactInfo: {}
    };
  }
}

/**
 * Construir prompt del sistema con contexto de la empresa
 * @param {Object} context - Contexto del cliente
 * @param {string} purpose - Propósito (email, call, etc.)
 * @returns {string} Prompt del sistema
 */
function buildSystemPrompt(context, purpose = 'email') {
  const { companyName, userName, companyDescription, industry, services, businessHours, faqs, contextFiles, contactInfo } = context;

  let prompt = `Eres un asistente profesional de ${companyName}.`;
  
  if (companyDescription) {
    prompt += `\n\nSOBRE LA EMPRESA:\n${companyDescription}`;
  }

  if (industry) {
    prompt += `\n\nINDUSTRIA: ${industry}`;
  }

  if (services && services.length > 0) {
    prompt += `\n\nSERVICIOS:\n${services.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }

  if (businessHours) {
    prompt += `\n\nHORARIO DE ATENCIÓN:\n${businessHours}`;
  }

  if (faqs) {
    prompt += `\n\nPREGUNTAS FRECUENTES:\n${faqs}`;
  }

  if (contextFiles) {
    prompt += `\n\nDOCUMENTACIÓN ADICIONAL:\n${contextFiles}`;
  }

  if (contactInfo.email || contactInfo.phone || contactInfo.website) {
    prompt += `\n\nINFORMACIÓN DE CONTACTO:`;
    if (contactInfo.email) prompt += `\nEmail: ${contactInfo.email}`;
    if (contactInfo.phone) prompt += `\nTeléfono: ${contactInfo.phone}`;
    if (contactInfo.website) prompt += `\nWeb: ${contactInfo.website}`;
  }

  if (purpose === 'email') {
    prompt += `\n\nTU MISIÓN AL RESPONDER EMAILS:
- Mantener un tono profesional pero cercano
- Responder de manera clara y concisa
- Usar la información de la empresa proporcionada
- Si no tienes información suficiente, sugerir contactar directamente
- Mantener el mismo idioma del email original
- NO incluyas saludos de cierre como "Atentamente" o firmas (se agregarán automáticamente)`;
  }

  return prompt;
}

module.exports = {
  getClientContext,
  buildSystemPrompt,
  formatBusinessHours,
  formatFAQs,
  formatContextFiles
};
