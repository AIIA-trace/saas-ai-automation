const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCompleteVoiceFlow() {
    try {
        console.log('🔍 ===== ANÁLISIS COMPLETO DEL FLUJO DE CONFIGURACIÓN DE VOZ =====');
        
        // 1. Verificar configuración actual en BD
        console.log('\n1️⃣ Estado actual en la base de datos:');
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true,
                updatedAt: true
            }
        });

        if (!client) {
            console.log('❌ Cliente no encontrado');
            return;
        }

        console.log(`✅ Cliente: ${client.companyName} (ID: ${client.id})`);
        console.log(`📞 callConfig completo:`, JSON.stringify(client.callConfig, null, 2));

        // 2. Analizar estructura de voz
        console.log('\n2️⃣ Análisis de configuración de voz:');
        const config = client.callConfig || {};
        
        console.log('🔍 Campos de voz encontrados:');
        if (config.voiceId) {
            console.log(`   ✅ callConfig.voiceId: "${config.voiceId}"`);
        } else {
            console.log(`   ❌ callConfig.voiceId: NO ENCONTRADO`);
        }
        
        if (config.voiceSettings) {
            console.log(`   ✅ callConfig.voiceSettings:`, JSON.stringify(config.voiceSettings, null, 2));
            if (config.voiceSettings.azureVoice) {
                console.log(`   ✅ callConfig.voiceSettings.azureVoice: "${config.voiceSettings.azureVoice}"`);
            } else {
                console.log(`   ❌ callConfig.voiceSettings.azureVoice: NO ENCONTRADO`);
            }
        } else {
            console.log(`   ❌ callConfig.voiceSettings: NO ENCONTRADO`);
        }

        // 3. Simular lectura desde TwilioStreamHandler
        console.log('\n3️⃣ Simulación de lectura desde TwilioStreamHandler:');
        
        // Simular el código actual del TwilioStreamHandler
        const rawVoiceId = config.voiceId || 
                          config.voiceSettings?.azureVoice || 
                          'lola';
        const language = config.language || 'es-ES';
        
        console.log(`🎵 Raw voice leída: "${rawVoiceId}"`);
        console.log(`🌍 Idioma: "${language}"`);
        
        // Simular mapeo de voz
        const voiceMapping = {
            'lola': 'es-ES-LaiaNeural',
            'female': 'es-ES-EstrellaNeural',
            'male': 'es-ES-DarioNeural',
            'dario': 'es-ES-DarioNeural',
            'estrella': 'es-ES-EstrellaNeural'
        };
        
        const normalizedVoiceId = rawVoiceId.toLowerCase();
        let mappedVoice;
        
        if (normalizedVoiceId.includes('-') && normalizedVoiceId.includes('neural')) {
            mappedVoice = rawVoiceId;
            console.log(`🎵 Voz ya en formato Azure: "${mappedVoice}"`);
        } else if (voiceMapping[normalizedVoiceId]) {
            mappedVoice = voiceMapping[normalizedVoiceId];
            console.log(`🎵 Voz mapeada: "${rawVoiceId}" → "${mappedVoice}"`);
        } else {
            mappedVoice = 'es-ES-DarioNeural';
            console.log(`⚠️ Voz no encontrada en mapeo, usando default: "${mappedVoice}"`);
        }

        // 4. Verificar qué envía el frontend
        console.log('\n4️⃣ Análisis del frontend (dashboard-simple-clean.js):');
        console.log('📤 El frontend debería enviar:');
        console.log('   - callConfig.voiceId desde elemento #azureVoiceSelect');
        console.log('   - callConfig.language desde elemento #call_language');
        console.log('   - callConfig.greeting desde elemento #call_greeting');

        // 5. Verificar qué guarda el backend
        console.log('\n5️⃣ Análisis del backend (api.js):');
        console.log('💾 El backend tiene dos flujos:');
        console.log('   A) Flujo directo: req.body.callConfig → updateData.callConfig');
        console.log('   B) Flujo de voiceConfig: crea callConfig.voiceSettings.azureVoice');
        console.log('');
        console.log('🔍 Problema identificado:');
        console.log('   - Frontend envía callConfig.voiceId');
        console.log('   - Backend puede sobrescribir con voiceSettings.azureVoice');
        console.log('   - TwilioStreamHandler lee de ambos lugares');

        // 6. Recomendaciones
        console.log('\n6️⃣ Recomendaciones para corregir:');
        console.log('   1. Unificar el campo de voz en callConfig.voiceId');
        console.log('   2. Eliminar el flujo duplicado de voiceSettings');
        console.log('   3. Asegurar que TwilioStreamHandler lea solo de callConfig.voiceId');
        console.log('   4. Verificar que el mapeo funcione correctamente');

        // 7. Test de mapeo
        console.log('\n7️⃣ Test de mapeo de voces:');
        const testVoices = ['lola', 'dario', 'female', 'male', 'es-ES-LaiaNeural', 'invalid'];
        testVoices.forEach(voice => {
            const normalized = voice.toLowerCase();
            let result;
            
            if (normalized.includes('-') && normalized.includes('neural')) {
                result = voice;
            } else if (voiceMapping[normalized]) {
                result = voiceMapping[normalized];
            } else {
                result = 'es-ES-DarioNeural (default)';
            }
            
            console.log(`   "${voice}" → "${result}"`);
        });

    } catch (error) {
        console.error('❌ Error en análisis:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugCompleteVoiceFlow();
