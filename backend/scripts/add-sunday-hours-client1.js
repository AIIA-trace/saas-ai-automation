/**
 * Script para añadir horario comercial de domingo completo para cliente 1
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSundayHours() {
    console.log('🔧 Añadiendo horario comercial de domingo para cliente 1...');
    
    try {
        // 1. Verificar cliente actual
        const client = await prisma.client.findUnique({
            where: { id: 1 },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHours: true
            }
        });
        
        if (!client) {
            console.log('❌ Cliente 1 no encontrado');
            return;
        }
        
        console.log('✅ Cliente encontrado:');
        console.log('   ID:', client.id);
        console.log('   Empresa:', client.companyName);
        console.log('   Email:', client.email);
        
        // 2. Configuración actual
        console.log('\n📋 Configuración actual:');
        if (client.businessHours) {
            console.log(JSON.stringify(client.businessHours, null, 2));
        } else {
            console.log('   Sin configuración de horarios');
        }
        
        // 3. Nueva configuración con domingo incluido
        const newBusinessHours = {
            enabled: true,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            openingTime: '00:00',
            closingTime: '23:59',
            timezone: 'Europe/Madrid'
        };
        
        console.log('\n🆕 Nueva configuración:');
        console.log(JSON.stringify(newBusinessHours, null, 2));
        
        // 4. Actualizar en la base de datos
        const updatedClient = await prisma.client.update({
            where: { id: 1 },
            data: {
                businessHours: newBusinessHours
            },
            select: {
                id: true,
                companyName: true,
                businessHours: true,
                updatedAt: true
            }
        });
        
        console.log('\n✅ Cliente actualizado exitosamente:');
        console.log('   Empresa:', updatedClient.companyName);
        console.log('   Actualizado:', updatedClient.updatedAt);
        console.log('   Días habilitados:', updatedClient.businessHours.workingDays.join(', '));
        console.log('   Horario:', `${updatedClient.businessHours.openingTime} - ${updatedClient.businessHours.closingTime}`);
        
        console.log('\n🎉 ¡Domingo añadido exitosamente! El bot ahora funcionará 24/7 todos los días.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

addSundayHours();
