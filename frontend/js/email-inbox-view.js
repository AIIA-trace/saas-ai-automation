/**
 * email-inbox-view.js
 * 
 * Transforma la vista de emails en una interfaz tipo Gmail
 * con panel lateral de lista y panel principal de contenido
 */

(function() {
    'use strict';

    // Variables globales del módulo
    let allEmails = [];
    let currentFilter = 'all';
    let currentMailbox = 'inbox'; // 'inbox' o 'sent'
    let hasInitialized = false;
    let checkAttempts = 0;
    const maxAttempts = 10; // Max 10 attempts (10 seconds)

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
            console.log('⏳ Emails cargando desde Gmail, mostrando spinner...');
            if (loadingMsg) loadingMsg.style.display = 'block';
            if (notConfiguredMsg) notConfiguredMsg.style.display = 'none';
            
            // Seguir verificando
            setTimeout(checkEmailsStatus, 1000);
            return;
        }

        // Si ya hay emails en la tabla Y no está cargando, inicializar vista
        const emailRows = emailTableBody ? emailTableBody.querySelectorAll('tr') : [];
        
        // Verificar que no sean emails de prueba (los de prueba tienen IDs 1, 2, 3)
        const hasRealEmails = Array.from(emailRows).some(row => {
            const emailId = row.dataset.emailId;
            // Los emails reales de Gmail tienen IDs largos (16+ caracteres)
            return emailId && emailId.length > 10;
        });

        if (emailRows.length > 0 && hasRealEmails) {
            console.log(`✅ ${emailRows.length} emails REALES de Gmail detectados, inicializando vista...`);
            if (loadingMsg) loadingMsg.style.display = 'none';
            initInboxView();
            return;
        }

        // Si hay emails pero son de prueba, seguir esperando
        if (emailRows.length > 0 && !hasRealEmails && checkAttempts < maxAttempts) {
            console.log(`⏳ Detectados ${emailRows.length} emails de prueba, esperando emails reales...`);
            setTimeout(checkEmailsStatus, 1000);
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

        // Inicializar modal de composición
        if (window.initComposeModal) {
            window.initComposeModal();
        }
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
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="mb-0"><i class="fas fa-inbox me-2"></i>Bandeja de Entrada</h5>
                                <button class="btn btn-primary btn-sm" id="compose-email-btn">
                                    <i class="fas fa-pen me-1"></i>Redactar
                                </button>
                            </div>
                        </div>
                        
                        <!-- Buscador -->
                        <div class="p-3 border-bottom">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white">
                                    <i class="fas fa-search text-muted"></i>
                                </span>
                                <input type="text" class="form-control" id="email-search-input" placeholder="Buscar emails...">
                            </div>
                        </div>

                        <!-- Filtros de bandeja -->
                        <div class="p-3 border-bottom">
                            <div class="btn-group btn-group-sm w-100 mb-2" role="group">
                                <input type="radio" class="btn-check" name="mailbox-type" id="mailbox-inbox" checked>
                                <label class="btn btn-outline-success" for="mailbox-inbox">
                                    <i class="fas fa-inbox me-1"></i>Recibidos
                                </label>
                                
                                <input type="radio" class="btn-check" name="mailbox-type" id="mailbox-sent">
                                <label class="btn btn-outline-success" for="mailbox-sent">
                                    <i class="fas fa-paper-plane me-1"></i>Enviados
                                </label>
                            </div>
                        </div>

                        <!-- Filtros de estado -->
                        <div class="p-3 border-bottom">
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <input type="radio" class="btn-check" name="inbox-filter" id="filter-all" checked>
                                <label class="btn btn-outline-primary" for="filter-all">
                                    <i class="fas fa-list me-1"></i>Todos
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

                        <!-- Contador de resultados -->
                        <div class="px-3 py-2 bg-light border-bottom">
                            <small class="text-muted" id="emails-search-results">Mostrando todos los emails</small>
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
            // Solo barra azul lateral para emails no leídos
            const unreadClass = email.unread ? 'border-start border-primary border-3' : '';
            const checkboxClass = email.important ? 'custom-checkbox checked' : 'custom-checkbox';
            
            html += `
                <div class="email-list-item border-bottom p-3 ${unreadClass}" 
                     style="cursor: pointer; transition: background-color 0.2s; background-color: white;"
                     data-email-id="${email.id}"
                     data-unread="${email.unread}"
                     data-important="${email.important}"
                     onmouseover="this.style.backgroundColor='#f8f9fa'"
                     onmouseout="this.style.backgroundColor='white'">
                    <div class="d-flex align-items-start mb-2">
                        <div class="${checkboxClass}" 
                             style="min-width: 20px; margin-right: 10px; margin-top: 2px;"
                             onclick="window.InboxView.toggleImportant('${email.id}', event)">
                        </div>
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <span class="text-dark fw-medium text-truncate" style="flex: 1; min-width: 0;">${email.sender || email.from || email.fromName || 'Desconocido'}</span>
                                <small class="text-muted ms-2" style="flex-shrink: 0;">${formatEmailDate(email.date)}</small>
                            </div>
                            <div class="text-dark mb-1 text-truncate">${email.subject || '(Sin asunto)'}</div>
                            <div class="text-muted small text-truncate">${email.preview || email.snippet || ''}</div>
                        </div>
                    </div>
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
                    this.classList.remove('border-start', 'border-primary', 'border-3');
                    this.style.backgroundColor = 'white';
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
            const newImportantState = !email.important;
            email.important = newImportantState;
            
            console.log(`⭐ Email ${emailId} marcado como ${email.important ? 'importante' : 'normal'}`);
            
            // Actualizar en el backend (Gmail)
            toggleImportantInBackend(emailId, newImportantState);
            
            // Re-renderizar para aplicar filtros y búsqueda actuales
            const searchInput = document.getElementById('email-search-input');
            const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
            
            if (searchTerm) {
                searchInEmails(searchTerm);
            } else {
                renderEmailList(allEmails);
            }
        }
    }

    /**
     * Marcar email como importante en el backend
     */
    function toggleImportantInBackend(emailId, starred) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        fetch(`${API_BASE_URL}/api/email/toggle-starred`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                emailId: emailId,
                starred: starred
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log(`✅ Email ${emailId} ${starred ? 'marcado' : 'desmarcado'} como importante en Gmail`);
            }
        })
        .catch(error => {
            console.error('❌ Error cambiando estado de importante:', error);
        });
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

        // Botones de tipo de bandeja
        const mailboxInbox = document.getElementById('mailbox-inbox');
        const mailboxSent = document.getElementById('mailbox-sent');

        if (mailboxInbox) {
            mailboxInbox.addEventListener('change', function() {
                if (this.checked) {
                    switchMailbox('inbox');
                }
            });
        }

        if (mailboxSent) {
            mailboxSent.addEventListener('change', function() {
                if (this.checked) {
                    switchMailbox('sent');
                }
            });
        }

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

        // Configurar buscador
        setupSearchListener();

        // Configurar scroll infinito
        setupInfiniteScroll();

        console.log('✅ Filtros configurados correctamente');
    }

    /**
     * Cambiar de bandeja (Recibidos/Enviados)
     */
    function switchMailbox(mailbox) {
        currentMailbox = mailbox;
        console.log(`📬 Cambiando a bandeja: ${mailbox === 'inbox' ? 'Recibidos' : 'Enviados'}`);

        // Cargar emails de la bandeja correspondiente
        if (mailbox === 'sent') {
            // Mostrar spinner solo para enviados
            const listContainer = document.getElementById('inbox-email-list');
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-3 text-muted">Cargando enviados...</p>
                    </div>
                `;
            }
            loadSentEmails();
        } else {
            // Recargar inbox sin recargar página
            console.log('🔄 Recargando bandeja de entrada...');
            loadInboxEmails();
        }
    }

    /**
     * Cargar emails de la bandeja de entrada
     */
    function loadInboxEmails() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        // Mostrar indicador sutil de carga (sin reemplazar toda la lista)
        const listContainer = document.getElementById('inbox-email-list');
        const existingEmails = listContainer ? listContainer.innerHTML : '';
        
        fetch(`${API_BASE_URL}/api/email/inbox?limit=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.emails) {
                console.log(`✅ ${data.emails.length} emails recibidos actualizados`);
                
                // Guardar nextPageToken
                window.emailNextPageToken = data.nextPageToken;
                
                // Mapear emails al formato esperado
                const mappedEmails = data.emails.map(email => ({
                    id: email.id,
                    sender: email.from || 'Desconocido',
                    from: email.from,
                    to: email.to,
                    subject: email.subject,
                    preview: email.snippet || email.body?.substring(0, 100) || '',
                    date: formatEmailDate(email.date),
                    unread: !email.isRead,
                    important: email.isStarred
                }));

                allEmails = mappedEmails;
                renderEmailList(mappedEmails);
            }
        })
        .catch(error => {
            console.error('❌ Error cargando emails recibidos:', error);
            // Restaurar contenido anterior si hay error
            if (listContainer && existingEmails) {
                listContainer.innerHTML = existingEmails;
            }
        });
    }

    /**
     * Cargar emails enviados
     */
    function loadSentEmails() {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        fetch(`${API_BASE_URL}/api/email/sent?limit=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.emails) {
                console.log(`✅ ${data.emails.length} emails enviados cargados`);
                
                // Mapear emails enviados al formato esperado
                const mappedEmails = data.emails.map(email => ({
                    id: email.id,
                    sender: email.to || 'Desconocido', // En enviados, mostramos el destinatario
                    from: email.from,
                    to: email.to,
                    subject: email.subject,
                    preview: email.snippet || email.body?.substring(0, 100) || '',
                    date: formatEmailDate(email.date),
                    unread: !email.isRead,
                    important: email.isStarred
                }));

                allEmails = mappedEmails;
                renderEmailList(mappedEmails);
            }
        })
        .catch(error => {
            console.error('❌ Error cargando emails enviados:', error);
            const listContainer = document.getElementById('inbox-email-list');
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="alert alert-danger m-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar emails enviados
                    </div>
                `;
            }
        });
    }

    /**
     * Configurar scroll infinito
     */
    function setupInfiniteScroll() {
        const emailListContainer = document.getElementById('inbox-email-list');
        if (!emailListContainer) return;

        // Obtener el contenedor padre con scroll
        const scrollContainer = emailListContainer.closest('[style*="overflow-y"]');
        if (!scrollContainer) {
            console.warn('⚠️ No se encontró contenedor con scroll');
            return;
        }

        scrollContainer.addEventListener('scroll', function() {
            // Verificar si llegamos al final (con margen de 100px)
            const scrollTop = this.scrollTop;
            const scrollHeight = this.scrollHeight;
            const clientHeight = this.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 100) {
                // Cargar más emails si hay disponibles
                if (window.emailNextPageToken && !window.emailsLoadingMore) {
                    console.log('📜 Llegaste al final, cargando más emails...');
                    loadMoreEmailsForInbox();
                }
            }
        });

        console.log('✅ Scroll infinito configurado');
    }

    /**
     * Cargar más emails para la bandeja de entrada
     */
    function loadMoreEmailsForInbox() {
        // Verificar si ya hay una carga en progreso
        if (window.emailsLoadingMore) {
            console.log('⏳ Ya hay una carga en progreso...');
            return;
        }

        // Verificar si hay más emails para cargar
        if (!window.emailNextPageToken) {
            console.log('✅ No hay más emails para cargar');
            showEndOfInbox();
            return;
        }

        // Marcar como cargando
        window.emailsLoadingMore = true;

        // Mostrar indicador de carga (solo si no existe ya)
        const emailListContainer = document.getElementById('inbox-email-list');
        if (emailListContainer && !document.getElementById('loading-more-emails')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loading-more-emails';
            loadingIndicator.className = 'text-center py-3 border-top';
            loadingIndicator.innerHTML = `
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 mb-0 text-muted small">Cargando más emails...</p>
            `;
            emailListContainer.appendChild(loadingIndicator);
        }

        // Cargar más emails desde el backend
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        const endpoint = currentMailbox === 'sent' 
            ? `/api/email/sent?limit=30&pageToken=${window.emailNextPageToken}`
            : `/api/email/inbox?limit=30&pageToken=${window.emailNextPageToken}`;

        fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Remover indicador de carga
            const loadingIndicator = document.getElementById('loading-more-emails');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }

            if (data.success && data.emails && data.emails.length > 0) {
                console.log(`✅ ${data.emails.length} emails adicionales cargados`);
                
                // Actualizar nextPageToken
                window.emailNextPageToken = data.nextPageToken;
                
                // Mapear nuevos emails
                const newEmails = data.emails.map(email => ({
                    id: email.id,
                    sender: currentMailbox === 'sent' ? (email.to || 'Desconocido') : (email.from || 'Desconocido'),
                    from: email.from,
                    to: email.to,
                    subject: email.subject,
                    preview: email.snippet || email.body?.substring(0, 100) || '',
                    date: formatEmailDate(email.date),
                    unread: !email.isRead,
                    important: email.isStarred
                }));

                // Agregar a la lista existente
                allEmails = [...allEmails, ...newEmails];
                
                // Re-renderizar
                renderEmailList(allEmails);
                
                // Si no hay más, mostrar mensaje
                if (!data.nextPageToken) {
                    showEndOfInbox();
                }
            } else {
                // No hay más emails
                showEndOfInbox();
            }
        })
        .catch(error => {
            console.error('❌ Error cargando más emails:', error);
            const loadingIndicator = document.getElementById('loading-more-emails');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        })
        .finally(() => {
            // Desmarcar como cargando
            window.emailsLoadingMore = false;
        });
    }

    /**
     * Mostrar mensaje de fin de bandeja
     */
    function showEndOfInbox() {
        const emailListContainer = document.getElementById('inbox-email-list');
        if (emailListContainer && !document.getElementById('end-of-inbox')) {
            const endMessage = document.createElement('div');
            endMessage.id = 'end-of-inbox';
            endMessage.className = 'text-center py-3 border-top';
            endMessage.innerHTML = `
                <p class="mb-0 text-muted small">
                    <i class="fas fa-check-circle me-2"></i>Fin de la bandeja
                </p>
            `;
            emailListContainer.appendChild(endMessage);
        }
    }

    /**
     * Configurar event listener para el buscador
     */
    function setupSearchListener() {
        const searchInput = document.getElementById('email-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            searchInEmails(searchTerm);
        });

        console.log('🔍 Buscador de emails configurado');
    }

    /**
     * Buscar en emails
     */
    function searchInEmails(searchTerm) {
        if (!allEmails || allEmails.length === 0) {
            console.warn('⚠️ No hay emails para buscar');
            return;
        }

        let filteredEmails = allEmails;

        // Si hay término de búsqueda, filtrar
        if (searchTerm) {
            filteredEmails = allEmails.filter(email => {
                const sender = (email.sender || email.from || email.fromName || '').toLowerCase();
                const subject = (email.subject || '').toLowerCase();
                const preview = (email.preview || email.snippet || email.body || '').toLowerCase();
                
                return sender.includes(searchTerm) || 
                       subject.includes(searchTerm) || 
                       preview.includes(searchTerm);
            });
            
            console.log(`🔍 Búsqueda: "${searchTerm}" - ${filteredEmails.length} resultados`);
        }

        // Aplicar filtro actual también
        const finalEmails = filterEmails(filteredEmails, currentFilter);

        // Renderizar resultados
        renderFilteredEmails(finalEmails);

        // Actualizar mensaje de resultados
        updateSearchResults(searchTerm, finalEmails.length);
    }

    /**
     * Renderizar emails filtrados (sin guardar en allEmails)
     */
    function renderFilteredEmails(emails) {
        const listContainer = document.getElementById('inbox-email-list');
        if (!listContainer) return;

        if (emails.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-search fa-3x mb-3 opacity-25"></i>
                    <p>No se encontraron emails</p>
                </div>
            `;
            return;
        }

        let html = '';
        emails.forEach(email => {
            const unreadClass = email.unread ? 'bg-light fw-bold' : '';
            const checkboxClass = email.important ? 'custom-checkbox checked' : 'custom-checkbox';
            
            html += `
                <div class="email-list-item border-bottom p-3 ${unreadClass}" 
                     style="cursor: pointer; transition: background-color 0.2s;"
                     data-email-id="${email.id}"
                     data-unread="${email.unread}"
                     data-important="${email.important}"
                     onmouseover="this.style.backgroundColor='#f8f9fa'"
                     onmouseout="this.style.backgroundColor='${email.unread ? '#f8f9fa' : 'white'}'">
                    <div class="d-flex align-items-start mb-2">
                        <div class="${checkboxClass}" 
                             style="min-width: 20px; margin-right: 10px; margin-top: 2px;"
                             onclick="window.InboxView.toggleImportant('${email.id}', event)">
                        </div>
                        <div class="flex-grow-1" style="min-width: 0;">
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <span class="text-dark fw-medium text-truncate" style="flex: 1; min-width: 0;">${email.sender || email.from || email.fromName || 'Desconocido'}</span>
                                <small class="text-muted ms-2" style="flex-shrink: 0;">${formatEmailDate(email.date)}</small>
                            </div>
                            <div class="text-dark mb-1 text-truncate">${email.subject || '(Sin asunto)'}</div>
                            <div class="text-muted small text-truncate">${email.preview || email.snippet || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Agregar event listeners
        const emailItems = listContainer.querySelectorAll('.email-list-item');
        emailItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.star-icon')) return;
                
                const emailId = this.dataset.emailId;
                const email = allEmails.find(e => e.id == emailId);
                if (email) {
                    showEmailContent(email);
                    email.unread = false;
                    this.classList.remove('bg-light', 'fw-bold');
                    this.dataset.unread = 'false';
                    markEmailAsReadInBackend(emailId);
                }
            });
        });
    }

    /**
     * Actualizar mensaje de resultados de búsqueda
     */
    function updateSearchResults(searchTerm, count) {
        const searchResultsElement = document.getElementById('emails-search-results');
        if (!searchResultsElement) return;

        if (!searchTerm) {
            searchResultsElement.textContent = 'Mostrando todos los emails';
        } else if (count === 0) {
            searchResultsElement.textContent = 'No se encontraron emails';
        } else if (count === 1) {
            searchResultsElement.textContent = '1 email encontrado';
        } else {
            searchResultsElement.textContent = `${count} emails encontrados`;
        }
    }

    /**
     * Mostrar contenido completo del email
     */
    function showEmailContent(email) {
        const contentContainer = document.getElementById('inbox-email-content');
        if (!contentContainer) return;

        // Mostrar spinner mientras carga
        contentContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center h-100">
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="text-muted">Cargando detalles del email...</p>
                </div>
            </div>
        `;

        // Cargar detalles completos del email desde el backend
        loadEmailDetails(email.id);
    }

    /**
     * Cargar detalles completos del email (con hilo y adjuntos)
     */
    function loadEmailDetails(emailId) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        fetch(`${API_BASE_URL}/api/email/${emailId}/details`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderEmailDetails(data.email, data.thread, data.threadId);
            }
        })
        .catch(error => {
            console.error('❌ Error cargando detalles del email:', error);
            const contentContainer = document.getElementById('inbox-email-content');
            if (contentContainer) {
                contentContainer.innerHTML = `
                    <div class="alert alert-danger m-4">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error al cargar los detalles del email
                    </div>
                `;
            }
        });
    }

    /**
     * Renderizar detalles completos del email
     */
    function renderEmailDetails(email, thread, threadId) {
        const contentContainer = document.getElementById('inbox-email-content');
        if (!contentContainer) return;

        // Ordenar thread por fecha (más NUEVOS primero)
        const sortedThread = thread.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // El primer mensaje es el más reciente
        const currentMessage = sortedThread[0];
        const previousMessages = sortedThread.slice(1);

        let html = `
            <div class="p-4" id="message-main-message" data-message-id="main-message">
                <!-- Cabecera del email -->
                <div class="border-bottom pb-3 mb-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h4 class="mb-0">${currentMessage.subject || '(Sin asunto)'}</h4>
                        <button class="btn btn-outline-danger btn-sm" onclick="window.InboxView.deleteEmail('${currentMessage.id}')" title="Eliminar">
                            <i class="fas fa-trash me-1"></i>Eliminar
                        </button>
                    </div>
                    
                    <div class="d-flex align-items-start">
                        <div class="me-3">
                            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
                                 style="width: 48px; height: 48px; font-size: 20px;">
                                ${(currentMessage.from || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-bold">${currentMessage.from || 'Desconocido'}</div>
                            <div class="text-muted small">
                                <div><strong>Para:</strong> ${currentMessage.to || 'mí'}</div>
                                ${currentMessage.cc ? `<div><strong>CC:</strong> ${currentMessage.cc}</div>` : ''}
                                ${currentMessage.bcc ? `<div><strong>CCO:</strong> ${currentMessage.bcc}</div>` : ''}
                            </div>
                        </div>
                        <div class="text-muted small">${formatEmailDate(currentMessage.date)}</div>
                    </div>
                </div>

                <!-- Contenido del email -->
                <div class="email-body mb-4" style="max-height: 500px; overflow-y: auto;">
                    ${currentMessage.body || currentMessage.snippet || ''}
                </div>

                <!-- Adjuntos del mensaje actual -->
                ${renderAttachments(currentMessage.attachments, currentMessage.id)}

                <!-- Botones de acción del mensaje principal -->
                <div id="reply-buttons-main-message" class="mt-3 pt-3 border-top">
                    <button class="btn btn-primary me-2 reply-btn" 
                            data-msg-id="main-message" 
                            data-email-id="${currentMessage.id}" 
                            data-from="${escapeAttr(currentMessage.from)}" 
                            data-subject="${escapeAttr(currentMessage.subject)}" 
                            data-message-id="${currentMessage.messageId}" 
                            data-thread-id="${threadId}">
                        <i class="fas fa-reply me-1"></i>Responder
                    </button>
                    <button class="btn btn-outline-primary forward-btn" 
                            data-msg-id="main-message" 
                            data-subject="${escapeAttr(currentMessage.subject)}">
                        <i class="fas fa-share me-1"></i>Reenviar
                    </button>
                </div>

                <!-- Formulario de respuesta del mensaje principal (oculto por defecto) -->
                <div id="reply-form-main-message" class="mt-3 pt-3 border-top d-none">
                    ${renderReplyFormInline(currentMessage, threadId, 'main-message')}
                </div>

                <!-- Mensajes anteriores del hilo -->
                ${previousMessages.length > 0 ? renderThreadMessages(previousMessages, threadId) : ''}
            </div>
        `;

        contentContainer.innerHTML = html;
        
        // Configurar event listeners para formulario principal
        setupReplyFormListeners(currentMessage, threadId);
        
        // Configurar event listeners para botones de reply y forward
        setupReplyForwardButtons();
        
        console.log('✅ Detalles del email renderizados');
    }

    /**
     * Configurar event listeners para botones de responder y reenviar
     */
    function setupReplyForwardButtons() {
        // Botones de responder
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const msgId = this.dataset.msgId;
                const emailId = this.dataset.emailId;  // Leer emailId del data attribute
                const from = this.dataset.from;
                const subject = this.dataset.subject;
                const messageId = this.dataset.messageId;
                const threadId = this.dataset.threadId;
                
                console.log('🔘 Click en botón Responder:', {
                    msgId, emailId, from, subject, messageId, threadId
                });
                
                showReplyForm(msgId, from, subject, messageId, threadId, emailId);
            });
        });

        // Botones de reenviar
        document.querySelectorAll('.forward-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const msgId = this.dataset.msgId;
                const subject = this.dataset.subject;
                
                // Obtener el contenido del mensaje desde el DOM
                let body = '';
                
                // Buscar el contenedor del mensaje por su ID
                const messageElement = document.getElementById(`message-${msgId}`);
                if (messageElement) {
                    const bodyElement = messageElement.querySelector('.email-body, .message-body');
                    if (bodyElement) {
                        // Obtener el texto sin HTML
                        body = bodyElement.innerText || bodyElement.textContent || '';
                    }
                }
                
                // Si no se encontró, intentar buscar por data-message-id
                if (!body) {
                    const messageByDataAttr = document.querySelector(`[data-message-id="${msgId}"]`);
                    if (messageByDataAttr) {
                        const bodyElement = messageByDataAttr.querySelector('.email-body, .message-body');
                        if (bodyElement) {
                            body = bodyElement.innerText || bodyElement.textContent || '';
                        }
                    }
                }
                
                console.log('📤 Reenviando mensaje:', { msgId, subject, bodyLength: body.length });
                showForwardForm(msgId, subject, body);
            });
        });
    }

    /**
     * Renderizar adjuntos
     */
    function renderAttachments(attachments, emailId) {
        if (!attachments || attachments.length === 0) return '';

        let html = '<div class="border-top pt-3 mb-4"><h6 class="mb-3"><i class="fas fa-paperclip me-2"></i>Adjuntos</h6><div class="row g-2">';
        
        attachments.forEach(attachment => {
            const icon = getFileIcon(attachment.mimeType);
            const sizeFormatted = formatFileSize(attachment.size);
            const canPreview = canPreviewFile(attachment.mimeType);
            
            html += `
                <div class="col-md-6">
                    <div class="card" style="cursor: ${canPreview ? 'pointer' : 'default'};" 
                         ${canPreview ? `onclick="window.InboxView.previewAttachment('${emailId}', '${attachment.attachmentId}', '${attachment.filename}', '${attachment.mimeType}')"` : ''}>
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center">
                                <i class="${icon} fa-2x text-primary me-3"></i>
                                <div class="flex-grow-1">
                                    <div class="fw-medium small">${attachment.filename}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">${sizeFormatted}</div>
                                </div>
                                <div class="btn-group btn-group-sm">
                                    ${canPreview ? `
                                        <button class="btn btn-outline-primary" 
                                                onclick="event.stopPropagation(); window.InboxView.previewAttachment('${emailId}', '${attachment.attachmentId}', '${attachment.filename}', '${attachment.mimeType}')"
                                                title="Vista previa">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-outline-primary" 
                                            onclick="event.stopPropagation(); window.InboxView.downloadAttachment('${emailId}', '${attachment.attachmentId}', '${attachment.filename}')"
                                            title="Descargar">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }

    /**
     * Verificar si un archivo puede tener preview
     */
    function canPreviewFile(mimeType) {
        if (!mimeType) return false;
        
        const previewableTypes = [
            'image/', 
            'application/pdf',
            'text/',
            'application/json',
            'application/xml'
        ];
        
        return previewableTypes.some(type => mimeType.startsWith(type));
    }

    /**
     * Mostrar preview de adjunto
     */
    function previewAttachment(emailId, attachmentId, filename, mimeType) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        // Crear modal de preview
        const modalHTML = `
            <div class="modal fade" id="attachment-preview-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-file me-2"></i>${filename}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="max-height: 70vh; overflow: auto;">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                                <p class="mt-3 text-muted">Cargando preview...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="window.InboxView.downloadAttachment('${emailId}', '${attachmentId}', '${filename}')">
                                <i class="fas fa-download me-2"></i>Descargar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const existingModal = document.getElementById('attachment-preview-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('attachment-preview-modal'));
        modal.show();

        // Cargar contenido
        fetch(`${API_BASE_URL}/api/email/${emailId}/attachment/${attachmentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.blob())
        .then(blob => {
            const modalBody = document.querySelector('#attachment-preview-modal .modal-body');
            const url = URL.createObjectURL(blob);

            let previewHTML = '';

            if (mimeType.startsWith('image/')) {
                previewHTML = `<img src="${url}" class="img-fluid" alt="${filename}">`;
            } else if (mimeType === 'application/pdf') {
                previewHTML = `<iframe src="${url}" style="width: 100%; height: 600px; border: none;"></iframe>`;
            } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') {
                blob.text().then(text => {
                    modalBody.innerHTML = `<pre class="bg-light p-3 rounded" style="max-height: 600px; overflow: auto;"><code>${escapeHtml(text)}</code></pre>`;
                });
                return;
            } else {
                previewHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No se puede mostrar preview para este tipo de archivo. 
                        <button class="btn btn-sm btn-primary ms-3" onclick="window.InboxView.downloadAttachment('${emailId}', '${attachmentId}', '${filename}')">
                            <i class="fas fa-download me-1"></i>Descargar
                        </button>
                    </div>
                `;
            }

            modalBody.innerHTML = previewHTML;
        })
        .catch(error => {
            console.error('Error cargando preview:', error);
            const modalBody = document.querySelector('#attachment-preview-modal .modal-body');
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error al cargar el archivo
                </div>
            `;
        });
    }

    /**
     * Renderizar mensajes anteriores del hilo
     */
    function renderThreadMessages(messages, threadId) {
        let html = `
            <div class="mt-4 pt-4 border-top">
                <h6 class="text-muted mb-3">
                    <i class="fas fa-comments me-2"></i>Mensajes anteriores (${messages.length})
                </h6>
        `;

        messages.forEach((msg, index) => {
            const msgId = `thread-msg-${index}`;
            html += `
                <div class="card mb-3" id="message-${msgId}" data-message-id="${msgId}">
                    <div class="card-header bg-light" style="cursor: pointer;" onclick="window.InboxView.toggleThreadMessage('${msgId}')">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2" 
                                 style="width: 32px; height: 32px; font-size: 14px;">
                                ${(msg.from || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-medium small">${msg.from || 'Desconocido'}</div>
                                <div class="text-muted" style="font-size: 0.75rem;">${formatEmailDate(msg.date)}</div>
                            </div>
                            <i class="fas fa-chevron-down" id="${msgId}-icon"></i>
                        </div>
                    </div>
                    <div class="card-body collapse" id="${msgId}-body">
                        <!-- Destinatarios -->
                        <div class="mb-3 small text-muted">
                            <div><strong>De:</strong> ${msg.from || 'Desconocido'}</div>
                            <div><strong>Para:</strong> ${msg.to || 'mí'}</div>
                            ${msg.cc ? `<div><strong>CC:</strong> ${msg.cc}</div>` : ''}
                            ${msg.bcc ? `<div><strong>CCO:</strong> ${msg.bcc}</div>` : ''}
                        </div>
                        
                        <!-- Contenido completo -->
                        <div class="email-body mb-3" style="max-height: 400px; overflow-y: auto;">
                            ${processEmailBody(msg.body || msg.snippet || '')}
                        </div>
                        
                        <!-- Adjuntos -->
                        ${msg.attachments && msg.attachments.length > 0 ? renderAttachments(msg.attachments, msg.id) : ''}
                        
                        <!-- Botones de acción -->
                        <div id="reply-buttons-${msgId}" class="mt-3 pt-3 border-top">
                            <button class="btn btn-sm btn-primary me-2 reply-btn" 
                                    data-msg-id="${msgId}" 
                                    data-email-id="${msg.id}" 
                                    data-from="${escapeAttr(msg.from)}" 
                                    data-subject="${escapeAttr(msg.subject)}" 
                                    data-message-id="${msg.messageId}" 
                                    data-thread-id="${threadId}">
                                <i class="fas fa-reply me-1"></i>Responder
                            </button>
                            <button class="btn btn-sm btn-outline-primary forward-btn" 
                                    data-msg-id="${msgId}" 
                                    data-subject="${escapeAttr(msg.subject)}">
                                <i class="fas fa-share me-1"></i>Reenviar
                            </button>
                        </div>
                        
                        <!-- Formulario de respuesta (oculto por defecto) -->
                        <div id="reply-form-${msgId}" class="mt-3 pt-3 border-top d-none">
                            ${renderReplyFormInline(msg, threadId, msgId)}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Toggle mensaje del hilo (expandir/colapsar)
     */
    function toggleThreadMessage(msgId) {
        const content = document.getElementById(`${msgId}-body`);
        const icon = document.getElementById(`${msgId}-icon`);
        
        if (content && icon) {
            if (content.classList.contains('show')) {
                content.classList.remove('show');
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                content.classList.add('show');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        }
    }

    /**
     * Mostrar formulario de respuesta para un mensaje específico
     */
    function showReplyForm(msgId, from, subject, messageId, threadId, emailId = null) {
        // Ocultar todos los demás formularios y mostrar todos los botones
        document.querySelectorAll('[id^="reply-form-"]').forEach(form => {
            form.classList.add('d-none');
        });
        document.querySelectorAll('[id^="reply-buttons-"]').forEach(buttons => {
            buttons.classList.remove('d-none');
        });

        // Ocultar los botones de este mensaje
        const replyButtons = document.getElementById(`reply-buttons-${msgId}`);
        if (replyButtons) {
            replyButtons.classList.add('d-none');
        }

        // Mostrar el formulario de este mensaje
        const replyForm = document.getElementById(`reply-form-${msgId}`);
        if (replyForm) {
            replyForm.classList.remove('d-none');
            
            // Scroll al formulario
            setTimeout(() => {
                replyForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Focus en textarea
                const textarea = replyForm.querySelector('textarea');
                if (textarea) {
                    textarea.focus();
                }
            }, 100);

            // Configurar event listeners si no están configurados
            setupReplyFormListenersForMessage(msgId, from, subject, messageId, threadId, emailId);
        }
    }

    /**
     * Mostrar formulario de reenvío
     */
    function showForwardForm(msgId, subject, body) {
        // Por ahora, abrir el modal de composición con el contenido
        if (window.initComposeModal) {
            // Abrir modal
            const modal = new bootstrap.Modal(document.getElementById('compose-email-modal'));
            modal.show();
            
            // Pre-llenar asunto y cuerpo
            setTimeout(() => {
                const subjectInput = document.getElementById('compose-subject');
                const bodyTextarea = document.getElementById('compose-body');
                
                if (subjectInput) {
                    // Agregar "Fwd:" solo si no lo tiene ya
                    const fwdSubject = subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;
                    subjectInput.value = fwdSubject;
                }
                
                if (bodyTextarea && body) {
                    // Formatear el mensaje reenviado
                    const forwardedMessage = `


---------- Mensaje reenviado ----------
Asunto: ${subject}

${body}`;
                    bodyTextarea.value = forwardedMessage;
                    
                    // Colocar el cursor al inicio para que el usuario pueda escribir antes
                    bodyTextarea.focus();
                    bodyTextarea.setSelectionRange(0, 0);
                }
            }, 300);
        }
    }

    /**
     * Configurar event listeners para un formulario de respuesta específico
     */
    function setupReplyFormListenersForMessage(msgId, from, subject, messageId, threadId, emailId = null) {
        const formContainer = document.getElementById(`reply-form-${msgId}`);
        if (!formContainer) return;

        // Inicializar editor de texto enriquecido
        setTimeout(() => {
            if (window.initRichTextEditor) {
                window.initRichTextEditor(`reply-textarea-${msgId}`, {
                    placeholder: 'Escribe tu respuesta...',
                    minHeight: '200px'
                });
            }
        }, 100);

        // Configurar botón CC/BCC
        const showCcBtn = document.getElementById(`show-reply-cc-btn-${msgId}`);
        if (showCcBtn) {
            showCcBtn.addEventListener('click', function() {
                document.getElementById(`reply-cc-container-${msgId}`).classList.remove('d-none');
                document.getElementById(`reply-bcc-container-${msgId}`).classList.remove('d-none');
                this.style.display = 'none';
            });
        }

        // Configurar botón adjuntar
        const attachBtn = document.getElementById(`attach-file-btn-${msgId}`);
        const attachInput = document.getElementById(`attachment-input-${msgId}`);
        
        if (attachBtn && attachInput) {
            // Remover listeners anteriores si existen
            const newAttachBtn = attachBtn.cloneNode(true);
            attachBtn.parentNode.replaceChild(newAttachBtn, attachBtn);
            
            newAttachBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Click en adjuntar para ${msgId}`);
                attachInput.click();
            });
            
            attachInput.addEventListener('change', function(e) {
                console.log(`Archivo seleccionado para ${msgId}`);
                handleFileSelectionForMessage(e, msgId);
            });
        } else {
            console.warn(`No se encontraron elementos de adjuntar para ${msgId}`, {
                attachBtn: !!attachBtn,
                attachInput: !!attachInput
            });
        }

        // Configurar botón generar IA
        const aiBtn = document.getElementById(`generate-ai-response-btn-${msgId}`);
        console.log(`🔍 Configurando botón IA para ${msgId}:`, {
            btnExists: !!aiBtn,
            emailId: emailId,
            threadId: threadId
        });
        
        if (aiBtn) {
            // Remover listeners anteriores
            const newAiBtn = aiBtn.cloneNode(true);
            aiBtn.parentNode.replaceChild(newAiBtn, aiBtn);
            
            newAiBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🤖 CLICK en botón IA para ${msgId}`, {
                    from, subject, msgId, emailId, threadId
                });
                generateAIResponseForMessage(from, subject, msgId, emailId, threadId);
            });
            console.log(`✅ Event listener configurado para botón IA ${msgId}`);
        } else {
            console.warn(`⚠️ No se encontró botón IA para ${msgId}`);
        }

        // Configurar botón enviar
        const sendBtn = document.getElementById(`send-reply-btn-${msgId}`);
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                sendReplyForMessage(from, subject, messageId, threadId, msgId, emailId);
            });
        }
    }

    /**
     * Manejar selección de archivos para un mensaje específico
     */
    function handleFileSelectionForMessage(event, msgId) {
        // Reutilizar la lógica existente pero con IDs únicos
        if (window.handleFileSelection) {
            // Temporalmente cambiar los IDs para que la función existente funcione
            const originalAttachInput = document.getElementById('attachment-input');
            const originalSelectedAttachments = document.getElementById('selected-attachments');
            const originalAttachInfo = document.getElementById('attachment-info');
            
            // Crear referencias temporales
            const tempAttachInput = document.getElementById(`attachment-input-${msgId}`);
            const tempSelectedAttachments = document.getElementById(`selected-attachments-${msgId}`);
            const tempAttachInfo = document.getElementById(`attachment-info-${msgId}`);
            
            if (tempAttachInput) tempAttachInput.id = 'attachment-input';
            if (tempSelectedAttachments) tempSelectedAttachments.id = 'selected-attachments';
            if (tempAttachInfo) tempAttachInfo.id = 'attachment-info';
            
            window.handleFileSelection(event);
            
            // Restaurar IDs
            if (tempAttachInput) tempAttachInput.id = `attachment-input-${msgId}`;
            if (tempSelectedAttachments) tempSelectedAttachments.id = `selected-attachments-${msgId}`;
            if (tempAttachInfo) tempAttachInfo.id = `attachment-info-${msgId}`;
        }
    }

    /**
     * Generar respuesta IA para mensaje específico
     */
    async function generateAIResponseForMessage(from, subject, msgId, emailId, threadId) {
        console.log('🎯 generateAIResponseForMessage iniciado:', {
            from, subject, msgId, emailId, threadId
        });
        
        // Obtener el email completo del array allEmails
        const email = allEmails.find(e => e.id === emailId) || { 
            id: emailId,
            from: from, 
            subject: subject,
            threadId: threadId
        };
        
        console.log('📧 Email construido:', email);
        console.log('🔍 window.generateAIResponse existe?', !!window.generateAIResponse);
        
        if (window.generateAIResponse) {
            const textareaId = `reply-textarea-${msgId}`;
            const btnId = `generate-ai-response-btn-${msgId}`;
            
            console.log('🔍 Verificando elementos:', {
                textareaId,
                btnId,
                textareaExists: !!document.getElementById(textareaId),
                btnExists: !!document.getElementById(btnId)
            });
            
            try {
                console.log('🚀 Llamando window.generateAIResponse con IDs específicos...');
                console.log('📦 Tipo:', typeof window.generateAIResponse);
                console.log('📧 Email:', email);
                console.log('🧵 ThreadId:', threadId);
                console.log('🆔 TextareaId:', textareaId);
                console.log('🆔 BtnId:', btnId);
                
                // Llamar directamente con los IDs correctos
                const result = await window.generateAIResponse(email, threadId, textareaId, btnId);
                
                console.log('✅ window.generateAIResponse completado');
                console.log('📊 Resultado:', result);
                
                if (result === 'ABORTED_NO_ELEMENTS') {
                    console.error('🚨 La función abortó porque no encontró los elementos!');
                } else if (result === 'CRITICAL_ERROR') {
                    console.error('🚨 Error crítico en la función!');
                }
            } catch (error) {
                console.error('❌ Error en window.generateAIResponse:', error);
                console.error('❌ Stack:', error.stack);
            }
        } else {
            console.error('❌ window.generateAIResponse no existe!');
        }
    }

    /**
     * Enviar respuesta para mensaje específico
     */
    function sendReplyForMessage(from, subject, messageId, threadId, msgId, emailId = null) {
        console.log('📧 sendReplyForMessage llamado con:', { from, subject, messageId, threadId, msgId, emailId });
        
        const email = { from, subject, messageId, id: emailId };
        console.log('📦 Objeto email construido:', email);
        
        if (!window.sendReply) {
            console.error('❌ window.sendReply no está definido');
            return;
        }
        
        // Obtener elementos
        const textarea = document.getElementById(`reply-textarea-${msgId}`);
        const ccInput = document.getElementById(`reply-cc-${msgId}`);
        const bccInput = document.getElementById(`reply-bcc-${msgId}`);
        const sendBtn = document.getElementById(`send-reply-btn-${msgId}`);
        
        if (!textarea) {
            console.error('❌ No se encontró el textarea');
            return;
        }
        
        // Guardar IDs originales
        const originalIds = {
            textarea: textarea.id,
            cc: ccInput ? ccInput.id : null,
            bcc: bccInput ? bccInput.id : null,
            send: sendBtn ? sendBtn.id : null
        };
        
        // Cambiar IDs temporalmente
        textarea.id = 'reply-textarea';
        if (ccInput) ccInput.id = 'reply-cc';
        if (bccInput) bccInput.id = 'reply-bcc';
        if (sendBtn) sendBtn.id = 'send-reply-btn';
        
        console.log('📤 Llamando a window.sendReply con:', { email, threadId });
        
        // Llamar a sendReply
        window.sendReply(email, threadId);
        
        // Restaurar IDs después de un momento
        setTimeout(() => {
            textarea.id = originalIds.textarea;
            if (ccInput && originalIds.cc) ccInput.id = originalIds.cc;
            if (bccInput && originalIds.bcc) bccInput.id = originalIds.bcc;
            if (sendBtn && originalIds.send) sendBtn.id = originalIds.send;
        }, 100);
    }

    /**
     * Responder a un mensaje específico del hilo (función legacy, mantener por compatibilidad)
     */
    function replyToSpecificMessage(emailId, from, subject, messageId) {
        // Redirigir a la nueva función
        showReplyForm('main-message', from, subject, messageId, emailId);
    }

    /**
     * Renderizar formulario de respuesta inline (con ID único)
     */
    function renderReplyFormInline(email, threadId, msgId) {
        return `
            <h6 class="mb-3">Responder a este mensaje</h6>
            
            <!-- Destinatarios (Para) -->
            <div class="mb-3">
                <label class="form-label small fw-bold">Para:</label>
                <input type="text" class="form-control form-control-sm" id="reply-to-${msgId}" value="${email.from}" readonly>
            </div>

            <!-- CC/BCC (oculto por defecto) -->
            <div class="mb-3 d-none" id="reply-cc-container-${msgId}">
                <label class="form-label small fw-bold">CC:</label>
                <input type="text" class="form-control form-control-sm" id="reply-cc-${msgId}" placeholder="Agregar CC (separar con comas)">
            </div>

            <div class="mb-3 d-none" id="reply-bcc-container-${msgId}">
                <label class="form-label small fw-bold">CCO:</label>
                <input type="text" class="form-control form-control-sm" id="reply-bcc-${msgId}" placeholder="Agregar CCO (separar con comas)">
            </div>

            <button class="btn btn-sm btn-outline-secondary mb-3" id="show-reply-cc-btn-${msgId}">
                <i class="fas fa-plus me-1"></i>Agregar CC/CCO
            </button>
            
            <!-- Botón generar respuesta con IA -->
            <div class="mb-3">
                <button class="btn btn-sm btn-outline-primary" id="generate-ai-response-btn-${msgId}">
                    <i class="fas fa-robot me-2"></i>Generar respuesta con IA
                </button>
                <button class="btn btn-sm btn-outline-secondary ms-2" id="popout-reply-btn-${msgId}" title="Abrir en ventana emergente">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>

            <!-- Editor de texto enriquecido -->
            <div id="reply-textarea-${msgId}" class="mb-3" style="background: white;"></div>
            
            <!-- Adjuntos seleccionados -->
            <div id="selected-attachments-${msgId}" class="mb-3"></div>
            
            <!-- Botones de acción -->
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <input type="file" id="attachment-input-${msgId}" multiple style="display: none;" accept="*/*">
                    <button class="btn btn-sm btn-outline-secondary me-2" id="attach-file-btn-${msgId}">
                        <i class="fas fa-paperclip me-1"></i>Adjuntar archivo (máx 20MB)
                    </button>
                    <small class="text-muted" id="attachment-info-${msgId}"></small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="window.InboxView.cancelReply('${msgId}')">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" id="send-reply-btn-${msgId}">
                        <i class="fas fa-paper-plane me-2"></i>Enviar respuesta
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar formulario de respuesta (función legacy)
     */
    function renderReplyForm(email, threadId) {
        return `
            <div class="mt-4 pt-4 border-top">
                <h6 class="mb-3">Responder</h6>
                
                <!-- Destinatarios (Para) -->
                <div class="mb-3">
                    <label class="form-label small fw-bold">Para:</label>
                    <input type="text" class="form-control form-control-sm" id="reply-to" value="${email.from}" readonly>
                </div>

                <!-- CC/BCC (oculto por defecto) -->
                <div class="mb-3 d-none" id="reply-cc-container">
                    <label class="form-label small fw-bold">CC:</label>
                    <input type="text" class="form-control form-control-sm" id="reply-cc" placeholder="Agregar CC (separar con comas)">
                </div>

                <div class="mb-3 d-none" id="reply-bcc-container">
                    <label class="form-label small fw-bold">CCO:</label>
                    <input type="text" class="form-control form-control-sm" id="reply-bcc" placeholder="Agregar CCO (separar con comas)">
                </div>

                <button class="btn btn-sm btn-outline-secondary mb-3" id="show-reply-cc-btn">
                    <i class="fas fa-plus me-1"></i>Agregar CC/CCO
                </button>
                
                <!-- Botón generar respuesta con IA -->
                <div class="mb-3">
                    <button class="btn btn-sm btn-outline-primary" id="generate-ai-response-btn">
                        <i class="fas fa-robot me-2"></i>Generar respuesta con IA
                    </button>
                </div>

                <!-- Textarea de respuesta -->
                <textarea class="form-control mb-3" id="reply-textarea" rows="6" 
                          placeholder="Escribe tu respuesta..."></textarea>
                
                <!-- Adjuntos seleccionados -->
                <div id="selected-attachments" class="mb-3"></div>
                
                <!-- Botones de acción -->
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <input type="file" id="attachment-input" multiple style="display: none;" accept="*/*">
                        <button class="btn btn-sm btn-outline-secondary me-2" id="attach-file-btn">
                            <i class="fas fa-paperclip me-1"></i>Adjuntar archivo (máx 20MB)
                        </button>
                        <small class="text-muted" id="attachment-info"></small>
                    </div>
                    <button class="btn btn-primary" id="send-reply-btn">
                        <i class="fas fa-paper-plane me-2"></i>Enviar respuesta
                    </button>
                </div>
            </div>
        `;
    }

    // Agregar estilos CSS para el checkbox personalizado y contenido de emails
    const style = document.createElement('style');
    style.textContent = `
        .custom-checkbox {
            width: 18px;
            height: 18px;
            border: 2px solid #6c757d;
            border-radius: 3px;
            display: inline-block;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .custom-checkbox:hover {
            border-color: #ffc107;
            background-color: #fff3cd;
        }
        
        .custom-checkbox.checked {
            background-color: #ffc107;
            border-color: #ffc107;
        }
        
        .custom-checkbox.checked::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }

        /* Prevenir scroll horizontal en contenido de emails */
        .email-body {
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            overflow-x: hidden;
        }

        .email-body * {
            max-width: 100% !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
        }

        .email-body img {
            max-width: 100% !important;
            height: auto !important;
        }

        .email-body table {
            max-width: 100% !important;
            table-layout: fixed !important;
        }

        .email-body pre {
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-x: auto !important;
            max-width: 100% !important;
        }

        /* Truncar preview en lista de emails */
        .email-list-item .text-truncate {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
        }

        /* Truncar texto en lista de emails */
        .email-list-item > div {
            max-width: 100%;
            overflow: hidden;
        }

        .email-list-item .text-dark,
        .email-list-item .text-muted {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
            display: block;
        }

        /* Asegurar que el panel de contenido no cause scroll horizontal */
        #inbox-email-content {
            overflow-x: hidden;
            max-width: 100%;
        }

        #inbox-email-content > div {
            max-width: 100%;
        }

        /* Panel lateral de lista de emails */
        #inbox-email-list {
            overflow-x: hidden;
            max-width: 100%;
        }

        #inbox-email-list .email-list-item {
            max-width: 100%;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);

    /**
     * Cancelar respuesta y volver a mostrar botones
     */
    function cancelReply(msgId) {
        // Ocultar formulario
        const replyForm = document.getElementById(`reply-form-${msgId}`);
        if (replyForm) {
            replyForm.classList.add('d-none');
        }

        // Mostrar botones
        const replyButtons = document.getElementById(`reply-buttons-${msgId}`);
        if (replyButtons) {
            replyButtons.classList.remove('d-none');
        }
    }

    /**
     * Eliminar email
     */
    function deleteEmail(emailId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este email?')) {
            return;
        }

        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        if (!token) {
            console.warn('⚠️ No hay token de autenticación');
            return;
        }

        const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

        fetch(`${API_BASE_URL}/api/email/${emailId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Mostrar toast de éxito
                if (window.showSuccessToast) {
                    window.showSuccessToast('✅ Email eliminado correctamente');
                }

                // Limpiar el panel de contenido primero
                const contentContainer = document.getElementById('inbox-email-content');
                if (contentContainer) {
                    contentContainer.innerHTML = `
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <div class="text-center text-muted">
                                <i class="fas fa-envelope-open-text fa-4x mb-3 opacity-25"></i>
                                <h5>Email eliminado</h5>
                                <p>Selecciona otro email para verlo</p>
                            </div>
                        </div>
                    `;
                }

                // Recargar la bandeja actual
                if (currentMailbox === 'sent') {
                    loadSentEmails();
                } else {
                    loadInboxEmails();
                }

                console.log(`✅ Email ${emailId} eliminado correctamente`);
            }
        })
        .catch(error => {
            console.error('❌ Error eliminando email:', error);
            if (window.showErrorToast) {
                window.showErrorToast('Error al eliminar el email');
            } else {
                alert('Error al eliminar el email');
            }
        });
    }

    /**
     * Escapar HTML para prevenir XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escapar para atributos HTML (reemplaza comillas)
     */
    function escapeAttr(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Exportar funciones globalmente si es necesario
    window.InboxView = {
        init: initInboxView,
        renderEmailList: renderEmailList,
        showEmailContent: showEmailContent,
        setFilter: setFilter,
        toggleImportant: toggleImportant,
        loadEmailDetails: loadEmailDetails,
        downloadAttachment: window.downloadAttachment,
        toggleThreadMessage: toggleThreadMessage,
        replyToSpecificMessage: replyToSpecificMessage,
        showReplyForm: showReplyForm,
        showForwardForm: showForwardForm,
        previewAttachment: previewAttachment,
        deleteEmail: deleteEmail,
        cancelReply: cancelReply
    };

})();

