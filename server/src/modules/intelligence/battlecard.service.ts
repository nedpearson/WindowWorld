/**
 * Battlecard Generator Service
 * 
 * Generates AI-powered competitor battlecards from collected intelligence.
 * All source data comes from public web research (competitor sites, public reviews,
 * public forum discussions). No private data is used.
 */

import { aiService } from '../ai-analysis/ai.service';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

// ─── Battlecard generation prompt ────────────────────────────────────────
function buildBattlecardPrompt(
  competitorName: string,
  pages: string,
  reviews: string,
  forumMentions: string,
  socialNotes: string,
): string {
  return `You are a sales intelligence analyst for a replacement window, door, and siding company in Baton Rouge, Louisiana.

Using ONLY the collected public data below, generate a comprehensive sales battlecard for this competitor.
All data comes from: public websites, public reviews, public forums, public social media posts.

COMPETITOR: ${competitorName}

=== COLLECTED PUBLIC PAGE CONTENT ===
${pages}

=== COLLECTED PUBLIC REVIEWS/FORUM MENTIONS ===
${reviews}

=== FORUM DISCUSSIONS ===
${forumMentions}

=== PUBLIC SOCIAL NOTES ===
${socialNotes}

Generate a battlecard. Return ONLY valid JSON with this exact structure:
{
  "positioning": "1-2 sentence description of their core market positioning",
  "keyClaims": ["list of 4-6 specific claims they make about their products/service"],
  "pricingLanguage": "how they communicate pricing (ranges, financing, per-window)",
  "financingOffers": "specific financing offers mentioned (e.g. 18 months 0%)",
  "warrantyNotes": "warranty/guarantee language used",
  "ctaStrategy": "how they capture leads (form, phone, chat, in-home estimate)",
  "reviewStrengths": ["3-5 things customers consistently praise"],
  "reviewWeaknesses": ["3-5 things customers consistently complain about"],
  "messagingGaps": ["3-5 concerns they fail to address on their website/social"],
  "facebookNotes": "description of their Facebook content approach and gaps",
  "instagramNotes": "description of their Instagram approach and gaps",
  "ourCounterPitch": "2-3 sentences on how WE should position against them",
  "talkTrack": "Full paragraph rep talk track when a prospect mentions this competitor",
  "objectionResponses": [
    {"objection": "They have better warranties", "response": "response text", "close": "close text"},
    {"objection": "They have lower prices", "response": "response text", "close": "close text"},
    {"objection": "I already got a quote from them", "response": "response text", "close": "close text"}
  ]
}`;
}

export async function generateBattlecard(competitorId: string): Promise<boolean> {
  try {
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        pages: { take: 10 },
        reviewInsights: { take: 20 },
        socialPosts: { take: 10 },
      },
    });

    if (!competitor) return false;

    const pagesText = competitor.pages
      .map(p => `[${p.pageType.toUpperCase()} PAGE]\nURL: ${p.url}\n${p.contentText?.substring(0, 800) || ''}`)
      .join('\n\n---\n\n');

    const reviewsText = competitor.reviewInsights
      .map(r => `[${r.sentiment.toUpperCase()} - ${r.source}] ${r.reviewText?.substring(0, 300)}`)
      .join('\n\n');

    const socialText = competitor.socialPosts
      .map(p => `[${p.platform.toUpperCase()} - ${p.creativeTheme || 'general'}] ${p.caption?.substring(0, 400)}`)
      .join('\n\n');

    // Collect forum mentions of competitor
    const forumInsights = await prisma.forumThreadInsight.findMany({
      where: {
        competitorMentions: { has: competitor.slug },
      },
      take: 10,
    });
    const forumText = forumInsights
      .map(f => `[FORUM - ${f.source}] ${f.threadContent?.substring(0, 400)}`)
      .join('\n\n');

    const prompt = buildBattlecardPrompt(
      competitor.name,
      pagesText || 'No page data collected yet.',
      reviewsText || 'No review data collected yet.',
      forumText || 'No forum data collected yet.',
      socialText || 'No social data collected yet.',
    );

    logger.info(`[Battlecard] Generating for ${competitor.name}...`);
    const raw = await aiService.generateText(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(json);

    await prisma.battlecard.upsert({
      where: { competitorId },
      create: {
        competitorId,
        positioning: data.positioning,
        keyClaims: data.keyClaims,
        pricingLanguage: data.pricingLanguage,
        financingOffers: data.financingOffers,
        warrantyNotes: data.warrantyNotes,
        ctaStrategy: data.ctaStrategy,
        reviewStrengths: data.reviewStrengths,
        reviewWeaknesses: data.reviewWeaknesses,
        messagingGaps: data.messagingGaps,
        facebookNotes: data.facebookNotes,
        instagramNotes: data.instagramNotes,
        ourCounterPitch: data.ourCounterPitch,
        talkTrack: data.talkTrack,
        objectionResponses: data.objectionResponses,
        lastUpdated: new Date(),
      },
      update: {
        positioning: data.positioning,
        keyClaims: data.keyClaims,
        pricingLanguage: data.pricingLanguage,
        financingOffers: data.financingOffers,
        warrantyNotes: data.warrantyNotes,
        ctaStrategy: data.ctaStrategy,
        reviewStrengths: data.reviewStrengths,
        reviewWeaknesses: data.reviewWeaknesses,
        messagingGaps: data.messagingGaps,
        facebookNotes: data.facebookNotes,
        instagramNotes: data.instagramNotes,
        ourCounterPitch: data.ourCounterPitch,
        talkTrack: data.talkTrack,
        objectionResponses: data.objectionResponses,
        lastUpdated: new Date(),
      },
    });

    logger.info(`[Battlecard] Successfully generated for ${competitor.name}`);
    return true;
  } catch (e) {
    logger.error('[Battlecard] Generation failed:', e);
    return false;
  }
}

