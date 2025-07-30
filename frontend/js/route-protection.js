/**
 * Route Protection Middleware
 * Este módulo se encarga de proteger las rutas que requieren autenticación,
 * redirigiendo a los usuarios no autenticados al login.
 * 
 * CARACTERÍSTICAS:
 * - Detección automática de tokens expirados
 * - Integración con TokenValidator para renovación
 * - Redirección automática al login con mensaje al usuario
 * - Limpieza automática de datos de sesión
 * - Manejo global de errores 401 en fetch y promises
 * - Prevención de múltiples redirecciones
 */

// Importar la configuración de la API y el servicio de autenticación
// (estos ya deberían estar cargados en las páginas que usan este script)

// Lista de rutas protegidas (paths)
const protectedRoutes = [
    '/dashboard.html',
    '/profile.html',
    '/settings.html',
    '/company-setup.html',
    // Añadir aquí otras rutas protegidas
];

// Rutas públicas que no requieren autenticación
const publicRoutes = [
    '/index.html',
    '/',
    '/login.html',
    '/register.html',
    '/forgot-password.html'
];

/**
 * Clase RouteGuard para manejar la protección de rutas
 */
class RouteGuard {
    constructor() {
        this.currentPath = window.location.pathname;
        
        // Inicializar automáticamente
        this.initialize();
    }
    
    /**
     * Comprueba si la ruta actual requiere autenticación
     */
    requiresAuth() {
        // Si la ruta está explícitamente en la lista de rutas protegidas
        if (protectedRoutes.some(route => this.currentPath.includes(route))) {
            return true;
        }
        
        // Si la ruta está explícitamente en la lista de rutas públicas
        if (publicRoutes.some(route => this.currentPath.includes(route) || this.currentPath === route)) {
            return false;
        }
        
        // Por defecto, consideramos rutas no especificadas como protegidas
        // (enfoque conservador de seguridad)
        return true;
    }
    
    /**
     * Inicializa la protección de rutas
     */
    initialize() {
        console.log('=== ROUTE PROTECTION DEBUG ===');
        console.log('Ruta actual:', this.currentPath);
        console.log('Requiere autenticación:', this.requiresAuth());
        
        // Solo verificamos autenticación si la ruta requiere autenticación
        if (this.requiresAuth()) {
            console.log('Verificando autenticación...');
            
            // Si el servicio de autenticación no está disponible
            if (typeof authService === 'undefined') {
                console.error('El servicio de autenticación no está disponible');
                // Redirigir al login por seguridad
                this.redirectToLogin();
                return;
            }
            
            console.log('AuthService disponible');
            console.log('Token en localStorage (auth_token):', !!localStorage.getItem('auth_token'));
            console.log('Token en localStorage (authToken):', !!localStorage.getItem('authToken'));
            console.log('isAuthenticated():', authService.isAuthenticated());
            
            // Verificar si el usuario está autenticado
            if (!authService.isAuthenticated()) {
                console.log('Usuario no autenticado, redirigiendo al login...');
                this.redirectToLogin();
                return;
            }
            
            // VERIFICACIÓN AUTOMÁTICA DE TOKEN EXPIRADO
            console.log('Verificando validez del token...');
            
            // Verificar token una sola vez por sesión
            if (!window.tokenVerified) {
                window.tokenVerified = true;
                
                // Usar TokenValidator si está disponible
                if (window.TokenValidator) {
                    const tokenInfo = window.TokenValidator.getCurrentTokenInfo();
                    
                    if (tokenInfo && tokenInfo.isValid) {
                        console.log('✓ Token válido usando TokenValidator');
                        
                        // Si está próximo a expirar, intentar renovar
                        if (window.TokenValidator.isExpiringSoon(tokenInfo.token)) {
                            console.log('⚠️ Token próximo a expirar, intentando renovar...');
                            window.TokenValidator.renewIfNeeded()
                            .then(renewed => {
                                if (!renewed) {
                                    console.log('✗ No se pudo renovar token, redirigiendo...');
                                    this.handleExpiredToken();
                                }
                            });
                        }
                    } else {
                        console.log('✗ Token inválido según TokenValidator, redirigiendo...');
                        this.handleExpiredToken();
                    }
                } else {
                    // Fallback: verificación manual
                    this.verifyTokenValidity()
                    .then(isValid => {
                        if (isValid) {
                            console.log('✓ Token válido (verificación manual)');
                        } else {
                            console.log('✗ Token inválido, redirigiendo...');
                            this.handleExpiredToken();
                        }
                    })
                    .catch(error => {
                        console.log('✗ Error verificando token, redirigiendo por seguridad...');
                        this.handleExpiredToken();
                    });
                }
            }
        }
    }
    
