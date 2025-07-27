/**
 * email-toggle-read.js
 * 
 * Este script modifica el comportamiento de los emails para que:
 * 1. Al hacer clic en un email, se marque como leído o no leído
 * 2. Se evita que se abra la vista previa del correo al hacer clic
 * 3. Se oculta completamente la columna de indicadores/estrellas
 */

window.addEventListener('load', function() {
    console.log('📧 Inicializando comportamiento de emails toggle-read...');
    
    // Esperar a que el DOM esté completamente cargado
    setTimeout(() => {
        hideStarColumn();
        updateEmailRowClickHandler();
        applyStyleFixes();
    }, 500);
});

/**
 * Oculta la columna de estrellas/indicadores completamente
 */
function hideStarColumn() {
    console.log('🚫 Ocultando columna de indicadores/estrellas...');
    
    // Añadir estilos para ocultar la columna
    const styleElement = document.createElement('style');
    styleElement.id = 'hide-star-column-styles';
    styleElement.textContent = `
        /* Ocultar columna de estrellas/indicadores */
        #emails-tab th:first-child,
        .email-row td:first-child {
            display: none !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    console.log('✅ Columna de estrellas/indicadores ocultada');
}

/**
 * Actualiza el handler de clics en filas de email para cambiar comportamiento
 */
function updateEmailRowClickHandler() {
    // Buscar el script original de clicks en filas
    console.log('🔄 Actualizando comportamiento de clic en filas de email...');
    
    // Eliminar cualquier evento click existente de las filas de email
    const emailRows = document.querySelectorAll('.email-row');
    emailRows.forEach(row => {
        const newRow = row.cloneNode(true);
        row.parentNode.replaceChild(newRow, row);
    });
    
    // Añadir nuevo listener de clic para todas las filas de email
    document.addEventListener('click', function(e) {
        const emailRow = e.target.closest('.email-row');
        if (!emailRow) return;
        
        // Verificar si el clic fue en un botón, enlace o input (no aplicar comportamiento en esos casos)
        if (
            e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'A' || 
            e.target.tagName === 'INPUT' ||
            e.target.closest('button') || 
            e.target.closest('a') || 
            e.target.closest('input') ||
            e.target.closest('.dropdown') ||
            e.target.closest('.dropdown-toggle')
        ) {
            // No hacer nada, dejar que el evento continúe
            return;
        }
        
        // Obtener el ID del email desde el data-id de la fila
        const emailId = emailRow.dataset.id;
        if (!emailId) return;
        
        // Prevenir que se abra el email
        e.preventDefault();
        e.stopPropagation();
        
        // Alternar estado leído/no leído
        toggleEmailReadStatus(emailId, emailRow);
    });
    
    console.log('✅ Comportamiento de clic en filas actualizado');
    
    // Observar cambios en el DOM para aplicar a nuevas filas
    setupRowObserver();
}

/**
 * Alterna el estado leído/no leído de un email
 * @param {string} emailId - ID del email
 * @param {HTMLElement} emailRow - Elemento fila del email
 */
function toggleEmailReadStatus(emailId, emailRow) {
    console.log(`🔄 Alternando estado de lectura para email ID: ${emailId}`);
    
    // Determinar el estado actual
    const isUnread = emailRow.classList.contains('fw-bold');
    
    if (isUnread) {
        // Marcar como leído
        emailRow.classList.remove('fw-bold');
        
        // Actualizar dataset
        emailRow.dataset.type = (emailRow.dataset.type || '').replace('unread', '').trim();
        
        toastr.success(`Email #${emailId} marcado como leído`, 'Estado actualizado');
    } else {
        // Marcar como no leído
        emailRow.classList.add('fw-bold');
        
        // Actualizar dataset
        if (!emailRow.dataset.type.includes('unread')) {
            emailRow.dataset.type = (emailRow.dataset.type + ' unread').trim();
        }
        
        toastr.info(`Email #${emailId} marcado como no leído`, 'Estado actualizado');
    }
    
    // Notificar al servidor el cambio de estado
    notifyServerEmailReadStatus(emailId, !isUnread);
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
 * Configura un observer para aplicar el comportamiento a nuevas filas
 */
function setupRowObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Si es una fila de email o contiene filas de email
                        const rows = node.classList && node.classList.contains('email-row') ? 
                                   [node] : 
                                   Array.from(node.querySelectorAll('.email-row'));
                                   
                        if (rows.length) {
                            console.log(`🔍 Detectadas ${rows.length} nuevas filas de email`);
                            
                            // Asegurar que las nuevas filas tengan la primera columna oculta
                            const style = document.getElementById('hide-star-column-styles');
                            if (!style) {
                                hideStarColumn();
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
    
    console.log('👀 Observer configurado para nuevas filas de email');
}

/**
 * Aplica correcciones de estilo adicionales para mejorar la tabla sin la columna
 */
function applyStyleFixes() {
    const styleElement = document.createElement('style');
    styleElement.id = 'email-toggle-read-styles';
    styleElement.textContent = `
        /* Estilos para filas de email */
        .email-row {
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        
        .email-row:hover {
            background-color: rgba(0, 123, 255, 0.05) !important;
        }
        
        /* Estilo para correos leídos/no leídos */
        .email-row.fw-bold {
            font-weight: bold !important;
            background-color: rgba(0, 123, 255, 0.03);
        }
        
        /* Espaciado mejorado */
        .email-row td {
            padding: 0.6rem !important;
        }
        
        /* Ocultar cualquier residuo de la columna de estrella */
        .fa-star, .fa-circle.read-indicator {
            display: none !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    console.log('✅ Estilos adicionales aplicados');
}
