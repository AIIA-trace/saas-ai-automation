const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Rutas importadas
const { router: authRouter } = require('./routes/auth');
const apiRouter = require('./routes/api');
const webhooksRouter = require('./routes/webhooks');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuración de seguridad básica (personalizada para permitir frames en desarrollo)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false
    })
  );
}

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
app.use('/api', apiRouter);
app.use('/webhooks', webhooksRouter);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Bot de Llamadas y Emails con IA',
    version: '1.0.0',
    status: 'online'
  });
});

// Servir index.html para cualquier ruta que no sea API o webhook (para SPA)
app.get('*', (req, res, next) => {
  // Si la ruta empieza con /api o /webhooks, continuar al siguiente middleware
  if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
    return next();
  }
  
  // Si no, servir el index.html del frontend
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
    
    const host = process.env.NODE_ENV === 'production' ? process.env.RENDER_EXTERNAL_URL || 'https://saas-ai-automation.onrender.com' : `http://localhost:${PORT}`;
    logger.info(`Servidor corriendo en ${host}`);
    
    // Mensaje específico para que Render detecte que el servidor está listo
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`Server is ready to handle requests!`);
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
