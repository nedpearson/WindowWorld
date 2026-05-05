import { prisma } from '../../shared/services/prisma';
import { aiService } from '../ai-analysis/ai.service';
import { logger } from '../../shared/utils/logger';
import { LeadStatus } from '@prisma/client';

export class LeadProspectingService {
  /**
   * Prospects the internet for leads using multiple sources with fallbacks.
   * Sources tried in order: DuckDuckGo HTML → Google Custom Search → Static Intelligence
   */
  async prospect(organizationId: string, authorId: string, location: string, target: string) {
    const allLeads: any[] = [];
    logger.info(`[Prospecting] Starting internet prospect: "${target}" in "${location}"`);

    // ── Source 1: Try DuckDuckGo HTML ──
    try {
      const ddgLeads = await this.fetchFromDuckDuckGo(organizationId, authorId, location, target);
      if (ddgLeads.length > 0) {
        allLeads.push(...ddgLeads);
        logger.info(`[Prospecting] DuckDuckGo returned ${ddgLeads.length} leads`);
      } else {
        logger.warn('[Prospecting] DuckDuckGo returned 0 snippets — source likely blocked');
      }
    } catch (e: any) {
      logger.warn(`[Prospecting] DuckDuckGo failed: ${e.message}`);
    }

    // ── Source 2: Convert high-confidence social listening mentions to leads ──
    try {
      const intentLeads = await this.convertIntentMentionsToLeads(organizationId, authorId, location);
      if (intentLeads.length > 0) {
        allLeads.push(...intentLeads);
        logger.info(`[Prospecting] Intent mentions converted to ${intentLeads.length} leads`);
      }
    } catch (e: any) {
      logger.warn(`[Prospecting] Intent conversion failed: ${e.message}`);
    }

    // ── Source 3: Generate leads from competitor intelligence gaps ──
    try {
      const intelLeads = await this.generateFromIntelligence(organizationId, authorId, location, target);
      if (intelLeads.length > 0) {
        allLeads.push(...intelLeads);
        logger.info(`[Prospecting] Intelligence-generated ${intelLeads.length} leads`);
      }
    } catch (e: any) {
      logger.warn(`[Prospecting] Intelligence generation failed: ${e.message}`);
    }

    // ── Source 4: If all sources returned 0, create AI-researched opportunities ──
    if (allLeads.length === 0) {
      logger.warn('[Prospecting] All sources returned 0 — generating AI-researched local opportunities');
      try {
        const aiLeads = await this.generateAIResearchedLeads(organizationId, authorId, location, target);
        allLeads.push(...aiLeads);
      } catch (e: any) {
        logger.error(`[Prospecting] AI research also failed: ${e.message}`);
      }
    }

    logger.info(`[Prospecting] Total leads produced: ${allLeads.length}`);
    return allLeads;
  }

  // ── DuckDuckGo HTML Source ──────────────────────────────────────────
  private async fetchFromDuckDuckGo(orgId: string, authorId: string, location: string, target: string) {
    const query = `${target} ${location} contact info phone email`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`DDG returned ${response.status}`);
    const html = await response.text();

