import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { aiService } from './ai.service';
import { leadScoringQueue, aiQueue } from '../../jobs';
import { prisma } from '../../shared/services/prisma';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { measurementsService } from '../measurements/measurements.service';

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
      leadScores: { orderBy: { scoredAt: 'desc' }, take: 1 },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 1 },
    } as any,
  });

  if (!lead) {
    // Fallback for demo leads so the UI doesn't crash or show errors
    try {
      const script = await aiService.generatePitchCoach({ firstName: 'Demo', lastName: 'Lead', status: 'NEW' } as any);
      return res.json({ success: true, data: script });
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
  }

  try {
    const script = await aiService.generatePitchCoach(lead as any);
    return res.json({ success: true, data: script });
  } catch (err: any) {
    logger.error(`[ai/pitch-coach] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: err.message || 'AI pitch coach generation failed' });
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
      leadScores: { orderBy: { scoredAt: 'desc' }, take: 1 },
    } as any,
  });

  if (!lead) {
    // Fallback for demo leads
    try {
      const summary = await aiService.generateLeadSummary({ firstName: 'Demo', lastName: 'Lead', status: 'NEW' } as any);
      return res.json({ success: true, data: summary });
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
  }

  try {
    const summary = await aiService.generateLeadSummary(lead as any);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    logger.error(`[ai/lead-summary] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: err.message || 'AI lead summary generation failed' });
  }
});

// ─── Measurement Intelligence Routes ────────────────────────────────────────

/**
 * POST /api/v1/ai-analysis/property-scan
 * Takes 2–20 exterior photos, runs GPT-4o multi-image analysis, and optionally
 * pre-populates existing openings on the inspection with ESTIMATED measurements.
 */
router.post('/property-scan', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { leadId, inspectionId, images, autoPopulateOpenings = true } = req.body as {
    leadId?: string;
    inspectionId?: string;
    images: Array<{ base64: string; elevation: string }>;
    autoPopulateOpenings?: boolean;
  };

  // Validate images only — leadId/inspectionId are optional (standalone field scan)
  if (!Array.isArray(images) || images.length < 2 || images.length > 20) {
    return res.status(400).json({ success: false, message: 'images must be an array of 2–20 items' });
  }

  try {
    const result = await aiService.analyzePropertyPhotos({
      images: images as Array<{ base64: string; elevation: 'front' | 'rear' | 'left' | 'right' | 'closeup' }>,
      leadId: leadId ?? 'standalone',
      organizationId: user.organizationId,
      analyzedById: user.id,
    });

    if (!autoPopulateOpenings) {
      return res.json({ success: true, data: { analysis: result, populated: 0, unmatched: result.windows?.length ?? 0, standalone: !inspectionId } });
    }

    const openings = inspectionId ? await prisma.opening.findMany({
      where: { inspectionId: inspectionId as string } as any,
    }) as any[] : [];

    let populated = 0;
    let unmatched = 0;

    for (const win of result.windows) {
      const match = openings.find(
        (o: any) =>
          o.roomLabel?.toLowerCase().trim() === win.locationLabel?.toLowerCase().trim(),
      );

      if (match) {
        await measurementsService.upsert({
          openingId: match.id,
          finalWidth: win.estimatedWidth,
          finalHeight: win.estimatedHeight,
          measurementMethod: 'multi-photo-ai',
          isAiEstimated: true,
          aiConfidenceScore: win.confidence,
          status: 'ESTIMATED',
          measuredById: user.id,
          notes: `AI estimate from property photo scan. Elevation: ${win.elevation}. REQUIRES TAPE VERIFICATION BEFORE ORDERING.`,
        });
        populated++;
      } else {
        // Create new opening for unmatched or standalone scan
        const newOpening = await prisma.opening.create({
          data: {
            inspectionId: inspectionId || null,
            roomLabel: win.locationLabel || `Unknown Window (${win.elevation})`,
            windowType: 'UNKNOWN',
            frameMaterial: 'UNKNOWN',
          } as any,
        });
        await measurementsService.upsert({
          openingId: newOpening.id,
          finalWidth: win.estimatedWidth,
          finalHeight: win.estimatedHeight,
          measurementMethod: 'multi-photo-ai',
          isAiEstimated: true,
          aiConfidenceScore: win.confidence,
          status: 'ESTIMATED',
          measuredById: user.id,
          notes: `AI estimate from standalone property photo scan. Elevation: ${win.elevation}. REQUIRES TAPE VERIFICATION.`,
        });
        populated++;
      }
    }

    return res.json({ success: true, data: { analysis: result, populated, unmatched } });
  } catch (err: any) {
    logger.error(`[ai-analysis/property-scan] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: err.message || 'Property scan failed' });
  }
});

/**
 * POST /api/v1/ai-analysis/reference-object
 * Analyzes a single photo where a known object (iPhone, credit card, dollar bill)
 * is used as a size reference. Auto-saves the measurement at REVIEWED status.
 */
router.post('/reference-object', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const {
    openingId, leadId, imageBase64, referenceObject,
    distanceFeet, referenceDimensions,
  } = req.body as {
    openingId?: string;
    leadId?: string;
    imageBase64: string;
    referenceObject: 'iphone' | 'credit_card' | 'dollar_bill';
    distanceFeet?: number;
    referenceDimensions?: { widthIn: number; heightIn: number; widthMm: number; heightMm: number };
  };

  // Validate required fields
  if (!imageBase64) return res.status(400).json({ success: false, message: 'imageBase64 is required' });
  if (!['iphone', 'credit_card', 'dollar_bill'].includes(referenceObject)) {
    return res.status(400).json({
      success: false,
      message: 'referenceObject must be iphone, credit_card, or dollar_bill',
    });
  }

  // openingId is optional — skip DB upsert when no real opening is linked
  const isRealOpeningId = openingId && openingId !== 'field-app' && openingId !== 'standalone' && openingId.length > 8;

  try {
    const result = await aiService.analyzeWithReferenceObject({
      imageBase64,
      referenceObject,
      openingId: openingId || 'standalone',
      leadId: leadId ?? '',
      analyzedById: user.id,
      distanceFeet: distanceFeet ? Number(distanceFeet) : undefined,
      referenceDimensions,
    });

    let savedMeasurement: any = null;

    // Only persist to DB if we have a real opening ID that exists
    if (isRealOpeningId) {
      const opening = await prisma.opening.findUnique({ where: { id: openingId! } }).catch(() => null);
      if (opening) {
        const warningNote = result.referenceWarning ? ` ${result.referenceWarning}` : '';
        savedMeasurement = await measurementsService.upsert({
          openingId: openingId!,
          finalWidth: result.estimatedWidth,
          finalHeight: result.estimatedHeight,
          measurementMethod: 'reference-object',
          isAiEstimated: true,
          aiConfidenceScore: result.confidence,
          status: 'REVIEWED',
          measuredById: user.id,
          notes: `Reference-object estimate using ${referenceObject}.${warningNote} REQUIRES TAPE VERIFICATION BEFORE ORDERING.`,
        });
      }
    }

    return res.json({ success: true, data: { analysis: result, measurement: savedMeasurement } });
  } catch (err: any) {
    logger.error(`[ai-analysis/reference-object] Error: ${sanitizeForLog(err.message)}`);
    return res.status(500).json({ success: false, message: err.message || 'Reference-object measurement failed' });
  }
});

export { router as aiAnalysisRouter };
