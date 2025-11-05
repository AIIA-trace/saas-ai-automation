# 🚀 MIGRACIÓN DE URLs - CHECKLIST COMPLETO

**Fecha:** 5 de noviembre de 2025  
**URL Actual:** `https://saas-ai-automation.onrender.com`  
**URL Nueva:** `[PENDIENTE DE CONFIRMAR]`

---

## ✅ FASE 1: PREPARACIÓN (ANTES DE TOCAR NADA)

### 1.1 Verificar Dominio en IONOS
- [ ] Acceder a https://www.ionos.es/
- [ ] Iniciar sesión
- [ ] Ir a "Dominios"
- [ ] Confirmar dominio exacto: ________________
- [ ] Verificar que está activo y pagado
- [ ] Anotar fecha de expiración: ________________

### 1.2 Decidir Estructura de URLs
- [ ] **Frontend:** ________________ (ej: `app.aiiatrace.com` o `www.aiiatrace.com`)
- [ ] **Backend API:** ________________ (ej: `api.aiiatrace.com`)
- [ ] **WebSocket:** ________________ (ej: `wss://api.aiiatrace.com`)

### 1.3 Backup Completo
- [ ] Hacer commit de todo el código actual
- [ ] Crear tag en Git: `v1.0-pre-migration`
- [ ] Exportar base de datos PostgreSQL
- [ ] Guardar variables de entorno actuales

---

## ✅ FASE 2: CONFIGURACIÓN DE DOMINIO EN IONOS

### 2.1 Configurar DNS para Backend (API)
En IONOS → Tu dominio → DNS Settings:

**Opción A: Usar CNAME (Recomendado)**
```
Tipo: CNAME
Nombre: api
Valor: saas-ai-automation.onrender.com
TTL: 3600
```

**Opción B: Usar A Record**
```
Tipo: A
Nombre: api
Valor: [IP de Render - obtener de Render Dashboard]
TTL: 3600
```

- [ ] Añadir registro DNS
- [ ] Esperar propagación (15-60 minutos)
- [ ] Verificar con: `nslookup api.tudominio.com`

### 2.2 Configurar DNS para Frontend
```
Tipo: CNAME
Nombre: app (o www)
Valor: saas-ai-automation.onrender.com
TTL: 3600
```

- [ ] Añadir registro DNS
- [ ] Esperar propagación
- [ ] Verificar con: `nslookup app.tudominio.com`

---

## ✅ FASE 3: CONFIGURACIÓN EN RENDER

### 3.1 Backend - Añadir Dominio Personalizado
1. [ ] Ir a Render Dashboard → Tu servicio backend
2. [ ] Settings → Custom Domains
3. [ ] Click "Add Custom Domain"
4. [ ] Introducir: `api.tudominio.com`
5. [ ] Render te dará instrucciones DNS (ya hechas en Fase 2)
6. [ ] Esperar verificación SSL (automático, 5-10 min)
7. [ ] Verificar que aparece ✅ verde

### 3.2 Frontend - Añadir Dominio Personalizado
1. [ ] Ir a Render Dashboard → Tu servicio frontend
2. [ ] Settings → Custom Domains
3. [ ] Click "Add Custom Domain"
4. [ ] Introducir: `app.tudominio.com` (o `www.tudominio.com`)
5. [ ] Esperar verificación SSL
6. [ ] Verificar que aparece ✅ verde

---

## ✅ FASE 4: ACTUALIZAR VARIABLES DE ENTORNO

### 4.1 Backend - Variables en Render
Ir a Render → Backend Service → Environment:

