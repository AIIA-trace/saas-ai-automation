/**
 * email-signature-integration.js
 * 
 * Este script agrega la firma configurada en el bot a todos los correos enviados
 * desde los formularios de respuesta, respuesta con IA y reenvío.
 */

window.addEventListener('load', function() {
    console.log('🖋️ Inicializando integración de firma de email...');
    
    // Implementar la gestión de firma de emails
    setTimeout(() => {
        setupSignatureIntegration();
    }, 1000);
});

/**
 * Configura la integración de firma de emails
 */
function setupSignatureIntegration() {
    // Crear un objeto global para gestionar la firma
    window.EmailSignature = {
        // Obtener la firma actual desde la configuración
        getSignature: function() {
            // En un entorno real, esto obtendría la firma de la configuración
            // Por ahora, usamos el localStorage o un valor predeterminado
            return localStorage.getItem('emailSignature') || this.getDefaultSignature();
        },
        
        // Obtener una firma predeterminada
        getDefaultSignature: function() {
            const userName = localStorage.getItem('userName') || 'Equipo de Soporte';
            const companyName = localStorage.getItem('companyName') || 'IA Receptionist';
            
            return `
--
${userName}
${companyName}
Soporte técnico | support@iareceptionist.com
Tel: +34 91 123 45 67
`;
        },
        
        // Establecer una nueva firma
        setSignature: function(signature) {
            if (signature) {
                localStorage.setItem('emailSignature', signature);
                console.log('✅ Firma de email actualizada');
                return true;
            }
            return false;
        },
        
        // Agregar firma a un contenido
        addSignatureToContent: function(content) {
            // Validar que content existe y es string
            if (!content || typeof content !== 'string') {
                return content;
            }
            
            // Si ya hay una firma, no agregar otra
            if (content.includes('--\n') || content.includes('--<br>')) {
                return content;
            }
            
            // Agregar firma con formato adecuado
            const signature = this.getSignature();
            
            // Determinar el separador según el formato del contenido
            const isHTML = content.includes('<br>') || content.includes('<p>');
            const separator = isHTML ? '<br><br>' : '\n\n';
            const formattedSignature = isHTML ? signature.replace(/\n/g, '<br>') : signature;
            
            return content + separator + formattedSignature;
        }
    };
    
    // Extender las funciones de envío de emails para incluir firma
    extendEmailSendingFunctions();
    
    // Agregar la firma a la configuración del bot
    addSignatureToConfigForm();
}

/**
 * Extiende las funciones de envío de emails para incluir la firma
 */
function extendEmailSendingFunctions() {
    // Extender la función de envío de respuesta
    const originalSendReply = window.sendReply || function() {};
    window.sendReply = function(emailId) {
        const contentElement = document.getElementById(`reply-content-${emailId}`);
        if (contentElement && window.EmailSignature) {
            contentElement.value = window.EmailSignature.addSignatureToContent(contentElement.value);
        }
        
        // Llamar a la función original
        return originalSendReply.apply(this, arguments);
    };
    
    // Extender la función de envío de email reenviado
    const originalSendForwarded = window.sendForwardedEmail || function() {};
    window.sendForwardedEmail = function(originalEmailId) {
        const contentElement = document.getElementById('forward-email-content');
        if (contentElement && window.EmailSignature) {
            // Solo agregar firma si el cursor está al inicio (el usuario no ha escrito nada)
            if (contentElement.selectionStart === 0 && contentElement.selectionEnd === 0) {
                // Insertar la firma al inicio
                const signature = window.EmailSignature.getSignature();
                contentElement.value = signature + '\n\n' + contentElement.value;
            } else {
                // En caso contrario, agregar la firma después del texto del usuario pero antes del mensaje reenviado
                const cursorPos = contentElement.selectionStart;
                const messageStartPos = contentElement.value.indexOf('-----');
                
                if (messageStartPos > 0 && cursorPos < messageStartPos) {
                    const userText = contentElement.value.substring(0, messageStartPos);
                    const originalMessage = contentElement.value.substring(messageStartPos);
                    
                    const signature = window.EmailSignature.getSignature();
                    contentElement.value = userText + '\n\n' + signature + '\n\n' + originalMessage;
                }
            }
        }
        
        // Llamar a la función original
        return originalSendForwarded.apply(this, arguments);
    };
    
    // Extender la función de generación de respuesta AI
    // NOTA: generateAIResponse ahora es asíncrona, no necesitamos extenderla aquí
    // La firma se agrega en el backend o en el momento del envío
}

/**
 * Agrega el campo de firma al formulario de configuración del bot
 */
function addSignatureToConfigForm() {
    // Observer para detectar cuando se abre el formulario de configuración
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1 && node.id === 'botSettingsModal') {
                        enhanceBotSettingsForm(node);
                        break;
                    }
                }
            }
        });
    });
    
    // Observar cambios en el body para detectar cuando se agrega el modal
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Mejora el formulario de configuración del bot añadiendo el campo de firma
 */
function enhanceBotSettingsForm(modalNode) {
    console.log('🔧 Mejorando formulario de configuración del bot...');
    
    // Verificar si el campo ya existe
    if (modalNode.querySelector('#bot-email-signature')) {
        return;
    }
    
    // Encontrar el último campo antes de los botones
    const lastField = modalNode.querySelector('.modal-body .form-group:last-child');
    if (!lastField) return;
    
    // Crear el campo de firma
    const signatureField = document.createElement('div');
    signatureField.className = 'form-group mt-3';
    signatureField.innerHTML = `
        <label for="bot-email-signature" class="form-label">Firma de correo electrónico</label>
        <textarea class="form-control" id="bot-email-signature" rows="4" 
            placeholder="Introduce la firma que se añadirá automáticamente a todos los emails enviados">${window.EmailSignature.getSignature()}</textarea>
        <small class="form-text text-muted">Esta firma se añadirá automáticamente a todos los emails enviados desde el dashboard.</small>
    `;
    
    // Insertar el campo antes de los botones
    lastField.parentNode.insertBefore(signatureField, lastField.nextSibling);
    
    // Extender la función de guardado
    extendSaveSettings(modalNode);
}

/**
 * Extiende la función de guardado de configuración para incluir la firma
 */
function extendSaveSettings(modalNode) {
    // Buscar el botón de guardar
    const saveButton = modalNode.querySelector('button.btn-primary');
    if (!saveButton) return;
    
    // Sobrescribir el evento click
    const originalClickHandler = saveButton.onclick;
    saveButton.onclick = function(e) {
        // Guardar la firma
        const signatureField = document.getElementById('bot-email-signature');
        if (signatureField && window.EmailSignature) {
            window.EmailSignature.setSignature(signatureField.value);
        }
        
        // Llamar al handler original si existe
        if (typeof originalClickHandler === 'function') {
            return originalClickHandler.call(this, e);
        }
    };
}
