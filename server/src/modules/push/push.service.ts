import webpush from 'web-push';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

// ─── VAPID Setup ─────────────────────────────────────────────
const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  ?? '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';
const vapidSubject    = process.env.VAPID_SUBJECT     ?? 'mailto:support@windowworldla.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  logger.warn('[Push] VAPID keys not configured — web push disabled. Generate with:\n  node -e "const wp=require(\'web-push\');console.log(wp.generateVAPIDKeys())"');
}

// Use `db` alias with any-cast so the file compiles before the Prisma migration runs.
// Once `prisma db push` creates push_subscriptions, the generated client will be fully typed.
const db = prisma as any;

// ─── Service ─────────────────────────────────────────────────
export class PushService {
  getPublicKey(): string {
    return vapidPublicKey;
  }

  async subscribe(userId: string, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
  }) {
    return db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth:   subscription.keys.auth,
        userAgent: subscription.userAgent,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint:  subscription.endpoint,
        p256dh:    subscription.keys.p256dh,
        auth:      subscription.keys.auth,
        userAgent: subscription.userAgent,
      },
    });
  }

  async unsubscribe(endpoint: string, userId: string) {
    return db.pushSubscription.deleteMany({ where: { endpoint, userId } });
  }

  async sendToUser(userId: string, notification: {
    title: string;
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }) {
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('[Push] VAPID keys not set — skipping push', { userId });
      return;
    }

    const subs: Array<{ endpoint: string; p256dh: string; auth: string }> =
      await db.pushSubscription.findMany({ where: { userId } });

    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title: notification.title,
      body:  notification.body  ?? '',
      icon:  notification.icon  ?? '/icon-192.png',
      badge: notification.badge ?? '/icon-192.png',
      url:   notification.url   ?? '/field',
      tag:   notification.tag   ?? 'ww-notification',
      data:  notification.data  ?? {},
    });

    const results = await Promise.allSettled(
      subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 }
        )
      )
    );

    // Remove expired subscriptions (410/404)
    const expiredEndpoints: string[] = [];
    results.forEach((result: PromiseSettledResult<unknown>, i: number) => {
      if (result.status === 'rejected') {
        const err = (result as PromiseRejectedResult).reason as { statusCode?: number; message?: string };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subs[i].endpoint);
        } else {
          logger.error('[Push] Failed to send', { endpoint: subs[i].endpoint, err: err?.message });
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await db.pushSubscription.deleteMany({ where: { endpoint: { in: expiredEndpoints } } });
      logger.info(`[Push] Removed ${expiredEndpoints.length} expired subscription(s)`);
    }

    const sent = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length;
    logger.info(`[Push] Sent to ${sent}/${subs.length} devices`, { userId });
    return { sent, total: subs.length };
  }

  async sendToUsers(userIds: string[], notification: Parameters<PushService['sendToUser']>[1]) {
    return Promise.all(userIds.map((id) => this.sendToUser(id, notification)));
  }
}

export const pushService = new PushService();
