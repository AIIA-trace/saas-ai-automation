/**
 * Dashboard Simple - MVP Version
 * Contiene las 4 pestañas centralizadas para el MVP del agente de IA
 */

/**
 * Función para adaptar el dashboard al contexto "otro" de forma simplificada
 * @param {Object} config - Configuración de la empresa
 */
function adaptOtherContextSimple(config) {
    console.log('🚀 Iniciando adaptación simple del dashboard para MVP');
    
    try {
        // Crear las pestañas del MVP centralizadas
        createSimpleTabs();
        
        // Crear el contenido de las pestañas
        createTabsContent();
        
        // Cargar datos iniciales
        loadSimpleData(config);
        
        // Cargar datos existentes
        loadExistingData();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar funcionalidades adicionales (logout, toggle sidebar, etc.)
        setupAdditionalFeatures();
        
        // Configurar funcionalidades de la cuenta
        setupAccountFeatures();
        
        // Configurar funcionalidades de facturación
        setupBillingFeatures();
        
        // Cargar estado del bot
        loadBotStatus();
        
        // Configurar selector de horario comercial
        setupBusinessHoursSelector();
        
        // Inicializar gestor de preguntas frecuentes
        setupFaqManager();
        
        // Configurar carga de archivos
        setupFileUploadHandlers();
        
        // Inicializar sistema de seguimiento de uso para el usuario actual
        if (window.UsageTracker) {
            // Obtener el ID del usuario actual
            const userId = window.UsageTracker.getCurrentUserId();
            console.log(`📊 Inicializando sistema de seguimiento de uso para el usuario ${userId}...`);
            
            // Inicializar el sistema de seguimiento
            window.UsageTracker.initialize();
            
            // Actualizar la UI con los datos del usuario
            window.UsageTracker.updateUI();
            
            console.log(`✅ Sistema de seguimiento de uso inicializado para el usuario ${userId}`);
        }
        
        console.log('✅ Dashboard simple inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error al configurar dashboard MVP:', error);
        toastr.error('Error al configurar el dashboard', 'Error');
    }
}

/**
 * Crear las pestañas del MVP centralizadas
 */
function createSimpleTabs() {
    console.log('📋 Creando pestañas centralizadas del MVP...');
    
    const tabsContainer = document.getElementById('sector-nav-tabs');
    if (!tabsContainer) {
        console.error(' No se encontró el contenedor de pestañas');
        return;
    }
    
    // Crear pestañas dinámicamente con nueva estructura
    tabsContainer.innerHTML = `
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="calls-tab" data-bs-toggle="tab" data-bs-target="#calls-content" type="button" role="tab" aria-controls="calls-content" aria-selected="true">
                <i class="fas fa-phone me-2"></i>Registro de Llamadas
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="emails-tab" data-bs-toggle="tab" data-bs-target="#emails-content" type="button" role="tab" aria-controls="emails-content" aria-selected="false">
                <i class="fas fa-envelope me-2"></i>Gestión de Emails
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="call-bot-tab" data-bs-toggle="tab" data-bs-target="#call-bot-content" type="button" role="tab" aria-controls="call-bot-content" aria-selected="false">
                <i class="fas fa-robot me-2"></i>Configuración del Bot
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="account-tab" data-bs-toggle="tab" data-bs-target="#account-content" type="button" role="tab" aria-controls="account-content" aria-selected="false">
                <i class="fas fa-user-cog me-2"></i>Mi Cuenta
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="billing-tab" data-bs-toggle="tab" data-bs-target="#billing-content" type="button" role="tab" aria-controls="billing-content" aria-selected="false">
                <i class="fas fa-credit-card me-2"></i>Facturación
            </button>
        </li>
    `;
    
    // Mostrar el contenedor de pestañas
    document.getElementById('sector-nav-tabs-container').classList.remove('d-none');
    
    console.log('✅ Pestañas centralizadas del MVP creadas');
}

/**
 * Agregar estilos CSS para el dashboard
 */
function addDashboardStyles() {
    // Verificar si los estilos ya existen
    if (document.getElementById('dashboard-styles')) return;
    
    // Crear elemento de estilo
    const styleEl = document.createElement('style');
    styleEl.id = 'dashboard-styles';
    styleEl.textContent = `
        .file-status {
            margin-top: 5px;
            min-height: 20px;
        }
        .file-status small {
            font-size: 0.75rem;
            line-height: 1.2;
        }
        .form-section {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #eee;
        }
        .form-section:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .form-section h6 {
            margin-bottom: 1rem;
            color: #495057;
        }
        
        /* Estilos para el widget de resumen de uso */
        .usage-summary-widget {
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.1);
        }
        
        .usage-summary-widget:hover {
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        
        .usage-summary-widget .progress {
            border-radius: 4px;
            margin-top: 2px;
            margin-bottom: 8px;
            background-color: #f0f0f0;
        }
        
        /* Estilo para resaltar secciones */
        .highlight-section {
            animation: highlight-pulse 2s ease;
        }
        
        @keyframes highlight-pulse {
            0% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(13, 110, 253, 0); }
            100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); }
        }
        
        /* Estilos para el plan-usage-section */
        #plan-usage-section {
            transition: all 0.3s ease;
            border-radius: 8px;
        }
        
        #plan-usage-section.highlight-section {
            background-color: rgba(13, 110, 253, 0.05);
        }
    `;
    
    // Agregar estilos al head
    document.head.appendChild(styleEl);
}

/**
 * Crear el contenido de la pestaña Registro de Llamadas
 * @returns {string} HTML de la pestaña
 */
function createCallsTabContent() {
    return `
        <!-- 1. Registro de Llamadas -->
        <div class="tab-pane active animate-fadeIn" id="calls-content" role="tabpanel" aria-labelledby="calls-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <!-- Registro de Llamadas -->
                <div class="row">
                    <div class="col-12">
                        <div class="dashboard-card">
                            <div class="card-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="card-title"><i class="fas fa-phone me-2"></i>Registro de Llamadas</h5>
                                    <button class="btn-dashboard-primary" id="refresh-calls-btn">
                                        <i class="fas fa-sync-alt me-2"></i>Actualizar
                                    </button>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <!-- Filtros de Clasificación -->
                                <div class="filter-container">
                                    <div class="row align-items-center">
                                        <div class="col-md-7">
                                            <div class="d-flex align-items-center flex-wrap">
                                                <span class="me-3 text-secondary fw-medium">Filtrar por:</span>
                                                <div class="filter-option">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-all" checked>
                                                    <label class="form-check-label" for="filter-calls-all">Todas</label>
                                                </div>
                                                <div class="filter-option">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-pendientes">
                                                    <label class="form-check-label" for="filter-calls-pendientes">Pendientes</label>
                                                </div>
                                                <div class="filter-option">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-gestionadas">
                                                    <label class="form-check-label" for="filter-calls-gestionadas">Gestionadas</label>
                                                </div>
                                                <div class="filter-option">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-importantes">
                                                    <label class="form-check-label" for="filter-calls-importantes">Importantes</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-5 text-md-end mt-2 mt-md-0">
                                            <small class="text-muted"><i class="far fa-clock me-1"></i>Última actualización: <span id="last-update-time">2024-02-20 12:15</span></small>
                                        </div>
                                    </div>
                                </div>
                                
                                
                                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; overflow-x: hidden;">
                                    <table class="dashboard-table" style="width: 100%; table-layout: fixed;">
                                        <thead>
                                            <tr>
                                                <th style="width: 70px">Gestionado</th>
                                                <th style="width: 100px">Fecha</th>
                                                <th style="width: 110px">Número</th>
                                                <th style="width: 130px">Clasificación IA</th>
                                                <th style="width: auto; min-width: 250px">Resumen</th>
                                                <th style="width: 70px">Duración</th>
                                                <th style="width: 90px">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="calls-table-body">
                                            <!-- Las llamadas se cargarán dinámicamente -->

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crear el contenido de la pestaña Gestión de Emails
 * @returns {string} HTML de la pestaña
 */
function createEmailsTabContent() {
    return `
        <!-- 2. Gestión de Emails -->
        <div class="tab-pane animate-fadeIn" id="emails-content" role="tabpanel" aria-labelledby="emails-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <div class="dashboard-card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title"><i class="fas fa-envelope me-2"></i>Gestión de Emails <span class="badge-dashboard badge-primary ms-2" id="email-count">0</span></h5>
                            <div>
                                <button class="btn-dashboard-primary" id="refresh-emails-btn">
                                    <i class="fas fa-sync me-2"></i>Actualizar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <!-- Filtros de emails -->
                        <div class="dashboard-filters p-3 border-bottom">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="dashboard-filter-group">
                                        <span class="me-2">Filtrar por:</span>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-all" checked>
                                            <label class="form-check-label" for="filter-emails-all">Todos</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-unread">
                                            <label class="form-check-label" for="filter-emails-unread">No leídos</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-important">
                                            <label class="form-check-label" for="filter-emails-important">Importantes</label>
                                        </div>
                                        <div class="form-check form-check-inline">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-spam">
                                            <label class="form-check-label" for="filter-emails-spam">Spam</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="input-group">
                                        <input type="text" class="form-control" placeholder="Buscar emails..." id="email-search-input">
                                        <button class="btn btn-outline-primary" type="button" id="email-search-btn">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        
                        <!-- Lista de emails -->
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto; overflow-x: hidden;">
                            <table class="dashboard-table" style="width: 100%; table-layout: fixed;">
                                <thead>
                                    <tr>
                                        <th style="width: 30px; text-align: center"><i class="fas fa-star"></i></th>
                                        <th style="width: 160px">Remitente</th>
                                        <th style="width: auto; min-width: 300px">Asunto</th>
                                        <th style="width: 90px">Fecha</th>
                                        <th style="width: 70px; text-align: center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="emails-table-body">
                                     <!-- Los emails se cargarán dinámicamente -->
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Paginación -->
                        <div class="d-flex justify-content-between align-items-center p-3 border-top">
                            <div>
                                <small class="text-muted">Mostrando 5 de 42 emails</small>
                            </div>
                            <nav aria-label="Page navigation">
                                <ul class="pagination pagination-sm mb-0">
                                    <li class="page-item disabled">
                                        <a class="page-link" href="#" aria-label="Previous">
                                            <span aria-hidden="true">&laquo;</span>
                                        </a>
                                    </li>
                                    <li class="page-item active"><a class="page-link" href="#">1</a></li>
                                    <li class="page-item"><a class="page-link" href="#">2</a></li>
                                    <li class="page-item"><a class="page-link" href="#">3</a></li>
                                    <li class="page-item">
                                        <a class="page-link" href="#" aria-label="Next">
                                            <span aria-hidden="true">&raquo;</span>
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crear el contenido de la pestaña Configuración del Bot
 * @returns {string} HTML de la pestaña
 */
function createBotConfigTabContent() {
    return `
        <!-- 3. Configuración del Bot -->
        <div class="tab-pane" id="call-bot-content" role="tabpanel" aria-labelledby="call-bot-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-bottom-0 py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-robot me-2"></i>Configuración del Bot</h5>
                            <div>
                                <button class="btn btn-outline-secondary btn-sm me-2" id="test-bot-btn">
                                    <i class="fas fa-vial me-2"></i>Probar Bot
                                </button>
                                <button class="btn btn-primary btn-sm" id="save-bot-config-btn">
                                    <i class="fas fa-save me-2"></i>Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Contenido de Configuración del Bot -->
                        <form id="unified-bot-config-form">
                            <!-- Sección: Información de la empresa -->
                            <div class="card mb-4 border-0 shadow-sm">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="fas fa-building me-2"></i>Información de la Empresa</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="company_name" class="form-label">Nombre de la Empresa</label>
                                            <input type="text" class="form-control" id="company_name" name="company_name" placeholder="Nombre de tu empresa" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="contact_email" class="form-label">Email de Contacto</label>
                                            <input type="email" class="form-control" id="contact_email" name="contact_email" placeholder="email@tuempresa.com" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="main_phone" class="form-label">Teléfono Principal</label>
                                            <input type="tel" class="form-control" id="main_phone" name="main_phone" placeholder="+34 XXX XXX XXX" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="address" class="form-label">Dirección</label>
                                            <input type="text" class="form-control" id="address" name="address" placeholder="Dirección de tu empresa">
                                        </div>
                                        <div class="col-12">
                                            <label for="company_description" class="form-label">Descripción de la Empresa</label>
                                            <textarea class="form-control" id="company_description" name="company_description" rows="3" placeholder="Describe brevemente a qué se dedica tu empresa..."></textarea>
                                            <small class="text-muted">Esta descripción ayuda al bot a entender mejor el contexto de tu negocio.</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="industry" class="form-label">Sector empresarial</label>
                                            <select class="form-select" id="industry" name="industry" required>
                                                <option value="" selected>Selecciona un sector</option>
                                                <option value="retail">Comercio (Retail)</option>
                                                <option value="restaurant">Restaurante</option>
                                                <option value="beauty">Belleza</option>
                                                <option value="legal">Legal</option>
                                                <option value="healthcare">Salud</option>
                                                <option value="real estate">Inmobiliaria</option>
                                                <option value="technology">Tecnología</option>
                                                <option value="generic">Otro</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Horario Comercial</label>
                                            <input type="hidden" id="business_hours" name="business_hours" value="Lun-Vie: 9:00-18:00">
                                            <div class="card border-light mb-2">
                                                <div class="card-body p-3">
                                                    <div class="d-flex flex-wrap gap-2 mb-3">
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-mon" data-day="Lun" checked>
                                                            <label class="form-check-label" for="day-mon">Lun</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-tue" data-day="Mar" checked>
                                                            <label class="form-check-label" for="day-tue">Mar</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-wed" data-day="Mié" checked>
                                                            <label class="form-check-label" for="day-wed">Mié</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-thu" data-day="Jue" checked>
                                                            <label class="form-check-label" for="day-thu">Jue</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-fri" data-day="Vie" checked>
                                                            <label class="form-check-label" for="day-fri">Vie</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-sat" data-day="Sáb">
                                                            <label class="form-check-label" for="day-sat">Sáb</label>
                                                        </div>
                                                        <div class="form-check">
                                                            <input class="form-check-input business-day" type="checkbox" id="day-sun" data-day="Dom">
                                                            <label class="form-check-label" for="day-sun">Dom</label>
                                                        </div>
                                                    </div>
                                                    <div class="row g-2">
                                                        <div class="col-6">
                                                            <label class="form-label small">Hora inicio</label>
                                                            <select class="form-select form-select-sm" id="business-hours-start">
                                                                <option value="7:00">7:00</option>
                                                                <option value="7:30">7:30</option>
                                                                <option value="8:00">8:00</option>
                                                                <option value="8:30">8:30</option>
                                                                <option value="9:00" selected>9:00</option>
                                                                <option value="9:30">9:30</option>
                                                                <option value="10:00">10:00</option>
                                                                <option value="10:30">10:30</option>
                                                                <option value="11:00">11:00</option>
                                                            </select>
                                                        </div>
                                                        <div class="col-6">
                                                            <label class="form-label small">Hora fin</label>
                                                            <select class="form-select form-select-sm" id="business-hours-end">
                                                                <option value="16:00">16:00</option>
                                                                <option value="16:30">16:30</option>
                                                                <option value="17:00">17:00</option>
                                                                <option value="17:30">17:30</option>
                                                                <option value="18:00" selected>18:00</option>
                                                                <option value="18:30">18:30</option>
                                                                <option value="19:00">19:00</option>
                                                                <option value="19:30">19:30</option>
                                                                <option value="20:00">20:00</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div class="mt-3">
                                                        <span class="badge bg-primary" id="business-hours-preview">Lun-Vie: 9:00-18:00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sección: Configuración de Llamadas -->
                            <div class="card mb-4 border-0 shadow-sm">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="fas fa-phone-alt me-2"></i>Configuración de Llamadas</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <!-- Columna izquierda: Opciones de activación -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Opciones de Activación</h6>
                                                    <div class="form-check form-switch mb-3">
                                                        <input class="form-check-input" type="checkbox" id="call_bot_active" name="call_bot_active" checked>
                                                        <label class="form-check-label" for="call_bot_active">Bot de Llamadas Activo</label>
                                                    </div>
                                                    <div class="form-check form-switch mb-3">
                                                        <input class="form-check-input" type="checkbox" id="call_recording" name="call_recording" checked>
                                                        <label class="form-check-label" for="call_recording">Grabación de Llamadas</label>
                                                    </div>
                                                    <div class="form-check form-switch mb-0">
                                                        <input class="form-check-input" type="checkbox" id="call_transcription" name="call_transcription" checked>
                                                        <label class="form-check-label" for="call_transcription">Transcripción de Llamadas</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Columna derecha: Configuración de voz -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Configuración de Voz</h6>
                                                    <div class="mb-3">
                                                        <label for="call_language" class="form-label">Idioma Principal</label>
                                                        <select class="form-select" id="call_language" name="call_language" required>
                                                            <option value="es-ES" selected>Español (España)</option>
                                                            <option value="en-US">Inglés (EEUU)</option>
                                                            <option value="fr-FR">Francés</option>
                                                            <option value="de-DE">Alemán</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label for="voice_type" class="form-label">Tipo de Voz</label>
                                                        <select class="form-select" id="voice_type" name="voice_type" required>
                                                            <option value="female" selected>Femenina</option>
                                                            <option value="male">Masculina</option>
                                                            <option value="neutral">Neutral</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Saludo inicial (ancho completo) -->
                                        <div class="col-12">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Mensaje de Bienvenida</h6>
                                                    <label for="call_greeting" class="form-label">Saludo Inicial</label>
                                                    <textarea class="form-control" id="call_greeting" name="call_greeting" rows="2" placeholder="Introduce el saludo que escuchará el cliente al llamar..." required>Hola, ha llamado a Tech Solutions. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?</textarea>
                                                    <small class="text-muted">Este mensaje se reproducirá al inicio de cada llamada.</small>
                                                </div>
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sección: Configuración de Emails -->
                            <div class="card mb-4 border-0 shadow-sm">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="fas fa-envelope me-2"></i>Configuración de Emails</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <!-- Integración con proveedores de correo -->
                                        <div class="col-12">
                                            <div class="card border-primary mb-4">
                                                <div class="card-header bg-primary bg-opacity-10">
                                                    <h6 class="mb-0"><i class="fas fa-plug me-2"></i>Integración con proveedores de correo</h6>
                                                </div>
                                                <div class="card-body">
                                                    <p class="text-muted mb-3">Conecta tu cuenta de correo para permitir que el bot gestione automáticamente tus emails.</p>
                                                    
                                                    <div class="row g-3">
                                                        <div class="col-md-6">
                                                            <label for="email_provider" class="form-label">Proveedor de correo</label>
                                                            <select class="form-select" id="email_provider" name="email_provider">
                                                                <option value="" selected>Selecciona un proveedor</option>
                                                                <option value="google">Google (Gmail)</option>
                                                                <option value="microsoft">Microsoft (Outlook)</option>
                                                                <option value="yahoo">Yahoo Mail</option>
                                                                <option value="other">Otro (IMAP/SMTP)</option>
                                                            </select>
                                                        </div>
                                                        
                                                        <div class="col-md-6">
                                                            <label for="outgoing_email" class="form-label">Email de Salida</label>
                                                            <input type="email" class="form-control" id="outgoing_email" name="outgoing_email" placeholder="tucorreo@ejemplo.com" required>
                                                            <div class="form-text">Email desde el que se enviarán las respuestas automáticas</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div id="email-oauth-section" class="mt-3">
                                                        <div class="d-grid gap-2 mb-3">
                                                            <button type="button" class="btn btn-outline-primary" id="connect-email-btn" disabled>
                                                                <i class="fas fa-link me-2"></i>Conectar cuenta de correo
                                                            </button>
                                                        </div>
                                                        <div id="email-connection-status" class="d-none alert alert-info">
                                                            <i class="fas fa-info-circle me-2"></i>No hay ninguna cuenta conectada.
                                                        </div>
                                                    </div>
                                                    
                                                    <div id="email-manual-section" class="d-none mt-3">
                                                        <div class="row g-3 mb-3">
                                                            <div class="col-md-6">
                                                                <label for="email_password" class="form-label">Contraseña o clave de aplicación</label>
                                                                <input type="password" class="form-control" id="email_password" name="email_password" placeholder="Contraseña o clave de aplicación">
                                                                <small class="text-muted">Recomendamos usar una clave de aplicación específica.</small>
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label for="recipient_email" class="form-label">Email de Recepción</label>
                                                                <input type="email" class="form-control" id="recipient_email" name="recipient_email" placeholder="info@tuempresa.com">
                                                                <div class="form-text">Email donde se recibirán las copias de las respuestas</div>
                                                            </div>
                                                        </div>
                                                        <div class="row g-3 mb-3">
                                                            <div class="col-md-6">
                                                                <label for="imap_server" class="form-label">Servidor IMAP</label>
                                                                <input type="text" class="form-control" id="imap_server" name="imap_server" placeholder="imap.ejemplo.com">
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label for="imap_port" class="form-label">Puerto IMAP</label>
                                                                <input type="number" class="form-control" id="imap_port" name="imap_port" placeholder="993">
                                                            </div>
                                                        </div>
                                                        <div class="row g-3 mb-3">
                                                            <div class="col-md-6">
                                                                <label for="smtp_server" class="form-label">Servidor SMTP</label>
                                                                <input type="text" class="form-control" id="smtp_server" name="smtp_server" placeholder="smtp.ejemplo.com">
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label for="smtp_port" class="form-label">Puerto SMTP</label>
                                                                <input type="number" class="form-control" id="smtp_port" name="smtp_port" placeholder="587">
                                                            </div>
                                                        </div>
                                                        <div class="mb-3 form-check">
                                                            <input type="checkbox" class="form-check-input" id="use_ssl" name="use_ssl" checked>
                                                            <label class="form-check-label" for="use_ssl">Usar conexión segura (SSL/TLS)</label>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- Consentimiento de acceso a correo -->
                                                    <div class="mt-3 p-3 bg-light rounded">
                                                        <div class="mb-3 form-check">
                                                            <input type="checkbox" class="form-check-input" id="email_consent" name="email_consent">
                                                            <label class="form-check-label fw-bold" for="email_consent">
                                                                Doy mi consentimiento para que la plataforma acceda a los datos de mi correo electrónico
                                                            </label>
                                                        </div>
                                                        <p class="text-muted small mb-0">
                                                            Al marcar esta casilla, autorizo expresamente a la plataforma a: (1) acceder y leer los correos electrónicos de la cuenta configurada, (2) enviar respuestas automáticas en mi nombre, y (3) procesar el contenido de los mensajes con el único fin de proporcionar los servicios solicitados. Entiendo que puedo revocar este permiso en cualquier momento desde la configuración. Mis datos serán tratados de acuerdo con la <a href="#" data-bs-toggle="modal" data-bs-target="#privacyPolicyModal">política de privacidad</a>.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Columna izquierda: Opciones de activación -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Opciones de Activación</h6>
                                                    <div class="form-check form-switch mb-3">
                                                        <input class="form-check-input" type="checkbox" id="email_bot_active" name="email_bot_active" checked>
                                                        <label class="form-check-label" for="email_bot_active">Bot de Emails Activo</label>
                                                    </div>
                                                    <div class="form-check form-switch">
                                                        <input class="form-check-input" type="checkbox" id="auto_reply" name="auto_reply" checked>
                                                        <label class="form-check-label" for="auto_reply">Respuesta Automática</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Columna derecha: Configuración de idioma -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Configuración de Idioma</h6>
                                                    <div>
                                                        <label for="email_language" class="form-label">Idioma Principal</label>
                                                        <select class="form-select" id="email_language" name="email_language" required>
                                                            <option value="es-ES" selected>Español (España)</option>
                                                            <option value="en-US">Inglés (EEUU)</option>
                                                            <option value="fr-FR">Francés</option>
                                                            <option value="de-DE">Alemán</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Configuración adicional -->
                                        <div class="col-md-6">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Información Adicional</h6>
                                                    <div>
                                                        <label for="website" class="form-label">Sitio Web</label>
                                                        <input type="url" class="form-control" id="website" name="website" placeholder="https://www.tuempresa.com" required>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Reglas de reenvío -->
                                        <div class="col-md-6">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Reglas de reenvío</h6>
                                                    <div>
                                                        <label for="forward_rules" class="form-label">Reglas de reenvío</label>
                                                        <textarea class="form-control" id="forward_rules" name="forward_rules" rows="3" placeholder="Especifica reglas para el reenvío automático de emails..."></textarea>
                                                        <small class="text-muted">Ejemplo: "reenviar emails con asunto 'urgente' a support@miempresa.com"</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Firma de email (ancho completo) -->
                                        <div class="col-12">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Firma de Email</h6>
                                                    <label for="email_signature" class="form-label">Plantilla de Firma</label>
                                                    <textarea class="form-control" id="email_signature" name="email_signature" rows="4" required placeholder="Introduce la plantilla para la firma de los emails...">Atentamente,
{NOMBRE}
{CARGO}
{EMPRESA}
Tel: {TELEFONO}
Email: {EMAIL}
Web: {WEB}</textarea>
                                                    <div class="form-text">Puedes usar las variables: {NOMBRE}, {CARGO}, {EMPRESA}, {TELEFONO}, {EMAIL}, {WEB}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Mensaje de respuesta automática -->
                                        <div class="col-12">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Respuesta Automática</h6>
                                                    <label for="auto_reply_message" class="form-label">Mensaje de respuesta automática</label>
                                                    <textarea class="form-control" id="auto_reply_message" name="auto_reply_message" rows="3" placeholder="Gracias por su mensaje. Nos pondremos en contacto con usted lo antes posible..."></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sección: Preguntas Frecuentes -->
                            <div class="card mb-4 border-0 shadow-sm">
                                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0"><i class="fas fa-question-circle me-2"></i>Preguntas Frecuentes</h6>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="add-faq-btn">
                                        <i class="fas fa-plus me-1"></i>Añadir
                                    </button>
                                </div>
                                <div class="card-body p-3">
                                    <div class="row">
                                        <div class="col-12">
                                            <p class="text-muted small mb-3">Configura preguntas frecuentes para respuestas automáticas. Recomendamos añadir al menos 3-5 preguntas comunes.</p>
                                            
                                            <div id="faq-items" class="faq-container">
                                                <!-- Las preguntas se añadirán aquí dinámicamente -->
                                            </div>
                                            
                                            <div id="no-faqs-message" class="text-center py-3 d-none">
                                                <p class="text-muted"><i class="fas fa-info-circle me-1"></i> No hay preguntas frecuentes configuradas</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sección: Archivos de Contexto -->
                            <div class="card mb-4 border-0 shadow-sm">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0"><i class="fas fa-file-alt me-2"></i>Archivos de Contexto</h6>
                                </div>
                                <div class="card-body">
                                    <div class="row g-3">
                                        <div class="col-12">
                                            <label for="context_files" class="form-label">Subir Archivos de Contexto (PDF, DOCX, TXT)</label>
                                            <input type="file" class="form-control" id="context_files" name="context_files" multiple accept=".pdf,.docx,.txt">
                                            <div class="form-text">Máximo 5 archivos, 10MB por archivo.</div>
                                        </div>
                                        
                                        <div class="col-12">
                                            <label class="form-label">Archivos Actuales</label>
                                            <ul class="list-group" id="context-files-list">
                                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <i class="fas fa-file-pdf text-danger me-2"></i>
                                                        Catálogo_Productos_2023.pdf
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-outline-danger">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <i class="fas fa-file-word text-primary me-2"></i>
                                                        Preguntas_Frecuentes.docx
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-outline-danger">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crear el contenido de la pestaña Mi Cuenta
 * @returns {string} HTML de la pestaña
 */
function createAccountTabContent() {
    return `
        <!-- 4. Mi Cuenta -->
        <div class="tab-pane" id="account-content" role="tabpanel" aria-labelledby="account-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-bottom-0 py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-user-cog me-2"></i>Mi Cuenta</h5>
                            <button class="btn btn-primary btn-sm" id="save-account-btn">
                                <i class="fas fa-save me-2"></i>Guardar Cambios
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <!-- Contenido de Mi Cuenta -->
                        <ul class="nav nav-tabs" id="accountTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="profile-tab" data-bs-toggle="tab" data-bs-target="#profile-content" type="button" role="tab" aria-controls="profile-content" aria-selected="true">
                                    <i class="fas fa-user me-2"></i>Perfil
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="security-tab" data-bs-toggle="tab" data-bs-target="#security-content" type="button" role="tab" aria-controls="security-content" aria-selected="false">
                                    <i class="fas fa-shield-alt me-2"></i>Seguridad
                                </button>
                            </li>
                        </ul>
                        
                        <div class="tab-content pt-3" id="accountTabsContent">
                            <!-- Perfil -->
                            <div class="tab-pane fade show active" id="profile-content" role="tabpanel" aria-labelledby="profile-tab">
                                <div class="row">
                                    <div class="col-12">
                                        <div class="row g-3 px-3 py-4">
                                            <div class="col-md-6">
                                                <label for="account_name" class="form-label">Nombre</label>
                                                <input type="text" class="form-control" id="account_name" value="Usuario">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_lastname" class="form-label">Apellidos</label>
                                                <input type="text" class="form-control" id="account_lastname" value="Ejemplo">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_email" class="form-label">Email</label>
                                                <input type="email" class="form-control" id="account_email" value="usuario@ejemplo.com">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_phone" class="form-label">Teléfono</label>
                                                <input type="tel" class="form-control" id="account_phone" value="+34 600 000 000">
                                            </div>
                                            <div class="col-md-12">
                                                <label for="account_company" class="form-label">Empresa</label>
                                                <input type="text" class="form-control" id="account_company" value="Mi Empresa, S.L.">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_position" class="form-label">Cargo</label>
                                                <input type="text" class="form-control" id="account_position" value="Director/a">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_timezone" class="form-label">Zona horaria</label>
                                                <select class="form-select" id="account_timezone">
                                                    <option value="Europe/Madrid" selected>Europa/Madrid (GMT+1)</option>
                                                    <option value="Europe/London">Europa/Londres (GMT+0)</option>
                                                    <option value="America/New_York">América/Nueva York (GMT-5)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Seguridad -->
                            <div class="tab-pane fade" id="security-content" role="tabpanel" aria-labelledby="security-tab">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="card h-100">
                                            <div class="card-header bg-light">
                                                <h6 class="mb-0">Cambiar contraseña</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="mb-3">
                                                    <label for="current_password" class="form-label">Contraseña actual</label>
                                                    <input type="password" class="form-control" id="current_password">
                                                </div>
                                                <div class="mb-3">
                                                    <label for="new_password" class="form-label">Nueva contraseña</label>
                                                    <input type="password" class="form-control" id="new_password">
                                                </div>
                                                <div class="mb-3">
                                                    <label for="confirm_password" class="form-label">Confirmar nueva contraseña</label>
                                                    <input type="password" class="form-control" id="confirm_password">
                                                </div>
                                                <button type="button" class="btn btn-primary" id="change-password-btn">
                                                    <i class="fas fa-key me-2"></i>Actualizar contraseña
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card h-100">
                                            <div class="card-header bg-light">
                                                <h6 class="mb-0">Verificación en dos pasos</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-check form-switch mb-3">
                                                    <input class="form-check-input" type="checkbox" id="two_factor_auth">
                                                    <label class="form-check-label" for="two_factor_auth">Activar verificación en dos pasos</label>
                                                </div>
                                                <p class="text-muted small">La verificación en dos pasos añade una capa adicional de seguridad a tu cuenta. Cada vez que inicies sesión, necesitarás introducir un código enviado a tu teléfono.</p>
                                                <button type="button" class="btn btn-outline-primary" id="setup-2fa-btn" disabled>
                                                    <i class="fas fa-mobile-alt me-2"></i>Configurar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            

                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crear el contenido de la pestaña Facturación
 * @returns {string} HTML de la pestaña
 */
function createBillingTabContent() {
    return `
        <!-- 5. Facturación -->
        <div class="tab-pane" id="billing-content" role="tabpanel" aria-labelledby="billing-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-bottom-0 py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-credit-card me-2"></i>Facturación</h5>
                            <button class="btn btn-outline-primary btn-sm" id="view-invoices-btn">
                                <i class="fas fa-file-invoice-dollar me-2"></i>Ver Facturas
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        <!-- Contenido de Facturación -->
                        <ul class="nav nav-tabs" id="billingTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="plan-tab" data-bs-toggle="tab" data-bs-target="#plan-content" type="button" role="tab" aria-controls="plan-content" aria-selected="true">
                                    <i class="fas fa-cubes me-2"></i>Plan Actual
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="payment-tab" data-bs-toggle="tab" data-bs-target="#payment-content" type="button" role="tab" aria-controls="payment-content" aria-selected="false">
                                    <i class="fas fa-credit-card me-2"></i>Métodos de Pago
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="history-tab" data-bs-toggle="tab" data-bs-target="#history-content" type="button" role="tab" aria-controls="history-content" aria-selected="false">
                                    <i class="fas fa-history me-2"></i>Historial
                                </button>
                            </li>
                        </ul>
                        
                        <div class="tab-content pt-3" id="billingTabsContent">
                            <!-- Plan Actual -->
                            <div class="tab-pane fade show active" id="plan-content" role="tabpanel" aria-labelledby="plan-tab">
                                <div class="text-end mb-2">
                                    <small class="text-muted">Tu plan actual vence el 15/08/2025. Renovación automática activada.</small>
                                </div>
                                
                                <div class="row mb-4">
                                    <div class="col-md-4">
                                        <div class="pricing-card h-100">
                                            <div class="pricing-card-header p-3">
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <h3 class="pricing-title mb-0">Básico</h3>
                                                </div>
                                                <div class="pricing-price">
                                                    <div class="d-flex align-items-end">
                                                        <span class="currency">€</span>
                                                        <span class="amount">19,99</span>
                                                        <span class="period">/mes</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="pricing-card-body p-3">
                                                <ul class="pricing-features">
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>100 llamadas/mes</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>500 emails/mes</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>1 usuario</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Soporte básico</span>
                                                    </li>
                                                </ul>
                                                <button class="btn btn-outline-primary w-100 rounded-pill py-2 mt-3">Cambiar plan</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="pricing-card pricing-popular h-100">
                                            <div class="popular-badge">Plan Actual</div>
                                            <div class="pricing-card-header p-3">
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <h3 class="pricing-title mb-0">Profesional</h3>
                                                </div>
                                                <div class="pricing-price">
                                                    <div class="d-flex align-items-end">
                                                        <span class="currency">€</span>
                                                        <span class="amount">49,99</span>
                                                        <span class="period">/mes</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="pricing-card-body p-3">
                                                <ul class="pricing-features">
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>1.000 llamadas/mes</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>5.000 emails/mes</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>5 usuarios</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Soporte prioritario</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Respuestas IA ilimitadas</span>
                                                    </li>
                                                </ul>
                                                <button class="btn btn-primary w-100 rounded-pill py-2 mt-3" disabled>Plan Actual</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="pricing-card h-100">
                                            <div class="pricing-card-header p-3">
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <h3 class="pricing-title mb-0">Enterprise</h3>
                                                    <span class="badge bg-warning">Premium</span>
                                                </div>
                                                <div class="pricing-price">
                                                    <div class="d-flex align-items-end">
                                                        <span class="currency">€</span>
                                                        <span class="amount">99,99</span>
                                                        <span class="period">/mes</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="pricing-card-body p-3">
                                                <ul class="pricing-features">
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Llamadas ilimitadas</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Emails ilimitados</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>15 usuarios</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>Soporte 24/7</span>
                                                    </li>
                                                    <li>
                                                        <span class="feature-icon"><i class="fas fa-check"></i></span>
                                                        <span>API personalizada</span>
                                                    </li>
                                                </ul>
                                                <button class="btn btn-outline-primary w-100 rounded-pill py-2 mt-3" id="upgrade-plan-btn">Actualizar Plan</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card border-0 shadow-sm" id="plan-usage-section">
                                    <div class="card-header bg-light py-2">
                                        <h6 class="mb-0 small card-title">Uso Actual del Plan</h6>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-3">
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Llamadas</small>
                                                    <small class="text-muted" id="plan-usage-calls-count">0 / 1.000</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-primary" id="plan-usage-calls-progress" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Emails</small>
                                                    <small class="text-muted" id="plan-usage-emails-count">0 / 5.000</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-success" id="plan-usage-emails-progress" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Usuarios</small>
                                                    <small class="text-muted" id="plan-usage-users-count">1 / 5</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-warning" id="plan-usage-users-progress" role="progressbar" style="width: 20%;" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Métodos de Pago -->
                            <div class="tab-pane fade" id="payment-content" role="tabpanel" aria-labelledby="payment-tab">
                                <div class="card mb-4">
                                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0">Método de pago</h6>
                                        <small class="text-muted">Solo se permite un método de pago activo</small>
                                    </div>
                                    <div class="card-body" id="payment-method-container">
                                        <!-- Si hay método de pago -->
                                        <div id="payment-method-exists" class="d-flex align-items-center">
                                            <div class="me-3">
                                                <i class="fab fa-cc-visa fa-2x text-primary"></i>
                                            </div>
                                            <div class="flex-grow-1">
                                                <div class="fw-bold">Visa terminada en 4242</div>
                                                <div class="small text-muted">Expira: 05/2026</div>
                                            </div>
                                            <div>
                                                <button class="btn btn-sm btn-outline-danger" id="remove-payment-method-btn">
                                                    <i class="fas fa-trash me-1"></i>Eliminar
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Si no hay método de pago -->
                                        <div id="no-payment-method" class="text-center py-4 d-none">
                                            <div class="mb-3">
                                                <i class="fas fa-credit-card fa-3x text-muted"></i>
                                            </div>
                                            <p class="text-muted mb-0">No hay ningún método de pago configurado</p>
                                            <p class="small text-danger mb-0">Las funcionalidades del plan están desactivadas</p>
                                        </div>
                                    </div>
                                    <div class="card-footer bg-white">
                                        <button class="btn btn-primary" id="add-payment-method-btn">
                                            <i class="fas fa-plus-circle me-2"></i>Añadir método de pago
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">Datos de facturación</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label for="billing_company" class="form-label">Empresa</label>
                                                <input type="text" class="form-control" id="billing_company" value="Mi Empresa, S.L.">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="billing_tax_id" class="form-label">CIF/NIF</label>
                                                <input type="text" class="form-control" id="billing_tax_id" value="B12345678">
                                            </div>
                                            <div class="col-md-12">
                                                <label for="billing_address" class="form-label">Dirección</label>
                                                <input type="text" class="form-control" id="billing_address" value="Calle Ejemplo, 123">
                                            </div>
                                            <div class="col-md-4">
                                                <label for="billing_postal_code" class="form-label">Código Postal</label>
                                                <input type="text" class="form-control" id="billing_postal_code" value="28001">
                                            </div>
                                            <div class="col-md-4">
                                                <label for="billing_city" class="form-label">Ciudad</label>
                                                <input type="text" class="form-control" id="billing_city" value="Madrid">
                                            </div>
                                            <div class="col-md-4">
                                                <label for="billing_country" class="form-label">País</label>
                                                <select class="form-select" id="billing_country">
                                                    <option value="ES" selected>España</option>
                                                    <option value="PT">Portugal</option>
                                                    <option value="FR">Francia</option>
                                                    <option value="DE">Alemania</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-footer bg-white">
                                        <button class="btn btn-primary" id="save-billing-info-btn">
                                            <i class="fas fa-save me-2"></i>Guardar datos de facturación
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Historial -->
                            <div class="tab-pane fade" id="history-content" role="tabpanel" aria-labelledby="history-tab">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">Historial de facturas</h6>
                                            <div>
                                                <div class="badge bg-light text-dark border" id="invoice-year-filter" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                                                    2025
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-body p-0">
                                        <div class="table-responsive">
                                            <table class="table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Número</th>
                                                        <th>Fecha</th>
                                                        <th>Periodo</th>
                                                        <th>Total</th>
                                                        <th>Estado</th>
                                                        <th>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>FAC-2025-007</td>
                                                        <td>15/07/2025</td>
                                                        <td>Jul 2025</td>
                                                        <td>49,99€</td>
                                                        <td><span class="badge bg-success">Pagada</span></td>
                                                        <td>
                                                            <button class="btn btn-sm btn-outline-primary" title="Descargar PDF">
                                                                <i class="fas fa-download"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>FAC-2025-006</td>
                                                        <td>15/06/2025</td>
                                                        <td>Jun 2025</td>
                                                        <td>49,99€</td>
                                                        <td><span class="badge bg-success">Pagada</span></td>
                                                        <td>
                                                            <button class="btn btn-sm btn-outline-primary" title="Descargar PDF">
                                                                <i class="fas fa-download"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>FAC-2025-005</td>
                                                        <td>15/05/2025</td>
                                                        <td>May 2025</td>
                                                        <td>49,99€</td>
                                                        <td><span class="badge bg-success">Pagada</span></td>
                                                        <td>
                                                            <button class="btn btn-sm btn-outline-primary" title="Descargar PDF">
                                                                <i class="fas fa-download"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crear el contenido de las pestañas con nueva estructura simplificada
 */
function createTabsContent() {
    console.log('📄 Creando contenido de las pestañas...');
    
    const tabsContentContainer = document.getElementById('dashboardTabContent');
    if (!tabsContentContainer) {
        console.error('❌ No se encontró el contenedor de contenido');
        return;
    }
    
    // Asegurar que los estilos estén cargados
    addDashboardStyles();
    
    // Crear contenido usando funciones modulares
    tabsContentContainer.innerHTML = `
        ${createCallsTabContent()}
        ${createEmailsTabContent()}
        ${createBotConfigTabContent()}
        ${createAccountTabContent()}
        ${createBillingTabContent()}
    `;
    
    console.log('✅ Contenido de pestañas creado');
}

/**
 * Cargar datos iniciales para el dashboard
 * @param {Object} config - Configuración de la empresa
 */
function loadSimpleData(config) {
    console.log('📊 Cargando datos iniciales para el dashboard...');
    
    // Cargar datos de llamadas (simulación de API)
    loadCallsData();
    loadEmailsData();
    // Actualizar la hora de última actualización
    updateLastUpdateTime();
    
    console.log('✅ Datos iniciales cargados dinámicamente');
}

/**
 * Actualizar la hora de última actualización
 */
function updateLastUpdateTime() {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = formattedDate;
    }
}

/**
 * Cargar datos de llamadas desde la API
 */
function loadCallsData() {
    console.log('📞 Cargando datos de llamadas desde el backend...');
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Mostrar indicador de carga
    const callsTableBody = document.getElementById('calls-table-body');
    if (callsTableBody) {
        callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando llamadas...</p></td></tr>';
    }
    
    // Realizar petición al backend
    fetch('/api/calls', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(callsData => {
        // Limpiar tabla de llamadas
        if (callsTableBody) {
            callsTableBody.innerHTML = '';
            
            if (callsData.length === 0) {
                // Mostrar mensaje si no hay datos
                callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay llamadas registradas</td></tr>';
            } else {
                // Generar filas de llamadas con el nuevo diseño moderno
                callsData.forEach(call => {
                    const callRow = createCallRow(call);
                    callsTableBody.appendChild(callRow);
                });
            }
            
            // Actualizar contador
            updateCallsCount();
            
            // Inicializar dropdowns de Bootstrap
            initializeDropdowns();
        }
        
        console.log(`✅ ${callsData.length} llamadas cargadas correctamente`);
    })
    .catch(error => {
        console.error('❌ Error al cargar datos de llamadas:', error);
        toastr.error('Error al cargar datos de llamadas', 'Error');
        
        if (callsTableBody) {
            callsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="alert alert-danger">Error al cargar datos: ${error.message}</div></td></tr>`;
        }
    });
}