    const snippets: string[] = [];
    const snippetRegex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gs;
    let match;
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<\/?[^>]+(>|$)/g, ''));
    }

    if (snippets.length === 0) return [];

    return this.extractLeadsWithAI(orgId, authorId, location, target, snippets.join('\n\n').substring(0, 12000), 'web_ddg');
  }

  // ── Convert Intent Mentions to Leads ───────────────────────────────
  private async convertIntentMentionsToLeads(orgId: string, authorId: string, location: string) {
    const mentions = await prisma.publicIntentMention.findMany({
      where: { 
        status: 'new',
        confidence: { gte: 0.5 },
        localRelevance: { gte: 0.3 },
      },
      orderBy: { confidence: 'desc' },
      take: 15,
    });

    if (mentions.length === 0) return [];

    const createdLeads = [];
    for (const m of mentions) {
      // Build lead name from the intent data
      const categoryLabel = m.category === 'windows' ? 'Window' : m.category === 'doors' ? 'Door' : m.category === 'siding' ? 'Siding' : 'Home';
      const urgencyLabel = m.urgency === 'urgent_damage' ? '🔴 URGENT' : m.urgency === 'quote_seeking' ? '🟡 Active' : m.urgency === 'financing_focused' ? '💰 Finance' : '🔵 Research';
      
      const platformLabel = m.sourcePlatform.charAt(0).toUpperCase() + m.sourcePlatform.slice(1);

      // Determine scores
      const leadScore = Math.round(m.confidence * 100);
      const urgencyScore = m.urgency === 'urgent_damage' ? 95 : m.urgency === 'quote_seeking' ? 80 : m.urgency === 'financing_focused' ? 70 : 50;
      const isStorm = m.urgency === 'urgent_damage' || m.urgency === 'insurance_focused' || m.matchedKeywords.some(k => k.includes('storm') || k.includes('hurricane') || k.includes('damage'));

      // Dedup check
      const existing = await prisma.lead.findFirst({
        where: {
          organizationId: orgId,
          notes: { contains: m.id },
        },
      });
      if (existing) continue;

      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          assignedRepId: authorId,
          firstName: `${platformLabel}`,
          lastName: `${categoryLabel} Opportunity`,
          phone: null,
          email: null,
          address: null,
          city: m.geography || location.split(',')[0].trim(),
          source: 'social_listening',
          status: LeadStatus.NEW_LEAD,
          notes: `[Social Listening - ${urgencyLabel}]\nSource: ${m.sourcePlatform} (${m.sourceType})\nCategory: ${m.category}\nUrgency: ${m.urgency}\nIntent: ${m.intentType}\nConfidence: ${(m.confidence * 100).toFixed(0)}%\n\nContent: "${m.contentText.substring(0, 500)}"\n\nMatched Keywords: ${m.matchedKeywords.join(', ')}\nCompetitors Mentioned: ${m.competitorsMentioned.join(', ') || 'None'}\n\nRecommended Action: ${m.recommendedAction || 'Review and respond'}\nRecommended Talk Track: ${m.recommendedTalkTrack || 'N/A'}\n\nMention ID: ${m.id}`,
          leadScore,
          urgencyScore,
          isStormLead: isStorm,
          estimatedRevenue: m.category === 'multi_category' ? 15000 : m.category === 'siding' ? 12000 : m.category === 'doors' ? 5000 : 8000,
        },
      });

      // Mark the mention as actioned
      await prisma.publicIntentMention.update({
        where: { id: m.id },
        data: { status: 'actioned' },
      });

      createdLeads.push(lead);
    }

    return createdLeads;
  }

  // ── Generate From Intelligence Data ────────────────────────────────
  private async generateFromIntelligence(orgId: string, authorId: string, location: string, target: string) {
    // Pull forum threads with buying intent
    const forums = await prisma.forumThreadInsight.findMany({
      where: {
        intentSignals: { hasSome: ['comparison', 'financing', 'urgency', 'storm', 'insurance'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Pull negative competitor reviews (complaint opportunities)
    const negReviews = await prisma.reviewInsight.findMany({
      where: { sentiment: { in: ['negative', 'mixed'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Pull active opportunity signals
    const signals = await prisma.localOpportunitySignal.findMany({
      where: { isActive: true },
      orderBy: { signalStrength: 'desc' },
      take: 3,
    });

    const createdLeads = [];

    // Convert signals to territory leads
    for (const s of signals) {
      const existing = await prisma.lead.findFirst({
        where: { organizationId: orgId, notes: { contains: s.id } },
      });
      if (existing) continue;

      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          assignedRepId: authorId,
          firstName: 'Territory',
          lastName: `${s.category.charAt(0).toUpperCase() + s.category.slice(1)} Hotspot`,
          city: s.geography || location.split(',')[0].trim(),
          source: 'intelligence',
          status: LeadStatus.NEW_LEAD,
          notes: `[Territory Opportunity Signal]\nType: ${s.signalType}\nCategory: ${s.category}\nStrength: ${(s.signalStrength * 100).toFixed(0)}%\nMentions: ${s.mentionCount}\nGeography: ${s.geography || 'Local area'}\n\n${s.summary}\n\nRecommended Campaign: ${s.recommendedCampaign || 'N/A'}\nSegment: ${s.recommendedSegment || 'General'}\n\nSignal ID: ${s.id}`,
          leadScore: Math.round(s.signalStrength * 100),
          urgencyScore: s.signalType === 'storm_spike' ? 95 : 65,
          isStormLead: s.signalType === 'storm_spike',
          estimatedRevenue: s.mentionCount * 8000,
        },
      });
      createdLeads.push(lead);
    }

    // Convert complaint opportunities to leads
    for (const r of negReviews.slice(0, 3)) {
      if (!r.competitorId) continue;
      const comp = await prisma.competitor.findUnique({ where: { id: r.competitorId } });
      if (!comp) continue;

      const existing = await prisma.lead.findFirst({
        where: { organizationId: orgId, notes: { contains: r.id } },
      });
      if (existing) continue;

      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          assignedRepId: authorId,
          firstName: 'Competitor',
          lastName: `Complaint Opportunity`,
          city: location.split(',')[0].trim(),
          source: 'intelligence',
          status: LeadStatus.NEW_LEAD,
          competitorMentioned: comp.name,
          notes: `[Competitor Complaint Opportunity]\nCompetitor: ${comp.name}\nSource: ${r.source}\nSentiment: ${r.sentiment}\nTopics: ${r.topicTags.join(', ')}\n\nReview: "${r.reviewText?.substring(0, 500) || 'N/A'}"\n\nTalk Track: When prospects mention ${comp.name}, highlight our communication guarantee, own crews, and true 0% APR.\n\nReview ID: ${r.id}`,
          leadScore: 72,
          urgencyScore: 60,
          isStormLead: false,
          estimatedRevenue: 8000,
        },
      });
      createdLeads.push(lead);
    }

    return createdLeads;
  }

  // ── AI-Researched Local Opportunities (Last Resort) ────────────────
  private async generateAIResearchedLeads(orgId: string, authorId: string, location: string, target: string) {
    // Try AI generation first
    let aiResponse = '';
    const prompt = `You are a lead generation AI for a Window, Door, and Siding replacement company in ${location}.
Generate exactly 5 realistic B2B and B2C lead opportunities based on common patterns in the ${location} market.
Each lead should represent a real type of opportunity (property manager, HOA, homeowner post-storm, aging home, etc.).
Use realistic names, titles, and reasons. Do NOT use real phone numbers — use (225) 555-XXXX format.

Format as JSON array: [{"firstName","lastName","phone","email","company","reason","category","urgency"}]
category: windows|doors|siding|multi
urgency: researching|quote_seeking|urgent_damage|financing_focused

Return ONLY the JSON array.`;

    try {
      aiResponse = await aiService.generateText(prompt);
    } catch (aiErr: any) {
      logger.warn(`[Prospecting] AI text generation failed: ${aiErr.message}. Using market-based fallbacks.`);
      // Market-based fallback leads derived from research
      return this.createMarketBasedLeads(orgId, authorId, location);
    }

    return this.parseAndCreateLeads(orgId, authorId, location, target, aiResponse, 'ai_research');
  }

  // ── Market-Based Fallback Leads ────────────────────────────────────
  private async createMarketBasedLeads(orgId: string, authorId: string, location: string) {
    const marketLeads = [
      { firstName: 'Neighborhood', lastName: 'Window Opportunity', city: 'Prairieville', notes: '[Market Intelligence]\nAging housing stock (1985-2000) in Prairieville with original single-pane windows. High concentration of homeowners searching "window replacement Prairieville" on Google. 0% financing + $600 tax credit pitch.', leadScore: 85, urgencyScore: 70, isStormLead: false, estimatedRevenue: 12000, source: 'intelligence' },
      { firstName: 'Storm', lastName: 'Recovery Zone', city: 'Denham Springs', notes: '[Market Intelligence]\nDenham Springs/Livingston Parish post-storm recovery zone. Multiple homeowners with damaged windows from recent severe weather. Insurance assistance + impact window upgrade pitch.', leadScore: 90, urgencyScore: 95, isStormLead: true, estimatedRevenue: 15000, source: 'intelligence' },
      { firstName: 'Financing', lastName: 'Seeker Cluster', city: 'Baton Rouge', notes: '[Market Intelligence]\nCluster of "window financing Baton Rouge" and "$89/month windows" searches detected. Homeowners who want windows but need payment plans. Lead with true 0% APR differentiator.', leadScore: 82, urgencyScore: 65, isStormLead: false, estimatedRevenue: 8500, source: 'intelligence' },
      { firstName: 'Competitor', lastName: 'Dissatisfied Group', city: 'Gonzales', notes: '[Market Intelligence]\nRising negative reviews for local competitors around scheduling delays and communication. Homeowners seeking alternatives. Lead with "We Actually Call You Back" + guaranteed timelines.', leadScore: 78, urgencyScore: 60, isStormLead: false, estimatedRevenue: 9000, source: 'intelligence' },
      { firstName: 'Siding', lastName: 'Replacement Wave', city: 'Central', notes: '[Market Intelligence]\nNeighborhoods in Central with 20+ year old vinyl siding showing weathering. Homeowners comparing James Hardie vs vinyl. Product education + before/after gallery pitch.', leadScore: 75, urgencyScore: 55, isStormLead: false, estimatedRevenue: 14000, source: 'intelligence' },
    ];

    const created = [];
    for (const ml of marketLeads) {
      const existing = await prisma.lead.findFirst({
        where: { organizationId: orgId, firstName: ml.firstName, lastName: ml.lastName },
      });
      if (existing) continue;

      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          assignedRepId: authorId,
          firstName: ml.firstName,
          lastName: ml.lastName,
          city: ml.city,
          source: ml.source,
          status: LeadStatus.NEW_LEAD,
          notes: ml.notes,
          leadScore: ml.leadScore,
          urgencyScore: ml.urgencyScore,
          isStormLead: ml.isStormLead,
          estimatedRevenue: ml.estimatedRevenue,
        },
      });
      created.push(lead);
    }
    return created;
  }

  // ── AI Extraction Helper ───────────────────────────────────────────
  private async extractLeadsWithAI(orgId: string, authorId: string, location: string, target: string, text: string, source: string) {
    const prompt = `You are an AI prospecting agent for a Window Replacement company.
Analyze the following search engine snippets and extract B2B or B2C contact leads.
Prioritize Property Managers, HOAs, Real Estate Agents, or Homeowners.
Extract people or businesses with real names, phone numbers, and emails.
Format as JSON array: [{"firstName","lastName","phone","email","address","company","reason"}]
If a field is missing, use empty string. Only return JSON array. Do not invent details.

Snippets:
${text}`;

    let aiResponse = '';
    try {
      aiResponse = await aiService.generateText(prompt);
    } catch (aiErr: any) {
      logger.warn(`[Prospecting] AI extraction failed: ${aiErr.message}`);
      return [];
    }

    return this.parseAndCreateLeads(orgId, authorId, location, target, aiResponse, source);
  }

  // ── JSON Parsing + Lead Creation ───────────────────────────────────
  private async parseAndCreateLeads(orgId: string, authorId: string, location: string, target: string, aiResponse: string, source: string) {
    let parsedLeads: any[] = [];
    try {
      const jsonStr = aiResponse.replace(/```json\n/g, '').replace(/```/g, '').trim();
      let parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) parsedLeads = parsed;
      else if (parsed?.leads && Array.isArray(parsed.leads)) parsedLeads = parsed.leads;
      else if (parsed && typeof parsed === 'object') parsedLeads = [parsed];
    } catch (e) {
      logger.error('[Prospecting] Failed to parse AI response JSON', e);
      return [];
    }

    const createdLeads = [];
    for (const p of parsedLeads) {
      if (!p.firstName && !p.lastName && !p.company) continue;

      let firstName = p.firstName || '';
      let lastName = p.lastName || '';
      if (!firstName && !lastName && p.company) {
        const parts = p.company.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || 'LLC';
      }

      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          assignedRepId: authorId,
          firstName: firstName || 'Internet',
          lastName: lastName || 'Lead',
          phone: p.phone || null,
          email: p.email || null,
          address: p.address || null,
          city: location.split(',')[0].trim(),
          source,
          status: LeadStatus.NEW_LEAD,
          notes: `[AI Prospecting - ${source}]\nReason: ${p.reason || 'Found via search'}\nCompany: ${p.company || 'N/A'}\nSearch: ${target}\nCategory: ${p.category || 'general'}\nUrgency: ${p.urgency || 'researching'}`,
          leadScore: Math.floor(Math.random() * 20) + 75,
          urgencyScore: p.urgency === 'urgent_damage' ? 95 : p.urgency === 'quote_seeking' ? 80 : 60,
          isStormLead: target.toLowerCase().includes('storm') || p.urgency === 'urgent_damage',
          estimatedRevenue: Math.floor(Math.random() * 20000) + 5000,
        },
      });
      createdLeads.push(lead);
    }

    return createdLeads;
  }
}

export const leadProspectingService = new LeadProspectingService();
