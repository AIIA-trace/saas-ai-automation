/**
 * Script para configurar el sábado con horario de 24 horas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableSaturday24h() {
    console.log('🔧 Configurando sábado para funcionar 24 horas...');
    
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
        console.log('📋 Configuración actual del sábado:', JSON.stringify(client.businessHours?.saturday, null, 2));
        
        // Crear nueva configuración con sábado 24h
        const updatedBusinessHours = {
            ...client.businessHours,
            saturday: {
                enabled: true,
                start: '00:00',  // Desde medianoche
                end: '23:59'     // Hasta antes de medianoche
            }
        };
        
        console.log('🔧 Nueva configuración del sábado (24 horas):');
        console.log(JSON.stringify(updatedBusinessHours.saturday, null, 2));
        
        // Actualizar en la base de datos
        const updatedClient = await prisma.client.update({
            where: { email: 'javisanher99@gmail.com' },
            data: {
                businessHours: updatedBusinessHours,
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
        
        const todayConfig = updatedBusinessHours[todayName];
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
        console.log('   ✅ Sábado configurado para 24 horas (00:00 - 23:59)');
        console.log('   ✅ Bot disponible todo el sábado sin restricciones');
        
        // Mostrar configuración completa de la semana
        console.log('\n📅 CONFIGURACIÓN COMPLETA DE LA SEMANA:');
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const allDaysEs = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        allDays.forEach((day, index) => {
            const dayConfig = updatedBusinessHours[day];
            const dayNameEs = allDaysEs[index];
            
            if (dayConfig && dayConfig.enabled) {
                console.log(`   ${dayNameEs}: ✅ HABILITADO (${dayConfig.start} - ${dayConfig.end})`);
            } else {
                console.log(`   ${dayNameEs}: ❌ DESHABILITADO`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error actualizando horarios comerciales:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la configuración
enableSaturday24h();
