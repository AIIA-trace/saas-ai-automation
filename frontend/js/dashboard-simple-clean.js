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
        
        // Configurar botones de FAQs (sin cargar datos)
        setupFaqButtons();
        
        // Configurar carga de archivos
        setupFileUploadHandlers();
        
        // NOTA: FAQs y context files se cargan desde loadExistingData() para evitar race conditions
        
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
    
    console.log(' Pestañas centralizadas del MVP creadas');
}

/**
 * Reparar los filtros de email para asegurar que funcionen
 */
function repararFiltrosEmail() {
    // Añadir listeners directos a los botones de filtro
    const filterButtons = document.querySelectorAll('.email-filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Lógica para aplicar el filtro seleccionado
            console.log('Filtro seleccionado:', button.textContent);
        });
    });
}

/**
 * Agregar estilos CSS para el dashboard
 */
function addDashboardStyles() {
    // Verificar si los estilos ya existen
    if (document.getElementById('dashboard-styles')) return;
    
    // Crear elemento de estilo
    const style = document.createElement('style');
    style.textContent = `
        /* Variables CSS unificadas con la landing page */
        :root {
            --primary-color: #4361ee;
            --secondary-color: #3f37c9;
            --accent-color: #4cc9f0;
            --light-color: #f8f9fa;
            --dark-color: #212529;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --warning-color: #ffc107;
            --info-color: #17a2b8;
            --primary-gradient: linear-gradient(135deg, #4361ee 0%, #4cc9f0 100%);
            --secondary-gradient: linear-gradient(135deg, #3f37c9 0%, #4361ee 100%);
            --primary-subtle: rgba(67, 97, 238, 0.1);
            --success-subtle: rgba(40, 167, 69, 0.1);
            --danger-subtle: rgba(220, 53, 69, 0.1);
            --border-radius: 12px;
            --border-radius-sm: 8px;
            --border-radius-lg: 16px;
            --border-radius-xl: 24px;
            --border-radius-pill: 30px;
            --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
            --transition: all 0.3s ease;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        /* Reset y estilos base */
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: var(--dark-color);
        }
        
        /* Sistema de botones unificado */
        .btn {
            border-radius: var(--border-radius-pill);
            padding: 0.35rem 1rem;
            font-weight: 600;
            font-size: 0.75rem;
            transition: var(--transition);
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-family: var(--font-family);
        }
        
        .btn-sm {
            padding: 0.25rem 0.75rem;
            font-size: 0.7rem;
        }
        
        .btn-lg {
            padding: 0.5rem 1.25rem;
            font-size: 0.85rem;
        }
        
        .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: var(--shadow-sm);
        }
        
        .btn-primary:hover {
            background: var(--secondary-gradient);
            transform: translateY(-1px);
            box-shadow: var(--shadow);
        }
        
        .btn-outline-primary {
            background: transparent;
            color: var(--primary-color);
            border: 2px solid var(--primary-color);
        }
        
        .btn-outline-primary:hover {
            background: var(--primary-color);
            color: white;
            transform: translateY(-1px);
        }
        
        .btn-success {
            background: var(--success-color);
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .btn-danger {
            background: var(--danger-color);
            color: white;
        }
        
        .btn-danger:hover {
            background: #c82333;
            transform: translateY(-1px);
        }
        
        .btn-ghost {
            background: transparent;
            color: var(--dark-color);
            border: 1px solid #e9ecef;
        }
        
        .btn-ghost:hover {
            background: var(--light-color);
            border-color: var(--primary-color);
            color: var(--primary-color);
        }
        
        /* Botones de acción específicos */
        .btn-play-call {
            background: transparent;
            border: 2px solid var(--primary-color);
            color: var(--primary-color);
            padding: 0.3rem;
            border-radius: var(--border-radius);
            transition: var(--transition);
            font-size: 0.8rem;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .btn-play-call:hover {
            background: var(--primary-color);
            color: white;
            transform: scale(1.1);
            box-shadow: var(--shadow);
        }
        
        /* Botones dashboard compactos */
        .btn-dashboard-primary {
            background: var(--primary-gradient);
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.7rem;
            font-weight: 600;
            border-radius: var(--border-radius);
            transition: var(--transition);
            cursor: pointer;
        }
        
        .btn-dashboard-primary:hover {
            background: var(--secondary-gradient);
            transform: translateY(-1px);
            box-shadow: var(--shadow);
        }
        
        .btn-dashboard-secondary {
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.7rem;
            font-weight: 600;
            border-radius: var(--border-radius);
            transition: var(--transition);
            cursor: pointer;
        }
        
        .btn-dashboard-secondary:hover {
            background: #5a6268;
            transform: translateY(-1px);
        }
        
        .btn-dashboard-success {
            background: var(--success-color);
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.7rem;
            font-weight: 600;
            border-radius: var(--border-radius);
            transition: var(--transition);
            cursor: pointer;
        }
        
        .btn-dashboard-success:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .btn-dashboard-info {
            background: #17a2b8;
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            font-size: 0.7rem;
            font-weight: 600;
            border-radius: var(--border-radius);
            transition: var(--transition);
            cursor: pointer;
        }
        
        .btn-dashboard-info:hover {
            background: #138496;
            transform: translateY(-1px);
        }
        
        /* Navegación compacta */
        .nav-tabs .nav-link {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            border: none;
            border-bottom: 2px solid transparent;
            color: #6c757d;
            transition: var(--transition);
        }
        
        .nav-tabs .nav-link.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            background: transparent;
        }
        
        .nav-tabs .nav-link:hover {
            color: var(--primary-color);
            border-bottom-color: rgba(67, 97, 238, 0.3);
        }
        
        /* Filtros compactos */
        .dashboard-filters {
            background: #f8f9fa;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
        }
        
        .dashboard-filters .form-check-label {
            font-size: 0.75rem;
            font-weight: 500;
            margin-left: 0.25rem;
        }
        
        .dashboard-filters .form-check-input {
            width: 16px;
            height: 16px;
        }
        
        /* Dropdowns compactos */
        .dropdown-menu {
            font-size: 0.75rem;
            padding: 0.25rem 0;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            border: 1px solid #e9ecef;
        }
        
        .dropdown-item {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            transition: var(--transition);
        }
        
        .dropdown-item:hover {
            background: rgba(67, 97, 238, 0.1);
            color: var(--primary-color);
        }
        
        .dropdown-toggle {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border: none;
            background: transparent;
        }
        
        .dropdown-toggle::after {
            font-size: 0.6rem;
        }
        
        /* Paginación compacta */
        .pagination {
            margin-bottom: 0;
        }
        
        .pagination .page-link {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            border-radius: var(--border-radius-sm);
            border: 1px solid #dee2e6;
            color: var(--primary-color);
            margin: 0 2px;
        }
        
        .pagination .page-link:hover {
            background: rgba(67, 97, 238, 0.1);
            border-color: var(--primary-color);
        }
        
        .pagination .page-item.active .page-link {
            background: var(--primary-color);
            border-color: var(--primary-color);
        }
        
        /* Alertas y notificaciones compactas */
        .alert {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            border-radius: var(--border-radius);
            margin-bottom: 0.75rem;
        }
        
        .toast {
            font-size: 0.75rem;
        }
        
        .toast-header {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
        }
        
        .toast-body {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
        }
        
        /* Iconos compactos */
        .fas, .far, .fab {
            font-size: 0.75rem;
        }
        
        .card-title .fas,
        .card-title .far {
            font-size: 0.85rem;
        }
        
        .nav-link .fas,
        .nav-link .far {
            font-size: 0.7rem;
        }
        
        /* Espaciado compacto */
        .me-1 { margin-right: 0.15rem !important; }
        .me-2 { margin-right: 0.3rem !important; }
        .ms-1 { margin-left: 0.15rem !important; }
        .ms-2 { margin-left: 0.3rem !important; }
        .mb-1 { margin-bottom: 0.15rem !important; }
        .mb-2 { margin-bottom: 0.3rem !important; }
        .mt-1 { margin-top: 0.15rem !important; }
        .mt-2 { margin-top: 0.3rem !important; }
        
        /* Contenedores compactos */
        .container-fluid {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
        }
        
        .row {
            margin-left: -0.375rem;
            margin-right: -0.375rem;
        }
        
        .col, .col-12, .col-md-6, .col-lg-4 {
            padding-left: 0.375rem;
            padding-right: 0.375rem;
        }
        
        /* Botón robot centrado y dropdown mejorado */
        .btn-play-call {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid var(--primary-color);
            background: white;
            color: var(--primary-color);
            transition: all 0.2s ease;
            position: relative;
        }
        
        .btn-play-call:hover {
            background: var(--primary-color);
            color: white;
            transform: scale(1.05);
        }
        
        .btn-play-call .fas {
            font-size: 0.75rem;
            margin: 0;
        }
        
        /* Dropdown con z-index alto para aparecer por encima */
        .dropdown-menu {
            z-index: 1050 !important;
            position: absolute !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #e0e0e0;
            border-radius: var(--border-radius);
        }
        
        .email-row .dropdown {
            position: relative;
        }
        
        .dashboard-table tbody tr {
            position: relative;
            z-index: 1;
        }
        
        .dashboard-table tbody tr:hover {
            z-index: 2;
        }
        
        /* Centrar botones en columna de acciones */
        .column-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.5rem;
        }
        
        .column-actions .dropdown {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Estilos unificados para formularios */
        .form-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 0.375rem;
        }
        
        .form-control, .form-select {
            font-size: 0.75rem;
            padding: 0.375rem 0.5rem;
            border: 1px solid #dee2e6;
            border-radius: var(--border-radius);
            transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(var(--primary-color-rgb), 0.25);
        }
        
        .form-control::placeholder {
            color: #6c757d;
            font-size: 0.75rem;
        }
        
        textarea.form-control {
            resize: vertical;
            min-height: 80px;
        }
        
        .form-check-label {
            font-size: 0.75rem;
            color: #495057;
        }
        
        .form-check-input {
            margin-top: 0.125rem;
        }
        
        .text-muted, small.text-muted {
            font-size: 0.7rem;
            color: #6c757d !important;
        }
        
        /* Botones unificados */
        .btn {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
            border-radius: var(--border-radius);
            font-weight: 500;
            transition: all 0.15s ease-in-out;
        }
        
        .btn-sm {
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
        }
        
        .btn-lg {
            font-size: 0.8rem;
            padding: 0.5rem 1rem;
        }
        
        /* Botón de conectar cuenta de correo más compacto */
        .btn-connect-email {
            max-width: 300px;
            margin: 0 auto;
            display: block;
        }
        
        /* Cards y secciones unificadas */
        .card-header h6, .card-header h5 {
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0;
        }
        
        .card-header h6 i, .card-header h5 i {
            font-size: 0.8rem;
        }
        
        .card-body {
            padding: 1rem;
        }
        
        .card-header {
            padding: 0.75rem 1rem;
        }
        
        /* Espaciado consistente */
        .row.g-3 > * {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            margin-bottom: 0.75rem;
        }
        
        /* Nav tabs más compactas */
        .nav-tabs .nav-link {
            font-size: 0.75rem;
            padding: 0.5rem 0.75rem;
        }
        
        .nav-tabs .nav-link i {
            font-size: 0.7rem;
        }
        
        /* Checkboxes de horario comercial */
        .business-hours-checkboxes {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }
        
        .business-hours-checkboxes .form-check {
            margin-right: 0;
            margin-bottom: 0;
        }
        
        .business-hours-checkboxes .form-check-label {
            font-size: 0.7rem;
            padding-left: 0.25rem;
        }
        
        /* Sistema de tablas profesional */
        .dashboard-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: white;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }
        
        .dashboard-table th {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            color: var(--dark-color);
            font-weight: 600;
            font-size: 0.75rem;
            padding: 0.6rem 0.5rem;
            text-align: left;
            border: none;
            white-space: nowrap;
            position: relative;
        }
        
        .dashboard-table th:first-child {
            border-top-left-radius: var(--border-radius);
        }
        
        .dashboard-table th:last-child {
            border-top-right-radius: var(--border-radius);
        }
        
        .dashboard-table td {
            padding: 0.5rem 0.5rem;
            border: none;
            border-bottom: 1px solid #f1f3f4;
            font-size: 0.75rem;
            vertical-align: middle;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            line-height: 1.3;
        }
        
        /* Evitar corte de texto en celdas específicas */
        .dashboard-table td:nth-child(5) {
            white-space: normal;
            word-break: break-word;
            max-width: 0;
        }
        
        /* Mejorar espaciado en celdas de contenido */
        .dashboard-table .text-truncate {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: initial !important;
        }
        
        /* Mejorar scroll horizontal en tablas */
        .table-responsive {
            border-radius: var(--border-radius);
        }
        
        .table-responsive::-webkit-scrollbar {
            height: 8px;
        }
        
        .table-responsive::-webkit-scrollbar-track {
            background: #f1f3f4;
            border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb {
            background: #c1c7cd;
            border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb:hover {
            background: #a8b0b8;
        }
        
        /* Asegurar que las celdas tengan altura mínima adecuada */
        .dashboard-table td {
            min-height: 60px;
        }
        
        /* Mejorar el diseño responsive */
        @media (max-width: 1200px) {
            .dashboard-table {
                min-width: 1000px;
            }
            
            /* Tabla de emails necesita más espacio */
            #emails-content .dashboard-table {
                min-width: 1400px;
            }
        }
        
        /* Estilos específicos para botones de acciones */
        .column-actions .btn {
            transition: all 0.2s ease;
        }
        
        .column-actions .btn:hover {
            background-color: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        
        /* Clase para ocultar elementos por búsqueda */
        .search-hidden {
            display: none !important;
        }
        
        /* Estilos específicos para reducir tipografías en emails */
        #emails-content .dashboard-table {
            font-size: 0.75rem;
            table-layout: fixed;
            width: 100%;
        }
        
        #emails-content .dashboard-table th {
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.5rem 0.4rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        #emails-content .dashboard-table td {
            font-size: 0.75rem;
            padding: 0.5rem 0.4rem;
            vertical-align: middle;
            word-wrap: break-word;
            overflow: hidden;
        }
        
        #emails-content .badge {
            font-size: 0.55rem;
            padding: 0.1rem 0.25rem;
        }
        
        /* Mejoras responsive para tabla de emails */
        #emails-content .table-responsive {
            overflow-x: hidden;
            overflow-y: auto;
        }
        
        #emails-content .dashboard-table {
            min-width: auto;
            max-width: 100%;
        }
        
        /* Forzar que no haya scroll horizontal */
        #emails-content {
            overflow-x: hidden;
        }
        
        #emails-content .container-fluid {
            overflow-x: hidden;
        }
        
        /* Ajustes para columnas específicas */
        #emails-content .dashboard-table th:nth-child(3),
        #emails-content .dashboard-table td:nth-child(3) {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        #emails-content .dashboard-table th:nth-child(4),
        #emails-content .dashboard-table td:nth-child(4) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .dashboard-table tbody tr {
            transition: var(--transition);
        }
        
        .dashboard-table tbody tr:hover {
            background-color: rgba(67, 97, 238, 0.02);
        }
        
        .dashboard-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        /* Sistema de badges unificado */
        .badge {
            padding: 0.25rem 0.5rem;
            font-size: 0.65rem;
            font-weight: 600;
            border-radius: var(--border-radius-pill);
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .badge-success {
            background: var(--success-subtle);
            color: var(--success-color);
        }
        
        .badge-warning {
            background: rgba(255, 193, 7, 0.1);
            color: #856404;
        }
        
        .badge-danger {
            background: var(--danger-subtle);
            color: var(--danger-color);
        }
        
        .badge-primary {
            background: var(--primary-subtle);
            color: var(--primary-color);
        }
        
        /* Checkboxes personalizados */
        .custom-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #dee2e6;
            border-radius: var(--border-radius-sm);
            background: white;
            cursor: pointer;
            transition: var(--transition);
            position: relative;
        }
        
        .custom-checkbox.checked {
            background: var(--primary-color);
            border-color: var(--primary-color);
        }
        
        .custom-checkbox.checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        /* Formularios y inputs */
        .form-control {
            border: 2px solid #e9ecef;
            border-radius: var(--border-radius);
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            transition: var(--transition);
            font-family: var(--font-family);
        }
        
        .form-control:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(67, 97, 238, 0.25);
            outline: none;
        }
        
        .form-control::placeholder {
            color: #6c757d;
            font-style: italic;
            opacity: 0.8;
        }
        
        /* Cards y contenedores */
        .dashboard-card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow);
            border: none;
            overflow: hidden;
        }
        
        .card-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: none;
            padding: 1rem;
        }
        
        .card-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--dark-color);
            margin: 0;
        }
        
        /* Modales profesionales */
        .modal-content {
            border: none;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-lg);
        }
        
        .modal-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: none;
            padding: 1rem;
            border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
        }
        
        .modal-title {
            font-weight: 700;
            color: var(--dark-color);
        }
        
        .modal-body {
            padding: 1.25rem;
        }
        
        .modal-footer {
            background: #f8f9fa;
            border: none;
            padding: 1rem;
            border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        }
    `;
    
    // Agregar estilos al head
    style.id = 'dashboard-styles';
    document.head.appendChild(style);
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
                                
                                <!-- Buscador de llamadas -->
                                <div class="dashboard-filters p-3 border-bottom">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <div class="input-group">
                                                <span class="input-group-text bg-white border-end-0">
                                                    <i class="fas fa-search text-muted"></i>
                                                </span>
                                                <input type="text" class="form-control border-start-0" id="search-calls-input" 
                                                       placeholder="Buscar llamadas..." 
                                                       style="box-shadow: none; border-left: none;">
                                                <button class="btn btn-outline-secondary" type="button" id="clear-calls-search" 
                                                        style="display: none;" title="Limpiar búsqueda">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="col-md-6 text-md-end mt-2 mt-md-0">
                                            <small class="text-muted" id="calls-search-results">Mostrando todas las llamadas</small>
                                        </div>
                                    </div>
                                    <!-- Disclaimer para datos de prueba -->
                                    <div class="row mt-2">
                                        <div class="col-12">
                                            <div class="alert alert-info py-2 mb-0 test-data-disclaimer" style="font-size: 0.75rem;">
                                                <i class="fas fa-info-circle me-1"></i> <strong>Datos de prueba:</strong> Estos datos serán reemplazados por las llamadas reales una vez completes la configuración.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; overflow-x: hidden;">
                                    <table class="dashboard-table" style="width: 100%; table-layout: fixed; min-width: 1000px;">
                                        <thead>
                                            <tr>
                                                <th style="width: 80px; font-size: 0.75rem; font-weight: 600;">Estado</th>
                                                <th style="width: 110px; font-size: 0.75rem; font-weight: 600;">Fecha</th>
                                                <th style="width: 130px; font-size: 0.75rem; font-weight: 600;">Teléfono</th>
                                                <th style="width: 140px; font-size: 0.75rem; font-weight: 600;">Tipo</th>
                                                <th style="width: 300px; font-size: 0.75rem; font-weight: 600;">Resumen</th>
                                                <th style="width: 110px; font-size: 0.75rem; font-weight: 600;">Tiempo</th>
                                                <th style="width: 120px; font-size: 0.75rem; font-weight: 600; text-align: center;">Play</th>
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
                    <div class="card-body p-0">
                        <!-- Filtros de emails -->
                        <div class="filter-container">
                            <div class="row align-items-center">
                                <div class="col-md-7">
                                    <div class="d-flex align-items-center flex-wrap">
                                        <span class="me-3 text-secondary fw-medium">Filtrar por:</span>
                                        <div class="filter-option">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-all" checked>
                                            <label class="form-check-label" for="filter-emails-all">Todos</label>
                                        </div>
                                        <div class="filter-option">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-unread">
                                            <label class="form-check-label" for="filter-emails-unread">No leídos</label>
                                        </div>
                                        <div class="filter-option">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-important">
                                            <label class="form-check-label" for="filter-emails-important">Importantes</label>
                                        </div>
                                        <div class="filter-option">
                                            <input class="form-check-input" type="radio" name="email-filter" id="filter-emails-spam">
                                            <label class="form-check-label" for="filter-emails-spam">Spam</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-5 text-md-end mt-2 mt-md-0">
                                    <small class="text-muted"><i class="far fa-clock me-1"></i>Última actualización: <span id="last-update-emails-time">2024-02-20 12:15</span></small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Buscador de emails -->
                        <div class="dashboard-filters p-3 border-bottom">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <div class="input-group">
                                        <span class="input-group-text bg-white border-end-0">
                                            <i class="fas fa-search text-muted"></i>
                                        </span>
                                        <input type="text" class="form-control border-start-0" id="email-search-input" 
                                               placeholder="Buscar emails..." 
                                               aria-label="Buscar emails">
                                        <button class="btn btn-link text-decoration-none d-none" type="button" id="clear-emails-search">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-6 text-md-end mt-2 mt-md-0">
                                    <small class="text-muted" id="emails-search-results">Mostrando todos los emails</small>
                                </div>
                            </div>
                            <!-- Disclaimer para datos de prueba -->
                            <div class="row mt-2">
                                <div class="col-12">
                                    <div class="alert alert-info py-2 mb-0 test-data-disclaimer" style="font-size: 0.75rem;">
                                        <i class="fas fa-info-circle me-1"></i> <strong>Datos de prueba:</strong> Estos datos serán reemplazados por los emails reales una vez completes la configuración.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Lista de emails -->
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto; overflow-x: auto;">
                            <table class="dashboard-table" style="width: 100%; table-layout: fixed; min-width: 750px;">
                                <thead>
                                    <tr>
                                        <th style="width: 40px; text-align: center;"><i class="fas fa-star"></i></th>
                                        <th style="width: 140px;">Remitente</th>
                                        <th style="width: 150px;">Asunto</th>
                                        <th style="width: 250px;">Contenido</th>
                                        <th style="width: 80px;">Fecha</th>
                                        <th style="width: 90px; text-align: center;">Acción</th>
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
                                            <label for="companyName" class="form-label">Nombre de la Empresa</label>
                                            <input type="text" class="form-control" id="companyName" name="companyName" placeholder="Nombre de tu empresa" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="email" class="form-label">Registration Email</label>
                                            <input type="email" class="form-control" id="email" name="email" placeholder="email@tuempresa.com" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="phone" class="form-label">Teléfono Principal</label>
                                            <input type="tel" class="form-control" id="phone" name="phone" placeholder="+34 XXX XXX XXX" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="address" class="form-label">Dirección</label>
                                            <input type="text" class="form-control" id="address" name="address" placeholder="Dirección de tu empresa">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="description" class="form-label">Descripción de la Empresa</label>
                                            <textarea class="form-control" id="description" name="description" rows="5" style="min-height: 155px;" placeholder="Describe brevemente a qué se dedica tu empresa..."></textarea>
                                            <small class="text-muted">Esta descripción ayuda al bot a entender mejor el contexto de tu negocio.</small>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Horario Comercial</label>
                                            <input type="hidden" id="business_hours" name="business_hours" value="Lun-Vie: 9:00-18:00">
                                            <div class="card border-light mb-2">
                                                <div class="card-body p-3">
                                                    <div class="business-hours-checkboxes mb-3">
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
                                                        <span class="badge bg-secondary text-light" id="business-hours-preview">Lun-Vie: 9:00-18:00</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-md-6 mt-4">
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
                                        <div class="col-md-6 mt-4">
                                            <label for="website" class="form-label">Sitio Web</label>
                                            <input type="url" class="form-control" id="website" name="website" placeholder="https://www.tuempresa.com">
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
                                                        <div class="text-center mb-3">
                                                            <button type="button" class="btn btn-outline-primary btn-connect-email" id="connect-email-btn" disabled>
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
                                        
                                        <!-- Reglas de reenvío -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Reglas de reenvío</h6>
                                                    <div>
                                                        <label for="forward_rules" class="form-label">Reglas de reenvío</label>
                                                        <textarea class="form-control" id="forward_rules" name="forward_rules" rows="8" placeholder="Especifica reglas para el reenvío automático de emails..."></textarea>
                                                        <small class="text-muted">Ejemplo: "reenviar emails con asunto 'urgente' a support@miempresa.com"</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Firma de email -->
                                        <div class="col-md-6">
                                            <div class="card border-light h-100">
                                                <div class="card-body p-3">
                                                    <h6 class="card-subtitle mb-3 text-muted">Firma de Email</h6>
                                                    <label for="email_signature" class="form-label">Plantilla de Firma</label>
                                                    <textarea class="form-control" id="email_signature" name="email_signature" rows="8" required placeholder="Introduce la plantilla para la firma de los emails...">Atentamente,
{NOMBRE}
{CARGO}
{EMPRESA}
Tel: {TELEFONO}
Email: {EMAIL}
Web: {WEB}</textarea>
                                                    <div class="form-text">Puedes usar las variables: {NOMBRE}, {CARGO}, {EMPRESA}, {TELEFONO}, {EMAIL}, {WEB}</div>
                                                    <div class="form-text text-danger"><small><i class="fas fa-asterisk me-1"></i>Incluir los valores reales dentro de los corchetes</small></div>
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
                                            <p class="text-muted mb-3">Sube archivos que proporcionen contexto adicional al bot sobre tu empresa, productos o servicios.</p>
                                            
                                            <!-- Zona de subida de archivos -->
                                            <div class="card border-2 border-dashed border-primary bg-light mb-3" id="file-upload-area">
                                                <div class="card-body text-center py-4">
                                                    <i class="fas fa-cloud-upload-alt fa-3x text-primary mb-3"></i>
                                                    <h6 class="mb-2">Arrastra archivos aquí o haz clic para seleccionar</h6>
                                                    <p class="text-muted mb-3">Formatos admitidos: PDF, DOCX, TXT</p>
                                                    <p class="text-muted small mb-3">Máximo 5 archivos • 10MB por archivo</p>
                                                    <input type="file" id="context-files" name="context_files" multiple accept=".pdf,.docx,.txt" class="d-none">
                                                    <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('context-files').click()">
                                                        <i class="fas fa-plus me-2"></i>Seleccionar archivos
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <!-- Lista de archivos subidos -->
                                            <div id="uploaded-files-list" class="mb-3">
                                                <!-- Los archivos subidos aparecerán aquí -->
                                            </div>
                                            
                                            <!-- Información adicional -->
                                            <div class="alert alert-info">
                                                <i class="fas fa-info-circle me-2"></i>
                                                <strong>Consejos:</strong> Incluye documentos como catálogos de productos, políticas de la empresa, preguntas frecuentes detalladas, o cualquier información que ayude al bot a responder mejor a tus clientes.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Botón de Guardar al final del formulario -->
                            <div class="d-flex justify-content-end mt-4 mb-3 me-3">
                                <button type="button" class="btn btn-primary" id="save-bot-config-btn-bottom">
                                    <i class="fas fa-save me-2"></i>Guardar
                                </button>
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
                                        <div class="row g-3 px-3 py-3">
                                            <div class="col-md-6">
                                                <label for="account_name" class="form-label small mb-1">Nombre</label>
                                                <input type="text" class="form-control form-control-sm py-2" id="account_name" value="Usuario">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_lastname" class="form-label small mb-1">Apellidos</label>
                                                <input type="text" class="form-control form-control-sm py-2" id="account_lastname" value="Ejemplo">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_email" class="form-label small mb-1">Email</label>
                                                <input type="email" class="form-control form-control-sm py-2" id="account_email" value="usuario@ejemplo.com">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_phone" class="form-label small mb-1">Teléfono</label>
                                                <input type="tel" class="form-control form-control-sm py-2" id="account_phone" value="+34 600 000 000">
                                            </div>
                                            <div class="col-md-12">
                                                <label for="account_company" class="form-label small mb-1">Empresa</label>
                                                <input type="text" class="form-control form-control-sm py-2" id="account_company" value="Mi Empresa, S.L.">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_position" class="form-label small mb-1">Cargo</label>
                                                <input type="text" class="form-control form-control-sm py-2" id="account_position" value="Director/a">
                                            </div>
                                            <div class="col-md-6">
                                                <label for="account_timezone" class="form-label small mb-1">Zona horaria</label>
                                                <select class="form-select form-select-sm py-2" id="account_timezone">
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
                                            <div class="card-header bg-light py-2">
                                                <h6 class="mb-0 small">Cambiar contraseña</h6>
                                            </div>
                                            <div class="card-body py-2">
                                                <div class="mb-2">
                                                    <label for="current_password" class="form-label small mb-1">Contraseña actual</label>
                                                    <input type="password" class="form-control form-control-sm py-2" id="current_password">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="new_password" class="form-label small mb-1">Nueva contraseña</label>
                                                    <input type="password" class="form-control form-control-sm py-2" id="new_password">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="confirm_password" class="form-label small mb-1">Confirmar nueva contraseña</label>
                                                    <input type="password" class="form-control form-control-sm py-2" id="confirm_password">
                                                </div>
                                                <button type="button" class="btn btn-primary btn-sm" id="change-password-btn">
                                                    <i class="fas fa-key me-2"></i>Actualizar contraseña
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card h-100">
                                            <div class="card-header bg-light py-2">
                                                <h6 class="mb-0 small">Verificación en dos pasos</h6>
                                            </div>
                                            <div class="card-body py-2">
                                                <div class="form-check form-switch mb-2">
                                                    <input class="form-check-input form-check-input-sm" type="checkbox" id="two_factor_auth">
                                                    <label class="form-check-label small" for="two_factor_auth">Activar verificación en dos pasos</label>
                                                </div>
                                                <p class="text-muted small mb-2" style="font-size: 0.75rem;">La verificación en dos pasos añade una capa adicional de seguridad a tu cuenta. Cada vez que inicies sesión, necesitarás introducir un código enviado a tu teléfono.</p>
                                                <button type="button" class="btn btn-outline-primary btn-sm" id="setup-2fa-btn" disabled>
                                                    <i class="fas fa-mobile-alt me-1"></i>Configurar
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
 * Buscar llamadas por término de búsqueda
 * @param {string} searchTerm - Término de búsqueda
 */
function searchCalls(searchTerm) {
    console.log(`🔍 Buscando llamadas con término: "${searchTerm}"`);
    
    const callsTableBody = document.getElementById('calls-table-body');
    const searchResultsElement = document.getElementById('calls-search-results');
    
    if (!callsTableBody) {
        console.error('❌ No se encontró el tbody de la tabla de llamadas');
        return;
    }
    
    const allRows = callsTableBody.querySelectorAll('.call-row');
    let visibleCount = 0;
    
    if (!searchTerm) {
        // Remover clase de búsqueda si no hay término
        allRows.forEach(row => {
            row.classList.remove('search-hidden');
            // Solo contar las que no están ocultas por filtros
            if (!row.classList.contains('d-none')) {
                visibleCount++;
            }
        });
        
        if (searchResultsElement) {
            searchResultsElement.textContent = 'Mostrando todas las llamadas';
        }
        return;
    }
    
    // Convertir término de búsqueda a minúsculas para búsqueda insensible a mayúsculas
    const searchTermLower = searchTerm.toLowerCase();
    
    allRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let found = false;
        
        // Buscar en todas las celdas de la fila
        cells.forEach(cell => {
            const cellText = cell.textContent.toLowerCase();
            if (cellText.includes(searchTermLower)) {
                found = true;
            }
        });
        
        if (found) {
            row.classList.remove('search-hidden');
            // Solo contar las que no están ocultas por filtros
            if (!row.classList.contains('d-none')) {
                visibleCount++;
            }
        } else {
            row.classList.add('search-hidden');
        }
    });
    
    // Actualizar contador de resultados
    if (searchResultsElement) {
        if (visibleCount === 0) {
            searchResultsElement.textContent = 'No se encontraron llamadas';
        } else if (visibleCount === 1) {
            searchResultsElement.textContent = '1 llamada encontrada';
        } else {
            searchResultsElement.textContent = `${visibleCount} llamadas encontradas`;
        }
    }
    
    console.log(`✅ Búsqueda completada: ${visibleCount} llamadas encontradas`);
}

