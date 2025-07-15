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
        
        // Cargar estado del bot
        loadBotStatus();
        
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
        <div class="tab-pane active" id="calls-content" role="tabpanel" aria-labelledby="calls-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <!-- Registro de Llamadas -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0"><i class="fas fa-list me-2"></i>Registro de Llamadas</h5>
                                    <button class="btn btn-primary btn-sm" id="refresh-calls-btn">
                                        <i class="fas fa-sync me-2"></i>Actualizar
                                    </button>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <!-- Filtros de Clasificación -->
                                <div class="px-3 py-2 bg-light border-bottom">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <div class="d-flex align-items-center">
                                                <span class="me-2">Filtrar por:</span>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-all" checked>
                                                    <label class="form-check-label" for="filter-calls-all">Todas</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-pedidos">
                                                    <label class="form-check-label" for="filter-calls-pedidos">Pedidos</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-consultas">
                                                    <label class="form-check-label" for="filter-calls-consultas">Consultas</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="call-filter" id="filter-calls-urgente">
                                                    <label class="form-check-label" for="filter-calls-urgente">Urgentes</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 text-md-end mt-2 mt-md-0">
                                            <small class="text-muted">Última actualización: 2024-02-20 12:15</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="px-3 py-2">Gestionado</th>
                                                <th class="px-3 py-2">Fecha</th>
                                                <th class="px-3 py-2">Número</th>
                                                <th class="px-3 py-2">Clasificación IA</th>
                                                <th class="px-3 py-2">Resumen</th>
                                                <th class="px-3 py-2">Duración</th>
                                                <th class="px-3 py-2">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="calls-table-body">
                                            <!-- Llamada 1: Pedido -->
                                            <tr class="call-row" data-type="pedidos" data-urgency="alta">
                                                <td class="px-3 py-2">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="call-managed-1">
                                                        <label class="form-check-label" for="call-managed-1"></label>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-success rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">11:45</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">+34 600 123 456</div>
                                                        <small class="text-muted">Cliente habitual</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-success mb-1">📦 PEDIDO</span>
                                                        <span class="badge bg-danger">🚨 URGENTE</span>
                                                        <small class="text-muted mt-1">Confianza: 95%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Cliente solicita 200m2 de piel roja</div>
                                                    <small class="text-muted">Necesita entrega para el 22 de julio. Cliente María García, pedido urgente para evento. Requiere confirmación de disponibilidad y precio final.</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">04:32</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex">
                                                        <button class="btn btn-sm btn-outline-secondary me-1 play-btn" title="Escuchar grabación">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalles" onclick="viewCallDetails(1)">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-success manage-btn" title="Marcar como gestionado">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 2: Consulta -->
                                            <tr class="call-row" data-type="consultas" data-urgency="baja">
                                                <td class="px-3 py-2">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="call-managed-2" checked>
                                                        <label class="form-check-label" for="call-managed-2"></label>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-secondary rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-19</div>
                                                            <small class="text-muted">16:20</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">+34 655 789 012</div>
                                                        <small class="text-muted">Cliente nuevo</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-info mb-1">❓ CONSULTA</span>
                                                        <span class="badge bg-secondary">NORMAL</span>
                                                        <small class="text-muted mt-1">Confianza: 87%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Consulta sobre disponibilidad de pieles</div>
                                                    <small class="text-muted">Pregunta por disponibilidad de piel negra y marrón para tapicería. Interesado en precios por metro cuadrado y tiempos de entrega estándar.</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">02:15</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex">
                                                        <button class="btn btn-sm btn-outline-secondary me-1 play-btn" title="Escuchar grabación">
                                                            <i class="fas fa-play"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalles" onclick="viewCallDetails(2)">
                                                            <i class="fas fa-eye"></i>
                                                        </button>
                                                        <button class="btn btn-sm btn-outline-danger" title="Desmarcar como gestionado" onclick="unmarkCallAsManaged(2)">
                                                            <i class="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 3: Pedido -->
                                            <tr class="call-row" data-type="pedidos" data-urgency="media">
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
                                                        <small class="text-muted">Cliente habitual</small>
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
        <div class="tab-pane" id="emails-content" role="tabpanel" aria-labelledby="emails-tab" tabindex="0">
            <div class="container-fluid pt-2 pb-0">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-bottom-0 py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-envelope me-2"></i>Gestión de Emails <span class="badge bg-primary ms-2" id="email-count">0</span></h5>
                            <div>
                                <button class="btn btn-success btn-sm me-2" id="classify-emails-btn">
                                    <i class="fas fa-robot me-2"></i>Clasificar con IA
                                </button>
                                <button class="btn btn-primary btn-sm" id="refresh-emails-btn">
                                    <i class="fas fa-sync me-2"></i>Actualizar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <!-- Filtros de emails -->
                        <div class="p-3 border-bottom">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="btn-group btn-group-sm" role="group">
                                        <input type="radio" class="btn-check" name="email-filter" id="filter-all" autocomplete="off" checked>
                                        <label class="btn btn-outline-primary" for="filter-all">Todos</label>
                                        
                                        <input type="radio" class="btn-check" name="email-filter" id="filter-unread" autocomplete="off">
                                        <label class="btn btn-outline-primary" for="filter-unread">No leídos</label>
                                        
                                        <input type="radio" class="btn-check" name="email-filter" id="filter-important" autocomplete="off">
                                        <label class="btn btn-outline-primary" for="filter-important">Importantes</label>
                                        
                                        <input type="radio" class="btn-check" name="email-filter" id="filter-spam" autocomplete="off">
                                        <label class="btn btn-outline-primary" for="filter-spam">Spam</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="input-group input-group-sm">
                                        <input type="text" class="form-control" placeholder="Buscar emails...">
                                        <button class="btn btn-outline-secondary" type="button">
                                            <i class="fas fa-search"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Lista de emails -->
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th style="width: 5%"><i class="fas fa-star"></i></th>
                                        <th style="width: 25%">Remitente</th>
                                        <th style="width: 45%">Asunto</th>
                                        <th style="width: 15%">Fecha</th>
                                        <th style="width: 10%">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Email 1 - No leído, importante -->
                                    <tr class="email-row fw-bold" data-type="unread important">
                                        <td><i class="fas fa-star text-warning"></i></td>
                                        <td>Juan Pérez <span class="badge bg-primary ms-1">Cliente</span></td>
                                        <td>
                                            <i class="fas fa-circle text-primary me-1" style="font-size: 8px;"></i>
                                            Consulta sobre productos premium
                                        </td>
                                        <td>Hoy, 10:25</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary" onclick="showAutoReplyModal(1, 'ai')" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" onclick="showAutoReplyModal(1, 'manual')" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info" onclick="viewEmailHistory(1)" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 2 - Leído -->
                                    <tr class="email-row" data-type="read">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>María Gómez</td>
                                        <td>Solicitud de información adicional</td>
                                        <td>Ayer, 15:40</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary" onclick="showAutoReplyModal(2, 'ai')" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" onclick="showAutoReplyModal(2, 'manual')" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info" onclick="viewEmailHistory(2)" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 3 - Spam -->
                                    <tr class="email-row" data-type="spam">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>marketing@ofertas.com <span class="badge bg-danger ms-1">Spam</span></td>
                                        <td>¡¡¡Oferta especial solo por hoy!!!</td>
                                        <td>15/05/2023</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary" onclick="showAutoReplyModal(3, 'ai')" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" onclick="showAutoReplyModal(3, 'manual')" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info" onclick="viewEmailHistory(3)" title="Ver historial">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Email 4 - No leído -->
                                    <tr class="email-row fw-bold" data-type="unread">
                                        <td><i class="far fa-star text-muted"></i></td>
                                        <td>Carlos Rodríguez <span class="badge bg-success ms-1">Nuevo</span></td>
                                        <td>
                                            <i class="fas fa-circle text-primary me-1" style="font-size: 8px;"></i>
                                            Solicitud de presupuesto
                                        </td>
                                        <td>14/05/2023</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-primary" onclick="showAutoReplyModal(4, 'ai')" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" onclick="showAutoReplyModal(4, 'manual')" title="Responder manual">
                                                    <i class="fas fa-reply"></i>
                                                </button>
                                                <button class="btn btn-outline-info" onclick="viewEmailHistory(4)" title="Ver historial">
                                                    <i class="fas fa-history"></i>
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
                                                <button class="btn btn-outline-primary" onclick="showAutoReplyModal(5, 'ai')" title="Responder con IA">
                                                    <i class="fas fa-robot"></i>
                                                </button>
                                                <button class="btn btn-outline-secondary" onclick="showAutoReplyModal(5, 'manual')" title="Responder manual">
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
                    <div class="card-body p-0">
                        <!-- Contenido de Configuración del Bot -->
                        <p class="p-3">Contenido de la pestaña Configuración del Bot en desarrollo...</p>
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
                        <p class="p-3">Contenido de la pestaña Mi Cuenta en desarrollo...</p>
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
                    <div class="card-body p-0">
                        <!-- Contenido de Facturación -->
                        <p class="p-3">Contenido de la pestaña Facturación en desarrollo...</p>
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
    
    // Esta función ya no es necesaria porque los datos están directamente en el HTML
    // Los datos de ejemplo están integrados en createTabsContent() para mejor rendimiento
    
    console.log('✅ Datos iniciales cargados desde HTML estático');
}

