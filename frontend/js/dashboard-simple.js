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
        console.error('❌ No se encontró el contenedor de pestañas');
        return;
    }
    
    // Nueva estructura de 4 pestañas simplificadas (eliminadas duplicaciones)
    tabsContainer.innerHTML = `
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="calls-tab" data-bs-toggle="tab" data-bs-target="#calls" type="button" role="tab">
                <i class="fas fa-phone me-2"></i>Registro de Llamadas
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="emails-tab" data-bs-toggle="tab" data-bs-target="#emails" type="button" role="tab">
                <i class="fas fa-envelope me-2"></i>Registro de Emails
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="call-bot-tab" data-bs-toggle="tab" data-bs-target="#call-bot" type="button" role="tab">
                <i class="fas fa-cogs me-2"></i>Configuración del Bot
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="billing-tab" data-bs-toggle="tab" data-bs-target="#billing" type="button" role="tab">
                <i class="fas fa-credit-card me-2"></i>Facturación
            </button>
        </li>
    `;
    
    // Mostrar el contenedor de pestañas
    document.getElementById('sector-nav-tabs-container').classList.remove('d-none');
    
    console.log('✅ Pestañas centralizadas del MVP creadas');
}

/**
 * Crear el contenido de las pestañas con nueva estructura simplificada
 */
