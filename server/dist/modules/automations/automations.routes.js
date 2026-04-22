"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const automations_service_1 = require("./automations.service");
const router = (0, express_1.Router)();
exports.automationsRouter = router;
// GET /automations — list org automations
router.get('/', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await automations_service_1.automationService.list(user.organizationId);
    res.json({ success: true, data });
});
// GET /automations/:id — get with run history
router.get('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await automations_service_1.automationService.getById(String(req.params.id), user.organizationId);
    res.json({ success: true, data });
});
// POST /automations — create
router.post('/', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await automations_service_1.automationService.create(user.organizationId, req.body);
    res.status(201).json({ success: true, data });
});
// PATCH /automations/:id — update
router.patch('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await automations_service_1.automationService.update(String(req.params.id), user.organizationId, req.body);
    res.json({ success: true, data });
});
// POST /automations/:id/toggle — toggle isActive
router.post('/:id/toggle', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await automations_service_1.automationService.toggle(String(req.params.id), user.organizationId);
    res.json({ success: true, data });
});
// GET /automations/:id/runs — run history
router.get('/:id/runs', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const limit = parseInt(String(req.query.limit)) || 20;
    const data = await automations_service_1.automationService.getRuns(String(req.params.id), user.organizationId, limit);
    res.json({ success: true, data });
});
//# sourceMappingURL=automations.routes.js.map