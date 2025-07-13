/**
 * Manejo de navegación del menú lateral
 * Este script se encarga de gestionar la navegación entre las diferentes secciones del dashboard
 * Implementado según las mejores prácticas de Bootstrap 5
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando navegación del menú según estándares Bootstrap 5...');
    
    // Verificar que Bootstrap está disponible
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap no está disponible. Asegúrate de que bootstrap.bundle.min.js está cargado correctamente.');
        return;
    }
    
    // Inicializar todos los tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Inicializar todos los popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Obtener todos los elementos del menú lateral
    const menuItems = document.querySelectorAll('#sidebar-wrapper .list-group-item');
    
    // Añadir event listeners a cada elemento del menú
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Prevenir comportamiento por defecto si es necesario
            if (this.getAttribute('href') && this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                console.log('Clic en elemento de menú:', this.getAttribute('href'));
                
                // Eliminar la clase active de todos los elementos
                menuItems.forEach(mi => mi.classList.remove('active'));
                
                // Añadir la clase active al elemento clicado
                this.classList.add('active');
                
                // Obtener el ID del tab a mostrar (sin el #)
                const tabId = this.getAttribute('href').replace('#', '');
                
                // Activar el tab correspondiente usando la API de Bootstrap 5
                const tabEl = document.querySelector(`#${tabId}`);
                if (tabEl) {
                    const tab = new bootstrap.Tab(this);
                    tab.show();
                    console.log('Tab activado usando API de Bootstrap:', tabId);
                } else {
                    console.error('No se encontró el tab con ID:', tabId);
                }
                
                // Si estamos en móvil, cerrar el menú lateral
                if (window.innerWidth < 768) {
                    document.getElementById('wrapper').classList.remove('toggled');
                }
            }
        });
    });
    
    // Manejar el botón de toggle del menú
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }
    
    // Verificar si hay un hash en la URL para activar el tab correspondiente
    if (window.location.hash) {
        const hash = window.location.hash;
        const tabLink = document.querySelector(`a[href="${hash}"]`);
        if (tabLink) {
            tabLink.click();
            console.log('Activado tab desde URL hash:', hash);
        }
    }
    
    console.log('Navegación del menú inicializada correctamente según estándares Bootstrap 5');
});
