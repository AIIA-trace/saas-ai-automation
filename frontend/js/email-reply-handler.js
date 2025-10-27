/**
 * email-reply-handler.js
 * 
 * Maneja el envío de respuestas, adjuntos y generación IA
 */

(function() {
    'use strict';

    // Variable para almacenar adjuntos seleccionados
    let selectedAttachments = [];

    /**
     * Configurar event listeners del formulario de respuesta
     */
    window.setupReplyFormListeners = function(email, threadId) {
        // Botón adjuntar archivo
        const attachBtn = document.getElementById('attach-file-btn');
        const attachInput = document.getElementById('attachment-input');
        
        if (attachBtn && attachInput) {
            attachBtn.addEventListener('click', () => {
                attachInput.click();
            });

            attachInput.addEventListener('change', handleFileSelection);
        }

        // Botón generar respuesta con IA
        const generateBtn = document.getElementById('generate-ai-response-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => generateAIResponse(email));
        }

        // Botón enviar respuesta
        const sendBtn = document.getElementById('send-reply-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => sendReply(email, threadId));
        }
    };

    /**
     * Manejar selección de archivos
     */
    function handleFileSelection(event) {
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
                    data: e.target.result.split(',')[1] // Base64 sin prefijo
                });
                
                updateAttachmentsDisplay();
            };
            reader.readAsDataURL(file);
        });

        // Limpiar input
        event.target.value = '';
    }

    /**
     * Actualizar visualización de adjuntos seleccionados
     */
    function updateAttachmentsDisplay() {
        const container = document.getElementById('selected-attachments');
        if (!container) return;

        if (selectedAttachments.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="alert alert-info py-2"><strong>Adjuntos seleccionados:</strong><div class="mt-2">';
        
        selectedAttachments.forEach((att, index) => {
            html += `
                <div class="d-inline-flex align-items-center bg-white rounded px-2 py-1 me-2 mb-2">
                    <i class="fas fa-file me-2"></i>
                    <span class="small">${att.filename} (${formatFileSize(att.size)})</span>
                    <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.removeAttachment(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Remover adjunto
     */
    window.removeAttachment = function(index) {
        selectedAttachments.splice(index, 1);
        updateAttachmentsDisplay();
    };

    /**
     * Generar respuesta con IA
     */
    async function generateAIResponse(email) {
        const generateBtn = document.getElementById('generate-ai-response-btn');
        const textarea = document.getElementById('reply-textarea');
        
        if (!generateBtn || !textarea) return;

        // Deshabilitar botón y mostrar loading
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando...';

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            const response = await fetch(`${API_BASE_URL}/api/ai/generate-email-reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailContent: email.body || email.snippet,
                    emailSubject: email.subject,
                    emailFrom: email.from
                })
            });

            const data = await response.json();
            
            if (data.success && data.reply) {
                textarea.value = data.reply;
            } else {
                // Fallback: generar respuesta simple
                textarea.value = `Estimado/a,\n\nGracias por su mensaje. Hemos recibido su correo y le responderemos a la brevedad.\n\nSaludos cordiales`;
            }
        } catch (error) {
            console.error('Error generando respuesta:', error);
            // Fallback: generar respuesta simple
            textarea.value = `Estimado/a,\n\nGracias por su mensaje. Hemos recibido su correo y le responderemos a la brevedad.\n\nSaludos cordiales`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-robot me-2"></i>Generar respuesta con IA';
        }
    }

    /**
     * Enviar respuesta
     */
    async function sendReply(email, threadId) {
        const textarea = document.getElementById('reply-textarea');
        const sendBtn = document.getElementById('send-reply-btn');
        
        if (!textarea || !sendBtn) return;

        const replyText = textarea.value.trim();
        if (!replyText) {
            alert('Por favor escribe una respuesta');
            return;
        }

        // Deshabilitar botón
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            // Obtener firma del usuario (si existe)
            const signature = await getUserSignature();

            // Construir body con firma
            const bodyWithSignature = `
                <div>${replyText.replace(/\n/g, '<br>')}</div>
                ${signature ? `<br><br><div>--<br>${signature}</div>` : ''}
            `;

            const response = await fetch(`${API_BASE_URL}/api/email/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: email.from,
                    subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
                    body: bodyWithSignature,
                    threadId: threadId,
                    inReplyTo: email.messageId,
                    references: email.references || email.messageId,
                    attachments: selectedAttachments
                })
            });

            const data = await response.json();
            
            if (data.success) {
                alert('✅ Respuesta enviada correctamente');
                textarea.value = '';
                selectedAttachments = [];
                updateAttachmentsDisplay();
                
                // Recargar detalles del email para mostrar la respuesta
                if (window.InboxView && window.InboxView.loadEmailDetails) {
                    setTimeout(() => window.InboxView.loadEmailDetails(email.id), 1000);
                }
            } else {
                alert('Error al enviar respuesta: ' + (data.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enviando respuesta:', error);
            alert('Error al enviar respuesta');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Enviar respuesta';
        }
    }

    /**
     * Obtener firma del usuario desde configuración
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
            console.error('Error obteniendo firma:', error);
            return '';
        }
    }

    /**
     * Formatear tamaño de archivo
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Exportar funciones
    window.formatFileSize = formatFileSize;

})();