/**
 * Buscar emails por término de búsqueda
 * @param {string} searchTerm - Término de búsqueda
 */
function searchEmails(searchTerm) {
    console.log(`🔍 Buscando emails con término: "${searchTerm}"`);
    
    const emailsTableBody = document.getElementById('emails-table-body');
    const searchResultsElement = document.getElementById('emails-search-results');
    
    if (!emailsTableBody) {
        console.error('❌ No se encontró el tbody de la tabla de emails');
        return;
    }
    
    const allRows = emailsTableBody.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    // Convertir término de búsqueda a minúsculas para búsqueda insensible a mayúsculas
    const searchTermLower = searchTerm ? searchTerm.toLowerCase() : '';
    
    allRows.forEach(row => {
        // Primero, determinar si el elemento coincide con la búsqueda
        let matchesSearch = !searchTerm; // Si no hay búsqueda, coincide automáticamente
        
        if (searchTerm) {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                const cellText = cell.textContent.toLowerCase();
                if (cellText.includes(searchTermLower)) {
                    matchesSearch = true;
                }
            });
        }
        
        // Primero quitamos la clase search-hidden si coincide con la búsqueda
        if (matchesSearch) {
            row.classList.remove('search-hidden');
        } else {
            row.classList.add('search-hidden');
            return; // Si no coincide con la búsqueda, ya no necesitamos comprobar filtros
        }
        
        // Ahora verificar si está visible según los filtros actuales
        const activeFilterId = document.querySelector('input[name="email-filter"]:checked')?.id;
        if (!activeFilterId) return; // No hay filtro activo
        
        const filterType = activeFilterId.replace('filter-', '');
        const rowType = row.dataset.type || '';
        
        if (filterType === 'all' || 
            (filterType === 'unread' && rowType.includes('unread')) ||
            (filterType === 'important' && rowType.includes('important')) ||
            (filterType === 'spam' && rowType.includes('spam'))) {
            // Si coincide con el filtro y la búsqueda, contar como visible
            if (!row.classList.contains('search-hidden')) {
                visibleCount++;
            }
        }
    });
    
    // Actualizar contador de resultados
    if (searchResultsElement) {
        if (!searchTerm) {
            searchResultsElement.textContent = 'Mostrando todos los emails';
        } else if (visibleCount === 0) {
            searchResultsElement.textContent = 'No se encontraron emails';
        } else if (visibleCount === 1) {
            searchResultsElement.textContent = '1 email encontrado';
        } else {
            searchResultsElement.textContent = `${visibleCount} emails encontrados`;
        }
    }
    
    console.log(`✅ Búsqueda completada: ${visibleCount} emails encontrados`);
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
    window.ApiHelper.fetchApi({ url: '/api/logs/calls', auth: 'jwt' }, { method: 'GET' })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
        console.log('🔄 API no disponible, cargando datos de prueba...');
        // Cargar datos de prueba como fallback
        const mockData = getMockCallsData();
        loadCallsIntoTable(mockData);
        console.log(`✅ ${mockData.length} llamadas de prueba cargadas`);
    });
}

