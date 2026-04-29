import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { aiService } from './ai.service';
import { leadScoringQueue, aiQueue } from '../../jobs';
import { prisma } from '../../shared/services/prisma';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { NotFoundError } from '../../shared/middleware/errorHandler';

const router = Router();

// ─── AI Analysis CRUD (used by client aiAnalysis.* namespace) ─────────────

/**
 * GET /api/v1/ai-analysis/lead/:leadId
 * Get all AI analyses for a lead (across all documents/openings).
 */
router.get('/lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const data = await prisma.aiAnalysis.findMany({
    where: { leadId: leadId as string },
    orderBy: { createdAt: 'desc' },
    include: {
      document: { select: { id: true, originalName: true, url: true, type: true } } as any,
    } as any,
  });
  res.json({ success: true, data });
});

/**
 * GET /api/v1/ai-analysis/inspection/:inspectionId
 * Get all AI analyses for a specific inspection.
 */
router.get('/inspection/:inspectionId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { inspectionId } = req.params;
  const data = await prisma.aiAnalysis.findMany({
    where: { inspectionId: inspectionId as string } as any,
    orderBy: { createdAt: 'desc' },
    include: {
      document: { select: { id: true, originalName: true, url: true, type: true } } as any,
    } as any,
  });
  res.json({ success: true, data });
});

/**
 * PATCH /api/v1/ai-analysis/:id/override
 * Allow a rep or manager to override AI analysis results (e.g. correct window type, dimensions).
 */
router.patch('/:id/override', auth.repOrAbove, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { override } = req.body;

  const existing = await prisma.aiAnalysis.findUnique({ where: { id: id as string } });
  if (!existing) throw new NotFoundError('AI Analysis');

  const updated = await prisma.aiAnalysis.update({
    where: { id: id as string },
    data: {
      humanOverride: override,
      overriddenAt: new Date(),
      overriddenById: (req as AuthenticatedRequest).user.id,
    } as any,
  });

  res.json({ success: true, data: updated });
});

/**
 * POST /api/v1/ai-analysis/:id/retry
 * Re-trigger AI analysis for a specific analysis record (re-queues the document).
 */
router.post('/:id/retry', auth.repOrAbove, async (req: Request, res: Response) => {
  const { id } = req.params;

  const analysis = await prisma.aiAnalysis.findUnique({
    where: { id: id as string },
    include: { document: true } as any,
  }) as any;

  if (!analysis) throw new NotFoundError('AI Analysis');

  // Reset status and re-queue
  await prisma.aiAnalysis.update({
    where: { id: id as string },
    data: { status: 'PENDING', error: null, completedAt: null } as any,
  });

  const job = await aiQueue.add('retry-ai-analysis', {
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
router.get('/pitch-coach/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId as string },
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
    logger.error(`[ai/pitch-coach] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: 'AI pitch coach generation failed' });
  }
});

/**
 * POST /api/v1/ai/score-lead/:leadId
 * Trigger an immediate AI lead score (queues BullMQ job).
 */
router.post('/score-lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findUnique({ where: { id: leadId as string } });
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
    where: { id: leadId as string },
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
    logger.error(`[ai/lead-summary] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: 'AI lead summary generation failed' });
  }
});

export { router as aiAnalysisRouter };
