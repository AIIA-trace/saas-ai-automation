/**
 * Servicio de prevención de spam
 * Valida y mejora emails para evitar filtros de spam
 */

const logger = require('../utils/logger');

class EmailSpamPrevention {
  constructor() {
    // Palabras y patrones que activan filtros de spam
    this.spamTriggers = [
      // Palabras de urgencia excesiva
      /\b(urgent|urgente|act now|limited time|expires|último día)\b/gi,
      // Palabras de dinero sospechosas
      /\b(free money|dinero gratis|click here|haz clic aquí|100% free)\b/gi,
      // Exceso de mayúsculas
      /[A-Z]{10,}/g,
      // Exceso de signos de exclamación
      /!{3,}/g,
      // Palabras típicas de phishing
      /\b(verify account|confirma tu cuenta|update payment|actualiza pago)\b/gi
    ];

    // Palabras que mejoran la reputación
    this.trustSignals = [
      'gracias',
      'thank you',
      'saludos',
      'regards',
      'atentamente',
      'cordialmente'
    ];
  }

  /**
   * Validar y mejorar email antes de enviar
   * @param {Object} emailData - Datos del email
   * @returns {Object} Email validado con warnings
   */
  validateEmail(emailData) {
    const warnings = [];
    const suggestions = [];
    let spamScore = 0;

    // 1. Validar asunto
    if (!emailData.subject || emailData.subject.trim() === '') {
      warnings.push('El asunto está vacío. Los emails sin asunto tienen alta probabilidad de ir a spam.');
      spamScore += 30;
    } else {
      // Verificar longitud del asunto
      if (emailData.subject.length < 10) {
        warnings.push('El asunto es muy corto. Recomendado: 30-50 caracteres.');
        spamScore += 10;
      }
      if (emailData.subject.length > 100) {
        warnings.push('El asunto es muy largo. Puede ser truncado.');
        spamScore += 5;
      }

      // Verificar mayúsculas excesivas en asunto
      const upperCaseRatio = (emailData.subject.match(/[A-Z]/g) || []).length / emailData.subject.length;
      if (upperCaseRatio > 0.5) {
        warnings.push('Demasiadas MAYÚSCULAS en el asunto. Reduce el uso de mayúsculas.');
        spamScore += 20;
      }

      // Verificar signos de exclamación
      const exclamationCount = (emailData.subject.match(/!/g) || []).length;
      if (exclamationCount > 1) {
        warnings.push('Demasiados signos de exclamación en el asunto.');
        spamScore += 15;
      }
    }

    // 2. Validar cuerpo del email
    if (!emailData.body || emailData.body.trim() === '') {
      warnings.push('El cuerpo del email está vacío.');
      spamScore += 40;
    } else {
      // Verificar longitud mínima
      const textContent = this.stripHtml(emailData.body);
      if (textContent.length < 50) {
        warnings.push('El email es muy corto. Los emails muy cortos pueden parecer spam.');
        spamScore += 15;
      }

      // Verificar palabras spam
      this.spamTriggers.forEach(pattern => {
        if (pattern.test(emailData.body)) {
          warnings.push(`Palabra/patrón sospechoso detectado: ${pattern.source}`);
          spamScore += 10;
        }
      });

      // Verificar ratio de enlaces
      const linkCount = (emailData.body.match(/<a /gi) || []).length;
      const wordCount = textContent.split(/\s+/).length;
      if (linkCount > 0 && wordCount / linkCount < 20) {
        warnings.push('Demasiados enlaces en proporción al texto.');
        spamScore += 15;
      }

      // Verificar señales de confianza
      const hasTrustSignals = this.trustSignals.some(signal => 
        textContent.toLowerCase().includes(signal)
      );
      if (!hasTrustSignals) {
        suggestions.push('Considera agregar un saludo o despedida profesional.');
      }
    }

    // 3. Validar destinatario
    if (!emailData.to || emailData.to.trim() === '') {
      warnings.push('No hay destinatario especificado.');
      spamScore += 50;
    }

    // 4. Generar sugerencias de mejora
    if (spamScore > 0) {
      suggestions.push(...this.generateSuggestions(emailData, spamScore));
    }

    // 5. Determinar nivel de riesgo
    let riskLevel = 'low';
    if (spamScore >= 50) {
      riskLevel = 'high';
    } else if (spamScore >= 25) {
      riskLevel = 'medium';
    }

    return {
      isValid: spamScore < 75,
      spamScore,
      riskLevel,
      warnings,
      suggestions,
      emailData: this.improveEmail(emailData, warnings)
    };
  }

