/**
 * Market Intelligence Orchestrator
 * 
 * Coordinates the full research pipeline across:
 * 1. Public web crawling (competitor sites, public reviews, public forums)
 * 2. Public social analysis (public Facebook pages, public Instagram profiles)
 * 3. AI-powered battlecard generation
 * 4. Topic cluster building
 * 5. Messaging opportunity identification
 * 6. Social creative pattern library
 * 
 * All sources are lawful public data only.
 */

import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';
import { aiService } from '../ai-analysis/ai.service';
import { marketCrawler } from './market-crawler.service';
import { battlecardService } from './battlecard.service';
import { KNOWN_COMPETITORS, SOCIAL_CREATIVE_THEMES } from './intelligence.types';

// ─── Seed Known Competitors ───────────────────────────────────────────────
export async function seedCompetitors(): Promise<number> {
  let seeded = 0;
  for (const comp of KNOWN_COMPETITORS) {
    await prisma.competitor.upsert({
      where: { slug: comp.slug },
      create: comp,
      update: { website: comp.website, territory: comp.territory },
    });
    seeded++;
  }
  return seeded;
}

// ─── Full Research Run ────────────────────────────────────────────────────
export async function runFullIntelligenceResearch(options: {
  location?: string;
  skipSocial?: boolean;
}): Promise<{
  competitorsScraped: number;
  reviewsCollected: number;
  forumsAnalyzed: number;
  socialInsights: number;
  battlecardsGenerated: number;
  clustersBuilt: number;
  opportunitiesFound: number;
}> {
  const location = options.location || 'Baton Rouge, Louisiana';
  logger.info(`[Intelligence] Starting full research run for: ${location}`);

  // 1. Ensure competitors are seeded
  await seedCompetitors();
  const competitors = await prisma.competitor.findMany({ where: { isActive: true } });

  // 2. Scrape competitor pages
  let competitorsScraped = 0;
  for (const comp of competitors) {
    try {
      await marketCrawler.scrapeCompetitorPages(comp.id);
      competitorsScraped++;
      logger.info(`[Intelligence] Scraped pages for: ${comp.name}`);
    } catch (e) {
      logger.warn(`[Intelligence] Failed to scrape ${comp.name}:`, e);
    }
  }

  // 3. Collect public reviews
  let reviewsCollected = 0;
  for (const comp of competitors.slice(0, 5)) { // Top 5 competitors
    try {
      const count = await marketCrawler.collectPublicReviews(comp.id, comp.name);
      reviewsCollected += count;
    } catch (e) {
      logger.warn(`[Intelligence] Failed to collect reviews for ${comp.name}:`, e);
    }
  }

  // 4. Collect forum insights
  let forumsAnalyzed = 0;
  try {
    forumsAnalyzed = await marketCrawler.collectForumInsights(location);
  } catch (e) {
    logger.warn('[Intelligence] Forum collection failed:', e);
  }

  // 5. Collect public social insights
  let socialInsights = 0;
  if (!options.skipSocial) {
    try {
      socialInsights = await marketCrawler.collectPublicSocialInsights(
        competitors.map(c => ({ id: c.id, name: c.name }))
      );
    } catch (e) {
      logger.warn('[Intelligence] Social collection failed:', e);
    }
  }

  // 6. Build topic clusters
  let clustersBuilt = 0;
  try {
    clustersBuilt = await marketCrawler.buildTopicClusters();
  } catch (e) {
    logger.warn('[Intelligence] Cluster building failed:', e);
  }

  // 7. Generate battlecards
  const { success: battlecardsGenerated } = await battlecardService.generateAllBattlecards();

  // 8. Generate objection library
  try {
    await battlecardService.generateObjectionLibrary();
  } catch (e) {
    logger.warn('[Intelligence] Objection library failed:', e);
  }

  // 9. Generate messaging opportunities
  let opportunitiesFound = 0;
  try {
    opportunitiesFound = await battlecardService.generateMessagingOpportunities();
  } catch (e) {
    logger.warn('[Intelligence] Opportunities generation failed:', e);
  }

  // 10. Seed social creative patterns
  await seedSocialCreativePatterns();

  // 11. Seed campaign angles
  await seedCampaignAngles();

  logger.info('[Intelligence] Full research run complete', {
    competitorsScraped, reviewsCollected, forumsAnalyzed,
    socialInsights, battlecardsGenerated, clustersBuilt, opportunitiesFound,
  });

  return {
    competitorsScraped, reviewsCollected, forumsAnalyzed,
    socialInsights, battlecardsGenerated, clustersBuilt, opportunitiesFound,
  };
}

