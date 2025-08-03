// Voice Configuration Module
document.addEventListener('DOMContentLoaded', function() {
    // Check if the voice tab exists (it will be loaded by bot-config.js)
    const voiceTab = document.getElementById('voice');
    if (!voiceTab) return;
    
    // Set initial HTML structure
    initializeVoiceTab();
    
    // Fetch voice configuration
    fetchVoiceConfig();
});

// Initialize voice tab
function initializeVoiceTab() {
    const voiceTab = document.getElementById('voice');
    
    voiceTab.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
                <h5 class="mb-0">Configuración de voz</h5>
            </div>
            <div class="card-body">
                <!-- Loading placeholder -->
                <div id="loading-voice-config" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando voces disponibles...</p>
                </div>
                
                <!-- Voice configuration will be loaded here -->
                <div id="voice-config-content" class="d-none"></div>
            </div>
        </div>
    `;
}

// Fetch voice configuration from API
function fetchVoiceConfig() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/bot/voice', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading voice configuration');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('loading-voice-config').classList.add('d-none');
        
        // Show configuration content
        const configContent = document.getElementById('voice-config-content');
        configContent.classList.remove('d-none');
        
        // Load voice configuration interface
        loadVoiceInterface(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockVoiceConfig();
    });
}

// Load voice configuration interface
function loadVoiceInterface(config) {
    const configContent = document.getElementById('voice-config-content');
    
    configContent.innerHTML = `
        <form id="voice-config-form">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="voice-provider" class="form-label">Proveedor de voz</label>
                        <select class="form-select" id="voice-provider">
                            <option value="elevenlabs" ${config.provider === 'elevenlabs' ? 'selected' : ''}>ElevenLabs (Alta calidad)</option>
                            <option value="google" ${config.provider === 'google' ? 'selected' : ''}>Google TTS</option>
                            <option value="twilio" ${config.provider === 'twilio' ? 'selected' : ''}>Twilio TTS</option>
                        </select>
                        <div class="form-text">La calidad y naturalidad de la voz depende del proveedor seleccionado.</div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="voice-speed" class="form-label">Velocidad de habla</label>
                        <input type="range" class="form-range" min="0.5" max="1.5" step="0.1" id="voice-speed" value="${config.speed || 1.0}">
                        <div class="d-flex justify-content-between">
                            <span>Lento</span>
                            <span id="speed-value">${config.speed || 1.0}</span>
                            <span>Rápido</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <label class="form-label">Selecciona una voz</label>
                <div class="row g-3" id="voice-options">
                    ${getVoiceOptionsHTML(config)}
                </div>
            </div>
            
            <div class="mb-4">
                <label class="form-label">Prueba la voz seleccionada</label>
                <div class="voice-player d-flex align-items-center">
                    <span class="voice-name me-3">${getSelectedVoiceName(config)}</span>
                    <audio controls id="voice-preview" class="flex-grow-1">
                        <source src="${config.previewUrl || '#'}" type="audio/mpeg">
                        Tu navegador no soporta el elemento de audio.
                    </audio>
                    <button type="button" class="btn btn-sm btn-primary ms-2" id="generate-preview">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="mt-2">
                    <label for="preview-text" class="form-label">Texto de prueba</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="preview-text" value="Hola, soy el asistente virtual de su empresa. ¿En qué puedo ayudarle hoy?">
                        <button class="btn btn-outline-primary" type="button" id="play-preview">
                            <i class="fas fa-play me-1"></i>Reproducir
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="text-end">
                <button type="button" class="btn btn-outline-secondary me-2">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar configuración</button>
            </div>
        </form>
    `;
    
    // Initialize range input display
    document.getElementById('voice-speed').addEventListener('input', function(e) {
        document.getElementById('speed-value').textContent = e.target.value;
    });
    
    // Initialize preview generation
    document.getElementById('generate-preview').addEventListener('click', function() {
        generateVoicePreview();
    });
    
    // Initialize play preview
    document.getElementById('play-preview').addEventListener('click', function() {
        const audio = document.getElementById('voice-preview');
        audio.play();
    });
    
    // Initialize form submission
    document.getElementById('voice-config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveVoiceConfig();
    });
}

// Helper: Get voice options HTML
function getVoiceOptionsHTML(config) {
    if (!config.availableVoices || config.availableVoices.length === 0) {
        return `
            <div class="col-12">
                <div class="alert alert-warning">
                    No hay voces disponibles para el proveedor seleccionado.
                </div>
            </div>
        `;
    }
    
    return config.availableVoices.map(voice => `
        <div class="col-md-4">
            <div class="card h-100 ${voice.id === config.selectedVoice ? 'border-primary' : ''}">
                <div class="card-body">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="voice-selection" id="voice-${voice.id}" value="${voice.id}" ${voice.id === config.selectedVoice ? 'checked' : ''}>
                        <label class="form-check-label d-block" for="voice-${voice.id}">
                            <h6>${voice.name}</h6>
                            <p class="text-muted mb-0">
                                <small>${voice.gender}, ${voice.age} - ${voice.accent}</small>
                            </p>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper: Get selected voice name
function getSelectedVoiceName(config) {
    if (!config.availableVoices || config.availableVoices.length === 0) {
        return 'Voz no seleccionada';
    }
    
    const selectedVoice = config.availableVoices.find(voice => voice.id === config.selectedVoice);
    return selectedVoice ? selectedVoice.name : 'Voz no seleccionada';
}

// Generate voice preview
function generateVoicePreview() {
    const token = localStorage.getItem('authToken');
    const previewText = document.getElementById('preview-text').value;
    const provider = document.getElementById('voice-provider').value;
    const selectedVoice = document.querySelector('input[name="voice-selection"]:checked').value;
    const speed = document.getElementById('voice-speed').value;
    
    // Show loading in button
    const previewBtn = document.getElementById('generate-preview');
    const originalHTML = previewBtn.innerHTML;
    previewBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
    previewBtn.disabled = true;
    
    fetch('/api/bot/voice/preview', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: previewText,
            provider: provider,
            voiceId: selectedVoice,
            speed: speed
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error generating preview');
        }
        return response.json();
    })
    .then(data => {
        // Update audio source
        const audio = document.getElementById('voice-preview');
        audio.src = data.previewUrl;
        audio.load();
        audio.play();
        
        // Reset button
        previewBtn.innerHTML = originalHTML;
        previewBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        // Reset button
        previewBtn.innerHTML = originalHTML;
        previewBtn.disabled = false;
        
        // Show error
        showToast('Error al generar la vista previa de voz', 'danger');
    });
}

