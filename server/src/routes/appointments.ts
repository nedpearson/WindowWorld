import { Router } from 'express';
import { prisma } from '../index.js';

export const appointmentRoutes = Router();

// List appointments (with filters)
appointmentRoutes.get('/', async (req, res) => {
  try {
    const { status, date, search } = req.query;
    const where: any = {};

    if (status && status !== 'all') where.status = status;
    if (date) {
      const d = new Date(date as string);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.appointmentDate = { gte: start, lt: end };
    }
    if (search) {
      where.OR = [
        { customer: { firstName: { contains: search as string } } },
        { customer: { lastName: { contains: search as string } } },
        { jobAddress: { contains: search as string } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        _count: { select: { openings: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment (full detail)
appointmentRoutes.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        openings: { orderBy: { openingNumber: 'asc' }, include: { photos: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        contracts: { orderBy: { version: 'desc' } },
        signatures: true,
        payments: { orderBy: { paidAt: 'desc' } },
        houseMap: { include: { markers: true } }
      }
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Get appointment timeline events
appointmentRoutes.get('/:id/timeline', async (req, res) => {
  try {
    const events = await prisma.appointmentTimelineEvent.findMany({
      where: { appointmentId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Post a timeline event
appointmentRoutes.post('/:id/timeline', async (req, res) => {
  try {
    const { eventType, title, description, userId } = req.body;
    const event = await prisma.appointmentTimelineEvent.create({
      data: {
        appointmentId: req.params.id,
        eventType: eventType || 'updated',
        title,
        description,
        userId: userId || null,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create timeline event' });
  }
});



// Create appointment
appointmentRoutes.post('/', async (req, res) => {
  try {
    const { customerId, userId, ...rest } = req.body;
    const appointment = await prisma.appointment.create({
      data: { customerId, userId, ...rest },
      include: { customer: true, user: { select: { id: true, name: true } } }
    });
    res.status(201).json(appointment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create appointment', details: err.message });
  }
});

// Update appointment
appointmentRoutes.put('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        customer: true,
        openings: { orderBy: { openingNumber: 'asc' } },
        lineItems: { orderBy: { sortOrder: 'asc' } }
      }
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
appointmentRoutes.delete('/:id', async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Recalculate appointment totals
appointmentRoutes.post('/:id/recalculate', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { openings: true, lineItems: true }
    });
    if (!appointment) return res.status(404).json({ error: 'Not found' });

    const openingsSubtotal = appointment.openings.reduce((sum, o) => sum + o.totalPrice, 0);
    const lineItemsTotal = appointment.lineItems.reduce((sum, li) => sum + li.totalPrice, 0);
    const subtotal = openingsSubtotal + lineItemsTotal;
    const discountedSubtotal = subtotal - appointment.discount;
    const taxAmount = discountedSubtotal * appointment.taxRate;
    const totalAmount = discountedSubtotal + taxAmount + appointment.adminFee;
    const balanceDue = totalAmount - appointment.depositAmount;

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { subtotal, taxAmount, totalAmount, balanceDue },
      include: { customer: true, openings: true, lineItems: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Recalculation failed' });
  }
});