/**
 * Crear una fila de llamada con el nuevo diseño moderno y compacto
 * @param {Object} call - Datos de la llamada
 * @returns {HTMLElement} - Elemento TR con la fila de la llamada
 */
function createCallRow(call) {
    const row = document.createElement('tr');
    row.className = 'call-row';
    row.dataset.id = call.id;
    row.dataset.type = call.classification;
    row.dataset.urgency = call.urgency;
    
    if (call.urgency === 'urgente' || call.urgency === 'alta') {
        row.dataset.urgent = 'true';
    }
    
    // Columna de checkbox gestionado
    let checkboxClass = 'custom-checkbox';
    if (call.managed) checkboxClass += ' checked';
    
    row.innerHTML = `
        <td class="column-status text-center">
            <div class="${checkboxClass}" id="call-managed-${call.id}" onclick="toggleCheckbox(this)"></div>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div class="fw-medium small">${call.date}</div>
                <div class="text-muted small" style="font-size: 0.7rem;">${call.time}</div>
            </div>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div class="fw-medium small">${call.phone}</div>
                <div class="text-muted small" style="font-size: 0.7rem;">${call.contactType}</div>
            </div>
        </td>
        <td>
            <div class="d-flex flex-column">
                ${getClassificationBadge(call.classification, call.urgency)}
                <div class="text-muted small" style="font-size: 0.7rem;">Confianza: ${call.confidence}%</div>
            </div>
        </td>
        <td class="column-summary">
            <div class="d-flex flex-column">
                <div class="fw-medium">${call.summary}</div>
                <div class="text-muted small">${call.details}</div>
            </div>
        </td>
        <td>
            <span class="badge-dashboard" style="background: var(--primary-gradient)">${call.duration}</span>
        </td>
        <td class="column-actions">
            <div class="dropdown">
                <button class="action-btn" type="button" id="callActions${call.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="callActions${call.id}">
                    <li><a class="dropdown-item" href="#" onclick="playCallRecording(${call.id}); return false;">
                        <i class="fas fa-play me-2"></i> Reproducir grabación
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="viewCallDetails(${call.id}); return false;">
                        <i class="fas fa-eye me-2"></i> Ver detalles
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="toggleCallManaged(${call.id}); return false;">
                        <i class="fas fa-check me-2"></i> ${call.managed ? 'Desmarcar gestionado' : 'Marcar gestionado'}
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="toggleCallImportant(${call.id}); return false;">
                        <i class="far fa-star me-2"></i> Marcar importante
                    </a></li>
                </ul>
            </div>
        </td>
    `;
    
    return row;
}

/**
 * Obtener el HTML para las badges de clasificación y urgencia
 * @param {string} classification - Tipo de clasificación
 * @param {string} urgency - Nivel de urgencia
 * @returns {string} - HTML con las badges
 */
function getClassificationBadge(classification, urgency) {
    let classificationBadge = '';
    let urgencyBadge = '';
    
    // Badge de clasificación
    switch (classification) {
        case 'pedido':
            classificationBadge = '<span class="badge-dashboard badge-pedido mb-1">📦 PEDIDO</span>';
            break;
        case 'consulta':
            classificationBadge = '<span class="badge-dashboard badge-consulta mb-1">❓ CONSULTA</span>';
            break;
        case 'reclamación':
            classificationBadge = '<span class="badge-dashboard badge-reclamacion mb-1">⚠️ RECLAMACIÓN</span>';
            break;
        default:
            classificationBadge = `<span class="badge-dashboard mb-1">${classification.toUpperCase()}</span>`;
    }
    
    // Badge de urgencia
    switch (urgency) {
        case 'urgente':
            urgencyBadge = '<span class="badge-dashboard badge-urgente">🚨 URGENTE</span>';
            break;
        case 'alta':
            urgencyBadge = '<span class="badge-dashboard badge-alta">ALTA</span>';
            break;
        case 'normal':
            urgencyBadge = '<span class="badge-dashboard badge-normal">NORMAL</span>';
            break;
        case 'baja':
            urgencyBadge = '<span class="badge-dashboard badge-baja">BAJA</span>';
            break;
        default:
            if (urgency) {
                urgencyBadge = `<span class="badge-dashboard">${urgency.toUpperCase()}</span>`;
            }
    }
    
    return classificationBadge + (urgencyBadge ? urgencyBadge : '');
}

/**
 * Obtener el HTML para el botón de gestión
 * @param {number} callId - ID de la llamada
 * @param {boolean} managed - Si la llamada está gestionada
 * @returns {string} - HTML con el botón de gestión
 */
function getManageButton(callId, managed) {
    if (managed) {
        return `
            <button class="action-btn action-btn-success active manage-btn" title="Desmarcar como gestionado" data-managed="true">
                <i class="fas fa-undo"></i>
            </button>
        `;
    } else {
        return `
            <button class="action-btn action-btn-success manage-btn" title="Marcar como gestionado" data-managed="false">
                <i class="fas fa-check"></i>
            </button>
        `;
    }
}

/**
 * Filtrar llamadas por tipo o urgencia
 */
function filterCalls(type) {
    console.log(`🔍 Filtrando llamadas por tipo: ${type}`);
    toastr.info(`Mostrando llamadas de tipo: ${type}`, 'Filtro aplicado');
    
    // Implementación de filtrado
    const callRows = document.querySelectorAll('.call-row');
    
    callRows.forEach(row => {
        if (type === 'all') {
            row.classList.remove('d-none');
        } else if (type === 'importantes') {
            // Para llamadas importantes/urgentes, verificamos el atributo data-urgent o la presencia de badge con texto URGENTE
            if (row.dataset.urgent === 'true' || row.querySelector('.badge.bg-danger')) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        } else if (type === 'pendientes') {
            // Para llamadas pendientes, verificamos si NO está marcada como gestionada (checkbox no marcado)
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.checked) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        } else if (type === 'gestionadas') {
            // Para llamadas gestionadas, verificamos si está marcada como gestionada (checkbox marcado)
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        } else {
            // Para otros tipos específicos (pedidos, consultas, etc.)
            if (row.dataset.type === type) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        }
    });
    
    // Actualizar contador
    const callCount = document.getElementById('call-count');
    if (callCount) {
        const visibleRows = document.querySelectorAll('.call-row:not(.d-none)');
        callCount.textContent = visibleRows.length;
    }
}

/**
 * Reproducir grabación de llamada
 * @param {number} callId - ID de la llamada
 */
function playCallRecording(callId) {
    console.log(`▶️ Reproduciendo grabación de llamada ID: ${callId}`);
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Mostrar modal de reproducción
    const playModal = new bootstrap.Modal(document.getElementById('play-call-modal'));
    
    // Actualizar título del modal
    const modalTitle = document.querySelector('#play-call-modal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Reproducción de llamada #${callId}`;
    }
    
    // Preparar reproductor de audio
    const audioPlayer = document.getElementById('call-audio-player');
    if (audioPlayer) {
        // Deshabilitar controles mientras se carga
        audioPlayer.controls = false;
        
        // Mostrar spinner de carga
        const loadingSpinner = document.getElementById('audio-loading');
        if (loadingSpinner) {
            loadingSpinner.classList.remove('d-none');
        }
        
        // Cargar audio desde el backend
        fetch(`/api/calls/${callId}/recording`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        })
        .then(audioBlob => {
            // Crear URL para el blob de audio
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.controls = true;
            
            // Ocultar spinner
            if (loadingSpinner) {
                loadingSpinner.classList.add('d-none');
            }
            
            // Reproducir automáticamente
            audioPlayer.play().catch(e => {
                console.warn('Reproducción automática bloqueada por el navegador:', e);
                toastr.info('Haga clic en reproducir para escuchar la grabación', 'Listo para reproducir');
            });
            
            console.log('✅ Grabación cargada correctamente');
        })
        .catch(error => {
            console.error('❌ Error al cargar la grabación:', error);
            toastr.error('Error al cargar la grabación', 'Error');
            
            // Ocultar spinner y mostrar mensaje de error
            if (loadingSpinner) {
                loadingSpinner.classList.add('d-none');
            }
            
            // Mostrar mensaje de error en el reproductor
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger mt-3';
            errorMessage.textContent = `Error al cargar la grabación: ${error.message}`;
            audioPlayer.parentNode.appendChild(errorMessage);
        });
    }
    
    // Mostrar modal
    playModal.show();
    
    toastr.info('Cargando grabación...', 'Reproductor');
}

/**
 * Alternar el estado de un checkbox personalizado
 * @param {HTMLElement} checkbox - Elemento checkbox personalizado
 */
function toggleCheckbox(checkbox) {
    if (!checkbox) return;
    
    // Alternar la clase 'checked'
    checkbox.classList.toggle('checked');
    
    // Si está dentro de una fila de llamada, actualizar el estado gestionado
    const callRow = checkbox.closest('.call-row');
    if (callRow) {
        const callId = callRow.dataset.id;
        if (callId) {
            markCallAsManaged(parseInt(callId));
        }
    }
}

/**
 * Marcar llamada como gestionada
 * @param {number} callId - ID de la llamada
 */
