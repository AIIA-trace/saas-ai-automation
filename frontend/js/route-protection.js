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
        
        // VERIFICAR SI EL LOGOUT FUE INTENCIONAL
        const intentionalLogout = localStorage.getItem('intentionalLogout');
        if (intentionalLogout === 'true') {
            console.log('🚪 Logout intencional detectado, limpiando flag y no redirigiendo');
            localStorage.removeItem('intentionalLogout');
            // Si estamos en login, no hacer nada más
            if (this.currentPath.includes('login.html')) {
                return;
            }
        }
        
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
            
            // VERIFICACIÓN AUTOMÁTICA DE TOKEN EXPIRADO (MODO PERMISIVO)
            console.log('Verificando validez del token...');
            
            // Solo verificar token si no se ha hecho en los últimos 5 minutos
            const lastTokenCheck = localStorage.getItem('lastTokenCheck');
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (!lastTokenCheck || (now - parseInt(lastTokenCheck)) > fiveMinutes) {
                localStorage.setItem('lastTokenCheck', now.toString());
                
                // Usar TokenValidator si está disponible
                if (window.TokenValidator) {
                    const tokenInfo = window.TokenValidator.getCurrentTokenInfo();
                    
                    if (tokenInfo && tokenInfo.isValid) {
                        console.log('✓ Token válido usando TokenValidator');
                        
                        // Si está próximo a expirar, intentar renovar silenciosamente
                        if (window.TokenValidator.isExpiringSoon(tokenInfo.token)) {
                            console.log('⚠️ Token próximo a expirar, intentando renovar silenciosamente...');
                            window.TokenValidator.renewIfNeeded()
                            .then(renewed => {
                                if (renewed) {
                                    console.log('✓ Token renovado exitosamente');
                                } else {
                                    console.log('⚠️ No se pudo renovar token, pero continuando...');
                                    // No redirigir inmediatamente, solo loggear
                                }
                            })
                            .catch(error => {
                                console.log('⚠️ Error renovando token, pero continuando...', error);
                            });
                        }
                    } else {
                        console.log('⚠️ Token inválido según TokenValidator, pero permitiendo continuar...');
                        // No redirigir inmediatamente, solo loggear
                    }
                } else {
                    // Fallback: verificación manual menos agresiva
                    this.verifyTokenValidityGraceful()
                    .then(isValid => {
                        if (isValid) {
                            console.log('✓ Token válido (verificación manual)');
                        } else {
                            console.log('⚠️ Token posiblemente inválido, pero permitiendo continuar...');
                            // Solo redirigir si hay múltiples fallos consecutivos
                        }
                    })
                    .catch(error => {
                        console.log('⚠️ Error verificando token, pero permitiendo continuar...', error);
                    });
                }
            } else {
                console.log('✓ Token verificado recientemente, omitiendo verificación');
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
     * Verifica la validez del token de forma menos agresiva (modo permisivo)
     */
    async verifyTokenValidityGraceful() {
        try {
            // Intentar obtener datos del usuario con timeout corto
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout
            
            const user = await authService.getCurrentUser({ signal: controller.signal });
            clearTimeout(timeoutId);
            
            return user && user.email; // Token válido si obtenemos datos de usuario
        } catch (error) {
            // Si es error de red o timeout, asumir que el token es válido
            if (error.name === 'AbortError' || error.message.includes('fetch')) {
                console.log('⚠️ Error de conectividad, asumiendo token válido');
                return true;
            }
            
            // Solo considerar inválido si es claramente un error de autenticación
            if (error.message.includes('401') || error.message.includes('Token inválido') || error.message.includes('jwt expired')) {
                // Incrementar contador de fallos
                const failCount = parseInt(localStorage.getItem('tokenFailCount') || '0') + 1;
                localStorage.setItem('tokenFailCount', failCount.toString());
                
                // Solo retornar false si hay múltiples fallos consecutivos
                if (failCount >= 3) {
                    console.log('✗ Múltiples fallos de token consecutivos, considerando inválido');
                    localStorage.removeItem('tokenFailCount');
                    return false;
                }
                
                console.log(`⚠️ Fallo de token ${failCount}/3, permitiendo continuar`);
                return true;
            }
            
            // Para otros errores, asumir que el token es válido
            return true;
        }
    }
    
    /**
     * Resetea el contador de fallos de token cuando una operación es exitosa
     */
    resetTokenFailCount() {
        localStorage.removeItem('tokenFailCount');
        console.log('✓ Contador de fallos de token reseteado');
    }
    
    /**
     * Maneja tokens expirados limpiando datos y redirigiendo (modo permisivo)
     */
    handleExpiredToken() {
        console.log('🔄 Manejando token expirado...');
        
        // Verificar si realmente debemos redirigir
        const failCount = parseInt(localStorage.getItem('tokenFailCount') || '0');
        if (failCount < 3) {
            console.log(`⚠️ Token posiblemente expirado, pero solo ${failCount} fallos. Permitiendo continuar...`);
            return;
        }
        
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
        // PREVENIR BUCLES INFINITOS
        const currentPath = window.location.pathname;
        
        // Si ya estamos en login, register o páginas públicas, no redirigir
        if (currentPath.includes('login.html') || 
            currentPath.includes('register.html') || 
            currentPath.includes('forgot-password.html') ||
            currentPath === '/' || 
            currentPath === '/index.html') {
            console.log('🛑 Ya estamos en página pública, no redirigiendo');
            return;
        }
        
        // Verificar si ya se intentó redireccionar recientemente (prevenir bucle)
        const lastRedirect = localStorage.getItem('lastLoginRedirect');
        const now = Date.now();
        if (lastRedirect && (now - parseInt(lastRedirect)) < 2000) { // 2 segundos
            console.log('🛑 Redirección reciente detectada, evitando bucle');
            return;
        }
        
        // Marcar timestamp de redirección
        localStorage.setItem('lastLoginRedirect', now.toString());
        
        // Guardar la URL actual para redireccionar después del login
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        console.log('🔄 Redirigiendo a login desde:', currentPath);
        
        // Redirigir al login
        window.location.href = 'login.html';
    }
}

