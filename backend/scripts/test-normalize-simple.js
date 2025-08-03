/**
 * Script simple para probar la normalización de campos
 */

// Función que normaliza nombres de campo (copia del backend)
function normalizeFieldNames(data) {
  const normalized = {};
  
  // Mapeo explícito de nombres de campo inconsistentes
  const fieldMappings = {
    // AI Config
    'maxTokens': 'max_tokens',
    'topP': 'top_p',
    'presencePenalty': 'presence_penalty',
    'frequencyPenalty': 'frequency_penalty',
    
    // DTMF Options
    'message': 'description',
    'key': 'digit',
    'dtmfKey': 'digit',
    
    // Files
    'url': 'file_url',
    'type': 'file_type',
    'size': 'file_size',
    'name': 'filename',
    'fileName': 'filename',
    'fileSize': 'file_size',
    'fileType': 'file_type',
    'fileUrl': 'file_url'
  };
  
  // Copiar todos los campos, normalizando los nombres si es necesario
  if (!data) return normalized;
  
  Object.keys(data).forEach(key => {
    const normalizedKey = fieldMappings[key] || key;
    normalized[normalizedKey] = data[key];
  });
  
  return normalized;
}

// Datos de ejemplo para probar
const testData = [
  // 1. Configuración AI (camelCase → snake_case)
  {
    modelo: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 256,     // debería ser max_tokens
    topP: 0.9,          // debería ser top_p
    presencePenalty: 0, // debería ser presence_penalty
    frequencyPenalty: 0 // debería ser frequency_penalty
  },
  
  // 2. DTMF (message → description)
  {
    digit: '1',
    message: 'Hablar con un operador', // debería ser description
    action: 'transfer'
  },
  
  // 3. Archivo de contexto (name/url/type/size → filename/file_url/file_type/file_size)
  {
    name: 'manual.pdf',     // debería ser filename
    url: 'https://...',     // debería ser file_url
    type: 'application/pdf', // debería ser file_type
    size: 1024000           // debería ser file_size
  }
];

// Prueba de normalización
console.log("=== PRUEBA DE NORMALIZACIÓN DE CAMPOS ===\n");

// Normalizar cada ejemplo
testData.forEach((data, index) => {
  console.log(`\n--- CASO ${index + 1} ---`);
  console.log("Original:", data);
  
  const normalized = normalizeFieldNames(data);
  console.log("Normalizado:", normalized);
  
  // Verificar si se normalizaron correctamente
  switch(index) {
    case 0: // AI Config
      if (normalized.max_tokens && !normalized.maxTokens &&
          normalized.top_p && !normalized.topP &&
          normalized.presence_penalty && !normalized.presencePenalty &&
          normalized.frequency_penalty && !normalized.frequencyPenalty) {
        console.log("✅ Normalización correcta para AI Config");
      } else {
        console.log("❌ Error en normalización para AI Config");
      }
      break;
      
    case 1: // DTMF
      if (normalized.description && !normalized.message) {
        console.log("✅ Normalización correcta para DTMF");
      } else {
        console.log("❌ Error en normalización para DTMF");
      }
      break;
      
    case 2: // Archivos
      if (normalized.filename && !normalized.name &&
          normalized.file_url && !normalized.url &&
          normalized.file_type && !normalized.type &&
          normalized.file_size && !normalized.size) {
        console.log("✅ Normalización correcta para Archivos");
      } else {
        console.log("❌ Error en normalización para Archivos");
      }
      break;
  }
});

console.log("\n=== PRUEBA DE NORMALIZACIÓN COMPLETA ===");

// Objeto completo para simular datos del frontend
const fullConfig = {
  aiConfig: {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 256,
    topP: 0.9
  },
  dtmfOptions: [
    {
      digit: "1",
      message: "Hablar con operador",
      action: "transfer"
    }
  ],
  contextFiles: [
    {
      name: "manual.pdf",
      url: "https://example.com/files/manual.pdf",
      type: "application/pdf",
      size: 1024000
    }
  ]
};

console.log("\nObjeto Completo Original:", JSON.stringify(fullConfig, null, 2));

// Función para normalizar un objeto completo recursivamente
function normalizeDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeDeep(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      const normalizedKey = fieldMappings[key] || key;
      result[normalizedKey] = normalizeDeep(value);
    });
    return result;
  }
  return obj;
}

// Normalizar el objeto completo
const fieldMappings = {
  'maxTokens': 'max_tokens',
  'topP': 'top_p',
  'presencePenalty': 'presence_penalty',
  'frequencyPenalty': 'frequency_penalty',
  'message': 'description',
  'key': 'digit',
  'dtmfKey': 'digit',
  'url': 'file_url',
  'type': 'file_type',
  'size': 'file_size',
  'name': 'filename'
};

const normalizedConfig = normalizeDeep(fullConfig);
console.log("\nObjeto Completo Normalizado:", JSON.stringify(normalizedConfig, null, 2));

// Verificación final
let allCorrect = true;

// Verificar AI Config
if (normalizedConfig.aiConfig.max_tokens && !normalizedConfig.aiConfig.maxTokens &&
    normalizedConfig.aiConfig.top_p && !normalizedConfig.aiConfig.topP) {
  console.log("\n✅ AI Config: Campos normalizados correctamente");
} else {
  console.log("\n❌ AI Config: Error en la normalización");
  allCorrect = false;
}

// Verificar DTMF
if (normalizedConfig.dtmfOptions[0].description && !normalizedConfig.dtmfOptions[0].message) {
  console.log("✅ DTMF Options: Campos normalizados correctamente");
} else {
  console.log("❌ DTMF Options: Error en la normalización");
  allCorrect = false;
}

// Verificar Archivos
if (normalizedConfig.contextFiles[0].filename && !normalizedConfig.contextFiles[0].name &&
    normalizedConfig.contextFiles[0].file_url && !normalizedConfig.contextFiles[0].url &&
    normalizedConfig.contextFiles[0].file_type && !normalizedConfig.contextFiles[0].type &&
    normalizedConfig.contextFiles[0].file_size && !normalizedConfig.contextFiles[0].size) {
  console.log("✅ Context Files: Campos normalizados correctamente");
} else {
  console.log("❌ Context Files: Error en la normalización");
  allCorrect = false;
}

if (allCorrect) {
  console.log("\n🎉 TODAS LAS NORMALIZACIONES FUNCIONAN CORRECTAMENTE");
} else {
  console.log("\n⚠️ HAY PROBLEMAS CON ALGUNAS NORMALIZACIONES");
}
