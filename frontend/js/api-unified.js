/**
 * API UNIFICADO - VERSIÓN FINAL
 * Solo JWT tokens, sin API keys, sin confusión
 * 
 * ACTUALIZADO: API DE CLIENTE COMPLETAMENTE UNIFICADA
 * - Endpoint único /api/client para todos los datos
 * - Eliminada redundancia en configuración de bot, perfil y email
 * - Sistema único de fuente de verdad
 * 
 * ESTRUCTURA DEL ENDPOINT UNIFICADO:
 * GET /api/client - Obtiene todos los datos del cliente
 *   Devuelve: { success: true, data: { botConfig, companyInfo, emailConfig, ... } }
 * 
 * PUT /api/client - Actualiza datos del cliente
 *   Recibe: { botConfig, companyInfo, emailConfig, ... }
 *   Devuelve: { success: true, message: 'Datos actualizados' }
 */
window.ApiHelper = {
    baseUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:10000' 
      : 'https://saas-ai-automation.onrender.com',

    /**
     * Función principal para todas las peticiones API
     */
    async fetchApi(endpoint, options = {}) {
        let url, authRequired = false;
        
        // Manejar diferentes formatos de endpoint
        if (typeof endpoint === 'string') {
            url = endpoint;
        } else if (endpoint && endpoint.url) {
            url = endpoint.url;
            authRequired = endpoint.auth === 'jwt';
        } else {
            throw new Error('Endpoint inválido');
        }
        
        // URL completa
        const fullUrl = this.baseUrl + url;
        console.log(`🌐 API: ${fullUrl}`);
        
        // Headers básicos
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Agregar JWT si es necesario
        if (authRequired) {
            // Unificar nombres de tokens para evitar inconsistencias
            const token = sessionStorage.getItem('auth_token') || 
                         localStorage.getItem('auth_token') || 
                         sessionStorage.getItem('authToken') || 
                         localStorage.getItem('authToken');
            
            if (!token) {
                console.warn('⚠️ No JWT token - redirigiendo al login');
                window.location.href = '/login.html';
                return;
            }
            
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`🔑 JWT agregado: ${token.substring(0, 15)}...`);
        }
        
        // Configuración de fetch
        const fetchOptions = {
            method: 'GET',
            ...options,
            headers
        };
        
        try {
            const response = await fetch(fullUrl, fetchOptions);
            
            // Manejar errores de autenticación
            if (response.status === 401 || response.status === 403) {
                console.warn(`⚠️ Error ${response.status} - Token inválido`);
                // Limpiar todas las posibles variantes de tokens
                sessionStorage.removeItem('auth_token');
                localStorage.removeItem('auth_token');
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }
            
            // Si la respuesta es OK, parsear JSON automáticamente
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const text = await response.text();
                    
                    console.log(`📥 Respuesta API unificada (${text.length} chars):`, text.substring(0, 200));
                    
                    // Verificar si hay contenido antes de parsear JSON
                    if (!text || text.trim() === '') {
                        console.error('❌ ERROR API UNIFICADA: Respuesta vacía del servidor para:', fullUrl);
                        console.error('📊 Status:', response.status);
                        console.error('📋 Headers:', Object.fromEntries(response.headers.entries()));
                        
                        // Notificar al usuario del error
                        if (window.toastr) {
                            window.toastr.error('Error de conexión con el servidor. Inténtalo de nuevo más tarde.');
                        }
                        
                        // Lanzar error específico en lugar de devolver objeto vacío
                        throw new Error('API_UNIFICADA: Servidor devolvió respuesta vacía - posible error de backend');
                    }
                    
                    try {
                        // Sanitizar respuesta antes de parsear: eliminar caracteres invisibles problemáticos
                        const sanitizedText = text.trim()
                            .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Eliminar caracteres de control
                        
                        const parsed = JSON.parse(sanitizedText);
                        console.log('✅ API UNIFICADA: JSON parseado correctamente');
                        return parsed;
                    } catch (jsonError) {
                        console.error('❌ ERROR CRÍTICO API UNIFICADA:', jsonError);
                        console.error('📄 Contenido problemático:', text.substring(0, 300));
                        console.error('📄 Contenido HEX:', Array.from(text.substring(0, 100)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '));
                        console.error('🔗 URL que falló:', fullUrl);
                        console.error('📊 Status:', response.status);
                        
                        // Notificar al usuario del error
                        if (window.toastr) {
                            window.toastr.error('Error procesando respuesta del servidor. El equipo técnico ha sido notificado.');
                        }
                        
                        // Lanzar error específico con más contexto
                        throw new Error(`API_UNIFICADA: Error parseando JSON: ${jsonError.message}`);
                    }
                }
                return response;
            }
            
            // Manejar errores HTTP
            const contentType = response.headers.get('content-type');
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Si no se puede parsear el JSON de error, usar mensaje por defecto
                }
            }
            
            throw new Error(errorMessage);
        } catch (error) {
            console.error('❌ Error API:', error);
            throw error;
        }
    },
    /**
     * Carga todos los datos del cliente desde un único endpoint
     * @returns {Promise<Object>} Datos completos del cliente
     */
    async loadClientData() {
        try {
            const response = await this.fetchApi({
                url: '/api/client',
                auth: 'jwt'
            });
            
            console.log('📥 Cliente cargado:', response);
            
            if (response && response.success && response.data) {
                return response.data;
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
        } catch (error) {
            console.error('❌ Error cargando datos de cliente:', error);
            throw error;
        }
    },
    
    /**
     * Guarda todos los datos del cliente en un único endpoint
     * @param {Object} clientData Datos completos del cliente
     * @returns {Promise<Object>} Respuesta del servidor
     */
    async saveClientData(clientData) {
        try {
            // Validar estructura del objeto antes de enviar
            if (!clientData || typeof clientData !== 'object') {
                throw new Error('Datos de cliente inválidos: no es un objeto');
            }
            
            // Verificar que no haya valores circulares antes de convertir a JSON
            const sanitizedData = JSON.parse(JSON.stringify(clientData));
            
            const response = await this.fetchApi({
                url: '/api/client',
                auth: 'jwt'
            }, {
                method: 'PUT',
                body: JSON.stringify(sanitizedData)
            });
            
            console.log('📤 Cliente guardado:', response);
            
            if (response && response.success) {
                return response;
            } else {
                throw new Error('Error guardando datos del cliente');
            }
        } catch (error) {
            console.error('❌ Error guardando datos del cliente:', error);
            throw error;
        }
    }
};

// Compatibilidad con código existente
window.API_HELPER = window.ApiHelper;

console.log('✅ API Unificado cargado - Cliente unificado implementado');
