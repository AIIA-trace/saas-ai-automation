/**
 * API Helper - Funciones para facilitar las llamadas a la API
 * Este módulo centraliza la construcción de URLs y la gestión de tokens
 * para todas las llamadas a la API
 * 
 * V3 - Con sistema dual de autenticación: JWT para rutas de auth y API Key para rutas de API
 */

// Objeto global para funciones helper de API
window.ApiHelper = {
    /**
     * Obtiene la URL base de la API
     * @returns {string} URL base de la API
     */
    getBaseUrl: function() {
        // Usar la configuración global si existe, o la URL por defecto de Render
        return window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
    },

    /**
     * Obtiene el token JWT de autenticación validado
     * @returns {string|null} Token de autenticación validado o null si no existe o es inválido
     */
    getAuthToken: function() {
        // Si existe la función de validación de token, usarla
        if (window.getValidatedAuthToken) {
            return window.getValidatedAuthToken();
        }
        
        // Método de respaldo si no existe el validador
        return localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    },
    
    /**
     * Obtiene la API key del usuario
     * @returns {string|null} API key o null si no existe
     */
    getApiKey: function() {
        return localStorage.getItem('api_key');
    },
    
    /**
     * Guarda la API key en localStorage
     * @param {string} apiKey - API key a guardar
     */
    setApiKey: function(apiKey) {
        if (apiKey) {
            localStorage.setItem('api_key', apiKey);
            console.log('🔑 API Key guardada correctamente');
        }
    },
    
    /**
     * Determina el tipo de autenticación necesario para un endpoint
     * @param {string} endpoint - Endpoint a verificar
     * @returns {string} - 'none', 'jwt' o 'apikey'
     */
    getAuthType: function(endpoint) {
        // Endpoints públicos que no requieren autenticación
        const publicEndpoints = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
            '/api/public/',
            '/api/webhook/'
        ];
        
        // Verificar si es un endpoint público
        if (publicEndpoints.some(publicEp => endpoint.startsWith(publicEp))) {
            return 'none';
        }
        
        // Endpoints que usan JWT (rutas de auth que no son públicas)
        if (endpoint.startsWith('/api/auth/')) {
            return 'jwt';
        }
        
        // Todas las demás rutas /api/ usan API key
        if (endpoint.startsWith('/api/')) {
            return 'apikey';
        }
        
        // Por defecto, usar JWT
        return 'jwt';
    },

    /**
     * Construye una URL completa para la API
     * @param {string} endpoint - Endpoint relativo (con o sin / inicial)
     * @returns {string} URL completa
     */
    buildUrl: function(endpoint) {
        const baseUrl = this.getBaseUrl();
        
        // Asegurarse de que el endpoint comienza con / pero la URL base no termina con /
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        
        return `${cleanBaseUrl}${cleanEndpoint}`;
    },

    /**
     * Crea headers estándar para las peticiones API con autenticación
     * @param {string} endpoint - Endpoint para determinar el tipo de autenticación
     * @param {Object} additionalHeaders - Headers adicionales a incluir
     * @returns {Object} Headers completos
     */
    getHeaders: function(endpoint, additionalHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };
        
        const authType = this.getAuthType(endpoint);
        
        if (authType === 'none') {
            return headers;
        }
        
        if (authType === 'jwt') {
            const token = this.getAuthToken();
            if (token) {
                // IMPORTANTE: La API espera el token con el prefijo "Bearer "
                headers['Authorization'] = `Bearer ${token}`;
                console.log(`🔑 Usando JWT token: ${token.substring(0, 15)}...`);
            }
        } else if (authType === 'apikey') {
            let apiKey = this.getApiKey();
            
            if (apiKey) {
                // IMPORTANTE: La API espera la API key con el prefijo "Bearer "
                headers['Authorization'] = `Bearer ${apiKey}`;
                console.log(`🔑 Usando API Key: ${apiKey.substring(0, 10)}...`);
            } else {
                // Si no hay API key pero hay JWT, mostrar advertencia
                console.warn('⚠️ No hay API key disponible para una ruta que la requiere');
            }
        }
        
        return headers;
    },
    
    /**
     * Obtiene la API key del usuario usando el JWT token
     * @returns {Promise<string|null>} - Promise con la API key o null si falla
     */
    fetchApiKey: async function() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.error('🔒 No hay JWT token para obtener API key');
                return null;
            }
            
            console.log('🔑 Intentando obtener API key desde el perfil...');
            
            // Usar el JWT para obtener datos del perfil
            const response = await fetch(this.buildUrl('/api/auth/me'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al obtener perfil`);
            }
            
            const userData = await response.json();
            
            if (userData && userData.apiKey) {
                console.log('🔑 API Key obtenida correctamente del perfil');
                this.setApiKey(userData.apiKey);
                return userData.apiKey;
            } else {
                console.warn('⚠️ No se encontró API Key en el perfil');
                
                // Si no hay API key en el perfil, intentar generarla
                return this.generateApiKey();
            }
        } catch (error) {
            console.error('🔒 Error al obtener API Key:', error);
            return null;
        }
    },
    
    /**
     * Genera una nueva API key para el usuario
     * @returns {Promise<string|null>} - Promise con la nueva API key o null si falla
     */
    generateApiKey: async function() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.error('🔒 No hay JWT token para generar API key');
                return null;
            }
            
            console.log('🔑 Generando nueva API Key...');
            
            // Usar el JWT para generar una nueva API key
            const response = await fetch(this.buildUrl('/api/auth/api-key'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al generar API Key`);
            }
            
            const result = await response.json();
            
            if (result && result.apiKey) {
                console.log('🔑 Nueva API Key generada correctamente');
                this.setApiKey(result.apiKey);
                return result.apiKey;
            } else {
                throw new Error('No se pudo generar API Key');
            }
        } catch (error) {
            console.error('🔒 Error al generar API Key:', error);
            return null;
        }
    },

    /**
     * Determina si un endpoint requiere autenticación
     * @param {string} endpoint - Endpoint a verificar
     * @returns {boolean} - true si requiere autenticación
     */
    requiresAuth: function(endpoint) {
        return this.getAuthType(endpoint) !== 'none';
    },
    
    /**
     * Realiza una petición fetch a la API con gestión dual de autenticación
     * Usa JWT para rutas de auth y API Key para otras rutas API
     * @param {string} endpoint - Endpoint relativo
     * @param {Object} options - Opciones de fetch
     * @returns {Promise} Promesa con la respuesta de fetch
     */
    fetchApi: async function(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const authType = this.getAuthType(endpoint);
        
        console.log(`🌐 Preparando petición API a: ${url}`);
        console.log(`🔑 Tipo de autenticación requerida: ${authType}`);
        
        // Si no requiere autenticación, hacer petición directa
        if (authType === 'none') {
            console.log('🔓 Endpoint público, sin autenticación');
            return fetch(url, options);
        }
        
        // Para rutas que requieren JWT
        if (authType === 'jwt') {
            const token = this.getAuthToken();
            
            if (!token) {
                console.error('🔒 No hay JWT token disponible para ruta protegida');
                
                // Intentar renovar token
                if (window.TokenValidator && window.TokenValidator.renewIfNeeded) {
                    try {
                        console.log('🔄 Intentando renovar JWT token...');
                        const renewed = await window.TokenValidator.renewIfNeeded();
                        if (renewed) {
                            console.log('✅ JWT token renovado, reintentando petición');
                            return this.fetchApi(endpoint, options);
                        }
                    } catch (renewError) {
                        console.error('❌ Error renovando JWT token:', renewError);
                    }
                }
                
                throw new Error('No autorizado: JWT token no disponible');
            }
            
            // Construir opciones con JWT token
            const headers = this.getHeaders(endpoint, options.headers || {});
            const fetchOptions = {
                ...options,
                headers
            };
            
            try {
                console.log('🔑 Enviando petición con JWT token');
                const response = await fetch(url, fetchOptions);
                
                // Si hay error 401, intentar renovar token
                if (response.status === 401) {
                    console.warn('⚠️ Error 401 con JWT token');
                    
                    if (window.TokenValidator && window.TokenValidator.renewIfNeeded) {
                        try {
                            console.log('🔄 Intentando renovar JWT token tras error 401...');
                            const renewed = await window.TokenValidator.renewIfNeeded(true);
                            if (renewed) {
                                console.log('✅ JWT token renovado, reintentando petición');
                                return this.fetchApi(endpoint, options);
                            }
                        } catch (renewError) {
                            console.error('❌ Error renovando JWT token:', renewError);
                        }
                    }
                    
                    console.error('🔒 ERROR: JWT token inválido o expirado');
                    throw new Error('Error de autenticación JWT (401)');
                }
                
                return response;
            } catch (error) {
                console.error('❌ Error en petición con JWT token:', error);
                throw error;
            }
        }
        
        // Para rutas que requieren API key
        if (authType === 'apikey') {
            let apiKey = this.getApiKey();
            
            // Si no hay API key, intentar obtenerla
            if (!apiKey) {
                console.warn('⚠️ No hay API key disponible, intentando obtenerla...');
                
                try {
                    apiKey = await this.fetchApiKey();
                    
                    if (!apiKey) {
                        console.error('🔒 No se pudo obtener API key');
                        throw new Error('No autorizado: API key no disponible');
                    }
                } catch (apiKeyError) {
                    console.error('❌ Error obteniendo API key:', apiKeyError);
                    throw new Error('Error obteniendo API key: ' + apiKeyError.message);
                }
            }
            
            // Construir opciones con API key
            const headers = this.getHeaders(endpoint, options.headers || {});
            const fetchOptions = {
                ...options,
                headers
            };
            
            try {
                console.log('🔑 Enviando petición con API key');
                const response = await fetch(url, fetchOptions);
                
                // Si hay error 401 o 403, intentar generar nueva API key
                if (response.status === 401 || response.status === 403) {
                    console.warn(`⚠️ Error ${response.status} con API key actual`);
                    
                    try {
                        console.log('🔄 Intentando generar nueva API key...');
                        apiKey = await this.generateApiKey();
                        
                        if (apiKey) {
                            console.log('✅ Nueva API key generada, reintentando petición');
                            return this.fetchApi(endpoint, options);
                        }
                    } catch (genError) {
                        console.error('❌ Error generando nueva API key:', genError);
                    }
                    
                    console.error('🔒 ERROR: API key inválida o permisos insuficientes');
                    throw new Error(`Error de autenticación API key (${response.status})`);
                }
                
                return response;
            } catch (error) {
                console.error('❌ Error en petición con API key:', error);
                throw error;
            }
        }
        
        // Por defecto, si no se reconoce el tipo de autenticación
        throw new Error(`Tipo de autenticación desconocido: ${authType}`);
    }
};

// Log de confirmación
console.log('✅ API Helper cargado correctamente');
