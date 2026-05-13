import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Window World Assistant...');

  // ── Users ──
  const adminPw = await bcrypt.hash('admin123', 10);
  const demoPw = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'nedpearson@gmail.com' },
    update: {},
    create: { email: 'nedpearson@gmail.com', name: 'Ned Pearson', role: 'super_admin', password: adminPw }
  });

  const demoRep = await prisma.user.upsert({
    where: { email: 'demo@windowworld.com' },
    update: {},
    create: { email: 'demo@windowworld.com', name: 'Demo Sales Rep', role: 'sales_rep', password: demoPw }
  });

  // ── Customers ──
  const customers = [
    { firstName: 'James', lastName: 'Robertson', email: 'jrobertson@email.com', phone: '225-555-0101', address: '1420 Oak Valley Dr', city: 'Baton Rouge', state: 'LA', zip: '70810' },
    { firstName: 'Sarah', lastName: 'Mitchell', email: 'smitchell@email.com', phone: '225-555-0202', address: '8732 Bluebonnet Blvd', city: 'Baton Rouge', state: 'LA', zip: '70810' },
    { firstName: 'Robert', lastName: 'Thibodeaux', email: 'rthibodeaux@email.com', phone: '337-555-0303', address: '205 Magnolia St', city: 'Lafayette', state: 'LA', zip: '70501' },
    { firstName: 'Maria', lastName: 'Guidry', email: 'mguidry@email.com', phone: '985-555-0404', address: '1100 Canal St', city: 'Houma', state: 'LA', zip: '70360', preLead1978: true },
    { firstName: 'David', lastName: 'Landry', email: 'dlandry@email.com', phone: '225-555-0505', address: '3421 Perkins Rd', city: 'Baton Rouge', state: 'LA', zip: '70808' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }

  // ── Appointments ──
  const now = new Date();
  const appointmentData = [
    { customerId: createdCustomers[0].id, userId: admin.id, status: 'in_progress', appointmentDate: now, jobAddress: '1420 Oak Valley Dr', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70810', projectType: 'replacement', notes: 'Full house window replacement - 12 openings' },
    { customerId: createdCustomers[1].id, userId: admin.id, status: 'draft', appointmentDate: new Date(now.getTime() + 86400000), jobAddress: '8732 Bluebonnet Blvd', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70810', projectType: 'replacement' },
    { customerId: createdCustomers[2].id, userId: demoRep.id, status: 'quoted', appointmentDate: new Date(now.getTime() - 86400000), jobAddress: '205 Magnolia St', jobCity: 'Lafayette', jobState: 'LA', jobZip: '70501', projectType: 'replacement', subtotal: 8500, taxRate: 0.0945, taxAmount: 803.25, totalAmount: 9303.25, depositAmount: 3000, balanceDue: 6303.25 },
    { customerId: createdCustomers[3].id, userId: demoRep.id, status: 'sold', appointmentDate: new Date(now.getTime() - 172800000), jobAddress: '1100 Canal St', jobCity: 'Houma', jobState: 'LA', jobZip: '70360', projectType: 'replacement', subtotal: 12400, taxRate: 0.0945, taxAmount: 1171.80, totalAmount: 13571.80, depositAmount: 5000, balanceDue: 8571.80 },
    { customerId: createdCustomers[4].id, userId: admin.id, status: 'needs_remeasure', appointmentDate: new Date(now.getTime() - 259200000), jobAddress: '3421 Perkins Rd', jobCity: 'Baton Rouge', jobState: 'LA', jobZip: '70808', projectType: 'replacement', notes: 'Kitchen bay window needs remeasure' },
  ];

  const createdAppts = [];
  for (const a of appointmentData) {
    const appt = await prisma.appointment.create({ data: a });
    createdAppts.push(appt);
  }

  // ── Openings for appointment 1 (Robertson) ──
  const openingsData = [
    { appointmentId: createdAppts[0].id, openingNumber: 1, roomLocation: 'Living Room - Front', elevation: 'front', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'Colonial', gridPattern: '2x2', glassPackage: 'SolarZone', basePrice: 450, totalPrice: 520 },
    { appointmentId: createdAppts[0].id, openingNumber: 2, roomLocation: 'Living Room - Front', elevation: 'front', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'Colonial', gridPattern: '2x2', glassPackage: 'SolarZone', basePrice: 450, totalPrice: 520 },
    { appointmentId: createdAppts[0].id, openingNumber: 3, roomLocation: 'Kitchen', elevation: 'rear', width: 48, height: 36, productCategory: 'slider', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'Almond', glassPackage: 'SolarZone', basePrice: 380, totalPrice: 430 },
    { appointmentId: createdAppts[0].id, openingNumber: 4, roomLocation: 'Master Bedroom', elevation: 'left', width: 36, height: 60, productCategory: 'double_hung', seriesModel: '6000 Series', interiorColor: 'White', exteriorColor: 'Clay', gridStyle: 'Prairie', gridPattern: '3x1', glassPackage: 'SolarZone Elite', argon: true, foamEnhanced: true, basePrice: 650, totalPrice: 780 },
    { appointmentId: createdAppts[0].id, openingNumber: 5, roomLocation: 'Master Bath', elevation: 'left', width: 24, height: 36, productCategory: 'awning', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'Clay', obscureGlass: true, glassPackage: 'SolarZone', basePrice: 320, totalPrice: 370 },
    { appointmentId: createdAppts[0].id, openingNumber: 6, roomLocation: 'Dining Room', elevation: 'front', width: 72, height: 48, productCategory: 'picture', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', temperedGlass: true, basePrice: 520, totalPrice: 600 },
    { appointmentId: createdAppts[0].id, openingNumber: 7, roomLocation: 'Foyer', elevation: 'front', width: 24, height: 24, productCategory: 'circle_top', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', radius: 12, basePrice: 380, totalPrice: 420, specialtyNotes: 'Above front door' },
    { appointmentId: createdAppts[0].id, openingNumber: 8, roomLocation: 'Bedroom 2', elevation: 'right', width: 30, height: 54, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', basePrice: 420, totalPrice: 470 },
    { appointmentId: createdAppts[0].id, openingNumber: 9, roomLocation: 'Bedroom 3', elevation: 'right', width: 30, height: 54, productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', glassPackage: 'SolarZone', basePrice: 420, totalPrice: 470 },
    { appointmentId: createdAppts[0].id, openingNumber: 10, roomLocation: 'Back Patio', elevation: 'rear', width: 72, height: 80, productCategory: 'patio_door', seriesModel: '6000 Series', interiorColor: 'White', exteriorColor: 'Clay', glassPackage: 'SolarZone Elite', argon: true, temperedGlass: true, screenOption: 'Retractable', basePrice: 1800, totalPrice: 2100 },
  ];

  for (const o of openingsData) {
    const unitedInches = o.width + o.height;
    await prisma.opening.create({ data: { ...o, unitedInches } });
  }

  // ── Pricing Tables ──
  const dhTable = await prisma.pricingTable.create({
    data: { name: 'Double Hung Base Pricing', category: 'product', description: 'Base pricing for double hung windows by united inches' }
  });

  const dhPrices = [
    { label: 'DH ≤73 UI', unitedInchesMin: 0, unitedInchesMax: 73, price: 289, productCategory: 'double_hung', seriesModel: '4000 Series', needsVerification: true },
    { label: 'DH 74-87 UI', unitedInchesMin: 74, unitedInchesMax: 87, price: 319, productCategory: 'double_hung', seriesModel: '4000 Series', needsVerification: true },
    { label: 'DH 88-101 UI', unitedInchesMin: 88, unitedInchesMax: 101, price: 369, productCategory: 'double_hung', seriesModel: '4000 Series', needsVerification: true },
    { label: 'DH 102-120 UI', unitedInchesMin: 102, unitedInchesMax: 120, price: 449, productCategory: 'double_hung', seriesModel: '4000 Series', needsVerification: true },
    { label: 'DH >120 UI', unitedInchesMin: 121, unitedInchesMax: 200, price: 549, productCategory: 'double_hung', seriesModel: '4000 Series', needsVerification: true },
  ];

  for (let i = 0; i < dhPrices.length; i++) {
    await prisma.pricingItem.create({ data: { ...dhPrices[i], pricingTableId: dhTable.id, sortOrder: i } });
  }

  const optTable = await prisma.pricingTable.create({
    data: { name: 'Window Options', category: 'option', description: 'Add-on options for windows' }
  });

  const options = [
    { label: 'Grid - Colonial', price: 45, needsVerification: true },
    { label: 'Grid - Prairie', price: 55, needsVerification: true },
    { label: 'Grid - Diamond', price: 65, needsVerification: true },
    { label: 'Tempered Glass', price: 35, needsVerification: true },
    { label: 'Obscure Glass', price: 25, needsVerification: true },
    { label: 'Argon Gas Fill', price: 30, needsVerification: true },
    { label: 'Foam Enhanced Frame', price: 40, needsVerification: true },
    { label: 'Low-E Standard', price: 0, isDefault: true },
    { label: 'Low-E SolarZone', price: 25, needsVerification: true },
    { label: 'Low-E SolarZone Elite', price: 55, needsVerification: true },
    { label: 'Screen - Standard', price: 0, isDefault: true },
    { label: 'Screen - Retractable', price: 85, needsVerification: true },
  ];

  for (let i = 0; i < options.length; i++) {
    await prisma.pricingItem.create({ data: { ...options[i], pricingTableId: optTable.id, sortOrder: i } });
  }

  const laborTable = await prisma.pricingTable.create({
    data: { name: 'Labor & Installation', category: 'labor', description: 'Installation and removal charges' }
  });

  const laborItems = [
    { label: 'Standard Installation', price: 75, needsVerification: true },
    { label: 'Full Tearout & Replace', price: 150, needsVerification: true },
    { label: 'Insert Installation', price: 50, needsVerification: true },
    { label: 'Wood Rot Repair - Minor', price: 125, needsVerification: true },
    { label: 'Wood Rot Repair - Major', price: 275, needsVerification: true },
    { label: 'Trim / Capping - Per LF', price: 8, priceType: 'per_linft', needsVerification: true },
    { label: 'Sill Replacement', price: 95, needsVerification: true },
  ];

  for (let i = 0; i < laborItems.length; i++) {
    await prisma.pricingItem.create({ data: { ...laborItems[i], pricingTableId: laborTable.id, sortOrder: i } });
  }

  // Specialty shape pricing
  const specTable = await prisma.pricingTable.create({
    data: { name: 'Specialty Shapes', category: 'specialty', description: 'Pricing for specialty window shapes' }
  });

  const specItems = [
    { label: 'Circle Top ≤48 UI', unitedInchesMin: 0, unitedInchesMax: 48, price: 350, productCategory: 'circle_top', needsVerification: true },
    { label: 'Circle Top 49-72 UI', unitedInchesMin: 49, unitedInchesMax: 72, price: 450, productCategory: 'circle_top', needsVerification: true },
    { label: 'Eyebrow ≤60 UI', unitedInchesMin: 0, unitedInchesMax: 60, price: 380, productCategory: 'eyebrow', needsVerification: true },
    { label: 'Quarter Arch ≤48 UI', unitedInchesMin: 0, unitedInchesMax: 48, price: 320, productCategory: 'quarter_arch', needsVerification: true },
  ];

  for (let i = 0; i < specItems.length; i++) {
    await prisma.pricingItem.create({ data: { ...specItems[i], pricingTableId: specTable.id, sortOrder: i } });
  }

  console.log('✅ Seed complete!');
  console.log(`   Admin: nedpearson@gmail.com / admin123`);
  console.log(`   Demo:  demo@windowworld.com / demo123`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
