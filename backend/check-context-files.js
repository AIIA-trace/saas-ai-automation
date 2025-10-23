const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContextFiles() {
  try {
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' },
      select: {
        contextFiles: true
      }
    });
    
    console.log('📁 ARCHIVOS DE CONTEXTO EN BD:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!client.contextFiles || client.contextFiles.length === 0) {
      console.log('❌ NO hay archivos de contexto');
    } else {
      console.log(`✅ ${client.contextFiles.length} archivo(s) encontrado(s):\n`);
      
      client.contextFiles.forEach((file, index) => {
        console.log(`ARCHIVO #${index + 1}:`);
        console.log(`  - name: ${file.name || 'undefined'}`);
        console.log(`  - type: ${file.type || 'undefined'}`);
        console.log(`  - size: ${file.size || 'undefined'}`);
        console.log(`  - content: ${file.content ? file.content.substring(0, 100) + '...' : 'undefined'}`);
        console.log(`  - Todas las claves: ${Object.keys(file).join(', ')}`);
        console.log('');
      });
      
      console.log('📊 ANÁLISIS:');
      const hasName = client.contextFiles.every(f => f.name);
      const hasContent = client.contextFiles.every(f => f.content);
      
      console.log(`  - Todos tienen 'name': ${hasName ? '✅' : '❌'}`);
      console.log(`  - Todos tienen 'content': ${hasContent ? '✅' : '❌'}`);
      
      if (!hasName || !hasContent) {
        console.log('\n⚠️ PROBLEMA: Archivos mal formateados');
        console.log('   El bot necesita que cada archivo tenga:');
        console.log('   - name: nombre del archivo');
        console.log('   - content: contenido del archivo (texto)');
      } else {
        console.log('\n✅ Archivos correctamente formateados');
        console.log('   El bot podrá acceder a este contenido');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkContextFiles();