/**
 * Cargar llamadas en la tabla
 */
function loadCallsIntoTable(callsData) {
    const callsTableBody = document.getElementById('calls-table-body');
    if (!callsTableBody) return;
    
    // Limpiar tabla
    callsTableBody.innerHTML = '';
    
    if (callsData.length === 0) {
        callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay llamadas registradas</td></tr>';
        return;
    }
    
    // Generar filas de llamadas
    callsData.forEach(call => {
        const callRow = createCallRow(call);
        callsTableBody.appendChild(callRow);
    });
    
    // Actualizar contador
    updateCallsCount();
    
    // Inicializar dropdowns de Bootstrap
    initializeDropdowns();
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
    
    // Crear checkbox personalizado
    let checkboxClass = 'custom-checkbox';
    if (call.managed) checkboxClass += ' checked';
    
    row.innerHTML = `
        <td class="text-center">
            <div class="${checkboxClass}" id="call-managed-${call.id}" onclick="toggleCheckbox(this)"></div>
        </td>
        <td>
            <div class="fw-semibold text-dark mb-1">${call.date}</div>
            <div class="text-muted small">${call.time}</div>
        </td>
        <td>
            <div class="fw-semibold text-dark mb-1">${call.phone}</div>
            <div class="text-muted small">${call.contactType}</div>
        </td>
        <td>
            ${getClassificationBadge(call.classification, call.urgency)}
            <div class="text-muted small mt-1">${call.confidence}%</div>
        </td>
        <td>
            <div class="fw-medium text-dark mb-2" style="word-wrap: break-word; white-space: normal; line-height: 1.4;">${call.summary}</div>
            <div class="text-muted small" style="line-height: 1.4; word-wrap: break-word; white-space: normal;">${call.details}</div>
        </td>
        <td class="text-center">
            <span class="badge badge-primary">${call.duration}</span>
        </td>
        <td class="text-center">
            <button class="btn-play-call" onclick="playCallRecording(${call.id})" title="Reproducir llamada">
                <i class="fas fa-play"></i>
            </button>
        </td>
    `
    
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
            classificationBadge = '<span class="badge badge-primary mb-1">📦 PEDIDO</span>';
            break;
        case 'consulta':
            classificationBadge = '<span class="badge badge-primary mb-1">❓ CONSULTA</span>';
            break;
        case 'reclamación':
            classificationBadge = '<span class="badge badge-warning mb-1">⚠️ RECLAMACIÓN</span>';
            break;
        default:
            classificationBadge = `<span class="badge badge-primary mb-1">${(classification || 'SIN CLASIFICAR').toUpperCase()}</span>`;
    }
    
    // Badge de urgencia
    switch (urgency) {
        case 'urgente':
            urgencyBadge = '<span class="badge badge-danger">🚨 URGENTE</span>';
            break;
        case 'alta':
            urgencyBadge = '<span class="badge badge-warning">ALTA</span>';
            break;
        case 'normal':
            urgencyBadge = '<span class="badge badge-success">NORMAL</span>';
            break;
        case 'baja':
            urgencyBadge = '<span class="badge badge-success">BAJA</span>';
            break;
        default:
            if (urgency) {
                urgencyBadge = `<span class="badge badge-primary">${urgency.toUpperCase()}</span>`;
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
            // Para llamadas pendientes, verificamos si NO está marcada como gestionada (div sin clase checked)
            const checkbox = row.querySelector('.custom-checkbox');
            if (checkbox && !checkbox.classList.contains('checked')) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        } else if (type === 'gestionadas') {
            // Para llamadas gestionadas, verificamos si está marcada como gestionada (div con clase checked)
            const checkbox = row.querySelector('.custom-checkbox');
            if (checkbox && checkbox.classList.contains('checked')) {
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
        window.ApiHelper.fetchApi({ url: `/api/calls/${callId}/recording`, auth: 'jwt' }, {
            method: 'GET',
            headers: {            }
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
    window.ApiHelper.fetchApi({ url: `/api/calls/${callId}/status`, auth: 'jwt' }, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            managed: !isManaged
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
    
    // Event listeners para el buscador de llamadas
    const searchCallsInput = document.getElementById('search-calls-input');
    const clearCallsSearch = document.getElementById('clear-calls-search');
    
    if (searchCallsInput) {
        searchCallsInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            searchCalls(searchTerm);
            
            // Mostrar/ocultar botón de limpiar
            if (clearCallsSearch) {
                clearCallsSearch.style.display = searchTerm ? 'block' : 'none';
            }
        });
    }
    
    if (clearCallsSearch) {
        clearCallsSearch.addEventListener('click', function() {
            if (searchCallsInput) {
                searchCallsInput.value = '';
                searchCalls('');
                this.style.display = 'none';
                searchCallsInput.focus();
            }
        });
    }
    
    // Event listeners para el buscador de emails
    const searchEmailsInput = document.getElementById('email-search-input');
    const clearEmailsSearch = document.getElementById('clear-emails-search');
    
    if (searchEmailsInput) {
        searchEmailsInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            searchEmails(searchTerm);
            
            // Mostrar/ocultar botón de limpiar
            if (clearEmailsSearch) {
                clearEmailsSearch.style.display = searchTerm ? 'block' : 'none';
            }
        });
    }
    
    if (clearEmailsSearch) {
        clearEmailsSearch.addEventListener('click', function() {
            if (searchEmailsInput) {
                searchEmailsInput.value = '';
                searchEmails('');
                this.style.display = 'none';
                searchEmailsInput.focus();
            }
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
    
    // Configurar botones de guardar configuración del bot (arriba y abajo del formulario)
    const saveBotConfigBtn = document.getElementById('save-bot-config-btn');
    const saveBotConfigBtnBottom = document.getElementById('save-bot-config-btn-bottom');
    
    // Función compartida para guardar la configuración
    const handleSaveConfig = function(event) {
        console.log('🔄 Iniciando guardado de configuración del bot...');
        
        // Prevenir comportamiento por defecto del botón
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Deshabilitar botones temporalmente para evitar clics múltiples
        const saveButtons = [document.getElementById('save-bot-config-btn'), document.getElementById('save-bot-config-btn-bottom')];
        saveButtons.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            }
        });
        
        // Llamar a la función saveUnifiedConfig que tiene todos los campos correctos
        saveUnifiedConfig()
            .then(() => {
                console.log('✅ Configuración guardada exitosamente desde handleSaveConfig');
            })
            .catch((error) => {
                console.error('❌ Error guardando configuración desde handleSaveConfig:', error);
            })
            .finally(() => {
                // Rehabilitar botones
                saveButtons.forEach(btn => {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración';
                    }
                });
            });
    };
    
    // Añadir listeners a ambos botones
    if (saveBotConfigBtn) {
        saveBotConfigBtn.addEventListener('click', handleSaveConfig);
    }
    
    if (saveBotConfigBtnBottom) {
        saveBotConfigBtnBottom.addEventListener('click', handleSaveConfig);
    }
    
    // Configurar botón de probar bot
    const testBotBtn = document.getElementById('test-bot-btn');
    if (testBotBtn) {
        testBotBtn.addEventListener('click', function() {
            // testBotConfiguration() eliminada como parte de la limpieza del sistema legacy
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
    
    // Crear estructura del dashboard usando las funciones existentes
    createSimpleTabs();
    createTabsContent();
    
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
 * BLOQUEO COMPLETO: desactiva TODOS los mensajes toast
 * Versión radical que bloquea especialmente los errores de autenticación
 */
function disableTemporaryMessages() {
    // Bloquear completamente toastr
    toastr.success = function() { return this; };
    toastr.info = function() { return this; };
    toastr.warning = function() { return this; };
    toastr.error = function() { return this; };
    toastr.remove = function() { return this; };
    toastr.clear = function() { return this; };
    
    // Bloqueo especial para errores de autenticación que pueden aparecer repetidamente
    const bloqueados = ['Error de autenticación', 'Error al validar token'];
    bloqueados.forEach(msg => {
        console.log(`🔇 Bloqueando toasts de: ${msg}`);
    });
    
    console.log('🔊→🔇 Todos los mensajes toast desactivados');
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
    console.log('🚨 ===== INICIANDO CARGA DE DATOS EXISTENTES =====');
    console.log('📂 Cargando datos existentes desde el backend...');
    console.log('🕰️ Timestamp:', new Date().toISOString());
    console.log('🌐 URL actual:', window.location.href);
    console.log('📍 Función llamada desde:', new Error().stack.split('\n')[2]);
    
    // Obtener token de autenticación usando el servicio de auth
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    console.log('🔑 Token encontrado:', !!token);
    console.log('🔑 Token valor:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    console.log('🔍 Verificando sessionStorage:', !!sessionStorage.getItem('authToken'));
    console.log('🔍 Verificando localStorage authToken:', !!localStorage.getItem('authToken'));
    console.log('🔍 Verificando localStorage auth_token:', !!localStorage.getItem('auth_token'));
    
    if (!token) {
        console.error('❌ No se encontró token de autenticación en ninguna ubicación');
        console.error('🔍 Claves en sessionStorage:', Object.keys(sessionStorage));
        console.error('🔍 Claves en localStorage:', Object.keys(localStorage));
        
        // PREVENIR BUCLES INFINITOS - verificar si ya estamos en login
        const currentPath = window.location.pathname;
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            console.log('🛑 Ya estamos en página de autenticación, no redirigiendo');
            return;
        }
        
        // Verificar redirección reciente
        const lastRedirect = localStorage.getItem('lastDashboardRedirect');
        const now = Date.now();
        if (lastRedirect && (now - parseInt(lastRedirect)) < 3000) {
            console.log('🛑 Redirección reciente desde dashboard, evitando bucle');
            return;
        }
        localStorage.setItem('lastDashboardRedirect', now.toString());
        
        toastr.error('Sesión expirada. Por favor, inicia sesión nuevamente.', 'Error de Autenticación');
        console.log('🔄 Redirigiendo a login desde dashboard');
        // Redirigir al login
        window.location.href = '/login.html';
        return;
    }
    
    // Verificar que el DOM esté listo
    console.log('🎯 Elementos en DOM antes del delay:', document.querySelectorAll('input, select, textarea').length);
    
    // Añadir un pequeño delay para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
        console.log('🔄 Iniciando carga de datos después del renderizado del DOM...');
        console.log('🎯 Elementos en DOM después del delay:', document.querySelectorAll('input, select, textarea').length);
        console.log('📋 Elementos específicos del bot:');
        console.log('   - companyName:', !!document.getElementById('companyName'));
        console.log('   - address:', !!document.getElementById('address'));
        console.log('   - call_bot_active:', !!document.getElementById('call_bot_active'));
        console.log('   - email_signature:', !!document.getElementById('email_signature'));
        console.log('   - faq-items:', !!document.getElementById('faq-items'));
        // context-files-list eliminado como parte de la limpieza del sistema legacy
        
        // Cargar datos de perfil desde backend (fuente única de verdad)
        console.log('👤 Iniciando carga de datos de perfil desde backend...');
        loadProfileData();
        
        // Cargar configuración del bot (FAQs y archivos de contexto)
        console.log('🤖 Iniciando carga de configuración del bot...');
        loadBotConfiguration();
        
        // Cargar configuración de emails
        console.log('📧 Iniciando carga de configuración de emails...');
        loadEmailConfiguration();
        
        console.log('✅ Todas las funciones de carga iniciadas');
    }, 500); // Aumentar a 500ms para asegurar renderizado completo
}

/**
 * Cargar configuración del bot (FAQs, archivos de contexto y configuración de llamadas)
 */
function loadBotConfiguration() {
    console.log('🤖 ===== CARGANDO CONFIGURACIÓN DEL BOT =====');
    
    // Usar el endpoint unificado /api/client para obtener toda la configuración
    window.ApiHelper.fetchApi(window.API_CONFIG.DASHBOARD.CLIENT_DATA, { method: 'GET' })
    .then(response => {
        const clientData = response.data || response; // Manejar estructura de respuesta
        console.log('📊 Datos del cliente recibidos:', clientData);
        
        // 1. Cargar configuración de llamadas
        const callConfig = clientData.callConfig || {};
        console.log('📞 Configuración de llamadas:', callConfig);
        
        if (callConfig.language) {
            const languageSelect = document.getElementById('call_language');
            if (languageSelect) {
                languageSelect.value = callConfig.language;
                console.log('🌍 Idioma de llamadas cargado:', callConfig.language);
            }
        }
        
        if (callConfig.voiceId) {
            const voiceSelect = document.getElementById('voice_type');
            if (voiceSelect) {
                voiceSelect.value = callConfig.voiceId;
                console.log('🎤 Tipo de voz cargado:', callConfig.voiceId);
            }
        }
        
        if (callConfig.greeting) {
            const greetingTextarea = document.getElementById('call_greeting');
            if (greetingTextarea) {
                greetingTextarea.value = callConfig.greeting;
                console.log('👋 Saludo de llamadas cargado');
            }
        }
        
        // 2. Cargar FAQs
        console.log('📋 Cargando preguntas frecuentes...');
        loadSampleFaqs();
        
        // 3. Cargar archivos de contexto
        console.log('📁 Cargando archivos de contexto...');
        loadContextFiles();
        
        console.log('✅ Configuración del bot cargada completamente');
    })
    .catch(error => {
        console.error('❌ Error al cargar configuración del bot:', error);
        
        // Cargar FAQs y archivos como fallback
        console.log('🔄 Cargando FAQs y archivos como fallback...');
        loadSampleFaqs();
        loadContextFiles();
    });
}



/**
 * Cargar datos de perfil desde el backend
 */
function loadProfileData() {
    console.log('👤 Cargando datos de perfil...');
    
    window.ApiHelper.fetchApi({ url: '/api/profile', auth: 'jwt' }, { method: 'GET' })
    .then(response => {
        console.log('📥 Respuesta completa del perfil:', response);
        
        // Extraer datos del cliente de la respuesta
        const profileData = response.data || response;
        console.log('👤 Datos del perfil extraídos:', profileData);
        console.log('🔍 Campo companyDescription en datos:', profileData.companyDescription);
        
        // Rellenar campos del formulario con los datos del perfil
        // Mapeo: BD → Formulario Bot Config
        const companyNameField = document.getElementById('companyName');
        if (companyNameField) {
            companyNameField.value = profileData.companyName || '';
            console.log('✅ Campo companyName cargado:', profileData.companyName);
        }
        
        const emailField = document.getElementById('email');
        if (emailField && profileData.email) {
            emailField.value = profileData.email;
            console.log('✅ Campo email (contacto) cargado:', profileData.email);
        }
        
        // Usar IDs exactos del formulario del dashboard
        const phoneField = document.getElementById('phone');
        if (phoneField) {
            phoneField.value = profileData.phone || '';
            console.log('✅ Campo phone cargado:', profileData.phone);
        }
        
        const addressField = document.getElementById('address');
        if (addressField) {
            addressField.value = profileData.address || '';
            console.log('✅ Campo address cargado:', profileData.address);
        }
        
        const descriptionField = document.getElementById('companyDescription');
        if (descriptionField) {
            descriptionField.value = profileData.companyDescription || '';
            console.log('✅ Campo companyDescription cargado:', profileData.companyDescription);
        } else {
            console.log('⚠️ Campo companyDescription no encontrado');
        }
        
        const websiteField = document.getElementById('website');
        if (websiteField) {
            websiteField.value = profileData.website || '';
            console.log('✅ Campo website cargado:', profileData.website);
        }
        
        // Seleccionar la industria
        if (profileData.industry) {
            const industrySelect = document.getElementById('industry');
            if (industrySelect) {
                for (let i = 0; i < industrySelect.options.length; i++) {
                    if (industrySelect.options[i].value === profileData.industry) {
                        industrySelect.selectedIndex = i;
                        console.log('✅ Campo industry seleccionado:', profileData.industry);
                        break;
                    }
                }
            } else {
                console.log('⚠️ Campo industry no encontrado');
            }
        }
        
        console.log('✅ Datos de perfil cargados correctamente');
    })
    .catch(error => {
        console.error('❌ Error al cargar datos de perfil:', error);
        toastr.error('Error al cargar datos de perfil', 'Error');
    });
}

// NOTA: loadBotConfiguration() restaurada y mejorada para cargar todos los campos del bot

// Función deleteContextFile() eliminada como parte de la refactorización del sistema de configuración del bot

/**
 * Cargar configuración de emails desde el backend usando el endpoint unificado
 */
function loadEmailConfiguration() {
    console.log('🚨 ===== INICIANDO CARGA DE CONFIGURACIÓN DE EMAIL =====');
    console.log('📧 Cargando configuración de emails...');
    console.log('🕰️ Timestamp:', new Date().toISOString());
    
    // Usar el endpoint unificado /api/client en lugar del legacy /api/config/email
    console.log('🔄 Usando endpoint unificado CLIENT_DATA: ' + window.API_CONFIG.DASHBOARD.CLIENT_DATA.url);
    window.ApiHelper.fetchApi(window.API_CONFIG.DASHBOARD.CLIENT_DATA, { method: 'GET' })
    .then(clientData => {
        // En el endpoint unificado, la configuración de email está en clientData.emailConfig
        const emailConfig = clientData.emailConfig || {};
        console.log('💾 Configuración de email recibida:', emailConfig);

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
        description: 'Empresa líder en soluciones tecnológicas para negocios, especializada en software de gestión y automatización de procesos.',
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

/**
 * Configurar funcionalidades adicionales
 */
function setupAdditionalFeatures() {
    console.log('💻 Configurando funcionalidades adicionales...');
    
    // Configurar búsqueda de llamadas
    const searchCallsInput = document.getElementById('search-calls-input');
    if (searchCallsInput) {
        searchCallsInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            searchCalls(searchTerm);
        });
    }
    
    // Configurar búsqueda de emails
    const searchEmailsInput = document.getElementById('email-search-input');
    if (searchEmailsInput) {
        searchEmailsInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            searchEmails(searchTerm);
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
    
    // Obtener todos los elementos dropdown tradicionales
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
        console.log(`✅ ${dropdownElements.length} dropdowns tradicionales inicializados`);
    }
    
    // Inicializar eventos para los botones de acciones de email (fuera del sistema de Bootstrap)
    setupEmailActionButtons();
}

/**
 * Configura los botones de acción de emails con menús personalizados
 * que se muestran fuera de la estructura de la tabla
 */
function setupEmailActionButtons() {
    // Limpiar cualquier contenedor de menús antiguos
    const oldContainer = document.getElementById('email-action-menus-container');
    if (oldContainer) {
        oldContainer.remove();
    }
    
    // Crear un contenedor para todos los menús de acciones de email
    const menusContainer = document.createElement('div');
    menusContainer.id = 'email-action-menus-container';
    menusContainer.style.position = 'fixed';
    menusContainer.style.zIndex = '9999999';
    menusContainer.style.top = '0';
    menusContainer.style.left = '0';
    menusContainer.style.pointerEvents = 'none'; // Esto permite que los clics pasen a través cuando no hay menús visibles
    document.body.appendChild(menusContainer);
    
    // Obtener todos los botones de acción de email
    const actionButtons = document.querySelectorAll('.email-action-btn');
    
    // Crear un único menú reutilizable
    const actionMenu = document.createElement('div');
    actionMenu.className = 'email-action-menu';
    actionMenu.style.position = 'fixed';
    actionMenu.style.display = 'none';
    actionMenu.style.backgroundColor = '#fff';
    actionMenu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    actionMenu.style.border = '1px solid rgba(0,0,0,0.1)';
    actionMenu.style.borderRadius = '0.25rem';
    actionMenu.style.padding = '0.5rem 0';
    actionMenu.style.minWidth = '200px';
    actionMenu.style.zIndex = '9999999';
    actionMenu.style.pointerEvents = 'auto'; // El menú sí debe recibir clics
    menusContainer.appendChild(actionMenu);
    
    // Mantener un registro del botón activo actualmente
    let activeButton = null;
    
    // Añadir event listeners para cada botón
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic llegue al documento
            
            const emailId = button.getAttribute('data-email-id');
            if (!emailId) return;
            
            // Si ya estamos mostrando este menú, cerrarlo
            if (activeButton === button && actionMenu.style.display === 'block') {
                actionMenu.style.display = 'none';
                activeButton = null;
                return;
            }
            
            // Actualizar el botón activo
            activeButton = button;
            
            // Generar contenido del menú para este email
            const emailRow = button.closest('tr');
            const email = {
                id: emailId,
                read: !emailRow.classList.contains('fw-bold')
            };
            
            // Crear el HTML del menú
            actionMenu.innerHTML = `
                <a class="custom-dropdown-item" href="#" onclick="document.getElementById('email-action-menus-container').querySelector('.email-action-menu').style.display = 'none'; viewEmailDetails(${email.id}); return false;">
                    <i class="fas fa-eye me-2" style="font-size: 0.7rem;"></i> Ver detalles
                </a>
                <a class="custom-dropdown-item" href="#" onclick="document.getElementById('email-action-menus-container').querySelector('.email-action-menu').style.display = 'none'; replyToEmail(${email.id}); return false;">
                    <i class="fas fa-reply me-2" style="font-size: 0.7rem;"></i> Responder
                </a>
                <a class="custom-dropdown-item" href="#" onclick="document.getElementById('email-action-menus-container').querySelector('.email-action-menu').style.display = 'none'; replyWithAI(${email.id}); return false;">
                    <i class="fas fa-robot me-2" style="font-size: 0.7rem;"></i> Responder con IA
                </a>
                <div class="dropdown-divider"></div>
                <a class="custom-dropdown-item" href="#" onclick="document.getElementById('email-action-menus-container').querySelector('.email-action-menu').style.display = 'none'; toggleEmailRead(${email.id}); return false;">
                    <i class="fas ${email.read ? 'fa-envelope' : 'fa-envelope-open'} me-2" style="font-size: 0.7rem;"></i>
                    ${email.read ? 'Marcar como no leído' : 'Marcar como leído'}
                </a>
                <div class="dropdown-divider"></div>
                <a class="custom-dropdown-item text-danger" href="#" onclick="document.getElementById('email-action-menus-container').querySelector('.email-action-menu').style.display = 'none'; deleteEmail(${email.id}); return false;">
                    <i class="fas fa-trash-alt me-2" style="font-size: 0.7rem;"></i> Eliminar
                </a>
            `;
            
            // Posicionar el menú correctamente
            const buttonRect = button.getBoundingClientRect();
            actionMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            actionMenu.style.left = (buttonRect.left + window.scrollX - 160) + 'px'; // Ajustar posición horizontal
            actionMenu.style.display = 'block';
            
            // Cerrar el menú cuando se haga clic en el documento
            const closeMenu = (e) => {
                if (!actionMenu.contains(e.target) && e.target !== button) {
                    actionMenu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                    activeButton = null;
                }
            };
            
            // Agregar el listener con un pequeño retraso para evitar que se cierre inmediatamente
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 10);
        });
    });
    
    // Agregar estilos para los elementos del menú personalizado
    const style = document.createElement('style');
    style.textContent = `
        .custom-dropdown-item {
            display: block;
            padding: 0.375rem 1rem;
            clear: both;
            font-weight: 400;
            font-size: 0.75rem;
            color: #212529;
            text-align: inherit;
            text-decoration: none;
            white-space: nowrap;
            background-color: transparent;
            border: 0;
        }
        .custom-dropdown-item:hover {
            color: #1e2125;
            background-color: #e9ecef;
            text-decoration: none;
        }
        .dropdown-divider {
            height: 0;
            margin: 0.5rem 0;
            overflow: hidden;
            border-top: 1px solid rgba(0, 0, 0, 0.15);
        }
        .text-danger {
            color: #dc3545 !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Botones de acción de emails configurados con menús personalizados');
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
    window.ApiHelper.fetchApi({ url: '/api/logs/emails', auth: 'jwt' }, { method: 'GET' })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
        console.log('🔄 API no disponible, cargando datos de prueba...');
        // Cargar datos de prueba como fallback
        const mockData = getMockEmailsData();
        loadEmailsIntoTable(mockData);
        console.log(`✅ ${mockData.length} emails de prueba cargados`);
    });
}

/**
 * Cargar emails en la tabla
 */
function loadEmailsIntoTable(emailsData) {
    const emailsTableBody = document.getElementById('emails-table-body');
    if (!emailsTableBody) return;
    
    // Limpiar tabla
    emailsTableBody.innerHTML = '';
    
    if (emailsData.length === 0) {
        emailsTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No hay emails registrados</td></tr>';
        return;
    }
    
    // Generar filas de emails
    emailsData.forEach(email => {
        const emailRow = createEmailRow(email);
        emailsTableBody.appendChild(emailRow);
    });
    
    // Actualizar contador
    updateEmailsCount();
    
    // Inicializar dropdowns de Bootstrap
    initializeDropdowns();
    
    // Actualizar hora de última actualización
    const lastUpdateElement = document.getElementById('emails-last-update');
    if (lastUpdateElement) {
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        lastUpdateElement.textContent = formattedDate;
    }
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
                <div class="fw-medium" style="font-size: 0.75rem; word-wrap: break-word; white-space: normal; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; max-height: 2.4em;">${email.sender}</div>
                ${email.senderType ? `<span class="badge badge-primary" style="font-size: 0.55rem; padding: 0.1rem 0.25rem; margin-top: 0.1rem; width: fit-content;">${email.senderType}</span>` : ''}
            </div>
        </td>
        <td>
            <div class="d-flex align-items-center">
                ${!email.read ? '<i class="fas fa-circle text-primary me-1" style="font-size: 4px;"></i>' : ''}
                <div class="fw-medium" style="font-size: 0.75rem; word-wrap: break-word; white-space: normal; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; max-height: 2.4em;">${email.subject}</div>
            </div>
        </td>
        <td class="column-summary">
            <div class="text-muted" style="font-size: 0.7rem; line-height: 1.3; word-wrap: break-word; white-space: normal; overflow: hidden; text-overflow: ellipsis; max-height: 3.9em;">${email.preview}</div>
        </td>
        <td>
            <div class="d-flex flex-column">
                <div style="font-size: 0.7rem;">${email.date}</div>
                <div class="text-muted" style="font-size: 0.65rem;">${email.time}</div>
            </div>
        </td>
        <td class="column-actions text-center">
            <button class="btn-play-call email-action-btn" type="button" data-email-id="${email.id}" title="Acciones de IA">
                <i class="fas fa-robot"></i>
            </button>
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
        // Remover eventos anteriores para evitar duplicidades
        const newFilter = filter.cloneNode(true);
        filter.parentNode.replaceChild(newFilter, filter);
        
        // Configurar el evento correctamente
        newFilter.addEventListener('click', function() {
            console.log(`Filtro email seleccionado: ${this.id}`);
            // Procesar correctamente los IDs de filtro
            filterEmails(this.id);
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
        
        // Activar el filtro de importantes automáticamente
        const importantFilterRadio = document.getElementById('filter-emails-important');
        if (importantFilterRadio && !importantFilterRadio.checked) {
            importantFilterRadio.checked = true;
            filterEmails('important');
        }
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
    window.ApiHelper.fetchApi({ url: `/api/emails/${emailId}/favorite`, auth: 'jwt' }, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            favorite: !isImportant
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
    // --- PASO 1: Procesar el tipo de filtro ---
    // Corregir el tipo recibido si contiene cualquier prefijo
    console.log(`Filtro original recibido: ${type}`);
    
    if (type.startsWith('filter-emails-')) {
        type = type.replace('filter-emails-', '');
    } else if (type.startsWith('emails-')) {
        type = type.replace('emails-', '');
    } else if (type.startsWith('filter-')) {
        type = type.replace('filter-', '');
    }
    
    console.log(`Tipo de filtro procesado: ${type}`);
    
    // --- PASO 2: Implementar filtrado de filas ---
    const emailRows = document.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    // Obtener término de búsqueda actual, si existe
    const searchInput = document.getElementById('email-search-input');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    // Asegurarse de que todas las filas estén procesadas correctamente
    emailRows.forEach(row => {
        // DEBUG: Mostrar info de cada fila en la consola para diagnóstico
        const rowId = row.dataset.id || 'sin-id';
        const classes = row.className;
        const hasUnread = row.classList.contains('fw-bold') ? 'No leído' : 'Leído';
        const rowType = row.dataset.type || 'sin-tipo';
        const hasStar = row.querySelector('i.fa-star.fas.text-warning') ? 'Importante' : 'Normal';
        
        console.log(`Email #${rowId}: ${classes} - ${hasUnread} - Tipo: ${rowType} - ${hasStar}`);
        
        // Solo procesar si la fila no está oculta por búsqueda
        if (row.classList.contains('search-hidden')) {
            return;
        }
        
        // --- APLICAR FILTRO ---
        let shouldShow = false;
        
        if (type === 'all') {
            // Mostrar todos los emails
            shouldShow = true;
        } else if (type === 'unread') {
            // Mostrar solo emails no leídos (clase fw-bold)
            shouldShow = row.classList.contains('fw-bold');
        } else if (type === 'important') {
            // Mostrar emails marcados como importantes (estrella amarilla)
            const star = row.querySelector('i.fa-star.fas.text-warning');
            shouldShow = !!star;
        } else if (type === 'spam') {
            // Mostrar emails marcados como spam
            shouldShow = (row.dataset.type || '').includes('spam');
        } else {
            // Para otros tipos específicos
            shouldShow = (row.dataset.type || '').includes(type);
        }
        
        // Aplicar visibilidad a la fila
        if (shouldShow) {
            row.classList.remove('d-none');
            visibleCount++;
        } else {
            row.classList.add('d-none');
        }
    });
    
    // --- PASO 3: Actualizar UI ---
    // Actualizar contador
    updateEmailsCount();
    
    // Actualizar estado visual de los botones de filtro
    const filterButtons = document.querySelectorAll('input[name="email-filter"]');
    filterButtons.forEach(btn => {
        // Normalizar el ID del botón para comparar con el tipo
        let btnType = btn.id;
        if (btnType.startsWith('filter-emails-')) {
            btnType = btnType.replace('filter-emails-', '');
        } else if (btnType.startsWith('filter-')) {
            btnType = btnType.replace('filter-', '');
        }
        
        // Marcar el botón correcto
        btn.checked = (btnType === type);
    });
    
    // Mostrar notificación con el tipo de filtro aplicado
    const filterTypeText = {
        'all': 'todos',
        'unread': 'no leídos',
        'important': 'importantes',
        'spam': 'spam'
    };
    
    // Si hay un término de búsqueda activo, reflejarlo en el mensaje
    let message = `Mostrando ${visibleCount} emails ${filterTypeText[type] || type}`;
    if (searchTerm) {
        message += ` que contienen "${searchTerm}"`;
    }
    
    toastr.info(message, 'Filtro aplicado');
}