```bash
# URLs Frontend
FRONTEND_URL=https://app.tudominio.com
DASHBOARD_URL=https://app.tudominio.com/dashboard

# URLs Backend
BACKEND_URL=https://api.tudominio.com
BASE_URL=https://api.tudominio.com

# OAuth Redirects
GOOGLE_REDIRECT_URI=https://api.tudominio.com/api/email/oauth/google/callback
MICROSOFT_REDIRECT_URI=https://api.tudominio.com/api/email/oauth/outlook/callback

# Twilio Webhooks
TWILIO_WEBHOOK_URL=https://api.tudominio.com/api/twilio/webhook
TWILIO_STATUS_CALLBACK_URL=https://api.tudominio.com/api/twilio/status

# WebSocket
WEBSOCKET_URL=wss://api.tudominio.com/websocket/twilio-stream
```

- [ ] Actualizar todas las variables
- [ ] Guardar cambios
- [ ] **NO HACER DEPLOY TODAVÍA**

### 4.2 Frontend - Verificar que no hay .env
El frontend NO debe tener variables de entorno hardcodeadas.
- [ ] Verificar que no existe `frontend/.env`
- [ ] Todo se configura en `js/api-config.js`

---

## ✅ FASE 5: ACTUALIZAR CÓDIGO - BACKEND

### 5.1 Archivos con URLs Hardcodeadas

**Archivo:** `backend/src/services/streamingTwiMLService.js` - Línea 162
```javascript
// ANTES:
const wsUrl = 'wss://saas-ai-automation.onrender.com/websocket/twilio-stream';

// DESPUÉS:
const wsUrl = process.env.WEBSOCKET_URL || 'wss://api.tudominio.com/websocket/twilio-stream';
```
- [ ] Actualizado

**Archivo:** `backend/src/websocket/websocketServer.js` - Línea 98
```javascript
// ANTES:
if (origin && origin.includes('saas-ai-automation.onrender.com')) {

// DESPUÉS:
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://app.tudominio.com',
  'https://api.tudominio.com'
];
if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
```
- [ ] Actualizado

**Archivo:** `backend/src/services/openaiTTSService.js` - Línea 90
```javascript
// ANTES:
const baseUrl = process.env.BASE_URL || 'https://saas-ai-automation.onrender.com';

// DESPUÉS:
const baseUrl = process.env.BASE_URL || 'https://api.tudominio.com';
```
- [ ] Actualizado

**Archivo:** `backend/src/services/emailService.js` - Línea 471
```javascript
// ANTES:
const resetUrl = `${process.env.FRONTEND_URL || 'https://saas-ai-automation.onrender.com'}/reset-password?token=${resetToken}`;

// DESPUÉS:
const resetUrl = `${process.env.FRONTEND_URL || 'https://app.tudominio.com'}/reset-password?token=${resetToken}`;
```
- [ ] Actualizado

**Archivo:** `backend/src/server.js` - Línea 188
```javascript
// ANTES:
const host = process.env.NODE_ENV === 'production' ? process.env.RENDER_EXTERNAL_URL || 'https://saas-ai-automation.onrender.com' : `http://localhost:${PORT}`;

// DESPUÉS:
const host = process.env.NODE_ENV === 'production' ? process.env.BACKEND_URL || 'https://api.tudominio.com' : `http://localhost:${PORT}`;
```
- [ ] Actualizado

---

## ✅ FASE 6: ACTUALIZAR CÓDIGO - FRONTEND

### 6.1 Archivo Principal de Configuración

**Archivo:** `frontend/js/api-config.js` - Línea 12
```javascript
// ANTES:
apiBaseUrl: 'https://saas-ai-automation.onrender.com',

// DESPUÉS:
apiBaseUrl: 'https://api.tudominio.com',
```
- [ ] Actualizado

### 6.2 Archivos con Fallbacks Hardcodeados

Buscar y reemplazar en TODOS los archivos frontend:
```javascript
// PATRÓN A BUSCAR:
|| 'https://saas-ai-automation.onrender.com'