function createTabsContent() {
    console.log('📄 Creando contenido de las pestañas...');
    
    const tabsContentContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContentContainer) {
        console.error('❌ No se encontró el contenedor de contenido');
        return;
    }
    
    // Nueva estructura de 5 pestañas con espaciado reducido
    tabsContentContainer.innerHTML = `
        <!-- 1. Registro de Llamadas -->
        <div class="tab-pane fade show active" id="calls-content" role="tabpanel">
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
                                        <div class="col-md-8">
                                            <div class="btn-group" role="group">
                                                <input type="radio" class="btn-check" name="call-filter" id="filter-calls-all" checked>
                                                <label class="btn btn-outline-secondary btn-sm" for="filter-calls-all">Todos</label>
                                                
                                                <input type="radio" class="btn-check" name="call-filter" id="filter-calls-pedidos">
                                                <label class="btn btn-outline-success btn-sm" for="filter-calls-pedidos">📦 Pedidos</label>
                                                
                                                <input type="radio" class="btn-check" name="call-filter" id="filter-calls-reclamaciones">
                                                <label class="btn btn-outline-danger btn-sm" for="filter-calls-reclamaciones">⚠️ Reclamaciones</label>
                                                
                                                <input type="radio" class="btn-check" name="call-filter" id="filter-calls-consultas">
                                                <label class="btn btn-outline-info btn-sm" for="filter-calls-consultas">❓ Consultas</label>
                                                
                                                <input type="radio" class="btn-check" name="call-filter" id="filter-calls-urgente">
                                                <label class="btn btn-outline-danger btn-sm" for="filter-calls-urgente">🚨 Urgente</label>
                                            </div>
                                        </div>
                                        <div class="col-md-4 text-end">
                                            <small class="text-muted">Total: <span id="calls-count">3</span> llamadas</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive">
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
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-primary btn-sm mb-1" onclick="playCallRecording(1)">
                                                            <i class="fas fa-play me-1"></i>Reproducir
                                                        </button>
                                                        <button class="btn btn-outline-info btn-sm" onclick="viewCallDetails(1)">
                                                            <i class="fas fa-eye me-1"></i>Ver Detalles
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 2: Reclamación -->
                                            <tr class="call-row" data-type="reclamaciones" data-urgency="alta">
                                                <td class="px-3 py-2">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="call-managed-2" checked>
                                                        <label class="form-check-label" for="call-managed-2"></label>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-danger rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">09:15</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">+34 600 987 654</div>
                                                        <small class="text-muted">Cliente nuevo</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-danger mb-1">⚠️ RECLAMACIÓN</span>
                                                        <span class="badge bg-danger">🚨 URGENTE</span>
                                                        <small class="text-muted mt-1">Confianza: 98%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Producto defectuoso recibido</div>
                                                    <small class="text-muted">Cliente Juan Pérez reclama por producto dañado en envío. Solicita devolución inmediata y reembolso. Pedido #1234 del 15/02. Requiere gestión urgente.</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">02:18</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-primary btn-sm mb-1" onclick="playCallRecording(2)">
                                                            <i class="fas fa-play me-1"></i>Reproducir
                                                        </button>
                                                        <button class="btn btn-outline-success btn-sm" disabled>
                                                            <i class="fas fa-check me-1"></i>Gestionado
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Llamada 3: Consulta -->
                                            <tr class="call-row" data-type="consultas" data-urgency="media">
                                                <td class="px-3 py-2">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="call-managed-3">
                                                        <label class="form-check-label" for="call-managed-3"></label>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-info rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-19</div>
                                                            <small class="text-muted">16:20</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">+34 600 555 789</div>
                                                        <small class="text-muted">Prospecto</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-info mb-1">❓ CONSULTA</span>
                                                        <span class="badge bg-warning">📅 NORMAL</span>
                                                        <small class="text-muted mt-1">Confianza: 87%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Información sobre catálogo y precios</div>
                                                    <small class="text-muted">Cliente Ana López consulta sobre disponibilidad de productos de cuero para proyecto comercial. Interesada en catálogo completo y descuentos por volumen.</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">01:45</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-primary btn-sm mb-1" onclick="playCallRecording(3)">
                                                            <i class="fas fa-play me-1"></i>Reproducir
                                                        </button>
                                                        <button class="btn btn-outline-info btn-sm" onclick="viewCallDetails(3)">
                                                            <i class="fas fa-eye me-1"></i>Ver Detalles
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
        
        <!-- Análisis de Emails -->
        <div class="tab-pane fade" id="emails-analysis" role="tabpanel">
            <div class="container-fluid pt-2 pb-0">
                <!-- Clasificación Inteligente de Emails -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="mb-0"><i class="fas fa-brain me-2 text-primary"></i>Clasificación Inteligente de Emails</h5>
                                        <small class="text-muted">IA detecta y clasifica automáticamente tus emails por tipo e importancia</small>
                                    </div>
                                    <div>
                                        <button class="btn btn-outline-primary btn-sm me-2" id="classify-emails-btn">
                                            <i class="fas fa-robot me-2"></i>Clasificar Nuevos
                                        </button>
                                        <button class="btn btn-primary btn-sm" id="refresh-emails-btn">
                                            <i class="fas fa-sync me-2"></i>Actualizar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <!-- Filtros de Clasificación -->
                                <div class="px-3 py-2 bg-light border-bottom">
                                    <div class="row align-items-center">
                                        <div class="col-md-8">
                                            <div class="btn-group" role="group">
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-all" checked>
                                                <label class="btn btn-outline-secondary btn-sm" for="filter-all">Todos</label>
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-pedidos">
                                                <label class="btn btn-outline-success btn-sm" for="filter-pedidos">📦 Pedidos</label>
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-reclamaciones">
                                                <label class="btn btn-outline-danger btn-sm" for="filter-reclamaciones">⚠️ Reclamaciones</label>
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-consultas">
                                                <label class="btn btn-outline-info btn-sm" for="filter-consultas">❓ Consultas</label>
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-urgente">
                                                <label class="btn btn-outline-danger btn-sm" for="filter-urgente">🚨 Urgente</label>
                                            </div>
                                        </div>
                                        <div class="col-md-4 text-end">
                                            <small class="text-muted">Total: <span id="email-count">4</span> emails</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="px-3 py-2">Fecha</th>
                                                <th class="px-3 py-2">Remitente</th>
                                                <th class="px-3 py-2">Asunto</th>
                                                <th class="px-3 py-2">Clasificación IA</th>
                                                <th class="px-3 py-2">Estado</th>
                                                <th class="px-3 py-2">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="emails-table-body">
                                            <!-- Email 1: Pedido -->
                                            <tr class="email-row" data-type="pedidos" data-urgency="alta">
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
                                                        <div class="fw-medium">cliente@empresa.com</div>
                                                        <small class="text-muted">Cliente Premium</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">
                                                        Nuevo pedido de 200m2 de piel roja para el 22 de julio
                                                        <i class="fas fa-paperclip ms-2 text-primary" title="2 archivos adjuntos"></i>
                                                    </div>
                                                    <small class="text-muted">Necesito confirmar disponibilidad y precio final...</small>
                                                    <div class="mt-1">
                                                        <small class="text-primary"><i class="fas fa-file-pdf me-1"></i>catalogo.pdf</small>
                                                        <small class="text-primary ms-2"><i class="fas fa-file-image me-1"></i>muestra.jpg</small>
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
                                                    <span class="badge bg-warning">📋 Nuevo</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-secondary btn-sm mb-1" onclick="markAsRead(1)">
                                                            <i class="fas fa-eye me-1"></i>Marcar Visto
                                                        </button>
                                                        <div class="btn-group btn-group-sm">
                                                            <button class="btn btn-success btn-sm" onclick="showAutoReplyModal(1, 'ai')">
                                                                <i class="fas fa-robot me-1"></i>IA
                                                            </button>
                                                            <button class="btn btn-primary btn-sm" onclick="showAutoReplyModal(1, 'manual')">
                                                                <i class="fas fa-edit me-1"></i>Manual
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Email 2: Reclamación -->
                                            <tr class="email-row" data-type="reclamaciones" data-urgency="alta">
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-danger rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">09:30</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">queja@cliente.com</div>
                                                        <small class="text-muted">Cliente Frecuente</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">Producto defectuoso - Solicito reembolso inmediato</div>
                                                    <small class="text-muted">El producto llegó dañado y no cumple especificaciones...</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-danger mb-1">⚠️ RECLAMACIÓN</span>
                                                        <span class="badge bg-danger">🚨 URGENTE</span>
                                                        <small class="text-muted mt-1">Confianza: 98%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-success">👁️ Visto</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-secondary btn-sm mb-1" disabled>
                                                            <i class="fas fa-eye me-1"></i>Visto
                                                        </button>
                                                        <div class="btn-group btn-group-sm">
                                                            <button class="btn btn-success btn-sm" onclick="showAutoReplyModal(2, 'ai')">
                                                                <i class="fas fa-robot me-1"></i>IA
                                                            </button>
                                                            <button class="btn btn-primary btn-sm" onclick="showAutoReplyModal(2, 'manual')">
                                                                <i class="fas fa-edit me-1"></i>Manual
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Email 3: Consulta -->
                                            <tr class="email-row" data-type="consultas" data-urgency="media">
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-info rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-19</div>
                                                            <small class="text-muted">16:20</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">info@nuevocliente.com</div>
                                                        <small class="text-muted">Cliente Nuevo</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">
                                                        Consulta sobre catálogo de productos y precios
                                                        <i class="fas fa-paperclip ms-2 text-primary" title="1 archivo adjunto"></i>
                                                    </div>
                                                    <small class="text-muted">Buenos días, me gustaría recibir información...</small>
                                                    <div class="mt-1">
                                                        <small class="text-primary"><i class="fas fa-file-word me-1"></i>requisitos.docx</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-info mb-1">❓ CONSULTA</span>
                                                        <span class="badge bg-secondary">📋 NORMAL</span>
                                                        <small class="text-muted mt-1">Confianza: 92%</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-primary">✅ Respondido</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-success btn-sm mb-1" disabled>
                                                            <i class="fas fa-check me-1"></i>Completado
                                                        </button>
                                                        <button class="btn btn-outline-secondary btn-sm" onclick="viewEmailHistory(3)">
                                                            <i class="fas fa-history me-1"></i>Ver Historial
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            <!-- Email 4: Reporte Automático -->
                                            <tr class="email-row" data-type="reportes" data-urgency="media">
                                                <td class="px-3 py-2">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-primary rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">14:15</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div>
                                                        <div class="fw-medium">bot@miempresa.com</div>
                                                        <small class="text-muted">Asistente IA</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="fw-medium">[REPORTE] Resumen de llamada - Cliente pregunta por pedido #1234</div>
                                                    <small class="text-muted">Cliente María García consultó estado de su pedido. Requiere seguimiento...</small>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-primary mb-1">📄 REPORTE</span>
                                                        <span class="badge bg-warning">📞 LLAMADA</span>
                                                        <small class="text-muted mt-1">Auto-generado</small>
                                                    </div>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <span class="badge bg-warning">📋 Nuevo</span>
                                                </td>
                                                <td class="px-3 py-2">
                                                    <div class="btn-group-vertical btn-group-sm">
                                                        <button class="btn btn-outline-secondary btn-sm mb-1" onclick="markAsRead(4)">
                                                            <i class="fas fa-eye me-1"></i>Marcar Visto
                                                        </button>
                                                        <button class="btn btn-outline-info btn-sm" onclick="viewCallReport(4)">
                                                            <i class="fas fa-phone me-1"></i>Ver Llamada
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
                
                <!-- Configuración de Emails -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <h5 class="mb-0"><i class="fas fa-cog me-2"></i>Configuración de Emails</h5>
                            </div>
                            <div class="card-body">
                                <!-- Explicación del Sistema IA -->
                                <div class="alert alert-info mb-3">
                                    <div class="d-flex align-items-start">
                                        <i class="fas fa-robot me-3 mt-1"></i>
                                        <div>
                                            <h6 class="alert-heading mb-2">🤖 Sistema Híbrido: Plantilla + IA Contextual</h6>
                                            <p class="mb-2">La plantilla que configures será la <strong>estructura base</strong> que el agente de IA personalizará para cada email:</p>
                                            <ul class="mb-0 small">
                                                <li><strong>Plantilla:</strong> Define el tono, estructura y elementos fijos</li>
                                                <li><strong>IA Contextual:</strong> Analiza cada email y genera respuestas específicas</li>
                                                <li><strong>Variables dinámicas:</strong> {NOMBRE_CLIENTE}, {EMPRESA}, {RESPUESTA_IA}, etc.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <form id="email-config-form">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Email de Respuesta</label>
                                            <input type="email" class="form-control" id="reply-email" placeholder="contacto@miempresa.com">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Tiempo de Respuesta (horas)</label>
                                            <input type="number" class="form-control" id="response-time" value="24" min="1" max="72">
                                        </div>
                                    </div>
                                    
                                    <!-- Configuración de IA -->
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Modo de Respuesta IA</label>
                                            <select class="form-select" id="ai-response-mode">
                                                <option value="contextual">🤖 Contextual (Recomendado)</option>
                                                <option value="template-only">📝 Solo Plantilla</option>
                                                <option value="hybrid">🔄 Híbrido</option>
                                            </select>
                                            <div class="form-text">Contextual: IA genera respuestas específicas por email</div>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Nivel de Personalización</label>
                                            <select class="form-select" id="personalization-level">
                                                <option value="high">🎯 Alto - Muy específico</option>
                                                <option value="medium">⚖️ Medio - Equilibrado</option>
                                                <option value="low">📋 Bajo - Más genérico</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Plantilla Base de Respuesta</label>
                                        <div class="form-text mb-2">
                                            💡 <strong>Tip:</strong> Usa variables como {NOMBRE_CLIENTE}, {EMPRESA}, {RESPUESTA_IA} para personalización automática
                                        </div>
                                        <textarea class="form-control" id="email-template" rows="6" placeholder="Estimado/a {NOMBRE_CLIENTE},&#10;&#10;Gracias por contactar con {EMPRESA}.&#10;&#10;{RESPUESTA_IA}&#10;&#10;Si necesita más información, no dude en contactarnos.&#10;&#10;{FIRMA}"></textarea>
                                    </div>
                                    
                                    <!-- Ejemplos de Variables -->
                                    <div class="mb-3">
                                        <label class="form-label">Variables Disponibles</label>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="bg-light p-2 rounded small">
                                                    <strong>Variables de Cliente:</strong><br>
                                                    <code>{NOMBRE_CLIENTE}</code> - Nombre del remitente<br>
                                                    <code>{EMAIL_CLIENTE}</code> - Email del cliente<br>
                                                    <code>{ASUNTO_ORIGINAL}</code> - Asunto del email
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="bg-light p-2 rounded small">
                                                    <strong>Variables de Empresa:</strong><br>
                                                    <code>{EMPRESA}</code> - Nombre de tu empresa<br>
                                                    <code>{RESPUESTA_IA}</code> - Respuesta generada por IA<br>
                                                    <code>{FIRMA}</code> - Tu firma personalizada
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Firma del Email</label>
                                        <textarea class="form-control" id="email-signature" rows="3" placeholder="Saludos cordiales,&#10;Equipo de {EMPRESA}&#10;Tel: +34 900 000 000&#10;Web: www.miempresa.com"></textarea>
                                    </div>
                                    
                                    <!-- Configuración Avanzada -->
                                    <div class="accordion mb-3" id="advancedConfig">
                                        <div class="accordion-item">
                                            <h2 class="accordion-header">
                                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#advancedSettings">
                                                    <i class="fas fa-cogs me-2"></i>Configuración Avanzada de IA
                                                </button>
                                            </h2>
                                            <div id="advancedSettings" class="accordion-collapse collapse" data-bs-parent="#advancedConfig">
                                                <div class="accordion-body">
                                                    <div class="row">
                                                        <div class="col-md-6 mb-3">
                                                            <label class="form-label">Tono de Respuesta</label>
                                                            <select class="form-select" id="response-tone">
                                                                <option value="professional">👔 Profesional</option>
                                                                <option value="friendly">😊 Amigable</option>
                                                                <option value="formal">🎩 Formal</option>
                                                                <option value="casual">😎 Casual</option>
                                                            </select>
                                                        </div>
                                                        <div class="col-md-6 mb-3">
                                                            <label class="form-label">Idioma de Respuesta</label>
                                                            <select class="form-select" id="response-language">
                                                                <option value="auto">🌍 Detectar automáticamente</option>
                                                                <option value="es">🇪🇸 Español</option>
                                                                <option value="en">🇺🇸 Inglés</option>
                                                                <option value="fr">🇫🇷 Francés</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="include-context" checked>
                                                        <label class="form-check-label" for="include-context">
                                                            Incluir contexto del email original en la respuesta
                                                        </label>
                                                    </div>
                                                    
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="auto-classify" checked>
                                                        <label class="form-check-label" for="auto-classify">
                                                            Clasificar automáticamente emails entrantes
                                                        </label>
                                                    </div>
                                                    
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="require-approval">
                                                        <label class="form-check-label" for="require-approval">
                                                            Requerir aprobación antes de enviar respuestas IA
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="text-end">
                                        <button type="button" class="btn btn-outline-primary me-2" onclick="testEmailTemplate()">
                                            <i class="fas fa-flask me-2"></i>Probar Plantilla
                                        </button>
                                        <button type="submit" class="btn btn-success">
                                            <i class="fas fa-save me-2"></i>Guardar Configuración
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Bot de Llamadas -->
        <div class="tab-pane fade" id="call-bot" role="tabpanel">
            <div class="container-fluid pt-2 pb-0">
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="mb-0"><i class="fas fa-cogs me-2 text-primary"></i>Configuración del Bot</h5>
                                        <small class="text-muted">Configura los datos de tu empresa y ambos bots de IA (llamadas y emails)</small>
                                    </div>
                                    <div class="d-flex align-items-center">
                                        <span class="me-3 fw-medium" id="bot-status-text">Bot Activo</span>
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="bot-master-switch" checked>
                                            <label class="form-check-label" for="bot-master-switch">
                                                <i class="fas fa-power-off"></i>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body py-4 px-4">
                                <form id="call-bot-config-form">
                                    <div class="row">
                                        <!-- Configuración Básica -->
                                        <div class="col-md-6">
                                            <h6 class="text-primary mb-3"><i class="fas fa-building me-2"></i>Datos de la Empresa</h6>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Nombre de la Empresa *</label>
                                                <input type="text" class="form-control" id="company-name" name="company_name" placeholder="Mi Empresa S.L." value="Cueros Premium" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Teléfono Principal *</label>
                                                <input type="tel" class="form-control" id="main-phone" name="main_phone" placeholder="+34 123 456 789" value="+34 600 123 456" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Email de Contacto *</label>
                                                <input type="email" class="form-control" id="contact-email" name="contact_email" placeholder="contacto@empresa.com" value="info@cuerospremium.com" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Sitio Web</label>
                                                <input type="url" class="form-control" id="website" name="website" placeholder="https://www.empresa.com" value="https://www.cuerospremium.com">
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Dirección</label>
                                                <textarea class="form-control" id="address" name="address" rows="2" placeholder="Calle Principal 123, Ciudad, Código Postal">Calle Artesanos 45, Madrid, 28001</textarea>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Sector/Industria *</label>
                                                <select class="form-select" id="industry" name="industry" required>
                                                    <option value="">Seleccionar...</option>
                                                    <option value="retail" selected>Comercio</option>
                                                    <option value="services">Servicios</option>
                                                    <option value="healthcare">Salud</option>
                                                    <option value="education">Educación</option>
                                                    <option value="hospitality">Hostelería</option>
                                                    <option value="manufacturing">Manufactura</option>
                                                    <option value="technology">Tecnología</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Número de Teléfono Twilio</label>
                                                <div class="input-group">
                                                    <input type="text" class="form-control" id="twilio-number" name="twilio_phone_number" placeholder="+34 XXX XXX XXX" value="+34 600 123 456" readonly>
                                                    <button class="btn btn-outline-primary" type="button" id="configure-twilio-btn">
                                                        <i class="fas fa-cog me-1"></i>Configurar
                                                    </button>
                                                </div>
                                                <small class="text-muted">Número asignado por Twilio para recibir llamadas</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Idioma Principal *</label>
                                                <select class="form-select" id="primary-language" name="primary_language" required>
                                                    <option value="es" selected>Español</option>
                                                    <option value="en">Inglés</option>
                                                    <option value="fr">Francés</option>
                                                    <option value="de">Alemán</option>
                                                    <option value="it">Italiano</option>
                                                    <option value="pt">Portugués</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Personalidad del Bot</label>
                                                <select class="form-select" id="bot-personality" name="bot_personality">
                                                    <option value="professional">Profesional y Formal</option>
                                                    <option value="friendly" selected>Amigable y Cercano</option>
                                                    <option value="enthusiastic">Entusiasta y Energético</option>
                                                    <option value="calm">Calmado y Relajado</option>
                                                    <option value="helpful">Servicial y Atento</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Mensaje de Bienvenida *</label>
                                                <textarea class="form-control" id="welcome-message" name="welcome_message" rows="3" placeholder="Hola, gracias por llamar a [EMPRESA]. ¿En qué puedo ayudarte?" required>Hola, gracias por llamar a Cueros Premium. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?</textarea>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Horario de Atención</label>
                                                <select class="form-select" id="business-hours" name="business_hours">
                                                    <option value="9-18" selected>9:00 - 18:00</option>
                                                    <option value="8-20">8:00 - 20:00</option>
                                                    <option value="10-22">10:00 - 22:00</option>
                                                    <option value="24h">24 Horas</option>
                                                    <option value="custom">Personalizado</option>
                                                </select>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Días Laborables</label>
                                                <div class="form-check-group">
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day0" name="working_days[]" value="0" checked>
                                                        <label class="form-check-label" for="day0">L</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day1" name="working_days[]" value="1" checked>
                                                        <label class="form-check-label" for="day1">M</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day2" name="working_days[]" value="2" checked>
                                                        <label class="form-check-label" for="day2">X</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day3" name="working_days[]" value="3" checked>
                                                        <label class="form-check-label" for="day3">J</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day4" name="working_days[]" value="4" checked>
                                                        <label class="form-check-label" for="day4">V</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day5" name="working_days[]" value="5">
                                                        <label class="form-check-label" for="day5">S</label>
                                                    </div>
                                                    <div class="form-check form-check-inline">
                                                        <input class="form-check-input" type="checkbox" id="day6" name="working_days[]" value="6">
                                                        <label class="form-check-label" for="day6">D</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Configuración de Llamadas -->
                                        <div class="col-md-6">
                                            <h6 class="text-primary mb-3"><i class="fas fa-phone me-2"></i>Configuración de Llamadas</h6>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Preguntas Frecuentes para Llamadas</label>
                                                <small class="text-muted d-block mb-2">Respuestas que dará el bot durante las llamadas</small>
                                                <div id="faq-container">
                                                    <div class="input-group mb-2">
                                                        <input type="text" class="form-control" placeholder="Pregunta" id="faq-question-0" name="faq_questions[]" value="¿Cuáles son sus horarios?">
                                                        <input type="text" class="form-control" placeholder="Respuesta" id="faq-answer-0" name="faq_answers[]" value="Atendemos de lunes a viernes de 9:00 a 18:00">
                                                        <button class="btn btn-outline-danger" type="button" onclick="removeFAQ(0)">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <button class="btn btn-outline-primary btn-sm" type="button" onclick="addFAQ()">
                                                    <i class="fas fa-plus me-1"></i>Agregar FAQ
                                                </button>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="calendar-integration" checked>
                                                    <label class="form-check-label" for="calendar-integration">
                                                        <i class="fas fa-calendar me-2"></i>Integración con Calendario
                                                    </label>
                                                </div>
                                                <small class="text-muted">Permite al bot programar citas y reuniones</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Email para Reportes Automáticos</label>
                                                <input type="email" class="form-control" id="reports-email" placeholder="manager@empresa.com" value="admin@cuerospremium.com">
                                                <small class="text-muted">Recibirás un resumen de cada llamada importante</small>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <hr class="my-4">
                                    
                                    <!-- Archivos de Contexto Común -->
                                    <div class="row">
                                        <div class="col-12">
                                            <h6 class="text-info mb-3"><i class="fas fa-folder me-2"></i>Archivos de Contexto (Común para Llamadas y Emails)</h6>
                                            <small class="text-muted d-block mb-3">Sube archivos para que ambos bots tengan más información sobre tu negocio</small>
                                            <div class="border rounded p-3 bg-light">
                                                <div class="row">
                                                    <div class="col-md-4 mb-3">
                                                        <label for="inventory-file" class="form-label small"><i class="fas fa-boxes me-1"></i>Inventario/Stock</label>
                                                        <input type="file" class="form-control form-control-sm" id="inventory-file" name="inventory_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="inventory-status"></div>
                                                    </div>
                                                    <div class="col-md-4 mb-3">
                                                        <label for="catalog-file" class="form-label small"><i class="fas fa-book me-1"></i>Catálogo de Productos</label>
                                                        <input type="file" class="form-control form-control-sm" id="catalog-file" name="catalog_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="catalog-status"></div>
                                                    </div>
                                                    <div class="col-md-4 mb-3">
                                                        <label for="pricing-file" class="form-label small"><i class="fas fa-tags me-1"></i>Lista de Precios</label>
                                                        <input type="file" class="form-control form-control-sm" id="pricing-file" name="pricing_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="pricing-status"></div>
                                                    </div>
                                                </div>
                                                <div class="row">
                                                    <div class="col-md-4 mb-3">
                                                        <label for="menu-file" class="form-label small"><i class="fas fa-utensils me-1"></i>Cartas/Menús</label>
                                                        <input type="file" class="form-control form-control-sm" id="menu-file" name="menu_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="menu-status"></div>
                                                    </div>
                                                    <div class="col-md-4 mb-3">
                                                        <label for="samples-file" class="form-label small"><i class="fas fa-palette me-1"></i>Muestrarios</label>
                                                        <input type="file" class="form-control form-control-sm" id="samples-file" name="samples_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="samples-status"></div>
                                                    </div>
                                                    <div class="col-md-4 mb-0">
                                                        <label for="info-file" class="form-label small"><i class="fas fa-info-circle me-1"></i>Información General</label>
                                                        <input type="file" class="form-control form-control-sm" id="info-file" name="info_file" accept=".pdf,.txt,.csv,.xlsx,.docx">
                                                        <div class="file-status" id="info-status"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <small class="text-muted">Ambos bots usarán estos archivos para responder consultas específicas</small>
                                        </div>
                                    </div>
                                    
                                    <style>
                                    .file-status {
                                        margin-top: 5px;
                                        min-height: 20px;
                                    }
                                    .file-status small {
                                        font-size: 0.75rem;
                                        line-height: 1.2;
                                    }
                                    .form-control.is-invalid {
                                        border-color: #dc3545;
                                        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
                                    }
                                    .form-select.is-invalid {
                                        border-color: #dc3545;
                                        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
                                    }
                                    .form-control:focus {
                                        border-color: #0d6efd;
                                        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                                    }
                                    .form-select:focus {
                                        border-color: #0d6efd;
                                        box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
                                    }
                                    </style>
                                    
                                    <hr class="my-4">
                                    
                                    <!-- Configuración de Emails -->
                                    <div class="row mt-4">
                                        <div class="col-12">
                                            <h6 class="text-success mb-3"><i class="fas fa-envelope me-2"></i>Configuración de Emails</h6>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <!-- Configuración de Clasificación -->
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Email de Entrada</label>
                                                <input type="email" class="form-control" id="incoming-email" name="incoming_email" placeholder="info@empresa.com" value="info@cuerospremium.com">
                                                <small class="text-muted">Email donde llegan las consultas de clientes</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Frecuencia de Revisión</label>
                                                <select class="form-select" id="check-frequency" name="check_frequency">
                                                    <option value="5">Cada 5 minutos</option>
                                                    <option value="15" selected>Cada 15 minutos</option>
                                                    <option value="30">Cada 30 minutos</option>
                                                    <option value="60">Cada hora</option>
                                                </select>
                                                <small class="text-muted">Con qué frecuencia revisar nuevos emails</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Nivel de Confianza Mínimo</label>
                                                <div class="d-flex align-items-center">
                                                    <input type="range" class="form-range me-3" id="confidence-level" name="confidence_level" min="50" max="95" value="80">
                                                    <span class="badge bg-primary" id="confidence-display">80%</span>
                                                </div>
                                                <small class="text-muted">Mínimo nivel de confianza para clasificación automática</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" id="auto-priority" name="auto_priority" checked>
                                                    <label class="form-check-label" for="auto-priority">
                                                        <i class="fas fa-exclamation-triangle me-2"></i>Detección Automática de Urgencia
                                                    </label>
                                                </div>
                                                <small class="text-muted">Detectar automáticamente emails urgentes</small>
                                            </div>
                                        </div>
                                        
                                        <!-- Configuración de Notificaciones -->
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Email para Notificaciones</label>
                                                <input type="email" class="form-control" id="notification-email" name="notification_email" placeholder="manager@empresa.com" value="admin@cuerospremium.com">
                                                <small class="text-muted">Recibir notificaciones de emails importantes</small>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label class="form-label">Tipos de Notificación</label>
                                                <div class="border rounded p-3 bg-light">
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="notify-urgent" name="notify_urgent" checked>
                                                        <label class="form-check-label" for="notify-urgent">
                                                            🚨 Emails Urgentes
                                                        </label>
                                                    </div>
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="notify-complaints" name="notify_complaints" checked>
                                                        <label class="form-check-label" for="notify-complaints">
                                                            ⚠️ Reclamaciones
                                                        </label>
                                                    </div>
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="notify-orders" name="notify_orders" checked>
                                                        <label class="form-check-label" for="notify-orders">
                                                            📦 Pedidos Importantes
                                                        </label>
                                                    </div>
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="notify-summary" name="notify_summary">
                                                        <label class="form-check-label" for="notify-summary">
                                                            📈 Resumen Diario
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Botones de Acción -->
                                    <div class="d-flex gap-2 mt-4">
                                        <button type="button" class="btn btn-outline-primary" id="test-call-bot-btn">
                                            <i class="fas fa-phone me-2"></i>Probar Bot
                                        </button>
                                        <button type="submit" class="btn btn-primary">
                                            <i class="fas fa-save me-2"></i>Guardar Configuración
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Facturación -->
        <div class="tab-pane fade" id="billing" role="tabpanel">
            <div class="container-fluid pt-2 pb-0">
                <div class="row">
                    <div class="col-md-8">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <h5 class="mb-0"><i class="fas fa-file-invoice me-2"></i>Historial de Facturación</h5>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="px-3 py-2">Fecha</th>
                                                <th class="px-3 py-2">Concepto</th>
                                                <th class="px-3 py-2">Importe</th>
                                                <th class="px-3 py-2">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="px-3 py-2" colspan="4">
                                                    <div class="text-center text-muted py-4">
                                                        <i class="fas fa-receipt fa-2x mb-3"></i>
                                                        <p>No hay facturas disponibles</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <h5 class="mb-0"><i class="fas fa-crown me-2"></i>Plan Actual</h5>
                            </div>
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <span class="badge bg-success fs-6 px-3 py-2">Plan Profesional</span>
                                </div>
                                <h4 class="text-primary mb-3">€29.99/mes</h4>
                                <ul class="list-unstyled text-start mb-3">
                                    <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Llamadas ilimitadas</li>
                                    <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Emails ilimitados</li>
                                    <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Soporte 24/7</li>
                                    <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Integraciones</li>
                                </ul>
                                <button class="btn btn-outline-primary w-100" id="upgrade-plan-btn">
                                    <i class="fas fa-arrow-up me-2"></i>Actualizar Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Contenido de las pestañas creado');
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
function filterCalls(filterType) {
    console.log(`🔍 Filtrando llamadas por tipo: ${filterType}`);
    
    const callRows = document.querySelectorAll('.call-row');
    let visibleCount = 0;
    
    callRows.forEach(row => {
        const callType = row.getAttribute('data-type');
        const callUrgency = row.getAttribute('data-urgency');
        
        let shouldShow = false;
        
        switch(filterType) {
            case 'all':
                shouldShow = true;
                break;
            case 'urgente':
                shouldShow = callUrgency === 'alta';
                break;
            default:
                shouldShow = callType === filterType;
                break;
        }
        
        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const callsCount = document.getElementById('calls-count');
    if (callsCount) {
        callsCount.textContent = visibleCount.toString();
    }
    
    // Mostrar notificación
    const filterLabels = {
        'all': 'Todas las llamadas',
        'pedidos': 'Pedidos',
        'reclamaciones': 'Reclamaciones', 
        'consultas': 'Consultas',
        'urgente': 'Llamadas urgentes'
    };
    
    toastr.info(`Mostrando: ${filterLabels[filterType]} (${visibleCount})`, 'Filtro Aplicado');
}

/**
 * Reproducir grabación de llamada
 */
function playCallRecording(callId) {
    console.log(`🎵 Reproduciendo grabación de llamada ${callId}`);
    toastr.info(`Reproduciendo grabación de llamada #${callId}`, 'Audio');
    // Aquí se integraría con el sistema de grabaciones de Twilio
}

