import OpenAI from 'openai';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { prisma } from '../../shared/services/prisma';

// â”€â”€â”€ Provider abstraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AiProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  analyzeImage(imageBase64: string, prompt: string): Promise<string>;
}

class OpenAIProvider implements AiProvider {
  private _client: OpenAI | null = null;

  private get client(): OpenAI {
    if (!this._client) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured. Set it in Railway environment variables.');
      }
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._client;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.AI_TEXT_MODEL || 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });
    return response.choices[0]?.message?.content || '';
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.AI_VISION_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 4096,
    });
    return response.choices[0]?.message?.content || '';
  }
}

// Fallback when no AI provider is configured (Demo Mode)
class NullProvider implements AiProvider {
  async generateText(prompt: string): Promise<string> {
    logger.info('Using Mock AI Provider (OPENAI_API_KEY not set)');
    
    // Determine which type of prompt it is based on keywords
    if (prompt.includes('generatePitchCoach') || prompt.includes('Return JSON with this exact structure') || prompt.includes('opener')) {
      return JSON.stringify({
        opener: "Hi [Name], this is [Rep] with Window World. I'm reaching out because we have a local installation crew in your neighborhood this week and wanted to offer you a complimentary window assessment.",
        pitchAngle: "Energy Efficiency and Long-Term Value",
        productRecommendation: "Series 4000 Double-Hung Windows",
        objectionHandlers: [
          { objection: "price is too high", response: "I completely understand. Our pricing is actually guaranteed to be the best value in the state, and we offer $0 down financing to make it fit any budget." },
          { objection: "need to think about it", response: "Of course! Let me leave you with this custom lookbook. Keep in mind our current promotional pricing locks in your rate for 30 days." },
          { objection: "already got other quotes", response: "That's smart! We actually encourage comparing. When you do, make sure to check if their warranty covers glass breakage and labor like ours does." }
        ],
        voicemailScript: "Hi [Name], [Rep] from Window World here. We've got a crew working in your area this week and I have a quick question about your upcoming window project. Give me a call back at [Phone Number].",
        textScript: "Hi [Name]! This is [Rep] with Window World. Let me know when you have 5 mins to chat about the window project at your property.",
        closingStrategy: "Assume the sale by offering two different installation dates and asking which works best for their schedule.",
        urgencyFraming: "Our current seasonal promotion (Free Premium Hardware Upgrade) ends this Friday.",
        financingAngle: "We can get this entire project started today for $0 down and 0% interest for 18 months."
      });
    }
    
    if (prompt.includes('generateLeadSummary') || prompt.includes('Summarize this window replacement lead')) {
      return JSON.stringify({
        summary: "This is a highly engaged homeowner who recently requested a quote. They are located in a neighborhood with older homes likely experiencing seal failures.",
        nextBestAction: "Call immediately to schedule an in-home measurement while their interest is peaked.",
        riskFlags: ["Comparing multiple local contractors", "Has not responded to the last text message"]
      });
    }

    if (prompt.includes('generateInspectionSummary')) {
      return JSON.stringify({
        executiveSummary: "Standard 12-window replacement project on a single-story brick home.",
        customerSummary: "We'll be replacing all 12 of your original wood windows with our energy-efficient Series 4000 vinyl windows.",
        projectScope: "full-house",
        totalOpenings: 12,
        urgentOpenings: 2,
        complexityRating: "moderate",
        estimatedInstallDays: 2,
        requiredInstallNotes: ["Requires careful removal around original brick veneer"],
        topIssuesFound: ["Significant wood rot on north-facing sill", "Seal failure in master bedroom"],
        productRecommendationNotes: "Recommend Series 4000 due to local climate requirements.",
        estimatedRevenueBand: "medium",
        verificationRequired: ["Master bedroom exact egress dimensions"],
        confidenceScore: 0.95,
        repNotes: "Customer is highly motivated by energy savings. Focus on the low-E argon gas features."
      });
    }

    if (prompt.includes('generateProposalContent')) {
       return JSON.stringify({
        coverNote: "Thank you for trusting Window World with your home. We've prepared this customized proposal specifically for your property.",
        projectSummary: "This project includes the professional installation of premium Series 4000 replacement windows throughout your home.",
        whyNow: "Lock in your pricing before our seasonal materials cost adjustment next month.",
        productHighlights: ["SolarZone Insulated Glass", "Lifetime Transferable Warranty", "Custom-Fit Manufacturing"],
        financingNote: "Ask about our $0 down, 18-month same-as-cash promotional financing.",
        customerFriendlyMeasurementNote: "These preliminary measurements allow us to give you an accurate estimate. Our master installer will verify everything perfectly before manufacturing begins.",
        warrantyHighlights: "Industry-leading lifetime warranty covering parts, labor, and accidental glass breakage.",
        nextSteps: "Simply sign this proposal electronically to reserve your spot on our manufacturing schedule.",
        expirationNote: "This proposal and promotional pricing is valid for 30 days.",
        estimatedInstallTimeline: "4-6 weeks from final measurement"
      });
    }

    return JSON.stringify({});
  }

