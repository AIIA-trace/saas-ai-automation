/**
 * Script para cambiar el email del usuario en la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserEmail() {
    console.log('🔄 Actualizando email del usuario...');
    
    try {
        // Verificar usuario actual
        const currentUser = await prisma.client.findUnique({
            where: { email: 'info@intacon.es' },
            select: {
                id: true,
                email: true,
                companyName: true,
                contactName: true
            }
        });
        
        if (!currentUser) {
            console.log('❌ Usuario con email info@intacon.es no encontrado');
            return;
        }
        
        console.log('✅ Usuario actual encontrado:');
        console.log(`   ID: ${currentUser.id}`);
        console.log(`   Email actual: ${currentUser.email}`);
        console.log(`   Empresa: ${currentUser.companyName}`);
        
        // Verificar que el nuevo email no esté en uso
        const existingUser = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' }
        });
        
        if (existingUser) {
            console.log('⚠️ El email javisanher99@gmail.com ya está en uso por otro usuario');
            console.log(`   Usuario existente: ${existingUser.companyName} (ID: ${existingUser.id})`);
            return;
        }
        
        // Actualizar el email
        const updatedUser = await prisma.client.update({
            where: { email: 'info@intacon.es' },
            data: { 
                email: 'javisanher99@gmail.com',
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                companyName: true,
                contactName: true,
                updatedAt: true
            }
        });
        
        console.log('\n🎯 ACTUALIZACIÓN COMPLETADA:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Email nuevo: ${updatedUser.email}`);
        console.log(`   Empresa: ${updatedUser.companyName}`);
        console.log(`   Actualizado: ${updatedUser.updatedAt}`);
        
        console.log('\n✅ El email ha sido cambiado exitosamente a javisanher99@gmail.com');
        
    } catch (error) {
        console.error('❌ Error actualizando el email:', error.message);
        
        if (error.code === 'P2002') {
            console.log('💡 Error: El email ya está en uso por otro usuario');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la actualización
updateUserEmail();
