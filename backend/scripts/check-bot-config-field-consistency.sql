-- Script para verificar consistencia de campos en la configuración del bot
-- Ejecutar en la consola de PostgreSQL conectado a saas_ai_database_mslf

\echo '==== VERIFICACIÓN DE CONSISTENCIA EN CAMPOS DE CONFIGURACIÓN DEL BOT ===='
\echo 'Base de datos: saas_ai_database_mslf'
\echo 'Fecha de ejecución:' `date`
\echo ''

-- Primero encontremos el ID del cliente directamente
SELECT id, "companyName", email FROM "Client" WHERE email = 'prueba4@gmail.com';

-- INSTRUCCIÓN: Reemplaza '123' por el ID que hayas obtenido de la consulta anterior
-- Por ejemplo, si el ID obtenido es 5, cambia '123' por '5' en la línea siguiente:
\set cliente_id 123

-- Información básica del cliente
\echo '=== 1. INFORMACIÓN BÁSICA DEL CLIENTE ==='
SELECT 
    id, 
    "companyName", 
    email 
FROM 
    "Client" 
WHERE 
    id = :cliente_id;

-- Verificar configuración AI - comprobar que usa nombres de campo snake_case
\echo ''
\echo '=== 2. CONFIGURACIÓN AI (verificando snake_case) ==='
SELECT 
    id,
    client_id, 
    model, 
    temperature, 
    max_tokens,       -- Debe usar snake_case, no maxTokens
    top_p,            -- Debe usar snake_case, no topP
    presence_penalty, -- Debe usar snake_case
    frequency_penalty -- Debe usar snake_case
FROM 
    "BotAiConfig" 
WHERE 
    client_id = :cliente_id;

-- Verificar opciones DTMF - comprobar que usa 'description' y no 'message'
\echo ''
\echo '=== 3. OPCIONES DTMF (verificando campo description) ==='
SELECT 
    id,
    client_id,
    digit,
    action,
    description      -- Debe usar 'description', no 'message'
FROM 
    "BotDtmfOption" 
WHERE 
    client_id = :cliente_id;

-- Verificar archivos de contexto - comprobar que usa file_url, file_type, file_size
\echo ''
\echo '=== 4. ARCHIVOS DE CONTEXTO (verificando campos file_*) ==='
SELECT 
    id,
    client_id,
    filename,
    file_url,        -- Debe usar snake_case, no url o fileUrl
    file_type,       -- Debe usar snake_case, no type o fileType
    file_size,       -- Debe usar snake_case, no size o fileSize
    processed
FROM 
    "BotContextFile" 
WHERE 
    client_id = :cliente_id;

-- Vista completa JSON de todos los datos relacionados
\echo ''
\echo '=== 5. VISTA COMPLETA JSON (para visualizar estructura completa) ==='
SELECT 
    c.id AS cliente_id, 
    c."companyName",
    c.email,
    json_build_object(
        'model', ai.model,
        'temperature', ai.temperature,
        'max_tokens', ai.max_tokens,
        'top_p', ai.top_p,
        'presence_penalty', ai.presence_penalty,
        'frequency_penalty', ai.frequency_penalty
    ) AS configuracion_ai,
    (
        SELECT json_agg(json_build_object(
            'digit', d.digit,
            'action', d.action,
            'description', d.description
        ))
        FROM "BotDtmfOption" d
        WHERE d.client_id = c.id
    ) AS opciones_dtmf,
    (
        SELECT json_agg(json_build_object(
            'filename', f.filename,
            'file_url', f.file_url,
            'file_type', f.file_type,
            'file_size', f.file_size,
            'processed', f.processed
        ))
        FROM "BotContextFile" f
        WHERE f.client_id = c.id
    ) AS archivos_contexto
FROM 
    "Client" c
LEFT JOIN 
    "BotAiConfig" ai ON c.id = ai.client_id
WHERE 
    c.id = :cliente_id;

-- Lista de clientes con datos para probar
\echo ''
\echo '=== 6. CLIENTES CON CONFIGURACIONES (para pruebas) ==='
SELECT
    c.id,
    c."companyName",
    c.email,
    CASE WHEN ai.id IS NOT NULL THEN 'Sí' ELSE 'No' END AS "tiene_ai_config",
    (SELECT COUNT(*) FROM "BotDtmfOption" d WHERE d.client_id = c.id) AS "num_dtmf_options",
    (SELECT COUNT(*) FROM "BotContextFile" f WHERE f.client_id = c.id) AS "num_context_files"
FROM
    "Client" c
LEFT JOIN
    "BotAiConfig" ai ON c.id = ai.client_id
WHERE
    ai.id IS NOT NULL OR
    EXISTS (SELECT 1 FROM "BotDtmfOption" d WHERE d.client_id = c.id) OR
    EXISTS (SELECT 1 FROM "BotContextFile" f WHERE f.client_id = c.id)
ORDER BY
    c.id;