export async function generateAllBattlecards(): Promise<{ success: number; failed: number }> {
  const competitors = await prisma.competitor.findMany({ where: { isActive: true } });
  let success = 0;
  let failed = 0;

  for (const c of competitors) {
    const ok = await generateBattlecard(c.id);
    if (ok) success++;
    else failed++;
    await new Promise(r => setTimeout(r, 2000)); // Rate limit AI calls
  }

  return { success, failed };
}

export async function generateObjectionLibrary(): Promise<number> {
  const reviews = await prisma.reviewInsight.findMany({
    where: { sentiment: 'negative' },
    take: 100,
  });
  const forums = await prisma.forumThreadInsight.findMany({ take: 100 });

  const allContent = [
    ...reviews.map(r => r.reviewText || ''),
    ...forums.map(f => Array.isArray(f.keyQuestions) ? (f.keyQuestions as string[]).join('. ') : ''),
  ].filter(Boolean).join('\n\n').substring(0, 10000);

  const prompt = `You are a sales coach for a replacement window, door, and siding company.

From the following public review and forum content, extract the top buyer objections.
Return ONLY valid JSON:
{
  "objections": [
    {
      "objectionText": "The exact objection or concern expressed",
      "objectionCategory": "price|trust|scheduling|product_quality|financing|warranty|competition|disruption|timing",
      "productFocus": "windows|doors|siding|general",
      "frequency": 1,
      "sourceTypes": ["review"],
      "responseScript": "Full professional sales response to this objection",
      "closeScript": "Trial close to move past this objection"
    }
  ]
}

Content:
${allContent}

Extract 10-15 distinct objections.`;

  try {
    const raw = await aiService.generateText(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const { objections } = JSON.parse(json);

    for (const obj of objections) {
      await prisma.objectionPattern.create({ data: obj });
    }
    return objections.length;
  } catch (e) {
    logger.error('[Objections] Failed to generate library:', e);
    return 0;
  }
}

export async function generateMessagingOpportunities(): Promise<number> {
  const clusters = await prisma.topicCluster.findMany({ take: 50 });
  const battlecards = await prisma.battlecard.findMany({
    include: { competitor: true },
    take: 10,
  });

  const clustersText = clusters
    .map(c => `${c.clusterName} (${c.productScope}): freq=${c.frequency}, sentiment=${c.sentimentScore.toFixed(2)}, note=${c.actionableNote || 'none'}`)
    .join('\n');

  const gapsText = battlecards
    .map(b => `${b.competitor.name}: gaps=${JSON.stringify(b.messagingGaps)}`)
    .join('\n');

  const prompt = `You are a marketing strategist for a replacement window, door, and siding company in Baton Rouge, Louisiana.

Based on these market intelligence findings, identify the top messaging opportunities.
Return ONLY valid JSON:
{
  "opportunities": [
    {
      "opportunityType": "unmet_concern|competitor_gap|underserved_segment|creative_gap|review_gap",
      "description": "Clear description of the opportunity",
      "productScope": "windows|doors|siding|financing|all",
      "targetSegment": "segment name or null",
      "recommendedMessage": "Specific recommended message/headline/angle",
      "channel": "facebook|instagram|google|website|email|sms",
      "priority": "low|medium|high|critical",
      "evidenceSources": {"basis": "where this insight came from"}
    }
  ]
}

TOPIC CLUSTERS:
${clustersText}

COMPETITOR MESSAGING GAPS:
${gapsText}

Find 10-15 concrete opportunities.`;

  try {
    const raw = await aiService.generateText(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const { opportunities } = JSON.parse(json);

    for (const opp of opportunities) {
      await prisma.messagingOpportunity.create({ data: opp });
    }
    return opportunities.length;
  } catch (e) {
    logger.error('[Opportunities] Failed to generate:', e);
    return 0;
  }
}

export const battlecardService = {
  generateBattlecard,
  generateAllBattlecards,
  generateObjectionLibrary,
  generateMessagingOpportunities,
};
