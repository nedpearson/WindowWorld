import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const firstOrg = await prisma.organization.findFirst();
  if (!firstOrg) throw new Error("No organization found");
  const targetOrgId = firstOrg.id;

  console.log('--- STARTING STRESS TEST SIMULATION ---');

  // Inject 25 "noisy / low confidence" realtors to test sorting
  for (let i = 0; i < 25; i++) {
    await prisma.realtor.create({
      data: {
        organizationId: targetOrgId,
        name: `Agent ${i}`,
        brokerage: `Unknown Brokerage ${i}`,
        phone: 'Not Available',
        email: 'Not Available',
        city: i % 2 === 0 ? 'Shreveport' : 'Lafayette', // Not Baton Rouge
        batonRougePriority: false,
        partnershipScore: Math.floor(Math.random() * 40) + 10, // Very low score
        confidence: 0.3, // Low confidence
        source: 'Bulk Web Scrape',
      }
    });
  }

  // Inject a high-confidence, Baton Rouge Developer but with missing contact info (edge case)
  await prisma.developer.create({
    data: {
      organizationId: targetOrgId,
      companyName: 'Baton Rouge High-Rise Corp',
      contactName: null,
      phone: null,
      email: null,
      city: 'Baton Rouge',
      batonRougePriority: true,
      partnershipScore: 95,
      confidence: 0.9,
      source: 'HBA Manual Entry',
    }
  });

  // Query to test the queue sorting
  const topRealtors = await prisma.realtor.findMany({
    where: { organizationId: targetOrgId },
    orderBy: [
      { batonRougePriority: 'desc' },
      { partnershipScore: 'desc' },
      { confidence: 'desc' }
    ],
    take: 5
  });

  console.log('--- TOP 5 REALTORS (Testing suppression of noise) ---');
  topRealtors.forEach(r => console.log(`${r.brokerage} - Score: ${r.partnershipScore} - BR: ${r.batonRougePriority}`));

  const topDevelopers = await prisma.developer.findMany({
    where: { organizationId: targetOrgId },
    orderBy: [
      { batonRougePriority: 'desc' },
      { partnershipScore: 'desc' }
    ],
    take: 5
  });

  console.log('--- TOP 5 DEVELOPERS (Testing edge case handling) ---');
  topDevelopers.forEach(d => console.log(`${d.companyName} - Contact: ${d.contactName || 'MISSING'} - Score: ${d.partnershipScore}`));

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
