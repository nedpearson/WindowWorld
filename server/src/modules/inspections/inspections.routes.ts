import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { inspectionsService } from './inspections.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', leadId, propertyId } = req.query as Record<string, string>;
  const repId = ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : undefined;
  const result = await inspectionsService.list({
    organizationId: user.organizationId, leadId, propertyId, repId,
    page: parseInt(page), limit: parseInt(limit),
  });
  res.json({ success: true, ...result });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await inspectionsService.getById((req.params.id as string));
  res.json({ success: true, data });
});

router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await inspectionsService.create({ ...req.body, inspectedById: user.id, organizationId: user.organizationId });
  res.status(201).json({ success: true, data });
});

router.patch('/:id/start', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await inspectionsService.startInspection((req.params.id as string), user.id);
  res.json({ success: true, data });
});

router.patch('/:id/complete', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await inspectionsService.completeInspection((req.params.id as string), user.id, req.body);
  res.json({ success: true, data });
});

router.post('/:id/openings', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await inspectionsService.addOpening((req.params.id as string), req.body);
  res.status(201).json({ success: true, data });
});

export { router as inspectionsRouter };
