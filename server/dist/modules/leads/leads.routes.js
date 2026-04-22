"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// POST /api/v1/leads/bulk-import — CSV/JSON bulk lead import (manager only)
router.post('/bulk-import', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const { leads: rawLeads } = req.body;
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'leads must be a non-empty array' } });
    }
    if (rawLeads.length > 500) {
        return res.status(413).json({ success: false, error: { message: 'Maximum 500 leads per import batch' } });
    }
    const results = {
        success: [],
        skipped: [],
        failed: [],
    };
    for (let i = 0; i < rawLeads.length; i++) {
        const row = rawLeads[i];
        // At minimum we need some identifying info
        if (!row.firstName && !row.lastName && !row.phone && !row.email && !row.address) {
            results.failed.push({ row: i + 1, reason: 'Row has no usable data (need firstName, lastName, phone, email, or address)' });
            continue;
        }
        try {
            // Basic dedup: skip if a lead with same phone or email already exists in this org
            if (row.phone || row.email) {
                const { prisma: db } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
                const existing = await db.lead.findFirst({
                    where: {
                        organizationId: user.organizationId,
                        OR: [
                            ...(row.phone ? [{ phone: row.phone }] : []),
                            ...(row.email ? [{ email: row.email }] : []),
                        ],
                    },
                });
                if (existing) {
                    results.skipped.push({ row: i + 1, reason: `Duplicate: lead with this phone/email already exists (id: ${existing.id})` });
                    continue;
                }
            }
            const lead = await leads_service_1.leadService.create({
                firstName: row.firstName || '',
                lastName: row.lastName || '',
                email: row.email,
                phone: row.phone,
                address: row.address,
                city: row.city,
                state: row.state || 'LA',
                zip: row.zip,
                parish: row.parish,
                source: row.source || 'CSV_IMPORT',
                notes: row.notes,
                organizationId: user.organizationId,
                assignedRepId: row.assignedRepId || user.id,
                createdById: user.id,
            });
            results.success.push(lead.id);
        }
        catch (err) {
            results.failed.push({ row: i + 1, reason: err.message });
        }
    }
    res.status(207).json({
        success: true,
        data: {
            imported: results.success.length,
            skipped: results.skipped.length,
            failed: results.failed.length,
            details: results,
        },
    });
});
//# sourceMappingURL=leads.routes.js.map