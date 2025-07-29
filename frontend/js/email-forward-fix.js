/**
 * email-forward-fix.js
 * 
 * Implementación de la función de reenvío de emails
 * Este script añade la funcionalidad faltante al botón "Reenviar" en el modal de detalles de email
 */

/**
 * Reenviar un email
 * @param {number} emailId - ID del email a reenviar
 * @param {string} subject - Asunto del email original
 */
function forwardEmail(emailId, subject) {
    console.log(`📤 Reenviando email ID: ${emailId}, Asunto: ${subject}`);
    
    // Cerrar el modal de detalles
    const modalElement = document.getElementById(`email-details-modal-${emailId}`);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }
    
    // Crear el modal de reenvío
    const modalId = 'forward-email-modal';
    
    // Eliminar modal anterior si existe
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Buscar el contenido del email original
    const originalContent = document.querySelector(`#email-details-modal-${emailId} .email-content`)?.textContent || '';
    const originalSender = document.querySelector(`#email-details-modal-${emailId} .email-sender`)?.textContent || '';
    
    // Crear estructura del modal
    const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="forwardEmailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="forwardEmailModalLabel">Reenviar email</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="forward-email-form">
                            <div class="mb-3">
                                <label for="forward-email-to" class="form-label">Para:</label>
                                <input type="email" class="form-control" id="forward-email-to" placeholder="Destinatario" required>
                            </div>
                            <div class="mb-3">
                                <label for="forward-email-cc" class="form-label">CC:</label>
                                <input type="email" class="form-control" id="forward-email-cc" placeholder="Opcional">
                            </div>
                            <div class="mb-3">
                                <label for="forward-email-subject" class="form-label">Asunto:</label>
                                <input type="text" class="form-control" id="forward-email-subject" value="Fwd: ${subject}" required>
                            </div>
                            <div class="mb-3">
                                <label for="forward-email-content" class="form-label">Mensaje:</label>
                                <textarea class="form-control" id="forward-email-content" rows="10" style="height: 200px;" required>

---------- Mensaje reenviado ----------
De: ${originalSender}
Asunto: ${subject}

${originalContent}
</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="sendForwardedEmail(${emailId})">Enviar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Añadir el modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar el modal
    const forwardModal = new bootstrap.Modal(document.getElementById(modalId));
    forwardModal.show();
    
    // Enfocar el campo de destinatario
    setTimeout(() => {
        document.getElementById('forward-email-to').focus();
    }, 500);
}

/**
 * Enviar el email reenviado
 * @param {number} originalEmailId - ID del email original
 */
function sendForwardedEmail(originalEmailId) {
    // Obtener datos del formulario
    const to = document.getElementById('forward-email-to').value;
    const cc = document.getElementById('forward-email-cc').value;
    const subject = document.getElementById('forward-email-subject').value;
    const content = document.getElementById('forward-email-content').value;
    
    // Validar formulario
    const form = document.getElementById('forward-email-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Simular envío (mostrar spinner)
    const sendButton = document.querySelector('#forward-email-modal .btn-primary');
    const originalText = sendButton.innerHTML;
    sendButton.disabled = true;
    sendButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Enviando...';
    
    console.log(`📨 Enviando email reenviado:
    - Para: ${to}
    - CC: ${cc}
    - Asunto: ${subject}
    - Original ID: ${originalEmailId}`);
    
    // Simular procesamiento (esto se reemplazaría con una llamada API real)
    setTimeout(() => {
        // Ocultar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('forward-email-modal'));
        if (modal) modal.hide();
        
        // Mostrar notificación de éxito
        console.log('El email ha sido reenviado correctamente');
        
        // Restaurar botón
        sendButton.disabled = false;
        sendButton.innerHTML = originalText;
    }, 1500);
}
