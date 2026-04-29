const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.count({
    where: { organizationId: 'f64a568a-10c0-4bc9-9d33-25a1bec1aec0' }
  });
  console.log('Leads:', leads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
