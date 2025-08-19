/**
 * N8N Integration Frontend
 * Maneja la comunicación entre el dashboard y N8N workflows
 */

class N8NIntegration {
    constructor() {
        this.apiBaseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
        this.authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        
        console.log('🔧 N8N Integration inicializado');
    }

    /**
     * Activa o desactiva un bot específico
     * @param {string} botType - 'call' o 'email'
     * @param {boolean} enabled - true para activar, false para desactivar
     * @param {object} config - configuración específica del bot
     */
    async toggleBot(botType, enabled, config = {}) {
        try {
            console.log(`🤖 ${enabled ? 'Activando' : 'Desactivando'} bot ${botType}...`);
            
            const response = await fetch(`${this.apiBaseUrl}/api/client`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    [`${botType}Config`]: {
                        ...config,
                        enabled: enabled
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            console.log(`✅ Bot ${botType} ${enabled ? 'activado' : 'desactivado'} correctamente`);
            
            // Mostrar notificación al usuario
            toastr.success(
                `Bot de ${botType === 'call' ? 'llamadas' : 'emails'} ${enabled ? 'activado' : 'desactivado'} correctamente`,
                'Bot Actualizado'
            );
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error toggling bot ${botType}:`, error);
            toastr.error(
                `Error al ${enabled ? 'activar' : 'desactivar'} el bot de ${botType === 'call' ? 'llamadas' : 'emails'}`,
                'Error'
            );
            throw error;
        }
    }

    /**
     * Activa el bot de llamadas con Twilio
     */
    async activateCallBot() {
        const callConfig = this.getCallConfigFromUI();
        return await this.toggleBot('call', true, callConfig);
    }

    /**
     * Desactiva el bot de llamadas
     */
    async deactivateCallBot() {
        return await this.toggleBot('call', false);
    }

    /**
     * Activa el bot de emails
     */
    async activateEmailBot() {
        const emailConfig = this.getEmailConfigFromUI();
        return await this.toggleBot('email', true, emailConfig);
    }

    /**
     * Desactiva el bot de emails
     */
    async deactivateEmailBot() {
        return await this.toggleBot('email', false);
    }

    /**
     * Obtiene la configuración de llamadas desde la UI
     */
    getCallConfigFromUI() {
        return {
            enabled: document.getElementById('call_bot_active')?.checked || false,
            recordCalls: document.getElementById('call_recording')?.checked || false,
            transcribeCalls: document.getElementById('call_transcription')?.checked || true,
            voiceId: document.getElementById('voice_type')?.value || 'neutral',
            language: document.getElementById('call_language')?.value || 'es-ES',
            greeting: document.getElementById('call_greeting')?.value || 'Hola, ha llamado a nuestra empresa. Soy el asistente virtual.',
            volume: '1.0',
            speed: '1.0',
            pitch: '1.0',
            useCustomVoice: false,
            customVoiceId: ''
        };
    }

    /**
     * Obtiene la configuración de emails desde la UI
     */
    getEmailConfigFromUI() {
        return {
            enabled: document.getElementById('email_bot_active')?.checked || false,
            provider: document.getElementById('email_provider')?.value || '',
            outgoingEmail: document.getElementById('outgoing_email')?.value || '',
            consentGiven: document.getElementById('email_consent')?.checked || false,
            emailSignature: document.getElementById('email_signature')?.value || '',
            forwardingRules: document.getElementById('forward_rules')?.value || '',
            autoReply: true,
            autoReplyMessage: 'Gracias por su email. Hemos recibido su mensaje y le responderemos pronto.'
        };
    }

    /**
     * Obtiene el estado actual de los bots
     */
    async getBotStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/client`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;
            
            return {
                callBot: {
                    enabled: data.callConfig?.enabled || false,
                    config: data.callConfig || {}
                },
                emailBot: {
                    enabled: data.emailConfig?.enabled || false,
                    config: data.emailConfig || {}
                }
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estado de bots:', error);
            return {
                callBot: { enabled: false, config: {} },
                emailBot: { enabled: false, config: {} }
            };
        }
    }

    /**
     * Actualiza los indicadores visuales en el dashboard
     */
    async updateBotStatusIndicators() {
        try {
            const status = await this.getBotStatus();
            
            // Actualizar indicador de bot de llamadas
            const callIndicator = document.getElementById('call-bot-status');
            if (callIndicator) {
                callIndicator.className = status.callBot.enabled 
                    ? 'badge bg-success' 
                    : 'badge bg-secondary';
                callIndicator.textContent = status.callBot.enabled ? 'Activo' : 'Inactivo';
            }
            
            // Actualizar indicador de bot de emails
            const emailIndicator = document.getElementById('email-bot-status');
            if (emailIndicator) {
                emailIndicator.className = status.emailBot.enabled 
                    ? 'badge bg-success' 
                    : 'badge bg-secondary';
                emailIndicator.textContent = status.emailBot.enabled ? 'Activo' : 'Inactivo';
            }
            
            // Actualizar switches en la UI
            const callSwitch = document.getElementById('call_bot_active');
            if (callSwitch) {
                callSwitch.checked = status.callBot.enabled;
            }
            
            const emailSwitch = document.getElementById('email_bot_active');
            if (emailSwitch) {
                emailSwitch.checked = status.emailBot.enabled;
            }
            
            console.log('✅ Indicadores de estado de bots actualizados');
            
        } catch (error) {
            console.error('❌ Error actualizando indicadores de estado:', error);
        }
    }

    /**
     * Configura los event listeners para los controles de bots
     * Se integra con el sistema de guardado existente del dashboard
     */
    setupBotControls() {
        // Interceptar el evento de guardado del formulario para activar/desactivar N8N
        const originalSaveFunction = window.saveUnifiedConfig;
        
        if (originalSaveFunction) {
            window.saveUnifiedConfig = async () => {
                console.log('🔧 N8N: Interceptando guardado de configuración...');
                
                // Ejecutar el guardado original
                const result = await originalSaveFunction();
                
                // Después del guardado exitoso, sincronizar con N8N
                if (result !== false) {
                    await this.syncWithN8N();
                }
                
                return result;
            };
            
            console.log('✅ N8N: Interceptor de guardado configurado');
        } else {
            console.log('⚠️ N8N: saveUnifiedConfig no encontrado, configurando listeners directos');
            this.setupDirectListeners();
        }
    }
    
    /**
     * Configurar listeners directos si no existe saveUnifiedConfig
     */
    setupDirectListeners() {
        const callBotSwitch = document.getElementById('call_bot_active');
        if (callBotSwitch) {
            callBotSwitch.addEventListener('change', async (e) => {
                const enabled = e.target.checked;
                console.log(`🤖 N8N: Bot de llamadas ${enabled ? 'activado' : 'desactivado'}`);
                
                try {
                    if (enabled) {
                        await this.activateCallBot();
                    } else {
                        await this.deactivateCallBot();
                    }
                } catch (error) {
                    console.error('❌ N8N: Error cambiando estado del bot:', error);
                    // Revertir el switch si hay error
                    e.target.checked = !enabled;
                }
            });
        }
    }
    
    /**
     * Sincroniza el estado actual con N8N después de guardar
     */
    async syncWithN8N() {
        try {
            const callBotActive = document.getElementById('call_bot_active')?.checked || false;
            
            console.log(`🔄 N8N: Sincronizando estado - Bot de llamadas: ${callBotActive ? 'ACTIVO' : 'INACTIVO'}`);
            
            if (callBotActive) {
                await this.activateCallBot();
                console.log('✅ N8N: Bot de llamadas activado');
            } else {
                await this.deactivateCallBot();
                console.log('✅ N8N: Bot de llamadas desactivado');
            }
            
        } catch (error) {
            console.error('❌ N8N: Error sincronizando con N8N:', error);
        }
    }

    /**
     * Inicializa la integración N8N
     */
    async init() {
        try {
            console.log('🚀 Inicializando integración N8N...');
            
            // Configurar controles
            this.setupBotControls();
            
            // Actualizar estado inicial
            await this.updateBotStatusIndicators();
            
            console.log('✅ Integración N8N inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando integración N8N:', error);
        }
    }
}

// Instancia global
window.N8NIntegration = new N8NIntegration();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.N8NIntegration.init();
    });
} else {
    window.N8NIntegration.init();
}

console.log('📦 N8N Integration JS cargado correctamente');
