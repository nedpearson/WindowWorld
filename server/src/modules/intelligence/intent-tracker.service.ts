/**
 * Intent Tracking Service
 * 
 * COMPLIANCE: Tracks ONLY first-party signals from our own website/CRM.
 * - We track page views on OUR site only
 * - We link visitors to CRM only when they identify themselves lawfully
 *   (form fill, call, chat, login, lead source referral)
 * - Anonymous sessions are kept anonymous — no deanonymization
 * - We do NOT access third-party browsing histories
 * - We do NOT access private social platform data
 */

import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';
import { aiService } from '../ai-analysis/ai.service';
import { BUYER_SEGMENTS } from './intelligence.types';
import type { IntentScore, RecommendationOutput } from './intelligence.types';

// ─── Signal Rules ─────────────────────────────────────────────────────────
const PRODUCT_SIGNAL_RULES: Record<string, string> = {
  '/windows': 'windows',
  '/doors': 'doors',
  '/siding': 'siding',
  '/entry-door': 'doors',
  '/patio-door': 'doors',
  '/sliding-door': 'doors',
};

const FINANCING_SIGNAL_URLS = ['/financing', '/payment', '/monthly', '/apply', '/afford'];
const STORM_SIGNAL_URLS = ['/storm', '/insurance', '/claim', '/hail', '/wind-damage'];
const URGENCY_SIGNAL_URLS = ['/emergency', '/urgent', '/same-day', '/fast-install'];
const QUOTE_URLS = ['/free-estimate', '/quote', '/get-started', '/schedule'];

function detectSignals(pageUrl: string): {
  productSignal: string | null;
  financingSignal: boolean;
  stormSignal: boolean;
  urgencySignal: boolean;
  isQuotePage: boolean;
} {
  const url = pageUrl.toLowerCase();
  let productSignal: string | null = null;
  for (const [path, product] of Object.entries(PRODUCT_SIGNAL_RULES)) {
    if (url.includes(path)) { productSignal = product; break; }
  }
  return {
    productSignal,
    financingSignal: FINANCING_SIGNAL_URLS.some(u => url.includes(u)),
    stormSignal: STORM_SIGNAL_URLS.some(u => url.includes(u)),
    urgencySignal: URGENCY_SIGNAL_URLS.some(u => url.includes(u)),
    isQuotePage: QUOTE_URLS.some(u => url.includes(u)),
  };
}

