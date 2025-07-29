/**
 * email-thread-support.js
 * 
 * Implementa soporte para hilos de conversación en emails
 * permitiendo ver el historial completo de respuestas
 */

window.addEventListener('load', function() {
    console.log('🧵 Inicializando soporte para hilos de conversación en emails...');
    
    // Esperar a que todo esté cargado
    setTimeout(implementThreadSupport, 1000);
});

/**
 * Implementa el soporte para hilos de conversación
 */
function implementThreadSupport() {
    // Sobreescribir la función viewEmailDetails para incluir hilos de conversación
    const originalViewEmailDetails = window.viewEmailDetails || function() {};
    
    // Reemplazar con versión mejorada
    window.viewEmailDetails = function(emailId) {
        console.log(`👁️ Ver detalles completos de email ID: ${emailId} (con soporte de hilos)`);
        
        // Crear modal con detalles
        const modalId = `email-details-modal-${emailId}`;
        
        // Eliminar modal anterior si existe
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Buscar información del email
        const emailRow = document.querySelector(`.email-row[data-id="${emailId}"]`);
        if (!emailRow) {
            console.error(`No se encontró el email con ID ${emailId}`);
            console.error('No se pudo encontrar el email');
            return;
        }
        
        // Obtener datos del email desde la fila
        const sender = emailRow.querySelector('td:nth-child(2) div:first-child')?.textContent.trim() || '';
        const senderInfo = emailRow.querySelector('td:nth-child(2) div:last-child')?.textContent.trim() || '';
        const subject = emailRow.querySelector('td:nth-child(3) .fw-medium')?.textContent.trim() || '';
        const preview = emailRow.querySelector('td:nth-child(4)')?.textContent.trim() || '';
        const date = emailRow.querySelector('td:nth-child(5)')?.textContent.trim() || '';
        
        // Marcar el email como leído (quitar negrita)
        emailRow.classList.remove('fw-bold');
        if (emailRow.dataset.type) {
            emailRow.dataset.type = emailRow.dataset.type.replace('unread', '').trim();
        }
        
        // Generar contenido del email actual
        let emailContent = '';
        
        // En un entorno real, esto se obtendría desde el backend
        if (preview.length > 0) {
            emailContent = preview;
            
            // Si es muy corto, añadir contenido simulado
            if (emailContent.length < 100) {
                emailContent += `<br><br>
                Le agradezco su atención y quedo a la espera de su respuesta.<br><br>
                Saludos cordiales,<br>
                ${sender.split('@')[0].split('.').map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' ')}`;
            }
        } else {
            emailContent = "Este email no tiene contenido disponible.";
        }
        
        // Generar hilos de conversación
        const threadHTML = generateThreadHTML(emailId, subject);
        
        // Crear estructura del modal con tipografías más pequeñas y mejor espaciado
        const modalHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="emailDetailsLabel${emailId}" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header py-2">
                            <h5 class="modal-title" id="emailDetailsLabel${emailId}" style="font-size: 0.85rem;">
                                Detalles del mensaje
                                <small class="text-muted ms-2" style="font-size: 0.75rem;">${date}</small>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body py-2 pt-4">
                            <div class="mb-2 mt-3" style="font-size: 0.8rem;">
                                <strong style="display: inline-block; width: 65px;">De:</strong>
                                <span class="email-sender" style="margin-left: -15px;">${sender}</span>
                            </div>
                            <div class="mb-3" style="font-size: 0.8rem;">
                                <strong style="display: inline-block; width: 65px;">Asunto:</strong>
                                <span>${subject}</span>
                            </div>
                            
                            <!-- Contenido del mensaje actual -->
                            <div class="email-content mt-2 p-3 border rounded bg-light" style="font-size: 0.8rem; line-height: 1.4;">
                                ${emailContent}
                            </div>
                            
                            <!-- Hilo de conversación -->
                            <div class="email-thread mt-3" style="font-size: 0.75rem;">
                                ${threadHTML}
                            </div>
                        </div>
                        <div class="modal-footer py-2">
                            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary btn-sm" style="font-size: 0.75rem;" onclick="replyToEmail(${emailId});">Responder</button>
                            <button type="button" class="btn btn-info btn-sm" style="font-size: 0.75rem;" onclick="replyWithAI(${emailId}, '${subject}');">IA</button>
                            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;" onclick="forwardEmail(${emailId}, '${subject}');">Reenviar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Añadir modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar el modal
        const emailModal = new bootstrap.Modal(document.getElementById(modalId));
        emailModal.show();
        
        // Actualizar contadores y estado visual
        updateEmailsCount();
        
        // Registrar acción en el sistema de seguimiento
        if (window.UsageTracker) {
            window.UsageTracker.trackEmail();
            window.UsageTracker.updateUI();
        }
    };
}

