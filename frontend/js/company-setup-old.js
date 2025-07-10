// Advanced Company Setup Module - Sector-Specific Configuration
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the company setup page
    const setupContainer = document.getElementById('company-setup-container');
    if (!setupContainer) return;
    
    // Initialize company setup wizard
    initializeCompanySetup();
});

// Company setup wizard with sector-specific configuration
function initializeCompanySetup() {
    const setupContainer = document.getElementById('company-setup-container');
    
    setupContainer.innerHTML = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-lg-3">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h6 class="card-title">Progreso de Configuración</h6>
                            <div class="setup-progress">
                                <div class="progress-step active" data-step="1">
                                    <div class="step-number">1</div>
                                    <div class="step-label">Información Básica</div>
                                </div>
                                <div class="progress-step" data-step="2">
                                    <div class="step-number">2</div>
                                    <div class="step-label">Sector y Servicios</div>
                                </div>
                                <div class="progress-step" data-step="3">
                                    <div class="step-number">3</div>
                                    <div class="step-label">Configuración IA</div>
                                </div>
                                <div class="progress-step" data-step="4">
                                    <div class="step-number">4</div>
                                    <div class="step-label">Integraciones</div>
                                </div>
                                <div class="progress-step" data-step="5">
                                    <div class="step-number">5</div>
                                    <div class="step-label">Pruebas</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-9">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div id="setup-content">
                                <!-- Dynamic content will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load first step
    loadSetupStep(1);
}

// Load specific setup step
function loadSetupStep(step) {
    const setupContent = document.getElementById('setup-content');
    
    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach(el => {
        el.classList.remove('active', 'completed');
        const stepNum = parseInt(el.dataset.step);
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });
    
    switch(step) {
        case 1:
            loadBasicInfoStep(setupContent);
            break;
        case 2:
            loadSectorServicesStep(setupContent);
            break;
        case 3:
            loadAIConfigStep(setupContent);
            break;
        case 4:
            loadIntegrationsStep(setupContent);
            break;
        case 5:
            loadTestingStep(setupContent);
            break;
    }
}

// Step 1: Basic Company Information
function loadBasicInfoStep(container) {
    container.innerHTML = `
        <h3 class="mb-4">Información Básica de la Empresa</h3>
        
        <form id="basic-info-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Nombre de la Empresa *</label>
                    <input type="text" class="form-control" id="companyName" required>
                    <div class="form-text">Este nombre será usado por la IA para identificarse</div>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Nombre Comercial</label>
                    <input type="text" class="form-control" id="tradeName">
                    <div class="form-text">Si es diferente al nombre legal</div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Teléfono Principal *</label>
                    <input type="tel" class="form-control" id="mainPhone" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Email de Contacto *</label>
                    <input type="email" class="form-control" id="contactEmail" required>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Dirección Completa</label>
                <textarea class="form-control" id="address" rows="2"></textarea>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Horario de Atención *</label>
                    <div class="row">
                        <div class="col-6">
                            <input type="time" class="form-control" id="openTime" required>
                            <div class="form-text">Apertura</div>
                        </div>
                        <div class="col-6">
                            <input type="time" class="form-control" id="closeTime" required>
                            <div class="form-text">Cierre</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Días de Operación *</label>
                    <div class="form-check-group">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="monday" value="1">
                            <label class="form-check-label" for="monday">L</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="tuesday" value="2">
                            <label class="form-check-label" for="tuesday">M</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="wednesday" value="3">
                            <label class="form-check-label" for="wednesday">X</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="thursday" value="4">
                            <label class="form-check-label" for="thursday">J</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="friday" value="5">
                            <label class="form-check-label" for="friday">V</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="saturday" value="6">
                            <label class="form-check-label" for="saturday">S</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="sunday" value="0">
                            <label class="form-check-label" for="sunday">D</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4">
                <label class="form-label">Números de Teléfono Adicionales</label>
                <div id="additional-phones">
                    <div class="input-group mb-2">
                        <input type="tel" class="form-control" placeholder="Número adicional">
                        <input type="text" class="form-control" placeholder="Descripción (ej: Sucursal Norte)">
                        <button class="btn btn-outline-danger" type="button" onclick="removePhoneField(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addPhoneField()">
                    <i class="fas fa-plus me-1"></i>Añadir Teléfono
                </button>
            </div>
            
            <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-secondary" disabled>Anterior</button>
                <button type="submit" class="btn btn-primary">Siguiente: Sector y Servicios</button>
            </div>
        </form>
    `;
    
    // Add form submission handler
    document.getElementById('basic-info-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateBasicInfo()) {
            saveBasicInfo();
            loadSetupStep(2);
        }
    });
}

