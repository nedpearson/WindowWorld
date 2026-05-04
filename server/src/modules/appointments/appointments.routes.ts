import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { appointmentsService } from './appointments.service';

const router = Router();

// GET /api/v1/appointments
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', date, week, status, leadId, repId } = req.query as Record<string, string>;
  const result = await appointmentsService.list({
    organizationId: user.organizationId,
    repId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId,
    date, week, status: status as any, leadId,
    page: parseInt(page), limit: Math.min(parseInt(limit), 100),
  });
  res.json({ success: true, ...result });
});

// GET /api/v1/appointments/route — today's (or requested date's) optimized route
router.get('/route', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const repId = req.query.repId as string || user.id;
  const date = req.query.date as string;
  const route = await appointmentsService.getRoute(repId, user.organizationId, date);
  res.json({ success: true, data: route });
});

// GET /api/v1/appointments/calendar
router.get('/calendar', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { start, end, repId } = req.query as Record<string, string>;
  const data = await appointmentsService.getCalendar(
    ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId,
    user.organizationId,
    start || new Date().toISOString(),
    end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  res.json({ success: true, data });
});

// GET /api/v1/appointments/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const apt = await appointmentsService.getById((req.params.id as string), user.organizationId);
  res.json({ success: true, data: apt });
});

// POST /api/v1/appointments
router.post('/',
  auth.repOrAbove,
  [body('leadId').notEmpty(), body('title').notEmpty(), body('scheduledAt').isISO8601()],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    try {
      const apt = await appointmentsService.create({
        ...req.body,
        createdById: user.id,
        organizationId: user.organizationId,
        skipConflictCheck: req.body.skipConflictCheck === true,
      });
      res.status(201).json({ success: true, data: apt });
    } catch (err: any) {
      if (err.code === 'GCAL_CONFLICT') {
        // 409 Conflict — frontend shows a dialog asking the user to confirm or cancel
        res.status(409).json({
          success: false,
          code: 'GCAL_CONFLICT',
          message: err.message,
          conflicts: err.conflicts,
        });
        return;
      }
      throw err; // Let global error handler deal with anything else
    }
  }
);

// PATCH /api/v1/appointments/:id
router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const apt = await appointmentsService.update((req.params.id as string), user.organizationId, req.body, user.id);
  res.json({ success: true, data: apt });
});

// PATCH /api/v1/appointments/:id/status
router.patch('/:id/status', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const apt = await appointmentsService.updateStatus((req.params.id as string), user.organizationId, req.body.status, req.body.outcome, user.id);
  res.json({ success: true, data: apt });
});

export { router as appointmentsRouter };