// ─── Seed Social Creative Patterns ───────────────────────────────────────
async function seedSocialCreativePatterns(): Promise<void> {
  const patterns = [
    // Facebook patterns
    {
      platform: 'facebook', creativeTheme: 'before_after', productFocus: 'windows',
      captionStyle: 'emotional', recommendationLevel: 'high',
      hookExample: 'We get it — old windows make your home look tired. Here\'s what happened when the Johnsons said enough is enough 👇',
      visualDescription: 'Split image: foggy/dated windows on left, sparkling new double-pane on right. Family in background.',
      performanceNotes: 'Before/after content consistently drives highest shares and saves on Facebook for home improvement companies',
    },
    {
      platform: 'facebook', creativeTheme: 'financing_hook', productFocus: 'windows',
      captionStyle: 'informational', recommendationLevel: 'high',
      hookExample: 'Stop putting it off because of the price. New windows for $89/month — that\'s less than your streaming subscriptions.',
      visualDescription: 'Bold text card with monthly payment front and center, new windows image behind it.',
      performanceNotes: 'Monthly payment framing significantly increases lead clicks vs. total price framing',
    },
    {
      platform: 'facebook', creativeTheme: 'testimonial', productFocus: 'general',
      captionStyle: 'social_proof', recommendationLevel: 'high',
      hookExample: '"I was skeptical but they were done in ONE DAY. My house looks completely different." — Sarah, Baton Rouge',
      visualDescription: 'Real homeowner photo in front of their home with quote overlay. 5-star graphic.',
      performanceNotes: 'Customer quote + real photo outperforms stock imagery by 3x in home services',
    },
    {
      platform: 'facebook', creativeTheme: 'storm_damage', productFocus: 'windows',
      captionStyle: 'urgency', recommendationLevel: 'high',
      hookExample: '⚡ Storm season is here. Is your home ready? We\'re doing FREE storm damage inspections this week only.',
      visualDescription: 'Storm imagery with home, then clean new windows. Urgency banner overlay.',
      performanceNotes: 'Storm-related content spikes after weather events — have this ready to deploy immediately',
    },
    {
      platform: 'facebook', creativeTheme: 'seasonal_offer', productFocus: 'siding',
      captionStyle: 'urgency', recommendationLevel: 'medium',
      hookExample: 'Summer\'s the best time to replace your siding — and we have 3 install slots left this month.',
      visualDescription: 'Beautiful home with new siding in summer light. Calendar/availability graphic.',
      performanceNotes: 'Seasonal urgency + scarcity framing works well for siding which has longer lead times',
    },
    // Instagram patterns
    {
      platform: 'instagram', creativeTheme: 'before_after', productFocus: 'doors',
      captionStyle: 'emotional', recommendationLevel: 'high',
      hookExample: 'Your front door is the first thing people see. Here\'s a 1-day transformation that changed everything 🏠✨',
      visualDescription: 'Vertical reel showing old door → new door install process → final reveal. Time-lapse style.',
      performanceNotes: 'Reel format dramatically outperforms static posts on Instagram for before/after content',
    },
    {
      platform: 'instagram', creativeTheme: 'curb_appeal', productFocus: 'siding',
      captionStyle: 'emotional', recommendationLevel: 'high',
      hookExample: 'The neighbors are definitely staring. New siding + new doors = completely different home 😍',
      visualDescription: 'Full exterior transformation. Drone shot if possible. Real Louisiana home.',
      performanceNotes: 'Louisiana-specific homes resonate strongly with local audience. Avoid generic stock.',
    },
    {
      platform: 'instagram', creativeTheme: 'product_showcase', productFocus: 'windows',
      captionStyle: 'informational', recommendationLevel: 'medium',
      hookExample: 'Did you know your windows are losing you money every month? Here\'s what energy-efficient windows actually do 💡',
      visualDescription: 'Infographic reel: old window losing heat → new window stats → utility savings breakdown.',
      performanceNotes: 'Educational content builds trust and saves well — use for retargeting audiences',
    },
    {
      platform: 'instagram', creativeTheme: 'testimonial', productFocus: 'general',
      captionStyle: 'social_proof', recommendationLevel: 'high',
      hookExample: '500 five-star reviews and counting. Real people, real results, right here in Louisiana.',
      visualDescription: 'Photo collage of real customer homes. Star ratings overlay. Local landmarks in background.',
      performanceNotes: 'Local credibility markers (Louisiana homes, local references) drive higher engagement than generic testimonials',
    },
    {
      platform: 'instagram', creativeTheme: 'financing_hook', productFocus: 'windows',
      captionStyle: 'question', recommendationLevel: 'medium',
      hookExample: 'What\'s stopping you from getting new windows? (Comment below 👇 we read every one)',
      visualDescription: 'Clean lifestyle image of bright home interior with new windows. Engagement question as caption.',
      performanceNotes: 'Engagement questions dramatically increase comment rates and feed algorithm visibility',
    },
  ];

  for (const pattern of patterns) {
    const exists = await prisma.socialCreativePattern.findFirst({
      where: { platform: pattern.platform, creativeTheme: pattern.creativeTheme, productFocus: pattern.productFocus },
    });
    if (!exists) {
      await prisma.socialCreativePattern.create({ data: pattern });
    }
  }
}

