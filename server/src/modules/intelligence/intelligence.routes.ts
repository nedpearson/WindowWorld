import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { prisma } from '../../shared/services/prisma';
import { intelligenceOrchestrator } from './intelligence-orchestrator.service';
import { battlecardService } from './battlecard.service';
import { marketCrawler } from './market-crawler.service';
import { intentTracker } from './intent-tracker.service';
import { logger } from '../../shared/utils/logger';

export const intelligenceRouter = Router();

// ─── Public intent tracking (no auth — called from frontend) ──────────────
// COMPLIANCE: Only tracks behavior on OUR OWN website
intelligenceRouter.post('/intent/signal', async (req, res) => {
  try {
    const { signalType, sessionId, leadId, pageUrl, sourceChannel, utmSource, utmMedium, utmCampaign, metadata } = req.body;
    if (!signalType) return res.status(400).json({ error: 'signalType required' });
    await intentTracker.trackIntentSignal({ signalType, sessionId, leadId, pageUrl, sourceChannel, utmSource, utmMedium, utmCampaign, metadata });
    res.json({ ok: true });
  } catch (e: any) {
    logger.error('[Intent] Signal tracking failed:', e);
    res.status(500).json({ error: 'Failed to track signal' });
  }
});

// All remaining routes require authentication
intelligenceRouter.use(...auth.repOrAbove);

// ─── Market Summary Dashboard ─────────────────────────────────────────────
intelligenceRouter.get('/dashboard/market-summary', async (_req, res) => {
  try {
    const summary = await intelligenceOrchestrator.getMarketSummary();
    res.json(summary);
  } catch (e: any) {
    logger.error('[Intelligence] Summary failed:', e);
    res.status(500).json({ error: 'Failed to load market summary' });
  }
});

// ─── Run Full Research ────────────────────────────────────────────────────
intelligenceRouter.post('/research/run', ...auth.manager, async (req, res) => {
  try {
    const { location, skipSocial } = req.body;
    logger.info('[Intelligence] Research run triggered by user');
    // Kick off async (respond immediately, run in background)
    res.json({ ok: true, message: 'Research run started. This will take several minutes.' });
    intelligenceOrchestrator.runFullIntelligenceResearch({ location, skipSocial }).catch(e =>
      logger.error('[Intelligence] Research run failed:', e)
    );
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to start research run' });
  }
});

// ─── Seed Competitors ─────────────────────────────────────────────────────
intelligenceRouter.post('/competitors/seed', ...auth.manager, async (_req, res) => {
  try {
    const count = await intelligenceOrchestrator.seedCompetitors();
    res.json({ seeded: count });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to seed competitors' });
  }
});

// ─── List Competitors ─────────────────────────────────────────────────────
intelligenceRouter.get('/competitors', async (_req, res) => {
  try {
    const competitors = await prisma.competitor.findMany({
      where: { isActive: true },
      include: {
        battlecard: true,
        _count: { select: { pages: true, reviewInsights: true, socialPosts: true } },
      },
      orderBy: { territory: 'asc' },
    });
    res.json(competitors);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load competitors' });
  }
});

// ─── Scrape Competitor ────────────────────────────────────────────────────
intelligenceRouter.post('/competitors/:id/scrape', ...auth.manager, async (req, res) => {
  try {
    const count = await marketCrawler.scrapeCompetitorPages(req.params.id);
    res.json({ pagesScraped: count });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to scrape competitor' });
  }
});

// ─── Get / Refresh Battlecard ─────────────────────────────────────────────
intelligenceRouter.get('/battlecards', async (_req, res) => {
  try {
    const battlecards = await prisma.battlecard.findMany({
      include: { competitor: true },
      orderBy: { lastUpdated: 'desc' },
    });
    res.json(battlecards);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load battlecards' });
  }
});

intelligenceRouter.get('/battlecards/:competitorSlug', async (req, res) => {
  try {
    const competitor = await prisma.competitor.findUnique({
      where: { slug: req.params.competitorSlug },
      include: { battlecard: true, reviewInsights: { take: 10 }, socialPosts: { take: 10 } },
    });
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
    res.json(competitor);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load battlecard' });
  }
});

intelligenceRouter.post('/battlecards/:competitorSlug/refresh', ...auth.manager, async (req, res) => {
  try {
    const competitor = await prisma.competitor.findUnique({ where: { slug: req.params.competitorSlug } });
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
    const ok = await battlecardService.generateBattlecard(competitor.id);
    res.json({ ok, message: ok ? 'Battlecard refreshed' : 'Failed to refresh' });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to refresh battlecard' });
  }
});

