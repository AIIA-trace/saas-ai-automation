/**
 * Módulo de Dashboard Dinámico
 * Adapta el dashboard según las respuestas y peticiones del cliente
 * Integrado con el servicio de autenticación centralizado
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el dashboard dinámico cuando el documento esté listo
    // La verificación de autenticación ya la realiza route-protection.js
    initializeDynamicDashboard();
});

/**
 * Inicializa el dashboard dinámico
 */
function initializeDynamicDashboard() {
    // Mostrar indicador de carga mientras obtenemos los datos
    const loadingIndicator = document.getElementById('loading-overview');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('d-none');
    }
    
    // Obtener la configuración del cliente usando el servicio de autenticación
    getCompanyConfig()
        .then(companyConfig => {
            if (!companyConfig) {
                // Redireccionar a la configuración si no hay datos
                redirectToSetup();
                return;
            }
            
            // Adaptar el dashboard según la configuración
            adaptDashboard(companyConfig);
        })
        .catch(error => {
            console.error('Error al inicializar dashboard:', error);
            toastr.error('Error al cargar la configuración de tu empresa', 'Error');
            
            // Ocultar indicador de carga
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
        });
}

/**
 * Obtiene la configuración de la empresa
 * @returns {Promise} Promesa que resuelve con la configuración de la empresa
 */
async function getCompanyConfig() {
    try {
        // Primero intentamos obtener los datos del usuario autenticado
        const userData = await authService.getCurrentUser();
        
        // Si el usuario tiene una configuración específica en su perfil, la usamos
        if (userData && userData.companyConfig) {
            return userData.companyConfig;
        }
        
        // Si no hay configuración en el perfil, buscamos en localStorage
        // (esto es para compatibilidad con la versión anterior)
        const localConfig = localStorage.getItem('companyConfig');
        if (localConfig) {
            const config = JSON.parse(localConfig);
            
            // Si encontramos configuración local, la sincronizamos con el backend
            // (esto se implementará en una futura versión)
            // Por ahora solo la devolvemos
            return config;
        }
        
        // No hay configuración disponible
        return null;
    } catch (error) {
        console.error('Error al cargar configuración de empresa:', error);
        // Propagamos el error para manejarlo en el nivel superior
        throw error;
    }
}

/**
 * Redirecciona a la página de configuración inicial
 */
function redirectToSetup() {
    // Notificar al usuario
    toastr.info('Necesitamos algunos datos para configurar tu dashboard', 'Configuración inicial');
    
    // Redireccionar a la página de configuración
    setTimeout(() => {
        window.location.href = 'company-setup.html';
    }, 2000);
}

/**
 * Adapta el dashboard según la configuración
 */
function adaptDashboard(config) {
    console.log('Adaptando dashboard para:', config.companyName);
    
    // Actualizar el título del dashboard con el nombre de la empresa
    updateDashboardTitle(config.companyName);
    
    // Adaptar según el contexto empresarial
    adaptBusinessContext(config);
    
    // Adaptar opciones de menú según sector
    adaptMenuOptions(config);
}

/**
 * Adapta el dashboard según el contexto empresarial
 */
function adaptBusinessContext(config) {
    // Obtener el sector empresarial
    const sector = config.businessSector || 'generic';
    
    // Adaptar contenido según el sector
    switch(sector) {
        case 'restaurant':
            adaptRestaurantContext(config);
            break;
        case 'beauty':
            adaptBeautyContext(config);
            break;
        case 'retail':
            adaptRetailContext(config);
            break;
        default:
            adaptGenericContext(config);
            break;
    }
}

/**
 * Adapta el contenido para restaurantes
 */
function adaptRestaurantContext(config) {
    // Crear las pestañas dinámicas para restaurantes
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="orders">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-utensils me-2"></i>Gestión de Pedidos</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Pedido
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Pedidos Activos</h5>
                </div>
                <div class="card-body">
                    <div id="active-orders">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando pedidos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="reservations">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-calendar-alt me-2"></i>Gestión de Reservas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Reserva
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Reservas de Hoy</h5>
                </div>
                <div class="card-body">
                    <div id="todays-reservations">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando reservas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadRestaurantData(config);
}

/**
 * Adapta el contenido para peluquerías/estéticas
 */
