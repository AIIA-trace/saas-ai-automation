/**
 * Professional Company Setup Module
 * Handles dynamic company configuration based on business sector
 */

class CompanySetup {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.formData = {};
        this.init();
    }

    init() {
        this.renderSetupWizard();
        this.loadStep(1);
    }

    /**
     * Render the main setup wizard structure
     */
    renderSetupWizard() {
        const container = document.getElementById('company-setup-container');
        container.innerHTML = `
            <div class="row">
                <!-- Progress Sidebar -->
                <div class="col-lg-3">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0">
                                <i class="fas fa-list-check me-2"></i>Progreso de Configuración
                            </h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="setup-progress">
                                ${this.generateProgressSteps()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="col-lg-9">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0" id="step-title">Configuración Empresarial</h5>
                                <span class="badge bg-primary" id="step-counter">Paso 1 de ${this.totalSteps}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="step-content">
                                <!-- Step content will be loaded here -->
                            </div>
                        </div>
                        <div class="card-footer bg-white">
                            <div class="d-flex justify-content-between">
                                <button class="btn btn-outline-secondary" id="prev-btn" onclick="companySetup.previousStep()" disabled>
                                    <i class="fas fa-arrow-left me-2"></i>Anterior
                                </button>
                                <button class="btn btn-primary" id="next-btn" onclick="companySetup.nextStep()">
                                    Siguiente<i class="fas fa-arrow-right ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate progress steps
     */
    generateProgressSteps() {
        const steps = [
            { number: 1, label: 'Información Básica', icon: 'fa-building' },
            { number: 2, label: 'Sector y Servicios', icon: 'fa-tags' },
            { number: 3, label: 'Configuración IA', icon: 'fa-robot' },
            { number: 4, label: 'Integraciones', icon: 'fa-plug' },
            { number: 5, label: 'Finalizar', icon: 'fa-check-circle' }
        ];

        return steps.map(step => {
            const isActive = step.number === this.currentStep;
            const isCompleted = step.number < this.currentStep;
            const statusClass = isCompleted ? 'completed' : (isActive ? 'active' : '');

            return `
                <div class="progress-step ${statusClass}" onclick="companySetup.goToStep(${step.number})">
                    <div class="step-number">${step.number}</div>
                    <div class="step-label">
                        <i class="fas ${step.icon} me-2"></i>${step.label}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Load specific step content
     */
    loadStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateProgress();
        this.updateButtons();

        const stepContent = document.getElementById('step-content');
        const stepTitle = document.getElementById('step-title');
        const stepCounter = document.getElementById('step-counter');

        stepCounter.textContent = `Paso ${stepNumber} de ${this.totalSteps}`;

        switch(stepNumber) {
            case 1:
                stepTitle.textContent = 'Información Básica de la Empresa';
                stepContent.innerHTML = this.renderBasicInfoStep();
                break;
            case 2:
                stepTitle.textContent = 'Sector y Servicios';
                stepContent.innerHTML = this.renderSectorStep();
                break;
            case 3:
                stepTitle.textContent = 'Configuración de IA';
                stepContent.innerHTML = this.renderAIConfigStep();
                break;
            case 4:
                stepTitle.textContent = 'Integraciones Externas';
                stepContent.innerHTML = this.renderIntegrationsStep();
                break;
            case 5:
                stepTitle.textContent = 'Finalizar Configuración';
                stepContent.innerHTML = this.renderFinalStep();
                break;
        }

        // Load existing data if available
        this.loadFormData();
    }

    /**
     * Render basic info step
     */
    renderBasicInfoStep() {
        return `
            <div class="fade-in">
                <p class="text-muted mb-4">Proporciona la información básica de tu empresa para personalizar el sistema.</p>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Nombre de la Empresa *</label>
                            <input type="text" class="form-control" id="companyName" placeholder="Ej: Restaurante El Buen Sabor" required>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Teléfono Principal *</label>
                            <input type="tel" class="form-control" id="mainPhone" placeholder="+34 123 456 789" required>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Email de Contacto *</label>
                            <input type="email" class="form-control" id="contactEmail" placeholder="contacto@empresa.com" required>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Sitio Web</label>
                            <input type="url" class="form-control" id="website" placeholder="https://www.empresa.com">
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Dirección</label>
                    <textarea class="form-control" id="address" rows="2" placeholder="Calle Principal 123, Ciudad, Código Postal"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Horario de Atención</label>
                            <select class="form-select" id="businessHours">
                                <option value="9-18">9:00 - 18:00</option>
                                <option value="8-20">8:00 - 20:00</option>
                                <option value="10-22">10:00 - 22:00</option>
                                <option value="24h">24 Horas</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Días Laborables</label>
                            <div class="form-check-group">
                                ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => `
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="checkbox" id="day${index}" value="${index}" ${index < 5 ? 'checked' : ''}>
                                        <label class="form-check-label" for="day${index}">${day}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render sector selection step
     */
    renderSectorStep() {
        return `
            <div class="fade-in">
                <p class="text-muted mb-4">Selecciona el sector de tu empresa para personalizar las funcionalidades del sistema.</p>
                
                <div class="mb-4">
                    <label class="form-label">Sector Empresarial *</label>
                    <select class="form-select" id="businessSector" onchange="companySetup.onSectorChange()" required>
                        <option value="">Selecciona un sector...</option>
                        <option value="restaurant">Restaurante / Bar</option>
                        <option value="beauty">Peluquería / Estética</option>
                        <option value="retail">Comercio / Tienda</option>
                        <option value="medical">Clínica / Médico</option>
                        <option value="automotive">Taller / Automóvil</option>
                        <option value="professional">Servicios Profesionales</option>
                        <option value="other">Otro</option>
                    </select>
                </div>

                <div id="sector-specific-config">
                    <!-- Sector-specific configuration will be loaded here -->
                </div>
            </div>
        `;
    }

    /**
     * Handle sector change
     */
    onSectorChange() {
        const sector = document.getElementById('businessSector').value;
        const configContainer = document.getElementById('sector-specific-config');
        
        if (!sector) {
            configContainer.innerHTML = '';
            return;
        }

        configContainer.innerHTML = this.getSectorSpecificConfig(sector);
    }

    /**
     * Get sector-specific configuration
     */
    getSectorSpecificConfig(sector) {
        const configs = {
            restaurant: `
                <div class="sector-config-card">
                    <h6><i class="fas fa-utensils me-2"></i>Configuración para Restaurante</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Tipo de Servicio</label>
                                <div class="form-check-group">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="takeaway" value="takeaway">
                                        <label class="form-check-label" for="takeaway">Para llevar</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="delivery" value="delivery">
                                        <label class="form-check-label" for="delivery">Domicilio</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="reservation" value="reservation">
                                        <label class="form-check-label" for="reservation">Reservas</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Capacidad (personas)</label>
                                <input type="number" class="form-control" id="capacity" placeholder="50">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            beauty: `
                <div class="sector-config-card">
                    <h6><i class="fas fa-cut me-2"></i>Configuración para Peluquería</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Servicios Principales</label>
                                <div class="form-check-group">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="haircut" value="haircut" checked>
                                        <label class="form-check-label" for="haircut">Corte</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="coloring" value="coloring">
                                        <label class="form-check-label" for="coloring">Tinte</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="styling" value="styling">
                                        <label class="form-check-label" for="styling">Peinado</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Duración Cita Promedio (min)</label>
                                <input type="number" class="form-control" id="avgAppointmentDuration" placeholder="60">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            retail: `
                <div class="sector-config-card">
                    <h6><i class="fas fa-store me-2"></i>Configuración para Comercio</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Tipo de Productos</label>
                                <input type="text" class="form-control" id="productTypes" placeholder="Ej: Ropa, Electrónicos, Alimentación">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Gestión de Stock</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="stockManagement" value="yes">
                                    <label class="form-check-label" for="stockManagement">Activar gestión de inventario</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        return configs[sector] || `
            <div class="sector-config-card">
                <h6><i class="fas fa-cog me-2"></i>Configuración General</h6>
                <div class="mb-3">
                    <label class="form-label">Describe tu negocio</label>
                    <textarea class="form-control" id="businessDescription" rows="3" placeholder="Describe los servicios o productos que ofreces..."></textarea>
                </div>
            </div>
        `;
    }

    /**
     * Render AI configuration step
     */
    renderAIConfigStep() {
        return `
            <div class="fade-in">
                <p class="text-muted mb-4">Configura cómo debe comportarse la IA al atender llamadas y emails.</p>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Personalidad del Bot</label>
                            <select class="form-select" id="botPersonality">
                                <option value="professional">Profesional</option>
                                <option value="friendly">Amigable</option>
                                <option value="formal">Formal</option>
                                <option value="casual">Casual</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Idioma Principal</label>
                            <select class="form-select" id="primaryLanguage">
                                <option value="es">Español</option>
                                <option value="en">Inglés</option>
                                <option value="fr">Francés</option>
                                <option value="de">Alemán</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Mensaje de Bienvenida</label>
                    <textarea class="form-control" id="welcomeMessage" rows="3" placeholder="Hola, gracias por llamar a [EMPRESA]. ¿En qué puedo ayudarte?"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">Preguntas Frecuentes</label>
                    <div id="faq-container">
                        <div class="input-group mb-2">
                            <input type="text" class="form-control" placeholder="Pregunta" id="faq-question-0">
                            <input type="text" class="form-control" placeholder="Respuesta" id="faq-answer-0">
                            <button class="btn btn-outline-danger" type="button" onclick="companySetup.removeFAQ(0)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm" onclick="companySetup.addFAQ()">
                        <i class="fas fa-plus me-1"></i>Agregar FAQ
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render integrations step
     */
    renderIntegrationsStep() {
        return `
            <div class="fade-in">
                <p class="text-muted mb-4">Conecta tu sistema con herramientas externas para mayor funcionalidad.</p>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm mb-3">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    <i class="fas fa-calendar-alt fa-2x text-primary me-3"></i>
                                    <div>
                                        <h6 class="mb-0">Google Calendar</h6>
                                        <small class="text-muted">Gestión de citas y reservas</small>
                                    </div>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="googleCalendar">
                                    <label class="form-check-label" for="googleCalendar">Activar integración</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm mb-3">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    <i class="fas fa-envelope fa-2x text-success me-3"></i>
                                    <div>
                                        <h6 class="mb-0">Email Marketing</h6>
                                        <small class="text-muted">Automatización de emails</small>
                                    </div>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="emailMarketing">
                                    <label class="form-check-label" for="emailMarketing">Activar integración</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Nota:</strong> Las integraciones se configurarán después de completar la configuración inicial.
                </div>
            </div>
        `;
    }

    /**
     * Render final step
     */
    renderFinalStep() {
        return `
            <div class="fade-in text-center">
                <i class="fas fa-check-circle fa-4x text-success mb-4"></i>
                <h3 class="mb-3">¡Configuración Completada!</h3>
                <p class="text-muted mb-4">Tu sistema de IA está listo para comenzar a funcionar.</p>
                
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <h6 class="card-title">Resumen de Configuración</h6>
                                <div id="config-summary">
                                    <!-- Summary will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-4">
                    <button class="btn btn-success btn-lg me-3" onclick="companySetup.finishSetup()">
                        <i class="fas fa-rocket me-2"></i>Activar Sistema
                    </button>
                    <button class="btn btn-outline-primary" onclick="companySetup.goToStep(1)">
                        <i class="fas fa-edit me-2"></i>Revisar Configuración
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Navigation methods
     */
    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStep();
            if (this.currentStep < this.totalSteps) {
                this.loadStep(this.currentStep + 1);
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.loadStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.loadStep(stepNumber);
        }
    }

    /**
     * Update progress and buttons
     */
    updateProgress() {
        this.renderSetupWizard();
    }

    updateButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        prevBtn.disabled = this.currentStep === 1;
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-block';
            nextBtn.innerHTML = 'Siguiente<i class="fas fa-arrow-right ms-2"></i>';
        }
    }

    /**
     * Validation and data handling
     */
    validateCurrentStep() {
        // Basic validation - can be expanded
        const requiredFields = document.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    saveCurrentStep() {
        // Save current step data to formData object
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                this.formData[input.id] = input.checked;
            } else {
                this.formData[input.id] = input.value;
            }
        });
    }

    loadFormData() {
        // Load saved data into form fields
        Object.keys(this.formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.formData[key];
                } else {
                    element.value = this.formData[key];
                }
            }
        });
    }

    /**
     * FAQ management
     */
    addFAQ() {
        const container = document.getElementById('faq-container');
        const index = container.children.length;
        
        const faqHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control" placeholder="Pregunta" id="faq-question-${index}">
                <input type="text" class="form-control" placeholder="Respuesta" id="faq-answer-${index}">
                <button class="btn btn-outline-danger" type="button" onclick="companySetup.removeFAQ(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', faqHTML);
    }

    removeFAQ(index) {
        const element = document.querySelector(`#faq-question-${index}`).closest('.input-group');
        element.remove();
    }

    /**
     * Finish setup
     */
    async finishSetup() {
        this.saveCurrentStep();
        
        try {
            // Save configuration to localStorage and/or API
            localStorage.setItem('companyConfig', JSON.stringify(this.formData));
            
            // Show success message
            this.showSuccessMessage();
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showErrorMessage('Error al guardar la configuración. Inténtalo de nuevo.');
        }
    }

    showSuccessMessage() {
        const alertHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <strong>¡Éxito!</strong> Configuración guardada correctamente. Redirigiendo al dashboard...
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.getElementById('step-content').insertAdjacentHTML('afterbegin', alertHTML);
    }

    showErrorMessage(message) {
        const alertHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.getElementById('step-content').insertAdjacentHTML('afterbegin', alertHTML);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.companySetup = new CompanySetup();
});
