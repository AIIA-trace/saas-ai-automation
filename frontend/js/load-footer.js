/**
 * Cargar footer dinámicamente en todas las páginas
 */
(function() {
    // Crear contenedor para el footer si no existe
    let footerContainer = document.getElementById('footer-container');
    
    if (!footerContainer) {
        // Crear contenedor antes del cierre de body
        footerContainer = document.createElement('div');
        footerContainer.id = 'footer-container';
        document.body.appendChild(footerContainer);
    }

    // Cargar footer
    fetch('/components/footer.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            footerContainer.innerHTML = html;
            console.log('✅ Footer cargado correctamente');
        })
        .catch(error => {
            console.error('❌ Error cargando footer:', error);
            // Fallback: mostrar footer básico
            footerContainer.innerHTML = `
                <footer class="footer bg-dark text-light py-3 mt-auto">
                    <div class="container text-center">
                        <p class="mb-0">&copy; 2025 AIIA Trace - SusanBot. Todos los derechos reservados.</p>
                        <p class="mb-0 small">
                            <a href="/privacy-policy.html" class="text-light">Privacidad</a> | 
                            <a href="/terms-of-service.html" class="text-light">Términos</a>
                        </p>
                    </div>
                </footer>
            `;
        });
})();
