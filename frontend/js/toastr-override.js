/**
 * Sobrescribe todas las funciones de toastr para usar console.log en su lugar
 * Este archivo debe ser cargado después de toastr.js (si existe) para anular su funcionalidad.
 */

// Asegurar que el objeto toastr existe (incluso si no se cargó la librería)
window.toastr = window.toastr || {};

// Guardar referencia al objeto toastr original por si es necesario restaurarlo
const originalToastr = { ...window.toastr };

// Sobrescribir todas las funciones principales de toastr
toastr.success = function(message, title = 'Éxito') {
    console.log(`✅ ${title ? title + ': ' : ''}${message}`);
    return this; // Mantener encadenamiento de métodos
};

toastr.info = function(message, title = 'Info') {
    console.log(`ℹ️ ${title ? title + ': ' : ''}${message}`);
    return this;
};

toastr.warning = function(message, title = 'Advertencia') {
    console.warn(`⚠️ ${title ? title + ': ' : ''}${message}`);
    return this;
};

toastr.error = function(message, title = 'Error') {
    console.error(`❌ ${title ? title + ': ' : ''}${message}`);
    return this;
};

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
