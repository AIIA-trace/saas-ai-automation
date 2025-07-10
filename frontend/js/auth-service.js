/**
 * Servicio de autenticación para gestionar todas las operaciones de auth con el backend
 */

// Importar configuración de API
const API_CONFIG = typeof require !== 'undefined' ? require('./api-config') : window.API_CONFIG;

class AuthService {
  /**
   * Registra un nuevo usuario en el sistema
   * @param {Object} userData - Datos del usuario a registrar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async register(userData) {
    try {
      const response = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.REGISTER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }
      
      // Si el registro es exitoso, guardamos el token en localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.client));
      }
      
      return data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }
  
  /**
   * Inicia sesión con credenciales de usuario
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async login(email, password) {
    try {
      const response = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en el inicio de sesión');
      }
      
      // Guardar token y datos de usuario en localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.client));
      }
      
      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }
  
  /**
   * Solicita un restablecimiento de contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.FORGOT_PASSWORD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud de recuperación');
      }
      
      return data;
    } catch (error) {
      console.error('Error solicitando reset de contraseña:', error);
      throw error;
    }
  }
  
  /**
   * Restablece la contraseña con el token recibido
   * @param {string} token - Token de restablecimiento
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} Resultado de la operación
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.RESET_PASSWORD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error restableciendo contraseña');
      }
      
      return data;
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene información del usuario actual
   * @returns {Promise<Object>} Datos del usuario
   */
  async getCurrentUser() {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo datos del usuario');
      }
      
      // Actualizar datos en localStorage
      localStorage.setItem('user_data', JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      throw error;
    }
  }
  
  /**
   * Cierra la sesión del usuario
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    // Redirigir a la página de login
    window.location.href = '/login.html';
  }
  
  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} Estado de autenticación
   */
  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  }
  
  /**
   * Obtiene los datos del usuario del localStorage
   * @returns {Object|null} Datos del usuario o null si no está autenticado
   */
  getUserData() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  
  /**
   * Obtiene el token de autenticación
   * @returns {string|null} Token o null si no está autenticado
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }
}

// Exportar como singleton
const authService = new AuthService();

// Para usar en módulos ES
if (typeof module !== 'undefined') {
  module.exports = authService;
} else {
  // Para uso en el navegador
  window.authService = authService;
}