// ─── Track Intent Signal (First-Party Only) ────────────────────────────────
export async function trackIntentSignal(data: {
  signalType: string;
  sessionId?: string;
  leadId?: string;
  pageUrl?: string;
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const signals = data.pageUrl ? detectSignals(data.pageUrl) : {
    productSignal: null,
    financingSignal: false,
    stormSignal: false,
    urgencySignal: false,
    isQuotePage: false,
  };

  await prisma.buyerIntentSignal.create({
    data: {
      signalType: data.signalType,
      sessionId: data.sessionId,
      leadId: data.leadId,
      pageUrl: data.pageUrl,
      productSignal: signals.productSignal,
      financingSignal: signals.financingSignal,
      stormSignal: signals.stormSignal,
      urgencySignal: signals.urgencySignal,
      sourceChannel: data.sourceChannel,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      metadata: data.metadata || {},
    },
  });

  // Update or create anonymous session profile
  if (data.sessionId && !data.leadId) {
    await updateAnonymousProfile(data.sessionId, signals, data.sourceChannel);
  }
}

// ─── Anonymous Profile Updater ────────────────────────────────────────────
async function updateAnonymousProfile(
  sessionId: string,
  signals: ReturnType<typeof detectSignals>,
  sourceChannel?: string,
): Promise<void> {
  const existing = await prisma.anonymousIntentProfile.findUnique({ where: { sessionId } });
  const currentProducts = existing?.productSignals || [];
  const newProducts = signals.productSignal && !currentProducts.includes(signals.productSignal)
    ? [...currentProducts, signals.productSignal]
    : currentProducts;

  const pageViewCount = (existing?.pageViewCount || 0) + 1;
  const financingPageVisit = existing?.financingPageVisit || signals.financingSignal;
  const quotePageVisit = existing?.quotePageVisit || signals.isQuotePage;

  // Determine urgency level
  let urgencyLevel = 'LOW';
  if (signals.urgencySignal || signals.stormSignal) urgencyLevel = 'HIGH';
  else if (financingPageVisit || quotePageVisit || pageViewCount >= 3) urgencyLevel = 'MEDIUM';

  // Classify behavior segment
  const segment = classifySegment({
    financingPageVisit,
    stormSignal: signals.stormSignal,
    quotePageVisit,
    productSignals: newProducts,
    urgencyLevel,
  });

  // Generate retargeting angles
  const retargetingAngles = generateRetargetingAngles(segment, newProducts);

  await prisma.anonymousIntentProfile.upsert({
    where: { sessionId },
    create: {
      sessionId,
      behaviorSegment: segment,
      productSignals: newProducts,
      urgencyLevel,
      pageViewCount,
      financingPageVisit,
      quotePageVisit,
      sourceChannel,
      retargetingAngles,
      lastSeen: new Date(),
    },
    update: {
      behaviorSegment: segment,
      productSignals: newProducts,
      urgencyLevel,
      pageViewCount,
      financingPageVisit,
      quotePageVisit,
      retargetingAngles,
      lastSeen: new Date(),
    },
  });
}

function classifySegment(data: {
  financingPageVisit: boolean;
  stormSignal: boolean;
  quotePageVisit: boolean;
  productSignals: string[];
  urgencyLevel: string;
}): string {
  if (data.stormSignal) return 'STORM_CLAIMANT';
  if (data.financingPageVisit) return 'FINANCING_FIRST';
  if (data.urgencyLevel === 'HIGH') return 'URGENT_REPLACER';
  if (data.quotePageVisit) return 'COMPARISON_SHOPPER';
  if (data.productSignals.length >= 2) return 'COMPARISON_SHOPPER';
  return 'TRUST_ANXIOUS';
}

function generateRetargetingAngles(segment: string, productSignals: string[]): Record<string, string> {
  const products = productSignals.join(', ') || 'windows';
  const angles: Record<string, Record<string, string>> = {
    FINANCING_FIRST: {
      facebook: `Pay as little as $89/mo for new ${products}. 0% financing available — get your free estimate today.`,
      instagram: `New ${products} for less than your phone bill. 🏠 Tap to see our monthly payment options.`,
      google: `Replacement ${products} starting at $89/mo — 0% interest available`,
    },
    STORM_CLAIMANT: {
      facebook: `Storm damage to your ${products}? We work with your insurance — free inspection, no cost to you.`,
      instagram: `⚡ Storm damaged your home? We handle insurance claims for ${products} replacement. Free inspection.`,
      google: `Storm damaged ${products} — insurance claim help available`,
    },
    COMPARISON_SHOPPER: {
      facebook: `Get an honest comparison before you decide. We'll beat any written quote on ${products}.`,
      instagram: `Shopping around? See why 1,000+ Louisiana homeowners chose us for their ${products} replacement.`,
      google: `Best rated ${products} replacement in Louisiana — compare before you buy`,
    },
    URGENT_REPLACER: {
      facebook: `Need ${products} replaced fast? We have same-week installation slots available now.`,
      instagram: `🚨 Emergency ${products} replacement available. Fast scheduling, professional crews. Call now.`,
      google: `Fast ${products} replacement — scheduling available this week`,
    },
    TRUST_ANXIOUS: {
      facebook: `500+ 5-star reviews. A+ BBB. Lifetime warranty. See why Louisiana homeowners trust us for ${products}.`,
      instagram: `⭐⭐⭐⭐⭐ Real homeowners. Real results. See our latest ${products} transformations.`,
      google: `Top rated ${products} company — see 500+ reviews`,
    },
    AESTHETIC_DRIVEN: {
      facebook: `See the difference new ${products} make. Before & after transformations from your neighborhood.`,
      instagram: `✨ Watch the transformation — ${products} that make your neighbors stop and stare.`,
      google: `Beautiful ${products} — see design options and before/after photos`,
    },
  };
  return angles[segment] || angles['TRUST_ANXIOUS'];
}

// ─── Known Lead Intent Score ──────────────────────────────────────────────
export async function scoreKnownLeadIntent(leadId: string): Promise<IntentScore> {
  const signals = await prisma.buyerIntentSignal.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { activities: { take: 20 }, appointments: { take: 5 } },
  });

  if (!lead) return {
    total: 0, financingScore: 0, urgencyScore: 0,
    productInterest: [], topSegment: 'UNKNOWN', closeProbability: 0,
  };

  // Score calculation
  let total = 0;
  let financingScore = 0;
  let urgencyScore = 0;
  const productInterest: string[] = [];

  // Base score from CRM status
  const statusScores: Record<string, number> = {
    NEW_LEAD: 10, ATTEMPTING_CONTACT: 15, CONTACTED: 20, QUALIFIED: 35,
    APPOINTMENT_SET: 50, INSPECTION_COMPLETE: 60, MEASURING_COMPLETE: 70,
    PROPOSAL_SENT: 75, FOLLOW_UP: 65, VERBAL_COMMIT: 85, SOLD: 100,
  };
  total += statusScores[lead.status] || 10;

  // Intent signals
  for (const signal of signals) {
    if (signal.financingSignal) financingScore += 15;
    if (signal.stormSignal) urgencyScore += 20;
    if (signal.urgencySignal) urgencyScore += 15;
    if (signal.signalType === 'quote_start') { total += 20; urgencyScore += 10; }
    if (signal.signalType === 'form_abandon') { total += 5; }
    if (signal.signalType === 'call_click') { total += 15; urgencyScore += 10; }
    if (signal.signalType === 'financing_page') financingScore += 25;
    if (signal.productSignal && !productInterest.includes(signal.productSignal)) {
      productInterest.push(signal.productSignal);
    }
  }

  // Activities
  total += Math.min(lead.activities.length * 3, 20);
  
  // Appointments
  if (lead.appointments.length > 0) { total += 15; urgencyScore += 10; }

  // Lead score from AI analysis
  if (lead.leadScore) total = Math.min(100, total + lead.leadScore * 0.3);

  total = Math.min(100, total);
  financingScore = Math.min(100, financingScore);
  urgencyScore = Math.min(100, urgencyScore);

  // Close probability
  const closeProbability = Math.round(
    (total * 0.5 + urgencyScore * 0.3 + (productInterest.length > 0 ? 20 : 0)) / 100 * 100
  ) / 100;

  // Top segment
  let topSegment = 'COMPARISON_SHOPPER';
  if (urgencyScore > 60) topSegment = 'URGENT_REPLACER';
  else if (financingScore > 50) topSegment = 'FINANCING_FIRST';
  else if (signals.some(s => s.stormSignal)) topSegment = 'STORM_CLAIMANT';

  return {
    total: Math.round(total),
    financingScore: Math.round(financingScore),
    urgencyScore: Math.round(urgencyScore),
    productInterest: productInterest.length > 0 ? productInterest : ['windows'],
    topSegment,
    closeProbability: Math.min(1, closeProbability),
  };
}

