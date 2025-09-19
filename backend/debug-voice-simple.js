const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVoiceConfig() {
    try {
        console.log('🔍 VERIFICANDO CONFIGURACIÓN DE VOZ EN BD...');
        console.log('🕰️ Timestamp:', new Date().toISOString());
        
        // Obtener cliente principal
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                companyName: true,
                email: true,
                callConfig: true,
                updatedAt: true
            }
        });

        if (!client) {
            console.log('❌ Cliente no encontrado');
            return;
        }

        console.log(`\n✅ Cliente encontrado: ${client.companyName} (ID: ${client.id})`);
        console.log(`📧 Email: ${client.email}`);
        console.log(`🕐 Última actualización: ${client.updatedAt}`);
        
        console.log('\n📞 callConfig:');
        if (client.callConfig) {
            console.log(JSON.stringify(client.callConfig, null, 2));
            
            const config = client.callConfig;
            console.log('\n🎵 Análisis de voz:');
            console.log(`   - voiceId: ${config.voiceId || 'NO CONFIGURADO'}`);
            console.log(`   - language: ${config.language || 'NO CONFIGURADO'}`);
            console.log(`   - greeting: ${config.greeting ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
            console.log(`   - enabled: ${config.enabled || false}`);
            
            if (config.voiceSettings) {
                console.log('   - voiceSettings:');
                console.log(`     - azureVoice: ${config.voiceSettings.azureVoice || 'NO CONFIGURADO'}`);
            } else {
                console.log('   - voiceSettings: NO CONFIGURADO');
            }
        } else {
            console.log('❌ callConfig no encontrado');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkVoiceConfig();
