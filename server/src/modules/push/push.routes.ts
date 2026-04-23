import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { pushService } from './push.service';
import { logger } from '../../shared/utils/logger';

export const pushRouter = Router();

// GET /api/v1/push/vapid-public-key
// Public — client fetches this before subscribing
pushRouter.get('/vapid-public-key', (_req, res) => {
  const key = pushService.getPublicKey();
  if (!key) return res.status(503).json({ error: 'Push not configured' });
  return res.json({ publicKey: key });
});

// POST /api/v1/push/subscribe
// Authenticated — save device subscription for the logged-in user
pushRouter.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys, userAgent } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  const userId = (req as any).user.id;
  await pushService.subscribe(userId, { endpoint, keys, userAgent });
  logger.info('[Push] Device subscribed', { userId, endpoint: endpoint.slice(0, 60) });
  return res.json({ ok: true });
});

// DELETE /api/v1/push/unsubscribe
// Authenticated — remove device subscription
pushRouter.delete('/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  const userId = (req as any).user.id;
  await pushService.unsubscribe(endpoint, userId);
  return res.json({ ok: true });
});

// POST /api/v1/push/test
// Authenticated — sends a test push to the current user's devices
pushRouter.post('/test', requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const result = await pushService.sendToUser(userId, {
    title: '🪟 WindowWorld Test',
    body: 'Push notifications are working! You\'ll get real-time alerts here.',
    url: '/field',
    tag: 'push-test',
  });
  return res.json({ ok: true, result });
});