// REEMPLAZAR POR:
|| 'https://api.tudominio.com'
```

**Archivos afectados:**
- [ ] `frontend/js/email-utils.js` (línea 90)
- [ ] `frontend/js/email-compose.js` (líneas 333, 409, 504)
- [ ] `frontend/js/token-unifier.js` (líneas 61, 100, 206, 252)
- [ ] `frontend/js/email-reply-handler.js` (líneas 176, 335)
- [ ] `frontend/js/config-verifier.js` (línea 28)
- [ ] `frontend/js/api-unified.js` (línea 21)
- [ ] `frontend/js/email-inbox-view.js` (líneas 583, 622, 752, 828, 947, 1217, 1478, 1642, 2098, 2613)

---

## ✅ FASE 7: ACTUALIZAR SERVICIOS EXTERNOS

### 7.1 Google Cloud Console - OAuth
1. [ ] Ir a https://console.cloud.google.com/
2. [ ] APIs & Services → Credentials
3. [ ] Seleccionar tu OAuth 2.0 Client ID
4. [ ] **Authorized JavaScript origins:**
   - [ ] Añadir: `https://app.tudominio.com`
   - [ ] Eliminar (después): `https://saas-ai-automation.onrender.com`
5. [ ] **Authorized redirect URIs:**
   - [ ] Añadir: `https://api.tudominio.com/api/email/oauth/google/callback`
   - [ ] Eliminar (después): `https://saas-ai-automation.onrender.com/api/email/oauth/google/callback`
6. [ ] Guardar cambios
7. [ ] **IMPORTANTE:** Puede tardar 5-10 minutos en propagarse

### 7.2 Microsoft Azure - Graph API
1. [ ] Ir a https://portal.azure.com/
2. [ ] Azure Active Directory → App registrations
3. [ ] Seleccionar tu aplicación
4. [ ] Authentication → Platform configurations → Web
5. [ ] **Redirect URIs:**
   - [ ] Añadir: `https://api.tudominio.com/api/email/oauth/outlook/callback`
   - [ ] Eliminar (después): `https://saas-ai-automation.onrender.com/api/email/oauth/outlook/callback`
6. [ ] Guardar cambios

### 7.3 Twilio - Webhooks
1. [ ] Ir a https://console.twilio.com/
2. [ ] Phone Numbers → Manage → Active numbers
3. [ ] Para cada número configurado:
   - [ ] **Voice Configuration:**
     - [ ] A CALL COMES IN: `https://api.tudominio.com/api/twilio/webhook`
     - [ ] METHOD: POST
   - [ ] **Messaging Configuration (si aplica):**
     - [ ] A MESSAGE COMES IN: `https://api.tudominio.com/api/twilio/sms`
     - [ ] METHOD: POST
4. [ ] Guardar cambios para cada número

### 7.4 OpenAI - Verificar (No requiere cambios)
OpenAI no requiere configuración de URLs específicas.
- [ ] Verificado

---

## ✅ FASE 8: TESTING PRE-DEPLOY

### 8.1 Verificación de Código
- [ ] Buscar en TODO el proyecto: `saas-ai-automation.onrender.com`
- [ ] Buscar en TODO el proyecto: `onrender.com`
- [ ] Verificar que NO quedan URLs hardcodeadas
- [ ] Commit de todos los cambios: `git commit -m "feat: Migrar a dominio personalizado"`

### 8.2 Verificación de DNS
```bash
# Verificar que los dominios resuelven
nslookup api.tudominio.com
nslookup app.tudominio.com

# Verificar SSL
curl -I https://api.tudominio.com
curl -I https://app.tudominio.com
```
- [ ] DNS propagado correctamente
- [ ] SSL activo en ambos dominios

---

## ✅ FASE 9: DEPLOY

### 9.1 Deploy Backend
1. [ ] Ir a Render → Backend Service
2. [ ] Verificar que variables de entorno están actualizadas
3. [ ] Manual Deploy → Deploy latest commit
4. [ ] Esperar a que termine (5-10 min)
5. [ ] Verificar logs: No errores
6. [ ] Probar endpoint: `curl https://api.tudominio.com/health`

