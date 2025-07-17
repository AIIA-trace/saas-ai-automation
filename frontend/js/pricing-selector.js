document.addEventListener('DOMContentLoaded', function() {
    // Función que se ejecutará al cargar la página y cada 500ms durante 5 segundos
    function removeAspas() {
        // Eliminar las aspas (X) que aparecen junto a los planes de precios
        const pricingElements = document.querySelectorAll('.pricing-card');
        
        // Eliminar cualquier elemento que pueda estar generando las aspas
        pricingElements.forEach(card => {
            // Eliminar elementos específicos que podrían ser aspas
            const xMarks = card.querySelectorAll('.x-mark, .close-icon, .plan-selector, [class*="x-"], [class*="close"]');
            if (xMarks.length > 0) {
                xMarks.forEach(mark => mark.remove());
            }
            
            // Eliminar cualquier elemento posicionado absolutamente en las esquinas
            const allCardElements = card.querySelectorAll('*');
            allCardElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.position === 'absolute') {
                    // Verificar si está en una esquina
                    const top = parseInt(style.top);
                    const right = parseInt(style.right);
                    if ((top <= 20 && right <= 20) || el.classList.contains('close') || el.classList.contains('x-mark')) {
                        el.remove();
                    }
                }
            });
            
            // Eliminar específicamente elementos en la cabecera que no sean el título o descripción
            const header = card.querySelector('.pricing-card-header');
            if (header) {
                const headerElements = header.querySelectorAll(':scope > *:not(h3):not(p):not(.badge)');
                headerElements.forEach(el => el.remove());
            }
        });
    }
    
    // Ejecutar inmediatamente
    removeAspas();
    
    // Y también ejecutar varias veces después de que la página se cargue completamente
    // para asegurarnos de que eliminamos elementos que podrían agregarse dinámicamente
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
        removeAspas();
        attempts++;
        if (attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 500);
    
    // También agregar estilos CSS para ocultar aspas
    const style = document.createElement('style');
    style.textContent = `
        .pricing-card::before,
        .pricing-card::after,
        .pricing-card *::before,
        .pricing-card *::after,
        .pricing-card-header::before,
        .pricing-card-header::after {
            display: none !important;
            content: none !important;
            opacity: 0 !important;
        }
        
        .x-mark, .close-icon, .plan-selector, 
        [class*="x-"], [class*="close"], 
        .pricing-card *[style*="position: absolute"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Observar cambios en el DOM para eliminar aspas que puedan agregarse dinámicamente
    const observer = new MutationObserver(function(mutations) {
        removeAspas();
    });
    
    // Observar cambios en todo el contenedor de precios
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
        observer.observe(pricingSection, { childList: true, subtree: true });
    }
});
