// Transfer Configuration Module - Basic Structure
document.addEventListener('DOMContentLoaded', function() {
    // Check if the transfers tab exists (loaded by bot-config.js)
    const transfersTab = document.getElementById('transfers');
    if (!transfersTab) return;
    
    // Initialize transfers tab content
    initializeTransfersTab();
    
    // Fetch transfers configuration
    fetchTransfersConfig();
});

// Initialize transfers tab
function initializeTransfersTab() {
    const transfersTab = document.getElementById('transfers');
    
    transfersTab.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white">
                <h5 class="mb-0">Configuración de transferencias</h5>
            </div>
            <div class="card-body">
                <!-- Loading placeholder -->
                <div id="loading-transfers-config" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando configuración de transferencias...</p>
                </div>
                
                <!-- Transfers configuration will be loaded here -->
                <div id="transfers-config-content" class="d-none"></div>
            </div>
        </div>
    `;
}

// Fetch transfers configuration from API
function fetchTransfersConfig() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/bot/transfers', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading transfers configuration');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('loading-transfers-config').classList.add('d-none');
        
        // Show configuration content
        const configContent = document.getElementById('transfers-config-content');
        configContent.classList.remove('d-none');
        
        // Load transfers configuration interface
        loadTransfersInterface(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockTransfersConfig();
    });
}

// Load transfers configuration interface
function loadTransfersInterface(config) {
    const configContent = document.getElementById('transfers-config-content');
    
    configContent.innerHTML = `
        <form id="transfers-config-form">
            <div class="mb-4">
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="enable-transfers" ${config.enableTransfers ? 'checked' : ''}>
                    <label class="form-check-label" for="enable-transfers">Habilitar transferencia a agentes humanos</label>
                </div>
                <div class="form-text">Cuando está habilitado, el bot podrá transferir llamadas a agentes humanos cuando sea necesario.</div>
            </div>
            
            <div id="transfers-settings" class="${config.enableTransfers ? '' : 'd-none'}">
                <div class="mb-4">
                    <h6>Situaciones para transferir</h6>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="transfer-on-request" ${config.transferOnRequest ? 'checked' : ''}>
                        <label class="form-check-label" for="transfer-on-request">Cuando el cliente lo solicita explícitamente</label>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="transfer-on-confusion" ${config.transferOnConfusion ? 'checked' : ''}>
                        <label class="form-check-label" for="transfer-on-confusion">Después de varios intentos sin entender al cliente</label>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="transfer-on-complex" ${config.transferOnComplex ? 'checked' : ''}>
                        <label class="form-check-label" for="transfer-on-complex">Ante consultas complejas que el bot no puede resolver</label>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="transfer-on-limit" ${config.transferOnLimit ? 'checked' : ''}>
                        <label class="form-check-label" for="transfer-on-limit">Al alcanzar el límite de turnos de conversación</label>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h6>Destinatarios de transferencias</h6>
                    <p class="text-muted small">Configura los números de teléfono a los que se transferirán las llamadas.</p>
                    
                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="mb-0">Números de transferencia</h6>
                                <button type="button" class="btn btn-sm btn-primary" id="add-transfer-number">
                                    <i class="fas fa-plus"></i> Añadir número
                                </button>
                            </div>
                            
                            <div id="transfer-numbers-container">
                                ${generateTransferNumbersHTML(config.transferNumbers || [])}
                            </div>
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
    
    // Initialize enable transfers toggle
    document.getElementById('enable-transfers').addEventListener('change', function() {
        const transfersSettings = document.getElementById('transfers-settings');
        if (this.checked) {
            transfersSettings.classList.remove('d-none');
        } else {
            transfersSettings.classList.add('d-none');
        }
    });
    
    // Initialize add transfer number button
    document.getElementById('add-transfer-number').addEventListener('click', function() {
        addTransferNumberRow();
    });
    
    // Initialize form submission
    document.getElementById('transfers-config-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTransfersConfig();
    });
}

// ELIMINADO: Función saveTransfersConfig
// Esta función ha sido eliminada para evitar conflictos
// con la función unificada de guardado

