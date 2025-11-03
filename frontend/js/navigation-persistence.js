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
     * Guardar posición de scroll
     */
    function saveScrollPosition() {
        const scrollY = window.scrollY || window.pageYOffset;
        localStorage.setItem('lastScrollPosition', scrollY);
    }

    /**
     * Restaurar posición de scroll
     */
    function restoreScrollPosition() {
        const scrollY = localStorage.getItem('lastScrollPosition');
        if (scrollY) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(scrollY));
                console.log('📜 Scroll restaurado a:', scrollY);
            }, 500);
        }
    }

    /**
     * Restaurar el último tab activo
     */
    function restoreActiveTab() {
        const lastTab = localStorage.getItem('lastActiveTab');
        
        if (lastTab) {
            console.log('🔄 Intentando restaurar tab:', lastTab);
            
            // Buscar el botón del tab por múltiples métodos
            let tabButton = document.querySelector(`[data-bs-target="#${lastTab}"]`);
            
            // Si no se encuentra, buscar por ID del botón
            if (!tabButton) {
                const tabId = lastTab.replace('-content', '-tab');
                tabButton = document.getElementById(tabId);
            }
            
            // Si aún no se encuentra, buscar por href
            if (!tabButton) {
                tabButton = document.querySelector(`[href="#${lastTab}"]`);
            }
            
            if (tabButton) {
                // Activar el tab usando Bootstrap
                const tab = new bootstrap.Tab(tabButton);
                tab.show();
                console.log('✅ Tab restaurado exitosamente:', lastTab);
                
                // También activar visualmente el contenido
                const tabContent = document.getElementById(lastTab);
                if (tabContent) {
                    // Remover active de todos los tab-panes
                    document.querySelectorAll('.tab-pane').forEach(pane => {
                        pane.classList.remove('active', 'show');
                    });
                    // Activar el tab-pane correcto
                    tabContent.classList.add('active', 'show');
                }
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

        // Guardar scroll position periódicamente
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(saveScrollPosition, 100);
        });

        // Guardar antes de salir de la página
        window.addEventListener('beforeunload', saveScrollPosition);

        console.log('✅ Listeners de tabs y scroll configurados');
    }

    /**
     * Inicializar el sistema
     */
    function init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setupTabListeners();
                // Delay más largo para asegurar que el dashboard esté completamente cargado
                setTimeout(restoreActiveTab, 1000);
                setTimeout(restoreScrollPosition, 1200);
            });
        } else {
            setupTabListeners();
            setTimeout(restoreActiveTab, 1000);
            setTimeout(restoreScrollPosition, 1200);
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
