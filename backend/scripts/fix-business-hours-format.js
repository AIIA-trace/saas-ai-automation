/**
 * Script para corregir el formato de horarios comerciales
 * Convierte del formato frontend al formato de base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixBusinessHoursFormat() {
    console.log('🔧 Corrigiendo formato de horarios comerciales...');
    
    try {
        // Obtener cliente actual
        const client = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHours: true
            }
        });
        
        if (!client) {
            console.log('❌ Cliente no encontrado');
            return;
        }
        
        console.log('✅ Cliente encontrado:', client.companyName);
        console.log('📋 Configuración actual:', JSON.stringify(client.businessHours, null, 2));
        
        // Crear nueva configuración en el formato correcto para habilitar sábado
        const newBusinessHours = {
            monday: {
                enabled: true,
                start: '09:00',
                end: '18:00'
            },
            tuesday: {
                enabled: true,
                start: '09:00',
                end: '18:00'
            },
            wednesday: {
                enabled: true,
                start: '09:00',
                end: '18:00'
            },
            thursday: {
                enabled: true,
                start: '09:00',
                end: '18:00'
            },
            friday: {
                enabled: true,
                start: '09:00',
                end: '18:00'
            },
            saturday: {
                enabled: true,  // ¡HABILITAR SÁBADO!
                start: '10:00',
                end: '14:00'
            },
            sunday: {
                enabled: false
            }
        };
        
        console.log('🔧 Nueva configuración (con sábado habilitado):');
        console.log(JSON.stringify(newBusinessHours, null, 2));
        
        // Actualizar en la base de datos
        const updatedClient = await prisma.client.update({
            where: { email: 'javisanher99@gmail.com' },
            data: {
                businessHours: newBusinessHours,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHours: true,
                updatedAt: true
            }
        });
        
        console.log('\n✅ ACTUALIZACIÓN COMPLETADA:');
        console.log(`   Cliente: ${updatedClient.companyName}`);
        console.log(`   Email: ${updatedClient.email}`);
        console.log(`   Actualizado: ${updatedClient.updatedAt}`);
        
        // Verificar estado actual
        const now = new Date();
        const currentDay = now.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNamesEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = dayNames[currentDay];
        const todayNameEs = dayNamesEs[currentDay];
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        console.log(`\n🕒 VERIFICACIÓN ACTUAL (${todayNameEs}):`);
        console.log(`   Hora actual: ${Math.floor(currentTime/100)}:${String(currentTime%100).padStart(2,'0')}`);
        
        const todayConfig = newBusinessHours[todayName];
        if (!todayConfig || !todayConfig.enabled) {
            console.log('   Estado: ❌ BOT DESHABILITADO (día no habilitado)');
        } else {
            const startTime = parseInt(todayConfig.start?.replace(':', '') || '0000');
            const endTime = parseInt(todayConfig.end?.replace(':', '') || '2359');
            const isWithinHours = currentTime >= startTime && currentTime <= endTime;
            
            console.log(`   Horario del día: ${todayConfig.start} - ${todayConfig.end}`);
            console.log(`   Estado: ${isWithinHours ? '✅ BOT HABILITADO' : '❌ BOT DESHABILITADO (fuera de horario)'}`);
        }
        
        console.log('\n🎯 RESUMEN DE CAMBIOS:');
        console.log('   ✅ Formato corregido al estándar de la base de datos');
        console.log('   ✅ Sábado habilitado (10:00 - 14:00)');
        console.log('   ✅ Lunes a viernes habilitados (09:00 - 18:00)');
        console.log('   ❌ Domingo deshabilitado');
        
    } catch (error) {
        console.error('❌ Error actualizando horarios comerciales:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la corrección
fixBusinessHoursFormat();