  /**
   * Mejorar email automáticamente
   * @param {Object} emailData - Datos del email
   * @param {Array} warnings - Advertencias detectadas
   * @returns {Object} Email mejorado
   */
  improveEmail(emailData, warnings) {
    let improved = { ...emailData };

    // Agregar saludo si falta
    if (!this.hasGreeting(improved.body)) {
      const greeting = this.detectLanguage(improved.body) === 'es' 
        ? '<p>Hola,</p>' 
        : '<p>Hello,</p>';
      improved.body = greeting + improved.body;
    }

    // Agregar despedida si falta
    if (!this.hasFarewell(improved.body)) {
      const farewell = this.detectLanguage(improved.body) === 'es'
        ? '<p>Saludos cordiales,</p>'
        : '<p>Best regards,</p>';
      improved.body = improved.body + farewell;
    }

    return improved;
  }

  /**
   * Generar sugerencias específicas
   */
  generateSuggestions(emailData, spamScore) {
    const suggestions = [];

    if (spamScore >= 50) {
      suggestions.push('⚠️ Alto riesgo de spam. Revisa el contenido antes de enviar.');
    }

    suggestions.push('✅ Usa un asunto claro y descriptivo (30-50 caracteres).');
    suggestions.push('✅ Evita MAYÚSCULAS excesivas y múltiples signos de exclamación.');
    suggestions.push('✅ Incluye un saludo y despedida profesional.');
    suggestions.push('✅ Mantén un buen ratio texto/enlaces (mínimo 20 palabras por enlace).');
    suggestions.push('✅ Evita palabras como "urgente", "gratis", "haz clic aquí".');

    return suggestions;
  }

  /**
   * Detectar si tiene saludo
   */
  hasGreeting(body) {
    const greetings = [
      /\bhola\b/i,
      /\bhello\b/i,
      /\bhi\b/i,
      /\bbuenos días\b/i,
      /\bgood morning\b/i,
      /\bestimado\b/i,
      /\bdear\b/i
    ];
    return greetings.some(pattern => pattern.test(body));
  }

  /**
   * Detectar si tiene despedida
   */
  hasFarewell(body) {
    const farewells = [
      /\bsaludos\b/i,
      /\bregards\b/i,
      /\batentamente\b/i,
      /\bcordialmente\b/i,
      /\bsincerely\b/i,
      /\bgracias\b/i,
      /\bthank you\b/i
    ];
    return farewells.some(pattern => pattern.test(body));
  }

  /**
   * Detectar idioma del texto
   */
  detectLanguage(text) {
    const spanishWords = ['hola', 'gracias', 'saludos', 'atentamente', 'cordialmente'];
    const englishWords = ['hello', 'thanks', 'regards', 'sincerely', 'best'];
    
    const lowerText = text.toLowerCase();
    const spanishCount = spanishWords.filter(word => lowerText.includes(word)).length;
    const englishCount = englishWords.filter(word => lowerText.includes(word)).length;
    
    return spanishCount > englishCount ? 'es' : 'en';
  }

  /**
   * Eliminar HTML del texto
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Validar formato de email
   */
  isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Agregar headers anti-spam recomendados
   */
  getRecommendedHeaders() {
    return {
      'X-Mailer': 'AI Receptionist',
      'X-Priority': '3', // Normal priority
      'Importance': 'Normal'
    };
  }
}

module.exports = new EmailSpamPrevention();
