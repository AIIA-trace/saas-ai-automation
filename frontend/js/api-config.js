/**
 * Configuración centralizada para llamadas a la API
 */

const API_CONFIG = {
  // URL base de la API - Cambiar según entorno
  BASE_URL: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:10000'
    : 'https://saas-ai-automation.onrender.com',
  
  // Endpoints de autenticación
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    ME: '/api/auth/me'
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
  
  // Funciones helper
  getFullUrl: function(endpoint) {
    return this.BASE_URL + endpoint;
  },
  
  // Reemplaza {clientId} en la URL con el ID real
  replaceClientId: function(url, clientId) {
    return url.replace('{clientId}', clientId);
  }
};

// Para usar en módulos ES
if (typeof module !== 'undefined') {
  module.exports = API_CONFIG;
}
