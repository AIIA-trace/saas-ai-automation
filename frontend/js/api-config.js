/**
 * Configuración centralizada para llamadas a la API
 */

// Verificar si el objeto global ya existe para evitar redefiniciones
if (typeof window.API_CONFIG === 'undefined') {
  console.log('Inicializando API_CONFIG...');
  
  // Crear objeto de configuración global
  window.API_CONFIG = {
    // URL base de la API - Usar Render para producción
    apiBaseUrl: 'https://saas-ai-automation.onrender.com',
  
    // Endpoints de autenticación
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      ME: '/api/auth/me'
    },
    
    // Endpoints principales del dashboard (TODOS requieren JWT token)
    DASHBOARD: {
      // === ENDPOINT UNIFICADO (USAR ESTE) ===
      // Endpoint unificado para toda la configuración del cliente
      CLIENT_DATA: { url: '/api/client', auth: 'jwt' },
      
      // === ENDPOINTS LEGACY (OBSOLETOS - PROGRAMADOS PARA ELIMINACIÓN) ===
      // ADVERTENCIA: Estos endpoints serán eliminados en la próxima versión
      // Usar EXCLUSIVAMENTE CLIENT_DATA: { url: '/api/client', auth: 'jwt' }
      
      // Configuración de cliente (endpoints legacy)
      CLIENT_CONFIG: { url: '/api/config', auth: 'jwt', deprecated: true },
      UPDATE_PROFILE: { url: '/api/profile', auth: 'jwt' },
      CHANGE_PASSWORD: { url: '/api/profile/password', auth: 'jwt' },
      
      // Configuración del bot (OBSOLETO - usar CLIENT_DATA)
      BOT_CONFIG: { url: '/api/config/bot', auth: 'jwt', deprecated: true },
      BOT_UPLOAD_CONTEXT: { url: '/api/bot/upload-context', auth: 'jwt', deprecated: true },
      
      // Configuración de email (OBSOLETO - usar CLIENT_DATA)
      EMAIL_CONFIG: { url: '/api/config/email', auth: 'jwt', deprecated: true },
      EMAIL_TEMPLATES: { url: '/api/config/email/templates', auth: 'jwt' },
      
      // Notificaciones
      NOTIFICATIONS_CONFIG: { url: '/api/config/notifications', auth: 'jwt' },
      
      // Llamadas y emails
      CALLS: { url: '/api/logs/calls', auth: 'jwt' },
      EMAILS: { url: '/api/logs/emails', auth: 'jwt' },
      CALL_DETAIL: { url: '/api/logs/calls/{callId}', auth: 'jwt' },
      EMAIL_DETAIL: { url: '/api/logs/emails/{emailId}', auth: 'jwt' },
      
      // Facturación
      BILLING_INFO: { url: '/api/billing/info', auth: 'jwt' },
      PAYMENT_METHODS: { url: '/api/payment/methods', auth: 'jwt' },
      PAYMENT_METHOD: { url: '/api/payment/method', auth: 'jwt' },
      INVOICES: { url: '/api/billing/invoices', auth: 'jwt' },
      SUBSCRIPTION: { url: '/api/billing/subscription', auth: 'jwt' }
    },
    
    // Endpoints específicos por sector
    RESTAURANT: {
      ORDERS: '/api/clients/{clientId}/orders/active',
      RESERVATIONS: '/api/clients/{clientId}/reservations/today'
    },
    
    BEAUTY: {
      APPOINTMENTS: '/api/clients/{clientId}/appointments/upcoming',
      SERVICES: '/api/clients/{clientId}/services'
    },
    
    RETAIL: {
      INVENTORY: '/api/clients/{clientId}/inventory/low-stock',
      SALES: '/api/clients/{clientId}/sales/recent'
    },
    
    OTHER: {
      PROJECTS: '/api/clients/{clientId}/projects',
      TASKS: '/api/clients/{clientId}/tasks',
      CLIENTS: '/api/clients/{clientId}/clients'
    },
    
    // Funciones helper
    getFullUrl: function(endpoint) {
      return this.apiBaseUrl + endpoint;
    },
    
    // Reemplaza {clientId} en la URL con el ID real
    replaceClientId: function(url, clientId) {
      return url.replace('{clientId}', clientId);
    }
  };

  // Asignar al objeto global para acceso desde cualquier script
  console.log('API_CONFIG inicializado con URL base:', window.API_CONFIG.apiBaseUrl);
}

// Exportar para compatibilidad con módulos (versión unificada sin duplicación)
if (typeof module !== 'undefined') {
  module.exports = window.API_CONFIG;
}

// Log de confirmación
console.log('api-config.js cargado correctamente - Solo usar endpoint CLIENT_DATA');