// Save voice configuration
function saveVoiceConfig() {
    const token = localStorage.getItem('authToken');
    
    // Show saving indicator
    const submitBtn = document.querySelector('#voice-config-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Guardando...';
    submitBtn.disabled = true;
    
    // Get form values - Estructurado correctamente para el backend
    const config = {
        // Usar estructura 'calls' como espera el backend
        calls: {
            provider: document.getElementById('voice-provider').value,
            voiceId: document.querySelector('input[name="voice-selection"]:checked').value,
            speed: parseFloat(document.getElementById('voice-speed').value)
        }
    };
    
    fetch('/api/bot/voice', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error saving voice configuration');
        }
        return response.json();
    })
    .then(data => {
        // Show success message
        showToast('Configuración de voz guardada correctamente', 'success');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Show error message
        showToast('Error al guardar la configuración de voz', 'danger');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Load mock data for demo purposes
function loadMockVoiceConfig() {
    // Hide loading indicator
    document.getElementById('loading-voice-config').classList.add('d-none');
    
    // Show configuration content
    const configContent = document.getElementById('voice-config-content');
    configContent.classList.remove('d-none');
    
    // Mock voice configuration data
    const mockConfig = {
        provider: 'elevenlabs',
        selectedVoice: 'voice1',
        speed: 1.0,
        previewUrl: '#',
        availableVoices: [
            {
                id: 'voice1',
                name: 'María',
                gender: 'Mujer',
                age: 'Adulta',
                accent: 'Español (España)'
            },
            {
                id: 'voice2',
                name: 'Carlos',
                gender: 'Hombre',
                age: 'Adulto',
                accent: 'Español (España)'
            },
            {
                id: 'voice3',
                name: 'Ana',
                gender: 'Mujer',
                age: 'Joven',
                accent: 'Español (Latinoamérica)'
            },
            {
                id: 'voice4',
                name: 'Pedro',
                gender: 'Hombre',
                age: 'Mayor',
                accent: 'Español (España)'
            },
            {
                id: 'voice5',
                name: 'Isabel',
                gender: 'Mujer',
                age: 'Adulta',
                accent: 'Español (México)'
            },
            {
                id: 'voice6',
                name: 'Jorge',
                gender: 'Hombre',
                age: 'Adulto',
                accent: 'Español (Argentina)'
            }
        ]
    };
    
    // Load voice interface with mock data
    loadVoiceInterface(mockConfig);
}
