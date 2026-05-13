import { Router } from 'express';
import { prisma } from '../index.js';

export const pricingRoutes = Router();

// ─── Pricing Tables CRUD ────────────────────────────────

// List all pricing tables
pricingRoutes.get('/tables', async (_req, res) => {
  try {
    const tables = await prisma.pricingTable.findMany({
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' }
    });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pricing tables' });
  }
});

// Get single pricing table
pricingRoutes.get('/tables/:id', async (req, res) => {
  try {
    const table = await prisma.pricingTable.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Create pricing table
pricingRoutes.post('/tables', async (req, res) => {
  try {
    const table = await prisma.pricingTable.create({ data: req.body });
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update pricing table
pricingRoutes.put('/tables/:id', async (req, res) => {
  try {
    const table = await prisma.pricingTable.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete pricing table
pricingRoutes.delete('/tables/:id', async (req, res) => {
  try {
    await prisma.pricingTable.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// ─── Pricing Items CRUD ─────────────────────────────────

// Create pricing item
pricingRoutes.post('/items', async (req, res) => {
  try {
    const item = await prisma.pricingItem.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update pricing item
pricingRoutes.put('/items/:id', async (req, res) => {
  try {
    const item = await prisma.pricingItem.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete pricing item
pricingRoutes.delete('/items/:id', async (req, res) => {
  try {
    await prisma.pricingItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ─── Price Lookup ────────────────────────────────────────

// Lookup price for a product configuration
pricingRoutes.post('/lookup', async (req, res) => {
  try {
    const { productCategory, seriesModel, unitedInches, options } = req.body;

    // Find base product price by united inches tier
    const baseItems = await prisma.pricingItem.findMany({
      where: {
        pricingTable: { category: 'product', isActive: true },
        productCategory,
        ...(seriesModel ? { seriesModel } : {}),
      },
      orderBy: { unitedInchesMin: 'asc' }
    });

    let basePrice = 0;
    let needsVerification = false;

    const matchedItem = baseItems.find(item =>
      (!item.unitedInchesMin || unitedInches >= item.unitedInchesMin) &&
      (!item.unitedInchesMax || unitedInches <= item.unitedInchesMax)
    );

    if (matchedItem) {
      basePrice = matchedItem.price;
      needsVerification = matchedItem.needsVerification;
    } else if (baseItems.length > 0) {
      // Use highest tier as fallback
      basePrice = baseItems[baseItems.length - 1].price;
      needsVerification = true;
    }

    // Look up option prices
    let optionsTotal = 0;
    const optionDetails: any[] = [];

    if (options && Array.isArray(options)) {
      for (const opt of options) {
        const optItem = await prisma.pricingItem.findFirst({
          where: {
            pricingTable: { category: 'option', isActive: true },
            label: { contains: opt }
          }
        });
        if (optItem) {
          let optPrice = optItem.price;
          if (optItem.priceType === 'per_unit') optPrice = optItem.price * unitedInches;
          optionsTotal += optPrice;
          optionDetails.push({ label: optItem.label, price: optPrice, needsVerification: optItem.needsVerification });
          if (optItem.needsVerification) needsVerification = true;
        }
      }
    }

    res.json({
      basePrice,
      optionsTotal,
      totalPrice: basePrice + optionsTotal,
      needsVerification,
      optionDetails
    });
  } catch (err) {
    res.status(500).json({ error: 'Price lookup failed' });
  }
});
