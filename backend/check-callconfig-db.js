const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCallConfig() {
  try {
    console.log('🔍 Verificando configuración de llamadas en la base de datos...');
    
    const client = await prisma.client.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        email: true,
        companyName: true,
        callConfig: true,
        updatedAt: true
      }
    });
    
    if (!client) {
      console.log('❌ Cliente ID=1 no encontrado');
      return;
    }
    
    console.log('✅ Cliente encontrado:', client.email);
    console.log('🏢 Empresa:', client.companyName);
    console.log('🕐 Última actualización:', client.updatedAt);
    console.log('');
    console.log('📞 ===== CONFIGURACIÓN DE LLAMADAS COMPLETA =====');
    
    if (client.callConfig) {
      console.log('📞 callConfig existe:', typeof client.callConfig);
      console.log('📞 Contenido completo:');
      console.log(JSON.stringify(client.callConfig, null, 2));
      
      // Verificar campos específicos
      console.log('');
      console.log('📞 ===== CAMPOS ESPECÍFICOS =====');
      console.log('🎵 Saludo inicial (greeting):', client.callConfig.greeting || 'NO DEFINIDO');
      console.log('🗣️ Voz (voiceId):', client.callConfig.voiceId || 'NO DEFINIDO');
      console.log('🤖 Bot activado (enabled):', client.callConfig.enabled);
      console.log('🌐 Idioma (language):', client.callConfig.language || 'NO DEFINIDO');
      console.log('📋 Instrucciones (instructions):', client.callConfig.instructions || 'NO DEFINIDO');
      
    } else {
      console.log('❌ NO HAY callConfig guardado en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallConfig();
