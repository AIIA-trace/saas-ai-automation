/**
 * email-body-processor.js
 * 
 * Procesa el contenido de emails para separar respuesta nueva de contenido citado
 */

(function() {
    'use strict';

    /**
     * Procesar contenido del email para separar respuesta nueva de contenido citado
     */
    window.processEmailBody = function(body) {
        if (!body) return '';
        
        // Detectar contenido citado (líneas que empiezan con > o >> o >>>)
        const lines = body.split('\n');
        let newContent = [];
        let quotedContent = [];
        let inQuote = false;
        
        for (let line of lines) {
            const trimmedLine = line.trim();
            
            // Detectar si es una línea citada
            if (trimmedLine.startsWith('>') || trimmedLine.startsWith('&gt;')) {
                inQuote = true;
                quotedContent.push(line);
            } else if (inQuote && trimmedLine === '') {
                // Línea vacía después de cita
                quotedContent.push(line);
            } else if (trimmedLine.includes('Enviado desde mi iPhone') || 
                       trimmedLine.includes('Sent from my iPhone') ||
                       trimmedLine.includes('El ') && trimmedLine.includes('escribió:')) {
                // Separadores típicos de respuestas
                inQuote = true;
                quotedContent.push(line);
            } else if (!inQuote) {
                newContent.push(line);
            } else {
                quotedContent.push(line);
            }
        }
        
        // Si hay contenido citado, mostrarlo colapsado
        let result = newContent.join('\n');
        
        if (quotedContent.length > 0) {
            result += `
                <div class="mt-3">
                    <button class="btn btn-link btn-sm text-muted p-0" onclick="this.nextElementSibling.classList.toggle('d-none'); this.textContent = this.textContent.includes('Mostrar') ? '▼ Ocultar mensajes anteriores' : '▶ Mostrar mensajes anteriores (${quotedContent.length} líneas)'">
                        ▶ Mostrar mensajes anteriores (${quotedContent.length} líneas)
                    </button>
                    <div class="d-none mt-2 p-3 bg-light rounded" style="font-size: 0.9em; color: #666;">
                        ${quotedContent.join('\n').replace(/>/g, '').replace(/&gt;/g, '')}
                    </div>
                </div>
            `;
        }
        
        return result;
    };

})();
