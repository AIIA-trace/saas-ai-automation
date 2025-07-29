/**
 * Configuración de conexiones reales con la API para el dashboard
 * 
 * Este archivo garantiza que todos los formularios del dashboard
 * estén correctamente conectados a la API y base de datos real.
 * Elimina todos los datos de prueba y asegura que las llamadas
 * a la API usen el token correcto y endpoints adecuados.
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔗 Estableciendo conexiones reales con la API...');
    
    // Sobreescribir la función loadCallsData para usar la configuración API_CONFIG
    window.loadCallsData = function() {
        console.log('📞 Cargando datos de llamadas desde el backend...');
        
        // Obtener token de autenticación (nombre correcto)
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('❌ No se encontró token de autenticación');
            console.error('Error de autenticación. Por favor, inicie sesión nuevamente.', 'Error');
            // Redireccionar a login si no hay token
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Mostrar indicador de carga
        const callsTableBody = document.getElementById('calls-table-body');
        if (callsTableBody) {
            callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando llamadas...</p></td></tr>';
        }
        
        // Realizar petición al backend con la URL correcta desde API_CONFIG
        fetch(API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.CALLS, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado o no válido
                    localStorage.removeItem('auth_token');
                    console.error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    console.error(`Error al cargar llamadas: ${response.status}`);
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(callsData => {
            // Limpiar tabla de llamadas
            if (callsTableBody) {
                callsTableBody.innerHTML = '';
                
                if (callsData.length === 0) {
                    // Mostrar mensaje si no hay datos
                    callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay llamadas registradas</td></tr>';
                } else {
                    // Generar filas de llamadas con el diseño moderno
                    callsData.forEach(call => {
                        const callRow = createCallRow(call);
                        callsTableBody.appendChild(callRow);
                    });
                }
                
                // Actualizar contador
                updateCallsCount();
                
                // Inicializar dropdowns de Bootstrap
                initializeDropdowns();
            }
            
            console.log(` ${callsData.length} llamadas cargadas correctamente`);
        })
        .catch(error => {
            console.error(' Error al cargar llamadas:', error.message);
            
            if (callsTableBody) {
                callsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar datos. Intente de nuevo más tarde.</td></tr>';
            }
        });
    };
    
    // Sobreescribir la función loadEmailsData para usar la configuración API_CONFIG
    window.loadEmailsData = function() {
        console.log(' Cargando datos de emails desde el backend...');
        
        // Obtener token de autenticación (nombre correcto)
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error(' No se encontró token de autenticación');
            console.error('Error de autenticación. Por favor, inicie sesión nuevamente.');
            // Redireccionar a login si no hay token
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Mostrar indicador de carga
        const emailsTableBody = document.getElementById('emails-table-body');
        if (emailsTableBody) {
            emailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Cargando emails...</p></td></tr>';
        }
        
        // Realizar petición al backend con la URL correcta desde API_CONFIG
        fetch(API_CONFIG.apiBaseUrl + API_CONFIG.DASHBOARD.EMAILS, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado o no válido
                    localStorage.removeItem('auth_token');
                    console.error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    console.error(`Error al cargar emails: ${response.status}`);
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(emailsData => {
            // Limpiar tabla de emails
            if (emailsTableBody) {
                emailsTableBody.innerHTML = '';
                
                if (emailsData.length === 0) {
                    // Mostrar mensaje si no hay datos
                    emailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No hay emails registrados</td></tr>';
                } else {
                    // Generar filas de emails
                    emailsData.forEach(email => {
                        const emailRow = createEmailRow(email);
                        emailsTableBody.appendChild(emailRow);
                    });
                }
                
                // Actualizar contador
                updateEmailsCount();
                
                // Inicializar dropdowns de Bootstrap
                initializeDropdowns();
            }
            
            // Actualizar hora de última actualización
            const lastUpdateElement = document.getElementById('emails-last-update');
            if (lastUpdateElement) {
                const now = new Date();
                const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                lastUpdateElement.textContent = formattedDate;
            }
            
            console.log(` ${emailsData.length} emails cargados correctamente`);
        })
        .catch(error => {
            console.error(' Error al cargar emails:', error.message);
            
            if (emailsTableBody) {
                emailsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar datos. Intente de nuevo más tarde.</td></tr>';
            }
        });
    };

    // Sobreescribir la función markCallAsManaged para usar token y endpoints correctos
    window.markCallAsManaged = function(callId, element) {
        console.log(` Marcando llamada ${callId} como gestionada...`);
        console.log(`📞 Marcando llamada ${callId} como gestionada...`);
        
        // Obtener token de autenticación (nombre correcto)
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('❌ No se encontró token de autenticación');
            console.error('Error de autenticación', 'Error');
            return;
        }
        
        // Verificar si el elemento existe
        const buttonElement = element || document.querySelector(`[data-call-id="${callId}"]`);
        if (!buttonElement) {
            console.error(`❌ No se encontró el botón para la llamada ${callId}`);
            return;
        }
        
        // Determinar el estado actual
        const isManaged = buttonElement.dataset.managed === 'true';
        
        // Cambiar visual inmediatamente para feedback rápido
        const icon = buttonElement.querySelector('i');
        const statusBadge = document.querySelector(`#call-${callId} .status-badge`);
        
        if (icon) {
            // Actualizar icono
            if (isManaged) {
                icon.classList.remove('fa-check-circle');
                icon.classList.add('fa-circle');
            } else {
                icon.classList.remove('fa-circle');
                icon.classList.add('fa-check-circle');
            }
        }
        
        if (statusBadge) {
            // Actualizar badge
            if (isManaged) {
                statusBadge.classList.remove('bg-success');
                statusBadge.classList.add('bg-warning');
                statusBadge.textContent = 'Pendiente';
            } else {
                statusBadge.classList.remove('bg-warning');
                statusBadge.classList.add('bg-success');
                statusBadge.textContent = 'Gestionada';
            }
        }
        
        // Actualizar dataset
        buttonElement.dataset.managed = !isManaged;
        
        // Enviar al backend con la URL correcta desde API_CONFIG
        fetch(`${API_CONFIG.apiBaseUrl}/api/calls/${callId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ managed: !isManaged })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`✅ Llamada ${callId} actualizada correctamente:`, data);
            console.log(`Llamada ${isManaged ? 'desmarcada' : 'marcada'} como ${isManaged ? 'pendiente' : 'gestionada'}`, 'Actualizado');
            
            // Actualizar contador
            updateCallsCount();
        })
        .catch(error => {
            console.error(`❌ Error al actualizar llamada ${callId}:`, error.message);
            console.error('Error al actualizar estado de la llamada', 'Error');
            
            // Revertir cambios visuales si hay error
            if (icon) {
                if (!isManaged) {
                    icon.classList.remove('fa-check-circle');
                    icon.classList.add('fa-circle');
                } else {
                    icon.classList.remove('fa-circle');
                    icon.classList.add('fa-check-circle');
                }
            }
            
            if (statusBadge) {
                if (!isManaged) {
                    statusBadge.classList.remove('bg-success');
                    statusBadge.classList.add('bg-warning');
                    statusBadge.textContent = 'Pendiente';
                } else {
                    statusBadge.classList.remove('bg-warning');
                    statusBadge.classList.add('bg-success');
                    statusBadge.textContent = 'Gestionada';
                }
            }
            
            buttonElement.dataset.managed = isManaged;
        });
    };
    
    // Sobreescribir la función markEmailAsRead para usar token y endpoints correctos
    window.markEmailAsRead = function(emailId, element) {
        console.log(`📧 Marcando email ${emailId} como leído...`);
        
        // Obtener token de autenticación (nombre correcto)
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('❌ No se encontró token de autenticación');
            console.error('Error de autenticación', 'Error');
            return;
        }
        
        // Verificar si el elemento existe
        const rowElement = element || document.querySelector(`#email-${emailId}`);
        if (!rowElement) {
            console.error(`❌ No se encontró la fila para el email ${emailId}`);
            return;
        }
        
        // Determinar el estado actual
        const isRead = rowElement.dataset.read === 'true';
        
        // Cambiar visual inmediatamente para feedback rápido
        if (isRead) {
            rowElement.classList.remove('read');
            rowElement.classList.add('unread');
            rowElement.dataset.read = 'false';
        } else {
            rowElement.classList.remove('unread');
            rowElement.classList.add('read');
            rowElement.dataset.read = 'true';
        }
        
        // Enviar al backend con la URL correcta desde API_CONFIG
        fetch(`${API_CONFIG.apiBaseUrl}/api/emails/${emailId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: !isRead })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`✅ Email ${emailId} actualizado correctamente:`, data);
            
            // Actualizar contador
            updateEmailsCount();
        })
        .catch(error => {
            console.error(`❌ Error al actualizar email ${emailId}:`, error.message);
            console.error('Error al actualizar estado del email', 'Error');
            
            // Revertir cambios visuales si hay error
            if (isRead) {
                rowElement.classList.remove('unread');
                rowElement.classList.add('read');
                rowElement.dataset.read = 'true';
            } else {
                rowElement.classList.remove('read');
                rowElement.classList.add('unread');
                rowElement.dataset.read = 'false';
            }
        });
    };

    console.log('✅ Conexiones reales a API configuradas correctamente');
});
