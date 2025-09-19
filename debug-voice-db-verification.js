const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyVoiceConfiguration() {
    try {
        console.log('🔍 ===== VERIFICACIÓN DE CONFIGURACIÓN DE VOZ EN BASE DE DATOS =====');
        
        // 1. Obtener todos los clientes con callConfig
        console.log('\n1️⃣ Clientes con configuración de llamadas:');
        const clients = await prisma.client.findMany({
            where: {
                callConfig: {
                    not: null
                }
            },
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true,
                updatedAt: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (clients.length === 0) {
            console.log('❌ No se encontraron clientes con callConfig');
            return;
        }

        console.log(`✅ Encontrados ${clients.length} clientes con callConfig`);

        // 2. Analizar configuración de cada cliente
        clients.forEach((client, index) => {
            console.log(`\n${index + 1}. Cliente: ${client.companyName} (${client.email})`);
            console.log(`   ID: ${client.id}`);
            console.log(`   Última actualización: ${client.updatedAt}`);
            
            if (client.callConfig) {
                const config = client.callConfig;
                console.log('   📞 callConfig completo:');
                console.log(JSON.stringify(config, null, 4));
                
                // Verificar campos específicos de voz
                console.log('\n   🎵 Análisis de configuración de voz:');
                
                if (config.voiceId) {
                    console.log(`   ✅ voiceId: "${config.voiceId}"`);
                } else {
                    console.log(`   ❌ voiceId: NO CONFIGURADO`);
                }
                
                if (config.voiceSettings) {
                    console.log(`   ✅ voiceSettings:`, JSON.stringify(config.voiceSettings, null, 4));
                    if (config.voiceSettings.azureVoice) {
                        console.log(`   ✅ azureVoice: "${config.voiceSettings.azureVoice}"`);
                    }
                } else {
                    console.log(`   ❌ voiceSettings: NO CONFIGURADO`);
                }
                
                if (config.language) {
                    console.log(`   ✅ language: "${config.language}"`);
                } else {
                    console.log(`   ❌ language: NO CONFIGURADO`);
                }
                
                if (config.greeting) {
                    console.log(`   ✅ greeting: "${config.greeting.substring(0, 50)}..."`);
                } else {
                    console.log(`   ❌ greeting: NO CONFIGURADO`);
                }
                
                if (config.enabled !== undefined) {
                    console.log(`   ✅ enabled: ${config.enabled}`);
                } else {
                    console.log(`   ❌ enabled: NO CONFIGURADO`);
                }
            }
        });

        // 3. Verificar cliente específico si existe
        console.log('\n3️⃣ Verificación del cliente principal (javisanher99@gmail.com):');
        const mainClient = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true,
                updatedAt: true
            }
        });

        if (mainClient) {
            console.log(`✅ Cliente encontrado: ${mainClient.companyName}`);
            console.log(`📞 callConfig:`, JSON.stringify(mainClient.callConfig, null, 2));
            
            if (mainClient.callConfig) {
                const config = mainClient.callConfig;
                console.log('\n🔍 Análisis detallado:');
                console.log(`   - Bot habilitado: ${config.enabled ? 'SÍ' : 'NO'}`);
                console.log(`   - Voz configurada: ${config.voiceId || 'NO CONFIGURADA'}`);
                console.log(`   - Idioma: ${config.language || 'NO CONFIGURADO'}`);
                console.log(`   - Saludo personalizado: ${config.greeting ? 'SÍ' : 'NO'}`);
                
                if (config.voiceSettings) {
                    console.log(`   - Azure Voice: ${config.voiceSettings.azureVoice || 'NO CONFIGURADA'}`);
                }
            }
        } else {
            console.log('❌ Cliente principal no encontrado');
        }

        // 4. Verificar estructura esperada
        console.log('\n4️⃣ Estructura esperada de callConfig:');
        const expectedStructure = {
            enabled: 'boolean',
            voiceId: 'string (user-friendly name like "lola")',
            language: 'string (like "es-ES")',
            greeting: 'string (custom greeting text)',
            recordCalls: 'boolean',
            transcribeCalls: 'boolean',
            voiceSettings: {
                azureVoice: 'string (Azure TTS voice ID)'
            }
        };
        
        console.log(JSON.stringify(expectedStructure, null, 2));

        // 5. Recomendaciones
        console.log('\n5️⃣ Recomendaciones:');
        console.log('   ✅ Verificar que el frontend envía voiceId correctamente');
        console.log('   ✅ Verificar que el backend guarda voiceId en callConfig');
        console.log('   ✅ Verificar que TwilioStreamHandler lee voiceId correctamente');
        console.log('   ✅ Verificar que el mapeo de voces funciona correctamente');

    } catch (error) {
        console.error('❌ Error en verificación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyVoiceConfiguration();
