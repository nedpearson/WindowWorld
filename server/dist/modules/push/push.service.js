"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushService = exports.PushService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = require("../../shared/services/prisma");
const logger_1 = require("../../shared/utils/logger");
// ─── VAPID Setup ─────────────────────────────────────────────
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';
const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:support@windowworldla.com';
if (vapidPublicKey && vapidPrivateKey) {
    web_push_1.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}
else {
    logger_1.logger.warn('[Push] VAPID keys not configured — web push disabled. Generate with:\n  node -e "const wp=require(\'web-push\');console.log(wp.generateVAPIDKeys())"');
}
// Use `db` alias with any-cast so the file compiles before the Prisma migration runs.
// Once `prisma db push` creates push_subscriptions, the generated client will be fully typed.
const db = prisma_1.prisma;
// ─── Service ─────────────────────────────────────────────────
class PushService {
    getPublicKey() {
        return vapidPublicKey;
    }
    async subscribe(userId, subscription) {
        return db.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                userId,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: subscription.userAgent,
                updatedAt: new Date(),
            },
            create: {
                userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userAgent: subscription.userAgent,
            },
        });
    }
    async unsubscribe(endpoint, userId) {
        return db.pushSubscription.deleteMany({ where: { endpoint, userId } });
    }
    async sendToUser(userId, notification) {
        if (!vapidPublicKey || !vapidPrivateKey) {
            logger_1.logger.warn('[Push] VAPID keys not set — skipping push', { userId });
            return;
        }
        const subs = await db.pushSubscription.findMany({ where: { userId } });
        if (subs.length === 0)
            return;
        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body ?? '',
            icon: notification.icon ?? '/icon-192.png',
            badge: notification.badge ?? '/icon-192.png',
            url: notification.url ?? '/field',
            tag: notification.tag ?? 'ww-notification',
            data: notification.data ?? {},
        });
        const results = await Promise.allSettled(subs.map((sub) => web_push_1.default.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 * 24 })));
        // Remove expired subscriptions (410/404)
        const expiredEndpoints = [];
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                const err = result.reason;
                if (err?.statusCode === 410 || err?.statusCode === 404) {
                    expiredEndpoints.push(subs[i].endpoint);
                }
                else {
                    logger_1.logger.error('[Push] Failed to send', { endpoint: subs[i].endpoint, err: err?.message });
                }
            }
        });
        if (expiredEndpoints.length > 0) {
            await db.pushSubscription.deleteMany({ where: { endpoint: { in: expiredEndpoints } } });
            logger_1.logger.info(`[Push] Removed ${expiredEndpoints.length} expired subscription(s)`);
        }
        const sent = results.filter((r) => r.status === 'fulfilled').length;
        logger_1.logger.info(`[Push] Sent to ${sent}/${subs.length} devices`, { userId });
        return { sent, total: subs.length };
    }
    async sendToUsers(userIds, notification) {
        return Promise.all(userIds.map((id) => this.sendToUser(id, notification)));
    }
}
exports.PushService = PushService;
exports.pushService = new PushService();
//# sourceMappingURL=push.service.js.map