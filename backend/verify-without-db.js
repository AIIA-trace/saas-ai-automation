// Verificación sin conexión a base de datos - Solo análisis de código
const fs = require('fs');
const path = require('path');

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

// Leer y analizar el código del backend
function analyzeBackendCode() {
    log('\n🔍 ANALIZANDO CÓDIGO DEL BACKEND', 'bold');
    log('=' .repeat(60), 'blue');
    
    try {
        const apiFilePath = path.join(__dirname, 'src', 'routes', 'api.js');
        const apiCode = fs.readFileSync(apiFilePath, 'utf8');
        
        // Buscar el endpoint PUT /api/config/bot
        const putBotConfigMatch = apiCode.match(/router\.put\(['"`]\/config\/bot['"`][\s\S]*?(?=router\.|$)/);
        
        if (!putBotConfigMatch) {
            log('❌ No se encontró el endpoint PUT /config/bot', 'red');
            return false;
        }
        
        const putBotConfigCode = putBotConfigMatch[0];
        
        // Verificar que procesa los campos que necesitamos
        const fieldsToCheck = [
            'companyName',
            'companyPhone', 
            'companyEmail',
            'companySector',
            'botName',
            'botPersonality',
            'callConfig',
            'aiConfig',
            'emailConfig'
        ];
        
        let foundFields = 0;
        let missingFields = [];
        
        fieldsToCheck.forEach(field => {
            if (putBotConfigCode.includes(field)) {
                log(`✅ Campo '${field}' encontrado en el código`, 'green');
                foundFields++;
            } else {
                log(`❌ Campo '${field}' NO encontrado en el código`, 'red');
                missingFields.push(field);
            }
        });
        
        log(`\n📊 Campos encontrados: ${foundFields}/${fieldsToCheck.length}`, foundFields === fieldsToCheck.length ? 'green' : 'red');
        
        if (missingFields.length > 0) {
            log(`❌ Campos faltantes: ${missingFields.join(', ')}`, 'red');
        }
        
        // Verificar que actualiza la base de datos
        const hasUpdate = putBotConfigCode.includes('prisma.client.update');
        log(`${hasUpdate ? '✅' : '❌'} Actualización de base de datos: ${hasUpdate ? 'ENCONTRADA' : 'NO ENCONTRADA'}`, hasUpdate ? 'green' : 'red');
        
        // Verificar manejo de errores
        const hasErrorHandling = putBotConfigCode.includes('try') && putBotConfigCode.includes('catch');
        log(`${hasErrorHandling ? '✅' : '❌'} Manejo de errores: ${hasErrorHandling ? 'IMPLEMENTADO' : 'NO IMPLEMENTADO'}`, hasErrorHandling ? 'green' : 'red');
        
        return foundFields === fieldsToCheck.length && hasUpdate && hasErrorHandling;
        
    } catch (error) {
        log(`❌ Error analizando backend: ${error.message}`, 'red');
        return false;
    }
}

// Analizar el código del frontend
function analyzeFrontendCode() {
    log('\n🔍 ANALIZANDO CÓDIGO DEL FRONTEND', 'bold');
    log('=' .repeat(60), 'blue');
    
    try {
        const dashboardPath = path.join(__dirname, '..', 'frontend', 'js', 'dashboard-simple-clean.js');
        const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
        
        // Buscar la función saveUnifiedConfig
        const saveConfigMatch = dashboardCode.match(/function saveUnifiedConfig[\s\S]*?(?=function|\n\s*$)/);
        
        if (!saveConfigMatch) {
            log('❌ No se encontró la función saveUnifiedConfig', 'red');
            return false;
        }
        
        const saveConfigCode = saveConfigMatch[0];
        
        // Verificar que envía los campos correctos
        const fieldsToCheck = [
            'companyName',
            'companyPhone',
            'companyEmail', 
            'companySector',
            'botName',
            'botPersonality',
            'callConfig',
            'aiConfig',
            'emailConfig'
        ];
        
        let foundFields = 0;
        let missingFields = [];
        
        fieldsToCheck.forEach(field => {
            if (saveConfigCode.includes(field)) {
                log(`✅ Campo '${field}' enviado desde frontend`, 'green');
                foundFields++;
            } else {
                log(`❌ Campo '${field}' NO enviado desde frontend`, 'red');
                missingFields.push(field);
            }
        });
        
        // Buscar la función loadBotConfiguration
        const loadConfigMatch = dashboardCode.match(/function loadBotConfiguration[\s\S]*?(?=function|\n\s*$)/);
        
        if (!loadConfigMatch) {
            log('❌ No se encontró la función loadBotConfiguration', 'red');
            return false;
        }
        
        const loadConfigCode = loadConfigMatch[0];
        
        // Verificar que carga los campos en el DOM
        const domFields = [
            'company_name',
            'main_phone',
            'contact_email',
            'industry',
            'bot_name',
            'bot_personality'
        ];
        
        let loadedFields = 0;
        domFields.forEach(field => {
            if (loadConfigCode.includes(field)) {
                log(`✅ Campo DOM '${field}' cargado en frontend`, 'green');
                loadedFields++;
            } else {
                log(`❌ Campo DOM '${field}' NO cargado en frontend`, 'red');
            }
        });
        
        log(`\n📊 Campos enviados: ${foundFields}/${fieldsToCheck.length}`, foundFields === fieldsToCheck.length ? 'green' : 'red');
        log(`📊 Campos DOM cargados: ${loadedFields}/${domFields.length}`, loadedFields === domFields.length ? 'green' : 'red');
        
        return foundFields === fieldsToCheck.length && loadedFields === domFields.length;
        
    } catch (error) {
        log(`❌ Error analizando frontend: ${error.message}`, 'red');
        return false;
    }
}

// Verificar problemas conocidos
function checkKnownIssues() {
    log('\n🚨 VERIFICANDO PROBLEMAS CONOCIDOS', 'bold');
    log('=' .repeat(60), 'blue');
    
    const issues = [];
    
    // 1. Verificar archivo .env
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        issues.push('❌ Archivo .env no existe');
        log('❌ Archivo .env no existe - La base de datos no funcionará', 'red');
    } else {
        log('✅ Archivo .env existe', 'green');
    }
    
    // 2. Verificar node_modules
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        issues.push('❌ node_modules no existe');
        log('❌ node_modules no existe - Ejecutar npm install', 'red');
    } else {
        log('✅ node_modules existe', 'green');
    }
    
    // 3. Verificar prisma client
    const prismaClientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
        issues.push('❌ Prisma client no instalado');
        log('❌ Prisma client no instalado', 'red');
    } else {
        log('✅ Prisma client instalado', 'green');
    }
    
    // 4. Verificar schema.prisma
    const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
        issues.push('❌ schema.prisma no existe');
        log('❌ schema.prisma no existe', 'red');
    } else {
        log('✅ schema.prisma existe', 'green');
        
        // Verificar que el schema tiene los campos necesarios
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        const hasClientModel = schemaContent.includes('model Client');
        const hasBotConfig = schemaContent.includes('botConfig');
        const hasCompanyInfo = schemaContent.includes('companyInfo');
        const hasEmailConfig = schemaContent.includes('emailConfig');
        
        log(`${hasClientModel ? '✅' : '❌'} Modelo Client: ${hasClientModel ? 'EXISTE' : 'NO EXISTE'}`, hasClientModel ? 'green' : 'red');
        log(`${hasBotConfig ? '✅' : '❌'} Campo botConfig: ${hasBotConfig ? 'EXISTE' : 'NO EXISTE'}`, hasBotConfig ? 'green' : 'red');
        log(`${hasCompanyInfo ? '✅' : '❌'} Campo companyInfo: ${hasCompanyInfo ? 'EXISTE' : 'NO EXISTE'}`, hasCompanyInfo ? 'green' : 'red');
        log(`${hasEmailConfig ? '✅' : '❌'} Campo emailConfig: ${hasEmailConfig ? 'EXISTE' : 'NO EXISTE'}`, hasEmailConfig ? 'green' : 'red');
        
        if (!hasClientModel) issues.push('❌ Modelo Client no definido en schema');
        if (!hasBotConfig) issues.push('❌ Campo botConfig no definido');
        if (!hasCompanyInfo) issues.push('❌ Campo companyInfo no definido');
        if (!hasEmailConfig) issues.push('❌ Campo emailConfig no definido');
    }
    
    return issues;
}

