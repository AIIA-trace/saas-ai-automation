# 📋 URLs HARDCODEADAS EN EL PROYECTO
**Fecha de análisis:** 3 de noviembre de 2025  
**URL actual:** `https://saas-ai-automation.onrender.com`  
**URL nueva:** `https://www.susanbot.com`

---

## 🔴 CRÍTICO - BACKEND (Archivos de Producción)

### 1. **backend/src/services/streamingTwiMLService.js** - LÍNEA 162
```javascript
const wsUrl = 'wss://saas-ai-automation.onrender.com/websocket/twilio-stream';
```
**ACCIÓN REQUERIDA:** Cambiar a `wss://www.susanbot.com/websocket/twilio-stream`  
**IMPACTO:** WebSocket para streaming de llamadas Twilio NO funcionará

---

### 2. **backend/src/websocket/websocketServer.js** - LÍNEA 98
```javascript
if (origin && origin.includes('saas-ai-automation.onrender.com')) {
```
**ACCIÓN REQUERIDA:** Cambiar a `www.susanbot.com`  
**IMPACTO:** Conexiones WebSocket serán rechazadas por CORS

---

### 3. **backend/src/services/emailService.js** - LÍNEA 471
```javascript
const resetUrl = `${process.env.FRONTEND_URL || 'https://saas-ai-automation.onrender.com'}/reset-password?token=${resetToken}`;
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** Enlaces de reset de contraseña NO funcionarán si falta variable de entorno

---

### 4. **backend/src/services/openaiTTSService.js** - LÍNEA 90
```javascript
const baseUrl = process.env.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** URLs de archivos de audio generados serán incorrectas

---

### 5. **backend/src/services/azureTTSService.js.backup** - LÍNEA 486
```javascript
const baseUrl = process.env.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** URLs de archivos de audio generados serán incorrectas (archivo backup)

---

### 6. **backend/src/server.js** - LÍNEA 188
```javascript
const host = process.env.NODE_ENV === 'production' ? process.env.RENDER_EXTERNAL_URL || 'https://saas-ai-automation.onrender.com' : `http://localhost:${PORT}`;
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** Logs del servidor mostrarán URL incorrecta

---

## 🟠 IMPORTANTE - FRONTEND (Archivos de Producción)

### 7. **frontend/js/api-config.js** - LÍNEA 12 ⭐ **MÁS IMPORTANTE**
```javascript
apiBaseUrl: 'https://saas-ai-automation.onrender.com',
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com`  
**IMPACTO:** TODAS las llamadas API del frontend fallarán

---

### 8. **frontend/js/api-unified.js** - LÍNEA 21
```javascript
baseUrl: window.location.hostname === 'localhost' 
  ? 'http://localhost:10000' 
  : 'https://saas-ai-automation.onrender.com',
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com`  
**IMPACTO:** Sistema de API unificado usará URL incorrecta

---

### 9. **frontend/js/token-unifier.js** - LÍNEAS 61, 100, 206, 252
```javascript
const baseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com` (4 ocurrencias)  
**IMPACTO:** Autenticación y generación de API keys fallarán si falta API_CONFIG

---

### 10. **frontend/js/email-utils.js** - LÍNEA 90
```javascript
const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** Descarga de adjuntos fallará

---

### 11. **frontend/js/email-compose.js** - LÍNEAS 333, 409, 504
```javascript
const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com` (3 ocurrencias)  
**IMPACTO:** Generación de contenido con IA y envío de emails fallará

---

### 12. **frontend/js/email-reply-handler.js** - LÍNEAS 176, 335
```javascript
const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com` (2 ocurrencias)  
**IMPACTO:** Generación de respuestas automáticas con IA fallará

---

### 13. **frontend/js/email-inbox-view.js** - LÍNEAS 568, 607, 737, 799, 918, 1188, 1449, 1608, 2063
```javascript
const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com` (9 ocurrencias)  
**IMPACTO:** Toda la funcionalidad de bandeja de entrada fallará

---

### 14. **frontend/js/config-verifier.js** - LÍNEA 28
```javascript
const apiBaseUrl = window.API_CONFIG?.apiBaseUrl || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** Verificación de configuración fallará