/**
 * Ver detalles completos de una llamada
 */
function viewCallDetails(callId) {
    console.log(`👁️ Viendo detalles de llamada ${callId}`);
    
    // Datos de ejemplo para la llamada
    const callDetails = {
        1: {
            id: 1,
            phone: '+34 600 123 456',
            date: '2024-02-20 11:45',
            duration: '04:32',
            classification: 'PEDIDO',
            urgency: 'URGENTE',
            confidence: '95%',
            summary: 'Cliente solicita 200m2 de piel roja',
            fullTranscript: 'Hola, buenos días. Necesito hacer un pedido urgente de 200 metros cuadrados de piel roja para un evento que tengo el 22 de julio. Soy María García, cliente habitual. ¿Tienen disponibilidad y cuál sería el precio final con entrega incluida?',
            customerInfo: 'María García - Cliente habitual',
            actionRequired: 'Confirmar disponibilidad y enviar cotización'
        }
    };
    
    const call = callDetails[callId];
    if (!call) {
        toastr.error('No se encontraron detalles para esta llamada', 'Error');
        return;
    }
    
    // Crear modal con detalles
    const modalHtml = `
        <div class="modal fade" id="callDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-phone me-2"></i>Detalles de Llamada #${call.id}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-primary mb-3">Información Básica</h6>
                                <p><strong>Teléfono:</strong> ${call.phone}</p>
                                <p><strong>Fecha y Hora:</strong> ${call.date}</p>
                                <p><strong>Duración:</strong> ${call.duration}</p>
                                <p><strong>Cliente:</strong> ${call.customerInfo}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-success mb-3">Clasificación IA</h6>
                                <p><strong>Tipo:</strong> <span class="badge bg-success">${call.classification}</span></p>
                                <p><strong>Urgencia:</strong> <span class="badge bg-danger">${call.urgency}</span></p>
                                <p><strong>Confianza:</strong> ${call.confidence}</p>
                            </div>
                        </div>
                        <hr>
                        <h6 class="text-info mb-3">Resumen Ejecutivo</h6>
                        <p class="fw-medium">${call.summary}</p>
                        <hr>
                        <h6 class="text-warning mb-3">Transcripción Completa</h6>
                        <div class="bg-light p-3 rounded">
                            <p class="mb-0">${call.fullTranscript}</p>
                        </div>
                        <hr>
                        <h6 class="text-danger mb-3">Acción Requerida</h6>
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>${call.actionRequired}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-primary" onclick="playCallRecording(${call.id})">
                            <i class="fas fa-play me-2"></i>Reproducir Audio
                        </button>
                        <button type="button" class="btn btn-success" onclick="markCallAsManaged(${call.id})">
                            <i class="fas fa-check me-2"></i>Marcar como Gestionado
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById('callDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('callDetailsModal'));
    modal.show();
    
    // Limpiar modal al cerrar
    document.getElementById('callDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Marcar llamada como gestionada
 */
function markCallAsManaged(callId) {
    console.log(`✅ Marcando llamada ${callId} como gestionada`);
    
    const checkbox = document.getElementById(`call-managed-${callId}`);
    if (checkbox) {
        checkbox.checked = true;
        
        // Cambiar estado visual de la fila
        const row = checkbox.closest('.call-row');
        if (row) {
            row.classList.add('table-secondary');
            row.style.opacity = '0.7';
        }
        
        // Deshabilitar botones de acción
        const actionButtons = row.querySelectorAll('button');
        actionButtons.forEach(btn => {
            if (!btn.textContent.includes('Reproducir')) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check me-1"></i>Gestionado';
                btn.className = 'btn btn-outline-success btn-sm';
            }
        });
    }
    
    toastr.success(`Llamada #${callId} marcada como gestionada`, '¡Éxito!');
    
    // Cerrar modal si está abierto
    const modal = bootstrap.Modal.getInstance(document.getElementById('callDetailsModal'));
    if (modal) {
        modal.hide();
    }
}

