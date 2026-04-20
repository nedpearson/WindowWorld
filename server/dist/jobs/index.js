"use strict";
/**
 * Queue singletons â€” exported so services can enqueue jobs without
 * importing the full BullMQ runtime during test/build.
 * Queues are only connected when Redis is available.
 */
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
exports.leadScoringQueue = exports.syncQueue = exports.automationQueue = exports.aiQueue = exports.emailQueue = exports.pdfQueue = void 0;
exports.initializeJobQueues = initializeJobQueues;
const logger_1 = require("../shared/utils/logger");
// â”€â”€ Lazy queue singletons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _pdfQueue = null;
let _emailQueue = null;
let _aiQueue = null;
let _automationQueue = null;
let _syncQueue = null;
let _leadScoringQueue = null;
// Mock queue used when Redis is unavailable
const mockQueue = {
    add: async (name, data) => {
        logger_1.logger.warn(`[MockQueue] Would enqueue "${name}" â€” Redis unavailable`, { data });
        return { id: `mock-${Date.now()}` };
    },
};
exports.pdfQueue = new Proxy({}, {
    get: (_, prop) => (_pdfQueue || mockQueue)[prop]?.bind(_pdfQueue || mockQueue),
});
exports.emailQueue = new Proxy({}, {
    get: (_, prop) => (_emailQueue || mockQueue)[prop]?.bind(_emailQueue || mockQueue),
});
exports.aiQueue = new Proxy({}, {
    get: (_, prop) => (_aiQueue || mockQueue)[prop]?.bind(_aiQueue || mockQueue),
});
exports.automationQueue = new Proxy({}, {
    get: (_, prop) => (_automationQueue || mockQueue)[prop]?.bind(_automationQueue || mockQueue),
});
exports.syncQueue = new Proxy({}, {
    get: (_, prop) => (_syncQueue || mockQueue)[prop]?.bind(_syncQueue || mockQueue),
});
exports.leadScoringQueue = new Proxy({}, {
    get: (_, prop) => (_leadScoringQueue || mockQueue)[prop]?.bind(_leadScoringQueue || mockQueue),
});
// â”€â”€ Worker implementations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runLeadScoringJob(job) {
    const { leadId } = job.data;
    logger_1.logger.info(`[lead-scoring] Processing lead: ${leadId}`);
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../shared/services/prisma')));
    const { aiService } = await Promise.resolve().then(() => __importStar(require('../modules/ai-analysis/ai.service')));
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { properties: true, contacts: true },
    });
    if (!lead) {
        logger_1.logger.warn(`[lead-scoring] Lead ${leadId} not found`);
        return;
    }
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
    logger_1.logger.info(`[lead-scoring] Score updated for ${leadId}: ${scoreData.totalScore}`);
}
async function runAiPhotoJob(job) {
    const { documentId, openingId, leadId, imagePath } = job.data;
    logger_1.logger.info(`[ai-photo] Analyzing document: ${documentId}`);
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../shared/services/prisma')));
    const { aiService } = await Promise.resolve().then(() => __importStar(require('../modules/ai-analysis/ai.service')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    try {
        // Load image file and convert to base64
        const fullPath = path.resolve(imagePath);
        if (!fs.existsSync(fullPath)) {
            logger_1.logger.warn(`[ai-photo] Image not found: ${fullPath}`);
            await prisma.document.update({
                where: { id: documentId },
                data: { aiStatus: 'FAILED', aiError: 'Image file not found' },
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
            },
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
                logger_1.logger.info(`[ai-photo] Created AI measurement estimate for opening ${openingId}: ${result.estimatedWidthInches}" x ${result.estimatedHeightInches}"`);
            }
        }
        logger_1.logger.info(`[ai-photo] Analysis complete for document ${documentId}`);
    }
    catch (error) {
        logger_1.logger.error(`[ai-photo] Analysis failed for ${documentId}:`, error.message);
        await prisma.document.update({
            where: { id: documentId },
            data: { aiStatus: 'FAILED', aiError: error.message },
        });
    }
}
async function runPdfJob(job) {
    const { proposalId } = job.data;
    logger_1.logger.info(`[pdf] Generating PDF for proposal: ${proposalId}`);
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../shared/services/prisma')));
    const { pdfGeneratorService } = await Promise.resolve().then(() => __importStar(require('../modules/proposals/pdf-generator.service')));
    try {
        const proposal = await prisma.proposal.findUnique({
            where: { id: proposalId },
            include: {
                lead: { include: { contacts: { where: { isPrimary: true } } } },
                quote: true,
                createdBy: true,
            },
        });
        if (!proposal) {
            logger_1.logger.warn(`[pdf] Proposal ${proposalId} not found`);
            return;
        }
        const { storageService } = await Promise.resolve().then(() => __importStar(require('../shared/services/storage.service')));
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const pdfPath = await pdfGeneratorService.generate(proposal);
        // Read local generated file and upload to Cloud Storage
        const buffer = await fs.readFile(pdfPath);
        const { url } = await storageService.upload(buffer, path.basename(pdfPath), 'application/pdf');
        await prisma.proposal.update({
            where: { id: proposalId },
            data: { pdfPath: url, pdfStatus: 'READY', pdfGeneratedAt: new Date() },
        });
        logger_1.logger.info(`[pdf] PDF generated and uploaded for proposal ${proposalId} -> ${url}`);
    }
    catch (error) {
        logger_1.logger.error(`[pdf] PDF generation failed for ${proposalId}:`, error.message);
        await prisma.proposal.update({
            where: { id: proposalId },
            data: { pdfStatus: 'FAILED' },
        });
    }
}
async function runEmailJob(job) {
    const { to, subject, html, text, leadId, type, sentById } = job.data;
    logger_1.logger.info(`[email] Sending "${type || 'notification'}" to: ${to}`);
    const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../shared/services/email.service')));
    const result = await sendEmail({ to, subject, html, text });
    if (!result.success) {
        logger_1.logger.error(`[email] Failed to send to ${to}: ${result.error}`);
        // Don't throw — let the job complete so it doesn't infinitely retry
    }
    else {
        logger_1.logger.info(`[email] Delivered via ${result.provider}: id=${result.id}`);
    }
    // Log activity on the lead timeline regardless of email success
    if (leadId) {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../shared/services/prisma')));
        await prisma.activity.create({
            data: {
                leadId,
                type: 'EMAIL',
                title: subject,
                description: text?.substring(0, 500),
                contactMethod: 'EMAIL',
                userId: sentById || null,
            },
        });
    }
}
async function runAutomationJob(job) {
    const { automationId, leadId, step } = job.data;
    logger_1.logger.info(`[automation] Running step ${step} for automation ${automationId}, lead ${leadId}`);
    const { campaignsService } = await Promise.resolve().then(() => __importStar(require('../modules/campaigns/campaigns.service')));
    await campaignsService.executeStep({ automationId, leadId, step });
}
// â”€â”€ Main initializer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let queuesInitialized = false;
async function initializeJobQueues() {
    if (queuesInitialized)
        return;
    if (!process.env.REDIS_URL) {
        logger_1.logger.warn('REDIS_URL not set â€” background jobs running in mock mode');
        return;
    }
    try {
        const { Queue, Worker } = await Promise.resolve().then(() => __importStar(require('bullmq')));
        const IORedis = (await Promise.resolve().then(() => __importStar(require('ioredis')))).default;
        const connection = new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null, // required by BullMQ
            enableOfflineQueue: false, // fail fast when Redis is down
            retryStrategy: (times) => {
                if (times > 10) {
                    logger_1.logger.error('[Redis] Max reconnection attempts reached - background jobs disabled');
                    return null; // stop retrying
                }
                const delay = Math.min(times * 2000, 30000);
                logger_1.logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times}/10)...`);
                return delay;
            },
        });
        // Route Redis errors through our logger instead of raw stderr spam
        connection.on('error', (err) => {
            logger_1.logger.warn(`[Redis] ${err.message.split('\n')[0]}`);
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
            new Worker('sync', async (job) => {
                logger_1.logger.info(`[sync] Processing sync event: ${job.data.syncEventId}`);
            }, { connection, concurrency: 20 }),
        ];
        workers.forEach((worker) => {
            worker.on('completed', (job) => logger_1.logger.info(`[${worker.name}] Job ${job.id} completed`));
            worker.on('failed', (job, err) => logger_1.logger.error(`[${worker.name}] Job ${job?.id} failed:`, err.message));
        });
        queuesInitialized = true;
        logger_1.logger.info('All job queues and workers initialized (lead-scoring, ai-photo, pdf, email, automations, sync)');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize job queues:', error.message);
    }
}
//# sourceMappingURL=index.js.map