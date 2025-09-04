// ==========================================
// SERVICIO DE CONVERSACIÓN IA CON PERSONALIDAD NATURAL
// ==========================================

const { makeTextNatural, generateSystemPrompt, getVoiceSettings } = require('./naturalPersonalityService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Historial de conversaciones por sesión
 */
const conversationHistory = new Map();

/**
 * Procesar mensaje de usuario y generar respuesta natural
 */
async function processUserMessage(clientId, sessionId, userMessage, context = {}) {
    try {
        console.log(`🤖 Procesando mensaje para cliente ${clientId}:`, userMessage);
        
        // 1. Obtener datos del cliente
        const clientData = await getClientData(clientId);
        if (!clientData) {
            throw new Error('Cliente no encontrado');
        }
        
        // 2. Obtener o crear historial de conversación
        const conversationKey = `${clientId}_${sessionId}`;
        if (!conversationHistory.has(conversationKey)) {
            conversationHistory.set(conversationKey, []);
        }
        const history = conversationHistory.get(conversationKey);
        
        // 3. Generar prompt del sistema con personalidad natural
        const systemPrompt = generateSystemPrompt(clientData);
        
        // 4. Preparar contexto de conversación
        const conversationContext = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userMessage }
        ];
        
        // 5. Llamar a la IA (OpenAI GPT)
        const aiResponse = await callOpenAI(conversationContext);
        
        // 6. Procesar respuesta para hacerla más natural
        const naturalResponse = makeTextNatural(aiResponse, {
            sessionId: sessionId,
            needsConsulting: shouldSimulateConsulting(userMessage),
            clientData: clientData
        });
        
        // 7. Actualizar historial
        history.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: naturalResponse }
        );
        
        // 8. Limitar historial a últimas 10 interacciones
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        
        // 9. Registrar conversación en base de datos
        await logConversation(clientId, sessionId, userMessage, naturalResponse);
        
        console.log(`✅ Respuesta generada para cliente ${clientId}:`, naturalResponse);
        
        return {
            response: naturalResponse,
            voiceSettings: getVoiceSettings(),
            success: true
        };
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        
        // Respuesta de fallback natural
        const fallbackResponse = makeTextNatural(
            "Disculpa, no he podido procesar bien lo que me has dicho. ¿Podrías repetirlo?",
            { sessionId: sessionId }
        );
        
        return {
            response: fallbackResponse,
            voiceSettings: getVoiceSettings(),
            success: false,
            error: error.message
        };
    }
}

/**
 * Obtener datos del cliente desde la base de datos
 */
async function getClientData(clientId) {
    try {
        const client = await prisma.client.findUnique({
            where: { id: parseInt(clientId) },
            select: {
                companyName: true,
                businessHoursConfig: true,
                contextFiles: true,
                faqs: true,
                email: true,
                phone: true,
                website: true,
                description: true
            }
        });
        
        if (!client) {
            return null;
        }
        
        // Construir información de contexto
        let contextInfo = `Empresa: ${client.companyName || 'No especificada'}\n`;
        
        if (client.description) {
            contextInfo += `Descripción: ${client.description}\n`;
        }
        
        if (client.phone) {
            contextInfo += `Teléfono: ${client.phone}\n`;
        }
        
        if (client.email) {
            contextInfo += `Email: ${client.email}\n`;
        }
        
        if (client.website) {
            contextInfo += `Web: ${client.website}\n`;
        }
        
        // Añadir FAQs si existen
        if (client.faqs && client.faqs.length > 0) {
            contextInfo += `\nPREGUNTAS FRECUENTES:\n`;
            client.faqs.forEach((faq, index) => {
                contextInfo += `${index + 1}. ${faq.question}\n   ${faq.answer}\n`;
            });
        }
        
        // Procesar horarios comerciales
        let businessHours = 'Consultar disponibilidad';
        if (client.businessHoursConfig && client.businessHoursConfig.workingDays) {
            const days = Object.keys(client.businessHoursConfig.workingDays)
                .filter(day => client.businessHoursConfig.workingDays[day])
                .join(', ');
            const hours = client.businessHoursConfig.workingHours || 'Consultar horarios';
            businessHours = `${days}: ${hours}`;
        }
        
        return {
            ...client,
            contextInfo,
            businessHours
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo datos del cliente:', error);
        return null;
    }
}

/**
 * Llamar a OpenAI GPT para generar respuesta
 */
async function callOpenAI(messages) {
    // Aquí integrarías con OpenAI API
    // Por ahora simulamos una respuesta
    
    const userMessage = messages[messages.length - 1].content.toLowerCase();
    
    // Respuestas simuladas inteligentes
    if (userMessage.includes('horario') || userMessage.includes('abierto')) {
        return "Nuestros horarios son de lunes a viernes de 9:00 a 18:00. Los fines de semana estamos cerrados.";
    }
    
    if (userMessage.includes('precio') || userMessage.includes('cuesta') || userMessage.includes('coste')) {
        return "Los precios dependen del servicio que necesites. Te puedo pasar con un comercial para que te haga un presupuesto personalizado.";
    }
    
    if (userMessage.includes('contacto') || userMessage.includes('hablar') || userMessage.includes('reunión')) {
        return "Perfecto, puedo apuntar tus datos y que te llamen para concertar una reunión. ¿Me das tu nombre y teléfono?";
    }
    
    if (userMessage.includes('servicio') || userMessage.includes('qué hacéis') || userMessage.includes('ofrecéis')) {
        return "Somos una empresa especializada en soluciones tecnológicas. Ofrecemos desarrollo de software, consultoría IT y automatización de procesos.";
    }
    
    // Respuesta genérica
    return "Entiendo lo que me comentas. ¿En qué más puedo ayudarte? Si necesitas información más específica, puedo apuntar tus datos para que te contacten.";
}

/**
 * Determinar si debería simular consulta
 */
function shouldSimulateConsulting(message) {
    const consultingKeywords = [
        'precio', 'coste', 'disponibilidad', 'stock', 'consultar',
        'revisar', 'comprobar', 'verificar', 'mirar', 'buscar'
    ];
    
    const lowerMessage = message.toLowerCase();
    return consultingKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Registrar conversación en base de datos
 */
async function logConversation(clientId, sessionId, userMessage, aiResponse) {
    try {
        // Aquí registrarías en una tabla de conversaciones
        // Por ahora solo loggeamos en consola
        console.log(`📝 Conversación registrada - Cliente: ${clientId}, Sesión: ${sessionId}`);
        console.log(`👤 Usuario: ${userMessage}`);
        console.log(`🤖 IA: ${aiResponse}`);
        
    } catch (error) {
        console.error('❌ Error registrando conversación:', error);
    }
}

/**
 * Limpiar historial de conversación antigua (llamar periódicamente)
 */
function cleanupOldConversations() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutos
    
    for (const [key, history] of conversationHistory.entries()) {
        if (history.lastActivity && (now - history.lastActivity) > maxAge) {
            conversationHistory.delete(key);
            console.log(`🧹 Limpiado historial de conversación: ${key}`);
        }
    }
}

// Limpiar conversaciones cada 15 minutos
setInterval(cleanupOldConversations, 15 * 60 * 1000);

module.exports = {
    processUserMessage,
    getClientData,
    cleanupOldConversations
};
