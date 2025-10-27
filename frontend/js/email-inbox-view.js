/**
 * email-inbox-view.js
 * 
 * Transforma la vista de emails en una interfaz tipo Gmail
 * con panel lateral de lista y panel principal de contenido
 */

(function() {
    'use strict';

    let hasInitialized = false; // Flag para evitar múltiples inicializaciones
    let checkAttempts = 0;
    const maxAttempts = 10; // Máximo 10 intentos (10 segundos)

    // Esperar a que el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // Verificar periódicamente si los emails están cargando o ya se cargaron
        checkEmailsStatus();
    });

    /**
     * Verificar el estado de carga de emails
     */
    function checkEmailsStatus() {
        if (hasInitialized) return;

        checkAttempts++;
        console.log(`🔍 Verificando estado de emails (intento ${checkAttempts}/${maxAttempts})...`);

        const loadingMsg = document.getElementById('email-loading-message');
        const notConfiguredMsg = document.getElementById('email-not-configured-message');
        const emailTableBody = document.getElementById('emails-table-body');

        // Si está cargando, mostrar mensaje de carga
        if (window.emailsLoading === true) {
            console.log('⏳ Emails cargando, mostrando spinner...');
            if (loadingMsg) loadingMsg.style.display = 'block';
            if (notConfiguredMsg) notConfiguredMsg.style.display = 'none';
            
            // Seguir verificando
            setTimeout(checkEmailsStatus, 1000);
            return;
        }

        // Si ya hay emails en la tabla, inicializar vista
        const emailRows = emailTableBody ? emailTableBody.querySelectorAll('tr') : [];
        if (emailRows.length > 0) {
            console.log(`✅ ${emailRows.length} emails detectados, inicializando vista...`);
            if (loadingMsg) loadingMsg.style.display = 'none';
            initInboxView();
            return;
        }

        // Si llegamos al máximo de intentos, mostrar mensaje de no configurado
        if (checkAttempts >= maxAttempts) {
            console.log('⏱️ Tiempo de espera agotado, mostrando mensaje de no configurado...');
            if (loadingMsg) loadingMsg.style.display = 'none';
            if (notConfiguredMsg) notConfiguredMsg.style.display = 'block';
            hasInitialized = true;
            return;
        }

        // Seguir verificando
        setTimeout(checkEmailsStatus, 1000);
    }

    /**
     * Inicializar vista de bandeja de entrada
     */
    function initInboxView() {
        if (hasInitialized) {
            console.log('⚠️ Vista de bandeja ya inicializada, omitiendo...');
            return;
        }

        console.log('📧 Inicializando vista de bandeja de entrada...');

        // Buscar el contenedor de emails
        const emailsContent = document.getElementById('emails-content');
        if (!emailsContent) {
            console.warn('⚠️ No se encontró el contenedor de emails');
            return;
        }

        // IMPORTANTE: Extraer emails ANTES de reemplazar el contenido
        const emails = extractEmailsBeforeReplacing();
        console.log(`📧 ${emails.length} emails capturados antes de reemplazar layout`);

        // Si no hay emails, mostrar mensaje y no continuar
        if (emails.length === 0) {
            console.log('⏳ No hay emails configurados, mostrando mensaje inicial...');
            const loadingMsg = document.getElementById('email-loading-message');
            const notConfiguredMsg = document.getElementById('email-not-configured-message');
            
            // Ocultar mensaje de carga y mostrar mensaje de "no configurado"
            if (loadingMsg) loadingMsg.style.display = 'none';
            if (notConfiguredMsg) notConfiguredMsg.style.display = 'block';
            
            hasInitialized = true; // Marcar como inicializado para no reintentar
            return;
        }

        // Ocultar ambos mensajes (carga y no configurado)
        const loadingMsg = document.getElementById('email-loading-message');
        const notConfiguredMsg = document.getElementById('email-not-configured-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (notConfiguredMsg) notConfiguredMsg.style.display = 'none';

        // Marcar como inicializado para evitar loops
        hasInitialized = true;

        // Reemplazar el contenido con la nueva vista
        createInboxLayout(emailsContent);

        // Renderizar emails en la nueva vista
        renderEmailList(emails);

        // Configurar event listeners para filtros
        setupFilterListeners();
    }

    /**
     * Extraer emails ANTES de reemplazar el layout
     */
    function extractEmailsBeforeReplacing() {
        const emails = [];

        // Intentar buscar la tabla original
        const emailTableBody = document.getElementById('emails-table-body');
        if (emailTableBody) {
            const rows = emailTableBody.querySelectorAll('tr');
            console.log(`📧 Encontradas ${rows.length} filas en tabla original`);
            
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    emails.push({
                        id: row.dataset.emailId || (index + 1),
                        important: cells[0].querySelector('.fa-star')?.classList.contains('text-warning'),
                        sender: cells[1].textContent.trim(),
                        subject: cells[2].textContent.trim(),
                        preview: cells[3].textContent.trim(),
                        date: cells[4].textContent.trim(),
                        unread: row.classList.contains('unread') || row.classList.contains('fw-bold')
                    });
                }
            });
        }

        // Si no se encontró la tabla, buscar por clase
        if (emails.length === 0) {
            const emailRows = document.querySelectorAll('.email-row');
            console.log(`📧 Encontradas ${emailRows.length} filas por clase .email-row`);
            
            emailRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    emails.push({
                        id: row.dataset.emailId || (index + 1),
                        important: cells[0].querySelector('.fa-star')?.classList.contains('text-warning'),
                        sender: cells[1].textContent.trim(),
                        subject: cells[2].textContent.trim(),
                        preview: cells[3].textContent.trim(),
                        date: cells[4].textContent.trim(),
                        unread: row.classList.contains('unread') || row.classList.contains('fw-bold')
                    });
                }
            });
        }

        return emails;
    }

    /**
     * Crear el layout de la bandeja de entrada
     */
    function createInboxLayout(container) {
        const newHTML = `
            <div class="container-fluid pt-2 pb-0 h-100">
                <div class="row g-0 h-100">
                    <!-- Panel lateral: Lista de emails -->
                    <div class="col-md-4 border-end" style="height: calc(100vh - 150px); overflow-y: auto;">
                        <div class="p-3 border-bottom bg-light">
                            <h5 class="mb-0"><i class="fas fa-inbox me-2"></i>Bandeja de Entrada</h5>
                        </div>
                        
                        <!-- Buscador -->
                        <div class="p-3 border-bottom">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white">
                                    <i class="fas fa-search text-muted"></i>
                                </span>
                                <input type="text" class="form-control" id="inbox-search" placeholder="Buscar emails...">
                            </div>
                        </div>

                        <!-- Filtros -->
                        <div class="p-3 border-bottom">
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <input type="radio" class="btn-check" name="inbox-filter" id="filter-all" checked>
                                <label class="btn btn-outline-primary" for="filter-all">
                                    <i class="fas fa-inbox me-1"></i>Todos
                                </label>
                                
                                <input type="radio" class="btn-check" name="inbox-filter" id="filter-unread">
                                <label class="btn btn-outline-primary" for="filter-unread">
                                    <i class="fas fa-envelope me-1"></i>No leídos
                                </label>
                                
                                <input type="radio" class="btn-check" name="inbox-filter" id="filter-important">
                                <label class="btn btn-outline-primary" for="filter-important">
                                    <i class="fas fa-star me-1"></i>Importantes
                                </label>
                            </div>
                        </div>

                        <!-- Lista de emails -->
                        <div id="inbox-email-list">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                                <p class="mt-3 text-muted">Cargando emails...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Panel principal: Contenido del email -->
                    <div class="col-md-8" style="height: calc(100vh - 150px); overflow-y: auto;">
                        <div id="inbox-email-content">
                            <div class="d-flex align-items-center justify-content-center h-100">
                                <div class="text-center text-muted">
                                    <i class="fas fa-envelope-open-text fa-4x mb-3 opacity-25"></i>
                                    <h5>Selecciona un email para verlo</h5>
                                    <p>Haz clic en un email de la lista para ver su contenido completo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = newHTML;
        console.log('✅ Layout de bandeja de entrada creado');
    }

    /**
     * Cargar emails en la nueva vista
     */
    function loadEmailsIntoInbox() {
        // Buscar la tabla original de emails
        const emailTableBody = document.getElementById('emails-table-body');
        if (!emailTableBody) {
            console.warn('⚠️ No se encontró la tabla de emails original, buscando filas alternativas...');
            
            // Intentar buscar filas de email por clase
            const emailRows = document.querySelectorAll('.email-row');
            if (emailRows.length > 0) {
                console.log(`📧 Encontradas ${emailRows.length} filas de email por clase`);
                extractEmailsFromRows(emailRows);
                return;
            }
            
            // Si no hay emails, mostrar mensaje vacío
            renderEmailList([]);
            return;
        }

        // Extraer emails de la tabla
        const emailRows = emailTableBody.querySelectorAll('tr');
        extractEmailsFromRows(emailRows);
    }

    /**
     * Extraer emails de las filas
     */
    function extractEmailsFromRows(emailRows) {
        const emails = [];

        emailRows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const email = {
                    id: row.dataset.emailId || (index + 1),
                    important: cells[0].querySelector('.fa-star')?.classList.contains('text-warning'),
                    sender: cells[1].textContent.trim(),
                    subject: cells[2].textContent.trim(),
                    preview: cells[3].textContent.trim(),
                    date: cells[4].textContent.trim(),
                    unread: row.classList.contains('unread') || row.classList.contains('fw-bold')
                };
                emails.push(email);
            }
        });

        console.log(`📧 ${emails.length} emails encontrados`);

        // Renderizar emails en la lista
        renderEmailList(emails);
    }

    // Variable global para almacenar todos los emails
    let allEmails = [];
    let currentFilter = 'all';

    /**
     * Renderizar lista de emails
     */
    function renderEmailList(emails) {
        // Guardar todos los emails para filtrado
        allEmails = emails;

        const listContainer = document.getElementById('inbox-email-list');
        if (!listContainer) return;

        // Aplicar filtro actual
        const filteredEmails = filterEmails(allEmails, currentFilter);

        if (filteredEmails.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-inbox fa-3x mb-3 opacity-25"></i>
                    <p>No hay emails para mostrar</p>
                </div>
            `;
            return;
        }

        let html = '';
        filteredEmails.forEach(email => {
            const unreadClass = email.unread ? 'bg-light fw-bold' : '';
            const importantIcon = email.important ? '<i class="fas fa-star text-warning me-2"></i>' : '<i class="far fa-star text-muted me-2"></i>';
            
            html += `
                <div class="email-list-item border-bottom p-3 ${unreadClass}" 
                     style="cursor: pointer; transition: background-color 0.2s;"
                     data-email-id="${email.id}"
                     data-unread="${email.unread}"
                     data-important="${email.important}"
                     onmouseover="this.style.backgroundColor='#f8f9fa'"
                     onmouseout="this.style.backgroundColor='${email.unread ? '#f8f9fa' : 'white'}'">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="flex-grow-1">
                            <span class="star-icon" style="cursor: pointer;" onclick="window.InboxView.toggleImportant('${email.id}', event)">
                                ${importantIcon}
                            </span>
                            <span class="text-dark">${email.sender}</span>
                        </div>
                        <small class="text-muted">${email.date}</small>
                    </div>
                    <div class="text-dark mb-1">${email.subject}</div>
                    <div class="text-muted small text-truncate">${email.preview}</div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Agregar event listeners para click en email
        const emailItems = listContainer.querySelectorAll('.email-list-item');
        emailItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Ignorar click en estrella
                if (e.target.closest('.star-icon')) return;
                
                const emailId = this.dataset.emailId;
                const email = allEmails.find(e => e.id == emailId);
                if (email) {
                    showEmailContent(email);
                    
                    // Marcar como leído en UI
                    email.unread = false;
                    this.classList.remove('bg-light', 'fw-bold');
                    this.dataset.unread = 'false';
                    
                    // Marcar como leído en el backend
                    markEmailAsReadInBackend(emailId);
                }
            });
        });

        console.log(`✅ ${filteredEmails.length} emails renderizados (filtro: ${currentFilter})`);
    }

    /**
     * Filtrar emails según criterio
     */
    function filterEmails(emails, filter) {
        switch(filter) {
            case 'unread':
                return emails.filter(e => e.unread);
            case 'important':
                return emails.filter(e => e.important);
            case 'all':
            default:
                return emails;
        }
    }

    /**
     * Cambiar filtro activo
     */
    function setFilter(filter) {
        currentFilter = filter;
        console.log(`🔍 Filtro cambiado a: ${filter}`);
        renderEmailList(allEmails);
    }

    /**
     * Toggle importante
     */
    function toggleImportant(emailId, event) {
        event.stopPropagation();
        
        const email = allEmails.find(e => e.id == emailId);
        if (email) {
            email.important = !email.important;
            console.log(`⭐ Email ${emailId} marcado como ${email.important ? 'importante' : 'normal'}`);
            renderEmailList(allEmails);
        }
    }

    /**
     * Marcar email como leído en el backend
     */
    function markEmailAsReadInBackend(emailId) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        fetch(`${API_BASE_URL}/api/email/mark-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailId: emailId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log(`✅ Email ${emailId} marcado como leído en Gmail`);
            }
        })
        .catch(error => {
            console.error('❌ Error marcando email como leído:', error);
        });
    }

    /**
     * Configurar event listeners para los filtros
     */
    function setupFilterListeners() {
        console.log('🔧 Configurando filtros de bandeja de entrada...');

        // Botón "Todos"
        const filterAll = document.getElementById('filter-all');
        if (filterAll) {
            filterAll.addEventListener('change', function() {
                if (this.checked) {
                    setFilter('all');
                }
            });
        }

        // Botón "No leídos"
        const filterUnread = document.getElementById('filter-unread');
        if (filterUnread) {
            filterUnread.addEventListener('change', function() {
                if (this.checked) {
                    setFilter('unread');
                }
            });
        }

        // Botón "Importantes"
        const filterImportant = document.getElementById('filter-important');
        if (filterImportant) {
            filterImportant.addEventListener('change', function() {
                if (this.checked) {
                    setFilter('important');
                }
            });
        }

        console.log('✅ Filtros configurados correctamente');
    }

    /**
     * Mostrar contenido completo del email
     */
    function showEmailContent(email) {
        const contentContainer = document.getElementById('inbox-email-content');
        if (!contentContainer) return;

        const html = `
            <div class="p-4">
                <!-- Cabecera del email -->
                <div class="border-bottom pb-3 mb-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h4 class="mb-0">${email.subject}</h4>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" title="Responder">
                                <i class="fas fa-reply"></i>
                            </button>
                            <button class="btn btn-outline-secondary" title="Reenviar">
                                <i class="fas fa-share"></i>
                            </button>
                            <button class="btn btn-outline-secondary" title="Archivar">
                                <i class="fas fa-archive"></i>
                            </button>
                            <button class="btn btn-outline-danger" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                                 style="width: 48px; height: 48px; font-size: 20px;">
                                ${email.sender.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-bold">${email.sender}</div>
                            <div class="text-muted small">Para: mí</div>
                        </div>
                        <div class="text-muted small">${email.date}</div>
                    </div>
                </div>

                <!-- Contenido del email -->
                <div class="email-body">
                    <p>${email.preview}</p>
                    <p class="text-muted mt-4">
                        <em>Este es un email de prueba. El contenido completo se mostrará aquí cuando se integre con el backend.</em>
                    </p>
                </div>

                <!-- Hilo de conversación (si existe) -->
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">
                        <i class="fas fa-comments me-2"></i>Hilo de conversación
                    </h6>
                    <div class="alert alert-light">
                        <i class="fas fa-info-circle me-2"></i>
                        No hay mensajes anteriores en este hilo
                    </div>
                </div>

                <!-- Respuesta rápida -->
                <div class="mt-4 pt-4 border-top">
                    <h6 class="mb-3">Responder</h6>
                    <textarea class="form-control mb-3" rows="4" placeholder="Escribe tu respuesta..."></textarea>
                    <div class="d-flex justify-content-between">
                        <div>
                            <button class="btn btn-sm btn-outline-secondary me-2">
                                <i class="fas fa-paperclip me-1"></i>Adjuntar
                            </button>
                            <button class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-image me-1"></i>Imagen
                            </button>
                        </div>
                        <button class="btn btn-primary">
                            <i class="fas fa-paper-plane me-2"></i>Enviar
                        </button>
                    </div>
                </div>
            </div>
        `;

        contentContainer.innerHTML = html;
        console.log('✅ Contenido del email mostrado:', email.subject);
    }

    // Exportar funciones globalmente si es necesario
    window.InboxView = {
        init: initInboxView,
        renderEmailList: renderEmailList,
        showEmailContent: showEmailContent,
        setFilter: setFilter,
        toggleImportant: toggleImportant
    };

})();
