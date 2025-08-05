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