function markCallAsManaged(callId) {
    console.log(`✅ Marcando llamada como gestionada ID: ${callId}`);
    
    // Buscar la fila de la llamada
    const callRow = document.querySelector(`.call-row[data-id="${callId}"]`);
    if (!callRow) {
        console.error(`No se encontró la llamada con ID ${callId}`);
        toastr.error('No se pudo encontrar la llamada', 'Error');
        return;
    }
    
    // Obtener el botón de gestión
    const manageBtn = callRow.querySelector('.manage-btn');
    // Verificar si ya está gestionada usando el atributo data-managed del botón
    const isManaged = manageBtn && manageBtn.getAttribute('data-managed') === 'true';
    
    // Obtener el checkbox personalizado
    const checkbox = callRow.querySelector('.custom-checkbox');
    
    if (isManaged) {
        // Desmarcar como gestionada
        callRow.classList.remove('managed');
        
        // Actualizar el checkbox personalizado
        if (checkbox) checkbox.classList.remove('checked');
        
        // Actualizar el botón de gestión
        if (manageBtn) {
            manageBtn.setAttribute('data-managed', 'false');
            manageBtn.classList.remove('active');
            
            // Actualizar icono
            const icon = manageBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-check';
            
            manageBtn.title = 'Marcar como gestionado';
        }
        
        toastr.info(`Llamada #${callId} marcada como pendiente`, 'Estado actualizado');
    } else {
        // Marcar como gestionada
        callRow.classList.add('managed');
        
        // Actualizar el checkbox personalizado
        if (checkbox) checkbox.classList.add('checked');
        
        // Actualizar el botón de gestión
        if (manageBtn) {
            manageBtn.setAttribute('data-managed', 'true');
            manageBtn.classList.add('active');
            
            // Actualizar icono
            const icon = manageBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-undo';
            
            manageBtn.title = 'Desmarcar como gestionado';
        }
        
        toastr.success(`Llamada #${callId} marcada como gestionada`, 'Estado actualizado');
    }
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Enviar actualización al backend
    fetch(`/api/calls/${callId}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            managed: !isManaged
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Llamada ${callId} estado actualizado a ${!isManaged ? 'gestionada' : 'pendiente'}`);
    })
    .catch(error => {
        console.error('❌ Error al actualizar estado de la llamada:', error);
        toastr.error('Error al actualizar estado de la llamada', 'Error');
        
        // Revertir cambios en la UI en caso de error
        if (!isManaged) {
            callRow.classList.remove('managed');
            if (checkbox) checkbox.classList.remove('checked');
            if (manageBtn) {
                manageBtn.setAttribute('data-managed', 'false');
                manageBtn.classList.remove('active');
                const icon = manageBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-check';
                manageBtn.title = 'Marcar como gestionado';
            }
        } else {
            callRow.classList.add('managed');
            if (checkbox) checkbox.classList.add('checked');
            if (manageBtn) {
                manageBtn.setAttribute('data-managed', 'true');
                manageBtn.classList.add('active');
                const icon = manageBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-undo';
                manageBtn.title = 'Desmarcar como gestionado';
            }
        }
    });
    
    // Actualizar contador
    updateCallsCount();
}

/**
 * Ver detalles de llamada
 * @param {number} callId - ID de la llamada
 */
function viewCallDetails(callId) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`👁️ Ver detalles de llamada ID: ${callId} por el usuario ${userId}`);
    
    // Registrar la llamada en el sistema de seguimiento de uso
    if (window.UsageTracker) {
        window.UsageTracker.trackCall();
        console.log(`📊 Llamada registrada para el usuario ${userId}`);
        
        // Actualizar la UI del sistema de seguimiento
        window.UsageTracker.updateUI();
        
        // Actualizar el resumen de uso si está visible
        if (typeof showUsageSummary === 'function') {
            showUsageSummary();
        }
    }
    
    // Mostrar modal de detalles
    const detailsModal = new bootstrap.Modal(document.getElementById('call-details-modal'));
    
    // Actualizar título del modal
    const modalTitle = document.querySelector('#call-details-modal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Detalles de llamada #${callId}`;
    }
    
    // Simular carga de datos
    const detailsContent = document.getElementById('call-details-content');
    if (detailsContent) {
        // Mostrar spinner de carga
        detailsContent.innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>
        `;
        
        // Simular carga de datos (en producción cargaría de la API)
        setTimeout(() => {
            // Datos de ejemplo (en producción serían dinámicos)
            const callDetails = {
                id: callId,
                date: new Date().toLocaleString(),
                duration: '3:45',
                caller: '+34 612 345 678',
                status: Math.random() > 0.5 ? 'Gestionada' : 'Pendiente',
                recording: true,
                transcript: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.',
                summary: 'Cliente consulta sobre problema con su factura del mes pasado.',
                sentiment: Math.random() > 0.7 ? 'Negativo' : (Math.random() > 0.5 ? 'Neutro' : 'Positivo'),
                priority: Math.random() > 0.8 ? 'Alta' : (Math.random() > 0.5 ? 'Media' : 'Baja'),
                tags: ['facturación', 'consulta', 'cliente existente']
            };
            
            // Actualizar contenido del modal
            detailsContent.innerHTML = `
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Información de la llamada</h5>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>ID:</strong> ${callDetails.id}</p>
                                <p><strong>Fecha:</strong> ${callDetails.date}</p>
                                <p><strong>Duración:</strong> ${callDetails.duration}</p>
                                <p><strong>Teléfono:</strong> ${callDetails.caller}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Estado:</strong> <span class="badge ${callDetails.status === 'Gestionada' ? 'bg-success' : 'bg-warning'}">${callDetails.status}</span></p>
                                <p><strong>Grabación:</strong> ${callDetails.recording ? 'Disponible' : 'No disponible'}</p>
                                <p><strong>Prioridad:</strong> <span class="badge ${callDetails.priority === 'Alta' ? 'bg-danger' : (callDetails.priority === 'Media' ? 'bg-warning' : 'bg-info')}">${callDetails.priority}</span></p>
                                <p><strong>Sentimiento:</strong> <span class="badge ${callDetails.sentiment === 'Negativo' ? 'bg-danger' : (callDetails.sentiment === 'Neutro' ? 'bg-secondary' : 'bg-success')}">${callDetails.sentiment}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Transcripción</h5>
                        <p class="card-text">${callDetails.transcript}</p>
                    </div>
                </div>
                
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Resumen</h5>
                        <p class="card-text">${callDetails.summary}</p>
                    </div>
                </div>
                
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">Etiquetas</h5>
                        <div>
                            ${callDetails.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button type="button" class="btn btn-primary" onclick="playCallRecording(${callDetails.id})">
                        <i class="fas fa-play me-2"></i>Reproducir grabación
                    </button>
                    <button type="button" class="btn btn-outline-secondary ms-2" onclick="markCallAsManaged(${callDetails.id})">
                        <i class="fas fa-${callDetails.status === 'Gestionada' ? 'undo' : 'check'} me-2"></i>${callDetails.status === 'Gestionada' ? 'Desmarcar como gestionada' : 'Marcar como gestionada'}
                    </button>
                </div>
            `;
        }, 1000);
    }
    
    // Mostrar modal
    detailsModal.show();
    
    toastr.info('Cargando detalles de la llamada...', 'Detalles');
}

/**
 * Configurar event listeners para el dashboard
 */
function setupEventListeners() {
    console.log('👂 Configurando event listeners para el dashboard...');
    
    // Event listener para el botón de actualizar llamadas
    const refreshCallsBtn = document.getElementById('refresh-calls-btn');
    if (refreshCallsBtn) {
        refreshCallsBtn.addEventListener('click', function() {
            console.log('🔄 Botón de actualizar llamadas clickeado');
            loadCallsData();
            updateLastUpdateTime();
            toastr.info('Actualizando registro de llamadas...', 'Actualización');
        });
    }
    
    // Event listeners para botones de actualizar
    document.addEventListener('click', function(e) {
        // Event listener para botones de filtro de llamadas
        if (e.target.matches('input[name="call-filter"]')) {
            const filterType = e.target.id.replace('filter-calls-', '');
            filterCalls(filterType);
        }
        
        // Event listener para botones de gestión en filas de llamadas dinámicas
        if (e.target.closest('.manage-btn')) {
            const manageBtn = e.target.closest('.manage-btn');
            const callRow = manageBtn.closest('.call-row');
            if (callRow) {
                const callId = callRow.dataset.id;
                if (callId) {
                    markCallAsManaged(parseInt(callId));
                }
            }
        }
        
        // Event listener para botones de reproducción en filas de llamadas dinámicas
        if (e.target.closest('.play-btn')) {
            const playBtn = e.target.closest('.play-btn');
            const callRow = playBtn.closest('.call-row');
            if (callRow) {
                const callId = callRow.dataset.id;
                if (callId) {
                    toastr.info(`Reproduciendo grabación de la llamada #${callId}`, 'Reproducción');
                    console.log(`🎧 Reproduciendo grabación de la llamada ID: ${callId}`);
                }
            }
        }
        
        // Event listener para botones de reproducir llamadas
        if (e.target.matches('.play-btn') || e.target.closest('.play-btn')) {
            const btn = e.target.matches('.play-btn') ? e.target : e.target.closest('.play-btn');
            const callRow = btn.closest('.call-row');
            if (callRow) {
                const callId = callRow.dataset.id;
                if (callId) {
                    playCallRecording(parseInt(callId));
                }
            }
        }
        
        // Event listener para botones de marcar como gestionado
        if (e.target.matches('.manage-btn') || e.target.closest('.manage-btn')) {
            const btn = e.target.matches('.manage-btn') ? e.target : e.target.closest('.manage-btn');
            const callRow = btn.closest('.call-row');
            if (callRow) {
                const callId = callRow.dataset.id;
                if (callId) {
                    markCallAsManaged(parseInt(callId));
                }
            }
        }
        
        // Event listener para botones de actualizar datos
        if (e.target.matches('.refresh-btn') || e.target.closest('.refresh-btn')) {
            refreshDashboardData();
        }
        
        // Event listener para marcar emails como leídos/no leídos
        if (e.target.matches('.read-btn') || e.target.closest('.read-btn')) {
            const btn = e.target.matches('.read-btn') ? e.target : e.target.closest('.read-btn');
            const emailRow = btn.closest('.email-row');
            if (emailRow) {
                const emailId = emailRow.dataset.id;
                if (emailId) {
                    markEmailAsRead(parseInt(emailId));
                }
            }
        }
        
        // Event listener para ver historial de emails
        if (e.target.matches('.history-btn') || e.target.closest('.history-btn')) {
            const btn = e.target.matches('.history-btn') ? e.target : e.target.closest('.history-btn');
            const emailRow = btn.closest('.email-row');
            if (emailRow) {
                const emailId = emailRow.dataset.id;
                if (emailId) {
                    viewEmailHistory(parseInt(emailId));
                }
            }
        }
        
        // Event listener para responder con IA
        if (e.target.matches('.ai-reply-btn') || e.target.closest('.ai-reply-btn')) {
            const btn = e.target.matches('.ai-reply-btn') ? e.target : e.target.closest('.ai-reply-btn');
            const emailId = btn.dataset.id;
            if (emailId) {
                showAutoReplyModal(parseInt(emailId), 'ai');
            }
        }
        
        // Event listener para responder manualmente
        if (e.target.matches('.manual-reply-btn') || e.target.closest('.manual-reply-btn')) {
            const btn = e.target.matches('.manual-reply-btn') ? e.target : e.target.closest('.manual-reply-btn');
            const emailId = btn.dataset.id;
            if (emailId) {
                showAutoReplyModal(parseInt(emailId), 'manual');
            }
        }
        
        // Event listener para marcar llamadas o emails como importantes/favoritos (estrellas)
        if (e.target.matches('.star-btn') || e.target.closest('.star-btn') || e.target.matches('.fa-star') || e.target.matches('.far.fa-star')) {
            // Para botones de estrella en llamadas
            const btn = e.target.matches('.star-btn') ? e.target : e.target.closest('.star-btn');
            if (btn) {
                const callRow = btn.closest('.call-row');
                if (callRow) {
                    const callId = callRow.dataset.id;
                    if (callId) {
                        toggleCallImportance(parseInt(callId), btn);
                    }
                }
            }
            
            // Para iconos de estrella en emails
            const starIcon = e.target.matches('.fa-star') || e.target.matches('.far.fa-star') ? e.target : null;
            if (starIcon) {
                const emailRow = starIcon.closest('.email-row');
                if (emailRow) {
                    const emailId = emailRow.dataset.id;
                    if (emailId) {
                        toggleEmailFavorite(parseInt(emailId), starIcon);
                    }
                }
            }
        }
        
        // Event listeners para la pestaña de Facturación
        // Botón de actualizar plan
        if (e.target.matches('#upgrade-plan-btn') || e.target.closest('#upgrade-plan-btn')) {
            showUpgradePlanModal();
        }
        
        // Botón de añadir método de pago
        if (e.target.matches('#add-payment-method-btn') || e.target.closest('#add-payment-method-btn')) {
            showAddPaymentMethodModal();
        }
        
        // Botón de eliminar método de pago
        if (e.target.matches('#remove-payment-method-btn') || e.target.closest('#remove-payment-method-btn')) {
            showRemovePaymentMethodConfirmation();
        }
        
        // Botón de guardar datos de facturación
        if (e.target.matches('#save-billing-info-btn') || e.target.closest('#save-billing-info-btn')) {
            saveBillingInfo();
        }
        
        // Botón de ver facturas
        if (e.target.matches('#view-invoices-btn') || e.target.closest('#view-invoices-btn')) {
            // Activar la pestaña de historial
            const historyTab = document.getElementById('history-tab');
            if (historyTab) {
                historyTab.click();
            }
        }
    });
    
    // Configurar botón de guardar configuración del bot
    const saveBotConfigBtn = document.getElementById('save-bot-config-btn');
    if (saveBotConfigBtn) {
        saveBotConfigBtn.addEventListener('click', function() {
            saveUnifiedConfig();
        });
    }
    
    // Configurar botón de probar bot
    const testBotBtn = document.getElementById('test-bot-btn');
    if (testBotBtn) {
        testBotBtn.addEventListener('click', function() {
            testBotConfiguration();
        });
    }
    
    // El filtro de año ahora es estático (2025)
    // Ya no necesitamos un event listener para cambiar el año
    // Las facturas siempre se muestran para el año actual (2025)
    
    console.log('✅ Event listeners configurados');
}





/**
 * Inicializar el dashboard
 */
function initDashboard() {
    console.log('💻 Inicializando dashboard...');
    
    // Crear estructura del dashboard
    createDashboardStructure();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar datos de demostración directamente
    if (typeof loadDemoCallsData === 'function') {
        console.log('📞 Cargando datos de demostración para llamadas...');
        loadDemoCallsData();
    }
    
    if (typeof loadDemoEmailsData === 'function') {
        console.log('📧 Cargando datos de demostración para emails...');
        loadDemoEmailsData();
    }
    
    // Cargar datos existentes del perfil y configuración desde el backend
    loadExistingData();
    
    // Desactivar mensajes temporales excepto advertencias
    disableTemporaryMessages();
    
    console.log('✅ Dashboard inicializado correctamente');
}

/**
 * Desactivar mensajes temporales excepto advertencias
 * Esta función sobrescribe los métodos de toastr para que solo se muestren los mensajes de advertencia
 */
function disableTemporaryMessages() {
    // Guardar la función original de warning
    const originalWarning = toastr.warning;
    
    // Reemplazar todas las funciones de toastr con funciones vacías
    toastr.success = function() { /* No mostrar mensajes de éxito */ };
    toastr.info = function() { /* No mostrar mensajes informativos */ };
    toastr.error = function() { /* No mostrar mensajes de error */ };
    
    // Restaurar solo la función de advertencia
    toastr.warning = originalWarning;
    
    console.log('🔇 Mensajes temporales desactivados excepto advertencias');
}

/**
 * Actualizar datos del dashboard
 */
function refreshDashboardData() {
    console.log('🔄 Actualizando datos del dashboard...');
    
    // Mostrar notificación
    toastr.info('Actualizando datos...', 'Actualización');
    
    // Actualizar la hora de última actualización
    updateLastUpdateTime();
    
    // Actualizar datos de llamadas
    loadCallsData();
    
    // Actualizar datos de emails
    loadEmailsData();
    
    // Actualizar otros datos si es necesario
    // loadBotConfigData();
    // loadAccountData();
    // loadBillingData();
    
    // Mostrar notificación de éxito después de un breve retraso
    setTimeout(() => {
        toastr.success('Datos actualizados correctamente', 'Éxito');
    }, 1500);
}

/**
 * Cargar datos existentes desde el backend
 */
function loadExistingData() {
    console.log('📂 Cargando datos existentes desde el backend...');
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Cargar datos de perfil
    loadProfileData(token);
    
    // Cargar configuración del bot
    loadBotConfiguration(token);
    
    // Cargar configuración de emails
    loadEmailConfiguration(token);
}

/**
 * Cargar datos de perfil desde el backend
 * @param {string} token - Token de autenticación
 */
function loadProfileData(token) {
    console.log('👤 Cargando datos de perfil...');
    
    fetch('/api/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(profileData => {
        // Rellenar campos del formulario con los datos del perfil
        document.getElementById('company_name').value = profileData.companyName || '';
        document.getElementById('contact_email').value = profileData.email || '';
        document.getElementById('main_phone').value = profileData.phone || '';
        document.getElementById('address').value = profileData.address || '';
        document.getElementById('company_description').value = profileData.description || '';
        
        // Seleccionar la industria si está definida
        if (profileData.industry) {
            const industrySelect = document.getElementById('industry');
            if (industrySelect) {
                for (let i = 0; i < industrySelect.options.length; i++) {
                    if (industrySelect.options[i].value === profileData.industry) {
                        industrySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        console.log('✅ Datos de perfil cargados correctamente');
    })
    .catch(error => {
        console.error('❌ Error al cargar datos de perfil:', error);
        toastr.error('Error al cargar datos de perfil', 'Error');
    });
}

/**
 * Cargar configuración del bot desde el backend
 * @param {string} token - Token de autenticación
 */
function loadBotConfiguration(token) {
    console.log('🤖 Cargando configuración del bot...');
    
    fetch('/api/config/bot', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(botConfig => {
        // Rellenar campos del formulario con la configuración del bot
        if (botConfig.welcomeMessage) {
            document.getElementById('welcome_message').value = botConfig.welcomeMessage;
        }
        
        if (botConfig.businessHours) {
            document.getElementById('business_hours').value = botConfig.businessHours;
        }
        
        // Establecer personalidad del bot
        if (botConfig.personality) {
            const personalityRadios = document.querySelectorAll('input[name="bot_personality"]');
            personalityRadios.forEach(radio => {
                if (radio.value === botConfig.personality) {
                    radio.checked = true;
                }
            });
        }
        
        // Cargar FAQs si existen
        if (botConfig.faqs && botConfig.faqs.length > 0) {
            // Limpiar FAQs existentes
            const faqContainer = document.getElementById('faq-items-container');
            if (faqContainer) {
                faqContainer.innerHTML = '';
            }
            
            // Añadir FAQs desde la configuración
            botConfig.faqs.forEach(faq => addFaqItemToDOM(faq));
            
            // Actualizar mensaje de no hay preguntas
            updateNoFaqsMessage();
        }
        
        // Cargar archivos de contexto si existen
        if (botConfig.contextFiles && botConfig.contextFiles.length > 0) {
            const filesList = document.getElementById('context-files-list');
            if (filesList) {
                filesList.innerHTML = '';
                
                botConfig.contextFiles.forEach(file => {
                    const fileItem = document.createElement('li');
                    fileItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    fileItem.innerHTML = `
                        <span>
                            <i class="fas fa-file-alt me-2"></i>
                            ${file.name}
                        </span>
                        <span class="badge bg-success rounded-pill">${file.size} KB</span>
                    `;
                    filesList.appendChild(fileItem);
                });
            }
        }
        
        console.log('✅ Configuración del bot cargada correctamente');
    })
    .catch(error => {
        console.error('❌ Error al cargar configuración del bot:', error);
        toastr.error('Error al cargar configuración del bot', 'Error');
    });
}

/**
 * Cargar configuración de emails desde el backend
 * @param {string} token - Token de autenticación
 */
function loadEmailConfiguration(token) {
    console.log('📧 Cargando configuración de emails...');
    
    fetch('/api/config/email', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(emailConfig => {
        // Rellenar campos del formulario con la configuración de emails
        if (emailConfig.forwardRules) {
            document.getElementById('forward_rules').value = emailConfig.forwardRules;
        }
        
        if (emailConfig.defaultRecipients) {
            document.getElementById('recipient_email').value = emailConfig.defaultRecipients;
        }
        
        if (emailConfig.autoReplyEnabled !== undefined) {
            document.getElementById('auto_reply').checked = emailConfig.autoReplyEnabled;
        }
        
        if (emailConfig.autoReplyMessage) {
            document.getElementById('auto_reply_message').value = emailConfig.autoReplyMessage;
        }
        
        if (emailConfig.outgoingEmail) {
            document.getElementById('outgoing_email').value = emailConfig.outgoingEmail;
        }
        
        if (emailConfig.website) {
            document.getElementById('website').value = emailConfig.website;
        }
        
        if (emailConfig.emailLanguage) {
            document.getElementById('email_language').value = emailConfig.emailLanguage;
        }
        
        if (emailConfig.emailSignature) {
            document.getElementById('email_signature').value = emailConfig.emailSignature;
        }
        
        // Cargar configuración de proveedor de correo
        if (emailConfig.provider) {
            const emailProviderSelect = document.getElementById('email_provider');
            if (emailProviderSelect) {
                emailProviderSelect.value = emailConfig.provider;
                
                // Disparar el evento change para actualizar la UI
                const event = new Event('change');
                emailProviderSelect.dispatchEvent(event);
            }
        }
        
        // Cargar configuración manual de IMAP/SMTP si existe
        if (emailConfig.provider === 'other') {
            if (emailConfig.imapServer) document.getElementById('imap_server').value = emailConfig.imapServer;
            if (emailConfig.imapPort) document.getElementById('imap_port').value = emailConfig.imapPort;
            if (emailConfig.smtpServer) document.getElementById('smtp_server').value = emailConfig.smtpServer;
            if (emailConfig.smtpPort) document.getElementById('smtp_port').value = emailConfig.smtpPort;
            if (emailConfig.useSSL !== undefined) document.getElementById('use_ssl').checked = emailConfig.useSSL;
        }
        
        // Cargar estado de consentimiento
        if (emailConfig.emailConsent !== undefined) {
            const emailConsentCheckbox = document.getElementById('email_consent');
            if (emailConsentCheckbox) {
                emailConsentCheckbox.checked = emailConfig.emailConsent;
            }
        }
        
        // Cargar estado de conexión con el proveedor de correo
        if (emailConfig.connected) {
            // Actualizar UI para mostrar que está conectado
            updateEmailConnectionStatus({
                connected: true,
                provider: emailConfig.provider,
                email: emailConfig.outgoingEmail
            });
        }
        
        console.log('✅ Configuración de emails cargada correctamente');
    })
    .catch(error => {
        console.error('❌ Error al cargar configuración de emails:', error);
        toastr.error('Error al cargar configuración de emails', 'Error');
    });
}

/**
        company_description: 'Empresa líder en soluciones tecnológicas para negocios, especializada en software de gestión y automatización de procesos.',
        primary_language: 'es',
        bot_personality: 'professional',
        timezone: 'Europe/Madrid',
        opening_time: '09:00',
        closing_time: '18:00',
        twilio_phone_number: '+34 900 123 456',
        welcome_message: 'Hola, gracias por llamar a TechSolutions. ¿En qué puedo ayudarte hoy?',
        incoming_email: 'soporte@techsolutions.com',
        notification_email: 'admin@techsolutions.com',
        check_frequency: '15',
        confidence_level: '0.8',
        response_tone: 'professional',
        email_signature: `Saludos cordiales,\nEquipo de TechSolutions\nTel: +34 912 345 678\nWeb: www.techsolutions.com`,
        working_days: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
        },
        auto_priority: true,
        include_context: true,
        auto_classify: true,
        require_approval: false,
        notify_urgent: true,
        daily_summary: true
    };
    
    // Llenar campos del formulario
    Object.keys(existingData).forEach(key => {
        if (key === 'working_days') {
            Object.keys(existingData.working_days).forEach(day => {
                const checkbox = document.getElementById(day);
                if (checkbox) {
                    checkbox.checked = existingData.working_days[day];
                }
            });
        } else {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = existingData[key];
                } else {
                    element.value = existingData[key];
                }
            }
        }
    });
    
    // Actualizar contadores
    updateCallsCount();
    
    toastr.success('Datos cargados correctamente', 'Datos Existentes');
    console.log('✅ Datos existentes cargados');
}

/**
 * Configurar funcionalidades adicionales
 */
function setupAdditionalFeatures() {
    console.log('💻 Configurando funcionalidades adicionales...');
    
    // Configurar botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('🚪 Cerrando sesión...');
            // Lógica de cierre de sesión
        });
    }
    
    // Configurar toggle sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.body.classList.toggle('sb-sidenav-toggled');
        });
    }
    
    // Configurar botones de la pestaña de emails
    setupEmailFeatures();
    
    // Configurar funcionalidades de la pestaña de configuración
    setupConfigFeatures();
    
    console.log('✅ Funcionalidades adicionales configuradas');
}

/**
 * Actualizar contador de llamadas
 */
function updateCallsCount() {
    const callsCountElement = document.getElementById('calls-count');
    if (callsCountElement) {
        const callRows = document.querySelectorAll('.call-row:not(.d-none)');
        callsCountElement.textContent = callRows.length;
    }
}

/**
 * Reproducir grabación de llamada
 * @param {number} callId - ID de la llamada
 */
function playCallRecording(callId) {
    console.log(`🔊 Reproduciendo grabación de llamada ID: ${callId}`);
    
    // Registrar acción en el sistema de seguimiento
    if (window.UsageTracker) {
        window.UsageTracker.trackCall();
        window.UsageTracker.updateUI();
    }
    
    // Simular reproducción de audio
    const audioPlayer = document.getElementById('audio-player') || createAudioPlayer();
    audioPlayer.classList.remove('d-none');
    
    // Notificar al usuario
    toastr.info('Reproduciendo grabación de llamada', 'Audio');
}

/**
 * Crear un reproductor de audio si no existe
 * @returns {HTMLElement} - Elemento del reproductor de audio
 */
