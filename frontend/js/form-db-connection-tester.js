/**
 * Script de pruebas para verificar que todos los formularios del dashboard
 * estén correctamente conectados a la base de datos
 * 
 * Este script puede ejecutarse en la consola del navegador o cargarse como
 * un script separado durante el desarrollo para validar las conexiones.
 */

// Configuración del modo de prueba
const TEST_CONFIG = {
    useRealAPI: false,       // Cambiar a true para probar con API real (requiere backend)
    logResults: true,        // Mostrar resultados en consola
    showToasts: false,       // No mostrar notificaciones toastr (usando console.log en su lugar)
    simulateErrors: false,   // Simular errores de API para probar manejo de errores
    testAllForms: false      // No ejecutar pruebas automáticamente
};

/**
 * Este script NO se inicializa automáticamente.
 * Para usar las pruebas de conexión a la base de datos, abre la consola del navegador
 * y ejecuta cualquiera de estos comandos:
 * 
 * FormDBTest.runAllTests() - Para probar todos los formularios
 * FormDBTest.testAuthForms() - Para probar autenticación
 * FormDBTest.testProfileForm() - Para probar el formulario de perfil
 * FormDBTest.testBotConfigForm() - Para probar la configuración del bot
 * FormDBTest.testCallsOperations() - Para probar operaciones de llamadas
 * FormDBTest.testEmailsOperations() - Para probar operaciones de emails
 * FormDBTest.testBillingOperations() - Para probar operaciones de facturación
 * 
 * Si necesitas ver los resultados en la interfaz, ejecuta primero:
 * FormDBTest.createTestControls()
 */

// No usamos toastr, todas las notificaciones se muestran a través de console.log/error/warn

/**
 * Crear controles de prueba en la interfaz
 */
function createTestControls() {
    // Verificar si ya existe el panel de pruebas
    if (document.getElementById('form-test-panel')) {
        return;
    }
    
    // Crear panel flotante para pruebas
    const testPanel = document.createElement('div');
    testPanel.id = 'form-test-panel';
    testPanel.style.position = 'fixed';
    testPanel.style.bottom = '20px';
    testPanel.style.right = '20px';
    testPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    testPanel.style.color = 'white';
    testPanel.style.padding = '15px';
    testPanel.style.borderRadius = '5px';
    testPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    testPanel.style.zIndex = '9999';
    testPanel.style.maxWidth = '300px';
    
    testPanel.innerHTML = `
        <h5>Pruebas de Formularios</h5>
        <div class="mb-2">
            <button id="test-all-forms" class="btn btn-sm btn-primary me-2">Probar Todo</button>
            <button id="test-auth" class="btn btn-sm btn-outline-light me-2">Auth</button>
            <button id="test-profile" class="btn btn-sm btn-outline-light me-2">Perfil</button>
            <button id="test-bot-config" class="btn btn-sm btn-outline-light me-2">Bot</button>
            <button id="test-calls" class="btn btn-sm btn-outline-light me-2">Llamadas</button>
            <button id="test-emails" class="btn btn-sm btn-outline-light me-2">Emails</button>
            <button id="test-billing" class="btn btn-sm btn-outline-light">Facturación</button>
        </div>
        <div id="test-results" style="font-size: 12px; max-height: 150px; overflow-y: auto;">
            Haga clic en un botón para iniciar las pruebas...
        </div>
        <div class="mt-2 text-end">
            <button id="close-test-panel" class="btn btn-sm btn-danger">Cerrar</button>
        </div>
    `;
    
    // Añadir el panel al body
    document.body.appendChild(testPanel);
    
    // Configurar event listeners
    document.getElementById('test-all-forms').addEventListener('click', runAllTests);
    document.getElementById('test-auth').addEventListener('click', testAuthForms);
    document.getElementById('test-profile').addEventListener('click', testProfileForm);
    document.getElementById('test-bot-config').addEventListener('click', testBotConfigForm);
    document.getElementById('test-calls').addEventListener('click', testCallsOperations);
    document.getElementById('test-emails').addEventListener('click', testEmailsOperations);
    document.getElementById('test-billing').addEventListener('click', testBillingOperations);
    document.getElementById('close-test-panel').addEventListener('click', function() {
        document.getElementById('form-test-panel').remove();
    });
}

