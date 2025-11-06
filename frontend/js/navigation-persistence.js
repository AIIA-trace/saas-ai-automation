/**
 * Sistema de persistencia de navegación global
 * Guarda y restaura el estado de navegación en todas las páginas
 * SIMPLIFICADO - Deja que Bootstrap maneje el DOM
 */

(function() {
    'use strict';

    console.log('🔄 Inicializando sistema de persistencia de navegación (simplificado)...');

    /**
     * Guardar el tab activo actual y actualizar URL
     */
    function saveActiveTab(tabId) {
        if (tabId) {
            localStorage.setItem('lastActiveTab', tabId);
            // Actualizar hash en la URL sin recargar
            window.history.replaceState(null, '', `#${tabId}`);
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
     * Restaurar el último tab activo desde URL hash o localStorage
     * SIMPLIFICADO - Solo activa el tab, Bootstrap maneja el resto
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
            console.log('🔄 Restaurando tab:', tabId);
            
            // Buscar el botón del tab
            let tabButton = document.querySelector(`[data-bs-target="#${tabId}"]`);
            
            if (!tabButton) {
                const buttonId = tabId.replace('-content', '-tab');
                tabButton = document.getElementById(buttonId);
            }
            
            if (tabButton) {
                // Dejar que Bootstrap maneje TODO
                const tab = bootstrap.Tab.getOrCreateInstance(tabButton);
                tab.show();
                console.log('✅ Tab restaurado:', tabId);
            } else {
                console.warn('⚠️ No se encontró el tab:', tabId);
            }
        }
    }

    /**
     * Configurar listeners para guardar el estado
     * SIMPLIFICADO - Solo guardar, no manipular DOM
     */
    function setupTabListeners() {
        // Guardar cuando cambia el tab activo
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

        console.log('✅ Listeners configurados');
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
     * Manejar cambios en el hash de la URL
     */
    function handleHashChange() {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        
        const tabButton = document.querySelector(`[data-bs-target="#${hash}"]`) || 
                         document.getElementById(hash.replace('-content', '-tab'));
        
        if (tabButton) {
            const tab = bootstrap.Tab.getOrCreateInstance(tabButton);
            tab.show();
        }
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
        
        // Listener para cambios en el hash
        window.addEventListener('hashchange', handleHashChange);
    }

    // Inicializar
    init();

    // Exportar funciones globalmente si es necesario
    window.NavigationPersistence = {
        saveActiveTab: saveActiveTab,
        restoreActiveTab: restoreActiveTab
    };
})();
