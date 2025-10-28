nder/**
 * email-modal-improvements.js
 * 
 * Mejoras para los modales de email:
 * 1. Añadir campo CC a los modales de respuesta
 * 2. Mejorar la visualización del contenido en el reenvío de emails
 */

window.addEventListener('load', function() {
    console.log('🔧 Aplicando mejoras a los modales de email...');
    
    // Sobreescribir la función createReplyModal para añadir campo CC
    improveReplyModal();
    
    // Mejorar la función forwardEmail para mostrar correctamente el contenido
    improveForwardModal();
});

/**
 * Mejora la función createReplyModal para añadir campo CC
 */
function improveReplyModal() {
    // Guardar referencia a la función original
    const originalCreateReplyModal = window.createReplyModal || function() {};
    
    // Reemplazar con versión mejorada
    window.createReplyModal = function(emailId, sender, subject, withAI = false) {
        console.log(`📝 Creando modal de respuesta mejorado para email ${emailId}`);
        
        // Cerrar cualquier modal de detalles abierto
        const detailsModal = document.querySelector('.modal.show');
        if (detailsModal) {
            const bsModal = bootstrap.Modal.getInstance(detailsModal);
            if (bsModal) bsModal.hide();
        }
        
        // Generar ID único para el modal
        const modalId = withAI ? 'aiReplyModal' : 'manualReplyModal';
        
        // Eliminar modal anterior si existe
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Crear estructura del modal CON CAMPO CC
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content dashboard-card border-0">
                        <div class="modal-header border-0">
                            <h5 class="modal-title" id="${modalId}-label" style="font-size: 0.9rem;">
                                <i class="fas fa-${withAI ? 'robot' : 'reply'} me-2" style="font-size: 0.8rem;"></i>RE: ${subject}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="mb-3">
                                <label for="reply-to-${emailId}" class="form-label">Para:</label>
                                <input type="text" class="form-control" id="reply-to-${emailId}" value="${sender.split(' ')[0]}" readonly>
                            </div>
                            <div class="mb-3">
                                <label for="reply-cc-${emailId}" class="form-label">CC:</label>
                                <input type="text" class="form-control" id="reply-cc-${emailId}" placeholder="Añadir destinatarios en copia...">
                            </div>
                            <div class="mb-3">
                                <label for="reply-subject-${emailId}" class="form-label">Asunto:</label>
                                <input type="text" class="form-control" id="reply-subject-${emailId}" value="RE: ${subject}">
                            </div>
                            ${withAI ? `
                            <div class="mb-3 d-flex align-items-center" id="ai-loading-${emailId}">
                                <div class="spinner-border spinner-border-sm text-primary me-2" role="status" id="ai-spinner-${emailId}">
                                    <span class="visually-hidden">Generando respuesta...</span>
                                </div>
                                <span style="font-size: 0.8rem;" id="ai-status-text-${emailId}">La IA está generando una respuesta...</span>
                            </div>
                            ` : ''}
                            <div class="mb-3">
                                <label for="reply-content-${emailId}" class="form-label" style="font-size: 0.8rem;">Mensaje:</label>
                                <textarea class="form-control" id="reply-content-${emailId}" rows="6" style="font-size: 0.8rem;" ${withAI ? 'placeholder="La respuesta generada por IA aparecerá aquí..."' : 'placeholder="Escribe tu respuesta aquí..."'}></textarea>
                            </div>
                        </div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn-dashboard-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" data-bs-dismiss="modal">Cancelar</button>
                            ${withAI ? `<button type="button" class="btn-dashboard-info" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="regenerateAIReply(${emailId})">
                                <i class="fas fa-sync-alt me-2" style="font-size: 0.7rem;"></i>Regenerar
                            </button>` : ''}
                            <button type="button" class="btn-dashboard-primary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="sendReply(${emailId})">
                                <i class="fas fa-paper-plane me-2" style="font-size: 0.7rem;"></i>Enviar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar el modal
        const replyModal = new bootstrap.Modal(document.getElementById(modalId));
        replyModal.show();
        
        // Si es respuesta con IA, generar respuesta después de un breve retraso
        if (withAI) {
            setTimeout(() => {
                const aiResponse = generateAIResponse(emailId, subject);
                const contentElement = document.getElementById(`reply-content-${emailId}`);
                if (contentElement) {
                    contentElement.value = aiResponse;
                    
                    // Ajustar altura del textarea para evitar scroll excesivo
                    contentElement.style.height = 'auto';
                    contentElement.style.height = (contentElement.scrollHeight) + 'px';
                    
                    // Cambiar el texto a "Respuesta generada" y quitar el spinner
                    const spinnerElement = document.getElementById(`ai-spinner-${emailId}`);
                    const statusTextElement = document.getElementById(`ai-status-text-${emailId}`);
                    
                    if (spinnerElement) spinnerElement.style.display = 'none';
                    if (statusTextElement) statusTextElement.textContent = 'Respuesta generada';
                    
                    // Mantener visible el contenedor para mostrar el mensaje "Respuesta generada"
                    const loadingElement = document.getElementById(`ai-loading-${emailId}`);
                    if (loadingElement) loadingElement.classList.remove('d-flex');
                    if (loadingElement) loadingElement.classList.add('d-flex', 'align-items-center');
                }
            }, 1500);
        }
    };
    
    // NOTA: La función window.sendReply ahora está definida en email-reply-handler.js
    // y maneja el envío real de emails. Esta sobreescritura legacy se comenta para evitar conflictos.
    
    /*
    // Modificar sendReply para incluir CC en los logs (LEGACY - COMENTADO)
    const originalSendReply = window.sendReply || function() {};
    window.sendReply = function(emailId) {
        const to = document.getElementById(`reply-to-${emailId}`)?.value || '';
        const cc = document.getElementById(`reply-cc-${emailId}`)?.value || '';
        const subject = document.getElementById(`reply-subject-${emailId}`)?.value || '';
        const content = document.getElementById(`reply-content-${emailId}`)?.value || '';
        
        console.log(`📨 Enviando respuesta:
        - Para: ${to}
        - CC: ${cc}
        - Asunto: ${subject}`);
        
        // Marcar el email como leído (no negrita)
        const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
        if (emailRow) {
            emailRow.classList.remove('fw-bold');
        }
        
        // Cerrar modal
        const modalId = document.getElementById('aiReplyModal') ? 'aiReplyModal' : 'manualReplyModal';
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) modal.hide();
        
        // Actualizar contadores
        updateEmailsCount();
        
        // Mostrar notificación de éxito
        toastr.success('Tu respuesta ha sido enviada', 'Email enviado');
        
        // Actualizar uso del servicio
        if (window.UsageTracker) {
            window.UsageTracker.updateUI();
        }
    };
    */
}