// ─── Seed Campaign Angles ─────────────────────────────────────────────────
async function seedCampaignAngles(): Promise<void> {
  const angles = [
    // FINANCING_FIRST campaigns
    {
      segmentTarget: 'FINANCING_FIRST', productFocus: 'windows', channel: 'facebook', priority: 'high',
      headline: 'New Windows for $89/Month — 0% Interest for 18 Months',
      bodyText: 'Stop putting off the windows you know your home needs. Our 0% financing means you can replace all your windows now and pay at your own pace. No interest. No pressure. Just beautiful, energy-efficient windows starting at $89/month.',
      ctaText: 'Get My Free Estimate + Payment Options',
      landingPagePath: '/financing',
      visualConcept: 'Bold monthly payment number front and center. Before/after in background. Trust badges.',
    },
    {
      segmentTarget: 'FINANCING_FIRST', productFocus: 'windows', channel: 'instagram', priority: 'high',
      headline: '$89/month. 0% interest. New windows. 🏠',
      bodyText: 'New windows don\'t have to break the bank. Swipe to see your monthly payment options → Link in bio for your free estimate.',
      ctaText: 'See Payment Options',
      landingPagePath: '/financing',
      visualConcept: 'Carousel: slide 1 = monthly payment, slide 2 = before/after, slide 3 = testimonial with payment callout',
    },
    // STORM_CLAIMANT campaigns
    {
      segmentTarget: 'STORM_CLAIMANT', productFocus: 'windows', channel: 'facebook', priority: 'critical',
      headline: 'Storm Damaged Your Windows? We Handle the Insurance Claim.',
      bodyText: 'Don\'t let storm damage sit unaddressed. Our team has helped hundreds of Louisiana homeowners get their window, door, and siding replacement covered through insurance — at no out-of-pocket cost to you. Free inspection. We deal with the adjuster. You get new windows.',
      ctaText: 'Schedule Free Storm Inspection',
      landingPagePath: '/storm-damage',
      visualConcept: 'Storm aftermath photo → clean new windows. Urgency banner. Insurance logos.',
    },
    // COMPARISON_SHOPPER campaigns
    {
      segmentTarget: 'COMPARISON_SHOPPER', productFocus: 'all', channel: 'google', priority: 'high',
      headline: 'We\'ll Beat Any Written Quote — Free In-Home Estimate',
      bodyText: 'Shopping around is smart. We\'ll give you an honest comparison, show you exactly what you\'re getting for your money, and beat any written competitor quote. Lifetime warranty. Local crew. No subs.',
      ctaText: 'Get Your Competing Quote',
      landingPagePath: '/free-estimate',
      visualConcept: 'Side-by-side comparison chart. Our offering vs. generic competitor column.',
    },
    // ENERGY_SEEKER campaigns
    {
      segmentTarget: 'ENERGY_SEEKER', productFocus: 'windows', channel: 'facebook', priority: 'medium',
      headline: 'Cut Your Energy Bill by Up to $400/Year — Free Estimate',
      bodyText: 'Louisiana summers are brutal. Old single-pane or failed double-pane windows are literally pumping your AC bill up every month. Energy Star certified replacement windows can cut that bill by up to $400/year — and pay for themselves in under 10 years.',
      ctaText: 'Calculate My Energy Savings',
      landingPagePath: '/energy-savings',
      visualConcept: 'Utility bill → energy star window → lower bill. Before/after energy graphic.',
    },
    // URGENT_REPLACER campaigns
    {
      segmentTarget: 'URGENT_REPLACER', productFocus: 'windows', channel: 'facebook', priority: 'critical',
      headline: 'Emergency Window Replacement — Slots Available This Week',
      bodyText: 'Broken seal? Won\'t close properly? Mold around the frame? You shouldn\'t have to live with that. We have crews available this week and can often schedule within 48 hours. Don\'t wait — call now.',
      ctaText: 'Check This Week\'s Availability',
      landingPagePath: '/schedule',
      visualConcept: 'Urgency-forward. Large phone number. Availability calendar graphic.',
    },
    // AESTHETIC_DRIVEN campaigns
    {
      segmentTarget: 'AESTHETIC_DRIVEN', productFocus: 'doors', channel: 'instagram', priority: 'medium',
      headline: 'Your Front Door Is a Statement. Make It the Right One.',
      bodyText: 'The right entry door can add $5,000-$10,000 to your home\'s perceived value — and takes just one day to install. Swipe to see our most popular door transformations in Louisiana → DM us for your free design consultation.',
      ctaText: 'See Door Transformations',
      landingPagePath: '/doors',
      visualConcept: 'Aspirational before/after door photos. Lifestyle imagery. Design-forward aesthetic.',
    },
  ];

  for (const angle of angles) {
    const exists = await prisma.campaignAngle.findFirst({
      where: { segmentTarget: angle.segmentTarget, productFocus: angle.productFocus, channel: angle.channel },
    });
    if (!exists) {
      await prisma.campaignAngle.create({ data: angle });
    }
  }
}

