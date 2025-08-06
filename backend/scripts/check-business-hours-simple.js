/**
 * Script simple para verificar horarios comerciales en la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBusinessHours() {
    console.log('🔍 Verificando horarios comerciales...');
    
    try {
        // 1. Verificar el cliente específico
        const email = 'javier.sanhez@javier.com';
        console.log(`📧 Buscando: ${email}`);
        
        const client = await prisma.client.findUnique({
            where: { email: email },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHoursConfig: true,
                updatedAt: true
            }
        });
        
        if (client) {
            console.log('✅ Cliente encontrado:');
            console.log('   ID:', client.id);
            console.log('   Empresa:', client.companyName);
            console.log('   Última actualización:', client.updatedAt);
            
            if (client.businessHoursConfig) {
                console.log('✅ Horarios comerciales guardados:');
                console.log(JSON.stringify(client.businessHoursConfig, null, 2));
            } else {
                console.log('❌ NO hay horarios comerciales guardados');
                console.log('   El campo businessHoursConfig está vacío');
            }
        } else {
            console.log('❌ Cliente no encontrado');
        }
        
        // 2. Verificar todos los clientes con businessHoursConfig
        console.log('\n🔍 Verificando TODOS los clientes...');
        
        const allClients = await prisma.client.findMany({
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHoursConfig: true
            }
        });
        
        console.log(`📊 Total de clientes en la base de datos: ${allClients.length}`);
        
        const clientsWithBusinessHours = allClients.filter(c => c.businessHoursConfig !== null);
        console.log(`📋 Clientes con horarios comerciales: ${clientsWithBusinessHours.length}`);
        
        if (clientsWithBusinessHours.length > 0) {
            console.log('\n✅ Clientes con horarios comerciales configurados:');
            clientsWithBusinessHours.forEach((c, index) => {
                const config = c.businessHoursConfig;
                console.log(`   ${index + 1}. ${c.email} (${c.companyName})`);
                console.log(`      Habilitado: ${config?.enabled ? 'SÍ' : 'NO'}`);
                console.log(`      Días: ${config?.workingDays?.join(', ') || 'No definidos'}`);
                console.log(`      Horario: ${config?.openingTime || '?'} - ${config?.closingTime || '?'}`);
                console.log('');
            });
        } else {
            console.log('❌ Ningún cliente tiene horarios comerciales configurados');
        }
        
        // 3. Verificar el cliente de test que usamos
        console.log('🧪 Verificando cliente de test (ID: 1)...');
        
        const testClient = await prisma.client.findUnique({
            where: { id: 1 },
            select: {
                id: true,
                email: true,
                companyName: true,
                businessHoursConfig: true
            }
        });
        
        if (testClient) {
            console.log('✅ Cliente de test encontrado:');
            console.log('   Email:', testClient.email);
            console.log('   Empresa:', testClient.companyName);
            
            if (testClient.businessHoursConfig) {
                console.log('✅ Tiene horarios comerciales configurados:');
                console.log(JSON.stringify(testClient.businessHoursConfig, null, 2));
            } else {
                console.log('❌ No tiene horarios comerciales');
            }
        } else {
            console.log('❌ Cliente de test no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkBusinessHours();
