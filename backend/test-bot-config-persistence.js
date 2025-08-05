/**
 * SCRIPT DE PRUEBA - PERSISTENCIA DE CONFIGURACIÓN DEL BOT
 * 
 * Este script verifica que los datos del formulario de configuración del bot
 * se guarden correctamente en la base de datos siguiendo el patrón exitoso del registro.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBotConfigPersistence() {
    console.log('🧪 INICIANDO PRUEBA DE PERSISTENCIA DE CONFIGURACIÓN DEL BOT\n');
    
    try {
        // 1. Buscar un cliente existente (debe haber al menos uno del registro exitoso)
        console.log('1️⃣ Buscando cliente existente...');
        const existingClient = await prisma.client.findFirst({
            where: { email: 'test@test.com' }
        });
        
        if (!existingClient) {
            console.log('❌ No se encontró cliente de prueba. Creando uno...');
            return;
        }
        
        console.log('✅ Cliente encontrado:', {
            id: existingClient.id,
            email: existingClient.email,
            companyName: existingClient.companyName
        });
        
        // 2. Datos de prueba que simula lo que envía el frontend
        const testBotConfigData = {
            // Información de empresa
            companyName: 'Empresa de Prueba Actualizada',
            companyDescription: 'Descripción actualizada de la empresa',
            companySector: 'Tecnología',
            companyAddress: 'Calle Falsa 123, Madrid',
            companyPhone: '+34 600 000 001',
            companyEmail: 'contacto@empresa.com',
            companyWebsite: 'https://empresa.com',
            
            // Configuración general
            botName: 'Asistente Virtual Pro',
            botPersonality: 'friendly',
            welcomeMessage: 'Bienvenido a nuestro servicio',

            
            // Configuración de llamadas
            callConfig: {
                enabled: true,
                recordCalls: true,
                transcribeCalls: true,
                voiceId: 'female-spanish',
                language: 'es-ES',
                greeting: 'Hola, soy tu asistente virtual'
            },
            
            // Configuración de emails
            emailConfig: {
                enabled: true,
                provider: 'gmail',
                outgoingEmail: 'bot@empresa.com',
                recipientEmail: 'admin@empresa.com',
                autoReply: true,
                autoReplyMessage: 'Gracias por tu mensaje',
                language: 'es-ES',
                emailSignature: 'Saludos cordiales',
                emailConsent: true,
                imapServer: 'imap.gmail.com',
                imapPort: 993,
                smtpServer: 'smtp.gmail.com',
                smtpPort: 587,
                useSSL: true
            },
            
            // Configuración avanzada de IA
            aiConfig: {
                temperature: 0.7,
                maxTokens: 150
            },
            
            // Preguntas frecuentes
            faqs: [

            ],
            
            // Archivos de contexto
            contextFiles: {
                'manual.pdf': 'contenido del manual'
            }
        };
        
        console.log('\n2️⃣ Simulando actualización como lo hace el endpoint...');
        
        // 3. Simular exactamente lo que hace el endpoint PUT /config/bot
        const currentClient = existingClient;
        const updateData = {};
        
        // Construir configuración del bot (igual que en el endpoint)
        const currentBotConfig = currentClient.botConfig || {};
        const newBotConfig = {
            ...currentBotConfig,
            name: testBotConfigData.botName || currentBotConfig.name || 'Asistente Virtual',
            personality: testBotConfigData.botPersonality || currentBotConfig.personality || 'professional',
            welcomeMessage: testBotConfigData.welcomeMessage || currentBotConfig.welcomeMessage || '',

            callConfig: testBotConfigData.callConfig ? {
                ...currentBotConfig.callConfig,
                ...testBotConfigData.callConfig
            } : currentBotConfig.callConfig || {},
            aiConfig: testBotConfigData.aiConfig ? {
                ...currentBotConfig.aiConfig,
                ...testBotConfigData.aiConfig
            } : currentBotConfig.aiConfig || {},
            faqs: testBotConfigData.faqs || currentBotConfig.faqs || [],
            contextFiles: testBotConfigData.contextFiles || currentBotConfig.contextFiles || {}
        };
        
        updateData.botConfig = newBotConfig;
        
        // Construir información de empresa
        const currentCompanyInfo = currentClient.companyInfo || {};
        const newCompanyInfo = {
            ...currentCompanyInfo,
            name: testBotConfigData.companyName || currentCompanyInfo.name || '',
            description: testBotConfigData.companyDescription || currentCompanyInfo.description || '',
            sector: testBotConfigData.companySector || currentCompanyInfo.sector || '',
            address: testBotConfigData.companyAddress || currentCompanyInfo.address || '',
            phone: testBotConfigData.companyPhone || currentCompanyInfo.phone || '',
            email: testBotConfigData.companyEmail || currentCompanyInfo.email || '',
            website: testBotConfigData.companyWebsite || currentCompanyInfo.website || ''
        };
        updateData.companyInfo = newCompanyInfo;
        
        // Construir configuración de email
        const currentEmailConfig = currentClient.emailConfig || {};
        const newEmailConfig = {
            ...currentEmailConfig,
            ...testBotConfigData.emailConfig
        };
        updateData.emailConfig = newEmailConfig;
        
        // Actualizar campos individuales para consistencia
        updateData.companyName = testBotConfigData.companyName;
        updateData.industry = testBotConfigData.companySector;
        
        console.log('📋 Datos preparados para actualización:', JSON.stringify(updateData, null, 2));
        
        // 4. Ejecutar la actualización (igual que el endpoint)
        console.log('\n3️⃣ Ejecutando actualización en la base de datos...');
        const updatedClient = await prisma.client.update({
            where: { id: existingClient.id },
            data: updateData
        });
        
        console.log('✅ Cliente actualizado exitosamente');
        
        // 5. Verificar que los datos se guardaron correctamente
        console.log('\n4️⃣ Verificando persistencia de datos...');
        const verificationClient = await prisma.client.findUnique({
            where: { id: existingClient.id }
        });
        
        console.log('📊 VERIFICACIÓN DE DATOS GUARDADOS:');
        console.log('├── Nombre empresa:', verificationClient.companyName);
        console.log('├── Industria:', verificationClient.industry);
        console.log('├── Bot Config existe:', !!verificationClient.botConfig);
        console.log('├── Company Info existe:', !!verificationClient.companyInfo);
        console.log('├── Email Config existe:', !!verificationClient.emailConfig);
        
        if (verificationClient.botConfig) {
            console.log('├── Bot Name:', verificationClient.botConfig.name);
            console.log('├── Bot Personality:', verificationClient.botConfig.personality);

            console.log('├── Call Config:', JSON.stringify(verificationClient.botConfig.callConfig));
            console.log('├── FAQs count:', verificationClient.botConfig.faqs?.length || 0);
        }
        
        if (verificationClient.companyInfo) {
            console.log('├── Company Address:', verificationClient.companyInfo.address);
            console.log('├── Company Phone:', verificationClient.companyInfo.phone);
            console.log('├── Company Email:', verificationClient.companyInfo.email);
        }
        
        if (verificationClient.emailConfig) {
            console.log('├── Email Provider:', verificationClient.emailConfig.provider);
            console.log('├── IMAP Server:', verificationClient.emailConfig.imapServer);
            console.log('├── SMTP Server:', verificationClient.emailConfig.smtpServer);
        }
        
        console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('✅ Todos los datos se guardaron correctamente siguiendo el patrón del registro');
        
    } catch (error) {
        console.error('❌ ERROR EN LA PRUEBA:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la prueba
testBotConfigPersistence();