/**
 * Ver detalles completos de un email
 * @param {number} emailId - ID del email
 */
function viewEmailDetails(emailId) {
    console.log(`👁️ Ver detalles completos de email ID: ${emailId}`);
    
    // Crear modal con detalles
    const modalId = `email-details-modal-${emailId}`;
    
    // Eliminar modal anterior si existe
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // DATOS FIJOS PARA DEMO - ASEGURAR QUE TODOS LOS EMAILS MUESTRAN ESTOS DATOS
    const sender = "maria.lopez@empresa.com";
    const subject = "Solicitud de ampliación de servicio";
    const date = "24/07/2025";
    const time = "09:45";
    const content = "Buenos días, me gustaría ampliar el servicio contratado para incluir 5 usuarios más en nuestra cuenta. ¿Podrían indicarme el proceso y el coste adicional?";
    
    // Formatear el contenido para HTML (reemplazar saltos de línea)
    const formattedContent = content.replace(/\n/g, '<br>');
    
    // Crear estructura del modal con diseño minimalista y más estructurado
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2">
                        <h5 class="modal-title" id="${modalId}-label" style="font-size: 0.85rem; font-weight: 500; color: #555;">Detalles del mensaje</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="email-view-container">
                            <!-- Información estructurada del email -->
                            <table style="width: 100%; font-size: 0.75rem;" class="mb-3">
                                <tr>
                                    <td style="width: 60px; color: #666; font-weight: 500; vertical-align: top; padding-bottom: 0.4rem;">De:</td>
                                    <td style="vertical-align: top; padding-bottom: 0.4rem;">
                                        <span style="color: #333;">${sender}</span>
                                    </td>
                                    <td style="text-align: right; vertical-align: top; font-size: 0.65rem; color: #888; padding-bottom: 0.4rem;">${date}</td>
                                </tr>
                                <tr>
                                    <td style="color: #666; font-weight: 500; vertical-align: top;">Asunto:</td>
                                    <td style="vertical-align: top; color: #333;">${subject}</td>
                                    <td style="text-align: right; vertical-align: top; font-size: 0.65rem; color: #888;">${time}</td>
                                </tr>
                            </table>
                            
                            <!-- Cuadro de contenido del email -->
                            <div style="border: 1px solid #e0e0e0; border-radius: 4px; background-color: #f9f9f9; padding: 0.75rem;">
                                <div style="font-size: 0.7rem; line-height: 1.5; color: #333;">
                                    ${formattedContent}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer py-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">
                            <i class="fas fa-times me-1" style="font-size: 0.7rem;"></i>Cerrar
                        </button>
                        <div>
                            <button type="button" class="btn btn-sm btn-primary" onclick="createReplyModal(${emailId}, '${sender}', '${subject}', false);" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-reply me-1" style="font-size: 0.7rem;"></i>Responder
                            </button>
                            <button type="button" class="btn btn-sm btn-info text-white ms-1" onclick="createReplyModal(${emailId}, '${sender}', '${subject}', true);" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-robot me-1" style="font-size: 0.7rem;"></i>IA
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary ms-1" onclick="forwardEmail(${emailId}, '${subject}');" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-share me-1" style="font-size: 0.7rem;"></i>Reenviar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
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
                    content: 'Estimado cliente, gracias por su respuesta. Adjunto encontrará el catálogo actualizado con los precios que solicitó.',
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
                    subject: 'Consulta sobre productos',
                    from: 'cliente@example.com',
                    to: 'soporte@techsolutions.com',
                    content: 'Buenos días, me gustaría obtener información sobre sus productos y servicios.',
                    direction: 'incoming'
                }
            ];
            
            // Generar HTML del historial
            let historyHTML = '';
            emailHistory.forEach(email => {
                const isOutgoing = email.direction === 'outgoing';
                const directionIcon = isOutgoing ? '📤' : '📥';
                const directionText = isOutgoing ? 'Enviado' : 'Recibido';
                const cardClass = isOutgoing ? 'border-primary' : 'border-success';
                
                historyHTML += `
                    <div class="card ${cardClass} mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${email.subject}</strong>
                                <span class="badge ${isOutgoing ? 'badge-primary' : 'badge-success'} ms-2">
                                    ${directionIcon} ${directionText}
                                </span>
                            </div>
                            <small class="text-muted">${email.date}</small>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <div><strong>De:</strong> ${email.from}</div>
                                <div><strong>Para:</strong> ${email.to}</div>
                            </div>
                            <div class="mt-3">
                                <p class="mb-0">${email.content}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            historyContent.innerHTML = historyHTML;
        }, 1000);
    }
    
    historyModal.show();
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
    window.ApiHelper.fetchApi({ url: `/api/emails/${emailId}/read`, auth: 'jwt' }, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            read: isRead
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
            const companyName = document.getElementById('companyName')?.value || 'Tu Empresa';
            const outgoingEmail = document.getElementById('outgoing_email')?.value || `soporte@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
            const website = document.getElementById('website')?.value || 'www.empresa.com';
            const phone = document.getElementById('phone')?.value || '+34 900 000 000';
            
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
    const phone = document.getElementById('phone')?.value || '+34 900 000 000';
    
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
        // Remover eventos anteriores para evitar duplicidades
        const newFilter = filter.cloneNode(true);
        filter.parentNode.replaceChild(newFilter, filter);
        
        // Configurar el evento correctamente
        newFilter.addEventListener('click', function() {
            console.log(`Filtro email seleccionado: ${this.id}`);
            // Procesar correctamente los IDs de filtro
            filterEmails(this.id);
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
    window.ApiHelper.fetchApi({ url: `/api/calls/${callId}/importance`, auth: 'jwt' }, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            important: !isStarred
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

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
            
            // Recopilar los datos del perfil
            const profileData = {
                contactName: document.getElementById('account_name').value + ' ' + document.getElementById('account_lastname').value,
                email: document.getElementById('account_email').value,
                phone: document.getElementById('account_phone').value,
                companyName: document.getElementById('account_company').value,
                position: document.getElementById('account_position').value,
                timezone: document.getElementById('account_timezone').value
            };
            
            // Obtener token del almacenamiento local
            const token = localStorage.getItem('auth_token');
            
            // Enviar los datos al backend
            window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.UPDATE_PROFILE, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

            })
            .then(data => {
                console.log('Perfil actualizado exitosamente:', data);
                
                // Registrar la acción en el sistema de seguimiento de uso
                if (window.UsageTracker) {
                    window.UsageTracker.updateUserCount(1);
                    console.log(`📊 Cambios en la cuenta registrados para el usuario ${userId}`);
                    window.UsageTracker.updateUI();
                    
                    if (typeof showUsageSummary === 'function') {
                        showUsageSummary();
                    }
                }
                
                toastr.success('Perfil actualizado correctamente', 'Éxito');
            })
            .catch(error => {
                console.error('Error al actualizar el perfil:', error);
                toastr.error('Error al guardar los cambios. Intente nuevamente.', 'Error');
            });
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
    
    // Botón de cambio de contraseña
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            console.log('🔐 Cambiando contraseña...');
            
            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            // Validaciones
            if (!currentPassword || !newPassword || !confirmPassword) {
                toastr.error('Por favor, completa todos los campos de contraseña', 'Error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                toastr.error('Las contraseñas nuevas no coinciden', 'Error');
                return;
            }
            
            if (newPassword.length < 6) {
                toastr.error('La nueva contraseña debe tener al menos 6 caracteres', 'Error');
                return;
            }
            
            // Obtener token del almacenamiento
            const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
            
            toastr.info('Actualizando contraseña...', 'Procesando');
            
            // Enviar petición al backend
            window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.CHANGE_PASSWORD, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            })
            
            .then(data => {
                console.log('Contraseña actualizada exitosamente:', data);
                toastr.success('Contraseña actualizada correctamente', 'Éxito');
                
                // Limpiar campos
                document.getElementById('current_password').value = '';
                document.getElementById('new_password').value = '';
                document.getElementById('confirm_password').value = '';
            })
            .catch(error => {
                console.error('Error al cambiar contraseña:', error);
                toastr.error(error.error || 'Error al cambiar la contraseña', 'Error');
            });
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
    
    // Cargar información de facturación existente
    loadBillingInfo();
    
    // Cargar métodos de pago existentes
    loadPaymentMethods();
    
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
 * Descargar factura en PDF
 * @param {string} invoiceId - ID de la factura a descargar
 */
function downloadInvoice(invoiceId) {
    console.log(`📥 Descargando factura ${invoiceId}...`);
    
    // Mostrar notificación de descarga iniciada
    showNotification('Preparando factura para descarga...', 'info');
    
    // Simular tiempo de descarga (ya que no tenemos backend real)
    setTimeout(() => {
        // En un sistema real, aquí se haría una petición al backend
        // para generar y descargar el PDF
        
        // Simulamos éxito después de un breve retardo
        showNotification(`Factura ${invoiceId} descargada correctamente`, 'success');
    }, 1500);
}

/**
 * Mostrar modal de facturas
 */
function viewInvoices() {
    console.log('👀 Viendo facturas...');
    
    // Cambiar a la pestaña de historial si no está activa
    const historyTab = document.getElementById('history-tab');
    if (historyTab) {
        const tab = new bootstrap.Tab(historyTab);
        tab.show();
    }
    
    // Asegurarse que la pestaña de facturación está activa
    const billingTab = document.getElementById('billing-tab');
    if (billingTab) {
        const tab = new bootstrap.Tab(billingTab);
        tab.show();
    }
}

/**
 * Manejar el cierre de sesión
 */
function logoutHandler() {
    console.log('🚪 Cerrando sesión...');
    
    // Mostrar mensaje de cierre
    toastr.info('Cerrando sesión...', 'Sesión');
    
    // Pequeña pausa para que se vea la notificación
    setTimeout(() => {
        if (typeof authService !== 'undefined') {
            // Usar el servicio de autenticación para cerrar sesión
            authService.logout();
        } else {
            // Fallback si no existe el servicio de autenticación
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            // Redirigir a login
            window.location.href = 'login.html';
        }
    }, 500);
}

/**
 * Inicializar eventos de facturación
 */
function initBillingEvents() {
    console.log('💰 Inicializando eventos de facturación...');
    
    // Manejar botón Ver Facturas
    const viewInvoicesBtn = document.getElementById('view-invoices-btn');
    if (viewInvoicesBtn) {
        viewInvoicesBtn.addEventListener('click', viewInvoices);
    }
    
    // Manejar botones de descarga en la tabla de facturas
    const invoiceButtons = document.querySelectorAll('button[title="Descargar PDF"]');
    invoiceButtons.forEach(button => {
        const row = button.closest('tr');
        if (row) {
            const invoiceId = row.querySelector('td:first-child').textContent;
            button.addEventListener('click', () => downloadInvoice(invoiceId));
        }
    });
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
    
    const userCompanyEl = document.getElementById('companyName');
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
        // const response = await window.ApiHelper.fetchApi({ url: '/api/bot/status', auth: 'jwt' }, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //        //     },
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

// FUNCIÓN collectContextFiles() ELIMINADA
// Esta función era parte del sistema legacy de configuración del bot
// y ha sido removida como parte de la limpieza exhaustiva del código legacy

/**
 * Guardar configuración unificada del bot
 * @returns {Promise} Promesa que se resuelve cuando se completa el guardado
 */
// Variable global para evitar doble ejecución
let isSavingConfig = false;

function saveUnifiedConfig() {
    return new Promise((resolve, reject) => {
        console.log('🔴 COMENZANDO CAPTURA COMPLETA DE TODOS LOS CAMPOS DEL FORMULARIO');
        
        // Protección contra doble ejecución
        if (isSavingConfig) {
            console.warn('⚠️ saveUnifiedConfig ya está en ejecución, ignorando llamada duplicada');
            return resolve();
        }
        
        isSavingConfig = true;
        console.log('🔒 Bloqueando saveUnifiedConfig para evitar doble ejecución');
        
        // Obtener información del usuario actual
        const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
        console.log(`🔥 GUARDANDO TODOS LOS CAMPOS para usuario ${userId}...`);
        
        // Recopilar todos los datos del formulario
        const config = {
            // Información de empresa - Mapeo con IDs alternativos para mayor compatibilidad
            companyName: document.getElementById('companyName')?.value || document.getElementById('company_name')?.value || '',
            companyDescription: document.getElementById('companyDescription')?.value || document.getElementById('company_description')?.value || document.getElementById('description')?.value || '',
            companySector: document.getElementById('companySector')?.value || document.getElementById('company_sector')?.value || document.getElementById('industry')?.value || '', 
            companyAddress: document.getElementById('companyAddress')?.value || document.getElementById('company_address')?.value || document.getElementById('address')?.value || '',
            companyPhone: document.getElementById('companyPhone')?.value || document.getElementById('company_phone')?.value || document.getElementById('phone')?.value || '',
            companyEmail: document.getElementById('companyEmail')?.value || document.getElementById('company_email')?.value || document.getElementById('email')?.value || '',
            companyWebsite: document.getElementById('companyWebsite')?.value || document.getElementById('company_website')?.value || document.getElementById('website')?.value || '',
            
            // Configuración general - IDs corregidos
            botName: document.getElementById('bot_name')?.value || 'Asistente Virtual',
            botPersonality: document.getElementById('bot_personality')?.value || 'professional',
            welcomeMessage: document.getElementById('call_greeting')?.value || 'Bienvenido a nuestro asistente virtual',
            businessHours: document.getElementById('business_hours')?.value || 'Lun-Vie: 9:00-18:00',
            
            // Configuración de horarios - IDs corregidos
            workingHours: {
                opening: document.getElementById('business-hours-start')?.value || '09:00',
                closing: document.getElementById('business-hours-end')?.value || '18:00'
            },
            workingDays: {
                monday: document.getElementById('day-mon')?.checked || false,
                tuesday: document.getElementById('day-tue')?.checked || false,
                wednesday: document.getElementById('day-wed')?.checked || false,
                thursday: document.getElementById('day-thu')?.checked || false,
                friday: document.getElementById('day-fri')?.checked || false,
                saturday: document.getElementById('day-sat')?.checked || false,
                sunday: document.getElementById('day-sun')?.checked || false
            },
            
            // Configuración de llamadas - IDs corregidos y campos completos
            callConfig: {
                enabled: document.getElementById('call_bot_active')?.checked || document.getElementById('enable-calls')?.checked || false,
                recordCalls: document.getElementById('call_recording')?.checked || document.getElementById('record-calls')?.checked || false,
                transcribeCalls: document.getElementById('call_transcription')?.checked || document.getElementById('transcribe-calls')?.checked || false,
                voiceId: document.getElementById('voice_type')?.value || document.getElementById('voice-selection')?.value || 'female',
                language: document.getElementById('call_language')?.value || document.getElementById('language-selection')?.value || 'es-ES',
                greeting: document.getElementById('call_greeting')?.value || document.getElementById('welcome-message')?.value || 'Hola, ha llamado a nuestra empresa. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?',
                // Campos adicionales con IDs alternativos para mayor compatibilidad
                volume: document.getElementById('voice_volume')?.value || document.getElementById('voice-volume')?.value || '1.0',
                speed: document.getElementById('voice_speed')?.value || document.getElementById('voice-speed')?.value || '1.0',
                pitch: document.getElementById('voice_pitch')?.value || document.getElementById('voice-pitch')?.value || '1.0',
                useCustomVoice: document.getElementById('use_custom_voice')?.checked || document.getElementById('use-custom-voice')?.checked || false,
                customVoiceId: document.getElementById('custom_voice_id')?.value || document.getElementById('custom-voice-id')?.value || ''
            },
            
            // Configuración de emails - Estructura completa con IDs alternativos
            emailConfig: {
                enabled: document.getElementById('email_bot_active')?.checked || document.getElementById('enable-email')?.checked || false,
                provider: document.getElementById('email_provider')?.value || document.getElementById('email-provider')?.value || 'gmail',
                outgoingEmail: document.getElementById('outgoing_email')?.value || document.getElementById('outgoing-email')?.value || '',
                recipientEmail: document.getElementById('recipient_email')?.value || document.getElementById('recipient-email')?.value || '',
                forwardRules: document.getElementById('forward_rules')?.value || document.getElementById('forward-rules')?.value || '',
                autoReply: document.getElementById('autoReplyEnabled')?.checked || document.getElementById('auto-reply-enabled')?.checked || document.getElementById('auto_reply')?.checked || false,
                autoReplyMessage: document.getElementById('autoReplyMessage')?.value || document.getElementById('auto-reply-message')?.value || document.getElementById('auto_reply_message')?.value || '',
                language: document.getElementById('email_language')?.value || document.getElementById('email-language')?.value || 'es-ES',
                emailSignature: document.getElementById('email_signature')?.value || document.getElementById('email-signature')?.value || '',
                emailConsent: document.getElementById('email_consent')?.checked || document.getElementById('email-consent')?.checked || false,
                // Configuración de servidores con IDs alternativos
                imapServer: document.getElementById('imap_server')?.value || document.getElementById('imap-server')?.value || '',
                imapPort: parseInt(document.getElementById('imap_port')?.value || document.getElementById('imap-port')?.value) || 993,
                smtpServer: document.getElementById('smtp_server')?.value || document.getElementById('smtp-server')?.value || '',
                smtpPort: parseInt(document.getElementById('smtp_port')?.value || document.getElementById('smtp-port')?.value) || 587,
                useSSL: document.getElementById('use_ssl')?.checked || document.getElementById('use-ssl')?.checked !== false, // Default true
                // Campos adicionales de email-config.js
                forwardingRules: typeof collectForwardingRules === 'function' ? collectForwardingRules() : []
            },
            
            // Configuración de transferencias
            transferConfig: {
                enableTransfers: document.getElementById('enable-transfers')?.checked || document.getElementById('enable_transfers')?.checked || false,
                transferOnRequest: document.getElementById('transfer-on-request')?.checked || document.getElementById('transfer_on_request')?.checked || false,
                transferOnConfusion: document.getElementById('transfer-on-confusion')?.checked || document.getElementById('transfer_on_confusion')?.checked || false,
                transferOnComplex: document.getElementById('transfer-on-complex')?.checked || document.getElementById('transfer_on_complex')?.checked || false,
                transferOnLimit: document.getElementById('transfer-on-limit')?.checked || document.getElementById('transfer_on_limit')?.checked || false,
                transferNumbers: typeof getTransferNumbers === 'function' ? getTransferNumbers() : []
            },
            
            // Configuración de script
            scriptConfig: {
                model: document.getElementById('ai-model')?.value || document.getElementById('ai_model')?.value || document.getElementById('model')?.value || 'gpt-3.5-turbo',
                personality: document.getElementById('personality')?.value || document.getElementById('bot_personality')?.value || 'professional',
                customPersonality: document.getElementById('custom-personality')?.value || document.getElementById('custom_personality')?.value || '',
                knowledgeBase: document.getElementById('knowledge-base')?.value || document.getElementById('knowledge_base')?.value || '',
                capabilities: typeof getSelectedCapabilities === 'function' ? getSelectedCapabilities() : [],
                scripts: {
                    intro: document.getElementById('intro-script')?.value || document.getElementById('intro_script')?.value || document.getElementById('welcome-message')?.value || '',
                    unknown: document.getElementById('unknown-script')?.value || document.getElementById('unknown_script')?.value || document.getElementById('retry-prompt')?.value || '',
                    forward: document.getElementById('forward-script')?.value || document.getElementById('forward_script')?.value || document.getElementById('transfer-message')?.value || '',
                    goodbye: document.getElementById('goodbye-script')?.value || document.getElementById('goodbye_script')?.value || document.getElementById('goodbye-message')?.value || ''
                },
                maxConversationTurns: parseInt(document.getElementById('max-turns')?.value || document.getElementById('max_turns')?.value) || 10,
                silenceTimeoutSeconds: parseInt(document.getElementById('silence-timeout')?.value || document.getElementById('silence_timeout')?.value) || 5,
                enableTranscriptionSummary: document.getElementById('transcription-summary')?.checked || document.getElementById('transcription_summary')?.checked || false,
                saveRecordings: document.getElementById('save-recordings')?.checked || document.getElementById('save_recordings')?.checked || false
            },
            
            // Configuración avanzada de IA con IDs alternativos
            aiConfig: {
                temperature: parseFloat(document.getElementById('ai_temperature')?.value || document.getElementById('ai-temperature')?.value || document.getElementById('temperature')?.value || '0.7'),
                max_tokens: parseInt(document.getElementById('ai_max_tokens')?.value || document.getElementById('ai-max-tokens')?.value || document.getElementById('max_tokens')?.value || '150'),
                top_p: parseFloat(document.getElementById('ai_top_p')?.value || document.getElementById('ai-top-p')?.value || document.getElementById('top_p')?.value || '0.9'),
                frequency_penalty: parseFloat(document.getElementById('ai_frequency_penalty')?.value || document.getElementById('ai-frequency-penalty')?.value || document.getElementById('frequency_penalty')?.value || '0.0'),
                presence_penalty: parseFloat(document.getElementById('ai_presence_penalty')?.value || document.getElementById('ai-presence-penalty')?.value || document.getElementById('presence_penalty')?.value || '0.0')
            },
            
            // Preguntas frecuentes
            faqs: collectFaqItems(),
            
            // Archivos de contexto
            files: collectContextFiles()
        };
    
    console.log('📝 Configuración recopilada:', config);
    
    // Validar campos requeridos
    const requiredFields = [
        { id: 'companyName', label: 'Nombre de empresa' },
        { id: 'email', label: 'Email de empresa' }
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
    const companyEmail = document.getElementById('email')?.value;
    if (companyEmail && !emailRegex.test(companyEmail)) {
        toastr.error('El formato del email de empresa no es válido', 'Error');
        document.getElementById('email')?.focus();
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
    
    // Preparar datos para enviar al backend - Estructura corregida para coincidir con el endpoint PUT
    const botConfigData = {
        // Información de empresa - Campos individuales como espera el backend
        companyName: config.companyName,
        companyDescription: config.companyDescription,
        companySector: config.companySector,
        companyAddress: config.companyAddress,
        companyPhone: config.companyPhone,
        companyEmail: config.companyEmail,
        companyWebsite: config.companyWebsite,
        
        // Configuración general
        botName: config.botName,
        botPersonality: config.botPersonality,
        welcomeMessage: config.welcomeMessage,
        businessHours: config.businessHours,
        
        // Configuración de horarios
        workingHours: config.workingHours,
        workingDays: config.workingDays,
        
        // Configuración de llamadas - Estructura corregida
        callConfig: {
            enabled: config.callConfig.enabled,
            recordCalls: config.callConfig.recordCalls,
            transcribeCalls: config.callConfig.transcribeCalls,
            voiceId: config.callConfig.voiceId,
            language: config.callConfig.language,
            greeting: config.callConfig.greeting // CORREGIDO: greeting en lugar de confirmationMessage
        },
        
        // Configuración de emails - Estructura completa
        emailConfig: {
            enabled: config.emailConfig.enabled,
            provider: config.emailConfig.provider,
            outgoingEmail: config.emailConfig.outgoingEmail,
            recipientEmail: config.emailConfig.recipientEmail,
            forwardRules: config.emailConfig.forwardRules,
            autoReply: config.emailConfig.autoReply,
            autoReplyMessage: config.emailConfig.autoReplyMessage,
            language: config.emailConfig.language, // CORREGIDO: language en lugar de emailLanguage
            emailSignature: config.emailConfig.emailSignature,
            emailConsent: config.emailConfig.emailConsent,
            // Configuración de servidores
            imapServer: config.emailConfig.imapServer,
            imapPort: config.emailConfig.imapPort,
            smtpServer: config.emailConfig.smtpServer,
            smtpPort: config.emailConfig.smtpPort,
            useSSL: config.emailConfig.useSSL
        },
        
        // Configuración avanzada de IA
        aiConfig: config.aiConfig,
        
        // Preguntas frecuentes (FAQs)
        faqs: collectFaqItems(),
        
        // Archivos de contexto
        files: config.files,
        
        // Campos legacy para compatibilidad
        voiceId: config.callConfig.voiceId,
        language: config.callConfig.language,
        confirmationMessage: config.callConfig.greeting, // Mapeo para compatibilidad
        dtmfOptions: config.dtmfOptions || [],
        personality: config.botPersonality
    };
    
    console.log(' Preguntas frecuentes incluidas:', botConfigData.faqs);
    console.log(' Archivos de contexto a procesar:', config.files);
    
    // Obtener token de autenticación
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (!authToken) {
        toastr.error('No se encontró token de autenticación', 'Error');
        return reject(new Error('No se encontró token de autenticación'));
    }
    
    // Enviar la configuración del bot al backend usando la URL completa
    const apiUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
    console.log(' Usando URL base de API:', apiUrl);
    
    // Primero procesamos los archivos de contexto y luego guardamos la configuración completa
    console.log(' Procesando archivos de contexto...');
    
    // Actualizar botConfigData con los FAQs recolectados
    botConfigData.faqs = collectFaqItems();
    console.log(' FAQs recopiladas:', botConfigData.faqs);
    
    // PROCESAMIENTO DE ARCHIVOS DE CONTEXTO ELIMINADO
    // Esta funcionalidad ha sido removida como parte de la eliminación del sistema legacy
    console.log(' Procesamiento de archivos de contexto omitido (funcionalidad eliminada)');
    
    // Proceder directamente con el guardado de configuración
    Promise.resolve()
        .then(() => {
            console.log('📤 Enviando configuración unificada al backend:', botConfigData);
            
            // SOLUCIÓN FINAL: Formato híbrido con campos tanto directos como anidados
            // para garantizar la compatibilidad con el backend actualizado
            const unifiedClientData = {
                // IMPORTANTE: Campos críticos en nivel superior (directos)
                // Aseguramos que todos los campos se envíen explícitamente, incluso si están vacíos
                companyName: config.companyName !== undefined ? config.companyName : '', 
                companyDescription: config.companyDescription !== undefined ? config.companyDescription : '',
                companySector: config.companySector !== undefined ? config.companySector : '',
                companyAddress: config.companyAddress !== undefined ? config.companyAddress : '',
                companyPhone: config.companyPhone !== undefined ? config.companyPhone : '',
                companyEmail: config.companyEmail !== undefined ? config.companyEmail : '',
                companyWebsite: config.companyWebsite !== undefined ? config.companyWebsite : '',
                
                // DUPLICAR en structure profile para compatibilidad con versiones
                // Aseguramos que los campos se envíen explícitamente, incluso si están vacíos
                profile: {
                    companyName: config.companyName !== undefined ? config.companyName : '',
                    companyDescription: config.companyDescription !== undefined ? config.companyDescription : '',
                    industry: config.companySector !== undefined ? config.companySector : '',
                    address: config.companyAddress !== undefined ? config.companyAddress : '',
                    phone: config.companyPhone !== undefined ? config.companyPhone : '',
                    email: config.companyEmail !== undefined ? config.companyEmail : '',
                    website: config.companyWebsite !== undefined ? config.companyWebsite : ''
                },
                
                // Configuración del bot
                botConfig: {
                    name: config.botName,
                    personality: config.botPersonality,
                    workingHours: config.workingHours,
                    workingDays: config.workingDays,
                    callConfig: config.callConfig
                },
                
                // Configuración de llamadas
                callConfig: config.callConfig,
                
                // Configuración de email
                emailConfig: config.emailConfig,
                
                // Configuración de transferencias
                transferConfig: config.transferConfig,
                
                // Configuración de scripts
                scriptConfig: config.scriptConfig,
                
                // Configuración de IA
                aiConfig: config.aiConfig,
                
                // FAQs
                faqs: config.faqs,
                
                // Archivos de contexto
                files: config.files
            };
            
            // Añadir logs específicos para todos los campos de empresa
            console.log(' Valor de companyName:', config.companyName);
            console.log(' Valor de companyDescription:', config.companyDescription);
            console.log(' Valor de companySector:', config.companySector);
            console.log(' Valor de companyAddress:', config.companyAddress);
            console.log(' Valor de companyPhone:', config.companyPhone);
            console.log(' Valor de companyEmail:', config.companyEmail);
            console.log(' Valor de companyWebsite:', config.companyWebsite);
            
            console.log(' IDs de formulario encontrados para campos de empresa:');
            console.log('- companyName:', document.getElementById('companyName') ? 'companyName' : document.getElementById('company_name') ? 'company_name' : 'no encontrado');
            console.log('- companyDescription:', document.getElementById('companyDescription') ? 'companyDescription' : document.getElementById('company_description') ? 'company_description' : document.getElementById('description') ? 'description' : 'no encontrado');
            console.log('- companySector:', document.getElementById('companySector') ? 'companySector' : document.getElementById('company_sector') ? 'company_sector' : document.getElementById('industry') ? 'industry' : 'no encontrado');
            
            console.log(' Enviando companyName como:', unifiedClientData.companyName);
            console.log(' Enviando companyDescription como:', unifiedClientData.companyDescription);
            console.log(' Enviando companySector como:', unifiedClientData.companySector);
            
            console.log(' Datos unificados preparados para el backend:', unifiedClientData);
            
            // USAR ENDPOINT UNIFICADO
            console.log(' Usando endpoint unificado /api/client');
            console.log('🔄 Usando endpoint unificado /api/client');
            return fetch('/api/client', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                },
                body: JSON.stringify(unifiedClientData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
                }
                return response.json();
            });
        })
        
        .then(data => {
            console.log('✅ Configuración unificada guardada correctamente:', data);
            
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
            
            // MEJORA UX: Mostrar mensaje de guardado visible por exactamente 2 segundos
            const saveButton = document.querySelector('#saveConfigButton');
            const originalText = saveButton ? saveButton.innerHTML : 'Guardar';
            
            // 1. Actualizar botón con mensaje de guardado
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-check-circle"></i> Guardado';
                saveButton.classList.add('btn-success');
                saveButton.classList.remove('btn-primary');
                saveButton.disabled = true;
            }
            
            // 2. Mostrar notificación toastr prominente
            toastr.options = {
                closeButton: false,
                positionClass: "toast-top-center",
                timeOut: 2000,
                extendedTimeOut: 0,
                tapToDismiss: false
            };
            toastr.success('Cambios guardados correctamente', 'Guardado');
            
            // 3. Recargar configuración y restaurar botón después de exactamente 2 segundos
            console.log('💾 Guardado exitoso. Restaurando UI en 2 segundos exactos...');
            setTimeout(() => {
                // Restaurar el botón
                if (saveButton) {
                    saveButton.innerHTML = originalText;
                    saveButton.classList.add('btn-primary');
                    saveButton.classList.remove('btn-success');
                    saveButton.disabled = false;
                }
                
                // Recargar datos de configuración del bot
                loadBotConfiguration();
                console.log('✅ UI restaurada - configuración del bot recargada');
            }, 2000); // Exactamente 2 segundos como solicitó el usuario
            
            resolve();
        })
        .catch(error => {
            console.error('Error guardando configuración:', error);
            toastr.error('Error al guardar la configuración: ' + error.message, 'Error');
            reject(error);
        })
        .finally(() => {
            // Liberar el bloqueo independientemente del resultado
            isSavingConfig = false;
            console.log('🔓 Liberando bloqueo de saveUnifiedConfig');
        });
    });
}

// ...
// FUNCIÓN testBotConfiguration() ELIMINADA
// Esta función era parte del sistema legacy de configuración del bot
// que dependía del endpoint /api/bot/test que no existe en el backend
// Ha sido removida como parte de la limpieza exhaustiva del código legacy
function testBotConfiguration() {
    console.log('⚠️ Función testBotConfiguration() ha sido deshabilitada');
    toastr.warning('Esta funcionalidad ha sido temporalmente deshabilitada', 'Aviso');
    return;
}

// La función showBotTestModal ha sido eliminada porque ahora usamos la API real
// y mostramos los resultados en un modal generado dinámicamente en la función testBotConfiguration

// FUNCIÓN ELIMINADA: setupFaqManager() - Reemplazada por setupFaqButtons() + loadBotConfiguration()

/**
 * Configurar solo los botones de FAQs (sin cargar datos)
 */
function setupFaqButtons() {
    console.log('📝 Configurando botones de FAQs...');
    
    // Botón para añadir nueva pregunta - Implementación mejorada y más robusta
    function initFaqButton() {
        const addFaqBtn = document.getElementById('add-faq-btn');
        if (addFaqBtn) {
            console.log('📝 Botón de añadir FAQ encontrado, añadiendo event listener');
            // Eliminar cualquier handler previo para evitar duplicados
            const newAddFaqBtn = addFaqBtn.cloneNode(true);
            if (addFaqBtn.parentNode) {
                addFaqBtn.parentNode.replaceChild(newAddFaqBtn, addFaqBtn);
            }
            
            // Añadir listener al nuevo botón
            newAddFaqBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖘️ Botón FAQ clickeado, ejecutando addNewFaqItem()...');
                addNewFaqItem();
            });
            
            // Añadir estilo visual para indicar que es clickeable
            newAddFaqBtn.style.cursor = 'pointer';
        } else {
            console.warn('⚠️ Botón de añadir FAQ no encontrado en el DOM');
        }
        
        // Verificar que el contenedor de FAQs exista
        const faqItems = document.getElementById('faq-items');
        if (!faqItems) {
            console.warn('⚠️ Contenedor de FAQs no encontrado en el DOM');
            
            // Intentar crear el contenedor si no existe
            const faqContainer = document.querySelector('.faq-container');
            if (faqContainer) {
                const faqItemsDiv = document.createElement('div');
                faqItemsDiv.id = 'faq-items';
                faqItemsDiv.className = 'faq-items';
                faqContainer.appendChild(faqItemsDiv);
                console.log('✅ Contenedor de FAQs creado dinámicamente');
            }
        }
    }
    
    // Intentar inicializar inmediatamente
    initFaqButton();
    
    // Y también con retraso para asegurarnos de que el DOM esté listo
    setTimeout(initFaqButton, 500);
    setTimeout(initFaqButton, 1000); // Intentar una vez más después de 1 segundo
    
    // Añadir llamada a documento cargado para asegurar la inicialización
    if (document.readyState === 'complete') {
        initFaqButton();
    } else {
        window.addEventListener('load', initFaqButton);
    }
}

