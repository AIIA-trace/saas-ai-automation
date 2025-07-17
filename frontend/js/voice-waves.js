/**
 * Controlador para las ondas de voz animadas
 * Permite que las ondas reaccionen al pasar el ratón por encima
 */
document.addEventListener('DOMContentLoaded', function() {
    const voiceWaves = document.querySelector('.voice-waves');
    
    if (voiceWaves) {
        // Activar animación al pasar el ratón
        voiceWaves.addEventListener('mouseenter', function() {
            voiceWaves.classList.add('animated');
        });
        
        // Desactivar animación al quitar el ratón
        voiceWaves.addEventListener('mouseleave', function() {
            voiceWaves.classList.remove('animated');
        });
        
        // Animación inicial al cargar la página (breve)
        setTimeout(() => {
            voiceWaves.classList.add('animated');
            
            setTimeout(() => {
                voiceWaves.classList.remove('animated');
            }, 3000);
        }, 500);
        
        // Crear efecto de "habla" aleatorio cada cierto tiempo
        setInterval(() => {
            if (!voiceWaves.classList.contains('animated')) {
                voiceWaves.classList.add('animated');
                
                setTimeout(() => {
                    voiceWaves.classList.remove('animated');
                }, 2000);
            }
        }, 8000);
    }
});
