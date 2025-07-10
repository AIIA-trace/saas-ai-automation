/**
 * Route Protection Middleware
 * Este módulo se encarga de proteger las rutas que requieren autenticación,
 * redirigiendo a los usuarios no autenticados al login.
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
        // Solo verificamos autenticación si la ruta requiere autenticación
        if (this.requiresAuth()) {
            // Si el servicio de autenticación no está disponible
            if (typeof authService === 'undefined') {
                console.error('El servicio de autenticación no está disponible');
                // Redirigir al login por seguridad
                this.redirectToLogin();
                return;
            }
            
            // Verificar si el usuario está autenticado
            if (!authService.isAuthenticated()) {
                console.log('Usuario no autenticado, redirigiendo al login...');
                this.redirectToLogin();
                return;
            }
            
            // Usuario autenticado, verificar si el token es válido
            authService.getCurrentUser()
                .then(user => {
                    // Token válido, el usuario puede acceder a la página
                    console.log('Usuario autenticado:', user.email);
                })
                .catch(error => {
                    console.error('Error al validar token:', error);
                    // Token inválido o expirado, limpiar y redirigir al login
                    authService.logout();
                    this.redirectToLogin();
                });
        }
    }
    
    /**
     * Redirecciona al usuario a la página de login
     */
    redirectToLogin() {
        // Guardar la URL actual para redireccionar después del login
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        
        // Redirigir al login
        window.location.href = 'index.html';
    }
}

// Instanciar el RouteGuard para que se inicie automáticamente
const routeGuard = new RouteGuard();

// Exportar para uso externo si es necesario
window.routeGuard = routeGuard;