// ─── Sales Recommendations ────────────────────────────────────────────────
export async function generateLeadRecommendations(leadId: string): Promise<RecommendationOutput> {
  const intentScore = await scoreKnownLeadIntent(leadId);
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { activities: { take: 10 } },
  });

  const segment = BUYER_SEGMENTS.find(s => s.id === intentScore.topSegment);
  
  const objections = await prisma.objectionPattern.findMany({
    where: { productFocus: { in: [...intentScore.productInterest, 'general'] } },
    take: 5,
    orderBy: { frequency: 'desc' },
  });

  const campaignAngles = await prisma.campaignAngle.findMany({
    where: {
      segmentTarget: intentScore.topSegment,
      productFocus: { in: [...intentScore.productInterest, 'all'] },
    },
    take: 3,
  });

  // Build follow-up sequence based on urgency
  const sequence = buildFollowUpSequence(intentScore.topSegment, intentScore.urgencyLevel);

  return {
    likelyInterests: intentScore.productInterest,
    likelyObjections: objections.map(o => o.objectionText),
    urgencyDriver: segment?.intentSignals[0] || 'general interest',
    financingLikelihood: intentScore.financingScore,
    closeBlockers: objections.slice(0, 3).map(o => o.objectionCategory),
    recommendedProduct: intentScore.productInterest[0] || 'windows',
    recommendedMessage: campaignAngles[0]?.bodyText || segment?.recommendedAngle || 'Schedule a free in-home estimate',
    nextAction: intentScore.urgencyLevel === 'HIGH' ? 'Call within 1 hour' : 'Send personalized email within 24h',
    followUpSequence: sequence,
    repScript: buildRepScript(lead, intentScore, objections),
    facebookAngle: campaignAngles.find(c => c.channel === 'facebook')?.headline || `New ${intentScore.productInterest[0] || 'windows'} — Free Estimate`,
    instagramCreative: campaignAngles.find(c => c.channel === 'instagram')?.visualConcept || 'Before/after transformation photo with financing callout',
    landingPagePath: intentScore.financingScore > 50 ? '/financing' : `/${intentScore.productInterest[0] || 'windows'}`,
  };
}

