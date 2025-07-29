/**
 * Auth Debugger - Herramienta para diagnosticar problemas de autenticación
 */

class AuthDebugger {
    constructor() {
        console.log('=== INICIANDO DIAGNÓSTICO DE AUTENTICACIÓN ===');
        this.diagnose();
    }

    async diagnose() {
        // 1. Verificar presencia de token
        const token = localStorage.getItem('auth_token');
        console.log('Token encontrado:', !!token);
        if (token) {
            console.log('Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
            console.log('Longitud del token:', token.length);
        }

        // 2. Verificar datos de usuario en localStorage
        const userData = localStorage.getItem('user_data');
        console.log('Datos de usuario encontrados:', !!userData);
        if (userData) {
            try {
                const parsedUserData = JSON.parse(userData);
                console.log('Datos de usuario válidos:', true);
                console.log('Email:', parsedUserData.email || 'No disponible');
                console.log('ID:', parsedUserData.id || 'No disponible');
                console.log('Nombre:', parsedUserData.name || parsedUserData.companyName || 'No disponible');
                console.log('Plan:', parsedUserData.plan || 'No disponible');
            } catch (e) {
                console.error('Error al parsear datos de usuario:', e);
                console.log('Datos de usuario en crudo:', userData);
            }
        }

        // 3. Mostrar información de API_CONFIG
        if (window.API_CONFIG) {
            console.log('API_CONFIG disponible:', true);
            console.log('URL base:', API_CONFIG.API_URL || 'No disponible');
            console.log('Endpoint ME:', API_CONFIG.AUTH && API_CONFIG.AUTH.ME ? API_CONFIG.AUTH.ME : 'No disponible');
            console.log('URL completa ME:', API_CONFIG.getFullUrl && API_CONFIG.AUTH && API_CONFIG.AUTH.ME ? 
                API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME) : 'No disponible');
        } else {
            console.error('API_CONFIG no disponible');
        }

        // 4. Probar conectividad
        if (window.API_CONFIG && token) {
            try {
                console.log('Probando conectividad con el backend...');
                const url = API_CONFIG.getFullUrl(API_CONFIG.AUTH.ME);
                console.log('URL de prueba:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Status de respuesta:', response.status);
                console.log('OK:', response.ok);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Respuesta del servidor:', data);
                } else {
                    const errorText = await response.text();
                    console.error('Error del servidor:', errorText);
                    
                    // Si es error 401, el token no es válido
                    if (response.status === 401) {
                        console.error('ERROR DE AUTENTICACIÓN: Token no válido o expirado');
                        console.log('Recomendación: Borrar datos locales y volver a iniciar sesión');
                    }
                }
            } catch (e) {
                console.error('Error de red al conectar con el backend:', e);
            }
        }

        // 5. Sugerir solución
        console.log('\n=== RECOMENDACIONES ===');
        if (!token) {
            console.log('- No hay token de autenticación. Intenta volver a iniciar sesión.');
        } else {
            console.log('- Si sigues teniendo problemas, intenta borrar el localStorage y registrarte de nuevo.');
            console.log('- Puedes borrar localStorage ejecutando: localStorage.clear()');
        }

        console.log('=== FIN DEL DIAGNÓSTICO ===');
    }

    // Método para arreglar problemas comunes
    fix() {
        console.log('=== INTENTANDO REPARAR PROBLEMAS DE AUTENTICACIÓN ===');
        
        // 1. Limpiar datos de autenticación
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        console.log('Datos de autenticación eliminados');
        console.log('Por favor, vuelve a iniciar sesión en: login.html');
        
        // 2. Redirigir a login
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    }
}

// Iniciar automáticamente
const authDebugger = new AuthDebugger();

// Exponer para uso en consola
window.authDebugger = authDebugger;
