/**
 * Script para cambiar la contraseña del usuario en la base de datos
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateUserPassword() {
    console.log('🔄 Actualizando contraseña del usuario...');
    
    try {
        // Verificar usuario actual
        const currentUser = await prisma.client.findUnique({
            where: { email: 'javisanher99@gmail.com' },
            select: {
                id: true,
                email: true,
                companyName: true,
                contactName: true
            }
        });
        
        if (!currentUser) {
            console.log('❌ Usuario con email javisanher99@gmail.com no encontrado');
            return;
        }
        
        console.log('✅ Usuario encontrado:');
        console.log(`   ID: ${currentUser.id}`);
        console.log(`   Email: ${currentUser.email}`);
        console.log(`   Empresa: ${currentUser.companyName}`);
        
        // Nueva contraseña
        const newPassword = 'asdasdasd';
        
        // Intentar encriptar la contraseña (si bcrypt está disponible)
        let hashedPassword;
        try {
            const saltRounds = 10;
            hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            console.log('🔐 Contraseña encriptada con bcrypt');
        } catch (bcryptError) {
            // Si bcrypt no está disponible, usar texto plano
            hashedPassword = newPassword;
            console.log('⚠️ bcrypt no disponible, usando contraseña en texto plano');
        }
        
        // Actualizar la contraseña
        const updatedUser = await prisma.client.update({
            where: { email: 'javisanher99@gmail.com' },
            data: { 
                password: hashedPassword,
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
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Nueva contraseña: ${newPassword}`);
        console.log(`   Empresa: ${updatedUser.companyName}`);
        console.log(`   Actualizado: ${updatedUser.updatedAt}`);
        
        console.log('\n✅ La contraseña ha sido cambiada exitosamente');
        
    } catch (error) {
        console.error('❌ Error actualizando la contraseña:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la actualización
updateUserPassword();
