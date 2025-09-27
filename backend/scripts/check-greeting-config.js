/**
 * Script para verificar la configuración del saludo inicial
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGreetingConfig() {
    console.log('🔍 Verificando configuración del saludo inicial...');
    
    try {
        // Obtener cliente actual
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true
            }
        });
        
        if (!client) {
            console.log('❌ Cliente no encontrado');
            return;
        }
        
        console.log('✅ Cliente encontrado:', client.companyName);
        console.log('📋 CallConfig completo:', JSON.stringify(client.callConfig, null, 2));
        
        // Verificar saludo específicamente
        const greeting = client.callConfig?.greeting;
        console.log('\n🔊 ANÁLISIS DEL SALUDO:');
        console.log(`   Saludo existe: ${!!greeting}`);
        console.log(`   Saludo contenido: "${greeting}"`);
        console.log(`   Longitud: ${greeting?.length || 0} caracteres`);
        console.log(`   Es válido (>10 chars): ${greeting && greeting.length >= 10}`);
        
        // Verificar configuración de voz
        const voiceId = client.callConfig?.voiceId;
        const language = client.callConfig?.language;
        
        console.log('\n🎵 CONFIGURACIÓN DE VOZ:');
        console.log(`   VoiceId: "${voiceId}"`);
        console.log(`   Language: "${language}"`);
        
        // Verificar si está habilitado
        const enabled = client.callConfig?.enabled;
        console.log('\n⚙️ CONFIGURACIÓN GENERAL:');
        console.log(`   Bot habilitado: ${enabled}`);
        
        // Diagnóstico
        console.log('\n🔧 DIAGNÓSTICO:');
        if (!greeting) {
            console.log('❌ PROBLEMA: No hay saludo configurado');
        } else if (greeting.length < 10) {
            console.log('⚠️ PROBLEMA: Saludo muy corto (usará fallback)');
        } else {
            console.log('✅ Saludo configurado correctamente');
        }
        
        if (!enabled) {
            console.log('❌ PROBLEMA: Bot deshabilitado');
        } else {
            console.log('✅ Bot habilitado');
        }
        
        if (!voiceId) {
            console.log('⚠️ ADVERTENCIA: No hay voz configurada (usará default)');
        } else {
            console.log('✅ Voz configurada');
        }
        
    } catch (error) {
        console.error('❌ Error consultando la base de datos:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar verificación
checkGreetingConfig();
