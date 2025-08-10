/**
 * Script para verificar los horarios comerciales guardados en la base de datos
 * para el usuario javier.sanhez@javier.com
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBusinessHours() {
    console.log('🔍 Verificando horarios comerciales en la base de datos...');
    
    try {
        // Buscar el cliente por email
        const email = 'javisanher99@gmail.com';
        console.log(`📧 Buscando cliente con email: ${email}`);
        
        const client = await prisma.client.findUnique({
            where: { email: email },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHoursConfig: true,
                createdAt: true,
                updatedAt: true
            }
        });
        
        if (!client) {
            console.log('❌ Cliente no encontrado con ese email');
            return;
        }
        
        console.log('✅ Cliente encontrado:');
        console.log('   ID:', client.id);
        console.log('   Email:', client.email);
        console.log('   Empresa:', client.companyName);
        console.log('   Creado:', client.createdAt);
        console.log('   Actualizado:', client.updatedAt);
        
        console.log('\n📋 HORARIOS COMERCIALES:');
        
        if (client.businessHoursConfig) {
            console.log('✅ businessHoursConfig encontrado:');
            console.log(JSON.stringify(client.businessHoursConfig, null, 2));
            
            // Verificar campos específicos
            const config = client.businessHoursConfig;
            console.log('\n🔍 DETALLES:');
            console.log('   Habilitado:', config.enabled ? '✅ SÍ' : '❌ NO');
            console.log('   Días laborables:', config.workingDays ? config.workingDays.join(', ') : 'No definidos');
            console.log('   Hora apertura:', config.openingTime || 'No definida');
            console.log('   Hora cierre:', config.closingTime || 'No definida');
            
            // Verificar si es configuración por defecto o personalizada
            const isDefault = (
                config.enabled === false &&
                JSON.stringify(config.workingDays) === JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) &&
                config.openingTime === '09:00' &&
                config.closingTime === '18:00'
            );
            
            if (isDefault) {
                console.log('\n📝 ESTADO: Configuración por defecto (no personalizada)');
            } else {
                console.log('\n📝 ESTADO: Configuración personalizada ✅');
            }
            
        } else {
            console.log('❌ No hay businessHoursConfig guardado');
            console.log('   El campo está vacío o es null');
        }
        
        // Verificar también otros clientes para comparar
        console.log('\n🔍 Verificando otros clientes con businessHoursConfig...');
        
        const clientsWithBusinessHours = await prisma.client.findMany({
            where: {
                businessHoursConfig: {
                    not: undefined
                }
            },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHoursConfig: true
            },
            take: 5
        });
        
        if (clientsWithBusinessHours.length > 0) {
            console.log(`✅ Encontrados ${clientsWithBusinessHours.length} clientes con horarios comerciales:`);
            clientsWithBusinessHours.forEach((c, index) => {
                console.log(`   ${index + 1}. ${c.email} (${c.companyName}) - Habilitado: ${c.businessHoursConfig?.enabled ? 'SÍ' : 'NO'}`);
            });
        } else {
            console.log('❌ No se encontraron clientes con businessHoursConfig');
        }
        
    } catch (error) {
        console.error('❌ Error consultando la base de datos:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la verificación
checkBusinessHours();
