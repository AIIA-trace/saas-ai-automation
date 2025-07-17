/**
 * Controlador para las ondas de voz animadas
 * Las ondas están en constante movimiento con variaciones de intensidad
 */
document.addEventListener('DOMContentLoaded', function() {
    const voiceWaves = document.querySelector('.voice-waves');
    
    if (voiceWaves) {
        // Las ondas ahora están siempre animadas por defecto gracias al CSS actualizado
        // Añadimos variaciones de intensidad para dar un efecto más dinámico
        
        // Función para crear variaciones de intensidad en las ondas
        function createWaveVariations() {
            const waveBars = voiceWaves.querySelectorAll('.wave-bar');
            
            // Aplicar variaciones aleatorias a cada barra
            waveBars.forEach(bar => {
                // Variación sutil en la animación
                const randomDelay = Math.random() * 0.5;
                const randomDuration = 0.8 + Math.random() * 0.8;
                
                bar.style.animationDelay = `${randomDelay}s`;
                bar.style.animationDuration = `${randomDuration}s`;
            });
        }
        
        // Aplicar variaciones iniciales
        createWaveVariations();
        
        // Cambiar las variaciones periódicamente para un efecto más dinámico
        setInterval(() => {
            createWaveVariations();
        }, 5000);
    }
});