---

### 15. **frontend/js/twilio-number-system.js** - LÍNEAS 68, 112
```javascript
const baseUrl = window.API_CONFIG?.baseUrl || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com` (2 ocurrencias)  
**IMPACTO:** Compra y gestión de números Twilio fallará

---

## 🟡 CONFIGURACIÓN - Archivos de Ejemplo y Scripts

### 16. **backend/.env.example** - LÍNEAS 55, 62
```bash
FRONTEND_URL=https://saas-ai-automation.onrender.com
MICROSOFT_REDIRECT_URI=https://saas-ai-automation.onrender.com/api/email/oauth/outlook/callback
```
**ACCIÓN REQUERIDA:** Actualizar ejemplos a `https://www.susanbot.com`  
**IMPACTO:** Documentación incorrecta para nuevos desarrolladores

---

### 17. **backend/scripts/check-profile.sh** - LÍNEA 5
```bash
API_URL="https://saas-ai-automation.onrender.com"
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com`  
**IMPACTO:** Script de verificación de perfil no funcionará

---

### 18. **backend/get-qiromedia-credentials.js** - LÍNEA 29
```javascript
console.log('   URL: https://saas-ai-automation.onrender.com');
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com`  
**IMPACTO:** Mensaje informativo incorrecto

---

### 19. **backend/fix-twilio-webhook.js** - LÍNEA 22
```javascript
const correctWebhookUrl = 'https://saas-ai-automation.onrender.com/api/twilio/webhook';
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com/api/twilio/webhook`  
**IMPACTO:** Script de configuración de Twilio no funcionará

---

### 20. **backend/check-twilio-numbers.js** - LÍNEA 32
```javascript
const expectedBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://saas-ai-automation.onrender.com';
```
**ACCIÓN REQUERIDA:** Cambiar fallback a `https://www.susanbot.com`  
**IMPACTO:** Script de verificación de números Twilio mostrará URL incorrecta

---

### 21. **netlify.toml** - LÍNEA 7
```toml
to = "https://saas-ai-automation.onrender.com/api/:splat"
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com/api/:splat`  
**IMPACTO:** Redirects de Netlify no funcionarán (si se usa Netlify)

---

### 22. **debug-twilio-webhook.js** - LÍNEAS 37, 38, 39, 81
```javascript
console.log('📡 Webhook URL (Voice): https://saas-ai-automation.onrender.com/api/twilio/webhook');
console.log('🎙️ Audio Webhook URL: https://saas-ai-automation.onrender.com/api/twilio/webhook/audio');
console.log('🔌 WebSocket URL: wss://saas-ai-automation.onrender.com/websocket/twilio-stream');
console.log('   - Voice & Fax > Webhook: https://saas-ai-automation.onrender.com/api/twilio/webhook');
```
**ACCIÓN REQUERIDA:** Cambiar a `https://www.susanbot.com` (4 ocurrencias)  
**IMPACTO:** Script de debug mostrará URLs incorrectas

---

## 📊 RESUMEN POR PRIORIDAD

### 🔴 **CRÍTICO (7 archivos)** - Rompen funcionalidad core
1. `backend/src/services/streamingTwiMLService.js` - WebSocket Twilio
2. `backend/src/websocket/websocketServer.js` - CORS WebSocket
3. `backend/src/services/emailService.js` - Reset password
4. `backend/src/services/openaiTTSService.js` - Audio URLs
5. `backend/src/server.js` - Server host
6. `frontend/js/api-config.js` - ⭐ **MÁS IMPORTANTE**
7. `frontend/js/api-unified.js` - API helper

### 🟠 **IMPORTANTE (8 archivos)** - Rompen funcionalidad si falta API_CONFIG
1. `frontend/js/token-unifier.js` (4 ocurrencias)
2. `frontend/js/email-utils.js`
3. `frontend/js/email-compose.js` (3 ocurrencias)
4. `frontend/js/email-reply-handler.js` (2 ocurrencias)
5. `frontend/js/email-inbox-view.js` (9 ocurrencias)
6. `frontend/js/config-verifier.js`
7. `frontend/js/twilio-number-system.js` (2 ocurrencias)
8. `backend/src/services/azureTTSService.js.backup`

