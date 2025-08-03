/**
 * Script para verificar los datos guardados de un usuario específico
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserData(email) {
  console.log(`Buscando datos para el usuario: ${email}`);
  
  try {
    // Buscar usuario por email
    const user = await prisma.client.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log(`Usuario con email ${email} no encontrado`);
      return null;
    }
    
    console.log('----------------------------------------');
    console.log('DATOS BÁSICOS DEL CLIENTE:');
    console.log('----------------------------------------');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Nombre de empresa: ${user.companyName}`);
    console.log(`Nombre de contacto: ${user.contactName}`);
    console.log(`Teléfono: ${user.phone || 'No configurado'}`);
    console.log(`Sitio web: ${user.website || 'No configurado'}`);
    console.log(`Industria: ${user.industry || 'No configurada'}`);
    console.log(`Dirección: ${user.address || 'No configurada'}`);
    console.log(`Zona horaria: ${user.timezone}`);
    console.log(`Idioma: ${user.language}`);
    console.log(`Creado: ${user.createdAt}`);
    console.log(`Actualizado: ${user.updatedAt}`);
    console.log('----------------------------------------');
    
    // Verificar configuración del bot
    if (user.botConfig) {
      console.log('CONFIGURACIÓN DEL BOT:');
      console.log('----------------------------------------');
      console.log(JSON.stringify(user.botConfig, null, 2));
      console.log('----------------------------------------');
    } else {
      console.log('No hay configuración de bot guardada');
    }
    
    // Verificar configuración de email
    if (user.emailConfig) {
      console.log('CONFIGURACIÓN DE EMAIL:');
      console.log('----------------------------------------');
      // Omitir contraseñas por seguridad
      const emailConfig = { ...user.emailConfig };
      if (emailConfig.imapPassword) emailConfig.imapPassword = '[REDACTADO]';
      if (emailConfig.smtpPassword) emailConfig.smtpPassword = '[REDACTADO]';
      console.log(JSON.stringify(emailConfig, null, 2));
      console.log('----------------------------------------');
    } else {
      console.log('No hay configuración de email guardada');
    }
    
    return user;
  } catch (error) {
    console.error(`Error al obtener datos del usuario: ${error.message}`);
    console.error(error.stack);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Usuario específico a verificar
const userEmail = 'carlos@almiscle.com';
getUserData(userEmail)
  .then(() => console.log('Consulta completada'))
  .catch(err => console.error('Error en la ejecución:', err));
