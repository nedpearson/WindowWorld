import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
import { leadScoreService } from './lead-scores.service';

const router = Router();

// GET /lead-scores/lead/:leadId — all scores for a lead (most recent first)
router.get('/lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await leadScoreService.getByLead(String(req.params.leadId));
  res.json({ success: true, data });
});

// GET /lead-scores/lead/:leadId/latest — single latest score
router.get('/lead/:leadId/latest', auth.repOrAbove, async (req: Request, res: Response) => {
  const data = await leadScoreService.getLatest(String(req.params.leadId));
  res.json({ success: true, data });
});

// POST /lead-scores/lead/:leadId/override — manager manual override
router.post('/lead/:leadId/override', auth.manager, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = await leadScoreService.override(String(req.params.leadId), String(user.id), req.body);
  res.status(201).json({ success: true, data });
});

export { router as leadscoresRouter };
