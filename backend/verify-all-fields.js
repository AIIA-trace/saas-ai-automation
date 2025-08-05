const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colores para la consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Definición de todos los campos que deben existir
const EXPECTED_FIELDS = {
    // Campos directos del cliente
    client: [
        'id', 'email', 'companyName', 'companyDescription', 'industry', 
        'phone', 'website', 'address', 'contactName', 'language'
    ],
    
    // Campos en botConfig JSON
    botConfig: {
        basic: ['name', 'personality', 'welcomeMessage'],
        callConfig: ['enabled', 'language', 'voiceId', 'greeting', 'recordCalls'],
        aiConfig: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty'],
        other: ['faqs', 'contextFiles']
    },
    
    // Campos en companyInfo JSON
    companyInfo: ['name', 'description', 'sector', 'phone', 'email', 'website', 'address'],
    
    // Campos en emailConfig JSON
    emailConfig: [
        'enabled', 'provider', 'outgoingEmail', 'recipientEmail', 'forwardRules',
        'autoReply', 'autoReplyMessage', 'language', 'emailSignature', 'emailConsent',
        'imapServer', 'imapPort', 'smtpServer', 'smtpPort', 'useSSL'
    ]
};

async function verifyClientStructure() {
    log('\n🔍 VERIFICANDO ESTRUCTURA DE CLIENTES EN BASE DE DATOS', 'bold');
    log('=' .repeat(60), 'blue');
    
    try {
        // Obtener un cliente de ejemplo (el primero)
        const sampleClient = await prisma.client.findFirst({
            select: {
                id: true,
                email: true,
                companyName: true,
                companyDescription: true,
                industry: true,
                phone: true,
                website: true,
                address: true,
                contactName: true,
                language: true,
                botConfig: true,
                companyInfo: true,
                emailConfig: true,
                createdAt: true
            }
        });

        if (!sampleClient) {
            log('❌ No se encontraron clientes en la base de datos', 'red');
            return false;
        }

        log(`✅ Cliente de muestra encontrado: ${sampleClient.email}`, 'green');
        
        // Verificar campos directos del cliente
        log('\n📋 VERIFICANDO CAMPOS DIRECTOS DEL CLIENTE:', 'yellow');
        let directFieldsOk = 0;
        let directFieldsTotal = EXPECTED_FIELDS.client.length;
        
        EXPECTED_FIELDS.client.forEach(field => {
            const value = sampleClient[field];
            const exists = value !== null && value !== undefined;
            const status = exists ? '✅' : '❌';
            const displayValue = exists ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NULL/UNDEFINED';
            
            log(`  ${status} ${field}: ${displayValue}`, exists ? 'green' : 'red');
            if (exists) directFieldsOk++;
        });
        
        log(`\n📊 Campos directos: ${directFieldsOk}/${directFieldsTotal} (${Math.round(directFieldsOk/directFieldsTotal*100)}%)`, directFieldsOk === directFieldsTotal ? 'green' : 'yellow');

        // Verificar botConfig
        log('\n🤖 VERIFICANDO BOTCONFIG:', 'yellow');
        let botConfigOk = 0;
        let botConfigTotal = 0;
        
        if (sampleClient.botConfig && typeof sampleClient.botConfig === 'object') {
            // Campos básicos
            log('  📝 Campos básicos:');
            EXPECTED_FIELDS.botConfig.basic.forEach(field => {
                botConfigTotal++;
                const value = sampleClient.botConfig[field];
                const exists = value !== null && value !== undefined;
                const status = exists ? '✅' : '❌';
                log(`    ${status} ${field}: ${exists ? value : 'NULL/UNDEFINED'}`, exists ? 'green' : 'red');
                if (exists) botConfigOk++;
            });
            
            // CallConfig
            log('  📞 CallConfig:');
            if (sampleClient.botConfig.callConfig) {
                EXPECTED_FIELDS.botConfig.callConfig.forEach(field => {
                    botConfigTotal++;
                    const value = sampleClient.botConfig.callConfig[field];
                    const exists = value !== null && value !== undefined;
                    const status = exists ? '✅' : '❌';
                    log(`    ${status} callConfig.${field}: ${exists ? value : 'NULL/UNDEFINED'}`, exists ? 'green' : 'red');
                    if (exists) botConfigOk++;
                });
            } else {
                log('    ❌ callConfig no existe', 'red');
                botConfigTotal += EXPECTED_FIELDS.botConfig.callConfig.length;
            }
            
            // AIConfig
            log('  🧠 AIConfig:');
            if (sampleClient.botConfig.aiConfig) {
                EXPECTED_FIELDS.botConfig.aiConfig.forEach(field => {
                    botConfigTotal++;
                    const value = sampleClient.botConfig.aiConfig[field];
                    const exists = value !== null && value !== undefined;
                    const status = exists ? '✅' : '❌';
                    log(`    ${status} aiConfig.${field}: ${exists ? value : 'NULL/UNDEFINED'}`, exists ? 'green' : 'red');
                    if (exists) botConfigOk++;
                });
            } else {
                log('    ❌ aiConfig no existe', 'red');
                botConfigTotal += EXPECTED_FIELDS.botConfig.aiConfig.length;
            }
            
            // Otros campos
            log('  📁 Otros campos:');
            EXPECTED_FIELDS.botConfig.other.forEach(field => {
                botConfigTotal++;
                const value = sampleClient.botConfig[field];
                const exists = value !== null && value !== undefined;
                const status = exists ? '✅' : '❌';
                const displayValue = exists ? (typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : value) : 'NULL/UNDEFINED';
                log(`    ${status} ${field}: ${displayValue}`, exists ? 'green' : 'red');
                if (exists) botConfigOk++;
            });
            
        } else {
            log('  ❌ botConfig no existe o no es un objeto', 'red');
            botConfigTotal = Object.values(EXPECTED_FIELDS.botConfig).flat().length;
        }
        
        log(`\n📊 BotConfig: ${botConfigOk}/${botConfigTotal} (${Math.round(botConfigOk/botConfigTotal*100)}%)`, botConfigOk === botConfigTotal ? 'green' : 'yellow');

        // Verificar companyInfo
        log('\n🏢 VERIFICANDO COMPANYINFO:', 'yellow');
        let companyInfoOk = 0;
        let companyInfoTotal = EXPECTED_FIELDS.companyInfo.length;
        
        if (sampleClient.companyInfo && typeof sampleClient.companyInfo === 'object') {
            EXPECTED_FIELDS.companyInfo.forEach(field => {
                const value = sampleClient.companyInfo[field];
                const exists = value !== null && value !== undefined;
                const status = exists ? '✅' : '❌';
                log(`  ${status} ${field}: ${exists ? value : 'NULL/UNDEFINED'}`, exists ? 'green' : 'red');
                if (exists) companyInfoOk++;
            });
        } else {
            log('  ❌ companyInfo no existe o no es un objeto', 'red');
        }
        
        log(`\n📊 CompanyInfo: ${companyInfoOk}/${companyInfoTotal} (${Math.round(companyInfoOk/companyInfoTotal*100)}%)`, companyInfoOk === companyInfoTotal ? 'green' : 'yellow');

        // Verificar emailConfig
        log('\n📧 VERIFICANDO EMAILCONFIG:', 'yellow');
        let emailConfigOk = 0;
        let emailConfigTotal = EXPECTED_FIELDS.emailConfig.length;
        
        if (sampleClient.emailConfig && typeof sampleClient.emailConfig === 'object') {
            EXPECTED_FIELDS.emailConfig.forEach(field => {
                const value = sampleClient.emailConfig[field];
                const exists = value !== null && value !== undefined;
                const status = exists ? '✅' : '❌';
                log(`  ${status} ${field}: ${exists ? value : 'NULL/UNDEFINED'}`, exists ? 'green' : 'red');
                if (exists) emailConfigOk++;
            });
        } else {
            log('  ❌ emailConfig no existe o no es un objeto', 'red');
        }
        
        log(`\n📊 EmailConfig: ${emailConfigOk}/${emailConfigTotal} (${Math.round(emailConfigOk/emailConfigTotal*100)}%)`, emailConfigOk === emailConfigTotal ? 'green' : 'yellow');

        // Resumen final
        const totalOk = directFieldsOk + botConfigOk + companyInfoOk + emailConfigOk;
        const totalFields = directFieldsTotal + botConfigTotal + companyInfoTotal + emailConfigTotal;
        const overallPercentage = Math.round(totalOk/totalFields*100);
        
        log('\n' + '=' .repeat(60), 'blue');
        log('📊 RESUMEN FINAL:', 'bold');
        log(`✅ Campos funcionando: ${totalOk}/${totalFields}`, 'green');
        log(`📈 Porcentaje de éxito: ${overallPercentage}%`, overallPercentage >= 90 ? 'green' : overallPercentage >= 70 ? 'yellow' : 'red');
        
        if (overallPercentage >= 90) {
            log('🎉 EXCELENTE: El sistema está muy bien configurado', 'green');
        } else if (overallPercentage >= 70) {
            log('⚠️ ACEPTABLE: Hay algunos campos que necesitan atención', 'yellow');
        } else {
            log('❌ CRÍTICO: Muchos campos no están funcionando correctamente', 'red');
        }
        
        return overallPercentage >= 90;

    } catch (error) {
        log(`❌ Error durante la verificación: ${error.message}`, 'red');
        log(`Stack trace: ${error.stack}`, 'red');
        return false;
    }
}

