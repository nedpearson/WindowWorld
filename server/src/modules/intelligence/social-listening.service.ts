/**
 * Social Listening & Public Intent Detection Service
 * 
 * Detects public buying-intent signals from lawful sources and routes
 * them into the CRM workflow. All data is public-only.
 * 
 * COMPLIANCE: No private data. No private groups. No DMs. No deanonymization.
 */

import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

// ─── Keyword & Semantic Intent Model ─────────────────────────────────────

const INTENT_KEYWORDS = {
  windows: [
    'replacement windows', 'new windows', 'window replacement', 'broken windows',
    'window installers', 'window financing', 'vinyl windows', 'impact windows',
    'storm windows', 'energy efficient windows', 'double pane', 'window estimate',
    'old windows', 'drafty windows', 'window company', 'window contractor',
  ],
  doors: [
    'entry doors', 'front door', 'patio doors', 'sliding doors', 'exterior doors',
    'door replacement', 'french doors', 'storm doors', 'new door', 'door installer',
    'fiberglass door', 'steel door', 'door estimate',
  ],
  siding: [
    'siding replacement', 'vinyl siding', 'james hardie', 'hardieplank', 'fiber cement',
    'siding damage', 'new siding', 'siding contractor', 'siding estimate', 'siding cost',
    'exterior siding', 'house siding',
  ],
  financing: [
    'financing', 'monthly payments', '0% interest', 'zero percent', '$0 down',
    'payment plan', 'affordable', 'can\'t afford', 'budget', 'finance options',
  ],
  storm: [
    'storm damage', 'hurricane damage', 'hail damage', 'wind damage', 'water damage',
    'insurance claim', 'insurance replacement', 'storm repair', 'hurricane windows',
  ],
  urgency: [
    'need quotes', 'need estimate', 'looking to replace', 'need help', 'asap',
    'as soon as possible', 'emergency', 'broken', 'cracked', 'shattered',
  ],
};

const SEMANTIC_PATTERNS = [
  { pattern: 'who is the best company for', type: 'recommendation_request' },
  { pattern: 'anyone recommend', type: 'recommendation_request' },
  { pattern: 'can anyone recommend', type: 'recommendation_request' },
  { pattern: 'who do you recommend', type: 'recommendation_request' },
  { pattern: 'any good local', type: 'recommendation_request' },
  { pattern: 'need quotes for', type: 'quote_request' },
  { pattern: 'need an estimate', type: 'quote_request' },
  { pattern: 'getting quotes', type: 'quote_request' },
  { pattern: 'looking to replace', type: 'quote_request' },
  { pattern: 'thinking about replacing', type: 'quote_request' },
  { pattern: 'need financing for', type: 'financing_inquiry' },
  { pattern: 'can i finance', type: 'financing_inquiry' },
  { pattern: 'monthly payment', type: 'financing_inquiry' },
  { pattern: 'need help with insurance', type: 'storm_damage' },
  { pattern: 'insurance and replacement', type: 'storm_damage' },
  { pattern: 'storm damaged', type: 'storm_damage' },
  { pattern: 'after the storm', type: 'storm_damage' },
  { pattern: 'any reviews on', type: 'competitor_mention' },
  { pattern: 'has anyone used', type: 'competitor_mention' },
  { pattern: 'experience with', type: 'competitor_mention' },
  { pattern: 'stay away from', type: 'complaint_opportunity' },
  { pattern: 'terrible experience', type: 'complaint_opportunity' },
  { pattern: 'worst company', type: 'complaint_opportunity' },
  { pattern: 'do not use', type: 'complaint_opportunity' },
  { pattern: 'still waiting', type: 'complaint_opportunity' },
  { pattern: 'won\'t return my call', type: 'complaint_opportunity' },
];

const COMPETITOR_NAMES = [
  'window world', 'relief windows', 'acadian windows', 'acadian',
  'geaux tommy', 'tommy\'s windows', 'clearview glass', 'clearview',
  'southern home improvement', 'las home', 'las shutters', 'las windows',
  'renewal by andersen', 'andersen', 'pella', 'window nation',
  'power home remodeling',
];

const GEO_MARKERS = [
  'baton rouge', 'prairieville', 'denham springs', 'gonzales', 'zachary',
  'central', 'walker', 'livingston', 'ascension', 'east baton rouge',
  'west baton rouge', 'iberville', 'louisiana', 'la area', 'br area',
];

// ─── Intent Classification Engine ────────────────────────────────────────

