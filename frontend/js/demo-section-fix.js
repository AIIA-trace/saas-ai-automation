/**
 * Script específico para asegurar que la sección de demostración se muestre correctamente
 */
document.addEventListener('DOMContentLoaded', function() {
    // Función para encontrar y arreglar la sección de demostración
    function fixDemoSection() {
        // Buscar la sección por su título ya que puede no tener un ID específico
        const demoSectionTitle = Array.from(document.querySelectorAll('h2')).find(
            h2 => h2.textContent.includes('Mira cómo funciona')
        );
        
        if (demoSectionTitle) {
            // Encontrar la sección padre
            let demoSection = demoSectionTitle.closest('section');
            if (!demoSection) {
                // Si no está dentro de una sección, buscar el contenedor padre más cercano
                demoSection = demoSectionTitle.closest('.container').parentElement;
            }
            
            if (demoSection) {
                // Asignar un ID si no lo tiene
                if (!demoSection.id) {
                    demoSection.id = 'demo-section';
                }
                
                // Asegurar que la sección sea visible
                demoSection.style.display = 'block';
                demoSection.style.visibility = 'visible';
                demoSection.style.opacity = '1';
                demoSection.style.height = 'auto';
                demoSection.style.overflow = 'visible';
                
                // Asegurar que todos los elementos dentro de esta sección sean visibles
                const elements = demoSection.querySelectorAll('*');
                elements.forEach(el => {
                    el.style.display = '';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                });
                
                // Específicamente para el reproductor de audio
                const audioPlayer = demoSection.querySelector('.audio-player-wrapper');
                if (audioPlayer) {
                    audioPlayer.style.display = 'block';
                    audioPlayer.style.visibility = 'visible';
                    audioPlayer.style.opacity = '1';
                }
                
                // Específicamente para los beneficios
                const benefitsList = demoSection.querySelector('.demo-features-list');
                if (benefitsList) {
                    benefitsList.style.display = 'block';
                    benefitsList.style.visibility = 'visible';
                    benefitsList.style.opacity = '1';
                }
                
                console.log('Demo section fixed:', demoSection);
            }
        }
    }
    
    // Ejecutar la función inmediatamente
    fixDemoSection();
    
    // También ejecutar después de un breve retraso para asegurar que cualquier script SPA haya terminado
    setTimeout(fixDemoSection, 500);
    setTimeout(fixDemoSection, 1000);
    setTimeout(fixDemoSection, 2000);
    
    // Si estamos en la ruta /#/demo, asegurar que se muestre la sección de demostración
    if (window.location.hash.includes('/demo')) {
        // Intentar modificar el comportamiento del router SPA si existe
        if (window.history && window.history.replaceState) {
            setTimeout(() => {
                // Buscar la sección de demostración
                const demoSectionTitle = Array.from(document.querySelectorAll('h2')).find(
                    h2 => h2.textContent.includes('Mira cómo funciona')
                );
                
                if (demoSectionTitle) {
                    // Hacer scroll a la sección
                    demoSectionTitle.scrollIntoView({ behavior: 'smooth' });
                }
            }, 300);
        }
    }
});
