import { logger } from '../shared/utils/logger';

// Background job queues using BullMQ
// Queue initialization is conditional on REDIS_URL being set

let queuesInitialized = false;

export async function initializeJobQueues(): Promise<void> {
  if (queuesInitialized) return;

  try {
    const { Queue, Worker } = await import('bullmq');
    const IORedis = (await import('ioredis')).default;

    const connection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    });

    // ─── Lead Scoring Queue ──────────────────────────────
    const leadScoringQueue = new Queue('lead-scoring', { connection });

    const leadScoringWorker = new Worker(
      'lead-scoring',
      async (job) => {
        const { leadId, organizationId } = job.data;
        logger.info(`Processing lead score job for lead: ${leadId}`);

        const { prisma } = await import('../shared/services/prisma');
        const { aiService } = await import('../modules/ai-analysis/ai.service');

        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: { properties: true, contacts: true },
        });

        if (!lead) return;

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

        // Update lead with score summary
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            leadScore: Math.round(scoreData.totalScore),
            urgencyScore: Math.round(scoreData.urgencyScore),
            closeProbability: scoreData.closeProbability,
            financingPropensity: scoreData.financingPropensity,
            estimatedRevenue: scoreData.estimatedRevenueBand === 'premium' ? 15000 :
                              scoreData.estimatedRevenueBand === 'high' ? 8000 :
                              scoreData.estimatedRevenueBand === 'medium' ? 4000 : 1500,
          },
        });

        logger.info(`Lead score updated for: ${leadId} — score: ${scoreData.totalScore}`);
      },
      { connection, concurrency: 5 }
    );

    // ─── PDF Generation Queue ────────────────────────────
    const pdfQueue = new Queue('pdf-generation', { connection });

    const pdfWorker = new Worker(
      'pdf-generation',
      async (job) => {
        const { proposalId, invoiceId } = job.data;
        logger.info(`Generating PDF for ${proposalId ? 'proposal' : 'invoice'}: ${proposalId || invoiceId}`);
        // PDF generation handled by proposals/invoices module
      },
      { connection, concurrency: 2 }
    );

    // ─── Email Queue ─────────────────────────────────────
    const emailQueue = new Queue('email', { connection });

    const emailWorker = new Worker(
      'email',
      async (job) => {
        const { to, subject, html, text } = job.data;
        logger.info(`Sending email to: ${to}`);
        // Email handled by notifications module
      },
      { connection, concurrency: 10 }
    );

    // ─── Automation Queue ────────────────────────────────
    const automationQueue = new Queue('automations', { connection });

    const automationWorker = new Worker(
      'automations',
      async (job) => {
        const { automationId, leadId } = job.data;
        logger.info(`Running automation: ${automationId} for lead: ${leadId}`);
      },
      { connection, concurrency: 5 }
    );

    // ─── Sync Queue (mobile offline sync) ────────────────
    const syncQueue = new Queue('sync', { connection });

    const syncWorker = new Worker(
      'sync',
      async (job) => {
        const { syncEventId } = job.data;
        logger.info(`Processing sync event: ${syncEventId}`);
      },
      { connection, concurrency: 20 }
    );

    // Error handlers
    [leadScoringWorker, pdfWorker, emailWorker, automationWorker, syncWorker].forEach((worker) => {
      worker.on('failed', (job, err) => {
        logger.error(`Job failed in queue ${worker.name}:`, { jobId: job?.id, error: err.message });
      });
    });

    queuesInitialized = true;
    logger.info('All background job queues initialized');
  } catch (error: any) {
    logger.error('Failed to initialize job queues:', error.message);
    // Don't crash server if Redis is unavailable
  }
}
