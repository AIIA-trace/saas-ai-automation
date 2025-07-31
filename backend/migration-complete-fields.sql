-- MIGRACIÓN COMPLETA PARA AGREGAR TODOS LOS CAMPOS FALTANTES
-- Ejecutar en la base de datos PostgreSQL de producción

-- 1. Agregar campo companyDescription
ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "companyDescription" TEXT;

-- 2. Agregar campos que faltan del schema
ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "industry" TEXT;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "website" TEXT;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'client';

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "avatar" TEXT;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'UTC';

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'es';

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "defaultPaymentMethodId" TEXT;

ALTER TABLE "Client" 
ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP;

-- 3. Verificar que todos los campos se agregaron
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Client' 
ORDER BY column_name;

-- 4. Actualizar clientes existentes con valores por defecto
UPDATE "Client" 
SET 
  "role" = 'client',
  "isActive" = true,
  "timezone" = 'UTC',
  "language" = 'es',
  "trialEndDate" = "createdAt" + INTERVAL '14 days'
WHERE "role" IS NULL OR "isActive" IS NULL;

-- 5. Comentarios para documentación
COMMENT ON COLUMN "Client"."companyDescription" IS 'Descripción de la empresa del formulario de registro';
COMMENT ON COLUMN "Client"."industry" IS 'Sector empresarial/industria';
COMMENT ON COLUMN "Client"."website" IS 'Sitio web de la empresa';
COMMENT ON COLUMN "Client"."address" IS 'Dirección de la empresa';
COMMENT ON COLUMN "Client"."role" IS 'Rol del usuario (client, admin, etc.)';
COMMENT ON COLUMN "Client"."isActive" IS 'Si el cliente está activo';
COMMENT ON COLUMN "Client"."trialEndDate" IS 'Fecha de fin del período de prueba';

-- 6. Verificación final
SELECT 
  id, 
  email, 
  companyName, 
  companyDescription,
  industry,
  website,
  address,
  role,
  isActive,
  trialEndDate,
  createdAt
FROM "Client" 
ORDER BY createdAt DESC;
