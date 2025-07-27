/**
 * email-filters-solution.js
 * 
 * Solución dedicada para arreglar los filtros de email en el dashboard
 * Este script debe incluirse después de dashboard-simple-clean.js
 */

// Ejecutar la solución cuando la página esté completamente cargada
window.addEventListener('load', function() {
    // Dar tiempo para asegurar que todos los componentes estén cargados
    setTimeout(initEmailFiltersFix, 1000);
    
    // Registrar la solución para reinicializarse si el contenido del dashboard cambia
    observeDashboardChanges();
});

/**
 * Inicializa la solución para los filtros de email
 */
function initEmailFiltersFix() {
    console.log('🔧 Inicializando solución para los filtros de email...');
    
    // 1. Obtener referencias a los botones de filtro
    const filterAll = document.getElementById('filter-emails-all');
    const filterUnread = document.getElementById('filter-emails-unread');
    const filterImportant = document.getElementById('filter-emails-important');
    const filterSpam = document.getElementById('filter-emails-spam');
    
    console.log('Estado de los botones:', 
        filterAll ? '✅' : '❌', 
        filterUnread ? '✅' : '❌',
        filterImportant ? '✅' : '❌',
        filterSpam ? '✅' : '❌'
    );
    
    // 2. Si no existen los botones, intentar buscarlos con selectores más generales
    if (!filterAll || !filterUnread || !filterImportant || !filterSpam) {
        console.log('⚠️ Buscando botones con selectores alternativos...');
        
        // Buscar por nombre en lugar de ID
        const radioButtons = document.querySelectorAll('input[name="email-filter"]');
        if (radioButtons.length > 0) {
            console.log(`📋 Encontrados ${radioButtons.length} botones de radio por nombre`);
            
            radioButtons.forEach(button => {
                const id = button.id || '';
                console.log(`- Botón: ${id}, Valor: ${button.value}`);
                
                // Asignar eventos según el ID o valor
                if (id.includes('all') || button.value === 'all') {
                    button.onclick = function() { applyEmailFilter('all'); return true; };
                    filterAll = button; // Guardar referencia
                } 
                else if (id.includes('unread') || button.value === 'unread') {
                    button.onclick = function() { applyEmailFilter('unread'); return true; };
                    filterUnread = button;
                }
                else if (id.includes('important') || button.value === 'important') {
                    button.onclick = function() { applyEmailFilter('important'); return true; };
                    filterImportant = button;
                }
                else if (id.includes('spam') || button.value === 'spam') {
                    button.onclick = function() { applyEmailFilter('spam'); return true; };
                    filterSpam = button;
                }
            });
        }
    }
    
    // 3. Si encontramos los botones, configurarlos directamente
    if (filterAll) {
        filterAll.onclick = function() {
            console.log('🔍 Filtro aplicado: Todos');
            applyEmailFilter('all');
            return true;
        };
    }
    
    if (filterUnread) {
        filterUnread.onclick = function() {
            console.log('🔍 Filtro aplicado: No leídos');
            applyEmailFilter('unread');
            return true;
        };
    }
    
    if (filterImportant) {
        filterImportant.onclick = function() {
            console.log('🔍 Filtro aplicado: Importantes');
            applyEmailFilter('important');
            return true;
        };
    }
    
    if (filterSpam) {
        filterSpam.onclick = function() {
            console.log('🔍 Filtro aplicado: Spam');
            applyEmailFilter('spam');
            return true;
        };
    }
    
    // 4. Asegurarse de que el filtro "Todos" esté seleccionado por defecto
    if (filterAll) {
        filterAll.checked = true;
        
        // 5. Aplicar el filtro "Todos" inicialmente
        applyEmailFilter('all');
        console.log('✅ Filtro "Todos" activado por defecto');
    }
    
    // 6. Verificar que las filas de email tengan las clases necesarias
    prepareEmailRows();
    
    console.log('✅ Solución para filtros de email aplicada correctamente');
    
    // Mostrar notificación sólo si la librería toastr está disponible
    if (typeof toastr !== 'undefined') {
        toastr.success('Filtros de email activados', 'Sistema listo');
    }
}

