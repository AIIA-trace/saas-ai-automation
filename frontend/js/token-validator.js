/**
 * Token Validator y Auto-renovación
 * 
 * Este módulo se encarga de verificar la validez del token JWT
 * y de renovarlo automáticamente si está próximo a caducar o ha caducado
 */

// Función para decodificar tokens JWT sin necesidad de bibliotecas
function decodeJWT(token) {
    try {
        // JWT tiene formato: header.payload.signature
        const parts = token.split('.');
        
        // Si no tiene exactamente 3 partes, no es un JWT válido
        if (parts.length !== 3) {
            console.error('🔑 Token con formato inválido');
            return null;
        }
        
        // Decodificar la parte del payload (segunda parte)
        // Base64URL decode
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(payload));
        
        return decoded;
    } catch (error) {
        console.error('🔑 Error al decodificar token:', error);
        return null;
    }
}

// Objeto global para validación de tokens
window.TokenValidator = {
    /**
     * Verifica si un token JWT es válido
     * @param {string} token - Token JWT a verificar
     * @returns {boolean} - true si es válido, false si no
     */
    isValid: function(token) {
        if (!token) return false;
        
        const decoded = decodeJWT(token);
        if (!decoded) return false;
        
        // Verificar expiración
        const now = Math.floor(Date.now() / 1000); // Timestamp actual en segundos
        
        // Si no tiene campo exp, lo consideramos inválido para ser seguros
        if (!decoded.exp) {
            console.warn('🔑 Token sin fecha de expiración');
            return false;
        }
        
        return decoded.exp > now;
    },
    
    /**
     * Verifica si un token está próximo a expirar (menos de 1 día)
     * @param {string} token - Token JWT a verificar
     * @returns {boolean} - true si está próximo a expirar
     */
    isExpiringSoon: function(token) {
        if (!token) return false;
        
        const decoded = decodeJWT(token);
        if (!decoded || !decoded.exp) return false;
        
        const now = Math.floor(Date.now() / 1000);
        const oneDayInSeconds = 24 * 60 * 60;
        
        // Verificar si expira en menos de 1 día
        return decoded.exp > now && decoded.exp - now < oneDayInSeconds;
    },
    
    /**
     * Obtiene información del token actual
     * @returns {Object} - Información del token o null si no hay token válido
     */
    getCurrentTokenInfo: function() {
        const token = window.getAuthToken ? window.getAuthToken() : 
                     (localStorage.getItem('authToken') || localStorage.getItem('auth_token'));
        
        if (!token) return null;
        
        const decoded = decodeJWT(token);
        if (!decoded) return null;
        
        const now = Math.floor(Date.now() / 1000);
        
        return {
            token: token,
            user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            },
            isValid: decoded.exp > now,
            expiresIn: decoded.exp ? decoded.exp - now : null,
            expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
        };
    },
    
    /**
     * Renueva el token actual si es necesario
     * @returns {Promise<boolean>} - Promise que se resuelve con true si se renovó el token
     */
    renewIfNeeded: async function() {
        const tokenInfo = this.getCurrentTokenInfo();
        
        if (!tokenInfo) {
            console.log('🔑 No hay token para renovar');
            return false;
        }
        
        // Si el token es válido y no está próximo a expirar, no hacemos nada
        if (tokenInfo.isValid && !this.isExpiringSoon(tokenInfo.token)) {
            console.log('🔑 Token válido, no es necesario renovar');
            return false;
        }
        
        console.log('🔑 Renovando token...');
        
        try {
            // Obtener la URL de renovación
            const refreshUrl = window.API_CONFIG?.getFullUrl ? 
                              window.API_CONFIG.getFullUrl('/api/auth/refresh') : 
                              'https://saas-ai-automation.onrender.com/api/auth/refresh';
            
            // Enviar el token actual para renovarlo
            const response = await fetch(refreshUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: tokenInfo.token
                })
            });
            
            if (!response.ok) {
                console.error('🔑 Error al renovar token:', response.status);
                return false;
            }
            
            const data = await response.json();
            
            if (data.token) {
                // Guardar el nuevo token
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('authToken', data.token);
                console.log('🔑 Token renovado correctamente');
                
                // También actualizar el timestamp de autenticación
                localStorage.setItem('auth_timestamp', Date.now().toString());
                
                return true;
            } else {
                console.warn('🔑 No se recibió token en la respuesta de renovación');
                return false;
            }
        } catch (error) {
            console.error('🔑 Error al renovar token:', error);
            return false;
        }
    },
    
    /**
     * Inicializa el sistema de validación y renovación automática
     */
    initialize: function() {
        console.log('🔑 Inicializando TokenValidator');
        
        // Mostrar información del token actual
        const tokenInfo = this.getCurrentTokenInfo();
        
        if (tokenInfo) {
            console.log('🔑 Token actual:', {
                user: tokenInfo.user,
                valid: tokenInfo.isValid,
                expiresIn: tokenInfo.expiresIn ? `${Math.floor(tokenInfo.expiresIn / 3600)} horas` : 'desconocido',
                expiresAt: tokenInfo.expiresAt
            });
            
            // Intentar renovar si es necesario
            this.renewIfNeeded();
        } else {
            console.warn('🔑 No hay token válido');
        }
        
        // Verificar el token cada 30 minutos
        setInterval(() => {
            console.log('🔑 Verificación periódica del token');
            this.renewIfNeeded();
        }, 30 * 60 * 1000);
    }
};

// Auto-inicialización cuando se carga el script
document.addEventListener('DOMContentLoaded', function() {
    window.TokenValidator.initialize();
});

// Función para obtener el token actual
function getValidatedAuthToken() {
    const token = window.getAuthToken ? window.getAuthToken() : 
                 (localStorage.getItem('authToken') || localStorage.getItem('auth_token'));
    
    if (!token) return null;
    
    // Si el token no es válido, intentar renovarlo inmediatamente
    if (!window.TokenValidator.isValid(token)) {
        console.log('🔑 Token inválido, intentando renovar...');
        
        // Devolver null para esta solicitud, el token se renovará para la siguiente
        return null;
    }
    
    return token;
}

// Función para verificar si el usuario está autenticado con token válido
function hasValidAuthToken() {
    const token = getValidatedAuthToken();
    return !!token;
}

// Exponer funciones al ámbito global
window.getValidatedAuthToken = getValidatedAuthToken;
window.hasValidAuthToken = hasValidAuthToken;

console.log('✅ Token Validator cargado correctamente');