/**
 * Desmarcar llamada como gestionada
 */
function unmarkCallAsManaged(callId) {
    console.log(`❌ Desmarcando llamada ${callId} como gestionada`);
    
    const checkbox = document.getElementById(`call-managed-${callId}`);
    if (checkbox) {
        checkbox.checked = false;
        
        // Restaurar estado visual de la fila
        const row = checkbox.closest('.call-row');
        if (row) {
            row.classList.remove('table-secondary');
            row.style.opacity = '1';
        }
        
        // Rehabilitar botones de acción
        const actionButtons = row.querySelectorAll('button');
        actionButtons.forEach(btn => {
            if (btn.textContent.includes('Gestionado')) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check me-1"></i>Marcar como Gestionado';
                btn.className = 'btn btn-outline-primary btn-sm';
            }
        });
    }
    
    toastr.info(`Llamada #${callId} desmarcada como gestionada`, 'Información');
}

/**
 * Cargar datos del formulario de introducción desde localStorage
 */
function loadCompanySetupData() {
    console.log('📋 Cargando datos del formulario de introducción...');
    
    try {
        // Intentar cargar datos desde localStorage
        const companyConfigData = localStorage.getItem('companyConfig');
        
        if (companyConfigData) {
            const configData = JSON.parse(companyConfigData);
            console.log('✅ Datos del formulario de introducción encontrados:', configData);
            return configData;
        } else {
            console.log('ℹ️ No se encontraron datos del formulario de introducción en localStorage');
            return null;
        }
    } catch (error) {
        console.error('❌ Error al cargar datos del formulario de introducción:', error);
        return null;
    }
}