function createAudioPlayer() {
    const audioContainer = document.createElement('div');
    audioContainer.id = 'audio-player';
    audioContainer.className = 'audio-player-container position-fixed bottom-0 start-0 m-3';
    audioContainer.style.zIndex = '1050';
    audioContainer.innerHTML = `
        <div class="card shadow-sm" style="width: 300px;">
            <div class="card-body d-flex align-items-center p-2">
                <i class="fas fa-headphones me-2"></i>
                <div class="progress flex-grow-1 me-2" style="height: 8px;">
                    <div class="progress-bar bg-primary" role="progressbar" style="width: 45%"></div>
                </div>
                <span class="text-muted small">01:23</span>
                <button class="btn btn-sm btn-link text-danger ms-2" onclick="document.getElementById('audio-player').classList.add('d-none')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(audioContainer);
    return audioContainer;
}

/**
 * Alternar estado gestionado de una llamada
 * @param {number} callId - ID de la llamada
 */
function toggleCallManaged(callId) {
    const row = document.querySelector(`.call-row[data-id="${callId}"]`);
    if (!row) return;
    
    const checkbox = document.getElementById(`call-managed-${callId}`);
    if (checkbox) {
        const isChecked = checkbox.classList.contains('checked');
        if (isChecked) {
            checkbox.classList.remove('checked');
            toastr.info('Llamada marcada como no gestionada', 'Estado actualizado');
        } else {
            checkbox.classList.add('checked');
            toastr.success('Llamada marcada como gestionada', 'Estado actualizado');
        }
    }
}

/**
 * Alternar estado importante de una llamada
 * @param {number} callId - ID de la llamada
 */
function toggleCallImportant(callId) {
    console.log(`⭐ Alternando estado importante de llamada ID: ${callId}`);
    
    // Aquí se implementaría la lógica para marcar como importante
    // Por ahora solo mostramos una notificación
    toastr.success('Llamada marcada como importante', 'Estado actualizado');
}

/**
 * Inicializar los componentes dropdown de Bootstrap
 * Esta función debe llamarse después de añadir elementos dropdown al DOM
 */
function initializeDropdowns() {
    console.log('🔄 Inicializando dropdowns de Bootstrap...');
    
    // Obtener todos los elementos dropdown
    const dropdownElements = document.querySelectorAll('.dropdown-toggle');
    
    // Inicializar cada dropdown usando la API de Bootstrap 5
    if (dropdownElements.length > 0) {
        dropdownElements.forEach(dropdownEl => {
            // Verificar si el dropdown ya está inicializado
            if (!dropdownEl.hasAttribute('data-bs-initialized')) {
                // Crear una instancia de dropdown para cada elemento
                new bootstrap.Dropdown(dropdownEl);
                // Marcar como inicializado para evitar duplicados
                dropdownEl.setAttribute('data-bs-initialized', 'true');
            }
        });
        console.log(`✅ ${dropdownElements.length} dropdowns inicializados correctamente`);
    }
}

/**
 * Actualizar contador de emails
 */
function updateEmailsCount() {
    const emailsCountElement = document.getElementById('email-count');
    if (emailsCountElement) {
        const emailRows = document.querySelectorAll('.email-row:not(.d-none)');
        emailsCountElement.textContent = emailRows.length;
    }
}

/**
 * Cargar datos de emails desde la API
 */
function loadEmailsData() {
    console.log('📫 Cargando datos de emails desde el backend...');
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Mostrar indicador de carga
    const emailsTableBody = document.getElementById('emails-table-body');
    if (emailsTableBody) {
        emailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando emails...</p></td></tr>';
    }
    
    // Realizar petición al backend
    fetch('/api/emails', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(emailsData => {
        // Limpiar tabla de emails
        if (emailsTableBody) {
            emailsTableBody.innerHTML = '';
            
            if (emailsData.length === 0) {
                // Mostrar mensaje si no hay datos
                emailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No hay emails registrados</td></tr>';
            } else {
                // Generar filas de emails con el nuevo diseño moderno
                emailsData.forEach(email => {
                    const emailRow = createEmailRow(email);
                    emailsTableBody.appendChild(emailRow);
                });
            }
            
            // Actualizar contador
            updateEmailsCount();
            
            // Inicializar dropdowns de Bootstrap
            initializeDropdowns();
        }
        
        // Actualizar hora de última actualización
        const lastUpdateElement = document.getElementById('emails-last-update');
        if (lastUpdateElement) {
            const now = new Date();
            const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            lastUpdateElement.textContent = formattedDate;
        }
        
        console.log(`✅ ${emailsData.length} emails cargados correctamente`);
    })
    .catch(error => {
        console.error('❌ Error al cargar datos de emails:', error);
        toastr.error('Error al cargar datos de emails', 'Error');
        
        if (emailsTableBody) {
            emailsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="alert alert-danger">Error al cargar datos: ${error.message}</div></td></tr>`;
        }
    });
}

/**
 * Crear una fila de email con el nuevo diseño moderno y compacto
 * @param {Object} email - Datos del email
 * @returns {HTMLElement} - Elemento TR con la fila del email
 */
function createEmailRow(email) {
    const row = document.createElement('tr');
    row.className = 'email-row';
    if (!email.read) row.classList.add('fw-bold');
    row.dataset.id = email.id;
    row.dataset.type = '';
    
    if (!email.read) row.dataset.type += 'unread ';
    if (email.important) row.dataset.type += 'important ';
    if (email.spam) row.dataset.type += 'spam';
    
    row.innerHTML = `
        <td class="column-status text-center">
            <i class="${email.important ? 'fas' : 'far'} fa-star ${email.important ? 'text-warning' : ''}" 
               onclick="toggleEmailFavorite(${email.id}, this)"></i>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div class="fw-medium">${email.sender}</div>
                ${email.senderType ? `<span class="status-badge mt-1" style="background-color: var(--info-color);">${email.senderType}</span>` : ''}
            </div>
        </td>
        <td class="column-summary">
            <div class="d-flex flex-column">
                <div class="d-flex align-items-center mb-1">
                    ${!email.read ? '<i class="fas fa-circle text-primary me-2" style="font-size: 6px;"></i>' : ''}
                    <div class="fw-medium">${email.subject}</div>
                </div>
                <div class="text-muted small">${email.preview}</div>
            </div>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div class="small">${email.date}</div>
                <div class="text-muted small">${email.time}</div>
            </div>
        </td>
        <td class="column-actions">
            <div class="dropdown">
                <button class="action-btn" type="button" id="emailActions${email.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="emailActions${email.id}">
                    <li><a class="dropdown-item" href="#" onclick="viewEmailDetails(${email.id}); return false;">
                        <i class="fas fa-eye me-2"></i> Ver detalles
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="replyToEmail(${email.id}); return false;">
                        <i class="fas fa-reply me-2"></i> Responder
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="replyWithAI(${email.id}); return false;">
                        <i class="fas fa-robot me-2"></i> Responder con IA
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="toggleEmailRead(${email.id}); return false;">
                        <i class="fas ${email.read ? 'fa-envelope' : 'fa-envelope-open'} me-2"></i> 
                        ${email.read ? 'Marcar como no leído' : 'Marcar como leído'}
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteEmail(${email.id}); return false;">
                        <i class="fas fa-trash-alt me-2"></i> Eliminar
                    </a></li>
                </ul>
            </div>
        </td>
    `;
    
    return row;
}

/**
 * Eliminar un email
 * @param {number} emailId - ID del email a eliminar
 */
function deleteEmail(emailId) {
    console.log(`🗑️ Eliminando email ID: ${emailId}`);
    
    // Mostrar confirmación
    if (!confirm(`¿Está seguro de que desea eliminar el email #${emailId}?`)) {
        return;
    }
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Animar eliminación
    emailRow.style.transition = 'all 0.3s';
    emailRow.style.opacity = '0';
    emailRow.style.transform = 'translateX(20px)';
    
    setTimeout(() => {
        // Eliminar fila
        emailRow.remove();
        
        // Actualizar contador
        updateEmailsCount();
        
        // Notificar
        toastr.success(`Email #${emailId} eliminado correctamente`, 'Eliminado');
        
        // En producción, aquí se enviaría la eliminación a la API
        console.log(`API: Email ${emailId} eliminado del servidor`);
    }, 300);
}

/**
 * Ver detalles completos de una llamada
 * @param {number} callId - ID de la llamada
 */
function viewCallDetails(callId) {
    console.log(`👁️ Ver detalles completos de llamada ID: ${callId}`);
    
    // Buscar la fila de la llamada
    const callRow = document.querySelector(`.call-row[data-id="${callId}"]`);
    if (!callRow) {
        console.error(`No se encontró la llamada con ID ${callId}`);
        toastr.error('No se pudo encontrar la llamada', 'Error');
        return;
    }
    
    // Obtener datos de la llamada desde la fila
    const date = callRow.querySelector('td:nth-child(2) .fw-medium')?.textContent || '';
    const time = callRow.querySelector('td:nth-child(2) .text-muted')?.textContent || '';
    const phone = callRow.querySelector('td:nth-child(3) .fw-medium')?.textContent || '';
    const contactType = callRow.querySelector('td:nth-child(3) .text-muted')?.textContent || '';
    const summary = callRow.querySelector('td:nth-child(5) .fw-medium')?.textContent || '';
    const details = callRow.querySelector('td:nth-child(5) .text-muted')?.textContent || '';
    const duration = callRow.querySelector('td:nth-child(6) .badge-dashboard')?.textContent || '';
    
    // Determinar tipo y urgencia
    const classification = callRow.dataset.type || '';
    const urgency = callRow.dataset.urgency || '';
    
    // Crear modal con detalles
    const modalId = `call-details-modal-${callId}`;
    
    // Eliminar modal anterior si existe
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Crear estructura del modal
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content dashboard-card border-0">
                    <div class="modal-header border-0">
                        <h5 class="modal-title" id="${modalId}-label">
                            <i class="fas fa-phone-alt me-2"></i>Detalles de la llamada #${callId}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-calendar"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Fecha y hora</div>
                                        <div class="fw-medium">${date} ${time}</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center mb-3">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-phone"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Teléfono</div>
                                        <div class="fw-medium">${phone}</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Tipo de contacto</div>
                                        <div class="fw-medium">${contactType}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-tag"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Clasificación</div>
                                        <div class="fw-medium">
                                            ${getClassificationBadge(classification, urgency)}
                                        </div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center mb-3">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-clock"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Duración</div>
                                        <div class="fw-medium">${duration}</div>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div>
                                        <div class="text-muted small">Estado</div>
                                        <div class="fw-medium">
                                            ${callRow.querySelector('.custom-checkbox').classList.contains('checked') ? 
                                                '<span class="badge-dashboard badge-success">Gestionada</span>' : 
                                                '<span class="badge-dashboard badge-warning">Pendiente</span>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-card p-3 mb-4">
                            <h6 class="mb-3"><i class="fas fa-comment-alt me-2"></i>Resumen</h6>
                            <p class="mb-0">${summary}</p>
                        </div>
                        
                        <div class="dashboard-card p-3">
                            <h6 class="mb-3"><i class="fas fa-file-alt me-2"></i>Detalles completos</h6>
                            <p class="mb-0">${details}</p>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn-dashboard-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn-dashboard-primary play-call-btn">
                            <i class="fas fa-play me-2"></i>Reproducir grabación
                        </button>
                        <button type="button" class="btn-dashboard-success manage-call-btn" data-id="${callId}">
                            ${callRow.querySelector('.custom-checkbox').classList.contains('checked') ? 
                                '<i class="fas fa-undo me-2"></i>Desmarcar como gestionada' : 
                                '<i class="fas fa-check me-2"></i>Marcar como gestionada'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Obtener referencia al modal
    const modal = document.getElementById(modalId);
    
    // Configurar event listeners para los botones del modal
    if (modal) {
        // Botón de gestión
        const manageBtn = modal.querySelector('.manage-call-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', function() {
                markCallAsManaged(callId);
                
                // Actualizar texto del botón
                const isManaged = document.querySelector(`#call-managed-${callId}`).classList.contains('checked');
                if (isManaged) {
                    this.innerHTML = '<i class="fas fa-undo me-2"></i>Desmarcar como gestionada';
                    modal.querySelector('.fw-medium .badge-dashboard').className = 'badge-dashboard badge-success';
                    modal.querySelector('.fw-medium .badge-dashboard').textContent = 'Gestionada';
                } else {
                    this.innerHTML = '<i class="fas fa-check me-2"></i>Marcar como gestionada';
                    modal.querySelector('.fw-medium .badge-dashboard').className = 'badge-dashboard badge-warning';
                    modal.querySelector('.fw-medium .badge-dashboard').textContent = 'Pendiente';
                }
            });
        }
        
        // Botón de reproducción
        const playBtn = modal.querySelector('.play-call-btn');
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                toastr.info(`Reproduciendo grabación de la llamada #${callId}`, 'Reproducción');
                
                // Aquí iría la lógica para reproducir la grabación
                console.log(`🎧 Reproduciendo grabación de la llamada ID: ${callId}`);
            });
        }
        
        // Mostrar modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

/**
 * Configurar funcionalidades específicas de emails
 */
function setupEmailFeatures() {
    console.log('📧 Configurando funcionalidades de emails...');
    
    // Botón para clasificar emails
    const classifyEmailsBtn = document.getElementById('classify-emails-btn');
    if (classifyEmailsBtn) {
        classifyEmailsBtn.addEventListener('click', function() {
            console.log('🤖 Clasificando emails con IA...');
            toastr.info('Clasificando emails...', 'Procesando');
            
            // Simular procesamiento
            setTimeout(() => {
                toastr.success('Emails clasificados correctamente', 'Éxito');
            }, 2000);
        });
    }
    
    // Botón para refrescar emails
    const refreshEmailsBtn = document.getElementById('refresh-emails-btn');
    if (refreshEmailsBtn) {
        refreshEmailsBtn.addEventListener('click', function() {
            console.log('🔄 Actualizando bandeja de emails...');
            toastr.info('Actualizando bandeja de entrada...', 'Procesando');
            
            // Simular actualización
            setTimeout(() => {
                toastr.success('Bandeja actualizada correctamente', 'Éxito');
            }, 1500);
        });
    }
    
    // Configurar filtros de emails
    const emailFilters = document.querySelectorAll('input[name="email-filter"]');
    emailFilters.forEach(filter => {
        filter.addEventListener('change', function() {
            filterEmails(this.id.replace('filter-', ''));
        });
    });
    
    // Añadir botón de preview a la firma de email
    addEmailPreviewButton();
    
    console.log('✅ Funcionalidades de emails configuradas');
}

/**
 * Alternar estado de favorito de un email
 * @param {number} emailId - ID del email
 * @param {HTMLElement} starIcon - Icono de estrella
 */
function toggleEmailFavorite(emailId, starIcon) {
    console.log(`⭐ Alternando estado de favorito para email ID: ${emailId}`);
    
    if (!starIcon) return;
    
    const isImportant = starIcon.classList.contains('fas');
    
    if (isImportant) {
        starIcon.classList.replace('fas', 'far');
        starIcon.classList.remove('text-warning');
        toastr.info(`Email #${emailId} eliminado de favoritos`, 'Favoritos');
    } else {
        starIcon.classList.replace('far', 'fas');
        starIcon.classList.add('text-warning');
        toastr.success(`Email #${emailId} marcado como favorito`, 'Favoritos');
    }
    
    // Actualizar dataset del email row
    const emailRow = starIcon.closest('.email-row');
    if (emailRow) {
        const currentType = emailRow.dataset.type || '';
        if (isImportant) {
            emailRow.dataset.type = currentType.replace('important', '').trim();
        } else if (!currentType.includes('important')) {
            emailRow.dataset.type = (currentType + ' important').trim();
        }
    }
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Enviar actualización al backend
    fetch(`/api/emails/${emailId}/favorite`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            favorite: !isImportant
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Email ${emailId} estado de favorito actualizado a ${!isImportant}`);
    })
    .catch(error => {
        console.error('❌ Error al actualizar estado de favorito:', error);
        toastr.error('Error al actualizar estado de favorito', 'Error');
        
        // Revertir cambios en la UI en caso de error
        if (isImportant) {
            // Revertir a favorito
            starIcon.classList.replace('far', 'fas');
            starIcon.classList.add('text-warning');
            
            // Actualizar dataset
            if (emailRow && !emailRow.dataset.type.includes('important')) {
                emailRow.dataset.type = (emailRow.dataset.type + ' important').trim();
            }
        } else {
            // Revertir a no favorito
            starIcon.classList.replace('fas', 'far');
            starIcon.classList.remove('text-warning');
            
            // Actualizar dataset
            if (emailRow) {
                emailRow.dataset.type = emailRow.dataset.type.replace('important', '').trim();
            }
        }
    });
}

/**
 * Alternar estado de leído de un email
 * @param {number} emailId - ID del email
 */
function toggleEmailRead(emailId) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📣 Alternando estado de leído para email ID: ${emailId} por el usuario ${userId}`);
    
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) return;
    
    const isRead = !emailRow.classList.contains('fw-bold');
    const readBtn = emailRow.querySelector('.read-email-btn');
    const readIcon = readBtn?.querySelector('i');
    
    if (isRead) {
        // Marcar como no leído
        emailRow.classList.add('fw-bold');
        if (readIcon) readIcon.classList.replace('fa-envelope', 'fa-envelope-open');
        if (readBtn) {
            readBtn.classList.replace('action-btn-secondary', 'action-btn-primary');
            readBtn.title = 'Marcar como leído';
        }
        
        // Agregar indicador de no leído
        const subjectCell = emailRow.querySelector('td:nth-child(3) .d-flex');
        if (subjectCell && !subjectCell.querySelector('.fa-circle')) {
            const indicator = document.createElement('i');
            indicator.className = 'fas fa-circle text-primary me-2';
            indicator.style.fontSize = '8px';
            subjectCell.prepend(indicator);
        }
        
        // Actualizar dataset
        const currentType = emailRow.dataset.type || '';
        if (!currentType.includes('unread')) {
            emailRow.dataset.type = (currentType + ' unread').trim();
        }
        
        toastr.info(`Email #${emailId} marcado como no leído`, 'Estado actualizado');
    } else {
        // Marcar como leído
        emailRow.classList.remove('fw-bold');
        if (readIcon) readIcon.classList.replace('fa-envelope-open', 'fa-envelope');
        if (readBtn) {
            readBtn.classList.replace('action-btn-primary', 'action-btn-secondary');
            readBtn.title = 'Marcar como no leído';
        }
        
        // Eliminar indicador de no leído
        const indicator = emailRow.querySelector('td:nth-child(3) .fa-circle');
        if (indicator) indicator.remove();
        
        // Actualizar dataset
        emailRow.dataset.type = (emailRow.dataset.type || '').replace('unread', '').trim();
        
        // Registrar el email en el sistema de seguimiento de uso cuando se marca como leído
        if (!isRead && window.UsageTracker) {
            window.UsageTracker.trackEmail();
            console.log(`📊 Email registrado para el usuario ${userId}`);
            
            // Actualizar la UI del sistema de seguimiento
            window.UsageTracker.updateUI();
            
            // Actualizar el resumen de uso si está visible
            if (typeof showUsageSummary === 'function') {
                showUsageSummary();
            }
        }
        
        toastr.success(`Email #${emailId} marcado como leído`, 'Estado actualizado');
    }
    
    // En producción, aquí se enviaría la actualización a la API
    setTimeout(() => {
        console.log(`API: Email ${emailId} estado de leído actualizado a ${!isRead}`);
    }, 300);
}

/**
 * Filtrar emails por tipo
 * @param {string} type - Tipo de filtro
 */
function filterEmails(type) {
    console.log(`🔍 Filtrando emails por: ${type}`);
    
    // Implementación de filtrado
    const emailRows = document.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    emailRows.forEach(row => {
        const rowType = row.dataset.type || '';
        
        if (type === 'all') {
            row.classList.remove('d-none');
            visibleCount++;
        } else if (rowType.includes(type)) {
            row.classList.remove('d-none');
            visibleCount++;
        } else {
            row.classList.add('d-none');
        }
    });
    
    // Actualizar contador
    updateEmailsCount();
    
    // Mostrar notificación con el tipo de filtro aplicado
    const filterTypeText = {
        'all': 'todos',
        'unread': 'no leídos',
        'important': 'importantes',
        'spam': 'spam'
    };
    
    toastr.info(`Mostrando ${visibleCount} emails ${filterTypeText[type] || type}`, 'Filtro aplicado');
}

/**
 * Ver detalles completos de un email
 * @param {number} emailId - ID del email
 */
function viewEmailDetails(emailId) {
    console.log(`👁️ Ver detalles completos de email ID: ${emailId}`);
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Obtener datos del email desde la fila
    const sender = emailRow.querySelector('td:nth-child(2) div:first-child')?.textContent || '';
    const senderType = emailRow.querySelector('td:nth-child(2) .badge-dashboard')?.textContent || '';
    const subject = emailRow.querySelector('td:nth-child(3) .text-truncate')?.textContent || '';
    const date = emailRow.querySelector('td:nth-child(4) div:first-child')?.textContent || '';
    const time = emailRow.querySelector('td:nth-child(4) .small')?.textContent || '';
    
    // Simular obtención del contenido completo (en producción vendría de la API)
    let content = '';
    if (emailId === 1) {
        content = 'Buenas tardes,\n\nMe gustaría obtener más información sobre sus productos premium, especialmente sobre las pieles sintéticas para tapicería. Necesito conocer precios, disponibilidad y tiempos de entrega para un proyecto importante.\n\nGracias de antemano,\nJuan Pérez\nDirector de Proyectos\nInteriorismo Moderno S.L.';
    } else if (emailId === 2) {
        content = 'Estimado cliente,\n\nAdjunto encontrará nuestro nuevo catálogo de productos para 2024 con todas las novedades y actualizaciones de precios. Hemos incorporado nuevas líneas de productos que podrían ser de su interés.\n\nNo dude en contactarnos para cualquier consulta.\n\nSaludos cordiales,\nMaría García\nDepartamento Comercial\nProveedores Unidos S.A.';
    } else if (emailId === 3) {
        content = '¡Ofertas especiales solo este mes!\n\nDescubra nuestras ofertas exclusivas para clientes VIP. ¡Solo durante este mes! Aproveche descuentos de hasta el 50% en productos seleccionados.\n\nHaga clic aquí para ver todas las ofertas.\n\nSi no desea recibir más emails como este, haga clic aquí para darse de baja.';
    } else {
        content = 'Contenido del email no disponible.';
    }
    
    // Formatear el contenido para HTML (reemplazar saltos de línea)
    const formattedContent = content.replace(/\n/g, '<br>');
    
    // Crear modal con detalles
    const modalId = `email-details-modal-${emailId}`;
    
    // Eliminar modal anterior si existe
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Crear estructura del modal
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content dashboard-card border-0">
                    <div class="modal-header border-0">
                        <h5 class="modal-title" id="${modalId}-label">
                            <i class="fas fa-envelope me-2"></i>${subject}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="d-flex justify-content-between mb-4">
                            <div>
                                <div class="d-flex align-items-center">
                                    <div class="icon-circle bg-primary text-white me-3">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <div class="fw-medium">${sender}</div>
                                        ${senderType ? `<span class="badge-dashboard badge-primary mt-1">${senderType}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-end">
                                <div class="fw-medium">${date}</div>
                                <div class="text-muted small">${time}</div>
                            </div>
                        </div>
                        
                        <div class="dashboard-card p-3">
                            <div class="email-content">${formattedContent}</div>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn-dashboard-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn-dashboard-primary reply-btn" onclick="replyToEmail(${emailId})">
                            <i class="fas fa-reply me-2"></i>Responder
                        </button>
                        <button type="button" class="btn-dashboard-info reply-with-ai-btn" onclick="replyWithAI(${emailId})">
                            <i class="fas fa-robot me-2"></i>Responder con IA
                        </button>
                        <button type="button" class="btn-dashboard-success forward-btn">
                            <i class="fas fa-share me-2"></i>Reenviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Obtener referencia al modal
    const modal = document.getElementById(modalId);
    
    // Configurar event listeners para los botones del modal
    if (modal) {
        // Botón de responder
        const replyBtn = modal.querySelector('.reply-btn');
        if (replyBtn) {
            replyBtn.addEventListener('click', function() {
                toastr.info(`Respondiendo al email #${emailId}`, 'Respuesta');
                console.log(`💬 Respondiendo al email ID: ${emailId}`);
                // Aquí iría la lógica para responder al email
            });
        }
        
        // Botón de reenviar
        const forwardBtn = modal.querySelector('.forward-btn');
        if (forwardBtn) {
            forwardBtn.addEventListener('click', function() {
                toastr.info(`Reenviando email #${emailId}`, 'Reenviar');
                console.log(`🔁 Reenviando email ID: ${emailId}`);
                // Aquí iría la lógica para reenviar el email
            });
        }
        
        // Mostrar modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Marcar como leído si no lo estaba
        if (emailRow.classList.contains('fw-bold')) {
            toggleEmailRead(emailId);
        }
    }
}

/**
 * Ver historial de email
 * @param {number} emailId - ID del email
 */
function viewEmailHistory(emailId) {
    console.log(`📃 Viendo historial del email ${emailId}`);
    
    // Mostrar modal de historial
    const historyModal = new bootstrap.Modal(document.getElementById('email-history-modal'));
    
    // Actualizar título del modal
    const modalTitle = document.querySelector('#email-history-modal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Historial de email #${emailId}`;
    }
    
    // Simular carga de datos
    const historyContent = document.getElementById('email-history-content');
    if (historyContent) {
        // Mostrar spinner de carga
        historyContent.innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </div>
        `;
        
        // Simular carga de datos (en producción cargaría de la API)
        setTimeout(() => {
            // Datos de ejemplo (en producción serían dinámicos)
            const emailHistory = [
                {
                    id: emailId + '-3',
                    date: new Date(Date.now() - 3600000).toLocaleString(),
                    subject: 'RE: Consulta sobre productos',
                    from: 'soporte@techsolutions.com',
                    to: 'cliente@example.com',
                    content: 'Estimado cliente, gracias por su respuesta. Adjunto encontrará el catálogo actualizado con los precios que solicitó. Quedamos a su disposición para cualquier duda adicional.',
                    direction: 'outgoing'
                },
                {
                    id: emailId + '-2',
                    date: new Date(Date.now() - 7200000).toLocaleString(),
                    subject: 'RE: Consulta sobre productos',
                    from: 'cliente@example.com',
                    to: 'soporte@techsolutions.com',
                    content: 'Gracias por su rápida respuesta. Me gustaría recibir más información sobre los precios de los productos mencionados.',
                    direction: 'incoming'
                },
                {
                    id: emailId + '-1',
                    date: new Date(Date.now() - 10800000).toLocaleString(),
                    subject: 'RE: Consulta sobre productos',
                    from: 'soporte@techsolutions.com',
                    to: 'cliente@example.com',
                    content: 'Estimado cliente, hemos recibido su consulta sobre nuestros productos. Adjunto encontrará nuestro catálogo con toda la información solicitada. No dude en contactarnos si necesita más detalles.',
                    direction: 'outgoing'
                },
                {
                    id: emailId + '-0',
                    date: new Date(Date.now() - 14400000).toLocaleString(),
                    subject: 'Consulta sobre productos',
                    from: 'cliente@example.com',
                    to: 'soporte@techsolutions.com',
                    content: 'Hola, estoy interesado en conocer más detalles sobre sus productos y servicios. ¿Podrían enviarme un catálogo o información adicional? Gracias de antemano.',
                    direction: 'incoming'
                }
            ];
            
            // Actualizar contenido del modal
            historyContent.innerHTML = `
                <div class="email-thread">
                    ${emailHistory.map(email => `
                        <div class="card border-0 shadow-sm mb-3 ${email.direction === 'incoming' ? 'border-start border-primary' : 'border-start border-success'}">
                            <div class="card-header bg-transparent">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <strong>${email.direction === 'incoming' ? email.from : email.to}</strong>
                                        <span class="text-muted ms-2">${email.date}</span>
                                    </div>
                                    <div class="col-auto">
                                        <span class="badge ${email.direction === 'incoming' ? 'bg-primary' : 'bg-success'}">
                                            ${email.direction === 'incoming' ? 'Recibido' : 'Enviado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <h5 class="card-title">${email.subject}</h5>
                                <p class="card-text">${email.content}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mt-4">
                    <button type="button" class="btn btn-primary ai-reply-btn" data-id="${emailId}">
                        <i class="fas fa-robot me-2"></i>Responder con IA
                    </button>
                    <button type="button" class="btn btn-outline-secondary ms-2 manual-reply-btn" data-id="${emailId}">
                        <i class="fas fa-edit me-2"></i>Responder manualmente
                    </button>
                    <button type="button" class="btn btn-outline-success ms-2" onclick="markEmailAsRead(${emailId})">
                        <i class="fas fa-check me-2"></i>Marcar como leído
                    </button>
                </div>
            `;
        }, 1000);
    }
    
    // Mostrar modal
    historyModal.show();
    
    toastr.info('Cargando historial del email...', 'Historial');
}

