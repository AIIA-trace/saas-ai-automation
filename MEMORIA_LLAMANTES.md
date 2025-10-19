# 🧠 Sistema de Memoria de Llamantes

## 📋 Descripción

El sistema ahora **recuerda información de llamadas anteriores** del mismo cliente y la utiliza para personalizar futuras conversaciones.

## ✅ Funcionalidades Implementadas

### 1. **Almacenamiento de Memoria**
- ✅ Base de datos con tabla `CallerMemory`
- ✅ Guarda información por `clientId` + `callerPhone`
- ✅ Expira automáticamente después de 7 días
- ✅ Se actualiza en cada llamada

### 2. **Información Guardada**
- **Datos básicos**: Nombre, empresa, teléfono
- **Contador de llamadas**: Cuántas veces ha llamado
- **Fecha de última llamada**
- **Historial de conversaciones**: Últimas 10 conversaciones con:
  - Fecha y duración
  - Resumen de la conversación
  - Temas tratados
  - Transcripción completa
- **Notas adicionales**: Información relevante del cliente

### 3. **Integración con OpenAI Realtime**
- ✅ El contexto de memoria se incluye en las instrucciones del sistema
- ✅ OpenAI recibe el historial completo al inicio de cada llamada
- ✅ El bot puede reconocer clientes recurrentes
- ✅ Personaliza la conversación basándose en llamadas anteriores

## 🔄 Flujo de Funcionamiento

### Al Inicio de la Llamada:

1. **Identificación del llamante**:
   ```
   Número detectado: +34647866624
   ```

2. **Búsqueda/Creación de memoria**:
   ```javascript
   const memory = await callerMemoryService.getOrCreateCallerMemory(
     clientId,
     callerPhone
   );
   ```

3. **Generación de contexto**:
   ```javascript
   const memoryContext = callerMemoryService.getMemoryContext(memory);
   ```

4. **Envío a OpenAI**:
   ```javascript
   await openaiRealtimeService.initializeConnection(
     streamSid,
     clientConfig,
     memoryContext  // ← Contexto de memoria incluido
   );
   ```

### Durante la Llamada:

El bot tiene acceso a:
- Nombre y empresa del llamante (si ya llamó antes)
- Número de llamadas previas
- Resumen de conversaciones anteriores
- Temas tratados previamente

### Al Finalizar la Llamada:

1. **Actualización de información**:
   ```javascript
   await callerMemoryService.updateCallerInfo(memoryId, {
     callerName: 'Carlos García',
     callerCompany: 'Qirodata'
   });
   ```

2. **Guardado del historial**:
   ```javascript
   await callerMemoryService.addConversationToHistory(memoryId, {
     summary: 'Consulta sobre servicios',
     topics: ['Transformación Digital', 'Precios'],
     duration: 180,
     fullTranscript: '...'
   });
   ```

## 📝 Ejemplo de Contexto Generado

```
📋 INFORMACIÓN DEL CLIENTE QUE LLAMA:
- Nombre: Carlos García
- Empresa: Qirodata Solutions
- Ha llamado 3 veces anteriormente
- Última llamada: 17/10/2025

📞 HISTORIAL DE CONVERSACIONES PREVIAS:

1. Llamada del 14/10/2025 (180s):
Cliente: Hola, soy Carlos de Qirodata. Estamos interesados en servicios de transformación digital.
Asistente: Perfecto, Carlos. Te cuento sobre nuestros servicios...
Temas: Transformación Digital, Consultoría IT

2. Llamada del 17/10/2025 (120s):
Cliente: Hola, llamo para hacer seguimiento de la propuesta.
Asistente: Claro, Carlos. Tomo nota y el equipo te contactará.
Temas: Propuesta, Precios

📝 NOTAS: Cliente potencial importante - interesado en transformación digital

⚠️ IMPORTANTE: Reconoce al cliente si ya ha llamado antes y usa esta información para personalizar la conversación.
```

## 🎯 Comportamiento del Bot

