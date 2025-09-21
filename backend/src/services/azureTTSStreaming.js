const sdk = require('microsoft-cognitiveservices-speech-sdk');
const logger = require('../utils/logger');

class AzureTTSStreaming {
  constructor() {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    
    // Configurar formato de audio para Twilio (8kHz, mono, mulaw) - optimizado para latencia
    this.speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;
    
    // Optimizaciones para reducir latencia
    this.speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_SynthEnableCompressedAudioTransmission, "true");
    this.speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "2000");
    this.speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "500");
  }

  /**
   * Sintetizar texto a audio streaming
   */
  async synthesizeToStream(text, voice = 'es-ES-DarioNeural') {
    return new Promise((resolve, reject) => {
      try {
        // Configurar voz
        this.speechConfig.speechSynthesisVoiceName = voice;

        // Crear sintetizador con callback de streaming
        const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null);

        // Generar SSML con naturalidad
        const ssml = this.generateSSML(text, voice);
        
        logger.info(`🎵 Iniciando síntesis streaming: "${text.substring(0, 50)}..."`);
        logger.info(`🎵 Voz: ${voice}`);

        // Buffer para acumular audio
        const audioChunks = [];

        // Evento cuando llega audio
        synthesizer.synthesizing = (s, e) => {
          if (e.result.audioData) {
            const chunk = new Uint8Array(e.result.audioData);
            audioChunks.push(chunk);
            logger.debug(`🎵 Chunk de audio recibido: ${chunk.length} bytes`);
          }
        };

        // Síntesis completada
        synthesizer.synthesisCompleted = (s, e) => {
          if (e.result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const totalAudio = this.combineAudioChunks(audioChunks);
            logger.info(`✅ Síntesis completada: ${totalAudio.length} bytes`);
            synthesizer.close();
            resolve(totalAudio);
          } else {
            const error = `Síntesis falló: ${e.result.errorDetails}`;
            logger.error(`❌ ${error}`);
            synthesizer.close();
            reject(new Error(error));
          }
        };

        // Error en síntesis
        synthesizer.synthesisStarted = (s, e) => {
          logger.debug(`🎵 Síntesis iniciada`);
        };

        synthesizer.synthesisCanceled = (s, e) => {
          const error = `Síntesis cancelada: ${e.errorDetails}`;
          logger.error(`❌ ${error}`);
          synthesizer.close();
          reject(new Error(error));
        };

        // Iniciar síntesis
        synthesizer.speakSsmlAsync(ssml);

      } catch (error) {
        logger.error(`❌ Error en síntesis streaming: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Generar SSML con naturalidad
   */
  generateSSML(text, voice) {
    // Aplicar naturalidad al texto
    const naturalText = this.makeTextNatural(text);

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
             xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="es-ES">
        <voice name="${voice}">
          <mstts:express-as style="chat" styledegree="0.9">
            <prosody rate="1.1" pitch="-2%" volume="90%">
              ${naturalText}
            </prosody>
          </mstts:express-as>
        </voice>
      </speak>
    `.trim();

    logger.debug(`🎭 SSML generado: ${ssml}`);
    return ssml;
  }

  /**
   * Hacer texto más natural con pausas y muletillas
   */
  makeTextNatural(text) {
    let naturalText = text;

    // Pausas más cortas para reducir latencia
    naturalText = naturalText.replace(/,/g, ',<break time="150ms"/>');
    naturalText = naturalText.replace(/\./g, '.<break time="250ms"/>');
    naturalText = naturalText.replace(/\?/g, '?<break time="300ms"/>');
    
    // Reducir muletillas para mayor velocidad
    const muletillas = ['', '', '', '', 'eh<break time="50ms"/> '];
    const randomMuletilla = muletillas[Math.floor(Math.random() * muletillas.length)];
    
    if (randomMuletilla && Math.random() < 0.15) { // Reducido a 15% probabilidad
      naturalText = randomMuletilla + naturalText;
    }

    // Énfasis en palabras importantes
    naturalText = naturalText.replace(/\b(importante|urgente|necesario|problema)\b/gi, 
      '<emphasis level="moderate">$1</emphasis>');

    return naturalText;
  }

  /**
   * Combinar chunks de audio en un solo buffer
   */
  combineAudioChunks(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }

  /**
   * Convertir audio a formato base64 para Twilio
   */
  audioToBase64(audioBuffer) {
    return Buffer.from(audioBuffer).toString('base64');
  }

  /**
   * Dividir audio en chunks para streaming
   */
  splitAudioIntoChunks(audioBuffer, chunkSize = 160) {
    // 160 bytes = 20ms de audio a 8kHz mulaw
    const chunks = [];
    
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  /**
   * Enviar audio por chunks a WebSocket - VERSIÓN MEJORADA
   */
  async streamAudioToWebSocket(ws, audioBuffer, streamSid) {
    try {
      const chunks = this.splitAudioIntoChunks(audioBuffer);
      
      logger.info(`🎵 Enviando ${chunks.length} chunks de audio para StreamSid: ${streamSid}`);

      // Verificar que el WebSocket esté conectado
      if (!ws || ws.readyState !== 1) { // 1 = WebSocket.OPEN
        throw new Error(`WebSocket no está conectado. ReadyState: ${ws?.readyState || 'undefined'}`);
      }

      const startTime = Date.now();
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const base64Audio = this.audioToBase64(chunk);

        // Timestamp más preciso basado en el tiempo real transcurrido
        const timestamp = startTime + (i * 20);

        const message = {
          event: 'media',
          streamSid: streamSid,
          media: {
            timestamp: timestamp,
            payload: base64Audio
          }
        };

        // Verificar que el WebSocket sigue conectado antes de enviar
        if (ws.readyState !== 1) {
          logger.warn(`⚠️ WebSocket desconectado durante streaming en chunk ${i}`);
          break;
        }

        ws.send(JSON.stringify(message));
        
        // Log cada 50 chunks para no saturar los logs
        if (i % 50 === 0 || i === chunks.length - 1) {
          logger.debug(`📤 Enviado chunk ${i + 1}/${chunks.length} (${base64Audio.length} chars)`);
        }

        // Pausa más precisa usando setTimeout en lugar de sleep
        if (i < chunks.length - 1) { // No esperar después del último chunk
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      logger.info(`✅ Audio streaming completado: ${chunks.length} chunks enviados en ${Date.now() - startTime}ms`);

    } catch (error) {
      logger.error(`❌ Error streaming audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Utilidad para pausas
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validar configuración de Azure
   */
  validateConfig() {
    if (!process.env.AZURE_SPEECH_KEY) {
      throw new Error('AZURE_SPEECH_KEY no configurada');
    }
    
    if (!process.env.AZURE_SPEECH_REGION) {
      throw new Error('AZURE_SPEECH_REGION no configurada');
    }

    logger.info('✅ Configuración Azure TTS validada');
    return true;
  }

  /**
   * Generar ID único para síntesis
   */
  generateSynthesisId() {
    return `synth_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Test de conexión con Azure TTS
   */
  async testConnection() {
    try {
      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
        logger.error('❌ Azure Speech credentials no configuradas');
        return false;
      }

      // Test básico de síntesis
      const testText = "Test";
      const audioBuffer = await this.synthesizeToStream(testText);
      
      if (audioBuffer && audioBuffer.length > 0) {
        logger.info('✅ Conexión Azure TTS exitosa');
        return true;
      } else {
        logger.error('❌ Azure TTS no generó audio');
        return false;
      }
      
    } catch (error) {
      logger.error(`❌ Test de síntesis falló: ${error.message}`);
      return false;
    }
  }
}

module.exports = AzureTTSStreaming;
