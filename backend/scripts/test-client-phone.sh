#!/bin/bash

# Colores para mejor visualización
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TEST DE CAMPO PHONE EN API /api/client ===${NC}"

# Obtener un token de autenticación
EMAIL="admin@example.com"  # Modifica esto con un email existente
PASSWORD="Admin123!"       # Modifica esto con una contraseña existente

echo -e "\n${YELLOW}Paso 1: Obteniendo token de autenticación...${NC}"
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Verificar si la autenticación fue exitosa
if echo "$AUTH_RESPONSE" | grep -q "\"token\""; then
  TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo -e "${GREEN}✓ Autenticación exitosa${NC}"
else
  echo -e "${RED}✗ Error de autenticación: $(echo "$AUTH_RESPONSE" | grep -o '"error":"[^"]*' | sed 's/"error":"//')${NC}"
  echo "Respuesta completa: $AUTH_RESPONSE"
  exit 1
fi

echo -e "\n${YELLOW}Paso 2: Consultando datos del cliente...${NC}"
CLIENT_RESPONSE=$(curl -s -X GET http://localhost:3000/api/client \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Verificar si la respuesta contiene datos del cliente
if echo "$CLIENT_RESPONSE" | grep -q "\"success\":true"; then
  echo -e "${GREEN}✓ Datos del cliente obtenidos correctamente${NC}"
  
  # Extraer y mostrar el teléfono
  PHONE=$(echo "$CLIENT_RESPONSE" | grep -o '"phone":"[^"]*' | sed 's/"phone":"//')
  
  echo -e "\n${BLUE}=== RESULTADO ===${NC}"
  if [ -z "$PHONE" ]; then
    echo -e "${RED}✗ El campo 'phone' no aparece en la respuesta o está vacío${NC}"
    
    # Mostrar estructura de datos para diagnóstico
    echo -e "\n${YELLOW}Estructura de datos devuelta:${NC}"
    echo "$CLIENT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CLIENT_RESPONSE"
  else
    echo -e "${GREEN}✓ Campo phone encontrado:${NC} $PHONE"
    
    # Mostrar otros campos relevantes para comparación
    echo -e "\n${YELLOW}Datos relevantes:${NC}"
    echo -e "📞 ${BLUE}Teléfono:${NC} $PHONE"
    COMPANY_NAME=$(echo "$CLIENT_RESPONSE" | grep -o '"companyName":"[^"]*' | sed 's/"companyName":"//')
    echo -e "🏢 ${BLUE}Empresa:${NC} $COMPANY_NAME"
    EMAIL=$(echo "$CLIENT_RESPONSE" | grep -o '"email":"[^"]*' | sed 's/"email":"//')
    echo -e "📧 ${BLUE}Email:${NC} $EMAIL"
  fi
else
  echo -e "${RED}✗ Error al obtener datos: $(echo "$CLIENT_RESPONSE" | grep -o '"error":"[^"]*' | sed 's/"error":"//')${NC}"
  echo "Respuesta completa: $CLIENT_RESPONSE"
  exit 1
fi

# Verificar también en el endpoint /client (sin /api/) para comparar
echo -e "\n${YELLOW}Paso 3: Verificando endpoint /client para comparación...${NC}"
CLIENT_DIRECT_RESPONSE=$(curl -s -X GET http://localhost:3000/client \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Extraer teléfono del endpoint directo si existe
if echo "$CLIENT_DIRECT_RESPONSE" | grep -q "\"success\":true"; then
  DIRECT_PHONE=$(echo "$CLIENT_DIRECT_RESPONSE" | grep -o '"phone":"[^"]*' | sed 's/"phone":"//')
  
  echo -e "\n${BLUE}=== COMPARACIÓN CON ENDPOINT /client ===${NC}"
  if [ -z "$DIRECT_PHONE" ]; then
    echo -e "${RED}✗ El campo 'phone' no aparece en el endpoint /client${NC}"
  else
    echo -e "${GREEN}✓ Campo phone en /client:${NC} $DIRECT_PHONE"
    
    # Verificar si los valores coinciden
    if [ "$PHONE" = "$DIRECT_PHONE" ]; then
      echo -e "${GREEN}✓ Los valores de phone coinciden en ambos endpoints${NC}"
    else
      echo -e "${RED}✗ ¡Inconsistencia! Los valores de phone son diferentes${NC}"
      echo -e "  - En /api/client: $PHONE"
      echo -e "  - En /client: $DIRECT_PHONE"
    fi
  fi
fi

echo -e "\n${BLUE}=== FIN DEL TEST ===${NC}"