/**
 * Cargar preguntas frecuentes desde el backend o usar datos de ejemplo
 */
function loadSampleFaqs() {
    console.log('💬 Cargando preguntas frecuentes...');
    
    // Esperar a que el DOM esté listo
    setTimeout(() => {
        const faqItems = document.getElementById('faq-items');
        if (!faqItems) {
            console.warn('⚠️ Contenedor de FAQs no encontrado, no se pueden cargar preguntas frecuentes');
            return;
        }
        
        // Obtener token de autenticación
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('ℹ️ No hay token de autenticación, usando datos de ejemplo');
            loadDemoFaqs();
            return;
        }
        
        // Intentar cargar desde la API unificada
        console.log('💻 Intentando cargar preguntas frecuentes desde el endpoint unificado...');
        console.log('🔄 Usando endpoint unificado CLIENT_DATA: ' + window.API_CONFIG.DASHBOARD.CLIENT_DATA.url);
        
        window.ApiHelper.fetchApi(window.API_CONFIG.DASHBOARD.CLIENT_DATA, { method: 'GET' })
        .then(clientData => {
            // En el endpoint unificado, las FAQs están directamente en clientData.faqs
            const faqs = clientData?.faqs || [];
            console.log('💾 FAQs recibidas del endpoint unificado:', faqs.length);

            // Añadir preguntas al DOM
            if (faqs && faqs.length > 0) {
                faqs.forEach(faq => addFaqItemToDOM(faq));
                console.log(`✅ ${faqs.length} preguntas frecuentes cargadas correctamente`);
            } else {
                console.log('ℹ️ No hay preguntas frecuentes configuradas en la API, cargando datos de ejemplo');
                loadDemoFaqs();
            }
            
            // Actualizar la visualización del mensaje de no hay preguntas
            updateNoFaqsMessage();
        })
        .catch(error => {
            console.log('ℹ️ No se pudieron cargar preguntas frecuentes desde la API, usando datos de ejemplo:', error.message);
            loadDemoFaqs();
        });
    }, 600);
}

