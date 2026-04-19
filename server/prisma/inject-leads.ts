import { PrismaClient, LeadStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No org found');

  const reps = await prisma.user.findMany({ where: { role: { in: ['SALES_REP', 'SALES_MANAGER'] } } });
  const territories = await prisma.territory.findMany();

  if (reps.length === 0 || territories.length === 0) throw new Error('No reps or territories');

  const statuses = Object.values(LeadStatus);

  const leadsToCreate = [];

  for (let i = 0; i < 40; i++) {
    const rep = reps[Math.floor(Math.random() * reps.length)];
    const terr = territories[Math.floor(Math.random() * territories.length)];

    leadsToCreate.push({
      organizationId: org.id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: 'Louisiana',
      zip: faker.location.zipCode('70###'),
      lat: terr.centerLat + (Math.random() - 0.5) * 0.1,
      lng: terr.centerLng + (Math.random() - 0.5) * 0.1,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      source: ['web', 'referral', 'door-knock', 'storm-list'][Math.floor(Math.random() * 4)],
      leadScore: Math.floor(Math.random() * 60) + 40,
      urgencyScore: Math.floor(Math.random() * 60) + 40,
      isStormLead: Math.random() > 0.7,
      assignedRepId: rep.id,
      territoryId: terr.id,
      estimatedRevenue: Math.floor(Math.random() * 15000) + 3000,
    });
  }

  await prisma.lead.createMany({ data: leadsToCreate });
  console.log(`✅ Injected ${leadsToCreate.length} random leads directly into the database!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
