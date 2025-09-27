/**
 * Script para eliminar todas las referencias a voces que no sean Isidora
 * y configurar correctamente Isidora en todo el proyecto
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixAllVoicesToIsidora() {
    console.log('🔧 Eliminando todas las voces que no sean Isidora...');
    
    try {
        // 1. Actualizar base de datos
        console.log('\n📋 1. ACTUALIZANDO BASE DE DATOS:');
        
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                email: true,
                companyName: true,
                callConfig: true
            }
        });
        
        for (const client of clients) {
            if (client.callConfig && client.callConfig.voiceId !== 'isidora') {
                const oldVoiceId = client.callConfig.voiceId;
                
                const updatedCallConfig = {
                    ...client.callConfig,
                    voiceId: 'isidora',
                    language: 'es-ES'
                };
                
                await prisma.client.update({
                    where: { id: client.id },
                    data: { callConfig: updatedCallConfig }
                });
                
                console.log(`   ✅ ${client.companyName}: ${oldVoiceId} → isidora`);
            }
        }
        
        // 2. Verificar cambios en BD
        const updatedClients = await prisma.client.findMany({
            where: {
                callConfig: { path: ['voiceId'], equals: 'isidora' }
            },
            select: {
                companyName: true,
                callConfig: true
            }
        });
        
        console.log(`\n✅ ${updatedClients.length} clientes ahora usan voiceId 'isidora'`);
        
        console.log('\n🎯 2. ARCHIVOS QUE NECESITAN CORRECCIÓN:');
        console.log('   - backend/src/websocket/twilioStreamHandler.js (3 referencias a ximena)');
        console.log('   - frontend/js/dashboard-simple-clean.js (6 referencias a ximena)');
        console.log('   - backend/src/routes/testAudio.js (1 referencia a ximena)');
        console.log('   - backend/src/services/azureTTSRestService.js (1 referencia a ximena)');
        
        console.log('\n💡 3. MAPEO CORRECTO DE VOCES:');
        console.log('   - Nombre interno: "isidora"');
        console.log('   - Nombre Azure: "es-ES-IsidoraMultilingualNeural"');
        console.log('   - Idioma: "es-ES"');
        
        console.log('\n✅ BASE DE DATOS ACTUALIZADA - Ahora se necesita corregir el código');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar corrección
fixAllVoicesToIsidora();