// Función principal
function main() {
    log('🚀 VERIFICACIÓN REAL - SIN CONEXIÓN A BASE DE DATOS', 'bold');
    log('Esta verificación analiza el código directamente para encontrar problemas\n', 'blue');
    
    // Analizar backend
    const backendOk = analyzeBackendCode();
    
    // Analizar frontend  
    const frontendOk = analyzeFrontendCode();
    
    // Verificar problemas conocidos
    const issues = checkKnownIssues();
    
    // Resultado final
    log('\n' + '=' .repeat(60), 'blue');
    log('🏁 RESULTADO FINAL:', 'bold');
    
    log(`📊 Backend: ${backendOk ? '✅ OK' : '❌ PROBLEMAS'}`, backendOk ? 'green' : 'red');
    log(`📊 Frontend: ${frontendOk ? '✅ OK' : '❌ PROBLEMAS'}`, frontendOk ? 'green' : 'red');
    log(`📊 Problemas encontrados: ${issues.length}`, issues.length === 0 ? 'green' : 'red');
    
    if (issues.length > 0) {
        log('\n🚨 PROBLEMAS DETECTADOS:', 'red');
        issues.forEach(issue => log(`  ${issue}`, 'red'));
    }
    
    log('\n💡 CONCLUSIÓN:', 'yellow');
    if (backendOk && frontendOk && issues.length === 0) {
        log('🎉 El código parece estar bien estructurado, pero hay problemas de configuración', 'green');
        log('🔧 Solución: Configurar .env y ejecutar npm install + prisma generate', 'yellow');
    } else {
        log('❌ Hay problemas en el código que necesitan ser corregidos', 'red');
        log('🔧 Revisa los errores específicos mostrados arriba', 'yellow');
    }
    
    // Mostrar exactamente por qué podría fallar
    log('\n🎯 POR QUÉ PODRÍA FALLAR EN PRODUCCIÓN:', 'bold');
    log('1. ❌ Variables de entorno no configuradas (.env faltante)', 'red');
    log('2. ❌ Base de datos no conectada o migrada', 'red');
    log('3. ❌ Dependencias no instaladas correctamente', 'red');
    log('4. ❌ Prisma client no generado', 'red');
    log('5. ❌ Posibles inconsistencias en mapeo de campos', 'red');
    
    return backendOk && frontendOk && issues.length === 0;
}

// Ejecutar
if (require.main === module) {
    const success = main();
    process.exit(success ? 0 : 1);
}

module.exports = { analyzeBackendCode, analyzeFrontendCode, checkKnownIssues };
