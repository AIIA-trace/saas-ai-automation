// Script Configuration Module
document.addEventListener('DOMContentLoaded', function() {
    // Check if the script tab exists (loaded by bot-config.js)
    const scriptTab = document.getElementById('script');
    if (!scriptTab) return;
    
    // Initialize script tab content
    initializeScriptTab();
    
    // Fetch script configuration
    fetchScriptConfig();
});

// Initialize script tab
function initializeScriptTab() {
    const scriptTab = document.getElementById('script');
    
    scriptTab.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
                <h5 class="mb-0">Configuración de respuestas del bot</h5>
            </div>
            <div class="card-body">
                <!-- Loading placeholder -->
                <div id="loading-script-config" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando configuración de script...</p>
                </div>
                
                <!-- Script configuration will be loaded here -->
                <div id="script-config-content" class="d-none"></div>
            </div>
        </div>
    `;
}

// Fetch script configuration from API
function fetchScriptConfig() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/bot/script', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading script configuration');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('loading-script-config').classList.add('d-none');
        
        // Show configuration content
        const configContent = document.getElementById('script-config-content');
        configContent.classList.remove('d-none');
        
        // Load script configuration interface
        loadScriptInterface(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockScriptConfig();
    });
}

// Load script configuration interface
function loadScriptInterface(config) {
    const configContent = document.getElementById('script-config-content');
    
    configContent.innerHTML = `
        <form id="script-config-form">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="ai-model" class="form-label">Modelo de IA</label>
                        <select class="form-select" id="ai-model">
                            <option value="gpt-4" ${config.model === 'gpt-4' ? 'selected' : ''}>GPT-4 (Recomendado)</option>
                            <option value="gpt-3.5-turbo" ${config.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo (Más rápido)</option>
                        </select>
                        <div class="form-text">El modelo de IA determina la calidad y capacidad de comprensión.</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="personality" class="form-label">Personalidad del asistente</label>
                        <select class="form-select" id="personality">
                            <option value="professional" ${config.personality === 'professional' ? 'selected' : ''}>Profesional</option>
                            <option value="friendly" ${config.personality === 'friendly' ? 'selected' : ''}>Amigable</option>
                            <option value="efficient" ${config.personality === 'efficient' ? 'selected' : ''}>Eficiente y conciso</option>
                            <option value="empathetic" ${config.personality === 'empathetic' ? 'selected' : ''}>Empático</option>
                            <option value="custom" ${config.personality === 'custom' ? 'selected' : ''}>Personalizado</option>
                        </select>
                    </div>
                    
                    <div class="mb-3 ${config.personality === 'custom' ? '' : 'd-none'}" id="custom-personality-container">
                        <label for="custom-personality" class="form-label">Personalidad personalizada</label>
                        <textarea class="form-control" id="custom-personality" rows="3">${config.customPersonality || ''}</textarea>
                        <div class="form-text">Describe cómo quieres que se comporte tu asistente.</div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="knowledge-base" class="form-label">Base de conocimiento</label>
                        <div class="input-group">
                            <select class="form-select" id="knowledge-base">
                                <option value="none" ${config.knowledgeBase === 'none' ? 'selected' : ''}>Ninguna (Solo conocimiento general)</option>
                                <option value="basic" ${config.knowledgeBase === 'basic' ? 'selected' : ''}>Información básica de empresa</option>
                                <option value="full" ${config.knowledgeBase === 'full' ? 'selected' : ''}>Información completa + FAQs</option>
                                <option value="custom" ${config.knowledgeBase === 'custom' ? 'selected' : ''}>Documentos personalizados</option>
                            </select>
                            <button class="btn btn-outline-secondary" type="button" id="manage-kb">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                        <div class="form-text">Define qué información específica tendrá disponible el asistente.</div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label d-block">Capacidades</label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="capability-appointments" ${config.capabilities?.includes('appointments') ? 'checked' : ''}>
                            <label class="form-check-label" for="capability-appointments">
                                Gestión de citas
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="capability-faq" ${config.capabilities?.includes('faq') ? 'checked' : ''}>
                            <label class="form-check-label" for="capability-faq">
                                Responder preguntas frecuentes
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="capability-products" ${config.capabilities?.includes('products') ? 'checked' : ''}>
                            <label class="form-check-label" for="capability-products">
                                Información sobre productos/servicios
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="capability-support" ${config.capabilities?.includes('support') ? 'checked' : ''}>
                            <label class="form-check-label" for="capability-support">
                                Soporte técnico básico
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <h6>Mensajes y respuestas personalizadas</h6>
                <p class="text-muted small">Define cómo debe responder el bot en situaciones específicas.</p>
                
                <div class="accordion" id="scriptAccordion">
                    <!-- Introduction script -->
                    <div class="accordion-item border-0 shadow-sm mb-3">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#introScript">
                                Presentación inicial
                            </button>
                        </h2>
                        <div id="introScript" class="accordion-collapse collapse show" data-bs-parent="#scriptAccordion">
                            <div class="accordion-body">
                                <div class="mb-3">
                                    <label for="intro-script" class="form-label">Mensaje de presentación</label>
                                    <textarea class="form-control" id="intro-script" rows="2">${config.scripts?.intro || 'Buenos días, le atiende [nombre-bot], el asistente virtual de [nombre-empresa]. ¿En qué puedo ayudarle hoy?'}</textarea>
                                    <div class="form-text">Usa [nombre-bot] y [nombre-empresa] como variables que se reemplazarán automáticamente.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Handle unknown intent -->
                    <div class="accordion-item border-0 shadow-sm mb-3">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#unknownScript">
                                No entiende la solicitud
                            </button>
                        </h2>
                        <div id="unknownScript" class="accordion-collapse collapse" data-bs-parent="#scriptAccordion">
                            <div class="accordion-body">
                                <div class="mb-3">
                                    <label for="unknown-script" class="form-label">Cuando no entiende lo que dice el cliente</label>
                                    <textarea class="form-control" id="unknown-script" rows="2">${config.scripts?.unknown || 'Disculpe, no he entendido bien su solicitud. ¿Podría repetirla de otra forma o indicarme exactamente en qué puedo ayudarle?'}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Call forwarding -->
                    <div class="accordion-item border-0 shadow-sm mb-3">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#forwardScript">
                                Transferencia de llamada
                            </button>
                        </h2>
                        <div id="forwardScript" class="accordion-collapse collapse" data-bs-parent="#scriptAccordion">
                            <div class="accordion-body">
                                <div class="mb-3">
                                    <label for="forward-script" class="form-label">Antes de transferir la llamada</label>
                                    <textarea class="form-control" id="forward-script" rows="2">${config.scripts?.forward || 'Entiendo. Voy a transferirle con un agente humano que podrá ayudarle con su consulta. Por favor, espere un momento en línea.'}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Goodbye script -->
                    <div class="accordion-item border-0 shadow-sm mb-3">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#goodbyeScript">
                                Despedida
                            </button>
                        </h2>
                        <div id="goodbyeScript" class="accordion-collapse collapse" data-bs-parent="#scriptAccordion">
                            <div class="accordion-body">
                                <div class="mb-3">
                                    <label for="goodbye-script" class="form-label">Al finalizar la llamada</label>
                                    <textarea class="form-control" id="goodbye-script" rows="2">${config.scripts?.goodbye || 'Gracias por contactar con [nombre-empresa]. Ha sido un placer atenderle. Si necesita cualquier otra cosa, no dude en volver a llamarnos. ¡Que tenga un buen día!'}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white">
                        <h6 class="mb-0">Configuración avanzada</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="max-turns" class="form-label">Máximo de turnos de conversación</label>
                                    <input type="number" class="form-control" id="max-turns" min="1" max="20" value="${config.maxConversationTurns || 8}">
                                    <div class="form-text">Después de este número de intercambios, el bot ofrecerá transferir la llamada.</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="silence-timeout" class="form-label">Tiempo de espera por silencio (segundos)</label>
                                    <input type="number" class="form-control" id="silence-timeout" min="1" max="60" value="${config.silenceTimeoutSeconds || 5}">
                                    <div class="form-text">Tiempo que el bot esperará en silencio antes de intervenir.</div>
                                </div>
                            </div>
                        </div>
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="transcription-summary" ${config.enableTranscriptionSummary ? 'checked' : ''}>
                            <label class="form-check-label" for="transcription-summary">Generar resumen automático de la llamada</label>
                        </div>
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="save-recordings" ${config.saveRecordings ? 'checked' : ''}>
                            <label class="form-check-label" for="save-recordings">Guardar grabaciones de las llamadas</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-end">
                <button type="button" class="btn btn-outline-secondary me-2">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar configuración</button>
            </div>
        </form>
    `;
    
    // Initialize custom personality toggle
    document.getElementById('personality').addEventListener('change', function() {
        const customContainer = document.getElementById('custom-personality-container');
        if (this.value === 'custom') {
            customContainer.classList.remove('d-none');
        } else {
            customContainer.classList.add('d-none');
        }
    });
    
    // Initialize form submission
    document.getElementById('script-config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveScriptConfig();
    });
}

// ELIMINADO: Función saveScriptConfig
// Esta función ha sido eliminada para evitar conflictos
// con la función unificada de guardado

function placeholderFunction() {
    // Función vacía para mantener la estructura del código
    console.log('Esta función reemplaza a saveScriptConfig');
}

// Helper: Get selected capabilities
function getSelectedCapabilities() {
    const capabilities = [];
    if (document.getElementById('capability-appointments').checked) capabilities.push('appointments');
    if (document.getElementById('capability-faq').checked) capabilities.push('faq');
    if (document.getElementById('capability-products').checked) capabilities.push('products');
    if (document.getElementById('capability-support').checked) capabilities.push('support');
    return capabilities;
}

// Load mock data for demo purposes
function loadMockScriptConfig() {
    // Hide loading indicator
    document.getElementById('loading-script-config').classList.add('d-none');
    
    // Show configuration content
    const configContent = document.getElementById('script-config-content');
    configContent.classList.remove('d-none');
    
    // Mock script configuration data
    const mockConfig = {
        model: 'gpt-4',
        personality: 'professional',
        customPersonality: '',
        knowledgeBase: 'basic',
        capabilities: ['faq', 'products'],
        scripts: {
            intro: 'Buenos días, le atiende Asistente Virtual, el asistente virtual de Mi Empresa. ¿En qué puedo ayudarle hoy?',
            unknown: 'Disculpe, no he entendido bien su solicitud. ¿Podría repetirla de otra forma o indicarme exactamente en qué puedo ayudarle?',
            forward: 'Entiendo. Voy a transferirle con un agente humano que podrá ayudarle con su consulta. Por favor, espere un momento en línea.',
            goodbye: 'Gracias por contactar con Mi Empresa. Ha sido un placer atenderle. Si necesita cualquier otra cosa, no dude en volver a llamarnos. ¡Que tenga un buen día!'
        },
        maxConversationTurns: 8,
        silenceTimeoutSeconds: 5,
        enableTranscriptionSummary: true,
        saveRecordings: true
    };
    
    // Load script interface with mock data
    loadScriptInterface(mockConfig);
}
