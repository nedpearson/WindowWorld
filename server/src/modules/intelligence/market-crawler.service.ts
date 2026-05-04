/**
 * Market Intelligence Crawler Service
 * 
 * COMPLIANCE: Only accesses publicly available web content.
 * - Public competitor websites (product, financing, FAQ pages)
 * - Public search result snippets (DuckDuckGo)
 * - Public review platforms (visible without login)
 * - Public forum threads (Reddit public posts)
 * - Public Facebook Pages and posts
 * - Public Instagram business profiles and posts
 * 
 * Does NOT access: private user data, private search histories,
 * private social profiles, or any non-consensual third-party tracking.
 */

import { aiService } from '../ai-analysis/ai.service';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';
import type { ContentTagResult, ProductScope } from './intelligence.types';

// ─── Helper: Fetch Public URL ─────────────────────────────────────────────
async function fetchPublicPage(url: string, timeoutMs = 12000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarketResearchBot/1.0; +https://windowworld.bridgebox.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timer);
    if (!response.ok) return '';
    const text = await response.text();
    // Strip HTML tags, collapse whitespace, limit length
    return text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);
  } catch {
    return '';
  }
}

// ─── DuckDuckGo Public Search ─────────────────────────────────────────────
async function searchPublicWeb(query: string): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const html = await fetchPublicPage(url);
    const snippets: string[] = [];
    const snippetRegex = /class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /class="result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = snippetRegex.exec(html)) !== null) {
      const clean = m[1].replace(/<[^>]+>/g, '').trim();
      if (clean.length > 20) snippets.push(clean);
    }
    while ((m = titleRegex.exec(html)) !== null) {
      const clean = m[1].replace(/<[^>]+>/g, '').trim();
      if (clean.length > 10) snippets.push(`[TITLE] ${clean}`);
    }
    return snippets.slice(0, 30);
  } catch (e) {
    logger.warn('[Crawler] DuckDuckGo search failed:', e);
    return [];
  }
}

// ─── AI Content Tagger ────────────────────────────────────────────────────
async function tagContent(content: string, context: string): Promise<ContentTagResult> {
  const prompt = `You are a market intelligence analyst for a replacement window, door, and siding company in Louisiana.

Analyze this content and extract structured intelligence. Return ONLY valid JSON.

Context: ${context}
Content: ${content.substring(0, 6000)}

Return JSON with this exact structure:
{
  "productFocus": "windows|doors|siding|financing|storm|all",
  "sentiment": "positive|negative|neutral|mixed",
  "topicTags": ["installation", "warranty", "price", "trust", "scheduling", "communication", "quality", "energy", "curb_appeal"],
  "intentSignals": ["financing", "urgency", "comparison", "storm", "insurance", "energy_savings"],
  "keyQuestions": ["list of actual questions buyers are asking"],
  "financingMention": true|false,
  "stormMention": true|false,
  "urgencyHook": true|false,
  "creativeTheme": "before_after|testimonial|offer|seasonal|product|story|urgency|null",
  "actionableNote": "one sentence on what sales opportunity this represents"
}`;

  try {
    const raw = await aiService.generateText(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(json);
  } catch {
    return {
      productFocus: 'all',
      sentiment: 'neutral',
      topicTags: [],
      intentSignals: [],
      keyQuestions: [],
      financingMention: false,
      stormMention: false,
      urgencyHook: false,
      actionableNote: undefined,
    };
  }
}

// ─── Competitor Page Scraper ──────────────────────────────────────────────
export async function scrapeCompetitorPages(competitorId: string): Promise<number> {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: { pages: { take: 1 } },
  });
  if (!competitor?.website) return 0;

  const pageTypes = [
    { path: '', type: 'home' },
    { path: '/windows', type: 'product' },
    { path: '/doors', type: 'product' },
    { path: '/siding', type: 'product' },
    { path: '/financing', type: 'financing' },
    { path: '/about', type: 'about' },
    { path: '/reviews', type: 'reviews' },
    { path: '/free-estimate', type: 'quote' },
    { path: '/faq', type: 'faq' },
  ];

  let scraped = 0;
  for (const { path, type } of pageTypes) {
    const url = `${competitor.website.replace(/\/$/, '')}${path}`;
    const content = await fetchPublicPage(url);
    if (!content || content.length < 100) continue;

    // Extract key messages using AI
    const tagResult = await tagContent(content, `${competitor.name} ${type} page`);
    
    // Extract specific fields
    const financingMatch = content.match(/\d+\s*%?\s*(?:APR|interest|financing|months?|for\s+\d+\s+months?)/i);
    const warrantyMatch = content.match(/(?:lifetime|limited|year|limited lifetime)\s*warrant(?:y|ied)/i);
    const ctaMatch = content.match(/(?:get|request|schedule|free)\s+(?:a\s+)?(?:free\s+)?(?:estimate|quote|consultation|inspection)/i);

    await prisma.competitorPage.upsert({
      where: { id: `${competitorId}-${type}-${path}` },
      create: {
        id: `${competitorId}-${type}-${path}`,
        competitorId,
        url,
        pageType: type,
        contentText: content.substring(0, 5000),
        keyMessages: tagResult.topicTags,
        ctaText: ctaMatch?.[0] || null,
        financingOffer: financingMatch?.[0] || null,
        warrantyClaimText: warrantyMatch?.[0] || null,
        lastFetched: new Date(),
      },
      update: {
        contentText: content.substring(0, 5000),
        keyMessages: tagResult.topicTags,
        ctaText: ctaMatch?.[0] || null,
        financingOffer: financingMatch?.[0] || null,
        warrantyClaimText: warrantyMatch?.[0] || null,
        lastFetched: new Date(),
      },
    });
    scraped++;
    // Rate-limit: be a polite crawler
    await new Promise(r => setTimeout(r, 1500));
  }

  await prisma.competitor.update({
    where: { id: competitorId },
    data: { lastScrapedAt: new Date() },
  });

  return scraped;
}

