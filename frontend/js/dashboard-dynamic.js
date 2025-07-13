/**
 * Módulo de Dashboard Dinámico
 * Adapta el dashboard según las respuestas y peticiones del cliente
 * Integrado con el servicio de autenticación centralizado
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el dashboard dinámico cuando el documento esté listo
    // La verificación de autenticación ya la realiza route-protection.js
    initializeDynamicDashboard();
});

/**
 * Función para limpiar caché y forzar recarga de recursos
 */
function clearCacheAndReload() {
    console.log('Limpiando caché y forzando recarga...');
    
    // Limpiar localStorage excepto token de autenticación
    const authToken = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    localStorage.clear();
    
    // Restaurar token y datos de usuario
    if (authToken) localStorage.setItem('auth_token', authToken);
    if (userData) localStorage.setItem('user_data', userData);
    
    // Forzar recarga sin caché
    window.location.reload(true);
}

/**
 * Inicializa el dashboard dinámico cargando la configuración de la empresa
 * y adaptando el contenido según el sector empresarial
 */
/**
 * Muestra un mensaje de error global en el dashboard
 * @param {string} titulo - Título del error
 * @param {string} mensaje - Mensaje detallado del error
 * @param {Function|null} retryFunction - Función para reintentar, o null si no hay reintento
 */
function mostrarErrorGlobal(titulo, mensaje, retryFunction) {
    console.error(`ERROR GLOBAL: ${titulo} - ${mensaje}`);
    
    // Mostrar notificación toast
    toastr.error(mensaje, titulo);
    
    // Mostrar mensaje de error en el contenido principal
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger';
        
        let htmlContent = `
            <h4><i class="fas fa-exclamation-triangle me-2"></i>${titulo}</h4>
            <p>${mensaje}</p>
        `;
        
        // Añadir botón de reintento si hay función
        if (retryFunction && typeof retryFunction === 'function') {
            htmlContent += `
                <button class="btn btn-primary retry-action">
                    <i class="fas fa-sync-alt me-2"></i>Reintentar
                </button>
            `;
        }
        
        errorMessage.innerHTML = htmlContent;
        mainContent.prepend(errorMessage);
        
        // Configurar evento de reintento
        if (retryFunction && typeof retryFunction === 'function') {
            const retryButton = errorMessage.querySelector('.retry-action');
            if (retryButton) {
                retryButton.addEventListener('click', retryFunction);
            }
        }
    }
}

