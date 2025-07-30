/**
 * Token Unifier - Soluciona la inconsistencia entre auth_token y authToken
 * y gestiona la obtención y almacenamiento de la API key
 * 
 * Este script detecta y armoniza los tokens de autenticación independientemente
 * de qué nombre de clave se utilizó para guardarlos en localStorage.
 * También intenta obtener la API key del perfil del usuario si es necesario.
 */

// Ejecutar inmediatamente al cargar
(function() {
    console.log('🔑 Iniciando Token Unifier...');
    
    // Unificar tokens existentes
    const unifyTokens = function() {
        const authToken = localStorage.getItem('authToken');
        const auth_token = localStorage.getItem('auth_token');
        
        // Si tenemos un token con cualquiera de los nombres, asegurarnos de que exista en ambos
        if (authToken) {
            localStorage.setItem('auth_token', authToken);
            console.log('✅ Token copiado de authToken a auth_token');
        } else if (auth_token) {
            localStorage.setItem('authToken', auth_token);
            console.log('✅ Token copiado de auth_token a authToken');
        }
    };
    
    // Verificar si existe la API key y, si no, intentar obtenerla
    const checkApiKey = async function() {
        const apiKey = localStorage.getItem('api_key');
        
        if (!apiKey) {
            console.log('🔑 No hay API key almacenada, intentando obtenerla...');
            
            // Si tenemos un token JWT, intentar obtener la API key
            const token = getAuthToken();
            if (token) {
                console.log('🔑 JWT token disponible, intentando obtener API key del perfil...');
                try {
                    await fetchApiKey();
                } catch (error) {
                    console.warn('⚠️ No se pudo obtener la API key automáticamente:', error);
                }
            } else {
                console.log('🔑 No hay JWT token para obtener la API key');
            }
        } else {
            console.log('✅ API key ya está almacenada en localStorage');
        }
    };
    
    // Obtener API key del perfil del usuario
    const fetchApiKey = async function() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No hay JWT token disponible');
            }
            
            const baseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
            const url = `${baseUrl}/api/auth/me`;
            
            console.log('🔑 Intentando obtener API key desde:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al obtener perfil`);
            }
            
            const userData = await response.json();
            
            if (userData && userData.apiKey) {
                console.log('✅ API key obtenida correctamente del perfil');
                localStorage.setItem('api_key', userData.apiKey);
                return userData.apiKey;
            } else {
                console.warn('⚠️ El perfil no contiene API key');
                return await generateApiKey();
            }
        } catch (error) {
            console.error('❌ Error al obtener la API key:', error);
            throw error;
        }
    };
    
    // Generar una nueva API key
    const generateApiKey = async function() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No hay JWT token disponible');
            }
            
            const baseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
            const url = `${baseUrl}/api/auth/api-key`;
            
            console.log('🔑 Intentando generar nueva API key...');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al generar API key`);
            }
            
            const result = await response.json();
            
            if (result && result.apiKey) {
                console.log('✅ Nueva API key generada correctamente');
                localStorage.setItem('api_key', result.apiKey);
                return result.apiKey;
            } else {
                throw new Error('La respuesta del servidor no contiene una API key');
            }
        } catch (error) {
            console.error('❌ Error al generar nueva API key:', error);
            throw error;
        }
    };
    
    // Ejecutar la unificación y verificación
    unifyTokens();
    checkApiKey().catch(error => console.error('Error en la verificación inicial de API key:', error));
    
    // Interceptar localStorage.setItem para mantener tokens sincronizados
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key, value) {
        // Llamar al método original
        originalSetItem.call(localStorage, key, value);
        
        // Si se está guardando un token, sincronizar el otro formato
        if (key === 'authToken') {
            originalSetItem.call(localStorage, 'auth_token', value);
            
            // Cuando se actualiza el JWT token, verificar si necesitamos actualizar la API key
            checkApiKey().catch(error => console.warn('Error al verificar API key después de actualizar JWT:', error));
        } else if (key === 'auth_token') {
            originalSetItem.call(localStorage, 'authToken', value);
            
            // Cuando se actualiza el JWT token, verificar si necesitamos actualizar la API key
            checkApiKey().catch(error => console.warn('Error al verificar API key después de actualizar JWT:', error));
        }
    };
    
    // Interceptar localStorage.removeItem para mantener la sincronización al eliminar
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.removeItem = function(key) {
        // Llamar al método original
        originalRemoveItem.call(localStorage, key);
        
        // Si se está eliminando un token, eliminar también el otro formato
        if (key === 'authToken') {
            originalRemoveItem.call(localStorage, 'auth_token');
        } else if (key === 'auth_token') {
            originalRemoveItem.call(localStorage, 'authToken');
        }
        
        // Si se está eliminando cualquiera de los tokens JWT, eliminar también la API key
        if (key === 'authToken' || key === 'auth_token') {
            originalRemoveItem.call(localStorage, 'api_key');
            console.log('🔑 API key eliminada tras eliminar JWT token');
        }
    };
    
    console.log('🔑 Token Unifier inicializado correctamente');
})();

/**
 * Función helper para obtener el token de autenticación JWT
 * Comprueba ambos formatos y devuelve el que esté disponible
 */
function getAuthToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('auth_token');
}

/**
 * Función helper para obtener la API key
 */
function getApiKey() {
    return localStorage.getItem('api_key');
}

/**
 * Función helper para refrescar la API key
 * Intenta obtener una nueva API key del backend
 */
async function refreshApiKey() {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No hay JWT token disponible');
        }
        
        const baseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
        const url = `${baseUrl}/api/auth/api-key`;
        
        console.log('🔑 Intentando generar nueva API key...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status} al regenerar API key`);
        }
        
        const result = await response.json();
        
        if (result && result.apiKey) {
            console.log('✅ Nueva API key generada correctamente');
            localStorage.setItem('api_key', result.apiKey);
            return result.apiKey;
        } else {
            throw new Error('La respuesta del servidor no contiene una API key');
        }
    } catch (error) {
        console.error('❌ Error al refrescar la API key:', error);
        throw error;
    }
}

/**
 * Inicializa un objeto global para facilitar la gestión de tokens
 * desde cualquier parte de la aplicación
 */
window.TokenManager = {
    getJwtToken: getAuthToken,
    getApiKey: getApiKey,
    refreshApiKey: refreshApiKey,
    fetchApiKey: async function() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No hay JWT token disponible');
            }
            
            const baseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
            const url = `${baseUrl}/api/auth/me`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al obtener perfil`);
            }
            
            const userData = await response.json();
            
            if (userData && userData.apiKey) {
                localStorage.setItem('api_key', userData.apiKey);
                return userData.apiKey;
            } else {
                return await this.refreshApiKey();
            }
        } catch (error) {
            console.error('Error al obtener la API key:', error);
            throw error;
        }
    }
};
