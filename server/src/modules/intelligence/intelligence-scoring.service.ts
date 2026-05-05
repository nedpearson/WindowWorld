/**
 * Intelligence Scoring Service
 * Converts market intelligence research into live lead scores, persona assignments,
 * and rep-facing recommendations.
 */
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

// ─── Score weights from research ───────────────────────────────────────────
const SIGNAL_WEIGHTS = {
  form_submit: 25,
  call_click: 20,
  quote_page_view: 15,
  financing_page_view: 15,
  product_page_view: 10,
  repeat_visit_2: 10,
  repeat_visit_3plus: 15,
  storm_page_view: 20,
  gallery_page_view: 5,
  blog_page_view: 3,
  referral_source: 15,
  branded_search: 10,
  appointment_set: 25,
  proposal_sent: 20,
  proposal_viewed: 15,
  is_storm_lead: 25,
  mention_urgency: 15,
  mention_insurance: 20,
  decay_30d: -15,
  decay_60d: -25,
  email_unsub: -20,
} as const;

// ─── Persona match rules (priority-ordered, first match wins) ──────────────
const PERSONA_RULES: Array<{
  slug: string;
  name: string;
  match: (ctx: ScoringContext) => boolean;
  pitchAngle: string;
  nextAction: string;
  followUpDays: number;
}> = [
  {
    slug: 'STORM_URGENT',
    name: 'Storm-Damage Urgent Buyer',
    match: (ctx) => ctx.lead.isStormLead || ctx.signals.stormUrgency > 0.7,
    pitchAngle: 'Storm damage coverage — we handle insurance claims for you',
    nextAction: 'Call within 1 hour. Offer free storm inspection. Lead with insurance handling.',
    followUpDays: 1,
  },
  {
    slug: 'FINANCING_FIRST',
    name: 'Financing-First Buyer',
    match: (ctx) => ctx.signals.financingPropensity > 0.6,
    pitchAngle: '$89/month, 0% interest, $0 down — less than your phone bill',
    nextAction: 'Call now. Lead with monthly payment. NEVER say total price first.',
    followUpDays: 2,
  },
  {
    slug: 'PREMIUM_BUYER',
    name: 'Premium Quality Buyer',
    match: (ctx) => ctx.signals.premiumIntent > 0.5,
    pitchAngle: 'Highest-quality products with lifetime warranty — superior to Pella/Andersen specs',
    nextAction: 'Schedule showroom visit. Emphasize specs, materials, warranty superiority.',
    followUpDays: 3,
  },
  {
    slug: 'COMPARISON_SHOPPER',
    name: 'Comparison Shopper',
    match: (ctx) => !!ctx.lead.competitorMentioned || !!ctx.lead.lostToCompetitor,
    pitchAngle: 'Compare apples to apples — our specs and warranty beat the competition',
    nextAction: 'Send comparison checklist. Differentiate on warranty, own crews, itemized quote.',
    followUpDays: 2,
  },
  {
    slug: 'TRUST_ANXIOUS',
    name: 'Trust-Sensitive Researcher',
    match: (ctx) => ctx.signals.trustConcern > 0.5,
    pitchAngle: '500+ five-star reviews, A+ BBB, lifetime warranty — here are neighbor references',
    nextAction: 'Offer personal cell number and 3 local references. Send warranty doc to review.',
    followUpDays: 5,
  },
  {
    slug: 'CURB_APPEAL',
    name: 'Curb-Appeal Upgrader',
    match: (ctx) => ctx.signals.productDoors > 0.5 && ctx.signals.productWindows < 0.3,
    pitchAngle: 'Entry doors have the highest ROI of any exterior project — 60-80% resale return',
    nextAction: 'Show local before/after photo portfolio. Emphasize transformation and home value.',
    followUpDays: 3,
  },
  {
    slug: 'ENERGY_SEEKER',
    name: 'Energy-Efficiency Seeker',
    match: (ctx) => ctx.signals.productWindows > 0.5 && ctx.signals.budgetSensitivity > 0.3,
    pitchAngle: 'Honest: 10-15% energy savings + comfort + federal tax credit up to $600/year',
    nextAction: 'Be honest about savings range. Lead with comfort benefits and tax credit.',
    followUpDays: 3,
  },
  {
    slug: 'URGENT_REPLACER',
    name: 'Urgent Replacer',
    match: (ctx) => ctx.signals.urgency > 0.7,
    pitchAngle: 'We have crews available this week — let\'s get you measured today',
    nextAction: 'Offer same-week measurement. Emphasize fast turnaround and scheduling availability.',
    followUpDays: 1,
  },
];

