"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposalsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const proposals_service_1 = require("./proposals.service");
const router = (0, express_1.Router)();
exports.proposalsRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', leadId, status } = req.query;
    const repId = user.role === 'SALES_REP' ? user.id : undefined;
    const result = await proposals_service_1.proposalsService.list({
        organizationId: user.organizationId,
        leadId, status, repId,
        page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await proposals_service_1.proposalsService.getById(req.params.id);
    res.json({ success: true, data });
});
// Public: record when customer views the proposal
router.post('/p/:id/view', async (req, res) => {
    await proposals_service_1.proposalsService.recordView(req.params.id, req.ip);
    res.json({ success: true });
});
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.create({ ...req.body, createdById: user.id, organizationId: user.organizationId });
    res.status(201).json({ success: true, data });
});
router.post('/:id/generate-pdf', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.generatePdf(req.params.id, user.id);
    res.json({ success: true, data });
});
router.post('/:id/send', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { channel = 'email' } = req.body;
    const data = await proposals_service_1.proposalsService.send(req.params.id, user.id, channel);
    res.json({ success: true, data });
});
router.patch('/:id/status', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.updateStatus(req.params.id, req.body.status, user.id);
    res.json({ success: true, data });
});
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    await proposals_service_1.proposalsService.delete(req.params.id, user.id);
    res.json({ success: true, message: 'Proposal deleted' });
});
//# sourceMappingURL=proposals.routes.js.map