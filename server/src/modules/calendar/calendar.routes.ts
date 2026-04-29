/**
 * calendar.routes.ts
 * Google Calendar OAuth flow + busy-block API.
 *
 * Mounted at: /api/v1/calendar
 *
 * Auth routes:
 *   GET  /calendar/connect          → Redirect to Google consent
 *   GET  /calendar/oauth/callback   → Handle OAuth code from Google
 *   POST /calendar/disconnect       → Revoke + clear tokens
 *   GET  /calendar/status           → Is user connected?
 *
 * Scheduling routes:
 *   GET  /calendar/busy             → Busy blocks for a time range
 *   POST /calendar/check-conflict   → Check a specific start/end before booking
 */
import { Router, Request, Response } from 'express';
import { query, body } from 'express-validator';
import { auth } from '../../shared/middleware/auth';
import type { AuthenticatedRequest } from '../../shared/middleware/auth';
import {
  getAuthUrl,
  handleOAuthCallback,
  disconnectCalendar,
  getCalendarStatus,
  checkForConflicts,
  getBusyBlocks,
  isCalendarEnabled,
} from '../../shared/services/google-calendar.service';
import { logger, sanitizeForLog } from '../../shared/utils/logger';

const router = Router();

// ── Status ────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/calendar/status
 * Returns whether the current user has connected Google Calendar.
 */
router.get('/status', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const status = await getCalendarStatus(user.id);
  res.json({ success: true, data: status });
});

// ── Connect — redirect to Google ──────────────────────────────────────────
/**
 * GET /api/v1/calendar/connect
 * Redirects the user's browser to the Google OAuth2 consent screen.
 * Must be opened in the browser (not called as XHR).
 */
router.get('/connect', auth.repOrAbove, (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  if (!isCalendarEnabled) {
    res.status(503).json({ success: false, error: 'Google Calendar not configured' });
    return;
  }
  const url = getAuthUrl(user.id);
  res.redirect(url);
});

// ── OAuth Callback ────────────────────────────────────────────────────────
/**
 * GET /api/v1/calendar/oauth/callback
 * Google redirects here after the user grants (or denies) access.
 * State param contains the userId.
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state: userId, error } = req.query as Record<string, string>;

  // User denied access
  if (error) {
    logger.warn(`GCal OAuth denied by user ${sanitizeForLog(userId)}: ${sanitizeForLog(error)}`);
    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?gcal=denied`);
    return;
  }

  if (!code || !userId) {
    res.status(400).json({ success: false, error: 'Missing code or state' });
    return;
  }

  try {
    await handleOAuthCallback(code, userId);
    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?gcal=connected`);
  } catch (err: any) {
    logger.error(`GCal OAuth callback error: ${sanitizeForLog(err.message)}`);
    const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?gcal=error`);
  }
});

// ── Disconnect ────────────────────────────────────────────────────────────
/**
 * POST /api/v1/calendar/disconnect
 * Revokes Google access and clears stored tokens.
 */
router.post('/disconnect', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await disconnectCalendar(user.id);
  res.json({ success: true, message: 'Google Calendar disconnected' });
});

// ── Conflict Check ────────────────────────────────────────────────────────
/**
 * POST /api/v1/calendar/check-conflict
 * Before creating an appointment, check if the rep has a Google Calendar
 * conflict in the proposed time window.
 *
 * Body: { startAt: ISO string, endAt: ISO string, repId?: string }
 * If repId is provided and the caller is a manager+, check that rep's calendar.
 * Otherwise checks the authenticated user's calendar.
 */
router.post(
  '/check-conflict',
  auth.repOrAbove,
  [
    body('startAt').isISO8601().withMessage('startAt must be ISO 8601'),
    body('endAt').isISO8601().withMessage('endAt must be ISO 8601'),
  ],
  async (req: Request, res: Response) => {
    const caller = (req as AuthenticatedRequest).user;
    const { startAt, endAt, repId } = req.body;

    // Managers can check another rep's calendar; reps can only check their own
    const targetUserId =
      repId && ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(caller.role)
        ? repId
        : caller.id;

    const result = await checkForConflicts(targetUserId, new Date(startAt), new Date(endAt));
    res.json({ success: true, data: result });
  },
);

// ── Busy Blocks ───────────────────────────────────────────────────────────
/**
 * GET /api/v1/calendar/busy?startAt=ISO&endAt=ISO&repId=UUID
 * Returns all busy blocks from Google Calendar for the given window.
 * Used by the frontend appointment picker to shade blocked times.
 */
router.get(
  '/busy',
  auth.repOrAbove,
  [
    query('startAt').isISO8601().withMessage('startAt must be ISO 8601'),
    query('endAt').isISO8601().withMessage('endAt must be ISO 8601'),
  ],
  async (req: Request, res: Response) => {
    const caller = (req as AuthenticatedRequest).user;
    const { startAt, endAt, repId } = req.query as Record<string, string>;

    const targetUserId =
      repId && ['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(caller.role)
        ? repId
        : caller.id;

    const blocks = await getBusyBlocks(targetUserId, new Date(startAt), new Date(endAt));
    res.json({ success: true, data: blocks });
  },
);

export { router as calendarRouter };
