-- Script para analizar botConfig y preparar migración a campos directos
-- Ejecutar en la consola de PostgreSQL conectado a saas_ai_database_mslf

\echo '==== ANÁLISIS PARA MIGRACIÓN DE JSON A CAMPOS DIRECTOS ===='
\echo 'Base de datos: saas_ai_database_mslf'
\echo 'Fecha de ejecución:' `date`
\echo ''

-- 1. Análisis de campos actuales en botConfig para identificar qué columnas crear
\echo '=== 1. CAMPOS ACTUALES EN BOTCONFIG (frecuencia de uso) ==='

SELECT 
    jsonb_object_keys(c."botConfig") as campo,
    COUNT(*) as frecuencia,
    jsonb_typeof(c."botConfig" -> jsonb_object_keys(c."botConfig")) as tipo_dato
FROM 
    "Client" c
WHERE 
    c."botConfig" IS NOT NULL
GROUP BY 
    campo, tipo_dato
ORDER BY 
    frecuencia DESC, campo;

-- 2. Análisis de valores para determinar el tipo de dato adecuado
\echo ''
\echo '=== 2. ANÁLISIS DE VALORES PARA DETERMINAR TIPOS DE DATOS ==='

-- 2.1 Para el campo botName (texto simple)
\echo '\n--- Campo: botName ---'
SELECT 
    'botName' as campo,
    'VARCHAR(100)' as tipo_sugerido,
    COUNT(DISTINCT c."botConfig"->>'botName') as valores_distintos,
    MIN(length(c."botConfig"->>'botName')) as longitud_min,
    MAX(length(c."botConfig"->>'botName')) as longitud_max,
    COUNT(*) FILTER (WHERE c."botConfig"->>'botName' IS NULL) as valores_nulos
FROM 
    "Client" c
WHERE 
    c."botConfig" IS NOT NULL AND c."botConfig" ? 'botName';

-- 2.2 Para el campo language (código de idioma)
\echo '\n--- Campo: language ---'
SELECT 
    'language' as campo,
    'VARCHAR(10)' as tipo_sugerido,
    COUNT(DISTINCT c."botConfig"->>'language') as valores_distintos,
    json_agg(DISTINCT c."botConfig"->>'language') as valores_ejemplos
FROM 
    "Client" c
WHERE 
    c."botConfig" IS NOT NULL AND c."botConfig" ? 'language';

-- 2.3 Para campos de tipo objeto (necesitarán normalización)
\echo '\n--- Campos de tipo objeto (requieren normalización) ---'
SELECT 
    k as campo,
    'Requiere tabla separada o JSON' as recomendacion,
    jsonb_typeof(c."botConfig" -> k) as tipo_actual
FROM 
    "Client" c,
    jsonb_object_keys(c."botConfig") as k
WHERE 
    c."botConfig" IS NOT NULL
    AND jsonb_typeof(c."botConfig" -> k) = 'object'
GROUP BY 
    k, tipo_actual;

-- 2.4 Para campos de tipo array (necesitarán normalización)
\echo '\n--- Campos de tipo array (requieren normalización) ---'
SELECT 
    k as campo,
    'Requiere tabla separada o JSON' as recomendacion,
    jsonb_typeof(c."botConfig" -> k) as tipo_actual
FROM 
    "Client" c,
    jsonb_object_keys(c."botConfig") as k
WHERE 
    c."botConfig" IS NOT NULL
    AND jsonb_typeof(c."botConfig" -> k) = 'array'
GROUP BY 
    k, tipo_actual;

-- 3. Generación de comandos ALTER TABLE para añadir las columnas directas
\echo ''
\echo '=== 3. COMANDOS ALTER TABLE PARA MIGRACIÓN A CAMPOS DIRECTOS ==='

\echo '\n-- Ejecutar estas sentencias para añadir las columnas necesarias:'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "botName" VARCHAR(100);'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "botLanguage" VARCHAR(10);'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT;'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "offHoursMessage" TEXT;'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingHoursOpening" TIME;'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingHoursClosing" TIME;'
\echo 'ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingDays" VARCHAR(20);'

-- 4. Generación de comandos UPDATE para migrar los datos
\echo ''
\echo '=== 4. COMANDOS UPDATE PARA MIGRACIÓN DE DATOS ==='

\echo '\n-- Ejecutar estas sentencias para migrar los datos:'
\echo 'UPDATE "Client" SET "botName" = "botConfig"->\'botName\' WHERE "botConfig" ? \'botName\';'
\echo 'UPDATE "Client" SET "botLanguage" = "botConfig"->\'language\' WHERE "botConfig" ? \'language\';'
\echo 'UPDATE "Client" SET "welcomeMessage" = "botConfig"->\'welcomeMessage\' WHERE "botConfig" ? \'welcomeMessage\';'
\echo 'UPDATE "Client" SET "offHoursMessage" = "botConfig"->\'offHoursMessage\' WHERE "botConfig" ? \'offHoursMessage\';'
\echo 'UPDATE "Client" SET "workingDays" = "botConfig"->\'workingDays\'::text WHERE "botConfig" ? \'workingDays\';'
\echo 'UPDATE "Client" SET 
  "workingHoursOpening" = ("botConfig"->>\'workingHours\')::time,
  "workingHoursClosing" = ("botConfig"->>\'workingHours\')::time
WHERE "botConfig" ? \'workingHours\';'

-- 5. Verificación de migración
\echo ''
\echo '=== 5. VERIFICACIÓN DE MIGRACIÓN ==='

\echo '\n-- Ejecutar esta consulta después de la migración para verificar:'
\echo 'SELECT
  id,
  "companyName",
  "botName",
  "botLanguage",
  "welcomeMessage",
  "offHoursMessage",
  "workingHoursOpening",
  "workingHoursClosing",
  "workingDays"
FROM "Client"
WHERE "botConfig" IS NOT NULL
ORDER BY id;'

-- 6. Recomendaciones para tablas adicionales
\echo ''
\echo '=== 6. RECOMENDACIONES PARA NORMALIZACIÓN ADICIONAL ==='

\echo '\n-- Para datos complejos como FAQs, se recomienda crear tablas separadas:'
\echo 'CREATE TABLE "BotFAQ" (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "Client"(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);'

\echo '\n-- Para archivos de contexto:'
\echo 'CREATE TABLE "BotContextFile" (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "Client"(id),
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);'

\echo '\n-- IMPORTANTE: Esta migración mantiene "botConfig" intacto hasta verificar la integridad de los datos migrados.'
\echo '-- Una vez verificados los datos, se puede eliminar la columna "botConfig" con:'
\echo '-- ALTER TABLE "Client" DROP COLUMN IF EXISTS "botConfig";'
