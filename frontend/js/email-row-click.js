/**
 * email-row-click.js
 * 
 * Este script permite abrir los detalles del email al hacer clic en cualquier parte de la fila,
 * no solo en el botón de "Ver detalles".
 */

window.addEventListener('load', function() {
    console.log('👆 Inicializando funcionalidad de clic en fila de email...');
    
    // Aplicar inmediatamente a las filas existentes
    setupEmailRowsClickHandler();
    
    // Y también esperar un momento para asegurar que todo está cargado
    setTimeout(() => {
        console.log('🔄 Reapliacando handlers de clic a filas de email...');
        setupEmailRowsClickHandler();
    }, 1000);
});

/**
 * Configura los manejadores de eventos para las filas de emails
 */
function setupEmailRowsClickHandler() {
    console.log('🔍 Buscando filas de email para hacerlas clickeables...');
    
    // Procesar directamente todas las filas de email existentes
    document.querySelectorAll('tr.email-row').forEach(row => {
        makeRowClickable(row);
    });
    
    // También procesar las filas que pudieran estar dentro de #emails-tab
    const emailsTab = document.getElementById('emails-tab');
    if (emailsTab) {
        emailsTab.querySelectorAll('tr.email-row').forEach(row => {
            makeRowClickable(row);
        });
    }
    
    // Observer para detectar cuando se añaden nuevas filas de emails
    const observer = new MutationObserver((mutations) => {
        let newRowsFound = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    
                    // Si es un elemento DOM
                    if (node.nodeType === 1) {
                        // Si es una fila de email
                        if (node.classList && node.classList.contains('email-row')) {
                            makeRowClickable(node);
                            newRowsFound = true;
                        } else {
                            // Buscar filas de email dentro del nodo añadido
                            const rows = node.querySelectorAll('tr.email-row');
                            rows.forEach(row => {
                                makeRowClickable(row);
                                newRowsFound = true;
                            });
                        }
                    }
                }
            }
        });
        
        if (newRowsFound) {
            console.log('📩 Nuevas filas de email detectadas y hechas clickeables');
        }
    });
    
    // Observar cambios en todo el cuerpo del documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Hace que una fila de email sea clickeable
 * @param {HTMLElement} row - La fila de la tabla
 */
function makeRowClickable(row) {
    if (!row || row.hasAttribute('data-clickable')) return;
    
    // Marcar la fila como ya procesada
    row.setAttribute('data-clickable', 'true');
    
    // Obtener el ID del email
    const emailId = row.getAttribute('data-id');
    if (!emailId) {
        console.log('⚠️ Fila de email sin ID detectada:', row);
        return;
    }
    
    console.log(`✅ Haciendo clickeable la fila de email con ID: ${emailId}`);
    
    // Cambiar el estilo para indicar que es clickeable
    row.style.cursor = 'pointer';
    
    // Añadir efecto hover
    row.addEventListener('mouseenter', function() {
        this.classList.add('email-row-hover');
    });
    
    row.addEventListener('mouseleave', function() {
        this.classList.remove('email-row-hover');
    });
    
    // Añadir evento click directamente a cada celda excepto la primera (favorito) y la última (acciones)
    const cells = row.querySelectorAll('td');
    cells.forEach((cell, index) => {
        if (index > 0 && index < cells.length - 1) { // Excluir primera columna (favorito) y última (acciones)
            cell.addEventListener('click', function(event) {
                // Evitar si el clic fue en un elemento interactivo
                if (event.target.tagName === 'BUTTON' || 
                    event.target.tagName === 'A' || 
                    event.target.tagName === 'INPUT' ||
                    event.target.closest('button') ||
                    event.target.closest('a') ||
                    event.target.closest('input') ||
                    event.target.classList.contains('fa-star')) {
                    return;
                }
                
                // Prevenir la propagación para evitar comportamientos extraños
                event.stopPropagation();
                
                // Llamar directamente a la función viewEmailDetails
                console.log(`🔍 Abriendo detalles del email ${emailId} por clic en celda`);
                if (typeof window.viewEmailDetails === 'function') {
                    window.viewEmailDetails(emailId);
                } else {
                    console.error('❌ La función viewEmailDetails no está disponible');
                }
            });
        }
    });
}

/**
 * Añade estilos CSS para las filas clickeables
 */
function addClickableStyles() {
    // Comprobar si los estilos ya existen
    if (document.getElementById('email-row-click-styles')) return;
    
    // Crear elemento de estilos
    const styleElement = document.createElement('style');
    styleElement.id = 'email-row-click-styles';
    
    // Definir estilos para filas clickeables
    styleElement.textContent = `
        .email-row-hover {
            background-color: rgba(13, 110, 253, 0.05);
            transition: background-color 0.2s ease-in-out;
        }
        
        /* Excluir primera columna (favoritos) y última columna (acciones) */
        .email-row[data-clickable="true"] td:nth-child(n+2):not(:last-child) {
            user-select: none;
            cursor: pointer;
        }
        
        /* Cursor específico para columna de favoritos */
        .email-row[data-clickable="true"] td:first-child {
            cursor: default;
        }
        
        /* Columna de favoritos con estrella */
        .email-row[data-clickable="true"] td:first-child i.fa-star {
            cursor: pointer;
        }
        
        /* Efecto hover solo para columnas clickeables */
        .email-row[data-clickable="true"] td:nth-child(n+2):not(:last-child):hover {
            background-color: rgba(13, 110, 253, 0.03);
        }
    `;
    
    // Añadir estilos al documento
    document.head.appendChild(styleElement);
    
    console.log('🎨 Estilos para filas clickeables añadidos');
}

// Añadir estilos CSS
addClickableStyles();
