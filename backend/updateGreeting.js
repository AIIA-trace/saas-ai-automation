const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updatedClient = await prisma.client.update({
    where: { id: 1 },
    data: {
      callConfig: {
        update: {
          greeting: "¡Bienvenido a nuestro servicio! ¿En qué podemos ayudarle hoy? Por favor describa brevemente su consulta."
        }
      }
    }
  });
  console.log("✅ Saludo actualizado:", updatedClient);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