### 🟡 **CONFIGURACIÓN (7 archivos)** - Documentación y scripts
1. `backend/.env.example` (2 ocurrencias)
2. `backend/scripts/check-profile.sh`
3. `backend/get-qiromedia-credentials.js`
4. `backend/fix-twilio-webhook.js`
5. `backend/check-twilio-numbers.js`
6. `netlify.toml`
7. `debug-twilio-webhook.js` (4 ocurrencias)

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### **Paso 1: Actualizar Variables de Entorno en Render**
```bash
FRONTEND_URL=https://www.susanbot.com
BACKEND_URL=https://www.susanbot.com
BASE_URL=https://www.susanbot.com
TWILIO_WEBHOOK_BASE_URL=https://www.susanbot.com
MICROSOFT_REDIRECT_URI=https://www.susanbot.com/api/email/oauth/outlook/callback
```

### **Paso 2: Cambiar URLs en Código (22 archivos)**
Ejecutar script de reemplazo global:
```bash
find . -type f \( -name "*.js" -o -name "*.toml" -o -name "*.sh" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -name "test-*.js" \
  -not -name "test-*.html" \
  -exec sed -i '' 's|https://saas-ai-automation\.onrender\.com|https://www.susanbot.com|g' {} +

find . -type f \( -name "*.js" -o -name "*.toml" -o -name "*.sh" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -name "test-*.js" \
  -not -name "test-*.html" \
  -exec sed -i '' 's|wss://saas-ai-automation\.onrender\.com|wss://www.susanbot.com|g' {} +

find . -type f \( -name "*.js" -o -name "*.toml" -o -name "*.sh" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -name "test-*.js" \
  -not -name "test-*.html" \
  -exec sed -i '' 's|saas-ai-automation\.onrender\.com|www.susanbot.com|g' {} +
```

### **Paso 3: Actualizar OAuth Providers**
- **Google Cloud Console:** Redirect URIs
- **Microsoft Azure:** Redirect URIs
- **Twilio:** Webhook URLs

### **Paso 4: Configurar Dominio en Render**
1. Añadir dominio personalizado `www.susanbot.com`
2. Configurar DNS según instrucciones de Render
3. Esperar propagación DNS (hasta 48h)

---

## ⚠️ NOTAS IMPORTANTES

1. **API_CONFIG es tu salvavidas:** La mayoría de archivos frontend usan `window.API_CONFIG?.BASE_URL` como fallback. Si actualizas `api-config.js`, el 80% del frontend funcionará.

2. **Variables de entorno primero:** Actualiza las variables de entorno en Render ANTES de cambiar el código.

3. **WebSocket crítico:** El archivo `streamingTwiMLService.js` tiene la URL hardcodeada sin fallback. Este DEBE cambiarse manualmente.

4. **CORS WebSocket:** El archivo `websocketServer.js` valida el origin. Este DEBE cambiarse manualmente.

5. **Archivos .backup:** El archivo `azureTTSService.js.backup` es un backup, pero si lo usas, también necesita actualización.

---

## 📝 CHECKLIST FINAL

- [ ] Variables de entorno actualizadas en Render
- [ ] `frontend/js/api-config.js` actualizado
- [ ] `frontend/js/api-unified.js` actualizado
- [ ] `backend/src/services/streamingTwiMLService.js` actualizado
- [ ] `backend/src/websocket/websocketServer.js` actualizado
- [ ] Todos los fallbacks en archivos frontend actualizados (15 archivos)
- [ ] Todos los fallbacks en archivos backend actualizados (4 archivos)
- [ ] Scripts y configuración actualizados (7 archivos)
- [ ] Google OAuth redirect URIs actualizados
- [ ] Microsoft OAuth redirect URIs actualizados
- [ ] Twilio webhook URLs actualizados
- [ ] Dominio configurado en Render
- [ ] DNS configurado
- [ ] Pruebas completas realizadas

---

**TOTAL DE ARCHIVOS A MODIFICAR:** 22 archivos de producción  
**TOTAL DE OCURRENCIAS:** 43 URLs hardcodeadas

**Generado automáticamente el:** 3 de noviembre de 2025
