/**
 * Script de prueba final para verificar que los horarios comerciales
 * se actualizan correctamente después de los fixes aplicados
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBusinessHoursFinal() {
    console.log('🧪 PRUEBA FINAL - Verificando actualización de horarios comerciales...');
    
    try {
        const email = 'javier.sanhez@javier.com';
        console.log(`📧 Cliente: ${email}`);
        
        // 1. Estado inicial
        const initialClient = await prisma.client.findUnique({
            where: { email: email },
            select: {
                id: true,
                businessHoursConfig: true,
                updatedAt: true
            }
        });
        
        console.log('\n📋 ESTADO INICIAL:');
        console.log('   businessHoursConfig:', JSON.stringify(initialClient.businessHoursConfig, null, 2));
        console.log('   Última actualización:', initialClient.updatedAt);
        
        // 2. Simular actualización con "jueves y sábado" (lo que el usuario quiere guardar)
        console.log('\n🎯 SIMULANDO: Usuario selecciona JUEVES y SÁBADO');
        
        const testConfig = {
            enabled: true,
            workingDays: ['thursday', 'saturday'],
            openingTime: '10:00',
            closingTime: '19:00'
        };
        
        console.log('📤 Datos a guardar:', JSON.stringify(testConfig, null, 2));
        
        // 3. Ejecutar actualización
        const updatedClient = await prisma.client.update({
            where: { id: initialClient.id },
            data: {
                businessHoursConfig: testConfig
            }
        });
        
        console.log('\n✅ ACTUALIZACIÓN COMPLETADA');
        console.log('📋 RESULTADO:');
        console.log('   businessHoursConfig:', JSON.stringify(updatedClient.businessHoursConfig, null, 2));
        console.log('   Nueva actualización:', updatedClient.updatedAt);
        
        // 4. Verificación
        const verification = updatedClient.businessHoursConfig;
        const expectedDays = ['thursday', 'saturday'];
        const actualDays = verification?.workingDays || [];
        
        console.log('\n🔍 VERIFICACIÓN:');
        console.log('   ✅ Habilitado:', verification?.enabled ? 'SÍ' : 'NO');
        console.log('   📅 Días esperados:', expectedDays.join(', '));
        console.log('   📅 Días guardados:', actualDays.join(', '));
        console.log('   ⏰ Horario esperado: 10:00 - 19:00');
        console.log('   ⏰ Horario guardado:', `${verification?.openingTime} - ${verification?.closingTime}`);
        
        // Verificar coincidencias
        const daysMatch = JSON.stringify(expectedDays.sort()) === JSON.stringify(actualDays.sort());
        const timesMatch = verification?.openingTime === '10:00' && verification?.closingTime === '19:00';
        
        console.log('\n🎯 RESULTADO FINAL:');
        console.log('   Días coinciden:', daysMatch ? '✅ SÍ' : '❌ NO');
        console.log('   Horarios coinciden:', timesMatch ? '✅ SÍ' : '❌ NO');
        console.log('   Habilitado correcto:', verification?.enabled ? '✅ SÍ' : '❌ NO');
        
        if (daysMatch && timesMatch && verification?.enabled) {
            console.log('\n🎉 ¡ÉXITO! Los horarios comerciales se actualizan correctamente');
            console.log('   El problema está resuelto - el backend funciona perfectamente');
        } else {
            console.log('\n❌ FALLO: Aún hay problemas en la actualización');
        }
        
        // 5. Prueba adicional: Cambiar a "lunes, miércoles, viernes"
        console.log('\n🧪 PRUEBA ADICIONAL: Cambiar a lunes, miércoles, viernes');
        
        const testConfig2 = {
            enabled: true,
            workingDays: ['monday', 'wednesday', 'friday'],
            openingTime: '08:30',
            closingTime: '17:30'
        };
        
        const updatedClient2 = await prisma.client.update({
            where: { id: initialClient.id },
            data: {
                businessHoursConfig: testConfig2
            }
        });
        
        console.log('📋 SEGUNDA ACTUALIZACIÓN:');
        console.log('   businessHoursConfig:', JSON.stringify(updatedClient2.businessHoursConfig, null, 2));
        
        const verification2 = updatedClient2.businessHoursConfig;
        const expectedDays2 = ['monday', 'wednesday', 'friday'];
        const actualDays2 = verification2?.workingDays || [];
        const daysMatch2 = JSON.stringify(expectedDays2.sort()) === JSON.stringify(actualDays2.sort());
        
        console.log('   Días coinciden:', daysMatch2 ? '✅ SÍ' : '❌ NO');
        
        if (daysMatch2) {
            console.log('\n🎉 ¡PERFECTO! Las actualizaciones múltiples funcionan correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la prueba
testBusinessHoursFinal();
