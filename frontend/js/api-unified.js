/**
 * API UNIFICADO - VERSIÓN FINAL
 * Solo JWT tokens, sin API keys, sin confusión
 */
window.ApiHelper = {
    baseUrl: 'https://saas-ai-automation.onrender.com',

    /**
     * Función principal para todas las peticiones API
     */
    async fetchApi(endpoint, options = {}) {
        let url, authRequired = false;
        
        // Manejar diferentes formatos de endpoint
        if (typeof endpoint === 'string') {
            url = endpoint;
        } else if (endpoint && endpoint.url) {
            url = endpoint.url;
            authRequired = endpoint.auth === 'jwt';
        } else {
            throw new Error('Endpoint inválido');
        }
        
        // URL completa
        const fullUrl = this.baseUrl + url;
        console.log(`🌐 API: ${fullUrl}`);
        
        // Headers básicos
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Agregar JWT si es necesario
        if (authRequired) {
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            
            if (!token) {
                console.warn('⚠️ No JWT token - redirigiendo al login');
                window.location.href = '/login.html';
                return;
            }
            
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`🔑 JWT agregado`);
        }
        
        // Configuración de fetch
        const fetchOptions = {
            method: 'GET',
            ...options,
            headers
        };
        
        try {
            const response = await fetch(fullUrl, fetchOptions);
            
            // Manejar errores de autenticación
            if (response.status === 401 || response.status === 403) {
                console.warn(`⚠️ Error ${response.status} - Token inválido`);
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            
            // Si la respuesta es OK, parsear JSON automáticamente
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const text = await response.text();
                    
                    // Verificar si hay contenido antes de parsear JSON
                    if (!text || text.trim() === '') {
                        console.warn('⚠️ Respuesta vacía del servidor');
                        return {}; // Devolver objeto vacío en lugar de fallar
                    }
                    
                    try {
                        return JSON.parse(text);
                    } catch (jsonError) {
                        console.error('❌ Error parseando JSON:', jsonError);
                        console.error('📄 Contenido recibido:', text);
                        return {}; // Devolver objeto vacío en lugar de fallar
                    }
                }
            }
            
            // Para otros casos, devolver la respuesta original
            return response;
        } catch (error) {
            console.error('❌ Error API:', error);
            throw error;
        }
    }
};

// Compatibilidad con código existente
window.API_HELPER = window.ApiHelper;

console.log('✅ API Unificado cargado');
