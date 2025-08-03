const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔍 Iniciando diagnóstico de conexión a la base de datos...');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    // Verificar variables de entorno
    console.log('\n📋 Verificando configuración:');
    console.log('- DATABASE_URL está definida:', !!process.env.DATABASE_URL);
    console.log('- DATABASE_URL empieza con postgresql:', process.env.DATABASE_URL?.startsWith('postgresql'));
    
    // Test básico de conexión
    console.log('\n🔌 Probando conexión básica...');
    await prisma.$connect();
    console.log('✅ Conexión establecida exitosamente');
    
    // Test de query simple
    console.log('\n📊 Probando query simple...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query ejecutada:', result);
    
    // Verificar si la tabla Client existe
    console.log('\n🗃️ Verificando tabla Client...');
    const clientCount = await prisma.client.count();
    console.log('✅ Tabla Client existe. Registros:', clientCount);
    
    // Verificar campos nuevos
    console.log('\n🔍 Verificando estructura de tabla...');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      AND column_name IN ('callConfig', 'transferConfig', 'scriptConfig', 'aiConfig', 'workingHours', 'faqs', 'contextFiles')
      ORDER BY column_name;
    `;
    console.log('✅ Campos JSON encontrados:', tableInfo);
    
    console.log('\n🎉 Diagnóstico completado exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:');
    console.error('- Código de error:', error.code);
    console.error('- Mensaje:', error.message);
    console.error('- Stack:', error.stack);
    
    // Diagnósticos específicos
    if (error.code === 'P1017') {
      console.error('\n🔍 Diagnóstico P1017 (Server has closed the connection):');
      console.error('- Posibles causas:');
      console.error('  1. Base de datos en modo sleep (común en planes gratuitos)');
      console.error('  2. Timeout de conexión');
      console.error('  3. Límite de conexiones alcanzado');
      console.error('  4. Problemas de red');
      console.error('- Soluciones:');
      console.error('  1. Reintentar en unos minutos');
      console.error('  2. Verificar estado del servicio en Render');
      console.error('  3. Revisar límites de conexión');
    }
    
    if (error.code === 'P1001') {
      console.error('\n🔍 Diagnóstico P1001 (Cannot reach database server):');
      console.error('- Verificar URL de conexión');
      console.error('- Verificar firewall/red');
      console.error('- Verificar estado del servidor');
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar diagnóstico
testConnection()
  .catch(console.error)
  .finally(() => process.exit());
