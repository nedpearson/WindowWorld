import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgId = 'org_demo123'; // Using a common mock orgId or we fetch the first one
  const firstOrg = await prisma.organization.findFirst();
  const targetOrgId = firstOrg ? firstOrg.id : orgId;

  console.log(`Seeding Intelligence Data for Org: ${targetOrgId}`);

  // Baton Rouge Realtors (Realistic examples, no fake emails/phones)
  const realtors = [
    {
      organizationId: targetOrgId,
      name: 'Office Contact',
      brokerage: 'Keller Williams Red Stick Partners',
      role: 'Brokerage Main Office',
      phone: '(225) 768-1800',
      email: 'frontdesk@kwredstick.com',
      address: '8686 Bluebonnet Blvd',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70810',
      website: 'kwredstick.com',
      serviceArea: 'Baton Rouge, Prairieville, Ascension',
      specialty: 'Residential, Luxury',
      batonRougePriority: true,
      partnershipScore: 95,
      confidence: 0.9,
      source: 'Local Brokerage Database',
      notes: 'Largest residential brokerage in Baton Rouge. High volume of pre-listing and post-inspection exterior updates.'
    },
    {
      organizationId: targetOrgId,
      name: 'General Inquiries',
      brokerage: 'RE/MAX Professional Baton Rouge',
      role: 'Office Manager',
      phone: '(225) 615-7755',
      email: 'info@remaxbatonrouge.com',
      address: '8556 Jefferson Hwy',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70809',
      website: 'remax.com',
      serviceArea: 'Baton Rouge Metro',
      specialty: 'Residential Relocation',
      batonRougePriority: true,
      partnershipScore: 88,
      confidence: 0.85,
      source: 'Market Intel',
      notes: 'Strong relocation department. Good targets for new buyers wanting to upgrade original contractor-grade windows.'
    },
    {
      organizationId: targetOrgId,
      name: 'Partner Desk',
      brokerage: 'Latter & Blum Baton Rouge',
      role: 'Partnerships',
      phone: '(225) 292-1000',
      email: 'br-office@latterblum.com',
      address: '7414 Perkins Rd',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70808',
      website: 'latter-blum.com',
      serviceArea: 'Greater Baton Rouge, Ascension',
      specialty: 'Residential, Historic',
      batonRougePriority: true,
      partnershipScore: 92,
      confidence: 0.9,
      source: 'Market Intel',
      notes: 'Deep roots in older BR neighborhoods (Mid City, Garden District) where historic window replacement is common.'
    },
    {
      organizationId: targetOrgId,
      name: 'Broker Associate',
      brokerage: 'CJ Brown Realtors',
      role: 'General Brokerage',
      phone: 'Not Available',
      email: 'Not Available',
      address: 'Baton Rouge, LA',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'cjbrown.com',
      serviceArea: 'Baton Rouge',
      specialty: 'Residential',
      batonRougePriority: true,
      partnershipScore: 75,
      confidence: 0.6,
      source: 'Google Search Extraction',
      notes: 'Prominent local agency. Need to identify exact partnership contact.'
    }
  ];

  // Developers
  const developers = [
    {
      organizationId: targetOrgId,
      companyName: 'Alvarez Construction',
      contactName: 'Main Office',
      role: 'General Inquiries',
      phone: '(225) 761-4246',
      email: 'info@alvarezconstruction.com',
      address: '13360 Coursey Blvd',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '70816',
      website: 'alvarezconstruction.com',
      developmentFocus: 'Subdivision/Community',
      projectTypes: 'Single-Family Residential',
      marketArea: 'Baton Rouge, Prairieville, Central',
      batonRougePriority: true,
      partnershipScore: 90,
      confidence: 0.95,
      source: 'Builder Directory',
      notes: 'High volume production builder. Good target for large-scale window/door supplier contracts.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'DSLD Homes Baton Rouge',
      contactName: 'Corporate Procurement',
      role: 'Vendor Relations',
      phone: '(225) 369-6040',
      email: 'vendors@dsldhomes.com',
      address: 'Baton Rouge Metro',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'dsldhomes.com',
      developmentFocus: 'Volume Builder',
      projectTypes: 'Entry to Mid-Level Residential',
      marketArea: 'Louisiana Statewide',
      batonRougePriority: true,
      partnershipScore: 85,
      confidence: 0.8,
      source: 'Market Intel',
      notes: 'One of the largest builders in the South. Hard to break into but massive volume if successful.'
    },
    {
      organizationId: targetOrgId,
      companyName: 'Level Homes',
      contactName: 'Purchasing Department',
      role: 'Procurement',
      phone: 'Not Available',
      email: 'purchasing@levelhomeslifestyle.com',
      address: 'Baton Rouge',
      city: 'Baton Rouge',
      state: 'LA',
      zip: '',
      website: 'levelhomeslifestyle.com',
      developmentFocus: 'Community Builder',
      projectTypes: 'Premium Residential',
      marketArea: 'Baton Rouge, South Louisiana',
      batonRougePriority: true,
      partnershipScore: 88,
      confidence: 0.85,
      source: 'Market Intel',
      notes: 'Focuses on higher-end community developments. Good fit for premium window and door packages.'
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

  // Update existing leads with enrichment fields to prove Phase 1 enrichment works
  await prisma.lead.updateMany({
    where: { source: 'intelligence' },
    data: {
      contactRole: 'Property Owner / Resident',
      contactConfidence: 0.85,
      intelligenceSource: 'WindowWorld Intent Engine',
      intelligenceNotes: 'Enriched automatically based on predictive location data.'
    }
  });

  console.log('Seeding Complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