/**
 * Marcar email como leído
 * @param {number} emailId - ID del email
 */
function markEmailAsRead(emailId) {
    console.log(`✅ Marcando email como leído ID: ${emailId}`);
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Verificar si ya está leído
    const isRead = !emailRow.classList.contains('fw-bold');
    
    if (isRead) {
        // Marcar como no leído
        emailRow.classList.add('fw-bold');
        emailRow.dataset.type = emailRow.dataset.type.includes('unread') ? emailRow.dataset.type : `unread ${emailRow.dataset.type}`;
        toastr.info(`Email #${emailId} marcado como no leído`, 'Estado actualizado');
    } else {
        // Marcar como leído
        emailRow.classList.remove('fw-bold');
        emailRow.dataset.type = emailRow.dataset.type.replace('unread', '').trim();
        if (emailRow.dataset.type === '') {
            emailRow.dataset.type = 'read';
        }
        toastr.success(`Email #${emailId} marcado como leído`, 'Estado actualizado');
    }
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Enviar actualización al backend
    fetch(`/api/emails/${emailId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            read: isRead
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Email ${emailId} estado actualizado a ${!isRead ? 'no leído' : 'leído'}`);
    })
    .catch(error => {
        console.error('❌ Error al actualizar estado del email:', error);
        toastr.error('Error al actualizar estado del email', 'Error');
        
        // Revertir cambios en la UI en caso de error
        if (!isRead) {
            // Revertir a leído
            emailRow.classList.remove('fw-bold');
            emailRow.dataset.type = emailRow.dataset.type.replace('unread', '').trim();
            if (emailRow.dataset.type === '') {
                emailRow.dataset.type = 'read';
            }
        } else {
            // Revertir a no leído
            emailRow.classList.add('fw-bold');
            emailRow.dataset.type = emailRow.dataset.type.includes('unread') ? emailRow.dataset.type : `unread ${emailRow.dataset.type}`;
        }
    });
    
    // Si estamos filtrando por 'unread', actualizar visibilidad
    const unreadFilter = document.getElementById('filter-unread');
    if (unreadFilter && unreadFilter.checked && isRead) {
        emailRow.classList.add('d-none');
    }
    
    // Actualizar contador
    const emailCount = document.getElementById('email-count');
    if (emailCount) {
        const visibleRows = document.querySelectorAll('.email-row:not(.d-none)');
        emailCount.textContent = visibleRows.length;
    }
}

/**
 * Mostrar modal para respuesta automática
 * @param {number} emailId - ID del email
 * @param {string} mode - Modo de respuesta (ai o manual)
 */
function showAutoReplyModal(emailId, mode) {
    console.log(`💬 Mostrando modal de respuesta para email ${emailId} en modo ${mode}`);
    
    // Obtener información del email original
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    let emailSubject = 'Consulta';
    let senderName = 'Cliente';
    
    if (emailRow) {
        // Obtener el asunto del email
        const subjectCell = emailRow.querySelector('td:nth-child(3)');
        if (subjectCell) {
            emailSubject = subjectCell.textContent.trim();
        }
        
        // Obtener el nombre del remitente
        const senderCell = emailRow.querySelector('td:nth-child(2)');
        if (senderCell) {
            senderName = senderCell.textContent.trim().split(' ')[0]; // Obtener solo el primer nombre
        }
    }
    
    // Preparar el asunto de respuesta
    const replySubject = emailSubject.startsWith('RE:') ? emailSubject : `RE: ${emailSubject}`;
    
    const modalTitle = mode === 'ai' ? 'Respuesta Automática IA' : 'Respuesta Manual';
    const modalContent = mode === 'ai' ? 
        'La IA está generando una respuesta personalizada basada en el contenido del email y el historial del cliente...' : 
        'Editor para redactar una respuesta manual al email seleccionado.';
    
    // Crear modal dinámicamente
    const modalHTML = `
        <div class="modal fade" id="replyModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${mode === 'ai' ? '<i class="fas fa-robot me-2"></i>' : '<i class="fas fa-edit me-2"></i>'}
                            ${modalTitle} - Email #${emailId}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${mode === 'ai' ? 
                            `<div class="d-flex align-items-center mb-3">
                                <div class="spinner-border text-primary me-3" role="status"></div>
                                <span>Generando respuesta con IA...</span>
                            </div>
                            <div class="progress mb-3">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 75%"></div>
                            </div>` : 
                            `<div class="form-group mb-3">
                                <label class="form-label">Asunto</label>
                                <input type="text" class="form-control" value="${replySubject}">
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Contenido</label>
                                <textarea class="form-control" rows="8">Estimado ${senderName},

Gracias por contactar con nosotros.

[Escriba aquí su respuesta]

Saludos cordiales,
Equipo de Atención al Cliente</textarea>
                            </div>`
                        }
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        ${mode === 'ai' ? 
                            `<button type="button" class="btn btn-primary" disabled>Enviar Respuesta</button>` : 
                            `<button type="button" class="btn btn-primary">Enviar Respuesta</button>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('replyModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('replyModal'));
    modal.show();
    
    // Si es modo IA, simular generación de respuesta
    if (mode === 'ai') {
        setTimeout(() => {
            // Obtener firma configurada
            const signature = document.getElementById('email_signature')?.value || '';
            const companyName = document.getElementById('company_name')?.value || 'Tu Empresa';
            const outgoingEmail = document.getElementById('outgoing_email')?.value || `soporte@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
            const website = document.getElementById('website')?.value || 'www.empresa.com';
            const phone = document.getElementById('main_phone')?.value || '+34 900 000 000';
            
            // Procesar firma con variables
            const processedSignature = signature
                .replace(/{EMPRESA}/g, companyName)
                .replace(/{NOMBRE}/g, 'Equipo de Soporte')
                .replace(/{CARGO}/g, 'Atención al Cliente')
                .replace(/{TELEFONO}/g, phone)
                .replace(/{EMAIL}/g, outgoingEmail)
                .replace(/{WEB}/g, website);
            
            const modalBody = document.querySelector('#replyModal .modal-body');
            modalBody.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Respuesta generada correctamente
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Asunto</label>
                    <input type="text" class="form-control" value="${replySubject}">
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Respuesta generada por IA</label>
                    <textarea class="form-control" rows="8">Estimado ${senderName},

Gracias por contactar con nosotros. En respuesta a su consulta sobre ${emailSubject.replace(/^RE:\s*/i, '')}, me complace informarle que disponemos de una amplia gama de opciones que podrían ajustarse a sus necesidades.

Basado en su interés, le recomendaría revisar nuestro catálogo adjunto donde encontrará información detallada sobre especificaciones, precios y disponibilidad.

Si necesita información adicional o tiene alguna otra pregunta, no dude en contactarnos nuevamente.

${processedSignature}</textarea>
                </div>
            `;
            
            // Habilitar botón de enviar
            const sendButton = document.querySelector('#replyModal .btn-primary');
            sendButton.disabled = false;
            
            // Agregar evento al botón de enviar
            sendButton.addEventListener('click', () => {
                // Simular envío de respuesta
                sendButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
                sendButton.disabled = true;
                
                setTimeout(() => {
                    toastr.success(`Respuesta enviada al email #${emailId}`, 'Éxito');
                    modal.hide();
                    
                    // Marcar email como leído
                    markEmailAsRead(emailId);
                }, 1500);
            });
        }, 2000);
    } else {
        // Configurar botón de enviar para modo manual
        const sendButton = document.querySelector('#replyModal .btn-primary');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                // Simular envío de respuesta
                sendButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
                sendButton.disabled = true;
                
                setTimeout(() => {
                    toastr.success(`Respuesta enviada al email #${emailId}`, 'Éxito');
                    modal.hide();
                    
                    // Marcar email como leído
                    markEmailAsRead(emailId);
                }, 1500);
            });
        }
    }
}

/**
 * Agregar botón de preview a la firma
 */
function addEmailPreviewButton() {
    // Agregar botón de preview después del textarea de firma
    setTimeout(() => {
        const signatureTextarea = document.getElementById('email_signature');
        if (signatureTextarea && !document.getElementById('preview-signature-btn')) {
            const previewButton = document.createElement('button');
            previewButton.type = 'button';
            previewButton.id = 'preview-signature-btn';
            previewButton.className = 'btn btn-outline-secondary btn-sm mt-2';
            previewButton.innerHTML = '<i class="fas fa-eye me-1"></i>Preview Email';
            previewButton.onclick = previewEmailTemplate;
            
            signatureTextarea.parentNode.appendChild(previewButton);
        }
    }, 1000);
}

/**
 * Previsualizar plantilla de email
 */
function previewEmailTemplate() {
    const signature = document.getElementById('email_signature')?.value || '';
    const companyName = document.getElementById('company_name')?.value || 'Tu Empresa';
    const outgoingEmail = document.getElementById('outgoing_email')?.value || `soporte@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
    const website = document.getElementById('website')?.value || 'www.empresa.com';
    const phone = document.getElementById('main_phone')?.value || '+34 900 000 000';
    
    // Reemplazar variables en la firma
    const processedSignature = signature
        .replace(/{EMPRESA}/g, companyName)
        .replace(/{NOMBRE}/g, 'Equipo de Soporte')
        .replace(/{CARGO}/g, 'Atención al Cliente')
        .replace(/{TELEFONO}/g, phone)
        .replace(/{EMAIL}/g, outgoingEmail)
        .replace(/{WEB}/g, website)
        .replace(/\n/g, '<br>');
    
    const modalHTML = `
        <div class="modal fade" id="emailPreviewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-eye me-2"></i>Preview de Email
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="card">
                            <div class="card-header bg-light">
                                <strong>De:</strong> ${outgoingEmail}<br>
                                <strong>Para:</strong> cliente@ejemplo.com<br>
                                <strong>Asunto:</strong> Re: Consulta sobre productos
                            </div>
                            <div class="card-body">
                                <p>Estimado/a Juan Pérez,</p>
                                <p>Gracias por contactar con nosotros. Hemos recibido su consulta sobre nuestros productos y servicios.</p>
                                <p>[Aquí iría la respuesta generada por IA basada en el contexto del email]</p>
                                <hr>
                                <div class="email-signature">${processedSignature}</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById('emailPreviewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('emailPreviewModal'));
    modal.show();
}

/**
 * Configurar funcionalidades específicas de emails
 */
function setupEmailFeatures() {
    console.log('📧 Configurando funcionalidades de emails...');
    
    // Botón para clasificar emails
    const classifyEmailsBtn = document.getElementById('classify-emails-btn');
    if (classifyEmailsBtn) {
        classifyEmailsBtn.addEventListener('click', function() {
            console.log('🤖 Clasificando emails con IA...');
            toastr.info('Clasificando emails...', 'Procesando');
            
            // Simular procesamiento
            setTimeout(() => {
                toastr.success('Emails clasificados correctamente', 'Éxito');
            }, 2000);
        });
    }
    
    // Botón para refrescar emails
    const refreshEmailsBtn = document.getElementById('refresh-emails-btn');
    if (refreshEmailsBtn) {
        refreshEmailsBtn.addEventListener('click', function() {
            console.log('🔄 Actualizando bandeja de emails...');
            toastr.info('Actualizando bandeja de entrada...', 'Procesando');
            
            // Simular actualización
            setTimeout(() => {
                toastr.success('Bandeja actualizada correctamente', 'Éxito');
            }, 1500);
        });
    }
    
    // Configurar filtros de emails
    const emailFilters = document.querySelectorAll('input[name="email-filter"]');
    emailFilters.forEach(filter => {
        filter.addEventListener('change', function() {
            filterEmails(this.id.replace('filter-', ''));
        });
    });
    
    // Añadir botón de preview a la firma de email
    addEmailPreviewButton();
    
    console.log('✅ Funcionalidades de emails configuradas');
}

/**
 * Mostrar modal de respuesta automática o manual para emails
 * @param {number} emailId - ID del email
 * @param {string} mode - Modo de respuesta ('auto' o 'manual')
 */
function showAutoReplyModal(emailId, mode) {
    console.log(`💬 Mostrando modal de respuesta ${mode} para email ${emailId}`);
    
    // Construir el modal dinámicamente
    const modalHTML = `
        <div class="modal fade" id="replyModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-${mode === 'auto' ? 'robot' : 'edit'} me-2"></i>
                            ${mode === 'auto' ? 'Respuesta Automática' : 'Respuesta Manual'}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Asunto:</label>
                            <input type="text" class="form-control" value="Re: Consulta sobre productos" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Contenido:</label>
                            <textarea class="form-control" rows="8" id="reply-content">${mode === 'auto' ? 'Generando respuesta con IA...' : ''}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" ${mode === 'auto' ? 'disabled' : ''}>Enviar Respuesta</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('replyModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('replyModal'));
    modal.show();
    
    // Si es automático, simular generación de respuesta con IA
    if (mode === 'auto') {
        setTimeout(() => {
            document.getElementById('reply-content').value = 'Estimado cliente,\n\nGracias por contactar con nosotros. En respuesta a su consulta sobre nuestros productos, me complace informarle que disponemos de una amplia gama de soluciones adaptadas a sus necesidades.\n\nNuestro equipo está a su disposición para ofrecerle más detalles o concertar una demostración personalizada.\n\nSaludos cordiales,';
            document.querySelector('#replyModal .btn-primary').disabled = false;
            
            // Marcar email como leído automáticamente
            markEmailAsRead(emailId);
        }, 3000);
    }
    
    // Configurar botón de enviar
    setTimeout(() => {
        const sendButton = document.querySelector('#replyModal .btn-primary');
        if (sendButton) {
            sendButton.addEventListener('click', function() {
                toastr.success(`Respuesta enviada al email ${emailId}`, 'Éxito');
                modal.hide();
            });
        }
    }, 500);
}

/**
 * Ver historial de email
 * @param {number} emailId - ID del email
 */
function viewEmailHistory(emailId) {
    console.log(`📜 Viendo historial del email ${emailId}`);
    toastr.info(`Mostrando historial del email ${emailId}`, 'Historial');
}

/**
 * Ver reporte de llamada
 * @param {number} reportId - ID del reporte
 */
function viewCallReport(reportId) {
    console.log(`📞 Viendo reporte de llamada ${reportId}`);
    toastr.info(`Mostrando reporte de llamada ${reportId}`, 'Reporte');
}

/**
 * Marcar o desmarcar una llamada como importante (estrella)
 * @param {number} callId - ID de la llamada
 * @param {HTMLElement} starBtn - Botón de estrella
 */
function toggleCallImportance(callId, starBtn) {
    console.log(`⭐ Cambiando importancia de llamada ID: ${callId}`);
    
    // Verificar si ya está marcada como importante
    const isStarred = starBtn.querySelector('i').classList.contains('fas');
    
    if (isStarred) {
        // Desmarcar como importante
        starBtn.querySelector('i').classList.remove('fas');
        starBtn.querySelector('i').classList.add('far');
        starBtn.classList.remove('btn-warning');
        starBtn.classList.add('btn-outline-warning');
        toastr.info(`Llamada #${callId} desmarcada como importante`, 'Actualizado');
    } else {
        // Marcar como importante
        starBtn.querySelector('i').classList.remove('far');
        starBtn.querySelector('i').classList.add('fas');
        starBtn.classList.remove('btn-outline-warning');
        starBtn.classList.add('btn-warning');
        toastr.success(`Llamada #${callId} marcada como importante`, 'Actualizado');
    }
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Enviar actualización al backend
    fetch(`/api/calls/${callId}/importance`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            important: !isStarred
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Llamada ${callId} importancia actualizada a ${!isStarred ? 'importante' : 'normal'}`);
    })
    .catch(error => {
        console.error('❌ Error al actualizar importancia de la llamada:', error);
        toastr.error('Error al actualizar importancia de la llamada', 'Error');
        
        // Revertir cambios en la UI en caso de error
        if (isStarred) {
            // Revertir a importante
            starBtn.querySelector('i').classList.remove('far');
            starBtn.querySelector('i').classList.add('fas');
            starBtn.classList.remove('btn-outline-warning');
            starBtn.classList.add('btn-warning');
        } else {
            // Revertir a normal
            starBtn.querySelector('i').classList.remove('fas');
            starBtn.querySelector('i').classList.add('far');
            starBtn.classList.remove('btn-warning');
            starBtn.classList.add('btn-outline-warning');
        }
    });
}

/**
 * Marcar o desmarcar un email como favorito
 * @param {number} emailId - ID del email
 * @param {HTMLElement} starIcon - Icono de estrella
 */
function toggleEmailFavorite(emailId, starIcon) {
    console.log(`⭐ Cambiando estado de favorito del email ID: ${emailId}`);
    
    const isFavorite = starIcon.classList.contains('fas');
    const emailRow = starIcon.closest('.email-row');
    
    if (isFavorite) {
        // Desmarcar como favorito
        starIcon.classList.remove('fas');
        starIcon.classList.remove('text-warning');
        starIcon.classList.add('far');
        starIcon.classList.add('text-muted');
        
        // Actualizar el tipo de email en el dataset
        if (emailRow) {
            const currentType = emailRow.dataset.type || '';
            emailRow.dataset.type = currentType.replace('important', '').trim();
        }
        
        toastr.info(`Email #${emailId} desmarcado como favorito`, 'Favorito actualizado');
    } else {
        // Marcar como favorito
        starIcon.classList.remove('far');
        starIcon.classList.remove('text-muted');
        starIcon.classList.add('fas');
        starIcon.classList.add('text-warning');
        
        // Actualizar el tipo de email en el dataset
        if (emailRow) {
            const currentType = emailRow.dataset.type || '';
            if (!currentType.includes('important')) {
                emailRow.dataset.type = `${currentType} important`.trim();
            }
        }
        
        toastr.warning(`Email #${emailId} marcado como favorito`, 'Favorito actualizado');
    }
    
    // En producción, aquí se enviaría la actualización a la API
    // Simular llamada a API
    setTimeout(() => {
        console.log(`API: Email ${emailId} estado de favorito actualizado a ${!isFavorite ? 'favorito' : 'normal'}`);
    }, 500);
    
    // Actualizar el filtrado si está activo el filtro de importantes
    const importantFilter = document.getElementById('filter-important');
    if (importantFilter && importantFilter.checked) {
        filterEmails('important');
    }
}

/**
 * Configurar el selector de horario comercial
 */
function setupBusinessHoursSelector() {
    // Obtener referencias a los elementos
    const businessDays = document.querySelectorAll('.business-day');
    const startHourSelect = document.getElementById('business-hours-start');
    const endHourSelect = document.getElementById('business-hours-end');
    const businessHoursInput = document.getElementById('business_hours');
    const businessHoursPreview = document.getElementById('business-hours-preview');
    
    // Función para actualizar el horario comercial
    function updateBusinessHours() {
        // Recopilar días seleccionados
        const selectedDays = [];
        businessDays.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDays.push(checkbox.dataset.day);
            }
        });
        
        // Formatear el rango de días
        let daysText = '';
        if (selectedDays.length === 0) {
            daysText = 'Sin días seleccionados';
        } else if (selectedDays.length === 7) {
            daysText = 'Todos los días';
        } else {
            // Agrupar días consecutivos con guiones
            const dayOrder = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            const orderedDays = selectedDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
            
            let currentGroup = [orderedDays[0]];
            const groups = [];
            
            for (let i = 1; i < orderedDays.length; i++) {
                const currentDayIndex = dayOrder.indexOf(orderedDays[i]);
                const prevDayIndex = dayOrder.indexOf(orderedDays[i-1]);
                
                if (currentDayIndex - prevDayIndex === 1) {
                    // Día consecutivo, añadir al grupo actual
                    currentGroup.push(orderedDays[i]);
                } else {
                    // No consecutivo, cerrar grupo actual y empezar uno nuevo
                    groups.push(currentGroup);
                    currentGroup = [orderedDays[i]];
                }
            }
            groups.push(currentGroup);
            
            // Formatear grupos
            daysText = groups.map(group => {
                if (group.length === 1) {
                    return group[0];
                } else {
                    return `${group[0]}-${group[group.length - 1]}`;
                }
            }).join(', ');
        }
        
        // Obtener horas seleccionadas
        const startHour = startHourSelect.value;
        const endHour = endHourSelect.value;
        
        // Crear texto completo del horario
        const businessHoursText = selectedDays.length === 0 ? 
            'Sin horario definido' : 
            `${daysText}: ${startHour}-${endHour}`;
        
        // Actualizar el campo oculto y el preview
        businessHoursInput.value = businessHoursText;
        businessHoursPreview.textContent = businessHoursText;
        
        // Cambiar el color del badge según si hay días seleccionados
        if (selectedDays.length === 0) {
            businessHoursPreview.classList.remove('bg-primary');
            businessHoursPreview.classList.add('bg-danger');
        } else {
            businessHoursPreview.classList.remove('bg-danger');
            businessHoursPreview.classList.add('bg-primary');
        }
    }
    
    // Añadir event listeners
    businessDays.forEach(checkbox => {
        checkbox.addEventListener('change', updateBusinessHours);
    });
    
    startHourSelect.addEventListener('change', updateBusinessHours);
    endHourSelect.addEventListener('change', updateBusinessHours);
    
    // Inicializar con los valores actuales
    updateBusinessHours();
}

/**
 * Actualizar la interfaz de usuario con los datos de uso del plan
 */
function updatePlanUsageUI() {
    const userId = window.UsageTracker?.getCurrentUserId();
    console.log(`📈 Actualizando UI con datos de uso del plan para el usuario ${userId}...`);
    
    if (!window.UsageTracker) {
        console.error('Sistema de seguimiento de uso no inicializado');
        return;
    }
    
    // Obtener datos de uso actuales del usuario específico
    const usageData = window.UsageTracker.getUsage();
    if (!usageData || !usageData.usage) {
        console.error('No se encontraron datos de uso para el usuario actual');
        return;
    }
    
    const planLimits = window.UsageTracker.getCurrentPlanLimits();
    
    // Obtener información del usuario actual desde localStorage
    let userName = 'Usuario';
    try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData.name) {
            userName = userData.name;
        }
    } catch (e) {
        console.warn('Error al obtener datos del usuario:', e);
    }
    
    // Actualizar título de la sección con el nombre del usuario
    const usageSectionTitle = document.querySelector('#plan-usage-section .card-title');
    if (usageSectionTitle) {
        usageSectionTitle.textContent = `Uso del Plan - ${userName} (ID: ${userId})`;
    }
    
    // Actualizar información del plan actual
    const planName = usageData.plan || 'básico';
    const planNameFormatted = planName.charAt(0).toUpperCase() + planName.slice(1);
    const planInfoElement = document.querySelector('#plan-info');
    if (!planInfoElement) {
        // Crear elemento para mostrar información del plan si no existe
        const planInfo = document.createElement('div');
        planInfo.id = 'plan-info';
        planInfo.className = 'alert alert-info mb-3 py-2 small';
        planInfo.innerHTML = `<strong>Plan actual:</strong> <span class="badge bg-primary">${planNameFormatted}</span>`;
        
        // Insertar antes de la primera fila de uso
        const firstRow = document.querySelector('#plan-usage-section .card-body .row');
        if (firstRow) {
            firstRow.parentNode.insertBefore(planInfo, firstRow);
        }
    } else {
        // Actualizar el elemento existente
        const badgeElement = planInfoElement.querySelector('.badge');
        if (badgeElement) {
            badgeElement.textContent = planNameFormatted;
            
            // Actualizar clase del badge según el plan
            badgeElement.className = 'badge';
            if (planName === 'premium') {
                badgeElement.classList.add('bg-warning');
            } else if (planName === 'professional') {
                badgeElement.classList.add('bg-primary');
            } else {
                badgeElement.classList.add('bg-secondary');
            }
        }
    }
    
    // Actualizar contadores
    const callsCountElement = document.getElementById('plan-usage-calls-count');
    const emailsCountElement = document.getElementById('plan-usage-emails-count');
    const usersCountElement = document.getElementById('plan-usage-users-count');
    
    // Actualizar barras de progreso
    const callsProgressElement = document.getElementById('plan-usage-calls-progress');
    const emailsProgressElement = document.getElementById('plan-usage-emails-progress');
    const usersProgressElement = document.getElementById('plan-usage-users-progress');
    
    if (callsCountElement && callsProgressElement) {
        const callsValue = usageData.usage.calls || 0;
        const callsLimit = planLimits.calls;
        const callsPercentage = callsLimit === Infinity ? 0 : Math.min(100, Math.round((callsValue / callsLimit) * 100));
        
        callsCountElement.textContent = callsLimit === Infinity ? 
            `${callsValue} / Ilimitado` : 
            `${callsValue} / ${callsLimit.toLocaleString()}`;
        
        callsProgressElement.style.width = `${callsPercentage}%`;
        callsProgressElement.setAttribute('aria-valuenow', callsPercentage);
        
        // Cambiar color según el porcentaje
        if (callsPercentage > 90) {
            callsProgressElement.classList.remove('bg-success', 'bg-warning');
            callsProgressElement.classList.add('bg-danger');
        } else if (callsPercentage > 70) {
            callsProgressElement.classList.remove('bg-success', 'bg-danger');
            callsProgressElement.classList.add('bg-warning');
        } else {
            callsProgressElement.classList.remove('bg-warning', 'bg-danger');
            callsProgressElement.classList.add('bg-success');
        }
    }
    
    if (emailsCountElement && emailsProgressElement) {
        const emailsValue = usageData.usage.emails || 0;
        const emailsLimit = planLimits.emails;
        const emailsPercentage = emailsLimit === Infinity ? 0 : Math.min(100, Math.round((emailsValue / emailsLimit) * 100));
        
        emailsCountElement.textContent = emailsLimit === Infinity ? 
            `${emailsValue} / Ilimitado` : 
            `${emailsValue} / ${emailsLimit.toLocaleString()}`;
        
        emailsProgressElement.style.width = `${emailsPercentage}%`;
        emailsProgressElement.setAttribute('aria-valuenow', emailsPercentage);
        
        // Cambiar color según el porcentaje
        if (emailsPercentage > 90) {
            emailsProgressElement.classList.remove('bg-success', 'bg-warning');
            emailsProgressElement.classList.add('bg-danger');
        } else if (emailsPercentage > 70) {
            emailsProgressElement.classList.remove('bg-success', 'bg-danger');
            emailsProgressElement.classList.add('bg-warning');
        } else {
            emailsProgressElement.classList.remove('bg-warning', 'bg-danger');
            emailsProgressElement.classList.add('bg-success');
        }
    }
    
    if (usersCountElement && usersProgressElement) {
        const usersValue = usageData.usage.users || 1;
        const usersLimit = planLimits.users;
        const usersPercentage = usersLimit === Infinity ? 0 : Math.min(100, Math.round((usersValue / usersLimit) * 100));
        
        usersCountElement.textContent = usersLimit === Infinity ? 
            `${usersValue} / Ilimitado` : 
            `${usersValue} / ${usersLimit}`;
        
        usersProgressElement.style.width = `${usersPercentage}%`;
        usersProgressElement.setAttribute('aria-valuenow', usersPercentage);
        
        // Cambiar color según el porcentaje
        if (usersPercentage > 90) {
            usersProgressElement.classList.remove('bg-success', 'bg-warning');
            usersProgressElement.classList.add('bg-danger');
        } else if (usersPercentage > 70) {
            usersProgressElement.classList.remove('bg-success', 'bg-danger');
            usersProgressElement.classList.add('bg-warning');
        } else {
            usersProgressElement.classList.remove('bg-warning', 'bg-danger');
            usersProgressElement.classList.add('bg-success');
        }
    }
}

