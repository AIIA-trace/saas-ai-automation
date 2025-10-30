/**
 * email-reply-handler.js
 * 
 * Maneja el envío de respuestas, adjuntos y generación IA
 */

console.log('🚀 email-reply-handler.js CARGANDO...');

(function() {
    'use strict';
    
    console.log('🎬 email-reply-handler.js IIFE EJECUTÁNDOSE...');

    // Variable global para almacenar adjuntos por mensaje
    window.messageAttachments = window.messageAttachments || {};
    
    // Variable para almacenar adjuntos del formulario principal (legacy)
    let selectedAttachments = [];

    /**
     * Configurar event listeners del formulario de respuesta
     */
    window.setupReplyFormListeners = function(email, threadId) {
        console.log('🔧 setupReplyFormListeners llamado con:', {
            emailId: email?.id,
            threadId: threadId
        });
        
        // Botón mostrar CC/BCC
        const showCcBtn = document.getElementById('show-reply-cc-btn');
        if (showCcBtn) {
            showCcBtn.addEventListener('click', function() {
                document.getElementById('reply-cc-container').classList.remove('d-none');
                document.getElementById('reply-bcc-container').classList.remove('d-none');
                this.style.display = 'none';
            });
        }

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
            console.log('✅ Configurando botón IA del formulario principal con emailId:', email?.id);
            generateBtn.addEventListener('click', () => window.generateAIResponse(email, threadId));
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
     * Generar respuesta con IA (con contexto del hilo completo)
     */
    console.log('📦 Definiendo window.generateAIResponse...');
    window.generateAIResponse = async function(email, threadId = null, textareaId = 'reply-textarea', btnId = 'generate-ai-response-btn') {
        // PRIMER LOG - DEBE APARECER SIEMPRE
        console.log('🚨🚨🚨 INICIO ABSOLUTO DE LA FUNCIÓN 🚨🚨🚨');
        
        try {
            console.log('🎬🎬🎬 ===== FUNCIÓN generateAIResponse EJECUTÁNDOSE ===== 🎬🎬🎬');
            console.log('🎬 TIMESTAMP:', new Date().toISOString());
            console.log('📧 Email recibido:', email);
            console.log('🧵 ThreadId recibido:', threadId);
            console.log('🆔 TextareaId:', textareaId);
            console.log('🆔 BtnId:', btnId);
            
            const generateBtn = document.getElementById(btnId);
            const textarea = document.getElementById(textareaId);
            
            console.log('🔍 Elementos buscados:', {
                generateBtn: !!generateBtn,
                textarea: !!textarea,
                generateBtnId: generateBtn?.id,
                textareaId: textarea?.id
            });
            
            if (!generateBtn || !textarea) {
                console.error('❌ No se encontraron elementos necesarios, abortando');
                console.error('❌ generateBtn existe:', !!generateBtn);
                console.error('❌ textarea existe:', !!textarea);
                return 'ABORTED_NO_ELEMENTS';
            }

        console.log('✅ Elementos encontrados, continuando...');

        // Deshabilitar botón y mostrar loading
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando con IA...';
        console.log('⏳ Botón deshabilitado y mostrando loading');

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            console.log('🤖 Preparando llamada al backend...');
            console.log('📍 URL:', `${API_BASE_URL}/api/email/generate-reply`);
            console.log('🔑 Token existe:', !!token);
            console.log('📦 Payload:', {
                emailId: email.id,
                threadId: threadId || email.threadId
            });

            // Usar el nuevo endpoint con contexto del hilo
            console.log('🚀 Haciendo fetch...');
            const response = await fetch(`${API_BASE_URL}/api/email/generate-reply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    emailId: email.id,
                    threadId: threadId || email.threadId
                })
            });

            console.log('📥 Respuesta recibida, status:', response.status);
            const data = await response.json();
            console.log('📊 Data parseada:', data);
            
            if (data.success && data.reply) {
                console.log('✅ Respuesta exitosa, escribiendo en editor...');
                
                // Escribir en editor rico o textarea
                if (window.setRichTextContent) {
                    // Convertir saltos de línea a HTML
                    const htmlReply = data.reply.replace(/\n/g, '<br>');
                    window.setRichTextContent(textareaId, htmlReply);
                } else {
                    textarea.value = data.reply;
                }
                
                console.log(`✅ Respuesta generada con contexto de ${data.threadMessagesCount || 0} mensajes`);
                
                // Mostrar toast informativo
                if (window.showSuccessToast) {
                    window.showSuccessToast(`✅ Respuesta generada con contexto de ${data.threadMessagesCount || 0} mensajes`);
                }
            } else {
                console.error('❌ Respuesta no exitosa:', data);
                throw new Error(data.error || 'Error generando respuesta');
            }
            } catch (error) {
                console.error('❌ Error generando respuesta:', error);
                console.error('❌ Error stack:', error.stack);
                
                // Mostrar error al usuario
                if (window.showErrorToast) {
                    window.showErrorToast('Error generando respuesta con IA');
                }
                
                // Fallback: generar respuesta simple
                console.log('📝 Usando respuesta fallback');
                const fallbackText = `Estimado/a,\n\nGracias por su mensaje. Hemos recibido su correo y le responderemos a la brevedad.\n\nSaludos cordiales`;
                
                if (window.setRichTextContent) {
                    window.setRichTextContent(textareaId, fallbackText.replace(/\n/g, '<br>'));
                } else {
                    textarea.value = fallbackText;
                }
            } finally {
                console.log('🔄 Restaurando botón...');
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-robot me-2"></i>Generar respuesta con IA';
                console.log('✅ generateAIResponse COMPLETADO');
            }
        } catch (outerError) {
            console.error('🚨🚨🚨 ERROR CRÍTICO EN FUNCIÓN:', outerError);
            console.error('🚨 Stack:', outerError.stack);
            return 'CRITICAL_ERROR';
        }
    };
    
    console.log('✅✅✅ window.generateAIResponse DEFINIDA ✅✅✅');
    console.log('🔍 Tipo de window.generateAIResponse:', typeof window.generateAIResponse);
    console.log('🔍 Es async?:', window.generateAIResponse.constructor.name === 'AsyncFunction');

    /**
     * Enviar respuesta
     */
    async function sendReply(email, threadId, attachmentsOverride = null) {
        console.log('📧 sendReply llamado con:', { email, threadId, attachmentsOverride });
        
        const textarea = document.getElementById('reply-textarea');
        const sendBtn = document.getElementById('send-reply-btn');
        
        if (!textarea || !sendBtn) {
            console.error('❌ No se encontraron elementos:', { textarea: !!textarea, sendBtn: !!sendBtn });
            return;
        }

        // Obtener contenido del editor rico o del textarea
        let replyText;
        if (window.getRichTextContent) {
            replyText = window.getRichTextContent('reply-textarea').trim();
            console.log('📝 Contenido obtenido del editor:', replyText.substring(0, 100));
        } else {
            replyText = textarea.value ? textarea.value.trim() : '';
            console.log('📝 Contenido obtenido del textarea:', replyText.substring(0, 100));
        }

        // Validar que hay contenido real (no solo HTML vacío)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = replyText;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        console.log('📝 Texto extraído (sin HTML):', textContent.substring(0, 100));
        console.log('📝 Longitud del texto:', textContent.trim().length);
        
        if (!replyText || replyText === '<p><br></p>' || textContent.trim() === '') {
            console.warn('⚠️ Validación falló - contenido vacío');
            alert('Por favor escribe una respuesta');
            return;
        }
        
        console.log('✅ Validación de contenido pasada');

        // Usar adjuntos pasados como parámetro o los locales
        const attachmentsToCheck = attachmentsOverride !== null ? attachmentsOverride : selectedAttachments;

        // Validar peso total de adjuntos (20MB máximo)
        const maxTotalSize = 20 * 1024 * 1024; // 20MB
        const totalSize = attachmentsToCheck.reduce((sum, att) => sum + att.size, 0);
        
        if (totalSize > maxTotalSize) {
            const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
            alert(`El tamaño total de los adjuntos (${totalMB} MB) excede el límite de 20 MB.\n\nPor favor, elimina algunos archivos antes de enviar.`);
            return;
        }

        console.log('📝 Texto de respuesta:', replyText.substring(0, 100));
        console.log('📎 Adjuntos:', attachmentsToCheck.length, 'Total:', (totalSize / (1024 * 1024)).toFixed(2), 'MB');

        // Deshabilitar botón
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            // Obtener firma del usuario (si existe)
            const signature = await getUserSignature();

            // Construir body con firma (el contenido ya viene en HTML del editor rico)
            const bodyWithSignature = `
                <div>${replyText}</div>
                ${signature ? `<br><br><div>--<br>${signature}</div>` : ''}
            `;

            // Obtener CC y BCC si existen
            const ccInput = document.getElementById('reply-cc');
            const bccInput = document.getElementById('reply-bcc');
            const cc = ccInput ? ccInput.value.trim() : null;
            const bcc = bccInput ? bccInput.value.trim() : null;

            const payload = {
                to: email.from,
                cc: cc,
                bcc: bcc,
                subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
                body: bodyWithSignature,
                threadId: threadId,
                inReplyTo: email.messageId,
                references: email.references || email.messageId,
                attachments: attachmentsToCheck
            };

            console.log('📦 Payload construido:', payload);
            console.log('📧 email.from:', email.from);
            console.log('📧 email.subject:', email.subject);

            const response = await fetch(`${API_BASE_URL}/api/email/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                // Mostrar toast de éxito
                showSuccessToast('✅ Respuesta enviada correctamente');
                
                // Limpiar formulario
                if (window.clearRichTextEditor) {
                    window.clearRichTextEditor('reply-textarea');
                } else {
                    textarea.value = '';
                }
                selectedAttachments = [];
                updateAttachmentsDisplay();
                
                // Recargar detalles del email para mostrar la respuesta
                if (window.InboxView && window.InboxView.loadEmailDetails) {
                    setTimeout(() => window.InboxView.loadEmailDetails(email.id), 1000);
                }
            } else {
                showErrorToast('Error al enviar respuesta: ' + (data.error || 'Error desconocido'));
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
    window.sendReply = sendReply;

    /**
     * Mostrar toast de éxito (se cierra automáticamente)
     */
    window.showSuccessToast = function(message) {
        const toast = createToast(message, 'success');
        document.body.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Ocultar después de 1 segundo
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 1000);
    };

    /**
     * Mostrar toast de error
     */
    window.showErrorToast = function(message) {
        const toast = createToast(message, 'error');
        document.body.appendChild(toast);
        
        // Mostrar con animación
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    /**
     * Crear elemento toast
     */
    function createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `custom-toast custom-toast-${type}`;
        toast.innerHTML = `
            <div class="custom-toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        return toast;
    }

    // Agregar estilos CSS para los toasts
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
        .custom-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            max-width: 400px;
        }

        .custom-toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .custom-toast-success {
            background-color: #28a745;
            color: white;
        }

        .custom-toast-error {
            background-color: #dc3545;
            color: white;
        }

        .custom-toast-content {
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 500;
        }

        .custom-toast-content i {
            font-size: 18px;
        }
    `;
    document.head.appendChild(toastStyle);

})();
