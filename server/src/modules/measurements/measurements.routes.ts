import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { measurementsService } from './measurements.service';
import { wsService } from '../../shared/services/websocket.service';

const router = Router();

// GET /api/v1/measurements/opening/:openingId
router.get('/opening/:openingId', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await measurementsService.getByOpening((req.params.openingId as string));
  res.json({ success: true, data });
});

// GET /api/v1/measurements/property/:propertyId/summary
router.get('/property/:propertyId/summary', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await measurementsService.getPropertySummary(req.params.propertyId as string);
  res.json({ success: true, data });
});

// POST /api/v1/measurements  (create or update)
router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await measurementsService.upsert({ ...req.body, measuredById: user.id });

  // Notify desktop clients that a measurement was synced from field
  try {
    wsService.broadcastToOrg(user.organizationId, 'mobile:sync', {
      type: 'MEASUREMENT_SAVE',
      entityId: (data as any).id,
      leadId: req.body.leadId ?? null,
      updatedAt: new Date().toISOString(),
      organizationId: user.organizationId,
    });
  } catch { /* fire-and-forget — never break the HTTP response */ }

  res.status(200).json({ success: true, data });
});


// POST /api/v1/measurements/opening/:openingId/verify
router.post('/opening/:openingId/verify', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { finalWidth, finalHeight } = req.body;
  const data = await measurementsService.verify((req.params.openingId as string), user.id, parseFloat(finalWidth), parseFloat(finalHeight));
  res.json({ success: true, data });
});

// POST /api/v1/measurements/opening/:openingId/approve-for-order
router.post('/opening/:openingId/approve-for-order', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await measurementsService.approveForOrder((req.params.openingId as string), user.id);
  res.json({ success: true, data });
});

export { router as measurementsRouter };
