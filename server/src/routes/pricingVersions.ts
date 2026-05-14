import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const pricingVersionRoutes = Router();

// All pricing-version routes require a valid JWT
pricingVersionRoutes.use(requireAuth);

// Get active published version
pricingVersionRoutes.get('/active', async (_req, res) => {
  try {
    const version = await prisma.pricingVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    if (!version) return res.status(404).json({ error: 'No active pricing version' });
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active pricing' });
  }
});

// List all versions
pricingVersionRoutes.get('/', async (_req, res) => {
  try {
    const versions = await prisma.pricingVersion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } }
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get version with items
pricingVersionRoutes.get('/:id', async (req, res) => {
  try {
    const v = await prisma.pricingVersion.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Create version from import — admin only
pricingVersionRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, importId, items, notes } = req.body;
    const version = await prisma.pricingVersion.create({
      data: {
        name,
        importId,
        notes,
        items: items ? { createMany: { data: items } } : undefined
      },
      include: { items: true }
    });
    res.status(201).json(version);
  } catch (err: any) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

// Publish version — admin only
pricingVersionRoutes.post('/:id/publish', requireAdmin, async (req, res) => {
  try {
    await prisma.pricingVersion.updateMany({
      where: { status: 'published' },
      data: { status: 'archived' }
    });
    const v = await prisma.pricingVersion.update({
      where: { id: String(req.params.id) },
      data: { status: 'published', publishedAt: new Date(), publishedBy: req.body.userId }
    });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'Publish failed' });
  }
});

// ── Centralized Pricing Engine ──────────────────────────
pricingVersionRoutes.post('/calculate', async (req, res) => {
  try {
    const { openings, taxRate = 0.0945, adminFee = 0, discount = 0 } = req.body;

    // Get active version
    const version = await prisma.pricingVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      include: { items: true }
    });

    if (!version) {
      return res.json({ error: 'No published pricing version', lineItems: [], missingRules: [], totals: { subtotal: 0, tax: 0, total: 0 } });
    }

    const lineItems: any[] = [];
    const missingRules: any[] = [];

    for (const opening of openings) {
      const ui = (opening.width || 0) + (opening.height || 0);
      const qty = opening.quantity || 1;

      // Base price lookup
      const baseItem = version.items.find(i =>
        i.category === 'product' &&
        i.productCategory === opening.productCategory &&
        (!i.seriesModel || i.seriesModel === opening.seriesModel) &&
        (i.unitedInchesMin == null || ui >= i.unitedInchesMin) &&
        (i.unitedInchesMax == null || ui <= i.unitedInchesMax)
      );

      if (baseItem) {
        lineItems.push({
          openingNumber: opening.openingNumber,
          label: `#${opening.openingNumber} ${baseItem.label}`,
          category: 'product',
          quantity: qty,
          unitPrice: baseItem.price,
          totalPrice: baseItem.price * qty,
          confidence: baseItem.confidence,
          needsVerification: baseItem.needsVerification,
          explanation: `UI=${ui}, Tier ${baseItem.unitedInchesMin}-${baseItem.unitedInchesMax}, Version: ${version.name}`
        });
      } else {
        missingRules.push({
          openingNumber: opening.openingNumber,
          productCategory: opening.productCategory,
          seriesModel: opening.seriesModel,
          unitedInches: ui,
          description: `No base price for ${opening.productCategory} ${opening.seriesModel || ''} at UI=${ui}`
        });
      }

      // Option adders
      const optionChecks = [
        { field: 'gridStyle', label: `Grid - ${opening.gridStyle}` },
        { field: 'temperedGlass', label: 'Tempered Glass' },
        { field: 'obscureGlass', label: 'Obscure Glass' },
        { field: 'foamEnhanced', label: 'Foam Enhanced Frame', check: opening.foamEnhanced },
        { field: 'argon', label: 'Argon Gas Fill', check: opening.argon },
        { field: 'screenOption', label: `Screen - ${opening.screenOption}` },
      ];

      for (const opt of optionChecks) {
        const val = opt.check ?? opening[opt.field];
        if (!val || val === 'None' || val === 'Standard' || val === 'none' || val === false) continue;
        const item = version.items.find(i => i.category === 'option' && i.label.toLowerCase().includes(opt.label.toLowerCase().split(' - ')[1] || opt.label.toLowerCase()));
        if (item) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${item.label}`,
            category: 'option',
            quantity: qty,
            unitPrice: item.price,
            totalPrice: item.price * qty,
            confidence: item.confidence,
            needsVerification: item.needsVerification,
            explanation: `Option: ${item.label}`
          });
        }
      }

      // Labor
      if (opening.removalType && opening.removalType !== 'none') {
        const laborLabel = opening.removalType === 'full_tearout' ? 'Full Tearout' : 'Insert Installation';
        const laborItem = version.items.find(i => i.category === 'labor' && i.label.toLowerCase().includes(laborLabel.toLowerCase()));
        if (laborItem) {
          lineItems.push({
            openingNumber: opening.openingNumber,
            label: `#${opening.openingNumber} ${laborItem.label}`,
            category: 'labor',
            quantity: qty,
            unitPrice: laborItem.price,
            totalPrice: laborItem.price * qty,
            confidence: laborItem.confidence,
            needsVerification: laborItem.needsVerification,
            explanation: `Labor: ${laborItem.label}`
          });
        }
      }
    }

    const subtotal = lineItems.reduce((s, li) => s + li.totalPrice, 0);
    const discounted = subtotal - discount;
    const tax = discounted * taxRate;
    const total = discounted + tax + adminFee;

    // Log missing rules
    for (const mr of missingRules) {
      await prisma.missingPricingRule.create({ data: mr });
    }

    res.json({
      pricingVersionId: version.id,
      pricingVersionName: version.name,
      lineItems,
      missingRules,
      totals: { subtotal, discount, discounted, taxRate, tax, adminFee, total }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Calculate failed', details: err.message });
  }
});

