/**
 * Script para reparar los filtros de email
 * Este script debe ejecutarse después de que la página ha cargado
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando reparación de filtros de email...');
    
    // Esperar a que el DOM esté completamente cargado
    setTimeout(() => {
        // 1. Verificar elementos de filtro existentes
        const filterAll = document.getElementById('filter-emails-all');
        const filterUnread = document.getElementById('filter-emails-unread');
        const filterImportant = document.getElementById('filter-emails-important');
        const filterSpam = document.getElementById('filter-emails-spam');
        
        console.log('Filtros encontrados:', 
            filterAll ? '✅ Todos' : '❌ Todos', 
            filterUnread ? '✅ No leídos' : '❌ No leídos',
            filterImportant ? '✅ Importantes' : '❌ Importantes',
            filterSpam ? '✅ Spam' : '❌ Spam'
        );
        
        // 2. Asignar event listeners directamente
        if (filterAll) {
            filterAll.onclick = function() {
                console.log('🔍 Filtro: Todos');
                aplicarFiltroEmail('all');
            };
        }
        
        if (filterUnread) {
            filterUnread.onclick = function() {
                console.log('🔍 Filtro: No leídos');
                aplicarFiltroEmail('unread');
            };
        }
        
        if (filterImportant) {
            filterImportant.onclick = function() {
                console.log('🔍 Filtro: Importantes');
                aplicarFiltroEmail('important');
            };
        }
        
        if (filterSpam) {
            filterSpam.onclick = function() {
                console.log('🔍 Filtro: Spam');
                aplicarFiltroEmail('spam');
            };
        }
        
        // 3. Verificar que las filas de email tengan las clases correctas
        const emailRows = document.querySelectorAll('.email-row');
        console.log(`Filas de email encontradas: ${emailRows.length}`);
        
        emailRows.forEach((row, index) => {
            // Asegurarse de que cada fila tiene los atributos necesarios
            if (!row.dataset.type) {
                row.dataset.type = '';
                if (row.classList.contains('fw-bold')) row.dataset.type += 'unread ';
                
                // Verificar si tiene estrella
                const star = row.querySelector('i.fa-star.fas.text-warning');
                if (star) row.dataset.type += 'important ';
            }
            
            // Debug para las primeras 5 filas
            if (index < 5) {
                console.log(`Fila ${index+1}:`, 
                    row.classList.contains('fw-bold') ? 'No leído' : 'Leído',
                    row.dataset.type || 'Sin tipo',
                    row.querySelector('i.fa-star.fas.text-warning') ? 'Importante' : 'Normal'
                );
            }
        });
        
        // 4. Activar filtro "Todos" por defecto
        if (filterAll) {
            filterAll.checked = true;
            aplicarFiltroEmail('all');
            console.log('✅ Filtro "Todos" activado por defecto');
        }
        
        console.log('✅ Reparación de filtros de email completada');
    }, 1000); // Esperar 1 segundo para asegurarse de que todo está cargado
});

/**
 * Aplicar un filtro de email específico
 * @param {string} type - Tipo de filtro (all, unread, important, spam)
 */
function aplicarFiltroEmail(type) {
    console.log(`🔍 Aplicando filtro de email: ${type}`);
    
    // 1. Hacer visible todas las filas primero
    const emailRows = document.querySelectorAll('.email-row');
    let visibleCount = 0;
    
    // 2. Aplicar el filtro
    emailRows.forEach(row => {
        let mostrar = false;
        
        if (type === 'all') {
            mostrar = true;
        } 
        else if (type === 'unread') {
            mostrar = row.classList.contains('fw-bold');
        } 
        else if (type === 'important') {
            mostrar = !!row.querySelector('i.fa-star.fas.text-warning');
        } 
        else if (type === 'spam') {
            mostrar = (row.dataset.type || '').includes('spam');
        }
        
        // Aplicar visibilidad
        if (mostrar) {
            row.style.display = '';
            row.classList.remove('d-none');
            visibleCount++;
        } else {
            row.style.display = 'none';
            row.classList.add('d-none');
        }
    });
    
    // 3. Actualizar contador
    const filterNames = {
        'all': 'todos',
        'unread': 'no leídos',
        'important': 'importantes',
        'spam': 'spam'
    };
    
    // Ya usamos console.log en la siguiente línea para mostrar información
    
    console.log(`✅ Filtro aplicado. Mostrando ${visibleCount} de ${emailRows.length} emails`);
}