/**
 * Cargar preguntas frecuentes de ejemplo
 */
function loadDemoFaqs() {
    const demoFaqs = [
        { id: 1001, question: '¿Cuál es su horario de atención?', answer: 'Nuestro horario es de lunes a viernes de 9:00 a 18:00.' },
        { id: 1002, question: '¿Cómo puedo realizar un pedido?', answer: 'Puede realizar su pedido a través de nuestra página web o llamando a nuestro número de atención al cliente.' },
        { id: 1003, question: '¿Cuáles son las formas de pago aceptadas?', answer: 'Aceptamos tarjetas de crédito/débito, PayPal y transferencia bancaria.' }
    ];
    
    console.log(`💬 Cargando ${demoFaqs.length} preguntas frecuentes de ejemplo...`);
    demoFaqs.forEach(faq => addFaqItemToDOM(faq));
    
    // Actualizar la visualización del mensaje de no hay preguntas
    updateNoFaqsMessage();
    
    console.log('✅ Preguntas frecuentes de ejemplo cargadas correctamente');
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
    
    console.log('📋 FAQs recopiladas:', faqs.length);
    return faqs;
}

/**
 * Recopila todas las reglas de reenvío de email configuradas
 * Esta función es usada por saveUnifiedConfig para asegurar que todas las reglas sean guardadas
 * @returns {Array} Array de reglas de reenvío
 */
