/**
 * Configuración centralizada para llamadas a la API
 */

// Verificar si el objeto global ya existe para evitar redefiniciones
if (typeof window.API_CONFIG === 'undefined') {
  console.log('Inicializando API_CONFIG...');
  
  // Crear objeto de configuración global
  window.API_CONFIG = {
    // URL base de la API - Siempre usar Render para pruebas
    apiBaseUrl: 'https://saas-ai-automation.onrender.com',
    
    // Descomentar esta línea para usar backend local cuando esté disponible
    // apiBaseUrl: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    //   ? 'http://localhost:10000'
    //   : 'https://saas-ai-automation.onrender.com',
  
    // Endpoints de autenticación
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      ME: '/api/auth/me'
    },
    
    // Endpoints principales del dashboard
    DASHBOARD: {
      // Configuración de cliente
      CLIENT_CONFIG: '/api/config',
      UPDATE_PROFILE: '/api/profile',
      
      // Configuración del bot
      BOT_CONFIG: '/api/config/bot',
      BOT_UPLOAD_CONTEXT: '/api/bot/upload-context',
      
      // Configuración de email
      EMAIL_CONFIG: '/api/config/email',
      EMAIL_TEMPLATES: '/api/config/email/templates',
      
      // Notificaciones
      NOTIFICATIONS_CONFIG: '/api/config/notifications',
      
      // Llamadas y emails
      CALLS: '/api/logs/calls',
      EMAILS: '/api/logs/emails',
      CALL_DETAIL: '/api/logs/calls/{callId}',
      EMAIL_DETAIL: '/api/logs/emails/{emailId}',
      
      // Facturación
      INVOICES: '/api/billing/invoices',
      SUBSCRIPTION: '/api/billing/subscription'
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

// Exportar para compatibilidad con módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.API_CONFIG;
}

// Log de confirmación
console.log('api-config.js cargado correctamente');

// Para usar en módulos ES
if (typeof module !== 'undefined') {
  module.exports = API_CONFIG;
}