interface ScoringContext {
  lead: any;
  events: any[];
  signals: {
    financingPropensity: number;
    productWindows: number;
    productDoors: number;
    productSiding: number;
    stormUrgency: number;
    premiumIntent: number;
    budgetSensitivity: number;
    trustConcern: number;
    urgency: number;
  };
}

// ─── Main scoring function ─────────────────────────────────────────────────
export async function scoreLeadWithIntelligence(leadId: string): Promise<any> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      intentEvents: { orderBy: { createdAt: 'desc' }, take: 100 },
      appointments: { select: { id: true, status: true } },
      proposals: { select: { id: true, status: true } },
      properties: { select: { yearBuilt: true, stormExposure: true, estimatedWindowCount: true } },
    },
  });

  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const events = lead.intentEvents || [];

  // ── Calculate signal scores ──
  const signals = calculateSignals(lead, events);

  // ── Calculate total score ──
  let totalScore = 0;

  // Behavioral event scores
  for (const evt of events) {
    totalScore += evt.score || 0;
  }

  // Source bonuses
  if (lead.source === 'referral') totalScore += SIGNAL_WEIGHTS.referral_source;
  if (lead.source === 'branded-search') totalScore += SIGNAL_WEIGHTS.branded_search;
  if (lead.isStormLead) totalScore += SIGNAL_WEIGHTS.is_storm_lead;

  // Stage bonuses
  if (lead.appointments?.length > 0) totalScore += SIGNAL_WEIGHTS.appointment_set;
  if (lead.proposals?.length > 0) totalScore += SIGNAL_WEIGHTS.proposal_sent;

  // Decay
  const daysSinceUpdate = lead.lastContactedAt
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000)
    : Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);

  if (daysSinceUpdate >= 60) totalScore += SIGNAL_WEIGHTS.decay_60d;
  else if (daysSinceUpdate >= 30) totalScore += SIGNAL_WEIGHTS.decay_30d;

  // Clamp 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  // ── Urgency score ──
  let urgency = 0;
  if (lead.isStormLead) urgency += 30;
  if (signals.urgency > 0.5) urgency += 25;
  if (signals.financingPropensity > 0.6) urgency += 15;
  if (daysSinceUpdate > 7 && totalScore > 40) urgency += 20; // hot lead going cold
  urgency = Math.min(100, urgency);

  // ── Close probability ──
  const closeProbability = Math.min(1.0, Math.max(0, totalScore / 100 * 0.8 + (lead.source === 'referral' ? 0.15 : 0)));

  // ── Persona assignment ──
  const ctx: ScoringContext = { lead, events, signals };
  const matchedPersona = PERSONA_RULES.find((p) => p.match(ctx)) || {
    slug: 'GENERAL_SHOPPER',
    name: 'General Shopper',
    pitchAngle: 'Quality windows, doors, and siding — installed by our local crew with lifetime warranty',
    nextAction: 'Discovery call to identify primary needs and timeline.',
    followUpDays: 3,
  };

  // ── Top likely objections ──
  const likelyObjections = predictObjections(signals, lead);

  // ── Persist score ──
  const scoreRecord = await prisma.leadScore.create({
    data: {
      leadId,
      totalScore,
      urgencyScore: urgency,
      closeProbability,
      financingPropensityScore: signals.financingPropensity,
      productWindowsScore: signals.productWindows,
      productDoorsScore: signals.productDoors,
      productSidingScore: signals.productSiding,
      stormUrgencyScore: signals.stormUrgency,
      premiumIntentScore: signals.premiumIntent,
      budgetSensitivityScore: signals.budgetSensitivity,
      trustConcernScore: signals.trustConcern,
      assignedPersona: matchedPersona.slug,
      personaConfidence: 0.75,
      recommendedTalkTrack: matchedPersona.pitchAngle,
      recommendedOffer: matchedPersona.slug === 'FINANCING_FIRST' ? '$0 down, 0% APR, $89/mo' : undefined,
      likelyObjections,
      competitorContext: lead.competitorMentioned || undefined,
      confidenceScore: 0.75,
      scoredBy: 'intelligence-engine',
      rationale: `Persona: ${matchedPersona.name}. ${matchedPersona.nextAction}`,
    },
  });

  // ── Sync key fields to Lead row for fast querying ──
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: totalScore,
      urgencyScore: urgency,
      closeProbability,
      financingPropensity: signals.financingPropensity,
      productInterestWindows: signals.productWindows,
      productInterestDoors: signals.productDoors,
      productInterestSiding: signals.productSiding,
      premiumIntent: signals.premiumIntent,
      budgetSensitivity: signals.budgetSensitivity,
      trustConcernLevel: signals.trustConcern,
      assignedPersona: matchedPersona.slug,
      personaConfidence: 0.75,
      recommendedPitchAngle: matchedPersona.pitchAngle,
      recommendedNextAction: matchedPersona.nextAction,
      recommendedFollowUpDays: matchedPersona.followUpDays,
      intentLastUpdated: new Date(),
    },
  });

  logger.info(`[IntelligenceScoring] Lead ${leadId} scored: ${totalScore}/100, persona=${matchedPersona.slug}`);
  return scoreRecord;
}

