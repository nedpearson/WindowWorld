"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../../shared/middleware/auth");
const leads_service_1 = require("./leads.service");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const router = (0, express_1.Router)();
exports.leadsRouter = router;
function validate(req) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const map = {};
        errors.array().forEach((e) => {
            if (!map[e.path])
                map[e.path] = [];
            map[e.path].push(e.msg);
        });
        throw new errorHandler_1.ValidationError('Validation failed', map);
    }
}
// GET /api/v1/leads
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', status, search, parish, zip, assignedRepId, territoryId, isStormLead, minScore, maxScore, source, sortBy = 'createdAt', sortDir = 'desc', } = req.query;
    const result = await leads_service_1.leadService.list({
        organizationId: user.organizationId,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        status: status,
        search,
        parish,
        zip,
        assignedRepId,
        territoryId,
        isStormLead: isStormLead === 'true',
        minScore: minScore ? parseInt(minScore) : undefined,
        maxScore: maxScore ? parseInt(maxScore) : undefined,
        source,
        sortBy,
        sortDir: sortDir,
        // Reps only see their own leads unless manager+
        restrictToRepId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role)
            ? user.id
            : undefined,
    });
    res.json({ success: true, ...result });
});
// GET /api/v1/leads/map â€” statewide lead map data
router.get('/map', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { parish, zip, status, isStormLead } = req.query;
    const data = await leads_service_1.leadService.getMapData({
        organizationId: user.organizationId,
        parish,
        zip,
        status: status,
        isStormLead: isStormLead === 'true',
    });
    res.json({ success: true, data });
});
// GET /api/v1/leads/best-today â€” AI-prioritized leads for today
router.get('/best-today', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await leads_service_1.leadService.getBestLeadsToday({
        organizationId: user.organizationId,
        repId: user.id,
    });
    res.json({ success: true, data });
});
// GET /api/v1/leads/storm-follow-up â€” storm opportunity leads
router.get('/storm-follow-up', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await leads_service_1.leadService.getStormFollowUpLeads({
        organizationId: user.organizationId,
    });
    res.json({ success: true, data });
});
// GET /api/v1/leads/pipeline â€” kanban stage view
router.get('/pipeline', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { repId } = req.query;
    const data = await leads_service_1.leadService.getPipelineView({
        organizationId: user.organizationId,
        repId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId,
    });
    res.json({ success: true, data });
});
// GET /api/v1/leads/:id
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const lead = await leads_service_1.leadService.getById(req.params.id, user.organizationId);
    res.json({ success: true, data: lead });
});
// POST /api/v1/leads
router.post('/', auth_1.auth.repOrAbove, [
    (0, express_validator_1.body)('firstName').optional().isString(),
    (0, express_validator_1.body)('lastName').optional().isString(),
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('phone').optional().isString(),
    (0, express_validator_1.body)('address').optional().isString(),
    (0, express_validator_1.body)('city').optional().isString(),
    (0, express_validator_1.body)('zip').optional().isString(),
    (0, express_validator_1.body)('parish').optional().isString(),
    (0, express_validator_1.body)('source').optional().isString(),
], async (req, res) => {
    validate(req);
    const user = req.user;
    const lead = await leads_service_1.leadService.create({
        ...req.body,
        organizationId: user.organizationId,
        assignedRepId: req.body.assignedRepId || user.id,
        createdById: user.id,
    });
    res.status(201).json({ success: true, data: lead });
});
// PATCH /api/v1/leads/:id
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const lead = await leads_service_1.leadService.update(req.params.id, user.organizationId, req.body, user.id);
    res.json({ success: true, data: lead });
});
// PATCH /api/v1/leads/:id/status
router.patch('/:id/status', auth_1.auth.repOrAbove, [(0, express_validator_1.body)('status').isString().notEmpty()], async (req, res) => {
    validate(req);
    const user = req.user;
    const lead = await leads_service_1.leadService.updateStatus(req.params.id, user.organizationId, req.body.status, req.body.reason, user.id);
    res.json({ success: true, data: lead });
});
// PATCH /api/v1/leads/:id/assign
router.patch('/:id/assign', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const lead = await leads_service_1.leadService.assign(req.params.id, user.organizationId, req.body.repId, user.id);
    res.json({ success: true, data: lead });
});
// POST /api/v1/leads/:id/duplicate-check
router.post('/:id/duplicate-check', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const duplicates = await leads_service_1.leadService.checkForDuplicates(req.params.id, user.organizationId);
    res.json({ success: true, data: duplicates });
});
// GET /api/v1/leads/:id/activities
router.get('/:id/activities', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const activities = await leads_service_1.leadService.getActivities(req.params.id, user.organizationId);
    res.json({ success: true, data: activities });
});
// POST /api/v1/leads/:id/activities
router.post('/:id/activities', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const activity = await leads_service_1.leadService.logActivity({
        leadId: req.params.id,
        organizationId: user.organizationId,
        userId: user.id,
        ...req.body,
    });
    res.status(201).json({ success: true, data: activity });
});
// GET /api/v1/leads/:id/notes
router.get('/:id/notes', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const notes = await leads_service_1.leadService.getNotes(req.params.id, user.organizationId);
    res.json({ success: true, data: notes });
});
// POST /api/v1/leads/:id/notes
router.post('/:id/notes', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const note = await leads_service_1.leadService.addNote({
        leadId: req.params.id,
        organizationId: user.organizationId,
        authorId: user.id,
        content: req.body.content,
        isInternal: req.body.isInternal ?? false,
        isPinned: req.body.isPinned ?? false,
    });
    res.status(201).json({ success: true, data: note });
});
// GET /api/v1/leads/:id/ai-summary â€” AI-generated lead summary + pitch
router.get('/:id/ai-summary', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const summary = await leads_service_1.leadService.getAiSummary(req.params.id, user.organizationId);
    res.json({ success: true, data: summary });
});
// DELETE /api/v1/leads/:id
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    await leads_service_1.leadService.softDelete(req.params.id, user.organizationId, user.id);
    res.json({ success: true, message: 'Lead deleted' });
});
//# sourceMappingURL=leads.routes.js.map