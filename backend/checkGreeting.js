const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findUnique({
    where: { id: 1 },
    select: { welcomeMessage: true } 
  });
  console.log("Saludo actual:", client.welcomeMessage);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
