"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.territoriesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const territories_service_1 = require("./territories.service");
const router = (0, express_1.Router)();
exports.territoriesRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await territories_service_1.territoriesService.list(user.organizationId);
    res.json({ success: true, data });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await territories_service_1.territoriesService.getById(req.params.id);
    res.json({ success: true, data });
});
router.get('/:id/heatmap', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await territories_service_1.territoriesService.getLeadHeatmap(req.params.id);
    res.json({ success: true, data });
});
router.post('/', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await territories_service_1.territoriesService.create({ ...req.body, organizationId: user.organizationId }, user.id);
    res.status(201).json({ success: true, data });
});
router.patch('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await territories_service_1.territoriesService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data });
});
router.post('/:id/assign-rep', auth_1.auth.manager, async (req, res) => {
    const data = await territories_service_1.territoriesService.assignRep(req.params.id, req.body.userId, req.body.isPrimary ?? false);
    res.json({ success: true, data });
});
router.delete('/:id/remove-rep/:userId', auth_1.auth.manager, async (req, res) => {
    await territories_service_1.territoriesService.removeRep(req.params.id, req.params.userId);
    res.json({ success: true, message: 'Rep removed from territory' });
});
//# sourceMappingURL=territories.routes.js.map