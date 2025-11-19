// Cargar variables de entorno PRIMERO
const azureTTSRestService = require('./services/azureTTSRestService');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const WebSocketServer = require('./websocket/websocketServer');

// Rutas importadas
const { router: authRouter } = require('./routes/auth');
const apiRouter = require('./routes/api');
const webhooksRouter = require('./routes/webhooks');
const testVoicesRouter = require('./routes/test-voices');
const setupRouter = require('./routes/setup');
const twilioRouter = require('./routes/twilio');
const azureTTSRouter = require('./routes/azure-tts');
const testAudioRouter = require('./routes/testAudio');
const emailRouter = require('./routes/email');

// Inicializar servicios
console.log(' Inicializando servicios...');
const fallbackAudioService = require('./services/fallbackAudioService');
azureTTSRestService.initialize();
fallbackAudioService.initialize();

// CRÍTICO: Pre-calentar Azure TTS para evitar cuelgues en llamadas reales
console.log(' Iniciando warmup de Azure TTS...');
azureTTSRestService.warmup().then(success => {
  if (success) {
    console.log(' Azure TTS warmup completado - Listo para llamadas');
  } else {
    console.error(' Azure TTS warmup falló - Llamadas pueden tener problemas');
  }
}).catch(error => {
  console.error(' Error durante Azure TTS warmup:', error.message);
});

console.log(' Servicios inicializados');

// Inicialización de Express
const app = express();
const PORT = process.env.PORT || 10000; // Render usa PORT internamente

// Crear directorios necesarios
const logsDir = path.join(__dirname, '../logs');
const publicDir = path.join(__dirname, '../public');
const audioDir = path.join(publicDir, 'audio');

// Crear directorios si no existen
[logsDir, publicDir, audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Directorio creado: ${dir}`);
  }
});

// Middleware
// IMPORTANTE: Stripe webhooks necesitan raw body ANTES de JSON parsing
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Resto de rutas usan JSON parsing normal
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuración de seguridad básica (personalizada para permitir JavaScript inline)
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false
  })
);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// Servir archivos estáticos
app.use(express.static(publicDir));

// Servir archivos del frontend
const frontendDir = path.join(__dirname, '../../frontend');
app.use(express.static(frontendDir));
logger.info(`Sirviendo frontend desde: ${frontendDir}`);

// Rutas principales
app.use('/api/auth', authRouter);
app.use('/api/setup', setupRouter);
app.use('/api/test-voices', testVoicesRouter);
app.use('/api/twilio', twilioRouter);
app.use('/api/azure-tts', azureTTSRouter);
app.use('/api/test-audio', testAudioRouter);
app.use('/api/email', emailRouter);  // 📧 Rutas de email con OAuth
app.use('/webhooks', webhooksRouter);  // 💳 Webhooks de Stripe (sin /api prefix)
app.use('/api', apiRouter);  // 🔧 CRÍTICO: Router principal con /api/client, /api/profile, etc.

// 📊 RUTA DE MÉTRICAS PARA MONITOREO
let wsServer = null; // La asignaremos después de inicializar
app.get('/metrics', (req, res) => {
  try {
    if (wsServer) {
      const stats = wsServer.getStats();
      res.json({
        success: true,
        timestamp: Date.now(),
        server: {
          uptime: stats.uptime,
          memory: stats.memoryUsage
        },
        websocket: {
          activeConnections: stats.activeConnections,
          activeStreams: stats.activeStreams
        },
        calls: stats.streamMetrics || {}
      });
    } else {
      res.json({
        success: false,
        error: 'WebSocket server not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Capturar todas las rutas y servir frontend
app.get('*', (req, res) => {
  // Determinar el archivo a servir basado en la ruta
  const requestedPage = req.path.endsWith('.html') 
    ? req.path 
    : req.path === '/' 
      ? '/index.html' 
      : `${req.path}.html`;
      
  const htmlFilePath = path.join(frontendDir, requestedPage);
  
  // Verificar si el archivo existe
  if (fs.existsSync(htmlFilePath)) {
    return res.sendFile(htmlFilePath);
  }
  
  // Si no existe un archivo específico, servir index.html (para SPA)
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Capturar rutas API no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor - Escuchar en 0.0.0.0 para que Render pueda detectar el puerto
const server = app.listen(PORT, '0.0.0.0', async () => {
  try {
    // Verificar conexión con base de datos
    await prisma.$connect();
    logger.info('Conexión a base de datos exitosa');
    
    // Inicializar servidor WebSocket
    wsServer = new WebSocketServer(server); // 📊 Asignar a variable global para métricas
    const wsInitialized = wsServer.initialize();
    
    if (wsInitialized) {
      wsServer.startAutoCleanup();
      logger.info('✅ Servidor WebSocket inicializado correctamente');
    } else {
      logger.error('❌ Error inicializando servidor WebSocket');
    }
    
    // Iniciar job de limpieza de memorias de llamantes
    const cleanupMemoriesJob = require('./jobs/cleanupMemories');
    cleanupMemoriesJob.start();
    logger.info('✅ Job de limpieza de memorias iniciado');
    
    const host = process.env.NODE_ENV === 'production' ? process.env.BACKEND_URL || 'https://api.aiiatrace.com' : `http://localhost:${PORT}`;
    logger.info(`Servidor corriendo en ${host}`);
    
    // Mensaje específico para que Render detecte que el servidor está listo
    const renderPort = process.env.PORT || PORT;
    console.log(`🚀 Server listening on port ${renderPort}`);
    console.log(`Server is ready to handle requests on port ${renderPort}!`);
  } catch (error) {
    logger.error('Error conectando a la base de datos:', error);
    process.exit(1);
  }
});

// Manejar cierre graceful
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
