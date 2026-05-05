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

// ─── Seed Static Battlecards (pre-built from research) ────────────────────
async function seedStaticBattlecards(): Promise<void> {
  const cards: Array<{ slug: string; data: any }> = [
    {
      slug: 'relief-windows',
      data: {
        positioning: 'Established local contractor (since 2005) specializing in windows, doors, siding, and shutters for the Gulf South. Emphasis on storm/impact products.',
        keyClaims: ['A+ BBB rated', 'Angie\'s List multi-year award winner', 'Storm/impact resistant windows', 'James Hardie siding installer', 'Licensed and insured (LA #555132)'],
        pricingLanguage: 'Free estimates, no published pricing. Financing options mentioned but not detailed.',
        financingOffers: 'Financing available — no specific terms published. NOT confirmed 0% APR.',
        warrantyNotes: 'LIMITED lifetime warranty — not true lifetime. Transferable but one-time transfer only with restrictions.',
        ctaStrategy: 'Free estimate request via phone and website form.',
        reviewStrengths: ['Professional, efficient installation crews', 'Good clean-up after projects', 'Responsive office staff', 'Storm window specialization'],
        reviewWeaknesses: ['Employee reviews cite high-pressure deadlines and turnover risk', 'Warranty has exclusions and limitations not prominently disclosed', 'One-time transfer limitation on warranty', 'No pricing transparency'],
        messagingGaps: ['No public pricing or cost estimator', 'Warranty limitations not prominently disclosed', 'No published financing terms or APR details', 'Limited social media content strategy'],
        facebookNotes: 'Moderate presence with project photos. No consistent content calendar or engagement strategy.',
        instagramNotes: 'Minimal Instagram presence. No Reels or Stories strategy observed.',
        ourCounterPitch: 'Relief has a limited lifetime warranty with exclusions and one-time transfer restrictions. We offer a true lifetime warranty that fully transfers. Ask them to show you the exclusions in writing and compare to ours.',
        talkTrack: 'Relief Windows is a decent local company. Here\'s what I\'d check: ask for the warranty document and read the exclusions — their "limited lifetime" has restrictions ours doesn\'t. Also ask whether they use their own crews or subcontractors, and compare the glass and frame specs side-by-side with ours. Most homeowners who compare are surprised at the differences.',
        objectionResponses: [
          { objection: 'Relief quoted me less', response: 'That\'s worth looking into. Ask them for the warranty in writing — their "limited lifetime" has exclusions that ours doesn\'t. Also check if they use their own crews or subs. Those two things often explain the price difference.', close: 'Would you like me to do a spec-for-spec comparison so you can see exactly what you\'re getting?' },
          { objection: 'Relief specializes in storm windows', response: 'They do offer impact-resistant options, and so do we. The difference is our storm windows come with a true lifetime warranty and 0% financing. Ask Relief what their financing APR is — they don\'t publish it.', close: 'If I can match or beat their storm specs with better warranty and financing, would that help?' },
          { objection: 'I already got a quote from Relief', response: 'Perfect — that gives us a baseline to compare. Let me show you our specs and warranty side-by-side. Most homeowners find our value is actually better when you factor in the lifetime warranty and true 0% APR.', close: 'Can I see their quote so we can compare apples to apples?' },
        ],
      },
    },
    {
      slug: 'geaux-tommys',
      data: {
        positioning: 'Owner-operated local company in Baton Rouge focusing on vinyl windows, doors, siding, and gutters. Positions on personal service and competitive pricing.',
        keyClaims: ['BBB A+ accredited', 'Transferable lifetime warranty (labor + materials + glass)', 'Owner personally involved in every project', 'Competitive pricing — will match estimates'],
        pricingLanguage: 'Free estimates. Described as "competitive" and "reasonable." Will match lower competitor estimates.',
        financingOffers: 'No published financing options. Price-matching strategy instead.',
        warrantyNotes: 'Claims transferable lifetime warranty covering labor, materials, and glass breakage. Strong claim but verify contract specifics.',
        ctaStrategy: 'Phone call and website contact form. Owner-direct communication.',
        reviewStrengths: ['Owner is personally responsive', 'Punctual installation crews', 'Pleasant customer experience', 'Competitive pricing', 'Will match competitor estimates'],
        reviewWeaknesses: ['Recent 2026 complaints about significant project delays', 'Communication gaps regarding timelines', 'Quality issues requiring follow-up rework', 'Small operation with capacity constraints', 'Limited digital/social presence'],
        messagingGaps: ['No financing options published', 'No before/after project gallery', 'No energy savings or ROI content', 'No storm/insurance content', 'No manufacturer spec transparency'],
        facebookNotes: 'Low-frequency posting. No consistent content strategy. Primarily word-of-mouth driven.',
        instagramNotes: 'Minimal to no Instagram presence. No visual content strategy.',
        ourCounterPitch: 'Tommy\'s is a one-man show — great when it works, but recent reviews show delays and rework. We have dedicated project managers, guaranteed timelines, and the infrastructure to back up our warranty at scale.',
        talkTrack: 'Tommy\'s is a local guy who does good work when things go right. But check the recent reviews — there are reports of delays and communication gaps in 2026. The question is: when you have a problem 5 years from now, do you want to call one person, or a company with a dedicated service department? Also, we offer 0% financing — Tommy\'s doesn\'t offer any financing.',
        objectionResponses: [
          { objection: 'Tommy\'s will match your price', response: 'Price-matching means they\'re competing on price, not value. Ask yourself: why do they need to match? Usually it\'s because they can\'t differentiate on product or service. We don\'t need to match — we differentiate on warranty, financing, and our own crews.', close: 'If our value is genuinely better spec-for-spec, does the price match still matter?' },
          { objection: 'Tommy\'s has a lifetime warranty too', response: 'On paper, maybe. But a warranty is only as good as the company behind it. Tommy\'s is a small operation. If he retires or closes, your warranty goes with him. Our warranty is backed by a national network that will exist long after any individual owner.', close: 'Would you like to see our warranty document side-by-side?' },
          { objection: 'I like that Tommy is personally involved', response: 'That\'s understandable. But personal involvement from one person also means he\'s the bottleneck. Recent reviews mention delays because of that. We assign a dedicated project manager to YOUR project — same personal attention, but with a full team behind them.', close: 'Would it help to meet your project manager before you decide?' },
        ],
      },
    },
    {
      slug: 'clearview-glass',
      data: {
        positioning: 'Glass repair and installation shop in Denham Springs serving residential and commercial customers. Primarily a glass/repair business, not a replacement window specialist.',
        keyClaims: ['A+ BBB rating (not accredited)', 'Emergency window repair', 'Works with steel, aluminum, wood, and vinyl', 'Glass design services'],
        pricingLanguage: 'No published pricing. Contact for estimates.',
        financingOffers: 'No financing options published.',
        warrantyNotes: 'No warranty terms publicly available.',
        ctaStrategy: 'Phone call primary. Basic website contact.',
        reviewStrengths: ['Broad material expertise', 'Emergency repair capability', 'Commercial and residential service', 'Local Denham Springs presence'],
        reviewWeaknesses: ['Not a full-service replacement window company', 'No siding services', 'No storm window specialization', 'No financing programs', 'Limited online review footprint', 'BBB not accredited', 'No warranty documentation public'],
        messagingGaps: ['No replacement window specialization messaging', 'No energy efficiency content', 'No financing content', 'No warranty transparency', 'No social media presence', 'No before/after content'],
        facebookNotes: 'No meaningful Facebook presence observed.',
        instagramNotes: 'No Instagram presence.',
        ourCounterPitch: 'Clearview is a glass shop that does window repair — they\'re not a replacement window specialist. For a full-home window replacement, you need a company with energy-efficient products, certified installers, lifetime warranty, and financing options. That\'s us.',
        talkTrack: 'Clearview is great for emergency glass repair or a broken pane. But if you\'re replacing windows across your whole home, you need a specialist — not a glass shop. We specialize in energy-efficient replacement windows with certified installation crews, a lifetime warranty, and 0% financing. Clearview doesn\'t offer any of that.',
        objectionResponses: [
          { objection: 'Clearview can do my windows cheaper', response: 'They may be able to install glass, but replacement windows are a complete system — frame, glass, seals, hardware, installation technique. A glass shop installs glass. We install complete window systems with energy ratings, proper flashing, and a lifetime warranty.', close: 'Would you like to see the difference between a glass install and a full window system replacement?' },
          { objection: 'Clearview is local', response: 'So are we! And we specialize in exactly what you need — replacement windows and doors with financing, warranty, and our own installation crews.', close: 'Can I show you what a full replacement looks like compared to a glass swap?' },
        ],
      },
    },
    {
      slug: 'southern-home-improvement',
      data: {
        positioning: 'Long-standing local contractor (since 1991) covering multiple home exterior categories including roofing, gutters, patio covers, windows, and siding. Generalist, not specialist.',
        keyClaims: ['35+ years in business', 'BBB A+ accredited since 2004', 'Impact-resistant windows', 'Serves SE Louisiana and MS Gulf Coast'],
        pricingLanguage: 'No published pricing. Free estimates.',
        financingOffers: 'No published financing options.',
        warrantyNotes: 'No specific warranty terms published online.',
        ctaStrategy: 'Phone and website contact. Traditional lead capture.',
        reviewStrengths: ['Extreme longevity (35+ years)', 'Reliable and professional', 'Responsive to corrections', 'Strong local reputation'],
        reviewWeaknesses: ['Website and digital presence feel dated', 'Minor quality issues (trim, caulking)', 'No published financing', 'No specific warranty terms online', 'No entry door specialization', 'Diversified across roofing/gutters/patio — not focused'],
        messagingGaps: ['No financing messaging', 'No energy savings content', 'No storm/insurance content', 'Dated website design', 'No social media strategy', 'No manufacturer transparency'],
        facebookNotes: 'Low social media presence. No consistent posting strategy.',
        instagramNotes: 'Minimal to no Instagram presence.',
        ourCounterPitch: 'Southern HI has been around a long time, and that\'s respectable. But they do roofing, gutters, patio covers AND windows — they\'re spread thin. We\'re 100% focused on replacement windows, doors, and siding. That specialization means better product knowledge, better-trained crews, and better results.',
        talkTrack: 'Southern Home Improvement has great longevity — 35 years is impressive. Here\'s the question: they also do roofing, gutters, and patio covers. How much of their business is actually windows? We do windows, doors, and siding — that\'s ALL we do. Our crews are trained specifically for window and door installation, not splitting time with roofing jobs. Plus we offer 0% financing — they don\'t.',
        objectionResponses: [
          { objection: 'Southern HI has been around longer', response: 'Longevity is great — it means they\'re reliable. But longevity doesn\'t mean specialization. They spread across roofing, gutters, and patio covers. We focus 100% on windows, doors, and siding. That focus means better products, better crews, and a true lifetime warranty.', close: 'Would you rather have a generalist or a specialist working on your windows?' },
          { objection: 'I trust Southern because they\'re established', response: 'Trust matters — and we respect their track record. But ask them: do they offer 0% financing? What are the specific warranty terms? Who manufactures their windows? We\'re transparent on all three.', close: 'Can I show you our warranty and financing terms side-by-side?' },
        ],
      },
    },
    {
      slug: 'acadian-windows',
      data: {
        positioning: 'Gulf Coast regional window and siding company emphasizing energy efficiency and climate-appropriate products. Aggressive marketing with broad online review presence.',
        keyClaims: ['BBB A+ accredited', 'Lifetime transferable warranty', 'Energy-efficient products for Gulf South climate', 'James Hardie siding installer', 'Hurricane shutters and porch screens'],
        pricingLanguage: 'Free in-home estimates. No published pricing. Mixed feedback — some say "fair," others say not cheapest.',
        financingOffers: '"Reduced interest loans" — NOT true 0% APR. Interest-bearing financing that costs the customer more over time.',
        warrantyNotes: 'Lifetime transferable warranty covering manufacturing defects and labor for original buyer. Strong claim.',
        ctaStrategy: 'In-home estimate request. Website forms and phone. Aggressive digital marketing.',
        reviewStrengths: ['Strong online review presence (Google, Angi)', 'Professional installation teams', 'Energy efficiency focus', 'Lifetime transferable warranty', 'Gulf Coast climate positioning'],
        reviewWeaknesses: ['FTC warning letter (2012) for unsubstantiated energy savings claims', 'Does NOT disclose window manufacturers', 'Financing is "reduced interest" NOT 0% APR', 'Project delays and communication gaps', 'Installation crew conduct issues reported'],
        messagingGaps: ['No manufacturer transparency — "who makes your windows?"', 'FTC history not addressed', 'Financing terms not clearly published', 'No comparison tools for buyers', 'No storm/insurance claim assistance content'],
        facebookNotes: 'Active Facebook presence with project photos and promotions. Engagement-focused but claims may overstate savings.',
        instagramNotes: 'Moderate Instagram presence with project showcases. No Reels strategy.',
        ourCounterPitch: 'Acadian has good reviews but two critical issues: (1) they don\'t disclose who makes their windows — you can\'t verify specs, and (2) their financing is "reduced interest," not 0% like ours. On a $15K project, that interest adds up. Also, the FTC sent them a warning letter about unsubstantiated energy claims.',
        talkTrack: 'If a homeowner mentions Acadian, say: "Great company with good reviews. Here are two important questions to ask them: First, who manufactures the windows? They don\'t publish it. Second, what\'s the actual APR on their financing? They say \'reduced interest\' — that\'s not 0%. On a $15,000 project, that difference could cost you hundreds or thousands. We use named manufacturers with published specs, and we offer true 0% APR."',
        objectionResponses: [
          { objection: 'Acadian has great reviews', response: 'They do have strong reviews, and we respect that. But reviews don\'t tell you who makes the windows or what the financing APR is. Ask them both questions — we\'re transparent on both.', close: 'Would you like to see our manufacturer specs and 0% financing terms side-by-side with their offer?' },
          { objection: 'Acadian says they\'ll save me 30% on energy', response: 'Be careful with that claim. The FTC actually sent Acadian a warning letter in 2012 about unsubstantiated energy savings claims. The honest number from DOE data is 10-15%. We\'d rather be honest and earn your trust.', close: 'I\'d rather under-promise and over-deliver. Can I show you the real DOE data?' },
          { objection: 'Acadian has financing too', response: 'They offer "reduced interest" — which means you\'re still paying interest. We offer true 0% APR. On a $15,000 project over 5 years, that difference could be $2,000-$4,000 out of your pocket.', close: 'Would you like me to run the numbers so you can see the actual cost difference?' },
        ],
      },
    },
    {
      slug: 'las-home',
      data: {
        positioning: 'Louisiana-based manufacturer (since 1950s) that builds and installs their own windows, doors, shutters, and siding. Strong "made in Louisiana" narrative.',
        keyClaims: ['70+ years in business', 'Manufactures own products in Louisiana', 'Products engineered for Gulf South climate', 'BBB A+ accredited', 'Windows, doors, shutters, siding, privacy walls'],
        pricingLanguage: 'No published pricing. In-home estimates.',
        financingOffers: 'No published financing options.',
        warrantyNotes: 'No specific warranty terms published online. Being a manufacturer, warranty is only as good as the company\'s solvency.',
        ctaStrategy: 'Website contact form and phone. Traditional approach.',
        reviewStrengths: ['70+ years of operation — extreme longevity', 'Manufactures own products locally', 'Gulf South climate engineering', 'Professional, punctual crews', 'Responsive communication', 'BBB A+ with Angi reviews'],
        reviewWeaknesses: ['Occasional product leak reports', 'Scheduling concerns in some reviews', 'Proprietary products prevent brand comparison', 'No published pricing or financing', 'Single-manufacturer = limited product range', 'If LAS closes, warranty is worthless'],
        messagingGaps: ['No third-party spec verification possible', 'No financing options published', 'No energy savings calculator or data', 'No comparison tools', 'No storm/insurance claim assistance', 'Limited social media strategy'],
        facebookNotes: 'Low-frequency Facebook posting. Mostly company updates and occasional project photos.',
        instagramNotes: 'Minimal Instagram presence. No visual content strategy.',
        ourCounterPitch: 'LAS has impressive longevity and they manufacture their own products — that\'s unique. But here\'s the risk: since they\'re the manufacturer, you can\'t independently verify their specs against Pella, Andersen, or any other brand. And if LAS ever closes, your warranty dies with them. Our warranty is backed by a national network.',
        talkTrack: 'LAS Home has been around since the 1950s and they make their own windows — that\'s genuinely impressive. But ask yourself: since they\'re the manufacturer AND the installer, how do you verify their specs? You can\'t compare them to Pella or Andersen because they\'re a proprietary product. And here\'s the bigger question: if LAS ever closes, who honors your warranty? With us, our warranty is backed by a national network that will be here regardless.',
        objectionResponses: [
          { objection: 'LAS makes their own windows in Louisiana', response: 'That is unique, and there\'s something to be said for local manufacturing. But it also means you can\'t independently verify their specs against any nationally-rated product. Ask them to show you third-party NFRC testing data. We use nationally-certified products with published, verifiable specifications.', close: 'Would you like to see our NFRC-rated specs so you can compare?' },
          { objection: 'LAS has been in business 70 years', response: 'That\'s impressive longevity. But 70 years doesn\'t guarantee the next 30. Since they\'re both manufacturer and installer, your warranty lives and dies with one company. Our warranty is backed by a national network — it survives regardless of any single location.', close: 'Would that national warranty backing give you more peace of mind?' },
          { objection: 'LAS products are built for Louisiana weather', response: 'All quality windows should be built for your climate. The question is: can you verify those claims independently? We use nationally-tested, NFRC-rated products. Ask LAS for their third-party test results.', close: 'Can I show you our test certifications?' },
        ],
      },
    },
  ];

  for (const { slug, data } of cards) {
    const competitor = await prisma.competitor.findFirst({ where: { slug } });
    if (!competitor) continue;

    const existing = await prisma.battlecard.findFirst({ where: { competitorId: competitor.id } });
    if (existing) continue; // Don't overwrite existing battlecards

    await prisma.battlecard.create({
      data: {
        competitorId: competitor.id,
        ...data,
        lastUpdated: new Date(),
      },
    });
    logger.info(`[Intelligence] Seeded static battlecard for: ${competitor.name}`);
  }
}

