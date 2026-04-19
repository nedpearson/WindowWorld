import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from './auth.service';
import { requireAuth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { authRateLimiter } from '../../shared/middleware/rateLimiter';
import { ValidationError } from '../../shared/middleware/errorHandler';

const router = Router();

function validateRequest(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap: Record<string, string[]> = {};
    errors.array().forEach((e: any) => {
      if (!errorMap[e.path]) errorMap[e.path] = [];
      errorMap[e.path].push(e.msg);
    });
    throw new ValidationError('Validation failed', errorMap);
  }
}

// POST /api/v1/auth/login
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 1 }).withMessage('Password required'),
  ],
  async (req: Request, res: Response) => {
    validateRequest(req);
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  }
);

// POST /api/v1/auth/google
router.post(
  '/google',
  authRateLimiter,
  [
    body('idToken').isString().notEmpty().withMessage('Google ID token required'),
  ],
  async (req: Request, res: Response) => {
    validateRequest(req);
    const { idToken } = req.body;
    const result = await authService.googleLogin(idToken);
    res.json({ success: true, data: result });
  }
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty().withMessage('Refresh token required')],
  async (req: Request, res: Response) => {
    validateRequest(req);
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  }
);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const user = (req as AuthenticatedRequest).user;
  if (refreshToken) {
    await authService.logout(refreshToken, user.id);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/v1/auth/logout-all
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await authService.logoutAll(user.id);
  res.json({ success: true, message: 'All sessions terminated' });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const me = await authService.getMe(user.id);
  res.json({ success: true, data: me });
});

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').isLength({ min: 1 }).withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req: Request, res: Response) => {
    validateRequest(req);
    const user = (req as AuthenticatedRequest).user;
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  }
);

export { router as authRouter };
