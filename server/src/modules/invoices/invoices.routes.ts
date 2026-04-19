import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { invoicesService } from './invoices.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', leadId, status, overdueOnly } = req.query as Record<string, string>;
  const result = await invoicesService.list({
    organizationId: user.organizationId,
    leadId, status,
    overdueOnly: overdueOnly === 'true',
    page: parseInt(page), limit: parseInt(limit),
  });
  res.json({ success: true, ...result });
});

router.get('/aging', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.getAgingSummary(user.organizationId);
  res.json({ success: true, data });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await invoicesService.getById((req.params.id as string));
  res.json({ success: true, data });
});

router.post('/from-proposal', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.createFromProposal({ ...req.body, createdById: user.id });
  res.status(201).json({ success: true, data });
});

router.post('/:id/payments', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.recordPayment((req.params.id as string), { ...req.body, recordedById: user.id });
  res.status(201).json({ success: true, data });
});

router.post('/:id/send', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.send((req.params.id as string), user.id);
  res.json({ success: true, data });
});

export { router as invoicesRouter };
