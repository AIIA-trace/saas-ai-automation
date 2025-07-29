/**
 * SCRIPT TEMPORAL DE DIAGNÓSTICO DE BASE DE DATOS
 * ¡IMPORTANTE! ELIMINAR ESTE ARCHIVO DESPUÉS DE USARLO
 * NO SUBIR A PRODUCCIÓN
 */

// Configuración de la base de datos (solo para diagnóstico)
const DB_CONFIG = {
    // Estos valores se eliminarán después de la verificación
    // NO INCLUIR EN PRODUCCIÓN
};

class DatabaseChecker {
    constructor() {
        this.init();
    }

    init() {
        // Crear interfaz de diagnóstico
        this.createUI();
        
        // Configurar listener
        document.getElementById('check-db-btn').addEventListener('click', () => this.checkDatabase());
    }

    createUI() {
        // Crear un panel flotante para diagnóstico
        const diagnosticPanel = document.createElement('div');
        diagnosticPanel.id = 'db-diagnostic-panel';
        diagnosticPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            padding: 15px;
            font-family: Arial, sans-serif;
        `;
        
        // Contenido del panel
        diagnosticPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px;">Diagnóstico de Base de Datos</h3>
                <button id="close-diagnostic" style="background: none; border: none; cursor: pointer;">×</button>
            </div>
            <div style="margin-bottom: 15px;">
                <p style="font-size: 14px; margin: 0 0 10px 0;">
                    Verifica si tus datos de usuario se han guardado correctamente en la base de datos.
                </p>
                <div style="display: flex; gap: 10px;">
                    <input type="email" id="check-email" placeholder="Email a verificar" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button id="check-db-btn" style="background: #4a6cf7; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Verificar</button>
                </div>
            </div>
            <div id="db-results" style="font-size: 13px; background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                <p>Los resultados se mostrarán aquí...</p>
            </div>
            <p style="font-size: 11px; color: #666; margin-top: 10px;">
                ⚠️ Este es un script de diagnóstico temporal. Eliminar después de usar.
            </p>
        `;
        
        // Añadir al DOM
        document.body.appendChild(diagnosticPanel);
        
        // Configurar botón de cierre
        document.getElementById('close-diagnostic').addEventListener('click', () => {
            diagnosticPanel.remove();
        });
    }

    checkDatabase() {
        const email = document.getElementById('check-email').value;
        const resultsDiv = document.getElementById('db-results');
        
        if (!email) {
            resultsDiv.innerHTML = '<p style="color: #e74c3c;">Por favor, ingresa un email para verificar.</p>';
            return;
        }

        resultsDiv.innerHTML = '<p>Conectando con la base de datos...</p>';
        
        // Realizar verificación
        this.checkUserInDatabase(email)
            .then(result => {
                resultsDiv.innerHTML = this.formatResults(result);
            })
            .catch(error => {
                resultsDiv.innerHTML = `<p style="color: #e74c3c;">Error: ${error.message}</p>`;
            });
    }
    
    async checkUserInDatabase(email) {
        try {
            // Esta sería la consulta a la API
            // En este caso usaremos un endpoint personalizado que deberías crear en el backend
            const response = await fetch('/api/admin/check-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, secureToken: 'temp-diagnostic-token' })
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${await response.text()}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error verificando usuario:', error);
            
            // Como alternativa, intenta una verificación indirecta
            return this.checkIndirectly(email);
        }
    }
    
    async checkIndirectly(email) {
        try {
            // Intentar iniciar sesión con ese email
            const loginResponse = await fetch(API_CONFIG.getFullUrl(API_CONFIG.AUTH.LOGIN), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    password: '********', // No importa la contraseña, solo queremos saber si el usuario existe
                })
            });
            
            const data = await loginResponse.json();
            
            // Si el error es de contraseña incorrecta, el usuario existe
            if (!loginResponse.ok && data.error && 
                (data.error.includes('contraseña') || data.error.includes('password'))) {
                return {
                    exists: true,
                    message: 'El usuario existe en la base de datos (verificación indirecta)',
                    details: 'La verificación se realizó mediante un intento de inicio de sesión.'
                };
            } else if (!loginResponse.ok && data.error && 
                       (data.error.includes('no existe') || data.error.includes('not found') || 
                        data.error.includes('not exist') || data.error.includes('no encontrado'))) {
                return {
                    exists: false,
                    message: 'El usuario NO existe en la base de datos',
                    details: 'La verificación se realizó mediante un intento de inicio de sesión.'
                };
            }
            
            return {
                unknown: true,
                message: 'No se pudo determinar si el usuario existe',
                details: 'El servidor no proporcionó información clara sobre la existencia del usuario.'
            };
            
        } catch (error) {
            throw new Error(`No se pudo verificar el usuario: ${error.message}`);
        }
    }
    
    formatResults(result) {
        if (result.exists) {
            return `
                <div style="border-left: 4px solid #2ecc71; padding-left: 10px;">
                    <p style="font-weight: bold; color: #2ecc71;">✅ Usuario encontrado en la base de datos</p>
                    <p>${result.message || ''}</p>
                    ${result.details ? `<p style="font-size: 12px; color: #666;">${result.details}</p>` : ''}
                </div>
            `;
        } else if (result.exists === false) {
            return `
                <div style="border-left: 4px solid #e74c3c; padding-left: 10px;">
                    <p style="font-weight: bold; color: #e74c3c;">❌ Usuario NO encontrado en la base de datos</p>
                    <p>${result.message || ''}</p>
                    ${result.details ? `<p style="font-size: 12px; color: #666;">${result.details}</p>` : ''}
                </div>
            `;
        } else {
            return `
                <div style="border-left: 4px solid #f39c12; padding-left: 10px;">
                    <p style="font-weight: bold; color: #f39c12;">⚠️ Verificación no concluyente</p>
                    <p>${result.message || 'No se pudo determinar si el usuario existe en la base de datos.'}</p>
                    ${result.details ? `<p style="font-size: 12px; color: #666;">${result.details}</p>` : ''}
                </div>
            `;
        }
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    window.dbChecker = new DatabaseChecker();
});