// Helper: Get transfer numbers from form
function getTransferNumbers() {
    const transferNumbers = [];
    const rows = document.querySelectorAll('.transfer-number-row');
    
    rows.forEach((row, index) => {
        const name = row.querySelector(`[name="transfer-name-${index}"]`).value;
        const phone = row.querySelector(`[name="transfer-phone-${index}"]`).value;
        const priority = row.querySelector(`[name="transfer-priority-${index}"]`).value;
        
        if (name && phone) {
            transferNumbers.push({
                name,
                phone,
                priority
            });
        }
    });
    
    return transferNumbers;
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

// Generate HTML for transfer numbers
function generateTransferNumbersHTML(transferNumbers) {
    if (!transferNumbers || transferNumbers.length === 0) {
        return `
            <div class="text-center py-3 text-muted">
                <p>No hay números de transferencia configurados.</p>
                <p class="small">Haz clic en "Añadir número" para configurar destinos de transferencia.</p>
            </div>
        `;
    }
    
    return transferNumbers.map((number, index) => `
        <div class="transfer-number-row row g-2 mb-2 align-items-center">
            <div class="col-md-4">
                <input type="text" class="form-control" placeholder="Nombre/Departamento" value="${number.name}" name="transfer-name-${index}">
            </div>
            <div class="col-md-4">
                <input type="tel" class="form-control" placeholder="Número de teléfono" value="${number.phone}" name="transfer-phone-${index}">
            </div>
            <div class="col-md-3">
                <select class="form-select" name="transfer-priority-${index}">
                    <option value="primary" ${number.priority === 'primary' ? 'selected' : ''}>Principal</option>
                    <option value="secondary" ${number.priority === 'secondary' ? 'selected' : ''}>Secundario</option>
                    <option value="fallback" ${number.priority === 'fallback' ? 'selected' : ''}>Respaldo</option>
                </select>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-sm btn-outline-danger remove-transfer-number" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Add new transfer number row
function addTransferNumberRow() {
    const container = document.getElementById('transfer-numbers-container');
    
    // If there's a placeholder message, remove it
    if (container.querySelector('.text-center')) {
        container.innerHTML = '';
    }
    
    // Generate a new index based on existing rows
    const rows = container.querySelectorAll('.transfer-number-row');
    const newIndex = rows.length;
    
    // Create new row
    const newRow = document.createElement('div');
    newRow.className = 'transfer-number-row row g-2 mb-2 align-items-center';
    newRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control" placeholder="Nombre/Departamento" name="transfer-name-${newIndex}">
        </div>
        <div class="col-md-4">
            <input type="tel" class="form-control" placeholder="Número de teléfono" name="transfer-phone-${newIndex}">
        </div>
        <div class="col-md-3">
            <select class="form-select" name="transfer-priority-${newIndex}">
                <option value="primary">Principal</option>
                <option value="secondary">Secundario</option>
                <option value="fallback">Respaldo</option>
            </select>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-sm btn-outline-danger remove-transfer-number" data-index="${newIndex}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(newRow);
    
    // Initialize the new remove button
    newRow.querySelector('.remove-transfer-number').addEventListener('click', function() {
        container.removeChild(newRow);
        
        // If no rows left, show placeholder
        if (container.querySelectorAll('.transfer-number-row').length === 0) {
            container.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <p>No hay números de transferencia configurados.</p>
                    <p class="small">Haz clic en "Añadir número" para configurar destinos de transferencia.</p>
                </div>
            `;
        }
    });
}

// Initialize remove transfer button handlers
function initRemoveTransferButtons() {
    document.querySelectorAll('.remove-transfer-number').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('.transfer-number-row');
            const container = document.getElementById('transfer-numbers-container');
            container.removeChild(row);
            
            // If no rows left, show placeholder
            if (container.querySelectorAll('.transfer-number-row').length === 0) {
                container.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <p>No hay números de transferencia configurados.</p>
                        <p class="small">Haz clic en "Añadir número" para configurar destinos de transferencia.</p>
                    </div>
                `;
            }
        });
    });
}

// Load mock data for demo purposes
function loadMockTransfersConfig() {
    // Hide loading indicator
    document.getElementById('loading-transfers-config').classList.add('d-none');
    
    // Show configuration content
    const configContent = document.getElementById('transfers-config-content');
    configContent.classList.remove('d-none');
    
    // Mock transfers configuration data
    const mockConfig = {
        enableTransfers: true,
        transferOnRequest: true,
        transferOnConfusion: true,
        transferOnComplex: true,
        transferOnLimit: false,
        transferNumbers: [
            {
                name: 'Atención al Cliente',
                phone: '+34600123456',
                priority: 'primary'
            },
            {
                name: 'Soporte Técnico',
                phone: '+34600654321',
                priority: 'secondary'
            },
            {
                name: 'Emergencias',
                phone: '+34600789012',
                priority: 'fallback'
            }
        ]
    };
    
    // Load transfers interface with mock data
    loadTransfersInterface(mockConfig);
}
