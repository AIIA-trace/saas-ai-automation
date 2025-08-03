# Estándar de Nomenclatura de Campos

## Regla Principal: SIEMPRE usar snake_case

Para garantizar la consistencia entre todos los componentes del sistema (base de datos, backend y frontend), se ha establecido el siguiente estándar de nomenclatura:

- **Todos los campos deben usar `snake_case` (palabras en minúscula separadas por guiones bajos)**
- No se permiten nombres en camelCase, PascalCase o kebab-case en ninguna capa del sistema
- Los nombres de campo deben coincidir EXACTAMENTE con los nombres en la base de datos

## Nombres Oficiales por Tabla

### BotAiConfig
- `client_id`: ID del cliente
- `model`: Modelo de IA a utilizar
- `temperature`: Temperatura para generación de texto
- `max_tokens`: Número máximo de tokens (NO usar maxTokens)
- `top_p`: Valor de top_p (NO usar topP)
- `presence_penalty`: Penalización por presencia (NO usar presencePenalty)
- `frequency_penalty`: Penalización por frecuencia (NO usar frequencyPenalty)

### BotDtmfOption
- `client_id`: ID del cliente
- `digit`: El dígito que activa la opción (NO usar key o dtmf_key)
- `description`: Descripción de la opción (NO usar message)
- `action`: Acción a realizar

### BotContextFile
- `client_id`: ID del cliente
- `filename`: Nombre del archivo
- `file_url`: URL del archivo (NO usar url)
- `file_type`: Tipo MIME del archivo (NO usar type)
- `file_size`: Tamaño en bytes (NO usar size)
- `processed`: Flag de procesamiento

### BotFAQ
- `client_id`: ID del cliente
- `question`: Pregunta
- `answer`: Respuesta

## Buenas Prácticas

1. **Backend**: La función `normalizeFieldNames()` está disponible para convertir campos del frontend a snake_case.
2. **Frontend**: Todos los campos enviados y recibidos deben seguir esta nomenclatura.
3. **Linting**: Configurar linters para asegurar el cumplimiento de esta norma.
4. **Revisiones de Código**: Verificar la nomenclatura en cada PR.

## Script de Verificación

Para verificar la consistencia de los campos, ejecutar:
```bash
psql -d nombre_base_datos -f backend/scripts/verify-bot-config-consistency.sql
```

## Evitar Nombres Prohibidos

Estos nombres de campo están EXPLÍCITAMENTE PROHIBIDOS:
- ❌ `maxTokens` → ✅ `max_tokens`
- ❌ `topP` → ✅ `top_p`
- ❌ `presencePenalty` → ✅ `presence_penalty`
- ❌ `frequencyPenalty` → ✅ `frequency_penalty`
- ❌ `url` → ✅ `file_url`
- ❌ `type` → ✅ `file_type`
- ❌ `size` → ✅ `file_size`
- ❌ `message` → ✅ `description` (para DTMF)
- ❌ `key` → ✅ `digit` (para DTMF)
