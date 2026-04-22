"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadScoreService = exports.LeadScoreService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
class LeadScoreService {
    async getByLead(leadId) {
        return prisma_1.prisma.leadScore.findMany({
            where: { leadId },
            orderBy: { scoredAt: 'desc' },
        });
    }
    async getLatest(leadId) {
        return prisma_1.prisma.leadScore.findFirst({
            where: { leadId },
            orderBy: { scoredAt: 'desc' },
        });
    }
    async override(leadId, userId, data) {
        // Verify lead exists
        const lead = await prisma_1.prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
        if (!lead)
            throw new errorHandler_1.NotFoundError('Lead');
        // Create a new score record from manual override
        const score = await prisma_1.prisma.leadScore.create({
            data: {
                leadId,
                scoredBy: userId,
                totalScore: data.totalScore ?? 0,
                urgencyScore: data.urgencyScore ?? 0,
                closeProbability: data.closeProbability ?? 0,
                rationale: data.rationale,
                recommendedPitchAngle: data.recommendedPitchAngle,
                confidenceScore: 1.0, // Manual override = 100% confidence
            },
        });
        // Sync key scores up to the Lead row for fast querying
        await prisma_1.prisma.lead.update({
            where: { id: leadId },
            data: {
                ...(data.totalScore !== undefined && { leadScore: data.totalScore }),
                ...(data.urgencyScore !== undefined && { urgencyScore: data.urgencyScore }),
                ...(data.closeProbability !== undefined && { closeProbability: data.closeProbability }),
            },
        });
        return score;
    }
}
exports.LeadScoreService = LeadScoreService;
exports.leadScoreService = new LeadScoreService();
//# sourceMappingURL=lead-scores.service.js.map