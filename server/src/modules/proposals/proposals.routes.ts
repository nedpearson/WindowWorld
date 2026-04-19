import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { proposalsService } from './proposals.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', leadId, status } = req.query as Record<string, string>;
  const repId = user.role === 'SALES_REP' ? user.id : undefined;
  const result = await proposalsService.list({
    organizationId: user.organizationId,
    leadId, status, repId,
    page: parseInt(page), limit: parseInt(limit),
  });
  res.json({ success: true, ...result });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await proposalsService.getById((req.params.id as string));
  res.json({ success: true, data });
});

// Public: record when customer views the proposal
router.post('/p/:id/view', async (req: Request, res: Response) => {
  await proposalsService.recordView((req.params.id as string), req.ip);
  res.json({ success: true });
});

router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.create({ ...req.body, createdById: user.id, organizationId: user.organizationId });
  res.status(201).json({ success: true, data });
});

router.post('/:id/generate-pdf', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.generatePdf((req.params.id as string), user.id);
  res.json({ success: true, data });
});

router.post('/:id/send', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { channel = 'email' } = req.body;
  const data = await proposalsService.send((req.params.id as string), user.id, channel);
  res.json({ success: true, data });
});

router.patch('/:id/status', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.updateStatus((req.params.id as string), req.body.status, user.id);
  res.json({ success: true, data });
});

router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await proposalsService.delete((req.params.id as string), user.id);
  res.json({ success: true, message: 'Proposal deleted' });
});

export { router as proposalsRouter };
