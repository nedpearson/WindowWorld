import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { territoriesService } from './territories.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await territoriesService.list(user.organizationId);
  res.json({ success: true, data });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await territoriesService.getById(req.params.id);
  res.json({ success: true, data });
});

router.get('/:id/heatmap', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await territoriesService.getLeadHeatmap(req.params.id);
  res.json({ success: true, data });
});

router.post('/', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await territoriesService.create({ ...req.body, organizationId: user.organizationId }, user.id);
  res.status(201).json({ success: true, data });
});

router.patch('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await territoriesService.update(req.params.id, req.body, user.id);
  res.json({ success: true, data });
});

router.post('/:id/assign-rep', auth.manager, async (req: Request, res: Response) => {
  const data = await territoriesService.assignRep(req.params.id, req.body.userId, req.body.isPrimary ?? false);
  res.json({ success: true, data });
});

router.delete('/:id/remove-rep/:userId', auth.manager, async (req: Request, res: Response) => {
  await territoriesService.removeRep(req.params.id, req.params.userId);
  res.json({ success: true, message: 'Rep removed from territory' });
});

export { router as territoriesRouter };