    /**
     * Verifica la validez del token haciendo una llamada a la API
     */
    async verifyTokenValidity() {
        try {
            const user = await authService.getCurrentUser();
            return user && user.email; // Token válido si obtenemos datos de usuario
        } catch (error) {
            // Si es error 401 (token expirado) o 403 (no autorizado)
            if (error.message.includes('401') || error.message.includes('Token inválido') || error.message.includes('jwt expired')) {
                return false;
            }
            // Para otros errores, asumir que el token es válido pero hay problemas de conectividad
            throw error;
        }
    }
    
    /**
     * Maneja tokens expirados limpiando datos y redirigiendo
     */
    handleExpiredToken() {
        console.log('🔄 Manejando token expirado...');
        
        // Evitar múltiples redirecciones
        if (window.isRedirecting) {
            console.log('🔄 Ya se está redirigiendo, evitando duplicado...');
            return;
        }
        window.isRedirecting = true;
        
        // Limpiar todos los datos de autenticación
        localStorage.removeItem('auth_token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user_data');
        localStorage.removeItem('api_key');
        localStorage.removeItem('auth_timestamp');
        
        // Resetear flags de verificación
        window.tokenVerified = false;
        
        // Mostrar mensaje informativo en la interfaz (no solo consola)
        this.showExpirationMessage();
        
        // Pequeño delay para que el usuario vea el mensaje
        setTimeout(() => {
            this.redirectToLogin();
        }, 2000);
    }
    
    /**
     * Muestra mensaje de sesión expirada al usuario
     */
    showExpirationMessage() {
        // Crear un mensaje temporal en la interfaz
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 15px 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 300px;
            ">
                <strong>🔑 Sesión expirada</strong><br>
                Tu sesión ha caducado. Redirigiendo al login...
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remover el mensaje después de 3 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
        
        console.log('🔑 Sesión expirada. Redirigiendo al login...');
    }
    
    /**
     * Redirecciona al usuario a la página de login
     */
    redirectToLogin() {
        // Guardar la URL actual para redireccionar después del login
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        // Redirigir al login
        window.location.href = 'login.html';
    }
}

// Instanciar el RouteGuard para que se inicie automáticamente
const routeGuard = new RouteGuard();

// Exportar para uso externo si es necesario
window.routeGuard = routeGuard;

// Configurar listener global para errores 401 (token expirado)
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('401') || 
         event.reason.message.includes('Token inválido') || 
         event.reason.message.includes('jwt expired'))) {
        console.log('🔄 Token expirado detectado globalmente, manejando...');
        routeGuard.handleExpiredToken();
        event.preventDefault(); // Evitar que se muestre el error en consola
    }
});

// Listener para errores de fetch con 401
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args)
    .then(response => {
        // Si es error 401, manejar token expirado
        if (response.status === 401) {
            console.log('🔄 Error 401 detectado en fetch, manejando token expirado...');
            routeGuard.handleExpiredToken();
        }
        return response;
    })
    .catch(error => {
        // Si el error contiene indicios de token expirado
        if (error.message && 
            (error.message.includes('401') || 
             error.message.includes('Token inválido') || 
             error.message.includes('jwt expired'))) {
            console.log('🔄 Error de token expirado en fetch, manejando...');
            routeGuard.handleExpiredToken();
        }
        throw error;
    });
};
