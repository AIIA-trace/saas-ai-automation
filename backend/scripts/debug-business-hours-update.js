/**
 * Script para debuggear la actualización de horarios comerciales
 * Simula exactamente lo que hace el frontend cuando guardas "jueves y sábado"
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBusinessHoursUpdate() {
    console.log('🔍 Debuggeando actualización de horarios comerciales...');
    
    try {
        // 1. Obtener estado actual
        const email = 'javier.sanhez@javier.com';
        console.log(`📧 Buscando cliente: ${email}`);
        
        const currentClient = await prisma.client.findUnique({
            where: { email: email },
            select: {
                id: true,
                email: true,
                businessHoursConfig: true,
                updatedAt: true
            }
        });
        
        if (!currentClient) {
            console.log('❌ Cliente no encontrado');
            return;
        }
        
        console.log('📋 ESTADO ACTUAL:');
        console.log('   ID:', currentClient.id);
        console.log('   Última actualización:', currentClient.updatedAt);
        console.log('   businessHoursConfig actual:', JSON.stringify(currentClient.businessHoursConfig, null, 2));
        
        // 2. Simular los datos que envía el frontend para "jueves y sábado"
        const newBusinessHoursConfig = {
            enabled: true,
            workingDays: ['thursday', 'saturday'],  // Jueves y sábado
            openingTime: '09:00',
            closingTime: '18:00'
        };
        
        console.log('\n📤 DATOS QUE DEBERÍA ENVIAR EL FRONTEND:');
        console.log(JSON.stringify(newBusinessHoursConfig, null, 2));
        
        // 3. Simular la actualización exacta que hace el backend
        console.log('\n🔄 SIMULANDO ACTUALIZACIÓN...');
        
        const updateData = {
            businessHoursConfig: newBusinessHoursConfig
        };
        
        console.log('📊 updateData preparado:', JSON.stringify(updateData, null, 2));
        
        // 4. Ejecutar la actualización
        const updatedClient = await prisma.client.update({
            where: { id: currentClient.id },
            data: updateData
        });
        
        console.log('\n✅ ACTUALIZACIÓN COMPLETADA');
        console.log('📋 NUEVO ESTADO:');
        console.log('   Última actualización:', updatedClient.updatedAt);
        console.log('   businessHoursConfig nuevo:', JSON.stringify(updatedClient.businessHoursConfig, null, 2));
        
        // 5. Verificar que los cambios se aplicaron correctamente
        console.log('\n🔍 VERIFICACIÓN:');
        console.log('   ¿Habilitado?', updatedClient.businessHoursConfig?.enabled ? '✅ SÍ' : '❌ NO');
        console.log('   Días esperados: thursday, saturday');
        console.log('   Días guardados:', updatedClient.businessHoursConfig?.workingDays?.join(', ') || 'ninguno');
        
        const expectedDays = ['thursday', 'saturday'];
        const actualDays = updatedClient.businessHoursConfig?.workingDays || [];
        const daysMatch = JSON.stringify(expectedDays.sort()) === JSON.stringify(actualDays.sort());
        
        console.log('   ¿Días coinciden?', daysMatch ? '✅ SÍ' : '❌ NO');
        
        if (!daysMatch) {
            console.log('   🚨 DISCREPANCIA DETECTADA:');
            console.log('     Esperado:', expectedDays);
            console.log('     Real:', actualDays);
        }
        
        // 6. Verificar en la base de datos directamente
        console.log('\n🔍 VERIFICACIÓN DIRECTA EN BD:');
        const verifyClient = await prisma.client.findUnique({
            where: { id: currentClient.id },
            select: { businessHoursConfig: true }
        });
        
        console.log('   BD dice:', JSON.stringify(verifyClient.businessHoursConfig, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar el debug
debugBusinessHoursUpdate();
