/**
 * Verificador de configuración del bot
 * Script para verificar si la configuración del bot se ha guardado correctamente en la base de datos
 */

document.addEventListener('DOMContentLoaded', function() {
    // Obtener referencia al botón y elementos del resultado
    const verifyButton = document.getElementById('verify-bot-config');
    const configResults = document.getElementById('config-results');
    const configData = document.getElementById('config-data');
    
    if (!verifyButton) return;
    
    // Añadir evento click al botón
    verifyButton.addEventListener('click', async function() {
        try {
            // Mostrar indicador de carga
            verifyButton.disabled = true;
            verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verificando...';
            
            // Obtener API key desde localStorage
            const apiKey = localStorage.getItem('api_key');
            if (!apiKey) {
                throw new Error('No se encontró API key. Por favor, inicia sesión nuevamente.');
            }
            
            // Obtener la URL base de la API
            const apiBaseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
            
            // Intentar primero el endpoint específico de verificación
            let response = await fetch(`${apiBaseUrl}/api/config/verify-bot-config`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Si el endpoint específico no existe, usar el endpoint unificado /api/client
            if (response.status === 404) {
                console.log('Endpoint de verificación no encontrado, usando endpoint unificado /api/client...');
                response = await fetch(`${apiBaseUrl}/api/client`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Procesar la respuesta
            if (!response.ok) {
                throw new Error(`Error al verificar configuración: ${response.status} ${response.statusText}`);
            }
            
            // Obtener datos de la respuesta
            const data = await response.json();
            
            // Mostrar resultados formateados
            configResults.classList.remove('d-none');
            configData.innerHTML = JSON.stringify(data, null, 2);
            
            // Destacar información de archivos de contexto
            if (data.botConfig && data.botConfig.contextFiles) {
                configData.innerHTML += "\n\n--- ARCHIVOS DE CONTEXTO ---\n";
                configData.innerHTML += JSON.stringify(data.botConfig.contextFiles, null, 2);
            } else if (data.contextFiles) {
                configData.innerHTML += "\n\n--- ARCHIVOS DE CONTEXTO ---\n";
                configData.innerHTML += JSON.stringify(data.contextFiles, null, 2);
            }
            
            console.log('✅ Verificación de configuración completada con éxito');
            
        } catch (error) {
            // Mostrar error
            console.error('❌ Error al verificar configuración:', error);
            configResults.classList.remove('d-none');
            configData.innerHTML = `ERROR: ${error.message}\n\nIntenta refrescar la página o iniciar sesión nuevamente.`;
            configData.classList.add('text-danger');
        } finally {
            // Restaurar botón
            verifyButton.disabled = false;
            verifyButton.innerHTML = '<i class="fas fa-database me-2"></i>Verificar Configuración del Bot';
        }
    });
});