/**
 * Cargar datos existentes en los formularios
 */
function loadExistingData() {
    console.log('📄 Cargando datos existentes...');
    
    // Cargar datos reales del formulario de introducción
    const setupData = loadCompanySetupData();
    
    // Datos por defecto si no hay datos del formulario de introducción
    const defaultData = {
        companyName: 'Cueros Premium',
        contactName: 'Juan Pérez',
        email: 'admin@cuerospremium.com',
        phone: '+34 600 123 456',
        website: 'https://www.cuerospremium.com',
        sector: 'retail',
        address: 'Calle Artesanos 25, 28001 Madrid, España',
        timezone: 'Europe/Madrid',
        language: 'es'
    };
    
    // Usar datos del formulario de introducción si están disponibles, sino usar datos por defecto
    const profileData = setupData ? {
        companyName: setupData['company-name'] || defaultData.companyName,
        contactName: setupData['contact-name'] || defaultData.contactName,
        email: setupData['contact-email'] || defaultData.email,
        phone: setupData['contact-phone'] || defaultData.phone,
        website: setupData['company-website'] || defaultData.website,
        sector: setupData['company-sector'] || defaultData.sector,
        address: setupData['company-address'] || defaultData.address,
        timezone: setupData['company-timezone'] || defaultData.timezone,
        language: setupData['company-language'] || defaultData.language
    } : defaultData;
    
    // Cargar datos en el formulario de perfil
    if (document.getElementById('account-company-name')) {
        document.getElementById('account-company-name').value = profileData.companyName || '';
        document.getElementById('account-contact-name').value = profileData.contactName || '';
        document.getElementById('account-email').value = profileData.email || '';
        document.getElementById('account-phone').value = profileData.phone || '';
        document.getElementById('account-website').value = profileData.website || '';
        document.getElementById('account-sector').value = profileData.sector || '';
        document.getElementById('account-address').value = profileData.address || '';
        document.getElementById('account-timezone').value = profileData.timezone || 'Europe/Madrid';
        document.getElementById('account-language').value = profileData.language || 'es';
    }
    
    // Configuración del bot usando datos del formulario de introducción
    const defaultBotConfig = {
        companyName: 'Cueros Premium',
        personality: 'friendly',
        welcomeMessage: 'Hola, gracias por llamar a Cueros Premium. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        openingTime: '09:00',
        closingTime: '18:00',
        workingDays: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
        }
    };
    
    // Usar datos del formulario de introducción si están disponibles
    const botConfig = setupData ? {
        companyName: setupData['company-name'] || defaultBotConfig.companyName,
        personality: setupData['bot-personality'] || defaultBotConfig.personality,
        welcomeMessage: setupData['welcome-message'] || `Hola, gracias por llamar a ${setupData['company-name'] || 'nuestra empresa'}. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?`,
        openingTime: setupData['opening-time'] || defaultBotConfig.openingTime,
        closingTime: setupData['closing-time'] || defaultBotConfig.closingTime,
        workingDays: {
            monday: setupData['monday'] !== undefined ? setupData['monday'] : defaultBotConfig.workingDays.monday,
            tuesday: setupData['tuesday'] !== undefined ? setupData['tuesday'] : defaultBotConfig.workingDays.tuesday,
            wednesday: setupData['wednesday'] !== undefined ? setupData['wednesday'] : defaultBotConfig.workingDays.wednesday,
            thursday: setupData['thursday'] !== undefined ? setupData['thursday'] : defaultBotConfig.workingDays.thursday,
            friday: setupData['friday'] !== undefined ? setupData['friday'] : defaultBotConfig.workingDays.friday,
            saturday: setupData['saturday'] !== undefined ? setupData['saturday'] : defaultBotConfig.workingDays.saturday,
            sunday: setupData['sunday'] !== undefined ? setupData['sunday'] : defaultBotConfig.workingDays.sunday
        }
    } : defaultBotConfig;
    
    // Cargar datos en el formulario unificado de configuración del bot
    loadUnifiedConfigForm(setupData, profileData, botConfig);
    
    console.log('✅ Datos existentes cargados');
}

