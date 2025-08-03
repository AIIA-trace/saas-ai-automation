-- Script para verificar la consistencia del campo 'phone' en todos los registros de clientes
-- Este script debe ejecutarse directamente en la consola PostgreSQL conectada a la base de datos saas_ai_database_mslf

-- 1. Verificar cantidad de registros con campo phone nulo vs. no nulo
SELECT
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE phone IS NULL) AS registros_sin_telefono,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS registros_con_telefono,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2) AS porcentaje_con_telefono
FROM "Client";

-- 2. Analizar formatos de teléfono utilizados
SELECT
  phone,
  COUNT(*) AS cantidad
FROM "Client"
WHERE phone IS NOT NULL
GROUP BY phone
ORDER BY COUNT(*) DESC;

-- 3. Verificar formatos inconsistentes (teléfonos con espacios, paréntesis, guiones, etc.)
SELECT
  id,
  email,
  phone,
  companyName
FROM "Client"
WHERE 
  phone IS NOT NULL AND
  (phone LIKE '% %' OR phone LIKE '%(%' OR phone LIKE '%)%' OR phone LIKE '%-%')
ORDER BY email;

-- 4. Analizar longitud del campo teléfono (para detectar posibles incompletos)
SELECT
  LENGTH(phone) AS longitud_telefono,
  COUNT(*) AS cantidad
FROM "Client"
WHERE phone IS NOT NULL
GROUP BY LENGTH(phone)
ORDER BY LENGTH(phone);

-- 5. Buscar inconsistencias entre campo phone vs. companyInfo
-- (Para detectar teléfonos guardados en campo JSON)
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

-- 6. Verificar registros de los últimos 7 días para confirmar solución
SELECT
  id,
  email,
  phone,
  industry,
  "createdAt"
FROM "Client"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- 7. Verificar prefijos internacionales de teléfono
SELECT
  LEFT(phone, 3) AS prefijo_internacional,
  COUNT(*) AS cantidad
FROM "Client"
WHERE 
  phone IS NOT NULL AND
  phone LIKE '+%'
GROUP BY LEFT(phone, 3)
ORDER BY COUNT(*) DESC;

-- 8. Detectar posibles números inválidos (demasiado cortos)
SELECT
  id,
  email,
  phone,
  "createdAt"
FROM "Client"
WHERE 
  phone IS NOT NULL AND
  LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '(', ''), ')', ''), '-', '')) < 9
ORDER BY "createdAt" DESC;

-- 9. Encontrar usuarios donde el teléfono no coincide con su formato regional esperado
-- (Por ejemplo, teléfonos españoles que no comiencen con +34)
SELECT
  id,
  email,
  phone,
  country,
  "createdAt"
FROM "Client"
WHERE
  country = 'ES' AND
  phone IS NOT NULL AND
  phone NOT LIKE '+34%'
ORDER BY "createdAt" DESC;

-- 10. Resumen general del estado del campo phone
SELECT
  'Total clientes' AS metrica, COUNT(*)::text AS valor
FROM "Client"
UNION
SELECT
  'Clientes con teléfono', COUNT(*)::text
FROM "Client"
WHERE phone IS NOT NULL
UNION
SELECT
  'Clientes sin teléfono', COUNT(*)::text
FROM "Client"
WHERE phone IS NULL
UNION
SELECT
  'Porcentaje completitud', ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)::text || '%'
FROM "Client";