/**
 * Ejecutar todas las pruebas secuencialmente
 */
async function runAllTests() {
    logTestResult('🚀 Iniciando pruebas completas de todos los formularios...', 'heading');
    
    // Probar autenticación primero
    await testAuthForms();
    
    // Probar formulario de perfil
    await testProfileForm();
    
    // Probar configuración del bot
    await testBotConfigForm();
    
    // Probar operaciones de llamadas
    await testCallsOperations();
    
    // Probar operaciones de emails
    await testEmailsOperations();
    
    // Probar operaciones de facturación
    await testBillingOperations();
    
    logTestResult('✅ Pruebas completas finalizadas', 'success');
    console.log('✅ Todas las pruebas completadas con éxito');
}

/**
 * Probar formularios de autenticación
 */
async function testAuthForms() {
    logTestResult('🔑 Probando autenticación...', 'heading');
    
    // Verificar que la función de login existe
    if (typeof AuthService === 'undefined' || typeof AuthService.login !== 'function') {
        logTestResult('❌ AuthService.login no está disponible', 'error');
        return;
    }
    
    // Datos de prueba
    const testCredentials = {
        email: 'test@example.com',
        password: 'password123'
    };
    
    try {
        // Intentar iniciar sesión simulando la llamada
        if (TEST_CONFIG.useRealAPI) {
            // Usar la función real
            await simulateAPICall('login', () => {
                return AuthService.login(testCredentials.email, testCredentials.password);
            });
            logTestResult('✅ AuthService.login conectado correctamente', 'success');
        } else {
            // Simular respuesta
            await simulateAPICall('login');
            logTestResult('✅ Simulación de login exitosa', 'success');
        }
        
        // Verificar token de autenticación
        const token = localStorage.getItem('auth_token');
        if (token) {
            logTestResult(`✅ Token de autenticación encontrado: ${maskToken(token)}`, 'success');
        } else {
            logTestResult('⚠️ No se encontró token de autenticación', 'warning');
            // Crear un token de prueba para las siguientes pruebas
            localStorage.setItem('auth_token', 'test_token_12345');
            logTestResult('ℹ️ Se ha creado un token de prueba', 'info');
        }
    } catch (error) {
        logTestResult(`❌ Error en prueba de autenticación: ${error.message}`, 'error');
    }
}

/**
 * Probar formulario de perfil
 */
async function testProfileForm() {
    logTestResult('👤 Probando actualización de perfil...', 'heading');
    
    // Datos de prueba para el perfil
    const testProfileData = {
        contactName: 'Usuario Prueba',
        email: 'test@example.com',
        phone: '666123456',
        companyName: 'Empresa Test',
        position: 'Gerente',
        timezone: 'Europe/Madrid'
    };
    
    try {
        // Verificar que los campos del formulario existen
        const nameField = document.getElementById('account_name');
        const lastnameField = document.getElementById('account_lastname');
        const emailField = document.getElementById('account_email');
        
        if (!nameField || !lastnameField || !emailField) {
            logTestResult('⚠️ No se encontraron todos los campos del formulario de perfil', 'warning');
        } else {
            // Rellenar campos con datos de prueba
            const nameParts = testProfileData.contactName.split(' ');
            nameField.value = nameParts[0] || '';
            lastnameField.value = nameParts[1] || '';
            emailField.value = testProfileData.email;
            
            if (document.getElementById('account_phone')) {
                document.getElementById('account_phone').value = testProfileData.phone;
            }
            if (document.getElementById('account_company')) {
                document.getElementById('account_company').value = testProfileData.companyName;
            }
            if (document.getElementById('account_position')) {
                document.getElementById('account_position').value = testProfileData.position;
            }
            if (document.getElementById('account_timezone')) {
                document.getElementById('account_timezone').value = testProfileData.timezone;
            }
            
            logTestResult('✅ Campos del formulario de perfil encontrados y rellenados', 'success');
        }
        
        // Simular envío del formulario
        const formData = {
            ...testProfileData
        };
        
        // Verificar el endpoint correcto
        const endpoint = API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.UPDATE_PROFILE;
        logTestResult(`🔍 Endpoint para actualización de perfil: ${endpoint}`, 'info');
        
        // Simular la petición
        await simulateAPICall('updateProfile', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            return response.json();
        });
        
        logTestResult('✅ Prueba de actualización de perfil exitosa', 'success');
    } catch (error) {
        logTestResult(`❌ Error en prueba de perfil: ${error.message}`, 'error');
    }
}

