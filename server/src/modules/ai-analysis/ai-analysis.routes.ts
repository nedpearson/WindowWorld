import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { aiService } from './ai.service';
import { leadScoringQueue } from '../../jobs';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

const router = Router();

/**
 * GET /api/v1/ai/pitch-coach/:leadId
 * Generate a personalised pitch script for a lead using AI.
 */
router.get('/pitch-coach/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      properties: true,
      contacts: { where: { isPrimary: true }, take: 1 },
      latestScore: true,
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 1 },
    } as any,
  });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  try {
    const script = await aiService.generatePitchCoach(lead as any);
    return res.json({ success: true, data: script });
  } catch (err: any) {
    logger.error('[ai/pitch-coach] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/ai/score-lead/:leadId
 * Trigger an immediate AI lead score (queues BullMQ job).
 */
router.post('/score-lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  const job = await leadScoringQueue.add('score-single-lead', { leadId }, { priority: 1 });
  return res.json({ success: true, data: { queued: true, jobId: job.id, leadId } });
});

/**
 * GET /api/v1/ai/lead-summary/:leadId
 * Generate a concise AI summary of a lead's profile and engagement.
 */
router.get('/lead-summary/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      properties: true,
      contacts: { where: { isPrimary: true }, take: 1 },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 3 },
      activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      latestScore: true,
    } as any,
  });

  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  try {
    const summary = await aiService.generateLeadSummary(lead as any);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    logger.error('[ai/lead-summary] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export { router as aiAnalysisRouter };
