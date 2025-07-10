// Bot Configuration Module
document.addEventListener('DOMContentLoaded', function() {
    // Check if the bot-config tab exists
    const botConfigTab = document.getElementById('bot-config');
    if (!botConfigTab) return;

    // Initialize the bot configuration tab content
    initializeBotConfigTab();
    
    // Fetch bot configuration from API
    fetchBotConfig();
});

// Initialize tab content
function initializeBotConfigTab() {
    const botConfigTab = document.getElementById('bot-config');
    
    // Set initial HTML structure
    botConfigTab.innerHTML = `
        <h1 class="mb-4">Configuración del Bot de Llamadas</h1>
        <p class="lead">Personaliza el comportamiento y respuestas de tu asistente virtual de llamadas.</p>
        
        <!-- Loading placeholder -->
        <div id="loading-bot-config" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando configuración...</p>
        </div>
        
        <!-- Configuration will be loaded here -->
        <div id="bot-config-content" class="d-none"></div>
    `;
}

// Fetch bot configuration from API
function fetchBotConfig() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/bot/config', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading bot configuration');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('loading-bot-config').classList.add('d-none');
        
        // Show configuration content
        const configContent = document.getElementById('bot-config-content');
        configContent.classList.remove('d-none');
        
        // Load configuration interface
        loadBotConfigInterface(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockBotConfig();
    });
}

