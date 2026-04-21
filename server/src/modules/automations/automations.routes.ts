import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { automationService } from './automations.service';

const router = Router();

// GET /automations — list org automations
router.get('/', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await automationService.list(user.organizationId);
  res.json({ success: true, data });
});

// GET /automations/:id — get with run history
router.get('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await automationService.getById(String(req.params.id), user.organizationId);
  res.json({ success: true, data });
});

// POST /automations — create
router.post('/', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await automationService.create(user.organizationId, req.body);
  res.status(201).json({ success: true, data });
});

// PATCH /automations/:id — update
router.patch('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await automationService.update(String(req.params.id), user.organizationId, req.body);
  res.json({ success: true, data });
});

// POST /automations/:id/toggle — toggle isActive
router.post('/:id/toggle', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await automationService.toggle(String(req.params.id), user.organizationId);
  res.json({ success: true, data });
});

// GET /automations/:id/runs — run history
router.get('/:id/runs', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = parseInt(String(req.query.limit)) || 20;
  const data = await automationService.getRuns(String(req.params.id), user.organizationId, limit);
  res.json({ success: true, data });
});

export { router as automationsRouter };
