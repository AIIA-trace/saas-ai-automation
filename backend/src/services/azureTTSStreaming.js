const sdk = require('microsoft-cognitiveservices-speech-sdk');
const logger = require('../utils/logger');

class AzureTTSStreaming {
  constructor() {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    
    // Configurar formato de audio para Twilio (8kHz, mono, mulaw)
    this.speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Raw8Khz8BitMonoMULaw;
  }

  /**
   * Sintetizar texto a audio streaming
   */
  async synthesizeToStream(text, voice = 'en-US-LolaMultilingualNeural') {
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
          <mstts:express-as style="friendly" styledegree="0.8">
            <prosody rate="0.95" pitch="+0%" volume="+0%">
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

    // Añadir pausas después de comas
    naturalText = naturalText.replace(/,/g, ',<break time="200ms"/>');
    
    // Pausas después de puntos
    naturalText = naturalText.replace(/\./g, '.<break time="300ms"/>');
    
    // Pausas después de preguntas
    naturalText = naturalText.replace(/\?/g, '?<break time="400ms"/>');
    
    // Añadir muletillas ocasionales al inicio
    const muletillas = ['', '', '', 'mmm<break time="150ms"/> ', 'eh<break time="100ms"/> '];
    const randomMuletilla = muletillas[Math.floor(Math.random() * muletillas.length)];
    
    if (randomMuletilla && Math.random() < 0.3) { // 30% probabilidad
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
   * Enviar audio por chunks a WebSocket
   */
  async streamAudioToWebSocket(ws, audioBuffer, streamSid) {
    try {
      const chunks = this.splitAudioIntoChunks(audioBuffer);
      
      logger.info(`🎵 Enviando ${chunks.length} chunks de audio`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const base64Audio = this.audioToBase64(chunk);

        const message = {
          event: 'media',
          streamSid: streamSid,
          media: {
            timestamp: Date.now() + (i * 20), // 20ms por chunk
            payload: base64Audio
          }
        };

        ws.send(JSON.stringify(message));

        // Pequeña pausa para simular streaming real
        await this.sleep(20); // 20ms entre chunks
      }

      logger.info(`✅ Audio streaming completado`);

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
   * Enviar audio por chunks a WebSocket
   */
  async streamAudioToWebSocket(ws, audioBuffer, streamSid) {
    try {
      const chunks = this.splitAudioIntoChunks(audioBuffer);
      
      logger.info(`🎵 Enviando ${chunks.length} chunks de audio`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const base64Audio = this.audioToBase64(chunk);

        const message = {
          event: 'media',
          streamSid: streamSid,
          media: {
            timestamp: Date.now() + (i * 20), // 20ms por chunk
            payload: base64Audio
          }
        };

        ws.send(JSON.stringify(message));

        // Pequeña pausa para simular streaming real
        await this.sleep(20); // 20ms entre chunks
      }

      logger.info(`✅ Audio streaming completado`);

    } catch (error) {
      logger.error(`❌ Error streaming audio: ${error.message}`);
      throw error;
    }
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
