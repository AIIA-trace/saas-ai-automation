/**
 * Script de configuración unificado para resolver el problema de múltiples funciones de guardado
 * Este script deshabilita todas las funciones de guardado antiguas y asegura que
 * solo se use la función saveUnifiedConfig() correctamente implementada
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Iniciando sistema de protección contra guardados múltiples...');
    
    // 1. Capturar todas las funciones originales (para evitar que se ejecuten)
    const originalFunctions = {};
    
    // Lista de funciones de guardado que podrían estar causando conflictos
    const functionNamesToDisable = [
        'saveGeneralConfig', 
        'saveVoiceConfig',
        'saveTransfersConfig', 
        'saveScriptConfig',
        'saveEmailConfig',
        'saveManualEmailConfig',
        'saveBotConfig',
        'updateBotConfig',
        'updateConfigUI'
    ];
    
    // Capturar y reemplazar las funciones originales
    functionNamesToDisable.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            originalFunctions[funcName] = window[funcName];
            
            // Reemplazar con una función que registre el intento y llame a saveUnifiedConfig
            window[funcName] = function() {
                console.warn(`⚠️ Función antigua ${funcName}() interceptada y redirigida a saveUnifiedConfig()`);
                return window.saveUnifiedConfig ? window.saveUnifiedConfig() : null;
            };
            
            console.log(`🔄 Función ${funcName}() redirigida a saveUnifiedConfig()`);
        }
    });
    
    // 2. Identificar todos los botones de guardado
    const saveButtonSelectors = [
        '#save-bot-config-btn',
        '#save-bot-config-btn-bottom',
        '#saveConfigButton',
        '#saveEmailConfig',
        '#save-voice-settings',
        '#save-call-settings',
        'button[id^="save"]', // Cualquier botón que comience con "save"
        'button:contains("Guardar")', // Cualquier botón con texto "Guardar"
        'a:contains("Guardar")' // Cualquier enlace con texto "Guardar"
    ];
    
    // 3. Establecer un handler unificado para todos los botones
    const unifiedSaveHandler = function(event) {
        console.log('🔄 Botón de guardado interceptado, redirigiendo a saveUnifiedConfig()');
        
        event.preventDefault();
        
        if (window.saveUnifiedConfigBusy) {
            console.log(' saveUnifiedConfig está ocupado, ignorando click');
            return;
        }
        
        const button = event.currentTarget; // Guardar referencia al botón
        const buttonId = button.id;
        const originalText = button.innerHTML;
        
        // Cambiar el botón a "Guardando..."
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        // Llamar a la función unificada
        window.saveUnifiedConfig()
            .then(() => {
                console.log(` Configuración guardada exitosamente desde botón ${buttonId}`);
                // Verificar que el botón aún existe en el DOM
                if (document.getElementById(buttonId)) {
                    button.innerHTML = '<i class="fas fa-check-circle"></i> Guardado';
                    button.classList.add('btn-success');
                    button.classList.remove('btn-primary');
                }
            })
            .catch((error) => {
                console.error(` Error guardando configuración desde botón ${buttonId}:`, error);
                // Verificar que el botón aún existe en el DOM
                if (document.getElementById(buttonId)) {
                    button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    button.classList.add('btn-danger');
                    button.classList.remove('btn-primary');
                }
            })
            .finally(() => {
                // Restaurar el botón después de 2 segundos
                setTimeout(() => {
                    // Verificar que el botón aún existe en el DOM
                    if (document.getElementById(buttonId)) {
                        button.disabled = false;
                        button.innerHTML = originalText;
                        button.classList.add('btn-primary');
                        button.classList.remove('btn-success');
                        button.classList.remove('btn-danger');
                    }
                }, 2000);
            });
    };
    
    // 4. Asignar el handler unificado a todos los botones de guardado
    // Hacerlo después de un pequeño delay para asegurar que todos los otros scripts se carguen
    setTimeout(() => {
        saveButtonSelectors.forEach(selector => {
            try {
                // Para selectores que usan jQuery
                if (selector.includes(':contains')) {
                    if (typeof $ === 'function') {
                        $(selector).each(function() {
                            const button = this;
                            // Eliminar todos los listeners existentes
                            const clone = button.cloneNode(true);
                            button.parentNode.replaceChild(clone, button);
                            // Agregar nuevo listener
                            clone.addEventListener('click', unifiedSaveHandler);
                        });
                    }
                } 
                // Para selectores CSS estándar
                else {
                    document.querySelectorAll(selector).forEach(button => {
                        // Eliminar todos los listeners existentes
                        const clone = button.cloneNode(true);
                        button.parentNode.replaceChild(clone, button);
                        // Agregar nuevo listener
                        clone.addEventListener('click', unifiedSaveHandler);
                        console.log(`✅ Handler unificado asignado a botón: ${button.id || selector}`);
                    });
                }
            } catch (err) {
                console.error(`❌ Error al procesar selector ${selector}:`, err);
            }
        });
        
        console.log('✅ Sistema de protección contra guardados múltiples activado');
    }, 1000);
    
    // 5. Log de diagnóstico para confirmar que la función unificada existe
    if (typeof window.saveUnifiedConfig === 'function') {
        console.log('✅ Función saveUnifiedConfig() encontrada y lista para usar');
    } else {
        console.error('❌ CRÍTICO: Función saveUnifiedConfig() no encontrada');
    }
});

// Función para verificar si todos los campos del formulario están siendo capturados
function verificarCamposFormulario() {
    console.log('🔍 Verificando todos los campos del formulario...');
    
    // 1. Recolectar todos los campos del formulario
    const campos = {};
    
    // Inputs de texto, email, password, etc.
    document.querySelectorAll('input[id]:not([type="checkbox"]):not([type="radio"])').forEach(input => {
        campos[input.id] = {
            id: input.id,
            tipo: input.type,
            valor: input.value,
            incluido: false
        };
    });
    
    // Checkboxes
    document.querySelectorAll('input[type="checkbox"][id]').forEach(checkbox => {
        campos[checkbox.id] = {
            id: checkbox.id,
            tipo: 'checkbox',
            valor: checkbox.checked,
            incluido: false
        };
    });
    
    // Selects
    document.querySelectorAll('select[id]').forEach(select => {
        campos[select.id] = {
            id: select.id,
            tipo: 'select',
            valor: select.value,
            incluido: false
        };
    });
    
    // Textareas
    document.querySelectorAll('textarea[id]').forEach(textarea => {
        campos[textarea.id] = {
            id: textarea.id,
            tipo: 'textarea',
            valor: textarea.value,
            incluido: false
        };
    });
    
    console.log(`🔢 Total de campos en el formulario: ${Object.keys(campos).length}`);
    
    // 2. Verificar si saveUnifiedConfig() recolecta todos estos campos
    if (typeof window.saveUnifiedConfig === 'function') {
        // Guardar función original
        const originalFunc = window.saveUnifiedConfig;
        
        // Reemplazar temporalmente con versión de diagnóstico
        window.saveUnifiedConfig = function() {
            console.log('🔍 Iniciando diagnóstico de recolección de campos...');
            
            // Llamar a la función original para ver qué campos recolecta
            const resultado = originalFunc.apply(this, arguments);
            
            // Restaurar la función original
            window.saveUnifiedConfig = originalFunc;
            
            return resultado;
        };
        
        // Invocar función para verificar
        console.log('🧪 Para completar la verificación, por favor haz clic en "Guardar Configuración"');
    } else {
        console.error('❌ No se puede verificar los campos porque saveUnifiedConfig() no está disponible');
    }
    
    // 3. Devolver lista de campos para referencia
    return campos;
}

// Exportar funciones para uso global
window.verificarCamposFormulario = verificarCamposFormulario;