// Step 2: Sector and Services Configuration
function loadSectorServicesStep(container) {
    container.innerHTML = `
        <h3 class="mb-4">Sector y Servicios</h3>
        
        <form id="sector-services-form">
            <div class="mb-4">
                <label class="form-label">Sector de la Empresa *</label>
                <select class="form-select" id="businessSector" required onchange="loadSectorTemplate()">
                    <option value="">Selecciona tu sector</option>
                    <option value="restaurant">Restaurante/Pizzería</option>
                    <option value="beauty">Peluquería/Estética</option>
                    <option value="retail">Comercio/Tienda</option>
                    <option value="healthcare">Salud/Clínica</option>
                    <option value="automotive">Automoción</option>
                    <option value="legal">Legal/Abogacía</option>
                    <option value="real_estate">Inmobiliaria</option>
                    <option value="education">Educación</option>
                    <option value="fitness">Gimnasio/Fitness</option>
                    <option value="home_services">Servicios del Hogar</option>
                    <option value="manufacturing">Manufactura/Industria</option>
                    <option value="technology">Tecnología/IT</option>
                    <option value="other">Otro</option>
                </select>
            </div>
            
            <div id="sector-specific-config" class="mb-4">
                <!-- Sector-specific configuration will be loaded here -->
            </div>
            
            <div class="mb-4">
                <label class="form-label">Descripción de la Empresa *</label>
                <textarea class="form-control" id="companyDescription" rows="3" required 
                    placeholder="Describe brevemente qué hace tu empresa, productos/servicios principales..."></textarea>
                <div class="form-text">Esta información ayudará a la IA a entender mejor tu negocio</div>
            </div>
            
            <div class="mb-4">
                <label class="form-label">Productos/Servicios Principales</label>
                <div id="products-services">
                    <div class="input-group mb-2">
                        <input type="text" class="form-control" placeholder="Nombre del producto/servicio">
                        <input type="text" class="form-control" placeholder="Precio (opcional)">
                        <select class="form-select">
                            <option value="available">Disponible</option>
                            <option value="limited">Stock Limitado</option>
                            <option value="unavailable">No Disponible</option>
                        </select>
                        <button class="btn btn-outline-danger" type="button" onclick="removeProductField(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addProductField()">
                    <i class="fas fa-plus me-1"></i>Añadir Producto/Servicio
                </button>
            </div>
            
            <div class="mb-4">
                <label class="form-label">Preguntas Frecuentes</label>
                <div id="faq-section">
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="mb-2">
                                <input type="text" class="form-control" placeholder="Pregunta frecuente">
                            </div>
                            <div class="mb-2">
                                <textarea class="form-control" rows="2" placeholder="Respuesta que debe dar la IA"></textarea>
                            </div>
                            <button class="btn btn-outline-danger btn-sm" type="button" onclick="removeFAQField(this)">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addFAQField()">
                    <i class="fas fa-plus me-1"></i>Añadir FAQ
                </button>
            </div>
            
            <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-secondary" onclick="loadSetupStep(1)">Anterior</button>
                <button type="submit" class="btn btn-primary">Siguiente: Configuración IA</button>
            </div>
        </form>
    `;
    
    // Add form submission handler
    document.getElementById('sector-services-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateSectorServices()) {
            saveSectorServices();
            loadSetupStep(3);
        }
    });
}

