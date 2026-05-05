import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const firstOrg = await prisma.organization.findFirst();
  if (!firstOrg) throw new Error("No organization found");
  const targetOrgId = firstOrg.id;

  console.log(`Seeding Deep Google Intelligence Data for Org: ${targetOrgId}`);

  const realtors = [
    {
      organizationId: targetOrgId,
      name: 'Office Contact',
      brokerage: 'Pennant Real Estate',
      role: 'Brokerage Office',
      phone: 'Not Available',
      email: 'info@pennantrealestate.com',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'pennantrealestate.com',
      batonRougePriority: true,
      partnershipScore: 80,
      confidence: 0.9,
      source: 'Google Search Extraction',
      notes: 'Local independent brokerage. Good target for localized partnership.'
    },
    {
      organizationId: targetOrgId,
      name: 'Mathew Laborde',
      brokerage: 'Elifin Realty',
      role: 'Commercial/Residential Broker',
      phone: '(800) 895-9329',
      email: 'info@elifinrealty.com',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'elifinrealty.com',
      batonRougePriority: true,
      partnershipScore: 85,
      confidence: 0.9,
      source: 'Google Search Extraction',
      notes: 'Strong local presence in commercial and large-scale residential.'
    },
    {
      organizationId: targetOrgId,
      name: 'Agent Contact',
      brokerage: 'Coldwell Banker ONE',
      role: 'Agent/Broker',
      phone: '(225) 925-2500',
      email: 'Not Available',
      address: '5025 Bluebonnet Blvd',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70809',
      website: 'coldwellbanker.com',
      batonRougePriority: true,
      partnershipScore: 88,
      confidence: 0.9,
      source: 'Google Search Extraction',
      notes: 'Large national franchise with strong Baton Rouge footprint.'
    },
    {
      organizationId: targetOrgId,
      name: 'Office Manager',
      brokerage: 'eXp Realty Baton Rouge',
      role: 'Brokerage Office',
      phone: '(888) 900-1110',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'exprealty.com',
      batonRougePriority: true,
      partnershipScore: 85,
      confidence: 0.9,
      source: 'Google Search Extraction',
      notes: 'Cloud-based brokerage with high volume of independent agents.'
    },
    {
      organizationId: targetOrgId,
      name: 'Office Contact',
      brokerage: 'Your 225 Market',
      role: 'Brokerage Office',
      phone: 'Not Available',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'your225market.com',
      batonRougePriority: true,
      partnershipScore: 75,
      confidence: 0.8,
      source: 'Google Search Extraction',
      notes: 'Hyper-local real estate team.'
    }
  ];

  const developers = [
    {
      organizationId: targetOrgId,
      companyName: 'Cagley Homes',
      contactName: 'Main Office',
      role: 'General Contractor / Builder',
      phone: '(225) 802-8889',
      email: 'cagleyconstruction@gmail.com',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'cagleyhomes.com',
      batonRougePriority: true,
      partnershipScore: 82,
      confidence: 0.95,
      source: 'HBA GBR Directory (Google)',
      notes: 'Residential home builder in Baton Rouge.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Colby Constructors',
      contactName: 'Main Office',
      role: 'General Contractor / Builder',
      phone: '(225) 802-8382',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'colbyconstructors.com',
      batonRougePriority: true,
      partnershipScore: 80,
      confidence: 0.9,
      source: 'HBA GBR Directory (Google)',
      notes: 'Custom residential home builder.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Lynch Construction Group, LLC',
      contactName: 'Main Office',
      role: 'General Contractor / Builder',
      phone: '(225) 751-8898',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'Not Available',
      batonRougePriority: true,
      partnershipScore: 78,
      confidence: 0.9,
      source: 'HBA GBR Directory (Google)',
      notes: 'Active member of Home Builders Association of Greater Baton Rouge.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Mallard Homes of LA, LLC',
      contactName: 'Main Office',
      role: 'General Contractor / Builder',
      phone: '(225) 472-6999',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'mallardhomesofla.com',
      batonRougePriority: true,
      partnershipScore: 75,
      confidence: 0.9,
      source: 'HBA GBR Directory (Google)',
      notes: 'Active member of Home Builders Association of Greater Baton Rouge.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Nelson Custom Builders, LLC',
      contactName: 'Main Office',
      role: 'Custom Home Builder',
      phone: '(225) 910-8706',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'Not Available',
      batonRougePriority: true,
      partnershipScore: 75,
      confidence: 0.9,
      source: 'HBA GBR Directory (Google)',
      notes: 'Active member of Home Builders Association of Greater Baton Rouge.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Newt Ogden Builders, Inc.',
      contactName: 'Main Office',
      role: 'Home Builder',
      phone: '(225) 205-9780',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'Not Available',
      batonRougePriority: true,
      partnershipScore: 72,
      confidence: 0.9,
      source: 'HBA GBR Directory (Google)',
      notes: 'Active member of Home Builders Association of Greater Baton Rouge.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Reed Builders, Inc.',
      contactName: 'Main Office',
      role: 'General Contractor / Builder',
      phone: '(225) 384-6693',
      email: 'info@reedbuilders.net',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'reedbuilders.net',
      batonRougePriority: true,
      partnershipScore: 85,
      confidence: 0.95,
      source: 'HBA GBR Directory (Google)',
      notes: 'Premium local builder with explicit contact details.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Wesley Construction',
      contactName: 'Main Office',
      role: 'General Contractor',
      phone: '(225) 753-5600',
      email: 'info@wesleyusa.com',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'wesleyusa.com',
      batonRougePriority: true,
      partnershipScore: 88,
      confidence: 0.95,
      source: 'HBA GBR Directory (Google)',
      notes: 'Commercial and large residential construction.'
    }
  ];

  for (const r of realtors) {
    const existing = await prisma.realtor.findFirst({ where: { brokerage: r.brokerage } });
    if (!existing) {
      await prisma.realtor.create({ data: r });
    }
  }

  for (const d of developers) {
    const existing = await prisma.developer.findFirst({ where: { companyName: d.companyName } });
    if (!existing) {
      await prisma.developer.create({ data: d });
    }
  }

  console.log('Google Extraction Seeding Complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