function adaptBeautyContext(config) {
    // Crear las pestañas dinámicas para peluquerías
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="appointments">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-calendar-check me-2"></i>Gestión de Citas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Cita
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Citas de Hoy</h5>
                </div>
                <div class="card-body">
                    <div id="todays-appointments">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando citas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="services">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-cut me-2"></i>Servicios</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Servicio
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Catálogo de Servicios</h5>
                </div>
                <div class="card-body">
                    <div id="service-catalog">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando servicios...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadBeautyData(config);
}

/**
 * Adapta el contenido para comercios/tiendas
 */
function adaptRetailContext(config) {
    // Crear las pestañas dinámicas para comercios
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="inventory">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-boxes me-2"></i>Gestión de Inventario</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Producto
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Productos con Stock Bajo</h5>
                </div>
                <div class="card-body">
                    <div id="low-stock-products">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando inventario...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="sales">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-shopping-cart me-2"></i>Gestión de Ventas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Venta
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Ventas Recientes</h5>
                </div>
                <div class="card-body">
                    <div id="recent-sales">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando ventas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadRetailData(config);
}

/**
 * Adapta el contenido para caso genérico
 */
function adaptGenericContext(config) {
    // Crear las pestañas dinámicas para caso genérico
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="tasks">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-tasks me-2"></i>Gestión de Tareas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Tarea
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Tareas Pendientes</h5>
                </div>
                <div class="card-body">
                    <div id="pending-tasks">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando tareas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadGenericData(config);
}

/**
 * Carga datos para restaurantes desde API
 */
