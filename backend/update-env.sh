#!/bin/bash
# Script para actualizar el archivo .env con la configuración correcta de PostgreSQL

# Copia el contenido de .env-fix a .env
cp .env-fix .env

echo "✅ Archivo .env actualizado correctamente con la configuración de PostgreSQL"
echo "🚀 Recuerda reiniciar el servidor backend para aplicar los cambios"
