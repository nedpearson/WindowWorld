"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const invoices_service_1 = require("./invoices.service");
const router = (0, express_1.Router)();
exports.invoicesRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', leadId, status, overdueOnly } = req.query;
    const result = await invoices_service_1.invoicesService.list({
        organizationId: user.organizationId,
        leadId, status,
        overdueOnly: overdueOnly === 'true',
        page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
});
router.get('/aging', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.getAgingSummary(user.organizationId);
    res.json({ success: true, data });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await invoices_service_1.invoicesService.getById(req.params.id);
    res.json({ success: true, data });
});
router.post('/from-proposal', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.createFromProposal({ ...req.body, createdById: user.id });
    res.status(201).json({ success: true, data });
});
router.post('/:id/payments', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.recordPayment(req.params.id, { ...req.body, recordedById: user.id });
    res.status(201).json({ success: true, data });
});
router.post('/:id/send', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.send(req.params.id, user.id);
    res.json({ success: true, data });
});
//# sourceMappingURL=invoices.routes.js.map