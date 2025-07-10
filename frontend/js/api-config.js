/**
 * Configuración centralizada para llamadas a la API
 */

const API_CONFIG = {
  // URL base de la API - Cambiar según entorno
  BASE_URL: 'http://localhost:3000',
  
  // Endpoints de autenticación
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me'
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
