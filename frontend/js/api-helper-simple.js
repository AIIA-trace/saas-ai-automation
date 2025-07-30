/**
 * API Helper simplificado - SOLO JWT tokens
 */
window.ApiHelper = {
    apiBaseUrl: 'https://saas-ai-automation.onrender.com',

    /**
     * Función principal para hacer peticiones API
     */
    async fetchApi(endpoint, options = {}) {
        // Si el endpoint es un objeto con configuración, extraer la URL
        let url, authType;
        if (typeof endpoint === 'object' && endpoint.url) {
            url = endpoint.url;
            authType = endpoint.auth || 'none';
        } else {
            url = endpoint;
            authType = options.authType || 'none';
        }
        
        console.log(`🌐 API: ${this.apiBaseUrl}${url}`);
        console.log(`🔑 Auth: ${authType}`);
        
        // Headers básicos
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Agregar JWT token si es necesario
        if (authType === 'jwt') {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log(`🔑 JWT: ${token.substring(0, 15)}...`);
            } else {
                console.warn('⚠️ No JWT token - redirigiendo al login');
                window.location.href = '/login.html';
                return;
            }
        }
        
        // Opciones de fetch
        const fetchOptions = {
            method: 'GET',
            ...options,
            headers
        };
        
        try {
            const response = await fetch(this.apiBaseUrl + url, fetchOptions);
            
            // Error de autenticación = logout
            if (response.status === 401 || response.status === 403) {
                console.warn(`⚠️ Error ${response.status} - Token inválido`);
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            
            return response;
        } catch (error) {
            console.error('❌ Error API:', error);
            throw error;
        }
    }
};

console.log('✅ API Helper Simple cargado');
