/**
 * Normalizador de Campos para Frontend
 * 
 * Este script garantiza que todos los objetos y campos usados en el frontend
 * sigan la nomenclatura exacta de la base de datos (snake_case)
 */

(function() {
    console.log('🔄 Inicializando normalizador de campos...');
    
    // Mapeo oficial de nombres de campo (frontend → base de datos)
    const fieldMappings = {
        // AI Config
        'maxTokens': 'max_tokens',
        'topP': 'top_p',
        'presencePenalty': 'presence_penalty',
        'frequencyPenalty': 'frequency_penalty',
        
        // DTMF Options
        'message': 'description',
        'key': 'digit',
        'dtmfKey': 'digit',
        
        // Files
        'url': 'file_url',
        'type': 'file_type',
        'size': 'file_size',
        'name': 'filename',
        'fileName': 'filename',
        'fileSize': 'file_size',
        'fileType': 'file_type',
        'fileUrl': 'file_url'
    };
    
    /**
     * Normaliza nombres de campo en un objeto para que usen snake_case
     * @param {Object} data - Objeto a normalizar
     * @return {Object} - Objeto con nombres de campo normalizados
     */
    function normalizeFields(data) {
        if (!data || typeof data !== 'object') return data;
        
        // Si es un array, normalizar cada elemento
        if (Array.isArray(data)) {
            return data.map(item => normalizeFields(item));
        }
        
        // Crear nuevo objeto normalizado
        const normalized = {};
        
        Object.keys(data).forEach(key => {
            // Obtener el nombre de campo normalizado
            const normalizedKey = fieldMappings[key] || key;
            
            // Normalizar recursivamente si el valor es un objeto o array
            const value = data[key];
            if (value && typeof value === 'object') {
                normalized[normalizedKey] = normalizeFields(value);
            } else {
                normalized[normalizedKey] = value;
            }
        });
        
        return normalized;
    }
    
    /**
     * Normaliza los campos de un objeto cuando se envía al backend
     */
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (options && options.body) {
            try {
                // Si body es un string JSON, parsearlo, normalizarlo y volver a stringificar
                if (typeof options.body === 'string' && options.headers && 
                    options.headers['Content-Type'] && 
                    options.headers['Content-Type'].includes('application/json')) {
                    
                    const data = JSON.parse(options.body);
                    const normalizedData = normalizeFields(data);
                    options.body = JSON.stringify(normalizedData);
                    console.log('🔄 Datos normalizados para envío:', normalizedData);
                }
            } catch (error) {
                console.error('❌ Error al normalizar datos:', error);
            }
        }
        return originalFetch.apply(this, arguments);
    };
    
    // Exponer función para uso global
    window.normalizeFields = normalizeFields;
    
    // Normalizar respuestas de API
    if (window.ApiHelper) {
        const originalFetchApi = window.ApiHelper.fetchApi;
        window.ApiHelper.fetchApi = async function() {
            const response = await originalFetchApi.apply(this, arguments);
            
            // Intentar normalizar la respuesta si es un objeto
            try {
                if (response && typeof response === 'object') {
                    // No modificar la respuesta original, solo asegurar que el código
                    // cliente puede acceder a los campos tanto en camelCase como en snake_case
                    Object.keys(fieldMappings).forEach(camelKey => {
                        const snakeKey = fieldMappings[camelKey];
                        
                        // Si existe el campo en snake_case pero no en camelCase, crear referencia
                        if (response[snakeKey] !== undefined && response[camelKey] === undefined) {
                            Object.defineProperty(response, camelKey, {
                                get: function() { return this[snakeKey]; },
                                set: function(value) { this[snakeKey] = value; },
                                enumerable: false // No enumerar para evitar duplicados en JSON.stringify
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error al normalizar respuesta:', error);
            }
            
            return response;
        };
    }
    
    console.log('✅ Normalizador de campos inicializado');
})();
