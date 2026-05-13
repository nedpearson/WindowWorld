import { Router } from 'express';
import { prisma } from '../index.js';

export const exportRoutes = Router();

// Export appointment as JSON
exportRoutes.get('/json/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true, openings: true, lineItems: true,
        houseMap: { include: { markers: true } }, payments: true, signatures: true
      }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export openings as CSV
exportRoutes.get('/csv/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { customer: true, openings: { orderBy: { openingNumber: 'asc' } } }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const headers = ['Opening#', 'Room', 'Elevation', 'Width', 'Height', 'UI', 'Product', 'Series', 'IntColor', 'ExtColor', 'Grid', 'Glass', 'BasePrice', 'Total'];
    const rows = appt.openings.map(o => [
      o.openingNumber, o.roomLocation || '', o.elevation || '', o.width || '', o.height || '',
      o.unitedInches || '', o.productCategory || '', o.seriesModel || '', o.interiorColor || '',
      o.exteriorColor || '', o.gridStyle || '', o.glassPackage || '', o.basePrice, o.totalPrice
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${appt.customer.lastName}_openings.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
});
