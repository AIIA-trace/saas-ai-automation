// ==========================================
// SISTEMA MULTIIDIOMA PARA VOCES
// ==========================================

/**
 * Textos de prueba en múltiples idiomas
 */
const multilingualTexts = {
    'es-ES': {
        testText: 'Hola, ha llamado a Tech Solutions. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?',
        greeting: 'Hola, ha llamado a Tech Solutions. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?',
        voiceDescription: 'Voces españolas con ceceo peninsular auténtico'
    },
    'en-US': {
        testText: 'Hello, you have reached Tech Solutions. I am the virtual assistant, how can I help you today?',
        greeting: 'Hello, you have reached Tech Solutions. I am the virtual assistant, how can I help you today?',
        voiceDescription: 'American English voices with natural pronunciation'
    },
    'fr-FR': {
        testText: 'Bonjour, vous avez contacté Tech Solutions. Je suis l\'assistant virtuel, comment puis-je vous aider aujourd\'hui?',
        greeting: 'Bonjour, vous avez contacté Tech Solutions. Je suis l\'assistant virtuel, comment puis-je vous aider aujourd\'hui?',
        voiceDescription: 'Voix françaises avec prononciation naturelle'
    },
    'de-DE': {
        testText: 'Hallo, Sie haben Tech Solutions erreicht. Ich bin der virtuelle Assistent, wie kann ich Ihnen heute helfen?',
        greeting: 'Hallo, Sie haben Tech Solutions erreicht. Ich bin der virtuelle Assistent, wie kann ich Ihnen heute helfen?',
        voiceDescription: 'Deutsche Stimmen mit natürlicher Aussprache'
    }
};

/**
 * Voces recomendadas por idioma
 */
const voicesByLanguage = {
    'es-ES': ['es-ES-AlvaroNeural', 'es-ES-ElviraNeural', 'es-ES-ManuelNeural', 'es-ES-AdrianaNeural'],
    'en-US': ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural', 'en-US-DavisNeural'],
    'fr-FR': ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural', 'fr-FR-BrigitteNeural', 'fr-FR-AlainNeural'],
    'de-DE': ['de-DE-KatjaNeural', 'de-DE-ConradNeural', 'de-DE-AmalaNeural', 'de-DE-BerndNeural']
};

/**
 * Manejar cambio de idioma
 */
function handleLanguageChange() {
    const languageSelect = document.getElementById('call_language');
    const selectedLanguage = languageSelect.value;
    
    console.log('🌍 Cambiando idioma a:', selectedLanguage);
    
    // Actualizar texto de saludo
    updateGreetingText(selectedLanguage);
    
    // Actualizar descripción de voces
    updateVoiceDescription(selectedLanguage);
    
    // Recargar voces para el idioma seleccionado
    loadVoicesForLanguage(selectedLanguage);
    
    console.log('✅ Idioma cambiado exitosamente a:', selectedLanguage);
}

/**
 * Actualizar texto de saludo según el idioma
 */
function updateGreetingText(language) {
    const greetingTextarea = document.getElementById('call_greeting');
    if (greetingTextarea && multilingualTexts[language]) {
        greetingTextarea.value = multilingualTexts[language].greeting;
        console.log('📝 Texto de saludo actualizado para:', language);
    }
}

/**
 * Actualizar descripción de voces según el idioma
 */
function updateVoiceDescription(language) {
    const voiceDescription = document.querySelector('#azureVoiceSelect + .form-text');
    if (voiceDescription && multilingualTexts[language]) {
        voiceDescription.textContent = multilingualTexts[language].voiceDescription;
        console.log('📄 Descripción de voces actualizada para:', language);
    }
}

/**
 * Cargar voces específicas para el idioma seleccionado
 */
async function loadVoicesForLanguage(language) {
    const voiceSelect = document.getElementById('azureVoiceSelect');
    if (!voiceSelect) return;
    
    console.log('🎤 Cargando voces para idioma:', language);
    
    // Mostrar estado de carga
    voiceSelect.innerHTML = '<option value="">Cargando voces...</option>';
    
    try {
        // Cargar todas las voces disponibles
        if (typeof loadAzureVoices === 'function') {
            await loadAzureVoices();
        }
        
        // Filtrar y priorizar voces del idioma seleccionado
        const allOptions = Array.from(voiceSelect.options);
        const languageVoices = [];
        const otherVoices = [];
        
        allOptions.forEach(option => {
            if (option.value && option.value.startsWith(language.substring(0, 5))) {
                languageVoices.push(option);
            } else if (option.value) {
                otherVoices.push(option);
            }
        });
        
        // Limpiar select
        voiceSelect.innerHTML = '<option value="">Seleccionar voz...</option>';
        
        // Añadir voces del idioma seleccionado primero
        if (languageVoices.length > 0) {
            const languageGroup = document.createElement('optgroup');
            languageGroup.label = `Voces recomendadas (${language})`;
            languageVoices.forEach(option => {
                languageGroup.appendChild(option.cloneNode(true));
            });
            voiceSelect.appendChild(languageGroup);
        }
        
        // Añadir otras voces
        if (otherVoices.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Otras voces disponibles';
            otherVoices.forEach(option => {
                otherGroup.appendChild(option.cloneNode(true));
            });
            voiceSelect.appendChild(otherGroup);
        }
        
        // Seleccionar automáticamente la primera voz del idioma si está disponible
        if (languageVoices.length > 0) {
            voiceSelect.value = languageVoices[0].value;
        }
        
        console.log('✅ Voces cargadas para idioma:', language, `(${languageVoices.length} específicas, ${otherVoices.length} otras)`);
        
    } catch (error) {
        console.error('❌ Error cargando voces para idioma:', language, error);
        voiceSelect.innerHTML = '<option value="">Error cargando voces</option>';
    }
}

/**
 * Obtener texto de prueba para el idioma actual
 */
function getTestTextForCurrentLanguage() {
    const languageSelect = document.getElementById('call_language');
    const selectedLanguage = languageSelect ? languageSelect.value : 'es-ES';
    
    return multilingualTexts[selectedLanguage]?.testText || multilingualTexts['es-ES'].testText;
}

/**
 * Actualizar función de prueba de voz para usar texto multiidioma
 */
function updateTestVoiceFunction() {
    // Sobrescribir la función testAzureVoice para usar texto multiidioma
    if (typeof window.testAzureVoice === 'function') {
        const originalTestAzureVoice = window.testAzureVoice;
        
        window.testAzureVoice = async function() {
            const testText = getTestTextForCurrentLanguage();
            console.log('🎵 Probando voz con texto multiidioma:', testText);
            
            // Llamar a la función original pero con el texto en el idioma correcto
            return originalTestAzureVoice.call(this, testText);
        };
    }
}

/**
 * Inicializar sistema multiidioma
 */
function initMultilingualVoiceSystem() {
    console.log('🌍 Inicializando sistema multiidioma de voces...');
    
    // Configurar idioma inicial
    const languageSelect = document.getElementById('call_language');
    if (languageSelect) {
        const initialLanguage = languageSelect.value || 'es-ES';
        handleLanguageChange();
    }
    
    // Actualizar función de prueba de voz
    updateTestVoiceFunction();
    
    console.log('✅ Sistema multiidioma de voces inicializado');
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que se carguen otros scripts
    setTimeout(() => {
        initMultilingualVoiceSystem();
    }, 2000);
});
