import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

export const openingRoutes = Router();
openingRoutes.use(requireAuth);

// List openings for an appointment
openingRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const openings = await prisma.opening.findMany({
      where: { appointmentId: req.params.appointmentId },
      orderBy: { openingNumber: 'asc' },
      include: { photos: true }
    });
    res.json(openings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch openings' });
  }
});

// Get single opening
openingRoutes.get('/:id', async (req, res) => {
  try {
    const opening = await prisma.opening.findUnique({
      where: { id: req.params.id },
      include: { photos: true }
    });
    if (!opening) return res.status(404).json({ error: 'Opening not found' });
    res.json(opening);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opening' });
  }
});

// Create opening
openingRoutes.post('/', async (req, res) => {
  try {
    const { width, height, ...rest } = req.body;
    const unitedInches = (width || 0) + (height || 0);
    const opening = await prisma.opening.create({
      data: { ...rest, width, height, unitedInches }
    });
    res.status(201).json(opening);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create opening', details: err.message });
  }
});

// Update opening
openingRoutes.put('/:id', async (req, res) => {
  try {
    const { width, height, ...rest } = req.body;
    const data: any = { ...rest };
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;
    if (width !== undefined || height !== undefined) {
      const existing = await prisma.opening.findUnique({ where: { id: req.params.id } });
      const w = width ?? existing?.width ?? 0;
      const h = height ?? existing?.height ?? 0;
      data.unitedInches = w + h;
    }

    const opening = await prisma.opening.update({
      where: { id: req.params.id },
      data,
      include: { photos: true }
    });
    res.json(opening);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update opening' });
  }
});

// Delete opening
openingRoutes.delete('/:id', async (req, res) => {
  try {
    await prisma.opening.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete opening' });
  }
});

// Batch create openings
openingRoutes.post('/batch', async (req, res) => {
  try {
    const { appointmentId, openings } = req.body;
    const created = [];
    for (const o of openings) {
      const unitedInches = (o.width || 0) + (o.height || 0);
      const opening = await prisma.opening.create({
        data: { ...o, appointmentId, unitedInches }
      });
      created.push(opening);
    }
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Batch create failed' });
  }
});