// ── Pricing Import ──────────────────────────────────────
pricingVersionRoutes.post('/imports', async (req, res) => {
  try {
    const imp = await prisma.pricingImport.create({ data: req.body });
    res.status(201).json(imp);
  } catch (err) {
    res.status(500).json({ error: 'Import create failed' });
  }
});

pricingVersionRoutes.get('/imports', async (_req, res) => {
  try {
    const imports = await prisma.pricingImport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { rows: true } } }
    });
    res.json(imports);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

pricingVersionRoutes.get('/imports/:id', async (req, res) => {
  try {
    const imp = await prisma.pricingImport.findUnique({
      where: { id: req.params.id },
      include: { rows: { orderBy: { rowNumber: 'asc' } } }
    });
    if (!imp) return res.status(404).json({ error: 'Not found' });
    res.json(imp);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Parse CSV pricing import
pricingVersionRoutes.post('/imports/:id/parse-csv', async (req, res) => {
  try {
    const { csvData } = req.body;
    const lines = csvData.split('\n').filter((l: string) => l.trim());
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c: string) => c.trim());
      const row: any = { importId: req.params.id, rowNumber: i, rawData: lines[i] };

      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const v = cells[j] || '';
        if (h.includes('category') || h.includes('type')) row.category = v;
        if (h.includes('product') || h.includes('window')) row.productCategory = v;
        if (h.includes('series') || h.includes('model')) row.seriesModel = v;
        if (h.includes('label') || h.includes('description') || h.includes('name')) row.label = v;
        if (h.includes('min') && h.includes('ui') || h.includes('min') && h.includes('inch')) row.unitedInchesMin = parseFloat(v) || null;
        if (h.includes('max') && h.includes('ui') || h.includes('max') && h.includes('inch')) row.unitedInchesMax = parseFloat(v) || null;
        if (h.includes('price') && !h.includes('type')) row.price = parseFloat(v.replace('$', '').replace(',', '')) || null;
        if (h.includes('price') && h.includes('type')) row.priceType = v;
      }

      row.confidence = row.price && row.label ? 0.8 : 0.3;
      row.needsVerification = row.confidence < 0.7;
      rows.push(row);
    }

    const created = await prisma.pricingImportRow.createMany({ data: rows });
    await prisma.pricingImport.update({
      where: { id: req.params.id },
      data: { status: 'parsed', parsedRowCount: rows.length }
    });

    res.json({ count: created.count, rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Parse failed', details: err.message });
  }
});

// Convert import to version — admin only
pricingVersionRoutes.post('/imports/:id/to-version', requireAdmin, async (req, res) => {
  try {
    const imp = await prisma.pricingImport.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!imp) return res.status(404).json({ error: 'Not found' });

    const rows = await prisma.pricingImportRow.findMany({
      where: { importId: imp.id, status: { not: 'rejected' } }
    });

    const version = await prisma.pricingVersion.create({
      data: {
        name: req.body.name || `Import: ${imp.fileName}`,
        importId: imp.id,
        items: {
          createMany: {
            data: rows.map((r: any, i: number) => ({
              category: r.category || 'product',
              productCategory: r.productCategory,
              seriesModel: r.seriesModel,
              label: r.label || `Row ${r.rowNumber}`,
              unitedInchesMin: r.unitedInchesMin,
              unitedInchesMax: r.unitedInchesMax,
              price: r.price || 0,
              priceType: r.priceType || 'flat',
              confidence: r.confidence,
              needsVerification: r.needsVerification,
              sortOrder: i
            }))
          }
        }
      },
      include: { items: true }
    });

    await prisma.pricingImport.update({ where: { id: imp.id }, data: { status: 'applied' } });
    res.json(version);
  } catch (err: any) {
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});