function initializeDynamicDashboard() {
    console.log('=== INICIALIZANDO DASHBOARD DINÁMICO ===');
    console.log('Verificando token de autenticación...');
    
    // Verificar que API_CONFIG está disponible
    if (typeof window.API_CONFIG === 'undefined') {
        console.error('API_CONFIG no está disponible');
        // Intentar cargar api-config.js dinámicamente
        const script = document.createElement('script');
        script.src = 'js/api-config.js';
        script.onload = () => {
            console.log('API_CONFIG cargado dinámicamente');
            continueInitialization();
        };
        script.onerror = () => {
            mostrarErrorGlobal('Error de configuración', 'No se pudo cargar la configuración de la API', () => {
                window.location.reload();
            });
        };
        document.head.appendChild(script);
        return;
    }
    
    continueInitialization();
    
    function continueInitialization() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No hay token de autenticación. Redirigiendo al login...');
            mostrarErrorGlobal('No hay token de autenticación', 'Redirigiendo a la página de login...', () => {
                window.location.href = 'login.html';
            });
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Cargar script de keep-alive para mantener el backend activo
        if (!window.keepAliveLoaded) {
            console.log('Cargando script de keep-alive...');
            const keepAliveScript = document.createElement('script');
            keepAliveScript.src = 'js/keep-alive.js';
            keepAliveScript.onload = () => {
                console.log('Script de keep-alive cargado correctamente');
                window.keepAliveLoaded = true;
            };
            document.head.appendChild(keepAliveScript);
        }
        
        console.log('Token encontrado. Mostrando indicador de carga...');
        
        // Mostrar indicador de carga
        const loadingIndicator = document.getElementById('loading-overview');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('d-none');
        } else {
            console.warn('No se encontró el indicador de carga (loading-overview)');
        }
        
        // Mostrar mensaje de carga
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            const loadingMessage = document.createElement('div');
            loadingMessage.id = 'loading-message';
            loadingMessage.className = 'alert alert-info text-center';
            loadingMessage.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Cargando tu dashboard personalizado...';
            mainContent.prepend(loadingMessage);
        }
    
    console.log('Obteniendo configuración de la empresa...');
    
    // Obtener configuración de la empresa
    getCompanyConfig()
        .then(companyConfig => {
            console.log('Configuración obtenida:', companyConfig);
            
            // Eliminar mensaje de carga
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            if (!companyConfig) {
                console.warn('No se encontró configuración de empresa. Redirigiendo a setup...');
                redirectToSetup();
                return;
            }
            
            // Verificar que tenemos un sector empresarial
            if (!companyConfig.businessSector && !companyConfig.sector) {
                console.warn('No se encontró sector empresarial en la configuración');
                console.log('Configuración recibida:', companyConfig);
                
                // Intentar usar sector por defecto (retail)
                companyConfig.businessSector = 'retail';
                console.log('Usando sector por defecto:', companyConfig.businessSector);
                
                // Guardar configuración actualizada
                try {
                    localStorage.setItem('companyConfig', JSON.stringify(companyConfig));
                } catch (storageError) {
                    console.warn('No se pudo guardar la configuración en localStorage:', storageError);
                }
            }
            
            console.log('Adaptando dashboard para sector:', companyConfig.businessSector || companyConfig.sector || 'generic');
            adaptDashboard(companyConfig);
        })
        .catch(error => {
            console.error('ERROR al inicializar dashboard:', error);
            console.error('Detalle del error:', error.stack);
            
            // Eliminar mensaje de carga
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
            
            // Ocultar indicador de carga
            if (loadingIndicator) {
                loadingIndicator.classList.add('d-none');
            }
            
            // Mostrar error
            toastr.error('Error al cargar la configuración de tu empresa. Consulta la consola para más detalles.', 'Error');
            
            // Mostrar mensaje de error en el contenido principal
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'alert alert-danger';
                errorMessage.innerHTML = `
                    <h4><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar el dashboard</h4>
                    <p>No se pudo cargar la configuración de tu empresa. Por favor, intenta lo siguiente:</p>
                    <ol>
                        <li>Verifica tu conexión a internet</li>
                        <li>Actualiza la página (F5)</li>
                        <li>Cierra sesión y vuelve a iniciar sesión</li>
                    </ol>
                    <button class="btn btn-primary" onclick="window.location.reload()">Actualizar página</button>
                    <button class="btn btn-outline-secondary ms-2" onclick="window.location.href='login.html'">Volver al login</button>
                `;
                mainContent.prepend(errorMessage);
            }
        });
}

/**
 * Obtiene la configuración de la empresa directamente de la API
 * @returns {Promise} Promesa que resuelve con la configuración de la empresa
 */