/**
 * Configurar funcionalidades de la cuenta
 */
function setupAccountFeatures() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`👤 Configurando funcionalidades de la cuenta para el usuario ${userId}...`);
    
    // Botón para guardar cambios en la cuenta
    const saveAccountBtn = document.getElementById('save-account-btn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', function() {
            console.log(`💾 Guardando cambios en la cuenta para el usuario ${userId}...`);
            toastr.info('Guardando cambios...', 'Procesando');
            
            // Simular guardado
            setTimeout(() => {
                // Registrar la acción en el sistema de seguimiento de uso
                if (window.UsageTracker) {
                    // Guardar cambios en la cuenta puede contar como una acción de usuario en el sistema de seguimiento
                    window.UsageTracker.updateUserCount(1);
                    console.log(`📊 Cambios en la cuenta registrados para el usuario ${userId}`);
                    
                    // Actualizar la UI del sistema de seguimiento
                    window.UsageTracker.updateUI();
                    
                    // Actualizar el resumen de uso si está visible
                    if (typeof showUsageSummary === 'function') {
                        showUsageSummary();
                    }
                }
                
                toastr.success('Cambios guardados correctamente', 'Éxito');
            }, 1500);
        });
    }
    
    // Validar formularios de la cuenta
    const accountForm = document.querySelector('#account-content form');
    if (accountForm) {
        accountForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log(`📝 Formulario de cuenta enviado por el usuario ${userId}`);
            
            // Registrar la acción en el sistema de seguimiento de uso
            if (window.UsageTracker) {
                // El envío del formulario de cuenta puede contar como una acción de usuario en el sistema de seguimiento
                window.UsageTracker.updateUserCount(1);
                console.log(`📊 Formulario de cuenta registrado para el usuario ${userId}`);
                
                // Actualizar la UI del sistema de seguimiento
                window.UsageTracker.updateUI();
                
                // Actualizar el resumen de uso si está visible
                if (typeof showUsageSummary === 'function') {
                    showUsageSummary();
                }
            }
            
            toastr.success('Datos de cuenta actualizados', 'Éxito');
        });
    }
    
    // Configurar campos de perfil
    const profileFields = document.querySelectorAll('#account-content input, #account-content select, #account-content textarea');
    profileFields.forEach(field => {
        field.addEventListener('change', function() {
            console.log(`📝 Campo ${field.name || field.id} modificado: ${field.value}`);
        });
    });
    
    console.log('✅ Funcionalidades de la cuenta configuradas');
}

/**
 * Configurar funcionalidades de facturación
 */
function setupBillingFeatures() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`💳 Configurando funcionalidades de facturación para el usuario ${userId}...`);
    
    // Botón para ver facturas
    const viewInvoicesBtn = document.getElementById('view-invoices-btn');
    if (viewInvoicesBtn) {
        viewInvoicesBtn.addEventListener('click', function() {
            console.log(`💸 Mostrando facturas para el usuario ${userId}...`);
            toastr.info('Cargando facturas...', 'Procesando');
            
            // Registrar la acción en el sistema de seguimiento de uso
            if (window.UsageTracker) {
                // Ver facturas puede contar como una acción de usuario en el sistema de seguimiento
                window.UsageTracker.updateUserCount(1);
                console.log(`📊 Visualización de facturas registrada para el usuario ${userId}`);
                
                // Actualizar la UI del sistema de seguimiento
                window.UsageTracker.updateUI();
                
                // Actualizar el resumen de uso si está visible
                if (typeof showUsageSummary === 'function') {
                    showUsageSummary();
                }
            }
            
            // Simular carga de facturas
            setTimeout(() => {
                showInvoicesModal();
            }, 1000);
        });
    }
    
    // Botón para actualizar plan
    const upgradePlanBtn = document.getElementById('upgrade-plan-btn');
    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', function() {
            console.log(`⬆️ Solicitando actualización de plan para el usuario ${userId}...`);
            
            // Registrar la acción en el sistema de seguimiento de uso
            if (window.UsageTracker) {
                // La solicitud de actualización de plan puede contar como una acción de usuario en el sistema de seguimiento
                window.UsageTracker.updateUserCount(1);
                console.log(`📊 Solicitud de actualización de plan registrada para el usuario ${userId}`);
                
                // Actualizar la UI del sistema de seguimiento
                window.UsageTracker.updateUI();
                
                // Actualizar el resumen de uso si está visible
                if (typeof showUsageSummary === 'function') {
                    showUsageSummary();
                }
            }
            
            showUpgradePlanModal();
        });
    }
    
    // Actualizar la UI con los datos de uso del plan
    if (window.UsageTracker) {
        // Obtener el ID del usuario actual
        const userId = window.UsageTracker.getCurrentUserId();
        console.log(`📊 Configurando seguimiento de uso para el usuario ${userId}...`);
        
        // Actualizar la UI inicial
        updatePlanUsageUI();
        
        // Configurar evento para actualizar la UI cuando cambie el uso
        document.addEventListener('usageUpdated', function(event) {
            const updatedUserId = event.detail?.userId || window.UsageTracker.getCurrentUserId();
            console.log(`📊 Evento de actualización de uso recibido para usuario ${updatedUserId}:`, event.detail);
            updatePlanUsageUI();
        });
    }
    
    console.log('✅ Funcionalidades de facturación configuradas');
}

/**
 * Mostrar modal de facturas
 */
function showInvoicesModal() {
    console.log('📈 Mostrando modal de facturas');
    
    const modalHTML = `
        <div class="modal fade" id="invoicesModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-file-invoice-dollar me-2"></i>Historial de Facturas
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Fecha</th>
                                        <th>Concepto</th>
                                        <th>Importe</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>F-2025-001</td>
                                        <td>01/07/2025</td>
                                        <td>Plan Premium - Julio 2025</td>
                                        <td>49,99 €</td>
                                        <td><span class="badge bg-success">Pagada</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-secondary"><i class="fas fa-download me-1"></i>PDF</button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>F-2025-002</td>
                                        <td>01/06/2025</td>
                                        <td>Plan Premium - Junio 2025</td>
                                        <td>49,99 €</td>
                                        <td><span class="badge bg-success">Pagada</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-secondary"><i class="fas fa-download me-1"></i>PDF</button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>F-2025-003</td>
                                        <td>01/05/2025</td>
                                        <td>Plan Premium - Mayo 2025</td>
                                        <td>49,99 €</td>
                                        <td><span class="badge bg-success">Pagada</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-secondary"><i class="fas fa-download me-1"></i>PDF</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('invoicesModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('invoicesModal'));
    modal.show();
    
    // Configurar botones de descarga
    setTimeout(() => {
        const downloadButtons = document.querySelectorAll('#invoicesModal .btn-outline-secondary');
        downloadButtons.forEach(button => {
            button.addEventListener('click', function() {
                toastr.info('Descargando factura...', 'Procesando');
                setTimeout(() => {
                    toastr.success('Factura descargada correctamente', 'Éxito');
                }, 1500);
            });
        });
    }, 500);
}

/**
 * Configurar funcionalidades de la pestaña de configuración
 */
function setupConfigFeatures() {
    console.log('⚙️ Configurando funcionalidades de configuración...');
    
    // Botón para ir a la pestaña de configuración
    const goToConfigBtn = document.getElementById('go-to-config-tab');
    if (goToConfigBtn) {
        goToConfigBtn.addEventListener('click', function() {
            // Activar la pestaña de configuración
            const configTab = document.getElementById('call-bot-tab');
            if (configTab) {
                const tab = new bootstrap.Tab(configTab);
                tab.show();
            }
        });
    }
    
    // Validación de formularios
    setupFormValidation();
    
    console.log('✅ Funcionalidades de configuración configuradas');
}

/**
 * Configurar validación de formularios
 */
function setupFormValidation() {
    // Seleccionar todos los formularios que necesitan validación
    const forms = document.querySelectorAll('.needs-validation');
    
    // Iterar sobre ellos y prevenir envío si no son válidos
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                toastr.error('Por favor, complete todos los campos requeridos', 'Error de validación');
            } else {
                // Si el formulario es válido, mostrar mensaje de éxito
                toastr.success('Configuración guardada correctamente', 'Éxito');
            }
            
            form.classList.add('was-validated');
        }, false);
    });
    
    // Validar campos de email
    const emailFields = document.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (field.value && !isValidEmail(field.value)) {
                field.classList.add('is-invalid');
                field.nextElementSibling?.classList.add('d-block');
            } else if (field.value) {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
                field.nextElementSibling?.classList.remove('d-block');
            }
        });
    });
}

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si el email es válido
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Previsualizar plantilla de email
 */
document.addEventListener('DOMContentLoaded', function() {
    // Agregar botón de preview después del textarea de firma
    setTimeout(() => {
        const signatureTextarea = document.getElementById('email_signature');
        if (signatureTextarea && !document.getElementById('preview-signature-btn')) {
            const previewButton = document.createElement('button');
            previewButton.type = 'button';
            previewButton.id = 'preview-signature-btn';
            previewButton.className = 'btn btn-outline-secondary btn-sm mt-2';
            previewButton.innerHTML = '<i class="fas fa-eye me-1"></i>Preview Email';
            previewButton.onclick = previewEmailTemplate;
            
            signatureTextarea.parentNode.appendChild(previewButton);
        }
    }, 1000);
});

/**
 * Configurar event listeners específicos para las pestañas
 */
function setupTabEventListeners() {
    console.log('🔧 Configurando event listeners para pestañas Bootstrap nativas...');
    
    // Inicializar explícitamente las pestañas de Bootstrap para evitar errores de invocación
    try {
        // Inicializar todas las pestañas manualmente
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tabEl => {
            // Crear una nueva instancia de Tab para cada elemento
            new bootstrap.Tab(tabEl);
        });
        
        // Activar la primera pestaña explícitamente
        const firstTab = document.querySelector('#calls-tab');
        if (firstTab) {
            const bsTab = new bootstrap.Tab(firstTab);
            bsTab.show();
        }
        
        console.log('✅ Pestañas Bootstrap inicializadas correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar pestañas Bootstrap:', error);
    }
    
    // Configurar event listeners para las pestañas
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    
    tabButtons.forEach(button => {
        // Event listener para notificaciones (opcional)
        button.addEventListener('shown.bs.tab', function(e) {
            const targetId = this.getAttribute('data-bs-target');
            const tabName = this.textContent.trim();
            
            console.log(`📌 Pestaña activada: ${tabName}`);
            
            // Si es la pestaña de llamadas, actualizar contador
            if (targetId === '#calls-content') {
                updateCallsCount();
            }
            
            // Si es la pestaña de emails, actualizar contador
            if (targetId === '#emails-content') {
                const emailCount = document.getElementById('email-count');
                if (emailCount) {
                    const visibleRows = document.querySelectorAll('.email-row:not(.d-none)');
                    emailCount.textContent = visibleRows.length;
                }
            }
        });
    });
    
    console.log('✅ Event listeners para pestañas configurados');
}

/**
 * Cargar datos del usuario
 */
function loadUserData() {
    console.log('👤 Cargando datos del usuario...');
    
    if (typeof authService !== 'undefined') {
        authService.getCurrentUser()
            .then(userData => {
                updateUserUI(userData);
            })
            .catch(error => {
                console.error('Error cargando datos del usuario:', error);
                loadDefaultUserData();
            });
    } else {
        // Cargar datos por defecto si no hay authService
        loadDefaultUserData();
    }
}

/**
 * Cargar datos de usuario por defecto
 */
function loadDefaultUserData() {
    console.log('👤 Cargando datos de usuario por defecto...');
    
    const userData = {
        name: 'Usuario Demo',
        email: 'demo@ejemplo.com',
        company: 'Empresa Demo',
        role: 'Administrador',
        avatar: 'assets/img/avatar-default.png'
    };
    
    updateUserUI(userData);
}

/**
 * Actualizar UI con datos del usuario
 * @param {Object} userData - Datos del usuario
 */
function updateUserUI(userData) {
    // Actualizar nombre de usuario en la barra superior
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.textContent = userData.name || 'Usuario';
    }
    
    // Actualizar avatar
    const userAvatarEl = document.getElementById('user-avatar');
    if (userAvatarEl) {
        userAvatarEl.src = userData.avatar || 'assets/img/avatar-default.png';
    }
    
    // Actualizar campos en la pestaña de cuenta
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
        userEmailEl.value = userData.email || '';
    }
    
    const userCompanyEl = document.getElementById('company_name');
    if (userCompanyEl) {
        userCompanyEl.value = userData.company || '';
    }
    
    console.log('✅ UI de usuario actualizada');
}

/**
 * Cambiar estado del bot (activar/desactivar)
 * @param {boolean} isActive - Estado del bot (true: activo, false: inactivo)
 */
function toggleBotStatus(isActive) {
    console.log(`🤖 ${isActive ? 'Activando' : 'Desactivando'} bot...`);
    
    const statusText = document.getElementById('bot-status-text');
    const masterSwitch = document.getElementById('bot-master-switch');
    const configForm = document.getElementById('call-bot-config-form');
    
    // Si se está desactivando, mostrar advertencia sobre redirección telefónica
    if (!isActive) {
        showPhoneRedirectionWarning(() => {
            performBotDeactivation(statusText, masterSwitch, configForm);
        }, () => {
            // Cancelar desactivación - volver a activar el switch
            masterSwitch.checked = true;
        });
        return;
    }
    
    if (isActive) {
        // Bot activado
        statusText.textContent = 'Bot Activo';
        statusText.className = 'me-3 fw-medium text-success';
        masterSwitch.checked = true;
        
        // Habilitar formulario de configuración
        if (configForm) {
            const inputs = configForm.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.disabled = false;
            });
            configForm.style.opacity = '1';
        }
        
        // Guardar estado en localStorage
        localStorage.setItem('botStatus', 'active');
        
        toastr.success('🚀 Bot activado correctamente', 'Bot Activo');
    }
    
    updateBotStatusOnServer(isActive);
}

/**
 * Realizar la desactivación del bot
 * @param {HTMLElement} statusText - Elemento de texto de estado
 * @param {HTMLElement} masterSwitch - Switch principal
 * @param {HTMLElement} configForm - Formulario de configuración
 */
function performBotDeactivation(statusText, masterSwitch, configForm) {
    console.log('🚫 Procediendo con desactivación del bot...');
    
    // Bot desactivado
    statusText.textContent = 'Bot Inactivo';
    statusText.className = 'me-3 fw-medium text-danger';
    masterSwitch.checked = false;
    
    // Deshabilitar formulario de configuración
    if (configForm) {
        const inputs = configForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id !== 'bot-master-switch') {
                input.disabled = true;
            }
        });
        configForm.style.opacity = '0.6';
    }
    
    // Guardar estado en localStorage
    localStorage.setItem('botStatus', 'inactive');
    
    toastr.warning('⚠️ Bot desactivado. Recuerda contactar a tu operador para desactivar la redirección telefónica', 'Bot Inactivo');
    
    // Simular llamada al backend para actualizar estado
    updateBotStatusOnServer(false);
}

/**
 * Mostrar advertencia sobre redirección telefónica al desactivar bot
 * @param {Function} onConfirm - Callback al confirmar
 * @param {Function} onCancel - Callback al cancelar
 */
function showPhoneRedirectionWarning(onConfirm, onCancel) {
    // Crear modal de advertencia
    const modalHtml = `
        <div class="modal fade" id="phoneRedirectionWarningModal" tabindex="-1" aria-labelledby="phoneRedirectionWarningModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-warning text-dark border-0">
                        <h5 class="modal-title" id="phoneRedirectionWarningModalLabel">
                            <i class="fas fa-exclamation-triangle me-2"></i>Advertencia: Redirección Telefónica
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body py-4">
                        <div class="alert alert-warning border-0 mb-4">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Información importante sobre la redirección de llamadas</strong>
                        </div>
                        
                        <div class="mb-4">
                            <h6 class="fw-bold mb-3">📞 ¿Cómo funciona actualmente?</h6>
                            <p class="mb-2">Tu número principal está redirigido automáticamente a nuestro sistema Twilio para que el bot de IA pueda atender las llamadas.</p>
                        </div>
                        
                        <div class="mb-4">
                            <h6 class="fw-bold mb-3 text-danger">⚠️ ¿Qué pasa si desactivas el bot?</h6>
                            <ul class="list-unstyled">
                                <li class="mb-2"><i class="fas fa-times-circle text-danger me-2"></i>El bot dejará de procesar llamadas</li>
                                <li class="mb-2"><i class="fas fa-phone text-warning me-2"></i>Las llamadas seguirán redirigidas a Twilio</li>
                                <li class="mb-2"><i class="fas fa-user-tie text-info me-2"></i><strong>Necesitarás contactar a tu operador telefónico</strong> para desactivar la redirección manualmente</li>
                            </ul>
                        </div>
                        
                        <div class="bg-light p-3 rounded">
                            <h6 class="fw-bold mb-2">📞 Contacta a tu operador:</h6>
                            <p class="mb-1 small">Diles: <em>"Quiero desactivar la redirección de llamadas de mi número principal"</em></p>
                            <p class="mb-0 small text-muted">Tendrás que proporcionar tu número principal y posiblemente verificar tu identidad.</p>
                        </div>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="cancelDeactivation">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-warning" id="confirmDeactivation">
                            <i class="fas fa-check me-2"></i>Entiendo, desactivar bot
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Configurar event listeners
    const modal = new bootstrap.Modal(document.getElementById('phoneRedirectionWarningModal'));
    const confirmBtn = document.getElementById('confirmDeactivation');
    const cancelBtn = document.getElementById('cancelDeactivation');
    
    confirmBtn.addEventListener('click', () => {
        modal.hide();
        onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.hide();
        onCancel();
    });
    
    // Limpiar modal al cerrarse
    document.getElementById('phoneRedirectionWarningModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
    
    // Mostrar modal
    modal.show();
}

/**
 * Actualizar estado del bot en el servidor
 * @param {boolean} isActive - Estado del bot
 */
async function updateBotStatusOnServer(isActive) {
    try {
        console.log(`📞 Actualizando estado del bot en servidor: ${isActive ? 'activo' : 'inactivo'}`);
        
        // En producción, esto sería una llamada real al backend
        // const response = await fetch('/api/bot/status', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        //     },
        //     body: JSON.stringify({ active: isActive })
        // });
        
        // Simular respuesta exitosa
        setTimeout(() => {
            console.log('✅ Estado del bot actualizado en servidor');
        }, 500);
        
    } catch (error) {
        console.error('❌ Error al actualizar estado del bot:', error);
        toastr.error('Error al actualizar estado del bot en servidor', 'Error');
    }
}

/**
 * Cargar estado inicial del bot desde localStorage
 */
function loadBotStatus() {
    const savedStatus = localStorage.getItem('botStatus');
    const isActive = savedStatus !== 'inactive'; // Por defecto activo
    
    const masterSwitch = document.getElementById('bot-master-switch');
    if (masterSwitch) {
        masterSwitch.checked = isActive;
        toggleBotStatus(isActive);
    }
}

/**
 * Enviar respuesta de email
 * @param {number} emailId - ID del email
 */
function sendEmailResponse(emailId) {
    console.log(`📤 Enviando respuesta para email ${emailId}...`);
    
    // Simular envío
    toastr.info('Enviando respuesta...', 'Procesando');
    
    setTimeout(() => {
        // Actualizar estado del email
        const emailRows = document.querySelectorAll('.email-row');
        const emailRow = emailRows[emailId - 1];
        
        if (emailRow) {
            const statusBadge = emailRow.querySelector('td:nth-child(5) .badge');
            if (statusBadge) {
                statusBadge.className = 'badge bg-primary';
                statusBadge.innerHTML = '✅ Respondido';
            }
        }
        
        toastr.success('Respuesta enviada correctamente', '¡Email Enviado!');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('responseModal'));
        if (modal) modal.hide();
        
    }, 1000);
}

/**
 * Enviar respuesta manual
 * @param {number} emailId - ID del email
 */
function sendManualResponse(emailId) {
    const subject = document.getElementById('replySubject').value;
    const message = document.getElementById('manualResponse').value;
    
    if (!message.trim()) {
        toastr.error('Por favor, escriba un mensaje', 'Error');
        return;
    }
    
    console.log(`📤 Enviando respuesta manual para email ${emailId}...`);
    toastr.info('Enviando respuesta...', 'Procesando');
    
    setTimeout(() => {
        // Actualizar estado
        const emailRows = document.querySelectorAll('.email-row');
        const emailRow = emailRows[emailId - 1];
        
        if (emailRow) {
            const statusBadge = emailRow.querySelector('td:nth-child(5) .badge');
            if (statusBadge) {
                statusBadge.className = 'badge bg-primary';
                statusBadge.innerHTML = '✅ Respondido';
            }
        }
        
        toastr.success('Respuesta enviada correctamente', '¡Email Enviado!');
        
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('manualReplyModal'));
        if (modal) modal.hide();
        
    }, 1000);
}

/**
 * Guardar configuración unificada del bot
 */
