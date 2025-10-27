/**
 * email-compose.js
 * 
 * Maneja la composición de emails desde cero con destinatarios múltiples
 */

(function() {
    'use strict';

    // Variables para gestión de destinatarios
    let recipients = {
        to: [],
        cc: [],
        bcc: []
    };

    let selectedAttachments = [];

    /**
     * Inicializar modal de composición
     */
    window.initComposeModal = function() {
        // Crear modal si no existe
        if (!document.getElementById('compose-email-modal')) {
            createComposeModal();
        }

        // Event listener para botón de redactar
        const composeBtn = document.getElementById('compose-email-btn');
        if (composeBtn) {
            composeBtn.addEventListener('click', openComposeModal);
        }
    };

    /**
     * Crear modal de composición
     */
    function createComposeModal() {
        const modalHTML = `
            <div class="modal fade" id="compose-email-modal" tabindex="-1" aria-labelledby="composeEmailModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="composeEmailModalLabel">
                                <i class="fas fa-pen me-2"></i>Redactar email
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Destinatarios Para -->
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Para:</label>
                                <div class="d-flex align-items-center">
                                    <div id="to-recipients" class="flex-grow-1 border rounded p-2 me-2" style="min-height: 38px;">
                                        <!-- Chips de destinatarios -->
                                    </div>
                                    <input type="email" class="form-control form-control-sm" id="to-input" placeholder="Agregar destinatario">
                                    <button class="btn btn-sm btn-outline-secondary ms-2" id="show-cc-btn" title="Mostrar CC/CCO">
                                        <i class="fas fa-plus"></i> CC
                                    </button>
                                </div>
                            </div>

                            <!-- Destinatarios CC (oculto por defecto) -->
                            <div class="mb-3 d-none" id="cc-container">
                                <label class="form-label small fw-bold">CC:</label>
                                <div class="d-flex align-items-center">
                                    <div id="cc-recipients" class="flex-grow-1 border rounded p-2 me-2" style="min-height: 38px;">
                                        <!-- Chips de CC -->
                                    </div>
                                    <input type="email" class="form-control form-control-sm" id="cc-input" placeholder="Agregar CC">
                                </div>
                            </div>

                            <!-- Destinatarios CCO (oculto por defecto) -->
                            <div class="mb-3 d-none" id="bcc-container">
                                <label class="form-label small fw-bold">CCO:</label>
                                <div class="d-flex align-items-center">
                                    <div id="bcc-recipients" class="flex-grow-1 border rounded p-2 me-2" style="min-height: 38px;">
                                        <!-- Chips de CCO -->
                                    </div>
                                    <input type="email" class="form-control form-control-sm" id="bcc-input" placeholder="Agregar CCO">
                                </div>
                            </div>

                            <!-- Asunto -->
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Asunto:</label>
                                <input type="text" class="form-control" id="compose-subject" placeholder="Asunto del email">
                            </div>

                            <!-- Botón generar con IA -->
                            <div class="mb-3">
                                <button class="btn btn-sm btn-outline-primary" id="compose-ai-btn">
                                    <i class="fas fa-robot me-1"></i>Generar contenido con IA
                                </button>
                            </div>

                            <!-- Cuerpo del mensaje -->
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Mensaje:</label>
                                <textarea class="form-control" id="compose-body" rows="10" placeholder="Escribe tu mensaje aquí..."></textarea>
                            </div>

                            <!-- Adjuntos seleccionados -->
                            <div id="compose-attachments" class="mb-3"></div>

                            <!-- Botones de acción -->
                            <div class="d-flex justify-content-between">
                                <div>
                                    <input type="file" id="compose-attachment-input" multiple style="display: none;" accept="*/*">
                                    <button class="btn btn-sm btn-outline-secondary" id="compose-attach-btn">
                                        <i class="fas fa-paperclip me-1"></i>Adjuntar archivo (máx 20MB)
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="send-compose-btn">
                                <i class="fas fa-paper-plane me-2"></i>Enviar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupComposeModalListeners();
    }

    /**
     * Configurar event listeners del modal
     */
    function setupComposeModalListeners() {
        // Mostrar CC/CCO
        const showCcBtn = document.getElementById('show-cc-btn');
        if (showCcBtn) {
            showCcBtn.addEventListener('click', function() {
                document.getElementById('cc-container').classList.remove('d-none');
                document.getElementById('bcc-container').classList.remove('d-none');
                this.style.display = 'none';
            });
        }

        // Inputs de destinatarios
        setupRecipientInput('to');
        setupRecipientInput('cc');
        setupRecipientInput('bcc');

        // Adjuntar archivos
        const attachBtn = document.getElementById('compose-attach-btn');
        const attachInput = document.getElementById('compose-attachment-input');
        
        if (attachBtn && attachInput) {
            attachBtn.addEventListener('click', () => attachInput.click());
            attachInput.addEventListener('change', handleComposeFileSelection);
        }

        // Generar con IA
        const aiBtn = document.getElementById('compose-ai-btn');
        if (aiBtn) {
            aiBtn.addEventListener('click', generateComposeWithAI);
        }

        // Enviar email
        const sendBtn = document.getElementById('send-compose-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendComposedEmail);
        }
    }

    /**
     * Configurar input de destinatarios
     */
    function setupRecipientInput(type) {
        const input = document.getElementById(`${type}-input`);
        if (!input) return;

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                e.preventDefault();
                const email = this.value.trim().replace(',', '');
                if (email && validateEmail(email)) {
                    addRecipient(type, email);
                    this.value = '';
                } else if (email) {
                    alert('Email inválido: ' + email);
                }
            }
        });

        input.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && validateEmail(email)) {
                addRecipient(type, email);
                this.value = '';
            }
        });
    }

    /**
     * Validar email
     */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Agregar destinatario
     */
    function addRecipient(type, email) {
        if (!recipients[type].includes(email)) {
            recipients[type].push(email);
            renderRecipients(type);
        }
    }

    /**
     * Remover destinatario
     */
    function removeRecipient(type, email) {
        recipients[type] = recipients[type].filter(e => e !== email);
        renderRecipients(type);
    }

    /**
     * Renderizar chips de destinatarios
     */
    function renderRecipients(type) {
        const container = document.getElementById(`${type}-recipients`);
        if (!container) return;

        container.innerHTML = recipients[type].map(email => `
            <span class="badge bg-primary me-1 mb-1" style="font-size: 0.85rem;">
                ${email}
                <i class="fas fa-times ms-1" style="cursor: pointer;" onclick="window.removeComposeRecipient('${type}', '${email}')"></i>
            </span>
        `).join('');
    }

    /**
     * Manejar selección de archivos
     */
    function handleComposeFileSelection(event) {
        const files = Array.from(event.target.files);
        const maxSize = 20 * 1024 * 1024; // 20MB

        files.forEach(file => {
            if (file.size > maxSize) {
                alert(`El archivo ${file.name} excede el tamaño máximo de 20MB`);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                selectedAttachments.push({
                    filename: file.name,
                    mimeType: file.type,
                    size: file.size,
                    data: e.target.result.split(',')[1]
                });
                
                renderComposeAttachments();
            };
            reader.readAsDataURL(file);
        });

        event.target.value = '';
    }

    /**
     * Renderizar adjuntos
     */
    function renderComposeAttachments() {
        const container = document.getElementById('compose-attachments');
        if (!container) return;

        if (selectedAttachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="alert alert-info py-2"><strong>Adjuntos:</strong><div class="mt-2">';
        
        selectedAttachments.forEach((att, index) => {
            html += `
                <div class="d-inline-flex align-items-center bg-white rounded px-2 py-1 me-2 mb-2">
                    <i class="fas fa-file me-2"></i>
                    <span class="small">${att.filename} (${window.formatFileSize(att.size)})</span>
                    <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.removeComposeAttachment(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Generar contenido con IA
     */
    async function generateComposeWithAI() {
        const subjectInput = document.getElementById('compose-subject');
        const bodyTextarea = document.getElementById('compose-body');
        const aiBtn = document.getElementById('compose-ai-btn');

        if (!subjectInput || !bodyTextarea || !aiBtn) return;

        const subject = subjectInput.value.trim();
        if (!subject) {
            alert('Por favor escribe un asunto primero');
            return;
        }

        aiBtn.disabled = true;
        aiBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Generando...';

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            const response = await fetch(`${API_BASE_URL}/api/ai/generate-email-content`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject: subject })
            });

            const data = await response.json();
            
            if (data.success && data.content) {
                bodyTextarea.value = data.content;
            } else {
                // Fallback
                bodyTextarea.value = `Estimado/a,\n\nEn relación a: ${subject}\n\n[Escribe aquí tu mensaje]\n\nSaludos cordiales`;
            }
        } catch (error) {
            console.error('Error generando contenido:', error);
            bodyTextarea.value = `Estimado/a,\n\nEn relación a: ${subject}\n\n[Escribe aquí tu mensaje]\n\nSaludos cordiales`;
        } finally {
            aiBtn.disabled = false;
            aiBtn.innerHTML = '<i class="fas fa-robot me-1"></i>Generar contenido con IA';
        }
    }

    /**
     * Enviar email compuesto
     */
    async function sendComposedEmail() {
        const subjectInput = document.getElementById('compose-subject');
        const bodyTextarea = document.getElementById('compose-body');
        const sendBtn = document.getElementById('send-compose-btn');

        if (!subjectInput || !bodyTextarea || !sendBtn) return;

        // Validaciones
        if (recipients.to.length === 0) {
            alert('Debes agregar al menos un destinatario');
            return;
        }

        const subject = subjectInput.value.trim();
        if (!subject) {
            alert('El asunto es requerido');
            return;
        }

        const body = bodyTextarea.value.trim();
        if (!body) {
            alert('El mensaje no puede estar vacío');
            return;
        }

        console.log('📧 Enviando email compuesto:', {
            subject: subject,
            bodyLength: body.length,
            bodyPreview: body.substring(0, 200)
        });

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            // Obtener firma
            const signature = await getUserSignature();
            const bodyWithSignature = `
                <div>${body.replace(/\n/g, '<br>')}</div>
                ${signature ? `<br><br><div>--<br>${signature}</div>` : ''}
            `;
            
            console.log('📦 Body con firma:', {
                length: bodyWithSignature.length,
                preview: bodyWithSignature.substring(0, 300)
            });

            // Construir lista de destinatarios
            const toList = recipients.to.join(', ');
            const ccList = recipients.cc.length > 0 ? recipients.cc.join(', ') : null;
            const bccList = recipients.bcc.length > 0 ? recipients.bcc.join(', ') : null;

            const emailData = {
                to: toList,
                cc: ccList,
                bcc: bccList,
                subject: subject,
                body: bodyWithSignature,
                attachments: selectedAttachments
            };

            const response = await fetch(`${API_BASE_URL}/api/email/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            const data = await response.json();
            
            if (data.success) {
                // Mostrar toast de éxito
                showSuccessToast('✅ Email enviado correctamente');
                
                // Cerrar modal
                closeComposeModal();
                
                // Recargar bandeja sin recargar página
                if (window.InboxView && window.InboxView.loadEmailDetails) {
                    // Si estamos en vista de inbox, recargar
                    const mailboxInbox = document.getElementById('mailbox-inbox');
                    if (mailboxInbox && mailboxInbox.checked) {
                        setTimeout(() => {
                            if (typeof loadInboxEmails === 'function') {
                                loadInboxEmails();
                            }
                        }, 500);
                    }
                }
            } else {
                showErrorToast('Error al enviar email: ' + (data.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enviando email:', error);
            alert('Error al enviar email');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Enviar';
        }
    }

    /**
     * Obtener firma del usuario
     */
    async function getUserSignature() {
        try {
            const companyName = localStorage.getItem('companyName') || '';
            const phone = localStorage.getItem('phone') || '';
            const website = localStorage.getItem('website') || '';
            
            if (companyName) {
                return `${companyName}${phone ? `<br>Tel: ${phone}` : ''}${website ? `<br>${website}` : ''}`;
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }

    /**
     * Abrir modal de composición
     */
    function openComposeModal() {
        // Resetear formulario
        recipients = { to: [], cc: [], bcc: [] };
        selectedAttachments = [];
        
        document.getElementById('compose-subject').value = '';
        document.getElementById('compose-body').value = '';
        document.getElementById('to-input').value = '';
        document.getElementById('cc-input').value = '';
        document.getElementById('bcc-input').value = '';
        
        renderRecipients('to');
        renderRecipients('cc');
        renderRecipients('bcc');
        renderComposeAttachments();
        
        // Ocultar CC/CCO
        document.getElementById('cc-container').classList.add('d-none');
        document.getElementById('bcc-container').classList.add('d-none');
        document.getElementById('show-cc-btn').style.display = '';

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('compose-email-modal'));
        modal.show();
    }

    /**
     * Cerrar modal
     */
    function closeComposeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('compose-email-modal'));
        if (modal) {
            modal.hide();
        }
    }

    // Exportar funciones globalmente
    window.removeComposeRecipient = removeRecipient;
    window.removeComposeAttachment = function(index) {
        selectedAttachments.splice(index, 1);
        renderComposeAttachments();
    };

})();
