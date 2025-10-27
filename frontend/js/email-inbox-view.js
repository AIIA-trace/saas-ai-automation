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
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <span class="text-dark fw-medium">${email.sender || email.from || email.fromName || 'Desconocido'}</span>
                                <small class="text-muted ms-2">${email.date}</small>
                            </div>
                            <div class="text-dark mb-1">${email.subject || '(Sin asunto)'}</div>
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

        // Configurar buscador
        setupSearchListener();

        // Configurar scroll infinito
        setupInfiniteScroll();

        console.log('✅ Filtros configurados correctamente');
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
        if (!window.loadMoreEmails) {
            console.warn('⚠️ Función loadMoreEmails no disponible');
            return;
        }

        // Mostrar indicador de carga
        const emailListContainer = document.getElementById('inbox-email-list');
        if (emailListContainer) {
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

        // Llamar a la función de carga
        window.loadMoreEmails();

        // Observar cuando se agreguen nuevos emails
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Remover indicador de carga
                    const loadingIndicator = document.getElementById('loading-more-emails');
                    if (loadingIndicator) {
                        loadingIndicator.remove();
                    }

                    // Re-extraer y renderizar todos los emails
                    const emails = extractEmailsBeforeReplacing();
                    if (emails.length > allEmails.length) {
                        allEmails = emails;
                        
                        // Aplicar filtro y búsqueda actual
                        const searchInput = document.getElementById('email-search-input');
                        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
                        
                        if (searchTerm) {
                            searchInEmails(searchTerm);
                        } else {
                            renderEmailList(allEmails);
                        }
                        
                        console.log(`✅ ${emails.length} emails totales en bandeja`);
                    }

                    observer.disconnect();
                }
            });
        });

        // Observar cambios en la tabla
        const tableBody = document.getElementById('emails-table-body');
        if (tableBody) {
            observer.observe(tableBody, {
                childList: true
            });
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
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <span class="text-dark fw-medium">${email.sender || email.from || email.fromName || 'Desconocido'}</span>
                                <small class="text-muted ms-2">${email.date}</small>
                            </div>
                            <div class="text-dark mb-1">${email.subject || '(Sin asunto)'}</div>
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

        // Ordenar thread por fecha (más antiguos primero)
        const sortedThread = thread.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // El último mensaje es el actual
        const currentMessage = sortedThread[sortedThread.length - 1];
        const previousMessages = sortedThread.slice(0, -1);

        let html = `
            <div class="p-4">
                <!-- Cabecera del email -->
                <div class="border-bottom pb-3 mb-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h4 class="mb-0">${currentMessage.subject || '(Sin asunto)'}</h4>
                        <div class="btn-group btn-group-sm">
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
                                ${(currentMessage.from || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-bold">${currentMessage.from || 'Desconocido'}</div>
                            <div class="text-muted small">Para: mí</div>
                        </div>
                        <div class="text-muted small">${formatEmailDate(currentMessage.date)}</div>
                    </div>
                </div>

                <!-- Contenido del email -->
                <div class="email-body mb-4">
                    ${currentMessage.body || currentMessage.snippet || ''}
                </div>

                <!-- Adjuntos del mensaje actual -->
                ${renderAttachments(currentMessage.attachments, currentMessage.id)}

                <!-- Mensajes anteriores del hilo -->
                ${previousMessages.length > 0 ? renderThreadMessages(previousMessages) : ''}

                <!-- Formulario de respuesta -->
                ${renderReplyForm(currentMessage, threadId)}
            </div>
        `;

        contentContainer.innerHTML = html;
        
        // Configurar event listeners
        setupReplyFormListeners(currentMessage, threadId);
        
        console.log('✅ Detalles del email renderizados');
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
            
            html += `
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center">
                                <i class="${icon} fa-2x text-primary me-3"></i>
                                <div class="flex-grow-1">
                                    <div class="fw-medium small">${attachment.filename}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">${sizeFormatted}</div>
                                </div>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="window.InboxView.downloadAttachment('${emailId}', '${attachment.attachmentId}', '${attachment.filename}')"
                                        title="Descargar">
                                    <i class="fas fa-download"></i>
                                </button>
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
     * Renderizar mensajes anteriores del hilo
     */
    function renderThreadMessages(messages) {
        let html = `
            <div class="mt-4 pt-4 border-top">
                <h6 class="text-muted mb-3">
                    <i class="fas fa-comments me-2"></i>Mensajes anteriores (${messages.length})
                </h6>
        `;

        messages.forEach((msg, index) => {
            html += `
                <div class="card mb-3 ${index < messages.length - 1 ? 'opacity-75' : ''}">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2" 
                                 style="width: 32px; height: 32px; font-size: 14px;">
                                ${(msg.from || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-medium small">${msg.from || 'Desconocido'}</div>
                                <div class="text-muted" style="font-size: 0.75rem;">${formatEmailDate(msg.date)}</div>
                            </div>
                        </div>
                        <div class="small">${msg.snippet || msg.body?.substring(0, 200) || ''}</div>
                        ${msg.attachments && msg.attachments.length > 0 ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-paperclip me-1"></i>${msg.attachments.length} adjunto(s)
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Renderizar formulario de respuesta
     */
    function renderReplyForm(email, threadId) {
        return `
            <div class="mt-4 pt-4 border-top">
                <h6 class="mb-3">Responder</h6>
                
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

    // Agregar estilos CSS para el checkbox personalizado
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
    `;
    document.head.appendChild(style);

    // Exportar funciones globalmente si es necesario
    window.InboxView = {
        init: initInboxView,
        renderEmailList: renderEmailList,
        showEmailContent: showEmailContent,
        setFilter: setFilter,
        toggleImportant: toggleImportant,
        loadEmailDetails: loadEmailDetails,
        downloadAttachment: window.downloadAttachment
    };

})();
