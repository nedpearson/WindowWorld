import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { organizationService } from './organizations.service';

const router = Router();

// GET /teams/me — current user's org with team and territories
router.get('/me', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const [data, stats] = await Promise.all([
    organizationService.getById(user.organizationId),
    organizationService.getStats(user.organizationId),
  ]);
  res.json({ success: true, data: { ...data, stats } });
});

// PATCH /teams/me — update org settings (manager+ only)
router.patch('/me', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await organizationService.update(user.organizationId, user.id, req.body);
  res.json({ success: true, data });
});

// GET /teams/me/commission-tiers — returns tiers stored in org.settings
router.get('/me/commission-tiers', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { prisma } = await import('../../shared/services/prisma');
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { settings: true },
  });
  const settings = (org?.settings as any) || {};
  res.json({ success: true, data: settings.commissionTiers || null });
});

// PATCH /teams/me/commission-tiers — save tiers into org.settings JSON
router.patch('/me/commission-tiers', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { prisma } = await import('../../shared/services/prisma');
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { settings: true } });
  const existingSettings = (org?.settings as any) || {};
  const updated = await prisma.organization.update({
    where: { id: user.organizationId },
    data: { settings: { ...existingSettings, commissionTiers: req.body.tiers } },
    select: { settings: true },
  });
  res.json({ success: true, data: (updated.settings as any)?.commissionTiers });
});

// For backwards compat — also mount on /:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as any).user;
  // Security: users can only view their own org
  if (req.params.id !== user.organizationId && user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const data = await organizationService.getById(String(req.params.id));
  res.json({ success: true, data });
});

router.patch('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (String(req.params.id) !== user.organizationId && user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const data = await organizationService.update(String(req.params.id), String(user.id), req.body);
  res.json({ success: true, data });
});

export { router as organizationsRouter };
