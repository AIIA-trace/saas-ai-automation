/**
 * Sistema de persistencia de navegación global
 * Guarda y restaura el estado de navegación en todas las páginas
 */

(function() {
    'use strict';

    console.log('🔄 Inicializando sistema de persistencia de navegación...');

    /**
     * Guardar el tab activo actual
     */
    function saveActiveTab(tabId) {
        if (tabId) {
            localStorage.setItem('lastActiveTab', tabId);
            console.log('💾 Tab guardado:', tabId);
        }
    }

    /**
     * Restaurar el último tab activo
     */
    function restoreActiveTab() {
        const lastTab = localStorage.getItem('lastActiveTab');
        
        if (lastTab) {
            console.log('🔄 Intentando restaurar tab:', lastTab);
            
            // Buscar el tab por ID
            const tabElement = document.querySelector(`[data-bs-toggle="tab"][data-bs-target="#${lastTab}"], [data-bs-toggle="tab"][href="#${lastTab}"]`);
            
            if (tabElement) {
                // Activar el tab usando Bootstrap
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
                console.log('✅ Tab restaurado exitosamente:', lastTab);
            } else {
                console.warn('⚠️ No se encontró el tab:', lastTab);
            }
        }
    }

    /**
     * Configurar listeners para todos los tabs
     */
    function setupTabListeners() {
        // Escuchar eventos de cambio de tab de Bootstrap
        document.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target') || event.target.getAttribute('href');
            if (target) {
                const tabId = target.replace('#', '');
                saveActiveTab(tabId);
            }
        });

        console.log('✅ Listeners de tabs configurados');
    }

    /**
     * Inicializar el sistema
     */
    function init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setupTabListeners();
                // Pequeño delay para asegurar que Bootstrap esté inicializado
                setTimeout(restoreActiveTab, 300);
            });
        } else {
            setupTabListeners();
            setTimeout(restoreActiveTab, 300);
        }
    }

    // Inicializar
    init();

    // Exportar funciones globalmente si es necesario
    window.NavigationPersistence = {
        saveActiveTab: saveActiveTab,
        restoreActiveTab: restoreActiveTab
    };

})();
