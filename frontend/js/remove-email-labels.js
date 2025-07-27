/**
 * remove-email-labels.js
 * 
 * Este script elimina todas las etiquetas de tipo (Cliente, Proveedor, Sistema, etc.)
 * que aparecen junto a las direcciones de email en todo el dashboard
 */

window.addEventListener('load', function() {
    console.log('🏷️ Eliminando etiquetas de tipo de remitente en emails...');
    
    // Iniciar el proceso de eliminación de etiquetas
    setTimeout(() => {
        removeEmailLabels();
        setupEmailLabelObserver();
    }, 500);
});

/**
 * Elimina todas las etiquetas de tipo junto a emails
 */
function removeEmailLabels() {
    // Limpiar etiquetas en filas de emails
    cleanEmailRowLabels();
    
    // Sobreescribir funciones que crean emails
    overrideEmailFunctions();
}

/**
 * Limpia las etiquetas existentes en las filas de emails
 */
function cleanEmailRowLabels() {
    console.log('🧹 Limpiando etiquetas de emails en el DOM...');
    
    // Expresión regular para detectar emails con etiquetas de tipo al lado
    // Busca un email seguido de espacios y una palabra con "Cliente", "Proveedor", etc.
    const labelRegex = /(([\w.-]+@[\w.-]+\.[a-zA-Z]{2,}))[\s]+([\w]+(?:Cliente|Proveedor|Sistema|CLIENTE|PROVEEDOR|SISTEMA))[\s]*/;
    
    // Limpia las etiquetas en la vista de lista de emails
    document.querySelectorAll('.email-row td:nth-child(2)').forEach(cell => {
        const cellText = cell.textContent.trim();
        const match = cellText.match(labelRegex);
        
        if (match && match[1]) {
            const emailOnly = match[1]; // El email capturado
            console.log(`🔍 Encontrado email con etiqueta: ${cellText} -> limpiando a: ${emailOnly}`);
            
            // Reemplazar el contenido con solo el email
            if (cell.childElementCount > 0) {
                // Si tiene elementos hijos, mantener la estructura pero limpiar
                if (cell.children[0]) cell.children[0].textContent = emailOnly;
            } else {
                cell.textContent = emailOnly;
            }
        }
    });
    
    // Limpiar etiquetas en los modales de detalles
    document.querySelectorAll('.email-sender').forEach(el => {
        const senderText = el.textContent.trim();
        const match = senderText.match(labelRegex);
        
        if (match && match[1]) {
            const emailOnly = match[1]; // El email capturado
            console.log(`🔍 Encontrada etiqueta en sender: ${senderText} -> limpiando a: ${emailOnly}`);
            el.textContent = emailOnly;
        }
    });
}

/**
 * Sobreescribe funciones que crean o muestran emails
 */
function overrideEmailFunctions() {
    // Sobreescribir createEmailRow
    if (window.createEmailRow) {
        const originalCreateEmailRow = window.createEmailRow;
        window.createEmailRow = function(email) {
            const row = originalCreateEmailRow.call(this, email);
            
            // Limpiar las etiquetas que se pudieron haber añadido
            if (row) {
                const senderCell = row.querySelector('td:nth-child(2)');
                if (senderCell) {
                    const cellText = senderCell.textContent.trim();
                    // Expresión regular para detectar emails con etiquetas de tipo
                    const labelRegex = /(([\w.-]+@[\w.-]+\.[a-zA-Z]{2,}))[\s]+([\w]+(?:Cliente|Proveedor|Sistema|CLIENTE|PROVEEDOR|SISTEMA))[\s]*/;
                    const match = cellText.match(labelRegex);
                    
                    if (match && match[1]) {
                        const justEmail = match[1]; // El email capturado
                        console.log(`🧼 Limpiando etiqueta en nueva fila: ${cellText} -> ${justEmail}`);
                        
                        if (senderCell.childElementCount > 0) {
                            // Tiene estructura con divs
                            const divs = senderCell.querySelectorAll('div');
                            if (divs.length > 0) {
                                divs[0].textContent = justEmail;
                                
                                // Si hay una segunda div (donde suele estar la etiqueta), eliminarla
                                if (divs.length > 1) {
                                    divs[1].remove();
                                }
                            }
                        } else {
                            // Sin estructura, reemplazar todo
                            senderCell.textContent = justEmail;
                        }
                    }
                }
            }
            
            return row;
        };
    }
    
    // Sobreescribir viewEmailDetails
    if (window.viewEmailDetails) {
        const originalViewDetails = window.viewEmailDetails;
        window.viewEmailDetails = function(emailId) {
            // Llamar a la función original
            originalViewDetails.call(this, emailId);
            
            // Después de mostrar el modal, limpiar las etiquetas
            setTimeout(() => {
                const modal = document.getElementById(`email-details-modal-${emailId}`);
                if (modal) {
                    const senderElement = modal.querySelector('.email-sender');
                    if (senderElement) {
                        const senderText = senderElement.textContent.trim();
                        // Expresión regular para detectar emails con etiquetas de tipo
                        const labelRegex = /(([\w.-]+@[\w.-]+\.[a-zA-Z]{2,}))[\s]+([\w]+(?:Cliente|Proveedor|Sistema|CLIENTE|PROVEEDOR|SISTEMA))[\s]*/;
                        const match = senderText.match(labelRegex);
                        
                        if (match && match[1]) {
                            const emailOnly = match[1]; // El email capturado
                            console.log(`🧼 Limpiando etiqueta en modal: ${senderText} -> ${emailOnly}`);
                            senderElement.textContent = emailOnly;
                        }
                    }
                }
            }, 100);
        };
    }
    
    // Sobreescribir la función de reenvío para limpiar la etiqueta
    if (window.forwardEmail) {
        const originalForward = window.forwardEmail;
        window.forwardEmail = function(emailId, subject) {
            // Llamar a la función original
            originalForward.call(this, emailId, subject);
            
            // Después de crear el modal, limpiar cualquier etiqueta en el mensaje reenviado
            setTimeout(() => {
                const textarea = document.getElementById('forward-email-content');
                if (textarea) {
                    let content = textarea.value;
                    
                    // Buscar líneas con "De:" y limpiar cualquier etiqueta
                    content = content.replace(/De:\s+([\w.@-]+)\s+(CLIENTE|Cliente|PROVEEDOR|Proveedor|SISTEMA|Sistema)/g, 'De: $1');
                    
                    textarea.value = content;
                }
            }, 100);
        };
    }
}

/**
 * Configura un observer para limpiar etiquetas en nuevos elementos
 */
function setupEmailLabelObserver() {
    // Observer para detectar cambios en el DOM
    const observer = new MutationObserver((mutations) => {
        let needCleaning = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    
                    // Si se añade un modal o una fila de email
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.classList?.contains('modal') || 
                         node.classList?.contains('email-row'))) {
                        needCleaning = true;
                        break;
                    }
                }
            }
        });
        
        if (needCleaning) {
            cleanEmailRowLabels();
        }
    });
    
    // Observar el documento para detectar nuevos modales o filas
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