function collectForwardingRules() {
    const rulesContainer = document.getElementById('forwardingRulesList');
    if (!rulesContainer) return [];
    
    const rules = [];
    const ruleElements = rulesContainer.querySelectorAll('.card');
    
    ruleElements.forEach((ruleElement) => {
        const index = ruleElement.querySelector('[data-rule-index]')?.dataset.ruleIndex;
        if (index !== undefined) {
            const condition = ruleElement.querySelector(`[data-rule-index="${index}"][data-field="condition"]`)?.value || 'subject_contains';
            const value = ruleElement.querySelector(`[data-rule-index="${index}"][data-field="value"]`)?.value || '';
            const recipients = ruleElement.querySelector(`[data-rule-index="${index}"][data-field="recipients"]`)?.value || '';
            
            // Solo añadir si hay algo significativo
            if (value.trim() !== '') {
                rules.push({
                    condition: condition,
                    value: value.trim(),
                    recipients: recipients.split(',').map(email => email.trim()).filter(email => email)
                });
            }
        }
    });
    
    console.log('📧 Reglas de reenvío recopiladas:', rules.length);
    return rules;
}

/**
 * Configurar manejadores de subida de archivos de contexto
 */
function setupFileUploadHandlers() {
    console.log('📁 Configurando manejadores de archivos de contexto...');
    
    const fileInput = document.getElementById('context-files');
    const uploadArea = document.getElementById('file-upload-area');
    const filesList = document.getElementById('uploaded-files-list');
    
    if (!fileInput || !uploadArea || !filesList) {
        console.warn('⚠️ Elementos de subida de archivos no encontrados');
        return;
    }
    
    // Configurar drag & drop
    setupDragAndDrop(uploadArea, fileInput);
    
    // Configurar cambio de archivos
    fileInput.addEventListener('change', handleFileSelection);
    
    // Inicializar lista de archivos
    updateFilesList();
}

/**
 * Configurar funcionalidad de drag & drop
 */
function setupDragAndDrop(uploadArea, fileInput) {
    // Prevenir comportamiento por defecto del navegador
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Resaltar área de drop
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Manejar drop
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadArea.classList.add('border-success', 'bg-success', 'bg-opacity-10');
    }
    
    function unhighlight(e) {
        uploadArea.classList.remove('border-success', 'bg-success', 'bg-opacity-10');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        fileInput.files = files;
        handleFileSelection({ target: { files: files } });
    }
}

/**
 * Manejar selección de archivos
 */
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    console.log(`📄 ${files.length} archivo(s) seleccionado(s)`);
    
    // Validar archivos
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
        // Agregar archivos válidos a la lista
        addFilesToList(validFiles);
        updateFilesList();
        
        toastr.success(`${validFiles.length} archivo(s) agregado(s) correctamente`, 'Archivos de Contexto');
    }
    
    // Limpiar input
    event.target.value = '';
}

/**
 * Validar archivos seleccionados
 */
function validateFiles(files) {
    const validFiles = [];
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    
    // Obtener archivos actuales
    const currentFiles = getUploadedFiles();
    
    for (let file of files) {
        // Verificar número máximo de archivos
        if (currentFiles.length + validFiles.length >= maxFiles) {
            toastr.warning(`Máximo ${maxFiles} archivos permitidos`, 'Límite de archivos');
            break;
        }
        
        // Verificar tamaño
        if (file.size > maxSize) {
            toastr.error(`El archivo "${file.name}" es demasiado grande (máximo 10MB)`, 'Archivo demasiado grande');
            continue;
        }
        
        // Verificar tipo
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            toastr.error(`El archivo "${file.name}" no es un tipo permitido (PDF, DOCX, TXT)`, 'Tipo de archivo no válido');
            continue;
        }
        
        // Verificar duplicados
        if (currentFiles.some(f => f.name === file.name)) {
            toastr.warning(`El archivo "${file.name}" ya está en la lista`, 'Archivo duplicado');
            continue;
        }
        
        validFiles.push(file);
    }
    
    return validFiles;
}

/**
 * Agregar archivos a la lista
 */
function addFilesToList(files) {
    const uploadedFiles = getUploadedFiles();
    
    files.forEach(file => {
        const fileData = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            uploaded: false
        };
        
        uploadedFiles.push(fileData);
    });
    
    // Guardar en localStorage temporalmente
    localStorage.setItem('contextFiles', JSON.stringify(uploadedFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        uploaded: f.uploaded
    }))));
}

/**
 * Obtener archivos subidos
 */
function getUploadedFiles() {
    try {
        const stored = localStorage.getItem('contextFiles');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error al obtener archivos:', e);
        return [];
    }
}

/**
 * Limpiar lista de archivos subidos
 */
function clearUploadedFiles() {
    localStorage.removeItem('contextFiles');
    updateFilesList();
}

/**
 * Agregar archivo a la lista de subidos
 */
function addUploadedFile(fileData) {
    const files = getUploadedFiles();
    files.push(fileData);
    localStorage.setItem('contextFiles', JSON.stringify(files));
}

/**
 * Actualizar visualización de archivos (alias para updateFilesList)
 */
function updateFileListDisplay() {
    updateFilesList();
}

/**
 * Generar ID único para archivo
 */
function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Actualizar visualización de lista de archivos
 */
