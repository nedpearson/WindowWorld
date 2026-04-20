"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../../shared/middleware/auth");
const appointments_service_1 = require("./appointments.service");
const router = (0, express_1.Router)();
exports.appointmentsRouter = router;
// GET /api/v1/appointments
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', date, week, status, leadId, repId } = req.query;
    const result = await appointments_service_1.appointmentsService.list({
        organizationId: user.organizationId,
        repId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId,
        date, week, status: status, leadId,
        page: parseInt(page), limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...result });
});
// GET /api/v1/appointments/route â€” today's optimized route
router.get('/route', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const repId = req.query.repId || user.id;
    const route = await appointments_service_1.appointmentsService.getTodayRoute(repId, user.organizationId);
    res.json({ success: true, data: route });
});
// GET /api/v1/appointments/calendar
router.get('/calendar', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { start, end, repId } = req.query;
    const data = await appointments_service_1.appointmentsService.getCalendar(['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId, user.organizationId, start || new Date().toISOString(), end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    res.json({ success: true, data });
});
// GET /api/v1/appointments/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const apt = await appointments_service_1.appointmentsService.getById(req.params.id);
    res.json({ success: true, data: apt });
});
// POST /api/v1/appointments
router.post('/', auth_1.auth.repOrAbove, [(0, express_validator_1.body)('leadId').notEmpty(), (0, express_validator_1.body)('title').notEmpty(), (0, express_validator_1.body)('scheduledAt').isISO8601()], async (req, res) => {
    const user = req.user;
    const apt = await appointments_service_1.appointmentsService.create({ ...req.body, createdById: user.id });
    res.status(201).json({ success: true, data: apt });
});
// PATCH /api/v1/appointments/:id
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const apt = await appointments_service_1.appointmentsService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data: apt });
});
// PATCH /api/v1/appointments/:id/status
router.patch('/:id/status', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const apt = await appointments_service_1.appointmentsService.updateStatus(req.params.id, req.body.status, req.body.outcome, user.id);
    res.json({ success: true, data: apt });
});
//# sourceMappingURL=appointments.routes.js.map