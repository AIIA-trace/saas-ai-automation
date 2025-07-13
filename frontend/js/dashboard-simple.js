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
        
        // Configurar event listeners
        setupEventListeners();
        
        console.log('✅ Dashboard MVP configurado exitosamente');
        
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
    
    // HTML de las 4 pestañas centralizadas del MVP
    tabsContainer.innerHTML = `
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="call-assistant-tab" data-bs-toggle="tab" data-bs-target="#call-assistant" type="button" role="tab">
                <i class="fas fa-phone-alt me-2"></i>Asistente de Llamadas
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="email-assistant-tab" data-bs-toggle="tab" data-bs-target="#email-assistant" type="button" role="tab">
                <i class="fas fa-envelope me-2"></i>Asistente de Emails
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="account-tab" data-bs-toggle="tab" data-bs-target="#account" type="button" role="tab">
                <i class="fas fa-user-cog me-2"></i>Cuenta
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
 * Crear el contenido de las pestañas
 */
function createTabsContent() {
    console.log('📄 Creando contenido de las pestañas...');
    
    const tabsContentContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContentContainer) {
        console.error('❌ No se encontró el contenedor de contenido');
        return;
    }
    
    tabsContentContainer.innerHTML = `
        <!-- Asistente de Llamadas -->
        <div class="tab-pane fade show active" id="call-assistant" role="tabpanel">
            <div class="container-fluid py-4">
                <!-- Registro de Llamadas -->
                <div class="row mb-4">
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
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="px-4 py-3">Fecha</th>
                                                <th class="px-4 py-3">Número</th>
                                                <th class="px-4 py-3">Duración</th>
                                                <th class="px-4 py-3">Estado</th>
                                                <th class="px-4 py-3">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="calls-table-body">
                                            <tr>
                                                <td class="px-4 py-3" colspan="5">
                                                    <div class="text-center text-muted py-4">
                                                        <i class="fas fa-phone-slash fa-2x mb-3"></i>
                                                        <p>No hay llamadas registradas aún</p>
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
                
                <!-- Configuración del Bot de Llamadas -->
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <h5 class="mb-0"><i class="fas fa-cog me-2"></i>Configuración del Asistente</h5>
                            </div>
                            <div class="card-body">
                                <form id="call-config-form">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Nombre de la Empresa</label>
                                            <input type="text" class="form-control" id="company-name" placeholder="Mi Empresa S.L.">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Teléfono Principal</label>
                                            <input type="tel" class="form-control" id="company-phone" placeholder="+34 900 000 000">
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Mensaje de Bienvenida</label>
                                        <textarea class="form-control" id="welcome-message" rows="3" placeholder="Hola, gracias por llamar a [EMPRESA]. ¿En qué puedo ayudarte?"></textarea>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Horario de Atención - Desde</label>
                                            <input type="time" class="form-control" id="schedule-from" value="09:00">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Horario de Atención - Hasta</label>
                                            <input type="time" class="form-control" id="schedule-to" value="18:00">
                                        </div>
                                    </div>
                                    
                                    <!-- Preguntas Frecuentes -->
                                    <div class="mb-3">
                                        <label class="form-label">Preguntas Frecuentes</label>
                                        <div id="faq-container">
                                            <div class="input-group mb-2">
                                                <input type="text" class="form-control" placeholder="¿Cuáles son sus horarios?" id="faq-question-0">
                                                <input type="text" class="form-control" placeholder="Nuestro horario es de 9:00 a 18:00" id="faq-answer-0">
                                                <button class="btn btn-outline-danger" type="button" onclick="removeFAQ(0)">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="addFAQ()">
                                            <i class="fas fa-plus me-1"></i>Agregar FAQ
                                        </button>
                                    </div>
                                    
                                    <div class="text-end">
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
        
        <!-- Asistente de Emails -->
        <div class="tab-pane fade" id="email-assistant" role="tabpanel">
            <div class="container-fluid py-4">
                <!-- Clasificación Inteligente de Emails -->
                <div class="row mb-4">
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
                                <div class="px-4 py-3 bg-light border-bottom">
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
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-facturas">
                                                <label class="btn btn-outline-warning btn-sm" for="filter-facturas">💰 Facturas</label>
                                                
                                                <input type="radio" class="btn-check" name="email-filter" id="filter-urgente">
                                                <label class="btn btn-outline-danger btn-sm" for="filter-urgente">🚨 Urgente</label>
                                            </div>
                                        </div>
                                        <div class="col-md-4 text-end">
                                            <small class="text-muted">Total: <span id="email-count">3</span> emails</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th class="px-4 py-3">Fecha</th>
                                                <th class="px-4 py-3">Remitente</th>
                                                <th class="px-4 py-3">Asunto</th>
                                                <th class="px-4 py-3">Clasificación IA</th>
                                                <th class="px-4 py-3">Estado</th>
                                                <th class="px-4 py-3">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="emails-table-body">
                                            <!-- Email 1: Pedido -->
                                            <tr class="email-row" data-type="pedidos" data-urgency="alta">
                                                <td class="px-4 py-3">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-success rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">11:45</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div>
                                                        <div class="fw-medium">cliente@empresa.com</div>
                                                        <small class="text-muted">Cliente Premium</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="fw-medium">Nuevo pedido de 200m2 de piel roja para el 22 de julio</div>
                                                    <small class="text-muted">Necesito confirmar disponibilidad y precio final...</small>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-success mb-1">📦 PEDIDO</span>
                                                        <span class="badge bg-danger">🚨 URGENTE</span>
                                                        <small class="text-muted mt-1">Confianza: 95%</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span class="badge bg-warning">📋 Nuevo</span>
                                                </td>
                                                <td class="px-4 py-3">
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
                                                <td class="px-4 py-3">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-danger rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-20</div>
                                                            <small class="text-muted">09:30</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div>
                                                        <div class="fw-medium">queja@cliente.com</div>
                                                        <small class="text-muted">Cliente Frecuente</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="fw-medium">Producto defectuoso - Solicito reembolso inmediato</div>
                                                    <small class="text-muted">El producto llegó dañado y no cumple especificaciones...</small>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-danger mb-1">⚠️ RECLAMACIÓN</span>
                                                        <span class="badge bg-danger">🚨 URGENTE</span>
                                                        <small class="text-muted mt-1">Confianza: 98%</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span class="badge bg-success">👁️ Visto</span>
                                                </td>
                                                <td class="px-4 py-3">
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
                                                <td class="px-4 py-3">
                                                    <div class="d-flex align-items-center">
                                                        <div class="bg-info rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                                        <div>
                                                            <div class="fw-medium">2024-02-19</div>
                                                            <small class="text-muted">16:20</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div>
                                                        <div class="fw-medium">info@nuevocliente.com</div>
                                                        <small class="text-muted">Cliente Nuevo</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="fw-medium">Consulta sobre catálogo de productos y precios</div>
                                                    <small class="text-muted">Buenos días, me gustaría recibir información...</small>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <div class="d-flex flex-column">
                                                        <span class="badge bg-info mb-1">❓ CONSULTA</span>
                                                        <span class="badge bg-secondary">📋 NORMAL</span>
                                                        <small class="text-muted mt-1">Confianza: 92%</small>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span class="badge bg-primary">✅ Respondido</span>
                                                </td>
                                                <td class="px-4 py-3">
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
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Plantilla de Respuesta Automática</label>
                                        <textarea class="form-control" id="email-template" rows="4" placeholder="Gracias por contactar con [EMPRESA]. Hemos recibido su mensaje y le responderemos en un plazo de 24 horas."></textarea>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Firma del Email</label>
                                        <textarea class="form-control" id="email-signature" rows="3" placeholder="Saludos cordiales,&#10;Equipo de [EMPRESA]&#10;Tel: +34 900 000 000"></textarea>
                                    </div>
                                    
                                    <div class="text-end">
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
        
        <!-- Cuenta -->
        <div class="tab-pane fade" id="account" role="tabpanel">
            <div class="container-fluid py-4">
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-header bg-white border-bottom-0 py-3">
                                <h5 class="mb-0"><i class="fas fa-user-cog me-2"></i>Configuración de Cuenta</h5>
                            </div>
                            <div class="card-body">
                                <form id="account-form">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Nombre de la Empresa</label>
                                            <input type="text" class="form-control" id="account-company-name" placeholder="Mi Empresa S.L.">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Email de Contacto</label>
                                            <input type="email" class="form-control" id="account-email" placeholder="admin@miempresa.com">
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Teléfono</label>
                                            <input type="tel" class="form-control" id="account-phone" placeholder="+34 900 000 000">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Sector</label>
                                            <select class="form-select" id="account-sector">
                                                <option value="otro">Otro</option>
                                                <option value="retail">Comercio</option>
                                                <option value="services">Servicios</option>
                                                <option value="healthcare">Salud</option>
                                                <option value="education">Educación</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div class="text-end">
                                        <button type="submit" class="btn btn-success">
                                            <i class="fas fa-save me-2"></i>Guardar Cambios
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
            <div class="container-fluid py-4">
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
                                                <th class="px-4 py-3">Fecha</th>
                                                <th class="px-4 py-3">Concepto</th>
                                                <th class="px-4 py-3">Importe</th>
                                                <th class="px-4 py-3">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="px-4 py-3" colspan="4">
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
                                <ul class="list-unstyled text-start mb-4">
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
    
    // Cargar datos de ejemplo para llamadas
    setTimeout(() => {
        const callsTableBody = document.getElementById('calls-table-body');
        if (callsTableBody) {
            callsTableBody.innerHTML = `
                <tr>
                    <td class="px-4 py-3">2024-02-20 10:30</td>
                    <td class="px-4 py-3">+34 600 123 456</td>
                    <td class="px-4 py-3">00:05:32</td>
                    <td class="px-4 py-3"><span class="badge bg-success">Atendida</span></td>
                    <td class="px-4 py-3">
                        <button class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-play me-1"></i>Reproducir
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="px-4 py-3">2024-02-20 09:15</td>
                    <td class="px-4 py-3">+34 600 987 654</td>
                    <td class="px-4 py-3">00:03:21</td>
                    <td class="px-4 py-3"><span class="badge bg-warning">Perdida</span></td>
                    <td class="px-4 py-3">
                        <button class="btn btn-sm btn-outline-success">
                            <i class="fas fa-phone me-1"></i>Devolver
                        </button>
                    </td>
                </tr>
            `;
        }
    }, 500);
    
    // Cargar datos de ejemplo para emails
    setTimeout(() => {
        const emailsTableBody = document.getElementById('emails-table-body');
        if (emailsTableBody) {
            emailsTableBody.innerHTML = `
                <tr>
                    <td class="px-4 py-3">2024-02-20 11:45</td>
                    <td class="px-4 py-3">cliente@ejemplo.com</td>
                    <td class="px-4 py-3">Consulta sobre servicios</td>
                    <td class="px-4 py-3"><span class="badge bg-success">Respondido</span></td>
                    <td class="px-4 py-3">
                        <button class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye me-1"></i>Ver
                        </button>
                    </td>
                </tr>
                <tr>
                    <td class="px-4 py-3">2024-02-20 08:30</td>
                    <td class="px-4 py-3">info@empresa.com</td>
                    <td class="px-4 py-3">Solicitud de presupuesto</td>
                    <td class="px-4 py-3"><span class="badge bg-warning">Pendiente</span></td>
                    <td class="px-4 py-3">
                        <button class="btn btn-sm btn-outline-success">
                            <i class="fas fa-reply me-1"></i>Responder
                        </button>
                    </td>
                </tr>
            `;
        }
    }, 700);
    
    console.log('✅ Datos iniciales cargados');
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
    
    // Event listeners para filtros de email
    document.addEventListener('change', function(e) {
        if (e.target.name === 'email-filter') {
            filterEmails(e.target.id.replace('filter-', ''));
        }
    });
    
    // Event listeners para formularios
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'call-config-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración de llamadas...');
            toastr.success('Configuración de llamadas guardada correctamente', '¡Éxito!');
        }
        
        if (e.target.id === 'email-config-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración de emails...');
            toastr.success('Configuración de emails guardada correctamente', '¡Éxito!');
        }
        
        if (e.target.id === 'account-form') {
            e.preventDefault();
            console.log('💾 Guardando configuración de cuenta...');
            toastr.success('Configuración de cuenta guardada correctamente', '¡Éxito!');
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
            <input type="text" class="form-control" placeholder="Pregunta" id="faq-question-${index}">
            <input type="text" class="form-control" placeholder="Respuesta" id="faq-answer-${index}">
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
        'facturas': 'Facturas',
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
