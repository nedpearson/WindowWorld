import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const rulesRoutes = Router();
rulesRoutes.use(requireAuth);

// List all business rules
rulesRoutes.get('/', async (_req, res) => {
  try {
    const rules = await prisma.businessRule.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Get single rule
rulesRoutes.get('/:id', async (req, res) => {
  try {
    const rule = await prisma.businessRule.findUnique({ where: { id: String(req.params.id) } });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create rule — admin/manager only
rulesRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const rule = await prisma.businessRule.create({ data: req.body });
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

// Update rule — admin/manager only
rulesRoutes.put('/:id', requireAdmin, async (req, res) => {
  try {
    const rule = await prisma.businessRule.update({
      where: { id: String(req.params.id) },
      data: req.body,
    });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

// Toggle active state — admin/manager only
rulesRoutes.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.businessRule.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Rule not found' });
    const rule = await prisma.businessRule.update({
      where: { id: String(req.params.id) },
      data: { isActive: !existing.isActive },
    });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle rule', details: err.message });
  }
});

// Delete rule — admin only
rulesRoutes.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.businessRule.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});