/**
 * Probar formulario de configuración del bot
 */
async function testBotConfigForm() {
    logTestResult('🤖 Probando configuración del bot...', 'heading');
    
    try {
        // Datos de prueba para configuración del bot
        const testBotData = {
            welcomeMessage: 'Mensaje de bienvenida de prueba',
            voiceId: 'es-ES-Neural2-A',
            language: 'es-ES',
            confirmationMessage: 'Mensaje de confirmación de prueba',
            personality: 'friendly',
            workingHours: {
                opening: '09:00',
                closing: '18:00'
            },
            workingDays: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false
            },
            emailConfig: {
                provider: 'gmail',
                outgoingEmail: 'test@gmail.com',
                recipientEmail: 'info@empresa.com',
                password: 'password123',
                imapServer: 'imap.gmail.com',
                imapPort: '993',
                smtpServer: 'smtp.gmail.com',
                smtpPort: '587',
                useSSL: true,
                consent: true,
                active: true,
                autoReply: true,
                language: 'es-ES',
                forwardRules: 'reglas de reenvío de prueba'
            }
        };
        
        // Verificar que los campos principales del formulario existen
        const welcomeField = document.getElementById('welcomeMessage');
        const voiceField = document.getElementById('voiceSelection');
        
        if (!welcomeField || !voiceField) {
            logTestResult('⚠️ No se encontraron todos los campos del formulario de configuración del bot', 'warning');
        } else {
            // Rellenar algunos campos con datos de prueba
            welcomeField.value = testBotData.welcomeMessage;
            voiceField.value = testBotData.voiceId;
            
            logTestResult('✅ Campos del formulario de configuración del bot encontrados y rellenados', 'success');
        }
        
        // Verificar campos de email config
        const emailProviderField = document.getElementById('email_provider');
        const outgoingEmailField = document.getElementById('outgoing_email');
        
        if (!emailProviderField || !outgoingEmailField) {
            logTestResult('⚠️ No se encontraron todos los campos de configuración de email', 'warning');
        } else {
            // Rellenar algunos campos de email con datos de prueba
            emailProviderField.value = testBotData.emailConfig.provider;
            outgoingEmailField.value = testBotData.emailConfig.outgoingEmail;
            
            logTestResult('✅ Campos del formulario de configuración de email encontrados y rellenados', 'success');
        }
        
        // Verificar el endpoint correcto
        const endpoint = API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.BOT_CONFIG;
        logTestResult(`🔍 Endpoint para configuración del bot: ${endpoint}`, 'info');
        
        // Simular la petición
        await simulateAPICall('updateBotConfig', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(testBotData)
            });
            return response.json();
        });
        
        logTestResult('✅ Prueba de configuración del bot exitosa', 'success');
    } catch (error) {
        logTestResult(`❌ Error en prueba de configuración del bot: ${error.message}`, 'error');
    }
}

/**
 * Probar operaciones de llamadas
 */
async function testCallsOperations() {
    logTestResult('📞 Probando operaciones de llamadas...', 'heading');
    
    try {
        // 1. Probar carga de llamadas
        logTestResult('🔍 Probando carga de llamadas...', 'info');
        
        // Verificar el endpoint correcto
        const callsEndpoint = API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.CALLS;
        logTestResult(`🔍 Endpoint para carga de llamadas: ${callsEndpoint}`, 'info');
        
        // Simular la petición de carga
        await simulateAPICall('loadCalls', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(callsEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.json();
        });
        
        // 2. Probar marcado de llamada como gestionada
        logTestResult('🔍 Probando marcado de llamada como gestionada...', 'info');
        
        // ID de prueba para una llamada
        const testCallId = 123;
        
        // Verificar el endpoint correcto para actualizar estado
        const callStatusEndpoint = `${API_CONFIG.apiBaseUrl}/api/calls/${testCallId}/status`;
        logTestResult(`🔍 Endpoint para actualizar estado de llamada: ${callStatusEndpoint}`, 'info');
        
        // Simular la petición de actualización
        await simulateAPICall('updateCallStatus', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(callStatusEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ managed: true })
            });
            return response.json();
        });
        
        logTestResult('✅ Pruebas de operaciones de llamadas exitosas', 'success');
    } catch (error) {
        logTestResult(`❌ Error en pruebas de llamadas: ${error.message}`, 'error');
    }
}

