/**
 * Funciones para la integración con proveedores de correo electrónico
 * Este archivo contiene las funciones necesarias para la integración con Gmail, Outlook y otros proveedores
 */

// Definir API_BASE_URL si no existe
const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

/**
 * Inicializar la integración de email
 */
function initEmailIntegration() {
    console.log('🔄 Inicializando integración de email...');
    console.log('🌐 API_BASE_URL:', API_BASE_URL);
    
    // Configurar el selector de proveedor de correo
    const emailProviderSelect = document.getElementById('email_provider');
    const connectEmailBtn = document.getElementById('connect-email-btn');
    const emailOAuthSection = document.getElementById('email-oauth-section');
    const emailManualSection = document.getElementById('email-manual-section');
    const emailConsentCheckbox = document.getElementById('email_consent');
    
    console.log('📋 Elementos encontrados:', {
        emailProviderSelect: !!emailProviderSelect,
        connectEmailBtn: !!connectEmailBtn,
        emailOAuthSection: !!emailOAuthSection,
        emailManualSection: !!emailManualSection,
        emailConsentCheckbox: !!emailConsentCheckbox
    });
    
    if (emailProviderSelect) {
        // Función para actualizar el estado del botón según el proveedor
        const updateButtonState = function(selectedProvider) {
            console.log('🔄 Actualizando estado del botón para proveedor:', selectedProvider);
            
            // Habilitar/deshabilitar botón de conexión según el proveedor seleccionado
            if (selectedProvider && connectEmailBtn) {
                connectEmailBtn.disabled = false;
                console.log('✅ Botón habilitado para:', selectedProvider);
                
                // Mostrar sección correspondiente según el proveedor
                if (selectedProvider === 'other') {
                    // Para IMAP/SMTP manual, mostrar campos adicionales
                    if (emailOAuthSection) emailOAuthSection.classList.add('d-none');
                    if (emailManualSection) emailManualSection.classList.remove('d-none');
                } else {
                    // Para proveedores OAuth (Google, Microsoft, Yahoo)
                    if (emailOAuthSection) emailOAuthSection.classList.remove('d-none');
                    if (emailManualSection) emailManualSection.classList.add('d-none');
                    
                    // Actualizar texto del botón según el proveedor
                    switch(selectedProvider) {
                        case 'google':
                            connectEmailBtn.innerHTML = '<i class="fab fa-google me-2"></i>Conectar con Google';
                            break;
                        case 'microsoft':
                            connectEmailBtn.innerHTML = '<i class="fab fa-microsoft me-2"></i>Conectar con Outlook';
                            break;
                    }
                }
            } else {
                // Si no hay proveedor seleccionado, deshabilitar botón
                if (connectEmailBtn) {
                    connectEmailBtn.disabled = true;
                    console.log('❌ Botón deshabilitado (sin proveedor)');
                }
                if (emailOAuthSection) emailOAuthSection.classList.add('d-none');
                if (emailManualSection) emailManualSection.classList.add('d-none');
            }
        };
        
        // Manejar cambios en el selector de proveedor
        emailProviderSelect.addEventListener('change', function() {
            updateButtonState(this.value);
        });
        
        // Inicializar el estado del botón con el valor actual del selector
        const currentProvider = emailProviderSelect.value;
        if (currentProvider) {
            console.log('🔍 Proveedor ya seleccionado al cargar:', currentProvider);
            updateButtonState(currentProvider);
        }
        
        // Configurar el botón de conexión
        if (connectEmailBtn) {
            console.log('✅ Botón de conexión encontrado, agregando event listener...');
            connectEmailBtn.addEventListener('click', function() {
                console.log('🖱️ Click en botón de conexión detectado');
                const selectedProvider = emailProviderSelect.value;
                const emailConsent = emailConsentCheckbox ? emailConsentCheckbox.checked : false;
                
                console.log('📊 Estado actual:', {
                    selectedProvider,
                    emailConsent,
                    hasCheckbox: !!emailConsentCheckbox
                });
                
                // Verificar consentimiento
                if (!emailConsent) {
                    console.warn('⚠️ Consentimiento no dado');
                    toastr.error('Debes dar tu consentimiento para acceder a tu correo electrónico', 'Error');
                    return;
                }
                
                console.log(`🚀 Iniciando conexión con ${selectedProvider}...`);
                
                // Iniciar proceso de autenticación según el proveedor
                switch(selectedProvider) {
                    case 'google':
                        connectWithGoogle();
                        break;
                    case 'microsoft':
                        connectWithMicrosoft();
                        break;
                    default:
                        console.error('❌ Proveedor no reconocido:', selectedProvider);
                        toastr.error('Proveedor no soportado', 'Error');
                }
            });
        } else {
            console.error('❌ Botón de conexión NO encontrado');
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
        console.error('No hay token de autenticación');
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        return;
    }
    
    // Obtener URL de autorización desde el backend
    fetch(`${API_BASE_URL}/api/email/oauth/google`, {
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
        if (data.success && data.authUrl) {
            console.log('✅ URL de autorización obtenida');
            
            // Redirigir a la URL de autorización de Google
            window.location.href = data.authUrl;
        } else {
            throw new Error('No se pudo obtener la URL de autorización');
        }
    })
    .catch(error => {
        console.error('❌ Error al obtener URL de Google OAuth:', error);
        alert('Error al conectar con Google: ' + error.message);
    });
}

/**
 * Conectar con Microsoft (Outlook)
 */
function connectWithMicrosoft() {
    console.log('🔌 Iniciando conexión con Microsoft Outlook...');
    
    // Verificar si ya existe un token guardado
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (!token) {
        console.error('No hay token de autenticación');
        toastr.error('Error de autenticación. Por favor, inicia sesión nuevamente.', 'Error');
        return;
    }
    
    console.log('✅ Token encontrado, obteniendo URL de autorización...');
    
    // Obtener URL de autorización desde el backend (igual que Google)
    fetch(`${API_BASE_URL}/api/email/oauth/outlook/authorize`, {
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
        if (data.success && data.authUrl) {
            console.log('✅ URL de autorización obtenida');
            
            // Redirigir a la URL de autorización de Microsoft
            window.location.href = data.authUrl;
        } else {
            throw new Error('No se pudo obtener la URL de autorización');
        }
    })
    .catch(error => {
        console.error('❌ Error al obtener URL de Outlook OAuth:', error);
        toastr.error('Error al conectar con Outlook: ' + error.message, 'Error');
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
    
    fetch(`${API_BASE_URL}/api/email/accounts`, {
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
        if (data.success && data.accounts && data.accounts.length > 0) {
            const account = data.accounts[0]; // Tomar la primera cuenta activa
            updateEmailConnectionStatus({
                connected: true,
                provider: account.provider,
                email: account.email
            });
            
            // Cargar bandeja de entrada automáticamente
            loadEmailInbox();
        }
    })
    .catch(error => {
        console.error('❌ Error al cargar estado de conexión de email:', error);
    });
}

// Variable global para paginación
window.emailNextPageToken = null;
window.emailsLoadingMore = false;

/**
 * Cargar bandeja de entrada desde la API
 */
function loadEmailInbox() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    console.log('📧 Cargando bandeja de entrada...');
    
    // Marcar que estamos cargando emails
    window.emailsLoading = true;
    
    fetch(`${API_BASE_URL}/api/email/inbox?limit=50`, {
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
        window.emailsLoading = false;
        if (data.success && data.emails) {
            console.log(`✅ ${data.emails.length} emails cargados desde ${data.provider}`);
            
            // Guardar nextPageToken para paginación
            window.emailNextPageToken = data.nextPageToken;
            console.log(`📄 NextPageToken: ${window.emailNextPageToken ? 'disponible' : 'no hay más'}`);
            
            displayEmailsInTable(data.emails);
        }
    })
    .catch(error => {
        window.emailsLoading = false;
        console.error('❌ Error al cargar bandeja de entrada:', error);
    });
}

/**
 * Cargar más emails (paginación)
 */
function loadMoreEmails() {
    if (!window.emailNextPageToken || window.emailsLoadingMore) {
        console.log('⚠️ No hay más emails o ya se está cargando');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    console.log('📧 Cargando más emails...');
    window.emailsLoadingMore = true;
    
    fetch(`${API_BASE_URL}/api/email/inbox?limit=50&pageToken=${window.emailNextPageToken}`, {
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
        window.emailsLoadingMore = false;
        if (data.success && data.emails) {
            console.log(`✅ ${data.emails.length} emails adicionales cargados`);
            
            // Actualizar nextPageToken
            window.emailNextPageToken = data.nextPageToken;
            console.log(`📄 NextPageToken: ${window.emailNextPageToken ? 'disponible' : 'no hay más'}`);
            
            // Agregar nuevos emails a la tabla
            appendEmailsToTable(data.emails);
        }
    })
    .catch(error => {
        window.emailsLoadingMore = false;
        console.error('❌ Error al cargar más emails:', error);
    });
}

// Exportar función globalmente
window.loadMoreEmails = loadMoreEmails;

/**
 * Mostrar emails en la tabla
 */
function displayEmailsInTable(emails) {
    const tableBody = document.getElementById('emails-table-body');
    if (!tableBody) return;
    
    if (emails.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay emails en la bandeja de entrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = emails.map(email => {
        const date = new Date(email.date);
        const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const isUnread = !email.isRead;
        const rowClass = isUnread ? 'fw-bold' : '';
        
        return `
            <tr class="email-row ${rowClass}" data-email-id="${email.id}">
                <td class="text-center">
                    <i class="fas fa-star ${email.isStarred ? 'text-warning' : 'text-muted'}"></i>
                </td>
                <td>${escapeHtml(email.from || email.fromName || 'Desconocido')}</td>
                <td>${escapeHtml(email.subject || '(Sin asunto)')}</td>
                <td>${escapeHtml(email.snippet || email.body?.substring(0, 100) || '')}</td>
                <td>${formattedDate}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary view-email-btn" data-email-id="${email.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Agregar event listeners a los botones de ver
    document.querySelectorAll('.view-email-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const emailId = this.dataset.emailId;
            const email = emails.find(e => e.id === emailId);
            if (email) {
                showEmailModal(email);
            }
        });
    });
}

/**
 * Agregar emails a la tabla (para paginación)
 */
function appendEmailsToTable(emails) {
    const tableBody = document.getElementById('emails-table-body');
    if (!tableBody) return;
    
    const newRows = emails.map(email => {
        const date = new Date(email.date);
        const formattedDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const isUnread = !email.isRead;
        const rowClass = isUnread ? 'fw-bold' : '';
        
        return `
            <tr class="email-row ${rowClass}" data-email-id="${email.id}">
                <td class="text-center">
                    <i class="fas fa-star ${email.isStarred ? 'text-warning' : 'text-muted'}"></i>
                </td>
                <td>${escapeHtml(email.from || email.fromName || 'Desconocido')}</td>
                <td>${escapeHtml(email.subject || '(Sin asunto)')}</td>
                <td>${escapeHtml(email.snippet || email.body?.substring(0, 100) || '')}</td>
                <td>${formattedDate}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary view-email-btn" data-email-id="${email.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.insertAdjacentHTML('beforeend', newRows);
    
    // Agregar event listeners a los nuevos botones
    const newButtons = tableBody.querySelectorAll('.view-email-btn:not([data-listener])');
    newButtons.forEach(btn => {
        btn.setAttribute('data-listener', 'true');
        btn.addEventListener('click', function() {
            const emailId = this.dataset.emailId;
            const email = emails.find(e => e.id === emailId);
            if (email) {
                showEmailModal(email);
            }
        });
    });
    
    console.log(`✅ ${emails.length} emails agregados a la tabla`);
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mostrar modal con detalles del email
 */
function showEmailModal(email) {
    // TODO: Implementar modal de detalles del email
    console.log('Mostrar email:', email);
    alert(`De: ${email.from}\nAsunto: ${email.subject}\n\n${email.body || email.snippet}`);
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
    console.log('🔌 INICIO disconnectEmailAccount()');
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    console.log('🔑 Token encontrado:', !!token);
    
    if (!token) {
        console.error('❌ No hay token de autenticación');
        alert('Error de autenticación. Por favor, recarga la página.');
        return;
    }
    
    // Confirmar antes de desconectar
    const confirmed = confirm('¿Estás seguro de que deseas desconectar tu cuenta de correo?');
    console.log('✅ Usuario confirmó:', confirmed);
    
    if (!confirmed) {
        console.log('❌ Usuario canceló la desconexión');
        return;
    }
    
    console.log('🔌 Desconectando cuenta de correo...');
    
    // Primero obtener el proveedor actual para saber qué endpoint usar
    fetch(`${API_BASE_URL}/api/email/accounts`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📧 Response de /api/email/accounts:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('📧 Data de accounts:', data);
        
        if (data.success && data.accounts && data.accounts.length > 0) {
            const provider = data.accounts[0].provider;
            console.log(`📧 Proveedor detectado: ${provider}`);
            
            // Desconectar según el proveedor
            let deleteEndpoint = '';
            if (provider === 'google') {
                deleteEndpoint = `${API_BASE_URL}/api/email/accounts/google`;
            } else if (provider === 'microsoft' || provider === 'outlook') {
                deleteEndpoint = `${API_BASE_URL}/api/email/oauth/outlook/disconnect`;
            }
            
            console.log(`🔗 Endpoint de desconexión: ${deleteEndpoint}`);
            
            return fetch(deleteEndpoint, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            throw new Error('No hay cuenta conectada');
        }
    })
    .then(response => {
        console.log('🔗 Response de DELETE:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Cuenta desconectada exitosamente:', data);
        alert('Cuenta de correo desconectada correctamente');
        
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
        
        // Limpiar bandeja de entrada si existe
        if (window.InboxView && window.InboxView.clearInbox) {
            console.log('🗑️ Limpiando bandeja de entrada...');
            window.InboxView.clearInbox();
        }
        
        // Ocultar sección de bandeja de entrada
        const inboxSection = document.getElementById('inbox-section');
        if (inboxSection) {
            inboxSection.classList.add('d-none');
        }
        
        // Recargar página para refrescar todo
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    })
    .catch(error => {
        console.error('❌ Error desconectando cuenta:', error);
        console.error('❌ Stack:', error.stack);
        alert(`Error al desconectar: ${error.message}`);
    });
}

// Exponer globalmente para que el botón pueda llamarla
window.disconnectEmailAccount = disconnectEmailAccount;

/**
 * Guardar configuración manual de IMAP/SMTP
 */
/**
 * Función placeholder para mantener la estructura
 */
function placeholderEmailConfig() {
    console.log('Esta función reemplaza a saveManualEmailConfig');
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
window.disconnectEmailAccount = disconnectEmailAccount;

// Inicializar cuando el DOM esté listo Y después de que el dashboard se haya cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando módulo de integración de correo electrónico...');
    
    // Esperar a que el dashboard cree los elementos (delay de 2 segundos)
    setTimeout(function() {
        console.log('⏰ Iniciando integración de email después del delay...');
        initEmailIntegration();
        
        // Verificar si hay un proceso de OAuth pendiente
        const pendingProvider = sessionStorage.getItem('emailOAuthPending');
        if (pendingProvider) {
            console.log(`🔄 Verificando proceso de OAuth pendiente para ${pendingProvider}...`);
            checkOAuthCallback();
        }
    }, 2000);
});
