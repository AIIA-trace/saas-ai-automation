/**
 * email-auto-read.js
 * 
 * Este script marca automáticamente los emails como leídos cuando se abren
 * para visualizar su contenido, quitando el estilo de negrita.
 */

window.addEventListener('load', function() {
    console.log('📩 Inicializando marcado automático de emails como leídos...');
    
    // Esperar un momento para asegurar que todas las funciones estén disponibles
    setTimeout(() => {
        overrideViewEmailDetails();
    }, 500);
});

/**
 * Sobreescribe la función viewEmailDetails para marcar el email como leído automáticamente
 */
function overrideViewEmailDetails() {
    // Guardar referencia a la función original
    if (typeof window.viewEmailDetails === 'function') {
        const originalViewDetails = window.viewEmailDetails;
        
        // Sobreescribir la función con funcionalidad adicional
        window.viewEmailDetails = function(emailId) {
            console.log(`🔍 Abriendo email ID: ${emailId} y marcándolo como leído...`);
            
            // Buscar la fila del email para verificar si está sin leer
            const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
            const wasUnread = emailRow && emailRow.classList.contains('fw-bold');
            
            // Ejecutar la función original primero para mostrar el modal
            originalViewDetails.apply(this, arguments);
            
            // Si el email estaba sin leer, marcarlo como leído
            if (wasUnread) {
                // Quitar negrita (clase fw-bold)
                emailRow.classList.remove('fw-bold');
                
                // Eliminar el punto azul junto al asunto
                const blueCircle = emailRow.querySelector('i.fas.fa-circle.text-primary');
                if (blueCircle) {
                    blueCircle.remove();
                }
                
                // Actualizar el dataset type (eliminar unread)
                emailRow.dataset.type = emailRow.dataset.type.replace('unread', '').trim();
                if (emailRow.dataset.type === '') {
                    emailRow.dataset.type = 'read';
                }
                
                // Registrar el cambio
                console.log(`✅ Email #${emailId} marcado automáticamente como leído`);
                
                // Si estamos filtrando por 'unread', manejar la visibilidad
                const unreadFilter = document.getElementById('filter-emails-unread');
                if (unreadFilter && unreadFilter.checked) {
                    // Si estamos filtrando por no leídos, podemos ocultar este email
                    emailRow.classList.add('d-none');
                    
                    // Actualizar contador
                    const emailCount = document.getElementById('email-count');
                    if (emailCount) {
                        const visibleRows = document.querySelectorAll('.email-row:not(.d-none)');
                        emailCount.textContent = visibleRows.length;
                    }
                }
                
                // Notificar al servidor el cambio de estado (solo si hay API)
                notifyServerEmailRead(emailId);
            }
        };
        
        console.log('✅ Función viewEmailDetails extendida para marcar emails como leídos automáticamente');
    } else {
        console.error('❌ No se encontró la función viewEmailDetails para extender');
    }
}

/**
 * Notifica al servidor que un email ha sido leído
 * @param {number} emailId - ID del email
 */
function notifyServerEmailRead(emailId) {
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('⚠️ No se encontró token para notificar al servidor');
        return;
    }
    
    // Enviar notificación al backend (modo silencioso, sin mostrar mensajes al usuario)
    console.log(`📤 Notificando al servidor que email #${emailId} fue leído`);
    
    fetch(`/api/emails/${emailId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            read: true
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Estado de email ${emailId} actualizado a leído`);
    })
    .catch(error => {
        // Error silencioso, solo registrar en consola
        console.warn(`⚠️ No se pudo actualizar el estado en el servidor: ${error.message}`);
    });
}
