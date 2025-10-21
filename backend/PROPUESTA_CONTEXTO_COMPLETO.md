# 🎯 Propuesta: Contexto Completo para el Bot

## 📊 Estado Actual

### ✅ Archivos de Contexto en el Sistema

**Base de Datos:**
- ✅ Campo `contextFiles` existe en tabla `Client` (tipo JSONB)
- ✅ Se devuelve en GET `/api/client`
- ✅ Se puede guardar en PUT `/api/client`

**Frontend:**
- ✅ Dashboard tiene sección para subir archivos
- ✅ Se guardan como JSON: `[{ name, content, type, size }]`

**Backend:**
- ❌ **NO se pasan al bot** en `openaiRealtimeService.js`
- ❌ Bot no tiene acceso a documentos subidos

---

## 🔧 Propuesta de Implementación

### **Opción 1: Contexto Completo en Prompt (Recomendado)**

**Ventajas:**
- ✅ Implementación simple
- ✅ Funciona inmediatamente
- ✅ No requiere APIs externas

**Limitaciones:**
- ⚠️ Límite de tokens del prompt (~128k tokens)
- ⚠️ Solo texto (no PDFs/imágenes sin procesar)

**Estructura del Prompt Mejorado:**

```javascript
const customSystemMessage = `Eres Susan, asistente de ${companyName}.

📋 INFORMACIÓN DE LA EMPRESA:
- Nombre: ${companyName}
- Descripción: ${companyDescription}
- Sector: ${companyInfo?.sector || 'N/A'}
- Servicios: ${companyInfo?.services?.join(', ') || 'N/A'}

📞 DATOS DE CONTACTO:
- Teléfono: ${phone || 'No disponible'}
- Email: ${email || 'No disponible'}
- Web: ${website || 'No disponible'}
- Dirección: ${address || 'No disponible'}

⏰ HORARIOS DE ATENCIÓN:
${formatBusinessHours(businessHours)}

❓ PREGUNTAS FRECUENTES:
${formatFAQs(faqs)}

📁 DOCUMENTOS Y CONTEXTO ADICIONAL:
${formatContextFiles(contextFiles)}

[... resto del prompt ...]
`;
```

**Funciones Helper:**

```javascript
function formatBusinessHours(businessHours) {
  if (!businessHours || !businessHours.enabled) {
    return 'Horario de oficina estándar (9:00 - 18:00, lunes a viernes)';
  }
  
  const days = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  
  const workingDays = Object.entries(businessHours.workingDays || {})
    .filter(([_, isWorking]) => isWorking)
    .map(([day, _]) => days[day])
    .join(', ');
  
  return `${workingDays}: ${businessHours.openingTime} - ${businessHours.closingTime}`;
}

function formatFAQs(faqs) {
  if (!faqs || faqs.length === 0) {
    return 'No hay preguntas frecuentes configuradas.';
  }
  
  return faqs.map((faq, index) => 
    `${index + 1}. ${faq.question}\n   Respuesta: ${faq.answer}`
  ).join('\n\n');
}

function formatContextFiles(contextFiles) {
  if (!contextFiles || contextFiles.length === 0) {
    return 'No hay documentos adicionales disponibles.';
  }
  
  return contextFiles.map((file, index) => {
    // Si el archivo tiene contenido de texto
    if (file.content && typeof file.content === 'string') {
      return `${index + 1}. ${file.name}:\n${file.content.substring(0, 2000)}...`;
    }
    // Si solo tiene metadata
    return `${index + 1}. ${file.name} (${file.type}, ${file.size} bytes)`;
  }).join('\n\n');
}
```

---

### **Opción 2: RAG con Vector Database (Avanzado)**

**Para archivos grandes o muchos documentos:**

1. **Procesar archivos** al subirlos:
   - Extraer texto de PDFs/DOCX
   - Dividir en chunks
   - Generar embeddings
   - Guardar en Pinecone/Weaviate

2. **Durante la llamada**:
   - Buscar chunks relevantes según pregunta
   - Inyectar solo contexto relevante

**Ventajas:**
- ✅ Soporta documentos grandes
- ✅ Búsqueda semántica
- ✅ Escalable

**Desventajas:**
- ❌ Requiere API externa (Pinecone, OpenAI Embeddings)
- ❌ Más complejo de implementar
- ❌ Costos adicionales

---

## 📝 Implementación Recomendada (Opción 1)

### **Paso 1: Modificar `openaiRealtimeService.js`**

