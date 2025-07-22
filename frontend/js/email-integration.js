/**
 * Funciones para la integración con proveedores de correo electrónico
 * Este archivo contiene las funciones necesarias para la integración con Gmail, Outlook y otros proveedores
 */

/**
 * Inicializar la integración de email
 */
function initEmailIntegration() {
    // Configurar el selector de proveedor de correo
    const emailProviderSelect = document.getElementById('email_provider');
    const connectEmailBtn = document.getElementById('connect-email-btn');
    const emailOAuthSection = document.getElementById('email-oauth-section');
    const emailManualSection = document.getElementById('email-manual-section');
    const emailConsentCheckbox = document.getElementById('email_consent');
    
    if (emailProviderSelect) {
        // Manejar cambios en el selector de proveedor
        emailProviderSelect.addEventListener('change', function() {
            const selectedProvider = this.value;
            
            // Habilitar/deshabilitar botón de conexión según el proveedor seleccionado
            if (selectedProvider) {
                connectEmailBtn.disabled = false;
                
                // Mostrar sección correspondiente según el proveedor
                if (selectedProvider === 'other') {
                    // Para IMAP/SMTP manual, mostrar campos adicionales
                    emailOAuthSection.classList.add('d-none');
                    emailManualSection.classList.remove('d-none');
                } else {
                    // Para proveedores OAuth (Google, Microsoft, Yahoo)
                    emailOAuthSection.classList.remove('d-none');
                    emailManualSection.classList.add('d-none');
                    
                    // Actualizar texto del botón según el proveedor
                    switch(selectedProvider) {
                        case 'google':
                            connectEmailBtn.innerHTML = '<i class="fab fa-google me-2"></i>Conectar con Google';
                            break;
                        case 'microsoft':
                            connectEmailBtn.innerHTML = '<i class="fab fa-microsoft me-2"></i>Conectar con Microsoft';
                            break;
                        case 'yahoo':
                            connectEmailBtn.innerHTML = '<i class="fab fa-yahoo me-2"></i>Conectar con Yahoo';
                            break;
                    }
                }
            } else {
                // Si no hay proveedor seleccionado, deshabilitar botón
                connectEmailBtn.disabled = true;
                emailOAuthSection.classList.add('d-none');
                emailManualSection.classList.add('d-none');
            }
        });
        
        // Configurar el botón de conexión
        if (connectEmailBtn) {
            connectEmailBtn.addEventListener('click', function() {
                const selectedProvider = emailProviderSelect.value;
                const emailConsent = emailConsentCheckbox.checked;
                
                // Verificar consentimiento
                if (!emailConsent) {
                    toastr.error('Debes dar tu consentimiento para acceder a tu correo electrónico', 'Error');
                    return;
                }
                
                // Iniciar proceso de autenticación según el proveedor
                switch(selectedProvider) {
                    case 'google':
                        connectWithGoogle();
                        break;
                    case 'microsoft':
                        connectWithMicrosoft();
                        break;
                    case 'yahoo':
                        connectWithYahoo();
                        break;
                }
            });
        }
    }
    
    // Cargar estado de conexión actual
    loadEmailConnectionStatus();
}

/**
 * Conectar con Google (Gmail)
 */
function connectWithGoogle() {
    console.log('🔌 Iniciando conexión con Google...');
    
    // Verificar si ya existe un token guardado
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Obtener clientId de Google desde el backend
    fetch('/api/email/oauth/google/config', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(config => {
        // Guardar estado para verificar después del callback
        sessionStorage.setItem('emailOAuthPending', 'google');
        
        // Construir URL de autorización de Google
        const redirectUri = `${window.location.origin}/oauth/callback`;
        const scope = 'https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose';
        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
        
        // Abrir ventana de autenticación
        const authWindow = window.open(authUrl, 'googleOAuth', 'width=600,height=700');
        
        // Verificar periódicamente si la ventana se cerró
        const checkWindow = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkWindow);
                checkOAuthCallback();
            }
        }, 500);
    })
    .catch(error => {
        console.error('❌ Error al obtener configuración de Google OAuth:', error);
        toastr.error('Error al conectar con Google', 'Error');
    });
}

/**
 * Conectar con Microsoft (Outlook)
 */
