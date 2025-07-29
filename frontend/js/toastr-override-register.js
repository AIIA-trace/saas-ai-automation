/**
 * Override global para todas las funciones toastr
 * Reemplaza todas las notificaciones toastr por mensajes en consola
 * Este archivo debe incluirse después de cargar toastr.js
 */

// Verificar que toastr existe
if (typeof toastr !== 'undefined') {
    console.log('=== REEMPLAZANDO NOTIFICACIONES TOASTR POR CONSOLE.LOG ===');
    
    // Guardar referencia original para diagnóstico
    window._originalToastr = { ...toastr };
    
    // Función genérica para manejar todas las llamadas a toastr
    function handleToastrCall(type, message, title, options) {
        const prefix = title ? `${title}: ` : '';
        
        switch (type) {
            case 'success':
                console.log(`✅ ${prefix}${message}`, options || '');
                break;
            case 'info':
                console.log(`ℹ️ ${prefix}${message}`, options || '');
                break;
            case 'warning':
                console.warn(`⚠️ ${prefix}${message}`, options || '');
                break;
            case 'error':
                console.error(`❌ ${prefix}${message}`, options || '');
                break;
            default:
                console.log(`${prefix}${message}`, options || '');
        }
        
        // Devolver un objeto simulado para manejar encadenamiento de métodos
        return {
            preventDefault: function() { return this; }
        };
    }
    
    // Sobrescribir todas las funciones de toastr
    toastr.success = (message, title, options) => handleToastrCall('success', message, title, options);
    toastr.info = (message, title, options) => handleToastrCall('info', message, title, options);
    toastr.warning = (message, title, options) => handleToastrCall('warning', message, title, options);
    toastr.error = (message, title, options) => handleToastrCall('error', message, title, options);
    
    console.log('=== TOASTR REEMPLAZADO CORRECTAMENTE ===');
} else {
    console.warn('Toastr no está disponible, no se puede sobrescribir');
}