// ─── Signal calculation ────────────────────────────────────────────────────
function calculateSignals(lead: any, events: any[]) {
  const financingEvents = events.filter((e) => {
    const data = e.eventData as any;
    return e.eventType === 'page_view' && data?.page?.includes('financing');
  });
  const windowEvents = events.filter((e) => {
    const data = e.eventData as any;
    return e.eventType === 'page_view' && data?.page?.includes('window');
  });
  const doorEvents = events.filter((e) => {
    const data = e.eventData as any;
    return e.eventType === 'page_view' && data?.page?.includes('door');
  });
  const sidingEvents = events.filter((e) => {
    const data = e.eventData as any;
    return e.eventType === 'page_view' && data?.page?.includes('siding');
  });
  const stormEvents = events.filter((e) => {
    const data = e.eventData as any;
    return e.eventType === 'page_view' && data?.page?.includes('storm');
  });

  return {
    financingPropensity: Math.min(1.0, financingEvents.length * 0.3 + (lead.financingPropensity || 0)),
    productWindows: Math.min(1.0, windowEvents.length * 0.2 + (lead.productInterestWindows || 0)),
    productDoors: Math.min(1.0, doorEvents.length * 0.2 + (lead.productInterestDoors || 0)),
    productSiding: Math.min(1.0, sidingEvents.length * 0.2 + (lead.productInterestSiding || 0)),
    stormUrgency: Math.min(1.0, stormEvents.length * 0.3 + (lead.isStormLead ? 0.5 : 0)),
    premiumIntent: lead.premiumIntent || 0,
    budgetSensitivity: lead.budgetSensitivity || (financingEvents.length > 2 ? 0.6 : 0),
    trustConcern: lead.trustConcernLevel || 0,
    urgency: Math.min(1.0, (lead.isStormLead ? 0.5 : 0) + (lead.urgencyScore ? lead.urgencyScore / 100 : 0)),
  };
}

// ─── Objection prediction ──────────────────────────────────────────────────
function predictObjections(signals: ScoringContext['signals'], lead: any): string[] {
  const objections: string[] = [];
  if (signals.budgetSensitivity > 0.4 || signals.financingPropensity > 0.5) {
    objections.push('That price is too high / too expensive');
  }
  if (!lead.competitorMentioned) {
    objections.push('I need to get other quotes first');
  }
  objections.push('I need to think about it / talk to my spouse');
  if (signals.trustConcern > 0.4) {
    objections.push("I'm worried you'll disappear after the install");
  }
  if (lead.competitorMentioned?.toLowerCase().includes('andersen')) {
    objections.push('I heard Renewal by Andersen is better quality');
  }
  return objections.slice(0, 4);
}

