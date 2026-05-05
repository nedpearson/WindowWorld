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
  staticOnly?: boolean;
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
  logger.info(`[Intelligence] Starting${options.staticOnly ? ' static seed' : ' full research'} run for: ${location}`);

  // Always seed competitors (fast, upsert-safe)
  await seedCompetitors();

  // In static-only mode, skip crawling and just seed pre-built content
  if (options.staticOnly) {
    await seedSocialCreativePatterns();
    await seedCampaignAngles();
    return {
      competitorsScraped: 0, reviewsCollected: 0, forumsAnalyzed: 0,
      socialInsights: 0, battlecardsGenerated: 0, clustersBuilt: 0, opportunitiesFound: 0,
    };
  }

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
  for (const comp of competitors) { // All competitors — no cap
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

// ─── Seed Deep-Research Findings ──────────────────────────────────────────
// Populated from cross-validated market intelligence research (May 2026)
async function seedResearchFindings(): Promise<void> {
  // ── Objection Patterns (from Reddit, BBB, ConsumerAffairs, forums) ──
  const objections = [
    {
      objectionText: 'That price is too high / too expensive',
      objectionCategory: 'price', productFocus: 'general', frequency: 95,
      responseScript: 'I understand — it\'s a significant investment. Let me ask: is it the total cost, or the monthly commitment? Because at $89/month with 0% interest, most homeowners tell me it costs less than their phone bill.',
      closeScript: 'What if I could show you how this pays for itself in energy savings and home value? Let me run the numbers for your specific home.',
    },
    {
      objectionText: 'I need to get other quotes first',
      objectionCategory: 'comparison', productFocus: 'general', frequency: 88,
      responseScript: 'Absolutely — I\'d do the same. Here\'s a comparison checklist: check warranty terms, whether they use their own crews or subs, and whether the quote is itemized. When you have your quotes, call me and I\'ll walk through them with you.',
      closeScript: 'If our quality and warranty provide the best value, is there anything else holding you back?',
    },
    {
      objectionText: 'I need to think about it / talk to my spouse',
      objectionCategory: 'delay', productFocus: 'general', frequency: 82,
      responseScript: 'Take all the time you need. Just so I can help: is there a specific part you\'re uncertain about — the product, the price, or the company? I want to make sure you have everything you need.',
      closeScript: 'Would it help if I put together a summary you can review with your spouse tonight? I\'ll include the financing options and warranty details.',
    },
    {
      objectionText: 'Another company quoted me less',
      objectionCategory: 'price', productFocus: 'windows', frequency: 70,
      responseScript: 'That\'s worth looking into. Can I ask — does their quote include the same warranty? Are they using their own crew? Is it itemized so you can see what you\'re paying for? Those three things are where cheaper quotes usually cut corners.',
      closeScript: 'If I can show you spec-for-spec why our value is actually better, would you be comfortable moving forward?',
    },
    {
      objectionText: 'How do I know the energy savings claims are real?',
      objectionCategory: 'trust', productFocus: 'windows', frequency: 55,
      responseScript: 'Honest answer: DOE data shows 10-15% reduction in heating/cooling costs — not the 30% some competitors claim. But the comfort difference is immediate and dramatic. Plus the federal tax credit puts up to $600/year back in your pocket.',
      closeScript: 'I\'d rather be honest with you and earn your trust than overpromise. That\'s how we\'ve earned 500+ five-star reviews.',
    },
    {
      objectionText: 'I\'m worried you\'ll disappear after the install',
      objectionCategory: 'trust', productFocus: 'general', frequency: 65,
      responseScript: 'That\'s the #1 complaint about our industry and I don\'t blame you. Here\'s what makes us different: my personal cell number, the names of three homeowners in your zip code you can call, and our lifetime warranty document. We don\'t disappear.',
      closeScript: 'Would talking to a recent customer in your area help put your mind at ease?',
    },
    {
      objectionText: 'I can\'t afford the monthly payment',
      objectionCategory: 'financing', productFocus: 'general', frequency: 60,
      responseScript: 'I hear you. We have multiple financing options. If we stretch the term to 84 months, we can get the payment down significantly. There\'s no prepayment penalty, so if your situation changes, you can pay it off early anytime.',
      closeScript: 'What monthly amount would make this work for your budget? Let me see what I can structure.',
    },
    {
      objectionText: 'Will my insurance cover storm damage replacement?',
      objectionCategory: 'insurance', productFocus: 'windows', frequency: 50,
      responseScript: 'In most cases, yes. We handle the entire insurance process — the inspection, documentation, adjuster coordination, and paperwork. If your damage is covered, there\'s typically no out-of-pocket cost to you.',
      closeScript: 'Let me do a free storm inspection this week. If there\'s coverage, we handle everything. If not, you\'ve lost nothing.',
    },
    {
      objectionText: 'I heard Renewal by Andersen is better quality',
      objectionCategory: 'competitor', productFocus: 'windows', frequency: 45,
      responseScript: 'Renewal makes a good product — but their warranty is only 20 years, ours is lifetime. And their pricing is typically 40-60% higher for equivalent specs. Ask them to itemize their quote and compare spec-for-spec with ours.',
      closeScript: 'Would you like me to do a side-by-side comparison of our specs and warranty against their quote?',
    },
    {
      objectionText: 'I\'m concerned about using subcontractors',
      objectionCategory: 'trust', productFocus: 'general', frequency: 58,
      responseScript: 'You should be — subcontractors are the #1 source of installation problems in our industry. We use our own trained, local installation crews. Same team every time. They\'re not contractors — they\'re our employees.',
      closeScript: 'When you compare quotes, ask every company: do you use subs or your own crew? That one question will tell you a lot.',
    },
    {
      objectionText: 'Siding looks wavy/buckled after installation',
      objectionCategory: 'quality', productFocus: 'siding', frequency: 40,
      responseScript: 'That happens when installers nail too tight and don\'t account for expansion/contraction. Our crews are trained to leave proper gaps and center nails in slots. It\'s basic technique, but you\'d be surprised how many companies skip it.',
      closeScript: 'I\'ll show you exactly how we handle expansion joints during installation. It\'s one of the reasons our siding installs look perfect years later.',
    },
    {
      objectionText: 'The entry door project costs more than I expected',
      objectionCategory: 'price', productFocus: 'doors', frequency: 42,
      responseScript: 'A door isn\'t just the slab — it\'s the frame, weatherstripping, hardware, trim, and threshold. It\'s a complete entry system. The good news: entry doors have the highest ROI of any exterior project. You\'ll recoup 60-80% at resale and feel the difference every day.',
      closeScript: 'Let me show you the financing breakdown. Most homeowners are surprised how affordable the monthly payment is for a project that transforms the entire look of their home.',
    },
  ];

  for (const obj of objections) {
    const exists = await prisma.objectionPattern.findFirst({
      where: { objectionText: obj.objectionText },
    });
    if (!exists) await prisma.objectionPattern.create({ data: obj });
  }

  // ── Topic Clusters (from buyer behavior research) ──
  const clusters = [
    { clusterName: 'Price / Affordability Concerns', themeType: 'objection', productScope: 'general', frequency: 95, sentimentScore: -0.6, actionableNote: 'Lead with financing, never total price first' },
    { clusterName: 'Installation Quality vs Brand', themeType: 'buyer_priority', productScope: 'windows', frequency: 88, sentimentScore: 0.3, actionableNote: 'Emphasize own crews, not subcontractors' },
    { clusterName: 'High-Pressure Sales Backlash', themeType: 'competitor_weakness', productScope: 'general', frequency: 85, sentimentScore: -0.8, actionableNote: 'Position as no-pressure, take-your-time approach' },
    { clusterName: 'Post-Sale Service Failures', themeType: 'competitor_weakness', productScope: 'general', frequency: 80, sentimentScore: -0.9, actionableNote: 'Guarantee response times, give personal cell' },
    { clusterName: 'Energy Savings ROI Questions', themeType: 'buyer_concern', productScope: 'windows', frequency: 70, sentimentScore: -0.2, actionableNote: 'Be honest: 10-15%, not 30%. Supplement with comfort benefits' },
    { clusterName: 'Storm Damage Urgency', themeType: 'intent_signal', productScope: 'windows', frequency: 65, sentimentScore: -0.5, actionableNote: 'Deploy pre-built storm content immediately post-event' },
    { clusterName: 'Financing Monthly Payment Preference', themeType: 'buyer_behavior', productScope: 'general', frequency: 75, sentimentScore: 0.5, actionableNote: 'Always frame as monthly payment, never lump sum' },
    { clusterName: 'Before/After Visual Proof Demand', themeType: 'content_strategy', productScope: 'general', frequency: 90, sentimentScore: 0.8, actionableNote: 'Photograph every completed job for content library' },
    { clusterName: 'Warranty Coverage Comparison', themeType: 'buyer_priority', productScope: 'windows', frequency: 60, sentimentScore: 0.1, actionableNote: 'Lifetime warranty is a killer differentiator vs Andersen (20yr)' },
    { clusterName: 'Curb Appeal / Home Value', themeType: 'buyer_motivation', productScope: 'doors', frequency: 55, sentimentScore: 0.7, actionableNote: 'Entry doors have highest ROI — use this data in presentations' },
    { clusterName: 'Local Company Preference', themeType: 'buyer_behavior', productScope: 'general', frequency: 72, sentimentScore: 0.6, actionableNote: 'Emphasize local ownership, local crews, local references' },
    { clusterName: 'Siding Moisture / Mold Fear', themeType: 'buyer_concern', productScope: 'siding', frequency: 45, sentimentScore: -0.7, actionableNote: 'Show housewrap/flashing process, explain moisture management' },
    { clusterName: 'Speed of Installation', themeType: 'buyer_priority', productScope: 'general', frequency: 50, sentimentScore: 0.2, actionableNote: 'Highlight scheduling availability, fast turnaround' },
    { clusterName: 'Renewal by Andersen Overpricing', themeType: 'competitor_weakness', productScope: 'windows', frequency: 68, sentimentScore: -0.7, actionableNote: 'Reddit consensus: 40-60% overpriced. Use in battlecard.' },
    { clusterName: 'Federal Tax Credit Awareness', themeType: 'buyer_interest', productScope: 'windows', frequency: 40, sentimentScore: 0.4, actionableNote: 'Mention IRA tax credit (up to $600/yr) in every presentation' },
  ];

  for (const cl of clusters) {
    const exists = await prisma.topicCluster.findFirst({
      where: { clusterName: cl.clusterName },
    });
    if (!exists) await prisma.topicCluster.create({ data: cl });
  }

  // ── Messaging Opportunities (from competitive gaps and buyer research) ──
  const opportunities = [
    {
      opportunityType: 'competitive_gap', description: 'Competitors never publish pricing — be the transparent option with online quote estimator',
      productScope: 'general', channel: 'website', priority: 'high',
      recommendedMessage: 'See your estimated price in 60 seconds — no pressure, no obligation.',
    },
    {
      opportunityType: 'content_gap', description: 'Competitors rarely post real customer stories with financing details on social media',
      productScope: 'windows', channel: 'facebook', priority: 'high',
      recommendedMessage: 'The Johnsons replaced all 12 windows for $89/month. Here\'s their before & after.',
    },
    {
      opportunityType: 'service_gap', description: 'Post-sale service is the #1 complaint industry-wide — guarantee 24-hour response time',
      productScope: 'general', channel: 'sales', priority: 'critical',
      recommendedMessage: 'We guarantee a response within 24 hours — or your next service visit is free.',
    },
    {
      opportunityType: 'trust_gap', description: 'No competitor offers customers direct access to installer references by zip code',
      productScope: 'general', channel: 'sales', priority: 'high',
      recommendedMessage: 'Want to talk to a neighbor who chose us? Here are 3 homeowners in your zip code.',
    },
    {
      opportunityType: 'storm_opportunity', description: 'Pre-build storm-response ad templates to deploy within 24 hours of any weather event',
      productScope: 'windows', channel: 'facebook', priority: 'critical',
      recommendedMessage: 'Storm damage? Free inspection. We handle your insurance claim. Call now.',
    },
    {
      opportunityType: 'education_gap', description: 'No competitor honestly addresses energy savings vs DOE data — be the honest voice',
      productScope: 'windows', channel: 'website', priority: 'medium',
      recommendedMessage: 'The truth about energy savings: 10-15% on heating/cooling. Here\'s what else you gain.',
    },
    {
      opportunityType: 'content_gap', description: 'Competitors don\'t use Instagram Reels for before/after — highest-reach format is untapped',
      productScope: 'general', channel: 'instagram', priority: 'high',
      recommendedMessage: 'Watch this home transform in 60 seconds 🏠✨',
    },
    {
      opportunityType: 'competitive_gap', description: 'Entry door ROI data (60-80% recoup) is rarely used in sales presentations',
      productScope: 'doors', channel: 'sales', priority: 'medium',
      recommendedMessage: 'Your entry door has the highest ROI of any exterior project. Here\'s the data.',
    },
    {
      opportunityType: 'financing_gap', description: 'Distinguish "true 0% APR" from competitor "deferred interest" to build trust with savvy buyers',
      productScope: 'general', channel: 'website', priority: 'high',
      recommendedMessage: 'True 0% APR — not deferred interest. No surprises. No fine print tricks.',
    },
    {
      opportunityType: 'speed_gap', description: 'Speed-to-lead under 60 seconds = 391% more conversions — implement auto-response system',
      productScope: 'general', channel: 'sales', priority: 'critical',
      recommendedMessage: 'We respond in under 60 seconds. Your home improvement project starts NOW.',
    },
  ];

  for (const opp of opportunities) {
    const exists = await prisma.messagingOpportunity.findFirst({
      where: { description: opp.description },
    });
    if (!exists) await prisma.messagingOpportunity.create({ data: opp });
  }

  logger.info('[Intelligence] Seeded research findings: objections, clusters, opportunities');
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
  seedResearchFindings,
};