function buildFollowUpSequence(segment: string, urgency: string) {
  const isHigh = urgency === 'HIGH';
  return [
    { day: 0, action: 'call', message: `Initial contact — mention ${segment === 'FINANCING_FIRST' ? 'financing options' : 'free estimate'}` },
    { day: isHigh ? 1 : 2, action: 'text', message: 'Quick follow-up text with scheduling link' },
    { day: isHigh ? 3 : 5, action: 'email', message: 'Send before/after photos + testimonials' },
    { day: isHigh ? 5 : 10, action: 'call', message: 'Check-in call — address any questions' },
    { day: isHigh ? 7 : 14, action: 'email', message: 'Send financing terms or storm claim guide if relevant' },
    { day: isHigh ? 10 : 21, action: 'text', message: 'Final urgency touch — limited scheduling or offer expiry' },
    { day: isHigh ? 14 : 30, action: 'email', message: 'Long-term nurture — seasonal angle or rate update' },
  ];
}

function buildRepScript(lead: any, score: IntentScore, objections: any[]): string {
  const product = score.productInterest[0] || 'windows';
  const segment = score.topSegment;
  
  const openers: Record<string, string> = {
    FINANCING_FIRST: `"Hi ${lead?.firstName || 'there'}, I noticed you were checking out our financing options — I wanted to reach out personally because we have a 0% offer that's only available for a limited time, and I'd love to walk you through what your monthly payment would actually look like."`,
    STORM_CLAIMANT: `"Hi ${lead?.firstName || 'there'}, I saw that storm season is in full swing in your area — I'm reaching out because we're helping homeowners get their ${product} replacement covered through insurance, and I'd love to do a free inspection to see if your home qualifies."`,
    URGENT_REPLACER: `"Hi ${lead?.firstName || 'there'}, I understand you may need ${product} replaced quickly — I have a crew available this week and I'd love to get you a fast quote so we can get on the schedule before our slots fill up."`,
    COMPARISON_SHOPPER: `"Hi ${lead?.firstName || 'there'}, I know you're probably shopping around and that's smart — I'd love to give you an honest comparison and show you exactly what sets us apart on warranty, installation, and price."`,
    TRUST_ANXIOUS: `"Hi ${lead?.firstName || 'there'}, I wanted to reach out personally — we have over 500 five-star reviews and an A+ BBB rating, and I'd love to share some references from neighbors in your area who chose us for their ${product} replacement."`,
  };

  const opener = openers[segment] || openers.TRUST_ANXIOUS;
  const objectionNote = objections[0] 
    ? `\n\nIf they raise "${objections[0].objectionText}", respond: ${objections[0].responseScript?.substring(0, 200)}`
    : '';

  return `OPENING:\n${opener}\n\nCORE PITCH:\n"Our ${product} come with a lifetime warranty, professional installation by our own crew (not subs), and we're local — so if anything ever needs attention, you can actually reach us. What's driving your interest in replacement ${product} right now?"\n\nLISTEN FOR: timing urgency, financing need, competitor mentions, specific concerns${objectionNote}`;
}

export const intentTracker = {
  trackIntentSignal,
  scoreKnownLeadIntent,
  generateLeadRecommendations,
};