/**
 * Mejora la función forwardEmail para mostrar correctamente el contenido del email
 */
function improveForwardModal() {
    // Reemplazar con versión mejorada
    window.forwardEmail = function(emailId, subject) {
        console.log(`📤 Reenviando email ID: ${emailId}, Asunto: ${subject}`);
        
        // Cerrar el modal de detalles
        const modalElement = document.getElementById(`email-details-modal-${emailId}`);
        let originalContent = '';
        let originalSender = '';
        let originalDate = '';
        
        // Extraer contenido del modal de detalles si existe
        if (modalElement) {
            originalContent = modalElement.querySelector('.email-content')?.innerHTML || '';
            originalSender = modalElement.querySelector('.email-sender')?.textContent || '';
            originalDate = modalElement.querySelector('.modal-title small')?.textContent || '';
            
            // Cerrar el modal de detalles
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        } else {
            // Si no existe el modal, intentar extraer de la fila directamente
            const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
            if (emailRow) {
                originalSender = emailRow.querySelector('td:nth-child(2)')?.textContent.trim() || '';
                originalContent = "[Contenido del email no disponible en vista previa]";
            }
        }
        
        // Crear el modal de reenvío
        const modalId = 'forward-email-modal';
        
        // Eliminar modal anterior si existe
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Preparar contenido formateado para reenvío
        let formattedOriginalContent = '';
        if (originalContent) {
            // Limpiar el contenido HTML
            const cleanContent = originalContent
                .replace(/<br\/?>/g, '\n')
                .replace(/<\/p>/g, '\n')
                .replace(/<[^>]*>/g, '')
                .trim();
            
            // Limpiar el remitente (quitar etiquetas como "Proveedor")
            const cleanSender = originalSender.split(' ')[0];
            
            // Formatear la fecha correctamente
            let formattedDate = originalDate;
            if (originalDate) {
                // Intentar formatear la fecha si es posible
                try {
                    // Extraer solo la fecha y hora
                    const dateParts = originalDate.match(/(\d{2}\/\d{2}\/\d{4})(?:.*?)(\d{2}:\d{2})/i);
                    if (dateParts && dateParts.length >= 3) {
                        formattedDate = `${dateParts[1]} - ${dateParts[2]}`;
                    }
                } catch (e) {
                    console.log('Error al formatear la fecha:', e);
                }
            }
            
            formattedOriginalContent = `



----------------------------------------
             MENSAJE ORIGINAL
----------------------------------------
De: ${cleanSender}
Fecha: ${formattedDate}
Asunto: ${subject}

${cleanContent}`;
        }
        
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
                                    <textarea class="form-control" id="forward-email-content" rows="10" style="min-height: 250px;" 
                                        placeholder="Escribe tu mensaje aquí..." required>${formattedOriginalContent}</textarea>
                                    <small class="form-text text-muted">Escribe tu mensaje en la parte superior, antes de la línea de separación.</small>
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
        
        // Colocar el cursor al inicio del textarea para que el usuario pueda escribir antes del mensaje original
        setTimeout(() => {
            const contentTextarea = document.getElementById('forward-email-content');
            if (contentTextarea) {
                contentTextarea.focus();
                contentTextarea.setSelectionRange(0, 0);
            }
        }, 500);
    };
    
    // Asegurarse de que la función para enviar emails reenviados funciona
    window.sendForwardedEmail = function(originalEmailId) {
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
            toastr.success('El email ha sido reenviado correctamente', 'Email reenviado');
            
            // Restaurar botón
            sendButton.disabled = false;
            sendButton.innerHTML = originalText;
            
            // Actualizar uso del servicio
            if (window.UsageTracker) {
                window.UsageTracker.updateUI();
            }
        }, 1500);
    };
}

