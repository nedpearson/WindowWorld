import { Router } from 'express';
import { prisma } from '../index.js';

export const houseMapRoutes = Router();

houseMapRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    let houseMap = await prisma.houseMap.findUnique({
      where: { appointmentId: req.params.appointmentId },
      include: { markers: { orderBy: { openingNumber: 'asc' } } }
    });
    if (!houseMap) {
      houseMap = await prisma.houseMap.create({
        data: { appointmentId: req.params.appointmentId },
        include: { markers: true }
      });
    }
    res.json(houseMap);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch house map' });
  }
});

houseMapRoutes.post('/markers', async (req, res) => {
  try {
    const marker = await prisma.houseMapMarker.create({ data: req.body });
    res.status(201).json(marker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add marker' });
  }
});

houseMapRoutes.put('/markers/:id', async (req, res) => {
  try {
    const marker = await prisma.houseMapMarker.update({ where: { id: req.params.id }, data: req.body });
    res.json(marker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update marker' });
  }
});

houseMapRoutes.delete('/markers/:id', async (req, res) => {
  try {
    await prisma.houseMapMarker.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete marker' });
  }
});
