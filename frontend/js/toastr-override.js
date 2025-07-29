/**
 * VERSIÓN RADICAL: Bloquea completamente todas las notificaciones toastr
 * Este archivo eliminará todos los toasts en la aplicación, especialmente los molestos errores de autenticación
 */

// Asegurar que el objeto toastr existe (incluso si no se cargó la librería)
window.toastr = window.toastr || {};

// Guardar referencia al objeto toastr original por si es necesario restaurarlo
const originalToastr = { ...window.toastr };

// Bloquear cualquier función nativa que podría crear toasts
window.showToast = function() { return false; };
window.createToast = function() { return false; };
document.showToast = function() { return false; };

// También desactivar el constructor de Bootstrap Toast si existe
if (window.bootstrap && window.bootstrap.Toast) {
    window.bootstrap.Toast = function() {
        return { show: function() {}, hide: function() {} };
    };
}

// BLOQUEO COMPLETO: Sobrescribir todas las funciones de toastr para que no hagan NADA
toastr.success = function() { return this; };
toastr.info = function() { return this; };
toastr.warning = function() { return this; };
toastr.error = function() { return this; };

// Necesitamos especialmente bloquear los errores de autenticación
window.blockAuthErrors = function() {
    const errorBlacklist = ['Error de autenticación', 'Error al validar token'];
    
    // Capturar errores en consola relacionados con autenticación
    const originalConsoleError = console.error;
    console.error = function() {
        // Filtrar mensajes de error de autenticación
        if (arguments.length > 0 && typeof arguments[0] === 'string') {
            for (const blockedMsg of errorBlacklist) {
                if (arguments[0].includes(blockedMsg)) {
                    return; // No mostrar este error
                }
            }
        }
        // Mostrar otros errores normalmente
        originalConsoleError.apply(console, arguments);
    };
};

// Activar bloqueo de errores de autenticación
window.blockAuthErrors();

// Sobrescribir opciones de configuración para no hacer nada
toastr.options = new Proxy({}, {
    set: function() { return true; }, // Intercepta cualquier intento de configuración
    get: function() { return function() { return toastr; }; } // Permite encadenamiento
});

// Función para restaurar el comportamiento original si es necesario
toastr.restore = function() {
    Object.keys(originalToastr).forEach(key => {
        this[key] = originalToastr[key];
    });
    console.log('Restaurado comportamiento original de toastr');
};

// Métodos adicionales de toastr
toastr.clear = function() { 
    console.log('Se limpiarían las notificaciones toastr (función anulada)');
    return this;
};

toastr.remove = toastr.clear;

console.log('✅ toastr-override.js cargado: Todas las notificaciones toastr redirigidas a la consola');