/**
 * Regenerar respuesta de IA mejorada
 * @param {number} emailId - ID del email
 */
window.regenerateAIReply = function(emailId) {
    console.log(`🔄 Regenerando respuesta IA para email ID: ${emailId}`);
    
    // Obtener asunto del email
    const subjectInput = document.getElementById(`reply-subject-${emailId}`);
    const subject = subjectInput ? subjectInput.value : 'Consulta';
    
    // Mostrar spinner de carga y actualizar texto
    const spinnerElement = document.getElementById(`ai-spinner-${emailId}`);
    const statusTextElement = document.getElementById(`ai-status-text-${emailId}`);
    const loadingDiv = document.getElementById(`ai-loading-${emailId}`);
    
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
        loadingDiv.classList.add('d-flex', 'align-items-center');
    }
    
    if (spinnerElement) {
        spinnerElement.style.display = '';
    }
    
    if (statusTextElement) {
        statusTextElement.textContent = 'La IA está generando una nueva respuesta...';
    }
    
    // Generar nueva respuesta después de un breve retraso
    setTimeout(() => {
        // Generar respuesta diferente usando timestamp como semilla
        const currentDate = new Date();
        const seed = currentDate.getSeconds(); // Usar los segundos como semilla para variar la respuesta
        const aiResponse = generateAIResponse(emailId + seed, subject);
        
        // Actualizar el contenido del textarea
        const contentElement = document.getElementById(`reply-content-${emailId}`);
        if (contentElement) {
            contentElement.value = aiResponse;
            contentElement.style.height = 'auto';
            contentElement.style.height = (contentElement.scrollHeight) + 'px';
        }
        
        // Actualizar mensaje a "Respuesta generada"
        if (spinnerElement) spinnerElement.style.display = 'none';
        if (statusTextElement) statusTextElement.textContent = 'Respuesta generada';
    }, 1500);
};
