"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertiesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const properties_service_1 = require("./properties.service");
const router = (0, express_1.Router)();
exports.propertiesRouter = router;
// GET /api/v1/properties
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const { page = '1', limit = '25', leadId, parish, zip, search } = req.query;
    const result = await properties_service_1.propertiesService.list({
        leadId, parish, zip, search,
        page: parseInt(page), limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...result });
});
// GET /api/v1/properties/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const property = await properties_service_1.propertiesService.getById(req.params.id);
    res.json({ success: true, data: property });
});
// GET /api/v1/properties/:id/order-readiness
router.get('/:id/order-readiness', auth_1.auth.repOrAbove, async (req, res) => {
    const readiness = await properties_service_1.propertiesService.getOrderReadiness(req.params.id);
    res.json({ success: true, data: readiness });
});
// POST /api/v1/properties
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const property = await properties_service_1.propertiesService.create(req.body, user.id);
    res.status(201).json({ success: true, data: property });
});
// PATCH /api/v1/properties/:id
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const property = await properties_service_1.propertiesService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data: property });
});
// POST /api/v1/properties/:id/link-lead
router.post('/:id/link-lead', auth_1.auth.repOrAbove, async (req, res) => {
    const property = await properties_service_1.propertiesService.linkToLead(req.params.id, req.body.leadId);
    res.json({ success: true, data: property });
});
//# sourceMappingURL=properties.routes.js.map