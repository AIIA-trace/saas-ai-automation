/**
 * Register Debugger - Herramienta para diagnosticar problemas de registro
 */

class RegisterDebugger {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('=== REGISTER DEBUGGER INICIADO ===');
        this.patchRegisterFunction();
    }

    /**
     * Modifica la función de registro para mostrar información detallada
     */
    patchRegisterFunction() {
        // Busca la función handleRegistration en el ámbito global
        if (typeof window.handleRegistration === 'function') {
            const originalHandleRegistration = window.handleRegistration;
            
            // Reemplazar con nuestra versión instrumentada
            window.handleRegistration = async function(...args) {
                console.log('=== DIAGNÓSTICO DE REGISTRO ===');
                console.log('1. Iniciando proceso de registro');
                
                try {
                    // Capturar datos del formulario antes de enviar
                    const email = document.getElementById('email')?.value;
                    const companyName = document.getElementById('companyName')?.value;
                    const plan = document.querySelector('input[name="plan"]')?.value;
                    
                    console.log('2. Datos del formulario:');
                    console.log('   - Email:', email);
                    console.log('   - Empresa:', companyName);
                    console.log('   - Plan:', plan);
                    
                    // Verificar si authService está disponible
                    console.log('3. AuthService disponible:', typeof authService !== 'undefined');
                    
                    // Ejecutar la función original con monitoreo
                    console.log('4. Enviando solicitud al servidor...');
                    const startTime = performance.now();
                    
                    // Monitorear petición AJAX
                    const originalFetch = window.fetch;
                    window.fetch = async function(...fetchArgs) {
                        const url = fetchArgs[0];
                        const options = fetchArgs[1] || {};
                        
                        console.log('   - URL de solicitud:', url);
                        console.log('   - Método:', options.method);
                        
                        if (options.body) {
                            try {
                                const bodyObj = JSON.parse(options.body);
                                console.log('   - Datos enviados:', bodyObj);
                                
                                // Verificar campos críticos
                                const missingFields = [];
                                ['email', 'password', 'companyName', 'firstName', 'lastName'].forEach(field => {
                                    if (!bodyObj[field]) missingFields.push(field);
                                });
                                
                                if (missingFields.length > 0) {
                                    console.warn('   ⚠️ ADVERTENCIA: Campos importantes faltantes:', missingFields.join(', '));
                                }
                            } catch (e) {
                                console.log('   - No se pudo parsear el cuerpo de la solicitud');
                            }
                        }
                        
                        try {
                            const response = await originalFetch.apply(this, fetchArgs);
                            
                            // Clonar la respuesta para poder leerla y seguir pasándola
                            const clone = response.clone();
                            
                            console.log('   - Código de estado:', response.status);
                            console.log('   - Éxito:', response.ok);
                            
                            // Intentar leer el cuerpo de la respuesta si hay error
                            if (!response.ok) {
                                try {
                                    const errorData = await clone.json();
                                    console.error('   - Error del servidor:', errorData);
                                } catch (e) {
                                    const errorText = await clone.text();
                                    console.error('   - Error del servidor (texto):', errorText);
                                }
                            } else {
                                console.log('   ✅ Respuesta exitosa del servidor');
                                
                                try {
                                    const responseData = await clone.json();
                                    console.log('   - Datos de respuesta:', responseData);
                                    
                                    if (responseData.token) {
                                        console.log('   ✅ Token recibido correctamente');
                                    } else {
                                        console.warn('   ⚠️ No se recibió token en la respuesta');
                                    }
                                    
                                    if (responseData.user || responseData.userData) {
                                        console.log('   ✅ Datos de usuario recibidos');
                                    }
                                } catch (e) {
                                    console.log('   - No se pudo parsear la respuesta JSON');
                                }
                            }
                            
                            return response;
                        } catch (error) {
                            console.error('   ❌ Error de red:', error);
                            throw error;
                        }
                    };
                    
                    // Llamar a la función original
                    const result = await originalHandleRegistration.apply(this, args);
                    
                    // Restaurar fetch original
                    window.fetch = originalFetch;
                    
                    const endTime = performance.now();
                    console.log(`5. Tiempo de respuesta: ${(endTime - startTime).toFixed(2)}ms`);
                    
                    // Verificar si el token se guardó correctamente
                    setTimeout(() => {
                        const token = localStorage.getItem('auth_token');
                        const userData = localStorage.getItem('user_data');
                        
                        console.log('6. Verificación post-registro:');
                        console.log('   - Token guardado:', !!token);
                        console.log('   - Datos de usuario guardados:', !!userData);
                        
                        if (token) {
                            console.log('   ✅ REGISTRO COMPLETADO EXITOSAMENTE');
                            console.log('   - Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
                        } else {
                            console.error('   ❌ FALLO EN EL REGISTRO: No se guardó el token');
                        }
                        
                        console.log('=== FIN DEL DIAGNÓSTICO DE REGISTRO ===');
                    }, 1000);
                    
                    return result;
                } catch (error) {
                    console.error('❌ Error en el proceso de registro:', error);
                    throw error;
                }
            };
            
            console.log('✅ Función de registro instrumentada correctamente');
        } else {
            console.error('❌ No se encontró la función handleRegistration');
        }
    }
}

// Inicializar automáticamente
const registerDebugger = new RegisterDebugger();
