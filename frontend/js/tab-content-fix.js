/**
 * tab-content-fix.js
 * 
 * Fix para asegurar que el contenido de tabs se oculta/muestra correctamente
 * al cambiar entre pestañas del dashboard
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando fix de contenido de tabs...');

    /**
     * Asegurar que solo el tab activo está visible
     */
    function enforceTabVisibility() {
        // Obtener todos los tab panes
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabPanes.forEach(pane => {
            if (pane.classList.contains('active') && pane.classList.contains('show')) {
                // Este es el tab activo - asegurar que está visible
                pane.style.display = 'block';
            } else {
                // Este NO es el tab activo - asegurar que está oculto
                pane.style.display = 'none';
            }
        });
    }

    /**
     * Limpiar contenido residual al cambiar de tab
     */
    function cleanupTabContent(targetTabId) {
        console.log(`🧹 Limpiando contenido al cambiar a: ${targetTabId}`);
        
        // Obtener todos los tab panes
        const allTabPanes = document.querySelectorAll('.tab-pane');
        
        // Ocultar todos EXCEPTO el target
        allTabPanes.forEach(pane => {
            if (pane.id !== targetTabId) {
                pane.classList.remove('active', 'show');
                // NO forzar display:none aquí, dejar que Bootstrap lo maneje
            }
        });
    }

    /**
     * Configurar listeners para cambios de tab
     */
    function setupTabListeners() {
        // Escuchar todos los botones de tab
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        
        tabButtons.forEach(button => {
            // Evento AL cambiar de tab
            button.addEventListener('show.bs.tab', function(event) {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId) {
                    // Limpiar otros tabs
                    cleanupTabContent(targetId.replace('#', ''));
                }
            });
            
            // Evento DESPUÉS de cambiar de tab
            button.addEventListener('shown.bs.tab', function(event) {
                const targetId = event.target.getAttribute('data-bs-target');
                console.log(`✅ Tab cambiado a: ${targetId}`);
                
                // Asegurar que el tab activo está visible
                const targetPane = document.querySelector(targetId);
                if (targetPane) {
                    targetPane.style.display = 'block';
                    targetPane.classList.add('active', 'show');
                }
            });
        });
        
        console.log(`✅ Configurados ${tabButtons.length} listeners de tabs`);
    }

    /**
     * Inicializar cuando el DOM esté listo
     */
    function init() {
        // Esperar a que Bootstrap esté cargado
        if (typeof bootstrap === 'undefined') {
            console.warn('⚠️ Bootstrap no está cargado todavía, reintentando...');
            setTimeout(init, 100);
            return;
        }
        
        // Esperar a que los tabs estén en el DOM
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        if (tabButtons.length === 0) {
            console.warn('⚠️ Tabs no están en el DOM todavía, reintentando...');
            setTimeout(init, 100);
            return;
        }
        
        // Configurar listeners
        setupTabListeners();
        
        // Forzar visibilidad correcta inicial
        setTimeout(() => {
            enforceTabVisibility();
        }, 500);
        
        console.log('✅ Fix de tabs inicializado correctamente');
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
