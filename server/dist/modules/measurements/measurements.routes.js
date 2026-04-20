"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measurementsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const measurements_service_1 = require("./measurements.service");
const router = (0, express_1.Router)();
exports.measurementsRouter = router;
// GET /api/v1/measurements/opening/:openingId
router.get('/opening/:openingId', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await measurements_service_1.measurementsService.getByOpening(req.params.openingId);
    res.json({ success: true, data });
});
// GET /api/v1/measurements/property/:propertyId/summary
router.get('/property/:propertyId/summary', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await measurements_service_1.measurementsService.getPropertySummary(req.params.propertyId);
    res.json({ success: true, data });
});
// POST /api/v1/measurements  (create or update)
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await measurements_service_1.measurementsService.upsert({ ...req.body, measuredById: user.id });
    res.status(200).json({ success: true, data });
});
// POST /api/v1/measurements/opening/:openingId/verify
router.post('/opening/:openingId/verify', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { finalWidth, finalHeight } = req.body;
    const data = await measurements_service_1.measurementsService.verify(req.params.openingId, user.id, parseFloat(finalWidth), parseFloat(finalHeight));
    res.json({ success: true, data });
});
// POST /api/v1/measurements/opening/:openingId/approve-for-order
router.post('/opening/:openingId/approve-for-order', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await measurements_service_1.measurementsService.approveForOrder(req.params.openingId, user.id);
    res.json({ success: true, data });
});
//# sourceMappingURL=measurements.routes.js.map