### Primera Llamada:
```
Cliente: "Hola, soy Carlos de Qirodata"
Bot: "Hola, Carlos. ¿En qué puedo ayudarte?"
```

### Segunda Llamada (con memoria):
```
Cliente: "Hola, soy Carlos de Qirodata otra vez"
Bot: "Hola de nuevo, Carlos. ¿En qué puedo ayudarte?"
```

### Tercera Llamada (reconocimiento implícito):
```
Cliente: "Hola, soy Carlos"
Bot: "Hola, Carlos. ¿Cómo va todo con Qirodata?"
```

## 🛠️ Scripts de Utilidad

### Ver memoria almacenada:
```bash
node backend/scripts/checkCallerMemory.js
```

### Probar generación de contexto:
```bash
node backend/scripts/testMemoryContext.js
```

### Limpiar memorias expiradas:
```bash
node backend/scripts/cleanupMemories.js
```

## 🔧 Archivos Modificados

1. **`/backend/src/services/openaiRealtimeService.js`**
   - Añadido parámetro `callerMemoryContext` en `initializeConnection()`
   - Contexto incluido en instrucciones del sistema

2. **`/backend/src/websocket/twilioStreamHandler.js`**
   - Obtención de contexto de memoria antes de inicializar OpenAI
   - Tres puntos de integración:
     - `initializeOpenAIRealtimeConnection()`
     - `sendInitialGreeting()`
     - `sendExtendedGreeting()`

3. **`/backend/src/services/callerMemoryService.js`**
   - Ya existía (sin cambios)
   - Métodos disponibles:
     - `getOrCreateCallerMemory()`
     - `updateCallerInfo()`
     - `addConversationToHistory()`
     - `getMemoryContext()`

## 📊 Base de Datos

### Tabla: `CallerMemory`
```prisma
model CallerMemory {
  id                  Int      @id @default(autoincrement())
  clientId            Int
  callerPhone         String
  callerName          String?
  callerCompany       String?
  lastCallDate        DateTime @default(now())
  callCount           Int      @default(1)
  conversationHistory Json?
  notes               String?
  expiresAt           DateTime
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([clientId, callerPhone])
  @@index([clientId])
  @@index([callerPhone])
  @@index([expiresAt])
  @@index([lastCallDate])
}
```

## 🚀 Próximos Pasos

### Mejoras Sugeridas:

1. **Análisis de sentimiento**: Guardar el tono/sentimiento de cada llamada
2. **Priorización**: Marcar clientes VIP basándose en frecuencia de llamadas
3. **Recordatorios**: Sistema de follow-up automático
4. **Exportación**: Generar reportes de historial de clientes
5. **Integración CRM**: Sincronizar con sistemas externos

## ⚠️ Consideraciones

- **Privacidad**: Las memorias expiran automáticamente después de 7 días
- **GDPR**: Implementar opción de borrado bajo solicitud
- **Rendimiento**: El contexto se carga solo una vez al inicio de la llamada
- **Límites**: Se guardan solo las últimas 10 conversaciones por cliente

## 🧪 Testing

Para probar el sistema:

1. **Hacer una primera llamada** desde un número
2. **Verificar que se guardó la memoria**:
   ```bash
   node backend/scripts/checkCallerMemory.js
   ```
3. **Hacer una segunda llamada** desde el mismo número
4. **Verificar en los logs** que se carga el contexto:
   ```
   🧠 [streamSid] Contexto de memoria obtenido: XXX caracteres
   ```
5. **Observar** que el bot reconoce al cliente

## 📞 Logs Relevantes

```
🧠 [streamSid] Obteniendo memoria para +34647866624
✅ [streamSid] Memoria cargada: 3 llamadas previas
🧠 [streamSid] Contexto de memoria obtenido: 450 caracteres
🧠 [streamSid] Contexto de memoria incluido en instrucciones (450 chars)
```

---

**Estado**: ✅ Implementado y listo para producción
**Fecha**: 19/10/2025
**Versión**: 1.0
