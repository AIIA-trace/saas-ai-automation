/**
 * Script para eliminar las aspas (X) de las tarjetas de precios
 * Este script está diseñado para funcionar solo en la página de precios
 * y no interferir con el dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    // Función para eliminar las aspas
    function eliminarAspas() {
        // Seleccionar todas las tarjetas de precios
        const tarjetasPrecios = document.querySelectorAll('.pricing-card, .card-pricing, .price-card, .plan-card');
        
        if (tarjetasPrecios.length > 0) {
            console.log('Eliminando aspas de', tarjetasPrecios.length, 'tarjetas de precios');
            
            // Eliminar cualquier elemento que pueda ser un aspa
            tarjetasPrecios.forEach(tarjeta => {
                // Eliminar elementos con clases específicas
                const elementosAEliminar = tarjeta.querySelectorAll('.x-mark, .close-icon, .plan-selector, [class*="x-"], [class*="close"]');
                elementosAEliminar.forEach(elem => elem.remove());
                
                // Eliminar pseudo-elementos con CSS
                tarjeta.classList.add('sin-aspas');
            });
            
            // Añadir estilos CSS para ocultar aspas
            if (!document.getElementById('sin-aspas-style')) {
                const estilos = document.createElement('style');
                estilos.id = 'sin-aspas-style';
                estilos.textContent = `
                    .sin-aspas::before, .sin-aspas::after,
                    .pricing-card::before, .pricing-card::after,
                    .card-pricing::before, .card-pricing::after,
                    .price-card::before, .price-card::after,
                    .plan-card::before, .plan-card::after {
                        display: none !important;
                        content: none !important;
                    }
                    
                    .pricing-card *, .card-pricing *, .price-card *, .plan-card * {
                        position: relative;
                    }
                    
                    .pricing-card [class*="x-"], .pricing-card [class*="close"],
                    .card-pricing [class*="x-"], .card-pricing [class*="close"],
                    .price-card [class*="x-"], .price-card [class*="close"],
                    .plan-card [class*="x-"], .plan-card [class*="close"] {
                        display: none !important;
                    }
                    
                    /* Ocultar elementos posicionados absolutamente en las esquinas */
                    .pricing-card > *:first-child, .card-pricing > *:first-child,
                    .price-card > *:first-child, .plan-card > *:first-child {
                        position: relative;
                    }
                    
                    .pricing-card > *:first-child::before, .pricing-card > *:first-child::after,
                    .card-pricing > *:first-child::before, .card-pricing > *:first-child::after,
                    .price-card > *:first-child::before, .price-card > *:first-child::after,
                    .plan-card > *:first-child::before, .plan-card > *:first-child::after {
                        display: none !important;
                        content: none !important;
                    }
                `;
                document.head.appendChild(estilos);
            }
        }
    }
    
    // Ejecutar inmediatamente
    eliminarAspas();
    
    // Ejecutar cada segundo durante los primeros 5 segundos para asegurar que se aplique
    // incluso si hay elementos que se cargan dinámicamente
    let contador = 0;
    const intervalo = setInterval(() => {
        eliminarAspas();
        contador++;
        if (contador >= 5) clearInterval(intervalo);
    }, 1000);
    
    // Observar cambios en el DOM para eliminar aspas en elementos nuevos
    const observador = new MutationObserver(function(mutaciones) {
        eliminarAspas();
    });
    
    // Configurar el observador para detectar cambios en el árbol DOM
    observador.observe(document.body, { childList: true, subtree: true });
});
