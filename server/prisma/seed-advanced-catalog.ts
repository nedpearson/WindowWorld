import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Advanced WindowWorld Exterior Catalog...\n');

  // 1. Get Categories
  const catWindows = await prisma.productCategory.findUnique({ where: { slug: 'windows' } });
  const catDoors = await prisma.productCategory.findUnique({ where: { slug: 'doors' } });
  const catSiding = await prisma.productCategory.findUnique({ where: { slug: 'siding' } });

  // 2. Get Subcategories
  const subCatDoubleHung = await prisma.productSubcategory.findUnique({ where: { slug: 'double-hung-windows' } });
  const subCatSliding = await prisma.productSubcategory.findUnique({ where: { slug: 'sliding-windows' } });
  const subCatEntryDoors = await prisma.productSubcategory.findUnique({ where: { slug: 'entry-doors' } });
  const subCatSidingSeries = await prisma.productSubcategory.findUnique({ where: { slug: 'siding-series' } });

  // 3. Get Series
  const series4000 = await prisma.productSeries.findUnique({ where: { slug: 'series-4000-windows' } });
  const series6000 = await prisma.productSeries.findUnique({ where: { slug: 'series-6000-siding' } });
  const thermaTru = await prisma.productSeries.findUnique({ where: { slug: 'therma-tru-classic-craft' } });

  if (!catWindows || !catDoors || !catSiding) {
    console.error("❌ Categories not found. Please run 'npm run seed:catalog' first.");
    process.exit(1);
  }

  // 4. Upsert Rich Products

  // --- DOUBLE HUNG WINDOWS ---
  const dhProduct = await prisma.product.upsert({
    where: { sku: 'WW-DH-PREMIUM' },
    update: {
      description: 'Best-selling balance of style and functionality. Opens from top and bottom. Made in the USA with heavy-duty vinyl construction.',
      features: ['Tilt-in sashes for easy cleaning', 'Energy-efficient insulated glass', 'Vinyl finish', 'Good Housekeeping Seal', 'Lifetime limited warranty'],
      basePrice: 650.00,
    },
    create: {
      sku: 'WW-DH-PREMIUM',
      name: 'Double-Hung Windows',
      manufacturer: 'Window World',
      windowType: 'DOUBLE_HUNG',
      frameMaterial: 'VINYL',
      description: 'Best-selling balance of style and functionality. Opens from top and bottom. Made in the USA with heavy-duty vinyl construction.',
      features: ['Tilt-in sashes for easy cleaning', 'Energy-efficient insulated glass', 'Vinyl finish', 'Good Housekeeping Seal', 'Lifetime limited warranty'],
      basePrice: 650.00,
      installIncluded: true,
      categoryId: catWindows.id,
      subcategoryId: subCatDoubleHung?.id,
      seriesId: series4000?.id,
      warrantyNotes: 'Lifetime Limited Warranty',
    }
  });

  // Images for DH
  await prisma.productVisual.deleteMany({ where: { productId: dhProduct.id } });
  await prisma.productVisual.createMany({
    data: [
      { productId: dhProduct.id, url: 'https://www.windowworld.com/assets/images/products/windows/double-hung-window-white.jpg', isPrimary: true },
      { productId: dhProduct.id, url: 'https://www.windowworld.com/assets/images/products/windows/double-hung-window-interior.jpg', isPrimary: false }
    ]
  });

  // Colors for DH
  await prisma.productOption.deleteMany({ where: { productId: dhProduct.id } });
  await prisma.productOption.createMany({
    data: [
      { productId: dhProduct.id, category: 'color', name: 'Interior Color', value: 'White', isDefault: true, priceDelta: 0 },
      { productId: dhProduct.id, category: 'color', name: 'Interior Color', value: 'Beige', priceDelta: 0 },
      { productId: dhProduct.id, category: 'color', name: 'Interior Color', value: 'Dark Brown', priceDelta: 50 },
      { productId: dhProduct.id, category: 'color', name: 'Interior Color', value: 'Light Oak Woodgrain', priceDelta: 150 },
      { productId: dhProduct.id, category: 'color', name: 'Exterior Color', value: 'White', isDefault: true, priceDelta: 0 },
      { productId: dhProduct.id, category: 'color', name: 'Exterior Color', value: 'Black', priceDelta: 100 },
      { productId: dhProduct.id, category: 'color', name: 'Exterior Color', value: 'Bronze', priceDelta: 100 },
      { productId: dhProduct.id, category: 'color', name: 'Exterior Color', value: 'Green', priceDelta: 100 },
    ]
  });

  // --- SLIDING WINDOWS ---
  const slideProduct = await prisma.product.upsert({
    where: { sku: 'WW-SL-PREMIUM' },
    update: {
      description: 'Modern solution for framed views and fresh air. Provides a wide, unobstructed view.',
      features: ['Easy glide operation', 'Slim profile', 'Durable vinyl', 'Energy-efficient glass'],
      basePrice: 700.00,
    },
    create: {
      sku: 'WW-SL-PREMIUM',
      name: 'Sliding Windows',
      manufacturer: 'Window World',
      windowType: 'SLIDER',
      frameMaterial: 'VINYL',
      description: 'Modern solution for framed views and fresh air. Provides a wide, unobstructed view.',
      features: ['Easy glide operation', 'Slim profile', 'Durable vinyl', 'Energy-efficient glass'],
      basePrice: 700.00,
      installIncluded: true,
      categoryId: catWindows.id,
      subcategoryId: subCatSliding?.id,
      warrantyNotes: 'Lifetime Limited Warranty',
    }
  });

  // Images for Slider
  await prisma.productVisual.deleteMany({ where: { productId: slideProduct.id } });
  await prisma.productVisual.create({
    data: { productId: slideProduct.id, url: 'https://www.windowworld.com/assets/images/products/windows/sliding-window.jpg', isPrimary: true }
  });


  // --- ENTRY DOORS ---
  const doorProduct = await prisma.product.upsert({
    where: { sku: 'WW-ENTRY-FIBER' },
    update: {
      description: 'The look of custom wood with the performance of fiberglass.',
      features: ['4x Insulation of wood', 'Fiberglass construction', 'Rust and dent resistant', 'Good Housekeeping Seal'],
      basePrice: 2200.00,
    },
    create: {
      sku: 'WW-ENTRY-FIBER',
      name: 'Woodgrain Entry Doors',
      manufacturer: 'Window World',
      description: 'The look of custom wood with the performance of fiberglass.',
      features: ['4x Insulation of wood', 'Fiberglass construction', 'Rust and dent resistant', 'Good Housekeeping Seal'],
      basePrice: 2200.00,
      installIncluded: true,
      categoryId: catDoors.id,
      subcategoryId: subCatEntryDoors?.id,
      seriesId: thermaTru?.id,
      warrantyNotes: 'Lifetime Limited Warranty',
    }
  });

  // Images for Door
  await prisma.productVisual.deleteMany({ where: { productId: doorProduct.id } });
  await prisma.productVisual.create({
    data: { productId: doorProduct.id, url: 'https://www.windowworld.com/assets/images/products/doors/woodgrain-entry-door.jpg', isPrimary: true }
  });

  // Colors for Door
  await prisma.productOption.deleteMany({ where: { productId: doorProduct.id } });
  await prisma.productOption.createMany({
    data: [
      { productId: doorProduct.id, category: 'color', name: 'Stain Finish', value: 'Oak Stain', isDefault: true, priceDelta: 0 },
      { productId: doorProduct.id, category: 'color', name: 'Stain Finish', value: 'Mahogany Stain', priceDelta: 0 },
      { productId: doorProduct.id, category: 'color', name: 'Stain Finish', value: 'Cherry Stain', priceDelta: 0 },
      { productId: doorProduct.id, category: 'color', name: 'Stain Finish', value: 'Custom Paint', priceDelta: 150 },
    ]
  });


  // --- VINYL SIDING ---
  const sidingProduct = await prisma.product.upsert({
    where: { sku: 'WW-SIDING-6000' },
    update: {
      description: 'Highest performing insulated vinyl siding.',
      features: ['Noise reduction', 'Impact resistant', 'High R-value insulation', 'Thick gauge vinyl'],
      basePrice: 12.50, // per sq ft installed approx
    },
    create: {
      sku: 'WW-SIDING-6000',
      name: '6000 Series Siding',
      manufacturer: 'Window World',
      description: 'Highest performing insulated vinyl siding.',
      features: ['Noise reduction', 'Impact resistant', 'High R-value insulation', 'Thick gauge vinyl'],
      basePrice: 12.50,
      installIncluded: true,
      categoryId: catSiding.id,
      subcategoryId: subCatSidingSeries?.id,
      seriesId: series6000?.id,
      warrantyNotes: 'Lifetime Limited Warranty',
    }
  });

  // Images for Siding
  await prisma.productVisual.deleteMany({ where: { productId: sidingProduct.id } });
  await prisma.productVisual.create({
    data: { productId: sidingProduct.id, url: 'https://www.windowworld.com/assets/images/products/siding/6000-series-siding.jpg', isPrimary: true }
  });

  // Colors for Siding
  await prisma.productOption.deleteMany({ where: { productId: sidingProduct.id } });
  await prisma.productOption.createMany({
    data: [
      { productId: sidingProduct.id, category: 'color', name: 'Siding Color', value: 'Adobe Cream', isDefault: true, priceDelta: 0 },
      { productId: sidingProduct.id, category: 'color', name: 'Siding Color', value: 'Granite', priceDelta: 0 },
      { productId: sidingProduct.id, category: 'color', name: 'Siding Color', value: 'Colonial Ivory', priceDelta: 0 },
      { productId: sidingProduct.id, category: 'color', name: 'Siding Color', value: 'Canyon Drift', priceDelta: 0 },
    ]
  });


  console.log(`✅ Rich Products, Options, and Visuals Created`);
  console.log('🎉 Advanced catalog seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
