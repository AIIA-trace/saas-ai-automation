// Dynamic Dashboard Overview Module
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the overview tab
    const overviewTab = document.getElementById('overview');
    if (!overviewTab) return;
    
    // Initialize dynamic overview based on company configuration
    initializeDynamicOverview();
});

function initializeDynamicOverview() {
    // TO DO: Implement dynamic overview initialization based on company configuration
    // For now, just render the static content
    overviewTab.innerHTML = `
        <h1 class="mb-4">Panel General</h1>
        <p class="lead">Bienvenido a tu panel de control. Aquí podrás gestionar tu sistema de atención automática de llamadas y emails.</p>
        
        <!-- Stats Cards -->
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card stats-card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-muted mb-0">Llamadas atendidas</h5>
                        <h3 class="mt-2 mb-3" id="call-stats">--</h3>
                        <p class="card-text text-success mb-0">
                            <i class="fas fa-chart-line me-1"></i>
                            <span id="call-stats-trend">--</span>% este mes
                        </p>
                        <div class="stats-icon">
                            <i class="fas fa-phone-alt"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card stats-card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-muted mb-0">Emails procesados</h5>
                        <h3 class="mt-2 mb-3" id="email-stats">--</h3>
                        <p class="card-text text-success mb-0">
                            <i class="fas fa-chart-line me-1"></i>
                            <span id="email-stats-trend">--</span>% este mes
                        </p>
                        <div class="stats-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card stats-card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-muted mb-0">Minutos utilizados</h5>
                        <h3 class="mt-2 mb-3" id="minutes-stats">--</h3>
                        <p class="card-text text-muted mb-0">
                            <i class="fas fa-clock me-1"></i>
                            <span id="minutes-limit">--</span> disponibles
                        </p>
                        <div class="stats-icon">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 mb-3">
                <div class="card stats-card h-100 border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-muted mb-0">Emails disponibles</h5>
                        <h3 class="mt-2 mb-3" id="email-quota-stats">--</h3>
                        <p class="card-text text-muted mb-0">
                            <i class="fas fa-envelope-open me-1"></i>
                            <span id="email-quota-limit">--</span> disponibles
                        </p>
                        <div class="stats-icon">
                            <i class="fas fa-mail-bulk"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Charts Row -->
        <div class="row mb-4">
            <div class="col-lg-8 mb-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Actividad mensual</h5>
                            <div class="btn-group">
                                <button type="button" class="btn btn-sm btn-outline-secondary active" data-chart-period="week">Semana</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" data-chart-period="month">Mes</button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="activityChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-4 mb-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Distribución de comunicaciones</h5>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 240px;">
                            <canvas id="distributionChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="row mb-4">
            <div class="col-lg-6 mb-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Llamadas recientes</h5>
                            <a href="#logs" class="btn btn-sm btn-outline-primary" data-bs-toggle="tab">Ver todos</a>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush" id="recent-calls">
                            <div class="list-group-item py-3 px-4">
                                <div class="d-flex">
                                    <div class="flex-shrink-0">
                                        <div class="data-item-icon">
                                            <i class="fas fa-phone-alt"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1">Cargando llamadas recientes...</h6>
                                        </div>
                                        <p class="mb-1 text-muted">Por favor, espere un momento</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-lg-6 mb-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Emails recientes</h5>
                            <a href="#logs" class="btn btn-sm btn-outline-primary" data-bs-toggle="tab">Ver todos</a>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush" id="recent-emails">
                            <div class="list-group-item py-3 px-4">
                                <div class="d-flex">
                                    <div class="flex-shrink-0">
                                        <div class="data-item-icon">
                                            <i class="fas fa-envelope"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <div class="d-flex w-100 justify-content-between">
                                            <h6 class="mb-1">Cargando emails recientes...</h6>
                                        </div>
                                        <p class="mb-1 text-muted">Por favor, espere un momento</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="row">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white">
                        <h5 class="mb-0">Acciones rápidas</h5>
                    </div>
                    <div class="card-body">
                        <div class="row g-4">
                            <div class="col-md-3 col-sm-6">
                                <a href="#bot-config" class="card text-center h-100 border-0 shadow-sm action-card" data-bs-toggle="tab">
                                    <div class="card-body">
                                        <div class="action-icon mb-3">
                                            <i class="fas fa-robot fa-2x text-primary"></i>
                                        </div>
                                        <h5 class="card-title">Configurar bot</h5>
                                        <p class="card-text text-muted">Personaliza las respuestas y comportamiento del bot</p>
                                    </div>
                                </a>
                            </div>
                            <div class="col-md-3 col-sm-6">
                                <a href="#email-config" class="card text-center h-100 border-0 shadow-sm action-card" data-bs-toggle="tab">
                                    <div class="card-body">
                                        <div class="action-icon mb-3">
                                            <i class="fas fa-paper-plane fa-2x text-primary"></i>
                                        </div>
                                        <h5 class="card-title">Reglas de email</h5>
                                        <p class="card-text text-muted">Configura reglas de reenvío y notificaciones</p>
                                    </div>
                                </a>
                            </div>
                            <div class="col-md-3 col-sm-6">
                                <a href="#phone" class="card text-center h-100 border-0 shadow-sm action-card" data-bs-toggle="tab">
                                    <div class="card-body">
                                        <div class="action-icon mb-3">
                                            <i class="fas fa-phone-alt fa-2x text-primary"></i>
                                        </div>
                                        <h5 class="card-title">Añadir número</h5>
                                        <p class="card-text text-muted">Compra o integra nuevos números de teléfono</p>
                                    </div>
                                </a>
                            </div>
                            <div class="col-md-3 col-sm-6">
                                <a href="#account" class="card text-center h-100 border-0 shadow-sm action-card" data-bs-toggle="tab">
                                    <div class="card-body">
                                        <div class="action-icon mb-3">
                                            <i class="fas fa-user-cog fa-2x text-primary"></i>
                                        </div>
                                        <h5 class="card-title">Editar perfil</h5>
                                        <p class="card-text text-muted">Actualiza la información de tu cuenta</p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Fetch dashboard data
    fetchDashboardData();
});

// Fetch dashboard data from API
function fetchDashboardData() {
    const token = localStorage.getItem('authToken');
    
    fetch('/api/dashboard/stats', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error loading dashboard data');
        }
        return response.json();
    })
    .then(data => {
        // Update dashboard stats
        updateDashboardStats(data);
        
        // Load charts
        initializeActivityChart(data.activityData);
        initializeDistributionChart(data.distributionData);
        
        // Load recent activity
        loadRecentCalls(data.recentCalls);
        loadRecentEmails(data.recentEmails);
    })
    .catch(error => {
        console.error('Error:', error);
        // Load mock data for demo purposes
        loadMockData();
    });
}

// Update dashboard statistics
function updateDashboardStats(data) {
    // Update call stats
    document.getElementById('call-stats').textContent = data.callStats.total || 0;
    document.getElementById('call-stats-trend').textContent = data.callStats.trend || 0;
    
    // Update email stats
    document.getElementById('email-stats').textContent = data.emailStats.total || 0;
    document.getElementById('email-stats-trend').textContent = data.emailStats.trend || 0;
    
    // Update minutes stats
    document.getElementById('minutes-stats').textContent = data.minutesStats.used || 0;
    document.getElementById('minutes-limit').textContent = data.minutesStats.limit || 0;
    
    // Update email quota
    document.getElementById('email-quota-stats').textContent = data.emailQuota.used || 0;
    document.getElementById('email-quota-limit').textContent = data.emailQuota.limit || 0;
}

// Initialize activity chart
function initializeActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Llamadas',
                    data: data.calls,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Emails',
                    data: data.emails,
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize distribution chart
function initializeDistributionChart(data) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Llamadas', 'Emails'],
            datasets: [{
                data: [data.calls, data.emails],
                backgroundColor: [
                    '#4361ee',
                    '#4cc9f0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load recent calls
function loadRecentCalls(calls) {
    const container = document.getElementById('recent-calls');
    
    if (!calls || calls.length === 0) {
        container.innerHTML = `
            <div class="list-group-item py-3 px-4">
                <div class="text-center text-muted py-3">
                    <i class="fas fa-phone-slash fa-2x mb-3"></i>
                    <p class="mb-0">No hay llamadas recientes</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    calls.forEach(call => {
        const statusBadge = getStatusBadge(call.status);
        
        container.innerHTML += `
            <div class="list-group-item py-3 px-4">
                <div class="d-flex">
                    <div class="flex-shrink-0">
                        <div class="data-item-icon">
                            <i class="fas fa-phone-alt"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${call.callerName || call.phoneNumber}</h6>
                            <small>${formatTimestamp(call.timestamp)}</small>
                        </div>
                        <p class="mb-1 text-muted">${call.summary || 'Sin resumen'}</p>
                        <div>
                            ${statusBadge}
                            <span class="ms-2">${call.duration ? formatDuration(call.duration) : '0:00'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// Load recent emails
function loadRecentEmails(emails) {
    const container = document.getElementById('recent-emails');
    
    if (!emails || emails.length === 0) {
        container.innerHTML = `
            <div class="list-group-item py-3 px-4">
                <div class="text-center text-muted py-3">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <p class="mb-0">No hay emails recientes</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    emails.forEach(email => {
        const urgencyBadge = getUrgencyBadge(email.urgency);
        
        container.innerHTML += `
            <div class="list-group-item py-3 px-4">
                <div class="d-flex">
                    <div class="flex-shrink-0">
                        <div class="data-item-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${email.sender}</h6>
                            <small>${formatTimestamp(email.timestamp)}</small>
                        </div>
                        <p class="mb-1">${email.subject}</p>
                        <div>
                            ${urgencyBadge}
                            <span class="ms-2 text-muted">${email.category || 'Sin categoría'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// Helper: Get status badge
function getStatusBadge(status) {
    const statusMap = {
        'completed': '<span class="status-badge status-badge-success">Completada</span>',
        'missed': '<span class="status-badge status-badge-danger">Perdida</span>',
        'in-progress': '<span class="status-badge status-badge-warning">En progreso</span>',
        'forwarded': '<span class="status-badge status-badge-info">Transferida</span>'
    };
    
    return statusMap[status] || '<span class="status-badge status-badge-secondary">Desconocido</span>';
}

// Helper: Get urgency badge
function getUrgencyBadge(urgency) {
    const urgencyMap = {
        'high': '<span class="status-badge status-badge-danger">Urgente</span>',
        'medium': '<span class="status-badge status-badge-warning">Media</span>',
        'low': '<span class="status-badge status-badge-success">Baja</span>'
    };
    
    return urgencyMap[urgency] || '<span class="status-badge status-badge-secondary">Normal</span>';
}

// Helper: Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
        return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
        return `Hace ${diffHours} h`;
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString();
    }
}

// Helper: Format duration
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Load mock data for demo purposes
function loadMockData() {
    // Mock data for dashboard
    const mockData = {
        callStats: {
            total: 42,
            trend: 8
        },
        emailStats: {
            total: 156,
            trend: 12
        },
        minutesStats: {
            used: 78,
            limit: 500
        },
        emailQuota: {
            used: 156,
            limit: 2000
        },
        activityData: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            calls: [5, 8, 12, 7, 10, 4, 6],
            emails: [15, 22, 18, 25, 32, 12, 16]
        },
        distributionData: {
            calls: 42,
            emails: 156
        },
        recentCalls: [
            {
                callerName: 'Juan Pérez',
                phoneNumber: '+34612345678',
                timestamp: Date.now() - 1800000,
                duration: 124,
                summary: 'Consulta sobre facturación de servicios',
                status: 'completed'
            },
            {
                callerName: 'María López',
                phoneNumber: '+34623456789',
                timestamp: Date.now() - 3600000,
                duration: 78,
                summary: 'Solicitud de presupuesto para proyecto web',
                status: 'completed'
            },
            {
                phoneNumber: '+34634567890',
                timestamp: Date.now() - 86400000,
                duration: 0,
                status: 'missed'
            }
        ],
        recentEmails: [
            {
                sender: 'carlos@ejemplo.com',
                subject: 'Solicitud de información sobre servicios',
                timestamp: Date.now() - 900000,
                category: 'Consulta',
                urgency: 'medium'
            },
            {
                sender: 'soporte@proveedor.com',
                subject: 'Actualización de sistema programada',
                timestamp: Date.now() - 7200000,
                category: 'Notificación',
                urgency: 'low'
            },
            {
                sender: 'director@empresa.com',
                subject: 'URGENTE: Reunión con cliente importante',
                timestamp: Date.now() - 10800000,
                category: 'Interno',
                urgency: 'high'
            }
        ]
    };
    
    // Update UI with mock data
    updateDashboardStats(mockData);
    initializeActivityChart(mockData.activityData);
    initializeDistributionChart(mockData.distributionData);
    loadRecentCalls(mockData.recentCalls);
    loadRecentEmails(mockData.recentEmails);
}