// Instanciar el RouteGuard SOLO después de que el DOM esté listo
// para evitar bucles infinitos en la carga inicial
let routeGuard = null;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔒 Inicializando RouteGuard después de DOMContentLoaded');
        routeGuard = new RouteGuard();
        window.routeGuard = routeGuard;
    });
} else {
    // Si el DOM ya está listo, inicializar con un pequeño delay
    setTimeout(() => {
        console.log('🔒 Inicializando RouteGuard con delay');
        routeGuard = new RouteGuard();
        window.routeGuard = routeGuard;
    }, 100);
}

// Configurar listener global para errores 401 (token expirado) - MODO PERMISIVO
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('401') || 
         event.reason.message.includes('Token inválido') || 
         event.reason.message.includes('jwt expired'))) {
        console.log('⚠️ Token expirado detectado globalmente, pero usando modo permisivo...');
        
        // Incrementar contador de fallos
        const failCount = parseInt(localStorage.getItem('tokenFailCount') || '0') + 1;
        localStorage.setItem('tokenFailCount', failCount.toString());
        
        // Solo manejar si hay múltiples fallos
        if (failCount >= 3) {
            console.log('🔄 Múltiples fallos detectados, manejando token expirado...');
            routeGuard.handleExpiredToken();
        } else {
            console.log(`⚠️ Fallo ${failCount}/3, permitiendo continuar...`);
        }
        
        event.preventDefault(); // Evitar que se muestre el error en consola
    }
});

// Listener para errores de fetch con 401 - MODO PERMISIVO
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args)
    .then(response => {
        // Si es error 401, usar modo permisivo
        if (response.status === 401) {
            console.log('⚠️ Error 401 detectado en fetch, usando modo permisivo...');
            
            // Incrementar contador de fallos
            const failCount = parseInt(localStorage.getItem('tokenFailCount') || '0') + 1;
            localStorage.setItem('tokenFailCount', failCount.toString());
            
            // Solo manejar si hay múltiples fallos
            if (failCount >= 3) {
                console.log('🔄 Múltiples errores 401, manejando token expirado...');
                routeGuard.handleExpiredToken();
            } else {
                console.log(`⚠️ Error 401 ${failCount}/3, permitiendo continuar...`);
            }
        } else if (response.ok) {
            // Si la respuesta es exitosa, resetear contador de fallos
            routeGuard.resetTokenFailCount();
        }
        return response;
    })
    .catch(error => {
        // Si el error contiene indicios de token expirado
        if (error.message && 
            (error.message.includes('401') || 
             error.message.includes('Token inválido') || 
             error.message.includes('jwt expired'))) {
            console.log('⚠️ Error de token en fetch, usando modo permisivo...');
            
            // Incrementar contador de fallos
            const failCount = parseInt(localStorage.getItem('tokenFailCount') || '0') + 1;
            localStorage.setItem('tokenFailCount', failCount.toString());
            
            // Solo manejar si hay múltiples fallos
            if (failCount >= 3) {
                console.log('🔄 Múltiples errores de token, manejando...');
                routeGuard.handleExpiredToken();
            } else {
                console.log(`⚠️ Error de token ${failCount}/3, permitiendo continuar...`);
            }
        }
        throw error;
    });
};
