/**
 * Script simplificado para verificar la correcta normalización de campos
 * entre frontend y backend
 */

// Este script no requiere conexión a base de datos para la prueba básica
const express = require('express');
const app = express();
const port = 3001;

// Middleware para parsear JSON
app.use(express.json());

console.log('✅ Iniciando script de prueba de normalización de campos...');


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

// Endpoint para pruebas de normalización
app.post('/test-normalization', (req, res) => {
  console.log('Datos recibidos del frontend:', req.body);
  
  // Normalizar los datos como lo haría el backend
  const normalized = normalizeFieldNames(req.body);
  console.log('Datos normalizados:', normalized);
  
  // Verificar que todos los campos tengan el formato correcto
  const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
  const invalidFields = Object.keys(normalized).filter(field => !snakeCasePattern.test(field));
  
  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Algunos campos no están en formato snake_case',
      invalidFields
    });
  }
  
  // Simular inserción en base de datos verificando campos
  const requiredAiConfigFields = ['model', 'temperature', 'max_tokens', 'top_p', 'presence_penalty', 'frequency_penalty'];
  const requiredDtmfFields = ['digit', 'description', 'action'];
  const requiredFileFields = ['filename', 'file_url', 'file_type', 'file_size'];
  
  const missingAiFields = requiredAiConfigFields.filter(field => normalized.aiConfig && !normalized.aiConfig[field]);
  const missingDtmfFields = requiredDtmfFields.filter(field => 
    normalized.dtmfOptions && normalized.dtmfOptions.length > 0 && 
    normalized.dtmfOptions.some(option => !option[field])
  );
  const missingFileFields = requiredFileFields.filter(field => 
    normalized.contextFiles && normalized.contextFiles.length > 0 && 
    normalized.contextFiles.some(file => !file[field])
  );
  
  // Verificar si hay campos faltantes
  if (missingAiFields.length > 0 || missingDtmfFields.length > 0 || missingFileFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos obligatorios para alguna configuración',
      missingFields: {
        aiConfig: missingAiFields,
        dtmfOptions: missingDtmfFields,
        contextFiles: missingFileFields
      }
    });
  }
  
  // Todo correcto
  return res.json({
    success: true,
    message: 'Todos los campos están correctamente normalizados',
    normalizedData: normalized
  });
});

// Prueba directa con datos de ejemplo (sin acceso a base de datos)
app.get('/test-examples', (req, res) => {
  // Datos de ejemplo para probar la normalización
  const exampleData = [
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
  
  // Normalizar cada ejemplo
  const normalized = exampleData.map(item => normalizeFieldNames(item));
  
  // Verificar si todos los campos se normalizaron correctamente
  const validations = [
    // Verificar AI Config
    normalized[0].hasOwnProperty('max_tokens') && !normalized[0].hasOwnProperty('maxTokens'),
    normalized[0].hasOwnProperty('top_p') && !normalized[0].hasOwnProperty('topP'),
    normalized[0].hasOwnProperty('presence_penalty') && !normalized[0].hasOwnProperty('presencePenalty'),
    normalized[0].hasOwnProperty('frequency_penalty') && !normalized[0].hasOwnProperty('frequencyPenalty'),
    
    // Verificar DTMF
    normalized[1].hasOwnProperty('description') && !normalized[1].hasOwnProperty('message'),
    
    // Verificar Archivo
    normalized[2].hasOwnProperty('filename') && !normalized[2].hasOwnProperty('name'),
    normalized[2].hasOwnProperty('file_url') && !normalized[2].hasOwnProperty('url'),
    normalized[2].hasOwnProperty('file_type') && !normalized[2].hasOwnProperty('type'),
    normalized[2].hasOwnProperty('file_size') && !normalized[2].hasOwnProperty('size')
  ];
  
  // Comprobar si todas las validaciones pasaron
  const allValid = validations.every(v => v === true);
  
  res.json({
    success: allValid,
    message: allValid ? 'Todas las normalizaciones funcionan correctamente' : 'Hay problemas con algunas normalizaciones',
    original: exampleData,
    normalized: normalized,
    validations: validations
  });
});

// Ruta raíz con instrucciones
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Prueba de Normalización de Campos</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c3e50; }
          pre { background: #f8f9fa; padding: 10px; border-radius: 4px; }
          .endpoint { margin-bottom: 20px; padding: 15px; border-left: 4px solid #3498db; background: #ecf0f1; }
          button { background: #3498db; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Prueba de Normalización de Campos</h1>
        <p>Este servidor permite verificar la correcta normalización de campos entre frontend y backend.</p>
        
        <div class="endpoint">
          <h2>Prueba 1: Normalización Manual</h2>
          <p>POST /test-normalization</p>
          <p>Envía un JSON con campos inconsistentes y observa cómo se normalizan.</p>
          <pre>{
  "maxTokens": 256,
  "topP": 0.9,
  "presencePenalty": 0,
  "frequencyPenalty": 0
}</pre>
          <button onclick="testNormalization()">Probar normalización</button>
        </div>
        
        <div class="endpoint">
          <h2>Prueba 2: Ejemplos Predefinidos</h2>
          <p>GET /test-examples</p>
          <p>Verifica la normalización con ejemplos predefinidos.</p>
          <button onclick="window.location='/test-examples'">Ver ejemplos</button>
        </div>
        
        <script>
          async function testNormalization() {
            try {
              const response = await fetch('/test-normalization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  maxTokens: 256,
                  topP: 0.9,
                  presencePenalty: 0,
                  frequencyPenalty: 0,
                  dtmfOptions: [{
                    digit: '1',
                    message: 'Hablar con operador',
                    action: 'transfer'
                  }],
                  contextFiles: [{
                    name: 'manual.pdf',
                    url: 'https://...',
                    type: 'application/pdf',
                    size: 1024000
                  }]
                })
              });
              const result = await response.json();
              alert('Resultado: ' + JSON.stringify(result, null, 2));
            } catch (error) {
              alert('Error: ' + error);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log('\n✅ Servidor de prueba iniciado correctamente');
  console.log(`→ Abre http://localhost:${port} en tu navegador`);
  console.log('\nEndpoints disponibles:');
  console.log('• GET / - Página principal con instrucciones');
  console.log('• POST /test-normalization - Prueba la normalización de campos');
  console.log('• GET /test-examples - Prueba ejemplos predefinidos');
  console.log('\nPresiona Ctrl+C para detener el servidor');
});
