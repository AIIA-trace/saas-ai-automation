/**
 * Módulo de Configuración de Voz
 * Maneja la configuración de voz y llamadas para el asistente virtual
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la página
    initVoiceSettingsPage();
});

/**
 * Inicializa la página de configuración de voz
 */
async function initVoiceSettingsPage() {
    // Mostrar indicador de carga
    document.getElementById('loading-indicator').classList.remove('d-none');
    
    try {
        // Verificar autenticación (la protección de ruta ya lo hace, pero es buena práctica)
        const userData = await authService.getCurrentUser();
        document.getElementById('username').textContent = userData.name || userData.email;
        
        // Cargar configuración actual
        await loadVoiceSettings();
        
        // Cargar lista de voces disponibles
        await loadAvailableVoices();
        
        // Cargar números de teléfono
        await loadPhoneNumbers();
        
        // Inicializar select2 para la selección de voz
        initSelect2();
        
        // Configurar eventos
        setupEventListeners();
    } catch (error) {
        console.error('Error inicializando página de voz:', error);
        console.error('Error al cargar la configuración de voz');
    } finally {
        // Ocultar indicador de carga
        document.getElementById('loading-indicator').classList.add('d-none');
    }
}

/**
 * Carga la configuración de voz actual del usuario
 */
async function loadVoiceSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/voice-config`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar la configuración de voz');

        const voiceConfig = await response.json();
        
        // Rellenar los campos del formulario con la configuración actual
        if (voiceConfig) {
            // Configuración de voz
            if (voiceConfig.voiceId) {
                // Se establecerá después de cargar las voces disponibles
                window.selectedVoiceId = voiceConfig.voiceId;
            }
            
            if (voiceConfig.language) {
                document.getElementById('language-selection').value = voiceConfig.language;
            }
            
            // Mensajes personalizados
            if (voiceConfig.welcomeMessage) {
                document.getElementById('welcome-message').value = voiceConfig.welcomeMessage;
            }
            
            if (voiceConfig.gatherPrompt) {
                document.getElementById('gather-prompt').value = voiceConfig.gatherPrompt;
            }
            
            if (voiceConfig.retryPrompt) {
                document.getElementById('retry-prompt').value = voiceConfig.retryPrompt;
            }
            
            if (voiceConfig.followUpPrompt) {
                document.getElementById('followup-prompt').value = voiceConfig.followUpPrompt;
            }
            
            if (voiceConfig.goodbyeMessage) {
                document.getElementById('goodbye-message').value = voiceConfig.goodbyeMessage;
            }
        }
        
        return voiceConfig;
    } catch (error) {
        console.error('Error cargando configuración de voz:', error);
        console.error('No se pudo cargar tu configuración de voz');
        return null;
    }
}

/**
 * Carga las voces disponibles de ElevenLabs
 */
async function loadAvailableVoices() {
    try {
        const voiceSelect = document.getElementById('voice-selection');
        
        const response = await fetch(`${API_BASE_URL}/voices`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar las voces disponibles');

        const data = await response.json();
        const voices = data.voices || [];
        
        // Limpiar opciones actuales
        voiceSelect.innerHTML = '';
        
        // Añadir opciones de voces
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            option.dataset.preview = voice.preview || '';
            voiceSelect.appendChild(option);
        });
        
        // Seleccionar la voz actual del usuario si existe
        if (window.selectedVoiceId) {
            voiceSelect.value = window.selectedVoiceId;
        }
        
    } catch (error) {
        console.error('Error cargando voces disponibles:', error);
        console.error('No se pudieron cargar las voces disponibles');
        
        // Agregar opción por defecto en caso de error
        const voiceSelect = document.getElementById('voice-selection');
        voiceSelect.innerHTML = '<option value="">Error al cargar voces</option>';
    }
}

/**
 * Carga los números de teléfono del usuario
 */
async function loadPhoneNumbers() {
    try {
        const phoneContainer = document.getElementById('phone-numbers-list');
        document.getElementById('phone-loading').classList.remove('d-none');
        
        const response = await fetch(`${API_BASE_URL}/phone-numbers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar los números de teléfono');

        const data = await response.json();
        const numbers = data.numbers || [];
        
        document.getElementById('phone-loading').classList.add('d-none');
        
        if (numbers.length === 0) {
            phoneContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle me-2"></i> 
                    No tienes números de teléfono configurados. Adquiere uno nuevo para comenzar.
                </div>
            `;
            return;
        }
        
        // Crear lista de números de teléfono
        let html = '';
        numbers.forEach(number => {
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-0">${number.phoneNumber}</h5>
                                <small class="text-muted">${number.friendlyName || 'Sin nombre'}</small>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-danger release-number" data-sid="${number.twilioSid}">
                                    <i class="fas fa-trash-alt"></i> Liberar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        phoneContainer.innerHTML = html;
        
        // Agregar eventos a los botones de liberar
        document.querySelectorAll('.release-number').forEach(button => {
            button.addEventListener('click', function() {
                const sid = this.dataset.sid;
                releasePhoneNumber(sid);
            });
        });
        
    } catch (error) {
        console.error('Error cargando números de teléfono:', error);
        document.getElementById('phone-loading').classList.add('d-none');
        
        document.getElementById('phone-numbers-list').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> 
                Error al cargar los números de teléfono: ${error.message}
            </div>
        `;
    }
}

