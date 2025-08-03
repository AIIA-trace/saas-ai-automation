-- VERIFICACIÓN EXHAUSTIVA DE CONSISTENCIA DE DATOS DE REGISTRO
-- Este script incluye consultas SQL para verificar todos los aspectos críticos
-- identificados en nuestro análisis de problemas de consistencia de datos.
-- Ejecutar en consola PostgreSQL conectada a la base de datos saas_ai_database_mslf

-- ============================================
-- PARTE 1: VERIFICACIÓN DEL CAMPO INDUSTRY
-- ============================================

-- 1.1. Estado general del campo industry
SELECT
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE industry IS NULL) AS sin_industry,
  COUNT(*) FILTER (WHERE industry IS NOT NULL) AS con_industry,
  ROUND(COUNT(*) FILTER (WHERE industry IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client";

-- 1.2. Distribución de valores del campo industry
SELECT
  industry,
  COUNT(*) AS cantidad
FROM "Client"
WHERE industry IS NOT NULL
GROUP BY industry
ORDER BY COUNT(*) DESC;

-- 1.3. Verificar si hay datos de industry en campos JSON anidados (companyInfo) 
-- que no se transfirieron correctamente al campo principal
SELECT
  id,
  email,
  industry AS campo_industry,
  companyInfo->>'industry' AS industry_en_json,
  companyInfo->>'businessSector' AS businessSector_en_json,
  "createdAt"
FROM "Client"
WHERE
  companyInfo IS NOT NULL AND
  (
    (companyInfo->>'industry' IS NOT NULL AND (industry IS NULL OR industry != companyInfo->>'industry')) OR
    (companyInfo->>'businessSector' IS NOT NULL AND (industry IS NULL))
  )
ORDER BY "createdAt" DESC;

-- 1.4. Verificar registros recientes (últimos 7 días) para confirmar solución
SELECT
  id,
  email,
  industry,
  "createdAt"
FROM "Client"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- ============================================
-- PARTE 2: VERIFICACIÓN DEL CAMPO PHONE
-- ============================================

-- 2.1. Estado general del campo phone
SELECT
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE phone IS NULL) AS sin_telefono,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS con_telefono,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client";

-- 2.2. Análisis de formatos de teléfono (identificar inconsistencias)
SELECT
  CASE
    WHEN phone LIKE '+%' AND phone NOT LIKE '% %' AND phone NOT LIKE '%-%' THEN 'Formato internacional limpio'
    WHEN phone LIKE '+%' AND (phone LIKE '% %' OR phone LIKE '%-%') THEN 'Formato internacional con separadores'
    WHEN phone ~ '^[0-9]+$' THEN 'Solo números sin prefijo'
    ELSE 'Otro formato'
  END AS tipo_formato,
  COUNT(*) AS cantidad
FROM "Client"
WHERE phone IS NOT NULL
GROUP BY tipo_formato
ORDER BY COUNT(*) DESC;

-- 2.3. Verificar inconsistencias entre phone y datos en JSON
SELECT
  id,
  email,
  phone AS campo_phone,
  companyInfo->>'phone' AS phone_en_json
FROM "Client"
WHERE
  companyInfo IS NOT NULL AND
  companyInfo->>'phone' IS NOT NULL AND
  (phone IS NULL OR phone != companyInfo->>'phone')
ORDER BY email;

-- ============================================
-- PARTE 3: ESTRUCTURA JSON Y CAMPOS DUPLICADOS
-- ============================================

-- 3.1. Identificar usuarios con datos redundantes en objeto companyInfo
SELECT
  id,
  email,
  companyName AS campo_principal,
  companyInfo->>'companyName' AS en_json,
  "createdAt"
FROM "Client"
WHERE
  companyInfo IS NOT NULL AND
  companyInfo->>'companyName' IS NOT NULL AND
  companyName != companyInfo->>'companyName'
ORDER BY "createdAt" DESC;

-- 3.2. Verificar usuarios con datos en 'profile' anidado dentro de companyInfo
SELECT
  id,
  email,
  companyInfo->>'profile' AS perfil_anidado,
  "createdAt"
FROM "Client"
WHERE
  companyInfo IS NOT NULL AND
  companyInfo->>'profile' IS NOT NULL
ORDER BY "createdAt" DESC;

-- 3.3. Contar usuarios con diferentes estructuras JSON
SELECT
  jsonb_object_keys(CAST(companyInfo AS jsonb)) AS campos_json,
  COUNT(*) AS cantidad_usuarios
FROM "Client"
WHERE companyInfo IS NOT NULL
GROUP BY jsonb_object_keys(CAST(companyInfo AS jsonb))
ORDER BY COUNT(*) DESC;

-- ============================================
-- PARTE 4: CAMPOS OBLIGATORIOS Y CONSISTENCIA
-- ============================================

-- 4.1. Verificar completitud de campos críticos
SELECT
  'email' AS campo,
  COUNT(*) FILTER (WHERE email IS NULL) AS registros_nulos,
  COUNT(*) FILTER (WHERE email IS NOT NULL) AS registros_con_valor,
  ROUND(COUNT(*) FILTER (WHERE email IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client"
UNION
SELECT
  'companyName' AS campo,
  COUNT(*) FILTER (WHERE companyName IS NULL) AS registros_nulos,
  COUNT(*) FILTER (WHERE companyName IS NOT NULL) AS registros_con_valor,
  ROUND(COUNT(*) FILTER (WHERE companyName IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client"
UNION
SELECT
  'industry' AS campo,
  COUNT(*) FILTER (WHERE industry IS NULL) AS registros_nulos,
  COUNT(*) FILTER (WHERE industry IS NOT NULL) AS registros_con_valor,
  ROUND(COUNT(*) FILTER (WHERE industry IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client"
UNION
SELECT
  'phone' AS campo,
  COUNT(*) FILTER (WHERE phone IS NULL) AS registros_nulos,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS registros_con_valor,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud
FROM "Client"
ORDER BY porcentaje_completitud;

-- 4.2. Detectar registros con campos críticos faltantes
SELECT
  id,
  email,
  companyName,
  industry,
  phone,
  "createdAt"
FROM "Client"
WHERE
  email IS NOT NULL AND
  (companyName IS NULL OR industry IS NULL OR phone IS NULL)
ORDER BY "createdAt" DESC;

-- ============================================
-- PARTE 5: ANÁLISIS DE CONSISTENCIA TEMPORAL
-- ============================================

-- 5.1. Analizar completitud de datos por período de tiempo
SELECT
  DATE_TRUNC('month', "createdAt") AS mes,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE industry IS NULL) AS registros_sin_industry,
  COUNT(*) FILTER (WHERE industry IS NOT NULL) AS registros_con_industry,
  ROUND(COUNT(*) FILTER (WHERE industry IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_industry,
  COUNT(*) FILTER (WHERE phone IS NULL) AS registros_sin_phone,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS registros_con_phone,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_phone
FROM "Client"
GROUP BY DATE_TRUNC('month', "createdAt")
ORDER BY DATE_TRUNC('month', "createdAt");

-- 5.2. Verificar si la solución implementada ha mejorado los datos recientes
SELECT
  CASE
    WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 'Última semana'
    WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 'Último mes'
    WHEN "createdAt" >= NOW() - INTERVAL '90 days' THEN 'Último trimestre'
    ELSE 'Anterior'
  END AS periodo,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE industry IS NOT NULL) AS con_industry,
  ROUND(COUNT(*) FILTER (WHERE industry IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_industry,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS con_phone,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_phone
FROM "Client"
GROUP BY periodo
ORDER BY
  CASE periodo
    WHEN 'Última semana' THEN 1
    WHEN 'Último mes' THEN 2
    WHEN 'Último trimestre' THEN 3
    ELSE 4
  END;

-- ============================================
-- PARTE 6: RESUMEN GENERAL DE CONSISTENCIA
-- ============================================

-- 6.1. Vista rápida de la calidad general de los datos
SELECT
  COUNT(*) AS total_usuarios,
  COUNT(*) FILTER (WHERE companyName IS NOT NULL AND industry IS NOT NULL AND phone IS NOT NULL) AS usuarios_datos_completos,
  ROUND(COUNT(*) FILTER (WHERE companyName IS NOT NULL AND industry IS NOT NULL AND phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_completitud,
  COUNT(*) FILTER (WHERE companyName IS NULL OR industry IS NULL OR phone IS NULL) AS usuarios_datos_incompletos,
  COUNT(*) FILTER (WHERE companyInfo IS NOT NULL) AS usuarios_con_datos_json
FROM "Client";

-- 6.2. Identificar usuarios con inconsistencias específicas
SELECT
  id,
  email,
  CASE WHEN companyName IS NULL THEN '❌' ELSE '✅' END AS companyName,
  CASE WHEN industry IS NULL THEN '❌' ELSE '✅' END AS industry,
  CASE WHEN phone IS NULL THEN '❌' ELSE '✅' END AS phone,
  CASE 
    WHEN companyInfo IS NOT NULL AND 
        (companyInfo->>'companyName' IS NOT NULL OR 
         companyInfo->>'industry' IS NOT NULL OR 
         companyInfo->>'businessSector' IS NOT NULL OR 
         companyInfo->>'phone' IS NOT NULL)
    THEN '❌'
    ELSE '✅'
  END AS datos_duplicados_json,
  "createdAt"
FROM "Client"
WHERE
  companyName IS NULL OR
  industry IS NULL OR
  phone IS NULL OR
  (companyInfo IS NOT NULL AND 
   (companyInfo->>'companyName' IS NOT NULL OR 
    companyInfo->>'industry' IS NOT NULL OR 
    companyInfo->>'businessSector' IS NOT NULL OR 
    companyInfo->>'phone' IS NOT NULL))
ORDER BY "createdAt" DESC;

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 1. Conectarse a la base de datos: psql -h [host] -U [usuario] -d saas_ai_database_mslf
-- 2. Ejecutar las consultas por secciones para analizar cada aspecto
-- 3. Para registros específicos, usar la consulta 6.2 para identificar usuarios problemáticos
-- 4. Para verificar la mejora tras la implementación de cambios, usar 5.2
--
-- Nota: Para actualizar datos inconsistentes, se pueden usar sentencias UPDATE basadas
-- en los resultados de estas consultas.
