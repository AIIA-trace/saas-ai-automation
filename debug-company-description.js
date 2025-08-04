const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCompanyDescription() {
    console.log('🔍 DEBUGGING COMPANY DESCRIPTION DATA FLOW');
    console.log('==========================================\n');
    
    try {
        // Obtener todos los clientes para ver qué datos tienen
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                email: true,
                companyName: true,
                companyDescription: true,
                industry: true,
                phone: true,
                address: true,
                website: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5 // Solo los 5 más recientes
        });
        
        console.log(`📊 Encontrados ${clients.length} clientes en la base de datos:\n`);
        
        clients.forEach((client, index) => {
            console.log(`👤 CLIENTE ${index + 1}:`);
            console.log(`   📧 Email: ${client.email}`);
            console.log(`   🏢 Company Name: ${client.companyName || 'NULL'}`);
            console.log(`   📝 Company Description: ${client.companyDescription || 'NULL'}`);
            console.log(`   🏭 Industry: ${client.industry || 'NULL'}`);
            console.log(`   📞 Phone: ${client.phone || 'NULL'}`);
            console.log(`   📍 Address: ${client.address || 'NULL'}`);
            console.log(`   🌐 Website: ${client.website || 'NULL'}`);
            console.log(`   📅 Created: ${client.createdAt}`);
            console.log('   ----------------------------------------');
        });
        
        // Verificar si hay algún cliente con companyDescription NULL
        const clientsWithoutDescription = await prisma.client.count({
            where: {
                companyDescription: null
            }
        });
        
        const clientsWithDescription = await prisma.client.count({
            where: {
                companyDescription: {
                    not: null
                }
            }
        });
        
        console.log(`\n📈 ESTADÍSTICAS:`);
        console.log(`   ✅ Clientes CON descripción: ${clientsWithDescription}`);
        console.log(`   ❌ Clientes SIN descripción: ${clientsWithoutDescription}`);
        
        // Si hay un cliente específico para probar, usar su email
        if (process.argv[2]) {
            const testEmail = process.argv[2];
            console.log(`\n🎯 VERIFICANDO CLIENTE ESPECÍFICO: ${testEmail}`);
            
            const specificClient = await prisma.client.findUnique({
                where: { email: testEmail },
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    companyDescription: true,
                    industry: true,
                    phone: true,
                    address: true,
                    website: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            
            if (specificClient) {
                console.log('✅ Cliente encontrado:');
                console.log(JSON.stringify(specificClient, null, 2));
            } else {
                console.log('❌ Cliente no encontrado');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar el debug
debugCompanyDescription();
