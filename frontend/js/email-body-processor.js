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
        
        // Si el contenido es HTML, devolverlo tal cual
        // El navegador se encargará de renderizarlo correctamente
        if (body.includes('<') && body.includes('>')) {
            // Es HTML, buscar separadores comunes y ocultar el hilo anterior
            const separators = [
                'Enviado desde mi iPhone',
                'Sent from my iPhone',
                'Enviado desde mi',
                'Sent from my',
                '-------- Mensaje original --------',
                '-------- Original Message --------',
                'El .* escribió:',
                'On .* wrote:',
                '<div class="gmail_quote">',
                '<blockquote'
            ];
            
            // Buscar el primer separador
            let splitIndex = -1;
            let matchedSeparator = null;
            
            for (const separator of separators) {
                const regex = new RegExp(separator, 'i');
                const match = body.search(regex);
                if (match !== -1 && (splitIndex === -1 || match < splitIndex)) {
                    splitIndex = match;
                    matchedSeparator = separator;
                }
            }
            
            // Si encontramos un separador, dividir el contenido
            if (splitIndex !== -1) {
                const newContent = body.substring(0, splitIndex);
                const quotedContent = body.substring(splitIndex);
                
                return `
                    ${newContent}
                    <div class="mt-3">
                        <button class="btn btn-link btn-sm text-muted p-0" onclick="this.nextElementSibling.classList.toggle('d-none'); this.textContent = this.textContent.includes('Mostrar') ? '▼ Ocultar mensajes anteriores' : '▶ Mostrar mensajes anteriores'">
                            ▶ Mostrar mensajes anteriores
                        </button>
                        <div class="d-none mt-2 p-3 bg-light rounded" style="font-size: 0.9em; color: #666; max-height: 300px; overflow-y: auto;">
                            ${quotedContent}
                        </div>
                    </div>
                `;
            }
            
            // Si no hay separador, devolver el contenido completo
            return body;
        }
        
        // Si es texto plano, convertir saltos de línea a <br>
        return body.replace(/\n/g, '<br>');
    };

})();
