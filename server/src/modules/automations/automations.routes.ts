import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
// TODO: Import service

const router = Router();

// Placeholder — full implementation in progress
router.get('/', auth.repOrAbove, (req, res) => {
  res.json({ success: true, data: [], module: 'automations', status: 'placeholder' });
});

export { router as automationsRouter };
