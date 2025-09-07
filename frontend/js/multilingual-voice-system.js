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
 * Voces recomendadas por idioma y género
 */
const voicesByLanguage = {
    'es-ES': {
        male: ['es-ES-DarioNeural'],
        female: ['en-US-LolaMultilingualNeural'],
        all: ['es-ES-DarioNeural', 'en-US-LolaMultilingualNeural']
    },
    'en-US': {
        male: ['en-US-GuyNeural', 'en-US-DavisNeural', 'en-US-JasonNeural'],
        female: ['en-US-JennyNeural', 'en-US-AriaNeural', 'en-US-SaraNeural'],
        all: ['en-US-GuyNeural', 'en-US-JennyNeural', 'en-US-AriaNeural', 'en-US-DavisNeural', 'en-US-SaraNeural']
    },
    'fr-FR': {
        male: ['fr-FR-HenriNeural', 'fr-FR-AlainNeural', 'fr-FR-ClaudeNeural'],
        female: ['fr-FR-DeniseNeural', 'fr-FR-BrigitteNeural', 'fr-FR-CoralieNeural'],
        all: ['fr-FR-HenriNeural', 'fr-FR-DeniseNeural', 'fr-FR-BrigitteNeural', 'fr-FR-AlainNeural']
    },
    'de-DE': {
        male: ['de-DE-ConradNeural', 'de-DE-BerndNeural', 'de-DE-KlausNeural'],
        female: ['de-DE-KatjaNeural', 'de-DE-AmalaNeural', 'de-DE-GiselaNeural'],
        all: ['de-DE-ConradNeural', 'de-DE-KatjaNeural', 'de-DE-AmalaNeural', 'de-DE-BerndNeural']
    }
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
    
    // Recargar voces para el idioma seleccionado y seleccionar automáticamente una compatible
    loadVoicesForLanguage(selectedLanguage);
    
    console.log('✅ Idioma cambiado exitosamente a:', selectedLanguage);
    
    // Mostrar mensaje informativo al usuario
    showLanguageChangeNotification(selectedLanguage);
}

/**
 * Mostrar notificación de cambio de idioma
 */
function showLanguageChangeNotification(language) {
    const languageNames = {
        'es-ES': 'Español',
        'en-US': 'Inglés',
        'fr-FR': 'Francés', 
        'de-DE': 'Alemán'
    };
    
    const languageName = languageNames[language] || language;
    
    // Obtener información de la voz seleccionada
    const voiceSelect = document.getElementById('azureVoiceSelect');
    const selectedVoice = voiceSelect?.value || '';
    const gender = detectVoiceGender(selectedVoice);
    const genderEmoji = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '🎤';
    
    console.log(`🎯 CAMBIO COMPLETO: Idioma → ${languageName}, Voz → ${genderEmoji} ${gender === 'male' ? 'Masculina' : gender === 'female' ? 'Femenina' : 'Compatible'} automáticamente`);
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
 * Detectar género de una voz
 */
function detectVoiceGender(voiceName) {
    const maleVoices = [
        'Dario', 'Alvaro', 'Manuel', 'Guy', 'Davis', 'Jason', 
        'Henri', 'Alain', 'Claude', 'Conrad', 'Bernd', 'Klaus'
    ];
    
    const femaleVoices = [
        'Elvira', 'Adriana', 'Laia', 'Jenny', 'Aria', 'Sara',
        'Denise', 'Brigitte', 'Coralie', 'Katja', 'Amala', 'Gisela'
    ];
    
    // Extraer el nombre base de la voz (ej: "es-ES-DarioNeural" -> "Dario")
    const baseName = voiceName.split('-').pop().replace('Neural', '');
    
    if (maleVoices.includes(baseName)) {
        return 'male';
    } else if (femaleVoices.includes(baseName)) {
        return 'female';
    }
    
    return 'unknown';
}

/**
 * Obtener voz recomendada manteniendo el género
 */
function getRecommendedVoiceForLanguage(language, currentVoice = null) {
    const languageVoices = voicesByLanguage[language];
    if (!languageVoices) return null;
    
    // Si no hay voz actual, usar la primera voz masculina por defecto
    if (!currentVoice) {
        return languageVoices.male[0] || languageVoices.all[0];
    }
    
    // Detectar género de la voz actual
    const currentGender = detectVoiceGender(currentVoice);
    console.log(`🎭 Voz actual: ${currentVoice} → Género: ${currentGender}`);
    
    // Seleccionar voz del mismo género
    if (currentGender === 'male' && languageVoices.male.length > 0) {
        return languageVoices.male[0];
    } else if (currentGender === 'female' && languageVoices.female.length > 0) {
        return languageVoices.female[0];
    }
    
    // Fallback: primera voz disponible
    return languageVoices.all[0];
}

/**
 * Cargar voces específicas para el idioma seleccionado
 */
async function loadVoicesForLanguage(language) {
    const voiceSelect = document.getElementById('azureVoiceSelect');
    if (!voiceSelect) return;
    
    console.log('🎤 Cargando voces para idioma:', language);
    
    // Obtener voz actual antes de cambiar
    const currentVoice = voiceSelect.value;
    
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
        
        // Seleccionar voz inteligente manteniendo el género
        const recommendedVoice = getRecommendedVoiceForLanguage(language, currentVoice);
        if (recommendedVoice) {
            // Buscar la opción exacta en el select
            const matchingOption = Array.from(voiceSelect.options).find(option => 
                option.value.includes(recommendedVoice)
            );
            
            if (matchingOption) {
                voiceSelect.value = matchingOption.value;
                console.log('🎤 Voz seleccionada manteniendo género:', matchingOption.value);
                
                // Disparar evento change para que otros sistemas se enteren del cambio
                const changeEvent = new Event('change', { bubbles: true });
                voiceSelect.dispatchEvent(changeEvent);
            }
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
        // Añadir event listener para cambios de idioma
        languageSelect.addEventListener('change', handleLanguageChange);
        console.log('🔗 Event listener añadido al selector de idioma');
        
        // Configurar idioma inicial
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
