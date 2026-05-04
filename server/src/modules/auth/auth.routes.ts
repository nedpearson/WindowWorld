import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authService } from './auth.service';
import { requireAuth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { ValidationError, UnauthorizedError } from '../../shared/middleware/errorHandler';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

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

// POST /api/v1/auth/qr-exchange
// Accepts an accessToken (JWT) from a QR code scan and issues a fresh session
// for the mobile device WITHOUT revoking any desktop session token.
// This avoids the token-rotation race where the desktop silently refreshes
// and invalidates the QR token before the phone can use it.
router.post(
  '/qr-exchange',
  [body('accessToken').isString().notEmpty().withMessage('Access token required')],
  async (req: Request, res: Response) => {
    validateRequest(req);
    const { accessToken } = req.body;

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
    let payload: any;
    try {
      payload = jwt.verify(accessToken, JWT_SECRET);
    } catch (err: any) {
      throw new UnauthorizedError('QR code has expired or is invalid. Please scan a new code from the desktop.');
    }

    // Look up the live user to get fresh data and verify they're still active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, organizationId: true, avatarUrl: true, isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account not found or deactivated.');
    }

    // Issue a completely fresh session for the phone — desktop session is untouched
    // Directly generate tokens (same as login but without password check)
    const crypto = await import('crypto');
    const newRefreshToken = crypto.randomUUID();
    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role,
        organizationId: user.organizationId, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshToken, expiresAt: refreshExpiresAt },
    });

    logger.info(`[QR Exchange] New mobile session issued for ${user.email}`);
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7 * 24 * 60 * 60,
        user: { id: user.id, email: user.email, firstName: user.firstName,
          lastName: user.lastName, role: user.role, organizationId: user.organizationId, avatarUrl: user.avatarUrl },
      },
    });
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
