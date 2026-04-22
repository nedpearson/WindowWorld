"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openingsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const openings_service_1 = require("./openings.service");
const router = (0, express_1.Router)();
exports.openingsRouter = router;
// GET /openings?inspectionId=...&propertyId=...
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const { inspectionId, propertyId } = req.query;
    let data;
    if (inspectionId) {
        data = await openings_service_1.openingService.listByInspection(String(inspectionId));
    }
    else if (propertyId) {
        data = await openings_service_1.openingService.listByProperty(String(propertyId));
    }
    else {
        return res.status(400).json({ success: false, error: 'Provide inspectionId or propertyId' });
    }
    res.json({ success: true, data });
});
// GET /openings/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await openings_service_1.openingService.getById(String(req.params.id));
    res.json({ success: true, data });
});
// POST /openings
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await openings_service_1.openingService.create(req.body);
    res.status(201).json({ success: true, data });
});
// PATCH /openings/:id
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await openings_service_1.openingService.update(String(req.params.id), req.body);
    res.json({ success: true, data });
});
// DELETE /openings/:id
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    await openings_service_1.openingService.delete(String(req.params.id));
    res.json({ success: true });
});
// POST /openings/reorder — reorder within an inspection
router.post('/reorder', auth_1.auth.repOrAbove, async (req, res) => {
    const { inspectionId, orderedIds } = req.body;
    if (!inspectionId || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, error: 'inspectionId and orderedIds[] required' });
    }
    const data = await openings_service_1.openingService.reorder(inspectionId, orderedIds);
    res.json({ success: true, data });
});
//# sourceMappingURL=openings.routes.js.map