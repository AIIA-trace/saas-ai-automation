const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCompanyDescription() {
    try {
        console.log('🔍 DIAGNÓSTICO DE COMPANY DESCRIPTION EN BD');
        console.log('='.repeat(50));
        
        // Buscar tu usuario específico
        const client = await prisma.client.findUnique({
            where: { email: 'javier.sanhez@javier.com' },
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
        
        if (!client) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:');
        console.log('📧 Email:', client.email);
        console.log('🏢 Company Name:', client.companyName);
        console.log('📝 Company Description:', client.companyDescription || 'NULL/VACÍO');
        console.log('🏭 Industry:', client.industry);
        console.log('📞 Phone:', client.phone);
        console.log('📍 Address:', client.address);
        console.log('🌐 Website:', client.website);
        console.log('📅 Creado:', client.createdAt);
        console.log('🔄 Actualizado:', client.updatedAt);
        
        // Si no tiene companyDescription, agregarlo
        if (!client.companyDescription) {
            console.log('\n🛠️ ACTUALIZANDO COMPANY DESCRIPTION...');
            
            const updatedClient = await prisma.client.update({
                where: { id: client.id },
                data: {
                    companyDescription: 'Somos una empresa familiar de curtidos'
                }
            });
            
            console.log('✅ Company Description actualizado:', updatedClient.companyDescription);
        }
        
        // Verificar todos los campos que deberían cargarse
        console.log('\n📋 VERIFICACIÓN DE CAMPOS:');
        console.log('- companyName:', client.companyName ? '✅' : '❌');
        console.log('- companyDescription:', client.companyDescription ? '✅' : '❌');
        console.log('- industry:', client.industry ? '✅' : '❌');
        console.log('- phone:', client.phone ? '✅' : '❌');
        console.log('- address:', client.address ? '✅' : '❌');
        console.log('- website:', client.website ? '✅' : '❌');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

debugCompanyDescription();