  async analyzeImage(): Promise<string> {
    logger.info('Using Mock AI Provider for Vision (OPENAI_API_KEY not set)');
    return JSON.stringify({
      estimatedWidthInches: 36,
      estimatedHeightInches: 60,
      measurementConfidence: 0.85,
      confidenceNotes: "Standard single-hung window size visually identified. Frame appears intact.",
      referenceObjectDetected: false,
      referenceObjectNotes: "No known reference object found in frame.",
      perspectiveDistortion: "minor",
      imageAngle: "straight-on",
      recommendations: ["Ensure to measure behind the existing stop molding for accurate custom fit."],
      missingPhotos: ["A close-up of the exterior sill would be helpful."],
      disclaimer: "AI-ESTIMATED — REQUIRES HUMAN VERIFICATION BEFORE ORDERING"
    });
  }
}

function getProvider(): AiProvider {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set - AI features disabled. Add it in Railway environment variables.');
    return new NullProvider();
  }
  const provider = process.env.AI_PROVIDER || 'openai';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    default:
      logger.warn(`Unknown AI provider "${provider}" â€” falling back to OpenAI`);
      return new OpenAIProvider();
  }
}

// â”€â”€â”€ AI System Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const WINDOW_ANALYSIS_SYSTEM = `You are an expert window replacement consultant assistant AI. 
You analyze photos and property data to help Louisiana-based window sales representatives.

IMPORTANT RULES:
1. Never state exact measurements from a single photo without calibration reference
2. Always include a confidence score (0.0-1.0)
3. Clearly distinguish between INFERRED (from image) vs CONFIRMED (from measurement)
4. Flag any visual uncertainty
5. Be honest about what you cannot determine from a photo
6. All measurement estimates are AI-ESTIMATED and require human verification before ordering

You respond ONLY in valid JSON format.`;

const LEAD_PITCH_SYSTEM = `You are an expert window sales coach AI for a Louisiana window replacement company.
You analyze lead data and generate highly personalized, ethical sales content.

IMPORTANT RULES:
1. Be honest and avoid manipulative tactics
2. Use lawful, public information only
3. Never claim to know exact income or financial data
4. Focus on genuine home improvement value
5. Louisiana weather, humidity, and storm context is highly relevant
6. Financing options are important for many customers

You respond ONLY in valid JSON format.`;

const _MEASUREMENT_ANALYSIS_SYSTEM = `You are an AI measurement assistant for window replacement.
You help analyze photos to estimate window dimensions using visual reference clues.

CRITICAL RULES:
1. ALWAYS label estimates as "AI-ESTIMATED â€” REQUIRES HUMAN VERIFICATION"
2. Never claim exact precision from a photo
3. When a reference object is visible, note it and use it for scale
4. Recommend 3-point measurement protocol (width-high, width-mid, width-low)
5. Flag if image quality is insufficient for estimation
6. Confidence score must reflect actual uncertainty honestly

You respond ONLY in valid JSON format.`;

// â”€â”€â”€ AI Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class AiService {
  private provider: AiProvider;

  constructor() {
    this.provider = getProvider();
  }

  // Window photo analysis
  async analyzeWindowPhoto(params: {
    imageBase64: string;
    openingId?: string;
    leadId?: string;
    context?: string;
  }) {
    const prompt = `Analyze this window photo for a Louisiana replacement window sales consultation.

${params.context ? `Additional context: ${params.context}` : ''}

