import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';

export class LeadScoreService {
  async getByLead(leadId: string) {
    return prisma.leadScore.findMany({
      where: { leadId },
      orderBy: { scoredAt: 'desc' },
    });
  }

  async getLatest(leadId: string) {
    return prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { scoredAt: 'desc' },
    });
  }

  async override(
    leadId: string,
    userId: string,
    data: {
      closeProbability?: number;
      urgencyScore?: number;
      totalScore?: number;
      rationale?: string;
      recommendedPitchAngle?: string;
    },
  ) {
    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) throw new NotFoundError('Lead');

    // Create a new score record from manual override
    const score = await prisma.leadScore.create({
      data: {
        leadId,
        scoredBy: userId,
        totalScore: data.totalScore ?? 0,
        urgencyScore: data.urgencyScore ?? 0,
        closeProbability: data.closeProbability ?? 0,
        rationale: data.rationale,
        recommendedPitchAngle: data.recommendedPitchAngle as any,
        confidenceScore: 1.0, // Manual override = 100% confidence
      },
    });

    // Sync key scores up to the Lead row for fast querying
    await prisma.lead.update({
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

export const leadScoreService = new LeadScoreService();