/**
 * Filtrar llamadas por tipo o urgencia
 */
function filterCalls(type) {
    console.log(`🔍 Filtrando llamadas por tipo: ${type}`);
    // Implementación de filtrado
}

/**
 * Reproducir grabación de llamada
 * @param {number} callId - ID de la llamada
 */
function playCallRecording(callId) {
    console.log(`▶️ Reproduciendo grabación de llamada ID: ${callId}`);
    // Implementación de reproducción
}

/**
 * Marcar llamada como gestionada
 * @param {number} callId - ID de la llamada
 */
function markCallAsManaged(callId) {
    console.log(`✅ Marcando llamada como gestionada ID: ${callId}`);
    // Implementación de marcar como gestionada
}

/**
 * Ver detalles de llamada
 * @param {number} callId - ID de la llamada
 */
function viewCallDetails(callId) {
    console.log(`👁️ Ver detalles de llamada ID: ${callId}`);
    // Implementación de ver detalles
}

/**
 * Configurar event listeners para el dashboard
 */
function setupEventListeners() {
    console.log('👂 Configurando event listeners para el dashboard...');
    
    // Event listeners para botones de actualizar
    document.addEventListener('click', function(e) {
        // Event listener para botones de filtro de llamadas
        if (e.target.matches('input[name="call-filter"]')) {
            const filterType = e.target.id.replace('filter-calls-', '');
            filterCalls(filterType);
        }
        
        // Event listener para botones de reproducir llamadas
        if (e.target.matches('.play-btn') || e.target.closest('.play-btn')) {
            const btn = e.target.matches('.play-btn') ? e.target : e.target.closest('.play-btn');
            const callId = btn.getAttribute('onclick')?.match(/\d+/)?.[0];
            if (callId) {
                playCallRecording(parseInt(callId));
            }
        }
        
        // Event listener para botones de marcar como gestionado
        if (e.target.matches('.manage-btn') || e.target.closest('.manage-btn')) {
            const btn = e.target.matches('.manage-btn') ? e.target : e.target.closest('.manage-btn');
            const callId = btn.getAttribute('onclick')?.match(/\d+/)?.[0];
            if (callId) {
                markCallAsManaged(parseInt(callId));
            }
        }
        
        // Event listener para botones de actualizar datos
        if (e.target.matches('.refresh-btn') || e.target.closest('.refresh-btn')) {
            refreshDashboardData();
        }
    });
    
    console.log('✅ Event listeners configurados');
}