export function classifyIntent(text: string): {
  category: string;
  urgency: string;
  intentType: string;
  confidence: number;
  localRelevance: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
  competitorsMentioned: string[];
  geography: string | null;
} {
  const lower = text.toLowerCase();
  const matchedKeywords: string[] = [];
  const matchedPatterns: string[] = [];
  const competitorsMentioned: string[] = [];
  let geography: string | null = null;

  // Keyword matching
  const catScores: Record<string, number> = { windows: 0, doors: 0, siding: 0 };
  for (const [cat, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (cat === 'financing' || cat === 'storm' || cat === 'urgency') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) { catScores[cat] += 1; matchedKeywords.push(kw); }
    }
  }

  // Financing / storm / urgency signals
  let financingSignal = 0, stormSignal = 0, urgencySignal = 0;
  for (const kw of INTENT_KEYWORDS.financing) {
    if (lower.includes(kw)) { financingSignal++; matchedKeywords.push(kw); }
  }
  for (const kw of INTENT_KEYWORDS.storm) {
    if (lower.includes(kw)) { stormSignal++; matchedKeywords.push(kw); }
  }
  for (const kw of INTENT_KEYWORDS.urgency) {
    if (lower.includes(kw)) { urgencySignal++; matchedKeywords.push(kw); }
  }

  // Semantic pattern matching
  let intentType = 'product_question';
  for (const sp of SEMANTIC_PATTERNS) {
    if (lower.includes(sp.pattern)) {
      matchedPatterns.push(sp.pattern);
      intentType = sp.type;
    }
  }

  // Competitor detection
  for (const cn of COMPETITOR_NAMES) {
    if (lower.includes(cn)) competitorsMentioned.push(cn);
  }
  if (competitorsMentioned.length > 0 && intentType === 'product_question') {
    intentType = 'competitor_mention';
  }

  // Geo detection
  for (const geo of GEO_MARKERS) {
    if (lower.includes(geo)) { geography = geo; break; }
  }

  // Category
  const topCat = Object.entries(catScores).sort((a, b) => b[1] - a[1]);
  let category = 'general';
  if (topCat[0][1] > 0 && topCat[1][1] > 0) category = 'multi_category';
  else if (topCat[0][1] > 0) category = topCat[0][0];

  // Urgency
  let urgency = 'researching';
  if (stormSignal > 0) urgency = urgencySignal > 0 ? 'urgent_damage' : 'insurance_focused';
  else if (financingSignal > 0) urgency = 'financing_focused';
  else if (urgencySignal > 0) urgency = 'quote_seeking';
  else if (competitorsMentioned.length >= 2) urgency = 'comparison_shopping';

  // Confidence
  const totalSignals = matchedKeywords.length + matchedPatterns.length;
  const confidence = Math.min(1.0, 0.2 + totalSignals * 0.1);
  const localRelevance = geography ? 0.9 : 0.3;

  return {
    category, urgency, intentType, confidence, localRelevance,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchedPatterns: [...new Set(matchedPatterns)],
    competitorsMentioned: [...new Set(competitorsMentioned)],
    geography,
  };
}

// ─── Recommended Actions Generator ───────────────────────────────────────

function generateRecommendations(intent: ReturnType<typeof classifyIntent>): {
  action: string; landing: string; talkTrack: string;
} {
  const actions: Record<string, string> = {
    recommendation_request: 'Respond with value proposition + free estimate offer. Position as the trusted local choice.',
    complaint_opportunity: 'Monitor thread. If competitor complaint, prepare comparison pitch highlighting our communication guarantee.',
    quote_request: 'Fast-track to appointment scheduler. Lead with 0% financing + free estimate.',
    storm_damage: 'Prioritize as URGENT. Lead with insurance assistance + storm-rated products.',
    financing_inquiry: 'Route to financing-first workflow. Lead with $89/mo and true 0% APR.',
    competitor_mention: 'Prepare battlecard response. Differentiate on warranty, financing, and own crews.',
    product_question: 'Provide educational content. Route to relevant product landing page.',
  };

  const landings: Record<string, string> = {
    windows: '/windows', doors: '/doors', siding: '/siding',
    multi_category: '/free-estimate', general: '/free-estimate',
  };

  const tracks: Record<string, string> = {
    recommendation_request: 'Thank you for considering us! We\'re the local window, door, and siding specialists — true 0% APR financing, lifetime warranty, our own certified crews. Want a free estimate?',
    storm_damage: 'We specialize in storm replacement and help with the insurance process. We can have someone out within 48 hours to assess the damage and start your claim.',
    financing_inquiry: 'Great news — we offer true 0% APR financing with payments as low as $89/month. Plus you may qualify for a $600 federal tax credit. Want to see your options?',
    quote_request: 'We\'d love to give you a free, no-pressure estimate. We\'re typically 20-40% less than the big national brands with the same quality and a lifetime warranty.',
    complaint_opportunity: 'We hear you — communication is our #1 priority. We guarantee 24-hour callback and assign a dedicated project manager to every job.',
    competitor_mention: 'When comparing, ask about: (1) who manufactures the windows, (2) what the actual financing APR is, and (3) whether they use their own crews. We\'re transparent on all three.',
    product_question: 'Happy to help! We specialize in energy-efficient replacement windows, entry doors, and siding for the Baton Rouge area. What questions can we answer?',
  };

  return {
    action: actions[intent.intentType] || actions.product_question,
    landing: landings[intent.category] || '/free-estimate',
    talkTrack: tracks[intent.intentType] || tracks.product_question,
  };
}

