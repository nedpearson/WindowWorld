/**
 * Queue singletons — exported so services can enqueue jobs without
 * importing the full BullMQ runtime during test/build.
 * Queues are only connected when Redis is available.
 */

import { logger } from '../shared/utils/logger';

// ── Lazy queue singletons ────────────────────────────────────
let _pdfQueue: any = null;
let _emailQueue: any = null;
let _aiQueue: any = null;
let _automationQueue: any = null;
let _syncQueue: any = null;
let _leadScoringQueue: any = null;

// Mock queue used when Redis is unavailable
const mockQueue = {
  add: async (name: string, data: any) => {
    logger.warn(`[MockQueue] Would enqueue "${name}" — Redis unavailable`, { data });
    return { id: `mock-${Date.now()}` };
  },
};

export const pdfQueue = new Proxy({} as any, {
  get: (_, prop) => (_pdfQueue || mockQueue)[prop]?.bind(_pdfQueue || mockQueue),
});
export const emailQueue = new Proxy({} as any, {
  get: (_, prop) => (_emailQueue || mockQueue)[prop]?.bind(_emailQueue || mockQueue),
});
export const aiQueue = new Proxy({} as any, {
  get: (_, prop) => (_aiQueue || mockQueue)[prop]?.bind(_aiQueue || mockQueue),
});
export const automationQueue = new Proxy({} as any, {
  get: (_, prop) => (_automationQueue || mockQueue)[prop]?.bind(_automationQueue || mockQueue),
});
export const syncQueue = new Proxy({} as any, {
  get: (_, prop) => (_syncQueue || mockQueue)[prop]?.bind(_syncQueue || mockQueue),
});
export const leadScoringQueue = new Proxy({} as any, {
  get: (_, prop) => (_leadScoringQueue || mockQueue)[prop]?.bind(_leadScoringQueue || mockQueue),
});

// ── Worker implementations ────────────────────────────────────

async function runLeadScoringJob(job: any) {
  const { leadId } = job.data;
  logger.info(`[lead-scoring] Processing lead: ${leadId}`);

  const { prisma } = await import('../shared/services/prisma');
  const { aiService } = await import('../modules/ai-analysis/ai.service');

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { properties: true, contacts: true },
  });
  if (!lead) { logger.warn(`[lead-scoring] Lead ${leadId} not found`); return; }

  const scoreData = await aiService.scoreLead(lead);

  await prisma.leadScore.create({
    data: {
      leadId,
      totalScore: scoreData.totalScore,
      urgencyScore: scoreData.urgencyScore,
      closeProbability: scoreData.closeProbability,
      financingScore: scoreData.financingPropensity,
      homeAgeScore: scoreData.homeAgeScore,
      weatherExposureScore: scoreData.weatherExposureScore,
      neighborhoodScore: scoreData.neighborhoodScore,
      priorContactScore: scoreData.priorContactScore,
      responseScore: scoreData.responseScore,
      referralScore: scoreData.referralScore,
      campaignScore: scoreData.campaignScore,
      recommendedPitchAngle: scoreData.recommendedPitchAngle,
      recommendedProduct: scoreData.recommendedProductCategory,
      estimatedRevenueBand: scoreData.estimatedRevenueBand,
      estimatedProjectSize: scoreData.estimatedProjectSize,
      likelyObjections: scoreData.likelyObjections,
      confidenceScore: scoreData.confidenceScore,
      rationale: scoreData.rationale,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: Math.round(scoreData.totalScore),
      urgencyScore: Math.round(scoreData.urgencyScore),
      closeProbability: scoreData.closeProbability,
      financingPropensity: scoreData.financingPropensity,
      estimatedRevenue: scoreData.estimatedRevenueBand === 'premium' ? 15000
        : scoreData.estimatedRevenueBand === 'high' ? 8000
        : scoreData.estimatedRevenueBand === 'medium' ? 4000 : 1500,
    },
  });

  logger.info(`[lead-scoring] Score updated for ${leadId}: ${scoreData.totalScore}`);
}

