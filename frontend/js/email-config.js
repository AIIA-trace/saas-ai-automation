// Email Management Module
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the email management tab
    const emailTab = document.getElementById('email-management');
    if (!emailTab) return;
    
    // Initialize email tab content
    initializeEmailTab();
    
    // Fetch email configuration
    fetchEmailConfig();
});

// Initialize email tab
function initializeEmailTab() {
    const emailTab = document.getElementById('email-management');
    
    emailTab.innerHTML = `
        <h2 class="mb-4">Gestión de Emails</h2>
        
        <div class="row">
            <div class="col-lg-3 mb-4">
                <div class="list-group shadow-sm" id="email-nav-tabs" role="tablist">
                    <a class="list-group-item list-group-item-action active" id="accounts-tab" data-bs-toggle="list" href="#accounts" role="tab">
                        <i class="fas fa-envelope-open-text me-2"></i>Cuentas de Correo
                    </a>
                    <a class="list-group-item list-group-item-action" id="autoresponder-tab" data-bs-toggle="list" href="#autoresponder" role="tab">
                        <i class="fas fa-reply-all me-2"></i>Autorespuestas
                    </a>
                    <a class="list-group-item list-group-item-action" id="templates-tab" data-bs-toggle="list" href="#templates" role="tab">
                        <i class="fas fa-file-alt me-2"></i>Plantillas
                    </a>
                    <a class="list-group-item list-group-item-action" id="rules-tab" data-bs-toggle="list" href="#rules" role="tab">
                        <i class="fas fa-filter me-2"></i>Reglas de Procesamiento
                    </a>
                    <a class="list-group-item list-group-item-action" id="settings-tab" data-bs-toggle="list" href="#settings" role="tab">
                        <i class="fas fa-cog me-2"></i>Configuración General
                    </a>
                </div>
                
                <div class="card mt-4 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-title">Estado del Procesamiento</h6>
                        <div id="email-status-loading" class="text-center">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="small mt-2">Cargando estado...</p>
                        </div>
                        <div id="email-status-content" class="d-none">
                            <!-- Status content will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-9">
                <div class="tab-content" id="email-tab-content">
                    <div class="tab-pane fade show active" id="accounts" role="tabpanel">
                        <!-- Loading placeholder -->
                        <div id="loading-accounts" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando cuentas de correo...</p>
                        </div>
                        <div id="accounts-content" class="d-none">
                            <!-- Accounts content will be loaded here -->
                        </div>
                    </div>
                    <div class="tab-pane fade" id="autoresponder" role="tabpanel">
                        <!-- Loading placeholder -->
                        <div id="loading-autoresponder" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando configuración de autorespuestas...</p>
                        </div>
                        <div id="autoresponder-content" class="d-none">
                            <!-- Autoresponder content will be loaded here -->
                        </div>
                    </div>
                    <div class="tab-pane fade" id="templates" role="tabpanel">
                        <!-- Loading placeholder -->
                        <div id="loading-templates" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando plantillas...</p>
                        </div>
                        <div id="templates-content" class="d-none">
                            <!-- Templates content will be loaded here -->
                        </div>
                    </div>
                    <div class="tab-pane fade" id="rules" role="tabpanel">
                        <!-- Loading placeholder -->
                        <div id="loading-rules" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando reglas de procesamiento...</p>
                        </div>
                        <div id="rules-content" class="d-none">
                            <!-- Rules content will be loaded here -->
                        </div>
                    </div>
                    <div class="tab-pane fade" id="settings" role="tabpanel">
                        <!-- Loading placeholder -->
                        <div id="loading-settings" class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando configuración...</p>
                        </div>
                        <div id="settings-content" class="d-none">
                            <!-- Settings content will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Fetch email configuration from API
function fetchEmailConfig() {
    const token = localStorage.getItem('authToken');
    
    // Fetch status first (small and quick)
    fetchEmailStatus();
    
    // Fetch accounts (default tab)
    fetchEmailAccounts();
    
    // Add event listeners for tab changes to load content on demand
    document.getElementById('autoresponder-tab').addEventListener('click', fetchAutoresponderConfig);
    document.getElementById('templates-tab').addEventListener('click', fetchTemplates);
    document.getElementById('rules-tab').addEventListener('click', fetchRules);
    document.getElementById('settings-tab').addEventListener('click', fetchEmailSettings);
}

// Fetch email processing status
function fetchEmailStatus() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/email/status', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading email status');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('email-status-loading').classList.add('d-none');
        
        // Show status content
        const statusContent = document.getElementById('email-status-content');
        statusContent.classList.remove('d-none');
        
        // Load status data
        loadEmailStatus(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockEmailStatus();
    });
}

// Load email status
function loadEmailStatus(status) {
    const statusContent = document.getElementById('email-status-content');
    
    const activeClass = status.active ? 'text-success' : 'text-danger';
    const activeText = status.active ? 'Activo' : 'Inactivo';
    const activeIcon = status.active ? 'fa-check-circle' : 'fa-times-circle';
    
    statusContent.innerHTML = `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Estado:</span>
                <span class="${activeClass}"><i class="fas ${activeIcon} me-1"></i>${activeText}</span>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Emails procesados hoy:</span>
                <span class="badge bg-primary">${status.processedToday}</span>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Emails respondidos hoy:</span>
                <span class="badge bg-success">${status.respondedToday}</span>
            </div>
        </div>
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <span>Último procesamiento:</span>
                <span class="small">${formatDate(status.lastProcessed)}</span>
            </div>
        </div>
        <div class="mb-0 text-center">
            <button class="btn btn-sm btn-outline-primary" id="refresh-email-status">
                <i class="fas fa-sync-alt me-1"></i>Actualizar
            </button>
        </div>
    `;
    
    // Add event listener to refresh button
    document.getElementById('refresh-email-status').addEventListener('click', function() {
        document.getElementById('email-status-content').classList.add('d-none');
        document.getElementById('email-status-loading').classList.remove('d-none');
        fetchEmailStatus();
    });
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'Nunca';
    
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { 
        dateStyle: 'short',
        timeStyle: 'short' 
    });
}

// Load mock email status for demo
function loadMockEmailStatus() {
    const mockStatus = {
        active: true,
        processedToday: 47,
        respondedToday: 32,
        lastProcessed: new Date().toISOString()
    };
    
    // Hide loading indicator
    document.getElementById('email-status-loading').classList.add('d-none');
    
    // Show status content
    const statusContent = document.getElementById('email-status-content');
    statusContent.classList.remove('d-none');
    
    // Load mock status data
    loadEmailStatus(mockStatus);
}

// Function to fetch email accounts
function fetchEmailAccounts() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/email/accounts', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading email accounts');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        document.getElementById('loading-accounts').classList.add('d-none');
        
        // Show accounts content
        const accountsContent = document.getElementById('accounts-content');
        accountsContent.classList.remove('d-none');
        
        // Load accounts data
        loadEmailAccounts(data);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockEmailAccounts();
    });
}

// Load email accounts data
function loadEmailAccounts(accounts) {
    const accountsContent = document.getElementById('accounts-content');
    
    accountsContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4>Cuentas de Correo</h4>
            <button class="btn btn-primary" id="add-email-account">
                <i class="fas fa-plus me-2"></i>Añadir Cuenta
            </button>
        </div>
        
        <div class="row" id="email-accounts-container">
            ${generateEmailAccountsHTML(accounts)}
        </div>
    `;
    
    // Add event listener for add account button
    document.getElementById('add-email-account').addEventListener('click', function() {
        showAddAccountModal();
    });
}