/**
 * Actualizar datos del dashboard
 */
function refreshDashboardData() {
    console.log('🔄 Actualizando datos del dashboard...');
    // Implementación de actualización de datos
    
    // Mostrar notificación
    toastr.info('Actualizando datos...', 'Actualización');
    
    // Simular actualización
    setTimeout(() => {
        toastr.success('Datos actualizados correctamente', 'Éxito');
        updateCallsCount();
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
 * Filtrar emails por tipo
 * @param {string} type - Tipo de filtro
 */
function filterEmails(type) {
    console.log(`🔍 Filtrando emails por: ${type}`);
    toastr.info(`Mostrando emails de tipo: ${type}`, 'Filtro aplicado');
    
    // Implementación de filtrado
    const emailRows = document.querySelectorAll('.email-row');
    
    emailRows.forEach(row => {
        if (type === 'all') {
            row.classList.remove('d-none');
        } else {
            if (row.dataset.type === type) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        }
    });
    
    // Actualizar contador
    const emailCount = document.getElementById('email-count');
    if (emailCount) {
        const visibleRows = document.querySelectorAll('.email-row:not(.d-none)');
        emailCount.textContent = visibleRows.length;
    }
}

/**
 * Marcar email como leído
 * @param {number} emailId - ID del email
 */
function markAsRead(emailId) {
    console.log(`👁️ Marcando email ${emailId} como leído`);
    toastr.success(`Email ${emailId} marcado como leído`, 'Actualizado');
}

/**
 * Mostrar modal para respuesta automática
 * @param {number} emailId - ID del email
 * @param {string} mode - Modo de respuesta (ai o manual)
 */
function showAutoReplyModal(emailId, mode) {
    console.log(`💬 Mostrando modal de respuesta para email ${emailId} en modo ${mode}`);
    
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
                                <input type="text" class="form-control" value="RE: Consulta sobre productos">
                            </div>
                            <div class="form-group mb-3">
                                <label class="form-label">Contenido</label>
                                <textarea class="form-control" rows="8">Estimado cliente,

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
            const modalBody = document.querySelector('#replyModal .modal-body');
            modalBody.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Respuesta generada correctamente
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Asunto</label>
                    <input type="text" class="form-control" value="RE: Consulta sobre productos">
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Respuesta generada por IA</label>
                    <textarea class="form-control" rows="8">Estimado cliente,

Gracias por contactar con nosotros. En respuesta a su consulta sobre nuestros productos, me complace informarle que disponemos de una amplia gama de opciones que podrían ajustarse a sus necesidades.

Basado en su interés, le recomendaría revisar nuestro catálogo adjunto donde encontrará información detallada sobre especificaciones, precios y disponibilidad.

Si necesita información adicional o tiene alguna otra pregunta, no dude en contactarnos nuevamente.

Saludos cordiales,
Equipo de Atención al Cliente</textarea>
                </div>
            `;
            
            // Habilitar botón de enviar
            document.querySelector('#replyModal .btn-primary').disabled = false;
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
function previewEmailTemplate() {
    const signature = document.getElementById('email_signature')?.value || '';
    const companyName = document.getElementById('company_name')?.value || 'Tu Empresa';
    
    // Reemplazar variables en la firma
    const processedSignature = signature
        .replace(/{EMPRESA}/g, companyName)
        .replace(/\n/g, '\n');
    
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
                                <strong>De:</strong> soporte@${companyName.toLowerCase().replace(/\s+/g, '')}.com<br>
                                <strong>Para:</strong> cliente@ejemplo.com<br>
                                <strong>Asunto:</strong> Re: Consulta sobre productos
                            </div>
                            <div class="card-body">
                                <p>Estimado/a Juan Pérez,</p>
                                <p>Gracias por contactar con nosotros. Hemos recibido su consulta sobre nuestros productos y servicios.</p>
                                <p>[Aquí iría la respuesta generada por IA basada en el contexto del email]</p>
                                <hr>
                                <pre style="font-family: inherit; white-space: pre-wrap;">${processedSignature}</pre>
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
 * Agregar botón de preview a la firma
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
 * Procesar archivos de contexto
 * @param {Object} files - Archivos a procesar
 */
function processContextFiles(files) {
    console.log('📁 Procesando archivos de contexto...');
    
    Object.keys(files).forEach(fileType => {
        const file = files[fileType];
        if (file) {
            console.log(`📄 Procesando archivo ${fileType}:`, file.name);
            
            // Validar tamaño (máximo 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toastr.error(`El archivo ${file.name} es demasiado grande (máximo 10MB)`, 'Error de Archivo');
                return;
            }
            
            // Validar tipo de archivo
            const allowedTypes = ['.pdf', '.txt', '.csv', '.xlsx', '.docx'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(fileExtension)) {
                toastr.error(`Tipo de archivo no permitido: ${fileExtension}`, 'Error de Archivo');
                return;
            }
            
            // Simular procesamiento por IA
            setTimeout(() => {
                toastr.success(`Archivo ${file.name} procesado correctamente`, 'Archivo Procesado');
            }, Math.random() * 2000 + 1000);
        }
    });
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Dashboard Simple...');
    
    // Añadir estilos CSS
    addDashboardStyles();
    
    // Verificar si hay un usuario autenticado
    if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
        // Obtener datos de la empresa del usuario
        const companyData = JSON.parse(localStorage.getItem('companyData') || '{}');
        
        // Adaptar el dashboard según el contexto de la empresa
        adaptOtherContextSimple(companyData);
        
        console.log('✅ Dashboard inicializado correctamente');
    } else {
        console.error('❌ Usuario no autenticado');
        window.location.href = 'login.html';
    }
});