Return a JSON object with this exact structure:
{
  "windowType": "SINGLE_HUNG|DOUBLE_HUNG|SLIDER|CASEMENT|AWNING|PICTURE|BAY|BOW|SPECIALTY_SHAPE|TRANSOM|FIXED|UNKNOWN",
  "frameMaterial": "VINYL|WOOD|ALUMINUM|FIBERGLASS|COMPOSITE|UNKNOWN",
  "condition": "EXCELLENT|GOOD|FAIR|POOR|CRITICAL|UNKNOWN",
  "hasCondensation": boolean,
  "hasSealFailure": boolean,
  "hasDamagedTrim": boolean,
  "hasObstructions": boolean,
  "obstructionNotes": "string or null",
  "accessComplexity": "easy|moderate|difficult|specialty",
  "requiresLadder": boolean,
  "estimatedLadderHeightFt": number_or_null,
  "replacementComplexity": "simple|moderate|complex|specialty",
  "conditionSummary": "Brief description of visible window condition",
  "visibleIssues": ["array of specific visible issues"],
  "recommendedProductCategory": "basic|mid-range|premium",
  "repNotes": "Internal notes for the sales rep",
  "customerFriendlySummary": "What you'd tell the homeowner",
  "measurementPrompts": ["Specific measurement steps needed"],
  "confidenceScore": 0.0_to_1.0,
  "confidenceNotes": "What limits confidence",
  "imageQuality": "good|fair|poor",
  "canEstimateDimensions": boolean,
  "estimatedWidthInches": number_or_null,
  "estimatedHeightInches": number_or_null,
  "measurementDisclaimer": "AI-ESTIMATED â€” REQUIRES HUMAN VERIFICATION BEFORE ORDERING"
}`;

    const startMs = Date.now();
    let rawResponse = '';

    try {
      rawResponse = await this.provider.analyzeImage(params.imageBase64, prompt);
      const parsed = JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());

      // Enforce disclaimer
      parsed.measurementDisclaimer = 'AI-ESTIMATED â€” REQUIRES HUMAN VERIFICATION BEFORE ORDERING';

      // Save to DB
      const analysis = await prisma.aiAnalysis.create({
        data: {
          leadId: params.leadId,
          openingId: params.openingId,
          analysisType: 'window-classification',
          provider: process.env.AI_PROVIDER || 'openai',
          model: process.env.AI_VISION_MODEL || 'gpt-4o',
          rawResponse: parsed,
          detectedWindowType: parsed.windowType || null,
          detectedFrameMaterial: parsed.frameMaterial || null,
          detectedCondition: parsed.condition || null,
          hasCondensation: parsed.hasCondensation || false,
          hasSealFailure: parsed.hasSealFailure || false,
          replacementComplexity: parsed.replacementComplexity,
          estimatedWidth: parsed.estimatedWidthInches,
          estimatedHeight: parsed.estimatedHeightInches,
          confidenceScore: parsed.confidenceScore,
          rationale: parsed.confidenceNotes,
          processingMs: Date.now() - startMs,
          status: 'COMPLETED',
        },
      });

      return { ...parsed, analysisId: analysis.id };
    } catch (error: any) {
      logger.error('Window photo analysis failed:', error);

      await prisma.aiAnalysis.create({
        data: {
          leadId: params.leadId,
          openingId: params.openingId,
          analysisType: 'window-classification',
          provider: process.env.AI_PROVIDER || 'openai',
          model: process.env.AI_VISION_MODEL || 'gpt-4o',
          rawResponse: rawResponse ? { raw: rawResponse } : undefined,
          status: 'FAILED',
          errorMessage: error.message,
          processingMs: Date.now() - startMs,
        },
      });

      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  // Lead pitch generation
  async generateLeadPitch(lead: any) {
    const prompt = `Generate a complete sales pitch package for this window replacement lead.

LEAD DATA:
- Name: ${lead.firstName} ${lead.lastName}
- Address: ${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}
- Parish: ${lead.parish}
- Source: ${lead.source}
- Status: ${lead.status}
- Home Year Built: ${lead.properties?.[0]?.yearBuilt || 'unknown'}
- Prior Contact: ${lead.lastContactedAt ? 'Yes' : 'No'}
- Storm Lead: ${lead.isStormLead}
- Tags: ${lead.tags?.join(', ') || 'none'}

