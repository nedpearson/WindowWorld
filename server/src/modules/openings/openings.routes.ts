import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { openingService } from './openings.service';

const router = Router();

// GET /openings?inspectionId=...&propertyId=...
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const { inspectionId, propertyId } = req.query;
  let data: any[];
  if (inspectionId) {
    data = await openingService.listByInspection(String(inspectionId));
  } else if (propertyId) {
    data = await openingService.listByProperty(String(propertyId));
  } else {
    return res.status(400).json({ success: false, error: 'Provide inspectionId or propertyId' });
  }
  res.json({ success: true, data });
});

// GET /openings/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await openingService.getById(String(req.params.id));
  res.json({ success: true, data });
});

// POST /openings
router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await openingService.create(req.body);
  res.status(201).json({ success: true, data });
});

// PATCH /openings/:id
router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await openingService.update(String(req.params.id), req.body);
  res.json({ success: true, data });
});

// DELETE /openings/:id
router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  await openingService.delete(String(req.params.id));
  res.json({ success: true });
});

// POST /openings/reorder — reorder within an inspection
router.post('/reorder', auth.repOrAbove, async (req: Request, res: Response) => {
  const { inspectionId, orderedIds } = req.body;
  if (!inspectionId || !Array.isArray(orderedIds)) {
    return res.status(400).json({ success: false, error: 'inspectionId and orderedIds[] required' });
  }
  const data = await openingService.reorder(inspectionId, orderedIds);
  res.json({ success: true, data });
});

export { router as openingsRouter };
