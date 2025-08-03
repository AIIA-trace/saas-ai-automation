// Script para verificar datos completos de un usuario específico
// Ejecutar con: node scripts/check-user-complete.js prueba4@gmail.com
require('dotenv').config();
const { prisma } = require('../src/utils/db');

console.log('Conectando a la base de datos...');

async function checkUserData(email) {
  try {
    console.log(`Buscando usuario con email: ${email}...`);
    
    const user = await prisma.client.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.error(`❌ No se encontró ningún usuario con el email: ${email}`);
      return;
    }
    
    console.log('\n===== INFORMACIÓN BÁSICA DEL USUARIO =====');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Empresa: ${user.companyName}`);
    console.log(`Descripción: ${user.companyDescription || '[NO ESTABLECIDO]'}`);
    
    // Verificar campos críticos
    console.log('\n===== CAMPOS VERIFICADOS =====');
    
    // Verificar el campo industry
    if (user.industry) {
      console.log(`✅ Sector empresarial (industry): ${user.industry}`);
    } else {
      console.log('❌ Sector empresarial (industry): [NO ESTABLECIDO]');
    }
    
    // Verificar el campo phone
    if (user.phone) {
      console.log(`✅ Teléfono: ${user.phone}`);
    } else {
      console.log('❌ Teléfono: [NO ESTABLECIDO]');
    }
    
    // Verificar otros campos importantes
    console.log(`${user.contactName ? '✅' : '❌'} Nombre contacto: ${user.contactName || '[NO ESTABLECIDO]'}`);
    console.log(`${user.website ? '✅' : '❌'} Sitio web: ${user.website || '[NO ESTABLECIDO]'}`);
    console.log(`${user.address ? '✅' : '❌'} Dirección: ${user.address || '[NO ESTABLECIDO]'}`);
    
    // Verificar si hay datos en JSON companyInfo
    if (user.companyInfo && Object.keys(user.companyInfo).length > 0) {
      console.log('\n===== DATOS EN companyInfo (JSON) =====');
      console.log(JSON.stringify(user.companyInfo, null, 2));
    }
    
    console.log('\n===== TODOS LOS CAMPOS DEL USUARIO =====');
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

// Ejecutar la función con el email especificado
const email = process.argv[2] || 'prueba4@gmail.com';
checkUserData(email);