function saveUnifiedConfig() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`💾 Guardando configuración unificada del bot para el usuario ${userId}...`);
    
    // Recopilar todos los datos del formulario
    const config = {
        // Información de empresa
        companyName: document.getElementById('company_name')?.value || '',
        companyDescription: document.getElementById('company_description')?.value || '',
        companySector: document.getElementById('company_sector')?.value || '',
        companyPhone: document.getElementById('company_phone')?.value || '',
        companyEmail: document.getElementById('company_email')?.value || '',
        companyWebsite: document.getElementById('company_website')?.value || '',
        
        // Configuración general
        botName: document.getElementById('bot_name')?.value || 'Asistente Virtual',
        botPersonality: document.getElementById('bot_personality')?.value || 'professional',
        welcomeMessage: document.getElementById('welcome_message')?.value || 'Bienvenido a nuestro asistente virtual',
        businessHours: document.getElementById('business_hours')?.value || 'Lun-Vie: 9:00-18:00',
        
        // Configuración de horarios
        workingHours: {
            opening: document.getElementById('opening_hour')?.value || '09:00',
            closing: document.getElementById('closing_hour')?.value || '18:00'
        },
        workingDays: {
            monday: document.getElementById('monday')?.checked || false,
            tuesday: document.getElementById('tuesday')?.checked || false,
            wednesday: document.getElementById('wednesday')?.checked || false,
            thursday: document.getElementById('thursday')?.checked || false,
            friday: document.getElementById('friday')?.checked || false,
            saturday: document.getElementById('saturday')?.checked || false,
            sunday: document.getElementById('sunday')?.checked || false
        },
        
        // Configuración de llamadas
        callConfig: {
            enabled: document.getElementById('enable_calls')?.checked || false,
            voiceId: document.getElementById('voice_id')?.value || '',
            language: document.getElementById('voice_language')?.value || 'es-ES',
            confirmationMessage: document.getElementById('confirmation_message')?.value || ''
        },
        
        // Configuración de emails
        emailConfig: {
            enabled: document.getElementById('email_bot_active')?.checked || false,
            provider: document.getElementById('email_provider')?.value || '',
            outgoingEmail: document.getElementById('outgoing_email')?.value || '',
            recipientEmail: document.getElementById('recipient_email')?.value || '',
            forwardRules: document.getElementById('forward_rules')?.value || '',
            autoReply: document.getElementById('auto_reply')?.checked || false,
            autoReplyMessage: document.getElementById('auto_reply_message')?.value || '',
            emailLanguage: document.getElementById('email_language')?.value || 'es-ES',
            emailSignature: document.getElementById('email_signature')?.value || '',
            website: document.getElementById('website')?.value || '',
            emailConsent: document.getElementById('email_consent')?.checked || false
        },
        
        // Configuración manual de IMAP/SMTP (solo si el proveedor es 'other')
        emailManualConfig: document.getElementById('email_provider')?.value === 'other' ? {
            imapServer: document.getElementById('imap_server')?.value || '',
            imapPort: document.getElementById('imap_port')?.value || '',
            smtpServer: document.getElementById('smtp_server')?.value || '',
            smtpPort: document.getElementById('smtp_port')?.value || '',
            useSSL: document.getElementById('use_ssl')?.checked || true
        } : null,
        
        // Configuración avanzada de IA
        aiConfig: {
            temperature: parseFloat(document.getElementById('ai_temperature')?.value || '0.7'),
            maxTokens: parseInt(document.getElementById('ai_max_tokens')?.value || '150'),
            topP: parseFloat(document.getElementById('ai_top_p')?.value || '0.9'),
            frequencyPenalty: parseFloat(document.getElementById('ai_frequency_penalty')?.value || '0.0'),
            presencePenalty: parseFloat(document.getElementById('ai_presence_penalty')?.value || '0.0')
        },
        
        // Archivos de contexto
        files: collectContextFiles()
    };
    
    console.log('📝 Configuración recopilada:', config);
    
    // Validar campos requeridos
    const requiredFields = [
        { id: 'company_name', label: 'Nombre de empresa' },
        { id: 'company_email', label: 'Email de empresa' }
    ];
    
    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element?.value) {
            toastr.error(`El campo ${field.label} es obligatorio`, 'Error');
            element?.focus();
            return;
        }
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const companyEmail = document.getElementById('company_email')?.value;
    if (companyEmail && !emailRegex.test(companyEmail)) {
        toastr.error('El formato del email de empresa no es válido', 'Error');
        document.getElementById('company_email')?.focus();
        return;
    }
    
    // Validar emails
    const outgoingEmail = document.getElementById('outgoing_email')?.value;
    if (outgoingEmail && !emailRegex.test(outgoingEmail)) {
        toastr.error('El formato del email de salida no es válido', 'Error');
        document.getElementById('outgoing_email')?.focus();
        return;
    }
    
    const recipientEmail = document.getElementById('recipient_email')?.value;
    if (recipientEmail && !emailRegex.test(recipientEmail)) {
        toastr.error('El formato del email de recepción no es válido', 'Error');
        document.getElementById('recipient_email')?.focus();
        return;
    }
    
    // Validar consentimiento si se ha seleccionado un proveedor de correo
    const emailProvider = document.getElementById('email_provider')?.value;
    const emailConsent = document.getElementById('email_consent')?.checked;
    
    if (emailProvider && !emailConsent) {
        toastr.error('Debes dar tu consentimiento para acceder a tu correo electrónico', 'Error');
        document.getElementById('email_consent')?.focus();
        return;
    }
    
    // Validar configuración manual si se ha seleccionado "other"
    if (emailProvider === 'other') {
        const imapServer = document.getElementById('imap_server')?.value;
        const imapPort = document.getElementById('imap_port')?.value;
        const smtpServer = document.getElementById('smtp_server')?.value;
        const smtpPort = document.getElementById('smtp_port')?.value;
        
        if (!imapServer || !imapPort || !smtpServer || !smtpPort) {
            toastr.error('Debes completar todos los campos de configuración manual de correo', 'Error');
            return;
        }
    }
    
    // Mostrar notificación de guardado
    toastr.info('Guardando configuración...', 'Procesando');
    
    // Preparar datos para enviar al backend
    const botConfig = {
        welcomeMessage: config.welcomeMessage,
        voiceId: config.callConfig.voiceId,
        language: config.callConfig.language,
        confirmationMessage: config.callConfig.confirmationMessage,
        personality: config.botPersonality,
        workingHours: config.workingHours,
        workingDays: config.workingDays,
        contextFiles: {}
    };
    
    // Obtener token de autenticación
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (!authToken) {
        toastr.error('No se encontró token de autenticación', 'Error');
        return;
    }
    
    // Enviar la configuración del bot al backend
    fetch('/api/config/bot', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(botConfig)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Configuración del bot guardada:', data);
        
        // Ahora enviar la configuración de emails
        return fetch('/api/config/email', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                enabled: config.emailConfig.enabled,
                provider: config.emailConfig.provider,
                outgoingEmail: config.emailConfig.outgoingEmail,
                recipientEmail: config.emailConfig.recipientEmail,
                forwardRules: config.emailConfig.forwardRules,
                autoReply: config.emailConfig.autoReply,
                autoReplyMessage: config.emailConfig.autoReplyMessage,
                emailLanguage: config.emailConfig.emailLanguage,
                emailSignature: config.emailConfig.emailSignature,
                website: config.emailConfig.website,
                emailConsent: config.emailConfig.emailConsent,
                manualConfig: config.emailManualConfig
            })
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al guardar configuración de emails');
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Configuración de emails guardada:', data);
        
        // Actualizar perfil de empresa
        return fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                companyName: config.companyName,
                email: config.companyEmail,
                phone: config.companyPhone,
                website: config.companyWebsite,
                industry: config.companySector
            })
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al actualizar perfil de empresa');
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Perfil de empresa actualizado:', data);
        
        // Procesar archivos si existen
        if (config.files && config.files.length > 0) {
            return processContextFilesWithBackend(config.files);
        }
        return Promise.resolve();
    })
    .then(() => {
        // Registrar la acción en el sistema de seguimiento de uso
        if (window.UsageTracker) {
            // Incrementar contador de configuraciones guardadas
            window.UsageTracker.updateUserCount(1);
            console.log(`📊 Configuración del bot registrada para el usuario ${window.UsageTracker.getCurrentUserId()}`);
            
            // Actualizar la UI del sistema de seguimiento
            window.UsageTracker.updateUI();
            
            // Actualizar el resumen de uso si está visible
            if (typeof showUsageSummary === 'function') {
                showUsageSummary();
            }
        }
        
        toastr.success('Configuración guardada correctamente', '¡Éxito!');
    })
    .catch(error => {
        console.error('Error guardando configuración:', error);
        toastr.error('Error al guardar la configuración: ' + error.message, 'Error');
    });
}

// ...
function testBotConfiguration() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`🤖 Probando configuración del bot para el usuario ${userId}...`);
    
    // Mostrar spinner de carga
    toastr.info('Probando configuración del bot...', 'Procesando');
    
    // Recopilar datos de configuración relevantes para la prueba
    const companyName = document.getElementById('company_name')?.value || 'Empresa';
    const businessHours = document.getElementById('business_hours')?.value || 'Lun-Vie: 9:00-18:00';
    const botPersonality = document.getElementById('bot_personality')?.value || 'professional';
    
    // Recopilar preguntas frecuentes
    const faqs = collectFaqItems();
    
    // Preparar datos para la prueba
    const testData = {
        companyName,
        businessHours,
        botPersonality,
        faqs,
        testMessage: "Hola, me gustaría obtener información sobre sus servicios"
    };
    
    // Enviar solicitud al backend para probar el bot
    fetch('/api/bot/test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al probar la configuración del bot');
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Prueba del bot completada:', data);
        
        // Mostrar resultado de la prueba
        const responseMessage = data.response || 'La configuración del bot parece correcta.';
        
        // Crear un modal para mostrar la respuesta del bot
        const modalId = 'botTestResponseModal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            // Crear el modal si no existe
            const modalHTML = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="${modalId}Label">Resultado de la prueba del bot</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="card mb-3">
                                    <div class="card-header bg-light">
                                        <strong>Mensaje de prueba:</strong>
                                    </div>
                                    <div class="card-body">
                                        <p>${testData.testMessage}</p>
                                    </div>
                                </div>
                                <div class="card">
                                    <div class="card-header bg-primary text-white">
                                        <strong>Respuesta del bot:</strong>
                                    </div>
                                    <div class="card-body">
                                        <p>${responseMessage}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Añadir el modal al DOM
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstChild);
            
            modal = document.getElementById(modalId);
        } else {
            // Actualizar el contenido del modal si ya existe
            modal.querySelector('.modal-body').innerHTML = `
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <strong>Mensaje de prueba:</strong>
                    </div>
                    <div class="card-body">
                        <p>${testData.testMessage}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <strong>Respuesta del bot:</strong>
                    </div>
                    <div class="card-body">
                        <p>${responseMessage}</p>
                    </div>
                </div>
            `;
        }
        
        // Mostrar el modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Registrar la prueba en el sistema de seguimiento de uso
        if (window.UsageTracker) {
            // Las pruebas del bot pueden contar como llamadas en el sistema de seguimiento
            window.UsageTracker.trackCall();
            console.log(`📊 Prueba del bot registrada para el usuario ${userId}`);
            
            // Actualizar la UI del sistema de seguimiento
            window.UsageTracker.updateUI();
            
            // Actualizar el resumen de uso si está visible
            if (typeof showUsageSummary === 'function') {
                showUsageSummary();
            }
        }
        
        toastr.success('Prueba del bot completada', '¡Éxito!');
    })
    .catch(error => {
        console.error('Error probando configuración del bot:', error);
        toastr.error('Error al probar la configuración del bot: ' + error.message, 'Error');
    });
    
    // La prueba del bot ahora se maneja con la API real
}

// La función showBotTestModal ha sido eliminada porque ahora usamos la API real
// y mostramos los resultados en un modal generado dinámicamente en la función testBotConfiguration

/**
 * Inicializar el gestor de preguntas frecuentes
 */
function setupFaqManager() {
    console.log('💬 Inicializando gestor de preguntas frecuentes...');
    
    // Botón para añadir nueva pregunta
    const addFaqBtn = document.getElementById('add-faq-btn');
    if (addFaqBtn) {
        addFaqBtn.addEventListener('click', addNewFaqItem);
    }
    
    // Cargar preguntas de ejemplo
    loadSampleFaqs();
}

/**
 * Cargar preguntas frecuentes desde el backend
 */
function loadSampleFaqs() {
    console.log('💬 Cargando preguntas frecuentes desde el backend...');
    
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error('❌ No se encontró token de autenticación');
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Realizar petición al backend
    fetch('/api/bot/faqs', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(faqs => {
        // Añadir preguntas al DOM
        if (faqs && faqs.length > 0) {
            faqs.forEach(faq => addFaqItemToDOM(faq));
            console.log(`✅ ${faqs.length} preguntas frecuentes cargadas correctamente`);
        } else {
            console.log('ℹ️ No hay preguntas frecuentes configuradas');
        }
        
        // Actualizar la visualización del mensaje de no hay preguntas
        updateNoFaqsMessage();
    })
    .catch(error => {
        console.error('❌ Error al cargar preguntas frecuentes:', error);
        toastr.error('Error al cargar preguntas frecuentes', 'Error');
    });
}

/**
 * Actualiza la visualización del mensaje cuando no hay preguntas frecuentes
 */
function updateNoFaqsMessage() {
    const faqItems = document.getElementById('faq-items');
    const noFaqsMessage = document.getElementById('no-faqs-message');
    
    if (!faqItems || !noFaqsMessage) return;
    
    if (faqItems.children.length === 0) {
        noFaqsMessage.classList.remove('d-none');
    } else {
        noFaqsMessage.classList.add('d-none');
    }
}

/**
 * Añadir nueva pregunta frecuente
 */
function addNewFaqItem() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`💬 Añadiendo nueva pregunta frecuente para el usuario ${userId}...`);
    
    const newFaq = {
        id: Date.now(), // Usar timestamp como ID temporal
        question: '',
        answer: ''
    };
    
    addFaqItemToDOM(newFaq);
    
    // Registrar la acción en el sistema de seguimiento de uso
    if (window.UsageTracker) {
        // Añadir FAQ puede contar como una acción de usuario en el sistema de seguimiento
        window.UsageTracker.updateUserCount(1);
        console.log(`📊 Nueva pregunta frecuente registrada para el usuario ${userId}`);
        
        // Actualizar la UI del sistema de seguimiento
        window.UsageTracker.updateUI();
        
        // Actualizar el resumen de uso si está visible
        if (typeof showUsageSummary === 'function') {
            showUsageSummary();
        }
    }
    
    // Enfocar el nuevo campo de pregunta
    setTimeout(() => {
        const newQuestionField = document.querySelector(`#faq-question-${newFaq.id}`);
        if (newQuestionField) {
            newQuestionField.focus();
        }
    }, 100);
}

/**
 * Añadir un elemento de pregunta frecuente al DOM
 * @param {Object} faq - Objeto con la pregunta y respuesta
 */
function addFaqItemToDOM(faq) {
    const faqItems = document.getElementById('faq-items');
    if (!faqItems) return;
    
    const faqCard = document.createElement('div');
    faqCard.className = 'card mb-2 border-light';
    faqCard.id = `faq-item-${faq.id}`;
    
    faqCard.innerHTML = `
        <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="card-subtitle text-muted mb-0">Pregunta #${faqItems.children.length + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger delete-faq-btn" data-faq-id="${faq.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="row g-2">
                <div class="col-md-5">
                    <label class="form-label small">Pregunta</label>
                    <input type="text" class="form-control form-control-sm" id="faq-question-${faq.id}" value="${faq.question}" placeholder="Escribe la pregunta...">
                </div>
                <div class="col-md-7">
                    <label class="form-label small">Respuesta</label>
                    <textarea class="form-control form-control-sm" id="faq-answer-${faq.id}" rows="2" placeholder="Escribe la respuesta...">${faq.answer}</textarea>
                </div>
            </div>
        </div>
    `;
    
    faqItems.appendChild(faqCard);
    
    // Añadir event listener para eliminar la pregunta
    const deleteBtn = faqCard.querySelector('.delete-faq-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteFaqItem(faq.id));
    }
}

/**
 * Eliminar una pregunta frecuente
 * @param {number} faqId - ID de la pregunta a eliminar
 */
function deleteFaqItem(faqId) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`🗑️ Eliminando pregunta frecuente ID: ${faqId} para el usuario ${userId}...`);
    
    const faqItem = document.getElementById(`faq-item-${faqId}`);
    if (faqItem) {
        // Animación de desvanecimiento antes de eliminar
        faqItem.style.transition = 'opacity 0.3s';
        faqItem.style.opacity = '0';
        
        setTimeout(() => {
            faqItem.remove();
            renumberFaqItems();
            updateNoFaqsMessage(); // Actualizar mensaje de no hay preguntas
            
            // Registrar la acción en el sistema de seguimiento de uso
            if (window.UsageTracker) {
                // La eliminación de FAQ puede contar como una acción de usuario en el sistema de seguimiento
                window.UsageTracker.updateUserCount(1);
                console.log(`📊 Eliminación de pregunta frecuente registrada para el usuario ${userId}`);
                
                // Actualizar la UI del sistema de seguimiento
                window.UsageTracker.updateUI();
                
                // Actualizar el resumen de uso si está visible
                if (typeof showUsageSummary === 'function') {
                    showUsageSummary();
                }
            }
            
            toastr.success('Pregunta eliminada correctamente', 'FAQ');
        }, 300);
    }
}

/**
 * Renumerar las preguntas frecuentes
 */
function renumberFaqItems() {
    const faqItems = document.getElementById('faq-items');
    if (!faqItems) return;
    
    const items = faqItems.querySelectorAll('.card');
    items.forEach((item, index) => {
        const titleEl = item.querySelector('.card-title');
        if (titleEl) {
            titleEl.textContent = `Pregunta #${index + 1}`;
        }
    });
}

/**
 * Recopilar todas las preguntas frecuentes para guardar
 * @returns {Array} Array de objetos con preguntas y respuestas
 */
function collectFaqItems() {
    const faqItems = document.getElementById('faq-items');
    if (!faqItems) return [];
    
    const items = faqItems.querySelectorAll('.card');
    const faqs = [];
    
    items.forEach((item) => {
        const faqId = item.id.split('-').pop();
        const question = document.getElementById(`faq-question-${faqId}`)?.value || '';
        const answer = document.getElementById(`faq-answer-${faqId}`)?.value || '';
        
        if (question.trim() !== '' && answer.trim() !== '') {
            faqs.push({ id: faqId, question, answer });
        }
    });
    
    return faqs;
}

/**
 * Procesar archivos de contexto
 * @param {Object} files - Archivos a procesar (opcional)
 */
function processContextFiles(files = null) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📁 Procesando archivos de contexto para el usuario ${userId}...`);
    
    // Si se pasan archivos específicos (desde saveUnifiedConfig)
    if (files) {
        let fileCount = 0;
        Object.keys(files).forEach(fileType => {
            const file = files[fileType];
            if (file) {
                processFile(file);
                fileCount++;
            }
        });
        
        // Registrar la subida de archivos en el sistema de seguimiento de uso
        if (fileCount > 0 && window.UsageTracker) {
            // Cada archivo subido cuenta como una acción de usuario
            window.UsageTracker.updateUserCount(fileCount);
            console.log(`📊 ${fileCount} archivos de contexto registrados para el usuario ${userId}`);
            
            // Actualizar la UI del sistema de seguimiento
            window.UsageTracker.updateUI();
            
            // Actualizar el resumen de uso si está visible
            if (typeof showUsageSummary === 'function') {
                showUsageSummary();
            }
        }
        
        return;
    }
    
    // Si no se pasan archivos, usar el input de archivos context_files
    const contextFilesInput = document.getElementById('context_files');
    if (!contextFilesInput || !contextFilesInput.files || contextFilesInput.files.length === 0) {
        console.log(`No hay archivos seleccionados para el usuario ${userId}`);
        return;
    }
    
    // Validar número máximo de archivos
    if (contextFilesInput.files.length > 5) {
        toastr.error('Máximo 5 archivos permitidos', 'Error de Archivo');
        return;
    }
    
    // Procesar cada archivo seleccionado
    const fileCount = contextFilesInput.files.length;
    Array.from(contextFilesInput.files).forEach(file => {
        processFile(file);
    });
    
    // Registrar la subida de archivos en el sistema de seguimiento de uso
    if (window.UsageTracker) {
        // Cada archivo subido cuenta como una acción de usuario
        window.UsageTracker.updateUserCount(fileCount);
        console.log(`📊 ${fileCount} archivos de contexto registrados para el usuario ${userId}`);
        
        // Actualizar la UI del sistema de seguimiento
        window.UsageTracker.updateUI();
        
        // Actualizar el resumen de uso si está visible
        if (typeof showUsageSummary === 'function') {
            showUsageSummary();
        }
    }
    
    // Actualizar la lista de archivos
    updateContextFilesList();
}

/**
 * Procesar archivos de contexto (versión simulada)
 * @param {Object} files - Archivos de contexto
 */
function processContextFilesSimulated(files) {
    if (!files) return;
    
    console.log('📂 Procesando archivos de contexto:', files);
    
    // Simular procesamiento de archivos
    Object.entries(files).forEach(([type, file]) => {
        if (file) {
            console.log(`📄 Procesando archivo ${type}: ${file.name}`);
            // En producción, aquí se subiría el archivo al servidor
        }
    });
}

/**
 * Procesar archivos de contexto con el backend
 * @param {Array} files - Archivos de contexto
 * @returns {Promise} - Promesa que se resuelve cuando todos los archivos han sido procesados
 */
function processContextFilesWithBackend(files) {
    if (!files || files.length === 0) {
        return Promise.resolve();
    }
    
    console.log('📂 Procesando archivos de contexto con el backend:', files);
    
    // Crear un array de promesas para subir cada archivo
    const uploadPromises = files.map(file => {
        // Crear un objeto FormData para enviar el archivo
        const formData = new FormData();
        formData.append('fileType', file.type || 'info');
        formData.append('fileName', file.name);
        formData.append('fileContent', file.content || '');
        formData.append('fileSize', file.size || 0);
        
        // Enviar el archivo al backend
        return fetch('/api/bot/upload-context', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al subir archivo ${file.name}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`✅ Archivo ${file.name} subido correctamente:`, data);
            return data;
        })
        .catch(error => {
            console.error(`Error al subir archivo ${file.name}:`, error);
            toastr.error(`Error al subir archivo ${file.name}: ${error.message}`, 'Error');
            throw error;
        });
    });
    
    // Devolver una promesa que se resuelve cuando todos los archivos han sido procesados
    return Promise.all(uploadPromises)
        .then(results => {
            console.log('✅ Todos los archivos procesados correctamente:', results);
            return results;
        })
        .catch(error => {
            console.error('Error procesando archivos:', error);
            throw error;
        });
}

/**
 * Procesar un archivo individual
 * @param {File} file - Archivo a procesar
 */
function processFile(file) {
    console.log(`📄 Procesando archivo:`, file.name);
    
    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
        toastr.error(`El archivo ${file.name} es demasiado grande (máximo 10MB)`, 'Error de Archivo');
        return false;
    }
    
    // Validar tipo de archivo
    const allowedTypes = ['.pdf', '.txt', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        toastr.error(`Tipo de archivo no permitido: ${fileExtension}`, 'Error de Archivo');
        return false;
    }
    
    // Simular procesamiento por IA
    setTimeout(() => {
        toastr.success(`Archivo ${file.name} procesado correctamente`, 'Archivo Procesado');
    }, 1000 + Math.random() * 2000); // Tiempo aleatorio entre 1-3 segundos
    
    return true;
}

/**
 * Configurar los manejadores de eventos para la carga de archivos
 */
function setupFileUploadHandlers() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📎 Configurando manejadores de carga de archivos para el usuario ${userId}...`);
    
    // Manejar cambios en el input de archivos de contexto
    const contextFilesInput = document.getElementById('context_files');
    if (contextFilesInput) {
        contextFilesInput.addEventListener('change', () => {
            if (contextFilesInput.files.length > 0) {
                console.log(`📎 Archivos seleccionados (${contextFilesInput.files.length}) por el usuario ${userId}`);
                processContextFiles();
            }
        });
    }
    
    // Configurar botones de eliminación para archivos existentes
    setupExistingFileDeleteButtons();
}

/**
 * Configurar botones de eliminación para archivos existentes
 */
function setupExistingFileDeleteButtons() {
    const deleteButtons = document.querySelectorAll('#context-files-list .btn-outline-danger');
    
    deleteButtons.forEach(button => {
        // Evitar duplicar event listeners
        button.removeEventListener('click', handleFileDelete);
        button.addEventListener('click', handleFileDelete);
    });
}

/**
 * Manejar la eliminación de un archivo
 * @param {Event} event - Evento de click
 */
function handleFileDelete(event) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    
    const button = event.currentTarget;
    const listItem = button.closest('li');
    
    if (listItem) {
        const fileName = listItem.querySelector('div').textContent.trim();
        console.log(`🗑️ Eliminando archivo ${fileName} para el usuario ${userId}...`);
        
        // Animación de desvanecimiento
        listItem.style.transition = 'opacity 0.3s';
        listItem.style.opacity = '0';
        
        setTimeout(() => {
            listItem.remove();
            
            // Registrar la acción en el sistema de seguimiento de uso
            if (window.UsageTracker) {
                // La eliminación de archivos puede contar como una acción de usuario en el sistema de seguimiento
                window.UsageTracker.updateUserCount(1);
                console.log(`📊 Eliminación de archivo registrada para el usuario ${userId}`);
                
                // Actualizar la UI del sistema de seguimiento
                window.UsageTracker.updateUI();
                
                // Actualizar el resumen de uso si está visible
                if (typeof showUsageSummary === 'function') {
                    showUsageSummary();
                }
            }
            
            toastr.success(`Archivo ${fileName} eliminado`, 'Archivo Eliminado');
        }, 300);
    }
}

/**
 * Actualizar la lista visual de archivos de contexto
 */
