"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalysisRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const ai_service_1 = require("./ai.service");
const jobs_1 = require("../../jobs");
const prisma_1 = require("../../shared/services/prisma");
const logger_1 = require("../../shared/utils/logger");
const router = (0, express_1.Router)();
exports.aiAnalysisRouter = router;
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