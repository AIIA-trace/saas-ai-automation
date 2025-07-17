/**
 * Script para asegurar que todo el contenido se muestre correctamente
 * independientemente de la URL o ruta que se esté utilizando
 */
document.addEventListener('DOMContentLoaded', function() {
    // Función para asegurar que todas las secciones se muestren correctamente
    function fixContentDisplay() {
        // Asegurar que las secciones principales estén visibles
        const mainSections = [
            'features',
            'how-it-works',
            'demo', // Si existe una sección con este ID
            'pricing'
        ];
        
        mainSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = '';
                section.style.visibility = 'visible';
                section.style.opacity = '1';
                section.style.height = '';
                section.style.overflow = 'visible';
            }
        });
        
        // Específicamente para las secciones que sabemos que tienen problemas
        const howItWorksSection = document.getElementById('how-it-works');
        const demoSection = document.querySelector('section:has(h2:contains("Mira cómo funciona"))');
        
        if (howItWorksSection) {
            // Asegurar que todos los elementos dentro de esta sección sean visibles
            const elements = howItWorksSection.querySelectorAll('*');
            elements.forEach(el => {
                el.style.display = '';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
        }
        
        if (demoSection) {
            // Asegurar que todos los elementos dentro de esta sección sean visibles
            const elements = demoSection.querySelectorAll('*');
            elements.forEach(el => {
                el.style.display = '';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
        }
        
        // Si estamos en la ruta /#/demo, asegurar que no interfiera con la visualización
        if (window.location.hash.includes('/demo')) {
            // Intentar modificar el comportamiento del router SPA si existe
            if (window.history && window.history.replaceState) {
                // Mantener la URL pero cambiar el comportamiento interno
                setTimeout(() => {
                    // Mostrar todo el contenido después de un breve retraso
                    document.body.style.display = '';
                    document.body.style.visibility = 'visible';
                    document.body.style.opacity = '1';
                    
                    // Hacer scroll a la sección de demostración si existe
                    const demoSection = document.querySelector('section:has(h2:contains("Mira cómo funciona"))');
                    if (demoSection) {
                        demoSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        }
    }
    
    // Ejecutar la función inmediatamente
    fixContentDisplay();
    
    // También ejecutar después de un breve retraso para asegurar que cualquier script SPA haya terminado
    setTimeout(fixContentDisplay, 500);
    setTimeout(fixContentDisplay, 1000);
    setTimeout(fixContentDisplay, 2000);
    
    // Observar cambios en el DOM para asegurar que el contenido permanezca visible
    const observer = new MutationObserver(function(mutations) {
        fixContentDisplay();
    });
    
    // Observar cambios en todo el body
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
    
    // También manejar cambios en la URL (para SPAs)
    window.addEventListener('hashchange', fixContentDisplay);
    window.addEventListener('popstate', fixContentDisplay);
});
