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

// Capturar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const server = app.listen(PORT, async () => {
  try {
    // Verificar conexión con base de datos
    await prisma.$connect();
    logger.info('Conexión a base de datos exitosa');
    
    const host = process.env.NODE_ENV === 'production' ? process.env.RENDER_EXTERNAL_URL || 'https://saas-ai-automation.onrender.com' : `http://localhost:${PORT}`;
    logger.info(`Servidor corriendo en ${host}`);
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
