-- Migración para agregar campo companyDescription
-- Ejecutar en la base de datos PostgreSQL

-- Agregar campo companyDescription a la tabla Client
ALTER TABLE "Client" 
ADD COLUMN "companyDescription" TEXT;

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Client' 
  AND column_name = 'companyDescription';

-- Opcional: Agregar comentario al campo
COMMENT ON COLUMN "Client"."companyDescription" IS 'Descripción de la empresa del formulario de registro';
