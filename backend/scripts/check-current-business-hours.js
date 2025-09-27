/**
 * Script para verificar la configuración actual de horarios comerciales
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentBusinessHours() {
    console.log('🔍 Verificando configuración actual de horarios comerciales...');
    
    try {
        // Buscar el cliente con el email actualizado
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHours: true,
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
        
        console.log('\n📋 CONFIGURACIÓN DE HORARIOS COMERCIALES:');
        
        if (!client.businessHours) {
            console.log('❌ No hay configuración de horarios comerciales (permitirá 24/7)');
            return;
        }
        
        console.log('✅ Configuración encontrada:');
        console.log(JSON.stringify(client.businessHours, null, 2));
        
        // Analizar la configuración día por día
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNamesEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        console.log('\n📅 ANÁLISIS POR DÍAS:');
        
        dayNames.forEach((day, index) => {
            const dayConfig = client.businessHours[day];
            const dayNameEs = dayNamesEs[index];
            
            if (dayConfig && dayConfig.enabled) {
                console.log(`   ${dayNameEs}: ✅ HABILITADO (${dayConfig.start || 'N/A'} - ${dayConfig.end || 'N/A'})`);
            } else {
                console.log(`   ${dayNameEs}: ❌ DESHABILITADO`);
            }
        });
        
        // Verificar día actual
        const now = new Date();
        const currentDay = now.getDay();
        const todayName = dayNames[currentDay];
        const todayNameEs = dayNamesEs[currentDay];
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        console.log(`\n🕒 ESTADO ACTUAL (${todayNameEs}):`);
        console.log(`   Hora actual: ${Math.floor(currentTime/100)}:${String(currentTime%100).padStart(2,'0')}`);
        
        const todayConfig = client.businessHours[todayName];
        if (!todayConfig || !todayConfig.enabled) {
            console.log('   Estado: ❌ BOT DESHABILITADO (día no habilitado)');
        } else {
            const startTime = parseInt(todayConfig.start?.replace(':', '') || '0000');
            const endTime = parseInt(todayConfig.end?.replace(':', '') || '2359');
            const isWithinHours = currentTime >= startTime && currentTime <= endTime;
            
            console.log(`   Horario del día: ${todayConfig.start} - ${todayConfig.end}`);
            console.log(`   Estado: ${isWithinHours ? '✅ BOT HABILITADO' : '❌ BOT DESHABILITADO (fuera de horario)'}`);
        }
        
    } catch (error) {
        console.error('❌ Error consultando la base de datos:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la verificación
checkCurrentBusinessHours();
