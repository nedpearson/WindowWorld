const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgReal = await prisma.organization.findUnique({ where: { slug: 'windowworld-louisiana' } });
  await prisma.user.update({
    where: { email: 'nedpearson@gmail.com' },
    data: { organizationId: orgReal.id }
  });
  console.log('Moved nedpearson back to real org.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
