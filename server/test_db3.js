const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.count({
    where: { organizationId: '9066c795-504f-4355-85b6-41e3c3b98426' }
  });
  console.log('Leads:', leads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
