import { Router } from 'express';
import { prisma } from '../index.js';

export const customerRoutes = Router();

// List customers
customerRoutes.get('/', async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { appointments: true } } }
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer
customerRoutes.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { appointments: { orderBy: { createdAt: 'desc' } } }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer
customerRoutes.post('/', async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
customerRoutes.put('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Search customers
customerRoutes.get('/search/:query', async (req, res) => {
  try {
    const q = req.params.query;
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { address: { contains: q } }
        ]
      },
      take: 20
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});