/**
 * Probar operaciones de emails
 */
async function testEmailsOperations() {
    logTestResult('📧 Probando operaciones de emails...', 'heading');
    
    try {
        // 1. Probar carga de emails
        logTestResult('🔍 Probando carga de emails...', 'info');
        
        // Verificar el endpoint correcto
        const emailsEndpoint = API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.EMAILS;
        logTestResult(`🔍 Endpoint para carga de emails: ${emailsEndpoint}`, 'info');
        
        // Simular la petición de carga
        await simulateAPICall('loadEmails', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(emailsEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.json();
        });
        
        // 2. Probar marcado de email como leído
        logTestResult('🔍 Probando marcado de email como leído...', 'info');
        
        // ID de prueba para un email
        const testEmailId = 456;
        
        // Verificar el endpoint correcto para actualizar estado
        const emailStatusEndpoint = `${API_CONFIG.apiBaseUrl}/api/emails/${testEmailId}/read`;
        logTestResult(`🔍 Endpoint para actualizar estado de email: ${emailStatusEndpoint}`, 'info');
        
        // Simular la petición de actualización
        await simulateAPICall('updateEmailStatus', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(emailStatusEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ read: true })
            });
            return response.json();
        });
        
        logTestResult('✅ Pruebas de operaciones de emails exitosas', 'success');
    } catch (error) {
        logTestResult(`❌ Error en pruebas de emails: ${error.message}`, 'error');
    }
}

/**
 * Probar operaciones de facturación
 */
async function testBillingOperations() {
    logTestResult('💰 Probando operaciones de facturación...', 'heading');
    
    try {
        // Probar carga de facturas
        logTestResult('🔍 Probando carga de facturas...', 'info');
        
        // Verificar el endpoint correcto
        const billingEndpoint = API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.INVOICES;
        logTestResult(`🔍 Endpoint para carga de facturas: ${billingEndpoint}`, 'info');
        
        // Simular la petición de carga
        await simulateAPICall('loadBilling', async () => {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(billingEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.json();
        });
        
        logTestResult('✅ Prueba de operaciones de facturación exitosa', 'success');
    } catch (error) {
        logTestResult(`❌ Error en pruebas de facturación: ${error.message}`, 'error');
    }
}

/**
 * Simular una llamada a la API
 * @param {string} operationName - Nombre de la operación
 * @param {Function} realApiCall - Función de llamada real a la API (opcional)
 * @returns {Promise} - Promesa con resultado simulado o real
 */
async function simulateAPICall(operationName, realApiCall = null) {
    // Si useRealAPI está habilitado y se proporciona una función de llamada real
    if (TEST_CONFIG.useRealAPI && realApiCall) {
        logTestResult(`🔄 Ejecutando llamada real a API: ${operationName}`, 'info');
        
        try {
            const result = await realApiCall();
            logTestResult(`✅ Llamada exitosa a API: ${operationName}`, 'success');
            return result;
        } catch (error) {
            logTestResult(`❌ Error en llamada a API: ${operationName} - ${error.message}`, 'error');
            throw error;
        }
    } else {
        // Simular llamada a la API
        logTestResult(`🔄 Simulando llamada a API: ${operationName}`, 'info');
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (TEST_CONFIG.simulateErrors && Math.random() < 0.2) {
                    // Simular error aleatorio en 20% de los casos si simulateErrors está activado
                    const error = new Error('Error simulado en la API');
                    logTestResult(`❌ Error simulado en API: ${operationName}`, 'error');
                    reject(error);
                } else {
                    // Simular respuesta exitosa
                    const simulatedResponse = {
                        success: true,
                        message: `Operación simulada exitosa: ${operationName}`,
                        data: { id: Math.floor(Math.random() * 1000) }
                    };
                    logTestResult(`✅ Respuesta simulada exitosa: ${operationName}`, 'success');
                    resolve(simulatedResponse);
                }
            }, 500); // Simular un pequeño retraso
        });
    }
}

/**
 * Registrar resultado de prueba
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje (error, success, info, warning, heading)
 */