async function testFieldConsistency() {
    log('\n🔄 PROBANDO CONSISTENCIA DE CAMPOS', 'bold');
    log('=' .repeat(60), 'blue');
    
    try {
        // Obtener el primer cliente
        const client = await prisma.client.findFirst();
        if (!client) {
            log('❌ No hay clientes para probar', 'red');
            return false;
        }
        
        log(`🔍 Probando consistencia para cliente: ${client.email}`, 'blue');
        
        // Valores de prueba
        const testValues = {
            companyName: 'Test Company Consistency',
            industry: 'test_industry',
            botConfig: {
                name: 'Test Bot Consistency',
                personality: 'test_personality',
                callConfig: {
                    language: 'test-lang',
                    voiceId: 'test-voice',
                    greeting: 'Test greeting consistency'
                },
                aiConfig: {
                    temperature: 0.123,
                    maxTokens: 999,
                    topP: 0.456,
                    frequencyPenalty: 0.789,
                    presencePenalty: 0.321
                }
            },
            companyInfo: {
                name: 'Test Company Info',
                phone: '+34 123 456 789',
                email: 'test@consistency.com',
                sector: 'test_sector'
            },
            emailConfig: {
                provider: 'test_provider',
                outgoingEmail: 'test@outgoing.com',
                imapServer: 'test.imap.com',
                imapPort: 993,
                smtpServer: 'test.smtp.com',
                smtpPort: 587,
                useSSL: true,
                emailSignature: 'Test signature consistency'
            }
        };
        
        // Actualizar con valores de prueba
        log('📝 Actualizando con valores de prueba...', 'yellow');
        const updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: testValues
        });
        
        // Verificar que se guardaron correctamente
        log('🔍 Verificando que los valores se guardaron...', 'yellow');
        const verifiedClient = await prisma.client.findUnique({
            where: { id: client.id }
        });
        
        let consistencyErrors = 0;
        
        // Verificar campos directos
        if (verifiedClient.companyName !== testValues.companyName) {
            log(`❌ companyName inconsistente: esperado '${testValues.companyName}', actual '${verifiedClient.companyName}'`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ companyName consistente`, 'green');
        }
        
        if (verifiedClient.industry !== testValues.industry) {
            log(`❌ industry inconsistente: esperado '${testValues.industry}', actual '${verifiedClient.industry}'`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ industry consistente`, 'green');
        }
        
        // Verificar botConfig
        if (verifiedClient.botConfig?.name !== testValues.botConfig.name) {
            log(`❌ botConfig.name inconsistente`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ botConfig.name consistente`, 'green');
        }
        
        if (verifiedClient.botConfig?.callConfig?.greeting !== testValues.botConfig.callConfig.greeting) {
            log(`❌ botConfig.callConfig.greeting inconsistente`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ botConfig.callConfig.greeting consistente`, 'green');
        }
        
        if (Math.abs(verifiedClient.botConfig?.aiConfig?.temperature - testValues.botConfig.aiConfig.temperature) > 0.001) {
            log(`❌ botConfig.aiConfig.temperature inconsistente`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ botConfig.aiConfig.temperature consistente`, 'green');
        }
        
        // Verificar companyInfo
        if (verifiedClient.companyInfo?.phone !== testValues.companyInfo.phone) {
            log(`❌ companyInfo.phone inconsistente`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ companyInfo.phone consistente`, 'green');
        }
        
        // Verificar emailConfig
        if (verifiedClient.emailConfig?.emailSignature !== testValues.emailConfig.emailSignature) {
            log(`❌ emailConfig.emailSignature inconsistente`, 'red');
            consistencyErrors++;
        } else {
            log(`✅ emailConfig.emailSignature consistente`, 'green');
        }
        
        log(`\n📊 Errores de consistencia: ${consistencyErrors}`, consistencyErrors === 0 ? 'green' : 'red');
        
        return consistencyErrors === 0;
        
    } catch (error) {
        log(`❌ Error en test de consistencia: ${error.message}`, 'red');
        return false;
    }
}

async function main() {
    log('🚀 INICIANDO VERIFICACIÓN COMPLETA DE CAMPOS', 'bold');
    log('Este script verifica directamente en la base de datos que todos los campos funcionen correctamente\n', 'blue');
    
    try {
        // Verificar estructura
        const structureOk = await verifyClientStructure();
        
        // Probar consistencia
        const consistencyOk = await testFieldConsistency();
        
        // Resultado final
        log('\n' + '=' .repeat(60), 'blue');
        log('🏁 RESULTADO FINAL:', 'bold');
        
        if (structureOk && consistencyOk) {
            log('🎉 TODOS LOS TESTS PASARON - El sistema está funcionando correctamente', 'green');
            process.exit(0);
        } else {
            log('❌ ALGUNOS TESTS FALLARON - Hay problemas que necesitan atención', 'red');
            process.exit(1);
        }
        
    } catch (error) {
        log(`💥 Error fatal: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { verifyClientStructure, testFieldConsistency };
