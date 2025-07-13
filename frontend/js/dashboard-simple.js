/**
 * Dashboard Simple para MVP - Solo pestañas esenciales
 */

/**
 * Adapta el contexto para el agente de IA con pestañas simples
 */
function adaptOtherContextSimple(config) {
    console.log('=== ADAPTANDO CONTEXTO SIMPLE PARA AGENTE DE IA ===');
    console.log('Configuración recibida:', config);
    
    try {
        // Crear las pestañas dinámicas simples para el agente de IA
        const tabsContainer = document.getElementById('sector-specific-tabs');
        if (!tabsContainer) {
            console.error('No se encontró el contenedor de pestañas sector-specific-tabs');
            return;
        }

        // Añadir elementos al menú lateral para agente de IA
        console.log('Añadiendo elementos al menú lateral para agente de IA');
        
        // Mostrar mensaje de carga
        tabsContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2 text-muted">Preparando tu dashboard...</p>
            </div>
        `;
        
        // Definir las pestañas simples para el MVP
        setTimeout(() => {
            tabsContainer.innerHTML = `
                <div class="tab-pane fade" id="call-analytics" role="tabpanel" aria-labelledby="call-analytics-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-phone me-2"></i>Llamadas Recibidas</h2>
                        <button class="btn btn-primary" id="refresh-calls-btn">
                            <i class="fas fa-sync me-2"></i>Actualizar
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Número</th>
                                            <th>Duración</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="calls-table-body">
                                        <tr>
                                            <td colspan="5" class="text-center text-muted py-4">
                                                <i class="fas fa-phone-slash fa-2x mb-2"></i><br>
                                                No hay llamadas registradas aún
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="email-analytics" role="tabpanel" aria-labelledby="email-analytics-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-envelope me-2"></i>Emails Enviados</h2>
                        <button class="btn btn-primary" id="refresh-emails-btn">
                            <i class="fas fa-sync me-2"></i>Actualizar
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Destinatario</th>
                                            <th>Asunto</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="emails-table-body">
                                        <tr>
                                            <td colspan="5" class="text-center text-muted py-4">
                                                <i class="fas fa-envelope-open fa-2x mb-2"></i><br>
                                                No hay emails enviados aún
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="call-bot-config" role="tabpanel" aria-labelledby="call-bot-config-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-robot me-2"></i>Configuración Bot de Llamadas</h2>
                        <button class="btn btn-success" id="save-bot-config-btn">
                            <i class="fas fa-save me-2"></i>Guardar Configuración
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <form id="bot-config-form">
                                <div class="mb-3">
                                    <label class="form-label">Mensaje de Bienvenida</label>
                                    <textarea class="form-control" rows="3" placeholder="Hola, soy tu asistente virtual..."></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Número de Teléfono</label>
                                    <input type="tel" class="form-control" placeholder="+34 600 000 000">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Horario de Atención</label>
                                    <select class="form-select">
                                        <option>24/7 - Siempre disponible</option>
                                        <option>Horario comercial (9:00 - 18:00)</option>
                                        <option>Personalizado</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="email-management" role="tabpanel" aria-labelledby="email-management-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-envelope-open me-2"></i>Gestión de Emails</h2>
                        <button class="btn btn-success" id="save-email-config-btn">
                            <i class="fas fa-save me-2"></i>Guardar Configuración
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <form id="email-config-form">
                                <div class="mb-3">
                                    <label class="form-label">Email de Respuesta</label>
                                    <input type="email" class="form-control" placeholder="respuestas@miempresa.com">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Plantilla de Respuesta Automática</label>
                                    <textarea class="form-control" rows="4" placeholder="Gracias por contactarnos. Hemos recibido tu mensaje..."></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tiempo de Respuesta</label>
                                    <select class="form-select">
                                        <option>Inmediata</option>
                                        <option>Dentro de 1 hora</option>
                                        <option>Dentro de 24 horas</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="account-settings" role="tabpanel" aria-labelledby="account-settings-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-user-cog me-2"></i>Configuración de Cuenta</h2>
                        <button class="btn btn-success" id="save-account-btn">
                            <i class="fas fa-save me-2"></i>Guardar Cambios
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <form id="account-form">
                                <div class="mb-3">
                                    <label class="form-label">Nombre de la Empresa</label>
                                    <input type="text" class="form-control" placeholder="Mi Empresa">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email de Contacto</label>
                                    <input type="email" class="form-control" placeholder="contacto@miempresa.com">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Teléfono</label>
                                    <input type="tel" class="form-control" placeholder="+34 600 000 000">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Sector Empresarial</label>
                                    <select class="form-select">
                                        <option>Agente de IA</option>
                                        <option>Tecnología</option>
                                        <option>Servicios</option>
                                        <option>Comercio</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="billing" role="tabpanel" aria-labelledby="billing-tab">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-credit-card me-2"></i>Facturación</h2>
                        <button class="btn btn-primary" id="upgrade-plan-btn">
                            <i class="fas fa-arrow-up me-2"></i>Actualizar Plan
                        </button>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <div class="card border-0 shadow-sm mb-4">
                                <div class="card-header bg-white">
                                    <h5 class="mb-0">Plan Actual</h5>
                                </div>
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h4 class="text-primary">Plan Básico</h4>
                                            <p class="text-muted mb-0">Hasta 1,000 llamadas/mes</p>
                                        </div>
                                        <div class="text-end">
                                            <h3 class="text-success">€29/mes</h3>
                                            <small class="text-muted">Próximo pago: 13 Ago 2024</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card border-0 shadow-sm">
                                <div class="card-header bg-white">
                                    <h5 class="mb-0">Historial de Facturas</h5>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th>Concepto</th>
                                                    <th>Importe</th>
                                                    <th>Estado</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted py-4">
                                                        <i class="fas fa-receipt fa-2x mb-2"></i><br>
                                                        No hay facturas disponibles aún
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
                                <div class="card-header bg-white">
                                    <h5 class="mb-0">Uso Actual</h5>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between">
                                            <span>Llamadas</span>
                                            <span>0 / 1,000</span>
                                        </div>
                                        <div class="progress">
                                            <div class="progress-bar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="d-flex justify-content-between">
                                            <span>Emails</span>
                                            <span>0 / 5,000</span>
                                        </div>
                                        <div class="progress">
                                            <div class="progress-bar bg-success" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Mostrar el contenedor de navegación de pestañas
            const navTabsContainer = document.getElementById('sector-nav-tabs-container');
            if (navTabsContainer) {
                navTabsContainer.classList.remove('d-none');
                console.log('Contenedor de navegación de pestañas mostrado');
            }
            
            // Crear pestañas de navegación simples
            const navTabs = document.getElementById('sector-nav-tabs');
            if (navTabs) {
                // Limpiar pestañas existentes
                navTabs.innerHTML = '';
                
                // Definir las pestañas simples para el MVP según requisitos del usuario
                const tabs = [
                    { id: 'call-analytics', icon: 'phone', text: 'Análisis de Llamadas' },
                    { id: 'email-analytics', icon: 'envelope', text: 'Análisis de Emails' },
                    { id: 'call-bot-config', icon: 'robot', text: 'Bot de Llamadas' },
                    { id: 'email-management', icon: 'envelope-open', text: 'Gestión de Emails' },
                    { id: 'account-settings', icon: 'user-cog', text: 'Cuenta' },
                    { id: 'billing', icon: 'credit-card', text: 'Facturación' }
                ];
                
                tabs.forEach((tab, index) => {
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    li.innerHTML = `
                        <a class="nav-link ${index === 0 ? 'active' : ''}" 
                           id="${tab.id}-nav-tab" 
                           data-bs-toggle="tab" 
                           href="#${tab.id}" 
                           role="tab">
                            <i class="fas fa-${tab.icon} me-2"></i>${tab.text}
                        </a>
                    `;
                    navTabs.appendChild(li);
                });
                
                // Activar la primera pestaña
                const firstTab = document.getElementById('call-analytics');
                if (firstTab) {
                    firstTab.classList.add('show', 'active');
                }
            } else {
                console.error('No se encontró el contenedor de navegación de pestañas');
            }
            
            // Cargar datos simples
            loadSimpleData(config);
            
            // Agregar event listeners para botones
            setupEventListeners();
            
        }, 1000);
        
        console.log('Adaptación para sector "otro" completada con éxito');
        
    } catch (error) {
        console.error('Error al adaptar contexto para agente de IA:', error);
    }
}

