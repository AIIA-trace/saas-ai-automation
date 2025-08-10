const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugFrontendCallConfig() {
    try {
        console.log('🔍 ===== DEPURANDO PROBLEMA DE CALLCONFIG EN FRONTEND =====');
        
        // Verificar estado actual en BD
        console.log('\n1️⃣ Estado actual en la base de datos:');
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                callConfig: true,
                updatedAt: true
            }
        });

        if (client) {
            console.log(`✅ Cliente ID: ${client.id}`);
            console.log(`📞 callConfig actual:`, client.callConfig);
            console.log(`🕐 Última actualización: ${client.updatedAt}`);
        }

        console.log('\n2️⃣ Análisis de los logs de Render:');
        console.log('❌ PROBLEMA IDENTIFICADO:');
        console.log('   - El backend SÍ recibe la petición PUT /client');
        console.log('   - El backend procesa businessHoursConfig correctamente');
        console.log('   - PERO NO HAY LOGS de callConfig siendo procesado');
        console.log('   - Esto significa que el frontend NO envía callConfig');

        console.log('\n3️⃣ Posibles causas:');
        console.log('   A) Los elementos HTML no existen cuando saveUnifiedConfig se ejecuta');
        console.log('   B) Los IDs de los elementos HTML no coinciden con los del JavaScript');
        console.log('   C) saveUnifiedConfig no se está ejecutando correctamente');
        console.log('   D) El objeto callConfig se construye pero no se incluye en el body del fetch');

        console.log('\n4️⃣ Configuración que debería haberse guardado (según la imagen):');
        const expectedCallConfig = {
            enabled: false,        // Bot desactivado (checkbox sin marcar)
            recordCalls: false,    // Grabación desactivada (checkbox sin marcar)
            transcribeCalls: false, // Transcripción desactivada (checkbox sin marcar)
            language: 'fr-FR',     // Francés seleccionado
            voiceId: 'female',     // Femenina seleccionada
            greeting: 'Gracias por llamar totex', // Saludo personalizado
            volume: '1.0',
            speed: '1.0',
            pitch: '1.0',
            useCustomVoice: false,
            customVoiceId: ''
        };

        console.log('📋 Configuración esperada:');
        console.log(JSON.stringify(expectedCallConfig, null, 2));

        console.log('\n5️⃣ Próximos pasos de depuración:');
        console.log('   1. Verificar que los elementos HTML existen con los IDs correctos');
        console.log('   2. Añadir logs de debug al frontend para ver qué se recopila');
        console.log('   3. Verificar que callConfig se incluye en el body del fetch');
        console.log('   4. Añadir logs específicos de callConfig en el backend');

    } catch (error) {
        console.error('❌ Error en depuración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugFrontendCallConfig();