// ─── Record intent event ──────────────────────────────────────────────────
export async function recordIntentEvent(data: {
  leadId: string;
  eventType: string;
  eventData?: any;
  channel?: string;
}): Promise<void> {
  const scoreMap: Record<string, number> = {
    form_submit: 25,
    call_click: 20,
    quote_page_view: 15,
    financing_page_view: 15,
    product_page_view: 10,
    storm_page_view: 20,
    gallery_page_view: 5,
    blog_page_view: 3,
    chat_start: 10,
    proposal_viewed: 15,
  };

  await prisma.leadIntentEvent.create({
    data: {
      leadId: data.leadId,
      eventType: data.eventType,
      eventData: data.eventData || undefined,
      channel: data.channel,
      score: scoreMap[data.eventType] || 5,
    },
  });
}

// ─── Get lead intelligence summary (for rep-facing panel) ─────────────────
export async function getLeadIntelligence(leadId: string) {
  const [lead, latestScore, events, objections] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true, assignedPersona: true, personaConfidence: true,
        leadScore: true, urgencyScore: true, closeProbability: true,
        financingPropensity: true, productInterestWindows: true,
        productInterestDoors: true, productInterestSiding: true,
        premiumIntent: true, budgetSensitivity: true, trustConcernLevel: true,
        recommendedPitchAngle: true, recommendedNextAction: true,
        recommendedFollowUpDays: true, competitorMentioned: true,
        intentLastUpdated: true, isStormLead: true, source: true,
      },
    }),
    prisma.leadScore.findFirst({
      where: { leadId },
      orderBy: { scoredAt: 'desc' },
    }),
    prisma.leadIntentEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.objectionPattern.findMany({
      orderBy: { frequency: 'desc' },
      take: 10,
    }),
  ]);

  if (!lead) return null;

  // Match objection scripts to predicted objections
  const predictedObjTexts = latestScore?.likelyObjections || [];
  const matchedObjections = predictedObjTexts
    .map((text: string) => objections.find((o) => o.objectionText === text))
    .filter(Boolean);

  // Get persona definition if assigned
  let persona = null;
  if (lead.assignedPersona) {
    persona = await prisma.personaDefinition.findFirst({
      where: { slug: lead.assignedPersona, isActive: true },
    });
  }

  // Get battlecard if competitor mentioned
  let battlecard = null;
  if (lead.competitorMentioned) {
    battlecard = await prisma.battlecard.findFirst({
      where: {
        competitorId: { not: undefined },
        competitor: { name: { contains: lead.competitorMentioned, mode: 'insensitive' } },
      },
      include: { competitor: { select: { name: true } } },
    });
  }

  return {
    lead,
    latestScore,
    persona,
    matchedObjections,
    battlecard,
    recentEvents: events,
    scoreClassification: classifyScore(lead.leadScore || 0),
  };
}

function classifyScore(score: number): { label: string; color: string; action: string } {
  if (score >= 81) return { label: 'URGENT', color: 'red', action: 'Call within 5 minutes' };
  if (score >= 61) return { label: 'VERY HOT', color: 'orange', action: 'Call within 1 hour' };
  if (score >= 41) return { label: 'HOT', color: 'yellow', action: 'Call within 4 hours' };
  if (score >= 21) return { label: 'WARM', color: 'blue', action: 'Text + email within 24 hours' };
  return { label: 'COLD', color: 'gray', action: 'Nurture email sequence' };
}

