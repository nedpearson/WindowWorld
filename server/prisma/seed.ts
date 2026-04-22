import { PrismaClient, UserRole, LeadStatus, WindowType, FrameMaterial, ConditionRating } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WindowWorld demo data (Louisiana)...\n');

  // ─────────────────────────────────────────────
  // ORGANIZATION
  // ─────────────────────────────────────────────
  const org = await prisma.organization.upsert({
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
  console.log(`✅ Organization: ${org.name}`);

  // ─────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────
  const nedHash = await bcrypt.hash('1Pearson2', 12);
  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  const users = await Promise.all([
    // ── Owner / Platform Admin ─────────────────────────────────
    prisma.user.upsert({
      where: { email: 'nedpearson@gmail.com' },
      update: { passwordHash: nedHash, role: UserRole.SUPER_ADMIN },
      create: {
        organizationId: org.id,
        email: 'nedpearson@gmail.com',
        passwordHash: nedHash,
        firstName: 'Ned',
        lastName: 'Pearson',
        role: UserRole.SUPER_ADMIN,
        phone: '(225) 555-0100',
        googleId: null, // Will be linked on first Google SSO login
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@windowworldla.com' },
      update: {},
      create: {
        organizationId: org.id,
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
      update: {},
      create: {
        organizationId: org.id,
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
      update: {},
      create: {
        organizationId: org.id,
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
      update: {},
      create: {
        organizationId: org.id,
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
      update: {},
      create: {
        organizationId: org.id,
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
      update: {},
      create: {
        organizationId: org.id,
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
  const existingTerritoryCount = await prisma.territory.count({ where: { organizationId: org.id } });
  let territories: any[] = [];
  if (existingTerritoryCount === 0) {
    territories = await Promise.all([
      prisma.territory.create({
        data: {
          organizationId: org.id,
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
          organizationId: org.id,
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
          organizationId: org.id,
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
          organizationId: org.id,
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
    territories = await prisma.territory.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' } });
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
        organizationId: org.id,
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
        organizationId: org.id,
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
        organizationId: org.id,
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
        organizationId: org.id,
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
        organizationId: org.id,
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

  // Only create leads if none exist yet
  const existingLeadCount = await prisma.lead.count({ where: { organizationId: org.id } });
  let createdLeads: any[] = [];
  if (existingLeadCount > 0) {
    createdLeads = await prisma.lead.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' }, take: 15 });
    console.log(`⏭️  Leads already seeded (${createdLeads.length}), skipping`);
  } else {
    for (const ld of leadData) {
      const { assignedRepId, territoryId, ...rest } = ld;
      const lead = await prisma.lead.create({
        data: {
          ...rest,
          organizationId: org.id,
          assignedRepId,
          territoryId,
          state: 'Louisiana',
          tags: ld.isStormLead ? ['storm-2024', 'hurricane-ida-follow'] : [],
        },
      });
      createdLeads.push(lead);
    }
    console.log(`✅ Leads: ${createdLeads.length} demo leads created`);
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
  // APPOINTMENTS (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingApptCount = await prisma.appointment.count();
  if (createdLeads.length > 0 && existingApptCount === 0) {
    const appointmentLead = createdLeads[0];
    await prisma.appointment.create({
      data: {
        leadId: appointmentLead.id,
        createdById: rep1.id,
        title: 'Initial Window Consultation',
        type: 'initial-consult',
        status: 'CONFIRMED',
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        duration: 90,
        address: appointmentLead.address!,
        lat: appointmentLead.lat,
        lng: appointmentLead.lng,
        notes: 'Homeowner confirmed availability. Has 10 windows, interested in full replacement.',
      },
    });
    console.log(`✅ Appointment created`);
  } else {
    console.log(`⏭️  Appointments already seeded, skipping`);
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
  // AUTOMATION RULES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingAutomationCount = await prisma.automation.count();
  if (existingAutomationCount === 0) {
    await Promise.all([
      prisma.automation.create({ data: { name: 'Stale Lead Follow-Up — 7 Days', description: 'Send follow-up task when lead has no contact for 7 days', trigger: 'NO_CONTACT_DAYS', conditions: { noContactDays: 7, statusNotIn: ['SOLD', 'LOST', 'PAID'] }, actions: [{ type: 'CREATE_TASK', title: 'Re-engage stale lead', priority: 'high' }, { type: 'SEND_NOTIFICATION', message: 'Lead has gone 7 days without contact' }], isActive: true, delayMinutes: 0 } }),
      prisma.automation.create({ data: { name: 'Appointment Reminder — 24 Hours', description: 'Send appointment reminder to homeowner 24 hours before', trigger: 'APPOINTMENT_SET', conditions: { hoursUntilAppointment: 24 }, actions: [{ type: 'SEND_EMAIL', template: 'appointment-reminder' }, { type: 'SEND_SMS', message: 'Reminder: Your window consultation is tomorrow.' }], isActive: true, delayMinutes: 0 } }),
      prisma.automation.create({ data: { name: 'Proposal Follow-Up — 3 Days', description: 'Follow up 3 days after proposal is sent if no response', trigger: 'PROPOSAL_SENT', conditions: { daysAfterSend: 3, noResponse: true }, actions: [{ type: 'CREATE_TASK', title: 'Follow up on sent proposal', priority: 'high' }, { type: 'SEND_EMAIL', template: 'proposal-followup' }], isActive: true, delayMinutes: 3 * 24 * 60 } }),
      prisma.automation.create({ data: { name: 'Storm Opportunity Alert', description: 'Notify managers when a storm event affects leads in territory', trigger: 'STORM_EVENT', conditions: {}, actions: [{ type: 'SEND_NOTIFICATION', message: 'Storm event detected — activating storm opportunity mode' }, { type: 'UPDATE_LEAD_FLAGS', setStormLead: true }], isActive: true, delayMinutes: 0 } }),
    ]);
    console.log(`✅ Automation rules created`);
  } else {
    console.log(`⏭️  Automations already seeded, skipping`);
  }


  // ─────────────────────────────────────────────
  // TEMPLATES (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingTemplateCount = await prisma.template.count({ where: { organizationId: org.id } });
  if (existingTemplateCount === 0) {
    await Promise.all([
      prisma.template.create({ data: { organizationId: org.id, type: 'email', name: 'Appointment Reminder', subject: 'Your Window Consultation Tomorrow — {{appointment_time}}', bodyHtml: '<p>Hi {{first_name}},</p><p>Just a reminder that your window consultation is scheduled for <strong>{{appointment_datetime}}</strong>.</p><p>Your consultant {{rep_name}} will arrive at {{address}}.</p><p>If you need to reschedule, please call {{company_phone}}.</p>', variables: ['first_name', 'appointment_datetime', 'appointment_time', 'rep_name', 'address', 'company_phone'], isDefault: true } }),
      prisma.template.create({ data: { organizationId: org.id, type: 'proposal', name: 'Standard Window Replacement Proposal', brandingMode: 'windowworld-compatible', bodyHtml: '<div class="proposal">{{proposal_content}}</div>', variables: ['customer_name', 'property_address', 'total_windows', 'quote_total', 'rep_name', 'valid_until'], isDefault: true } }),
      prisma.template.create({ data: { organizationId: org.id, type: 'email', name: 'Proposal Follow-Up', subject: '{{first_name}}, Did You Have a Chance to Review Your Window Proposal?', bodyHtml: '<p>Hi {{first_name}},</p><p>I wanted to follow up on the window replacement proposal I sent over {{days_ago}} days ago.</p><p>I know decisions like this take time. Do you have any questions I can answer?</p>', variables: ['first_name', 'days_ago', 'install_window', 'rep_name', 'rep_phone'], isDefault: true } }),
    ]);
    console.log(`✅ Email/Proposal templates created`);
  } else {
    console.log(`⏭️  Templates already seeded, skipping`);
  }

  // ─────────────────────────────────────────────
  // CAMPAIGNS (skip if already seeded)
  // ─────────────────────────────────────────────
  const existingCampaignCount = await prisma.campaign.count({ where: { organizationId: org.id } });
  if (existingCampaignCount === 0) {
    await prisma.campaign.create({
      data: {
        organizationId: org.id, name: 'Summer 2025 Storm Follow-Up — BR Metro',
        type: 'storm-opportunity', status: 'active', isStormCampaign: true,
        targetParishes: ['East Baton Rouge', 'Livingston'], targetZips: ['70806', '70815', '70726'],
        targetLeadStatus: ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED'],
        leadCount: 47, contactedCount: 23, appointmentCount: 8, closeCount: 3,
        revenue: 41200, startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Campaign created`);
  } else {
    console.log(`⏭️  Campaign already seeded, skipping`);
  }


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
