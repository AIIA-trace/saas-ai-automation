const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Creando usuario javisanher...');
    
    // Hashear contraseña
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const user = await prisma.client.create({
      data: {
        email: 'javisanher@gmail.com',
        password: hashedPassword,
        companyName: 'AIIA Trace',
        companyDescription: 'Empresa de automatización con IA',
        contactName: 'Javi Sanher',
        phone: '+34600000000',
        position: 'CEO',
        industry: 'Tecnología',
        website: 'https://aiia-trace.com',
        address: 'España',
        isActive: true,
        role: 'client',
        language: 'es',
        plan: 'trial',
        botLanguage: 'es',
        botName: 'Asistente Virtual',
        botPersonality: 'profesional y amigable',
        welcomeMessage: 'Hola, soy tu asistente virtual. ¿En qué puedo ayudarte?',
        confirmationMessage: 'Gracias por contactarnos. Te responderemos pronto.'
      }
    });
    
    console.log('✅ Usuario creado exitosamente!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Contraseña:', password);
    console.log('🏢 Empresa:', user.companyName);
    console.log('👤 ID:', user.id);
    console.log('📅 Creado:', user.createdAt);
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error.message);
    
    if (error.code === 'P2002') {
      console.log('ℹ️ El usuario ya existe, intentando actualizar...');
      
      try {
        const updatedUser = await prisma.client.update({
          where: { email: 'javisanher@gmail.com' },
          data: { 
            password: await bcrypt.hash('123456', 10),
            isActive: true 
          }
        });
        console.log('✅ Usuario actualizado:', updatedUser.email);
      } catch (updateError) {
        console.error('❌ Error actualizando:', updateError.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