Return JSON with this structure:
{
  "profileSummary": "Best homeowner profile summary",
  "likelyNeedReason": "Why they likely need replacement windows",
  "recommendedPitchAngle": "CONSULTATIVE|URGENCY_BASED|PREMIUM_VALUE|BUDGET_CONSCIOUS|ENERGY_SAVINGS|INSURANCE_STORM|COMFORT_FAMILY|FINANCING_FIRST",
  "opener": "Best conversation opener",
  "discoveryQuestions": ["3-5 discovery questions"],
  "shortPitch30sec": "30-second pitch",
  "fullPitch2min": "2-minute pitch",
  "likelyObjections": [
    { "objection": "string", "rebuttal": "string" }
  ],
  "closingAsk": "Suggested closing question",
  "voicemailScript": "Voicemail left if no answer",
  "textFollowUp": "Follow-up text message",
  "emailSubject": "Follow-up email subject",
  "emailBody": "Follow-up email body",
  "urgencyDrivers": ["What creates legitimate urgency"],
  "financingPitch": "Payment-focused reframe",
  "recommendedContactSequence": ["Step 1", "Step 2", ...],
  "estimatedCloseProbability": 0.0_to_1.0,
  "estimatedRevenueBand": "low|medium|high|premium",
  "recommendedProductCategory": "string",
  "bestContactTime": "string",
  "nextBestAction": "Single most impactful next action for the rep",
  "confidenceScore": 0.0_to_1.0,
  "rationale": "Why these recommendations were made"
}`;

    const startMs = Date.now();

    try {
      const rawResponse = await this.provider.generateText(prompt, LEAD_PITCH_SYSTEM);
      const parsed = JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());

      await prisma.aiAnalysis.create({
        data: {
          leadId: lead.id,
          analysisType: 'pitch',
          provider: process.env.AI_PROVIDER || 'openai',
          model: process.env.AI_TEXT_MODEL || 'gpt-4o',
          rawResponse: parsed,
          pitchOutput: parsed,
          confidenceScore: parsed.confidenceScore,
          rationale: parsed.rationale,
          status: 'COMPLETED',
          processingMs: Date.now() - startMs,
        },
      });

      return parsed;
    } catch (error: any) {
      logger.error('Lead pitch generation failed:', error);
      throw new Error(`AI pitch generation failed: ${error.message}`);
    }
  }

  // Score a lead
  async scoreLead(lead: any) {
    const prompt = `Score this residential window replacement lead on multiple dimensions.

LEAD DATA:
${JSON.stringify(lead, null, 2)}

Return JSON:
{
  "totalScore": 0_to_100,
  "urgencyScore": 0_to_100,
  "closeProbability": 0.0_to_1.0,
  "financingPropensity": 0.0_to_1.0,
  "homeAgeScore": 0_to_100,
  "weatherExposureScore": 0_to_100,
  "neighborhoodScore": 0_to_100,
  "priorContactScore": 0_to_100,
  "responseScore": 0_to_100,
  "referralScore": 0_to_100,
  "campaignScore": 0_to_100,
  "estimatedRevenueBand": "low|medium|high|premium",
  "estimatedProjectSize": "1-2 windows|partial replacement|full replacement",
  "recommendedPitchAngle": "CONSULTATIVE|URGENCY_BASED|PREMIUM_VALUE|BUDGET_CONSCIOUS|ENERGY_SAVINGS|INSURANCE_STORM|COMFORT_FAMILY|FINANCING_FIRST",
  "likelyObjections": ["string"],
  "confidenceScore": 0.0_to_1.0,
  "rationale": "Explanation of score â€” based only on lawful observable signals"
}`;

    const rawResponse = await this.provider.generateText(prompt, LEAD_PITCH_SYSTEM);
    return JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
  }

  // Analyze measurement photo with reference object
  async analyzeMeasurementPhoto(params: {
    imageBase64: string;
    referenceObjectDescription?: string;
    referenceObjectSizeInches?: number;
    openingId?: string;
  }) {
    const prompt = `Analyze this window measurement photo.

${params.referenceObjectDescription
  ? `Reference object visible: ${params.referenceObjectDescription} (${params.referenceObjectSizeInches}" known size)`
  : 'No reference object specified.'
}

IMPORTANT: All estimates are AI-ESTIMATED and must be verified by a human measurer before ordering.

