import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { propertiesService } from './properties.service';

const router = Router();

// GET /api/v1/properties
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const { page = '1', limit = '25', leadId, parish, zip, search } = req.query as Record<string, string>;
  const result = await propertiesService.list({
    leadId, parish, zip, search,
    page: parseInt(page), limit: Math.min(parseInt(limit), 100),
  });
  res.json({ success: true, ...result });
});

// GET /api/v1/properties/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const property = await propertiesService.getById((req.params.id as string));
  res.json({ success: true, data: property });
});

// GET /api/v1/properties/:id/order-readiness
router.get('/:id/order-readiness', auth.repOrAbove, async (req: Request, res: Response) => {
  const readiness = await propertiesService.getOrderReadiness((req.params.id as string));
  res.json({ success: true, data: readiness });
});

// POST /api/v1/properties
router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const property = await propertiesService.create(req.body, user.id);
  res.status(201).json({ success: true, data: property });
});

// PATCH /api/v1/properties/:id
router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const property = await propertiesService.update((req.params.id as string), req.body, user.id);
  res.json({ success: true, data: property });
});

// POST /api/v1/properties/:id/link-lead
router.post('/:id/link-lead', auth.repOrAbove, async (req: Request, res: Response) => {
  const property = await propertiesService.linkToLead((req.params.id as string), req.body.leadId);
  res.json({ success: true, data: property });
});

export { router as propertiesRouter };
