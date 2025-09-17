const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const twilio = require('twilio');
const logger = require('../utils/logger');
const TwilioStreamHandler = require('./twilioStreamHandler');
const azureTTSRestService = require('../services/azureTTSRestService');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

class WebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    
    // Initialize required services for TwilioStreamHandler
    this.ttsService = azureTTSRestService;
    this.openaiService = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.prisma = new PrismaClient();
    
    // Initialize TwilioStreamHandler with required services
    this.streamHandler = new TwilioStreamHandler(this.prisma, this.ttsService, this.openaiService);
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
    const userAgent = req.headers['user-agent'] || '';
    const host = req.headers['host'] || '';
    
    // Validar X-Twilio-Signature para autenticación segura
    const twilioSignature = req.headers['x-twilio-signature'];
    if (twilioSignature && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const url = `wss://${req.headers.host}${req.url}`;
        const params = {}; // WebSocket no tiene body params como HTTP
        
        const isValidSignature = twilio.validateRequest(
          process.env.TWILIO_AUTH_TOKEN,
          twilioSignature,
          url,
          params
        );
        
        if (isValidSignature) {
          logger.info(`✅ Conexión WebSocket autorizada con X-Twilio-Signature válida`);
          return true;
        } else {
          logger.warn(`❌ X-Twilio-Signature inválida para WebSocket`);
        }
      } catch (error) {
        logger.error(`❌ Error validando X-Twilio-Signature: ${error.message}`);
      }
    }
    
    // Verificar que viene de Twilio (múltiples patrones)
    if (userAgent.includes('TwilioProxy') || 
        userAgent.includes('Twilio') ||
        host.includes('twilio') ||
        origin && origin.includes('twilio')) {
      logger.info(`✅ Conexión WebSocket autorizada desde Twilio (UA: ${userAgent})`);
      return true;
    }

    // Permitir conexiones desde nuestro dominio
    if (origin && origin.includes('saas-ai-automation.onrender.com')) {
      logger.info(`✅ Conexión WebSocket autorizada desde nuestro dominio`);
      return true;
    }

    // Permitir conexiones locales para desarrollo
    if (process.env.NODE_ENV === 'development') {
      logger.info(`🔧 Conexión WebSocket autorizada (desarrollo)`);
      return true;
    }

    // En producción, permitir todas las conexiones por ahora para debugging
    if (process.env.NODE_ENV === 'production') {
      logger.info(`🔧 Conexión WebSocket autorizada (producción - debugging)`);
      return true;
    }

    logger.warn(`⚠️ Conexión WebSocket rechazada desde: ${origin}, UA: ${userAgent}`);
    return false;
  }

  /**
   * Manejar nueva conexión WebSocket
   */
  handleNewConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    const clientIP = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'No User-Agent';
    const origin = req.headers['origin'] || 'No Origin';
    
    logger.info(`🔌 NUEVA CONEXIÓN WEBSOCKET: ${connectionId}`);
    logger.info(`   - IP: ${clientIP}`);
    logger.info(`   - User-Agent: ${userAgent}`);
    logger.info(`   - Origin: ${origin}`);
    logger.info(`   - URL: ${req.url}`);
    logger.info(`   - Headers: ${JSON.stringify(req.headers)}`);

    // Almacenar conexión
    this.activeConnections.set(connectionId, {
      ws,
      req,
      connectionTime: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      connectionStartTime: Date.now()
    });

    // Configurar WebSocket
    ws.connectionId = connectionId;
    ws.isAlive = true;

    // Delegar manejo a TwilioStreamHandler
    logger.info(`🔄 Delegando conexión ${connectionId} a TwilioStreamHandler`);
    this.streamHandler.handleConnection(ws);

    // Manejar cierre de conexión
    ws.on('close', (code, reason) => {
      logger.info(`🔌 Conexión WebSocket cerrada: ${connectionId} (${code}: ${reason})`);
      logger.info(`🔌 Duración de la conexión: ${Date.now() - this.activeConnections.get(connectionId).connectionStartTime}ms`);
      logger.info(`🔌 Mensajes recibidos: ${this.activeConnections.get(connectionId).messageCount}`);
      this.activeConnections.delete(connectionId);
    });

    // Manejar errores
    ws.on('error', (error) => {
      logger.error(`🚨 Error WebSocket ${connectionId}: ${error.message}`);
      this.activeConnections.delete(connectionId);
    });

    // Manejar mensajes
    ws.on('message', async (message) => {
      const connectionData = this.activeConnections.get(ws.connectionId);
      if (connectionData) {
        connectionData.messageCount++;
        connectionData.lastActivity = Date.now();
      }
      
      try {
        // Parse and process Twilio Stream messages
        const data = JSON.parse(message.toString());
        await this.streamHandler.processStreamEvent(ws, data);
      } catch (error) {
        logger.error(`🚨 Error processing message ${ws.connectionId}: ${error.message}`);
      }
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
  async close() {
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

      // Cerrar conexión Prisma
      if (this.prisma) {
        await this.prisma.$disconnect();
        logger.info('✅ Conexión Prisma cerrada');
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
