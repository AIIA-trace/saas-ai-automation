/**
 * Script para mantener activo el backend de Render
 * Hace ping al servidor cada 10 minutos para evitar que entre en modo sleep
 */

(function() {
    // URL del endpoint de health check
    const HEALTH_CHECK_URL = 'https://api.aiiatrace.com/api/health';
    
    // Intervalo en milisegundos (10 minutos)
    const PING_INTERVAL = 10 * 60 * 1000;
    
    // Función para hacer ping al servidor
    function pingServer() {
        console.log('Enviando ping al servidor para mantenerlo activo...');
        
        fetch(HEALTH_CHECK_URL, { 
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => {
            if (response.ok) {
                console.log('Servidor activo ✓');
            } else {
                console.warn('El servidor respondió con estado:', response.status);
            }
        })
        .catch(error => {
            console.error('Error al hacer ping al servidor:', error);
        });
    }
    
    // Hacer ping inmediatamente al cargar la página
    pingServer();
    
    // Configurar intervalo para ping periódico
    setInterval(pingServer, PING_INTERVAL);
    
    // También hacer ping cuando la ventana vuelve a estar activa
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            pingServer();
        }
    });
    
    console.log('Sistema de keep-alive inicializado correctamente');
})();
