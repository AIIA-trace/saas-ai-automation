/**
 * Modo Desarrollo - Sistema para trabajar sin depender del backend
 * 
 * Este script permite trabajar en modo desarrollo sin necesidad
 * de autenticación real contra el backend, facilitando el desarrollo
 * de la interfaz mientras el servidor está en mantenimiento.
 */

// Objeto para gestionar el modo desarrollo
window.DevMode = {
    // Estado del modo desarrollo
    enabled: false,
    
    /**
     * Inicializa el modo desarrollo
     */
    initialize: function() {
        console.log('🧪 Inicializando sistema de modo desarrollo...');
        
        // Verificar si el modo desarrollo está activo en localStorage
        this.enabled = localStorage.getItem('dev_mode') === 'true';
        
        if (this.enabled) {
            console.log('🧪 Modo desarrollo ACTIVADO');
            this.setupDevEnvironment();
        } else {
            console.log('🧪 Modo desarrollo desactivado');
        }
        
        // Añadir comando de consola para activar/desactivar
        this.setupConsoleCommand();
    },
    
    /**
     * Configura el entorno de desarrollo
     */
    setupDevEnvironment: function() {
        // Crear token de desarrollo si no existe
        if (!localStorage.getItem('auth_token')) {
            const devToken = `dev_token_${Date.now()}`;
            localStorage.setItem('auth_token', devToken);
            localStorage.setItem('authToken', devToken);
            
            // Guardar datos de usuario de desarrollo
            localStorage.setItem('user_data', JSON.stringify({
                id: 'dev_user',
                email: 'dev@example.com',
                companyName: 'Dev Company',
                businessSector: 'development',
                plan: 'professional',
                createdAt: new Date().toISOString(),
                isDevMode: true
            }));
            
            console.log('🧪 Token y usuario de desarrollo creados para pruebas');
        }
        
        // Parchar métodos de autenticación
        this.patchAuthService();
        this.patchApiHelper();
    },
    
    /**
     * Parcha el servicio de autenticación para simular autenticación exitosa
     */
    patchAuthService: function() {
        if (window.authService) {
            // Guardar método original
            const originalIsAuthenticated = window.authService.isAuthenticated;
            
            // Reemplazar con versión que siempre devuelve true en modo desarrollo
            window.authService.isAuthenticated = function() {
                if (DevMode.enabled) {
                    return true;
                }
                return originalIsAuthenticated.call(this);
            };
            
            console.log('🧪 Servicio de autenticación parchado para modo desarrollo');
        }
    },
    
    /**
     * Parcha el helper de API para simular respuestas exitosas
     */
    patchApiHelper: function() {
        if (window.ApiHelper) {
            // Guardar método original
            const originalFetchApi = window.ApiHelper.fetchApi;
            
            // Reemplazar con versión que intercepta peticiones en modo desarrollo
            window.ApiHelper.fetchApi = async function(endpoint, options = {}) {
                if (DevMode.enabled && options.method === 'PUT' && endpoint.includes('/api/config/')) {
                    console.log('🧪 Simulando respuesta exitosa para:', endpoint);
                    
                    // Simular respuesta exitosa para guardado de configuración
                    return new Response(JSON.stringify({
                        success: true,
                        message: 'Configuración guardada en modo desarrollo'
                    }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
                
                // Para otras peticiones, usar el método original
                return originalFetchApi.call(this, endpoint, options);
            };
            
            console.log('🧪 ApiHelper parchado para modo desarrollo');
        }
    },
    
    /**
     * Activa el modo desarrollo
     */
    enable: function() {
        localStorage.setItem('dev_mode', 'true');
        this.enabled = true;
        this.setupDevEnvironment();
        console.log('✅ Modo desarrollo ACTIVADO. Recarga la página para aplicar todos los cambios.');
    },
    
    /**
     * Desactiva el modo desarrollo
     */
    disable: function() {
        localStorage.setItem('dev_mode', 'false');
        this.enabled = false;
        console.log('❌ Modo desarrollo DESACTIVADO. Recarga la página para volver al modo normal.');
    },
    
    /**
     * Configura el comando de consola para activar/desactivar el modo desarrollo
     */
    setupConsoleCommand: function() {
        // Añadir comando a la consola para activar/desactivar el modo desarrollo
        window.toggleDevMode = function() {
            if (DevMode.enabled) {
                DevMode.disable();
            } else {
                DevMode.enable();
            }
            return `Modo desarrollo ${DevMode.enabled ? 'ACTIVADO' : 'DESACTIVADO'}`;
        };
        
        console.log('💡 Consejo: Usa el comando "toggleDevMode()" en la consola para activar/desactivar el modo desarrollo');
    }
};

// Auto-inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    window.DevMode.initialize();
});
