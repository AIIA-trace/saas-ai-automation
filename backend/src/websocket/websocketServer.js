const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const logger = require('../utils/logger');
const TwilioStreamHandler = require('./twilioStreamHandler');

class WebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.streamHandler = new TwilioStreamHandler();
    this.activeConnections = new Map();
  }

  /**
   * Inicializar servidor WebSocket
   */
  initialize() {
    try {
      // Crear servidor WebSocket
      this.wss = new WebSocket.Server({
        server: this.server,
        path: '/websocket/twilio-stream',
        verifyClient: this.verifyClient.bind(this)
      });

      // Manejar nuevas conexiones
      this.wss.on('connection', (ws, req) => {
        this.handleNewConnection(ws, req);
      });

      // Iniciar heartbeat para mantener conexiones
      this.streamHandler.startHeartbeat();

      // Iniciar limpieza automática de transcripciones
      const transcriptionService = require('../services/realtimeTranscription');
      const transcription = new transcriptionService();
      transcription.startAutoCleanup();

      logger.info('✅ Servidor WebSocket inicializado en /websocket/twilio-stream');
      return true;

    } catch (error) {
      logger.error(`❌ Error inicializando WebSocket server: ${error.message}`);
      return false;
    }
  }

  /**
   * Verificar cliente antes de aceptar conexión
   */
  verifyClient(info) {
    const { origin, req } = info;
    
    // Verificar que viene de Twilio
    const userAgent = req.headers['user-agent'];
    if (userAgent && userAgent.includes('TwilioProxy')) {
      logger.info(`✅ Conexión WebSocket autorizada desde Twilio`);
      return true;
    }

    // Permitir conexiones locales para desarrollo
    if (process.env.NODE_ENV === 'development') {
      logger.info(`🔧 Conexión WebSocket autorizada (desarrollo)`);
      return true;
    }

    logger.warn(`⚠️ Conexión WebSocket rechazada desde: ${origin}`);
    return false;
  }

  /**
   * Manejar nueva conexión WebSocket
   */
  handleNewConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    const clientIP = req.socket.remoteAddress;
    
    logger.info(`🔌 Nueva conexión WebSocket: ${connectionId} desde ${clientIP}`);

    // Almacenar conexión
    this.activeConnections.set(connectionId, {
      ws,
      req,
      connectionTime: Date.now(),
      lastActivity: Date.now()
    });

    // Configurar WebSocket
    ws.connectionId = connectionId;
    ws.isAlive = true;

    // Delegar manejo a TwilioStreamHandler
    this.streamHandler.handleConnection(ws, req);

    // Manejar cierre de conexión
    ws.on('close', (code, reason) => {
      logger.info(`🔌 Conexión WebSocket cerrada: ${connectionId} (${code}: ${reason})`);
      this.activeConnections.delete(connectionId);
    });

    // Manejar errores
    ws.on('error', (error) => {
      logger.error(`❌ Error WebSocket ${connectionId}: ${error.message}`);
      this.activeConnections.delete(connectionId);
    });
  }

  /**
   * Obtener estadísticas del servidor
   */
  getStats() {
    const activeConnections = this.activeConnections.size;
    const activeStreams = this.streamHandler.activeStreams.size;
    
    return {
      activeConnections,
      activeStreams,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Cerrar servidor WebSocket
   */
  close() {
    try {
      if (this.wss) {
        // Cerrar todas las conexiones activas
        this.wss.clients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1001, 'Server shutting down');
          }
        });

        // Cerrar servidor
        this.wss.close(() => {
          logger.info('✅ Servidor WebSocket cerrado');
        });
      }
    } catch (error) {
      logger.error(`❌ Error cerrando WebSocket server: ${error.message}`);
    }
  }

  /**
   * Generar ID único para conexión
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Broadcast a todas las conexiones activas
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        sentCount++;
      }
    });

    logger.debug(`📡 Broadcast enviado a ${sentCount} conexiones`);
    return sentCount;
  }

  /**
   * Limpiar conexiones inactivas
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutos

    for (const [connectionId, connectionData] of this.activeConnections.entries()) {
      if (now - connectionData.lastActivity > timeout) {
        logger.info(`🧹 Cerrando conexión inactiva: ${connectionId}`);
        connectionData.ws.close(1000, 'Inactive connection');
        this.activeConnections.delete(connectionId);
      }
    }
  }

  /**
   * Iniciar limpieza automática
   */
  startAutoCleanup() {
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 2 * 60 * 1000); // Cada 2 minutos

    logger.info('🧹 Auto-limpieza de conexiones WebSocket iniciada');
  }
}

module.exports = WebSocketServer;
