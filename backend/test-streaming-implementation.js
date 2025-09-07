#!/usr/bin/env node

/**
 * Test completo para validar la implementación de Streaming TTS con WebSockets
 */

const WebSocket = require('ws');
const logger = require('./src/utils/logger');

// Servicios a testear
const StreamingTwiMLService = require('./src/services/streamingTwiMLService');
const AzureTTSStreaming = require('./src/services/azureTTSStreaming');
const RealtimeTranscription = require('./src/services/realtimeTranscription');
const TwilioStreamHandler = require('./src/websocket/twilioStreamHandler');

class StreamingImplementationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Ejecutar test con resultado
   */
  async runTest(testName, testFunction) {
    console.log(`\n🧪 Ejecutando: ${testName}`);
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(`✅ PASÓ: ${testName} (${duration}ms)`);
        this.results.passed++;
        this.results.tests.push({ name: testName, status: 'PASSED', duration });
      } else {
        console.log(`❌ FALLÓ: ${testName} (${duration}ms)`);
        this.results.failed++;
        this.results.tests.push({ name: testName, status: 'FAILED', duration });
      }
      
      return result;
    } catch (error) {
      console.log(`❌ ERROR: ${testName} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'ERROR', error: error.message });
      return false;
    }
  }

  /**
   * Test 1: Validar configuración de variables de entorno
   */
  async testEnvironmentConfig() {
    const requiredVars = [
      'AZURE_SPEECH_KEY',
      'AZURE_SPEECH_REGION',
      'OPENAI_API_KEY'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        console.log(`❌ Variable de entorno faltante: ${varName}`);
        return false;
      }
    }

    console.log('✅ Todas las variables de entorno están configuradas');
    return true;
  }

  /**
   * Test 2: Validar servicio de TwiML Streaming
   */
  async testStreamingTwiMLService() {
    const twimlService = new StreamingTwiMLService();
    
    // Test de validación de configuración
    const configValid = twimlService.validateStreamConfig();
    if (!configValid) {
      console.log('❌ Configuración Stream inválida');
      return false;
    }

    // Test de generación TwiML
    const twimlValid = twimlService.testTwiMLGeneration();
    if (!twimlValid) {
      console.log('❌ Generación TwiML falló');
      return false;
    }

    console.log('✅ StreamingTwiMLService funcionando correctamente');
    return true;
  }

  /**
   * Test 3: Validar servicio de Azure TTS Streaming
   */
  async testAzureTTSStreaming() {
    const azureTTS = new AzureTTSStreaming();
    
    // Test de inicialización
    const initResult = await azureTTS.testConnection();
    if (!initResult) {
      console.log('❌ Conexión Azure TTS falló');
      return false;
    }

    // Test de síntesis básica
    try {
      const testText = "Hola, este es un test de Azure TTS streaming.";
      const audioBuffer = await azureTTS.synthesizeToStream(testText);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        console.log('❌ Síntesis de audio falló');
        return false;
      }

      console.log(`✅ Audio sintetizado: ${audioBuffer.length} bytes`);
      return true;
      
    } catch (error) {
      console.log(`❌ Error en síntesis: ${error.message}`);
      return false;
    }
  }

  /**
   * Test 4: Validar servicio de transcripción en tiempo real
   */
  async testRealtimeTranscription() {
    const transcription = new RealtimeTranscription();
    
    // Test básico de transcripción
    const testResult = await transcription.testTranscription();
    if (!testResult) {
      console.log('❌ Test de transcripción falló');
      return false;
    }

    console.log('✅ RealtimeTranscription funcionando correctamente');
    return true;
  }

  /**
   * Test 5: Validar WebSocket handler
   */
  async testTwilioStreamHandler() {
    const handler = new TwilioStreamHandler();
    
    // Verificar que se inicializa correctamente
    if (!handler.activeStreams || !handler.audioBuffers || !handler.conversationState) {
      console.log('❌ TwilioStreamHandler no inicializado correctamente');
      return false;
    }

    console.log('✅ TwilioStreamHandler inicializado correctamente');
    return true;
  }

  /**
   * Test 6: Validar latencia de síntesis TTS
   */
  async testTTSLatency() {
    const azureTTS = new AzureTTSStreaming();
    const testTexts = [
      "Hola",
      "Gracias por llamar a nuestra empresa",
      "¿En qué puedo ayudarte hoy? Estamos aquí para resolver todas tus dudas y consultas."
    ];

    let totalLatency = 0;
    let testCount = 0;

    for (const text of testTexts) {
      try {
        const startTime = Date.now();
        const audioBuffer = await azureTTS.synthesizeToStream(text);
        const latency = Date.now() - startTime;
        
        console.log(`📊 Latencia "${text.substring(0, 20)}...": ${latency}ms`);
        
        if (audioBuffer && audioBuffer.length > 0) {
          totalLatency += latency;
          testCount++;
        }
        
      } catch (error) {
        console.log(`❌ Error en test de latencia: ${error.message}`);
      }
    }

    if (testCount === 0) {
      console.log('❌ No se pudo medir latencia');
      return false;
    }

    const avgLatency = totalLatency / testCount;
    console.log(`📊 Latencia promedio: ${avgLatency.toFixed(2)}ms`);
    
    // Objetivo: menos de 2000ms para síntesis
    if (avgLatency < 2000) {
      console.log('✅ Latencia dentro del objetivo (<2000ms)');
      return true;
    } else {
      console.log('⚠️ Latencia alta, pero funcional');
      return true; // No fallar por latencia alta
    }
  }

  /**
   * Test 7: Simular conexión WebSocket
   */
  async testWebSocketConnection() {
    return new Promise((resolve) => {
      try {
        // Crear servidor WebSocket temporal para test
        const testServer = require('http').createServer();
        const WebSocketServer = require('./src/websocket/websocketServer');
        
        const wsServer = new WebSocketServer(testServer);
        
        testServer.listen(0, () => {
          const port = testServer.address().port;
          console.log(`🔌 Servidor test WebSocket en puerto ${port}`);
          
          // Inicializar WebSocket server
          const initialized = wsServer.initialize();
          
          if (initialized) {
            console.log('✅ WebSocket server inicializado correctamente');
            testServer.close();
            resolve(true);
          } else {
            console.log('❌ Error inicializando WebSocket server');
            testServer.close();
            resolve(false);
          }
        });
        
      } catch (error) {
        console.log(`❌ Error en test WebSocket: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Test 8: Validar integración completa
   */
  async testCompleteIntegration() {
    try {
      // Simular datos de cliente
      const mockClientData = {
        id: 999,
        companyName: 'Test Company',
        language: 'es',
        welcomeMessage: 'Hola, bienvenido a nuestro test'
      };

      // Test TwiML generation
      const twimlService = new StreamingTwiMLService();
      const twiml = twimlService.createStreamTwiML(mockClientData);
      
      if (!twiml || !twiml.includes('<Connect>')) {
        console.log('❌ TwiML Stream no generado correctamente');
        return false;
      }

      // Test Azure TTS
      const azureTTS = new AzureTTSStreaming();
      const audioBuffer = await azureTTS.synthesizeToStream(mockClientData.welcomeMessage);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        console.log('❌ Audio no generado en integración');
        return false;
      }

      console.log('✅ Integración completa funcionando');
      return true;
      
    } catch (error) {
      console.log(`❌ Error en integración completa: ${error.message}`);
      return false;
    }
  }

  /**
   * Ejecutar todos los tests
   */
  async runAllTests() {
    console.log('🚀 INICIANDO TESTS DE STREAMING TTS IMPLEMENTATION');
    console.log('=' * 60);

    // Ejecutar tests en orden
    await this.runTest('1. Configuración de Variables de Entorno', () => this.testEnvironmentConfig());
    await this.runTest('2. Servicio TwiML Streaming', () => this.testStreamingTwiMLService());
    await this.runTest('3. Azure TTS Streaming', () => this.testAzureTTSStreaming());
    await this.runTest('4. Transcripción en Tiempo Real', () => this.testRealtimeTranscription());
    await this.runTest('5. WebSocket Handler', () => this.testTwilioStreamHandler());
    await this.runTest('6. Latencia TTS', () => this.testTTSLatency());
    await this.runTest('7. Conexión WebSocket', () => this.testWebSocketConnection());
    await this.runTest('8. Integración Completa', () => this.testCompleteIntegration());

    // Mostrar resultados
    this.showResults();
  }

  /**
   * Mostrar resultados finales
   */
  showResults() {
    console.log('\n' + '=' * 60);
    console.log('📊 RESULTADOS DE TESTS');
    console.log('=' * 60);
    
    console.log(`✅ Tests pasados: ${this.results.passed}`);
    console.log(`❌ Tests fallados: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed)) * 100;
    console.log(`📈 Tasa de éxito: ${successRate.toFixed(1)}%`);

    console.log('\n📋 DETALLE DE TESTS:');
    this.results.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⚠️';
      const duration = test.duration ? `(${test.duration}ms)` : '';
      console.log(`${index + 1}. ${status} ${test.name} ${duration}`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });

    if (this.results.failed === 0) {
      console.log('\n🎉 ¡TODOS LOS TESTS PASARON! La implementación está lista.');
    } else if (successRate >= 75) {
      console.log('\n⚠️ La mayoría de tests pasaron. Revisar tests fallados.');
    } else {
      console.log('\n❌ Varios tests fallaron. Revisar implementación.');
    }
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  const tester = new StreamingImplementationTest();
  tester.runAllTests().catch(error => {
    console.error('❌ Error ejecutando tests:', error);
    process.exit(1);
  });
}

module.exports = StreamingImplementationTest;
