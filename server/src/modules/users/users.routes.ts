import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { usersService } from './users.service';

const router = Router();

router.get('/', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { role, search, isActive } = req.query as Record<string, string>;
  const data = await usersService.list(user.organizationId, {
    role: role as any,
    search,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  res.json({ success: true, data });
});

router.get('/leaderboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';
  const data = await usersService.getLeaderboard(user.organizationId, period);
  res.json({ success: true, data });
});

router.get('/:id', auth.manager, async (req: Request, res: Response) => {
  const data = await usersService.getById((req.params.id as string));
  res.json({ success: true, data });
});

router.post('/', auth.manager, [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('role').notEmpty(),
], async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await usersService.create(
    { ...req.body, organizationId: user.organizationId },
    user.id
  );
  res.status(201).json({ success: true, data });
});

router.patch('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await usersService.update((req.params.id as string), req.body, user.id);
  res.json({ success: true, data });
});

router.patch('/:id/deactivate', auth.superAdmin, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await usersService.deactivate((req.params.id as string), user.id);
  res.json({ success: true, message: 'User deactivated' });
});

// GET /users/me — return the authenticated user's own profile including notif prefs
router.get('/me', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await usersService.getById(user.id);
  res.json({ success: true, data });
});

// PATCH /users/me/preferences — save notification toggles to the DB
router.patch('/me/preferences', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { prisma } = await import('../../shared/services/prisma');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { notifPreferences: req.body },
    select: { id: true, notifPreferences: true },
  });
  res.json({ success: true, data: updated });
});

export { router as usersRouter };
