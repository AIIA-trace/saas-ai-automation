/**
 * email-pagination-removal.js
 * 
 * Este script elimina la paginación de emails y mejora el comportamiento 
 * del scroll para mostrar todos los emails en una lista continua
 */

window.addEventListener('load', function() {
    console.log('🔧 Inicializando solución para eliminar paginación de emails...');
    
    // Ejecutar la solución después de que todo esté cargado
    setTimeout(removePagination, 1000);
    
    // También observar cambios en el DOM para aplicar los cambios 
    // si la sección de emails es recreada
    setupMutationObserver();
});

/**
 * Elimina la paginación y mejora el contenedor de emails
 */
function removePagination() {
    console.log('🔧 Aplicando soluciones de scroll independiente en tabla de emails...');
    
    // 1. Eliminar el contenedor de paginación si existe
    const paginationContainer = document.querySelector('#emails-content .border-top');
    if (paginationContainer) {
        console.log('✅ Eliminando sección de paginación de emails');
        paginationContainer.remove();
    }
    
    // 2. Mejorar el contenedor de emails para scroll continuo
    improveEmailsContainer();
    
    // 3. Añadir estilos específicos para la barra de desplazamiento
    addCustomScrollbarStyles();
    
    console.log('✅ Paginación de emails eliminada con éxito');
}

/**
 * Mejora el contenedor de emails para scroll continuo e independiente
 */
function improveEmailsContainer() {
    console.log('💭 Mejorando contenedor de emails para scroll independiente...');
    
    // Hacer que la tabla tenga scroll independiente
    const tableContainer = document.querySelector('#emails-tab .table-responsive');
    if (tableContainer) {
        // Establecer una altura fija para la tabla y activar scroll
        tableContainer.style.maxHeight = '550px';
        tableContainer.style.overflowY = 'auto';
        tableContainer.style.overflowX = 'auto'; // Permitir scroll horizontal si es necesario
        tableContainer.style.position = 'relative';
        tableContainer.classList.add('smooth-scroll');
        
        console.log('✅ Contenedor de tabla de emails configurado con scroll independiente');
    }
    
    // Asegurar que el contenedor principal no tenga límite de altura
    const emailsContent = document.querySelector('#emails-content');
    if (emailsContent) {
        emailsContent.style.maxHeight = 'none';
        emailsContent.style.overflowY = 'visible';
    }
}

/**
 * Añade estilos personalizados para la barra de desplazamiento
 */
function addCustomScrollbarStyles() {
    // Verificar si ya existe el estilo
    if (document.getElementById('custom-scrollbar-styles')) return;
    
    // Crear elemento de estilo
    const style = document.createElement('style');
    style.id = 'custom-scrollbar-styles';
    style.textContent = `
        /* Estilo para scroll suave */
        .smooth-scroll {
            scroll-behavior: smooth;
        }
        
        /* Estilos para la barra de desplazamiento (webkit) */
        .table-responsive::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        .table-responsive::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }
        
        /* Espacio extra al final de la tabla para mejor scroll */
        #emails-tab .dashboard-table tbody::after {
            content: "";
            display: block;
            height: 20px;
        }
    `;
    
    // Añadir al documento
    document.head.appendChild(style);
}

/**
 * Configura un observador de mutaciones para detectar cambios en el DOM
 * y volver a aplicar la solución si es necesario
 */
function setupMutationObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // Si se recrea la pestaña de emails o se añade el contenido
                if (document.querySelector('#emails-content .pagination')) {
                    console.log('🔄 Detectada recreación de la paginación, eliminándola...');
                    removePagination();
                }
            }
        });
    });
    
    // Observar el contenido del documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
