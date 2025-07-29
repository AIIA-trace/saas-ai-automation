/**
 * Token Unifier - Soluciona la inconsistencia entre auth_token y authToken
 * 
 * Este script detecta y armoniza los tokens de autenticación independientemente
 * de qué nombre de clave se utilizó para guardarlos en localStorage.
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
    
    // Ejecutar la unificación
    unifyTokens();
    
    // Interceptar localStorage.setItem para mantener tokens sincronizados
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key, value) {
        // Llamar al método original
        originalSetItem.call(localStorage, key, value);
        
        // Si se está guardando un token, sincronizar el otro formato
        if (key === 'authToken') {
            originalSetItem.call(localStorage, 'auth_token', value);
        } else if (key === 'auth_token') {
            originalSetItem.call(localStorage, 'authToken', value);
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
    };
    
    console.log('🔑 Token Unifier inicializado correctamente');
})();

/**
 * Función helper para obtener el token de autenticación
 * Comprueba ambos formatos y devuelve el que esté disponible
 */
function getAuthToken() {
    return localStorage.getItem('authToken') || localStorage.getItem('auth_token');
}
