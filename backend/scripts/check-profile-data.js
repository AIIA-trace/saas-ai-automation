const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProfileData() {
    try {
        console.log('🔍 Verificando datos del perfil en la base de datos...');
        
        // Buscar el cliente con ID 3 (según los logs)
        const client = await prisma.client.findUnique({
            where: { id: 3 },
            select: {
                id: true,
                email: true,
                contactName: true,
                companyName: true,
                phone: true,
                position: true,
                address: true,
                website: true,
                industry: true,
                timezone: true,
                language: true,
                companyDescription: true,
                updatedAt: true
            }
        });

        if (!client) {
            console.log('❌ Cliente con ID 3 no encontrado');
            return;
        }

        console.log('✅ Cliente encontrado:');
        console.log('📧 Email:', client.email);
        console.log('👤 Nombre de contacto:', client.contactName);
        console.log('🏢 Nombre de empresa:', client.companyName);
        console.log('📞 Teléfono:', client.phone);
        console.log('💼 Cargo/Posición:', client.position);
        console.log('📍 Dirección:', client.address);
        console.log('🌐 Sitio web:', client.website);
        console.log('🏭 Industria:', client.industry);
        console.log('🌍 Zona horaria:', client.timezone);
        console.log('🗣️ Idioma:', client.language);
        console.log('📝 Descripción empresa:', client.companyDescription);
        console.log('🕐 Última actualización:', client.updatedAt);

        // Verificar si los datos coinciden con lo que se envió
        console.log('\n🔍 VERIFICACIÓN DE DATOS ENVIADOS:');
        console.log('Datos que se enviaron según logs:');
        console.log('- contactName: "Javier Sanchez Hernadez"');
        console.log('- position: "Director"');
        console.log('- email: "javisanher99@gmail.com"');
        console.log('- phone: "+34 647866656"');
        console.log('- companyName: "Intacon"');

        console.log('\nDatos guardados en BD:');
        console.log('- contactName:', `"${client.contactName}"`);
        console.log('- position:', `"${client.position}"`);
        console.log('- email:', `"${client.email}"`);
        console.log('- phone:', `"${client.phone}"`);
        console.log('- companyName:', `"${client.companyName}"`);

        // Verificar coincidencias
        const matches = {
            contactName: client.contactName === 'Javier Sanchez Hernadez',
            position: client.position === 'Director',
            email: client.email === 'javisanher99@gmail.com',
            phone: client.phone === '+34 647866656',
            companyName: client.companyName === 'Intacon'
        };

        console.log('\n✅ RESULTADOS DE VERIFICACIÓN:');
        Object.entries(matches).forEach(([field, match]) => {
            console.log(`${match ? '✅' : '❌'} ${field}: ${match ? 'COINCIDE' : 'NO COINCIDE'}`);
        });

        const allMatch = Object.values(matches).every(match => match);
        console.log(`\n${allMatch ? '🎉' : '⚠️'} RESULTADO FINAL: ${allMatch ? 'TODOS LOS DATOS SE GUARDARON CORRECTAMENTE' : 'HAY DISCREPANCIAS EN LOS DATOS'}`);

    } catch (error) {
        console.error('❌ Error al verificar datos del perfil:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkProfileData();