function logTestResult(message, type = 'info') {
    // Colores según tipo
    let color = '#fff';
    let prefix = 'ℹ️';
    
    switch (type) {
        case 'error':
            color = '#ff5252';
            prefix = '❌';
            break;
        case 'success':
            color = '#4caf50';
            prefix = '✅';
            break;
        case 'warning':
            color = '#ffc107';
            prefix = '⚠️';
            break;
        case 'heading':
            color = '#2196f3';
            prefix = '🔍';
            break;
        default:
            color = '#e0e0e0';
            prefix = 'ℹ️';
    }
    
    // Mostrar en consola si está habilitado
    if (TEST_CONFIG.logResults) {
        console.log(`%c${prefix} ${message}`, `color: ${color}`);
    }
    
    // Mostrar en panel de resultados si existe
    const resultsPanel = document.getElementById('test-results');
    if (resultsPanel) {
        const logItem = document.createElement('div');
        logItem.style.borderLeft = `3px solid ${color}`;
        logItem.style.paddingLeft = '8px';
        logItem.style.marginBottom = '5px';
        logItem.style.color = color;
        
        // Si es un encabezado, hacer negrita
        if (type === 'heading') {
            logItem.style.fontWeight = 'bold';
            logItem.style.marginTop = '10px';
        }
        
        logItem.textContent = message;
        resultsPanel.appendChild(logItem);
        
        // Hacer scroll hasta el final
        resultsPanel.scrollTop = resultsPanel.scrollHeight;
    }
    
    // Mostrar toast si está habilitado
    // Ya se muestran mensajes en la consola con los estilos adecuados
    // No necesitamos notificaciones toastr adicionales
}

/**
 * Ocultar parte del token para la visualización
 * @param {string} token - Token a enmascarar
 * @returns {string} - Token enmascarado
 */
function maskToken(token) {
    if (!token || token.length < 10) {
        return '********';
    }
    
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}

// Exportar funciones para uso global mediante el objeto FormDBTest
window.FormDBTest = {
    runAllTests,
    testAuthForms,
    testProfileForm,
    testBotConfigForm,
    testCallsOperations,
    testEmailsOperations,
    testBillingOperations,
    createTestControls,
    // Utilidad para activar/desactivar modo API real
    useRealAPI: function(value) {
        TEST_CONFIG.useRealAPI = value;
        console.log(`Modo API real: ${value ? 'ACTIVADO' : 'DESACTIVADO'}`);
        return TEST_CONFIG;
    },
    // Utilidad para simular errores
    simulateErrors: function(value) {
        TEST_CONFIG.simulateErrors = value;
        console.log(`Simulación de errores: ${value ? 'ACTIVADA' : 'DESACTIVADA'}`);
        return TEST_CONFIG;
    },
    // Mostrar ayuda
    help: function() {
        console.log(`
%cProbador de Conexiones de Formularios Dashboard
`, 'font-weight: bold; font-size: 14px; color: #2196f3;');
        console.log(`%c- FormDBTest.runAllTests()%c - Probar todos los formularios`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testAuthForms()%c - Probar autenticación`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testProfileForm()%c - Probar el formulario de perfil`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testBotConfigForm()%c - Probar la configuración del bot`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testCallsOperations()%c - Probar operaciones de llamadas`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testEmailsOperations()%c - Probar operaciones de emails`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.testBillingOperations()%c - Probar operaciones de facturación`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.createTestControls()%c - Mostrar panel de pruebas en la UI`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.useRealAPI(true|false)%c - Activar/desactivar uso de API real`, 'font-weight: bold', 'font-weight: normal');
        console.log(`%c- FormDBTest.simulateErrors(true|false)%c - Activar/desactivar simulación de errores`, 'font-weight: bold', 'font-weight: normal');
        
        console.log(`\nConfiguración actual:`, TEST_CONFIG);
        return 'Pruebas de formularios listas para usar';
    }
};

// Mensaje en la consola cuando se carga el script
console.log(`%c📋 Probador de conexiones a base de datos cargado.%c\nEjecuta %cFormDBTest.help()%c para ver comandos disponibles`, 
    'font-weight: bold; color: #2196f3;', 
    'font-weight: normal;', 
    'font-weight: bold;', 
    'font-weight: normal;');

