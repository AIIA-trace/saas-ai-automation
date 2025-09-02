/**
 * Bot Configuration Manager
 * Maneja la configuración del bot de forma limpia y directa
 * Comunica directamente con la API unificada /api/client
 */

class BotConfigManager {
    constructor() {
        this.apiBaseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
        this.authService = window.authService;
        this.init();
    }

    init() {
        console.log('🤖 Inicializando Bot Configuration Manager...');
        this.bindEvents();
        this.loadAzureVoices();
        this.loadCurrentConfig();
    }

    bindEvents() {
        // Evento para cargar configuración
        document.getElementById('loadConfigBtn').addEventListener('click', () => {
            this.loadCurrentConfig();
        });

        // Evento para guardar configuración
        document.getElementById('botConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        // Eventos para Azure TTS
        document.getElementById('testVoiceBtn').addEventListener('click', () => {
            this.testSelectedVoice();
        });

        // Validación en tiempo real
        this.setupValidation();
    }

    setupValidation() {
        // Validar nombre del bot
        const botNameInput = document.getElementById('botName');
        botNameInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 50) {
                this.showFieldError(botNameInput, 'El nombre no puede exceder 50 caracteres');
            } else {
                this.clearFieldError(botNameInput);
            }
        });

        // Validar mensajes
        const welcomeMessage = document.getElementById('welcomeMessage');
        welcomeMessage.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 500) {
                this.showFieldError(welcomeMessage, 'El mensaje no puede exceder 500 caracteres');
            } else {
                this.clearFieldError(welcomeMessage);
            }
        });

        const confirmationMessage = document.getElementById('confirmationMessage');
        confirmationMessage.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 300) {
                this.showFieldError(confirmationMessage, 'El mensaje no puede exceder 300 caracteres');
            } else {
                this.clearFieldError(confirmationMessage);
            }
        });
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            field.parentNode.appendChild(feedback);
        }
        feedback.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    async loadCurrentConfig() {
        try {
            console.log('📥 Cargando configuración actual del bot...');
            
            if (!this.authService.isAuthenticated()) {
                throw new Error('Usuario no autenticado');
            }

            const token = this.authService.getToken();
            const response = await fetch(`${this.apiBaseUrl}/api/client`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error al cargar configuración: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('✅ Respuesta completa del cliente:', responseData);
        
            // Extraer datos del cliente - el endpoint /api/client devuelve {success: true, data: {...}}
            const clientData = responseData.data || responseData;
            console.log('✅ Datos del cliente extraídos:', clientData);

            // Rellenar formulario con datos actuales
            this.populateForm(clientData);
            
            toastr.success('Configuración cargada correctamente');

        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            toastr.error('Error al cargar la configuración: ' + error.message);
        }
    }

    populateForm(data) {
        // Los datos vienen en la estructura data.bot.{campo} desde el backend
        const botData = data.bot || data;
        
        // Información básica del bot
        if (botData.name || data.botName) {
            document.getElementById('botName').value = botData.name || data.botName;
        }
        
        if (botData.language || data.botLanguage) {
            document.getElementById('botLanguage').value = botData.language || data.botLanguage;
        }
        
        if (botData.personality || data.botPersonality) {
            document.getElementById('botPersonality').value = botData.personality || data.botPersonality;
        }

        // Mensajes
        if (botData.welcomeMessage || data.welcomeMessage) {
            document.getElementById('welcomeMessage').value = botData.welcomeMessage || data.welcomeMessage;
        }
        
        if (botData.confirmationMessage || data.confirmationMessage) {
            document.getElementById('confirmationMessage').value = botData.confirmationMessage || data.confirmationMessage;
        }



        // Campo companyDescription que faltaba
        if (data.companyDescription) {
            const companyDescriptionField = document.getElementById('companyDescription');
            if (companyDescriptionField) {
                companyDescriptionField.value = data.companyDescription;
                console.log('✅ Campo companyDescription cargado:', data.companyDescription);
            } else {
                console.log('⚠️ Campo companyDescription no encontrado en DOM');
            }
        }

        // Configuración de voz Azure TTS
        this.loadSavedVoiceConfig(data);
    
        console.log('📋 Formulario rellenado con configuración actual y datos de empresa');
    }

    async saveConfig() {
        try {
            console.log('💾 Guardando configuración del bot...');
            
            if (!this.authService.isAuthenticated()) {
                throw new Error('Usuario no autenticado');
            }

            // Mostrar loading
            this.showLoading(true);

            // Recopilar datos del formulario
            const configData = this.collectFormData();
            
            // Validar datos
            if (!this.validateConfigData(configData)) {
                this.showLoading(false);
                return;
            }

            console.log('📤 Enviando configuración:', configData);

            const token = this.authService.getToken();
            const response = await fetch(`${this.apiBaseUrl}/api/client`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(configData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Configuración guardada exitosamente:', result);

            // Mostrar éxito
            this.showSuccess();
            toastr.success('Configuración del bot guardada correctamente');

        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            toastr.error('Error al guardar: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    collectFormData() {
        return {
            // Configuración del bot en formato que espera el backend
            bot: {
                name: document.getElementById('botName').value.trim() || null,
                language: document.getElementById('botLanguage').value || null,
                personality: document.getElementById('botPersonality').value || null,
                welcomeMessage: document.getElementById('welcomeMessage').value.trim() || null,
                confirmationMessage: document.getElementById('confirmationMessage').value.trim() || null
            }
        };
    }

    validateConfigData(data) {
        const botData = data.bot || {};
        
        // Validaciones básicas
        if (botData.name && botData.name.length > 50) {
            toastr.error('El nombre del bot no puede exceder 50 caracteres');
            return false;
        }

        if (botData.welcomeMessage && botData.welcomeMessage.length > 500) {
            toastr.error('El mensaje de bienvenida no puede exceder 500 caracteres');
            return false;
        }

        if (botData.confirmationMessage && botData.confirmationMessage.length > 300) {
            toastr.error('El mensaje de confirmación no puede exceder 300 caracteres');
            return false;
        }



        return true;
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const saveBtn = document.getElementById('saveConfigBtn');
        
        if (show) {
            loadingSpinner.style.display = 'block';
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
        } else {
            loadingSpinner.style.display = 'none';
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Configuración';
        }
    }

    showSuccess() {
        const successMessage = document.getElementById('successMessage');
        successMessage.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }

    // ===== MÉTODOS AZURE TTS =====

    async loadAzureVoices() {
        try {
            console.log('🎵 Cargando voces Azure TTS disponibles...');
            const token = this.authService.getToken();
            
            const response = await fetch(`${this.apiBaseUrl}/api/voices/azure`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Voces Azure TTS cargadas:', result);

            this.populateVoiceSelect(result.voices, result.defaultVoice);

        } catch (error) {
            console.error('❌ Error cargando voces Azure TTS:', error);
            this.populateVoiceSelect([], null, true);
        }
    }

    populateVoiceSelect(voices, defaultVoice, hasError = false) {
        const select = document.getElementById('azureVoiceSelect');
        
        if (!select) {
            console.warn('⚠️ Elemento azureVoiceSelect no encontrado');
            return;
        }

        // Limpiar opciones existentes
        select.innerHTML = '';

        if (hasError) {
            select.innerHTML = '<option value="">Error cargando voces</option>';
            select.disabled = true;
            return;
        }

        if (!voices || voices.length === 0) {
            select.innerHTML = '<option value="">No hay voces disponibles</option>';
            select.disabled = true;
            return;
        }

        // Añadir opción por defecto
        select.innerHTML = '<option value="">Seleccionar voz...</option>';

        // Añadir voces disponibles
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = `${voice.name} (${voice.gender}) - ${voice.locale}`;
            
            // Marcar como seleccionada si es la voz por defecto
            if (voice.id === defaultVoice) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });

        select.disabled = false;
        console.log(`✅ ${voices.length} voces Azure TTS cargadas en el selector`);
    }

    loadSavedVoiceConfig(data) {
        try {
            console.log('🎵 Cargando configuración de voz guardada...');
            
            // Buscar configuración de voz en callConfig
            const callConfig = data.callConfig;
            const voiceSettings = callConfig?.voiceSettings;
            const savedVoice = voiceSettings?.azureVoice;
            
            console.log('🔍 CallConfig encontrado:', !!callConfig);
            console.log('🔍 VoiceSettings encontrado:', !!voiceSettings);
            console.log('🔍 Voz Azure guardada:', savedVoice);
            
            if (savedVoice) {
                const select = document.getElementById('azureVoiceSelect');
                if (select) {
                    // Buscar la opción correspondiente y seleccionarla
                    const option = Array.from(select.options).find(opt => opt.value === savedVoice);
                    if (option) {
                        select.value = savedVoice;
                        console.log(`✅ Voz Azure cargada: ${savedVoice}`);
                        toastr.info(`Voz configurada: ${option.textContent}`);
                    } else {
                        console.warn(`⚠️ Voz guardada ${savedVoice} no encontrada en opciones disponibles`);
                    }
                } else {
                    console.warn('⚠️ Selector de voz Azure no encontrado');
                }
            } else {
                console.log('ℹ️ No hay voz Azure guardada, usando configuración por defecto');
            }
        } catch (error) {
            console.error('❌ Error cargando configuración de voz:', error);
        }
    }

    async testSelectedVoice() {
        const select = document.getElementById('azureVoiceSelect');
        const selectedVoice = select.value;

        if (!selectedVoice) {
            toastr.warning('Por favor selecciona una voz para probar');
            return;
        }

        const testBtn = document.getElementById('testVoiceBtn');
        const originalText = testBtn.innerHTML;
        
        try {
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generando audio...';
            testBtn.disabled = true;

            console.log(`🎵 Probando voz Azure TTS: ${selectedVoice}`);
            
            // Texto de prueba en español
            const testText = "Hola, soy tu asistente virtual. Esta es una muestra de mi voz para las llamadas telefónicas.";
            
            const token = this.authService.getToken();
            
            const response = await fetch(`${this.apiBaseUrl}/api/tts/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: testText,
                    voice: selectedVoice,
                    provider: 'azure-tts'
                })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            // Obtener el audio como blob
            const audioBlob = await response.blob();
            
            // Crear URL del audio y reproducirlo
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.play();
            
            toastr.success('Audio generado correctamente. ¡Escucha la muestra!');
            
            // Limpiar URL después de reproducir
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });

        } catch (error) {
            console.error('❌ Error probando voz Azure TTS:', error);
            toastr.error('Error al generar audio de prueba: ' + error.message);
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    // Actualizar collectFormData para incluir configuración de voz
    collectFormData() {
        const azureVoice = document.getElementById('azureVoiceSelect').value;
        
        return {
            // Configuración del bot en formato que espera el backend
            bot: {
                name: document.getElementById('botName').value.trim() || null,
                language: document.getElementById('botLanguage').value || null,
                personality: document.getElementById('botPersonality').value || null,
                welcomeMessage: document.getElementById('welcomeMessage').value.trim() || null,
                confirmationMessage: document.getElementById('confirmationMessage').value.trim() || null
            },
            // Configuración de voz Azure TTS
            voiceConfig: azureVoice ? {
                azureVoice: azureVoice
            } : null
        };
    }
}

// Configurar Toastr
toastr.options = {
    closeButton: true,
    debug: false,
    newestOnTop: true,
    progressBar: true,
    positionClass: "toast-top-right",
    preventDuplicates: false,
    onclick: null,
    showDuration: "300",
    hideDuration: "1000",
    timeOut: "5000",
    extendedTimeOut: "1000",
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "fadeIn",
    hideMethod: "fadeOut"
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de configuración del bot...');
    
    // Verificar autenticación
    if (!window.authService || !window.authService.isAuthenticated()) {
        console.warn('⚠️ Usuario no autenticado, redirigiendo a login...');
        window.location.href = 'login.html';
        return;
    }

    // Inicializar manager
    window.botConfigManager = new BotConfigManager();
    
    console.log('✅ Bot Configuration Manager inicializado correctamente');
});
