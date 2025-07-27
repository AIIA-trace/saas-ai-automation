/**
 * email-read-indicator.js
 * 
 * Este script modifica el comportamiento de los emails para que:
 * 1. Se oculte completamente los puntos azules del inicio de cada email
 * 2. Se mantenga la funcionalidad de marcar emails como leídos/no leídos
 */

window.addEventListener('load', function() {
    console.log('🔵 Inicializando mejoras para emails...');
    
    // Esperar a que el DOM esté completamente cargado
    setTimeout(() => {
        hideEmailIndicators();
        updateEmailRowClickHandler();
        overrideEmailFunctions();
    }, 500);
});

/**
 * Oculta completamente los puntos azules del inicio de cada email
 */
function hideEmailIndicators() {
    console.log('🔄 Ocultando puntos azules del inicio de los emails...');
    
    // Añadir estilos CSS para ocultar los puntos azules y columna de indicadores
    const styleElement = document.createElement('style');
    styleElement.id = 'hide-email-indicators-styles';
    styleElement.textContent = `
        /* Ocultar completamente los puntos azules y toda la columna */
        #emails-tab th:first-child,
        .email-row td:first-child {
            display: none !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    console.log('✅ Puntos azules y columna de indicadores ocultados completamente');
    
    // Observar cambios en el DOM para aplicar estos cambios a nuevos elementos
    setupObserver();
}

/**
 * Añade estilos CSS para los indicadores de lectura
 */
function addReadIndicatorStyles() {
    // Comprobar si los estilos ya existen
    if (document.getElementById('read-indicator-styles')) return;
    
    // Crear elemento de estilo
    const styleElement = document.createElement('style');
    styleElement.id = 'read-indicator-styles';
    
    // Definir estilos para los indicadores de lectura
    styleElement.textContent = `
        /* Estilo para los indicadores de lectura */
        .read-indicator {
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }
        
        .read-indicator:hover {
            transform: scale(1.2);
            opacity: 0.8;
        }
        
        /* Indicador de no leído (azul lleno) */
        .read-indicator.fas.text-primary {
            color: #3498db !important;
        }
        
        /* Indicador de leído (círculo vacío) */
        .read-indicator.far.text-muted {
            color: #95a5a6 !important;
        }
        
        /* Añadir espacio para click */
        .email-row td:first-child {
            padding: 8px !important;
            text-align: center;
            min-width: 40px;
        }
    `;
    
    // Añadir estilos al documento
    document.head.appendChild(styleElement);
    console.log('✅ Estilos para indicadores de lectura añadidos');
}

/**
 * Actualiza el handler de clics en filas de email para excluir la columna de indicador
 */
function updateEmailRowClickHandler() {
    // Buscar el script original de clicks en filas
    if (typeof makeEmailRowsClickable === 'function') {
        // Sobreescribir la función original
        const originalMakeClickable = makeEmailRowsClickable;
        
        window.makeEmailRowsClickable = function(container) {
            console.log('🔄 Actualizando comportamiento de clic en filas para excluir indicadores...');
            
            const rows = container.querySelectorAll('.email-row');
            rows.forEach(row => {
                // Quitar cualquier evento de clic existente
                row.removeEventListener('click', handleRowClick);
                
                // Añadir nuevamente pero con la modificación
                row.addEventListener('click', handleRowClick);
                
                // Añadir clase visual para indicar que es clickable
                row.classList.add('clickable-row');
            });
            
            console.log(`✅ ${rows.length} filas de email actualizadas con nuevo comportamiento`);
        };
        
        // Función de manejo de clic modificada
        function handleRowClick(event) {
            // Verificar si el clic fue en la primera columna (indicador de lectura)
            const firstCell = event.target.closest('td:first-child');
            const readIndicator = event.target.closest('.read-indicator') || event.target.matches('.read-indicator');
            
            // Si el clic fue en la columna de indicador o en el indicador mismo, no abrir el correo
            if (firstCell || readIndicator) {
                console.log('🔵 Clic en columna de indicador - no abriendo el correo');
                return;
            }
            
            // Verificar si el clic fue en un botón, enlace o input
            if (
                event.target.tagName === 'BUTTON' || 
                event.target.tagName === 'A' || 
                event.target.tagName === 'INPUT' ||
                event.target.closest('button') || 
                event.target.closest('a') || 
                event.target.closest('input') ||
                event.target.closest('.dropdown') ||
                event.target.closest('.dropdown-toggle')
            ) {
                // No hacer nada, dejar que el evento continúe
                return;
            }
            
            // Obtener el ID del email desde el data-id de la fila
            const emailId = this.dataset.id;
            
            if (emailId) {
                console.log(`📩 Clic en fila de email ID: ${emailId}, abriendo detalles...`);
                
                // Llamar directamente a la función viewEmailDetails
                if (typeof window.viewEmailDetails === 'function') {
                    window.viewEmailDetails(emailId);
                } else {
                    console.error('❌ La función viewEmailDetails no está disponible');
                }
            }
        }
        
        // Re-aplicar a las filas existentes
        const emailsTable = document.querySelector('#emails-tab');
        if (emailsTable) {
            makeEmailRowsClickable(emailsTable);
        }
    } else {
        console.error('❌ No se encontró la función makeEmailRowsClickable para sobreescribir');
    }
}

/**
 * Sobreescribe funciones relacionadas con emails
 */
function overrideEmailFunctions() {
    // Sobreescribir createEmailRow para aplicar indicadores en nuevas filas
    if (typeof window.createEmailRow === 'function') {
        const originalCreateEmailRow = window.createEmailRow;
        
        window.createEmailRow = function(email) {
            // Llamar a la función original primero
            const row = originalCreateEmailRow(email);
            
            // Buscar y reemplazar el icono de estrella por indicador de lectura
            const starIcon = row.querySelector('i.fa-star');
            if (starIcon) {
                // Determinar si el correo está leído o no
                const isUnread = !email.read || row.classList.contains('fw-bold');
                
                // Reemplazar la clase de estrella con círculo
                starIcon.classList.remove('fa-star', 'fas', 'far', 'text-warning');
                starIcon.classList.add('fa-circle');
                
                // Aplicar clase según el estado
                if (isUnread) {
                    starIcon.classList.add('fas', 'text-primary'); // Círculo lleno azul para no leídos
                    starIcon.setAttribute('title', 'Marcar como leído');
                } else {
                    starIcon.classList.add('far', 'text-muted'); // Círculo vacío para leídos
                    starIcon.setAttribute('title', 'Marcar como no leído');
                }
                
                // Asignar clase específica
                starIcon.classList.add('read-indicator');
            }
            
            return row;
        };
        
        console.log('✅ Función createEmailRow sobreescrita para usar indicadores de lectura');
    }
    
    // Sobreescribir toggleEmailFavorite para cambiar su funcionamiento a toggle de leído/no leído
    if (typeof window.toggleEmailFavorite === 'function') {
        // Mantener el nombre por compatibilidad pero cambiar la funcionalidad
        window.toggleEmailFavorite = function(emailId, indicator) {
            console.log(`🔵 Cambiando estado de lectura para email ID: ${emailId}`);
            
            if (!indicator) return;
            
            const emailRow = indicator.closest('.email-row');
            if (!emailRow) return;
            
            // Determinar el estado actual
            const isUnread = indicator.classList.contains('fas');
            
            if (isUnread) {
                // Marcar como leído
                indicator.classList.replace('fas', 'far');
                indicator.classList.replace('text-primary', 'text-muted');
                indicator.setAttribute('title', 'Marcar como no leído');
                
                // Quitar negrita
                emailRow.classList.remove('fw-bold');
                
                // Actualizar dataset
                emailRow.dataset.type = (emailRow.dataset.type || '').replace('unread', '').trim();
                
                toastr.success(`Email #${emailId} marcado como leído`, 'Estado actualizado');
            } else {
                // Marcar como no leído
                indicator.classList.replace('far', 'fas');
                indicator.classList.replace('text-muted', 'text-primary');
                indicator.setAttribute('title', 'Marcar como leído');
                
                // Agregar negrita
                emailRow.classList.add('fw-bold');
                
                // Actualizar dataset
                if (!emailRow.dataset.type.includes('unread')) {
                    emailRow.dataset.type = (emailRow.dataset.type + ' unread').trim();
                }
                
                toastr.info(`Email #${emailId} marcado como no leído`, 'Estado actualizado');
            }
            
            // Notificar al servidor el cambio de estado
            notifyServerEmailReadStatus(emailId, !isUnread);
        };
        
        console.log('✅ Función toggleEmailFavorite redefinida para controlar estado de lectura');
    }
    
    // Agregar click event listener específico para los indicadores de lectura
    document.addEventListener('click', function(e) {
        const indicator = e.target.closest('.read-indicator');
        if (indicator) {
            const emailRow = indicator.closest('.email-row');
            if (emailRow) {
                const emailId = emailRow.dataset.id;
                if (emailId) {
                    // Prevenir que el evento llegue al handler de la fila
                    e.stopPropagation();
                    toggleEmailFavorite(emailId, indicator);
                }
            }
        }
    });
}

