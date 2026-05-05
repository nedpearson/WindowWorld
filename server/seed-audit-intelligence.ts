import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const firstOrg = await prisma.organization.findFirst();
  if (!firstOrg) throw new Error("No organization found");
  const targetOrgId = firstOrg.id;

  console.log(`Seeding Deep Intelligence Data for Org: ${targetOrgId}`);

  const realtors = [
    { name: 'Office Contact', brokerage: 'Pennant Real Estate', role: 'Brokerage Office', phone: 'Not Available', email: 'info@pennantrealestate.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'pennantrealestate.com', batonRougePriority: true, partnershipScore: 80, confidence: 0.9, source: 'Google Search Extraction', notes: 'Local independent brokerage. Good target for localized partnership.' },
    { name: 'Mathew Laborde', brokerage: 'Elifin Realty', role: 'Commercial/Residential Broker', phone: '(800) 895-9329', email: 'info@elifinrealty.com', address: '640 Main St, Suite A', city: 'Baton Rouge', state: 'LA', website: 'elifinrealty.com', batonRougePriority: true, partnershipScore: 85, confidence: 0.9, source: 'Google Search Extraction', notes: 'Strong local presence in commercial and large-scale residential.' },
    { name: 'Agent Contact', brokerage: 'Coldwell Banker ONE', role: 'Agent/Broker', phone: '(225) 925-2500', email: 'Not Available', address: '5025 Bluebonnet Blvd', city: 'Baton Rouge', state: 'LA', website: 'coldwellbanker.com', batonRougePriority: true, partnershipScore: 88, confidence: 0.9, source: 'Google Search Extraction', notes: 'Large national franchise with strong Baton Rouge footprint.' },
    { name: 'Office Manager', brokerage: 'eXp Realty Baton Rouge', role: 'Brokerage Office', phone: '(888) 900-1110', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'exprealty.com', batonRougePriority: true, partnershipScore: 85, confidence: 0.9, source: 'Google Search Extraction', notes: 'Cloud-based brokerage with high volume of independent agents.' },
    { name: 'Office Contact', brokerage: 'Your 225 Market', role: 'Brokerage Office', phone: '(225) 953-8889', email: 'Not Available', address: '4983 Bluebonnet Blvd., Suite A', city: 'Baton Rouge', state: 'LA', website: 'your225market.com', batonRougePriority: true, partnershipScore: 75, confidence: 0.8, source: 'Google Search Extraction', notes: 'Hyper-local real estate team.' },
    { name: 'Partner Desk', brokerage: 'Latter & Blum Baton Rouge', role: 'Brokerage Office', phone: '(225) 292-1000', email: 'br-office@latterblum.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'latter-blum.com', batonRougePriority: true, partnershipScore: 92, confidence: 0.9, source: 'Market Intel', notes: 'High referral potential.' },
    { name: 'General Inquiries', brokerage: 'RE/MAX Professional Baton Rouge', role: 'Office Manager', phone: '(225) 615-7755', email: 'info@remaxbatonrouge.com', address: '8556 Jefferson Hwy', city: 'Baton Rouge', state: 'LA', website: 'remax.com', batonRougePriority: true, partnershipScore: 88, confidence: 0.85, source: 'Market Intel', notes: 'Strong relocation target.' },
    { name: 'Broker Associate', brokerage: 'CJ Brown Realtors', role: 'Agent', phone: 'Not Available', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'cjbrown.com', batonRougePriority: true, partnershipScore: 75, confidence: 0.6, source: 'Google Search Extraction', notes: 'Needs individual agent validation.' }
  ];

  const developers = [
    { companyName: 'Cagley Homes', contactName: 'Main Office', role: 'General Contractor / Builder', phone: '(225) 802-8889', email: 'cagleyconstruction@gmail.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'cagleyhomes.com', batonRougePriority: true, partnershipScore: 82, confidence: 0.95, source: 'HBA GBR Directory', notes: 'Residential home builder in Baton Rouge.' },
    { companyName: 'Colby Constructors', contactName: 'Main Office', role: 'General Contractor / Builder', phone: '(225) 802-8382', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'colbyconstructors.com', batonRougePriority: true, partnershipScore: 80, confidence: 0.9, source: 'HBA GBR Directory', notes: 'Custom residential home builder.' },
    { companyName: 'Lynch Construction Group, LLC', contactName: 'Main Office', role: 'General Contractor / Builder', phone: '(225) 751-8898', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'Not Available', batonRougePriority: true, partnershipScore: 78, confidence: 0.9, source: 'HBA GBR Directory', notes: 'Active member of Home Builders Association.' },
    { companyName: 'Mallard Homes of LA, LLC', contactName: 'Main Office', role: 'General Contractor / Builder', phone: '(225) 472-6999', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'mallardhomesofla.com', batonRougePriority: true, partnershipScore: 75, confidence: 0.9, source: 'HBA GBR Directory', notes: 'Active member of Home Builders Association.' },
    { companyName: 'Nelson Custom Builders, LLC', contactName: 'Main Office', role: 'Custom Home Builder', phone: '(225) 910-8706', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'Not Available', batonRougePriority: true, partnershipScore: 75, confidence: 0.9, source: 'HBA GBR Directory', notes: 'Active member of Home Builders Association.' },
    { companyName: 'Newt Ogden Builders, Inc.', contactName: 'Main Office', role: 'Home Builder', phone: '(225) 205-9780', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'Not Available', batonRougePriority: true, partnershipScore: 72, confidence: 0.9, source: 'HBA GBR Directory', notes: 'Active member of Home Builders Association.' },
    { companyName: 'Reed Builders, Inc.', contactName: 'Main Office', role: 'General Contractor / Builder', phone: '(225) 384-6693', email: 'info@reedbuilders.net', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'reedbuilders.net', batonRougePriority: true, partnershipScore: 85, confidence: 0.95, source: 'HBA GBR Directory', notes: 'Premium local builder with explicit contact details.' },
    { companyName: 'Wesley Construction', contactName: 'Main Office', role: 'General Contractor', phone: '(225) 753-5600', email: 'info@wesleyusa.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'wesleyusa.com', batonRougePriority: true, partnershipScore: 88, confidence: 0.95, source: 'HBA GBR Directory', notes: 'Commercial and large residential construction.' },
    { companyName: 'Alvarez Construction', contactName: 'Main Office', role: 'Production Builder', phone: '(225) 761-4246', email: 'info@alvarezconstruction.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'alvarezconstruction.com', batonRougePriority: true, partnershipScore: 90, confidence: 0.95, source: 'Builder Directory', notes: 'High volume production builder. Good for bulk.' },
    { companyName: 'Level Homes', contactName: 'Purchasing Department', role: 'Production Builder', phone: 'Not Available', email: 'purchasing@levelhomeslifestyle.com', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'levelhomeslifestyle.com', batonRougePriority: true, partnershipScore: 88, confidence: 0.85, source: 'Market Intel', notes: 'Target their purchasing/estimating team for vendor bids.' },
    { companyName: 'Dupree Construction Company', contactName: 'Main Office', role: 'Custom Homes & Remodeling', phone: '(225) 767-0609', email: 'info@dupreeconstruction.com', address: '8480 Bluebonnet Blvd', city: 'Baton Rouge', state: 'LA', website: 'dupreeconstruction.com', batonRougePriority: true, partnershipScore: 84, confidence: 0.95, source: 'Web Extraction', notes: 'Residential and commercial builder.' },
    { companyName: 'Maestri-Murrell Commercial Real Estate', contactName: 'Main Office', role: 'Commercial Real Estate / Property Mgmt', phone: '(225) 298-1250', email: 'Not Available', address: '9018 Jefferson Highway', city: 'Baton Rouge', state: 'LA', website: 'mmcre.com', batonRougePriority: true, partnershipScore: 86, confidence: 0.95, source: 'Web Extraction', notes: 'Manages large portfolios of properties.' },
    { companyName: 'Patton Property Management, LLC', contactName: 'Main Office', role: 'Property Management (HOA)', phone: '(225) 769-5002', email: 'Not Available', address: '8054 Summa Ave, Suite E', city: 'Baton Rouge', state: 'LA', website: 'pattonmanagement.com', batonRougePriority: true, partnershipScore: 89, confidence: 0.95, source: 'Web Extraction', notes: 'Manages HOAs. Highly relevant for neighborhood-wide approvals.' },
    { companyName: 'Magnolia Management Services', contactName: 'Main Office', role: 'HOA Management', phone: 'Not Available', email: 'Not Available', address: 'Baton Rouge, LA', city: 'Baton Rouge', state: 'LA', website: 'magnoliabr.org', batonRougePriority: true, partnershipScore: 85, confidence: 0.9, source: 'Web Extraction', notes: 'Specializes in HOA management across SE Louisiana.' }
  ];

  for (const r of realtors) {
    const existing = await prisma.realtor.findFirst({ where: { organizationId: targetOrgId, brokerage: r.brokerage } });
    if (!existing) {
      await prisma.realtor.create({ data: { ...r, organizationId: targetOrgId } });
    } else {
      await prisma.realtor.update({ where: { id: existing.id }, data: r });
    }
  }

  for (const d of developers) {
    const existing = await prisma.developer.findFirst({ where: { organizationId: targetOrgId, companyName: d.companyName } });
    if (!existing) {
      await prisma.developer.create({ data: { ...d, organizationId: targetOrgId } });
    } else {
      await prisma.developer.update({ where: { id: existing.id }, data: d });
    }
  }

  console.log('Deep Audit Seeding Complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