function connectWithMicrosoft() {
    console.log('🔌 Iniciando conexión con Microsoft...');
    
    // Verificar si ya existe un token guardado
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Obtener clientId de Microsoft desde el backend
    fetch('/api/email/oauth/microsoft/config', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(config => {
        // Guardar estado para verificar después del callback
        sessionStorage.setItem('emailOAuthPending', 'microsoft');
        
        // Construir URL de autorización de Microsoft
        const redirectUri = `${window.location.origin}/oauth/callback`;
        const scope = 'offline_access Mail.Read Mail.ReadWrite Mail.Send';
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        
        // Abrir ventana de autenticación
        const authWindow = window.open(authUrl, 'microsoftOAuth', 'width=600,height=700');
        
        // Verificar periódicamente si la ventana se cerró
        const checkWindow = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkWindow);
                checkOAuthCallback();
            }
        }, 500);
    })
    .catch(error => {
        console.error('❌ Error al obtener configuración de Microsoft OAuth:', error);
        toastr.error('Error al conectar con Microsoft', 'Error');
    });
}

/**
 * Conectar con Yahoo Mail
 */
function connectWithYahoo() {
    console.log('🔌 Iniciando conexión con Yahoo...');
    
    // Verificar si ya existe un token guardado
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Obtener clientId de Yahoo desde el backend
    fetch('/api/email/oauth/yahoo/config', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(config => {
        // Guardar estado para verificar después del callback
        sessionStorage.setItem('emailOAuthPending', 'yahoo');
        
        // Construir URL de autorización de Yahoo
        const redirectUri = `${window.location.origin}/oauth/callback`;
        const scope = 'mail-r mail-w';
        const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        
        // Abrir ventana de autenticación
        const authWindow = window.open(authUrl, 'yahooOAuth', 'width=600,height=700');
        
        // Verificar periódicamente si la ventana se cerró
        const checkWindow = setInterval(() => {
            if (authWindow.closed) {
                clearInterval(checkWindow);
                checkOAuthCallback();
            }
        }, 500);
    })
    .catch(error => {
        console.error('❌ Error al obtener configuración de Yahoo OAuth:', error);
        toastr.error('Error al conectar con Yahoo', 'Error');
    });
}

/**
 * Verificar si el proceso de OAuth se completó correctamente
 */
function checkOAuthCallback() {
    const pendingProvider = sessionStorage.getItem('emailOAuthPending');
    if (!pendingProvider) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    console.log(`🔍 Verificando estado de autenticación para ${pendingProvider}...`);
    
    // Verificar si se completó la autenticación
    fetch(`/api/email/oauth/${pendingProvider}/status`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.connected) {
            // Autenticación exitosa
            toastr.success(`Cuenta de ${getProviderName(pendingProvider)} conectada correctamente`, 'Conexión exitosa');
            sessionStorage.removeItem('emailOAuthPending');
            
            // Actualizar estado de conexión
            updateEmailConnectionStatus(data);
            
            // Actualizar el campo de email de salida si está vacío
            const outgoingEmailField = document.getElementById('outgoing_email');
            if (outgoingEmailField && (!outgoingEmailField.value || outgoingEmailField.value.trim() === '') && data.email) {
                outgoingEmailField.value = data.email;
            }
            
            // Marcar consentimiento si no estaba marcado
            const consentCheckbox = document.getElementById('email_consent');
            if (consentCheckbox && !consentCheckbox.checked) {
                consentCheckbox.checked = true;
            }
        } else {
            // Autenticación fallida o cancelada
            toastr.warning(`No se pudo conectar con ${getProviderName(pendingProvider)}`, 'Conexión cancelada');
            sessionStorage.removeItem('emailOAuthPending');
        }
    })
    .catch(error => {
        console.error('❌ Error al verificar estado de OAuth:', error);
        toastr.error('Error al verificar conexión', 'Error');
        sessionStorage.removeItem('emailOAuthPending');
    });
}

/**
 * Cargar el estado actual de conexión de email
 */
function loadEmailConnectionStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    fetch('/api/email/connection', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.connected) {
            updateEmailConnectionStatus(data);
        }
    })
    .catch(error => {
        console.error('❌ Error al cargar estado de conexión de email:', error);
    });
}

/**
 * Actualizar la UI con el estado de conexión
 * @param {Object} data - Datos de la conexión
 */
