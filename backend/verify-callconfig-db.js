const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCallConfigInDB() {
    try {
        console.log('🔍 ===== VERIFICANDO CONFIGURACIONES EN LA BASE DE DATOS =====');
        
        const testEmail = 'javisanher99@gmail.com';
        
        // Obtener datos completos del cliente
        console.log(`\n📊 Obteniendo datos completos para: ${testEmail}`);
        const client = await prisma.client.findUnique({
            where: { email: testEmail },
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true,
                businessHoursConfig: true,
                emailConfig: true,
                updatedAt: true
            }
        });

        if (!client) {
            console.log('❌ Cliente no encontrado');
            return;
        }

        console.log('✅ Cliente encontrado:');
        console.log(`   ID: ${client.id}`);
        console.log(`   Email: ${client.email}`);
        console.log(`   Empresa: ${client.companyName}`);
        console.log(`   Última actualización: ${client.updatedAt}`);

        // Verificar callConfig
        console.log('\n📞 ===== CONFIGURACIÓN DE LLAMADAS (callConfig) =====');
        if (client.callConfig) {
            console.log('✅ callConfig encontrado:');
            console.log(JSON.stringify(client.callConfig, null, 2));
            
            // Verificar campos específicos
            const config = client.callConfig;
            console.log('\n📋 Campos específicos:');
            console.log(`   Bot activo: ${config.enabled ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Grabación: ${config.recordCalls ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Transcripción: ${config.transcribeCalls ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Idioma: ${config.language || 'No especificado'}`);
            console.log(`   Tipo de voz: ${config.voiceId || 'No especificado'}`);
            console.log(`   Saludo: ${config.greeting ? config.greeting.substring(0, 50) + '...' : 'No especificado'}`);
        } else {
            console.log('❌ No hay configuración de llamadas guardada');
        }

        // Verificar businessHoursConfig para comparar
        console.log('\n🕐 ===== CONFIGURACIÓN DE HORARIOS COMERCIALES (businessHoursConfig) =====');
        if (client.businessHoursConfig) {
            console.log('✅ businessHoursConfig encontrado:');
            console.log(JSON.stringify(client.businessHoursConfig, null, 2));
        } else {
            console.log('❌ No hay configuración de horarios comerciales guardada');
        }

        // Verificar emailConfig para comparar
        console.log('\n📧 ===== CONFIGURACIÓN DE EMAILS (emailConfig) =====');
        if (client.emailConfig) {
            console.log('✅ emailConfig encontrado:');
            console.log(`   Habilitado: ${client.emailConfig.enabled ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Proveedor: ${client.emailConfig.provider || 'No especificado'}`);
            console.log(`   Email saliente: ${client.emailConfig.outgoingEmail || 'No especificado'}`);
            console.log(`   Respuesta automática: ${client.emailConfig.autoReply ? '✅ SÍ' : '❌ NO'}`);
        } else {
            console.log('❌ No hay configuración de emails guardada');
        }

        console.log('\n🎯 ===== RESUMEN =====');
        console.log(`✅ callConfig: ${client.callConfig ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`✅ businessHoursConfig: ${client.businessHoursConfig ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`✅ emailConfig: ${client.emailConfig ? 'PRESENTE' : 'AUSENTE'}`);

    } catch (error) {
        console.error('❌ Error verificando la base de datos:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyCallConfigInDB();
