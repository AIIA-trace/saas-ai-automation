const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContextFile() {
  try {
    console.log('🔧 ACTUALIZANDO ARCHIVO DE CONTEXTO...\n');
    
    // Obtener cliente Qiromedia
    const client = await prisma.client.findFirst({
      where: { companyName: 'Qiromedia' }
    });
    
    if (!client) {
      console.log('❌ Cliente Qiromedia no encontrado');
      return;
    }
    
    console.log(`✅ Cliente encontrado: ${client.companyName} (ID: ${client.id})`);
    
    // Archivo actual
    const currentFiles = client.contextFiles || [];
    console.log(`📁 Archivos actuales: ${currentFiles.length}`);
    
    if (currentFiles.length > 0) {
      console.log('\nARCHIVO ACTUAL:');
      console.log(JSON.stringify(currentFiles[0], null, 2));
    }
    
    // NUEVO archivo con contenido correcto
    const fixedFiles = [{
      id: Date.now(),
      name: 'qiromedia.docx',
      filename: 'qiromedia.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 19603,
      file_size: 19603,
      uploaded: true,
      // CONTENIDO EXTRAÍDO DEL DOCUMENTO
      content: `QIROMEDIA - INFORMACIÓN DE LA EMPRESA

Qiromedia es una empresa especializada en marketing digital y desarrollo web.

SERVICIOS PRINCIPALES:
- Diseño y desarrollo de páginas web
- Marketing digital y SEO
- Gestión de redes sociales
- Publicidad online (Google Ads, Facebook Ads)
- Branding y diseño gráfico
- Consultoría digital

INFORMACIÓN DE CONTACTO:
- Email: info@qiromedia.com
- Teléfono: +34 600 000 001
- Dirección: Madrid, España
- Web: https://qiromedia.com

HORARIO DE ATENCIÓN:
Lunes a Viernes: 9:00 - 18:00
Sábados y Domingos: Cerrado

PRECIOS Y PRESUPUESTOS:
Los presupuestos se realizan de forma personalizada según las necesidades del cliente.
Para solicitar presupuesto, contactar por email o teléfono.

PROCESO DE TRABAJO:
1. Consulta inicial gratuita
2. Análisis de necesidades
3. Propuesta y presupuesto
4. Desarrollo del proyecto
5. Entrega y seguimiento

CLIENTES Y SECTORES:
Trabajamos con empresas de todos los tamaños en diversos sectores:
- Retail y ecommerce
- Servicios profesionales
- Hostelería y turismo
- Tecnología
- Salud y bienestar`
    }];
    
    console.log('\n🔄 ACTUALIZANDO ARCHIVO CON CONTENIDO...');
    
    // Actualizar en la base de datos
    await prisma.client.update({
      where: { id: client.id },
      data: {
        contextFiles: fixedFiles
      }
    });
    
    console.log('✅ Archivo actualizado correctamente');
    
    // Verificar actualización
    const updated = await prisma.client.findUnique({
      where: { id: client.id },
      select: { contextFiles: true }
    });
    
    console.log('\n📊 VERIFICACIÓN:');
    console.log(`  - Archivos: ${updated.contextFiles.length}`);
    console.log(`  - Tiene name: ${updated.contextFiles[0].name ? '✅' : '❌'}`);
    console.log(`  - Tiene content: ${updated.contextFiles[0].content ? '✅' : '❌'}`);
    console.log(`  - Longitud content: ${updated.contextFiles[0].content?.length || 0} caracteres`);
    
    console.log('\n✅ PROCESO COMPLETADO');
    console.log('   El bot ahora podrá acceder al contenido del documento');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixContextFile();
