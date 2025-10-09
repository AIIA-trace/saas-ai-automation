const winston = require('winston');
const path = require('path');

// Definir niveles de log personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Añadir colores a Winston
winston.addColors(colors);

// Definir formato para los logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Definir los transportes para guardar logs
const transports = [
  // Logs de consola
  new winston.transports.Console(),
  
  // Logs de error en archivo
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  
  // Todos los logs en archivo
  new winston.transports.File({ 
    filename: path.join(__dirname, '../../logs/all.log') 
  }),
];

// Crear el logger
const logger = winston.createLogger({
  level: 'debug', // ✅ TEMPORALMENTE: Debug habilitado para diagnosticar transcripción
  levels,
  format,
  transports,
});

// Exportar el logger
module.exports = logger;