### 9.2 Deploy Frontend
1. [ ] Ir a Render → Frontend Service
2. [ ] Manual Deploy → Deploy latest commit
3. [ ] Esperar a que termine (3-5 min)
4. [ ] Verificar logs: No errores
5. [ ] Abrir en navegador: `https://app.tudominio.com`

---

## ✅ FASE 10: TESTING POST-DEPLOY

### 10.1 Test de Autenticación
- [ ] Registro de nuevo usuario
- [ ] Login con usuario existente
- [ ] Logout
- [ ] Reset password (verificar email con nueva URL)

### 10.2 Test de OAuth
- [ ] Conectar cuenta Google
- [ ] Desconectar cuenta Google
- [ ] Conectar cuenta Microsoft
- [ ] Desconectar cuenta Microsoft

### 10.3 Test de Emails
- [ ] Ver bandeja de entrada
- [ ] Leer email
- [ ] Responder email
- [ ] Enviar nuevo email
- [ ] Descargar adjunto
- [ ] Preview adjunto

### 10.4 Test de Llamadas (Si aplica)
- [ ] Recibir llamada en número Twilio
- [ ] Verificar que webhook funciona
- [ ] Verificar que WebSocket conecta
- [ ] Verificar transcripción en tiempo real

### 10.5 Test de IA
- [ ] Generar respuesta con IA
- [ ] Reescribir contenido
- [ ] Verificar que OpenAI responde

---

## ✅ FASE 11: LIMPIEZA

### 11.1 Eliminar URLs Antiguas de OAuth
- [ ] Google Cloud Console: Eliminar redirect URIs antiguos
- [ ] Microsoft Azure: Eliminar redirect URIs antiguos

### 11.2 Actualizar Documentación
- [ ] README.md con nuevas URLs
- [ ] Documentación de API
- [ ] Guías de usuario

### 11.3 Notificar a Usuarios (Si aplica)
- [ ] Email a usuarios existentes con nueva URL
- [ ] Actualizar enlaces en redes sociales
- [ ] Actualizar firma de email

---

## 🚨 PLAN DE ROLLBACK (Si algo falla)

### Si algo sale mal:
1. **NO ENTRAR EN PÁNICO**
2. Ir a Render → Backend/Frontend → Environment
3. Restaurar variables de entorno antiguas:
   ```
   FRONTEND_URL=https://saas-ai-automation.onrender.com
   BACKEND_URL=https://saas-ai-automation.onrender.com
   ```
4. Hacer rollback del código: `git revert HEAD`
5. Deploy de la versión anterior
6. Restaurar OAuth redirects en Google/Microsoft

---

## 📞 CONTACTOS DE EMERGENCIA

- **Render Support:** https://render.com/support
- **IONOS Support:** https://www.ionos.es/ayuda
- **Google Cloud Support:** https://support.google.com/cloud
- **Microsoft Azure Support:** https://azure.microsoft.com/support
- **Twilio Support:** https://support.twilio.com/

---

## ✅ CHECKLIST FINAL

Antes de dar por terminada la migración:
- [ ] Todas las URLs actualizadas
- [ ] DNS propagado
- [ ] SSL activo
- [ ] OAuth funcionando (Google + Microsoft)
- [ ] Twilio webhooks funcionando
- [ ] Emails enviando/recibiendo
- [ ] Adjuntos funcionando
- [ ] IA respondiendo
- [ ] No hay errores en logs
- [ ] Usuarios pueden acceder sin problemas

**MIGRACIÓN COMPLETADA:** ___/___/2025 a las ___:___

---

**NOTAS IMPORTANTES:**
- La propagación DNS puede tardar hasta 48h en algunos casos
- Mantener las URLs antiguas activas 7 días por si acaso
- Monitorizar logs durante las primeras 24-48h
- Tener plan de rollback listo
