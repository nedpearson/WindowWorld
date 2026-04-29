import { PrismaClient, UserRole, LeadStatus, WindowType, FrameMaterial, ConditionRating } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WindowWorld demo data (Louisiana)...\n');

  // ─────────────────────────────────────────────
  // ORGANIZATIONS
  // ─────────────────────────────────────────────
  const orgReal = await prisma.organization.upsert({
    where: { slug: 'windowworld-louisiana' },
    update: {},
    create: {
      name: 'WindowWorld Louisiana',
      slug: 'windowworld-louisiana',
      brandColor: '#1a56db',
      address: '4700 Florida Blvd',
      city: 'Baton Rouge',
      state: 'Louisiana',
      zip: '70806',
      phone: '(225) 555-0100',
      email: 'info@windowworldla.com',
      website: 'https://windowworldla.com',
    },
  });
  console.log(`✅ Live Organization: ${orgReal.name}`);

  const orgDemo = await prisma.organization.upsert({
    where: { slug: 'windowworld-louisiana-demo' },
    update: {},
    create: {
      name: 'WindowWorld Demo',
      slug: 'windowworld-louisiana-demo',
      brandColor: '#1a56db',
      address: '4700 Florida Blvd',
      city: 'Baton Rouge',
      state: 'Louisiana',
      zip: '70806',
      phone: '(225) 555-0100',
      email: 'info@windowworldla.com',
      website: 'https://windowworldla.com',
    },
  });
  console.log(`✅ Demo Organization: ${orgDemo.name}`);

  // ─────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────
  const nedHash = await bcrypt.hash('1Pearson2', 12);
  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  const users = await Promise.all([
    // ── Owner / Platform Admin (REAL ORG) ──────────────────────
    prisma.user.upsert({
      where: { email: 'nedpearson@gmail.com' },
      update: { passwordHash: nedHash, role: UserRole.SUPER_ADMIN, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'nedpearson@gmail.com',
        passwordHash: nedHash,
        firstName: 'Ned',
        lastName: 'Pearson',
        role: UserRole.SUPER_ADMIN,
        phone: '(225) 555-0100',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'admin@windowworldla.com',
        passwordHash,
        firstName: 'Thomas',
        lastName: 'Broussard',
        role: UserRole.SUPER_ADMIN,
        phone: '(225) 555-0101',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'manager@windowworldla.com',
        passwordHash,
        firstName: 'Marie',
        lastName: 'Fontenot',
        role: UserRole.SALES_MANAGER,
        phone: '(225) 555-0102',
      },
    }),
    prisma.user.upsert({
      where: { email: 'rep1@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'rep1@windowworldla.com',
        passwordHash,
        firstName: 'Jake',
        lastName: 'Thibodaux',
        role: UserRole.SALES_REP,
        phone: '(225) 555-0103',
      },
    }),
    prisma.user.upsert({
      where: { email: 'rep2@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'rep2@windowworldla.com',
        passwordHash,
        firstName: 'Danielle',
        lastName: 'Arceneaux',
        role: UserRole.SALES_REP,
        phone: '(225) 555-0104',
      },
    }),
    prisma.user.upsert({
      where: { email: 'tech@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'tech@windowworldla.com',
        passwordHash,
        firstName: 'Chad',
        lastName: 'Melancon',
        role: UserRole.FIELD_MEASURE_TECH,
        phone: '(225) 555-0105',
      },
    }),
    prisma.user.upsert({
      where: { email: 'finance@windowworldla.com' },
      update: { passwordHash, isActive: true, organizationId: orgReal.id },
      create: {
        organizationId: orgReal.id,
        email: 'finance@windowworldla.com',
        passwordHash,
        firstName: 'Lisa',
        lastName: 'Guillory',
        role: UserRole.FINANCE_BILLING,
        phone: '(225) 555-0106',
      },
    }),
  ]);
  console.log(`✅ Users: ${users.map(u => u.firstName).join(', ')}`);

  const [_ned, admin, manager, rep1, rep2, tech, finance] = users;

  // ─────────────────────────────────────────────
  // TERRITORIES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingTerritoryCount = await prisma.territory.count({ where: { organizationId: orgReal.id } });
  let territories: any[] = [];
  if (existingTerritoryCount === 0) {
    territories = await Promise.all([
      prisma.territory.create({
        data: {
          organizationId: orgReal.id,
          name: 'Baton Rouge Metro',
          parishes: ['East Baton Rouge', 'West Baton Rouge'],
          zipCodes: ['70801', '70802', '70806', '70808', '70810', '70816', '70817', '70818', '70820'],
          centerLat: 30.4515,
          centerLng: -91.1871,
          radiusMiles: 20,
          users: { create: [{ userId: rep1.id, isPrimary: true }] },
        },
      }),
      prisma.territory.create({
        data: {
          organizationId: orgReal.id,
          name: 'Livingston / Denham Springs',
          parishes: ['Livingston'],
          zipCodes: ['70726', '70727', '70706', '70769'],
          centerLat: 30.4883,
          centerLng: -90.9576,
          radiusMiles: 25,
          users: { create: [{ userId: rep2.id, isPrimary: true }] },
        },
      }),
      prisma.territory.create({
        data: {
          organizationId: orgReal.id,
          name: 'Lafayette Area',
          parishes: ['Lafayette', 'Iberia'],
          zipCodes: ['70501', '70503', '70506', '70508'],
          centerLat: 30.2241,
          centerLng: -92.0198,
          radiusMiles: 30,
        },
      }),
      prisma.territory.create({
        data: {
          organizationId: orgReal.id,
          name: 'Greater New Orleans Suburbs',
          parishes: ['Jefferson', 'St. Tammany', 'St. Bernard'],
          zipCodes: ['70056', '70062', '70072', '70065', '70433', '70448', '70460'],
          centerLat: 29.9511,
          centerLng: -90.0715,
          radiusMiles: 35,
        },
      }),
    ]);
    console.log(`✅ Territories: ${territories.map((t: any) => t.name).join(', ')}`);
  } else {
    territories = await prisma.territory.findMany({ where: { organizationId: orgReal.id }, orderBy: { createdAt: 'asc' } });
    console.log(`⏭️  Territories already seeded (${territories.length}), skipping`);
  }

  // ─────────────────────────────────────────────
  // PRODUCTS
  // ─────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'WW-2000-DH' },
      update: {},
      create: {
        organizationId: orgReal.id,
        manufacturer: 'WindowWorld',
        productLine: 'Series 2000',
        name: 'Series 2000 Double Hung',
        sku: 'WW-2000-DH',
        windowType: WindowType.DOUBLE_HUNG,
        frameMaterial: FrameMaterial.VINYL,
        description: 'Energy-efficient double hung window, ideal for Louisiana homes',
        features: ['Low-E glass', 'Tilt-in sashes for easy cleaning', 'Weather-stripping', 'Lifetime warranty frame'],
        basePrice: 299,
        laborRate: 125,
        energyStarCertified: true,
        uFactor: 0.32,
        solarHeatGain: 0.25,
        warrantyYears: 20,
        isDefault: true,
        options: {
          create: [
            { category: 'color', name: 'White', value: 'white', priceDelta: 0, isDefault: true },
            { category: 'color', name: 'Tan', value: 'tan', priceDelta: 15 },
            { category: 'color', name: 'Bronze', value: 'bronze', priceDelta: 25 },
            { category: 'glass', name: 'Clear', value: 'clear', priceDelta: 0, isDefault: true },
            { category: 'glass', name: 'Low-E', value: 'low-e', priceDelta: 45, isDefault: false },
            { category: 'glass', name: 'Low-E + Argon', value: 'low-e-argon', priceDelta: 75 },
            { category: 'grid', name: 'No Grids', value: 'none', priceDelta: 0, isDefault: true },
            { category: 'grid', name: 'Colonial Grids', value: 'colonial', priceDelta: 35 },
            { category: 'grid', name: 'Prairie Grids', value: 'prairie', priceDelta: 35 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WW-4000-DH' },
      update: {},
      create: {
        organizationId: orgReal.id,
        manufacturer: 'WindowWorld',
        productLine: 'Series 4000',
        name: 'Series 4000 Premium Double Hung',
        sku: 'WW-4000-DH',
        windowType: WindowType.DOUBLE_HUNG,
        frameMaterial: FrameMaterial.VINYL,
        description: 'Premium impact-resistant window with enhanced insulation',
        features: ['Triple-pane option', 'Impact-rated glass', 'Enhanced weather seal', 'Lifetime warranty'],
        basePrice: 449,
        laborRate: 135,
        energyStarCertified: true,
        uFactor: 0.22,
        solarHeatGain: 0.21,
        warrantyYears: 30,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WW-2000-SH' },
      update: {},
      create: {
        organizationId: orgReal.id,
        manufacturer: 'WindowWorld',
        productLine: 'Series 2000',
        name: 'Series 2000 Single Hung',
        sku: 'WW-2000-SH',
        windowType: WindowType.SINGLE_HUNG,
        frameMaterial: FrameMaterial.VINYL,
        description: 'Value single hung replacement window',
        features: ['Low-E glass', 'Tilt-in bottom sash', 'Weather-stripping'],
        basePrice: 249,
        laborRate: 115,
        energyStarCertified: true,
        warrantyYears: 15,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WW-3000-CS' },
      update: {},
      create: {
        organizationId: orgReal.id,
        manufacturer: 'WindowWorld',
        productLine: 'Series 3000',
        name: 'Series 3000 Casement',
        sku: 'WW-3000-CS',
        windowType: WindowType.CASEMENT,
        frameMaterial: FrameMaterial.VINYL,
        description: 'Crank-out casement window for maximum ventilation',
        features: ['Multipoint locking', 'Full-screen option', 'Easy-clean hinge'],
        basePrice: 399,
        laborRate: 145,
        warrantyYears: 20,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WW-3000-PW' },
      update: {},
      create: {
        organizationId: orgReal.id,
        manufacturer: 'WindowWorld',
        productLine: 'Series 3000',
        name: 'Series 3000 Picture Window',
        sku: 'WW-3000-PW',
        windowType: WindowType.PICTURE,
        frameMaterial: FrameMaterial.VINYL,
        description: 'Fixed picture window for maximum light and views',
        features: ['Seamless frame', 'Custom sizes available', 'Maximum insulation'],
        basePrice: 349,
        laborRate: 155,
        warrantyYears: 20,
      },
    }),
  ]);
  console.log(`✅ Products: ${products.map(p => p.name).join(', ')}`);

  // ─────────────────────────────────────────────
  // LEADS (Louisiana demo data)
  // ─────────────────────────────────────────────
  const leadData = [
    // Baton Rouge Metro
    {
      firstName: 'Robert', lastName: 'Comeaux',
      email: 'rcomxeaux63@gmail.com', phone: '(225) 555-1001',
      address: '4521 Greenwell Springs Rd', city: 'Baton Rouge', zip: '70806', parish: 'East Baton Rouge',
      lat: 30.4821, lng: -91.1103,
      status: LeadStatus.APPOINTMENT_SET, source: 'door-knock', leadScore: 78, urgencyScore: 72,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 6500,
    },
    {
      firstName: 'Patricia', lastName: 'Landry',
      email: 'patricia.landry@yahoo.com', phone: '(225) 555-1002',
      address: '312 Sherwood Forest Blvd', city: 'Baton Rouge', zip: '70815', parish: 'East Baton Rouge',
      lat: 30.4442, lng: -91.0892,
      status: LeadStatus.PROPOSAL_SENT, source: 'referral', leadScore: 85, urgencyScore: 68,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 9200,
    },
    {
      firstName: 'Michael', lastName: 'Trosclair',
      email: 'mtrosclair@hotmail.com', phone: '(225) 555-1003',
      address: '7824 Old Hammond Hwy', city: 'Baton Rouge', zip: '70809', parish: 'East Baton Rouge',
      lat: 30.4156, lng: -91.0634,
      status: LeadStatus.VERBAL_COMMIT, source: 'web', leadScore: 91, urgencyScore: 88,
      isStormLead: true, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 14800,
    },
    {
      firstName: 'Susan', lastName: 'Bourgeois',
      email: 'sbourgeois@att.net', phone: '(225) 555-1004',
      address: '2207 Jefferson Hwy', city: 'Baton Rouge', zip: '70809', parish: 'East Baton Rouge',
      lat: 30.4058, lng: -91.1341,
      status: LeadStatus.NEW_LEAD, source: 'storm-list', leadScore: 62, urgencyScore: 81,
      isStormLead: true, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 4200,
    },
    {
      firstName: 'James', lastName: 'Hebert',
      email: 'jhebert1959@gmail.com', phone: '(225) 555-1005',
      address: '5316 Perkins Rd', city: 'Baton Rouge', zip: '70808', parish: 'East Baton Rouge',
      lat: 30.3912, lng: -91.1045,
      status: LeadStatus.SOLD, source: 'referral', leadScore: 95, urgencyScore: 92,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 11600,
    },
    // Denham Springs / Livingston
    {
      firstName: 'Karen', lastName: 'Guidry',
      email: 'karen.guidry@cox.net', phone: '(225) 555-2001',
      address: '1134 Range Ave', city: 'Denham Springs', zip: '70726', parish: 'Livingston',
      lat: 30.4875, lng: -90.9427,
      status: LeadStatus.INSPECTION_COMPLETE, source: 'neighborhood-canvass', leadScore: 74, urgencyScore: 69,
      isStormLead: true, assignedRepId: rep2.id, territoryId: territories[1].id,
      estimatedRevenue: 7800,
    },
    {
      firstName: 'David', lastName: 'Trahan',
      email: 'dtrahan@bellsouth.net', phone: '(225) 555-2002',
      address: '8843 Burgess Ave', city: 'Denham Springs', zip: '70726', parish: 'Livingston',
      lat: 30.5012, lng: -90.9612,
      status: LeadStatus.FOLLOW_UP, source: 'web', leadScore: 58, urgencyScore: 45,
      isStormLead: false, assignedRepId: rep2.id, territoryId: territories[1].id,
      estimatedRevenue: 3600,
    },
    {
      firstName: 'Angela', lastName: 'Mouton',
      email: 'amouton@gmail.com', phone: '(225) 555-2003',
      address: '226 Tupelo Dr', city: 'Prairieville', zip: '70769', parish: 'Ascension',
      lat: 30.2998, lng: -90.9871,
      status: LeadStatus.MEASURING_COMPLETE, source: 'referral', leadScore: 82, urgencyScore: 75,
      isStormLead: false, assignedRepId: rep2.id, territoryId: territories[1].id,
      estimatedRevenue: 8900,
    },
    // Lafayette
    {
      firstName: 'Brett', lastName: 'Fontenot',
      email: 'bfontenot@yahoo.com', phone: '(337) 555-3001',
      address: '4412 Johnston St', city: 'Lafayette', zip: '70503', parish: 'Lafayette',
      lat: 30.2073, lng: -92.0513,
      status: LeadStatus.CONTACTED, source: 'web', leadScore: 65, urgencyScore: 55,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[2].id,
      estimatedRevenue: 5200,
    },
    {
      firstName: 'Theresa', lastName: 'Broussard',
      email: 'tbroussard_la@gmail.com', phone: '(337) 555-3002',
      address: '1812 Ambassador Caffery Pkwy', city: 'Lafayette', zip: '70506', parish: 'Lafayette',
      lat: 30.1811, lng: -92.0748,
      status: LeadStatus.NURTURE, source: 'old-quote', leadScore: 48, urgencyScore: 38,
      isStormLead: false, assignedRepId: rep2.id, territoryId: territories[2].id,
      estimatedRevenue: 2800,
    },
    // New Orleans Suburbs
    {
      firstName: 'Louis', lastName: 'Badeaux',
      email: 'lbadeaux@cox.net', phone: '(504) 555-4001',
      address: '3312 Severn Ave', city: 'Metairie', zip: '70002', parish: 'Jefferson',
      lat: 29.9975, lng: -90.1612,
      status: LeadStatus.ATTEMPTING_CONTACT, source: 'storm-list', leadScore: 77, urgencyScore: 82,
      isStormLead: true, assignedRepId: rep1.id, territoryId: territories[3].id,
      estimatedRevenue: 6800,
    },
    {
      firstName: 'Carol', lastName: 'Chauvin',
      email: 'carolchauvin@gmail.com', phone: '(985) 555-4002',
      address: '1245 Gause Blvd', city: 'Slidell', zip: '70458', parish: 'St. Tammany',
      lat: 30.2743, lng: -89.7813,
      status: LeadStatus.QUALIFIED, source: 'referral', leadScore: 80, urgencyScore: 62,
      isStormLead: false, assignedRepId: rep2.id, territoryId: territories[3].id,
      estimatedRevenue: 7400,
    },
    // Zachary / Central
    {
      firstName: 'Robert', lastName: 'Duplessis',
      email: 'rduplessis@bellsouth.net', phone: '(225) 555-5001',
      address: '6112 Main St', city: 'Zachary', zip: '70791', parish: 'East Baton Rouge',
      lat: 30.6501, lng: -91.1551,
      status: LeadStatus.LOST, source: 'door-knock', leadScore: 40, urgencyScore: 35,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[0].id,
      estimatedRevenue: 3200, lostReason: 'Price - went with competitor',
    },
    {
      firstName: 'Monique', lastName: 'Robichaux',
      email: 'mrobichaux@cox.net', phone: '(225) 555-5002',
      address: '4319 Sullivan Rd', city: 'Central', zip: '70818', parish: 'East Baton Rouge',
      lat: 30.5431, lng: -91.0821,
      status: LeadStatus.PAID, source: 'referral', leadScore: 88, urgencyScore: 80,
      isStormLead: false, assignedRepId: rep2.id, territoryId: territories[0].id,
      estimatedRevenue: 10400,
    },
    // Gonzales
    {
      firstName: 'Dale', lastName: 'Acosta',
      email: 'dacosta@gmail.com', phone: '(225) 555-6001',
      address: '2101 S Purpera Ave', city: 'Gonzales', zip: '70737', parish: 'Ascension',
      lat: 30.2343, lng: -90.9211,
      status: LeadStatus.NEW_LEAD, source: 'web', leadScore: 55, urgencyScore: 48,
      isStormLead: false, assignedRepId: rep1.id, territoryId: territories[1].id,
      estimatedRevenue: 4100,
    },
  ];

  // Only create leads if none exist for our demo reps
  const demoLeadCount = await prisma.lead.count({ 
    where: { organizationId: orgReal.id, assignedRepId: { in: [rep1.id, rep2.id] } } 
  });
  let createdLeads: any[] = [];
  if (demoLeadCount > 0) {
    createdLeads = await prisma.lead.findMany({ 
      where: { organizationId: orgReal.id, assignedRepId: { in: [rep1.id, rep2.id] } }, 
      orderBy: { createdAt: 'asc' }, take: 15 
    });
    console.log(`⏭️  Leads already seeded (${createdLeads.length}), skipping`);
  } else {
    for (const ld of leadData) {
      const { assignedRepId, territoryId, ...rest } = ld;
      const lead = await prisma.lead.create({
        data: {
          ...rest,
          organizationId: orgReal.id,
          assignedRepId,
          territoryId,
          state: 'Louisiana',
          tags: ld.isStormLead ? ['storm-2024', 'hurricane-ida-follow'] : [],
        },
      });
      createdLeads.push(lead);
    }
    console.log(`✅ Leads: ${createdLeads.length} demo leads created`);

    // ── Contacts: one primary per lead + spouses for select leads ──
    const spouseData: Record<string, { firstName: string; lastName: string; email?: string; phone?: string }> = {
      // spouses keyed by lead firstName (for the demo data we know the first names)
      'Michael':  { firstName: 'Susan',    lastName: 'Thibodaux',   email: 'sthibodaux@gmail.com',     phone: '(225) 555-0182' },
      'Patricia': { firstName: 'Gerald',   lastName: 'Landry',      email: 'glandry@bellsouth.net',    phone: '(225) 555-0384' },
      'William':  { firstName: 'Barbara',  lastName: 'Fontenot',    email: 'bfontenot@yahoo.com',      phone: '(225) 555-0721' },
      'Angela':   { firstName: 'Marcus',   lastName: 'Mouton',      email: 'mmouton@cox.net',          phone: '(225) 555-0903' },
      'Carol':    { firstName: 'Raymond',  lastName: 'Chauvin',     email: 'rchauvin@aol.com',         phone: '(985) 555-0412' },
      'Robert':   { firstName: 'Beverly',  lastName: 'Duplessis',   email: 'bduplessis@gmail.com',     phone: '(225) 555-0588' },
      'Theresa':  { firstName: 'Andre',    lastName: 'Broussard',   email: 'abroussard@yahoo.com',     phone: '(337) 555-0239' },
      'Louis':    { firstName: 'Denise',   lastName: 'Badeaux',     email: 'dbadeaux@cox.net',         phone: '(504) 555-0867' },
    };

    const contactsToCreate = createdLeads.flatMap(lead => {
      const primary = {
        leadId: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        isOwner: true,
        isSpouse: false,
        isPrimary: true,
        preferredContactMethod: 'PHONE' as const,
        bestTimeToContact: 'Evenings after 5pm',
      };
      const spouse = spouseData[lead.firstName];
      if (spouse) {
        return [primary, {
          leadId: lead.id,
          firstName: spouse.firstName,
          lastName: spouse.lastName,
          email: spouse.email,
          phone: spouse.phone,
          isOwner: true,
          isSpouse: true,
          isPrimary: false,
          preferredContactMethod: 'PHONE' as const,
          bestTimeToContact: 'Weekends',
          notes: 'Co-decision maker — must be present for final decisions',
        }];
      }
      return [primary];
    });

      await prisma.contact.createMany({ data: contactsToCreate as any, skipDuplicates: true });
      console.log(`✅ Contacts: ${contactsToCreate.length} contact records created (primary + spouses)`);
  }

  // ─────────────────────────────────────────────
  // CONTACTS — idempotent, runs every time
  // Creates contacts for any leads that don't have one yet
  // ─────────────────────────────────────────────
  const allLeads = await prisma.lead.findMany({
    where: { organizationId: orgReal.id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, contacts: { select: { id: true } } },
  });
  const leadsWithoutContacts = allLeads.filter(l => l.contacts.length === 0);
  if (leadsWithoutContacts.length > 0) {
    const spouseMap: Record<string, { firstName: string; lastName: string; email?: string; phone?: string }> = {
      'Michael':  { firstName: 'Susan',    lastName: 'Thibodaux',   email: 'sthibodaux@gmail.com',     phone: '(225) 555-0182' },
      'Patricia': { firstName: 'Gerald',   lastName: 'Landry',      email: 'glandry@bellsouth.net',    phone: '(225) 555-0384' },
      'William':  { firstName: 'Barbara',  lastName: 'Fontenot',    email: 'bfontenot@yahoo.com',      phone: '(225) 555-0721' },
      'Angela':   { firstName: 'Marcus',   lastName: 'Mouton',      email: 'mmouton@cox.net',          phone: '(225) 555-0903' },
      'Carol':    { firstName: 'Raymond',  lastName: 'Chauvin',     email: 'rchauvin@aol.com',         phone: '(985) 555-0412' },
      'Robert':   { firstName: 'Beverly',  lastName: 'Duplessis',   email: 'bduplessis@gmail.com',     phone: '(225) 555-0588' },
      'Theresa':  { firstName: 'Andre',    lastName: 'Broussard',   email: 'abroussard@yahoo.com',     phone: '(337) 555-0239' },
      'Louis':    { firstName: 'Denise',   lastName: 'Badeaux',     email: 'dbadeaux@cox.net',         phone: '(504) 555-0867' },
    };
    const newContacts = leadsWithoutContacts.flatMap(lead => {
      const primary = {
        leadId: lead.id, firstName: lead.firstName, lastName: lead.lastName,
        email: lead.email, phone: lead.phone,
        isOwner: true, isSpouse: false, isPrimary: true,
        preferredContactMethod: 'PHONE' as const, bestTimeToContact: 'Evenings after 5pm',
      };
      const spouse = spouseMap[lead.firstName];
      if (spouse) {
        return [primary, {
          leadId: lead.id, firstName: spouse.firstName, lastName: spouse.lastName,
          email: spouse.email, phone: spouse.phone,
          isOwner: true, isSpouse: true, isPrimary: false,
          preferredContactMethod: 'PHONE' as const, bestTimeToContact: 'Weekends',
          notes: 'Co-decision maker — must be present for final decisions',
        }];
      }
      return [primary];
    });
    await prisma.contact.createMany({ data: newContacts as any, skipDuplicates: true });
    console.log(`✅ Contacts: ${newContacts.length} records created for ${leadsWithoutContacts.length} leads`);
  } else {
    console.log(`⏭️  Contacts already seeded (${allLeads.reduce((s, l) => s + l.contacts.length, 0)} total), skipping`);
  }

  // ─────────────────────────────────────────────
  // PROPERTIES + OPENINGS for top leads
  // ─────────────────────────────────────────────
  // PROPERTIES + OPENINGS (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingPropertyCount = await prisma.property.count();
  if (createdLeads.length > 0 && existingPropertyCount === 0) {
    const lead1 = createdLeads[0];
    const property1 = await prisma.property.create({
      data: {
        address: '4521 Greenwell Springs Rd',
        city: 'Baton Rouge', state: 'Louisiana', zip: '70806', parish: 'East Baton Rouge',
        lat: 30.4821, lng: -91.1103, yearBuilt: 1978, squareFootage: 1850, stories: 1,
        propertyType: 'single-family', ownershipType: 'owner-occupied',
        estimatedValue: 185000, estimatedWindowCount: 12,
        windowCondition: ConditionRating.FAIR, stormExposure: 'medium',
        leads: { connect: [{ id: lead1.id }] },
      },
    });
    const windowTypes = [
      { floorLevel: 1, roomLabel: 'Living Room - Front', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.POOR },
      { floorLevel: 1, roomLabel: 'Living Room - Side', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.POOR },
      { floorLevel: 1, roomLabel: 'Kitchen', windowType: WindowType.SINGLE_HUNG, condition: ConditionRating.FAIR },
      { floorLevel: 1, roomLabel: 'Master Bedroom - E', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.FAIR },
      { floorLevel: 1, roomLabel: 'Master Bedroom - S', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.POOR },
      { floorLevel: 1, roomLabel: 'Bedroom 2', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.FAIR },
      { floorLevel: 1, roomLabel: 'Bedroom 3', windowType: WindowType.DOUBLE_HUNG, condition: ConditionRating.FAIR },
      { floorLevel: 1, roomLabel: 'Bathroom', windowType: WindowType.SINGLE_HUNG, condition: ConditionRating.GOOD },
      { floorLevel: 1, roomLabel: 'Den', windowType: WindowType.PICTURE, condition: ConditionRating.POOR },
    ];
    for (let i = 0; i < windowTypes.length; i++) {
      const wt = windowTypes[i];
      const opening = await prisma.opening.create({
        data: {
          propertyId: property1.id,
          openingId: `${wt.roomLabel.toLowerCase().replace(/[\s-]+/g, '-')}-${i + 1}`,
          roomLabel: wt.roomLabel, floorLevel: wt.floorLevel,
          windowType: wt.windowType, frameMaterial: FrameMaterial.ALUMINUM,
          condition: wt.condition,
          hasCondensation: wt.condition === ConditionRating.POOR,
          hasSealFailure: wt.condition === ConditionRating.POOR,
          requiresLadder: false, sortOrder: i,
        },
      });
      if (i < 5) {
        await prisma.measurement.create({
          data: {
            openingId: opening.id, widthHigh: 36.0, widthMid: 35.875, widthLow: 35.75,
            heightLeft: 48.0, heightMid: 47.875, heightRight: 47.75,
            finalWidth: 35.75, finalHeight: 47.75, depth: 3.5, jambDepth: 4.0,
            sillCondition: wt.condition === ConditionRating.POOR ? 'deteriorated' : 'good',
            isSquare: true, status: i < 3 ? 'VERIFIED_ONSITE' : 'ESTIMATED',
            confidenceScore: i < 3 ? 0.95 : 0.72, captureMethod: i < 3 ? 'manual' : 'guided',
            isAiEstimated: i >= 3, aiEstimateConfidence: i >= 3 ? 0.65 : undefined,
          },
        });
      }
    }
    console.log(`✅ Property + Openings created for ${lead1.firstName} ${lead1.lastName}`);
  } else {
    console.log(`⏭️  Properties already seeded, skipping`);
  }


  // ─────────────────────────────────────────────
  // APPOINTMENTS — idempotent, rich demo data
  // ─────────────────────────────────────────────
  const existingApptCount = await prisma.appointment.count();
  if (existingApptCount === 0) {
    // Fetch all org leads so we can link appointments even on a re-seed
    const allOrgLeads = await prisma.lead.findMany({
      where: { organizationId: orgReal.id },
      select: { id: true, firstName: true, lastName: true, address: true, lat: true, lng: true, phone: true },
    });

    // Helper: date relative to now
    const d = (daysOffset: number, hour: number, min = 0) => {
      const dt = new Date();
      dt.setHours(hour, min, 0, 0);
      dt.setDate(dt.getDate() + daysOffset);
      return dt;
    };

    // Pin leads by index for deterministic appointments
    const L = (i: number) => allOrgLeads[i % allOrgLeads.length];

    const apptDefs = [
      // ── TODAY (visible in Route view + today stats) ──────────────
      { lead: L(0), title: 'Initial Window Consultation', type: 'initial-consult', status: 'CONFIRMED',  scheduledAt: d(0, 9),  duration: 90,  notes: 'Homeowner confirmed. Interested in full window replacement — 12 openings.' },
      { lead: L(1), title: 'Follow-Up on Proposal',      type: 'follow-up',       status: 'SCHEDULED',  scheduledAt: d(0, 11), duration: 60,  notes: 'Sent proposal last week. Husband wants to review pricing one more time.' },
      { lead: L(2), title: 'Field Measurement Visit',    type: 'measurement',     status: 'CONFIRMED',  scheduledAt: d(0, 14), duration: 75,  notes: 'All windows need to be measured — estimate 10 openings.' },

      // ── TOMORROW ────────────────────────────────────────────────
      { lead: L(3), title: 'Initial Consultation',       type: 'initial-consult', status: 'SCHEDULED',  scheduledAt: d(1, 10), duration: 90 },
      { lead: L(4), title: 'Proposal Presentation',      type: 'proposal',        status: 'CONFIRMED',  scheduledAt: d(1, 13), duration: 60,  notes: 'Presenting 3-option proposal. Upsell Series 4000 on primary openings.' },
      { lead: L(5), title: 'Field Measurement',          type: 'measurement',     status: 'SCHEDULED',  scheduledAt: d(1, 15), duration: 75 },

      // ── DAY AFTER TOMORROW ───────────────────────────────────────
      { lead: L(6), title: 'Contract Signing',           type: 'close',           status: 'CONFIRMED',  scheduledAt: d(2, 10), duration: 60,  notes: 'Ready to sign. Financing approved through GreenSky.' },
      { lead: L(7), title: 'Follow-Up Call + Visit',     type: 'follow-up',       status: 'SCHEDULED',  scheduledAt: d(2, 14), duration: 45 },

      // ── LATER THIS WEEK ──────────────────────────────────────────
      { lead: L(8),  title: 'Initial Consultation',      type: 'initial-consult', status: 'SCHEDULED',  scheduledAt: d(3, 9),  duration: 90 },
      { lead: L(9),  title: 'Proposal Review',           type: 'proposal',        status: 'SCHEDULED',  scheduledAt: d(4, 11), duration: 60 },
      { lead: L(10), title: 'Field Measurement',         type: 'measurement',     status: 'CONFIRMED',  scheduledAt: d(4, 14), duration: 75,  notes: 'Confirmed 2-day notice. Access to side gate needed.' },
      { lead: L(11), title: 'Initial Consultation',      type: 'initial-consult', status: 'SCHEDULED',  scheduledAt: d(5, 10), duration: 90 },

      // ── NEXT WEEK ────────────────────────────────────────────────
      { lead: L(0),  title: 'Follow-Up After Measurement', type: 'follow-up',     status: 'SCHEDULED',  scheduledAt: d(8,  9),  duration: 60 },
      { lead: L(2),  title: 'Proposal Presentation',       type: 'proposal',      status: 'SCHEDULED',  scheduledAt: d(9,  10), duration: 75,  notes: 'Show Series 3000 vs Series 4000 comparison.' },
      { lead: L(4),  title: 'Contract Signing',            type: 'close',         status: 'SCHEDULED',  scheduledAt: d(10, 11), duration: 60 },
      { lead: L(6),  title: 'Initial Consultation',        type: 'initial-consult',status: 'SCHEDULED', scheduledAt: d(11, 14), duration: 90 },
      { lead: L(8),  title: 'Field Measurement',           type: 'measurement',   status: 'SCHEDULED',  scheduledAt: d(12, 13), duration: 75 },

      // ── WEEK 3 ───────────────────────────────────────────────────
      { lead: L(1),  title: 'Proposal Presentation',    type: 'proposal',        status: 'SCHEDULED',  scheduledAt: d(15, 10), duration: 60 },
      { lead: L(3),  title: 'Contract Signing',         type: 'close',           status: 'SCHEDULED',  scheduledAt: d(16, 11), duration: 60 },

      // ── COMPLETED (past appointments for historical data) ─────────
      { lead: L(5),  title: 'Initial Consultation',     type: 'initial-consult', status: 'COMPLETED',  scheduledAt: d(-7, 10), duration: 90, outcome: 'interested', notes: 'Very interested. Wants measurement next week.' },
      { lead: L(7),  title: 'Field Measurement',        type: 'measurement',     status: 'COMPLETED',  scheduledAt: d(-5, 14), duration: 75, outcome: 'measured',    notes: '9 openings measured. Proposal to follow.' },
      { lead: L(9),  title: 'Proposal Presentation',   type: 'proposal',        status: 'COMPLETED',  scheduledAt: d(-3, 11), duration: 60, outcome: 'consider',    notes: 'They liked Series 4000 but need to discuss financing.' },
      { lead: L(11), title: 'Initial Consultation',    type: 'initial-consult', status: 'COMPLETED',  scheduledAt: d(-2, 9),  duration: 90, outcome: 'interested' },
      { lead: L(0),  title: 'Contract Signed',         type: 'close',           status: 'COMPLETED',  scheduledAt: d(-1, 13), duration: 60, outcome: 'sold',        notes: 'Sold! 12 windows, Series 4000. GreenSky financing approved.' },
    ];

    for (const appt of apptDefs) {
      await prisma.appointment.create({
        data: {
          leadId:      appt.lead.id,
          createdById: rep1.id,
          title:       appt.title,
          type:        appt.type,
          status:      appt.status as any,
          scheduledAt: appt.scheduledAt,
          duration:    appt.duration,
          address:     appt.lead.address ?? undefined,
          lat:         appt.lead.lat ?? undefined,
          lng:         appt.lead.lng ?? undefined,
          notes:       (appt as any).notes ?? null,
          outcome:     (appt as any).outcome ?? null,
          reminderSent:     appt.status === 'CONFIRMED',
          confirmationSent: appt.status === 'CONFIRMED',
        },
      });
    }
    console.log(`✅ Appointments: ${apptDefs.length} demo appointments created (today + 2 weeks + history)`);
  } else {
    console.log(`⏭️  Appointments already seeded (${existingApptCount} total), skipping`);
  }


  // ─────────────────────────────────────────────
  // STORM EVENT (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingStormCount = await prisma.stormEvent.count();
  if (existingStormCount === 0) {
    await prisma.stormEvent.create({
      data: {
        name: 'Severe Hailstorm - East Baton Rouge',
        type: 'hail', severity: 'moderate',
        affectedParishes: ['East Baton Rouge', 'Livingston'],
        affectedZips: ['70806', '70815', '70726', '70706'],
        centerLat: 30.4515, centerLng: -91.1200, radiusMiles: 15,
        dataSource: 'NOAA',
        occurredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        isActive: true,
        notes: 'Quarter-size hail reported. Multiple reports of window damage and broken seals.',
      },
    });
    console.log(`✅ Storm event created`);
  } else {
    console.log(`⏭️  Storm event already seeded, skipping`);
  }


  // ─────────────────────────────────────────────
  // ACTIVITIES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingActivityCount = await prisma.activity.count();
  if (createdLeads.length > 0 && existingActivityCount === 0) {
    for (const lead of createdLeads.slice(0, 5)) {
      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: rep1.id, type: 'CALL',
          title: 'Initial outreach call',
          description: 'Called to introduce WindowWorld and discuss energy costs. Homeowner interested.',
          outcome: 'interested', contactMethod: 'PHONE', duration: 8,
          occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log(`✅ Activities created`);
  } else {
    console.log(`⏭️  Activities already seeded, skipping`);
  }


  // ─────────────────────────────────────────────
  // AUTOMATION RULES + RUN HISTORY (idempotent)
  // ─────────────────────────────────────────────
  const existingAutomationCount = await prisma.automation.count();
  if (existingAutomationCount === 0) {
    const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

    const autoStale = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'Stale Lead Follow-Up — 7 Days',
      description: 'Send follow-up task when lead has no contact for 7 days',
      trigger: 'NO_CONTACT_DAYS' as any,
      conditions: { noContactDays: 7, statusNotIn: ['SOLD', 'LOST', 'PAID'] },
      actions: [{ type: 'CREATE_TASK', title: 'Re-engage stale lead', priority: 'high' }, { type: 'SEND_NOTIFICATION', message: 'Lead has gone 7 days without contact' }],
      isActive: true, delayMinutes: 0, runCount: 31, lastRunAt: ago(0),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoStale.id, status: 'COMPLETED' as any, triggeredAt: ago(1), completedAt: ago(1), result: { tasksCreated: 3, notified: 3 } },
      { automationId: autoStale.id, status: 'COMPLETED' as any, triggeredAt: ago(3), completedAt: ago(3), result: { tasksCreated: 2, notified: 2 } },
      { automationId: autoStale.id, status: 'COMPLETED' as any, triggeredAt: ago(7), completedAt: ago(7), result: { tasksCreated: 4, notified: 4 } },
      { automationId: autoStale.id, status: 'FAILED'    as any, triggeredAt: ago(10), errorMessage: 'Lead not found in org scope' },
    ]});

    const autoAppt = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'Appointment Reminder — 24 Hours',
      description: 'Send appointment reminder to homeowner 24 hours before scheduled visit',
      trigger: 'APPOINTMENT_SET' as any,
      conditions: { hoursUntilAppointment: 24 },
      actions: [{ type: 'SEND_EMAIL', template: 'appointment-reminder' }, { type: 'SEND_SMS', message: 'Reminder: Your window consultation is tomorrow.' }],
      isActive: true, delayMinutes: 0, runCount: 24, lastRunAt: ago(0),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoAppt.id, status: 'COMPLETED' as any, triggeredAt: ago(0), completedAt: ago(0), result: { emailsSent: 1, smsSent: 1 } },
      { automationId: autoAppt.id, status: 'COMPLETED' as any, triggeredAt: ago(1), completedAt: ago(1), result: { emailsSent: 1, smsSent: 1 } },
      { automationId: autoAppt.id, status: 'COMPLETED' as any, triggeredAt: ago(2), completedAt: ago(2), result: { emailsSent: 1, smsSent: 1 } },
    ]});

    const autoProposal = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'Proposal Follow-Up — 3 Days',
      description: 'Follow up 3 days after proposal is sent if no response',
      trigger: 'PROPOSAL_SENT' as any,
      conditions: { daysAfterSend: 3, noResponse: true },
      actions: [{ type: 'CREATE_TASK', title: 'Follow up on sent proposal', priority: 'high' }, { type: 'SEND_EMAIL', template: 'proposal-followup' }],
      isActive: true, delayMinutes: 3 * 24 * 60, runCount: 17, lastRunAt: ago(2),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoProposal.id, status: 'COMPLETED' as any, triggeredAt: ago(2), completedAt: ago(2), result: { emailsSent: 1, tasksCreated: 1 } },
      { automationId: autoProposal.id, status: 'COMPLETED' as any, triggeredAt: ago(5), completedAt: ago(5), result: { emailsSent: 1, tasksCreated: 1 } },
      { automationId: autoProposal.id, status: 'COMPLETED' as any, triggeredAt: ago(8), completedAt: ago(8), result: { emailsSent: 1, tasksCreated: 1 } },
    ]});

    const autoStorm = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'Storm Opportunity Alert',
      description: 'Notify managers when a storm event affects leads in territory',
      trigger: 'STORM_EVENT' as any,
      conditions: {},
      actions: [{ type: 'SEND_NOTIFICATION', message: 'Storm event detected — activating storm opportunity mode' }, { type: 'UPDATE_LEAD_FLAGS', setStormLead: true }],
      isActive: true, delayMinutes: 0, runCount: 3, lastRunAt: ago(14),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoStorm.id, status: 'COMPLETED' as any, triggeredAt: ago(14), completedAt: ago(14), result: { leadsTagged: 6, notified: 2 } },
      { automationId: autoStorm.id, status: 'COMPLETED' as any, triggeredAt: ago(45), completedAt: ago(45), result: { leadsTagged: 11, notified: 2 } },
    ]});

    const autoNewLead = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'New Lead Welcome — Instant SMS',
      description: 'Send a welcome SMS within 5 minutes of new lead submission',
      trigger: 'LEAD_CREATED' as any,
      conditions: { hasPhone: true },
      actions: [{ type: 'SEND_SMS', message: 'Hi {firstName}! Thanks for reaching out to WindowWorld Louisiana. A rep will contact you within 1 business hour.' }],
      isActive: true, delayMinutes: 5, runCount: 47, lastRunAt: ago(0),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoNewLead.id, status: 'COMPLETED' as any, triggeredAt: ago(0), completedAt: ago(0), result: { smsSent: 1 } },
      { automationId: autoNewLead.id, status: 'COMPLETED' as any, triggeredAt: ago(1), completedAt: ago(1), result: { smsSent: 1 } },
      { automationId: autoNewLead.id, status: 'COMPLETED' as any, triggeredAt: ago(2), completedAt: ago(2), result: { smsSent: 1 } },
      { automationId: autoNewLead.id, status: 'COMPLETED' as any, triggeredAt: ago(3), completedAt: ago(3), result: { smsSent: 1 } },
    ]});

    const autoNurture = await prisma.automation.create({ data: {
      organizationId: orgReal.id,
      name: 'Nurture — 30 Day Re-Engagement',
      description: 'Re-engage leads that have been in Nurture status for 30+ days',
      trigger: 'LEAD_STATUS_CHANGED' as any,
      conditions: { status: 'NURTURE', daysInStatus: 30 },
      actions: [{ type: 'SEND_EMAIL', template: 'reengagement' }, { type: 'CREATE_TASK', title: 'Call and re-qualify nurture lead', priority: 'medium' }],
      isActive: false, delayMinutes: 30 * 24 * 60, runCount: 8, lastRunAt: ago(12),
    }});
    await prisma.automationRun.createMany({ data: [
      { automationId: autoNurture.id, status: 'COMPLETED' as any, triggeredAt: ago(12), completedAt: ago(12), result: { emailsSent: 2, tasksCreated: 2 } },
    ]});

    console.log(`✅ Automations: 6 rules created with run history`);
  } else {
    const existingRunCount = await prisma.automationRun.count();
    console.log(`⏭️  Automations already seeded (${existingAutomationCount} rules, ${existingRunCount} runs), skipping`);
  }

  // ─────────────────────────────────────────────
  // CAMPAIGNS — idempotent demo records
  // ─────────────────────────────────────────────
  const existingCampaignCount = await prisma.campaign.count({ where: { organizationId: orgReal.id } });
  if (existingCampaignCount === 0) {
    const allOrgLeadsForCampaign = await prisma.lead.findMany({
      where: { organizationId: orgReal.id },
      select: { id: true, status: true, parish: true, zip: true },
    });
    const stormLeadIds = allOrgLeadsForCampaign.filter((_, i) => i < 4).map(l => l.id);
    const newLeadIds   = allOrgLeadsForCampaign.filter((_, i) => i >= 4 && i < 9).map(l => l.id);
    const nurLeadIds   = allOrgLeadsForCampaign.filter((_, i) => i >= 9 && i < 12).map(l => l.id);

    await Promise.all([
      prisma.campaign.create({ data: {
        organizationId: orgReal.id,
        name: 'Spring 2025 Storm Damage Blitz',
        type: 'storm-opportunity',
        status: 'active',
        isStormCampaign: true,
        targetParishes: ['East Baton Rouge', 'Livingston', 'Ascension'],
        targetZips: ['70806', '70726', '70769'],
        targetLeadStatus: ['NEW_LEAD', 'ATTEMPTING_CONTACT'],
        leadCount: 6, contactedCount: 4, appointmentCount: 2, closeCount: 1,
        revenue: 8900,
        startDate: new Date('2025-04-01'), endDate: new Date('2025-06-30'),
        notes: 'Follow up on all storm-flagged leads from the April weather event.',
        leads: { connect: stormLeadIds.map(id => ({ id })) },
      }}),
      prisma.campaign.create({ data: {
        organizationId: orgReal.id,
        name: 'New Lead Welcome Sequence — Q2',
        type: 'custom',
        status: 'active',
        targetParishes: ['East Baton Rouge', 'Lafayette'],
        targetZips: [],
        targetLeadStatus: ['NEW_LEAD'],
        leadCount: 5, contactedCount: 5, appointmentCount: 3, closeCount: 0,
        revenue: 0,
        startDate: new Date('2025-04-01'),
        notes: 'Auto-enrolled via new-lead-welcome campaign template.',
        leads: { connect: newLeadIds.map(id => ({ id })) },
      }}),
      prisma.campaign.create({ data: {
        organizationId: orgReal.id,
        name: 'Spring Refresh — Referral Drive',
        type: 'referral',
        status: 'active',
        targetParishes: ['Jefferson', 'St. Tammany'],
        targetZips: ['70002', '70458'],
        targetLeadStatus: [],
        leadCount: 3, contactedCount: 2, appointmentCount: 1, closeCount: 0,
        revenue: 0,
        startDate: new Date('2025-03-15'),
        notes: 'Referral-focused outreach to recently installed customers.',
        leads: { connect: nurLeadIds.map(id => ({ id })) },
      }}),
      prisma.campaign.create({ data: {
        organizationId: orgReal.id,
        name: 'Nurture Re-Engagement — Q1 Leftovers',
        type: 'reengagement',
        status: 'paused',
        targetParishes: [],
        targetZips: [],
        targetLeadStatus: ['NURTURE', 'FOLLOW_UP'],
        leadCount: 8, contactedCount: 3, appointmentCount: 1, closeCount: 0,
        revenue: 0,
        startDate: new Date('2025-01-15'), endDate: new Date('2025-03-31'),
        notes: 'Re-engage cold leads from Q1. Paused pending rep capacity.',
      }}),
    ]);
    console.log(`✅ Campaigns: 4 demo campaign records created`);
  } else {
    console.log(`⏭️  Campaigns already seeded (${existingCampaignCount}), skipping`);
  }


  // ─────────────────────────────────────────────
  // TEMPLATES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingTemplateCount = await prisma.template.count({ where: { organizationId: orgReal.id } });
  if (existingTemplateCount === 0) {
    await Promise.all([
      prisma.template.create({ data: { organizationId: orgReal.id, type: 'email', name: 'Appointment Reminder', subject: 'Your Window Consultation Tomorrow — {{appointment_time}}', bodyHtml: '<p>Hi {{first_name}},</p><p>Just a reminder that your window consultation is scheduled for <strong>{{appointment_datetime}}</strong>.</p><p>Your consultant {{rep_name}} will arrive at {{address}}.</p><p>If you need to reschedule, please call {{company_phone}}.</p>', variables: ['first_name', 'appointment_datetime', 'appointment_time', 'rep_name', 'address', 'company_phone'], isDefault: true } }),
      prisma.template.create({ data: { organizationId: orgReal.id, type: 'proposal', name: 'Standard Window Replacement Proposal', brandingMode: 'windowworld-compatible', bodyHtml: '<div class="proposal">{{proposal_content}}</div>', variables: ['customer_name', 'property_address', 'total_windows', 'quote_total', 'rep_name', 'valid_until'], isDefault: true } }),
      prisma.template.create({ data: { organizationId: orgReal.id, type: 'email', name: 'Proposal Follow-Up', subject: '{{first_name}}, Did You Have a Chance to Review Your Window Proposal?', bodyHtml: '<p>Hi {{first_name}},</p><p>I wanted to follow up on the window replacement proposal I sent over {{days_ago}} days ago.</p><p>I know decisions like this take time. Do you have any questions I can answer?</p>', variables: ['first_name', 'days_ago', 'install_window', 'rep_name', 'rep_phone'], isDefault: true } }),
    ]);
    console.log(`✅ Email/Proposal templates created`);
  } else {
    console.log(`⏭️  Templates already seeded, skipping`);
  }

  // ─────────────────────────────────────────────
  // QUOTES, PROPOSALS & INVOICES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingQuoteCount = await prisma.quote.count({ where: { lead: { organizationId: orgReal.id } } });
  if (createdLeads.length > 0 && existingQuoteCount === 0) {
    try {
    const leadWithProposal = createdLeads[1] || createdLeads[0]; // Use Patricia Landry if available
    
    const quote = await prisma.quote.upsert({
      where: { id: 'seed-quote-001' },
      update: {},
      create: {
        id: 'seed-quote-001',
        leadId: leadWithProposal.id,
        createdById: rep1.id,
        status: 'accepted',
        subtotal: 9200,
        laborTotal: 1500,
        total: 10700,
        lineItems: {
          create: [
            { description: 'Series 2000 Double Hung Window', quantity: 10, unitPrice: 770, total: 7700 },
            { description: 'Labor/Installation', quantity: 10, unitPrice: 150, total: 1500 }
          ]
        }
      }
    });

    const proposal = await prisma.proposal.upsert({
      where: { id: 'seed-proposal-001' },
      update: {},
      create: {
        id: 'seed-proposal-001',
        leadId: leadWithProposal.id,
        quoteId: quote.id,
        createdById: rep1.id,
        status: 'ACCEPTED',
        customerName: `${leadWithProposal.firstName} ${leadWithProposal.lastName}`,
        customerEmail: leadWithProposal.email,
        propertyAddress: leadWithProposal.address,
        projectSummary: 'Full home window replacement (10 windows)',
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        viewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        signedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        signatureRequired: true,
        signedByName: `${leadWithProposal.firstName} ${leadWithProposal.lastName}`
      }
    });

    await prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-1001' },
      update: {},
      create: {
        organizationId: orgReal.id,
        leadId: leadWithProposal.id,
        proposalId: proposal.id,
        createdById: finance.id,
        invoiceNumber: 'INV-1001',
        grandTotal: 10700,
        status: 'PARTIAL',
        subtotal: 9200,
        total: 10700,
        depositPct: 50,
        depositAmount: 5350,
        depositPaid: 5350,
        balanceDue: 5350,
        issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        lineItems: {
          create: [
            { description: 'WindowWorld Series 2000 Project (10 Windows)', quantity: 1, unitPrice: 10700, total: 10700 }
          ]
        },
        payments: {
          create: [
            { amount: 5350, method: 'card', isDeposit: true, paidAt: new Date(Date.now() - 12 * 60 * 60 * 1000) }
          ]
        }
      }
    });
    console.log(`✅ Quote, Proposal, and Invoice created for ${leadWithProposal.firstName} ${leadWithProposal.lastName}`);
    } catch (err: any) {
      console.log(`⏭️  Quotes/Proposals/Invoices already seeded, skipping (${err?.code ?? err?.message})`);
    }
  } else {
    console.log(`⏭️  Quotes/Proposals already seeded, skipping`);
  }


  // ─────────────────────────────────────────────
  // PRODUCT CATALOG TAXONOMY
  // (categories → subcategories → series)
  // All upserted on slug — fully idempotent.
  // ─────────────────────────────────────────────
  const catWindows = await prisma.productCategory.upsert({
    where: { slug: 'windows' },
    update: {},
    create: {
      name: 'Windows', slug: 'windows',
      description: 'Exterior replacement windows — vinyl, energy-efficient, hurricane-rated',
      sortOrder: 0, isActive: true,
    },
  });
  const catDoors = await prisma.productCategory.upsert({
    where: { slug: 'doors' },
    update: {},
    create: {
      name: 'Doors', slug: 'doors',
      description: 'Entry doors, storm doors, and patio doors',
      sortOrder: 1, isActive: true,
    },
  });
  const catSiding = await prisma.productCategory.upsert({
    where: { slug: 'siding' },
    update: {},
    create: {
      name: 'Siding', slug: 'siding',
      description: 'Exterior siding, soffit, and trim products',
      sortOrder: 2, isActive: true,
    },
  });
  console.log(`✅ Product Categories: ${catWindows.name}, ${catDoors.name}, ${catSiding.name}`);

  // Subcategories for Windows
  const subSingleHung = await prisma.productSubcategory.upsert({
    where: { slug: 'single-hung' },
    update: {},
    create: { categoryId: catWindows.id, name: 'Single Hung', slug: 'single-hung', description: 'Classic single-hung windows — lower sash slides up', sortOrder: 0, isActive: true },
  });
  const subDoubleHung = await prisma.productSubcategory.upsert({
    where: { slug: 'double-hung' },
    update: {},
    create: { categoryId: catWindows.id, name: 'Double Hung', slug: 'double-hung', description: 'Both sashes tilt in for easy cleaning', sortOrder: 1, isActive: true },
  });
  const subCasement = await prisma.productSubcategory.upsert({
    where: { slug: 'casement-awning' },
    update: {},
    create: { categoryId: catWindows.id, name: 'Casement & Awning', slug: 'casement-awning', description: 'Crank-operated outswing styles', sortOrder: 2, isActive: true },
  });
  const subSpecialty = await prisma.productSubcategory.upsert({
    where: { slug: 'specialty-picture' },
    update: {},
    create: { categoryId: catWindows.id, name: 'Specialty & Picture', slug: 'specialty-picture', description: 'Bay, bow, slider, and fixed units', sortOrder: 3, isActive: true },
  });
  console.log(`✅ Product Subcategories: Single Hung, Double Hung, Casement & Awning, Specialty & Picture`);

  // Series — mapped to correct subcategories
  const seriesDefs = [
    { slug: 'series-2000', name: 'Series 2000', subcategoryId: subSingleHung.id, description: 'Standard vinyl single-hung, energy-efficient, builder grade', sortOrder: 0 },
    { slug: 'series-3000', name: 'Series 3000', subcategoryId: subDoubleHung.id, description: 'Mid-range vinyl double-hung with Low-E glass', sortOrder: 0 },
    { slug: 'series-4000', name: 'Series 4000', subcategoryId: subDoubleHung.id, description: 'Premium vinyl double-hung, triple Low-E, argon fill, best seller', sortOrder: 1 },
    { slug: 'series-6000', name: 'Series 6000', subcategoryId: subDoubleHung.id, description: 'Ultra-premium, impact-rated, hurricane zone ready', sortOrder: 2 },
    { slug: 'series-casement', name: 'Casement', subcategoryId: subCasement.id, description: 'Outswing casement, premium multipoint locking hardware', sortOrder: 0 },
    { slug: 'series-awning', name: 'Awning', subcategoryId: subCasement.id, description: 'Top-hinged awning window — ventilates even in rain', sortOrder: 1 },
    { slug: 'series-slider', name: 'Horizontal Slider', subcategoryId: subSpecialty.id, description: 'Two or three-lite horizontal slider', sortOrder: 0 },
    { slug: 'series-picture', name: 'Picture (Fixed)', subcategoryId: subSpecialty.id, description: 'Non-operable fixed lite — maximum light and views', sortOrder: 1 },
    { slug: 'series-bay', name: 'Bay Window', subcategoryId: subSpecialty.id, description: 'Three-window bay unit, custom projection', sortOrder: 2 },
    { slug: 'series-bow', name: 'Bow Window', subcategoryId: subSpecialty.id, description: 'Four or five-lite bow unit', sortOrder: 3 },
  ];

  for (const s of seriesDefs) {
    await prisma.productSeries.upsert({
      where: { slug: s.slug },
      update: {},
      create: { ...s, isActive: true },
    });
  }
  console.log(`✅ Product Series: ${seriesDefs.map(s => s.name).join(', ')}`);

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   nedpearson@gmail.com        / 1Pearson2 (Super Admin — Ned Pearson [OWNER])');
  console.log('   admin@windowworldla.com     / Demo@1234 (Super Admin)');
  console.log('   manager@windowworldla.com   / Demo@1234 (Sales Manager)');
  console.log('   rep1@windowworldla.com      / Demo@1234 (Sales Rep — Jake Thibodaux)');
  console.log('   rep2@windowworldla.com      / Demo@1234 (Sales Rep — Danielle Arceneaux)');
  console.log('   tech@windowworldla.com      / Demo@1234 (Field Measure Tech)');
  console.log('   finance@windowworldla.com   / Demo@1234 (Finance/Billing)');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
