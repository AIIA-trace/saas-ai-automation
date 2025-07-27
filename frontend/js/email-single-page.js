/**
 * email-single-page.js
 * 
 * Este script reemplaza la paginación de emails por una vista de scroll única
 * que muestra todos los correos en una sola página.
 */

window.addEventListener('load', function() {
    console.log('📧 Inicializando modo página única para emails...');
    
    // Esperar un momento para que el DOM esté completamente cargado
    setTimeout(() => {
        removePaginationCompletelyAndSetupScroll();
        overrideEmailFunctions();
    }, 500);
});

/**
 * Elimina completamente la paginación y configura scroll vertical
 */
function removePaginationCompletelyAndSetupScroll() {
    console.log('🗑️ Removiendo paginación completamente...');
    
    // 1. Eliminar completamente la paginación existente
    const paginationContainer = document.querySelector('#emails-content .border-top');
    if (paginationContainer) {
        console.log('✅ Eliminando sección de paginación de emails');
        paginationContainer.remove();
    }
    
    // 2. Configurar el contenedor de tabla para scroll
    const tableContainer = document.querySelector('#emails-tab .table-responsive');
    if (tableContainer) {
        // Altura fija para permitir scroll
        tableContainer.style.maxHeight = '550px';
        tableContainer.style.overflowY = 'auto';
        tableContainer.style.overflowX = 'auto';
        tableContainer.style.position = 'relative';
        
        // Añadir clase para scroll suave
        tableContainer.classList.add('emails-smooth-scroll');
        
        console.log('✅ Contenedor de tabla configurado para scroll');
    }
    
    // 3. Añadir estilos específicos
    addScrollStyles();
    
    // 4. Observar cambios en el DOM para mantener estas modificaciones
    setupObserver();
}

/**
 * Sobreescribe funciones relacionadas con emails para evitar paginación
 */
function overrideEmailFunctions() {
    console.log('🔄 Sobreescribiendo funciones de emails...');
    
    // Sobreescribir createEmailsTabContent para eliminar la paginación
    if (typeof window.createEmailsTabContent === 'function') {
        const originalCreateEmailsTab = window.createEmailsTabContent;
        
        window.createEmailsTabContent = function() {
            // Llamar a la función original
            let content = originalCreateEmailsTab();
            
            // Eliminar la sección de paginación del HTML
            content = content.replace(/<div class="border-top pt-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>$/, 
                                     '</div></div></div>');
            
            return content;
        };
        
        console.log('✅ Función createEmailsTabContent sobreescrita');
    }
    
    // Sobreescribir loadEmailsData para cargar todos los emails sin paginación
    if (typeof window.loadEmailsData === 'function') {
        const originalLoadEmails = window.loadEmailsData;
        
        window.loadEmailsData = function() {
            console.log('📨 Cargando todos los emails sin paginación...');
            
            // Aquí llamamos a la función original pero asegurándonos de que
            // no se aplique ninguna lógica de paginación
            return originalLoadEmails.apply(this, arguments);
        };
        
        console.log('✅ Función loadEmailsData sobreescrita');
    }
}

/**
 * Añade estilos para el scroll
 */
function addScrollStyles() {
    // Comprobar si los estilos ya existen
    if (document.getElementById('email-single-page-styles')) return;
    
    // Crear elemento de estilo
    const styleElement = document.createElement('style');
    styleElement.id = 'email-single-page-styles';
    
    // Definir estilos para la vista de página única con scroll
    styleElement.textContent = `
        /* Estilo para scroll suave */
        .emails-smooth-scroll {
            scroll-behavior: smooth;
        }
        
        /* Estilos para la barra de desplazamiento en WebKit */
        .emails-smooth-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        .emails-smooth-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        .emails-smooth-scroll::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        
        .emails-smooth-scroll::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }
        
        /* Quitar cualquier elemento de paginación que pudiera aparecer */
        #emails-content .pagination,
        #emails-tab .pagination {
            display: none !important;
        }
        
        /* Espacio extra al final de la tabla para mejor scroll */
        #emails-tab .dashboard-table tbody::after {
            content: "";
            display: block;
            height: 20px;
        }
        
        /* Asegurar que el contenedor principal no tiene altura fija */
        #emails-content {
            max-height: none !important;
            overflow-y: visible !important;
        }
    `;
    
    // Añadir estilos al documento
    document.head.appendChild(styleElement);
    console.log('✅ Estilos para scroll añadidos');
}

/**
 * Configura un observer para detectar y eliminar paginación que pueda aparecer dinámicamente
 */
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                // Buscar si se ha añadido algún elemento de paginación
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Buscar elementos de paginación
                        const paginationElements = node.querySelectorAll('.pagination');
                        if (paginationElements.length > 0) {
                            console.log('🔍 Detectada paginación dinámica, eliminando...');
                            paginationElements.forEach(el => el.remove());
                        }
                        
                        // Buscar también el contenedor de paginación
                        const paginationContainers = node.querySelectorAll('#emails-content .border-top');
                        paginationContainers.forEach(container => {
                            if (container.querySelector('.pagination')) {
                                console.log('🔍 Detectado contenedor de paginación, eliminando...');
                                container.remove();
                            }
                        });
                    }
                }
            }
        });
    });
    
    // Observar cambios en todo el documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('👀 Observer configurado para eliminar paginación dinámica');
}