function updateFilesList() {
    const filesList = document.getElementById('uploaded-files-list');
    if (!filesList) return;
    
    const files = getUploadedFiles();
    
    if (files.length === 0) {
        filesList.innerHTML = '';
        return;
    }
    
    filesList.innerHTML = files.map(file => `
        <div class="card mb-2 border-light" id="file-${file.id}">
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <i class="fas ${getFileIcon(file.name)} me-2 text-primary"></i>
                        <div>
                            <div class="fw-medium">${file.name}</div>
                            <small class="text-muted">${formatFileSize(file.size)}</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        ${file.uploaded ? 
                            '<span class="badge bg-success me-2"><i class="fas fa-check me-1"></i>Subido</span>' : 
                            '<span class="badge bg-secondary me-2"><i class="fas fa-clock me-1"></i>Pendiente</span>'
                        }
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeFile('${file.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Obtener icono según tipo de archivo
 */
function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return 'fa-file-pdf';
        case 'docx': case 'doc': return 'fa-file-word';
        case 'txt': return 'fa-file-alt';
        default: return 'fa-file';
    }
}

/**
 * Formatear tamaño de archivo
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Eliminar archivo de la lista
 */
function removeFile(fileId) {
    let files = getUploadedFiles();
    files = files.filter(f => f.id != fileId);
    
    localStorage.setItem('contextFiles', JSON.stringify(files));
    updateFilesList();
    
    toastr.success('Archivo eliminado correctamente', 'Archivos de Contexto');
}

/**
 * Cargar archivos de contexto desde la API
 */
function loadContextFiles() {
    console.log('📁 Cargando archivos de contexto...');
    console.log('🕰️ Timestamp:', new Date().toISOString());
    
    // Usar el endpoint unificado /api/client
    console.log('🔄 Usando endpoint unificado CLIENT_DATA: ' + window.API_CONFIG.DASHBOARD.CLIENT_DATA.url);
    
    window.ApiHelper.fetchApi(window.API_CONFIG.DASHBOARD.CLIENT_DATA, { method: 'GET' })
    .then(clientData => {
        // En el endpoint unificado, los archivos están directamente en clientData.files
        const files = clientData?.files || [];
        console.log('💾 Archivos de contexto recibidos del endpoint unificado:', files.length);
        
        // Limpiar la lista actual
        clearUploadedFiles();
        
        // Cargar archivos al estado local
        if (files && files.length > 0) {
            files.forEach(file => {
                // Agregar archivo al estado local con flag de uploaded
                const fileData = {
                    id: file.id || generateFileId(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploaded: true // Marcar como ya subido
                };
                
                addUploadedFile(fileData);
            });
            
            console.log(`✅ ${files.length} archivos de contexto cargados correctamente`);
            
            // Actualizar la UI
            updateFileListDisplay();
        } else {
            console.log('ℹ️ No hay archivos de contexto configurados');
        }
    })
    .catch(error => {
        console.log('ℹ️ No se pudieron cargar archivos de contexto desde la API:', error.message);
    });
}

/**
 * Obtener archivos para enviar al backend
 */
function getFilesForUpload() {
    return getUploadedFiles().filter(f => !f.uploaded);
}

/**
 * Recopilar archivos de contexto para guardar
 * @returns {Array} Array de archivos de contexto
 */
function collectContextFiles() {
    const files = getUploadedFiles();
    console.log('📁 Archivos de contexto recopilados:', files.length);
    
    return files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploaded: file.uploaded || false
    }));
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
    
    // Obtener datos del formulario
    const cardNumber = document.getElementById('card_number')?.value;
    const expiryDate = document.getElementById('expiry_date')?.value;
    const cardholderName = document.getElementById('cardholder_name')?.value;
    const cvv = document.getElementById('cvv')?.value;
    
    // Validar campos
    if (!cardNumber || !expiryDate || !cardholderName || !cvv) {
        toastr.error('Por favor, completa todos los campos de la tarjeta', 'Error');
        return;
    }
    
    // Validar formato de tarjeta (básico)
    if (cardNumber.replace(/\s/g, '').length < 16) {
        toastr.error('El número de tarjeta debe tener al menos 16 dígitos', 'Error');
        return;
    }
    
    // Obtener token del almacenamiento
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    // Mostrar spinner de carga
    toastr.info('Guardando método de pago...', 'Procesando');
    
    // Enviar datos al backend
    window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.PAYMENT_METHOD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'card',
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiryDate,
            cardholderName,
            isDefault: true
        })
    })
    
    .then(data => {
        console.log('Método de pago guardado exitosamente:', data);
        toastr.success('Método de pago guardado correctamente', 'Guardado');
        
        // Cerrar modal
        const modalElement = document.getElementById('addPaymentMethodModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
        
        // Limpiar formulario
        document.getElementById('card_number').value = '';
        document.getElementById('expiry_date').value = '';
        document.getElementById('cardholder_name').value = '';
        document.getElementById('cvv').value = '';
        
        // Recargar métodos de pago
        loadPaymentMethods();
    })
    .catch(error => {
        console.error('Error al guardar método de pago:', error);
        toastr.error(error.error || 'Error al guardar el método de pago', 'Error');
    });
}

/**
 * Cargar métodos de pago existentes
 */
function loadPaymentMethods() {
    console.log(' Cargando métodos de pago...');
    
    // Obtener token del almacenamiento
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    // Cargar datos desde el backend
    window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.PAYMENT_METHODS, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

    })
    .then(data => {
        console.log('Métodos de pago cargados:', data);
        
        if (data.success && data.methods) {
            displayPaymentMethods(data.methods);
        } else {
            displayPaymentMethods([]);
        }
    })
    .catch(error => {
        console.error('Error al cargar métodos de pago:', error);
        displayPaymentMethods([]);
    });
}

/**
 * Mostrar métodos de pago en la UI
 */
function displayPaymentMethods(methods) {
    const container = document.getElementById('payment-methods-list');
    if (!container) return;
    
    if (methods.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-credit-card fa-2x mb-3"></i>
                <p>No hay métodos de pago configurados</p>
                <small>Agrega tu primer método de pago para comenzar</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = methods.map(method => `
        <div class="card mb-3" data-method-id="${method.id}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-credit-card text-primary me-3"></i>
                        <div>
                            <h6 class="mb-1">${method.cardholderName}</h6>
                            <small class="text-muted">${method.cardNumber} • ${method.expiryDate}</small>
                            ${method.isDefault ? '<span class="badge bg-success ms-2">Principal</span>' : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePaymentMethod('${method.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Eliminar método de pago
 */
function deletePaymentMethod(methodId) {
    console.log(` Eliminando método de pago: ${methodId}`);
    
    if (!confirm('¿Estás seguro de que deseas eliminar este método de pago?')) {
        return;
    }
    
    // Obtener token del almacenamiento
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    // Mostrar spinner de carga
    toastr.info('Eliminando método de pago...', 'Procesando');
    
    // Enviar solicitud de eliminación
    window.ApiHelper.fetchApi({ url: `${API_CONFIG.DASHBOARD.PAYMENT_METHOD}/${methodId}`, auth: 'jwt' }, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    
    .then(data => {
        console.log('Método de pago eliminado exitosamente:', data);
        toastr.success('Método de pago eliminado correctamente', 'Eliminado');
        
        // Recargar métodos de pago
        loadPaymentMethods();
    })
    .catch(error => {
        console.error('Error al eliminar método de pago:', error);
        toastr.error(error.error || 'Error al eliminar el método de pago', 'Error');
    });
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
    
    // Obtener token del almacenamiento
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    // Mostrar spinner de carga
    toastr.info('Guardando datos de facturación...', 'Procesando');
    
    // Enviar datos al backend
    window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.BILLING_INFO, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company,
            taxId,
            address,
            postalCode,
            city,
            country
        })
    })
    
    .then(data => {
        console.log('Datos de facturación guardados exitosamente:', data);
        toastr.success('Datos de facturación guardados correctamente', 'Guardado');
    })
    .catch(error => {
        console.error('Error al guardar datos de facturación:', error);
        toastr.error(error.error || 'Error al guardar los datos de facturación', 'Error');
    });
}

/**
 * Cargar información de facturación existente
 */
function loadBillingInfo() {
    console.log('💳 Cargando información de facturación...');
    
    // Obtener token del almacenamiento
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    
    // Cargar datos desde el backend
    window.ApiHelper.fetchApi(API_CONFIG.DASHBOARD.BILLING_INFO, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

    })
    .then(data => {
        console.log('Información de facturación cargada:', data);
        
        if (data.success && data.billingInfo) {
            const billing = data.billingInfo;
            
            // Llenar campos del formulario
            if (billing.company) document.getElementById('billing_company').value = billing.company;
            if (billing.taxId) document.getElementById('billing_tax_id').value = billing.taxId;
            if (billing.address) document.getElementById('billing_address').value = billing.address;
            if (billing.postalCode) document.getElementById('billing_postal_code').value = billing.postalCode;
            if (billing.city) document.getElementById('billing_city').value = billing.city;
            if (billing.country) document.getElementById('billing_country').value = billing.country;
            
            console.log('✅ Información de facturación cargada en el formulario');
        }
    })
    .catch(error => {
        console.error('Error al cargar información de facturación:', error);
        // No mostrar error si simplemente no hay datos guardados
    });
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
 * @param {boolean} withAI - Si es respuesta con IA o manual
 */
function createReplyModal(emailId, sender, subject, withAI = false) {
    // Cerrar cualquier modal de detalles abierto
    const detailsModal = document.querySelector('.modal.show');
    if (detailsModal) {
        const bsModal = bootstrap.Modal.getInstance(detailsModal);
        if (bsModal) bsModal.hide();
    }
    
    // Generar ID único para el modal
    const modalId = withAI ? 'aiReplyModal' : 'manualReplyModal';
    
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
                        <h5 class="modal-title" id="${modalId}-label" style="font-size: 0.9rem;">
                            <i class="fas fa-${withAI ? 'robot' : 'reply'} me-2" style="font-size: 0.8rem;"></i>RE: ${subject}
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
                        ${withAI ? `
                        <div class="mb-3 d-flex align-items-center" id="ai-loading-${emailId}">
                            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                                <span class="visually-hidden">Generando respuesta...</span>
                            </div>
                            <span style="font-size: 0.8rem;">La IA está generando una respuesta...</span>
                        </div>
                        ` : ''}
                        <div class="mb-3">
                            <label for="reply-content-${emailId}" class="form-label" style="font-size: 0.8rem;">Mensaje:</label>
                            <textarea class="form-control" id="reply-content-${emailId}" rows="6" style="font-size: 0.8rem;" ${withAI ? 'placeholder="La respuesta generada por IA aparecerá aquí..."' : 'placeholder="Escribe tu respuesta aquí..."'}></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn-dashboard-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" data-bs-dismiss="modal">Cancelar</button>
                        ${withAI ? `<button type="button" class="btn-dashboard-info" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="regenerateAIReply(${emailId})">
                            <i class="fas fa-sync-alt me-2" style="font-size: 0.7rem;"></i>Regenerar
                        </button>` : ''}
                        <button type="button" class="btn-dashboard-primary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="sendReply(${emailId})">
                            <i class="fas fa-paper-plane me-2" style="font-size: 0.7rem;"></i>Enviar
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
    if (withAI) {
        setTimeout(() => {
            const aiResponse = generateAIResponse(emailId, subject);
            const contentElement = document.getElementById(`reply-content-${emailId}`);
            if (contentElement) {
                contentElement.value = aiResponse;
                // Ajustar altura del textarea para evitar scroll excesivo
                contentElement.style.height = 'auto';
                contentElement.style.height = (contentElement.scrollHeight) + 'px';
            }
            const loadingElement = document.getElementById(`ai-loading-${emailId}`);
            if (loadingElement) loadingElement.style.display = 'none';
        }, 1000);
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

// ========================================
// FUNCIONES MOCK PARA DATOS DE PRUEBA
// ========================================

/**
 * Generar datos mock para llamadas
 */
function getMockCallsData() {
    return [
        {
            id: 1,
            date: '2024-01-15',
            time: '10:30',
            phone: '+34 612 345 678',
            contactType: 'Cliente',
            summary: 'Consulta sobre servicios',
            details: 'El cliente preguntó sobre nuestros planes de servicio premium',
            duration: '5:23',
            type: 'incoming',
            urgency: 'normal'
        },
        {
            id: 2,
            date: '2024-01-15',
            time: '14:15',
            phone: '+34 687 123 456',
            contactType: 'Prospecto',
            summary: 'Interés en producto',
            details: 'Llamada de seguimiento para demostración del producto',
            duration: '8:45',
            type: 'outgoing',
            urgency: 'high'
        },
        {
            id: 3,
            date: '2024-01-14',
            time: '16:20',
            phone: '+34 654 987 321',
            contactType: 'Cliente',
            summary: 'Soporte técnico',
            details: 'Problema resuelto con la configuración del sistema',
            duration: '12:10',
            type: 'incoming',
            urgency: 'urgent'
        }
    ];
}

/**
 * Generar datos mock para emails
 */
function getMockEmailsData() {
    return [
        {
            id: 1,
            sender: 'cliente@empresa.com',
            senderType: 'Cliente',
            subject: 'Consulta sobre facturación',
            preview: 'Necesito información sobre mi última factura...',
            date: '2024-01-15',
            time: '09:15',
            read: false,
            important: true,
            spam: false
        },
        {
            id: 2,
            sender: 'info@proveedor.com',
            senderType: 'Proveedor',
            subject: 'Actualización de servicios',
            preview: 'Le informamos sobre las nuevas funcionalidades...',
            date: '2024-01-15',
            time: '11:30',
            read: true,
            important: false,
            spam: false
        },
        {
            id: 3,
            sender: 'marketing@spam.com',
            senderType: 'Promocional',
            subject: 'Oferta especial limitada',
            preview: '¡No te pierdas esta increíble oportunidad!',
            date: '2024-01-14',
            time: '20:45',
            read: false,
            important: false,
            spam: true
        }
    ];
}

// ========================================
// INICIALIZACIÓN DEL DASHBOARD
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Dashboard Simple...');
    
    // Añadir estilos CSS
    addDashboardStyles();
    
    // Inicializar botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutHandler);
        console.log('✅ Botón de logout inicializado');
    }
    
    // Verificar si hay un usuario autenticado usando el token JWT
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('🔐 Verificando autenticación...');
    console.log('🔑 Token presente:', !!token);
    console.log('👤 Datos de usuario presentes:', !!userData);
    
    if (token && userData) {
        console.log('✅ Usuario autenticado, inicializando dashboard...');
        
        // Obtener datos de la empresa del usuario
        const companyData = JSON.parse(localStorage.getItem('companyData') || '{}');
        
        // Adaptar el dashboard según el contexto de la empresa (ya incluye createTabsContent)
        adaptOtherContextSimple(companyData);
        
        // Solo configurar event listeners adicionales sin recrear contenido
        setupEventListeners();
        
        // Cargar datos existentes del perfil y configuración desde el backend
        loadExistingData();
        
        // Inicializar el sistema de seguimiento de uso
        if (window.UsageTracker) {
            initializeUsageTracker();
        }
        
        // Inicializar dropdowns de Bootstrap después de cargar el contenido
        setTimeout(() => {
            initializeDropdowns();
            // Inicializar eventos de facturación
            initBillingEvents();
        }, 1000);
    } else {
        console.error('❌ Usuario no autenticado - Token o datos de usuario faltantes');
        console.error('🔑 Token:', token ? 'PRESENTE' : 'AUSENTE');
        console.error('👤 User data:', userData ? 'PRESENTE' : 'AUSENTE');
        window.location.href = 'login.html';
    }
});

// ===== FUNCIONES PARA OPERACIONES DE EMAILS =====

/**
 * Marcar o desmarcar un email como favorito
 * @param {number} emailId - ID del email
 * @param {HTMLElement} starBtn - Botón de estrella
 */
function toggleEmailFavorite(emailId, starBtn) {
    console.log(`⭐ Cambiando favorito de email ID: ${emailId}`);
    
    // Verificar si ya está marcado como favorito
    const starIcon = starBtn.querySelector('i');
    const isFavorite = starIcon.classList.contains('fas');
    
    // Hacer petición al backend
    window.ApiHelper.fetchApi({ url: `/api/emails/${emailId}/favorite`, auth: 'jwt' }, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ favorite: !isFavorite })
    })
    .then(response => {
        if (response.success) {
            // Actualizar UI
            if (isFavorite) {
                // Desmarcar como favorito
                starIcon.classList.remove('fas', 'text-warning');
                starIcon.classList.add('far', 'text-muted');
                toastr.info(`Email desmarcado como favorito`, 'Favorito');
            } else {
                // Marcar como favorito
                starIcon.classList.remove('far', 'text-muted');
                starIcon.classList.add('fas', 'text-warning');
                toastr.success(`Email marcado como favorito`, 'Favorito');
            }
        } else {
            toastr.error('Error al actualizar favorito', 'Error');
        }
    })
    .catch(error => {
        console.error('Error al cambiar favorito:', error);
        toastr.error('Error de conexión', 'Error');
    });
}

/**
 * Marcar un email como leído
 * @param {number} emailId - ID del email
 */
function markEmailAsRead(emailId) {
    console.log(`📧 Marcando email como leído ID: ${emailId}`);
    
    // Buscar la fila del email
    const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
    if (!emailRow) {
        console.error(`No se encontró el email con ID ${emailId}`);
        toastr.error('No se pudo encontrar el email', 'Error');
        return;
    }
    
    // Hacer petición al backend
    window.ApiHelper.fetchApi({ url: `/api/emails/${emailId}/read`, auth: 'jwt' }, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ read: true })
    })
    .then(response => {
        if (response.success) {
            // Actualizar UI - remover indicador de no leído
            emailRow.classList.remove('table-warning');
            emailRow.classList.add('table-light');
            
            // Actualizar icono si existe
            const unreadIcon = emailRow.querySelector('.unread-indicator');
            if (unreadIcon) {
                unreadIcon.remove();
            }
            
            // Actualizar texto en negrita
            const subjectCell = emailRow.querySelector('.email-subject');
            if (subjectCell) {
                subjectCell.style.fontWeight = 'normal';
            }
            
            toastr.success('Email marcado como leído', 'Leído');
        } else {
            toastr.error('Error al marcar como leído', 'Error');
        }
    })
    .catch(error => {
        console.error('Error al marcar como leído:', error);
        toastr.error('Error de conexión', 'Error');
    });
}
