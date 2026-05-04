// ─── Market Intelligence Types ─────────────────────────────────────────────
// All data collection is limited to:
//   1. Lawful public web sources (competitor sites, public reviews, public forums)
//   2. Public social media (public Facebook Pages, public Instagram profiles/posts)
//   3. First-party CRM, analytics, and campaign data
// We do NOT access private browsing histories, private social data, or
// deanonymize users without their lawful consent.

export type ProductScope = 'windows' | 'doors' | 'siding' | 'financing' | 'storm' | 'social' | 'all';
export type SocialPlatform = 'facebook' | 'instagram' | 'youtube';
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface ResearchRunOptions {
  target?: string;
  location?: string;
  competitors?: string[];
  productScopes?: ProductScope[];
  runId?: string;
}

export interface ContentTagResult {
  productFocus: ProductScope;
  sentiment: Sentiment;
  topicTags: string[];
  intentSignals: string[];
  keyQuestions: string[];
  financingMention: boolean;
  stormMention: boolean;
  urgencyHook: boolean;
  creativeTheme?: string;
  actionableNote?: string;
}

export interface BuyerSegment {
  id: string;
  name: string;
  intentSignals: string[];
  recommendedAngle: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const BUYER_SEGMENTS: BuyerSegment[] = [
  {
    id: 'FINANCING_FIRST',
    name: 'Financing-First Buyer',
    intentSignals: ['financing_page', 'payment_calculator', 'monthly_payment', '0_percent'],
    recommendedAngle: 'Lead with 0% financing offer and monthly payment breakdown',
    urgencyLevel: 'MEDIUM',
  },
  {
    id: 'STORM_CLAIMANT',
    name: 'Storm/Insurance Claimant',
    intentSignals: ['storm', 'insurance', 'hail_damage', 'wind_damage', 'claim'],
    recommendedAngle: 'Insurance claim support, urgency for approval window, free storm inspection',
    urgencyLevel: 'HIGH',
  },
  {
    id: 'COMPARISON_SHOPPER',
    name: 'Active Comparison Shopper',
    intentSignals: ['competitor_mention', 'multiple_quotes', 'best_windows', 'reviews_check'],
    recommendedAngle: 'Direct counter-positioning, lifetime warranty proof, reputation evidence',
    urgencyLevel: 'MEDIUM',
  },
  {
    id: 'ENERGY_SEEKER',
    name: 'Energy Efficiency Seeker',
    intentSignals: ['energy_savings', 'utility_bill', 'drafty', 'energy_star', 'r_value'],
    recommendedAngle: 'Energy ROI calculation, payback period, utility savings proof',
    urgencyLevel: 'LOW',
  },
  {
    id: 'AESTHETIC_DRIVEN',
    name: 'Curb Appeal / Aesthetics Driven',
    intentSignals: ['before_after', 'curb_appeal', 'home_value', 'styles', 'colors'],
    recommendedAngle: 'Visual transformation proof, design portfolio, home value increase',
    urgencyLevel: 'LOW',
  },
  {
    id: 'TRUST_ANXIOUS',
    name: 'Trust-Anxious Researcher',
    intentSignals: ['reviews', 'bbb', 'complaints', 'warranty_check', 'how_long_in_business'],
    recommendedAngle: 'Overwhelming social proof, BBB rating, specific warranty language, references',
    urgencyLevel: 'LOW',
  },
  {
    id: 'URGENT_REPLACER',
    name: 'Urgent Replacer',
    intentSignals: ['broken', 'failed_seal', 'foggy', 'wont_open', 'mold', 'leak', 'fast_install'],
    recommendedAngle: 'Fast scheduling availability, problem-solution framing, emergency response',
    urgencyLevel: 'HIGH',
  },
  {
    id: 'PREMIUM_BUYER',
    name: 'Premium Buyer',
    intentSignals: ['andersen', 'pella', 'marvin', 'premium', 'best_quality', 'triple_pane'],
    recommendedAngle: 'Premium product positioning, lifetime value, craftsmanship, prestige',
    urgencyLevel: 'LOW',
  },
  {
    id: 'BUDGET_CONSCIOUS',
    name: 'Budget-Conscious Buyer',
    intentSignals: ['cheap', 'affordable', 'lowest_price', 'discount', 'how_much', 'cost'],
    recommendedAngle: 'Financing payment-per-month framing, value vs. cheap alternatives, total cost of ownership',
    urgencyLevel: 'MEDIUM',
  },
];

export interface IntentScore {
  total: number;          // 0-100
  financingScore: number; // 0-100
  urgencyScore: number;   // 0-100
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  productInterest: string[];
  topSegment: string;
  closeProbability: number; // 0.0-1.0
}

export interface RecommendationOutput {
  likelyInterests: string[];
  likelyObjections: string[];
  urgencyDriver: string;
  financingLikelihood: number;
  closeBlockers: string[];
  recommendedProduct: string;
  recommendedMessage: string;
  nextAction: string;
  followUpSequence: Array<{ day: number; action: string; message: string }>;
  repScript: string;
  facebookAngle: string;
  instagramCreative: string;
  landingPagePath: string;
}

// Known competitors to track (pre-seeded)
export const KNOWN_COMPETITORS = [
  {
    name: 'Window World (Corporate)',
    slug: 'window-world-corporate',
    website: 'https://www.windowworld.com',
    territory: 'national',
  },
  {
    name: 'Pella Windows & Doors',
    slug: 'pella',
    website: 'https://www.pella.com',
    territory: 'national',
  },
  {
    name: 'Andersen Windows',
    slug: 'andersen',
    website: 'https://www.andersenwindows.com',
    territory: 'national',
  },
  {
    name: 'Renewal by Andersen',
    slug: 'renewal-by-andersen',
    website: 'https://www.renewalbyandersen.com',
    territory: 'national',
  },
  {
    name: 'Window Nation',
    slug: 'window-nation',
    website: 'https://www.windownation.com',
    territory: 'regional',
  },
  {
    name: 'Power Home Remodeling',
    slug: 'power-home-remodeling',
    website: 'https://www.powerhrg.com',
    territory: 'regional',
  },
  {
    name: 'Republic Window & Door',
    slug: 'republic-window-door',
    website: 'https://www.republicwindowanddoor.com',
    territory: 'local',
  },
];

// Facebook/Instagram creative themes to track and produce
export const SOCIAL_CREATIVE_THEMES = [
  'before_after',
  'testimonial',
  'seasonal_offer',
  'financing_hook',
  'storm_damage',
  'energy_savings',
  'curb_appeal',
  'product_showcase',
  'community_trust',
  'urgency_limited',
  'family_safety',
  'how_it_works',
] as const;

export type CreativeTheme = typeof SOCIAL_CREATIVE_THEMES[number];
