/**
 * Servicio de autenticación para gestionar todas las operaciones de auth con el backend
 */

// API_CONFIG debe estar disponible globalmente

class AuthService {
  constructor() {
    // Máximo número de reintentos para peticiones fallidas
    this.maxRetries = 3;
    // Tiempo base para backoff exponencial (ms)
    this.baseRetryDelay = 1000;
    // Flag para indicar si el backend está despertando
    this.isWakingUp = false;
  }
  
  /**
   * Realiza una petición con reintentos automáticos
   * @param {string} url - URL de la petición
   * @param {Object} options - Opciones de fetch
   * @returns {Promise<Response>} Respuesta de la petición
   */
  async fetchWithRetry(url, options, retryCount = 0) {
    try {
      // Si es el primer intento, mostrar mensaje de carga
      if (retryCount === 0) {
        console.log(`Enviando petición a ${url}...`);
      } else {
        console.log(`Reintentando petición (${retryCount}/${this.maxRetries})...`);
        // Si estamos reintentando, es posible que el backend esté despertando
        if (!this.isWakingUp) {
          this.isWakingUp = true;
          console.info('Conectando con el servidor... Esto puede tardar unos segundos si el servidor estaba inactivo.');
        }
      }
      
      // Añadir timeout a la petición
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
      
      const enhancedOptions = {
        ...options,
        signal: controller.signal
      };
      
      const response = await fetch(url, enhancedOptions);
      clearTimeout(timeoutId);
      
      // Si el backend estaba despertando y ahora responde, resetear el flag
      if (this.isWakingUp && response.ok) {
        this.isWakingUp = false;
        console.log('Conexión establecida con el servidor');
      }
      
      return response;
    } catch (error) {
      // Si es un error de timeout o conexión y no hemos superado los reintentos
      if ((error.name === 'AbortError' || error.name === 'TypeError') && retryCount < this.maxRetries) {
        // Calcular tiempo de espera con backoff exponencial
        const delay = this.baseRetryDelay * Math.pow(2, retryCount);
        console.log(`Error de conexión. Reintentando en ${delay}ms...`);
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Reintentar la petición
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      
      // Si hemos agotado los reintentos o es otro tipo de error
      console.error('Error en la petición después de reintentos:', error);
      throw error;
    }
  }
  
  /**
   * Registra un nuevo usuario en el sistema
   * @param {Object} userData - Datos del usuario a registrar
   * @returns {Promise<Object>} Resultado de la operación
   */
  async register(userData) {
    try {
      console.log('Iniciando registro de usuario:', userData.email);
      let data;

      try {
        const response = await this.fetchWithRetry(API_CONFIG.getFullUrl(API_CONFIG.AUTH.REGISTER), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });
        
        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error al parsear respuesta JSON:', parseError);
          console.log('Respuesta recibida (texto):', responseText);
          throw new Error('Error al procesar la respuesta del servidor');
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Error en el registro');
        }
      } catch (apiError) {
        console.warn('API no disponible. Usando modo offline para registro:', apiError);
        
        // Modo fallback: Creamos un usuario local simulado
        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockUserId = `user_${Date.now()}`;
        
        // Estructura similar a la respuesta del API
        data = {
          token: mockToken,
          client: {
            id: mockUserId,
            email: userData.email,
            companyName: userData.companyName,
            businessSector: userData.businessSector,
            plan: userData.plan || 'trial',
            createdAt: new Date().toISOString(),
            isOfflineMode: true  // Flag para indicar que es un usuario offline
          },
          message: 'Cuenta creada en modo offline. Algunas funciones estarán limitadas.',
          isOfflineRegistration: true
        };
      }
      
      // Si el registro es exitoso (ya sea online u offline), guardamos el token en localStorage
      if (data.token) {
        console.log('Registro exitoso, guardando token...');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_data', JSON.stringify(data.client));
        localStorage.setItem('auth_timestamp', Date.now().toString());
        
        // Si fue un registro offline, guardar flag
        if (data.isOfflineRegistration) {
          localStorage.setItem('offline_mode', 'true');
          console.warn('Usuario registrado en modo offline');
        }
      } else {
        console.warn('No se recibió token en la respuesta de registro');
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
      console.log('Iniciando proceso de login...');
      let data;

      // Verificar que API_CONFIG está disponible
      if (!window.API_CONFIG) {
        console.error('API_CONFIG no está disponible');
        throw new Error('Error de configuración: API_CONFIG no disponible');
      }
      
      try {
        console.log('URL de login:', API_CONFIG.getFullUrl(API_CONFIG.AUTH.LOGIN));
        
        const response = await this.fetchWithRetry(API_CONFIG.getFullUrl(API_CONFIG.AUTH.LOGIN), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        console.log('Respuesta recibida. Status:', response.status);
        
        const responseText = await response.text();
        
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error al parsear respuesta JSON:', parseError);
          console.log('Respuesta recibida (texto):', responseText);
          throw new Error('Error al procesar la respuesta del servidor');
        }
        
        if (!response.ok) {
          console.error('Error en respuesta:', data);
          throw new Error(data.error || 'Error en el inicio de sesión');
        }
      } catch (apiError) {
        console.warn('API no disponible, intentando login en modo offline', apiError);
        
        // Verificar si hay un usuario offline con estas credenciales
        const offlineMode = localStorage.getItem('offline_mode');
        const storedUserData = localStorage.getItem('user_data');
        
        if (offlineMode === 'true' && storedUserData) {
          const userData = JSON.parse(storedUserData);
          
          // En modo demo, permitimos login con cualquier contraseña que tenga al menos 8 caracteres
          if (userData.email === email && password.length >= 8) {
            console.log('Login offline exitoso');
            
            // Crear token demo renovado
            const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            data = {
              token: mockToken,
              client: userData,
              isOfflineLogin: true,
              message: 'Sesión iniciada en modo offline. Algunas funciones estarán limitadas.'
            };
          } else {
            throw new Error('Credenciales incorrectas');
          }
        } else if (email.endsWith('@demo.com') && password === 'demo1234') {
          // Usuario demo especial para testing
          console.log('Login con usuario demo');
          const mockToken = `demo_token_${Date.now()}`;
          
          data = {
            token: mockToken,
            client: {
              id: 'demo_user',
              email: email,
              companyName: 'Empresa Demo',
              businessSector: 'demo',
              plan: 'trial',
              createdAt: new Date().toISOString(),
              isOfflineMode: true
            },
            isOfflineLogin: true,
            message: 'Sesión demo iniciada. Esta cuenta es solo para pruebas.'
          };
          
          // Guardar modo offline
          localStorage.setItem('offline_mode', 'true');
        } else {
          throw new Error('No se pudo conectar con el servidor. Inténtalo más tarde.');
        }
      }
      
      console.log('Login exitoso. Guardando token...');
      
      // Guardar token y datos de usuario en sessionStorage (expira al cerrar pestaña)
      if (data.token) {
        sessionStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_token', data.token); // Mantener copia en localStorage para compatibilidad
        if (data.client) {
          sessionStorage.setItem('user_data', JSON.stringify(data.client));
          localStorage.setItem('user_data', JSON.stringify(data.client));
        }
        sessionStorage.setItem('auth_timestamp', Date.now().toString());
        localStorage.setItem('auth_timestamp', Date.now().toString());
        console.log('Token guardado correctamente en sessionStorage');
      } else {
        console.warn('No se recibió token en la respuesta');
      }
      
      return data;
    } catch (error) {
      console.error('Error en login:', error);
      console.error(error.message || 'Error al conectar con el servidor');
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
      const response = await this.fetchWithRetry(API_CONFIG.getFullUrl(API_CONFIG.AUTH.FORGOT_PASSWORD), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON:', parseError);
        throw new Error('Error al procesar la respuesta del servidor');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud de recuperación');
      }
      
      return data;
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      console.error(error.message || 'Error al conectar con el servidor');
      throw error;
    }
  }
  