// ─── Process & Store Intent Mention ──────────────────────────────────────

export async function processIntentMention(input: {
  sourcePlatform: string;
  sourceType: string;
  sourceUrl?: string;
  authorHandle?: string;
  contentText: string;
}): Promise<{ id: string; category: string; urgency: string; confidence: number }> {
  const intent = classifyIntent(input.contentText);
  const recs = generateRecommendations(intent);

  const mention = await prisma.publicIntentMention.create({
    data: {
      sourcePlatform: input.sourcePlatform,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      authorHandle: input.authorHandle,
      contentText: input.contentText,
      category: intent.category,
      urgency: intent.urgency,
      intentType: intent.intentType,
      confidence: intent.confidence,
      localRelevance: intent.localRelevance,
      matchedKeywords: intent.matchedKeywords,
      matchedPatterns: intent.matchedPatterns,
      competitorsMentioned: intent.competitorsMentioned,
      geography: intent.geography,
      recommendedAction: recs.action,
      recommendedLanding: recs.landing,
      recommendedTalkTrack: recs.talkTrack,
    },
  });

  logger.info(`[SocialListening] Processed intent: ${intent.category}/${intent.urgency} (${intent.confidence.toFixed(2)})`);
  return { id: mention.id, category: intent.category, urgency: intent.urgency, confidence: intent.confidence };
}

// ─── Dashboard Queries ───────────────────────────────────────────────────

export async function getIntentDashboard(filters?: { category?: string; urgency?: string; status?: string }) {
  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.urgency) where.urgency = filters.urgency;
  if (filters?.status) where.status = filters?.status;

  const [mentions, byCategory, byUrgency, byPlatform, highConfidence] = await Promise.all([
    prisma.publicIntentMention.findMany({ where, orderBy: { confidence: 'desc' }, take: 50 }),
    prisma.publicIntentMention.groupBy({ by: ['category'], _count: true, where }),
    prisma.publicIntentMention.groupBy({ by: ['urgency'], _count: true, where }),
    prisma.publicIntentMention.groupBy({ by: ['sourcePlatform'], _count: true, where }),
    prisma.publicIntentMention.findMany({ where: { confidence: { gte: 0.7 }, status: 'new' }, orderBy: { confidence: 'desc' }, take: 20 }),
  ]);

  const signals = await prisma.localOpportunitySignal.findMany({ where: { isActive: true }, orderBy: { signalStrength: 'desc' }, take: 10 });

  return { mentions, byCategory, byUrgency, byPlatform, highConfidence, signals };
}

// ─── Seed Competitor Social Profiles ─────────────────────────────────────