// Load sector-specific template
function loadSectorTemplate() {
    const sector = document.getElementById('businessSector').value;
    const configContainer = document.getElementById('sector-specific-config');
    
    if (!sector) {
        configContainer.innerHTML = '';
        return;
    }
    
    const templates = {
        restaurant: {
            title: 'Configuración para Restaurante',
            fields: [
                { type: 'checkbox', name: 'takeaway', label: 'Servicio para llevar' },
                { type: 'checkbox', name: 'delivery', label: 'Servicio a domicilio' },
                { type: 'checkbox', name: 'reservations', label: 'Reservas de mesa' },
                { type: 'number', name: 'maxCapacity', label: 'Capacidad máxima', placeholder: 'Número de comensales' },
                { type: 'time', name: 'lastOrder', label: 'Última hora de pedidos' }
            ]
        },
        beauty: {
            title: 'Configuración para Peluquería/Estética',
            fields: [
                { type: 'number', name: 'appointmentDuration', label: 'Duración promedio cita (minutos)', placeholder: '60' },
                { type: 'checkbox', name: 'walkIns', label: 'Acepta clientes sin cita' },
                { type: 'text', name: 'specialties', label: 'Especialidades', placeholder: 'Corte, color, tratamientos...' }
            ]
        },
        retail: {
            title: 'Configuración para Comercio',
            fields: [
                { type: 'checkbox', name: 'onlineOrders', label: 'Pedidos online' },
                { type: 'checkbox', name: 'homeDelivery', label: 'Entrega a domicilio' },
                { type: 'checkbox', name: 'clickAndCollect', label: 'Click & Collect' },
                { type: 'text', name: 'paymentMethods', label: 'Métodos de pago', placeholder: 'Efectivo, tarjeta, transferencia...' }
            ]
        }
    };
    
    const template = templates[sector];
    if (!template) {
        configContainer.innerHTML = '<div class="alert alert-info">Configuración genérica aplicada</div>';
        return;
    }
    
    let html = `<div class="card"><div class="card-header"><h6>${template.title}</h6></div><div class="card-body">`;
    
    template.fields.forEach(field => {
        if (field.type === 'checkbox') {
            html += `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="${field.name}">
                    <label class="form-check-label" for="${field.name}">${field.label}</label>
                </div>
            `;
        } else {
            html += `
                <div class="mb-3">
                    <label class="form-label">${field.label}</label>
                    <input type="${field.type}" class="form-control" id="${field.name}" placeholder="${field.placeholder || ''}">
                </div>
            `;
        }
    });
    
    html += '</div></div>';
    configContainer.innerHTML = html;
}

// Helper functions for dynamic fields
function addPhoneField() {
    const container = document.getElementById('additional-phones');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="tel" class="form-control" placeholder="Número adicional">
        <input type="text" class="form-control" placeholder="Descripción (ej: Sucursal Norte)">
        <button class="btn btn-outline-danger" type="button" onclick="removePhoneField(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function removePhoneField(button) {
    button.closest('.input-group').remove();
}

function addProductField() {
    const container = document.getElementById('products-services');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="Nombre del producto/servicio">
        <input type="text" class="form-control" placeholder="Precio (opcional)">
        <select class="form-select">
            <option value="available">Disponible</option>
            <option value="limited">Stock Limitado</option>
            <option value="unavailable">No Disponible</option>
        </select>
        <button class="btn btn-outline-danger" type="button" onclick="removeProductField(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeProductField(button) {
    button.closest('.input-group').remove();
}

function addFAQField() {
    const container = document.getElementById('faq-section');
    const div = document.createElement('div');
    div.className = 'card mb-2';
    div.innerHTML = `
        <div class="card-body">
            <div class="mb-2">
                <input type="text" class="form-control" placeholder="Pregunta frecuente">
            </div>
            <div class="mb-2">
                <textarea class="form-control" rows="2" placeholder="Respuesta que debe dar la IA"></textarea>
            </div>
            <button class="btn btn-outline-danger btn-sm" type="button" onclick="removeFAQField(this)">
                <i class="fas fa-trash me-1"></i>Eliminar
            </button>
        </div>
    `;
    container.appendChild(div);
}

function removeFAQField(button) {
    button.closest('.card').remove();
}

// Validation functions
function validateBasicInfo() {
    const requiredFields = ['companyName', 'mainPhone', 'contactEmail', 'openTime', 'closeTime'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    // Check if at least one day is selected
    const days = document.querySelectorAll('input[type="checkbox"][id$="day"], input[type="checkbox"][value]');
    const hasSelectedDay = Array.from(days).some(day => day.checked);
    if (!hasSelectedDay) {
        alert('Debes seleccionar al menos un día de operación');
        isValid = false;
    }
    
    return isValid;
}

function validateSectorServices() {
    const requiredFields = ['businessSector', 'companyDescription'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Save functions (to be implemented with API calls)
function saveBasicInfo() {
    // Implementation for saving basic info
    console.log('Saving basic info...');
}

function saveSectorServices() {
    // Implementation for saving sector and services
    console.log('Saving sector and services...');
}
