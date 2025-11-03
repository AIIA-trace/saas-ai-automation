/**
 * Sistema de persistencia de navegación global
 * Guarda y restaura el estado de navegación en todas las páginas
 */

(function() {
    'use strict';

    console.log('🔄 Inicializando sistema de persistencia de navegación...');

    /**
     * Guardar el tab activo actual y actualizar URL
     */
    function saveActiveTab(tabId) {
        if (tabId) {
            localStorage.setItem('lastActiveTab', tabId);
            // Actualizar hash en la URL sin recargar
            window.history.replaceState(null, '', `#${tabId}`);
            console.log('💾 Tab guardado:', tabId, '- URL actualizada');
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
     * Restaurar el último tab activo desde URL hash o localStorage
     */
    function restoreActiveTab() {
        // Prioridad 1: Hash en la URL
        let tabId = window.location.hash.replace('#', '');
        
        // Prioridad 2: localStorage
        if (!tabId) {
            tabId = localStorage.getItem('lastActiveTab');
        }
        
        // Prioridad 3: Tab por defecto (llamadas)
        if (!tabId) {
            tabId = 'calls-content';
        }
        
        if (tabId) {
            console.log('🔄 Restaurando tab desde:', window.location.hash ? 'URL hash' : 'localStorage', '→', tabId);
            
            // Buscar el botón del tab por múltiples métodos
            let tabButton = document.querySelector(`[data-bs-target="#${tabId}"]`);
            
            // Si no se encuentra, buscar por ID del botón
            if (!tabButton) {
                const buttonId = tabId.replace('-content', '-tab');
                tabButton = document.getElementById(buttonId);
            }
            
            // Si aún no se encuentra, buscar por href
            if (!tabButton) {
                tabButton = document.querySelector(`[href="#${tabId}"]`);
            }
            
            if (tabButton) {
                // Activar el tab usando Bootstrap
                const tab = new bootstrap.Tab(tabButton);
                tab.show();
                console.log('✅ Tab restaurado exitosamente:', tabId);
                
                // Actualizar URL si no estaba
                if (!window.location.hash) {
                    window.history.replaceState(null, '', `#${tabId}`);
                }
                
                // También activar visualmente el contenido
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    // Remover active de todos los tab-panes
                    document.querySelectorAll('.tab-pane').forEach(pane => {
                        pane.classList.remove('active', 'show');
                    });
                    // Activar el tab-pane correcto
                    tabContent.classList.add('active', 'show');
                }
            } else {
                console.warn('⚠️ No se encontró el tab:', tabId);
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
     * Esperar a que los tabs estén renderizados
     */
    function waitForTabsAndRestore() {
        const checkTabs = () => {
            const tabsContainer = document.querySelector('.nav-tabs');
            const tabPanes = document.querySelectorAll('.tab-pane');
            
            if (tabsContainer && tabPanes.length > 0) {
                console.log('✅ Tabs detectados, restaurando navegación...');
                setupTabListeners();
                
                // Restaurar inmediatamente si hay hash en URL
                if (window.location.hash) {
                    console.log('🔗 Hash detectado en URL:', window.location.hash);
                    restoreActiveTab();
                    setTimeout(restoreScrollPosition, 300);
                } else {
                    // Si no hay hash, usar delays normales
                    setTimeout(restoreActiveTab, 500);
                    setTimeout(restoreScrollPosition, 700);
                }
            } else {
                console.log('⏳ Esperando a que se rendericen los tabs...');
                setTimeout(checkTabs, 100);
            }
        };
        
        checkTabs();
    }

    /**
     * Inicializar el sistema
     */
    function init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForTabsAndRestore);
        } else {
            waitForTabsAndRestore();
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