  /**
   * Obtiene el perfil del usuario actual
   * @returns {Promise<Object>} Datos del perfil
   */
  async getProfile() {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const response = await this.fetchWithRetry(API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON:', parseError);
        throw new Error('Error al procesar la respuesta del servidor');
      }
      
      if (!response.ok) {
        // Si el token es inválido, limpiar localStorage
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
        throw new Error(data.error || 'Error al obtener el perfil');
      }
      
      // Actualizar datos de usuario en localStorage
      if (data.client) {
        localStorage.setItem('user_data', JSON.stringify(data.client));
      }
      
      return data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
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
    window.location.href = 'login.html';
  }
  
  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} Estado de autenticación
   */
  isAuthenticated() {
    // Priorizar sessionStorage (expira al cerrar pestaña)
    const sessionToken = sessionStorage.getItem('auth_token');
    const localToken = localStorage.getItem('auth_token');
    
    // Si hay token en sessionStorage, usarlo
    if (sessionToken) {
      return true;
    }
    
    // Si no hay en sessionStorage pero sí en localStorage, migrar a sessionStorage
    if (localToken && !sessionToken) {
      sessionStorage.setItem('auth_token', localToken);
      const userData = localStorage.getItem('user_data');
      if (userData) {
        sessionStorage.setItem('user_data', userData);
      }
      const timestamp = localStorage.getItem('auth_timestamp');
      if (timestamp) {
        sessionStorage.setItem('auth_timestamp', timestamp);
      }
      return true;
    }
    
    return false;
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
