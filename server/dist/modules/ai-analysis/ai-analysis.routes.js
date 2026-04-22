"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const ai_service_1 = require("./ai.service");
const jobs_1 = require("../../jobs");
const prisma_1 = require("../../shared/services/prisma");
const logger_1 = require("../../shared/utils/logger");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const router = (0, express_1.Router)();
exports.aiAnalysisRouter = router;
// ─── AI Analysis CRUD (used by client aiAnalysis.* namespace) ─────────────
/**
 * GET /api/v1/ai-analysis/lead/:leadId
 * Get all AI analyses for a lead (across all documents/openings).
 */
router.get('/lead/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const { leadId } = req.params;
    const data = await prisma_1.prisma.aiAnalysis.findMany({
        where: { leadId: leadId },
        orderBy: { createdAt: 'desc' },
        include: {
            document: { select: { id: true, originalName: true, url: true, type: true } },
        },
    });
    res.json({ success: true, data });
});
/**
 * GET /api/v1/ai-analysis/inspection/:inspectionId
 * Get all AI analyses for a specific inspection.
 */
router.get('/inspection/:inspectionId', auth_1.auth.repOrAbove, async (req, res) => {
    const { inspectionId } = req.params;
    const data = await prisma_1.prisma.aiAnalysis.findMany({
        where: { inspectionId: inspectionId },
        orderBy: { createdAt: 'desc' },
        include: {
            document: { select: { id: true, originalName: true, url: true, type: true } },
        },
    });
    res.json({ success: true, data });
});
/**
 * PATCH /api/v1/ai-analysis/:id/override
 * Allow a rep or manager to override AI analysis results (e.g. correct window type, dimensions).
 */
router.patch('/:id/override', auth_1.auth.repOrAbove, async (req, res) => {
    const { id } = req.params;
    const { override } = req.body;
    const existing = await prisma_1.prisma.aiAnalysis.findUnique({ where: { id: id } });
    if (!existing)
        throw new errorHandler_1.NotFoundError('AI Analysis');
    const updated = await prisma_1.prisma.aiAnalysis.update({
        where: { id: id },
        data: {
            humanOverride: override,
            overriddenAt: new Date(),
            overriddenById: req.user.id,
        },
    });
    res.json({ success: true, data: updated });
});
/**
 * POST /api/v1/ai-analysis/:id/retry
 * Re-trigger AI analysis for a specific analysis record (re-queues the document).
 */
router.post('/:id/retry', auth_1.auth.repOrAbove, async (req, res) => {
    const { id } = req.params;
    const analysis = await prisma_1.prisma.aiAnalysis.findUnique({
        where: { id: id },
        include: { document: true },
    });
    if (!analysis)
        throw new errorHandler_1.NotFoundError('AI Analysis');
    // Reset status and re-queue
    await prisma_1.prisma.aiAnalysis.update({
        where: { id: id },
        data: { status: 'PENDING', error: null, completedAt: null },
    });
    const job = await jobs_1.aiQueue.add('retry-ai-analysis', {
        analysisId: id,
        documentId: analysis.documentId,
        openingId: analysis.openingId,
        leadId: analysis.leadId,
        imagePath: analysis.document?.url,
    });
    res.json({ success: true, data: { queued: true, analysisId: id, jobId: job.id } });
});
// ─── AI Feature Routes (pitch coach, lead scoring, lead summary) ─────────
/**
 * GET /api/v1/ai/pitch-coach/:leadId
 * Generate a personalised pitch script for a lead using AI.
 */
router.get('/pitch-coach/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const { leadId } = req.params;
    const lead = await prisma_1.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
            properties: true,
            contacts: { where: { isPrimary: true }, take: 1 },
            latestScore: true,
            appointments: { orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
    });
    if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    try {
        const script = await ai_service_1.aiService.generatePitchCoach(lead);
        return res.json({ success: true, data: script });
    }
    catch (err) {
        logger_1.logger.error('[ai/pitch-coach] Error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});
/**
 * POST /api/v1/ai/score-lead/:leadId
 * Trigger an immediate AI lead score (queues BullMQ job).
 */
router.post('/score-lead/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const { leadId } = req.params;
    const lead = await prisma_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead)
        return res.status(404).json({ success: false, message: 'Lead not found' });
    const job = await jobs_1.leadScoringQueue.add('score-single-lead', { leadId }, { priority: 1 });
    return res.json({ success: true, data: { queued: true, jobId: job.id, leadId } });
});
/**
 * GET /api/v1/ai/lead-summary/:leadId
 * Generate a concise AI summary of a lead's profile and engagement.
 */
router.get('/lead-summary/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const { leadId } = req.params;
    const lead = await prisma_1.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
            properties: true,
            contacts: { where: { isPrimary: true }, take: 1 },
            appointments: { orderBy: { scheduledAt: 'desc' }, take: 3 },
            activities: { orderBy: { createdAt: 'desc' }, take: 5 },
            latestScore: true,
        },
    });
    if (!lead)
        return res.status(404).json({ success: false, message: 'Lead not found' });
    try {
        const summary = await ai_service_1.aiService.generateLeadSummary(lead);
        return res.json({ success: true, data: summary });
    }
    catch (err) {
        logger_1.logger.error('[ai/lead-summary] Error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});
//# sourceMappingURL=ai-analysis.routes.js.map