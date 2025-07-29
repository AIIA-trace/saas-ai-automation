/**
 * API Helper - Funciones para facilitar las llamadas a la API
 * Este módulo centraliza la construcción de URLs y la gestión de tokens
 * para todas las llamadas a la API
 * 
 * V2 - Con sistema de renovación automática de tokens y prueba de formatos
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
     * Obtiene el token de autenticación validado
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
     * @param {Object} additionalHeaders - Headers adicionales a incluir
     * @returns {Object} Headers completos
     */
    getHeaders: function(additionalHeaders = {}) {
        const token = this.getAuthToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };
        
        if (token) {
        // IMPORTANTE: La API espera el token sin el prefijo "Bearer "
        headers['Authorization'] = token;
        
        // Guardar el formato original para debugging
        console.log('🔑 Formato de token usado:', token);
    }
        
        return headers;
    },

    /**
     * Determina si un endpoint requiere autenticación
     * @param {string} endpoint - Endpoint a verificar
     * @returns {boolean} - true si requiere autenticación
     */
    requiresAuth: function(endpoint) {
        // Endpoints públicos que no requieren autenticación
        const publicEndpoints = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
            '/api/public/',
            '/api/webhook/'
        ];
        
        // Verificar si el endpoint está en la lista de públicos
        return !publicEndpoints.some(publicEp => endpoint.startsWith(publicEp));
    },
    
    /**
     * Realiza una petición fetch a la API con gestión avanzada de autenticación
     * Prueba diferentes formatos de token y maneja errores 401
     * @param {string} endpoint - Endpoint relativo
     * @param {Object} options - Opciones de fetch
     * @returns {Promise} Promesa con la respuesta de fetch
     */
    fetchApi: async function(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const token = this.getAuthToken();
        
        console.log(`🌐 Preparando petición API a: ${url}`);
        console.log(`🔑 Estado del token: ${token ? 'Disponible' : 'No disponible'}`);
        
        // Formatos de token a probar en secuencia
        const tokenFormats = [
            // Formato 1: Sin prefijo (token directo)
            token ? { 'Authorization': token } : {},
            
            // Formato 2: Con prefijo Bearer
            token ? { 'Authorization': `Bearer ${token}` } : {},
            
            // Formato 3: Con prefijo Token
            token ? { 'Authorization': `Token ${token}` } : {},
        ];
        
        // Si no hay token y el endpoint requiere auth, fallar rápido
        if (!token && this.requiresAuth(endpoint)) {
            console.error('🔒 Error: No hay token para un endpoint autenticado');
            
            // Si tenemos sistema de renovación, intentar renovar
            if (window.TokenValidator && window.TokenValidator.renewIfNeeded) {
                try {
                    const renewed = await window.TokenValidator.renewIfNeeded();
                    if (renewed) {
                        console.log('🔒 Token renovado exitosamente, reintentando...');
                        return this.fetchApi(endpoint, options); // Reintentar con el nuevo token
                    }
                } catch (renewError) {
                    console.error('🔒 Error renovando token:', renewError);
                }
            }
            
            throw new Error('No autorizado: Token no disponible');
        }
        
        // Variables para seguimiento de errores
        let lastResponse = null;
        let lastError = null;
        
        // Probar cada formato de token secuencialmente
        for (const tokenHeader of tokenFormats) {
            try {
                // Crear headers combinando Content-Type, headers adicionales y formato de token
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers || {},
                    ...tokenHeader
                };
                
                // Mostrar el formato de token que se está usando (para debugging)
                if (tokenHeader.Authorization) {
                    console.log(`🔑 Probando formato: ${tokenHeader.Authorization.substring(0, 20)}...`);
                }
                
                // Construir opciones completas
                const fetchOptions = {
                    ...options,
                    headers
                };
                
                // Realizar petición
                const response = await fetch(url, fetchOptions);
                lastResponse = response;
                
                // Si la respuesta es exitosa, devolver inmediatamente
                if (response.ok) {
                    console.log(`✅ Petición exitosa con formato: ${tokenHeader.Authorization ? tokenHeader.Authorization.split(' ')[0] || 'Directo' : 'Sin token'}`);
                    return response;
                }
                
                // Si el error no es de autenticación, no seguir probando formatos
                if (response.status !== 401) {
                    console.error(`❌ Error ${response.status} en petición API`);
                    throw new Error(`Error ${response.status}: ${response.statusText || 'Error de servidor'}`);
                }
                
                // Si es 401, seguir probando otros formatos
                console.log(`🔒 Error 401 con formato actual, probando siguiente...`);
            } catch (error) {
                lastError = error;
                console.error(`❌ Error en petición con formato de token:`, error);
            }
        }
        
        // Si llegamos aquí, todos los formatos fallaron
        console.error('🔒 Todos los formatos de token fallaron');
        
        // Si el último error fue 401, intentar renovar el token
        if (lastResponse && lastResponse.status === 401) {
            console.log('🔒 Intentando renovar token después de errores 401...');
            
            if (window.TokenValidator && window.TokenValidator.renewIfNeeded) {
                try {
                    const renewed = await window.TokenValidator.renewIfNeeded();
                    if (renewed) {
                        console.log('🔒 Token renovado exitosamente, reintentando petición...');
                        return this.fetchApi(endpoint, options); // Reintentar con el nuevo token
                    }
                } catch (renewError) {
                    console.error('🔒 Error renovando token:', renewError);
                }
            }
            
            // En caso de error 401 persistente
            console.error('🔒 ERROR CRÍTICO: Autenticación fallida después de intentar todos los formatos');
            throw new Error('Error de autenticación persistente (401). Sesión posiblemente caducada.');
        }
        
        // Para otros tipos de error
        throw lastError || new Error('Error desconocido en la petición API');
    }
};

// Log de confirmación
console.log('✅ API Helper cargado correctamente');