/**
 * Notifica al servidor el estado de lectura de un email
 * @param {number} emailId - ID del email
 * @param {boolean} isRead - Si está leído (true) o no (false)
 */
function notifyServerEmailReadStatus(emailId, isRead) {
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('⚠️ No se encontró token para notificar al servidor');
        return;
    }
    
    // Enviar notificación al backend
    console.log(`📤 Notificando al servidor que email #${emailId} ahora está ${isRead ? 'leído' : 'no leído'}`);
    
    fetch(`/api/emails/${emailId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            read: isRead
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Estado de lectura del email ${emailId} actualizado a ${isRead ? 'leído' : 'no leído'}`);
    })
    .catch(error => {
        console.warn(`⚠️ No se pudo actualizar el estado en el servidor: ${error.message}`);
    });
}

/**
 * Configura un observer para detectar y transformar nuevas filas de email
 */
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Buscar filas de email nuevas
                        const newRows = node.classList && node.classList.contains('email-row') ? 
                                       [node] : 
                                       Array.from(node.querySelectorAll('.email-row'));
                        
                        if (newRows.length) {
                            console.log(`🔍 Detectadas ${newRows.length} nuevas filas de email, aplicando indicadores...`);
                            
                            newRows.forEach(row => {
                                const starIcon = row.querySelector('i.fa-star');
                                if (starIcon && !starIcon.classList.contains('read-indicator')) {
                                    // Determinar si el correo está leído o no
                                    const isUnread = row.classList.contains('fw-bold');
                                    
                                    // Reemplazar la clase de estrella con círculo
                                    starIcon.classList.remove('fa-star', 'fas', 'far', 'text-warning');
                                    starIcon.classList.add('fa-circle');
                                    
                                    // Aplicar clase según el estado
                                    if (isUnread) {
                                        starIcon.classList.add('fas', 'text-primary'); 
                                        starIcon.setAttribute('title', 'Marcar como leído');
                                    } else {
                                        starIcon.classList.add('far', 'text-muted');
                                        starIcon.setAttribute('title', 'Marcar como no leído');
                                    }
                                    
                                    // Asignar clase específica
                                    starIcon.classList.add('read-indicator');
                                }
                            });
                            
                            // Re-aplicar el handler de clics
                            if (typeof makeEmailRowsClickable === 'function') {
                                const container = newRows[0].parentElement || document.querySelector('#emails-tab');
                                if (container) {
                                    makeEmailRowsClickable(container);
                                }
                            }
                        }
                    }
                }
            }
        });
    });
    
    // Observar cambios en el cuerpo del documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('👀 Observer configurado para aplicar indicadores a nuevas filas');
}
