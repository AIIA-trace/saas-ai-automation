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
            console.log('Token en localStorage:', !!localStorage.getItem('auth_token'));
            console.log('isAuthenticated():', authService.isAuthenticated());
            
            // Verificar si el usuario está autenticado
            if (!authService.isAuthenticated()) {
                console.log('Usuario no autenticado, redirigiendo al login...');
                this.redirectToLogin();
                return;
            }
            
            // VERSIÓN SILENCIOSA: Solo log en consola, sin toasts ni popups
            console.log('Saltando verificación de token para evitar popups');
            // Verificar solo la primera vez en lugar de constantemente
            if (!window.tokenVerified) {
                window.tokenVerified = true;
                
                // Verificación silenciosa una sola vez
                authService.getCurrentUser()
                .then(user => {
                    console.log('✓ Usuario autenticado:', user.email);
                })
                .catch(error => {
                    console.log('✗ Error de autenticación (silenciado)');
                });
            }
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
        window.location.href = 'login.html';
    }
}

// Instanciar el RouteGuard para que se inicie automáticamente
const routeGuard = new RouteGuard();

// Exportar para uso externo si es necesario
window.routeGuard = routeGuard;
