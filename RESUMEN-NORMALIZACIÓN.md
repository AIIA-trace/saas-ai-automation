# Resumen de Normalización de Campos

## Cambios Realizados

### 1. Backend (api.js)
- ✅ Implementada función `normalizeFieldNames()` para garantizar que todos los datos recibidos del frontend se normalicen a snake_case
- ✅ Corregido uso de `description` en lugar de `message` para opciones DTMF
- ✅ Asegurada respuesta con nombres de campo en formato snake_case

### 2. Frontend (dashboard-simple-clean.js)
- ✅ Actualizado código para usar `filename` en lugar de `name`
- ✅ Actualizado código para usar `file_size` en lugar de `size`
- ✅ Corregido FormData para subir archivos usando `filename` y `file_size`
- ✅ Asegurado el uso de `max_tokens`, `top_p`, etc. en configuración AI

### 3. Solución Completa
- ✅ Creado script `field-normalizer.js` que se carga antes de cualquier otro script y asegura:
  - Normaliza nombres de campo en todas las solicitudes al backend
  - Proporciona compatibilidad para ambos formatos durante la transición
- ✅ Integrado en `dashboard.html` para cargar antes que otros scripts

### 4. Documentación
- ✅ Creado documento `CAMPO-NOMENCLATURA.md` con reglas claras y ejemplos
- ✅ Creado script SQL `official-field-names.sql` como referencia definitiva de nombres

### 5. Verificación
- ✅ Creado script `test-field-normalization.js` para probar la correcta normalización
- ✅ SQL existente para verificar consistencia en la base de datos

## Cómo Probar

### Prueba 1: Frontend → Backend
1. Inicia sesión en el dashboard
2. Abre la consola del navegador
3. Modifica valores de configuración del bot
4. Guarda los cambios
5. En la consola deberías ver los datos normalizados en formato snake_case
6. Verificar que la respuesta del servidor también usa snake_case

### Prueba 2: Script de Verificación
```bash
# En el directorio backend
node scripts/test-field-normalization.js
```
Esto iniciará un servidor de prueba en http://localhost:3001 donde podrás:
- POST /test-normalization: Enviar datos y verificar normalización
- GET /verify-db-fields: Verificar estructura de la base de datos

### Prueba 3: SQL de Verificación
```bash
# Modificar el email en la consulta antes de ejecutar
psql -d nombre_base_datos -f backend/scripts/official-field-names.sql
```

## Nomenclatura Oficial

### BotAiConfig
- `client_id`
- `model`
- `temperature`
- `max_tokens` (NO maxTokens)
- `top_p` (NO topP)
- `presence_penalty` (NO presencePenalty)
- `frequency_penalty` (NO frequencyPenalty)

### BotDtmfOption
- `client_id`
- `digit` (NO key)
- `description` (NO message)
- `action`

### BotContextFile
- `client_id`
- `filename` (NO name)
- `file_url` (NO url)
- `file_type` (NO type)
- `file_size` (NO size)
- `processed`

### BotFAQ
- `client_id`
- `question`
- `answer`