async function getCompanyConfig() {
    try {
        console.log('=== INICIANDO CARGA DE CONFIGURACIÓN DE EMPRESA ===');
        console.log('Verificando dependencias...');
        
        // Verificar que API_CONFIG está disponible
        if (typeof window.API_CONFIG === 'undefined') {
            console.error('API_CONFIG no está disponible en window');
            
            // Intentar cargar API_CONFIG desde el script
            const script = document.createElement('script');
            script.src = '/js/api-config.js';
            document.head.appendChild(script);
            
            // Esperar a que se cargue el script
            await new Promise((resolve) => {
                script.onload = resolve;
                script.onerror = () => {
                    console.error('No se pudo cargar api-config.js');
                    toastr.error('Error de configuración: No se pudo cargar API_CONFIG', 'Error');
                    resolve();
                };
            });
            
            // Verificar nuevamente
            if (typeof window.API_CONFIG === 'undefined') {
                console.error('API_CONFIG sigue sin estar disponible después de cargar el script');
                toastr.error('Error de configuración: API_CONFIG no disponible', 'Error');
                return null;
            }
        } else {
            console.log('✓ API_CONFIG disponible');
            console.log('API Base URL:', API_CONFIG.apiBaseUrl);
        }
        
        if (!window.authService) {
            console.error('ERROR CRÍTICO: AuthService no está disponible');
            toastr.error('Error de configuración: Servicio de autenticación no disponible', 'Error');
            throw new Error('Servicio de autenticación no disponible');
        } else {
            console.log('✓ authService disponible');
        }
        
        // Obtener token de autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('ERROR: No hay token de autenticación en localStorage');
            toastr.error('No hay sesión activa. Redirigiendo al login...', 'Error de autenticación');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            throw new Error('No hay sesión activa');
        } else {
            console.log('✓ Token de autenticación encontrado');
            // Mostrar solo los primeros 10 caracteres del token por seguridad
            console.log('Token (parcial):', token.substring(0, 10) + '...');
        }
        
        console.log('Obteniendo perfil de usuario desde la API...');
        console.log('URL de la petición:', API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME));
        
        // Intentar obtener la configuración desde la API
        console.log('Obteniendo configuración desde API...');
        console.log('URL:', window.API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME));
        
        // Intentar cargar desde localStorage primero como fallback
        let cachedConfig = null;
        try {
            const cachedConfigStr = localStorage.getItem('companyConfig');
            if (cachedConfigStr) {
                cachedConfig = JSON.parse(cachedConfigStr);
                console.log('Configuración encontrada en cache:', cachedConfig);
            }
        } catch (cacheError) {
            console.warn('Error al cargar configuración desde cache:', cacheError);
        }
        
        // Intentar obtener desde el backend con timeout
        let response;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
            
            response = await fetch(window.API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
        } catch (fetchError) {
            console.error('Error de conexión al cargar configuración:', fetchError);
            mostrarErrorGlobal('Error de conexión', 'No se pudo conectar con el servidor. Usando configuración local si está disponible.', () => {
                window.location.reload();
            });
            
            // Si tenemos configuración en cache, usarla como fallback
            if (cachedConfig) {
                console.log('Usando configuración de cache como fallback');
                return cachedConfig;
            }
            
            throw new Error('Error de conexión al cargar configuración');
        }
        
        console.log('Respuesta recibida. Status:', response.status);
        
        if (!response.ok) {
            // Si hay un error 401 (no autorizado), redirigir al login
            if (response.status === 401) {
                console.error('ERROR: Sesión expirada o inválida (401 Unauthorized)');
                localStorage.removeItem('auth_token');
                toastr.error('Tu sesión ha expirado. Redirigiendo al login...', 'Error de autenticación');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                throw new Error('Sesión expirada');
            }
            
            const errorText = await response.text();
            console.error('ERROR en respuesta de API:', errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: 'Error desconocido' };
            }
            
            toastr.error(`Error al obtener perfil: ${errorData.message || response.status}`, 'Error');
            throw new Error(errorData.message || `Error al obtener perfil de usuario: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.log('Respuesta en texto:', responseText.substring(0, 200) + '...');
        
        let profile;
        try {
            profile = JSON.parse(responseText);
            console.log('Perfil parseado correctamente:', profile);
        } catch (parseError) {
            console.error('ERROR al parsear respuesta JSON:', parseError);
            console.error('Respuesta recibida:', responseText);
            toastr.error('Error al procesar la respuesta del servidor', 'Error');
            throw new Error('Error al parsear respuesta JSON');
        }
        
        // Extraer configuración de la empresa del perfil
        if (profile && profile.client) {
            console.log('Cliente encontrado en el perfil:', profile.client);
            console.log('ID del cliente:', profile.client.id);
            console.log('Nombre de la empresa:', profile.client.companyName);
            console.log('Sector empresarial:', profile.client.businessSector || 'No especificado');
            
            // Combinar todas las configuraciones en un solo objeto
            const companyConfig = {
                ...profile.client
            };
            
            // Manejar campos JSON escalares con manejo seguro de errores
            try {
                console.log('Procesando campos de configuración JSON...');
                
                // Procesar botConfig si existe
                if (profile.client.botConfig) {
                    console.log('botConfig encontrado:', typeof profile.client.botConfig);
                    if (typeof profile.client.botConfig === 'string') {
                        companyConfig.botConfig = JSON.parse(profile.client.botConfig);
                        console.log('botConfig parseado de string a objeto');
                    } else {
                        companyConfig.botConfig = profile.client.botConfig;
                        console.log('botConfig ya es un objeto');
                    }
                } else {
                    console.log('botConfig no encontrado, usando objeto vacío');
                    companyConfig.botConfig = {};
                }
                
                // Procesar emailConfig si existe
                if (profile.client.emailConfig) {
                    console.log('emailConfig encontrado:', typeof profile.client.emailConfig);
                    if (typeof profile.client.emailConfig === 'string') {
                        companyConfig.emailConfig = JSON.parse(profile.client.emailConfig);
                        console.log('emailConfig parseado de string a objeto');
                    } else {
                        companyConfig.emailConfig = profile.client.emailConfig;
                        console.log('emailConfig ya es un objeto');
                    }
                } else {
                    console.log('emailConfig no encontrado, usando objeto vacío');
                    companyConfig.emailConfig = {};
                }
                
                // Procesar notificationConfig si existe
                if (profile.client.notificationConfig) {
                    console.log('notificationConfig encontrado:', typeof profile.client.notificationConfig);
                    if (typeof profile.client.notificationConfig === 'string') {
                        companyConfig.notificationConfig = JSON.parse(profile.client.notificationConfig);
                        console.log('notificationConfig parseado de string a objeto');
                    } else {
                        companyConfig.notificationConfig = profile.client.notificationConfig;
                        console.log('notificationConfig ya es un objeto');
                    }
                } else {
                    console.log('notificationConfig no encontrado, usando objeto vacío');
                    companyConfig.notificationConfig = {};
                }
            } catch (parseError) {
                console.error('ERROR al procesar campos JSON:', parseError);
                console.error('Detalle del error:', parseError.stack);
                // En caso de error, asignar objetos vacíos para evitar errores posteriores
                companyConfig.botConfig = companyConfig.botConfig || {};
                companyConfig.emailConfig = companyConfig.emailConfig || {};
                companyConfig.notificationConfig = companyConfig.notificationConfig || {};
            }
            
            // Guardar en localStorage para uso futuro
            try {
                localStorage.setItem('companyConfig', JSON.stringify(companyConfig));
            } catch (storageError) {
                console.warn('No se pudo guardar la configuración en localStorage:', storageError);
            }
            
            console.log('Configuración de empresa obtenida:', companyConfig);
            return companyConfig;
        }
        
        // Si no hay configuración en el perfil, intentamos usar localStorage como fallback
        const localConfig = localStorage.getItem('companyConfig');
        if (localConfig) {
            console.log('Usando configuración local como fallback');
            try {
                const config = JSON.parse(localConfig);
                
                // Sincronizar la configuración local con el backend si es necesario
                if (token) {
                    try {
                        await syncLocalConfigWithBackend(config);
                    } catch (syncError) {
                        console.warn('No se pudo sincronizar la configuración local:', syncError);
                    }
                }
                
                return config;
            } catch (parseError) {
                console.error('Error al parsear configuración local:', parseError);
                localStorage.removeItem('companyConfig');
            }
        }
        
        console.warn('No se encontró configuración de empresa');
        return null;
    } catch (error) {
        console.error('Error al cargar configuración de empresa:', error);
        toastr.error('Error al cargar la configuración de la empresa', 'Error');
        // Propagamos el error para manejarlo en el nivel superior
        throw error;
    }
}

/**
 * Sincroniza la configuración local con el backend
 * @param {Object} config - Configuración local
 * @returns {Promise} Promesa que resuelve cuando se completa la sincronización
 */
async function syncLocalConfigWithBackend(config) {
    try {
        console.log('Sincronizando configuración local con el backend...');
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('No hay token de autenticación');
        }
        
        const response = await fetch(API_CONFIG.getFullUrl('/api/config'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al sincronizar configuración');
        }
        
        const result = await response.json();
        console.log('Configuración sincronizada exitosamente:', result);
        return result;
    } catch (error) {
        console.error('Error al sincronizar configuración:', error);
        throw error;
    }
}

/**
 * Redirecciona a la página de configuración inicial
 */
function redirectToSetup() {
    // Notificar al usuario
    toastr.info('Necesitamos algunos datos para configurar tu dashboard', 'Configuración inicial');
    
    // Redireccionar a la página de configuración
    setTimeout(() => {
        window.location.href = 'company-setup.html';
    }, 2000);
}

/**
 * Actualiza el título del dashboard con el nombre de la empresa
 * @param {string} companyName - Nombre de la empresa
 */
function updateDashboardTitle(companyName) {
    console.log('Actualizando título del dashboard:', companyName);
    
    // Actualizar el título en el header
    const titleElement = document.querySelector('.navbar-brand');
    if (titleElement) {
        titleElement.textContent = companyName;
    }
    
    // Actualizar el título de la página
    document.title = `${companyName} - Dashboard`;
    
    // Actualizar cualquier otro elemento que muestre el nombre de la empresa
    const companyNameElements = document.querySelectorAll('.company-name');
    companyNameElements.forEach(element => {
        element.textContent = companyName;
    });
}

/**
 * Actualiza la vista general de la empresa en el dashboard
 * @param {Object} config - Configuración de la empresa
 */
function updateCompanyOverview(config) {
    console.log('Actualizando vista general de la empresa:', config);
    
    // Actualizar nombre de la empresa en elementos específicos
    const companyNameElements = document.querySelectorAll('[data-company-name]');
    companyNameElements.forEach(element => {
        element.textContent = config.companyName || 'Mi Empresa';
    });
    
    // Actualizar información de contacto si existe
    if (config.contactName) {
        const contactElements = document.querySelectorAll('[data-contact-name]');
        contactElements.forEach(element => {
            element.textContent = config.contactName;
        });
    }
    
    // Actualizar teléfono si existe
    if (config.phone) {
        const phoneElements = document.querySelectorAll('[data-company-phone]');
        phoneElements.forEach(element => {
            element.textContent = config.phone;
        });
    }
    
    // Actualizar email si existe
    if (config.email) {
        const emailElements = document.querySelectorAll('[data-company-email]');
        emailElements.forEach(element => {
            element.textContent = config.email;
        });
    }
    
    // Actualizar sector empresarial
    if (config.businessSector || config.sector) {
        const sectorElements = document.querySelectorAll('[data-business-sector]');
        sectorElements.forEach(element => {
            element.textContent = config.businessSector || config.sector;
        });
    }
}

/**
 * Adapta las opciones del menú según la configuración de la empresa
 * @param {Object} config - Configuración de la empresa
 */
function adaptMenuOptions(config) {
    console.log('Adaptando opciones del menú:', config);
    
    // Por ahora, las opciones del menú son estáticas
    // En el futuro se pueden personalizar según el sector o configuración
    
    // Ejemplo: Ocultar/mostrar opciones según el plan del usuario
    if (config.plan && config.plan === 'basic') {
        // Ocultar funciones premium
        const premiumElements = document.querySelectorAll('[data-premium="true"]');
        premiumElements.forEach(element => {
            element.style.display = 'none';
        });
    }
    
    // Ejemplo: Personalizar menú según permisos
    if (config.role && config.role === 'admin') {
        // Mostrar opciones de administrador
        const adminElements = document.querySelectorAll('[data-admin="true"]');
        adminElements.forEach(element => {
            element.style.display = 'block';
        });
    }
}

/**
 * Carga la configuración del bot
 * @param {Object} botConfig - Configuración del bot
 */
function loadBotConfiguration(botConfig) {
    console.log('Cargando configuración del bot:', botConfig);
    
    if (!botConfig) {
        console.log('No hay configuración de bot disponible');
        return;
    }
    
    // Aquí se cargaría la configuración del bot
    // Por ahora solo logueamos para MVP
    try {
        const parsedConfig = typeof botConfig === 'string' ? JSON.parse(botConfig) : botConfig;
        console.log('Configuración del bot parseada:', parsedConfig);
    } catch (error) {
        console.warn('Error al parsear configuración del bot:', error);
    }
}

/**
 * Carga la configuración de email
 * @param {Object} emailConfig - Configuración de email
 */
function loadEmailConfiguration(emailConfig) {
    console.log('Cargando configuración de email:', emailConfig);
    
    if (!emailConfig) {
        console.log('No hay configuración de email disponible');
        return;
    }
    
    // Aquí se cargaría la configuración de email
    // Por ahora solo logueamos para MVP
    try {
        const parsedConfig = typeof emailConfig === 'string' ? JSON.parse(emailConfig) : emailConfig;
        console.log('Configuración de email parseada:', parsedConfig);
    } catch (error) {
        console.warn('Error al parsear configuración de email:', error);
    }
}

/**
 * Carga la configuración de notificaciones
 * @param {Object} notificationConfig - Configuración de notificaciones
 */
function loadNotificationConfiguration(notificationConfig) {
    console.log('Cargando configuración de notificaciones:', notificationConfig);
    
    if (!notificationConfig) {
        console.log('No hay configuración de notificaciones disponible');
        return;
    }
    
    // Aquí se cargaría la configuración de notificaciones
    // Por ahora solo logueamos para MVP
    try {
        const parsedConfig = typeof notificationConfig === 'string' ? JSON.parse(notificationConfig) : notificationConfig;
        console.log('Configuración de notificaciones parseada:', parsedConfig);
    } catch (error) {
        console.warn('Error al parsear configuración de notificaciones:', error);
    }
}

/**
 * Adapta el dashboard según la configuración
 * @param {Object} config - Configuración de la empresa
 */
function adaptDashboard(config) {
    console.log('Adaptando dashboard para:', config.companyName || 'Empresa');
    
    // Ocultar indicador de carga
    const loadingIndicator = document.getElementById('loading-overview');
    if (loadingIndicator) {
        loadingIndicator.classList.add('d-none');
    }
    
    // Verificar que tenemos datos válidos
    if (!config) {
        console.error('No hay configuración disponible para adaptar el dashboard');
        showConfigurationError('No se pudo cargar la configuración de la empresa');
        return;
    }
    
    // Actualizar el título del dashboard con el nombre de la empresa
    updateDashboardTitle(config.companyName || 'Mi Empresa');
    
    // Actualizar la información general de la empresa
    updateCompanyOverview(config);
    
    // Adaptar según el contexto empresarial
    adaptBusinessContext(config);
    
    // Adaptar opciones de menú según sector
    adaptMenuOptions(config);
    
    // Cargar configuración del bot
    if (config.botConfig) {
        loadBotConfiguration(config.botConfig);
    }
    
    // Cargar configuración de email
    if (config.emailConfig) {
        loadEmailConfiguration(config.emailConfig);
    }
    
    // Cargar configuración de notificaciones
    if (config.notificationConfig) {
        loadNotificationConfiguration(config.notificationConfig);
    }
    
    console.log('Dashboard adaptado exitosamente');
    toastr.success('Dashboard cargado correctamente', 'Bienvenido');
}

/**
 * Adapta el dashboard según el contexto empresarial
 */
function adaptBusinessContext(config) {
    console.log('=== ADAPTANDO CONTEXTO EMPRESARIAL ===');
    
    // Obtener el sector empresarial - FORZAR AGENTE DE IA
    let sector = config.businessSector || config.sector || 'otro';
    console.log('Sector empresarial encontrado:', sector);
    console.log('Tipo de dato del sector:', typeof sector);
    
    // FORZAR SECTOR "OTRO" PARA AGENTE DE IA
    console.log('FORZANDO SECTOR "OTRO" PARA AGENTE DE IA');
    sector = 'otro';
    
    // Asegurar que el sector sea una cadena de texto
    if (typeof sector !== 'string') {
        console.warn('El sector no es una cadena de texto, convirtiendo...');
        sector = String(sector);
    }
    
    // Normalizar el sector (minúsculas y trim)
    const normalizedSector = sector.toLowerCase().trim();
    console.log('Sector normalizado:', normalizedSector);
    
    // Mostrar mensaje en la UI
    toastr.info(`Configurando dashboard para sector: ${sector}`, 'Personalización');
    
    // Adaptar contenido según el sector
    console.log('Seleccionando adaptador para el sector...');
    
    try {
        switch(normalizedSector) {
            case 'restaurant':
            case 'restaurante':
                console.log('Aplicando adaptación para RESTAURANTE');
                adaptRestaurantContext(config);
                break;
            case 'beauty':
            case 'belleza':
                console.log('Aplicando adaptación para BELLEZA');
                adaptBeautyContext(config);
                break;
            case 'retail':
            case 'comercio':
                console.log('Aplicando adaptación para COMERCIO/RETAIL');
                adaptRetailContext(config);
                break;
            case 'legal':
            case 'abogado':
                console.log('Aplicando adaptación para LEGAL');
                adaptLegalContext(config);
                break;
            case 'healthcare':
            case 'salud':
                console.log('Aplicando adaptación para SALUD');
                adaptHealthcareContext(config);
                break;
            case 'real estate':
            case 'inmobiliaria':
                console.log('Aplicando adaptación para INMOBILIARIA');
                adaptRealEstateContext(config);
                break;
            case 'otro':
            case 'other':
                console.log('Aplicando adaptación para OTRO/OTHER');
                adaptOtherContextSimple(config);
                break;
            default:
                console.log('Sector no reconocido, aplicando adaptación GENÉRICA');
                adaptGenericContext(config);
                break;
        }
        console.log(`Adaptación para sector '${normalizedSector}' completada con éxito`);
    } catch (error) {
        console.error(`ERROR al adaptar dashboard para sector '${normalizedSector}':`, error);
        console.error('Detalle del error:', error.stack);
        toastr.error('Error al personalizar el dashboard para tu sector', 'Error');
        
        // Intentar usar adaptación genérica como fallback
        try {
            console.log('Intentando adaptación genérica como fallback...');
            adaptGenericContext(config);
        } catch (fallbackError) {
            console.error('ERROR también en adaptación genérica:', fallbackError);
        }
    }
}

/**
 * Adapta el dashboard para un bufete legal
 */
function adaptLegalContext(config) {
    console.log('Adaptando para bufete legal');
    
    // Crear las pestañas dinámicas para sector legal
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) {
        console.warn('No se encontró el contenedor de pestañas específicas del sector');
        return;
    }
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="legal-cases">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-gavel me-2"></i>Casos Legales</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Caso
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Casos Activos</h5>
                </div>
                <div class="card-body">
                    <div id="active-cases">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando casos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="legal-documents">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-file-contract me-2"></i>Documentos Legales</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Documento
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Documentos Recientes</h5>
                </div>
                <div class="card-body">
                    <div id="recent-documents">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando documentos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadLegalData(config);
}

/**
 * Adapta el dashboard para un centro médico
 */
function adaptHealthcareContext(config) {
    console.log('Adaptando para centro médico');
    
    // Crear las pestañas dinámicas para sector salud
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) {
        console.warn('No se encontró el contenedor de pestañas específicas del sector');
        return;
    }
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="appointments">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-calendar-check me-2"></i>Citas Médicas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Cita
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Citas de Hoy</h5>
                </div>
                <div class="card-body">
                    <div id="today-appointments">
                        <div class="text-center py-3">
                            <p class="mt-2 text-muted">No hay citas programadas para hoy.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="patients">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-user-injured me-2"></i>Pacientes</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Paciente
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Pacientes Recientes</h5>
                </div>
                <div class="card-body">
                    <div id="recent-patients">
                        <div class="text-center py-3">
                            <p class="mt-2 text-muted">No hay pacientes recientes.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadHealthcareData(config);
}

/**
 * Adapta el dashboard para una inmobiliaria
 */
function adaptRealEstateContext(config) {
    console.log('Adaptando para inmobiliaria');
    
    // Crear las pestañas dinámicas para sector inmobiliario
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) {
        console.warn('No se encontró el contenedor de pestañas específicas del sector');
        return;
    }
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="properties">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-home me-2"></i>Propiedades</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Propiedad
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Propiedades Destacadas</h5>
                </div>
                <div class="card-body">
                    <div id="featured-properties">
                        <div class="text-center py-3">
                            <p class="mt-2 text-muted">No hay propiedades destacadas.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="clients">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-users me-2"></i>Clientes</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Cliente
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Clientes Potenciales</h5>
                </div>
                <div class="card-body">
                    <div id="potential-clients">
                        <div class="text-center py-3">
                            <p class="mt-2 text-muted">No hay clientes potenciales.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadRealEstateData(config);
}

/**
 * Adapta el contenido para restaurantes
 */
function adaptRestaurantContext(config) {
    // Crear las pestañas dinámicas para restaurantes
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="orders">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-utensils me-2"></i>Gestión de Pedidos</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Pedido
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Pedidos Activos</h5>
                </div>
                <div class="card-body">
                    <div id="active-orders">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando pedidos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="reservations">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-calendar-alt me-2"></i>Gestión de Reservas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Reserva
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Reservas de Hoy</h5>
                </div>
                <div class="card-body">
                    <div id="todays-reservations">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando reservas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadRestaurantData(config);
}

/**
 * Adapta el contenido para peluquerías/estéticas
 */
function adaptBeautyContext(config) {
    // Crear las pestañas dinámicas para peluquerías
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="appointments">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-calendar-check me-2"></i>Gestión de Citas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Cita
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Citas de Hoy</h5>
                </div>
                <div class="card-body">
                    <div id="todays-appointments">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando citas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-pane fade" id="services">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-cut me-2"></i>Servicios</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nuevo Servicio
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Catálogo de Servicios</h5>
                </div>
                <div class="card-body">
                    <div id="service-catalog">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando servicios...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadBeautyData(config);
}

/**
 * Adapta el contenido para comercios/tiendas
 */
function adaptRetailContext(config) {
    console.log('=== ADAPTANDO DASHBOARD PARA SECTOR RETAIL/COMERCIO ===');
    console.log('Configuración recibida:', config);
    
    try {
        // Crear las pestañas dinámicas para comercios
        const tabsContainer = document.getElementById('sector-specific-tabs');
        if (!tabsContainer) {
            console.error('ERROR: No se encontró el contenedor de pestañas específicas del sector (sector-specific-tabs)');
            toastr.error('Error al cargar la interfaz de comercio', 'Error');
            return;
        }
        
        console.log('Generando HTML para pestañas de sector retail...');
        
        // Mostrar mensaje de carga
        tabsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin me-2"></i> Configurando dashboard para comercio/retail...
            </div>
        `;
        
        // Pequeña pausa para asegurar que el mensaje de carga se muestre
        setTimeout(() => {
            // Crear las pestañas para sector retail
            tabsContainer.innerHTML = `
                <div class="tab-pane fade" id="inventory">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-boxes me-2"></i>Inventario</h2>
                        <button class="btn btn-primary" onclick="showNewProductForm()">
                            <i class="fas fa-plus me-2"></i>Nuevo Producto
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Productos con Stock Bajo</h5>
                        </div>
                        <div class="card-body">
                            <div id="low-stock-products">
                                <div class="text-center py-3">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2 text-muted">Cargando inventario...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-pane fade" id="sales">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-shopping-cart me-2"></i>Ventas</h2>
                        <button class="btn btn-primary" onclick="showNewSaleForm()">
                            <i class="fas fa-plus me-2"></i>Nueva Venta
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Ventas Recientes</h5>
                        </div>
                        <div class="card-body">
                            <div id="recent-sales">
                                <div class="text-center py-3">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2 text-muted">Cargando ventas...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('HTML para pestañas de retail generado correctamente');
            
            // Activar la primera pestaña del sector
            try {
                const firstTab = document.querySelector('#sector-specific-tabs .tab-pane');
                if (firstTab) {
                    console.log('Activando primera pestaña:', firstTab.id);
                    firstTab.classList.add('show', 'active');
                    
                    // Activar también el enlace de navegación correspondiente
                    const navLink = document.querySelector(`[data-bs-target="#${firstTab.id}"]`);
                    if (navLink) {
                        navLink.classList.add('active');
                    } else {
                        console.warn('No se encontró el enlace de navegación para la pestaña', firstTab.id);
                    }
                } else {
                    console.warn('No se encontraron pestañas en el contenedor');
                }
            } catch (tabError) {
                console.error('Error al activar la primera pestaña:', tabError);
            }
            
            // Cargar datos desde la API
            console.log('Iniciando carga de datos para retail desde API...');
            loadRetailData(config);
            
        }, 300); // Pequeña pausa para asegurar que el mensaje de carga se muestre
    } catch (error) {
        console.error('ERROR CRÍTICO al adaptar dashboard para retail:', error);
        console.error('Detalle del error:', error.stack);
        toastr.error('Error al configurar el dashboard para comercio', 'Error');
    }
}

/**
 * Función adaptOtherContext eliminada - ahora se usa adaptOtherContextSimple en dashboard-simple.js
 * Esta función ahora simplemente llama a la versión simplificada
 */
function adaptOtherContext(config) {
    try {
        console.log('Adaptando dashboard para sector "otro" - versión simplificada');
        
        // Usar la función simple del MVP
        adaptOtherContextSimple(config);
        
    } catch (error) {
        console.error('Error al adaptar contexto para sector "otro":', error);
        toastr.error('Error al personalizar el dashboard', 'Error');
    }
}

// Cerrar la función principal initializeDynamicDashboard
}
