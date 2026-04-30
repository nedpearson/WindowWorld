/**
 * migrate-demo-data.ts
 *
 * One-time migration script: move all demo data from orgReal ('windowworld-louisiana')
 * to orgDemo ('demo') so that nedpearson@gmail.com sees a clean empty state.
 *
 * Run with:  cd server && npx tsx prisma/migrate-demo-data.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting demo data migration...\n');

  const orgReal = await prisma.organization.findUnique({ where: { slug: 'windowworld-louisiana' } });
  const orgDemo = await prisma.organization.findUnique({ where: { slug: 'demo' } });

  if (!orgReal || !orgDemo) {
    console.error('❌ Could not find both organizations. Run seed first.');
    process.exit(1);
  }

  console.log(`orgReal: ${orgReal.id}`);
  console.log(`orgDemo: ${orgDemo.id}\n`);

  // 1. Move demo users (all except nedpearson) to orgDemo
  const demoEmails = [
    'admin@windowworldla.com',
    'manager@windowworldla.com',
    'rep1@windowworldla.com',
    'rep2@windowworldla.com',
    'tech@windowworldla.com',
    'finance@windowworldla.com',
  ];
  const userResult = await prisma.user.updateMany({
    where: { email: { in: demoEmails }, organizationId: orgReal.id },
    data: { organizationId: orgDemo.id },
  });
  console.log(`✅ Moved ${userResult.count} demo users to orgDemo`);

  // 2. Move territories
  const terrResult = await prisma.territory.updateMany({
    where: { organizationId: orgReal.id },
    data: { organizationId: orgDemo.id },
  });
  console.log(`✅ Moved ${terrResult.count} territories to orgDemo`);

  // 3. Move products
  const prodResult = await prisma.product.updateMany({
    where: { organizationId: orgReal.id },
    data: { organizationId: orgDemo.id },
  });
  console.log(`✅ Moved ${prodResult.count} products to orgDemo`);

  // 4. Move leads (and cascades: contacts, appointments, etc. will follow via leadId)
  const leadResult = await prisma.lead.updateMany({
    where: { organizationId: orgReal.id },
    data: { organizationId: orgDemo.id },
  });
  console.log(`✅ Moved ${leadResult.count} leads to orgDemo`);

  console.log('\n✅ Migration complete. nedpearson@gmail.com now has a clean empty org.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