// ─── Public Review Intelligence ───────────────────────────────────────────
// Collects publicly visible review snippets via DuckDuckGo search
// (Reviews visible to any anonymous visitor without login)
export async function collectPublicReviews(
  competitorId: string,
  competitorName: string,
): Promise<number> {
  const queries = [
    `"${competitorName}" reviews windows installation quality`,
    `"${competitorName}" complaints warranty customer service`,
    `"${competitorName}" Google reviews windows doors`,
    `site:bbb.org "${competitorName}"`,
    `site:houzz.com "${competitorName}" review`,
  ];

  let saved = 0;
  for (const query of queries) {
    const snippets = await searchPublicWeb(query);
    for (const snippet of snippets.slice(0, 5)) {
      const tags = await tagContent(snippet, `review/complaint about ${competitorName}`);
      await prisma.reviewInsight.create({
        data: {
          competitorId,
          source: 'search_snippet',
          reviewText: snippet,
          sentiment: tags.sentiment,
          topicTags: tags.topicTags,
          productMentioned: tags.productFocus === 'all' ? null : tags.productFocus,
        },
      });
      saved++;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return saved;
}

// ─── Public Forum Research ────────────────────────────────────────────────
// Searches public Reddit/forum discussions about windows, doors, siding
// Only public posts — no private data, no scraping beyond search snippets
export async function collectForumInsights(location: string): Promise<number> {
  const queries = [
    `site:reddit.com replacement windows Louisiana homeowner`,
    `site:reddit.com replacement windows financing cost`,
    `site:reddit.com windows doors siding contractor reviews`,
    `"replacement windows" "Baton Rouge" OR "Louisiana" forum`,
    `"window replacement" homeowner forum financing insurance`,
    `"best replacement windows" 2024 reviews reddit`,
    `"siding replacement" cost financing reviews forum`,
    `"entry door replacement" homeowner forum advice`,
    `"patio door" replacement cost reviews forum`,
    `reddit.com windows doors siding storm damage insurance claim`,
  ];

  let saved = 0;
  for (const query of queries) {
    const snippets = await searchPublicWeb(query);
    if (snippets.length === 0) continue;
    
    const combined = snippets.join('\n\n');
    const tags = await tagContent(combined, `public forum discussion: windows/doors/siding in ${location}`);

    await prisma.forumThreadInsight.create({
      data: {
        source: query.includes('reddit') ? 'reddit' : 'general_forum',
        threadTitle: `Research: ${query.substring(0, 80)}`,
        threadContent: combined.substring(0, 4000),
        sentiment: tags.sentiment,
        topicTags: tags.topicTags,
        productFocus: tags.productFocus === 'all' ? null : tags.productFocus,
        intentSignals: tags.intentSignals,
        keyQuestions: tags.keyQuestions,
        competitorMentions: [],
      },
    });
    saved++;
    await new Promise(r => setTimeout(r, 1200));
  }
  return saved;
}

// ─── Public Social Intelligence ───────────────────────────────────────────
// Analyzes publicly visible Facebook Pages and Instagram business profiles
// using search engine snippets (public content only).
// We do NOT access private accounts, private posts, private messages,
// or any platform API data without proper authorization.
export async function collectPublicSocialInsights(competitors: Array<{ id: string; name: string }>): Promise<number> {
  let saved = 0;

  // Facebook public page analysis via search
  for (const comp of competitors) {
    const fbQueries = [
      `site:facebook.com "${comp.name}" windows replacement`,
      `"${comp.name}" facebook windows doors before after`,
      `"${comp.name}" facebook financing offer windows`,
    ];

    for (const query of fbQueries) {
      const snippets = await searchPublicWeb(query);
      if (snippets.length === 0) continue;
      
      const combined = snippets.join('\n');
      const tags = await tagContent(combined, `public Facebook content for ${comp.name}`);

      await prisma.competitorSocialPost.create({
        data: {
          competitorId: comp.id,
          platform: 'facebook',
          postType: 'text',
          caption: combined.substring(0, 2000),
          hashtags: [],
          creativeTheme: tags.creativeTheme || null,
          productFocus: tags.productFocus === 'all' ? null : tags.productFocus,
          financingMention: tags.financingMention,
          stormMention: tags.stormMention,
          urgencyHook: tags.urgencyHook,
          publicCommentInsights: tags.keyQuestions,
        },
      });
      saved++;
      await new Promise(r => setTimeout(r, 1000));
    }

    // Instagram public profile analysis via search
    const igQueries = [
      `site:instagram.com "${comp.name}" windows replacement`,
      `"${comp.name}" instagram before after windows`,
    ];

    for (const query of igQueries) {
      const snippets = await searchPublicWeb(query);
      if (snippets.length === 0) continue;
      
      const combined = snippets.join('\n');
      const tags = await tagContent(combined, `public Instagram content for ${comp.name}`);

      await prisma.competitorSocialPost.create({
        data: {
          competitorId: comp.id,
          platform: 'instagram',
          postType: 'photo',
          caption: combined.substring(0, 2000),
          hashtags: [],
          creativeTheme: tags.creativeTheme || null,
          productFocus: tags.productFocus === 'all' ? null : tags.productFocus,
          financingMention: tags.financingMention,
          stormMention: tags.stormMention,
          urgencyHook: tags.urgencyHook,
        },
      });
      saved++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // General industry social pattern research
  const industryQueries = [
    `instagram "replacement windows" before after transformation homeowner`,
    `facebook "window replacement" financing offer homeowner testimonial`,
    `instagram "#windowreplacement" OR "#newwindows" homeowner before after`,
    `facebook "door replacement" before after curb appeal transformation`,
    `instagram "#sidingreplacement" before after home exterior transformation`,
  ];

  for (const query of industryQueries) {
    const snippets = await searchPublicWeb(query);
    if (snippets.length === 0) continue;
    
    const combined = snippets.join('\n');
    const platform = query.toLowerCase().includes('instagram') ? 'instagram' : 'facebook';
    const tags = await tagContent(combined, `industry ${platform} content patterns`);

    await prisma.socialCreativePattern.create({
      data: {
        platform,
        creativeTheme: tags.creativeTheme || 'before_after',
        productFocus: tags.productFocus === 'all' ? 'general' : (tags.productFocus as string),
        captionStyle: tags.urgencyHook ? 'urgency' : tags.financingMention ? 'informational' : 'emotional',
        visualDescription: combined.substring(0, 1000),
        hookExample: snippets[0]?.substring(0, 200) || null,
        recommendationLevel: 'medium',
      },
    });
    saved++;
    await new Promise(r => setTimeout(r, 1000));
  }

  return saved;
}

// ─── Topic Cluster Builder ────────────────────────────────────────────────
export async function buildTopicClusters(): Promise<number> {
  // Aggregate all collected intelligence into topic clusters
  const reviews = await prisma.reviewInsight.findMany({ take: 200 });
  const forums = await prisma.forumThreadInsight.findMany({ take: 100 });
  const pages = await prisma.competitorPage.findMany({ take: 100 });

  const allTags: Record<string, { count: number; sentiment: number[]; products: string[] }> = {};

  for (const r of reviews) {
    for (const tag of r.topicTags) {
      if (!allTags[tag]) allTags[tag] = { count: 0, sentiment: [], products: [] };
      allTags[tag].count++;
      allTags[tag].sentiment.push(r.sentiment === 'positive' ? 1 : r.sentiment === 'negative' ? -1 : 0);
      if (r.productMentioned) allTags[tag].products.push(r.productMentioned);
    }
  }

  for (const f of forums) {
    for (const tag of f.topicTags) {
      if (!allTags[tag]) allTags[tag] = { count: 0, sentiment: [], products: [] };
      allTags[tag].count++;
      allTags[tag].sentiment.push(f.sentiment === 'positive' ? 1 : f.sentiment === 'negative' ? -1 : 0);
      if (f.productFocus) allTags[tag].products.push(f.productFocus);
    }
  }

  let saved = 0;
  for (const [tag, data] of Object.entries(allTags)) {
    if (data.count < 2) continue;
    const avgSentiment = data.sentiment.reduce((a, b) => a + b, 0) / data.sentiment.length;
    const productCounts: Record<string, number> = {};
    for (const p of data.products) productCounts[p] = (productCounts[p] || 0) + 1;
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'all';

    await prisma.topicCluster.upsert({
      where: { id: `cluster-${tag}` },
      create: {
        id: `cluster-${tag}`,
        clusterName: tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        productScope: topProduct as ProductScope,
        themeType: avgSentiment < -0.3 ? 'objection' : 'buyer_concern',
        frequency: data.count,
        sentimentScore: avgSentiment,
        keyPhrases: [tag],
        sourceSummary: { reviews: reviews.length, forums: forums.length },
      },
      update: {
        frequency: data.count,
        sentimentScore: avgSentiment,
        lastUpdated: new Date(),
      },
    });
    saved++;
  }
  return saved;
}

export const marketCrawler = {
  scrapeCompetitorPages,
  collectPublicReviews,
  collectForumInsights,
  collectPublicSocialInsights,
  buildTopicClusters,
};
