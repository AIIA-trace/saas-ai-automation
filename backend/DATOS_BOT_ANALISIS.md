# 📊 Análisis de Datos del Dashboard al Bot

## ✅ Datos que SÍ se están pasando al bot

### **Desde `clientConfig` (objeto completo del cliente):**

1. ✅ **`companyName`** - Nombre de la empresa
   - Usado en: Prompt del bot (línea 69)
   - Ejemplo: "Qiromedia"

2. ✅ **`companyDescription`** - Descripción de la empresa
   - Usado en: Prompt del bot (línea 70)
   - Ejemplo: "Qiromedia ofrece servicios de marketing digital..."

3. ✅ **`callConfig.greeting`** - Saludo personalizado
   - Usado en: `sendInitialGreeting` (línea 1007)
   - Ejemplo: "¡Hola! Has llamado a Qiromedia, ¿en qué puedo ayudarte?"

4. ✅ **`callConfig.voiceId`** - Voz configurada
   - Usado en: `sendInitialGreeting` (línea 1015)
   - Ejemplo: "isidora"

5. ✅ **`callConfig.language`** - Idioma configurado
   - Usado en: `sendInitialGreeting` (línea 1016)
   - Ejemplo: "es-ES"

6. ✅ **Memoria del llamante** (`callerMemory`)
   - Usado en: `initializeConnection` como contexto
   - Incluye: nombre, empresa, historial de llamadas previas

---

## ❌ Datos que NO se están pasando al bot

### **Datos de contacto:**

1. ❌ **`phone`** - Teléfono de contacto de la empresa
   - Disponible en BD: ✅ `+34647866624`
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede dar número de contacto si se lo piden

2. ❌ **`email`** - Email de contacto de la empresa
   - Disponible en BD: ✅ `javisanher99@gmail.com`
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede dar email de contacto

3. ❌ **`website`** - Sitio web de la empresa
   - Disponible en BD: ✅ `https://intacon.es`
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede dar URL del sitio web

4. ❌ **`address`** - Dirección física
   - Disponible en BD: ✅ `Calle Mayor 123, 28001 Madrid, España`
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede dar dirección física

### **Configuración de la empresa:**

5. ❌ **`businessHours`** - Horarios comerciales
   - Disponible en BD: ✅ (24/7 en Qiromedia)
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede informar horarios de atención

6. ❌ **`faqs`** - Preguntas frecuentes
   - Disponible en BD: ✅ (4 FAQs configuradas)
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no tiene respuestas predefinidas a preguntas comunes

7. ❌ **`companyInfo`** - Información adicional de la empresa
   - Disponible en BD: ✅ (sector, servicios, empleados, etc.)
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no tiene contexto completo de la empresa

8. ❌ **`contextFiles`** - Archivos de contexto
   - Disponible en BD: ✅ (si se suben)
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no puede acceder a documentos/catálogos

### **Mensajes personalizados:**

9. ❌ **`confirmationMessage`** - Mensaje de confirmación
   - Disponible en BD: ✅ "Perfecto, he registrado tu consulta..."
   - Usado en bot: ❌ NO
   - **Impacto**: Bot no usa mensaje personalizado al finalizar

10. ❌ **`contactName`** - Nombre del contacto principal
    - Disponible en BD: ✅ "Admin"
    - Usado en bot: ❌ NO
    - **Impacto**: Bot no puede mencionar persona de contacto

11. ❌ **`position`** - Cargo del contacto
    - Disponible en BD: ✅ "Director General"
    - Usado en bot: ❌ NO
    - **Impacto**: Bot no puede mencionar cargo de contacto

---

## 🔧 Recomendaciones de Implementación

### **PRIORIDAD ALTA** (Datos críticos que el bot debería tener):

1. **FAQs** - Respuestas predefinidas a preguntas frecuentes
2. **businessHours** - Horarios de atención
3. **phone** - Teléfono de contacto
4. **email** - Email de contacto
5. **companyInfo.services** - Servicios que ofrece la empresa

### **PRIORIDAD MEDIA** (Datos útiles):

6. **website** - Sitio web
7. **address** - Dirección física
8. **confirmationMessage** - Mensaje personalizado de cierre
9. **companyInfo** completo - Información detallada

### **PRIORIDAD BAJA** (Datos opcionales):

10. **contextFiles** - Archivos de contexto (requiere procesamiento)
11. **contactName** y **position** - Datos del contacto principal

---

## 📝 Ejemplo de Prompt Mejorado

```javascript
const customSystemMessage = `Eres Susan, una asistente telefónica de ${companyName}.

📋 INFORMACIÓN DE LA EMPRESA:
- Nombre: ${companyName}
- Descripción: ${companyDescription}
- Servicios: ${companyInfo?.services?.join(', ') || 'consultoría'}
- Teléfono: ${phone || 'no disponible'}
- Email: ${email || 'no disponible'}
- Web: ${website || 'no disponible'}
- Dirección: ${address || 'no disponible'}

⏰ HORARIOS:
${businessHours ? formatBusinessHours(businessHours) : 'Horario de oficina estándar'}

❓ PREGUNTAS FRECUENTES:
${faqs?.map(faq => `- ${faq.question}: ${faq.answer}`).join('\n') || 'No hay FAQs configuradas'}

[... resto del prompt ...]
`;
```

---

## 🎯 Conclusión

**Actualmente el bot solo recibe 2 datos del dashboard:**
- ✅ Nombre de la empresa
- ✅ Descripción de la empresa

**Faltan ~11 campos importantes** que están en el dashboard pero no llegan al bot.

**Solución**: Modificar `openaiRealtimeService.js` líneas 69-73 para incluir todos los datos relevantes del `clientConfig`.