// ─── Market Summary Report ────────────────────────────────────────────────
export async function getMarketSummary() {
  const [
    competitors, clusters, opportunities, battlecards,
    reviewStats, forumCount, socialPatterns, objections,
  ] = await Promise.all([
    prisma.competitor.count({ where: { isActive: true } }),
    prisma.topicCluster.findMany({ orderBy: { frequency: 'desc' }, take: 10 }),
    prisma.messagingOpportunity.findMany({ where: { isActedOn: false }, orderBy: { priority: 'desc' }, take: 10 }),
    prisma.battlecard.count(),
    prisma.reviewInsight.groupBy({ by: ['sentiment'], _count: true }),
    prisma.forumThreadInsight.count(),
    prisma.socialCreativePattern.findMany({ where: { recommendationLevel: 'high' }, take: 5 }),
    prisma.objectionPattern.findMany({ orderBy: { frequency: 'desc' }, take: 5 }),
  ]);

  const posReviews = reviewStats.find(r => r.sentiment === 'positive')?._count || 0;
  const negReviews = reviewStats.find(r => r.sentiment === 'negative')?._count || 0;

  return {
    summary: {
      competitorsTracked: competitors,
      battlecardsGenerated: battlecards,
      forumThreadsAnalyzed: forumCount,
      reviewsAnalyzed: posReviews + negReviews,
      positiveReviews: posReviews,
      negativeReviews: negReviews,
      openOpportunities: opportunities.length,
    },
    topClusters: clusters.map(c => ({
      theme: c.clusterName,
      product: c.productScope,
      frequency: c.frequency,
      sentiment: c.sentimentScore,
      note: c.actionableNote,
    })),
    topOpportunities: opportunities.map(o => ({
      type: o.opportunityType,
      description: o.description,
      product: o.productScope,
      channel: o.channel,
      priority: o.priority,
    })),
    topSocialPatterns: socialPatterns,
    topObjections: objections,
  };
}

export const intelligenceOrchestrator = {
  seedCompetitors,
  runFullIntelligenceResearch,
  getMarketSummary,
};
