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
        
        // Si estamos saliendo del tab de llamadas, ocultar su contenido
        if (targetTabId !== 'calls-content') {
            const callsContent = document.getElementById('calls-content');
            if (callsContent) {
                callsContent.style.display = 'none';
                callsContent.classList.remove('active', 'show');
            }
        }
        
        // Si estamos saliendo del tab de emails, ocultar su contenido
        if (targetTabId !== 'emails-content') {
            const emailsContent = document.getElementById('emails-content');
            if (emailsContent) {
                emailsContent.style.display = 'none';
                emailsContent.classList.remove('active', 'show');
            }
        }
        
        // Si estamos saliendo del tab de configuración del bot, ocultar su contenido
        if (targetTabId !== 'call-bot-content') {
            const botContent = document.getElementById('call-bot-content');
            if (botContent) {
                botContent.style.display = 'none';
                botContent.classList.remove('active', 'show');
            }
        }
        
        // Si estamos saliendo del tab de cuenta, ocultar su contenido
        if (targetTabId !== 'account-content') {
            const accountContent = document.getElementById('account-content');
            if (accountContent) {
                accountContent.style.display = 'none';
                accountContent.classList.remove('active', 'show');
            }
        }
        
        // Si estamos saliendo del tab de facturación, ocultar su contenido
        if (targetTabId !== 'billing-content') {
            const billingContent = document.getElementById('billing-content');
            if (billingContent) {
                billingContent.style.display = 'none';
                billingContent.classList.remove('active', 'show');
            }
        }
    }

    /**
     * Configurar listeners para cambios de tab
     */
    function setupTabListeners() {
        // Escuchar todos los botones de tab
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        
        tabButtons.forEach(button => {
            // Evento ANTES de cambiar de tab
            button.addEventListener('hide.bs.tab', function(event) {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId) {
                    const targetPane = document.querySelector(targetId);
                    if (targetPane) {
                        targetPane.style.display = 'none';
                    }
                }
            });
            
            // Evento AL cambiar de tab
            button.addEventListener('show.bs.tab', function(event) {
                const targetId = event.target.getAttribute('data-bs-target');
                if (targetId) {
                    // Limpiar otros tabs
                    cleanupTabContent(targetId.replace('#', ''));
                    
                    // Mostrar el tab objetivo
                    const targetPane = document.querySelector(targetId);
                    if (targetPane) {
                        targetPane.style.display = 'block';
                    }
                }
            });
            
            // Evento DESPUÉS de cambiar de tab
            button.addEventListener('shown.bs.tab', function(event) {
                // Forzar visibilidad correcta
                enforceTabVisibility();
                
                console.log(`✅ Tab cambiado a: ${event.target.getAttribute('data-bs-target')}`);
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
        enforceTabVisibility();
        
        // Verificar cada 2 segundos por si acaso
        setInterval(enforceTabVisibility, 2000);
        
        console.log('✅ Fix de tabs inicializado correctamente');
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
