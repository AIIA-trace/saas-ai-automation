# 🚀 Plan: Pre-Inicialización de OpenAI Realtime

## 📊 Problema Actual

### **Flujo Actual (CON latencia):**
```
1. Cliente llama → Twilio webhook /api/twilio/webhook
2. Backend devuelve TwiML inmediatamente (< 100ms)
3. Twilio conecta WebSocket
4. handleStart() se ejecuta
5. getClientForStream() carga datos de BD (200-500ms)
6. initializeConnection() crea sesión OpenAI (500-1000ms)
7. sendInitialGreeting() envía saludo
8. Bot habla (DESPUÉS de 1-2 segundos)
```

**Resultado:** Cliente escucha **1-2 segundos de silencio** antes del saludo.

---

## ✅ Solución Propuesta: Pre-Inicialización

### **Flujo Mejorado (SIN latencia):**
```
1. Cliente llama → Twilio webhook /api/twilio/webhook
2. Backend ESPERA 3-4 segundos (tonos de llamada)
   - Durante este tiempo:
     a. Busca cliente en BD
     b. Carga contexto (FAQs, horarios, memoria)
     c. Crea sesión OpenAI Realtime
     d. Genera URL de WebSocket con token
3. Backend devuelve TwiML con URL pre-inicializada
4. Twilio conecta WebSocket (ya existe la sesión)
5. Bot habla INMEDIATAMENTE (< 200ms)
```

**Resultado:** Cliente escucha el saludo **inmediatamente** después de contestar.

---

## 🔧 Implementación

### **Paso 1: Modificar `/api/twilio/webhook`**

**Archivo:** `backend/src/routes/twilio.js` (línea 172)

```javascript
router.post('/webhook', async (req, res) => {
    try {
        const { To: twilioNumber, From: callerNumber, CallSid } = req.body;
        
        logger.info(`📞 LLAMADA RECIBIDA: ${callerNumber} → ${twilioNumber} (${CallSid})`);
        
        // 🎯 PRE-INICIALIZACIÓN: Preparar contexto ANTES de contestar
        const startTime = Date.now();
        
        // 1. Identificar cliente por número Twilio
        const twilioNumberRecord = await prisma.twilioNumber.findFirst({
            where: {
                phoneNumber: twilioNumber,
                status: 'active'
            },
            include: {
                client: true
            }
        });
        
        if (!twilioNumberRecord) {
            logger.error(`❌ Número Twilio no encontrado: ${twilioNumber}`);
            return res.status(404).send(`
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>Lo siento, este número no está configurado.</Say>
                </Response>
            `);
        }
        
        const client = twilioNumberRecord.client;
        logger.info(`✅ Cliente identificado: ${client.companyName} (ID: ${client.id})`);
        
        // 2. Pre-cargar memoria del llamante (si existe)
        const callerMemoryService = require('../services/callerMemoryService');
        let callerMemory = null;
        try {
            callerMemory = await callerMemoryService.getOrCreateCallerMemory(
                client.id,
                callerNumber
            );
            logger.info(`🧠 Memoria del llamante pre-cargada: ${callerMemory.callCount} llamadas`);
        } catch (error) {
            logger.warn(`⚠️ No se pudo cargar memoria: ${error.message}`);
        }
        
        // 3. Pre-inicializar sesión OpenAI Realtime
        const openaiRealtimeService = require('../services/openaiRealtimeService');
        const memoryContext = callerMemory ? 
            callerMemoryService.getMemoryContext(callerMemory) : '';
        
        const clientConfig = {
            companyName: client.companyName,
            companyDescription: client.companyDescription,
            phone: client.phone,
            email: client.email,
            website: client.website,
            address: client.address,
            businessHours: client.businessHours,
            faqs: client.faqs,
            contextFiles: client.contextFiles,
            companyInfo: client.companyInfo
        };
        
        // Crear sesión OpenAI ANTES de contestar
        const sessionId = `pre_${CallSid}`;
        await openaiRealtimeService.initializeConnection(
            sessionId,
            clientConfig,
            memoryContext
        );
        
        logger.info(`✅ Sesión OpenAI pre-inicializada: ${sessionId}`);
        
        // 4. Calcular tiempo de espera para tonos
        const elapsedTime = Date.now() - startTime;
        const targetDelay = 3000; // 3 segundos de tonos
        const remainingDelay = Math.max(0, targetDelay - elapsedTime);
        
        if (remainingDelay > 0) {
            logger.info(`⏳ Esperando ${remainingDelay}ms para tonos...`);
            await new Promise(resolve => setTimeout(resolve, remainingDelay));
        }
        
        logger.info(`🎵 Pre-inicialización completada en ${Date.now() - startTime}ms`);
        
        // 5. Generar TwiML con sesión pre-inicializada
        const twimlResponse = await twilioService.handleIncomingCall(
            callerNumber,
            twilioNumber,
            CallSid,
            { preInitializedSession: sessionId } // Pasar ID de sesión
        );
        
        // 6. Devolver TwiML
        res.set('Content-Type', 'text/xml');
        res.send(twimlResponse);
        
    } catch (error) {
        logger.error(`❌ Error en webhook Twilio: ${error.message}`, error);
        
        // Respuesta de fallback
        res.set('Content-Type', 'text/xml');
        res.send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>Lo siento, hay un problema técnico. Inténtalo más tarde.</Say>
            </Response>
        `);
    }
});
```

---

### **Paso 2: Modificar `twilioStreamHandler.js`**

**Problema:** Actualmente crea una nueva sesión en `handleStart()`

**Solución:** Reutilizar sesión pre-inicializada

```javascript
// En handleStart() (línea ~487)
handleStart(ws, data) {
    const streamSid = data.start?.streamSid;
    const callSid = data.start?.callSid;
    
    // ... código existente ...
    
    // 🎯 VERIFICAR SI HAY SESIÓN PRE-INICIALIZADA
    const preInitSessionId = `pre_${callSid}`;
    const hasPreInitSession = this.openaiRealtimeService.hasConnection(preInitSessionId);
    
    if (hasPreInitSession) {
        logger.info(`✅ [${streamSid}] Reutilizando sesión pre-inicializada: ${preInitSessionId}`);
        
        // Transferir sesión al streamSid real
        this.openaiRealtimeService.transferConnection(preInitSessionId, streamSid);
        
        // Enviar saludo INMEDIATAMENTE (sesión ya lista)
        this.sendInitialGreeting(ws, { streamSid, callSid });
    } else {
        logger.warn(`⚠️ [${streamSid}] No hay sesión pre-inicializada, creando nueva...`);
        
        // Flujo normal (fallback)
        this.getClientForStream(streamSid, callSid, clientId).then(async () => {
            // ... código existente ...
        });
    }
}
```

---

### **Paso 3: Agregar métodos a `openaiRealtimeService.js`**

```javascript
/**
 * Verificar si existe una conexión
 */
