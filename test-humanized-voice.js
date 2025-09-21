/**
 * Test script para verificar la humanización de voz con SSML
 */

// Simular la función de humanización SSML
function humanizeTextWithSSML(text) {
    // Limpiar texto de posibles caracteres problemáticos
    const cleanText = text.replace(/[<>&"']/g, (match) => {
        const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
        return entities[match];
    });

    // Aplicar SSML humanizado para Ximena Multilingüe
    const ssmlText = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
             xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="es-ES">
        <voice name="es-ES-XimenaMultilingualNeural">
          <mstts:express-as style="friendly">
            <prosody rate="0.9" pitch="-3%" volume="85%">
              ${cleanText.replace(/\./g, '.<break time="300ms"/>')}
            </prosody>
          </mstts:express-as>
        </voice>
      </speak>
    `.trim();

    return ssmlText;
}

console.log('=== TESTING HUMANIZED VOICE WITH SSML ===\n');

// Test 1: Saludo básico
const basicGreeting = "Hola, ha llamado a nuestra empresa. Soy el asistente virtual, ¿en qué puedo ayudarle hoy?";
console.log('Test 1: Saludo básico');
console.log('Input:', basicGreeting);
console.log('SSML Output:');
console.log(humanizeTextWithSSML(basicGreeting));
console.log('\n' + '='.repeat(80) + '\n');

// Test 2: Saludo con caracteres especiales
const specialGreeting = "¡Hola! Bienvenido a \"Nuestra Empresa\". ¿Cómo está usted?";
console.log('Test 2: Saludo con caracteres especiales');
console.log('Input:', specialGreeting);
console.log('SSML Output:');
console.log(humanizeTextWithSSML(specialGreeting));
console.log('\n' + '='.repeat(80) + '\n');

// Test 3: Saludo de fallback
const fallbackGreeting = "Gracias por llamar. Estamos conectándote con un asistente. Por favor, espera un momento.";
console.log('Test 3: Saludo de fallback');
console.log('Input:', fallbackGreeting);
console.log('SSML Output:');
console.log(humanizeTextWithSSML(fallbackGreeting));
console.log('\n' + '='.repeat(80) + '\n');

console.log('✅ CARACTERÍSTICAS HUMANIZADAS APLICADAS:');
console.log('   🎭 style="friendly" - Estilo amigable');
console.log('   🐌 rate="0.9" - 10% más lenta (más natural)');
console.log('   🎵 pitch="-3%" - Tono ligeramente más grave');
console.log('   🔉 volume="85%" - Volumen más suave');
console.log('   ⏸️  <break time="300ms"/> - Pausas naturales después de puntos');
console.log('   🛡️  Caracteres especiales escapados para seguridad');

console.log('\n🎤 RESULTADO: Ximena Multilingüe sonará más humana y menos robótica');