/**
 * Cargar datos en el formulario unificado de configuración
 * @param {Object} setupData - Datos del formulario de introducción
 * @param {Object} profileData - Datos del perfil
 * @param {Object} botConfig - Configuración del bot
 */
function loadUnifiedConfigForm(setupData, profileData, botConfig) {
    console.log('📋 Cargando datos en formulario unificado de configuración...');
    
    // === DATOS DE LA EMPRESA ===
    if (document.getElementById('company-name')) {
        document.getElementById('company-name').value = profileData.companyName || '';
    }
    if (document.getElementById('main-phone')) {
        document.getElementById('main-phone').value = profileData.phone || '';
    }
    if (document.getElementById('contact-email')) {
        document.getElementById('contact-email').value = profileData.email || '';
    }
    if (document.getElementById('website')) {
        document.getElementById('website').value = profileData.website || '';
    }
    if (document.getElementById('address')) {
        document.getElementById('address').value = profileData.address || '';
    }
    if (document.getElementById('industry')) {
        document.getElementById('industry').value = profileData.sector || '';
    }
    
    // === CONFIGURACIÓN DE LLAMADAS ===
    if (document.getElementById('bot-personality')) {
        document.getElementById('bot-personality').value = botConfig.personality || 'friendly';
    }
    if (document.getElementById('welcome-message')) {
        document.getElementById('welcome-message').value = botConfig.welcomeMessage || '';
    }
    if (document.getElementById('opening-time')) {
        document.getElementById('opening-time').value = botConfig.openingTime || '09:00';
    }
    if (document.getElementById('closing-time')) {
        document.getElementById('closing-time').value = botConfig.closingTime || '18:00';
    }
    
    // Cargar días laborables
    Object.keys(botConfig.workingDays).forEach(day => {
        const checkbox = document.getElementById(day);
        if (checkbox) {
            checkbox.checked = botConfig.workingDays[day];
        }
    });
    
    // Cargar configuración adicional si está disponible en setupData
    if (setupData) {
        // Nivel de confianza
        if (document.getElementById('confidence-level') && setupData['confidence-level']) {
            document.getElementById('confidence-level').value = setupData['confidence-level'];
        }
        
        // Transferir llamadas
        if (document.getElementById('transfer-calls') && setupData['transfer-calls'] !== undefined) {
            document.getElementById('transfer-calls').checked = setupData['transfer-calls'];
        }
        
        // === CONFIGURACIÓN DE EMAILS ===
        // Email entrante
        if (document.getElementById('incoming-email') && setupData['incoming-email']) {
            document.getElementById('incoming-email').value = setupData['incoming-email'];
        }
        
        // Servidor SMTP
        if (document.getElementById('smtp-server') && setupData['smtp-server']) {
            document.getElementById('smtp-server').value = setupData['smtp-server'];
        }
        
        // Puerto SMTP
        if (document.getElementById('smtp-port') && setupData['smtp-port']) {
            document.getElementById('smtp-port').value = setupData['smtp-port'];
        }
        
        // Usuario SMTP
        if (document.getElementById('smtp-user') && setupData['smtp-user']) {
            document.getElementById('smtp-user').value = setupData['smtp-user'];
        }
        
        // Contraseña SMTP
        if (document.getElementById('smtp-password') && setupData['smtp-password']) {
            document.getElementById('smtp-password').value = setupData['smtp-password'];
        }
        
        // Usar TLS
        if (document.getElementById('use-tls') && setupData['use-tls'] !== undefined) {
            document.getElementById('use-tls').checked = setupData['use-tls'];
        }
        
        // Tiempo de respuesta
        if (document.getElementById('response-time') && setupData['response-time']) {
            document.getElementById('response-time').value = setupData['response-time'];
        }
        
        // Firma de email
        if (document.getElementById('email-signature') && setupData['email-signature']) {
            document.getElementById('email-signature').value = setupData['email-signature'];
        }
        
        // Respuesta automática
        if (document.getElementById('auto-reply') && setupData['auto-reply'] !== undefined) {
            document.getElementById('auto-reply').checked = setupData['auto-reply'];
        }
    }
    
    console.log('✅ Datos cargados en formulario unificado');
}

/**
 * Activar o desactivar el bot principal
 * @param {boolean} isActive - Estado del bot (true = activo, false = inactivo)
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
 * Configurar event listeners para el dashboard
 */
