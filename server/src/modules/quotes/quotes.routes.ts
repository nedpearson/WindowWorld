import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { quotesService } from './quotes.service';

const router = Router();

// GET /api/v1/quotes — list all quotes for the org (with optional leadId filter)
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { leadId, status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const data = await quotesService.list({
    organizationId: user.organizationId,
    leadId,
    status,
    page: parseInt(page),
    limit: parseInt(limit),
  });
  res.json({ success: true, ...data });
});

router.get('/lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await quotesService.listForLead(req.params.leadId as string);
  res.json({ success: true, data });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await quotesService.getById((req.params.id as string));
  res.json({ success: true, data });
});

// POST /api/v1/quotes â€” create quote from manual line items
router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await quotesService.create({ ...req.body, createdById: user.id });
  res.status(201).json({ success: true, data });
});

// POST /api/v1/quotes/build â€” auto-build from property openings
router.post('/build', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const result = await quotesService.buildFromOpenings({
    ...req.body,
    createdById: user.id,
    organizationId: user.organizationId,
  });
  res.json({ success: true, data: result });
});

// POST /api/v1/quotes/calculate â€” calculate totals without saving
router.post('/calculate', auth.repOrAbove, (req: Request, res: Response) => {
  const { lineItems, discountPct } = req.body;
  const result = quotesService.calculateTotals(lineItems, discountPct);
  res.json({ success: true, data: result });
});

router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await quotesService.update((req.params.id as string), req.body, user.id);
  res.json({ success: true, data });
});

router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await quotesService.delete((req.params.id as string), user.id);
  res.json({ success: true, message: 'Quote deleted' });
});

export { router as quotesRouter };
