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
                                    <h5 class="card-title"><i class="fas fa-phone-alt"></i>Registro de Llamadas</h5>
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
                                
                                <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                                    <table class="dashboard-table">
                                        <thead>
                                            <tr>
                                                <th>Gestionado</th>
                                                <th>Fecha</th>
                                                <th>Número</th>
                                                <th>Clasificación IA</th>
                                                <th>Resumen</th>
                                                <th>Duración</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="calls-table-body">
                                            <!-- Llamada 1: Pedido -->
                                            <tr class="call-row" data-id="1" data-type="pedidos" data-urgency="alta" data-urgent="true">
                                                <td>
                                                    <div class="custom-checkbox" id="call-managed-1" onclick="toggleCheckbox(this)"></div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">2024-02-20</div>
                                                        <div class="text-muted small">11:45</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">+34 600 123 456</div>
                                                        <div class="text-muted small">Contacto registrado</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <span class="badge-dashboard badge-pedido mb-1">📦 PEDIDO</span>
                                                        <span class="badge-dashboard badge-urgente">🚨 URGENTE</span>
                                                        <div class="text-muted small mt-1">Confianza: 95%</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">Cliente solicita 200m2 de piel roja</div>
                                                        <div class="text-muted small">Necesita entrega para el 22 de julio. Cliente María García, pedido urgente para evento. Requiere confirmación de disponibilidad y precio final.</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge-dashboard" style="background: var(--primary-gradient)">04:32</span>
                                                </td>
                                                <td>
                                                    <div class="d-flex">
                                                        <button class="action-btn action-btn-primary play-btn" title="Reproducir grabación">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-primary" title="Ver detalles completos" onclick="viewCallDetails(1)">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-success manage-btn" title="Marcar/Desmarcar como gestionado" data-managed="false">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-warning star-btn" title="Marcar como importante">
                                                            <i class="far fa-star"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 2: Consulta -->
                                            <tr class="call-row" data-id="2" data-type="consultas" data-urgency="baja">
                                                <td>
                                                    <div class="custom-checkbox checked" id="call-managed-2" onclick="toggleCheckbox(this)"></div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">2024-02-19</div>
                                                        <div class="text-muted small">16:20</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">+34 655 789 012</div>
                                                        <div class="text-muted small">Contacto registrado</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <span class="badge-dashboard badge-consulta mb-1">❓ CONSULTA</span>
                                                        <span class="badge-dashboard badge-normal">NORMAL</span>
                                                        <div class="text-muted small mt-1">Confianza: 87%</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div class="d-flex flex-column">
                                                        <div class="fw-medium">Consulta sobre disponibilidad de pieles</div>
                                                        <div class="text-muted small">Pregunta por disponibilidad de piel negra y marrón para tapicería. Interesado en precios por metro cuadrado y tiempos de entrega estándar.</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span class="badge-dashboard" style="background: var(--primary-gradient)">02:15</span>
                                                </td>
                                                <td>
                                                    <div class="d-flex">
                                                        <button class="action-btn action-btn-primary play-btn" title="Reproducir grabación">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-primary" title="Ver detalles completos" onclick="viewCallDetails(2)">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-success active manage-btn" title="Desmarcar como gestionado" data-managed="true">
                                                            <i class="fas fa-undo"></i>
                                                        </button>
                                                        <button class="action-btn action-btn-warning star-btn" title="Marcar como importante">
                                                            <i class="far fa-star"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 3: Pedido -->
                                            <tr class="call-row" data-id="3" data-type="pedidos" data-urgency="media" data-urgent="true">
                                                <td class="px-3 py-2">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="call-managed-3">
                                                        <label class="form-check-label" for="call-managed-3"></label>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-warning rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-19</div>
                                                            <small class="text-muted">10:05</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">+34 622 334 455</div>
                                                        <small class="text-muted">Contacto registrado</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-success mb-1">📦 PEDIDO</span>
                                                        <span class="badge bg-warning">PRIORITARIO</span>
                                                        <small class="text-muted mt-1">Confianza: 92%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Pedido de 50m2 de piel marrón</div>
                                                    <small class="text-muted">Cliente Juan Pérez solicita 50m2 de piel marrón oscuro para proyecto de restauración. Necesita entrega en 3 semanas. Solicita presupuesto detallado.</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">03:48</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex">
                                                        <button class="btn btn-sm btn-outline-secondary me-1 play-btn" title="Escuchar grabación">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalles" onclick="viewCallDetails(3)">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-success manage-btn" title="Marcar como gestionado">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-warning ms-1 star-btn" title="Marcar como importante">
                                                            <i class="far fa-star"></i>
                                                        </button>
                                                    </div>
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
                    <div class="dashboard-card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-envelope me-2"></i>Gestión de Emails <span class="badge-dashboard badge-primary ms-2" id="email-count">0</span></h5>
                            <div>
                                <button class="btn-dashboard-success me-2" id="classify-emails-btn">
                                    <i class="fas fa-robot me-2"></i>Clasificar con IA
                                </button>
                                <button class="btn-dashboard-primary" id="refresh-emails-btn">
                                    <i class="fas fa-sync me-2"></i>Actualizar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="dashboard-card-body p-0">
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
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="dashboard-table">
                                <thead>
                                    <tr>
                                        <th style="width: 5%"><i class="fas fa-star"></i></th>
                                        <th style="width: 25%">Remitente</th>
                                        <th style="width: 45%">Asunto</th>
                                        <th style="width: 15%">Fecha</th>
                                        <th style="width: 10%">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="emails-table-body">
                                    <!-- Los emails se cargarán dinámicamente -->
                                        <td>Hoy, 10:25</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary ai-reply-btn" data-id="1" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary manual-reply-btn" data-id="1" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info history-btn" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                                <button class="btn btn-outline-warning read-btn" title="Marcar como leído/no leído">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 2 - Leído -->
                                    <tr class="email-row" data-id="2" data-type="read">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>María Gómez</td>
                                        <td>Solicitud de información adicional</td>
                                        <td>Ayer, 15:40</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary ai-reply-btn" data-id="2" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary manual-reply-btn" data-id="2" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info history-btn" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                                <button class="btn btn-outline-warning read-btn" title="Marcar como leído/no leído">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 3 - Spam -->
                                    <tr class="email-row" data-id="3" data-type="spam">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>marketing@ofertas.com <span class="badge bg-danger ms-1">Spam</span></td>
                                        <td>¡¡¡Oferta especial solo por hoy!!!</td>
                                        <td>15/05/2023</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary ai-reply-btn" data-id="3" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary manual-reply-btn" data-id="3" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info history-btn" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                                <button class="btn btn-outline-warning read-btn" title="Marcar como leído/no leído">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 4 - No leído -->
                                    <tr class="email-row fw-bold" data-id="4" data-type="unread">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>Carlos Rodríguez <span class="badge bg-success ms-1">Nuevo</span></td>
                                        <td>
                                            <i class="fas fa-circle text-primary me-1" style="font-size: 8px;"></i>
                                            Solicitud de presupuesto
                                        </td>
                                        <td>14/05/2023</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary ai-reply-btn" data-id="4" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary manual-reply-btn" data-id="4" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info history-btn" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                                <button class="btn btn-outline-warning read-btn" title="Marcar como leído/no leído">
                                                    <i class="fas fa-envelope"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 5 - Importante -->
                                    <tr class="email-row" data-type="important">
                                        <td><i class="fas fa-star text-warning"></i></td>
                                        <td>Ana Martínez <span class="badge bg-warning text-dark ms-1">Urgente</span></td>
                                        <td>Problema con el pedido #12345</td>
                                        <td>10/05/2023</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary ai-reply-btn" data-id="5" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary manual-reply-btn" data-id="5" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info" onclick="viewEmailHistory(5)" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
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
                                            <input type="text" class="form-control" id="company_name" name="company_name" value="Tech Solutions S.L." required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="contact_email" class="form-label">Email de Contacto</label>
                                            <input type="email" class="form-control" id="contact_email" name="contact_email" value="info@techsolutions.com" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="main_phone" class="form-label">Teléfono Principal</label>
                                            <input type="tel" class="form-control" id="main_phone" name="main_phone" value="+34 91 123 4567" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="address" class="form-label">Dirección</label>
                                            <input type="text" class="form-control" id="address" name="address" value="Calle Mayor 123, 28001 Madrid">
                                        </div>
                                        <div class="col-12">
                                            <label for="company_description" class="form-label">Descripción de la Empresa</label>
                                            <textarea class="form-control" id="company_description" name="company_description" rows="3" placeholder="Describe brevemente a qué se dedica tu empresa...">Empresa líder en soluciones tecnológicas para negocios, especializada en software de gestión y automatización de procesos.</textarea>
                                            <small class="text-muted">Esta descripción ayuda al bot a entender mejor el contexto de tu negocio.</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="industry" class="form-label">Sector empresarial</label>
                                            <select class="form-select" id="industry" name="industry" required>
                                                <option value="">Selecciona un sector</option>
                                                <option value="retail" selected>Comercio (Retail)</option>
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
                                        
                                        <!-- Configuración de correos electrónicos -->
                                        <div class="col-md-6">
                                            <div class="card border-light">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Correos de Gestión</h6>
                                                    <div class="mb-3">
                                                        <label for="outgoing_email" class="form-label">Email de Salida</label>
                                                        <input type="email" class="form-control" id="outgoing_email" name="outgoing_email" value="soporte@techsolutions.com" required placeholder="correo@tuempresa.com">
                                                        <div class="form-text">Email desde el que se enviarán las respuestas automáticas</div>
                                                    </div>
                                                    <div>
                                                        <label for="recipient_email" class="form-label">Email de Recepción</label>
                                                        <input type="email" class="form-control" id="recipient_email" name="recipient_email" value="info@techsolutions.com" required placeholder="info@tuempresa.com">
                                                        <div class="form-text">Email donde se recibirán las copias de las respuestas</div>
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
                                                        <input type="url" class="form-control" id="website" name="website" value="https://www.techsolutions.com" required placeholder="https://www.tuempresa.com">
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
                                        <div class="row g-3">
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
                                        <div class="card h-100">
                                            <div class="card-header bg-light">
                                                <h6 class="mb-0">Plan Básico</h6>
                                            </div>
                                            <div class="card-body p-3">
                                                <div class="fw-bold fs-4 mb-2">19,99€ <small class="text-muted fs-6">/mes</small></div>
                                                <ul class="list-unstyled small">
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 100 llamadas/mes</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 500 emails/mes</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 1 usuario</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Soporte básico</li>
                                                </ul>
                                                <button class="btn btn-sm btn-outline-primary w-100 mt-2">Cambiar plan</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card h-100 border-primary">
                                            <div class="card-header bg-primary text-white">
                                                <h6 class="mb-0 d-flex justify-content-between align-items-center">
                                                    Plan Profesional
                                                    <span class="badge bg-white text-primary">Actual</span>
                                                </h6>
                                            </div>
                                            <div class="card-body p-3">
                                                <div class="fw-bold fs-4 mb-2">49,99€ <small class="text-muted fs-6">/mes</small></div>
                                                <ul class="list-unstyled small">
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 1.000 llamadas/mes</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 5.000 emails/mes</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 5 usuarios</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Soporte prioritario</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Respuestas IA ilimitadas</li>
                                                </ul>
                                                <button class="btn btn-sm btn-outline-primary w-100 mt-2" disabled>Plan Actual</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card h-100">
                                            <div class="card-header bg-dark text-white">
                                                <h6 class="mb-0 d-flex justify-content-between align-items-center">
                                                    Plan Enterprise
                                                    <span class="badge bg-warning">Premium</span>
                                                </h6>
                                            </div>
                                            <div class="card-body p-3">
                                                <div class="fw-bold fs-4 mb-2">99,99€ <small class="text-muted fs-6">/mes</small></div>
                                                <ul class="list-unstyled small">
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Llamadas ilimitadas</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Emails ilimitados</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> 15 usuarios</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> Soporte 24/7</li>
                                                    <li class="mb-1"><i class="fas fa-check text-success me-1"></i> API personalizada</li>
                                                </ul>
                                                <button class="btn btn-sm btn-dark w-100 mt-2" id="upgrade-plan-btn">Actualizar Plan</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card border-0 shadow-sm">
                                    <div class="card-header bg-light py-2">
                                        <h6 class="mb-0 small">Uso Actual del Plan</h6>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-3">
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Llamadas</small>
                                                    <small class="text-muted">650 / 1.000</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-primary" role="progressbar" style="width: 65%;" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Emails</small>
                                                    <small class="text-muted">2.100 / 5.000</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-success" role="progressbar" style="width: 42%;" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <small class="text-muted">Usuarios</small>
                                                    <small class="text-muted">4 / 5</small>
                                                </div>
                                                <div class="progress" style="height: 8px;">
                                                    <div class="progress-bar bg-warning" role="progressbar" style="width: 80%;" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100"></div>
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
 * Cargar datos de llamadas desde la API (simulado)
 */
