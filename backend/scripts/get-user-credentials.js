/**
 * Script para obtener las credenciales de usuario de la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getUserCredentials() {
    console.log('🔍 Obteniendo credenciales de usuario de la base de datos...');
    
    try {
        // Buscar todos los usuarios/clientes
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                email: true,
                password: true,
                companyName: true,
                contactName: true,
                role: true,
                isActive: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        
        if (clients.length === 0) {
            console.log('❌ No se encontraron usuarios en la base de datos');
            return;
        }
        
        console.log(`✅ Encontrados ${clients.length} usuario(s):\n`);
        
        clients.forEach((client, index) => {
            console.log(`👤 Usuario ${index + 1}:`);
            console.log(`   ID: ${client.id}`);
            console.log(`   Email: ${client.email}`);
            console.log(`   Contraseña: ${client.password}`);
            console.log(`   Empresa: ${client.companyName}`);
            console.log(`   Contacto: ${client.contactName}`);
            console.log(`   Rol: ${client.role}`);
            console.log(`   Activo: ${client.isActive ? 'Sí' : 'No'}`);
            console.log(`   Creado: ${client.createdAt}`);
            console.log('');
        });
        
        // Mostrar el usuario principal (probablemente el primero o el más reciente)
        const mainUser = clients.find(c => c.role === 'admin') || clients[0];
        
        console.log('🎯 CREDENCIALES PRINCIPALES:');
        console.log(`📧 Email: ${mainUser.email}`);
        console.log(`🔑 Contraseña: ${mainUser.password}`);
        console.log(`🏢 Empresa: ${mainUser.companyName}`);
        
    } catch (error) {
        console.error('❌ Error consultando la base de datos:', error.message);
        
        // Si hay error de conexión, mostrar información útil
        if (error.message.includes("Can't reach database server")) {
            console.log('\n💡 SUGERENCIA:');
            console.log('La base de datos no está disponible. Verifica:');
            console.log('1. Conexión a internet');
            console.log('2. Variables de entorno en .env');
            console.log('3. Estado del servidor de base de datos');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar la consulta
getUserCredentials();
