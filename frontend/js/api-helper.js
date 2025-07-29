/**
 * API Helper - Funciones para facilitar las llamadas a la API
 * Este módulo centraliza la construcción de URLs y la gestión de tokens
 * para todas las llamadas a la API
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
     * Obtiene el token de autenticación (compatible con ambos formatos)
     * @returns {string|null} Token de autenticación o null si no existe
     */
    getAuthToken: function() {
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
     * Realiza una petición fetch a la API con gestión adecuada de URLs y tokens
     * @param {string} endpoint - Endpoint relativo
     * @param {Object} options - Opciones de fetch
     * @returns {Promise} Promesa con la respuesta de fetch
     */
    fetchApi: function(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        
        // Combinar headers proporcionados con los headers estándar
        const headers = this.getHeaders(options.headers || {});
        
        // Construir opciones finales
        const fetchOptions = {
            ...options,
            headers
        };
        
        console.log(`🌐 Realizando petición API a: ${url}`);
        
        return fetch(url, fetchOptions)
            .then(response => {
                if (!response.ok && response.status === 401) {
                    console.error('🔒 Error de autenticación (401). Token posiblemente caducado o inválido');
                    console.log('Token utilizado:', this.getAuthToken());
                }
                return response;
            })
            .catch(error => {
                console.error(`❌ Error en petición API a ${url}:`, error);
                throw error;
            });
    }
};

// Log de confirmación
console.log('✅ API Helper cargado correctamente');