function loadCallsData() {
    console.log('📞 Cargando datos de llamadas...');
    
    // Simular llamada a API con datos de ejemplo
    // En producción, esto sería una llamada fetch real a la API
    setTimeout(() => {
        const callsData = [
            {
                id: 1,
                date: '2024-02-20',
                time: '11:45',
                phone: '+34 600 123 456',
                contactType: 'Contacto registrado',
                classification: 'pedido',
                urgency: 'urgente',
                confidence: 95,
                summary: 'Cliente solicita 200m2 de piel roja',
                details: 'Necesita entrega para el 22 de julio. Cliente María García, pedido urgente para evento. Requiere confirmación de disponibilidad y precio final.',
                duration: '04:32',
                managed: false
            },
            {
                id: 2,
                date: '2024-02-19',
                time: '16:20',
                phone: '+34 655 789 012',
                contactType: 'Contacto registrado',
                classification: 'consulta',
                urgency: 'normal',
                confidence: 87,
                summary: 'Consulta sobre disponibilidad de pieles',
                details: 'Pregunta por disponibilidad de piel negra y marrón para tapicería. Interesado en precios por metro cuadrado y tiempos de entrega estándar.',
                duration: '02:15',
                managed: true
            },
            {
                id: 3,
                date: '2024-02-18',
                time: '09:10',
                phone: '+34 633 456 789',
                contactType: 'Cliente nuevo',
                classification: 'reclamación',
                urgency: 'alta',
                confidence: 92,
                summary: 'Reclamación por calidad del producto',
                details: 'Cliente insatisfecho con la calidad de la piel recibida. Menciona que el color no coincide con lo solicitado y hay imperfecciones en algunas áreas.',
                duration: '06:45',
                managed: false
            }
        ];
        
        // Limpiar tabla de llamadas
        const callsTableBody = document.getElementById('calls-table-body');
        if (callsTableBody) {
            callsTableBody.innerHTML = '';
            
            // Generar filas de llamadas con el nuevo diseño moderno
            callsData.forEach(call => {
                const callRow = createCallRow(call);
                callsTableBody.appendChild(callRow);
            });
            
            // Actualizar contador
            updateCallsCount();
            
            // Inicializar dropdowns de Bootstrap
            initializeDropdowns();
        }
        
        console.log(`✅ ${callsData.length} llamadas cargadas correctamente`);
    }, 500);
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
        <td class="text-center" style="width: 40px;">
            <div class="${checkboxClass}" id="call-managed-${call.id}" onclick="toggleCheckbox(this)"></div>
        </td>
        <td style="width: 90px;">
            <div class="d-flex flex-column">
                <div class="fw-medium">${call.date}</div>
                <div class="text-muted small">${call.time}</div>
            </div>
        </td>
        <td style="width: 120px;">
            <div class="d-flex flex-column">
                <div class="fw-medium">${call.phone}</div>
                <div class="text-muted small">${call.contactType}</div>
            </div>
        </td>
        <td style="width: 140px;">
            <div class="d-flex flex-column">
                ${getClassificationBadge(call.classification, call.urgency)}
                <div class="text-muted small mt-1">Confianza: ${call.confidence}%</div>
            </div>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div class="fw-medium text-truncate">${call.summary}</div>
                <div class="text-muted small text-truncate">${call.details}</div>
            </div>
        </td>
        <td style="width: 70px;">
            <span class="badge-dashboard" style="background: var(--primary-gradient)">${call.duration}</span>
        </td>
        <td class="text-center" style="width: 50px;">
            <div class="dropdown">
                <button class="btn btn-sm btn-dashboard-primary dropdown-toggle p-1" type="button" id="callActions${call.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-robot"></i>
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
    
    // Mostrar modal de reproducción
    const playModal = new bootstrap.Modal(document.getElementById('play-call-modal'));
    
    // Actualizar título del modal
    const modalTitle = document.querySelector('#play-call-modal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Reproducción de llamada #${callId}`;
    }
    
    // Simular carga de audio
    const audioPlayer = document.getElementById('call-audio-player');
    if (audioPlayer) {
        // Deshabilitar controles mientras se carga
        audioPlayer.controls = false;
        
        // Mostrar spinner de carga
        const loadingSpinner = document.getElementById('audio-loading');
        if (loadingSpinner) {
            loadingSpinner.classList.remove('d-none');
        }
        
        // Simular carga de audio (en producción cargaría de la API)
        setTimeout(() => {
            // URL de ejemplo (en producción sería dinámica)
            audioPlayer.src = `https://example.com/calls/audio-${callId}.mp3`;
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
        }, 1500);
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
    
    // En producción, aquí se enviaría la actualización a la API
    // Simular llamada a API
    setTimeout(() => {
        console.log(`API: Llamada ${callId} estado actualizado a ${!isManaged ? 'gestionada' : 'pendiente'}`);
    }, 500);
    
    // Actualizar contador
    updateCallsCount();
}

/**
 * Ver detalles de llamada
 * @param {number} callId - ID de la llamada
 */
function viewCallDetails(callId) {
    console.log(`👁️ Ver detalles de llamada ID: ${callId}`);
    
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
    
    // Cargar datos iniciales
    loadInitialData();
    
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
 * Cargar datos existentes del dashboard
 */
function loadExistingData() {
    console.log('📥 Cargando datos existentes...');
    
    // Datos de ejemplo (en producción vendrían de la API)
    const existingData = {
        company_name: 'TechSolutions S.L.',
        contact_email: 'info@techsolutions.com',
        main_phone: '+34 912 345 678',
        website: 'https://www.techsolutions.com',
        address: 'Calle Mayor 123, 28001 Madrid',
        industry: 'technology',
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
 * Cargar datos de emails desde la API (simulado)
 */
function loadEmailsData() {
    console.log('📧 Cargando datos de emails...');
    
    // Simular llamada a API con datos de ejemplo
    // En producción, esto sería una llamada fetch real a la API
    setTimeout(() => {
        const emailsData = [
            {
                id: 1,
                sender: 'Juan Pérez',
                senderType: 'Cliente',
                subject: 'Consulta sobre productos premium',
                preview: 'Buenas tardes, me gustaría obtener más información sobre sus productos premium, especialmente...',
                content: 'Buenas tardes,\n\nMe gustaría obtener más información sobre sus productos premium, especialmente sobre las pieles sintéticas para tapicería. Necesito conocer precios, disponibilidad y tiempos de entrega para un proyecto importante.\n\nGracias de antemano,\nJuan Pérez\nDirector de Proyectos\nInteriorismo Moderno S.L.',
                date: 'Hoy',
                time: '10:25',
                read: false,
                important: true,
                spam: false
            },
            {
                id: 2,
                sender: 'María García',
                senderType: 'Proveedor',
                subject: 'Actualización de catálogo 2024',
                preview: 'Adjunto encontrará nuestro nuevo catálogo de productos para 2024 con todas las novedades...',
                content: 'Estimado cliente,\n\nAdjunto encontrará nuestro nuevo catálogo de productos para 2024 con todas las novedades y actualizaciones de precios. Hemos incorporado nuevas líneas de productos que podrían ser de su interés.\n\nNo dude en contactarnos para cualquier consulta.\n\nSaludos cordiales,\nMaría García\nDepartamento Comercial\nProveedores Unidos S.A.',
                date: 'Ayer',
                time: '16:40',
                read: true,
                important: false,
                spam: false
            },
            {
                id: 3,
                sender: 'newsletter@marketing.com',
                senderType: '',
                subject: '¡Ofertas especiales solo este mes!',
                preview: 'Descubra nuestras ofertas exclusivas para clientes VIP. ¡Solo durante este mes!...',
                content: '¡Ofertas especiales solo este mes!\n\nDescubra nuestras ofertas exclusivas para clientes VIP. ¡Solo durante este mes! Aproveche descuentos de hasta el 50% en productos seleccionados.\n\nHaga clic aquí para ver todas las ofertas.\n\nSi no desea recibir más emails como este, haga clic aquí para darse de baja.',
                date: '18/02/2024',
                time: '09:15',
                read: true,
                important: false,
                spam: true
            }
        ];
        
        // Limpiar tabla de emails
        const emailsTableBody = document.getElementById('emails-table-body');
        if (emailsTableBody) {
            emailsTableBody.innerHTML = '';
            
            // Generar filas de emails con el nuevo diseño moderno
            emailsData.forEach(email => {
                const emailRow = createEmailRow(email);
                emailsTableBody.appendChild(emailRow);
            });
            
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
    }, 500);
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
        <td class="text-center" style="width: 40px;">
            <i class="${email.important ? 'fas' : 'far'} fa-star ${email.important ? 'text-warning' : ''}" 
               onclick="toggleEmailFavorite(${email.id}, this)"></i>
        </td>
        <td style="width: 20%;">
            <div class="d-flex flex-column">
                <div class="text-truncate">${email.sender}</div>
                ${email.senderType ? `<span class="badge-dashboard badge-primary mt-1">${email.senderType}</span>` : ''}
            </div>
        </td>
        <td>
            <div class="d-flex align-items-center">
                ${!email.read ? '<i class="fas fa-circle text-primary me-2" style="font-size: 8px;"></i>' : ''}
                <div class="text-truncate">${email.subject}</div>
            </div>
        </td>
        <td style="width: 100px;">
            <div class="d-flex flex-column">
                <div>${email.date}</div>
                <div class="text-muted small">${email.time}</div>
            </div>
        </td>
        <td class="text-center" style="width: 50px;">
            <div class="dropdown">
                <button class="btn btn-sm btn-dashboard-primary dropdown-toggle p-1" type="button" id="emailActions${email.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-robot"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="emailActions${email.id}">
                    <li><a class="dropdown-item" href="#" onclick="viewEmailDetails(${email.id}); return false;">
                        <i class="fas fa-eye me-2"></i> Ver detalles
                    </a></li>
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
    
    // En producción, aquí se enviaría la actualización a la API
    setTimeout(() => {
        console.log(`API: Email ${emailId} estado de favorito actualizado a ${!isImportant}`);
    }, 300);
}

/**
 * Alternar estado de leído de un email
 * @param {number} emailId - ID del email
 */
function toggleEmailRead(emailId) {
    console.log(`📣 Alternando estado de leído para email ID: ${emailId}`);
    
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
                        <button type="button" class="btn-dashboard-primary reply-btn">
                            <i class="fas fa-reply me-2"></i>Responder
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
    
    // En producción, aquí se enviaría la actualización a la API
    // Simular llamada a API
    setTimeout(() => {
        console.log(`API: Email ${emailId} estado actualizado a ${!isRead ? 'no leído' : 'leído'}`);
    }, 500);
    
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
    
    // En producción, aquí se enviaría la actualización a la API
    // Simular llamada a API
    setTimeout(() => {
        console.log(`API: Llamada ${callId} importancia actualizada a ${!isStarred ? 'importante' : 'normal'}`);
    }, 500);
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
 * Configurar funcionalidades de la cuenta
 */
function setupAccountFeatures() {
    console.log('👤 Configurando funcionalidades de la cuenta...');
    
    // Botón para guardar cambios en la cuenta
    const saveAccountBtn = document.getElementById('save-account-btn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', function() {
            console.log('💾 Guardando cambios en la cuenta...');
            toastr.info('Guardando cambios...', 'Procesando');
            
            // Simular guardado
            setTimeout(() => {
                toastr.success('Cambios guardados correctamente', 'Éxito');
            }, 1500);
        });
    }
    
    // Validar formularios de la cuenta
    const accountForm = document.querySelector('#account-content form');
    if (accountForm) {
        accountForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Formulario de cuenta enviado');
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
    console.log('💳 Configurando funcionalidades de facturación...');
    
    // Botón para ver facturas
    const viewInvoicesBtn = document.getElementById('view-invoices-btn');
    if (viewInvoicesBtn) {
        viewInvoicesBtn.addEventListener('click', function() {
            console.log('💸 Mostrando facturas...');
            toastr.info('Cargando facturas...', 'Procesando');
            
            // Simular carga de facturas
            setTimeout(() => {
                showInvoicesModal();
            }, 1000);
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
    
    // Simular llamada al backend para actualizar estado
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
    console.log('💾 Guardando configuración unificada del bot...');
    
    // Recopilar todos los datos del formulario
    const config = {
        // Datos de la empresa
        company_name: document.getElementById('company_name')?.value || '',
        contact_email: document.getElementById('contact_email')?.value || '',
        main_phone: document.getElementById('main_phone')?.value || '',
        website: document.getElementById('website')?.value || '',
        address: document.getElementById('address')?.value || '',
        industry: document.getElementById('industry')?.value || '',
        company_description: document.getElementById('company_description')?.value || '',
        
        // Configuración general
        primary_language: document.getElementById('primary_language')?.value || 'es',
        bot_personality: document.getElementById('bot_personality')?.value || 'professional',
        timezone: document.getElementById('timezone')?.value || 'Europe/Madrid',
        
        // Horarios (unificados)
        opening_time: document.getElementById('opening_time')?.value || '09:00',
        closing_time: document.getElementById('closing_time')?.value || '18:00',
        working_days: {
            monday: document.getElementById('monday')?.checked || false,
            tuesday: document.getElementById('tuesday')?.checked || false,
            wednesday: document.getElementById('wednesday')?.checked || false,
            thursday: document.getElementById('thursday')?.checked || false,
            friday: document.getElementById('friday')?.checked || false,
            saturday: document.getElementById('saturday')?.checked || false,
            sunday: document.getElementById('sunday')?.checked || false
        },
        
        // Configuración de llamadas
        twilio_phone_number: document.getElementById('twilio_phone_number')?.value || '',
        welcome_message: document.getElementById('welcome_message')?.value || '',
        
        // Configuración de emails
        incoming_email: document.getElementById('incoming_email')?.value || '',
        notification_email: document.getElementById('notification_email')?.value || '',
        check_frequency: parseInt(document.getElementById('check_frequency')?.value) || 15,
        confidence_level: parseFloat(document.getElementById('confidence_level')?.value) || 0.8,
        response_tone: document.getElementById('response_tone')?.value || 'professional',
        email_signature: document.getElementById('email_signature')?.value || '',
        
        // Configuración avanzada de IA
        auto_priority: document.getElementById('auto_priority')?.checked || false,
        include_context: document.getElementById('include_context')?.checked || false,
        auto_classify: document.getElementById('auto_classify')?.checked || false,
        require_approval: document.getElementById('require_approval')?.checked || false,
        notify_urgent: document.getElementById('notify_urgent')?.checked || false,
        daily_summary: document.getElementById('daily_summary')?.checked || false,
        
        // Archivos de contexto
        files: {
            inventory: document.getElementById('inventory_file')?.files[0] || null,
            catalog: document.getElementById('catalog_file')?.files[0] || null,
            pricing: document.getElementById('pricing_file')?.files[0] || null,
            info: document.getElementById('info_file')?.files[0] || null
        }
    };
    
    // Validar campos requeridos
    const requiredFields = [
        { field: 'company_name', name: 'Nombre de la Empresa' },
        { field: 'contact_email', name: 'Email de Contacto' },
        { field: 'industry', name: 'Sector' }
    ];
    
    const missingFields = [];
    requiredFields.forEach(({ field, name }) => {
        if (!config[field] || config[field].trim() === '') {
            missingFields.push(name);
            document.getElementById(field)?.classList.add('is-invalid');
        } else {
            document.getElementById(field)?.classList.remove('is-invalid');
        }
    });
    
    // Validar formato de email
    const emailFields = ['contact_email', 'incoming_email', 'notification_email'];
    emailFields.forEach(field => {
        const value = config[field];
        if (value && !isValidEmail(value)) {
            missingFields.push(`Formato de ${field.replace('_', ' ')} inválido`);
            document.getElementById(field)?.classList.add('is-invalid');
        } else if (value) {
            document.getElementById(field)?.classList.remove('is-invalid');
        }
    });
    
    if (missingFields.length > 0) {
        toastr.error(`Campos requeridos: ${missingFields.join(', ')}`, 'Error de Validación');
        return;
    }
    
    // Simular guardado
    toastr.info('Guardando configuración...', 'Procesando');
    
    setTimeout(() => {
        console.log('✅ Configuración guardada:', config);
        
        // Procesar archivos si existen
        processContextFiles(config.files);
        
        toastr.success('Configuración guardada correctamente', '¡Éxito!');
    }, 1500);
}

/**
 * Probar configuración del bot
 */
function testBotConfiguration() {
    console.log('🤖 Probando configuración del bot...');
    
    // Mostrar spinner de carga
    toastr.info('Probando configuración del bot...', 'Procesando');
    
    // Recopilar datos de configuración relevantes para la prueba
    const companyName = document.getElementById('company_name')?.value || 'Empresa';
    const businessHours = document.getElementById('business_hours')?.value || 'Lun-Vie: 9:00-18:00';
    const botPersonality = document.getElementById('bot_personality')?.value || 'professional';
    
    // Recopilar preguntas frecuentes
    const faqs = collectFaqItems();
    
    // Simular prueba del bot
    setTimeout(() => {
        // Mostrar modal con resultados de la prueba
        showBotTestModal(companyName, businessHours, botPersonality, faqs);
    }, 2000);
}

/**
 * Mostrar modal con resultados de la prueba del bot
 * @param {string} companyName - Nombre de la empresa
 * @param {string} businessHours - Horario comercial
 * @param {string} botPersonality - Personalidad del bot
 * @param {Array} faqs - Preguntas frecuentes
 */
function showBotTestModal(companyName, businessHours, botPersonality, faqs) {
    console.log('💬 Mostrando resultados de prueba del bot');
    
    // Determinar personalidad del bot para el mensaje
    let botStyle = 'profesional y eficiente';
    if (botPersonality === 'friendly') {
        botStyle = 'amigable y cercano';
    } else if (botPersonality === 'formal') {
        botStyle = 'formal y serio';
    }
    
    // Crear HTML para las preguntas frecuentes
    let faqsHtml = '';
    if (faqs.length > 0) {
        faqsHtml = `
            <div class="mt-3">
                <h6 class="mb-2">Preguntas frecuentes cargadas:</h6>
                <ul class="list-group">
                    ${faqs.map((faq, index) => `
                        <li class="list-group-item">
                            <strong>P${index + 1}:</strong> ${faq.question}<br>
                            <small class="text-muted">R: ${faq.answer}</small>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } else {
        faqsHtml = `
            <div class="alert alert-warning mt-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                No se han configurado preguntas frecuentes. Recomendamos añadir al menos 3-5 preguntas para mejorar la experiencia del usuario.
            </div>
        `;
    }
    
    const modalHTML = `
        <div class="modal fade" id="botTestModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-robot me-2"></i>Resultados de Prueba del Bot
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="d-flex align-items-center mb-4">
                            <div class="me-3">
                                <div class="avatar bg-light rounded-circle p-2" style="width: 80px; height: 80px;">
                                    <i class="fas fa-robot text-success" style="font-size: 2.5rem;"></i>
                                </div>
                            </div>
                            <div>
                                <h5 class="mb-1">Bot de ${companyName}</h5>
                                <p class="mb-0 text-muted">Configuración probada con éxito</p>
                            </div>
                        </div>
                        
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>¡Prueba exitosa!</strong> El bot está correctamente configurado y listo para responder consultas de clientes.
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <h6 class="mb-0">Configuración actual</h6>
                            </div>
                            <div class="card-body">
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Horario comercial:</span>
                                        <span class="badge bg-primary">${businessHours}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Personalidad del bot:</span>
                                        <span class="badge bg-info">${botStyle}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Preguntas frecuentes:</span>
                                        <span class="badge bg-${faqs.length > 0 ? 'success' : 'warning'}">${faqs.length} configuradas</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <h6 class="mb-0">Ejemplo de respuesta del bot</h6>
                            </div>
                            <div class="card-body">
                                <div class="chat-message">
                                    <div class="message bot-message">
                                        <div class="message-content">
                                            Hola, soy el asistente virtual de ${companyName}. ¿En qué puedo ayudarte hoy? Nuestro horario de atención es ${businessHours}.
                                        </div>
                                        <div class="message-time">Ahora</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${faqsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-success" id="save-test-config-btn">
                            <i class="fas fa-save me-2"></i>Guardar y Activar Bot
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar modal existente si hay uno
    const existingModal = document.getElementById('botTestModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Añadir modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('botTestModal'));
    modal.show();
    
    // Configurar botón de guardar
    const saveButton = document.getElementById('save-test-config-btn');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            // Simular guardado y activación
            toastr.info('Activando configuración del bot...', 'Procesando');
            
            setTimeout(() => {
                toastr.success('Bot activado correctamente', '¡Éxito!');
                modal.hide();
            }, 1500);
        });
    }
    
    // Añadir estilos para el chat
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .chat-message {
            display: flex;
            flex-direction: column;
        }
        .message {
            max-width: 80%;
            margin-bottom: 10px;
            padding: 10px 15px;
            border-radius: 15px;
            position: relative;
        }
        .bot-message {
            align-self: flex-start;
            background-color: #f0f2f5;
        }
        .message-content {
            margin-bottom: 5px;
        }
        .message-time {
            font-size: 0.7rem;
            color: #999;
            text-align: right;
        }
    `;
    document.head.appendChild(styleElement);
}

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
 * Cargar preguntas frecuentes de ejemplo
 */
function loadSampleFaqs() {
    const sampleFaqs = [
        {
            id: 1,
            question: '¿Cuáles son los horarios de atención?',
            answer: 'Nuestro horario de atención al cliente es de lunes a viernes de 9:00 a 18:00 horas.'
        },
        {
            id: 2,
            question: '¿Cómo puedo solicitar una devolución?',
            answer: 'Para solicitar una devolución, debe contactar con nuestro departamento de atención al cliente en un plazo de 14 días desde la recepción del producto, adjuntando el número de pedido y el motivo de la devolución.'
        },
        {
            id: 3,
            question: '¿Qué métodos de pago aceptan?',
            answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express), PayPal y transferencia bancaria.'
        }
    ];
    
    // Añadir preguntas de ejemplo al DOM
    sampleFaqs.forEach(faq => addFaqItemToDOM(faq));
    
    // Actualizar la visualización del mensaje de no hay preguntas
    updateNoFaqsMessage();
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
    const newFaq = {
        id: Date.now(), // Usar timestamp como ID temporal
        question: '',
        answer: ''
    };
    
    addFaqItemToDOM(newFaq);
    
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
    const faqItem = document.getElementById(`faq-item-${faqId}`);
    if (faqItem) {
        // Animación de desvanecimiento antes de eliminar
        faqItem.style.transition = 'opacity 0.3s';
        faqItem.style.opacity = '0';
        
        setTimeout(() => {
            faqItem.remove();
            renumberFaqItems();
            updateNoFaqsMessage(); // Actualizar mensaje de no hay preguntas
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
    console.log('📁 Procesando archivos de contexto...');
    
    // Si se pasan archivos específicos (desde saveUnifiedConfig)
    if (files) {
        Object.keys(files).forEach(fileType => {
            const file = files[fileType];
            if (file) {
                processFile(file);
            }
        });
        return;
    }
    
    // Si no se pasan archivos, usar el input de archivos context_files
    const contextFilesInput = document.getElementById('context_files');
    if (!contextFilesInput || !contextFilesInput.files || contextFilesInput.files.length === 0) {
        console.log('No hay archivos seleccionados');
        return;
    }
    
    // Validar número máximo de archivos
    if (contextFilesInput.files.length > 5) {
        toastr.error('Máximo 5 archivos permitidos', 'Error de Archivo');
        return;
    }
    
    // Procesar cada archivo seleccionado
    Array.from(contextFilesInput.files).forEach(file => {
        processFile(file);
    });
    
    // Actualizar la lista de archivos
    updateContextFilesList();
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
    console.log('📎 Configurando manejadores de carga de archivos...');
    
    // Manejar cambios en el input de archivos de contexto
    const contextFilesInput = document.getElementById('context_files');
    if (contextFilesInput) {
        contextFilesInput.addEventListener('change', () => {
            if (contextFilesInput.files.length > 0) {
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
    const button = event.currentTarget;
    const listItem = button.closest('li');
    
    if (listItem) {
        const fileName = listItem.querySelector('div').textContent.trim();
        
        // Animación de desvanecimiento
        listItem.style.transition = 'opacity 0.3s';
        listItem.style.opacity = '0';
        
        setTimeout(() => {
            listItem.remove();
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
    console.log('💳 Procesando actualización de plan...');
    
    // Mostrar spinner de carga
    toastr.info('Procesando actualización de plan...', 'Procesando');
    
    // Simular procesamiento
    setTimeout(() => {
        toastr.success('¡Plan actualizado correctamente! Ahora tienes el Plan Enterprise.', 'Actualización Completada');
        
        // Actualizar UI
        updatePlanUI('enterprise');
    }, 2000);
}

/**
 * Actualizar UI después de cambio de plan
 * @param {string} planType - Tipo de plan ('professional', 'enterprise')
 */
function updatePlanUI(planType) {
    // Actualizar alerta de información de plan
    const planAlert = document.querySelector('#plan-content .alert-info');
    if (planAlert) {
        const planTitle = planAlert.querySelector('.alert-heading');
        const planText = planAlert.querySelector('p');
        
        if (planType === 'enterprise') {
            planTitle.textContent = 'Plan Enterprise';
            planText.textContent = 'Tu plan actual vence el 15/08/2025. La renovación automática está activada.';
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
        
        // Inicializar dropdowns de Bootstrap después de cargar el contenido
        setTimeout(() => {
            initializeDropdowns();
        }, 1000);
    } else {
        console.error('❌ Usuario no autenticado');
        window.location.href = 'login.html';
    }
});