// Load bot configuration interface
function loadBotConfigInterface(config) {
    const configContent = document.getElementById('bot-config-content');
    
    configContent.innerHTML = `
        <div class="row">
            <!-- Configuration tabs -->
            <div class="col-12 mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body p-0">
                        <ul class="nav nav-pills nav-fill p-3" id="bot-config-tabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="general-tab" data-bs-toggle="tab" data-bs-target="#general" type="button" role="tab">
                                    <i class="fas fa-cog me-2"></i>General
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="voice-tab" data-bs-toggle="tab" data-bs-target="#voice" type="button" role="tab">
                                    <i class="fas fa-microphone me-2"></i>Voz
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="script-tab" data-bs-toggle="tab" data-bs-target="#script" type="button" role="tab">
                                    <i class="fas fa-file-alt me-2"></i>Script
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="forwarding-tab" data-bs-toggle="tab" data-bs-target="#forwarding" type="button" role="tab">
                                    <i class="fas fa-exchange-alt me-2"></i>Transferencias
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Tab content -->
            <div class="col-12">
                <div class="tab-content">
                    <!-- General settings tab -->
                    <div class="tab-pane fade show active" id="general" role="tabpanel">
                        <div class="card border-0 shadow-sm mb-4">
                            <div class="card-header bg-white">
                                <h5 class="mb-0">Configuración general</h5>
                            </div>
                            <div class="card-body">
                                <form id="general-config-form">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="bot-name" class="form-label">Nombre del asistente</label>
                                                <input type="text" class="form-control" id="bot-name" value="${config.botName || 'Asistente Virtual'}" required>
                                                <div class="form-text">Este nombre se usará cuando el bot se presente.</div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="company-name" class="form-label">Nombre de la empresa</label>
                                                <input type="text" class="form-control" id="company-name" value="${config.companyName || ''}" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="language" class="form-label">Idioma principal</label>
                                                <select class="form-select" id="language">
                                                    <option value="es-ES" ${config.language === 'es-ES' ? 'selected' : ''}>Español (España)</option>
                                                    <option value="en-US" ${config.language === 'en-US' ? 'selected' : ''}>Inglés (EE.UU.)</option>
                                                    <option value="ca-ES" ${config.language === 'ca-ES' ? 'selected' : ''}>Catalán</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="greeting-message" class="form-label">Mensaje de saludo</label>
                                                <textarea class="form-control" id="greeting-message" rows="3">${config.greetingMessage || 'Buenos días, le atiende el asistente virtual de [Empresa]. ¿En qué puedo ayudarle?'}</textarea>
                                                <div class="form-text">Este es el mensaje inicial que escuchará quien llame.</div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="business-hours" class="form-label">Horario de atención</label>
                                                <div class="row g-2">
                                                    <div class="col-6">
                                                        <input type="time" class="form-control" id="open-time" value="${config.businessHours?.open || '09:00'}">
                                                    </div>
                                                    <div class="col-6">
                                                        <input type="time" class="form-control" id="close-time" value="${config.businessHours?.close || '18:00'}">
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label d-block">Días laborables</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-mon" ${config.workDays?.includes('mon') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-mon">Lun</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-tue" ${config.workDays?.includes('tue') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-tue">Mar</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-wed" ${config.workDays?.includes('wed') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-wed">Mié</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-thu" ${config.workDays?.includes('thu') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-thu">Jue</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-fri" ${config.workDays?.includes('fri') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-fri">Vie</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-sat" ${config.workDays?.includes('sat') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-sat">Sáb</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="checkbox" id="day-sun" ${config.workDays?.includes('sun') ? 'checked' : ''}>
                                                    <label class="form-check-label" for="day-sun">Dom</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-check form-switch mb-3">
                                        <input class="form-check-input" type="checkbox" id="after-hours-mode" ${config.afterHoursMode ? 'checked' : ''}>
                                        <label class="form-check-label" for="after-hours-mode">Activar mensaje fuera de horario</label>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="after-hours-message" class="form-label">Mensaje fuera de horario</label>
                                        <textarea class="form-control" id="after-hours-message" rows="2">${config.afterHoursMessage || 'Gracias por llamar a [Empresa]. En este momento nos encontramos fuera del horario de atención. Nuestro horario es de lunes a viernes de 9:00 a 18:00. Por favor, llame más tarde o deje un mensaje y nos pondremos en contacto con usted.'}</textarea>
                                    </div>
                                    
                                    <div class="text-end">
                                        <button type="button" class="btn btn-outline-secondary me-2">Cancelar</button>
                                        <button type="submit" class="btn btn-primary">Guardar cambios</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize form submission handler
    document.getElementById('general-config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveGeneralConfig();
    });
}

// Save general configuration
function saveGeneralConfig() {
    // Show saving indicator
    const submitBtn = document.querySelector('#general-config-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando...';
    submitBtn.disabled = true;
    
    // Get form values
    const config = {
        botName: document.getElementById('bot-name').value,
        companyName: document.getElementById('company-name').value,
        language: document.getElementById('language').value,
        greetingMessage: document.getElementById('greeting-message').value,
        businessHours: {
            open: document.getElementById('open-time').value,
            close: document.getElementById('close-time').value
        },
        workDays: getSelectedWorkDays(),
        afterHoursMode: document.getElementById('after-hours-mode').checked,
        afterHoursMessage: document.getElementById('after-hours-message').value
    };
    
    // Get auth token
    const token = localStorage.getItem('authToken');
    
    // Send to API
    fetch('/api/bot/config', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error saving configuration');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        showToast('Configuración guardada correctamente', 'success');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Show error message
        showToast('Error al guardar la configuración', 'danger');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Helper: Get selected work days
function getSelectedWorkDays() {
    const days = [];
    if (document.getElementById('day-mon').checked) days.push('mon');
    if (document.getElementById('day-tue').checked) days.push('tue');
    if (document.getElementById('day-wed').checked) days.push('wed');
    if (document.getElementById('day-thu').checked) days.push('thu');
    if (document.getElementById('day-fri').checked) days.push('fri');
    if (document.getElementById('day-sat').checked) days.push('sat');
    if (document.getElementById('day-sun').checked) days.push('sun');
    return days;
}

// Helper: Show toast notification
function showToast(message, type) {
    // Create toast element
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    toastContainer.innerHTML = `
        <div id="liveToast" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">${type === 'success' ? 'Éxito' : 'Error'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(toastContainer);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const toast = bootstrap.Toast.getOrCreateInstance(document.getElementById('liveToast'));
        toast.hide();
        setTimeout(() => {
            document.body.removeChild(toastContainer);
        }, 500);
    }, 5000);
}

// Load mock data for demo purposes
function loadMockBotConfig() {
    // Hide loading indicator
    document.getElementById('loading-bot-config').classList.add('d-none');
    
    // Show configuration content
    const configContent = document.getElementById('bot-config-content');
    configContent.classList.remove('d-none');
    
    // Mock data for bot configuration
    const mockConfig = {
        botName: 'Asistente Virtual',
        companyName: 'Mi Empresa',
        language: 'es-ES',
        greetingMessage: 'Buenos días, le atiende el asistente virtual de Mi Empresa. ¿En qué puedo ayudarle?',
        businessHours: {
            open: '09:00',
            close: '18:00'
        },
        workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        afterHoursMode: true,
        afterHoursMessage: 'Gracias por llamar a Mi Empresa. En este momento nos encontramos fuera del horario de atención. Nuestro horario es de lunes a viernes de 9:00 a 18:00. Por favor, llame más tarde o deje un mensaje y nos pondremos en contacto con usted.'
    };
    
    // Load interface with mock data
    loadBotConfigInterface(mockConfig);
}
