import { Router, Request, Response } from 'express';
import { auth } from '../../shared/middleware/auth';
// TODO: Import service

const router = Router();

// Placeholder — full implementation in progress
router.get('/', auth.repOrAbove, (req: Request, res: Response) => {
  res.json({ success: true, data: [], module: 'automations', status: 'placeholder' });
});

export { router as automationsRouter };