function setupEventListeners() {
    console.log('👂 Configurando event listeners para el dashboard...');
    
    // Event listeners para botones de actualizar
    document.addEventListener('click', function(e) {
        if (e.target.id === 'refresh-calls-btn' || e.target.closest('#refresh-calls-btn')) {
            console.log('📞 Actualizando registro de llamadas...');
            toastr.info('Actualizando registro de llamadas...', 'Información');
        }
        
        if (e.target.id === 'refresh-emails-btn' || e.target.closest('#refresh-emails-btn')) {
            console.log('📧 Actualizando registro de emails...');
            toastr.info('Actualizando registro de emails...', 'Información');
        }
        
        if (e.target.id === 'classify-emails-btn' || e.target.closest('#classify-emails-btn')) {
            console.log('🤖 Clasificando emails con IA...');
            classifyNewEmails();
        }
        
        if (e.target.id === 'upgrade-plan-btn' || e.target.closest('#upgrade-plan-btn')) {
            console.log('⬆️ Actualizando plan...');
            toastr.info('Redirigiendo a actualización de plan...', 'Información');
        }
    });
    
    // Event listener para botón de activar/desactivar bot
    document.addEventListener('change', function(e) {
        if (e.target.id === 'bot-master-switch') {
            toggleBotStatus(e.target.checked);
        }
    });
    
    // Event listeners para filtros de email
    document.addEventListener('change', function(e) {
        if (e.target.name === 'email-filter') {
            filterEmails(e.target.id.replace('filter-', ''));
        }
        
        // Event listeners para filtros de llamadas
        if (e.target.name === 'call-filter') {
            filterCalls(e.target.id.replace('filter-calls-', ''));
        }
        
        // Event listeners para checkboxes de llamadas gestionadas
        if (e.target.id && e.target.id.startsWith('call-managed-')) {
            const callId = e.target.id.replace('call-managed-', '');
            if (e.target.checked) {
                markCallAsManaged(callId);
            } else {
                unmarkCallAsManaged(callId);
            }
        }
        
        // Event listener para slider de nivel de confianza
        if (e.target.id === 'confidence-level') {
            const confidenceValue = e.target.value;
            const displayElement = document.getElementById('confidence-display');
            if (displayElement) {
                displayElement.textContent = confidenceValue + '%';
                console.log(`🎯 Nivel de confianza actualizado a: ${confidenceValue}%`);
            }
        }
    });
    
    // Event listener para actualización en tiempo real del slider de confianza
    document.addEventListener('input', function(e) {
        if (e.target.id === 'confidence-level') {
            const confidenceValue = e.target.value;
            const displayElement = document.getElementById('confidence-display');
            if (displayElement) {
                displayElement.textContent = confidenceValue + '%';
            }
        }
    });
    
    // Event listeners para formularios
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'call-bot-config-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración del bot de llamadas...');
            
            // Validar campos requeridos
            const requiredFields = [
                { id: 'company-name', name: 'Nombre de la Empresa' },
                { id: 'welcome-message', name: 'Mensaje de Bienvenida' }
            ];
            
            const missingFields = [];
            requiredFields.forEach(field => {
                const element = document.getElementById(field.id);
                if (!element || !element.value.trim()) {
                    missingFields.push(field.name);
                    element?.classList.add('is-invalid');
                } else {
                    element?.classList.remove('is-invalid');
                }
            });

            if (missingFields.length > 0) {
                toastr.error(`Campos requeridos: ${missingFields.join(', ')}`, 'Error de Validación');
                return;
            }
            
            // Recopilar días laborables
            const workingDays = {
                monday: document.getElementById('monday')?.checked || false,
                tuesday: document.getElementById('tuesday')?.checked || false,
                wednesday: document.getElementById('wednesday')?.checked || false,
                thursday: document.getElementById('thursday')?.checked || false,
                friday: document.getElementById('friday')?.checked || false,
                saturday: document.getElementById('saturday')?.checked || false,
                sunday: document.getElementById('sunday')?.checked || false
            };
            
            // Recopilar datos del formulario
            const botConfigData = {
                welcomeMessage: document.getElementById('welcome-message').value,
                personality: document.getElementById('bot-personality').value,
                workingHours: {
                    opening: document.getElementById('opening-time').value,
                    closing: document.getElementById('closing-time').value
                },
                workingDays: workingDays
            };
            
            // Enviar al backend (simulado por ahora)
            console.log('🤖 Enviando configuración del bot:', botConfigData);
            
            // TODO: Descomentar cuando el backend esté listo
            // try {
            //     const response = await fetch('/api/config/bot', {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json',
            //             'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            //         },
            //         body: JSON.stringify(botConfigData)
            //     });
            //     const result = await response.json();
            //     if (result.success) {
            //         toastr.success(result.message, '¡Éxito!');
            //     } else {
            //         toastr.error(result.error, 'Error');
            //     }
            // } catch (error) {
            //     console.error('Error guardando configuración del bot:', error);
            //     toastr.error('Error al guardar la configuración', 'Error');
            // }

            toastr.success('Configuración del bot guardada correctamente', '¡Éxito!');
        }

        if (e.target.id === 'email-management-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración de emails...');

            
            // Validar email de respuesta
            const responseEmail = document.getElementById('response-email').value;
            if (responseEmail) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(responseEmail)) {
                    toastr.error('Por favor ingresa un email de respuesta válido', 'Error de Validación');
                    document.getElementById('response-email').classList.add('is-invalid');
                    return;
                } else {
                    document.getElementById('response-email').classList.remove('is-invalid');
                }
            }
            
            toastr.success('Configuración de emails guardada correctamente', '¡Éxito!');
        }
        
        if (e.target.id === 'profile-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración de perfil...');
            
            // Validar campos requeridos
            const requiredFields = [
                { id: 'account-company-name', name: 'Nombre de la Empresa' },
                { id: 'account-contact-name', name: 'Nombre de Contacto' },
                { id: 'account-email', name: 'Email de Contacto' },
                { id: 'account-phone', name: 'Teléfono' },
                { id: 'account-sector', name: 'Sector' }
            ];
            
            const missingFields = [];
            requiredFields.forEach(field => {
                const element = document.getElementById(field.id);
                if (!element || !element.value.trim()) {
                    missingFields.push(field.name);
                    element?.classList.add('is-invalid');
                } else {
                    element?.classList.remove('is-invalid');
                }
            });
            
            if (missingFields.length > 0) {
                toastr.error(`Campos requeridos: ${missingFields.join(', ')}`, 'Error de Validación');
                return;
            }
            
            // Validar email
            const email = document.getElementById('account-email').value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                toastr.error('Por favor ingresa un email válido', 'Error de Validación');
                document.getElementById('account-email').classList.add('is-invalid');
                return;
            }
            
            // Recopilar datos del formulario
            const profileData = {
                companyName: document.getElementById('account-company-name').value,
                contactName: document.getElementById('account-contact-name').value,
                email: document.getElementById('account-email').value,
                phone: document.getElementById('account-phone').value,
                website: document.getElementById('account-website').value,
                industry: document.getElementById('account-sector').value,
                address: document.getElementById('account-address').value,
                timezone: document.getElementById('account-timezone').value,
                language: document.getElementById('account-language').value
            };
            
            // Enviar al backend (simulado por ahora)
            console.log('📤 Enviando datos del perfil:', profileData);
            
            // TODO: Descomentar cuando el backend esté listo
            // try {
            //     const response = await fetch('/api/profile', {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json',
            //             'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            //         },
            //         body: JSON.stringify(profileData)
            //     });
            //     const result = await response.json();
            //     if (result.success) {
            //         toastr.success(result.message, '¡Éxito!');
            //     } else {
            //         toastr.error(result.error, 'Error');
            //     }
            // } catch (error) {
            //     console.error('Error guardando perfil:', error);
            //     toastr.error('Error al guardar la configuración', 'Error');
            // }
            
            toastr.success('Configuración de perfil guardada correctamente', '¡Éxito!');
        }
    });
    
    // Event listeners para archivos de contexto
    const fileInputs = [
        'inventory-file', 'catalog-file', 'pricing-file', 
        'menu-file', 'samples-file', 'info-file'
    ];
    
    fileInputs.forEach(inputId => {
        const fileInput = document.getElementById(inputId);
        const statusDiv = document.getElementById(inputId.replace('-file', '-status'));
        
        if (fileInput && statusDiv) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    console.log(`📁 Archivo seleccionado: ${file.name} (${inputId})`);
                    
                    // Validar tamaño (máximo 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Archivo muy grande (máx. 10MB)</small>';
                        e.target.value = '';
                        toastr.error('El archivo es muy grande. Máximo 10MB permitido.', 'Error de Archivo');
                        return;
                    }
                    
                    // Validar tipo de archivo
                    const allowedTypes = ['.pdf', '.txt', '.csv', '.xlsx', '.docx'];
                    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
                    if (!allowedTypes.includes(fileExtension)) {
                        statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Tipo de archivo no permitido</small>';
                        e.target.value = '';
                        toastr.error('Tipo de archivo no permitido. Use: PDF, TXT, CSV, XLSX, DOCX', 'Error de Archivo');
                        return;
                    }
                    
                    // Mostrar estado de éxito
                    statusDiv.innerHTML = `<small class="text-success"><i class="fas fa-check-circle me-1"></i>${file.name} (${(file.size / 1024).toFixed(1)} KB)</small>`;
                    toastr.success(`Archivo "${file.name}" cargado correctamente`, 'Archivo Listo');
                    
                    // Determinar tipo de archivo según el inputId
                    const fileTypeMap = {
                        'inventory-file': 'inventory',
                        'catalog-file': 'catalog',
                        'pricing-file': 'pricing',
                        'menu-file': 'menu',
                        'samples-file': 'samples',
                        'info-file': 'info'
                    };
                    
                    const fileType = fileTypeMap[inputId];
                    
                    // Simular envío al backend (descomentar cuando esté listo)
                    console.log(`📤 Enviando archivo ${fileType}:`, {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: fileType
                    });
                    
                    // TODO: Descomentar cuando el backend esté listo
                    // const reader = new FileReader();
                    // reader.onload = async function(e) {
                    //     try {
                    //         const response = await fetch('/api/bot/upload-context', {
                    //             method: 'POST',
                    //             headers: {
                    //                 'Content-Type': 'application/json',
                    //                 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    //             },
                    //             body: JSON.stringify({
                    //                 fileType: fileType,
                    //                 fileName: file.name,
                    //                 fileContent: e.target.result,
                    //                 fileSize: file.size
                    //             })
                    //         });
                    //         const result = await response.json();
                    //         if (result.success) {
                    //             statusDiv.innerHTML += '<small class="text-info d-block"><i class="fas fa-robot me-1"></i>Procesado por IA - Listo para usar</small>';
                    //             toastr.success(result.message, 'Procesado');
                    //         } else {
                    //             statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Error procesando archivo</small>';
                    //             toastr.error(result.error, 'Error');
                    //         }
                    //     } catch (error) {
                    //         console.error('Error subiendo archivo:', error);
                    //         statusDiv.innerHTML = '<small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Error subiendo archivo</small>';
                    //         toastr.error('Error al subir el archivo', 'Error');
                    //     }
                    // };
                    // reader.readAsDataURL(file);
                    
                    // Simular procesamiento (temporal)
                    setTimeout(() => {
                        statusDiv.innerHTML += '<small class="text-info d-block"><i class="fas fa-robot me-1"></i>Procesado por IA - Listo para usar</small>';
                    }, 1500);
                } else {
                    statusDiv.innerHTML = '';
                }
            });
        }
    });
    
    console.log('✅ Event listeners configurados');
}

/**
 * Agregar nueva FAQ
 */