```javascript
// Línea 47-73 (función initializeConnection)

async initializeConnection(streamSid, clientConfig = {}, callerMemoryContext = '') {
  // ... código existente ...
  
  // Extraer TODOS los datos del cliente
  const companyName = clientConfig.companyName || 'la empresa';
  const companyDescription = clientConfig.companyDescription || '';
  const phone = clientConfig.phone || null;
  const email = clientConfig.email || null;
  const website = clientConfig.website || null;
  const address = clientConfig.address || null;
  const businessHours = clientConfig.businessHours || null;
  const faqs = clientConfig.faqs || [];
  const contextFiles = clientConfig.contextFiles || [];
  const companyInfo = clientConfig.companyInfo || {};
  
  // Construir secciones del prompt
  const contactInfo = `
📞 DATOS DE CONTACTO:
${phone ? `- Teléfono: ${phone}` : ''}
${email ? `- Email: ${email}` : ''}
${website ? `- Web: ${website}` : ''}
${address ? `- Dirección: ${address}` : ''}
`.trim();

  const hoursInfo = businessHours ? `
⏰ HORARIOS DE ATENCIÓN:
${formatBusinessHours(businessHours)}
` : '';

  const faqsInfo = faqs.length > 0 ? `
❓ PREGUNTAS FRECUENTES:
${formatFAQs(faqs)}
` : '';

  const filesInfo = contextFiles.length > 0 ? `
📁 INFORMACIÓN ADICIONAL:
${formatContextFiles(contextFiles)}
` : '';
  
  const customSystemMessage = `Eres Susan, una asistente telefónica de ${companyName}.
${companyDescription ? `La empresa se dedica a: ${companyDescription}.` : ''}

${contactInfo}

${hoursInfo}

${faqsInfo}

${filesInfo}

🎭 TU PAPEL:
[... resto del prompt actual ...]
`;
  
  // ... resto del código ...
}
```

### **Paso 2: Agregar funciones helper**

```javascript
// Al inicio del archivo openaiRealtimeService.js

function formatBusinessHours(businessHours) {
  // ... implementación ...
}

function formatFAQs(faqs) {
  // ... implementación ...
}

function formatContextFiles(contextFiles) {
  // ... implementación ...
}
```

---

## 🎯 Resultado Esperado

### **Antes:**
```
Cliente: "¿Cuál es vuestro horario?"
Bot: "Mmm, eso no lo sé. Tomo nota y el equipo te contactará."
```

### **Después:**
```
Cliente: "¿Cuál es vuestro horario?"
Bot: "Claro, estamos disponibles 24/7, todos los días de la semana."
```

### **Con FAQs:**
```
Cliente: "¿Cuánto cuesta vuestro servicio de marketing?"
Bot: "Nuestros servicios de marketing digital empiezan desde 500€/mes, 
     incluyendo gestión de redes sociales y análisis de datos."
```

### **Con Archivos de Contexto:**
```
Cliente: "¿Qué servicios ofrecéis exactamente?"
Bot: "Ofrecemos marketing digital, análisis de datos, y ayuda con la 
     digitalización de empresas e industrias 4.0. También tenemos 
     servicios de consultoría estratégica y desarrollo web."
```

---

## ⚠️ Consideraciones

### **Límites de Tokens:**
- Prompt actual: ~3,000 tokens
- Con todos los datos: ~5,000-10,000 tokens
- Límite OpenAI: 128,000 tokens
- **Conclusión**: Espacio suficiente ✅

### **Archivos Grandes:**
- Si un archivo tiene >50,000 caracteres, truncar a primeros 2,000
- Priorizar FAQs y datos estructurados sobre texto libre

### **Formato de `contextFiles`:**
```json
[
  {
    "name": "Catálogo de Servicios.txt",
    "content": "Marketing digital: ...\nAnálisis de datos: ...",
    "type": "text/plain",
    "size": 1024
  },
  {
    "name": "Precios 2025.txt",
    "content": "Plan Básico: 500€\nPlan Pro: 1000€",
    "type": "text/plain",
    "size": 512
  }
]
```

---

## 🚀 ¿Implementamos?

**Tiempo estimado:** 30-45 minutos

**Pasos:**
1. ✅ Agregar funciones helper (10 min)
2. ✅ Modificar `initializeConnection` (15 min)
3. ✅ Testing con datos reales (15 min)
4. ✅ Deploy y verificación (5 min)

**Beneficio inmediato:**
- Bot responderá preguntas sobre horarios
- Bot dará teléfono/email de contacto
- Bot usará FAQs configuradas
- Bot tendrá acceso a documentos subidos
