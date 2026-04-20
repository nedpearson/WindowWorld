"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const inspections_service_1 = require("./inspections.service");
const router = (0, express_1.Router)();
exports.inspectionsRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', leadId, propertyId } = req.query;
    const repId = ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : undefined;
    const result = await inspections_service_1.inspectionsService.list({
        organizationId: user.organizationId, leadId, propertyId, repId,
        page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await inspections_service_1.inspectionsService.getById(req.params.id);
    res.json({ success: true, data });
});
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await inspections_service_1.inspectionsService.create({ ...req.body, inspectedById: user.id, organizationId: user.organizationId });
    res.status(201).json({ success: true, data });
});
router.patch('/:id/start', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await inspections_service_1.inspectionsService.startInspection(req.params.id, user.id);
    res.json({ success: true, data });
});
router.patch('/:id/complete', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await inspections_service_1.inspectionsService.completeInspection(req.params.id, user.id, req.body);
    res.json({ success: true, data });
});
router.post('/:id/openings', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await inspections_service_1.inspectionsService.addOpening(req.params.id, req.body);
    res.status(201).json({ success: true, data });
});
//# sourceMappingURL=inspections.routes.js.map