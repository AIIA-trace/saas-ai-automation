/**
 * email-favorite-unread.js
 * 
 * Este script extiende la funcionalidad de marcar emails como favoritos
 * para que también los marque como no leídos (negrita) sin abrir el modal
 * de visualización de correo.
 */

window.addEventListener('load', function() {
    console.log('⭐ Inicializando funcionalidad de favoritos que marcan como no leídos...');
    
    // Esperar un momento para asegurar que todas las funciones estén disponibles
    setTimeout(() => {
        overrideToggleEmailFavorite();
    }, 500);
});

/**
 * Sobreescribe la función de marcar favoritos para también marcar como no leídos
 */
function overrideToggleEmailFavorite() {
    // Guardar referencia a la función original
    if (typeof window.toggleEmailFavorite === 'function') {
        const originalToggleFavorite = window.toggleEmailFavorite;
        
        // Sobreescribir la función
        window.toggleEmailFavorite = function(emailId, starIcon) {
            console.log(`🌟 Función extendida: Toggle favorito/no leído para email ID: ${emailId}`);
            
            // Ejecutar la función original primero
            originalToggleFavorite.apply(this, arguments);
            
            // Si el icono ahora es favorito (fas), también marcar como no leído
            if (starIcon && starIcon.classList.contains('fas')) {
                // Buscar la fila del email
                const emailRow = starIcon.closest('.email-row');
                if (emailRow) {
                    // Si el correo está ya leído (sin negrita), marcarlo como no leído
                    if (!emailRow.classList.contains('fw-bold')) {
                        console.log(`📧 Marcando email #${emailId} como no leído al ser favorito`);
                        
                        // Aplicar clase de negrita
                        emailRow.classList.add('fw-bold');
                        
                        // Actualizar el tipo en el dataset
                        if (!emailRow.dataset.type.includes('unread')) {
                            emailRow.dataset.type = (emailRow.dataset.type + ' unread').trim();
                        }
                        
                        // Notificar en consola
                        console.log(`Email #${emailId} marcado como no leído - Estado actualizado`);
                        
                        // Notificar al servidor el cambio de estado (silenciosamente)
                        notifyServerEmailUnread(emailId);
                    }
                }
            }
        };
        
        console.log('✅ Función toggleEmailFavorite extendida para marcar como no leídos');
    } else {
        console.error('❌ No se encontró la función toggleEmailFavorite para extender');
    }
}

/**
 * Notifica al servidor que un email ha sido marcado como no leído
 * @param {number} emailId - ID del email
 */
function notifyServerEmailUnread(emailId) {
    // Obtener token de autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('⚠️ No se encontró token para notificar al servidor');
        return;
    }
    
    // Enviar notificación al backend (modo silencioso)
    console.log(`📤 Notificando al servidor que email #${emailId} fue marcado como no leído`);
    
    fetch(`/api/emails/${emailId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            read: false
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ API: Estado de email ${emailId} actualizado a no leído`);
    })
    .catch(error => {
        // Error silencioso, solo registrar en consola
        console.warn(`⚠️ No se pudo actualizar el estado en el servidor: ${error.message}`);
    });
}