Return JSON:
{
  "canEstimateDimensions": boolean,
  "estimatedWidthInches": number_or_null,
  "estimatedHeightInches": number_or_null,
  "measurementConfidence": 0.0_to_1.0,
  "confidenceNotes": "What limits accuracy",
  "referenceObjectDetected": boolean,
  "referenceObjectNotes": "string",
  "perspectiveDistortion": "none|minor|significant",
  "imageAngle": "straight-on|angled",
  "recommendations": ["Specific guidance for the measurer"],
  "missingPhotos": ["What additional photos would help"],
  "disclaimer": "AI-ESTIMATED â€” REQUIRES HUMAN VERIFICATION BEFORE ORDERING"
}`;

    const rawResponse = await this.provider.analyzeImage(params.imageBase64, prompt);
    const parsed = JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
    parsed.disclaimer = 'AI-ESTIMATED â€” REQUIRES HUMAN VERIFICATION BEFORE ORDERING';
    return parsed;
  }

  // Generate inspection summary
  async generateInspectionSummary(params: {
    leadId: string;
    inspectionId: string;
    openings: any[];
    photos: any[];
  }) {
    const prompt = `Generate a comprehensive inspection summary for a window replacement consultation.

OPENINGS IDENTIFIED: ${params.openings.length}
OPENING DATA: ${JSON.stringify(params.openings.slice(0, 20), null, 2)}

Return JSON:
{
  "executiveSummary": "2-3 sentence overview for the rep",
  "customerSummary": "Customer-friendly project overview",
  "projectScope": "full-house|partial|specific-area",
  "totalOpenings": number,
  "urgentOpenings": number,
  "complexityRating": "simple|moderate|complex|specialty",
  "estimatedInstallDays": number,
  "requiredInstallNotes": ["key installation considerations"],
  "topIssuesFound": ["main condition problems"],
  "productRecommendationNotes": "string",
  "estimatedRevenueBand": "low|medium|high|premium",
  "verificationRequired": ["what must be verified onsite before ordering"],
  "confidenceScore": 0.0_to_1.0,
  "repNotes": "Tactical notes for closing the deal"
}`;

    const rawResponse = await this.provider.generateText(prompt, WINDOW_ANALYSIS_SYSTEM);
    return JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
  }

  // Generate proposal customer text
  async generateProposalContent(params: {
    lead: any;
    quote: any;
    openings: any[];
    brandingMode?: string;
  }) {
    const prompt = `Generate professional proposal content for a residential window replacement project.

CUSTOMER: ${params.lead.firstName} ${params.lead.lastName}
PROPERTY: ${params.lead.address}, ${params.lead.city}, LA
WINDOWS: ${params.openings.length} openings
TOTAL QUOTE: $${params.quote.total?.toFixed(2)}

Return JSON:
{
  "coverNote": "Personalized cover letter opening (2-3 sentences)",
  "projectSummary": "Professional project scope paragraph",
  "whyNow": "Legitimate urgency and value framing",
  "productHighlights": ["Key product benefits to highlight"],
  "financingNote": "If applicable, financing angle",
  "customerFriendlyMeasurementNote": "How to explain estimated vs verified measurements",
  "warrantyHighlights": "string",
  "nextSteps": "Clear call to action",
  "expirationNote": "e.g. This proposal is valid for 30 days",
  "estimatedInstallTimeline": "string"
}`;

    const rawResponse = await this.provider.generateText(prompt, LEAD_PITCH_SYSTEM);
    return JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
  }

  // Generate AI Pitch Coach script for a lead
  async generatePitchCoach(lead: any) {
    const score = lead.leadScores?.[0];
    const property = (lead.properties || [])[0];

    const prompt = `You are an expert window sales coach for WindowWorld Louisiana, a premium replacement window company.
Generate a personalized pitch coaching script for this specific lead.

LEAD PROFILE:
- Name: ${lead.firstName} ${lead.lastName}
- Address: ${lead.address || 'Unknown'}, ${lead.city || 'Baton Rouge'}, LA
- Lead Source: ${lead.source || 'unknown'}
- Current Status: ${lead.status}
- Home Year Built: ${property?.yearBuilt || 'unknown'}
- Window Count Estimate: ${property?.windowCount || 'unknown'}
- AI Lead Score: ${score?.totalScore || lead.leadScore || 'N/A'}/100
- Urgency Score: ${score?.urgencyScore || lead.urgencyScore || 'N/A'}/10
- Close Probability: ${score ? Math.round((score.closeProbability || 0) * 100) : 'N/A'}%
- Recommended Pitch Angle: ${score?.recommendedPitchAngle || 'value and energy savings'}
- Recommended Product: ${score?.recommendedProduct || 'Series 4000'}
- Estimated Project Size: ${score?.estimatedProjectSize || 'unknown'}
- Likely Objections: ${(score?.likelyObjections || []).join(', ') || 'none identified'}