/**
 * Inicializa el plugin Select2 para el selector de voces
 */
function initSelect2() {
    // Inicializar select2 si está disponible
    if ($.fn.select2) {
        $('.select2').select2({
            width: '100%',
            theme: 'bootstrap',
            placeholder: 'Selecciona una voz'
        });
    }
}

/**
 * Configura los listeners de eventos para los controles de la página
 */
function setupEventListeners() {
    // Botón de previsualización de voz
    document.getElementById('preview-btn').addEventListener('click', previewVoice);
    
    // Botón de guardar configuración de voz
    document.getElementById('save-voice-settings').addEventListener('click', saveVoiceSettings);
    
    // Botón de guardar mensajes de llamada
    document.getElementById('save-call-settings').addEventListener('click', saveCallMessages);
    
    // Botón de adquirir número
    document.getElementById('purchase-number').addEventListener('click', purchasePhoneNumber);
    
    // Botón de cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', function() {
        authService.logout();
        console.log('Sesión cerrada correctamente');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });
}

/**
 * Previsualiza la voz seleccionada
 */
async function previewVoice() {
    const voiceId = document.getElementById('voice-selection').value;
    const previewText = document.getElementById('preview-text').value;
    const audioContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('preview-player');
    
    if (!voiceId) {
        console.warn('Por favor selecciona una voz primero');
        return;
    }
    
    if (!previewText) {
        console.warn('Ingresa algún texto para previsualizar');
        return;
    }
    
    try {
        // Cambiar botón a estado de carga
        const previewBtn = document.getElementById('preview-btn');
        const originalBtnText = previewBtn.innerHTML;
        previewBtn.disabled = true;
        previewBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Generando...';
        
        // Solicitar previsualización de audio
        const response = await fetch(`${API_BASE_URL}/voice-preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            },
            body: JSON.stringify({
                voiceId,
                text: previewText
            })
        });

        if (!response.ok) throw new Error('Error al generar previsualización de voz');

        const data = await response.json();
        
        // Mostrar reproductor con audio generado
        audioPlayer.src = data.audioUrl;
        audioContainer.classList.remove('d-none');
        audioPlayer.play();
        
        console.log('Audio generado correctamente');
    } catch (error) {
        console.error('Error generando previsualización de voz:', error);
        console.error('Error al generar previsualización de voz');
    } finally {
        // Restaurar estado del botón
        const previewBtn = document.getElementById('preview-btn');
        previewBtn.disabled = false;
        previewBtn.innerHTML = '<i class="fas fa-play me-1"></i> Reproducir';
    }
}

/**
 * Guarda la configuración de voz
 */
async function saveVoiceSettings() {
    const voiceId = document.getElementById('voice-selection').value;
    const language = document.getElementById('language-selection').value;
    
    if (!voiceId) {
        console.warn('Por favor selecciona una voz');
        return;
    }
    
    try {
        // Cambiar botón a estado de carga
        const saveBtn = document.getElementById('save-voice-settings');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando...';
        
        // Guardar configuración
        const response = await fetch(`${API_BASE_URL}/voice-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            },
            body: JSON.stringify({
                voiceId,
                language
            })
        });

        if (!response.ok) throw new Error('Error al guardar la configuración de voz');

        console.log('Configuración de voz guardada correctamente');
    } catch (error) {
        console.error('Error guardando configuración de voz:', error);
        console.error('Error al guardar la configuración de voz');
    } finally {
        // Restaurar estado del botón
        const saveBtn = document.getElementById('save-voice-settings');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Configuración';
    }
}