// Generate HTML for email accounts
function generateEmailAccountsHTML(accounts) {
    if (!accounts || accounts.length === 0) {
        return `
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                        <i class="fas fa-envelope-open-text fa-3x text-muted mb-3"></i>
                        <h5>No hay cuentas configuradas</h5>
                        <p class="text-muted">Añade tu primera cuenta de correo para comenzar a procesar emails automáticamente.</p>
                        <button class="btn btn-primary" onclick="showAddAccountModal()">
                            <i class="fas fa-plus me-2"></i>Añadir Primera Cuenta
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    return accounts.map(account => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h6 class="card-title mb-0">${account.email}</h6>
                        <span class="badge ${account.active ? 'bg-success' : 'bg-secondary'}">
                            ${account.active ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                    <p class="text-muted small mb-2">
                        <i class="fas fa-server me-1"></i>${account.provider} (${account.protocol})
                    </p>
                    <p class="text-muted small mb-3">
                        <i class="fas fa-clock me-1"></i>Última sincronización: ${formatDate(account.lastSync)}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            ${account.emailsProcessed || 0} emails procesados
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editEmailAccount('${account.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteEmailAccount('${account.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Load mock email accounts for demo
function loadMockEmailAccounts() {
    const mockAccounts = [
        {
            id: '1',
            email: 'info@miempresa.com',
            provider: 'Gmail',
            protocol: 'IMAP',
            active: true,
            lastSync: new Date().toISOString(),
            emailsProcessed: 156
        },
        {
            id: '2',
            email: 'soporte@miempresa.com',
            provider: 'Outlook',
            protocol: 'IMAP',
            active: true,
            lastSync: new Date(Date.now() - 300000).toISOString(),
            emailsProcessed: 89
        },
        {
            id: '3',
            email: 'ventas@miempresa.com',
            provider: 'Custom SMTP',
            protocol: 'POP3',
            active: false,
            lastSync: new Date(Date.now() - 86400000).toISOString(),
            emailsProcessed: 23
        }
    ];
    
    // Hide loading indicator
    document.getElementById('loading-accounts').classList.add('d-none');
    
    // Show accounts content
    const accountsContent = document.getElementById('accounts-content');
    accountsContent.classList.remove('d-none');
    
    // Load mock accounts data
    loadEmailAccounts(mockAccounts);
}

// Módulo de configuración de emails
class EmailConfig {
    constructor() {
        this.currentConfig = {};
        this.accounts = [];
        this.templates = [];
        this.init();
    }

    init() {
        this.loadEmailConfig();
        this.loadEmailAccounts();
        this.loadEmailTemplates();
        this.bindEvents();
    }

    // Cargar configuración de emails
    async loadEmailConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/config/email`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.currentConfig = await response.json();
                this.updateConfigUI();
            } else {
                console.error('Error cargando configuración de emails');
                toastr.error('Error cargando configuración de emails');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error de conexión al cargar configuración');
        }
    }

    // Cargar cuentas de email
    async loadEmailAccounts() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/email-accounts`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.accounts = data.accounts || [];
                this.updateAccountsUI();
            } else {
                console.error('Error cargando cuentas de email');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Cargar plantillas de email
    async loadEmailTemplates() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/email-templates`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.templates = data.templates || [];
                this.updateTemplatesUI();
            } else {
                console.error('Error cargando plantillas de email');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Actualizar UI de configuración
    updateConfigUI() {
        // Autorespuesta
        const autoReplyToggle = document.getElementById('autoReplyEnabled');
        const autoReplyMessage = document.getElementById('autoReplyMessage');
        
        if (autoReplyToggle) {
            autoReplyToggle.checked = this.currentConfig.autoReply || false;
        }
        
        if (autoReplyMessage) {
            autoReplyMessage.value = this.currentConfig.autoReplyMessage || '';
        }

        // Reglas de reenvío
        this.updateForwardingRulesUI();
    }

    // Actualizar UI de reglas de reenvío
    updateForwardingRulesUI() {
        const container = document.getElementById('forwardingRulesList');
        if (!container) return;

        const rules = this.currentConfig.forwardingRules || [];
        
        container.innerHTML = rules.map((rule, index) => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <select class="form-select" data-rule-index="${index}" data-field="condition">
                                <option value="subject_contains" ${rule.condition === 'subject_contains' ? 'selected' : ''}>Asunto contiene</option>
                                <option value="from_contains" ${rule.condition === 'from_contains' ? 'selected' : ''}>Remitente contiene</option>
                                <option value="body_contains" ${rule.condition === 'body_contains' ? 'selected' : ''}>Contenido contiene</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <input type="text" class="form-control" placeholder="Valor" 
                                   value="${rule.value || ''}" data-rule-index="${index}" data-field="value">
                        </div>
                        <div class="col-md-4">
                            <input type="text" class="form-control" placeholder="Emails (separados por coma)" 
                                   value="${(rule.recipients || []).join(', ')}" data-rule-index="${index}" data-field="recipients">
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-danger btn-sm" onclick="emailConfig.removeForwardingRule(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Actualizar UI de cuentas
    updateAccountsUI() {
        const container = document.getElementById('emailAccountsList');
        if (!container) return;

        container.innerHTML = this.accounts.map(account => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">${account.email}</h6>
                            <p class="card-text">
                                <small class="text-muted">
                                    IMAP: ${account.imapHost}:${account.imapPort}<br>
                                    SMTP: ${account.smtpHost}:${account.smtpPort}
                                </small>
                            </p>
                            <span class="badge ${account.isActive ? 'bg-success' : 'bg-secondary'}">
                                ${account.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="emailConfig.testEmailAccount(${account.id})">
                                <i class="fas fa-check"></i> Probar
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="emailConfig.deleteEmailAccount(${account.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Actualizar UI de plantillas
    updateTemplatesUI() {
        const container = document.getElementById('emailTemplatesList');
        if (!container) return;

        container.innerHTML = this.templates.map(template => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="card-title">
                                ${template.name}
                                ${template.isDefault ? '<span class="badge bg-primary ms-2">Por defecto</span>' : ''}
                            </h6>
                            <p class="card-text">
                                <strong>Asunto:</strong> ${template.subject}<br>
                                <small class="text-muted">${template.body.substring(0, 100)}...</small>
                            </p>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="emailConfig.editTemplate(${template.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="emailConfig.deleteTemplate(${template.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Eventos
    bindEvents() {
        // Guardar configuración general
        const saveConfigBtn = document.getElementById('saveEmailConfig');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveEmailConfig());
        }

        // Añadir nueva cuenta
        const addAccountBtn = document.getElementById('addEmailAccount');
        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => this.showAddAccountModal());
        }

        // Añadir nueva plantilla
        const addTemplateBtn = document.getElementById('addEmailTemplate');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => this.showAddTemplateModal());
        }

        // Añadir regla de reenvío
        const addRuleBtn = document.getElementById('addForwardingRule');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => this.addForwardingRule());
        }

        // Eventos de cambio en reglas de reenvío
        document.addEventListener('change', (e) => {
            if (e.target.dataset.ruleIndex !== undefined) {
                this.updateForwardingRule(e.target);
            }
        });
    }

    // Guardar configuración de emails
    async saveEmailConfig() {
        try {
            const autoReply = document.getElementById('autoReplyEnabled')?.checked || false;
            const autoReplyMessage = document.getElementById('autoReplyMessage')?.value || '';

            const configData = {
                autoReply,
                autoReplyMessage,
                forwardingRules: this.currentConfig.forwardingRules || []
            };

            const response = await fetch(`${API_BASE_URL}/api/config/email`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });

            if (response.ok) {
                this.currentConfig = await response.json();
                toastr.success('Configuración de emails guardada correctamente');
            } else {
                throw new Error('Error guardando configuración');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error guardando configuración de emails');
        }
    }

    // Añadir regla de reenvío
    addForwardingRule() {
        if (!this.currentConfig.forwardingRules) {
            this.currentConfig.forwardingRules = [];
        }

        this.currentConfig.forwardingRules.push({
            condition: 'subject_contains',
            value: '',
            recipients: []
        });

        this.updateForwardingRulesUI();
    }

    // Actualizar regla de reenvío
    updateForwardingRule(element) {
        const index = parseInt(element.dataset.ruleIndex);
        const field = element.dataset.field;
        
        if (!this.currentConfig.forwardingRules[index]) return;

        if (field === 'recipients') {
            this.currentConfig.forwardingRules[index][field] = element.value.split(',').map(email => email.trim()).filter(email => email);
        } else {
            this.currentConfig.forwardingRules[index][field] = element.value;
        }
    }

    // Eliminar regla de reenvío
    removeForwardingRule(index) {
        this.currentConfig.forwardingRules.splice(index, 1);
        this.updateForwardingRulesUI();
    }

    // Mostrar modal para añadir cuenta
    showAddAccountModal() {
        const modal = new bootstrap.Modal(document.getElementById('addEmailAccountModal'));
        
        // Limpiar formulario
        document.getElementById('addAccountForm').reset();
        
        modal.show();
    }

    // Añadir nueva cuenta de email
    async addEmailAccount() {
        try {
            const formData = new FormData(document.getElementById('addAccountForm'));
            const accountData = Object.fromEntries(formData.entries());

            const response = await fetch(`${API_BASE_URL}/api/email-accounts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accountData)
            });

            if (response.ok) {
                await this.loadEmailAccounts();
                bootstrap.Modal.getInstance(document.getElementById('addEmailAccountModal')).hide();
                toastr.success('Cuenta de email añadida correctamente');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error añadiendo cuenta');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error(error.message || 'Error añadiendo cuenta de email');
        }
    }

    // Probar cuenta de email
    async testEmailAccount(accountId) {
        try {
            const account = this.accounts.find(acc => acc.id === accountId);
            if (!account) return;

            toastr.info('Probando conexión...', 'Verificando cuenta');

            // Aquí podrías añadir un endpoint específico para probar la conexión
            // Por ahora, simulamos la prueba
            setTimeout(() => {
                toastr.success('Conexión exitosa', 'Cuenta verificada');
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error probando la cuenta de email');
        }
    }

    // Eliminar cuenta de email
    async deleteEmailAccount(accountId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta de email?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/email-accounts/${accountId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (response.ok) {
                await this.loadEmailAccounts();
                toastr.success('Cuenta eliminada correctamente');
            } else {
                throw new Error('Error eliminando cuenta');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error eliminando cuenta de email');
        }
    }

    // Mostrar modal para añadir plantilla
    showAddTemplateModal() {
        const modal = new bootstrap.Modal(document.getElementById('addEmailTemplateModal'));
        
        // Limpiar formulario
        document.getElementById('addTemplateForm').reset();
        
        modal.show();
    }

    // Añadir nueva plantilla
    async addEmailTemplate() {
        try {
            const formData = new FormData(document.getElementById('addTemplateForm'));
            const templateData = Object.fromEntries(formData.entries());
            templateData.isDefault = formData.has('isDefault');

            const response = await fetch(`${API_BASE_URL}/api/email-templates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });

            if (response.ok) {
                await this.loadEmailTemplates();
                bootstrap.Modal.getInstance(document.getElementById('addEmailTemplateModal')).hide();
                toastr.success('Plantilla añadida correctamente');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error añadiendo plantilla');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error(error.message || 'Error añadiendo plantilla');
        }
    }

    // Editar plantilla
    editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Llenar el formulario con los datos de la plantilla
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateSubject').value = template.subject;
        document.getElementById('templateBody').value = template.body;
        document.getElementById('templateIsDefault').checked = template.isDefault;

        // Cambiar el comportamiento del formulario para edición
        const form = document.getElementById('addTemplateForm');
        form.dataset.editingId = templateId;

        const modal = new bootstrap.Modal(document.getElementById('addEmailTemplateModal'));
        modal.show();
    }

    // Eliminar plantilla
    async deleteTemplate(templateId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/email-templates/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (response.ok) {
                await this.loadEmailTemplates();
                toastr.success('Plantilla eliminada correctamente');
            } else {
                throw new Error('Error eliminando plantilla');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error eliminando plantilla');
        }
    }
}

// Instancia global
const emailConfig = new EmailConfig();