async function runAiPhotoJob(job: any) {
  const { documentId, openingId, leadId, imagePath } = job.data;
  logger.info(`[ai-photo] Analyzing document: ${documentId}`);

  const { prisma } = await import('../shared/services/prisma');
  const { aiService } = await import('../modules/ai-analysis/ai.service');
  const fs = await import('fs');
  const path = await import('path');

  try {
    // Load image file and convert to base64
    const fullPath = path.resolve(imagePath);
    if (!fs.existsSync(fullPath)) {
      logger.warn(`[ai-photo] Image not found: ${fullPath}`);
      await prisma.document.update({
        where: { id: documentId },
        data: { aiStatus: 'FAILED', aiError: 'Image file not found' } as any,
      });
      return;
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const imageBase64 = imageBuffer.toString('base64');

    const result = await aiService.analyzeWindowPhoto({
      imageBase64,
      openingId,
      leadId,
      context: `Document ID: ${documentId}`,
    });

    // Update document with analysis result
    await prisma.document.update({
      where: { id: documentId },
      data: {
        aiStatus: 'COMPLETE',
        aiAnalysisId: result.analysisId,
        aiCompletedAt: new Date(),
      } as any,
    });

    // If opening found and AI estimated dimensions, create/update measurement
    if (openingId && result.canEstimateDimensions && result.estimatedWidthInches && result.estimatedHeightInches) {
      const existing = await prisma.measurement.findFirst({ where: { openingId } });
      if (!existing) {
        await prisma.measurement.create({
          data: {
            openingId,
            status: 'ESTIMATED',
            isAiEstimated: true,
            confidenceScore: result.confidenceScore,
            finalWidth: result.estimatedWidthInches,
            finalHeight: result.estimatedHeightInches,
            captureMethod: 'guided',
            aiEstimatedWidth: result.estimatedWidthInches,
            aiEstimatedHeight: result.estimatedHeightInches,
            aiEstimateConfidence: result.confidenceScore,
            aiEstimateNotes: result.windowType ? `AI detected: ${result.windowType}` : undefined,
          },
        });
        logger.info(`[ai-photo] Created AI measurement estimate for opening ${openingId}: ${result.estimatedWidthInches}" x ${result.estimatedHeightInches}"`);
      }
    }

    logger.info(`[ai-photo] Analysis complete for document ${documentId}`);
  } catch (error: any) {
    logger.error(`[ai-photo] Analysis failed for ${documentId}:`, error.message);
    await prisma.document.update({
      where: { id: documentId },
      data: { aiStatus: 'FAILED', aiError: error.message } as any,
    });
  }
}

async function runPdfJob(job: any) {
  const { proposalId } = job.data;
  logger.info(`[pdf] Generating PDF for proposal: ${proposalId}`);

  const { prisma } = await import('../shared/services/prisma');
  const { pdfGeneratorService } = await import('../modules/proposals/pdf-generator.service');

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lead: { include: { contacts: { where: { isPrimary: true } } } },
        quote: true,
        property: true,
        createdBy: true,
      },
    });

    if (!proposal) {
      logger.warn(`[pdf] Proposal ${proposalId} not found`);
      return;
    }

    const pdfPath = await pdfGeneratorService.generate(proposal as any);

    await prisma.proposal.update({
      where: { id: proposalId },
      data: { pdfPath, pdfStatus: 'READY', pdfGeneratedAt: new Date() } as any,
    });

    logger.info(`[pdf] PDF generated for proposal ${proposalId}: ${pdfPath}`);
  } catch (error: any) {
    logger.error(`[pdf] PDF generation failed for ${proposalId}:`, error.message);
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { pdfStatus: 'FAILED' } as any,
    });
  }
}

async function runEmailJob(job: any) {
  const { to, subject, html, text, leadId, type } = job.data;
  logger.info(`[email] Sending "${type || 'notification'}" to: ${to}`);

  // Email provider dispatch
  if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY) {
    logger.warn(`[email] No email provider configured — would send to ${to}: ${subject}`);
    return;
  }

  // Actual send handled by notifications service via nodemailer/SendGrid
  const { notificationsService } = await import('../modules/notifications/notifications.service');
  await notificationsService.sendEmail({ to, subject, html, text });

  // If tied to a lead, log activity
  if (leadId) {
    const { prisma } = await import('../shared/services/prisma');
    await prisma.activity.create({
      data: {
        leadId,
        type: 'EMAIL',
        title: subject,
        description: text?.substring(0, 500),
        contactMethod: 'EMAIL',
        userId: job.data.sentById || null,
      } as any,
    });
  }
}

async function runAutomationJob(job: any) {
  const { automationId, leadId, step } = job.data;
  logger.info(`[automation] Running step ${step} for automation ${automationId}, lead ${leadId}`);

  const { campaignsService } = await import('../modules/campaigns/campaigns.service');
  await campaignsService.executeStep({ automationId, leadId, step });
}

// ── Main initializer ─────────────────────────────────────────

let queuesInitialized = false;

export async function initializeJobQueues(): Promise<void> {
  if (queuesInitialized) return;

  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — background jobs running in mock mode');
    return;
  }

  try {
    const { Queue, Worker } = await import('bullmq');
    const IORedis = (await import('ioredis')).default;

    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    // Initialize queues
    _leadScoringQueue = new Queue('lead-scoring', { connection });
    _aiQueue = new Queue('ai-photo', { connection });
    _pdfQueue = new Queue('pdf-generation', { connection });
    _emailQueue = new Queue('email', { connection });
    _automationQueue = new Queue('automations', { connection });
    _syncQueue = new Queue('sync', { connection });

    // Initialize workers
    const workers = [
      new Worker('lead-scoring', runLeadScoringJob, { connection, concurrency: 5 }),
      new Worker('ai-photo', runAiPhotoJob, { connection, concurrency: 3 }),
      new Worker('pdf-generation', runPdfJob, { connection, concurrency: 2 }),
      new Worker('email', runEmailJob, { connection, concurrency: 10 }),
      new Worker('automations', runAutomationJob, { connection, concurrency: 5 }),
      new Worker('sync', async (job: any) => {
        logger.info(`[sync] Processing sync event: ${job.data.syncEventId}`);
      }, { connection, concurrency: 20 }),
    ];

    workers.forEach((worker) => {
      worker.on('completed', (job) => logger.info(`[${worker.name}] Job ${job.id} completed`));
      worker.on('failed', (job, err) => logger.error(`[${worker.name}] Job ${job?.id} failed:`, err.message));
    });

    queuesInitialized = true;
    logger.info('All job queues and workers initialized (lead-scoring, ai-photo, pdf, email, automations, sync)');
  } catch (error: any) {
    logger.error('Failed to initialize job queues:', error.message);
  }
}
