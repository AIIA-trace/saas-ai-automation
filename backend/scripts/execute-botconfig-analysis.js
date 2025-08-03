// Script para ejecutar el análisis de botConfig y mostrar resultados
// Utiliza la misma configuración de conexión a la base de datos que otros scripts

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('==== ANÁLISIS PARA MIGRACIÓN DE JSON A CAMPOS DIRECTOS ====');
  console.log('Fecha de ejecución:', new Date().toLocaleString());
  console.log('');

  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada');
    console.log('💡 Asegúrate de que DATABASE_URL esté en las variables de entorno');
    process.exit(1);
  }

  console.log('🔗 Conectando a:', DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Ocultar password

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. Análisis de campos actuales en botConfig
    console.log('\n=== 1. CAMPOS ACTUALES EN BOTCONFIG (frecuencia de uso) ===');
    const fieldsResult = await pool.query(`
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
    `);

    console.table(fieldsResult.rows);

    // 2. Análisis de valores para determinar el tipo de dato adecuado
    console.log('\n=== 2. ANÁLISIS DE VALORES PARA DETERMINAR TIPOS DE DATOS ===');
    
    // 2.1 Para el campo botName
    console.log('\n--- Campo: botName ---');
    const botNameResult = await pool.query(`
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
    `);

    console.table(botNameResult.rows);

    // 2.2 Para el campo language
    console.log('\n--- Campo: language ---');
    const languageResult = await pool.query(`
      SELECT 
        'language' as campo,
        'VARCHAR(10)' as tipo_sugerido,
        COUNT(DISTINCT c."botConfig"->>'language') as valores_distintos
      FROM 
        "Client" c
      WHERE 
        c."botConfig" IS NOT NULL AND c."botConfig" ? 'language';
    `);

    console.table(languageResult.rows);

    // 2.3 Para campos de tipo objeto
    console.log('\n--- Campos de tipo objeto (requieren normalización) ---');
    const objectFieldsResult = await pool.query(`
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
    `);

    console.table(objectFieldsResult.rows);

    // 2.4 Para campos de tipo array
    console.log('\n--- Campos de tipo array (requieren normalización) ---');
    const arrayFieldsResult = await pool.query(`
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
    `);

    console.table(arrayFieldsResult.rows);

    // 3. Generación de comandos ALTER TABLE para añadir las columnas directas
    console.log('\n=== 3. COMANDOS ALTER TABLE PARA MIGRACIÓN A CAMPOS DIRECTOS ===');
    console.log('\n-- Ejecutar estas sentencias para añadir las columnas necesarias:');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "botName" VARCHAR(100);');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "botLanguage" VARCHAR(10);');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT;');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "offHoursMessage" TEXT;');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingHoursOpening" TIME;');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingHoursClosing" TIME;');
    console.log('ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "workingDays" VARCHAR(20);');

    // 4. Generación de comandos UPDATE para migrar los datos
    console.log('\n=== 4. COMANDOS UPDATE PARA MIGRACIÓN DE DATOS ===');
    console.log('\n-- Ejecutar estas sentencias para migrar los datos:');
    console.log('UPDATE "Client" SET "botName" = "botConfig"->\'botName\' WHERE "botConfig" ? \'botName\';');
    console.log('UPDATE "Client" SET "botLanguage" = "botConfig"->\'language\' WHERE "botConfig" ? \'language\';');
    console.log('UPDATE "Client" SET "welcomeMessage" = "botConfig"->\'welcomeMessage\' WHERE "botConfig" ? \'welcomeMessage\';');
    console.log('UPDATE "Client" SET "offHoursMessage" = "botConfig"->\'offHoursMessage\' WHERE "botConfig" ? \'offHoursMessage\';');
    console.log('UPDATE "Client" SET "workingDays" = "botConfig"->\'workingDays\'::text WHERE "botConfig" ? \'workingDays\';');
    console.log(`UPDATE "Client" SET 
  "workingHoursOpening" = ("botConfig"->'workingHours'->>'opening')::time,
  "workingHoursClosing" = ("botConfig"->'workingHours'->>'closing')::time
WHERE "botConfig" ? 'workingHours';`);

    // 5. Verificación de migración
    console.log('\n=== 5. VERIFICACIÓN DE MIGRACIÓN ===');
    console.log('\n-- Ejecutar esta consulta después de la migración para verificar:');
    console.log(`SELECT
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
ORDER BY id;`);

    // 6. Recomendaciones para tablas adicionales
    console.log('\n=== 6. RECOMENDACIONES PARA NORMALIZACIÓN ADICIONAL ===');
    console.log('\n-- Para datos complejos como FAQs, se recomienda crear tablas separadas:');
    console.log(`CREATE TABLE "BotFAQ" (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "Client"(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    console.log('\n-- Para archivos de contexto:');
    console.log(`CREATE TABLE "BotContextFile" (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES "Client"(id),
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    console.log('\n-- IMPORTANTE: Esta migración mantiene "botConfig" intacto hasta verificar la integridad de los datos migrados.');
    console.log('-- Una vez verificados los datos, se puede eliminar la columna "botConfig" con:');
    console.log('-- ALTER TABLE "Client" DROP COLUMN IF EXISTS "botConfig";');

  } catch (error) {
    console.error('❌ Error al ejecutar las consultas:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