/**
 * Auto-refresh de la bandeja de entrada
 * Actualiza automáticamente cada 30 segundos
 */
(function initAutoRefresh() {
    let autoRefreshInterval = null;
    let refreshIntervalMs = 30000; // 30 segundos por defecto
    
    // Función para iniciar auto-refresh
    function startAutoRefresh() {
        // Limpiar intervalo anterior si existe
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        console.log(`🔄 Auto-refresh activado (cada ${refreshIntervalMs / 1000}s)`);
        
        autoRefreshInterval = setInterval(() => {
            // Solo actualizar si estamos en la vista de emails
            const emailSection = document.getElementById('inbox-email-section');
            if (!emailSection || emailSection.style.display === 'none') {
                return;
            }
            
            // Solo actualizar si no hay un modal abierto
            const modals = document.querySelectorAll('.modal.show');
            if (modals.length > 0) {
                console.log('⏸️ Auto-refresh pausado (modal abierto)');
                return;
            }
            
            console.log('🔄 Auto-refresh: Actualizando bandeja de entrada...');
            
            // Determinar qué mailbox actualizar
            const currentMailbox = window.InboxView?.currentMailbox || 'inbox';
            
            if (currentMailbox === 'sent') {
                // Actualizar enviados
                const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
                if (!token) return;
                
                const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
                
                fetch(`${API_BASE_URL}/api/email/sent?limit=50`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.emails) {
                        console.log(`✅ Auto-refresh: ${data.emails.length} emails enviados actualizados`);
                        // Actualizar la vista sin perder el scroll
                        if (window.InboxView && typeof window.InboxView.loadSentEmails === 'function') {
                            window.InboxView.loadSentEmails();
                        }
                    }
                })
                .catch(error => {
                    console.error('❌ Error en auto-refresh (sent):', error);
                });
            } else {
                // Actualizar inbox
                const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
                if (!token) return;
                
                const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
                
                fetch(`${API_BASE_URL}/api/email/inbox?limit=50`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.emails) {
                        const newEmailCount = data.emails.length;
                        const currentCount = allEmails.length;
                        
                        console.log(`✅ Auto-refresh: ${newEmailCount} emails en servidor, ${currentCount} en cache`);
                        
                        // Solo actualizar si hay cambios
                        if (newEmailCount !== currentCount) {
                            console.log(`🔄 Detectados cambios, actualizando vista...`);
                            if (window.InboxView && typeof window.InboxView.loadInboxEmails === 'function') {
                                window.InboxView.loadInboxEmails();
                            }
                        } else {
                            console.log(`✓ Sin cambios en bandeja de entrada`);
                        }
                    }
                })
                .catch(error => {
                    console.error('❌ Error en auto-refresh (inbox):', error);
                });
            }
        }, refreshIntervalMs);
    }
    
    // Función para detener auto-refresh
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log('⏹️ Auto-refresh detenido');
        }
    }
    
    // Función para cambiar intervalo
    function setRefreshInterval(seconds) {
        refreshIntervalMs = seconds * 1000;
        if (autoRefreshInterval) {
            startAutoRefresh(); // Reiniciar con nuevo intervalo
        }
    }
    
    // Iniciar auto-refresh cuando se carga la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startAutoRefresh);
    } else {
        startAutoRefresh();
    }
    
    // Pausar cuando la pestaña no está visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('👁️ Pestaña oculta, pausando auto-refresh');
            stopAutoRefresh();
        } else {
            console.log('👁️ Pestaña visible, reanudando auto-refresh');
            startAutoRefresh();
        }
    });
    
    // Exponer funciones globalmente
    window.EmailAutoRefresh = {
        start: startAutoRefresh,
        stop: stopAutoRefresh,
        setInterval: setRefreshInterval,
        getInterval: () => refreshIntervalMs / 1000
    };
    
    console.log('✅ Auto-refresh de emails inicializado');
})();
