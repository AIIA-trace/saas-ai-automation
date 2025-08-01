// Script para verificar el campo de teléfono de un usuario específico
require('dotenv').config();
const path = require('path');
const { prisma } = require('../src/utils/db');

console.log('Conectando a la base de datos con la configuración de la aplicación...');

async function checkUserPhone(email) {
  try {
    console.log(`Buscando usuario con email: ${email}...`);
    
    const user = await prisma.client.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.error(`No se encontró ningún usuario con el email: ${email}`);
      return;
    }
    
    console.log('\n===== INFORMACIÓN DEL USUARIO =====');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Compañía: ${user.companyName}`);
    console.log(`Nombre de contacto: ${user.contactName}`);
    
    // Verificar específicamente el campo phone
    if (user.phone) {
      console.log(`✅ Teléfono: ${user.phone}`);
    } else {
      console.log('❌ Teléfono: [NO ESTABLECIDO]');
    }
    
    // Verificar si hay datos en JSON companyInfo
    if (user.companyInfo) {
      console.log('\n===== DATOS EN companyInfo (JSON) =====');
      console.log(JSON.stringify(user.companyInfo, null, 2));
      
      if (user.companyInfo.phone) {
        console.log(`Teléfono en companyInfo: ${user.companyInfo.phone}`);
      }
    }
    
    console.log('\n===== TODOS LOS CAMPOS =====');
    // Mostrar todos los campos excepto contraseña y apiKey por seguridad
    const { password, apiKey, ...safeUser } = user;
    console.log(JSON.stringify(safeUser, null, 2));
    
  } catch (error) {
    console.error('Error al consultar la base de datos:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la función con el email proporcionado
const email = process.argv[2] || 'prueba3@gmail.com';
checkUserPhone(email);
