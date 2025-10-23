const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

/**
 * Servicio para extraer contenido de texto de documentos
 * Soporta: .docx, .pdf, .txt
 */
class DocumentExtractorService {
  /**
   * Extrae texto de un archivo según su tipo
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<string>} - Texto extraído
   */
  async extractText(fileBuffer, mimeType, filename) {
    try {
      logger.info(`📄 Extrayendo texto de: ${filename} (${mimeType})`);
      
      // Determinar método de extracción según tipo de archivo
      if (mimeType.includes('wordprocessingml') || filename.endsWith('.docx')) {
        return await this.extractFromDocx(fileBuffer);
      } else if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
        return await this.extractFromPdf(fileBuffer);
      } else if (mimeType.includes('text') || filename.endsWith('.txt')) {
        return this.extractFromTxt(fileBuffer);
      } else {
        logger.warn(`⚠️ Tipo de archivo no soportado: ${mimeType}`);
        return `[Archivo ${filename} - contenido no extraíble automáticamente]`;
      }
    } catch (error) {
      logger.error(`❌ Error extrayendo texto de ${filename}: ${error.message}`);
      return `[Error extrayendo contenido de ${filename}]`;
    }
  }

  /**
   * Extrae texto de archivo .docx
   * @param {Buffer} buffer - Buffer del archivo
   * @returns {Promise<string>} - Texto extraído
   */
  async extractFromDocx(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      
      logger.info(`✅ Texto extraído de DOCX: ${text.length} caracteres`);
      
      if (result.messages.length > 0) {
        logger.warn(`⚠️ Advertencias durante extracción DOCX:`, result.messages);
      }
      
      return text;
    } catch (error) {
      logger.error(`❌ Error extrayendo DOCX: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrae texto de archivo .pdf
   * @param {Buffer} buffer - Buffer del archivo
   * @returns {Promise<string>} - Texto extraído
   */
  async extractFromPdf(buffer) {
    try {
      const data = await pdfParse(buffer);
      const text = data.text.trim();
      
      logger.info(`✅ Texto extraído de PDF: ${text.length} caracteres (${data.numpages} páginas)`);
      
      return text;
    } catch (error) {
      logger.error(`❌ Error extrayendo PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extrae texto de archivo .txt
   * @param {Buffer} buffer - Buffer del archivo
   * @returns {string} - Texto extraído
   */
  extractFromTxt(buffer) {
    try {
      const text = buffer.toString('utf-8').trim();
      logger.info(`✅ Texto extraído de TXT: ${text.length} caracteres`);
      return text;
    } catch (error) {
      logger.error(`❌ Error extrayendo TXT: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limita el texto a un número máximo de caracteres
   * @param {string} text - Texto a limitar
   * @param {number} maxChars - Número máximo de caracteres (default: 5000)
   * @returns {string} - Texto limitado
   */
  limitText(text, maxChars = 5000) {
    if (text.length <= maxChars) {
      return text;
    }
    
    logger.warn(`⚠️ Texto truncado de ${text.length} a ${maxChars} caracteres`);
    return text.substring(0, maxChars) + '\n\n[... contenido truncado para optimizar el prompt del bot ...]';
  }

  /**
   * Procesa un archivo y retorna objeto con metadata + contenido
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {Object} fileMetadata - Metadata del archivo (name, type, size)
   * @returns {Promise<Object>} - Objeto con metadata y contenido extraído
   */
  async processFile(fileBuffer, fileMetadata) {
    try {
      const { name, type, size } = fileMetadata;
      
      logger.info(`📁 Procesando archivo: ${name} (${size} bytes)`);
      
      // Extraer texto del documento
      const rawText = await this.extractText(fileBuffer, type, name);
      
      // Limitar texto para no saturar el prompt
      const content = this.limitText(rawText, 5000);
      
      // Retornar objeto completo
      return {
        id: Date.now(),
        name: name,
        filename: name,
        type: type,
        file_type: type,
        size: size,
        file_size: size,
        uploaded: true,
        content: content,
        contentLength: content.length,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Error procesando archivo ${fileMetadata.name}: ${error.message}`);
      
      // Retornar objeto sin contenido en caso de error
      return {
        id: Date.now(),
        name: fileMetadata.name,
        filename: fileMetadata.name,
        type: fileMetadata.type,
        file_type: fileMetadata.type,
        size: fileMetadata.size,
        file_size: fileMetadata.size,
        uploaded: true,
        content: `[Error extrayendo contenido: ${error.message}]`,
        extractedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = new DocumentExtractorService();