// ─── Seed persona definitions ─────────────────────────────────────────────
export async function seedPersonaDefinitions(): Promise<void> {
  const personas = [
    {
      slug: 'FINANCING_FIRST', name: 'Financing-First Buyer', priority: 90,
      description: 'Homeowner who WANTS to replace but is price-constrained. Monthly payment is the decision lever.',
      matchRules: { financingPropensity: { min: 0.6 } },
      talkTrack: 'Before we talk about total cost, let me ask — would it be helpful to know your monthly payment first? Most of our homeowners are surprised that new windows cost less per month than their streaming subscriptions.',
      openingScript: 'Hi [Name], this is [Rep] with Window World of Baton Rouge. I wanted to reach out because you expressed interest in replacement windows. Before anything else — would it help to know what your monthly payment would look like? Most homeowners are surprised.',
      discoveryQuestions: ['What rooms are you most concerned about?', 'Have you looked into financing options before?', 'What would a comfortable monthly payment look like for you?'],
      financingLanguage: 'New windows for $89/month — 0% interest, $0 down. Less than your streaming subscriptions. No prepayment penalties.',
      objectionHandling: 'When they say "too expensive": "I understand — is it the total cost or the monthly that feels high? At $89/month with 0% interest, most homeowners are surprised how affordable it is."',
      closeLanguage: 'What if I could get you new windows for less than $3/day? Let me check our financing options for your specific situation.',
      recommendedOffer: '$0 down, 0% APR, $89/mo',
      recommendedLanding: '/financing',
      recommendedAdAngle: 'Monthly payment front and center + before/after',
      followUpCadenceDays: [0, 2, 5, 10, 14, 21, 30],
      followUpChannels: ['call', 'text', 'email', 'call', 'email', 'text', 'email'],
    },
    {
      slug: 'STORM_URGENT', name: 'Storm-Damage Urgent Buyer', priority: 100,
      description: 'Homeowner with active storm damage needing immediate resolution. Insurance is expected to pay.',
      matchRules: { isStormLead: true, stormUrgency: { min: 0.7 } },
      talkTrack: 'I understand you are dealing with storm damage. Let me take this stress off your plate. Here is exactly how the insurance process works, and we handle ALL of it.',
      openingScript: 'Hi [Name], this is [Rep] with Window World. I understand your home took some damage in the recent storm. I want you to know — we handle the entire insurance process for you. Free inspection, free documentation, and we coordinate directly with your adjuster.',
      discoveryQuestions: ['When did the damage occur?', 'Have you filed an insurance claim yet?', 'Is the damage causing any immediate safety issues?'],
      financingLanguage: 'If your damage is covered by insurance, there is typically no out-of-pocket cost to you.',
      objectionHandling: 'When they worry about insurance: "We handle the entire process — inspection, documentation, adjuster coordination, and paperwork. If it is covered, there is no cost to you. If not, you have lost nothing."',
      closeLanguage: 'Let me schedule a free storm inspection this week. We will document everything and handle the insurance process.',
      recommendedOffer: 'Free Storm Damage Inspection',
      recommendedLanding: '/storm-damage',
      recommendedAdAngle: 'Storm imagery → clean new install + insurance handling',
      followUpCadenceDays: [0, 1, 2, 3, 5, 7],
      followUpChannels: ['call', 'text', 'call', 'text', 'call', 'call'],
    },
    {
      slug: 'COMPARISON_SHOPPER', name: 'Comparison Shopper', priority: 70,
      description: 'Methodical researcher getting 3-5 quotes, reading Reddit, checking BBB.',
      matchRules: { competitorMentioned: { exists: true } },
      talkTrack: 'I know you are doing your homework and that is smart. Let me help you compare apples to apples. Here is what to look for in other quotes: warranty terms, whether they use their own crews or subs, and whether the quote is itemized.',
      openingScript: 'Hi [Name], this is [Rep] with Window World. I encourage you to compare — that is the smart thing to do. I would like to give you a comparison checklist so you can make sure you are comparing apples to apples across all your quotes.',
      discoveryQuestions: ['How many quotes have you gotten so far?', 'What aspects matter most to you — price, warranty, or installation quality?', 'Has any company given you an itemized breakdown?'],
      financingLanguage: 'We offer competitive financing, but let me first show you how our specs compare. Price is only one part of the equation.',
      objectionHandling: 'When they need other quotes: "Absolutely — here is a comparison checklist: check warranty terms, whether they use subs or their own crews, and whether the quote is itemized. Call me when you have your quotes and I will walk through them with you."',
      closeLanguage: 'If our quality and warranty provide the best value, is there anything else holding you back?',
      recommendedOffer: 'Free Comparison Guide',
      recommendedLanding: '/compare',
      recommendedAdAngle: 'Compare before you buy + warranty chart',
      followUpCadenceDays: [0, 2, 5, 10, 14, 21, 30],
      followUpChannels: ['call', 'email', 'text', 'call', 'email', 'text', 'email'],
    },
    {
      slug: 'TRUST_ANXIOUS', name: 'Trust-Sensitive Researcher', priority: 65,
      description: 'Burned by a past contractor or terrified of making a bad decision.',
      matchRules: { trustConcern: { min: 0.5 } },
      talkTrack: 'I understand the hesitation. Let me give you three things: my personal cell phone number, the names of three homeowners in your zip code you can call, and our warranty document to take home.',
      openingScript: 'Hi [Name], I know choosing a home improvement company is a big decision and trust matters. Let me start by giving you my personal cell number so you can reach me anytime.',
      discoveryQuestions: ['Have you had work done on your home before?', 'What concerns you most about this process?', 'Would it help to talk to a recent customer in your area?'],
      financingLanguage: 'Standard financing options — no surprises, no hidden fees.',
      objectionHandling: 'When they worry you will disappear: "That is the #1 complaint about our industry. Here is my personal cell. Here are 3 neighbors who chose us. Our warranty is lifetime. We do not disappear."',
      closeLanguage: 'Would talking to a recent customer in your area help put your mind at ease?',
      recommendedOffer: '500+ Reviews + BBB A+ + Lifetime Warranty',
      recommendedLanding: '/reviews',
      recommendedAdAngle: 'Customer testimonial video + review count',
      followUpCadenceDays: [0, 3, 7, 14, 21, 30],
      followUpChannels: ['call', 'email', 'text', 'email', 'call', 'email'],
    },
    {
      slug: 'PREMIUM_BUYER', name: 'Premium Quality Buyer', priority: 60,
      description: 'Wants the BEST, willing to pay for it. Comparing Andersen/Pella/Marvin.',
      matchRules: { premiumIntent: { min: 0.5 } },
      talkTrack: 'Our premium line matches or exceeds Pella Architect Series and Andersen 400 specs — with a lifetime warranty they cannot match. Let me show you the specifications side by side.',
      openingScript: 'Hi [Name], I see you are looking for the highest-quality options. Let me show you how our premium products compare spec-for-spec against what you might be considering.',
      discoveryQuestions: ['What is most important to you — energy efficiency, aesthetics, or longevity?', 'Have you visited any showrooms yet?', 'Are there specific features you are looking for?'],
      financingLanguage: 'We have flexible financing to make premium products accessible.',
      objectionHandling: 'When they ask if it is the best: "Let me show you the manufacturer specs. Our premium vinyl and fiberglass lines match or exceed Pella and Andersen — with a lifetime warranty."',
      closeLanguage: 'I have availability for a showroom visit this week. Would you like to see these products in person?',
      recommendedOffer: 'Premium Showroom Appointment',
      recommendedLanding: '/premium',
      recommendedAdAngle: 'Quality specs + warranty superiority',
      followUpCadenceDays: [0, 3, 7, 14, 21],
      followUpChannels: ['call', 'email', 'call', 'email', 'call'],
    },
  ];

  for (const p of personas) {
    const exists = await prisma.personaDefinition.findFirst({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.personaDefinition.create({ data: p as any });
    }
  }
  logger.info(`[Intelligence] Seeded ${personas.length} persona definitions`);
}

export const intelligenceScoringService = {
  scoreLeadWithIntelligence,
  recordIntentEvent,
  getLeadIntelligence,
  seedPersonaDefinitions,
};