/**
 * Genera el HTML para los hilos de conversación de un email
 * 
 * @param {number} emailId - ID del email actual
 * @param {string} subject - Asunto del email actual
 * @returns {string} HTML del hilo de conversación
 */
function generateThreadHTML(emailId, subject) {
    // En un entorno real, esto se obtendría desde el backend
    // Aquí generamos un hilo simulado basado en si es una respuesta (RE:) o reenvío (Fwd:)
    
    // Determinar si es parte de un hilo basado en el asunto
    const isReply = subject.toLowerCase().startsWith('re:');
    const isForward = subject.toLowerCase().startsWith('fwd:') || subject.toLowerCase().includes('reenviado');
    
    // Si no es parte de un hilo, no mostrar nada
    if (!isReply && !isForward) {
        return `<div class="text-muted small mt-2 text-center">Este email no forma parte de ninguna conversación anterior.</div>`;
    }
    
    // Generar un hilo simulado
    let threadHTML = `<h6 class="border-bottom pb-2 mb-3">Conversación anterior</h6>`;
    
    // Número de mensajes previos (aleatorio entre 1 y 3)
    const numPreviousMessages = Math.floor(Math.random() * 2) + 1;
    
    // Generar mensajes previos
    for (let i = 0; i < numPreviousMessages; i++) {
        const isOlder = i > 0;
        const senderIndex = (emailId + i) % 3; // Alternar entre diferentes remitentes
        
        let sender = '';
        let role = '';
        
        switch(senderIndex) {
            case 0:
                sender = 'soporte@plataforma.com';
                role = 'Soporte';
                break;
            case 1:
                sender = 'maria.lopez@empresa.com';
                role = 'Cliente';
                break;
            case 2:
                sender = 'carlos.martinez@proveedor.es';
                role = 'Proveedor';
                break;
        }
        
        // Fecha anterior (restando días)
        const prevDate = new Date();
        prevDate.setDate(prevDate.getDate() - (i + 1));
        const dateStr = prevDate.toLocaleDateString() + ' ' + prevDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Contenido simulado del mensaje
        let content = '';
        if (subject.includes('ampliación')) {
            content = `Gracias por su mensaje sobre la ampliación de servicio.<br><br>
            Podemos gestionar la ampliación para incluir 5 usuarios adicionales a un costo de 29,99€ mensuales por usuario.<br><br>
            Para proceder, solo necesitamos su confirmación y actualizaremos la cuenta inmediatamente.<br><br>
            Atentamente,<br>
            Equipo de Soporte`;
        } else if (subject.includes('factura')) {
            content = `Le informo que su factura del mes pasado ha sido procesada correctamente.<br><br>
            Puede descargarla desde el panel de administración en la sección de facturación.<br><br>
            Si tiene alguna consulta, no dude en contactarnos.<br><br>
            Saludos cordiales,<br>
            Departamento de Facturación`;
        } else {
            content = `En respuesta a su consulta anterior, le confirmo que hemos recibido la información.<br><br>
            Estamos procesando su solicitud y le daremos respuesta a la mayor brevedad posible.<br><br>
            Agradecemos su paciencia.<br><br>
            Saludos,<br>
            Atención al Cliente`;
        }
        
        // Crear el panel colapsable para cada mensaje del hilo
        threadHTML += `
            <div class="card mb-3 email-thread-message ${isOlder ? 'thread-message-older' : ''}">
                <div class="card-header bg-light py-1 px-3" role="button" data-bs-toggle="collapse" data-bs-target="#threadMessage${emailId}-${i}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${sender}</strong> 
                            <span class="badge rounded-pill ${isOlder ? 'bg-secondary' : 'bg-primary'} ms-2">${role}</span>
                        </div>
                        <small class="text-muted">${dateStr}</small>
                    </div>
                </div>
                <div class="collapse ${isOlder ? '' : 'show'}" id="threadMessage${emailId}-${i}">
                    <div class="card-body py-2 px-3 small">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }
    
    return threadHTML;
}
