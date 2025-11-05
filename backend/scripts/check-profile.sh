#!/bin/bash
# Script para verificar el perfil de un usuario en la API

# Configuración
API_URL="https://api.aiiatrace.com"
EMAIL="carlos@almiscle.com"

# Colores para mejor visualización
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Verificando datos guardados para $EMAIL ===${NC}"
echo -e "${BLUE}=== $(date) ===${NC}"

# Paso 1: Obtener un token JWT
echo -e "${BLUE}Paso 1: Obteniendo token...${NC}"

# Intentar leer el token desde localStorage (si estás en el mismo navegador)
echo "Por favor, ingresa el token JWT (se encuentra en localStorage.auth_token):"
read -r TOKEN

if [ -z "$TOKEN" ]; then
  echo -e "${RED}No se proporcionó un token. No podemos continuar.${NC}"
  exit 1
fi

# Paso 2: Verificar el perfil con el token
echo -e "\n${BLUE}Paso 2: Verificando perfil con /api/auth/me...${NC}"
PROFILE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me")

# Verificar si obtenemos un JSON válido
if echo "$PROFILE" | grep -q "success"; then
  echo -e "${GREEN}✓ Perfil obtenido correctamente${NC}"
  
  # Extraer y mostrar los datos relevantes con jq si está disponible
  if command -v jq &> /dev/null; then
    echo -e "\n${BLUE}Datos básicos del perfil:${NC}"
    echo "$PROFILE" | jq '.client | {id, email, companyName, contactName, phone, website, industry, address, timezone, language}'
  else
    echo -e "\n${BLUE}Datos del perfil (JSON sin procesar):${NC}"
    echo "$PROFILE" | grep -v "password"
  fi
else
  echo -e "${RED}✗ Error al obtener el perfil${NC}"
  echo "$PROFILE"
fi

# Paso 3: Verificar la configuración completa del cliente
echo -e "\n${BLUE}Paso 3: Verificando configuración completa con /api/client...${NC}"
CLIENT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/client")

# Verificar si obtenemos un JSON válido
if echo "$CLIENT" | grep -q "success"; then
  echo -e "${GREEN}✓ Configuración completa obtenida correctamente${NC}"
  
  # Mostrar los datos relevantes
  if command -v jq &> /dev/null; then
    echo -e "\n${BLUE}Configuración del Bot:${NC}"
    echo "$CLIENT" | jq '.botConfig'
    
    echo -e "\n${BLUE}Configuración de Email:${NC}"
    echo "$CLIENT" | jq '.emailConfig | if .imapPassword then .imapPassword = "[REDACTADO]" else . end | if .smtpPassword then .smtpPassword = "[REDACTADO]" else . end'
  else
    echo -e "\n${BLUE}Datos de configuración (JSON sin procesar):${NC}"
    echo "$CLIENT" | grep -v "password"
  fi
else
  echo -e "${RED}✗ Error al obtener la configuración completa${NC}"
  echo "$CLIENT"
fi

echo -e "\n${BLUE}=== Verificación completada ===${NC}"
