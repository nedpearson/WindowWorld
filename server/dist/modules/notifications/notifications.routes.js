"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const notifications_service_1 = require("./notifications.service");
const router = (0, express_1.Router)();
exports.notificationsRouter = router;
// GET /notifications — list current user's notifications with unread count
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200);
    const result = await notifications_service_1.notificationService.list(String(user.id), limit);
    res.json({ success: true, ...result });
});
// PATCH /notifications/:id/read — mark a single notification as read
router.patch('/:id/read', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    await notifications_service_1.notificationService.markRead(String(req.params.id), String(user.id));
    res.json({ success: true });
});
// POST /notifications/mark-all-read — mark all unread as read
router.post('/mark-all-read', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const result = await notifications_service_1.notificationService.markAllRead(user.id);
    res.json({ success: true, updated: result.count });
});
//# sourceMappingURL=notifications.routes.js.map