const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.client.update({
    where: { id: 1 },
    data: { 
      welcomeMessage: '¡Bienvenido a nuestro servicio! Estamos encantados de atenderle. ¿En qué podemos ayudarle hoy?',
      botLanguage: 'es-ES'
    }
  });
  console.log("✅ Saludo e idioma actualizados correctamente");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