function loadRestaurantData(config) {
    const clientId = config.clientId;
    
    // Cargar pedidos activos
    const ordersContainer = document.getElementById('active-orders');
    if (ordersContainer) {
        // Realizar petición a la API
        fetch(`/api/clients/${clientId}/orders/active`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar los pedidos');
                }
                return response.json();
            })
            .then(data => {
                if (data.orders && data.orders.length > 0) {
                    // Renderizar pedidos
                    let ordersHTML = '<div class="table-responsive"><table class="table table-hover">';
                    ordersHTML += '<thead><tr><th>ID</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>';
                    ordersHTML += '<tbody>';
                    
                    data.orders.forEach(order => {
                        ordersHTML += `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.clientName}</td>
                                <td>${order.items.length} items</td>
                                <td>${order.total.toFixed(2)} €</td>
                                <td><span class="badge bg-${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrderDetails(${order.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus(${order.id})">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    ordersHTML += '</tbody></table></div>';
                    ordersContainer.innerHTML = ordersHTML;
                } else {
                    // Mostrar mensaje de no hay pedidos
                    ordersContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay pedidos activos en este momento.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                // Mostrar mensaje de error
                ordersContainer.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar los pedidos: ${error.message}
                    </div>
                    <button class="btn btn-outline-primary mt-2" onclick="loadRestaurantData(${JSON.stringify(config)})">
                        <i class="fas fa-sync-alt me-2"></i>Reintentar
                    </button>
                `;
                console.error('Error:', error);
            });
    }
    
    // Cargar reservas de hoy
    const reservationsContainer = document.getElementById('todays-reservations');
    if (reservationsContainer) {
        fetch(`/api/clients/${clientId}/reservations/today`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar reservas'))
            .then(data => {
                if (data.reservations && data.reservations.length > 0) {
                    let html = generarTablaReservas(data.reservations);
                    reservationsContainer.innerHTML = html;
                } else {
                    reservationsContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-calendar-day fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay reservas para hoy.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(reservationsContainer, error, 'reservas', () => loadRestaurantData(config));
            });
    }
}

/**
 * Carga datos para peluquería/estética desde API
 */
function loadBeautyData(config) {
    const clientId = config.clientId;
    
    // Cargar citas de hoy
    const appointmentsContainer = document.getElementById('todays-appointments');
    if (appointmentsContainer) {
        fetch(`/api/clients/${clientId}/appointments/today`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar citas'))
            .then(data => {
                if (data.appointments && data.appointments.length > 0) {
                    let html = generarTablaCitas(data.appointments);
                    appointmentsContainer.innerHTML = html;
                } else {
                    appointmentsContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay citas programadas para hoy.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(appointmentsContainer, error, 'citas', () => loadBeautyData(config));
            });
    }
    
    // Cargar servicios
    const servicesContainer = document.getElementById('service-catalog');
    if (servicesContainer) {
        fetch(`/api/clients/${clientId}/services`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar servicios'))
            .then(data => {
                if (data.services && data.services.length > 0) {
                    // Renderizar servicios en tarjetas
                    let html = '<div class="row">';
                    
                    data.services.forEach(service => {
                        html += `
                            <div class="col-md-4 mb-3">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">${service.name}</h5>
                                        <p class="card-text">${service.description || 'Sin descripción'}</p>
                                        <p class="card-text text-primary fw-bold">${service.price.toFixed(2)} €</p>
                                        <p class="card-text"><small class="text-muted">Duración: ${service.duration} min.</small></p>
                                    </div>
                                    <div class="card-footer bg-white">
                                        <button class="btn btn-sm btn-outline-primary" onclick="editService(${service.id})">
                                            <i class="fas fa-edit me-1"></i> Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    servicesContainer.innerHTML = html;
                } else {
                    servicesContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-cut fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay servicios configurados.</p>
                            <button class="btn btn-primary mt-2" onclick="addNewService()">
                                <i class="fas fa-plus me-2"></i>Añadir Servicio
                            </button>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(servicesContainer, error, 'servicios', () => loadBeautyData(config));
            });
    }
}

/**
 * Carga datos para comercio/tienda desde API
 */
function loadRetailData(config) {
    const clientId = config.clientId;
    
    // Cargar productos con stock bajo
    const lowStockContainer = document.getElementById('low-stock-products');
    if (lowStockContainer) {
        fetch(`/api/clients/${clientId}/inventory/low-stock`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar inventario'))
            .then(data => {
                if (data.products && data.products.length > 0) {
                    // Renderizar productos
                    let html = '<div class="table-responsive"><table class="table">';
                    html += '<thead><tr><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Acciones</th></tr></thead>';
                    html += '<tbody>';
                    
                    data.products.forEach(product => {
                        const stockClass = product.currentStock <= product.criticalStock ? 'text-danger fw-bold' : 'text-warning';
                        
                        html += `
                            <tr>
                                <td>${product.name}</td>
                                <td class="${stockClass}">${product.currentStock} unidades</td>
                                <td>${product.minimumStock} unidades</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="restockProduct(${product.id})">
                                        <i class="fas fa-plus me-1"></i> Reponer
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += '</tbody></table></div>';
                    lowStockContainer.innerHTML = html;
                } else {
                    lowStockContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                            <p class="text-muted">No hay productos con stock bajo actualmente.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(lowStockContainer, error, 'inventario', () => loadRetailData(config));
            });
    }
    
    // Cargar ventas recientes
    const recentSalesContainer = document.getElementById('recent-sales');
    if (recentSalesContainer) {
        fetch(`/api/clients/${clientId}/sales/recent`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar ventas'))
            .then(data => {
                if (data.sales && data.sales.length > 0) {
                    // Renderizar ventas recientes
                    let html = generarTablaVentas(data.sales);
                    recentSalesContainer.innerHTML = html;
                } else {
                    recentSalesContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay ventas recientes.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(recentSalesContainer, error, 'ventas', () => loadRetailData(config));
            });
    }
}

/**
 * Carga datos para caso genérico desde API
 */
function loadGenericData(config) {
    const clientId = config.clientId;
    
    // Cargar tareas pendientes
    const tasksContainer = document.getElementById('pending-tasks');
    if (tasksContainer) {
        fetch(`/api/clients/${clientId}/tasks/pending`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar tareas'))
            .then(data => {
                if (data.tasks && data.tasks.length > 0) {
                    // Renderizar tareas
                    let html = '<ul class="list-group">';
                    
                    data.tasks.forEach(task => {
                        // Determinar clase según prioridad
                        let priorityClass = '';
                        let priorityIcon = '';
                        
                        switch (task.priority) {
                            case 'high':
                                priorityClass = 'border-danger';
                                priorityIcon = '<i class="fas fa-exclamation-circle text-danger me-2"></i>';
                                break;
                            case 'medium':
                                priorityClass = 'border-warning';
                                priorityIcon = '<i class="fas fa-exclamation-triangle text-warning me-2"></i>';
                                break;
                            default:
                                priorityClass = '';
                                priorityIcon = '<i class="fas fa-info-circle text-info me-2"></i>';
                        }
                        
                        html += `
                            <li class="list-group-item ${priorityClass}">
                                <div class="d-flex w-100 justify-content-between align-items-center">
                                    <div>
                                        ${priorityIcon}
                                        <span class="fw-bold">${task.title}</span>
                                        <p class="mb-1 text-muted small">${task.description || ''}</p>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-outline-success" onclick="completeTask(${task.id})">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </li>
                        `;
                    });
                    
                    html += '</ul>';
                    tasksContainer.innerHTML = html;
                } else {
                    tasksContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-clipboard-check fa-3x text-success mb-3"></i>
                            <p class="text-muted">No hay tareas pendientes.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(tasksContainer, error, 'tareas', () => loadGenericData(config));
            });
    }
}

/**
 * Genera una tabla HTML para mostrar reservas
 */
function generarTablaReservas(reservations) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>Hora</th><th>Cliente</th><th>Personas</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    reservations.forEach(reservation => {
        html += `
            <tr>
                <td>${reservation.time}</td>
                <td>${reservation.clientName}</td>
                <td>${reservation.peopleCount}</td>
                <td>${reservation.phone}</td>
                <td><span class="badge bg-${getReservationBadgeClass(reservation.status)}">${reservation.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewReservationDetails(${reservation.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="confirmReservation(${reservation.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Genera una tabla HTML para mostrar citas
 */
function generarTablaCitas(appointments) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Duración</th><th>Estado</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    appointments.forEach(appointment => {
        html += `
            <tr>
                <td>${appointment.time}</td>
                <td>${appointment.clientName}</td>
                <td>${appointment.serviceName}</td>
                <td>${appointment.duration} min</td>
                <td><span class="badge bg-${getAppointmentBadgeClass(appointment.status)}">${appointment.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewAppointmentDetails(${appointment.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="completeAppointment(${appointment.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Genera una tabla HTML para mostrar ventas
 */
function generarTablaVentas(sales) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    sales.forEach(sale => {
        html += `
            <tr>
                <td>#${sale.id}</td>
                <td>${sale.date}</td>
                <td>${sale.clientName || 'Cliente anónimo'}</td>
                <td>${sale.itemCount} productos</td>
                <td>${sale.total.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewSaleDetails(${sale.id})">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Muestra un mensaje de error en un contenedor
 */
function mostrarError(container, error, tipo, retryFunction) {
    container.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar ${tipo}: ${error.message || error}
        </div>
        <button class="btn btn-outline-primary mt-2" onclick="${retryFunction.name}()">
            <i class="fas fa-sync-alt me-2"></i>Reintentar
        </button>
    `;
    console.error('Error:', error);
}

/**
 * Devuelve la clase CSS para el badge según el estado del pedido
 */
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'pending': return 'warning';
        case 'preparing': return 'info';
        case 'ready': return 'primary';
        case 'delivered': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

/**
 * Devuelve la clase CSS para el badge según el estado de la reserva
 */
function getReservationBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'completed': return 'info';
        default: return 'secondary';
    }
}

/**
 * Devuelve la clase CSS para el badge según el estado de la cita
 */
function getAppointmentBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'completed': return 'info';
        case 'in_progress': return 'primary';
        default: return 'secondary';
    }
}

/**
 * Adapta opciones de menú según el sector empresarial
 */
function adaptMenuOptions(config) {
    const menuContainer = document.getElementById('sector-specific-menu');
    if (!menuContainer) return;
    
    const sector = config.businessSector || 'generic';
    let menuHTML = '';
    
    // Generar opciones de menú específicas por sector
    switch(sector) {
        case 'restaurant':
            menuHTML = `
                <a href="#orders" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-utensils me-2"></i> Pedidos
                </a>
                <a href="#reservations" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-calendar-alt me-2"></i> Reservas
                </a>
            `;
            break;
        case 'beauty':
            menuHTML = `
                <a href="#appointments" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-calendar-check me-2"></i> Citas
                </a>
                <a href="#services" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-cut me-2"></i> Servicios
                </a>
            `;
            break;
        case 'retail':
            menuHTML = `
                <a href="#inventory" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-boxes me-2"></i> Inventario
                </a>
                <a href="#sales" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-shopping-cart me-2"></i> Ventas
                </a>
            `;
            break;
    }
    
    menuContainer.innerHTML = menuHTML;
}

/**
 * Actualiza el título del dashboard
 */
function updateDashboardTitle(companyName) {
    const dashboardTitle = document.querySelector('.navbar-brand');
    if (dashboardTitle) {
        dashboardTitle.innerHTML = `<i class="fas fa-robot me-2"></i>${companyName}`;
    }
}