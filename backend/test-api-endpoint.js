const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testApiEndpoint() {
  try {
    console.log('🔍 Simulando endpoint GET /api/client...');
    
    // Simular la consulta exacta del endpoint
    const client = await prisma.client.findUnique({
      where: { id: 1 },
      select: {
        // Datos de perfil
        id: true,
        email: true,
        companyName: true,
        contactName: true,
        phone: true,
        position: true,
        industry: true,
        address: true,
        website: true,
        createdAt: true,
        updatedAt: true,
        
        // Datos de suscripción
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        
        // Campos directos de configuración del bot (nuevo sistema)
        botName: true,
        botLanguage: true,
        welcomeMessage: true,
        confirmationMessage: true,
        botPersonality: true,
        companyInfo: true,
        emailConfig: true,
        callConfig: true,
        notificationConfig: true,
        businessHours: true,
        
        // FAQs y archivos de contexto
        faqs: true,
        contextFiles: true,
        
        // Números de teléfono asociados
        twilioNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!client) {
      console.log('❌ Cliente no encontrado');
      return;
    }

    console.log('✅ Cliente encontrado');
    console.log('📞 ===== CALLCONFIG EN RESPUESTA API =====');
    console.log('callConfig existe:', !!client.callConfig);
    
    if (client.callConfig) {
      console.log('callConfig tipo:', typeof client.callConfig);
      console.log('callConfig contenido:');
      console.log(JSON.stringify(client.callConfig, null, 2));
      
      console.log('');
      console.log('📞 ===== CAMPOS ESPECÍFICOS EN API =====');
      console.log('🎵 greeting:', client.callConfig.greeting || 'NO DEFINIDO');
      console.log('🗣️ voiceId:', client.callConfig.voiceId || 'NO DEFINIDO');
      console.log('🌐 language:', client.callConfig.language || 'NO DEFINIDO');
      console.log('🤖 enabled:', client.callConfig.enabled);
    } else {
      console.log('❌ callConfig es null/undefined en la respuesta');
    }

    console.log('');
    console.log('📊 ===== ESTRUCTURA COMPLETA DE RESPUESTA =====');
    console.log('Campos disponibles:', Object.keys(client));
    
    // Simular la respuesta exacta que devuelve el endpoint
    const apiResponse = {
      success: true,
      message: 'Datos del cliente obtenidos correctamente',
      data: client
    };

    console.log('');
    console.log('📤 ===== RESPUESTA SIMULADA DEL ENDPOINT =====');
    console.log('success:', apiResponse.success);
    console.log('data.callConfig existe:', !!apiResponse.data.callConfig);
    
    if (apiResponse.data.callConfig) {
      console.log('data.callConfig.greeting:', apiResponse.data.callConfig.greeting);
      console.log('data.callConfig.voiceId:', apiResponse.data.callConfig.voiceId);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApiEndpoint();
