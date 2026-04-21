import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { notificationService } from './notifications.service';

const router = Router();

// GET /notifications — list current user's notifications with unread count
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200);
  const result = await notificationService.list(String(user.id), limit);
  res.json({ success: true, ...result });
});

// PATCH /notifications/:id/read — mark a single notification as read
router.patch('/:id/read', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as any).user;
  await notificationService.markRead(String(req.params.id), String(user.id));
  res.json({ success: true });
});

// POST /notifications/mark-all-read — mark all unread as read
router.post('/mark-all-read', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await notificationService.markAllRead(user.id);
  res.json({ success: true, updated: result.count });
});

export { router as notificationsRouter };