export async function seedCompetitorSocialProfiles(): Promise<void> {
  const profiles: Array<{ slug: string; profiles: Array<{ platform: string; profileUrl: string; handle: string; postFrequency: string; primaryThemes: string[]; toneNotes: string }> }> = [
    {
      slug: 'window-world-corporate',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/WindowWorldBatonRouge', handle: 'WindowWorldBatonRouge', postFrequency: 'weekly', primaryThemes: ['before_after', 'financing_hook', 'product_showcase', 'testimonial'], toneNotes: 'Professional, value-focused. Emphasizes affordability and lifetime warranty.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/windowworldbatonrouge', handle: '@windowworldbatonrouge', postFrequency: 'weekly', primaryThemes: ['before_after', 'product_showcase', 'community_trust'], toneNotes: 'Visual project showcases, customer stories.' },
      ],
    },
    {
      slug: 'relief-windows',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/ReliefWindows', handle: 'ReliefWindows', postFrequency: 'monthly', primaryThemes: ['before_after', 'testimonial', 'product_showcase'], toneNotes: 'Professional, emphasizes crew quality and local reputation.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/reliefwindows', handle: '@reliefwindows', postFrequency: 'sporadic', primaryThemes: ['before_after', 'product_showcase'], toneNotes: 'Minimal presence. Mostly project photos.' },
      ],
    },
    {
      slug: 'acadian-windows',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/AcadianWindows', handle: 'AcadianWindows', postFrequency: 'weekly', primaryThemes: ['energy_savings', 'product_showcase', 'seasonal_offer', 'testimonial'], toneNotes: 'Active. Emphasizes energy efficiency and Gulf Coast climate. May overstate savings.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/acadianwindows', handle: '@acadianwindows', postFrequency: 'weekly', primaryThemes: ['product_showcase', 'before_after'], toneNotes: 'Moderate presence with project showcases.' },
      ],
    },
    {
      slug: 'las-home',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/LASShuttersandWindows', handle: 'LASShuttersandWindows', postFrequency: 'monthly', primaryThemes: ['product_showcase', 'community_trust', 'how_it_works'], toneNotes: 'Emphasizes Louisiana manufacturing heritage. Low posting frequency.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/lasshuttersandwindows', handle: '@lasshuttersandwindows', postFrequency: 'sporadic', primaryThemes: ['product_showcase'], toneNotes: 'Minimal presence.' },
      ],
    },
    {
      slug: 'geaux-tommys',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/GeauxTommys', handle: 'GeauxTommys', postFrequency: 'sporadic', primaryThemes: ['before_after', 'testimonial'], toneNotes: 'Owner-driven. Low frequency. Primarily word-of-mouth.' },
      ],
    },
    {
      slug: 'renewal-by-andersen',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/RenewalbyAndersen', handle: 'RenewalbyAndersen', postFrequency: 'daily', primaryThemes: ['product_showcase', 'seasonal_offer', 'testimonial', 'energy_savings'], toneNotes: 'National brand. High production value. Aggressive promotional cadence.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/renewalbyandersen', handle: '@renewalbyandersen', postFrequency: 'daily', primaryThemes: ['product_showcase', 'curb_appeal', 'how_it_works'], toneNotes: 'Polished national content. Reels and Stories strategy.' },
      ],
    },
    {
      slug: 'pella',
      profiles: [
        { platform: 'facebook', profileUrl: 'https://www.facebook.com/Pella', handle: 'Pella', postFrequency: 'daily', primaryThemes: ['product_showcase', 'curb_appeal', 'how_it_works', 'energy_savings'], toneNotes: 'Premium brand positioning. Design-forward content.' },
        { platform: 'instagram', profileUrl: 'https://www.instagram.com/pellawindowsanddoors', handle: '@pellawindowsanddoors', postFrequency: 'daily', primaryThemes: ['curb_appeal', 'product_showcase'], toneNotes: 'Highly visual. Design inspiration focused.' },
      ],
    },
  ];

  for (const { slug, profiles: profs } of profiles) {
    const comp = await prisma.competitor.findFirst({ where: { slug } });
    if (!comp) continue;

    for (const p of profs) {
      const existing = await prisma.competitorSocialProfile.findFirst({
        where: { competitorId: comp.id, platform: p.platform },
      });
      if (existing) continue;

      await prisma.competitorSocialProfile.create({
        data: {
          competitorId: comp.id,
          platform: p.platform,
          profileUrl: p.profileUrl,
          handle: p.handle,
          postFrequency: p.postFrequency,
          primaryThemes: p.primaryThemes,
          toneNotes: p.toneNotes,
        },
      });
    }
  }
  logger.info('[SocialListening] Competitor social profiles seeded');
}

// ─── Seed Example Intent Mentions ────────────────────────────────────────

