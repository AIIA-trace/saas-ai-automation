-- Script de Documentación: Nombres Oficiales de Campos para Configuración del Bot
-- Este script sirve como referencia oficial de la nomenclatura correcta de campos en la base de datos
-- y cómo deben ser utilizados de forma consistente en todo el sistema.

-- ====================================================
-- NOMENCLATURA OFICIAL DE CAMPOS: SNAKE_CASE
-- ====================================================
-- Todos los campos en la base de datos usan snake_case
-- El frontend y el backend DEBEN usar esta misma nomenclatura
-- Se han eliminado mapeos implícitos entre nombres de campo

-- ====================================================
-- TABLA: BotAiConfig
-- ====================================================
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name = 'client_id' THEN 'ID del cliente al que pertenece esta configuración'
        WHEN column_name = 'model' THEN 'Modelo de lenguaje (ej: gpt-3.5-turbo)'
        WHEN column_name = 'temperature' THEN 'Temperatura para la generación de texto (0-1)'
        WHEN column_name = 'max_tokens' THEN 'Número máximo de tokens por respuesta'
        WHEN column_name = 'top_p' THEN 'Muestreo nucleus (0-1)'
        WHEN column_name = 'presence_penalty' THEN 'Penalización por repetición de temas (0-2)'
        WHEN column_name = 'frequency_penalty' THEN 'Penalización por repetición de palabras (0-2)'
        WHEN column_name = 'created_at' THEN 'Fecha de creación del registro'
        ELSE 'Sin descripción disponible'
    END AS descripcion
FROM 
    information_schema.columns 
WHERE 
    table_name = 'BotAiConfig'
ORDER BY 
    ordinal_position;
    
-- ADVERTENCIA: El frontend DEBE usar max_tokens, top_p, presence_penalty y frequency_penalty
-- NO usar maxTokens, topP, presencePenalty o frequencyPenalty

-- ====================================================
-- TABLA: BotDtmfOption
-- ====================================================
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name = 'client_id' THEN 'ID del cliente al que pertenece esta opción'
        WHEN column_name = 'digit' THEN 'Dígito que el usuario presiona (0-9, *, #)'
        WHEN column_name = 'description' THEN 'Descripción de la opción (ej: "Hablar con un operador")'
        WHEN column_name = 'action' THEN 'Acción a realizar cuando se selecciona esta opción'
        WHEN column_name = 'created_at' THEN 'Fecha de creación del registro'
        ELSE 'Sin descripción disponible'
    END AS descripcion
FROM 
    information_schema.columns 
WHERE 
    table_name = 'BotDtmfOption'
ORDER BY 
    ordinal_position;
    
-- ADVERTENCIA: Usar siempre description, NO usar message
-- ADVERTENCIA: Usar siempre digit, NO usar key o dtmf_key

-- ====================================================
-- TABLA: BotContextFile
-- ====================================================
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name = 'client_id' THEN 'ID del cliente al que pertenece este archivo'
        WHEN column_name = 'filename' THEN 'Nombre del archivo subido'
        WHEN column_name = 'file_url' THEN 'URL del archivo almacenado'
        WHEN column_name = 'file_type' THEN 'Tipo MIME del archivo'
        WHEN column_name = 'file_size' THEN 'Tamaño del archivo en bytes'
        WHEN column_name = 'processed' THEN 'Flag que indica si el archivo ha sido procesado'
        WHEN column_name = 'created_at' THEN 'Fecha de creación del registro'
        ELSE 'Sin descripción disponible'
    END AS descripcion
FROM 
    information_schema.columns 
WHERE 
    table_name = 'BotContextFile'
ORDER BY 
    ordinal_position;
    
-- ADVERTENCIA: Usar siempre file_url, file_type y file_size
-- NO usar url, type o size

-- ====================================================
-- TABLA: BotFAQ
-- ====================================================
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN column_name = 'client_id' THEN 'ID del cliente al que pertenece esta FAQ'
        WHEN column_name = 'question' THEN 'Pregunta frecuente'
        WHEN column_name = 'answer' THEN 'Respuesta a la pregunta frecuente'
        WHEN column_name = 'created_at' THEN 'Fecha de creación del registro'
        ELSE 'Sin descripción disponible'
    END AS descripcion
FROM 
    information_schema.columns 
WHERE 
    table_name = 'BotFAQ'
ORDER BY 
    ordinal_position;

-- ====================================================
-- VERIFICACIÓN PARA UN CLIENTE ESPECÍFICO
-- ====================================================
-- Reemplazar [EMAIL] con el email del cliente a verificar
-- Por ejemplo: 'prueba4@gmail.com'

-- Identificar el ID del cliente por su email
WITH cliente AS (
    SELECT id FROM Client WHERE email = '[EMAIL]'
)

-- Consulta unificada que devuelve toda la configuración del bot para un cliente
SELECT 
    JSON_BUILD_OBJECT(
        'client_id', c.id,
        'client_email', c.email,
        'company_name', c.name,
        'ai_config', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'model', bai.model,
                    'temperature', bai.temperature,
                    'max_tokens', bai.max_tokens,
                    'top_p', bai.top_p,
                    'presence_penalty', bai.presence_penalty,
                    'frequency_penalty', bai.frequency_penalty
                )
            )
            FROM BotAiConfig bai
            WHERE bai.client_id = c.id
        ),
        'dtmf_options', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'digit', bdo.digit,
                    'description', bdo.description,
                    'action', bdo.action
                )
            )
            FROM BotDtmfOption bdo
            WHERE bdo.client_id = c.id
        ),
        'context_files', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'filename', bcf.filename,
                    'file_url', bcf.file_url,
                    'file_type', bcf.file_type,
                    'file_size', bcf.file_size,
                    'processed', bcf.processed
                )
            )
            FROM BotContextFile bcf
            WHERE bcf.client_id = c.id
        ),
        'faqs', (
            SELECT JSON_AGG(
                JSON_BUILD_OBJECT(
                    'question', bf.question,
                    'answer', bf.answer
                )
            )
            FROM BotFAQ bf
            WHERE bf.client_id = c.id
        )
    ) AS bot_config
FROM Client c
JOIN cliente ON c.id = cliente.id;