// ─── Topic Clusters ───────────────────────────────────────────────────────
intelligenceRouter.get('/clusters', async (req, res) => {
  try {
    const { product, themeType } = req.query as any;
    const clusters = await prisma.topicCluster.findMany({
      where: {
        ...(product ? { productScope: product } : {}),
        ...(themeType ? { themeType } : {}),
      },
      orderBy: { frequency: 'desc' },
      take: 50,
    });
    res.json(clusters);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load clusters' });
  }
});

// ─── Messaging Opportunities ──────────────────────────────────────────────
intelligenceRouter.get('/opportunities', async (req, res) => {
  try {
    const { channel, product, priority } = req.query as any;
    const opportunities = await prisma.messagingOpportunity.findMany({
      where: {
        isActedOn: false,
        ...(channel ? { channel } : {}),
        ...(product ? { productScope: product } : {}),
        ...(priority ? { priority } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
    res.json(opportunities);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load opportunities' });
  }
});

intelligenceRouter.patch('/opportunities/:id/act', ...auth.manager, async (req, res) => {
  try {
    await prisma.messagingOpportunity.update({
      where: { id: req.params.id },
      data: { isActedOn: true },
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// ─── Social Creative Patterns ─────────────────────────────────────────────
intelligenceRouter.get('/social/patterns', async (req, res) => {
  try {
    const { platform, product, level } = req.query as any;
    const patterns = await prisma.socialCreativePattern.findMany({
      where: {
        ...(platform ? { platform } : {}),
        ...(product ? { productFocus: product } : {}),
        ...(level ? { recommendationLevel: level } : {}),
      },
      orderBy: { recommendationLevel: 'desc' },
    });
    res.json(patterns);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load social patterns' });
  }
});

// ─── Objection Library ────────────────────────────────────────────────────
intelligenceRouter.get('/objections', async (req, res) => {
  try {
    const { category, product } = req.query as any;
    const objections = await prisma.objectionPattern.findMany({
      where: {
        ...(category ? { objectionCategory: category } : {}),
        ...(product ? { productFocus: { in: [product, 'general'] } } : {}),
      },
      orderBy: { frequency: 'desc' },
    });
    res.json(objections);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load objections' });
  }
});

// ─── Campaign Angles ──────────────────────────────────────────────────────
intelligenceRouter.get('/campaigns', async (req, res) => {
  try {
    const { segment, product, channel } = req.query as any;
    const campaigns = await prisma.campaignAngle.findMany({
      where: {
        ...(segment ? { segmentTarget: segment } : {}),
        ...(product ? { productFocus: { in: [product, 'all'] } } : {}),
        ...(channel ? { channel } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(campaigns);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load campaign angles' });
  }
});

// ─── Intent: Known Lead Profile ───────────────────────────────────────────
intelligenceRouter.get('/intent/leads/:leadId', async (req, res) => {
  try {
    const intentScore = await intentTracker.scoreKnownLeadIntent(req.params.leadId);
    const recommendations = await intentTracker.generateLeadRecommendations(req.params.leadId);
    res.json({ intentScore, recommendations });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to score lead intent' });
  }
});

// ─── Intent: Anonymous Segments Dashboard ────────────────────────────────
intelligenceRouter.get('/intent/anonymous/segments', async (_req, res) => {
  try {
    const segments = await prisma.anonymousIntentProfile.groupBy({
      by: ['behaviorSegment', 'urgencyLevel'],
      _count: true,
      orderBy: { _count: { behaviorSegment: 'desc' } },
    });
    const recent = await prisma.anonymousIntentProfile.findMany({
      orderBy: { lastSeen: 'desc' },
      take: 20,
    });
    res.json({ segments, recent });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load anonymous segments' });
  }
});

// ─── Reviews Intelligence ─────────────────────────────────────────────────
intelligenceRouter.get('/reviews', async (req, res) => {
  try {
    const { competitorId, sentiment, product } = req.query as any;
    const reviews = await prisma.reviewInsight.findMany({
      where: {
        ...(competitorId ? { competitorId } : {}),
        ...(sentiment ? { sentiment } : {}),
        ...(product ? { productMentioned: product } : {}),
      },
      include: { competitor: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(reviews);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// ─── Forum Insights ───────────────────────────────────────────────────────
intelligenceRouter.get('/forums', async (req, res) => {
  try {
    const { product, intent } = req.query as any;
    const forums = await prisma.forumThreadInsight.findMany({
      where: {
        ...(product ? { productFocus: product } : {}),
        ...(intent ? { intentSignals: { has: intent } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(forums);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to load forum insights' });
  }
});