/**
 * Carga datos simples para el MVP
 */
function loadSimpleData(config) {
    console.log('Cargando datos simples para MVP...');
    
    // Aquí se cargarían los datos reales desde la API
    // Por ahora solo mostramos mensaje de que no hay datos
    
    console.log('Datos simples cargados correctamente');
}

/**
 * Configura los event listeners para todos los botones
 */
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Botón actualizar llamadas
    const refreshCallsBtn = document.getElementById('refresh-calls-btn');
    if (refreshCallsBtn) {
        refreshCallsBtn.addEventListener('click', function() {
            console.log('Actualizando datos de llamadas...');
            toastr.info('Actualizando datos de llamadas...', 'Cargando');
            // Aquí se cargarían los datos reales
            setTimeout(() => {
                toastr.success('Datos actualizados correctamente', 'Éxito');
            }, 1000);
        });
    }
    
    // Botón actualizar emails
    const refreshEmailsBtn = document.getElementById('refresh-emails-btn');
    if (refreshEmailsBtn) {
        refreshEmailsBtn.addEventListener('click', function() {
            console.log('Actualizando datos de emails...');
            toastr.info('Actualizando datos de emails...', 'Cargando');
            // Aquí se cargarían los datos reales
            setTimeout(() => {
                toastr.success('Datos actualizados correctamente', 'Éxito');
            }, 1000);
        });
    }
    
    // Botón guardar configuración bot
    const saveBotConfigBtn = document.getElementById('save-bot-config-btn');
    if (saveBotConfigBtn) {
        saveBotConfigBtn.addEventListener('click', function() {
            console.log('Guardando configuración del bot...');
            toastr.info('Guardando configuración...', 'Procesando');
            // Aquí se guardaría la configuración real
            setTimeout(() => {
                toastr.success('Configuración guardada correctamente', 'Éxito');
            }, 1000);
        });
    }
    
    // Botón guardar configuración email
    const saveEmailConfigBtn = document.getElementById('save-email-config-btn');
    if (saveEmailConfigBtn) {
        saveEmailConfigBtn.addEventListener('click', function() {
            console.log('Guardando configuración de emails...');
            toastr.info('Guardando configuración...', 'Procesando');
            // Aquí se guardaría la configuración real
            setTimeout(() => {
                toastr.success('Configuración guardada correctamente', 'Éxito');
            }, 1000);
        });
    }
    
    // Botón guardar cuenta
    const saveAccountBtn = document.getElementById('save-account-btn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', function() {
            console.log('Guardando configuración de cuenta...');
            toastr.info('Guardando cambios...', 'Procesando');
            // Aquí se guardarían los cambios reales
            setTimeout(() => {
                toastr.success('Cambios guardados correctamente', 'Éxito');
            }, 1000);
        });
    }
    
    // Botón actualizar plan
    const upgradePlanBtn = document.getElementById('upgrade-plan-btn');
    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', function() {
            console.log('Redirigiendo a actualización de plan...');
            toastr.info('Redirigiendo a planes...', 'Información');
            // Aquí se redirigiría a la página de planes
        });
    }
    
    console.log('Event listeners configurados correctamente');
}