function updateContextFilesList() {
    const contextFilesList = document.getElementById('context-files-list');
    const contextFilesInput = document.getElementById('context_files');
    
    if (!contextFilesList || !contextFilesInput) return;
    
    // Limpiar la lista actual pero mantener los archivos existentes
    const existingItems = Array.from(contextFilesList.querySelectorAll('li:not(.new-file)'));
    
    // Añadir los nuevos archivos
    if (contextFilesInput.files && contextFilesInput.files.length > 0) {
        Array.from(contextFilesInput.files).forEach(file => {
            // Comprobar si el archivo ya existe en la lista
            const fileExists = existingItems.some(item => 
                item.querySelector('div').textContent.trim() === file.name);
            
            if (!fileExists) {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center new-file';
                
                // Determinar el icono según la extensión
                let iconClass = 'fas fa-file text-secondary';
                const ext = file.name.split('.').pop().toLowerCase();
                
                if (ext === 'pdf') iconClass = 'fas fa-file-pdf text-danger';
                else if (['doc', 'docx'].includes(ext)) iconClass = 'fas fa-file-word text-primary';
                else if (['txt', 'text'].includes(ext)) iconClass = 'fas fa-file-alt text-info';
                
                li.innerHTML = `
                    <div>
                        <i class="${iconClass} me-2"></i>
                        ${file.name}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-file-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                
                contextFilesList.appendChild(li);
                
                // Añadir event listener para eliminar el archivo
                const deleteBtn = li.querySelector('.delete-file-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        li.remove();
                        toastr.success(`Archivo ${file.name} eliminado`, 'Archivo Eliminado');
                    });
                }
            }
        });
    }
}

/**
 * Agregar botón de preview a la firma
 */
function addEmailPreviewButton() {
    // Agregar botón de preview después del textarea de firma
    setTimeout(() => {
        const signatureTextarea = document.getElementById('email_signature');
        if (signatureTextarea && !document.getElementById('preview-signature-btn')) {
            const previewButton = document.createElement('button');
            previewButton.type = 'button';
            previewButton.id = 'preview-signature-btn';
            previewButton.className = 'btn btn-outline-secondary btn-sm mt-2';
            previewButton.innerHTML = '<i class="fas fa-eye me-1"></i>Preview Email';
            previewButton.onclick = previewEmailTemplate;
            
            signatureTextarea.parentNode.appendChild(previewButton);
        }
    }, 1000);
}

/**
 * Inicialización del Dashboard
 * Este código se ejecuta cuando el documento está listo
 */
/**
 * Mostrar modal para actualizar plan
 */
function showUpgradePlanModal() {
    console.log('💳 Mostrando modal para actualizar plan...');
    
    const modalHTML = `
        <div class="modal fade" id="upgradePlanModal" tabindex="-1" aria-labelledby="upgradePlanModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-dark text-white border-0">
                        <h5 class="modal-title" id="upgradePlanModalLabel">
                            <i class="fas fa-arrow-circle-up me-2"></i>Actualizar a Plan Enterprise
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="alert alert-info mb-4">
                            <div class="d-flex">
                                <div class="me-3">
                                    <i class="fas fa-info-circle fa-2x"></i>
                                </div>
                                <div>
                                    <h5 class="alert-heading">Actualización de Plan</h5>
                                    <p class="mb-0">Estás a punto de actualizar de <strong>Plan Profesional</strong> a <strong>Plan Enterprise</strong>.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="card h-100 border-primary">
                                    <div class="card-header bg-primary text-white">
                                        <h5 class="mb-0">Plan Profesional</h5>
                                        <span class="badge bg-white text-primary">Plan Actual</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="display-6 mb-3">49,99€ <small class="text-muted fs-6">/mes</small></div>
                                        <ul class="list-unstyled">
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Hasta 1.000 llamadas/mes</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Hasta 5.000 emails/mes</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Respuestas IA ilimitadas</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> 5 usuarios incluidos</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Soporte prioritario</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card h-100 border-dark">
                                    <div class="card-header bg-dark text-white">
                                        <h5 class="mb-0">Plan Enterprise</h5>
                                        <span class="badge bg-warning">Recomendado</span>
                                    </div>
                                    <div class="card-body">
                                        <div class="display-6 mb-3">99,99€ <small class="text-muted fs-6">/mes</small></div>
                                        <ul class="list-unstyled">
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Llamadas ilimitadas</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Emails ilimitados</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Respuestas IA ilimitadas</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> 15 usuarios incluidos</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> Soporte 24/7 dedicado</li>
                                            <li class="mb-2"><i class="fas fa-check text-success me-2"></i> API personalizada</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Información importante:</strong> El cambio de plan se hará efectivo inmediatamente. Se te cobrará la diferencia prorrateada por el tiempo restante de tu ciclo de facturación actual.
                        </div>
                        
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="confirmUpgrade">
                            <label class="form-check-label" for="confirmUpgrade">
                                Confirmo que quiero actualizar mi plan y acepto el cargo adicional.
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-dark" id="confirm-upgrade-btn" disabled>
                            <i class="fas fa-arrow-circle-up me-2"></i>Confirmar Actualización
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('upgradePlanModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('upgradePlanModal'));
    modal.show();
    
    // Configurar checkbox de confirmación
    const confirmCheckbox = document.getElementById('confirmUpgrade');
    const confirmButton = document.getElementById('confirm-upgrade-btn');
    
    confirmCheckbox.addEventListener('change', function() {
        confirmButton.disabled = !this.checked;
    });
    
    // Configurar botón de confirmación
    confirmButton.addEventListener('click', function() {
        processPlanUpgrade();
        modal.hide();
    });
}

/**
 * Procesar actualización de plan
 */
function processPlanUpgrade() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    let userName = 'Usuario';
    
    try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData.name) {
            userName = userData.name;
        }
    } catch (e) {
        console.warn('Error al obtener datos del usuario:', e);
    }
    
    console.log(`💳 Procesando actualización de plan para el usuario ${userName} (ID: ${userId})...`);
    
    // Mostrar spinner de carga
    toastr.info(`Procesando actualización de plan para ${userName}...`, 'Procesando');
    
    // Actualizar el sistema de seguimiento de uso con el plan premium
    if (window.UsageTracker) {
        // Guardar el plan anterior para referencia
        const previousPlan = window.UsageTracker.getUsage().plan || 'básico';
        
        // Cambiar al plan premium
        window.UsageTracker.changePlan('premium');
        
        // Actualizar la UI
        window.UsageTracker.updateUI();
        
        // Registrar el cambio en la consola
        console.log(`✅ Plan actualizado para el usuario ${userId}: ${previousPlan} → premium`);
    }
    
    // Simular procesamiento
    setTimeout(() => {
        toastr.success(`¡Plan actualizado correctamente para ${userName}! Ahora tienes el Plan Enterprise.`, 'Actualización Completada');
        
        // Actualizar UI
        updatePlanUI('enterprise', userId, userName);
    }, 2000);
}

/**
 * Actualizar UI después de cambio de plan
 * @param {string} planType - Tipo de plan ('professional', 'enterprise')
 * @param {string} userId - ID del usuario
 * @param {string} userName - Nombre del usuario
 */
function updatePlanUI(planType, userId = 'desconocido', userName = 'Usuario') {
    console.log(`📊 Actualizando UI para el plan ${planType} del usuario ${userName} (ID: ${userId})...`);
    
    // Actualizar alerta de información de plan
    const planAlert = document.querySelector('#plan-content .alert-info');
    if (planAlert) {
        const planTitle = planAlert.querySelector('.alert-heading');
        const planText = planAlert.querySelector('p');
        
        // Obtener fecha de vencimiento (1 año a partir de hoy)
        const today = new Date();
        const expirationDate = new Date(today.setFullYear(today.getFullYear() + 1));
        const formattedDate = expirationDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        if (planType === 'enterprise') {
            planTitle.textContent = `Plan Enterprise - ${userName}`;
            planText.innerHTML = `Tu plan actual vence el <strong>${formattedDate}</strong>. La renovación automática está activada.`;
        }
    }
    
    // Actualizar tarjetas de planes
    const planCards = document.querySelectorAll('#plan-content .card');
    if (planCards.length >= 2) {
        // Quitar bordes y etiquetas de plan actual
        planCards.forEach(card => {
            card.classList.remove('border-primary');
            const header = card.querySelector('.card-header');
            if (header) {
                header.classList.remove('bg-primary');
            }
        });
        
        if (planType === 'enterprise') {
            // Actualizar segunda tarjeta (Enterprise)
            planCards[1].classList.add('border-primary');
            const header = planCards[1].querySelector('.card-header');
            if (header) {
                header.classList.add('bg-primary');
                header.classList.remove('bg-dark');
                
                // Actualizar badge
                const badge = header.querySelector('.badge');
                if (badge) {
                    badge.className = 'badge bg-white text-primary';
                    badge.textContent = 'Plan Actual';
                }
            }
            
            // Actualizar botón
            const button = planCards[1].querySelector('button');
            if (button) {
                button.className = 'btn btn-outline-primary w-100';
                button.disabled = true;
                button.textContent = 'Plan Actual';
                button.id = '';
            }
            
            // Actualizar primera tarjeta (Profesional)
            const proHeader = planCards[0].querySelector('.card-header');
            if (proHeader) {
                proHeader.classList.remove('bg-primary');
                proHeader.classList.add('bg-secondary');
                
                // Actualizar badge
                const badge = proHeader.querySelector('.badge');
                if (badge) {
                    badge.className = 'badge bg-light text-secondary';
                    badge.textContent = 'Plan Anterior';
                }
            }
            
            // Actualizar botón
            const proButton = planCards[0].querySelector('button');
            if (proButton) {
                proButton.className = 'btn btn-outline-secondary w-100';
                proButton.disabled = false;
                proButton.textContent = 'Cambiar a este plan';
                proButton.id = 'downgrade-plan-btn';
            }
        }
    }
}

/**
 * Mostrar modal para añadir método de pago
 */
function showAddPaymentMethodModal() {
    console.log('💳 Mostrando modal para añadir método de pago...');
    
    const modalHTML = `
        <div class="modal fade" id="addPaymentMethodModal" tabindex="-1" aria-labelledby="addPaymentMethodModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-primary text-white border-0">
                        <h5 class="modal-title" id="addPaymentMethodModalLabel">
                            <i class="fas fa-credit-card me-2"></i>Añadir método de pago
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div>
                                    <h6 class="mb-0">Tarjeta de crédito/débito</h6>
                                    <small class="text-muted">Procesamos pagos de forma segura</small>
                                </div>
                                <div>
                                    <i class="fab fa-cc-visa fa-2x me-2 text-primary"></i>
                                    <i class="fab fa-cc-mastercard fa-2x me-2 text-danger"></i>
                                    <i class="fab fa-cc-amex fa-2x text-info"></i>
                                </div>
                            </div>
                        </div>
                        
                        <form id="payment-form">
                            <div class="mb-3">
                                <label for="card_number" class="form-label">Número de tarjeta</label>
                                <input type="text" class="form-control" id="card_number" placeholder="1234 5678 9012 3456" required>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="card_expiry" class="form-label">Fecha de expiración</label>
                                    <input type="text" class="form-control" id="card_expiry" placeholder="MM/AA" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="card_cvc" class="form-label">CVC/CVV</label>
                                    <input type="text" class="form-control" id="card_cvc" placeholder="123" required>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="card_name" class="form-label">Nombre en la tarjeta</label>
                                <input type="text" class="form-control" id="card_name" placeholder="NOMBRE APELLIDOS" required>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="set_default" checked>
                                <label class="form-check-label" for="set_default">
                                    Establecer como método de pago predeterminado
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="save-payment-method-btn">
                            <i class="fas fa-save me-2"></i>Guardar método de pago
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('addPaymentMethodModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('addPaymentMethodModal'));
    modal.show();
    
    // Configurar botón de guardar
    const saveButton = document.getElementById('save-payment-method-btn');
    saveButton.addEventListener('click', function() {
        savePaymentMethod();
        modal.hide();
    });
}

/**
 * Guardar método de pago
 */
function savePaymentMethod() {
    console.log('💳 Guardando método de pago...');
    
    // Verificar si ya existe un método de pago
    const paymentMethodExists = document.getElementById('payment-method-exists');
    if (!paymentMethodExists.classList.contains('d-none')) {
        toastr.warning('Ya tienes un método de pago configurado. Solo se permite un método activo.', 'Atención');
        return;
    }
    
    // Mostrar spinner de carga
    toastr.info('Guardando método de pago...', 'Procesando');
    
    // Simular procesamiento
    setTimeout(() => {
        toastr.success('Método de pago guardado correctamente', 'Guardado');
        
        // Cerrar modal
        const modalElement = document.getElementById('addPaymentMethodModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        // Actualizar UI para mostrar que hay un método de pago
        updatePaymentMethodsUI(true);
    }, 1500);
}

/**
 * Actualizar UI de métodos de pago
 * @param {boolean} hasPaymentMethod - Indica si hay un método de pago configurado
 */
function updatePaymentMethodsUI(hasPaymentMethod = true) {
    const paymentMethodExists = document.getElementById('payment-method-exists');
    const noPaymentMethod = document.getElementById('no-payment-method');
    
    if (hasPaymentMethod) {
        paymentMethodExists.classList.remove('d-none');
        noPaymentMethod.classList.add('d-none');
        // Activar funcionalidades del plan
        console.log('💳 Método de pago configurado. Activando funcionalidades del plan...');
    } else {
        paymentMethodExists.classList.add('d-none');
        noPaymentMethod.classList.remove('d-none');
        // Desactivar funcionalidades del plan
        console.log('⚠️ Sin método de pago. Desactivando funcionalidades del plan...');
    }
}

/**
 * Mostrar confirmación para eliminar método de pago
 */
function showRemovePaymentMethodConfirmation() {
    // Crear modal de confirmación si no existe
    let confirmModal = document.getElementById('removePaymentMethodModal');
    
    if (!confirmModal) {
        const modalHTML = `
        <div class="modal fade" id="removePaymentMethodModal" tabindex="-1" aria-labelledby="removePaymentMethodModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="removePaymentMethodModalLabel">
                            <i class="fas fa-exclamation-triangle me-2"></i>Advertencia
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <i class="fas fa-credit-card fa-3x text-danger mb-3"></i>
                            <h5>¿Estás seguro de eliminar este método de pago?</h5>
                        </div>
                        <div class="alert alert-warning">
                            <p class="mb-1"><strong>Importante:</strong> Al eliminar tu método de pago:</p>
                            <ul class="mb-0">
                                <li>Se desactivarán todas las funciones activas de tu plan</li>
                                <li>No podrás procesar nuevas llamadas ni emails</li>
                                <li>Perderás acceso a las funciones premium hasta añadir un nuevo método de pago</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" id="confirm-remove-payment-method">
                            <i class="fas fa-trash me-1"></i>Eliminar método de pago
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Añadir el modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Obtener referencia al modal recién creado
        confirmModal = document.getElementById('removePaymentMethodModal');
        
        // Añadir event listener al botón de confirmar
        const confirmButton = confirmModal.querySelector('#confirm-remove-payment-method');
        confirmButton.addEventListener('click', function() {
            removePaymentMethod();
            const modal = bootstrap.Modal.getInstance(confirmModal);
            modal.hide();
        });
    }
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(confirmModal);
    modal.show();
}

/**
 * Eliminar método de pago
 */
function removePaymentMethod() {
    console.log('💳 Eliminando método de pago...');
    
    // Mostrar spinner de carga
    toastr.info('Eliminando método de pago...', 'Procesando');
    
    // Simular procesamiento
    setTimeout(() => {
        toastr.success('Método de pago eliminado correctamente', 'Completado');
        
        // Mostrar advertencia de funcionalidades desactivadas
        toastr.warning('Las funcionalidades del plan han sido desactivadas', 'Atención', {
            timeOut: 5000,
            extendedTimeOut: 2000
        });
        
        // Actualizar UI para mostrar que no hay método de pago
        updatePaymentMethodsUI(false);
        
        // Desactivar funcionalidades del plan
        disablePlanFeatures();
    }, 1500);
}

/**
 * Desactivar funcionalidades del plan
 */
function disablePlanFeatures() {
    console.log('🔒 Desactivando funcionalidades del plan...');
    
    // Aquí se desactivarían las funcionalidades del plan
    // Por ejemplo, deshabilitar botones, mostrar mensajes de advertencia, etc.
    
    // Ejemplo: deshabilitar botones de llamadas y emails
    const actionButtons = document.querySelectorAll('.calls-tab .action-btn, .emails-tab .action-btn');
    actionButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('title', 'Funcionalidad desactivada - Añade un método de pago');
    });
    
    // Ejemplo: añadir mensaje de advertencia en pestañas principales
    const tabContents = document.querySelectorAll('.tab-pane.fade');
    tabContents.forEach(tabContent => {
        // Verificar si ya existe un mensaje de advertencia
        if (!tabContent.querySelector('.payment-warning-alert')) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'alert alert-warning payment-warning-alert mb-3';
            warningDiv.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i><strong>Funcionalidades limitadas:</strong> Añade un método de pago para activar todas las funciones.';
            
            // Insertar al principio del contenido de la pestaña
            if (tabContent.firstChild) {
                tabContent.insertBefore(warningDiv, tabContent.firstChild);
            } else {
                tabContent.appendChild(warningDiv);
            }
        }
    });
}

/**
 * Guardar datos de facturación
 */
function saveBillingInfo() {
    console.log('💳 Guardando datos de facturación...');
    
    // Mostrar spinner de carga
    toastr.info('Guardando datos de facturación...', 'Procesando');
    
    // Obtener datos del formulario
    const company = document.getElementById('billing_company').value;
    const taxId = document.getElementById('billing_tax_id').value;
    const address = document.getElementById('billing_address').value;
    const postalCode = document.getElementById('billing_postal_code').value;
    const city = document.getElementById('billing_city').value;
    const country = document.getElementById('billing_country').value;
    
    // Validar datos
    if (!company || !taxId || !address || !postalCode || !city) {
        toastr.error('Por favor, completa todos los campos obligatorios', 'Error');
        return;
    }
    
    // Simular guardado
    setTimeout(() => {
        toastr.success('Datos de facturación guardados correctamente', 'Guardado');
    }, 1500);
}

/**
 * Filtrar facturas por año
 * @param {string} year - Año a filtrar
 */
function filterInvoicesByYear(year) {
    console.log(`📆 Filtrando facturas por año: ${year}`);
    
    // Mostrar spinner de carga
    toastr.info(`Cargando facturas de ${year}...`, 'Procesando');
    
    // Simular carga de datos
    setTimeout(() => {
        // Aquí se cargarían las facturas del año seleccionado
        toastr.success(`Facturas de ${year} cargadas correctamente`, 'Completado');
    }, 1000);
}

/**
 * Función para responder a un email
 * @param {number} emailId - ID del email
 */
function replyToEmail(emailId) {
    console.log(`📧 Respondiendo al email ID: ${emailId}`);
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Obtener datos del email desde la fila
    const sender = emailRow.querySelector('td:nth-child(2) div:first-child')?.textContent || '';
    const subject = emailRow.querySelector('td:nth-child(3) .fw-medium')?.textContent || '';
    
    // Registrar acción en el sistema de seguimiento
    if (window.UsageTracker) {
        window.UsageTracker.trackEmail();
        window.UsageTracker.updateUI();
    }
    
    // Crear modal para respuesta
    createReplyModal(emailId, sender, subject, false);
}

/**
 * Función para responder a un email con IA
 * @param {number} emailId - ID del email
 */
function replyWithAI(emailId) {
    console.log(`🤖 Respondiendo con IA al email ID: ${emailId}`);
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Obtener datos del email desde la fila
    const sender = emailRow.querySelector('td:nth-child(2) div:first-child')?.textContent || '';
    const subject = emailRow.querySelector('td:nth-child(3) .fw-medium')?.textContent || '';
    
    // Registrar acción en el sistema de seguimiento
    if (window.UsageTracker) {
        window.UsageTracker.trackEmail();
        window.UsageTracker.updateUI();
    }
    
    // Crear modal para respuesta con IA
    createReplyModal(emailId, sender, subject, true);
}

/**
 * Crear modal para responder a un email
 * @param {number} emailId - ID del email
 * @param {string} sender - Remitente del email
 * @param {string} subject - Asunto del email
 * @param {boolean} useAI - Si se debe usar IA para generar la respuesta
 */
function createReplyModal(emailId, sender, subject, useAI) {
    // Crear ID único para el modal
    const modalId = `email-reply-modal-${emailId}`;
    
    // Eliminar modal anterior si existe
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Crear estructura del modal
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content dashboard-card border-0">
                    <div class="modal-header border-0">
                        <h5 class="modal-title" id="${modalId}-label">
                            <i class="fas fa-${useAI ? 'robot' : 'reply'} me-2"></i>RE: ${subject}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label for="reply-to-${emailId}" class="form-label">Para:</label>
                            <input type="text" class="form-control" id="reply-to-${emailId}" value="${sender}" readonly>
                        </div>
                        <div class="mb-3">
                            <label for="reply-subject-${emailId}" class="form-label">Asunto:</label>
                            <input type="text" class="form-control" id="reply-subject-${emailId}" value="RE: ${subject}">
                        </div>
                        ${useAI ? `
                        <div class="mb-3 d-flex align-items-center" id="ai-loading-${emailId}">
                            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                                <span class="visually-hidden">Generando respuesta...</span>
                            </div>
                            <span>La IA está generando una respuesta...</span>
                        </div>
                        ` : ''}
                        <div class="mb-3">
                            <label for="reply-content-${emailId}" class="form-label">Mensaje:</label>
                            <textarea class="form-control" id="reply-content-${emailId}" rows="8" ${useAI ? 'placeholder="La respuesta generada por IA aparecerá aquí..."' : 'placeholder="Escribe tu respuesta aquí..."'}></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn-dashboard-secondary" data-bs-dismiss="modal">Cancelar</button>
                        ${useAI ? `<button type="button" class="btn-dashboard-info" onclick="regenerateAIReply(${emailId})">
                            <i class="fas fa-sync-alt me-2"></i>Regenerar respuesta
                        </button>` : ''}
                        <button type="button" class="btn-dashboard-primary" onclick="sendReply(${emailId})">
                            <i class="fas fa-paper-plane me-2"></i>Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar el modal
    const replyModal = new bootstrap.Modal(document.getElementById(modalId));
    replyModal.show();
    
    // Si es respuesta con IA, generar respuesta después de un breve retraso
    if (useAI) {
        setTimeout(() => {
            const aiResponse = generateAIResponse(emailId, subject);
            document.getElementById(`reply-content-${emailId}`).value = aiResponse;
            document.getElementById(`ai-loading-${emailId}`).style.display = 'none';
        }, 1500);
    }
}

/**
 * Generar respuesta de IA para un email
 * @param {number} emailId - ID del email
 * @param {string} subject - Asunto del email
 * @returns {string} - Respuesta generada por IA
 */
function generateAIResponse(emailId, subject) {
    // Simulación de respuestas generadas por IA
    const responses = [
        `Estimado/a cliente,\n\nGracias por su mensaje sobre "${subject}".\n\nHemos recibido su consulta y nos pondremos en contacto con usted a la mayor brevedad posible para proporcionarle toda la información que necesita.\n\nSaludos cordiales,\nEquipo de Atención al Cliente`,
        
        `Hola,\n\nAgradecemos su interés en nuestros servicios. En relación a su consulta sobre "${subject}", me complace informarle que estamos trabajando para darle una respuesta detallada.\n\nEn breve recibirá más información.\n\nAtentamente,\nServicio de Atención al Cliente`,
        
        `Estimado/a cliente,\n\nEn respuesta a su mensaje sobre "${subject}", queremos informarle que su solicitud ha sido registrada con éxito en nuestro sistema.\n\nUn miembro de nuestro equipo se pondrá en contacto con usted en las próximas 24-48 horas.\n\nGracias por su paciencia.\n\nSaludos cordiales,\nDepartamento de Atención al Cliente`
    ];
    
    // Elegir una respuesta basada en el ID del email para simular consistencia
    const responseIndex = emailId % responses.length;
    return responses[responseIndex];
}

/**
 * Regenerar respuesta de IA
 * @param {number} emailId - ID del email
 */
function regenerateAIReply(emailId) {
    console.log(`🔄 Regenerando respuesta IA para email ID: ${emailId}`);
    
    // Mostrar spinner de carga
    const loadingDiv = document.getElementById(`ai-loading-${emailId}`);
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    } else {
        // Crear div de carga si no existe
        const textareaContainer = document.getElementById(`reply-content-${emailId}`).parentNode;
        const newLoadingDiv = document.createElement('div');
        newLoadingDiv.className = 'mb-3 d-flex align-items-center';
        newLoadingDiv.id = `ai-loading-${emailId}`;
        newLoadingDiv.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span class="visually-hidden">Regenerando respuesta...</span>
            </div>
            <span>La IA está generando una nueva respuesta...</span>
        `;
        textareaContainer.insertBefore(newLoadingDiv, textareaContainer.firstChild);
    }
    
    // Limpiar textarea
    document.getElementById(`reply-content-${emailId}`).value = '';
    
    // Obtener asunto del email
    const subject = document.getElementById(`reply-subject-${emailId}`).value.replace('RE: ', '');
    
    // Generar nueva respuesta después de un breve retraso
    setTimeout(() => {
        // Generar respuesta diferente
        const currentDate = new Date();
        const seed = currentDate.getSeconds(); // Usar los segundos como semilla para variar la respuesta
        const aiResponse = generateAIResponse(emailId + seed, subject);
        
        document.getElementById(`reply-content-${emailId}`).value = aiResponse;
        document.getElementById(`ai-loading-${emailId}`).style.display = 'none';
    }, 1500);
}

/**
 * Enviar respuesta a un email
 * @param {number} emailId - ID del email
 */
function sendReply(emailId) {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📤 Enviando respuesta al email ID: ${emailId} por el usuario ${userId}`);
    
    const content = document.getElementById(`reply-content-${emailId}`).value.trim();
    if (!content) {
        toastr.warning('Por favor, escribe un mensaje antes de enviar', 'Mensaje vacío');
        return;
    }
    
    // Mostrar spinner de carga
    toastr.info('Enviando respuesta...', 'Procesando');
    
    // Registrar el email en el sistema de seguimiento de uso
    if (window.UsageTracker) {
        window.UsageTracker.trackEmail();
        console.log(`📊 Email registrado para el usuario ${userId}`);
    }
    
    // Simular envío
    setTimeout(() => {
        // Cerrar modal
        const modalElement = document.getElementById(`email-reply-modal-${emailId}`);
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Marcar email como leído si no lo estaba
        const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
        if (emailRow && emailRow.classList.contains('fw-bold')) {
            toggleEmailRead(emailId);
        }
        
        // Actualizar la UI del sistema de seguimiento
        if (window.UsageTracker) {
            window.UsageTracker.updateUI();
        }
        
        toastr.success('Respuesta enviada correctamente', 'Enviado');
    }, 1000);
}

/**
 * Inicializar sistema de seguimiento de uso para el usuario actual
 */
function initializeUsageTracker() {
    if (!window.UsageTracker) {
        console.error('Sistema de seguimiento de uso no disponible');
        return;
    }
    
    // Obtener el ID del usuario actual
    const userId = window.UsageTracker.getCurrentUserId();
    
    // Inicializar el sistema
    window.UsageTracker.initialize();
    
    // Actualizar la UI
    window.UsageTracker.updateUI();
    
    // Mostrar resumen de uso en la interfaz
    showUsageSummary();
    
    // Configurar actualización periódica del resumen
    setInterval(showUsageSummary, 60000); // Actualizar cada minuto
    
    // Configurar evento para actualizar el resumen cuando cambie el uso
    document.addEventListener('usageUpdated', function() {
        showUsageSummary();
    });
    
    console.log(`Sistema de seguimiento de uso inicializado para el usuario ${userId}`);
}

/**
 * Mostrar un resumen del uso actual del usuario en la interfaz
 */
function showUsageSummary() {
    // Esta función ahora solo actualiza los datos en la sección de facturación
    // y no muestra ningún popup flotante
    
    // Llamar directamente a la función que actualiza la UI del plan
    updatePlanUsageUI();
    
    // Eliminar el popup si existe
    const existingSummary = document.getElementById('usage-summary');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // Asegurarse de que la sección de uso del plan en facturación esté visible
    const planUsageSection = document.getElementById('plan-usage-section');
    if (planUsageSection) {
        planUsageSection.style.display = 'block';
    }
}

/**
 * Redirigir a la sección de facturación y mostrar detalles de uso
 */
function showUsageSummaryDetails() {
    // Obtener información del usuario actual
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📈 Mostrando detalles de uso para el usuario ${userId} en la sección de facturación...`);
    
    // Actualizar los datos de uso antes de mostrarlos
    updatePlanUsageUI();
    
    // Cambiar a la pestaña de facturación si no está activa
    const billingTab = document.getElementById('billing-tab');
    if (billingTab) {
        // Activar la pestaña de facturación
        const tabInstance = new bootstrap.Tab(billingTab);
        tabInstance.show();
        
        // Dar tiempo para que se cargue la pestaña y luego desplazarse a la sección de uso
        setTimeout(() => {
            const usageSection = document.getElementById('plan-usage-section');
            if (usageSection) {
                // Asegurarse de que la sección sea visible
                usageSection.style.display = 'block';
                
                // Desplazarse suavemente a la sección de uso
                usageSection.scrollIntoView({ behavior: 'smooth' });
                
                // Resaltar temporalmente la sección para llamar la atención
                usageSection.classList.add('highlight-section');
                
                // Quitar la clase de resaltado después de un tiempo
                setTimeout(() => {
                    usageSection.classList.remove('highlight-section');
                }, 2000);
            }
        }, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Dashboard Simple...');
    
    // Añadir estilos CSS
    addDashboardStyles();
    
    // Verificar si hay un usuario autenticado
    if (typeof authService !== 'undefined' && authService.isAuthenticated()) {
        // Obtener datos de la empresa del usuario
        const companyData = JSON.parse(localStorage.getItem('companyData') || '{}');
        
        // Adaptar el dashboard según el contexto de la empresa
        adaptOtherContextSimple(companyData);
        
        // Inicializar el dashboard con la nueva función que desactiva los mensajes temporales
        initDashboard();
        
        // Inicializar el sistema de seguimiento de uso
        if (window.UsageTracker) {
            initializeUsageTracker();
        }
        
        // Inicializar dropdowns de Bootstrap después de cargar el contenido
        setTimeout(() => {
            initializeDropdowns();
        }, 1000);
    } else {
        console.error('❌ Usuario no autenticado');
        window.location.href = 'login.html';
    }
});
