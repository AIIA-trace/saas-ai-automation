/**
 * Dashboard Limpio para MVP - Solo funciones esenciales
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDynamicDashboard();
});

/**
 * Inicializa el dashboard dinámico
 */
function initializeDynamicDashboard() {
    console.log('=== INICIALIZANDO DASHBOARD DINÁMICO ===');
    
    // Verificar token de autenticación
    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.log('No hay token de autenticación, redirigiendo al login');
        window.location.href = 'login.html';
        return;
    }
    
    // Cargar configuración de la empresa
    loadCompanyConfig();
}

/**
 * Carga la configuración de la empresa
 */
async function loadCompanyConfig() {
    console.log('Cargando configuración de la empresa...');
    
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/company/config`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const config = await response.json();
        console.log('Configuración cargada:', config);
        
        // Adaptar dashboard según configuración
        adaptDashboard(config);
        
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        // Usar configuración por defecto para agente de IA
        const defaultConfig = {
            businessSector: 'otro',
            companyName: 'Mi Empresa'
        };
        adaptDashboard(defaultConfig);
    }
}

/**
 * Adapta el dashboard según la configuración
 */
function adaptDashboard(config) {
    console.log('Adaptando dashboard con configuración:', config);
    
    // Actualizar título
    updateDashboardTitle(config.companyName || 'Dashboard');
    
    // Adaptar según sector
    const sector = config.businessSector || 'otro';
    console.log(`Sector detectado: ${sector}`);
    
    switch (sector.toLowerCase()) {
        case 'otro':
        case 'other':
            console.log('Aplicando adaptación para AGENTE DE IA');
            adaptOtherContextSimple(config);
            break;
        default:
            console.log('Sector no reconocido, aplicando adaptación para AGENTE DE IA');
            adaptOtherContextSimple(config);
            break;
    }
}

/**
 * Actualiza el título del dashboard
 */
function updateDashboardTitle(companyName) {
    console.log(`Actualizando título del dashboard: ${companyName}`);
    
    // Actualizar título en la navbar
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.textContent = companyName;
    }
    
    // Actualizar título del documento
    document.title = `${companyName} - Dashboard`;
    
    // Actualizar elementos con clase company-name
    const companyNameElements = document.querySelectorAll('.company-name');
    companyNameElements.forEach(element => {
        element.textContent = companyName;
    });
}
