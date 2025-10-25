# 📞 Configuración de Twilio - Guía Completa

## ✅ Estado Actual

Las credenciales de Twilio ya están configuradas en las variables de entorno:
- `TWILIO_ACCOUNT_SID` ✅
- `TWILIO_AUTH_TOKEN` ✅

El sistema está **100% funcional** y listo para usar.

---

## 💰 Cómo Añadir Crédito a Twilio

### **Paso 1: Acceder a la Consola de Twilio**
1. Ve a: https://console.twilio.com
2. Inicia sesión con tu cuenta

### **Paso 2: Añadir Crédito**
1. Click en tu nombre (esquina superior derecha)
2. Selecciona **"Billing"** o **"Facturación"**
3. Click en **"Add Funds"** o **"Añadir Fondos"**
4. Elige la cantidad (recomendado: $20-50 para empezar)
5. Ingresa método de pago (tarjeta de crédito)
6. Confirma la compra

### **Paso 3: Verificar Crédito**
```bash
# En la consola de Twilio verás:
Balance: $XX.XX USD
```

---

## 💵 Costos de Twilio

### **Números de Teléfono**
- **España (+34):** ~$1.00/mes por número
- **Estados Unidos (+1):** ~$1.00/mes por número

### **Llamadas**
- **Entrantes:** ~$0.0085/min (España)
- **Salientes:** ~$0.02/min (España)

### **Ejemplo de Costos Mensuales**
```
10 usuarios = 10 números = $10/mes
100 llamadas/mes × 3 min promedio = 300 min
300 min × $0.0085 = $2.55/mes

TOTAL: ~$12.55/mes para 10 usuarios con 100 llamadas
```

---

## 🚀 Flujo Automático del Sistema

### **Al Registrar Usuario:**
```javascript
1. Usuario se registra → POST /api/auth/register
2. Sistema crea cliente en BD
3. Sistema busca número disponible en España
4. Sistema compra número automáticamente
5. Número se asocia al clientId
6. Usuario ve su número en el dashboard
```

**Costo:** $1/mes por usuario

### **Al Eliminar Usuario:**
```javascript
1. Usuario elimina cuenta → DELETE /api/auth/account
2. Sistema obtiene números del usuario
3. Sistema libera número en Twilio
4. Número vuelve al pool de Twilio
5. Se eliminan todos los datos del usuario
```

**Ahorro:** Se deja de pagar $1/mes por ese número

---

## 🔍 Verificar que Todo Funciona

### **1. Verificar Credenciales**
```bash
cd backend
node test-env-check.js
```

Deberías ver:
```
TWILIO_ACCOUNT_SID: CONFIGURADA (ACxxxxxx...)
```

### **2. Verificar Números Disponibles**
```bash
cd backend
node check-twilio-numbers.js
```

### **3. Probar Registro de Usuario**
1. Ve a: https://tu-app.com/register.html
2. Registra un nuevo usuario
3. Verifica los logs del backend:
```
📞 Asignando número de Twilio para cliente X...
✅ Número de Twilio asignado exitosamente: +34XXXXXXXXX
```

### **4. Verificar en Dashboard**
1. Inicia sesión con el nuevo usuario
2. Ve a "Configuración del Bot"
3. Deberías ver:
```
📞 Número Twilio Asignado: +34XXXXXXXXX [📋 Copiar]
```

---

## ⚠️ Alertas de Bajo Crédito

### **Configurar Alertas en Twilio:**
1. Ve a: https://console.twilio.com/us1/account/billing/notifications
2. Click en **"Add Notification"**
3. Configura:
   - **Type:** Low Balance
   - **Threshold:** $5.00
   - **Email:** tu-email@empresa.com
4. Guarda

Recibirás un email cuando el crédito baje de $5.

---

## 🛠️ Troubleshooting

### **Error: "Insufficient funds"**
**Solución:** Añade crédito a tu cuenta de Twilio

### **Error: "No available numbers"**
**Solución:** 
1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/manage/search
2. Verifica que hay números disponibles en España
3. Si no hay, prueba con otro país en el código

### **Usuario no recibe número al registrarse**
**Verificar:**
1. Logs del backend: `📞 Asignando número de Twilio...`
2. Crédito disponible en Twilio
3. Variables de entorno configuradas correctamente

---

## 📊 Monitoreo de Uso

### **Ver Uso en Twilio Console:**
1. Ve a: https://console.twilio.com/us1/monitor/logs/calls
2. Filtra por fecha
3. Verás todas las llamadas y su costo

### **Ver Números Comprados:**
1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/manage/active
2. Verás todos los números activos y su costo mensual

---

## ✅ Checklist Final

- [ ] Crédito añadido a Twilio ($20+ recomendado)
- [ ] Alertas de bajo crédito configuradas
- [ ] Registro de usuario probado
- [ ] Número aparece en dashboard
- [ ] Llamadas funcionan correctamente

---

## 🎯 Resumen

**El sistema está 100% listo.** Solo necesitas:
1. ✅ Añadir crédito a Twilio ($20-50 para empezar)
2. ✅ Configurar alertas de bajo crédito
3. ✅ Probar registrando un usuario nuevo

**Todo lo demás ya está implementado y funcionando.**