/**
 * Guarda los mensajes personalizados de llamada
 */
async function saveCallMessages() {
    const welcomeMessage = document.getElementById('welcome-message').value;
    const gatherPrompt = document.getElementById('gather-prompt').value;
    const retryPrompt = document.getElementById('retry-prompt').value;
    const followUpPrompt = document.getElementById('followup-prompt').value;
    const goodbyeMessage = document.getElementById('goodbye-message').value;
    
    try {
        // Cambiar botón a estado de carga
        const saveBtn = document.getElementById('save-call-settings');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando...';
        
        // Guardar mensajes
        const response = await fetch(`${API_BASE_URL}/call-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            },
            body: JSON.stringify({
                welcomeMessage,
                gatherPrompt,
                retryPrompt,
                followUpPrompt,
                goodbyeMessage
            })
        });

        if (!response.ok) throw new Error('Error al guardar los mensajes de llamada');

        console.log('Mensajes de llamada guardados correctamente');
    } catch (error) {
        console.error('Error guardando mensajes de llamada:', error);
        console.error('Error al guardar los mensajes de llamada');
    } finally {
        // Restaurar estado del botón
        const saveBtn = document.getElementById('save-call-settings');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Mensajes';
    }
}

/**
 * Compra un nuevo número de teléfono
 */
async function purchasePhoneNumber() {
    const areaCode = document.getElementById('area-code').value;
    const voiceCapability = document.getElementById('voice-capability').checked;
    const smsCapability = document.getElementById('sms-capability').checked;
    
    if (!areaCode) {
        console.warn('Por favor ingresa un código de área');
        return;
    }
    
    if (!voiceCapability && !smsCapability) {
        console.warn('Debes seleccionar al menos una capacidad');
        return;
    }
    
    try {
        // Cambiar botón a estado de carga
        const purchaseBtn = document.getElementById('purchase-number');
        purchaseBtn.disabled = true;
        purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Comprando...';
        
        // Comprar número
        const response = await fetch(`${API_BASE_URL}/phone-numbers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            },
            body: JSON.stringify({
                areaCode,
                capabilities: {
                    voice: voiceCapability,
                    sms: smsCapability
                }
            })
        });

        if (!response.ok) throw new Error('Error al comprar el número de teléfono');

        const data = await response.json();
        
        console.log(`Número adquirido correctamente: ${data.phoneNumber}`);
        
        // Recargar lista de números
        await loadPhoneNumbers();
    } catch (error) {
        console.error('Error comprando número de teléfono:', error);
        console.error('Error al comprar el número de teléfono');
    } finally {
        // Restaurar estado del botón
        const purchaseBtn = document.getElementById('purchase-number');
        purchaseBtn.disabled = false;
        purchaseBtn.innerHTML = '<i class="fas fa-plus-circle me-1"></i> Adquirir Número';
    }
}

/**
 * Libera un número de teléfono
 */
async function releasePhoneNumber(twilioSid) {
    if (!confirm('¿Estás seguro de que deseas liberar este número? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/phone-numbers/${twilioSid}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });

        if (!response.ok) throw new Error('Error al liberar el número de teléfono');

        console.log('Número liberado correctamente');
        
        // Recargar lista de números
        await loadPhoneNumbers();
    } catch (error) {
        console.error('Error liberando número de teléfono:', error);
        console.error('Error al liberar el número de teléfono');
    }
}