function updateEmailConnectionStatus(data) {
    const emailProviderSelect = document.getElementById('email_provider');
    const connectEmailBtn = document.getElementById('connect-email-btn');
    const emailConnectionStatus = document.getElementById('email-connection-status');
    
    if (emailProviderSelect && data.provider) {
        // Seleccionar el proveedor en el dropdown
        emailProviderSelect.value = data.provider;
        
        // Mostrar estado de conexión
        if (emailConnectionStatus) {
            emailConnectionStatus.classList.remove('d-none');
            emailConnectionStatus.classList.remove('alert-info');
            emailConnectionStatus.classList.add('alert-success');
            
            const providerName = getProviderName(data.provider);
            const emailAddress = data.email || 'tu cuenta';
            
            emailConnectionStatus.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-check-circle me-2"></i>
                        Conectado a ${providerName} como <strong>${emailAddress}</strong>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="disconnectEmailAccount()">
                        <i class="fas fa-unlink me-1"></i>Desconectar
                    </button>
                </div>
            `;
        }
        
        // Actualizar botón de conexión
        if (connectEmailBtn) {
            connectEmailBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reconectar cuenta';
        }
    }
}

/**
 * Desconectar cuenta de correo
 */
function disconnectEmailAccount() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Confirmar antes de desconectar
    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de correo? Esta acción detendrá la gestión automática de emails.')) {
        return;
    }
    
    fetch('/api/email/connection', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        toastr.success('Cuenta de correo desconectada correctamente', 'Desconexión exitosa');
        
        // Resetear UI
        const emailConnectionStatus = document.getElementById('email-connection-status');
        if (emailConnectionStatus) {
            emailConnectionStatus.classList.add('d-none');
        }
        
        const connectEmailBtn = document.getElementById('connect-email-btn');
        if (connectEmailBtn) {
            connectEmailBtn.disabled = true;
            connectEmailBtn.innerHTML = '<i class="fas fa-link me-2"></i>Conectar cuenta de correo';
        }
        
        const emailProviderSelect = document.getElementById('email_provider');
        if (emailProviderSelect) {
            emailProviderSelect.value = '';
        }
    })
    .catch(error => {
        console.error('❌ Error al desconectar cuenta de correo:', error);
        toastr.error('Error al desconectar cuenta', 'Error');
    });
}

/**
 * Guardar configuración manual de IMAP/SMTP
 */
function saveManualEmailConfig() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        toastr.error('Error de autenticación', 'Error');
        return;
    }
    
    // Obtener valores de los campos
    const emailAddress = document.getElementById('email_address').value;
    const emailPassword = document.getElementById('email_password').value;
    const imapServer = document.getElementById('imap_server').value;
    const imapPort = document.getElementById('imap_port').value;
    const smtpServer = document.getElementById('smtp_server').value;
    const smtpPort = document.getElementById('smtp_port').value;
    const useSSL = document.getElementById('use_ssl').checked;
    const emailConsent = document.getElementById('email_consent').checked;
    
    // Validar campos requeridos
    if (!emailAddress || !emailPassword || !imapServer || !imapPort || !smtpServer || !smtpPort) {
        toastr.error('Todos los campos son obligatorios', 'Error');
        return;
    }
    
    // Verificar consentimiento
    if (!emailConsent) {
        toastr.error('Debes dar tu consentimiento para acceder a tu correo electrónico', 'Error');
        return;
    }
    
    // Enviar configuración al backend
    fetch('/api/email/manual-config', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: emailAddress,
            password: emailPassword,
            imapServer: imapServer,
            imapPort: parseInt(imapPort),
            smtpServer: smtpServer,
            smtpPort: parseInt(smtpPort),
            useSSL: useSSL,
            consent: emailConsent
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        toastr.success('Configuración de correo guardada correctamente', 'Configuración guardada');
        
        // Actualizar estado de conexión
        updateEmailConnectionStatus({
            connected: true,
            provider: 'other',
            email: emailAddress
        });
    })
    .catch(error => {
        console.error('❌ Error al guardar configuración manual de email:', error);
        toastr.error('Error al guardar configuración', 'Error');
    });
}

/**
 * Obtener nombre legible del proveedor
 * @param {string} provider - Código del proveedor
 * @returns {string} Nombre legible del proveedor
 */
function getProviderName(provider) {
    switch(provider) {
        case 'google': return 'Google Gmail';
        case 'microsoft': return 'Microsoft Outlook';
        case 'yahoo': return 'Yahoo Mail';
        case 'other': return 'Servidor IMAP/SMTP';
        default: return 'proveedor de correo';
    }
}

// Exportar funciones para uso global
window.connectWithGoogle = connectWithGoogle;
window.connectWithMicrosoft = connectWithMicrosoft;
window.connectWithYahoo = connectWithYahoo;
window.disconnectEmailAccount = disconnectEmailAccount;
window.saveManualEmailConfig = saveManualEmailConfig;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando módulo de integración de correo electrónico...');
    initEmailIntegration();
    
    // Verificar si hay un proceso de OAuth pendiente
    const pendingProvider = sessionStorage.getItem('emailOAuthPending');
    if (pendingProvider) {
        console.log(`🔄 Verificando proceso de OAuth pendiente para ${pendingProvider}...`);
        checkOAuthCallback();
    }
});