Return JSON with this exact structure:
{
  "opener": "A natural, personalized first-touch opening line for a phone call or door knock (2-3 sentences)",
  "pitchAngle": "The primary value angle to lead with (e.g. energy savings, storm protection, curb appeal)",
  "productRecommendation": "Which series to recommend and why, in plain language",
  "objectionHandlers": [
    { "objection": "price is too high", "response": "specific response script" },
    { "objection": "need to think about it", "response": "specific response script" },
    { "objection": "already got other quotes", "response": "specific response script" }
  ],
  "voicemailScript": "A compelling 20-second voicemail script",
  "textScript": "A short text message to send if no answer (under 160 chars)",
  "closingStrategy": "How to ask for the close based on this lead's profile",
  "urgencyFraming": "Legitimate urgency talking point for this specific lead",
  "financingAngle": "If applicable, how to introduce financing to this lead"
}`;

    try {
      const rawResponse = await this.provider.generateText(prompt);
      return JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
    } catch (error: any) {
      logger.warn(`[aiService] generatePitchCoach failed, using fallback: ${sanitizeForLog(error.message)}`);
      return {
        opener: `Hi ${lead.firstName || 'there'}, this is your local Window World rep. I noticed you might be looking into some exterior updates for your home in ${lead.city || 'your area'}, and I wanted to see if I could help.`,
        pitchAngle: "Energy savings and premium lifetime value.",
        productRecommendation: "Series 4000 Double-Hung for optimal energy efficiency and durability in Louisiana weather.",
        objectionHandlers: [
          { objection: "Price is too high", response: "I completely understand. When you factor in our lifetime warranty and the immediate energy savings, the monthly cost is actually very manageable." },
          { objection: "Need to think about it", response: "Of course. What specific part are you still weighing? I'd love to leave you with the right information." }
        ],
        voicemailScript: `Hi ${lead.firstName || 'there'}, this is Window World following up on your inquiry. We're running some local specials in ${lead.city || 'your area'} this week. Give me a call back at your convenience!`,
        textScript: `Hi ${lead.firstName || 'there'}, this is Window World. Just left a voicemail regarding your window inquiry. Let me know when you have 5 minutes to chat!`,
        closingStrategy: "Assume the sale by asking which day works best for their installation measurement.",
        urgencyFraming: "Current promo pricing locks in today's material costs before next month's adjustment.",
        financingAngle: "We offer 18-months same-as-cash which makes this project very accessible."
      };
    }
  }

  // Generate a concise AI summary of the lead
  async generateLeadSummary(lead: any) {
    const recentActivities = (lead.activities || []).slice(0, 5).map((a: any) => `${a.type}: ${a.title}`).join('; ');
    const appointments = (lead.appointments || []).map((a: any) => `${a.type} on ${new Date(a.scheduledAt).toLocaleDateString()}`).join(', ');

    const prompt = `Summarize this window replacement lead in 2-3 sentences for a sales rep. Be specific, actionable, and insightful.

Lead: ${lead.firstName} ${lead.lastName} — ${lead.address}, ${lead.city}, LA
Status: ${lead.status} | Source: ${lead.source}
Score: ${lead.leadScore || 'N/A'}/100 | Close Prob: ${lead.closeProbability ? Math.round(lead.closeProbability * 100) + '%' : 'N/A'}
Recent activity: ${recentActivities || 'none'}
Appointments: ${appointments || 'none scheduled'}
Notes: ${lead.notes || 'none'}

Return JSON: { "summary": "2-3 sentence summary", "nextBestAction": "Single most important action the rep should take right now", "riskFlags": ["any red flags, e.g. no contact in 7 days"] }`;

    try {
      const rawResponse = await this.provider.generateText(prompt);
      return JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
    } catch (error: any) {
      logger.warn(`[aiService] generateLeadSummary failed, using fallback: ${sanitizeForLog(error.message)}`);
      return {
        summary: `This is a high-intent lead from ${lead.city || 'the local area'}. The property likely has original builder-grade windows that are failing.`,
        nextBestAction: "Call immediately to schedule a free in-home estimate.",
        riskFlags: ["Possible competitor quotes being gathered"]
      };
    }
  }
}

export const aiService = new AiService();