/**
 * Preparar las filas de email para asegurar que tengan todas las clases y atributos necesarios
 */
function prepareEmailRows() {
    const emailRows = document.querySelectorAll('.email-row');
    console.log(`Total de filas de email: ${emailRows.length}`);
    
    emailRows.forEach((row, index) => {
        // Asegurarse de que cada fila tenga un dataset.type
        if (!row.dataset.type) {
            row.dataset.type = '';
        }
        
        // Actualizar el dataset.type basado en las clases y elementos
        if (row.classList.contains('fw-bold') && !row.dataset.type.includes('unread')) {
            row.dataset.type += ' unread';
        }
        
        // Verificar si tiene un icono de estrella amarilla (importante)
        const star = row.querySelector('i.fa-star.fas.text-warning');
        if (star && !row.dataset.type.includes('important')) {
            row.dataset.type += ' important';
        }
        
        // Mostrar información de las primeras 5 filas para debug
        if (index < 5) {
            console.log(`Fila ${index+1}:`, 
                row.classList.contains('fw-bold') ? 'No leído' : 'Leído',
                row.dataset.type || 'Sin tipo',
                row.querySelector('i.fa-star.fas.text-warning') ? 'Importante' : 'Normal'
            );
        }
    });
}

/**
 * Aplicar un filtro específico a las filas de email
 * @param {string} type - Tipo de filtro (all, unread, important, spam)
 */
function applyEmailFilter(type) {
    console.log(`🔍 Aplicando filtro: ${type}`);
    
    // 1. Obtener todas las filas de email
    const emailRows = document.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    // 2. Aplicar el filtro correspondiente a cada fila
    emailRows.forEach(row => {
        let shouldShow = false;
        
        // Determinar si la fila debe mostrarse según el filtro
        switch(type) {
            case 'all':
                shouldShow = true;
                break;
                
            case 'unread':
                // Email no leído si tiene clase fw-bold
                shouldShow = row.classList.contains('fw-bold');
                break;
                
            case 'important':
                // Email importante si tiene un icono de estrella amarilla
                const star = row.querySelector('i.fa-star.fas.text-warning');
                shouldShow = !!star;
                break;
                
            case 'spam':
                // Email spam si tiene este tipo en el atributo data-type
                shouldShow = (row.dataset.type || '').includes('spam');
                break;
                
            default:
                // Para cualquier otro filtro, verificar si el tipo coincide
                shouldShow = (row.dataset.type || '').includes(type);
        }
        
        // Aplicar la visibilidad según el resultado
        if (shouldShow) {
            row.classList.remove('d-none');
            row.style.display = '';
            visibleCount++;
        } else {
            row.classList.add('d-none');
            row.style.display = 'none';
        }
    });
    
    // 3. Actualizar el contador de emails (si existe la función)
    if (typeof updateEmailsCount === 'function') {
        updateEmailsCount();
    } else {
        console.log(`Filtro aplicado. Mostrando ${visibleCount} de ${emailRows.length} emails`);
    }
    
    // 4. Mostrar notificación con el resultado (si toastr está disponible)
    if (typeof toastr !== 'undefined') {
        const filterLabels = {
            'all': 'todos',
            'unread': 'no leídos',
            'important': 'importantes',
            'spam': 'spam'
        };
        
        const message = `Mostrando ${visibleCount} emails ${filterLabels[type] || type}`;
        toastr.info(message, 'Filtro aplicado');
    }
}

/**
 * Observar cambios en el dashboard para reinicializar los filtros si es necesario
 */
function observeDashboardChanges() {
    // Usar MutationObserver para detectar cambios en el DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Si hay cambios en el contenido del dashboard que puedan afectar los filtros
            if (mutation.type === 'childList' && 
                (mutation.target.id === 'emails-content' || 
                 mutation.target.id === 'emails-table-body' ||
                 mutation.target.classList.contains('tab-pane'))) {
                
                console.log('🔄 Detectados cambios en el dashboard, reinicializando filtros...');
                setTimeout(initEmailFiltersFix, 500);
            }
        });
    });
    
    // Configurar el observer para observar cambios en el cuerpo del documento
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}
