"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const push_service_1 = require("./push.service");
const logger_1 = require("../../shared/utils/logger");
exports.pushRouter = (0, express_1.Router)();
// GET /api/v1/push/vapid-public-key
// Public — client fetches this before subscribing
exports.pushRouter.get('/vapid-public-key', (_req, res) => {
    const key = push_service_1.pushService.getPublicKey();
    if (!key)
        return res.status(503).json({ error: 'Push not configured' });
    return res.json({ publicKey: key });
});
// POST /api/v1/push/subscribe
// Authenticated — save device subscription for the logged-in user
exports.pushRouter.post('/subscribe', auth_1.requireAuth, async (req, res) => {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
    }
    const userId = req.user.id;
    await push_service_1.pushService.subscribe(userId, { endpoint, keys, userAgent });
    logger_1.logger.info('[Push] Device subscribed', { userId, endpoint: endpoint.slice(0, 60) });
    return res.json({ ok: true });
});
// DELETE /api/v1/push/unsubscribe
// Authenticated — remove device subscription
exports.pushRouter.delete('/unsubscribe', auth_1.requireAuth, async (req, res) => {
    const { endpoint } = req.body;
    const userId = req.user.id;
    await push_service_1.pushService.unsubscribe(endpoint, userId);
    return res.json({ ok: true });
});
// POST /api/v1/push/test
// Authenticated — sends a test push to the current user's devices
exports.pushRouter.post('/test', auth_1.requireAuth, async (req, res) => {
    const userId = req.user.id;
    const result = await push_service_1.pushService.sendToUser(userId, {
        title: '🪟 WindowWorld Test',
        body: 'Push notifications are working! You\'ll get real-time alerts here.',
        url: '/field',
        tag: 'push-test',
    });
    return res.json({ ok: true, result });
});
//# sourceMappingURL=push.routes.js.map