function addFAQ() {
    const container = document.getElementById('faq-container');
    const index = container.children.length;
    
    const faqHTML = `
        <div class="input-group mb-2">
            <input type="text" class="form-control" placeholder="Pregunta" id="faq-question-${index}" name="faq_questions[]">
            <input type="text" class="form-control" placeholder="Respuesta" id="faq-answer-${index}" name="faq_answers[]">
            <button class="btn btn-outline-danger" type="button" onclick="removeFAQ(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', faqHTML);
    toastr.info('Nueva pregunta frecuente agregada', 'Información');
}

/**
 * Eliminar FAQ
 * @param {number} index - Índice de la FAQ a eliminar
 */
function removeFAQ(index) {
    const faqElement = document.getElementById(`faq-question-${index}`).closest('.input-group');
    if (faqElement) {
        faqElement.remove();
        toastr.info('Pregunta frecuente eliminada', 'Información');
    }
}

// ========================================
// FUNCIONES DE CLASIFICACIÓN INTELIGENTE DE EMAILS
// ========================================

/**
 * Clasificar nuevos emails con IA
 */
function classifyNewEmails() {
    console.log('🤖 Iniciando clasificación inteligente de emails...');
    
    // Simular proceso de clasificación con IA
    toastr.info('Analizando emails con IA...', 'Clasificación Inteligente');
    
    setTimeout(() => {
        toastr.success('2 emails nuevos clasificados correctamente', '¡Clasificación Completada!');
        console.log('✅ Clasificación de emails completada');
        
        // Actualizar contador
        const emailCount = document.getElementById('email-count');
        if (emailCount) {
            emailCount.textContent = '5'; // Simular nuevos emails
        }
    }, 2000);
}

/**
 * Filtrar emails por tipo
 * @param {string} filterType - Tipo de filtro (all, pedidos, reclamaciones, etc.)
 */
function filterEmails(filterType) {
    console.log(`🔍 Filtrando emails por tipo: ${filterType}`);
    
    const emailRows = document.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    emailRows.forEach(row => {
        const emailType = row.getAttribute('data-type');
        const emailUrgency = row.getAttribute('data-urgency');
        
        let shouldShow = false;
        
        switch(filterType) {
            case 'all':
                shouldShow = true;
                break;
            case 'urgente':
                shouldShow = emailUrgency === 'alta';
                break;
            default:
                shouldShow = emailType === filterType;
                break;
        }
        
        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const emailCount = document.getElementById('email-count');
    if (emailCount) {
        emailCount.textContent = visibleCount.toString();
    }
    
    // Mostrar notificación
    const filterLabels = {
        'all': 'Todos los emails',
        'pedidos': 'Pedidos',
        'reclamaciones': 'Reclamaciones', 
        'consultas': 'Consultas',
        'urgente': 'Emails urgentes'
    };
    
    toastr.info(`Mostrando: ${filterLabels[filterType]} (${visibleCount})`, 'Filtro Aplicado');
}

/**
 * Marcar email como leído
 * @param {number} emailId - ID del email
 */
function markAsRead(emailId) {
    console.log(`👁️ Marcando email ${emailId} como leído...`);
    
    // Encontrar la fila del email
    const emailRows = document.querySelectorAll('.email-row');
    const emailRow = emailRows[emailId - 1]; // Ajustar índice
    
    if (emailRow) {
        // Cambiar estado visual
        const statusBadge = emailRow.querySelector('td:nth-child(5) .badge');
        if (statusBadge) {
            statusBadge.className = 'badge bg-success';
            statusBadge.innerHTML = '👁️ Visto';
        }
        
        // Deshabilitar botón "Marcar Visto"
        const markReadBtn = emailRow.querySelector('button[onclick*="markAsRead"]');
        if (markReadBtn) {
            markReadBtn.disabled = true;
            markReadBtn.innerHTML = '<i class="fas fa-eye me-1"></i>Visto';
        }
        
        toastr.success('Email marcado como leído', '¡Acción Completada!');
    }
}

/**
 * Mostrar modal de respuesta automática
 * @param {number} emailId - ID del email
 * @param {string} replyType - Tipo de respuesta ('ai' o 'manual')
 */
function showAutoReplyModal(emailId, replyType) {
    console.log(`💬 Preparando respuesta ${replyType} para email ${emailId}...`);
    
    if (replyType === 'ai') {
        // Simular respuesta de IA
        toastr.info('Generando respuesta con IA...', 'Respuesta Automática');
        
        setTimeout(() => {
            const aiResponses = {
                1: 'Estimado cliente, hemos recibido su pedido de 200m2 de piel roja. Confirmamos disponibilidad para el 22 de julio. El precio final es de €2,450. ¿Desea proceder?',
                2: 'Lamentamos los inconvenientes. Hemos iniciado el proceso de reembolso que se completará en 3-5 días hábiles. Adjuntamos etiqueta de devolución gratuita.',
                3: 'Gracias por su interés. Le enviamos nuestro catálogo actualizado con precios especiales para nuevos clientes. ¿Tiene alguna consulta específica?'
            };
            
            const response = aiResponses[emailId] || 'Respuesta generada por IA disponible.';
            
            // Mostrar modal con respuesta generada
            showResponsePreview(emailId, response, 'IA');
            
        }, 1500);
        
    } else {
        // Abrir editor manual
        showManualReplyEditor(emailId);
    }
}

/**
 * Mostrar preview de respuesta generada
 * @param {number} emailId - ID del email
 * @param {string} response - Respuesta generada
 * @param {string} type - Tipo de respuesta
 */
function showResponsePreview(emailId, response, type) {
    // Crear modal dinámico
    const modalHTML = `
        <div class="modal fade" id="responseModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-robot me-2"></i>Respuesta Generada por ${type}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Revisa la respuesta antes de enviar. Puedes editarla si es necesario.
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Respuesta Propuesta:</label>
                            <textarea class="form-control" rows="4" id="generatedResponse">${response}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="sendEmailResponse(${emailId})">
                            <i class="fas fa-paper-plane me-1"></i>Enviar Respuesta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('responseModal'));
    modal.show();
    
    // Limpiar modal al cerrar
    document.getElementById('responseModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

/**
 * Mostrar editor de respuesta manual
 * @param {number} emailId - ID del email
 */
function showManualReplyEditor(emailId) {
    const modalHTML = `
        <div class="modal fade" id="manualReplyModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>Respuesta Manual
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Asunto:</label>
                            <input type="text" class="form-control" value="Re: Respuesta a su consulta" id="replySubject">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Mensaje:</label>
                            <textarea class="form-control" rows="6" id="manualResponse" placeholder="Escriba su respuesta aquí..."></textarea>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="addSignature" checked>
                            <label class="form-check-label" for="addSignature">
                                Incluir firma automática
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="sendManualResponse(${emailId})">
                            <i class="fas fa-paper-plane me-1"></i>Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('manualReplyModal'));
    modal.show();
    
    document.getElementById('manualReplyModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
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
 * Ver historial de email
 * @param {number} emailId - ID del email
 */
function viewEmailHistory(emailId) {
    console.log(`📄 Viendo historial del email ${emailId}...`);
    toastr.info('Cargando historial del email...', 'Historial');
    
    // Aquí se abriría un modal con el historial completo
    setTimeout(() => {
        toastr.success('Historial cargado', 'Información');
    }, 500);
}

/**
 * Probar plantilla de email con datos de ejemplo
 */
function testEmailTemplate() {
    console.log('🧪 Probando plantilla de email...');
    
    const template = document.getElementById('email-template').value;
    const signature = document.getElementById('email-signature').value;
    
    if (!template.trim()) {
        toastr.error('Por favor, escriba una plantilla primero', 'Error');
        return;
    }
    
    // Datos de ejemplo para la prueba
    const testData = {
        NOMBRE_CLIENTE: 'Juan Pérez',
        EMAIL_CLIENTE: 'juan.perez@email.com',
        EMPRESA: 'Mi Empresa SL',
        ASUNTO_ORIGINAL: 'Consulta sobre productos',
        RESPUESTA_IA: 'Hemos revisado su consulta sobre nuestros productos de cuero. Tenemos disponibilidad inmediata de los artículos que solicita. Le enviamos presupuesto detallado por email.',
        FIRMA: signature
    };
    
    // Reemplazar variables en la plantilla
    let processedTemplate = template;
    Object.keys(testData).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        processedTemplate = processedTemplate.replace(regex, testData[key]);
    });
    
    // Mostrar modal con preview
    const modalHTML = `
        <div class="modal fade" id="templateTestModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-flask me-2"></i>Preview de Plantilla
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-success">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Ejemplo de cómo se vería tu plantilla</strong> con datos reales de un cliente
                        </div>
                        
                        <div class="card">
                            <div class="card-header bg-light">
                                <div class="row">
                                    <div class="col-md-6">
                                        <small class="text-muted">De:</small> ${testData.EMPRESA} &lt;contacto@miempresa.com&gt;
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <small class="text-muted">Para:</small> ${testData.NOMBRE_CLIENTE} &lt;${testData.EMAIL_CLIENTE}&gt;
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <strong>Asunto:</strong> Re: ${testData.ASUNTO_ORIGINAL}
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="email-preview" style="white-space: pre-line; font-family: Arial, sans-serif; line-height: 1.6;">
                                    ${processedTemplate}
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <h6>Variables utilizadas:</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <small>
                                        <code>{NOMBRE_CLIENTE}</code> → ${testData.NOMBRE_CLIENTE}<br>
                                        <code>{EMAIL_CLIENTE}</code> → ${testData.EMAIL_CLIENTE}<br>
                                        <code>{EMPRESA}</code> → ${testData.EMPRESA}
                                    </small>
                                </div>
                                <div class="col-md-6">
                                    <small>
                                        <code>{ASUNTO_ORIGINAL}</code> → ${testData.ASUNTO_ORIGINAL}<br>
                                        <code>{RESPUESTA_IA}</code> → Respuesta contextual...<br>
                                        <code>{FIRMA}</code> → Tu firma personalizada
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-1"></i>Cerrar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="copyTemplatePreview()">
                            <i class="fas fa-copy me-1"></i>Copiar Preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('templateTestModal'));
    modal.show();
    
    // Limpiar modal al cerrar
    document.getElementById('templateTestModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
    
    toastr.success('Plantilla procesada correctamente', 'Preview Generado');
}

/**
 * Copiar preview de plantilla al portapapeles
 */
function copyTemplatePreview() {
    const previewContent = document.querySelector('.email-preview').textContent;
    
    navigator.clipboard.writeText(previewContent).then(() => {
        toastr.success('Preview copiado al portapapeles', 'Copiado');
    }).catch(() => {
        toastr.error('Error al copiar al portapapeles', 'Error');
    });
}
