const { PrismaClient } = require('@prisma/client');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function extractRealContent() {
  try {
    console.log('📄 EXTRAYENDO CONTENIDO REAL DEL ARCHIVO...\n');
    
    // Buscar el archivo .docx en el directorio de uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Directorio uploads no existe');
      console.log('📍 Por favor, indica la ruta del archivo qiromedia.docx');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    const docxFile = files.find(f => f.endsWith('.docx'));
    
    if (!docxFile) {
      console.log('❌ No se encontró archivo .docx en uploads/');
      console.log('📍 Archivos disponibles:', files);
      console.log('\n💡 SOLUCIÓN: Proporciona la ruta completa del archivo');
      return;
    }
    
    const filePath = path.join(uploadsDir, docxFile);
    console.log(`📁 Archivo encontrado: ${docxFile}`);
    console.log(`📍 Ruta: ${filePath}\n`);
    
    // Leer el archivo
    const buffer = fs.readFileSync(filePath);
    
    // Extraer texto con mammoth
    console.log('🔍 Extrayendo texto del documento...');
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value.trim();
    
    console.log(`✅ Texto extraído: ${content.length} caracteres\n`);
    console.log('📝 CONTENIDO EXTRAÍDO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(content);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Obtener cliente
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' }
    });
    
    if (!client) {
      console.log('❌ Cliente Qiromedia no encontrado');
      return;
    }
    
    // Obtener archivo actual
    const currentFiles = client.contextFiles || [];
    const currentFile = currentFiles[0] || {};
    
    // Actualizar con contenido real
    const updatedFile = {
      id: currentFile.id || Date.now(),
      name: docxFile,
      filename: docxFile,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer.length,
      file_size: buffer.length,
      uploaded: true,
      content: content // CONTENIDO REAL EXTRAÍDO
    };
    
    console.log('💾 Actualizando base de datos...');
    
    await prisma.client.update({
      where: { id: client.id },
      data: {
        contextFiles: [updatedFile]
      }
    });
    
    console.log('✅ Base de datos actualizada correctamente\n');
    
    // Verificar
    const updated = await prisma.client.findUnique({
      where: { id: client.id },
      select: { contextFiles: true }
    });
    
    console.log('📊 VERIFICACIÓN:');
    console.log(`  - Archivos: ${updated.contextFiles.length}`);
    console.log(`  - Nombre: ${updated.contextFiles[0].name}`);
    console.log(`  - Tiene content: ${!!updated.contextFiles[0].content}`);
    console.log(`  - Longitud: ${updated.contextFiles[0].content?.length || 0} caracteres`);
    
    console.log('\n✅ PROCESO COMPLETADO');
    console.log('   El bot ahora tiene acceso al contenido real del documento');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

extractRealContent();
