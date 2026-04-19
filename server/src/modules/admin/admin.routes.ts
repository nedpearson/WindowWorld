import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { usersService } from '../users/users.service';
import { auditService } from './audit.service';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

const router = Router();

// ─── Users ────────────────────────────────────────────────────

/** GET /api/v1/admin/users — list all users in the org */
router.get('/users', auth.adminOnly, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { role, search, isActive } = req.query;
  const data = await usersService.list(user.organizationId, {
    role: role as any,
    search: search as string,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  });
  res.json({ success: true, data });
});

/** POST /api/v1/admin/users — create a new user */
router.post('/users', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.create(
    { ...req.body, organizationId: actor.organizationId },
    actor.id
  );
  res.status(201).json({ success: true, data });
});

/** PATCH /api/v1/admin/users/:id — update user details / role */
router.patch('/users/:id', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.update(req.params.id, req.body, actor.id);
  res.json({ success: true, data });
});

/** POST /api/v1/admin/users/:id/deactivate */
router.post('/users/:id/deactivate', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  await usersService.deactivate(req.params.id, actor.id);
  res.json({ success: true, message: 'User deactivated' });
});

/** POST /api/v1/admin/users/:id/reactivate */
router.post('/users/:id/reactivate', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.update(req.params.id, { isActive: true }, actor.id);
  res.json({ success: true, data });
});

// ─── Audit Log ────────────────────────────────────────────────

/** GET /api/v1/admin/audit-log — paginated audit log */
router.get('/audit-log', auth.adminOnly, async (req: Request, res: Response) => {
  const { entityType, entityId, userId, limit = '50', offset = '0' } = req.query;
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ success: true, data: items, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
});

// ─── Leaderboard ──────────────────────────────────────────────

/** GET /api/v1/admin/leaderboard */
router.get('/leaderboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const { period } = req.query;
  const data = await usersService.getLeaderboard(actor.organizationId, period as any);
  res.json({ success: true, data });
});

// ─── Org Stats ────────────────────────────────────────────────

/** GET /api/v1/admin/stats — org-wide summary stats */
router.get('/stats', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const orgId = actor.organizationId;

  const [
    totalLeads, activeLeads, totalProposals, sentProposals,
    totalInvoices, paidInvoices, activeUsers, totalRevenue
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, status: { notIn: ['LOST', 'INSTALLED', 'PAID'] } } }),
    prisma.proposal.count({ where: { lead: { organizationId: orgId } } }),
    prisma.proposal.count({ where: { lead: { organizationId: orgId }, status: { in: ['SENT', 'VIEWED', 'ACCEPTED'] } } }),
    prisma.invoice.count({ where: { lead: { organizationId: orgId } } }),
    prisma.invoice.count({ where: { lead: { organizationId: orgId }, status: 'PAID' } }),
    prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.invoice.aggregate({
      where: { lead: { organizationId: orgId }, status: 'PAID' },
      _sum: { amountPaid: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalLeads, activeLeads,
      totalProposals, sentProposals,
      totalInvoices, paidInvoices,
      activeUsers,
      totalRevenue: totalRevenue._sum.amountPaid || 0,
    },
  });
});

export { router as adminRouter };
