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
    
    // Obtener el sector empresarial
    let sector = config.businessSector || config.sector || 'generic';
    console.log('Sector empresarial encontrado:', sector);
    console.log('Tipo de dato del sector:', typeof sector);
    
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
                adaptOtherContext(config);
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
 * Adapta el contenido para el sector "otro"
 * @param {Object} config - Configuración de la empresa
 */
function adaptOtherContext(config) {
    console.log('=== ADAPTANDO CONTEXTO PARA SECTOR "OTRO" ===');
    console.log('Configuración recibida:', config);
    
    try {
        // Crear las pestañas dinámicas para el sector "otro"
        const tabsContainer = document.getElementById('sector-specific-tabs');
        if (!tabsContainer) {
            console.error('No se encontró el contenedor de pestañas específicas del sector');
            return;
        }
        
        // Añadir botón de recarga y limpieza de caché en la parte superior
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader) {
            const reloadButton = document.createElement('button');
            reloadButton.className = 'btn btn-outline-secondary ms-2';
            reloadButton.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Recargar datos';
            reloadButton.title = 'Limpiar caché y recargar datos';
            reloadButton.addEventListener('click', clearCacheAndReload);
            
            // Añadir el botón al final del header
            dashboardHeader.appendChild(reloadButton);
        }
        
        // Mostrar mensaje de carga
        tabsContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2 text-muted">Preparando tu dashboard personalizado...</p>
            </div>
        `;
        
        // Definir las pestañas para el sector "otro"
        setTimeout(() => {
            tabsContainer.innerHTML = `
                <!-- Pestaña de Proyectos -->
                <div class="tab-pane fade show active" id="projects">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-project-diagram me-2"></i>Gestión de Proyectos</h2>
                        <button class="btn btn-primary" id="new-project-btn">
                            <i class="fas fa-plus me-2"></i>Nuevo Proyecto
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Proyectos Activos</h5>
                        </div>
                        <div class="card-body">
                            <div id="active-projects">
                                <div class="text-center py-3">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2 text-muted">Cargando proyectos...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Pestaña de Tareas -->
                <div class="tab-pane fade" id="tasks">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-tasks me-2"></i>Gestión de Tareas</h2>
                        <button class="btn btn-primary" id="new-task-btn">
                            <i class="fas fa-plus me-2"></i>Nueva Tarea
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Tareas Pendientes</h5>
                        </div>
                        <div class="card-body">
                            <div id="pending-tasks">
                                <div class="text-center py-3">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2 text-muted">Cargando tareas...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Pestaña de Clientes -->
                <div class="tab-pane fade" id="clients">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2><i class="fas fa-users me-2"></i>Gestión de Clientes</h2>
                        <button class="btn btn-primary" id="new-client-btn">
                            <i class="fas fa-plus me-2"></i>Nuevo Cliente
                        </button>
                    </div>
                    
                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-header bg-white">
                            <h5 class="mb-0">Clientes Activos</h5>
                        </div>
                        <div class="card-body">
                            <div id="active-clients">
                                <div class="text-center py-3">
                                    <div class="spinner-border" role="status"></div>
                                    <p class="mt-2 text-muted">Cargando clientes...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Activar la primera pestaña
            const navTabs = document.getElementById('sector-nav-tabs');
            if (navTabs) {
                // Limpiar pestañas existentes
                navTabs.innerHTML = '';
                
                // Añadir pestañas para el sector "otro"
                const tabs = [
                    { id: 'projects', icon: 'project-diagram', text: 'Proyectos' },
                    { id: 'tasks', icon: 'tasks', text: 'Tareas' },
                    { id: 'clients', icon: 'users', text: 'Clientes' }
                ];
                
                tabs.forEach((tab, index) => {
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    li.innerHTML = `
                        <a class="nav-link ${index === 0 ? 'active' : ''}" 
                           id="${tab.id}-tab" 
                           data-bs-toggle="tab" 
                           href="#${tab.id}" 
                           role="tab">
                            <i class="fas fa-${tab.icon} me-2"></i>${tab.text}
                        </a>
                    `;
                    navTabs.appendChild(li);
                });
                
                // Activar la primera pestaña
                const firstTab = document.getElementById('projects');
                if (firstTab) {
                    firstTab.classList.add('show', 'active');
                }
            } else {
                console.error('No se encontró el contenedor de navegación de pestañas');
            }
            
            // Cargar datos para el sector "otro"
            loadOtherData(config);
            
            console.log('Adaptación para sector "otro" completada con éxito');
            toastr.success('Dashboard personalizado cargado correctamente', 'Listo');
            
        }, 500); // Pequeño retraso para mostrar el spinner
    } catch (error) {
        console.error('Error al adaptar contexto para sector "otro":', error);
        console.error('Detalle del error:', error.stack);
        toastr.error('Error al personalizar el dashboard', 'Error');
        
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
 * Carga datos para el sector "otro"
 */
function loadOtherData(config) {
    console.log('=== CARGANDO DATOS PARA SECTOR "OTRO" ===');
    console.log('Configuración recibida:', config);
    
    try {
        // Verificar que tenemos el ID del cliente
        const clientId = config.clientId || config.id;
        if (!clientId) {
            console.error('No se encontró ID de cliente en la configuración');
            toastr.error('Error al cargar datos: ID de cliente no encontrado', 'Error');
            return;
        }
        
        console.log('ID de cliente:', clientId);
        
        // Obtener token de autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No hay token de autenticación');
            toastr.error('No hay sesión activa', 'Error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Función para cargar datos con manejo de errores y reintentos
        async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 401) {
                        // Token inválido, redirigir al login
                        localStorage.removeItem('auth_token');
                        toastr.error('Tu sesión ha expirado', 'Error');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                        throw new Error('Sesión expirada');
                    }
                    
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.error('Timeout al cargar datos');
                    toastr.warning('La conexión está tardando demasiado. Reintentando...', 'Timeout');
                } else {
                    console.error('Error al cargar datos:', error);
                }
                
                if (retries > 0) {
                    console.log(`Reintentando en ${delay}ms. Intentos restantes: ${retries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchWithRetry(url, options, retries - 1, delay * 2);
                }
                
                throw error;
            }
        }
        
        // Cargar proyectos
        const projectsContainer = document.getElementById('active-projects');
        if (projectsContainer) {
            projectsContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2 text-muted">Cargando proyectos...</p>
                </div>
            `;
            
            // Intentar cargar proyectos desde la API
            fetchWithRetry(
                API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.PROJECTS, clientId)),
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            .then(response => response.json())
            .then(data => {
                console.log('Proyectos cargados:', data);
                
                if (data && data.length > 0) {
                    // Mostrar proyectos reales
                    let projectsHTML = '<div class="list-group">';
                    
                    data.forEach(project => {
                        projectsHTML += `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${project.name || 'Proyecto sin nombre'}</h6>
                                    <p class="text-muted small mb-0">${project.dueDate ? 'Fecha límite: ' + project.dueDate : 'Sin fecha límite'}</p>
                                </div>
                                <span class="badge bg-${getStatusBadge(project.status)} rounded-pill">${project.status || 'Pendiente'}</span>
                            </div>
                        `;
                    });
                    
                    projectsHTML += '</div>';
                    projectsContainer.innerHTML = projectsHTML;
                } else {
                    // Mostrar mensaje de no hay proyectos
                    projectsContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>No hay proyectos</strong><br>
                            No se encontraron proyectos activos. Crea un nuevo proyecto para comenzar.
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error al cargar proyectos:', error);
                
                // Mostrar datos de ejemplo como fallback
                projectsContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error al cargar datos</strong><br>
                        No se pudieron cargar los proyectos desde el servidor. Mostrando datos de ejemplo.
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary retry-projects">
                                <i class="fas fa-sync-alt me-1"></i>Reintentar
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-2 clear-cache">
                                <i class="fas fa-broom me-1"></i>Limpiar caché
                            </button>
                        </div>
                    </div>
                    <div class="list-group">
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Proyecto de ejemplo 1</h6>
                                <p class="text-muted small mb-0">Fecha límite: 31/12/2025</p>
                            </div>
                            <span class="badge bg-primary rounded-pill">En progreso</span>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Proyecto de ejemplo 2</h6>
                                <p class="text-muted small mb-0">Fecha límite: 15/01/2026</p>
                            </div>
                            <span class="badge bg-warning rounded-pill">Pendiente</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Cargar tareas
        const tasksContainer = document.getElementById('pending-tasks');
        if (tasksContainer) {
            tasksContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2 text-muted">Cargando tareas...</p>
                </div>
            `;
            
            // Intentar cargar tareas desde la API
            fetchWithRetry(
                API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.TASKS, clientId)),
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            .then(response => response.json())
            .then(data => {
                console.log('Tareas cargadas:', data);
                
                if (data && data.length > 0) {
                    // Mostrar tareas reales
                    let tasksHTML = '<div class="list-group">';
                    
                    data.forEach(task => {
                        tasksHTML += `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${task.name || 'Tarea sin nombre'}</h6>
                                    <p class="text-muted small mb-0">Prioridad: ${task.priority || 'Media'}</p>
                                </div>
                                <span class="badge bg-${getPriorityBadge(task.priority)} rounded-pill">${task.status || 'Pendiente'}</span>
                            </div>
                        `;
                    });
                    
                    tasksHTML += '</div>';
                    tasksContainer.innerHTML = tasksHTML;
                } else {
                    // Mostrar mensaje de no hay tareas
                    tasksContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>No hay tareas</strong><br>
                            No se encontraron tareas pendientes. Crea una nueva tarea para comenzar.
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error al cargar tareas:', error);
                
                // Mostrar datos de ejemplo como fallback
                tasksContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error al cargar datos</strong><br>
                        No se pudieron cargar las tareas desde el servidor. Mostrando datos de ejemplo.
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary retry-tasks">
                                <i class="fas fa-sync-alt me-1"></i>Reintentar
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-2 clear-cache">
                                <i class="fas fa-broom me-1"></i>Limpiar caché
                            </button>
                        </div>
                    </div>
                    <div class="list-group">
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Tarea de ejemplo 1</h6>
                                <p class="text-muted small mb-0">Prioridad: Alta</p>
                            </div>
                            <span class="badge bg-danger rounded-pill">Urgente</span>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Tarea de ejemplo 2</h6>
                                <p class="text-muted small mb-0">Prioridad: Media</p>
                            </div>
                            <span class="badge bg-warning rounded-pill">Pendiente</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Cargar clientes
        const clientsContainer = document.getElementById('active-clients');
        if (clientsContainer) {
            clientsContainer.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border" role="status"></div>
                    <p class="mt-2 text-muted">Cargando clientes...</p>
                </div>
            `;
            
            // Intentar cargar clientes desde la API
            fetchWithRetry(
                API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.CLIENTS, clientId)),
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
            .then(response => response.json())
            .then(data => {
                console.log('Clientes cargados:', data);
                
                if (data && data.length > 0) {
                    // Mostrar clientes reales
                    let clientsHTML = '<div class="list-group">';
                    
                    data.forEach(client => {
                        clientsHTML += `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${client.name || 'Cliente sin nombre'}</h6>
                                    <p class="text-muted small mb-0">${client.email ? 'Email: ' + client.email : 'Sin email'}</p>
                                </div>
                                <span class="badge bg-${client.active ? 'success' : 'secondary'} rounded-pill">${client.active ? 'Activo' : 'Inactivo'}</span>
                            </div>
                        `;
                    });
                    
                    clientsHTML += '</div>';
                    clientsContainer.innerHTML = clientsHTML;
                } else {
                    // Mostrar mensaje de no hay clientes
                    clientsContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>No hay clientes</strong><br>
                            No se encontraron clientes activos. Crea un nuevo cliente para comenzar.
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error al cargar clientes:', error);
                
                // Mostrar datos de ejemplo como fallback
                clientsContainer.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error al cargar datos</strong><br>
                        No se pudieron cargar los clientes desde el servidor. Mostrando datos de ejemplo.
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary retry-clients">
                                <i class="fas fa-sync-alt me-1"></i>Reintentar
                            </button>
                            <button class="btn btn-sm btn-outline-secondary ms-2 clear-cache">
                                <i class="fas fa-broom me-1"></i>Limpiar caché
                            </button>
                        </div>
                    </div>
                    <div class="list-group">
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Cliente de ejemplo 1</h6>
                                <p class="text-muted small mb-0">Email: cliente1@ejemplo.com</p>
                            </div>
                            <span class="badge bg-success rounded-pill">Activo</span>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">Cliente de ejemplo 2</h6>
                                <p class="text-muted small mb-0">Email: cliente2@ejemplo.com</p>
                            </div>
                            <span class="badge bg-success rounded-pill">Activo</span>
                        </div>
                    </div>
                `;
            });
        }
        
        // Funciones auxiliares para determinar el color de los badges
        function getStatusBadge(status) {
            if (!status) return 'secondary';
            
            status = status.toLowerCase();
            
            switch(status) {
                case 'en progreso':
                case 'in progress':
                    return 'primary';
                case 'completado':
                case 'completed':
                    return 'success';
                case 'pendiente':
                case 'pending':
                    return 'warning';
                case 'cancelado':
                case 'cancelled':
                    return 'danger';
                default:
                    return 'secondary';
            }
        }
        
        function getPriorityBadge(priority) {
            if (!priority) return 'secondary';
            
            priority = priority.toLowerCase();
            
            switch(priority) {
                case 'alta':
                case 'high':
                    return 'danger';
                case 'media':
                case 'medium':
                    return 'warning';
                case 'baja':
                case 'low':
                    return 'info';
                default:
                    return 'secondary';
            }
        }
        
        // Configurar botones
        setTimeout(() => {
            const newProjectBtn = document.getElementById('new-project-btn');
            if (newProjectBtn) {
                newProjectBtn.addEventListener('click', () => {
                    toastr.info('Funcionalidad en desarrollo', 'Próximamente');
                });
            }
            
            const newTaskBtn = document.getElementById('new-task-btn');
            if (newTaskBtn) {
                newTaskBtn.addEventListener('click', () => {
                    toastr.info('Funcionalidad en desarrollo', 'Próximamente');
                });
            }
            
            const newClientBtn = document.getElementById('new-client-btn');
            if (newClientBtn) {
                newClientBtn.addEventListener('click', () => {
                    toastr.info('Funcionalidad en desarrollo', 'Próximamente');
                });
            }
        }, 1500);
        
        // Configurar event listeners para botones de reintento y limpieza de caché
        setTimeout(() => {
            // Botones de reintento para proyectos
            const retryProjectsButtons = document.querySelectorAll('.retry-projects');
            retryProjectsButtons.forEach(button => {
                button.addEventListener('click', () => {
                    console.log('Reintentando carga de proyectos...');
                    const projectsContainer = document.getElementById('active-projects');
                    if (projectsContainer) {
                        projectsContainer.innerHTML = `
                            <div class="text-center py-3">
                                <div class="spinner-border" role="status"></div>
                                <p class="mt-2 text-muted">Cargando proyectos...</p>
                            </div>
                        `;
                        
                        // Recargar solo los proyectos
                        fetchWithRetry(
                            API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.PROJECTS, clientId)),
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    'Cache-Control': 'no-cache, no-store'
                                }
                            }
                        )
                        .then(response => response.json())
                        .then(data => {
                            console.log('Proyectos recargados:', data);
                            toastr.success('Proyectos actualizados correctamente', 'Éxito');
                            
                            // Actualizar la vista con los datos recargados
                            if (data && data.length > 0) {
                                let projectsHTML = '<div class="list-group">';
                                
                                data.forEach(project => {
                                    projectsHTML += `
                                        <div class="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="mb-1">${project.name || 'Proyecto sin nombre'}</h6>
                                                <p class="text-muted small mb-0">${project.dueDate ? 'Fecha límite: ' + project.dueDate : 'Sin fecha límite'}</p>
                                            </div>
                                            <span class="badge bg-${getStatusBadge(project.status)} rounded-pill">${project.status || 'Pendiente'}</span>
                                        </div>
                                    `;
                                });
                                
                                projectsHTML += '</div>';
                                projectsContainer.innerHTML = projectsHTML;
                            } else {
                                projectsContainer.innerHTML = `
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <strong>No hay proyectos</strong><br>
                                        No se encontraron proyectos activos. Crea un nuevo proyecto para comenzar.
                                    </div>
                                `;
                            }
                        })
                        .catch(error => {
                            console.error('Error al recargar proyectos:', error);
                            toastr.error('No se pudieron recargar los proyectos', 'Error');
                            
                            // Mostrar mensaje de error
                            projectsContainer.innerHTML = `
                                <div class="alert alert-danger">
                                    <i class="fas fa-exclamation-circle me-2"></i>
                                    <strong>Error de conexión</strong><br>
                                    No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.
                                    <div class="mt-2">
                                        <button class="btn btn-sm btn-outline-primary retry-projects">
                                            <i class="fas fa-sync-alt me-1"></i>Reintentar
                                        </button>
                                    </div>
                                </div>
                            `;
                            
                            // Reconfigurar el botón de reintento
                            const newRetryButton = projectsContainer.querySelector('.retry-projects');
                            if (newRetryButton) {
                                newRetryButton.addEventListener('click', () => {
                                    const retryEvent = new Event('click');
                                    button.dispatchEvent(retryEvent);
                                });
                            }
                        });
                    }
                });
            });
            
            // Botones de reintento para tareas
            const retryTasksButtons = document.querySelectorAll('.retry-tasks');
            retryTasksButtons.forEach(button => {
                button.addEventListener('click', () => {
                    console.log('Reintentando carga de tareas...');
                    const tasksContainer = document.getElementById('pending-tasks');
                    if (tasksContainer) {
                        tasksContainer.innerHTML = `
                            <div class="text-center py-3">
                                <div class="spinner-border" role="status"></div>
                                <p class="mt-2 text-muted">Cargando tareas...</p>
                            </div>
                        `;
                        
                        // Recargar solo las tareas
                        fetchWithRetry(
                            API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.TASKS, clientId)),
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    'Cache-Control': 'no-cache, no-store'
                                }
                            }
                        )
                        .then(response => response.json())
                        .then(data => {
                            console.log('Tareas recargadas:', data);
                            toastr.success('Tareas actualizadas correctamente', 'Éxito');
                            
                            // Actualizar la vista con los datos recargados
                            if (data && data.length > 0) {
                                let tasksHTML = '<div class="list-group">';
                                
                                data.forEach(task => {
                                    tasksHTML += `
                                        <div class="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="mb-1">${task.name || 'Tarea sin nombre'}</h6>
                                                <p class="text-muted small mb-0">Prioridad: ${task.priority || 'Media'}</p>
                                            </div>
                                            <span class="badge bg-${getPriorityBadge(task.priority)} rounded-pill">${task.status || 'Pendiente'}</span>
                                        </div>
                                    `;
                                });
                                
                                tasksHTML += '</div>';
                                tasksContainer.innerHTML = tasksHTML;
                            } else {
                                tasksContainer.innerHTML = `
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <strong>No hay tareas</strong><br>
                                        No se encontraron tareas pendientes. Crea una nueva tarea para comenzar.
                                    </div>
                                `;
                            }
                        })
                        .catch(error => {
                            console.error('Error al recargar tareas:', error);
                            toastr.error('No se pudieron recargar las tareas', 'Error');
                        });
                    }
                });
            });
            
            // Botones de reintento para clientes
            const retryClientsButtons = document.querySelectorAll('.retry-clients');
            retryClientsButtons.forEach(button => {
                button.addEventListener('click', () => {
                    console.log('Reintentando carga de clientes...');
                    const clientsContainer = document.getElementById('active-clients');
                    if (clientsContainer) {
                        clientsContainer.innerHTML = `
                            <div class="text-center py-3">
                                <div class="spinner-border" role="status"></div>
                                <p class="mt-2 text-muted">Cargando clientes...</p>
                            </div>
                        `;
                        
                        // Recargar solo los clientes
                        fetchWithRetry(
                            API_CONFIG.getFullUrl(API_CONFIG.replaceClientId(API_CONFIG.OTHER.CLIENTS, clientId)),
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    'Cache-Control': 'no-cache, no-store'
                                }
                            }
                        )
                        .then(response => response.json())
                        .then(data => {
                            console.log('Clientes recargados:', data);
                            toastr.success('Clientes actualizados correctamente', 'Éxito');
                            
                            // Actualizar la vista con los datos recargados
                            if (data && data.length > 0) {
                                let clientsHTML = '<div class="list-group">';
                                
                                data.forEach(client => {
                                    clientsHTML += `
                                        <div class="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="mb-1">${client.name || 'Cliente sin nombre'}</h6>
                                                <p class="text-muted small mb-0">${client.email ? 'Email: ' + client.email : 'Sin email'}</p>
                                            </div>
                                            <span class="badge bg-${client.active ? 'success' : 'secondary'} rounded-pill">${client.active ? 'Activo' : 'Inactivo'}</span>
                                        </div>
                                    `;
                                });
                                
                                clientsHTML += '</div>';
                                clientsContainer.innerHTML = clientsHTML;
                            } else {
                                clientsContainer.innerHTML = `
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <strong>No hay clientes</strong><br>
                                        No se encontraron clientes activos. Crea un nuevo cliente para comenzar.
                                    </div>
                                `;
                            }
                        })
                        .catch(error => {
                            console.error('Error al recargar clientes:', error);
                            toastr.error('No se pudieron recargar los clientes', 'Error');
                        });
                    }
                });
            });
            
            // Botones de limpieza de caché
            const clearCacheButtons = document.querySelectorAll('.clear-cache');
            clearCacheButtons.forEach(button => {
                button.addEventListener('click', clearCacheAndReload);
            });
        }, 2000);
        
        console.log('Carga de datos para sector "otro" completada con éxito');
    } catch (error) {
        console.error('Error al cargar datos para sector "otro":', error);
        console.error('Detalle del error:', error.stack);
        toastr.error('Error al cargar datos', 'Error');
    }
}

/**
 * Adapta el contenido para caso genérico
 */
function adaptGenericContext(config) {
    // Crear las pestañas dinámicas para caso genérico
    const tabsContainer = document.getElementById('sector-specific-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = `
        <div class="tab-pane fade" id="tasks">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="fas fa-tasks me-2"></i>Gestión de Tareas</h2>
                <button class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Nueva Tarea
                </button>
            </div>
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Tareas Pendientes</h5>
                </div>
                <div class="card-body">
                    <div id="pending-tasks">
                        <div class="text-center py-3">
                            <div class="spinner-border" role="status"></div>
                            <p class="mt-2 text-muted">Cargando tareas...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Cargar datos desde la API
    loadGenericData(config);
}

/**
 * Carga datos para restaurantes desde API
 */
function loadRestaurantData(config) {
    const clientId = config.clientId;
    
    // Cargar pedidos activos
    const ordersContainer = document.getElementById('active-orders');
    if (ordersContainer) {
        // Realizar petición a la API
        fetch(`/api/clients/${clientId}/orders/active`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar los pedidos');
                }
                return response.json();
            })
            .then(data => {
                if (data.orders && data.orders.length > 0) {
                    // Renderizar pedidos
                    let ordersHTML = '<div class="table-responsive"><table class="table table-hover">';
                    ordersHTML += '<thead><tr><th>ID</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>';
                    ordersHTML += '<tbody>';
                    
                    data.orders.forEach(order => {
                        ordersHTML += `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.clientName}</td>
                                <td>${order.items.length} items</td>
                                <td>${order.total.toFixed(2)} €</td>
                                <td><span class="badge bg-${getStatusBadgeClass(order.status)}">${order.status}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewOrderDetails(${order.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="updateOrderStatus(${order.id})">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    ordersHTML += '</tbody></table></div>';
                    ordersContainer.innerHTML = ordersHTML;
                } else {
                    // Mostrar mensaje de no hay pedidos
                    ordersContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay pedidos activos en este momento.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                // Mostrar mensaje de error
                ordersContainer.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar los pedidos: ${error.message}
                    </div>
                    <button class="btn btn-outline-primary mt-2" onclick="loadRestaurantData(${JSON.stringify(config)})">
                        <i class="fas fa-sync-alt me-2"></i>Reintentar
                    </button>
                `;
                console.error('Error:', error);
            });
    }
    
    // Cargar reservas de hoy
    const reservationsContainer = document.getElementById('todays-reservations');
    if (reservationsContainer) {
        fetch(`/api/clients/${clientId}/reservations/today`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar reservas'))
            .then(data => {
                if (data.reservations && data.reservations.length > 0) {
                    let html = generarTablaReservas(data.reservations);
                    reservationsContainer.innerHTML = html;
                } else {
                    reservationsContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-calendar-day fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay reservas para hoy.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(reservationsContainer, error, 'reservas', () => loadRestaurantData(config));
            });
    }
}

/**
 * Carga datos para peluquería/estética desde API
 */
function loadBeautyData(config) {
    const clientId = config.clientId;
    
    // Cargar citas de hoy
    const appointmentsContainer = document.getElementById('todays-appointments');
    if (appointmentsContainer) {
        fetch(`/api/clients/${clientId}/appointments/today`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar citas'))
            .then(data => {
                if (data.appointments && data.appointments.length > 0) {
                    let html = generarTablaCitas(data.appointments);
                    appointmentsContainer.innerHTML = html;
                } else {
                    appointmentsContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-calendar-check fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay citas programadas para hoy.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(appointmentsContainer, error, 'citas', () => loadBeautyData(config));
            });
    }
    
    // Cargar servicios
    const servicesContainer = document.getElementById('service-catalog');
    if (servicesContainer) {
        fetch(`/api/clients/${clientId}/services`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar servicios'))
            .then(data => {
                if (data.services && data.services.length > 0) {
                    // Renderizar servicios en tarjetas
                    let html = '<div class="row">';
                    
                    data.services.forEach(service => {
                        html += `
                            <div class="col-md-4 mb-3">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">${service.name}</h5>
                                        <p class="card-text">${service.description || 'Sin descripción'}</p>
                                        <p class="card-text text-primary fw-bold">${service.price.toFixed(2)} €</p>
                                        <p class="card-text"><small class="text-muted">Duración: ${service.duration} min.</small></p>
                                    </div>
                                    <div class="card-footer bg-white">
                                        <button class="btn btn-sm btn-outline-primary" onclick="editService(${service.id})">
                                            <i class="fas fa-edit me-1"></i> Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    servicesContainer.innerHTML = html;
                } else {
                    servicesContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-cut fa-3x text-muted mb-3"></i>
                            <p class="text-muted">No hay servicios configurados.</p>
                            <button class="btn btn-primary mt-2" onclick="addNewService()">
                                <i class="fas fa-plus me-2"></i>Añadir Servicio
                            </button>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(servicesContainer, error, 'servicios', () => loadBeautyData(config));
            });
    }
}

/**
 * Carga datos para comercio/tienda desde API
 */
function loadRetailData(config) {
    console.log('=== CARGANDO DATOS PARA SECTOR RETAIL ===');
    
    // Verificar que tenemos un ID de cliente válido
    const clientId = config.id || config.clientId;
    if (!clientId) {
        console.error('ERROR: No se encontró ID de cliente en la configuración');
        console.log('Configuración recibida:', config);
        toastr.error('Error al cargar datos: ID de cliente no encontrado', 'Error');
        return;
    }
    
    console.log('ID de cliente:', clientId);
    
    // Cargar productos con stock bajo
    const lowStockContainer = document.getElementById('low-stock-products');
    if (lowStockContainer) {
        console.log('Cargando productos con stock bajo...');
        
        // Mostrar mensaje de carga
        lowStockContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2 text-muted">Cargando inventario...</p>
            </div>
        `;
        
        // Construir URL de la API
        const apiUrl = API_CONFIG.getFullUrl(`/api/clients/${clientId}/inventory/low-stock`);
        console.log('URL de API para inventario:', apiUrl);
        
        // Obtener token de autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No hay token de autenticación para cargar datos de inventario');
            mostrarError(lowStockContainer, 'No hay sesión activa', 'inventario', null);
            return;
        }
        
        // Realizar petición a la API
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Respuesta de API de inventario recibida. Status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Error de autenticación (401) al cargar inventario');
                    throw new Error('Sesión expirada');
                }
                
                if (response.status === 404) {
                    console.warn('No se encontraron datos de inventario (404)');
                    // Mostrar datos de ejemplo para desarrollo/testing
                    return { products: [] };
                }
                
                throw new Error(`Error al cargar inventario: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Datos de inventario recibidos:', data);
            
            if (data.products && data.products.length > 0) {
                console.log(`Se encontraron ${data.products.length} productos con stock bajo`);
                
                // Renderizar productos
                let html = '<div class="table-responsive"><table class="table">';
                html += '<thead><tr><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Acciones</th></tr></thead>';
                html += '<tbody>';
                
                data.products.forEach(product => {
                    const stockClass = product.currentStock <= product.criticalStock ? 'text-danger fw-bold' : 'text-warning';
                    
                    html += `
                        <tr>
                            <td>${product.name}</td>
                            <td class="${stockClass}">${product.currentStock} unidades</td>
                            <td>${product.minimumStock} unidades</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="restockProduct(${product.id})">
                                    <i class="fas fa-plus me-1"></i> Reponer
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
                lowStockContainer.innerHTML = html;
                console.log('Tabla de inventario renderizada correctamente');
            } else {
                console.log('No hay productos con stock bajo');
                lowStockContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <p class="text-muted">No hay productos con stock bajo actualmente.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error al cargar datos de inventario:', error);
            mostrarError(lowStockContainer, error.message || 'Error al cargar inventario', 'inventario', () => loadRetailData(config));
        });
    } else {
        console.warn('No se encontró el contenedor para productos con stock bajo');
    }
    
    // Cargar ventas recientes
    const recentSalesContainer = document.getElementById('recent-sales');
    if (recentSalesContainer) {
        console.log('Cargando ventas recientes...');
        
        // Mostrar mensaje de carga
        recentSalesContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border" role="status"></div>
                <p class="mt-2 text-muted">Cargando ventas...</p>
            </div>
        `;
        
        // Construir URL de la API
        const apiUrl = API_CONFIG.getFullUrl(`/api/clients/${clientId}/sales/recent`);
        console.log('URL de API para ventas:', apiUrl);
        
        // Obtener token de autenticación
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No hay token de autenticación para cargar datos de ventas');
            mostrarError(recentSalesContainer, 'No hay sesión activa', 'ventas', null);
            return;
        }
        
        // Realizar petición a la API
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Respuesta de API de ventas recibida. Status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Error de autenticación (401) al cargar ventas');
                    throw new Error('Sesión expirada');
                }
                
                if (response.status === 404) {
                    console.warn('No se encontraron datos de ventas (404)');
                    // Mostrar datos de ejemplo para desarrollo/testing
                    return { sales: [] };
                }
                
                throw new Error(`Error al cargar ventas: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Datos de ventas recibidos:', data);
            
            if (data.sales && data.sales.length > 0) {
                console.log(`Se encontraron ${data.sales.length} ventas recientes`);
                
                // Renderizar ventas recientes
                try {
                    let html = generarTablaVentas(data.sales);
                    recentSalesContainer.innerHTML = html;
                    console.log('Tabla de ventas renderizada correctamente');
                } catch (renderError) {
                    console.error('Error al renderizar tabla de ventas:', renderError);
                    recentSalesContainer.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error al mostrar las ventas: ${renderError.message}
                        </div>
                    `;
                }
            } else {
                console.log('No hay ventas recientes');
                recentSalesContainer.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No hay ventas recientes.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error al cargar datos de ventas:', error);
            mostrarError(recentSalesContainer, error.message || 'Error al cargar ventas', 'ventas', () => loadRetailData(config));
        });
    } else {
        console.warn('No se encontró el contenedor para ventas recientes');
    }
    
    console.log('Carga de datos para retail iniciada correctamente');
}

/**
 * Carga datos para caso genérico desde API
 */
function loadGenericData(config) {
    const clientId = config.clientId;
    
    // Cargar tareas pendientes
    const tasksContainer = document.getElementById('pending-tasks');
    if (tasksContainer) {
        fetch(`/api/clients/${clientId}/tasks/pending`)
            .then(response => response.ok ? response.json() : Promise.reject('Error al cargar tareas'))
            .then(data => {
                if (data.tasks && data.tasks.length > 0) {
                    // Renderizar tareas
                    let html = '<ul class="list-group">';
                    
                    data.tasks.forEach(task => {
                        // Determinar clase según prioridad
                        let priorityClass = '';
                        let priorityIcon = '';
                        
                        switch (task.priority) {
                            case 'high':
                                priorityClass = 'border-danger';
                                priorityIcon = '<i class="fas fa-exclamation-circle text-danger me-2"></i>';
                                break;
                            case 'medium':
                                priorityClass = 'border-warning';
                                priorityIcon = '<i class="fas fa-exclamation-triangle text-warning me-2"></i>';
                                break;
                            default:
                                priorityClass = '';
                                priorityIcon = '<i class="fas fa-info-circle text-info me-2"></i>';
                        }
                        
                        html += `
                            <li class="list-group-item ${priorityClass}">
                                <div class="d-flex w-100 justify-content-between align-items-center">
                                    <div>
                                        ${priorityIcon}
                                        <span class="fw-bold">${task.title}</span>
                                        <p class="mb-1 text-muted small">${task.description || ''}</p>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-outline-success" onclick="completeTask(${task.id})">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </li>
                        `;
                    });
                    
                    html += '</ul>';
                    tasksContainer.innerHTML = html;
                } else {
                    tasksContainer.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-clipboard-check fa-3x text-success mb-3"></i>
                            <p class="text-muted">No hay tareas pendientes.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                mostrarError(tasksContainer, error, 'tareas', () => loadGenericData(config));
            });
    }
}

/**
 * Carga datos legales desde la API
 */
function loadLegalData(config) {
    console.log('Cargando datos legales para:', config.companyName);
    const clientId = config.clientId || config.id;
    
    // Cargar casos activos
    const activeCasesContainer = document.getElementById('active-cases');
    if (activeCasesContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/legal/cases`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar casos legales');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.cases && data.cases.length > 0) {
                        renderLegalCases(data.cases, activeCasesContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleLegalCases(activeCasesContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar casos legales:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleLegalCases(activeCasesContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleLegalCases(activeCasesContainer);
        }
    }
    
    // Cargar documentos recientes
    const recentDocumentsContainer = document.getElementById('recent-documents');
    if (recentDocumentsContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/legal/documents`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar documentos legales');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.documents && data.documents.length > 0) {
                        renderLegalDocuments(data.documents, recentDocumentsContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleLegalDocuments(recentDocumentsContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar documentos legales:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleLegalDocuments(recentDocumentsContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleLegalDocuments(recentDocumentsContainer);
        }
    }
}

/**
 * Renderiza casos legales de ejemplo
 */
function renderExampleLegalCases(container) {
    container.innerHTML = `
        <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">Caso #2023-05</span>
                    <p class="mb-1 text-muted small">Demanda por incumplimiento de contrato</p>
                </div>
                <span class="badge bg-primary rounded-pill">Activo</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">Caso #2023-08</span>
                    <p class="mb-1 text-muted small">Asesoramiento legal corporativo</p>
                </div>
                <span class="badge bg-warning text-dark rounded-pill">Pendiente</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">Caso #2023-12</span>
                    <p class="mb-1 text-muted small">Revisión de documentación</p>
                </div>
                <span class="badge bg-info rounded-pill">En revisión</span>
            </li>
        </ul>
    `;
}

/**
 * Renderiza documentos legales de ejemplo
 */
function renderExampleLegalDocuments(container) {
    container.innerHTML = `
        <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-file-pdf me-2 text-danger"></i>
                    <span class="fw-bold">Contrato_Servicios.pdf</span>
                </div>
                <div>
                    <span class="badge bg-light text-dark me-2">10/07/2025</span>
                    <button class="btn btn-sm btn-outline-primary"><i class="fas fa-download"></i></button>
                </div>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-file-word me-2 text-primary"></i>
                    <span class="fw-bold">Demanda_Inicial.docx</span>
                </div>
                <div>
                    <span class="badge bg-light text-dark me-2">05/07/2025</span>
                    <button class="btn btn-sm btn-outline-primary"><i class="fas fa-download"></i></button>
                </div>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-file-excel me-2 text-success"></i>
                    <span class="fw-bold">Gastos_Caso.xlsx</span>
                </div>
                <div>
                    <span class="badge bg-light text-dark me-2">01/07/2025</span>
                    <button class="btn btn-sm btn-outline-primary"><i class="fas fa-download"></i></button>
                </div>
            </li>
        </ul>
    `;
}

/**
 * Renderiza casos legales reales
 */
function renderLegalCases(cases, container) {
    let html = '<ul class="list-group">';
    
    cases.forEach(legalCase => {
        // Determinar clase según estado
        let badgeClass = '';
        switch (legalCase.status.toLowerCase()) {
            case 'active':
            case 'activo':
                badgeClass = 'bg-primary';
                break;
            case 'pending':
            case 'pendiente':
                badgeClass = 'bg-warning text-dark';
                break;
            case 'review':
            case 'revisión':
                badgeClass = 'bg-info';
                break;
            case 'closed':
            case 'cerrado':
                badgeClass = 'bg-secondary';
                break;
            default:
                badgeClass = 'bg-light text-dark';
        }
        
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${legalCase.caseNumber || legalCase.id}</span>
                    <p class="mb-1 text-muted small">${legalCase.description || legalCase.title}</p>
                </div>
                <span class="badge ${badgeClass} rounded-pill">${legalCase.status}</span>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

/**
 * Renderiza documentos legales reales
 */
function renderLegalDocuments(documents, container) {
    let html = '<ul class="list-group">';
    
    documents.forEach(doc => {
        // Determinar icono según tipo de documento
        let iconClass = '';
        let iconColor = '';
        
        const fileExt = doc.fileName ? doc.fileName.split('.').pop().toLowerCase() : '';
        
        switch (fileExt) {
            case 'pdf':
                iconClass = 'fa-file-pdf';
                iconColor = 'text-danger';
                break;
            case 'doc':
            case 'docx':
                iconClass = 'fa-file-word';
                iconColor = 'text-primary';
                break;
            case 'xls':
            case 'xlsx':
                iconClass = 'fa-file-excel';
                iconColor = 'text-success';
                break;
            case 'ppt':
            case 'pptx':
                iconClass = 'fa-file-powerpoint';
                iconColor = 'text-warning';
                break;
            default:
                iconClass = 'fa-file';
                iconColor = 'text-secondary';
        }
        
        // Formatear fecha
        const date = doc.date ? new Date(doc.date) : new Date();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas ${iconClass} me-2 ${iconColor}"></i>
                    <span class="fw-bold">${doc.fileName || doc.title}</span>
                </div>
                <div>
                    <span class="badge bg-light text-dark me-2">${formattedDate}</span>
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadDocument('${doc.id}')"><i class="fas fa-download"></i></button>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

/**
 * Carga datos de salud desde la API
 */
function loadHealthcareData(config) {
    console.log('Cargando datos de salud para:', config.companyName);
    const clientId = config.clientId || config.id;
    
    // Cargar citas de hoy
    const todayAppointmentsContainer = document.getElementById('today-appointments');
    if (todayAppointmentsContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/healthcare/appointments/today`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar citas de hoy');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.appointments && data.appointments.length > 0) {
                        renderHealthcareAppointments(data.appointments, todayAppointmentsContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleHealthcareAppointments(todayAppointmentsContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar citas de hoy:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleHealthcareAppointments(todayAppointmentsContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleHealthcareAppointments(todayAppointmentsContainer);
        }
    }
    
    // Cargar pacientes recientes
    const recentPatientsContainer = document.getElementById('recent-patients');
    if (recentPatientsContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/healthcare/patients/recent`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar pacientes recientes');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.patients && data.patients.length > 0) {
                        renderHealthcarePatients(data.patients, recentPatientsContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleHealthcarePatients(recentPatientsContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar pacientes recientes:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleHealthcarePatients(recentPatientsContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleHealthcarePatients(recentPatientsContainer);
        }
    }
}

/**
 * Renderiza citas médicas de ejemplo
 */
function renderExampleHealthcareAppointments(container) {
    container.innerHTML = `
        <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">09:00</span> - Juan Pérez
                    <span class="badge bg-info text-white ms-2">Consulta</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-success me-1"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger"><i class="fas fa-times"></i></button>
                </div>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">11:30</span> - María López
                    <span class="badge bg-warning text-dark ms-2">Seguimiento</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-success me-1"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger"><i class="fas fa-times"></i></button>
                </div>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">16:15</span> - Carlos Ruiz
                    <span class="badge bg-danger text-white ms-2">Urgencia</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-success me-1"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger"><i class="fas fa-times"></i></button>
                </div>
            </li>
        </ul>
    `;
}

/**
 * Renderiza pacientes recientes de ejemplo
 */
function renderExampleHealthcarePatients(container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Edad</th>
                        <th>Última Visita</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Juan Pérez</td>
                        <td>45</td>
                        <td>10/07/2025</td>
                        <td><span class="badge bg-success">Activo</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                    <tr>
                        <td>María López</td>
                        <td>32</td>
                        <td>05/07/2025</td>
                        <td><span class="badge bg-success">Activo</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                    <tr>
                        <td>Carlos Ruiz</td>
                        <td>58</td>
                        <td>13/07/2025</td>
                        <td><span class="badge bg-warning">Seguimiento</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Renderiza citas médicas reales
 */
function renderHealthcareAppointments(appointments, container) {
    let html = '<ul class="list-group">';
    
    appointments.forEach(appointment => {
        // Determinar clase según tipo de cita
        let badgeClass = '';
        let badgeText = appointment.type || 'Consulta';
        
        switch (appointment.type ? appointment.type.toLowerCase() : '') {
            case 'urgency':
            case 'urgencia':
                badgeClass = 'bg-danger text-white';
                badgeText = 'Urgencia';
                break;
            case 'followup':
            case 'seguimiento':
                badgeClass = 'bg-warning text-dark';
                badgeText = 'Seguimiento';
                break;
            case 'checkup':
            case 'revisión':
                badgeClass = 'bg-info text-white';
                badgeText = 'Revisión';
                break;
            default:
                badgeClass = 'bg-info text-white';
                badgeText = 'Consulta';
        }
        
        // Formatear hora
        let time = '';
        if (appointment.time) {
            time = appointment.time;
        } else if (appointment.date) {
            const date = new Date(appointment.date);
            time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${time}</span> - ${appointment.patientName}
                    <span class="badge ${badgeClass} ms-2">${badgeText}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-success me-1" onclick="completeAppointment('${appointment.id}')"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment('${appointment.id}')"><i class="fas fa-times"></i></button>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

/**
 * Renderiza pacientes reales
 */
function renderHealthcarePatients(patients, container) {
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Edad</th>
                        <th>Última Visita</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    patients.forEach(patient => {
        // Determinar estado del paciente
        let statusClass = '';
        let statusText = patient.status || 'Activo';
        
        switch (patient.status ? patient.status.toLowerCase() : '') {
            case 'active':
            case 'activo':
                statusClass = 'bg-success';
                statusText = 'Activo';
                break;
            case 'followup':
            case 'seguimiento':
                statusClass = 'bg-warning';
                statusText = 'Seguimiento';
                break;
            case 'inactive':
            case 'inactivo':
                statusClass = 'bg-secondary';
                statusText = 'Inactivo';
                break;
            default:
                statusClass = 'bg-success';
                statusText = 'Activo';
        }
        
        // Formatear fecha de última visita
        let lastVisit = '';
        if (patient.lastVisit) {
            const date = new Date(patient.lastVisit);
            lastVisit = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }
        
        html += `
            <tr>
                <td>${patient.name}</td>
                <td>${patient.age || '-'}</td>
                <td>${lastVisit || '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewPatient('${patient.id}')"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Carga datos inmobiliarios desde la API
 */
function loadRealEstateData(config) {
    console.log('Cargando datos inmobiliarios para:', config.companyName);
    const clientId = config.clientId || config.id;
    
    // Cargar propiedades destacadas
    const featuredPropertiesContainer = document.getElementById('featured-properties');
    if (featuredPropertiesContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/realestate/properties/featured`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar propiedades destacadas');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.properties && data.properties.length > 0) {
                        renderRealEstateProperties(data.properties, featuredPropertiesContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleRealEstateProperties(featuredPropertiesContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar propiedades destacadas:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleRealEstateProperties(featuredPropertiesContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleRealEstateProperties(featuredPropertiesContainer);
        }
    }
    
    // Cargar clientes potenciales
    const potentialClientsContainer = document.getElementById('potential-clients');
    if (potentialClientsContainer) {
        // Intentar cargar desde la API si está disponible
        if (clientId) {
            fetch(`/api/clients/${clientId}/realestate/leads`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al cargar clientes potenciales');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.leads && data.leads.length > 0) {
                        renderRealEstateLeads(data.leads, potentialClientsContainer);
                    } else {
                        // Mostrar datos de ejemplo si no hay datos reales
                        renderExampleRealEstateLeads(potentialClientsContainer);
                    }
                })
                .catch(error => {
                    console.warn('Error al cargar clientes potenciales:', error);
                    // Mostrar datos de ejemplo en caso de error
                    renderExampleRealEstateLeads(potentialClientsContainer);
                });
        } else {
            // Mostrar datos de ejemplo si no hay ID de cliente
            renderExampleRealEstateLeads(potentialClientsContainer);
        }
    }
}

/**
 * Renderiza propiedades inmobiliarias de ejemplo
 */
function renderExampleRealEstateProperties(container) {
    container.innerHTML = `
        <div class="row">
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="https://via.placeholder.com/300x200" class="card-img-top" alt="Propiedad">
                    <div class="card-body">
                        <h5 class="card-title">Apartamento en Centro</h5>
                        <p class="card-text">2 hab, 1 baño, 75m²</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-success">En venta</span>
                            <span class="fw-bold">€180,000</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i> Ver detalles</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="https://via.placeholder.com/300x200" class="card-img-top" alt="Propiedad">
                    <div class="card-body">
                        <h5 class="card-title">Chalet en Zona Norte</h5>
                        <p class="card-text">4 hab, 3 baños, 220m²</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-success">En venta</span>
                            <span class="fw-bold">€350,000</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i> Ver detalles</button>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="https://via.placeholder.com/300x200" class="card-img-top" alt="Propiedad">
                    <div class="card-body">
                        <h5 class="card-title">Estudio en Zona Universitaria</h5>
                        <p class="card-text">1 hab, 1 baño, 45m²</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-info">En alquiler</span>
                            <span class="fw-bold">€650/mes</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i> Ver detalles</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza clientes potenciales inmobiliarios de ejemplo
 */
function renderExampleRealEstateLeads(container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Interés</th>
                        <th>Presupuesto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div>
                                <span class="fw-bold">Ana Martínez</span>
                                <div class="small text-muted">ana.martinez@email.com</div>
                            </div>
                        </td>
                        <td>Apartamento 2 hab</td>
                        <td>€150,000 - €200,000</td>
                        <td><span class="badge bg-success">Activo</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-outline-success"><i class="fas fa-phone"></i></button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>
                                <span class="fw-bold">Roberto Sánchez</span>
                                <div class="small text-muted">roberto.sanchez@email.com</div>
                            </div>
                        </td>
                        <td>Chalet 4+ hab</td>
                        <td>€300,000 - €400,000</td>
                        <td><span class="badge bg-warning">Pendiente</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-outline-success"><i class="fas fa-phone"></i></button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>
                                <span class="fw-bold">Carmen López</span>
                                <div class="small text-muted">carmen.lopez@email.com</div>
                            </div>
                        </td>
                        <td>Local comercial</td>
                        <td>€1,200 - €1,800/mes</td>
                        <td><span class="badge bg-info">Nuevo</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-outline-success"><i class="fas fa-phone"></i></button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Renderiza propiedades inmobiliarias reales
 */
function renderRealEstateProperties(properties, container) {
    let html = '<div class="row">';
    
    properties.forEach(property => {
        // Determinar tipo de propiedad (venta/alquiler)
        let badgeClass = '';
        let badgeText = '';
        let priceText = '';
        
        if (property.forRent) {
            badgeClass = 'bg-info';
            badgeText = 'En alquiler';
            priceText = `€${property.price || 0}/mes`;
        } else {
            badgeClass = 'bg-success';
            badgeText = 'En venta';
            priceText = `€${property.price || 0}`;
        }
        
        // Formatear descripción de la propiedad
        const rooms = property.rooms || 0;
        const bathrooms = property.bathrooms || 0;
        const area = property.area || 0;
        const description = `${rooms} hab, ${bathrooms} baño${bathrooms !== 1 ? 's' : ''}, ${area}m²`;
        
        // Imagen por defecto si no hay
        const imageUrl = property.imageUrl || 'https://via.placeholder.com/300x200';
        
        html += `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <img src="${imageUrl}" class="card-img-top" alt="${property.title || 'Propiedad'}">
                    <div class="card-body">
                        <h5 class="card-title">${property.title || 'Propiedad sin título'}</h5>
                        <p class="card-text">${description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${badgeClass}">${badgeText}</span>
                            <span class="fw-bold">${priceText}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewProperty('${property.id}')"><i class="fas fa-eye"></i> Ver detalles</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Renderiza clientes potenciales inmobiliarios reales
 */
function renderRealEstateLeads(leads, container) {
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Interés</th>
                        <th>Presupuesto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    leads.forEach(lead => {
        // Determinar estado del cliente potencial
        let statusClass = '';
        let statusText = lead.status || 'Nuevo';
        
        switch (lead.status ? lead.status.toLowerCase() : '') {
            case 'active':
            case 'activo':
                statusClass = 'bg-success';
                statusText = 'Activo';
                break;
            case 'pending':
            case 'pendiente':
                statusClass = 'bg-warning';
                statusText = 'Pendiente';
                break;
            case 'new':
            case 'nuevo':
                statusClass = 'bg-info';
                statusText = 'Nuevo';
                break;
            case 'closed':
            case 'cerrado':
                statusClass = 'bg-secondary';
                statusText = 'Cerrado';
                break;
            default:
                statusClass = 'bg-info';
                statusText = 'Nuevo';
        }
        
        // Formatear presupuesto
        let budget = '';
        if (lead.budgetMin && lead.budgetMax) {
            if (lead.forRent) {
                budget = `€${lead.budgetMin} - €${lead.budgetMax}/mes`;
            } else {
                budget = `€${lead.budgetMin} - €${lead.budgetMax}`;
            }
        } else if (lead.budget) {
            if (lead.forRent) {
                budget = `€${lead.budget}/mes`;
            } else {
                budget = `€${lead.budget}`;
            }
        } else {
            budget = 'No especificado';
        }
        
        html += `
            <tr>
                <td>
                    <div>
                        <span class="fw-bold">${lead.name || 'Cliente sin nombre'}</span>
                        <div class="small text-muted">${lead.email || ''}</div>
                    </div>
                </td>
                <td>${lead.interest || 'No especificado'}</td>
                <td>${budget}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewLead('${lead.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-outline-success" onclick="contactLead('${lead.id}')"><i class="fas fa-phone"></i></button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Genera una tabla HTML para mostrar reservas
 */
function generarTablaReservas(reservations) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>Hora</th><th>Cliente</th><th>Personas</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    reservations.forEach(reservation => {
        html += `
            <tr>
                <td>${reservation.time}</td>
                <td>${reservation.clientName}</td>
                <td>${reservation.peopleCount}</td>
                <td>${reservation.phone}</td>
                <td><span class="badge bg-${getReservationBadgeClass(reservation.status)}">${reservation.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewReservationDetails(${reservation.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="confirmReservation(${reservation.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Genera una tabla HTML para mostrar citas
 */
function generarTablaCitas(appointments) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Duración</th><th>Estado</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    appointments.forEach(appointment => {
        html += `
            <tr>
                <td>${appointment.time}</td>
                <td>${appointment.clientName}</td>
                <td>${appointment.serviceName}</td>
                <td>${appointment.duration} min</td>
                <td><span class="badge bg-${getAppointmentBadgeClass(appointment.status)}">${appointment.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewAppointmentDetails(${appointment.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="completeAppointment(${appointment.id})">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Genera una tabla HTML para mostrar ventas
 */
function generarTablaVentas(sales) {
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Items</th><th>Total</th><th>Acciones</th></tr></thead>';
    html += '<tbody>';
    
    sales.forEach(sale => {
        html += `
            <tr>
                <td>#${sale.id}</td>
                <td>${sale.date}</td>
                <td>${sale.clientName || 'Cliente anónimo'}</td>
                <td>${sale.itemCount} productos</td>
                <td>${sale.total.toFixed(2)} €</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewSaleDetails(${sale.id})">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

/**
 * Muestra un mensaje de error en un contenedor
 * @param {HTMLElement} container - Contenedor donde mostrar el error
 * @param {Error|string} error - Error o mensaje de error
 * @param {string} tipo - Tipo de contenido que falló (ej: 'inventario', 'ventas')
 * @param {Function|null} retryFunction - Función para reintentar la carga, o null si no hay reintento
 */
function mostrarError(container, error, tipo, retryFunction) {
    console.error(`Error al cargar ${tipo}:`, error);
    
    // Construir mensaje de error
    let errorMessage = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar ${tipo}: ${error.message || error}
        </div>
    `;
    
    // Añadir botón de reintento solo si hay función de reintento
    if (retryFunction && typeof retryFunction === 'function') {
        errorMessage += `
            <button class="btn btn-outline-primary mt-2" id="retry-${tipo}">
                <i class="fas fa-sync-alt me-2"></i>Reintentar
            </button>
        `;
    }
    
    // Actualizar contenido del contenedor
    container.innerHTML = errorMessage;
    
    // Añadir event listener al botón de reintento si existe
    if (retryFunction && typeof retryFunction === 'function') {
        const retryButton = document.getElementById(`retry-${tipo}`);
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                console.log(`Reintentando carga de ${tipo}...`);
                container.innerHTML = `
                    <div class="text-center py-3">
                        <div class="spinner-border" role="status"></div>
                        <p class="mt-2 text-muted">Reintentando cargar ${tipo}...</p>
                    </div>
                `;
                setTimeout(() => retryFunction(), 500);
            });
        }
    }
    
    // Notificar al usuario
    toastr.error(`Error al cargar ${tipo}. Consulta la consola para más detalles.`, 'Error');
}

/**
 * Devuelve la clase CSS para el badge según el estado del pedido
 */
function getStatusBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'pending': return 'warning';
        case 'preparing': return 'info';
        case 'ready': return 'primary';
        case 'delivered': return 'success';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

/**
 * Devuelve la clase CSS para el badge según el estado de la reserva
 */
function getReservationBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'completed': return 'info';
        default: return 'secondary';
    }
}

/**
 * Devuelve la clase CSS para el badge según el estado de la cita
 */
function getAppointmentBadgeClass(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return 'success';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        case 'completed': return 'info';
        case 'in_progress': return 'primary';
        default: return 'secondary';
    }
}

/**
 * Adapta opciones de menú según el sector empresarial
 */
function adaptMenuOptions(config) {
    const menuContainer = document.getElementById('sector-specific-menu');
    if (!menuContainer) return;
    
    const sector = config.businessSector || 'generic';
    let menuHTML = '';
    
    // Generar opciones de menú específicas por sector
    switch(sector) {
        case 'restaurant':
            menuHTML = `
                <a href="#orders" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-utensils me-2"></i> Pedidos
                </a>
                <a href="#reservations" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-calendar-alt me-2"></i> Reservas
                </a>
            `;
            break;
        case 'beauty':
            menuHTML = `
                <a href="#appointments" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-calendar-check me-2"></i> Citas
                </a>
                <a href="#services" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-cut me-2"></i> Servicios
                </a>
            `;
            break;
        case 'retail':
            menuHTML = `
                <a href="#inventory" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-boxes me-2"></i> Inventario
                </a>
                <a href="#sales" class="list-group-item list-group-item-action bg-dark text-white" data-bs-toggle="tab">
                    <i class="fas fa-shopping-cart me-2"></i> Ventas
                </a>
            `;
            break;
    }
    
    menuContainer.innerHTML = menuHTML;
}

/**
 * Actualiza el título del dashboard
 */
function updateDashboardTitle(companyName) {
    const dashboardTitle = document.getElementById('dashboard-title');
    if (dashboardTitle) {
        dashboardTitle.textContent = `${companyName} - Dashboard`;
    }
    
    const companyNameElement = document.getElementById('company-name');
    if (companyNameElement) {
        companyNameElement.textContent = companyName;
    }
}

/**
 * Actualiza la información general de la empresa en el panel principal
 */
function updateCompanyOverview(config) {
    console.log('Actualizando información general de la empresa');
    
    const overviewContainer = document.getElementById('company-overview');
    if (!overviewContainer) {
        console.warn('No se encontró el contenedor de información general');
        return;
    }
    
    // Formatear la información de la empresa
    const industry = config.industry || 'No especificada';
    const employees = config.employees || 'No especificado';
    const foundedYear = config.foundedYear || 'No especificado';
    
    // Crear HTML para la información general
    const overviewHTML = `
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h5 class="mb-0"><i class="fas fa-building me-2"></i>Información de la Empresa</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Nombre:</strong> ${config.companyName || 'No especificado'}</p>
                        <p><strong>Industria:</strong> ${industry}</p>
                        <p><strong>Empleados:</strong> ${employees}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Fundada:</strong> ${foundedYear}</p>
                        <p><strong>Sitio Web:</strong> ${config.website || 'No especificado'}</p>
                        <p><strong>Email:</strong> ${config.email || 'No especificado'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Actualizar el contenedor
    overviewContainer.innerHTML = overviewHTML;
}

/**
 * Muestra un error de configuración en el dashboard
 */
function showConfigurationError(message) {
    const overviewContainer = document.getElementById('company-overview');
    if (!overviewContainer) {
        console.warn('No se encontró el contenedor de información general');
        return;
    }
    
    const errorHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Error de Configuración</h4>
            <p>${message}</p>
            <hr>
            <p class="mb-0">Por favor, completa la <a href="company-setup.html" class="alert-link">configuración inicial</a> para continuar.</p>
        </div>
    `;
    
    overviewContainer.innerHTML = errorHTML;
    toastr.error(message, 'Error de Configuración');
}

/**
 * Carga la configuración del bot en el dashboard
 */
function loadBotConfiguration(botConfig) {
    console.log('Cargando configuración del bot:', botConfig);
    
    const botConfigContainer = document.getElementById('bot-config-content');
    if (!botConfigContainer) {
        console.warn('No se encontró el contenedor de configuración del bot');
        return;
    }
    
    try {
        // Si botConfig es un string JSON, parsearlo
        const config = typeof botConfig === 'string' ? JSON.parse(botConfig) : botConfig;
        
        // Crear HTML para la configuración del bot
        const botHTML = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0"><i class="fas fa-robot me-2"></i>Configuración del Asistente AI</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>Nombre del Bot:</strong> ${config.botName || 'Asistente AI'}</p>
                            <p><strong>Personalidad:</strong> ${config.botPersonality || 'Profesional'}</p>
                            <p><strong>Idioma:</strong> ${config.botLanguage || 'Español'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Activo:</strong> ${config.botActive ? 'Sí' : 'No'}</p>
                            <p><strong>Modo:</strong> ${config.botMode || 'Estándar'}</p>
                            <p><strong>Último entrenamiento:</strong> ${config.lastTraining || 'No entrenado'}</p>
                        </div>
                    </div>
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button class="btn btn-primary" type="button">
                            <i class="fas fa-cog me-2"></i>Editar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Actualizar el contenedor
        botConfigContainer.innerHTML = botHTML;
        
    } catch (error) {
        console.error('Error al cargar la configuración del bot:', error);
        botConfigContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al cargar la configuración del bot. Por favor, revisa la configuración.
            </div>
        `;
    }
}

/**
 * Carga la configuración de email en el dashboard
 */
function loadEmailConfiguration(emailConfig) {
    console.log('Cargando configuración de email:', emailConfig);
    
    const emailConfigContainer = document.getElementById('email-config-content');
    if (!emailConfigContainer) {
        console.warn('No se encontró el contenedor de configuración de email');
        return;
    }
    
    try {
        // Si emailConfig es un string JSON, parsearlo
        const config = typeof emailConfig === 'string' ? JSON.parse(emailConfig) : emailConfig;
        
        // Crear HTML para la configuración de email
        const emailHTML = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0"><i class="fas fa-envelope me-2"></i>Configuración de Email</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>Email Principal:</strong> ${config.primaryEmail || 'No configurado'}</p>
                            <p><strong>Plantilla:</strong> ${config.emailTemplate || 'Estándar'}</p>
                            <p><strong>Firma:</strong> ${config.emailSignature ? 'Configurada' : 'No configurada'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Respuesta Automática:</strong> ${config.autoReply ? 'Activada' : 'Desactivada'}</p>
                            <p><strong>Reenvío:</strong> ${config.forwardTo || 'No configurado'}</p>
                            <p><strong>Integración:</strong> ${config.emailIntegration || 'No configurada'}</p>
                        </div>
                    </div>
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button class="btn btn-primary" type="button">
                            <i class="fas fa-cog me-2"></i>Editar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Actualizar el contenedor
        emailConfigContainer.innerHTML = emailHTML;
        
    } catch (error) {
        console.error('Error al cargar la configuración de email:', error);
        emailConfigContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al cargar la configuración de email. Por favor, revisa la configuración.
            </div>
        `;
    }
}

/**
 * Carga la configuración de notificaciones en el dashboard
 */
function loadNotificationConfiguration(notificationConfig) {
    console.log('Cargando configuración de notificaciones:', notificationConfig);
    
    const notificationConfigContainer = document.getElementById('notification-config-content');
    if (!notificationConfigContainer) {
        console.warn('No se encontró el contenedor de configuración de notificaciones');
        return;
    }
    
    try {
        // Si notificationConfig es un string JSON, parsearlo
        const config = typeof notificationConfig === 'string' ? JSON.parse(notificationConfig) : notificationConfig;
        
        // Crear HTML para la configuración de notificaciones
        const notificationHTML = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white py-3">
                    <h5 class="mb-0"><i class="fas fa-bell me-2"></i>Configuración de Notificaciones</h5>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>Email:</strong> ${config.emailNotifications ? 'Activadas' : 'Desactivadas'}</p>
                            <p><strong>SMS:</strong> ${config.smsNotifications ? 'Activadas' : 'Desactivadas'}</p>
                            <p><strong>Push:</strong> ${config.pushNotifications ? 'Activadas' : 'Desactivadas'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Frecuencia:</strong> ${config.notificationFrequency || 'Inmediata'}</p>
                            <p><strong>Horario:</strong> ${config.notificationSchedule || 'Todo el día'}</p>
                            <p><strong>Prioridad:</strong> ${config.notificationPriority || 'Normal'}</p>
                        </div>
                    </div>
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <button class="btn btn-primary" type="button">
                            <i class="fas fa-cog me-2"></i>Editar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Actualizar el contenedor
        notificationConfigContainer.innerHTML = notificationHTML;
        
    } catch (error) {
        console.error('Error al cargar la configuración de notificaciones:', error);
        notificationConfigContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al cargar la configuración de notificaciones. Por favor, revisa la configuración.
            </div>
        `;
    }
}}