// ─── Seed Static Review Insights (from Google-discovered public reviews) ──
async function seedStaticReviews(): Promise<void> {
  const existing = await prisma.reviewInsight.count();
  if (existing > 0) return; // Already seeded

  const reviews: Array<{
    competitorSlug: string | null;
    source: string; rating: number | null; reviewText: string;
    sentiment: string; topicTags: string[]; productMentioned: string | null;
    reviewerType: string;
  }> = [
    // ── Window World (self-awareness) ──
    { competitorSlug: 'window-world-corporate', source: 'reddit', rating: 4, reviewText: 'Window World did our whole house — 12 windows for about $4,800. Great price. Installation crew was fast and professional. Only issue was scheduling took about 3 weeks from contract to install.', sentiment: 'positive', topicTags: ['price', 'installation', 'scheduling'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'window-world-corporate', source: 'reddit', rating: 3, reviewText: 'Decent windows for the money. Had an issue with one window not sealing properly and it took a while to get someone out for warranty service. Communication could be better.', sentiment: 'mixed', topicTags: ['warranty', 'communication', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'window-world-corporate', source: 'angi', rating: 5, reviewText: 'Best value in Baton Rouge. Our energy bill dropped noticeably. Crew cleaned up everything. Would recommend.', sentiment: 'positive', topicTags: ['price', 'installation', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Relief Windows ──
    { competitorSlug: 'relief-windows', source: 'angi', rating: 5, reviewText: 'Relief Windows did an excellent job. Crew was on time, professional, and left the job site cleaner than they found it. Office was very responsive. Highly recommend.', sentiment: 'positive', topicTags: ['installation', 'communication', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'relief-windows', source: 'guildquality', rating: 5, reviewText: 'Very happy with the storm windows. Installation was efficient, and the crew was careful with our landscaping. Multi-year Angie\'s List award winner for a reason.', sentiment: 'positive', topicTags: ['installation', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'relief-windows', source: 'reddit', rating: 4, reviewText: 'Relief was more expensive than Window World but the installation quality felt a step above. Ask about their limited warranty though — it has some exclusions.', sentiment: 'positive', topicTags: ['price', 'quality', 'warranty'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'relief-windows', source: 'homeadvisor', rating: 3, reviewText: 'Good product but we had to follow up multiple times to get a scheduling confirmation. Once the crew arrived, the work was excellent.', sentiment: 'mixed', topicTags: ['scheduling', 'communication', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Geaux Tommy's ──
    { competitorSlug: 'geaux-tommys', source: 'angi', rating: 5, reviewText: 'Tommy was great — personally came out to give the estimate and followed up after installation. Punctual crew, pleasant experience from start to finish.', sentiment: 'positive', topicTags: ['communication', 'installation', 'trust'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'geaux-tommys', source: 'angi', rating: 4, reviewText: 'Good work but the project took longer than expected. Was told 2 weeks but it stretched to almost 5. Communication about the delay was lacking.', sentiment: 'mixed', topicTags: ['scheduling', 'communication'], productMentioned: 'siding', reviewerType: 'homeowner' },
    { competitorSlug: 'geaux-tommys', source: 'reddit', rating: 2, reviewText: 'Had significant delays with Tommy\'s. Three months between contract and installation. Follow-up work was needed on two windows that weren\'t sealed properly. Owner was responsive but the crew quality was inconsistent.', sentiment: 'negative', topicTags: ['scheduling', 'quality', 'communication'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Acadian Windows ──
    { competitorSlug: 'acadian-windows', source: 'angi', rating: 5, reviewText: 'Acadian did a great job with our replacement windows. Professional team, clean installation. Energy bills are noticeably lower.', sentiment: 'positive', topicTags: ['installation', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'acadian-windows', source: 'google', rating: 4, reviewText: 'Good experience overall. Sales process was professional. One concern: they couldn\'t tell me who actually manufactures their windows when I asked.', sentiment: 'mixed', topicTags: ['trust', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'acadian-windows', source: 'reddit', rating: 3, reviewText: 'Acadian quoted us much higher than Window World for comparable windows. When asked about the price difference, the rep couldn\'t explain it beyond "our quality is better." Financing was interest-bearing, not 0%.', sentiment: 'mixed', topicTags: ['price', 'trust'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'acadian-windows', source: 'bbb', rating: 2, reviewText: 'Project delayed by 6 weeks with no proactive communication. Had to call multiple times to get updates. Installation crew left debris in the yard.', sentiment: 'negative', topicTags: ['scheduling', 'communication', 'installation'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── LAS Home ──
    { competitorSlug: 'las-home', source: 'angi', rating: 5, reviewText: 'LAS has been around forever and it shows — very professional operation. Love that they make their own windows right here in Louisiana. Installation was perfect.', sentiment: 'positive', topicTags: ['quality', 'trust', 'installation'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'las-home', source: 'google', rating: 4, reviewText: 'Great windows but we had a minor leak after a big storm. They came out and fixed it under warranty. Would have been nice to compare their specs to other brands, but since they make their own, there\'s no independent comparison available.', sentiment: 'mixed', topicTags: ['quality', 'warranty'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Southern Home Improvement ──
    { competitorSlug: 'southern-home-improvement', source: 'angi', rating: 5, reviewText: 'Southern HI has been around 35 years for a reason. Professional, honest, and did exactly what they promised. Minor trim issue was fixed same week.', sentiment: 'positive', topicTags: ['trust', 'quality', 'communication'], productMentioned: 'siding', reviewerType: 'homeowner' },
    { competitorSlug: 'southern-home-improvement', source: 'thumbtack', rating: 4, reviewText: 'Good work on our vinyl siding project. Website felt a bit dated but the actual workmanship was solid. No financing options though — had to pay out of pocket.', sentiment: 'positive', topicTags: ['quality', 'price'], productMentioned: 'siding', reviewerType: 'homeowner' },
    // ── Clearview Glass ──
    { competitorSlug: 'clearview-glass', source: 'google', rating: 4, reviewText: 'Called Clearview for an emergency broken window and they came out same day. Quick repair, fair price. They\'re more of a glass shop than a full window replacement company though.', sentiment: 'positive', topicTags: ['communication', 'price'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Renewal by Andersen ──
    { competitorSlug: 'renewal-by-andersen', source: 'reddit', rating: 2, reviewText: 'Beautiful windows but incredibly expensive — nearly 3x what Window World quoted. High-pressure sales appointment lasted 3 hours. Required both homeowners present. Classic "call the manager for a discount" routine.', sentiment: 'negative', topicTags: ['price', 'trust'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: 'renewal-by-andersen', source: 'bbb', rating: 3, reviewText: 'Good product quality but the sales process was aggressive. Price dropped significantly after I said I was getting other quotes. Makes you wonder what the real price is.', sentiment: 'mixed', topicTags: ['price', 'trust'], productMentioned: 'windows', reviewerType: 'homeowner' },
    // ── Industry-wide (no specific competitor) ──
    { competitorSlug: null, source: 'reddit', rating: null, reviewText: 'PSA for Baton Rouge homeowners: ALWAYS get at least 3 quotes for replacement windows. The price difference between companies can be 2-3x for essentially the same product. Ask about permits, warranty specifics, and whether they use their own crews or subs.', sentiment: 'neutral', topicTags: ['price', 'trust', 'quality'], productMentioned: 'windows', reviewerType: 'homeowner' },
    { competitorSlug: null, source: 'reddit', rating: null, reviewText: 'After our hurricane experience, make sure your window company offers storm/impact-resistant options AND helps with insurance paperwork. Most companies just sell windows — very few actually help with the insurance claim process.', sentiment: 'neutral', topicTags: ['warranty', 'trust'], productMentioned: 'windows', reviewerType: 'homeowner' },
  ];

  for (const r of reviews) {
    let competitorId: string | null = null;
    if (r.competitorSlug) {
      const comp = await prisma.competitor.findFirst({ where: { slug: r.competitorSlug } });
      competitorId = comp?.id || null;
    }
    await prisma.reviewInsight.create({
      data: {
        competitorId,
        source: r.source,
        rating: r.rating,
        reviewText: r.reviewText,
        sentiment: r.sentiment,
        topicTags: r.topicTags,
        productMentioned: r.productMentioned,
        reviewerType: r.reviewerType,
      },
    });
  }
  logger.info(`[Intelligence] Seeded ${reviews.length} static review insights`);
}

// ─── Seed Static Forum Thread Insights ────────────────────────────────────
async function seedStaticForumThreads(): Promise<void> {
  const existing = await prisma.forumThreadInsight.count();
  if (existing > 0) return;

  const threads = [
    {
      source: 'reddit', subreddit: 'r/batonrouge',
      threadTitle: 'Replacement window recommendations in Baton Rouge?',
      threadContent: 'Looking to replace 15 windows in my 1980s ranch in Prairieville. Anyone have experience with local companies? Budget is a concern but I don\'t want garbage quality. Already got a quote from Window World — $4,200 for the whole house. Is that reasonable? Should I also look at Relief or Acadian?',
      sentiment: 'neutral', topicTags: ['price', 'quality', 'comparison'],
      productFocus: 'windows', intentSignals: ['comparison', 'financing'],
      keyQuestions: ['Is $4,200 reasonable for 15 windows?', 'Window World vs Relief vs Acadian?', 'What should I look for in a warranty?'],
      competitorMentions: ['window-world-corporate', 'relief-windows', 'acadian-windows'],
    },
    {
      source: 'reddit', subreddit: 'r/batonrouge',
      threadTitle: 'Storm damaged windows — insurance covering replacement?',
      threadContent: 'We had 3 windows blow in during the last storm. Insurance adjuster is coming next week. Does anyone know if insurance typically covers full replacement with impact windows, or just repair? Also, which companies in BR help with the insurance process? I don\'t want to deal with the paperwork myself.',
      sentiment: 'mixed', topicTags: ['warranty', 'trust', 'quality'],
      productFocus: 'windows', intentSignals: ['storm', 'insurance', 'urgency'],
      keyQuestions: ['Does insurance cover full replacement or just repair?', 'Which companies help with insurance paperwork?', 'Can I upgrade to impact windows through insurance?'],
      competitorMentions: [],
    },
    {
      source: 'reddit', subreddit: 'r/homeimprovement',
      threadTitle: 'Are $89/month window financing offers legit?',
      threadContent: 'Seeing Facebook ads for replacement windows at $89/month with 0% interest. Is this actually legit or is there a catch? We need about 10 windows replaced and can\'t afford $10K upfront. Louisiana market if it matters.',
      sentiment: 'neutral', topicTags: ['price', 'trust'],
      productFocus: 'windows', intentSignals: ['financing', 'comparison'],
      keyQuestions: ['Is 0% financing real or a gimmick?', 'What are the catches with monthly payment offers?', 'How much do 10 replacement windows actually cost?'],
      competitorMentions: ['window-world-corporate'],
    },
    {
      source: 'reddit', subreddit: 'r/batonrouge',
      threadTitle: 'Entry door replacement — who did yours?',
      threadContent: 'Front door is original to the house (1975). Looking for fiberglass entry door replacement. Care more about curb appeal and security than price. Any locals who specialize in doors, not just windows? Most companies seem to be window-first.',
      sentiment: 'neutral', topicTags: ['quality', 'trust'],
      productFocus: 'doors', intentSignals: ['comparison'],
      keyQuestions: ['Who specializes in doors, not just windows?', 'Fiberglass vs steel entry door?', 'Does door replacement have good ROI?'],
      competitorMentions: ['relief-windows', 'las-home'],
    },
    {
      source: 'reddit', subreddit: 'r/batonrouge',
      threadTitle: 'Siding replacement — James Hardie vs vinyl in Louisiana humidity',
      threadContent: 'Whole house needs new siding. Getting quotes for both vinyl and James Hardie. The Hardie is almost 2x the price. Is it worth it in our climate? Also, are there any federal tax credits for siding?',
      sentiment: 'neutral', topicTags: ['price', 'quality'],
      productFocus: 'siding', intentSignals: ['comparison', 'financing'],
      keyQuestions: ['Is James Hardie worth 2x the price of vinyl?', 'How does humidity affect siding choice?', 'Are there tax credits for siding?'],
      competitorMentions: ['acadian-windows', 'relief-windows', 'southern-home-improvement'],
    },
    {
      source: 'reddit', subreddit: 'r/homeimprovement',
      threadTitle: 'Renewal by Andersen 3-hour sales pitch — normal?',
      threadContent: 'Had RbA come out for a quote. The sales rep was there for almost 3 hours. Wouldn\'t give me a price until the end, kept calling his "manager" for a better deal. Quote came in at $28,000 for 8 windows. Is this the norm? Window World quoted me $3,500 for the same 8 windows. What am I missing?',
      sentiment: 'negative', topicTags: ['price', 'trust'],
      productFocus: 'windows', intentSignals: ['comparison'],
      keyQuestions: ['Is a 3-hour sales pitch normal?', 'Why is RbA 8x more than Window World?', 'Is there actually a quality difference worth 8x?'],
      competitorMentions: ['renewal-by-andersen', 'window-world-corporate'],
    },
    {
      source: 'houzz_community', subreddit: null,
      threadTitle: 'Best window company in Baton Rouge — 2025 experiences',
      threadContent: 'We want to replace all the windows in our 2,400 sqft home. Want quality but also need financing since we can\'t drop $12K at once. Who has the best combination of product quality, installation quality, and financing? We\'re getting quotes from Window World, Acadian, Relief, and LAS.',
      sentiment: 'neutral', topicTags: ['quality', 'price', 'comparison'],
      productFocus: 'windows', intentSignals: ['financing', 'comparison'],
      keyQuestions: ['Best quality + financing combination?', 'Which company has the best warranty?', 'Are subcontractors a red flag?'],
      competitorMentions: ['window-world-corporate', 'acadian-windows', 'relief-windows', 'las-home'],
    },
    {
      source: 'reddit', subreddit: 'r/batonrouge',
      threadTitle: 'Warning: don\'t skip getting permits for window replacement',
      threadContent: 'Just found out my window company didn\'t pull permits for our replacement project last year. Now it\'s an issue with our home sale. Always ask if they handle permits. Some of the cheaper companies skip this step.',
      sentiment: 'negative', topicTags: ['trust', 'quality'],
      productFocus: 'windows', intentSignals: ['trust'],
      keyQuestions: ['Do window companies pull permits?', 'Can unpermitted work affect home sale?', 'Which companies handle permits?'],
      competitorMentions: [],
    },
  ];

  for (const t of threads) {
    await prisma.forumThreadInsight.create({
      data: {
        source: t.source,
        subreddit: t.subreddit,
        threadTitle: t.threadTitle,
        threadContent: t.threadContent,
        sentiment: t.sentiment,
        topicTags: t.topicTags,
        productFocus: t.productFocus,
        intentSignals: t.intentSignals,
        keyQuestions: t.keyQuestions,
        competitorMentions: t.competitorMentions,
      },
    });
  }
  logger.info(`[Intelligence] Seeded ${threads.length} static forum thread insights`);
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
  seedStaticBattlecards,
  seedStaticReviews,
  seedStaticForumThreads,
};