export async function seedExampleIntentMentions(): Promise<void> {
  const existing = await prisma.publicIntentMention.count();
  if (existing > 0) return;

  const examples = [
    { sourcePlatform: 'reddit', sourceType: 'public_post', contentText: 'Anyone in Baton Rouge recommend a good window replacement company? Need about 12 windows done, looking for financing options. Budget is tight.' },
    { sourcePlatform: 'facebook', sourceType: 'public_comment', contentText: 'We need our front door and patio door replaced after the last storm. Insurance is covering it but we need a contractor who handles the paperwork. Gonzales area.' },
    { sourcePlatform: 'nextdoor', sourceType: 'public_post', contentText: 'Who do you recommend for siding replacement in the Prairieville area? Got quotes from Acadian and Relief Windows but want more options.' },
    { sourcePlatform: 'reddit', sourceType: 'public_comment', contentText: 'Stay away from [competitor] - still waiting 4 months for my window installation. Communication has been terrible. Need quotes from someone else ASAP.' },
    { sourcePlatform: 'facebook', sourceType: 'public_post', contentText: 'Thinking about replacing all the windows in our 1985 ranch house in Central. Want energy efficient options. Can anyone recommend a company that offers 0% financing?' },
    { sourcePlatform: 'instagram', sourceType: 'public_comment', contentText: 'Love these before and after shots! We need new siding badly. How much does vinyl siding cost for a 2000 sqft house in Baton Rouge?' },
    { sourcePlatform: 'reddit', sourceType: 'public_thread', contentText: 'Just got quotes from Window World ($4,200), Relief ($6,800), and Acadian ($7,500) for 10 windows. Is Window World too cheap? What am I missing?' },
    { sourcePlatform: 'forum', sourceType: 'public_post', contentText: 'Hail damaged 6 windows and our front door last night. Denham Springs. Need emergency repair and then full replacement. Insurance adjuster coming Monday.' },
  ];

  for (const ex of examples) {
    await processIntentMention(ex);
  }
  logger.info('[SocialListening] Seeded example intent mentions');
}

// ─── Seed Local Opportunity Signals ──────────────────────────────────────

export async function seedLocalOpportunitySignals(): Promise<void> {
  const existing = await prisma.localOpportunitySignal.count();
  if (existing > 0) return;

  const signals = [
    { sourcePlatform: 'multi', signalType: 'storm_spike', category: 'windows', geography: 'Denham Springs / Livingston Parish', signalStrength: 0.9, mentionCount: 12, timeWindow: 'last_7_days', summary: 'Spike in storm-damage window replacement mentions following severe weather. Multiple homeowners seeking emergency repair and full replacement. Insurance claim assistance highly requested.', recommendedCampaign: 'Launch "Storm Recovery" Facebook campaign targeting Denham Springs / Livingston. Lead with insurance assistance + 48-hour response guarantee.', recommendedSegment: 'STORM_URGENT' },
    { sourcePlatform: 'reddit', signalType: 'financing_demand', category: 'windows', geography: 'Baton Rouge Metro', signalStrength: 0.8, mentionCount: 8, timeWindow: 'last_30_days', summary: 'Consistent financing-related questions in local forums. Buyers want 0% APR confirmation and monthly payment clarity. Competitor financing terms are unclear or interest-bearing.', recommendedCampaign: 'Run "$89/Month Windows" Google + Facebook campaign. Emphasize true 0% APR vs. competitor "reduced interest".', recommendedSegment: 'FINANCING_FIRST' },
    { sourcePlatform: 'multi', signalType: 'competitor_complaint', category: 'multi_category', geography: 'Baton Rouge Metro', signalStrength: 0.7, mentionCount: 6, timeWindow: 'last_30_days', summary: 'Rising complaint volume about scheduling delays and communication gaps across multiple local competitors. Opportunity to capture dissatisfied prospects.', recommendedCampaign: 'Launch "We Actually Call You Back" campaign targeting competitor retargeting audiences. Lead with 24-hour callback guarantee.', recommendedSegment: 'TRUST_ANXIOUS' },
    { sourcePlatform: 'nextdoor', signalType: 'recommendation_wave', category: 'siding', geography: 'Prairieville / Ascension Parish', signalStrength: 0.6, mentionCount: 4, timeWindow: 'last_14_days', summary: 'Cluster of siding replacement recommendation requests in Prairieville/Ascension area. Homeowners comparing James Hardie vs vinyl. Price sensitivity moderate.', recommendedCampaign: 'Target Ascension Parish with siding-specific landing page + before/after gallery.', recommendedSegment: 'COMPARISON_SHOPPER' },
  ];

  for (const s of signals) {
    await prisma.localOpportunitySignal.create({ data: s });
  }
  logger.info('[SocialListening] Seeded local opportunity signals');
}

export const socialListeningService = {
  classifyIntent,
  processIntentMention,
  getIntentDashboard,
  seedCompetitorSocialProfiles,
  seedExampleIntentMentions,
  seedLocalOpportunitySignals,
};