hasConnection(streamSid) {
    return this.activeConnections.has(streamSid);
}

/**
 * Transferir conexión de un ID a otro
 */
transferConnection(fromId, toId) {
    const connectionData = this.activeConnections.get(fromId);
    if (!connectionData) {
        throw new Error(`No connection found for ${fromId}`);
    }
    
    // Mover conexión al nuevo ID
    this.activeConnections.set(toId, connectionData);
    this.activeConnections.delete(fromId);
    
    logger.info(`🔄 Conexión transferida: ${fromId} → ${toId}`);
}
```

---

## ⚠️ Consideraciones

### **1. Timeout de Twilio**
- Twilio espera respuesta TwiML en **10 segundos**
- Nuestra pre-inicialización debe completar en **< 5 segundos**
- Si tarda más → Fallback a flujo normal

### **2. Sesiones Huérfanas**
- Si el cliente cuelga antes de contestar → Sesión pre-inicializada queda abierta
- **Solución:** Timeout de 30 segundos para limpiar sesiones no usadas

```javascript
// En openaiRealtimeService.js
setTimeout(() => {
    if (this.activeConnections.has(sessionId)) {
        const connectionData = this.activeConnections.get(sessionId);
        if (!connectionData.used) {
            logger.warn(`🧹 Limpiando sesión no usada: ${sessionId}`);
            this.closeConnection(sessionId);
        }
    }
}, 30000); // 30 segundos
```

### **3. Costo de OpenAI**
- Cada sesión pre-inicializada consume tokens
- Si el cliente no contesta → Tokens desperdiciados
- **Mitigación:** Solo pre-inicializar si `callCount > 0` (clientes conocidos)

---

## 📊 Beneficios

### **Antes:**
```
Cliente: *llama*
[Silencio 1-2 segundos]
Bot: "¡Hola! Has llamado a Qiromedia..."
```

### **Después:**
```
Cliente: *llama*
[Tonos 3 segundos]
Bot: "¡Hola! Has llamado a Qiromedia..." [INMEDIATO]
```

---

## 🎯 Alternativa Más Simple

Si la implementación completa es muy compleja, podemos hacer una **versión simplificada**:

### **Solo agregar delay de 2-3 segundos:**

```javascript
router.post('/webhook', async (req, res) => {
    // ... identificar cliente ...
    
    // Esperar 2-3 segundos para que suenen tonos
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Devolver TwiML
    const twimlResponse = await twilioService.handleIncomingCall(...);
    res.send(twimlResponse);
});
```

**Beneficio:** Cliente escucha tonos en lugar de silencio  
**Desventaja:** NO elimina la latencia de inicialización

---

## 🚀 Recomendación

**Implementar en 2 fases:**

1. **Fase 1 (Simple):** Agregar delay de 2-3 segundos → Mejora UX inmediata
2. **Fase 2 (Completa):** Pre-inicialización completa → Elimina latencia total

¿Empezamos con Fase 1 o vamos directo a Fase 2?
