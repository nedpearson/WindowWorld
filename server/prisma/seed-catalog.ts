import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding WindowWorld Exterior Catalog (Baton Rouge)...\n');

  // We seed this globally without an organizationId so all orgs can use it,
  // or we assign it to the demo and real orgs.
  // For safety, we'll just not assign an organizationId (global catalog).

  // ─────────────────────────────────────────────
  // 1. PRODUCT CATEGORIES
  // ─────────────────────────────────────────────
  const catWindows = await prisma.productCategory.upsert({
    where: { slug: 'windows' },
    update: {},
    create: { name: 'Windows', slug: 'windows', description: 'Replacement windows, energy efficient, lifetime warranty.', sortOrder: 1 }
  });

  const catDoors = await prisma.productCategory.upsert({
    where: { slug: 'doors' },
    update: {},
    create: { name: 'Doors', slug: 'doors', description: 'Entry, patio, and storm doors.', sortOrder: 2 }
  });

  const catSiding = await prisma.productCategory.upsert({
    where: { slug: 'siding' },
    update: {},
    create: { name: 'Vinyl Siding', slug: 'siding', description: 'Premium vinyl siding, shakes, and scallops.', sortOrder: 3 }
  });

  const catShutters = await prisma.productCategory.upsert({
    where: { slug: 'shutters' },
    update: {},
    create: { name: 'Shutters', slug: 'shutters', description: 'Exterior window shutters.', sortOrder: 4 }
  });

  console.log(`✅ Categories Created`);

  // ─────────────────────────────────────────────
  // 2. PRODUCT SUBCATEGORIES
  // ─────────────────────────────────────────────

  // Windows
  const subCatDoubleHung = await prisma.productSubcategory.upsert({
    where: { slug: 'double-hung-windows' },
    update: { categoryId: catWindows.id },
    create: { categoryId: catWindows.id, name: 'Double Hung Windows', slug: 'double-hung-windows', sortOrder: 1 }
  });
  
  const subCatSingleHung = await prisma.productSubcategory.upsert({
    where: { slug: 'single-hung-windows' },
    update: { categoryId: catWindows.id },
    create: { categoryId: catWindows.id, name: 'Single Hung Windows', slug: 'single-hung-windows', sortOrder: 2 }
  });

  const subCatSliding = await prisma.productSubcategory.upsert({
    where: { slug: 'sliding-windows' },
    update: { categoryId: catWindows.id },
    create: { categoryId: catWindows.id, name: 'Sliding Windows', slug: 'sliding-windows', sortOrder: 3 }
  });

  const subCatCasement = await prisma.productSubcategory.upsert({
    where: { slug: 'casement-windows' },
    update: { categoryId: catWindows.id },
    create: { categoryId: catWindows.id, name: 'Casement Windows', slug: 'casement-windows', sortOrder: 4 }
  });

  // Doors
  const subCatEntryDoors = await prisma.productSubcategory.upsert({
    where: { slug: 'entry-doors' },
    update: { categoryId: catDoors.id },
    create: { categoryId: catDoors.id, name: 'Entry Doors', slug: 'entry-doors', sortOrder: 1 }
  });

  const subCatPatioDoors = await prisma.productSubcategory.upsert({
    where: { slug: 'patio-doors' },
    update: { categoryId: catDoors.id },
    create: { categoryId: catDoors.id, name: 'Patio Doors', slug: 'patio-doors', sortOrder: 2 }
  });

  const subCatStormDoors = await prisma.productSubcategory.upsert({
    where: { slug: 'storm-doors' },
    update: { categoryId: catDoors.id },
    create: { categoryId: catDoors.id, name: 'Storm Doors', slug: 'storm-doors', sortOrder: 3 }
  });

  // Siding
  const subCatSidingSeries = await prisma.productSubcategory.upsert({
    where: { slug: 'siding-series' },
    update: { categoryId: catSiding.id },
    create: { categoryId: catSiding.id, name: 'Siding Panels', slug: 'siding-series', sortOrder: 1 }
  });

  const subCatShakes = await prisma.productSubcategory.upsert({
    where: { slug: 'shakes-scallops' },
    update: { categoryId: catSiding.id },
    create: { categoryId: catSiding.id, name: 'Shakes & Scallops', slug: 'shakes-scallops', sortOrder: 2 }
  });

  console.log(`✅ Subcategories Created`);

  // ─────────────────────────────────────────────
  // 3. PRODUCT SERIES
  // ─────────────────────────────────────────────

  // Windows
  const series4000 = await prisma.productSeries.upsert({
    where: { slug: 'series-4000-windows' },
    update: { subcategoryId: subCatDoubleHung.id },
    create: { subcategoryId: subCatDoubleHung.id, name: '4000 Series', slug: 'series-4000-windows', description: 'Premium double hung replacement windows.' }
  });
  
  const series6000 = await prisma.productSeries.upsert({
    where: { slug: 'series-6000-windows' },
    update: { subcategoryId: subCatDoubleHung.id },
    create: { subcategoryId: subCatDoubleHung.id, name: '6000 Series', slug: 'series-6000-windows', description: 'Top-tier high performance windows.' }
  });

  const series2000 = await prisma.productSeries.upsert({
    where: { slug: 'series-2000-windows' },
    update: { subcategoryId: subCatSingleHung.id },
    create: { subcategoryId: subCatSingleHung.id, name: '2000 Series', slug: 'series-2000-windows', description: 'Affordable single hung efficiency.' }
  });

  // Siding
  const siding4000 = await prisma.productSeries.upsert({
    where: { slug: 'series-4000-siding' },
    update: { subcategoryId: subCatSidingSeries.id },
    create: { subcategoryId: subCatSidingSeries.id, name: '4000 Series Siding', slug: 'series-4000-siding', description: 'Reinforced vinyl siding with energy-efficient foam.' }
  });

  const siding6000 = await prisma.productSeries.upsert({
    where: { slug: 'series-6000-siding' },
    update: { subcategoryId: subCatSidingSeries.id },
    create: { subcategoryId: subCatSidingSeries.id, name: '6000 Series Siding', slug: 'series-6000-siding', description: 'Premium ultra-thick reinforced vinyl siding.' }
  });

  // Doors
  const thermaTru = await prisma.productSeries.upsert({
    where: { slug: 'therma-tru-classic-craft' },
    update: { subcategoryId: subCatEntryDoors.id },
    create: { subcategoryId: subCatEntryDoors.id, name: 'Therma-Tru Classic Craft', slug: 'therma-tru-classic-craft', description: 'Premium fiberglass entry doors.' }
  });

  console.log(`✅ Series Created`);

  // ─────────────────────────────────────────────
  // 4. PRODUCTS (Example Seed)
  // ─────────────────────────────────────────────
  
  await prisma.product.upsert({
    where: { sku: 'WW-DH-4000' },
    update: {
      categoryId: catWindows.id,
      subcategoryId: subCatDoubleHung.id,
      seriesId: series4000.id,
    },
    create: {
      sku: 'WW-DH-4000',
      name: 'Window World 4000 Series Double Hung',
      manufacturer: 'Window World',
      windowType: 'DOUBLE_HUNG',
      frameMaterial: 'VINYL',
      description: 'The 4000 series is our most popular replacement window, featuring double-hung convenience and excellent energy efficiency.',
      basePrice: 650.00,
      installIncluded: true,
      categoryId: catWindows.id,
      subcategoryId: subCatDoubleHung.id,
      seriesId: series4000.id,
      salesNotes: 'Highlight the easy tilt-in cleaning feature.',
      warrantyNotes: 'Limited Lifetime Warranty including glass breakage.',
    }
  });

  await prisma.product.upsert({
    where: { sku: 'WW-ENTRY-TTCC' },
    update: {
      categoryId: catDoors.id,
      subcategoryId: subCatEntryDoors.id,
      seriesId: thermaTru.id,
    },
    create: {
      sku: 'WW-ENTRY-TTCC',
      name: 'Therma-Tru Classic Craft Entry Door',
      manufacturer: 'Therma-Tru',
      description: 'Stunning fiberglass entry door that mimics the look of real wood without the maintenance.',
      basePrice: 2400.00,
      installIncluded: true,
      categoryId: catDoors.id,
      subcategoryId: subCatEntryDoors.id,
      seriesId: thermaTru.id,
      salesNotes: 'Emphasize curb appeal and security.',
    }
  });

  await prisma.product.upsert({
    where: { sku: 'WW-SIDING-4000' },
    update: {
      categoryId: catSiding.id,
      subcategoryId: subCatSidingSeries.id,
      seriesId: siding4000.id,
    },
    create: {
      sku: 'WW-SIDING-4000',
      name: 'Window World 4000 Series Siding',
      manufacturer: 'Window World',
      description: 'Premium vinyl siding with advanced foam insulation backing for impact resistance and energy savings.',
      basePrice: 8.50, // Per sqft
      installIncluded: true,
      categoryId: catSiding.id,
      subcategoryId: subCatSidingSeries.id,
      seriesId: siding4000.id,
      salesNotes: 'Mention the insulation value and noise reduction.',
    }
  });

  console.log(`✅ Products Created`);
  console.log('🎉 Catalog seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
