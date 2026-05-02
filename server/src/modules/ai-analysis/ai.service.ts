import OpenAI from 'openai';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { prisma } from '../../shared/services/prisma';

// ─── Measurement Intelligence Interfaces ─────────────────────────────────────

export interface PropertyPhotoAnalysis {
  totalWindowsDetected: number;
  windows: Array<{
    locationLabel: string;
    elevation: string;
    estimatedWidth: number;
    estimatedHeight: number;
    windowType: string;
    condition: string;
    confidence: number;
    issues: string[];
    notes: string;
  }>;
  propertyNotes: string;
  imageQualityWarnings: string[];
  aiAnalysisId: string;
}

export interface ReferenceObjectAnalysis {
  estimatedWidth: number;
  estimatedHeight: number;
  confidence: number;
  referenceValid: boolean;
  referenceWarning: string | null;
  windowType: string;
  measurementNotes: string;
  aiAnalysisId: string;
}

// â”€â”€â”€ Provider abstraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AiProvider {
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  analyzeImage(imageBase64: string, prompt: string): Promise<string>;
  analyzeImages(images: Array<{ base64: string; elevation: string }>, prompt: string, systemPrompt?: string): Promise<string>;
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

  async analyzeImages(
    images: Array<{ base64: string; elevation: string }>,
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    // Build content array: interleave each image with its elevation label, then the main prompt
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images.map((img) => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/jpeg;base64,${img.base64}`, detail: 'high' as const },
    }));

    const response = await this.client.chat.completions.create({
      model: process.env.AI_VISION_MODEL || 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        {
          role: 'user',
          content: [
            ...imageContent,
            { type: 'text' as const, text: prompt },
          ],
        },
      ],
      max_tokens: 8192,
    });
    return response.choices[0]?.message?.content || '';
  }
}

// Fallback when no AI provider is configured (Demo Mode)
class NullProvider implements AiProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async analyzeImages(_images: Array<{ base64: string; elevation: string }>, _prompt: string): Promise<string> {
    logger.info('Using Mock AI Provider for multi-image (OPENAI_API_KEY not set)');
    return JSON.stringify({
      totalWindowsDetected: 8,
      windows: [
        { locationLabel: 'Front Left', elevation: 'front', estimatedWidth: 36, estimatedHeight: 54, windowType: 'DOUBLE_HUNG', condition: 'FAIR', confidence: 0.72, issues: ['minor seal failure'], notes: 'Builder-grade aluminum' },
        { locationLabel: 'Front Center', elevation: 'front', estimatedWidth: 30, estimatedHeight: 48, windowType: 'SINGLE_HUNG', condition: 'FAIR', confidence: 0.70, issues: [], notes: '' },
        { locationLabel: 'Front Right', elevation: 'front', estimatedWidth: 36, estimatedHeight: 54, windowType: 'DOUBLE_HUNG', condition: 'GOOD', confidence: 0.75, issues: [], notes: '' },
        { locationLabel: 'Left Side Upper', elevation: 'left', estimatedWidth: 28, estimatedHeight: 40, windowType: 'SINGLE_HUNG', condition: 'POOR', confidence: 0.65, issues: ['condensation'], notes: '' },
        { locationLabel: 'Rear Bedroom', elevation: 'rear', estimatedWidth: 36, estimatedHeight: 60, windowType: 'DOUBLE_HUNG', condition: 'FAIR', confidence: 0.68, issues: [], notes: '' },
      ],
      propertyNotes: 'Mock AI scan — demo mode. Connect OPENAI_API_KEY for real results.',
      imagQualityWarnings: ['Demo mode — no real image analysis performed'],
    });
  }
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

  // ─── Feature A: Multi-Photo Property Scan ─────────────────────────────────
  async analyzePropertyPhotos(params: {
    images: Array<{ base64: string; elevation: 'front' | 'rear' | 'left' | 'right' | 'closeup' }>;
    leadId: string;
    organizationId: string;
    analyzedById: string;
  }): Promise<PropertyPhotoAnalysis> {
    const { images, leadId, analyzedById } = params;
    const startMs = Date.now();

    const systemPrompt =
      'You are an expert window replacement estimator with 20 years of field experience in Louisiana. ' +
      'You are analyzing exterior home photos to identify and measure every window visible.';

    const userPrompt =
      `I am providing ${images.length} exterior photos of this home ` +
      `(${images.map((i) => i.elevation).join(', ')}).\n\n` +
      `For EVERY window visible across ALL photos, provide:\n` +
      `1. A unique location label (e.g. 'Front Left', 'Front Center', 'Left Side Upper', 'Rear Bedroom')\n` +
      `2. Estimated rough opening width in inches (nearest 0.5 inch)\n` +
      `3. Estimated rough opening height in inches (nearest 0.5 inch)\n` +
      `4. Window type (SINGLE_HUNG, DOUBLE_HUNG, SLIDER, CASEMENT, FIXED, BAY, BOW, AWNING, HOPPER, JALOUSIE, PICTURE, SKYLIGHT, GARDEN, UNKNOWN)\n` +
      `5. Frame condition (EXCELLENT, GOOD, FAIR, POOR, CRITICAL)\n` +
      `6. Confidence score 0.0–1.0\n` +
      `7. Any visible issues (condensation, seal failure, damaged trim, rot, broken glass)\n\n` +
      `IMPORTANT RULES:\n` +
      `- If the same window appears in multiple photos, count it ONCE and use the clearest photo for measurement\n` +
      `- Louisiana homes often have standard sizes: 24×36, 28×54, 30×54, 32×48, 36×60 — use these as anchors when uncertain\n` +
      `- If a window is partially obstructed, note it and give your best estimate with lower confidence\n` +
      `- DO NOT count doors as windows\n\n` +
      `Return ONLY valid JSON:\n` +
      `{\n` +
      `  "totalWindowsDetected": number,\n` +
      `  "windows": [{\n` +
      `    "locationLabel": string,\n` +
      `    "elevation": string,\n` +
      `    "estimatedWidth": number,\n` +
      `    "estimatedHeight": number,\n` +
      `    "windowType": string,\n` +
      `    "condition": string,\n` +
      `    "confidence": number,\n` +
      `    "issues": string[],\n` +
      `    "notes": string\n` +
      `  }],\n` +
      `  "propertyNotes": string,\n` +
      `  "imagQualityWarnings": string[]\n` +
      `}`;

    let rawResponse = '';
    let parsed: any = null;

    try {
      rawResponse = await this.provider.analyzeImages(images, userPrompt, systemPrompt);
      parsed = JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
    } catch (parseErr) {
      logger.warn('[analyzePropertyPhotos] JSON parse failed, using partial result:', parseErr);
      // Attempt to extract any partial JSON
      parsed = {
        totalWindowsDetected: 0,
        windows: [],
        propertyNotes: 'Analysis returned unparseable response — please retry.',
        imagQualityWarnings: ['Response parse failure — raw AI response was not valid JSON'],
      };
    }

    // Normalise spelling variant in prompt (imagQualityWarnings → imageQualityWarnings)
    const imageQualityWarnings: string[] =
      parsed.imageQualityWarnings ?? parsed.imagQualityWarnings ?? [];

    const avgConfidence =
      parsed.windows?.length > 0
        ? (parsed.windows as any[]).reduce((s: number, w: any) => s + (w.confidence ?? 0), 0) /
          parsed.windows.length
        : 0;

    const analysis = await prisma.aiAnalysis.create({
      data: {
        leadId,
        analysisType: 'PROPERTY_PHOTO_SCAN',
        provider: process.env.AI_PROVIDER || 'openai',
        model: process.env.AI_VISION_MODEL || 'gpt-4o',
        rawResponse: parsed,
        confidenceScore: avgConfidence,
        status: 'COMPLETED',
        processingMs: Date.now() - startMs,
      } as any,
    });

    return {
      totalWindowsDetected: parsed.totalWindowsDetected ?? parsed.windows?.length ?? 0,
      windows: (parsed.windows ?? []).map((w: any) => ({
        locationLabel: String(w.locationLabel ?? ''),
        elevation: String(w.elevation ?? ''),
        estimatedWidth: Number(w.estimatedWidth ?? 0),
        estimatedHeight: Number(w.estimatedHeight ?? 0),
        windowType: String(w.windowType ?? 'UNKNOWN'),
        condition: String(w.condition ?? 'UNKNOWN'),
        confidence: Number(w.confidence ?? 0),
        issues: Array.isArray(w.issues) ? w.issues.map(String) : [],
        notes: String(w.notes ?? ''),
      })),
      propertyNotes: String(parsed.propertyNotes ?? ''),
      imageQualityWarnings,
      aiAnalysisId: analysis.id,
    };
  }

  // ─── Feature B: Reference-Object Single Window Measurement ────────────────
  async analyzeWithReferenceObject(params: {
    imageBase64: string;
    referenceObject: 'iphone' | 'credit_card' | 'dollar_bill';
    openingId: string;
    leadId: string;
    analyzedById: string;
  }): Promise<ReferenceObjectAnalysis> {
    const { imageBase64, referenceObject, openingId, leadId } = params;
    const startMs = Date.now();

    // Known reference dimensions (mm → inches)
    const REF_DIMS: Record<string, { widthIn: number; heightIn: number; label: string }> = {
      iphone:      { widthIn: 2.81, heightIn: 5.78, label: 'iPhone 14' },
      credit_card: { widthIn: 3.37, heightIn: 2.13, label: 'credit card' },
      dollar_bill: { widthIn: 6.14, heightIn: 2.61, label: 'US dollar bill' },
    };
    const ref = REF_DIMS[referenceObject];
    const refWidth  = ref.widthIn;
    const refHeight = ref.heightIn;
    const refLabel  = ref.label;

    const prompt =
      `This photo shows a window with a ${refLabel} held against the frame as a size reference.\n\n` +
      `Known reference dimensions:\n` +
      `- ${refLabel} is exactly ${refWidth}" wide × ${refHeight}" tall\n\n` +
      `Using the reference object as a ruler, calculate:\n` +
      `1. The window rough opening WIDTH in inches (to nearest 1/8 inch)\n` +
      `2. The window rough opening HEIGHT in inches (to nearest 1/8 inch)\n` +
      `3. Your confidence in these measurements (0.0–1.0)\n` +
      `4. Whether the reference object placement is valid ` +
      `(is it flush against frame? fully visible? not distorted?)\n` +
      `5. The window type visible\n` +
      `6. Any measurement caveats\n\n` +
      `Return ONLY valid JSON:\n` +
      `{\n` +
      `  "estimatedWidth": number,\n` +
      `  "estimatedHeight": number,\n` +
      `  "confidence": number,\n` +
      `  "referenceValid": boolean,\n` +
      `  "referenceWarning": string | null,\n` +
      `  "windowType": string,\n` +
      `  "measurementNotes": string\n` +
      `}`;

    let rawResponse = '';
    let parsed: any = null;

    try {
      rawResponse = await this.provider.analyzeImage(imageBase64, prompt);
      parsed = JSON.parse(rawResponse.replace(/```json\n?|\n?```/g, '').trim());
    } catch (parseErr) {
      logger.warn('[analyzeWithReferenceObject] JSON parse failed:', parseErr);
      parsed = {
        estimatedWidth: 0,
        estimatedHeight: 0,
        confidence: 0,
        referenceValid: false,
        referenceWarning: 'Analysis returned unparseable response — please retake photo.',
        windowType: 'UNKNOWN',
        measurementNotes: 'Parse failure',
      };
    }

    const analysis = await prisma.aiAnalysis.create({
      data: {
        leadId,
        openingId,
        analysisType: 'REFERENCE_OBJECT_MEASUREMENT',
        provider: process.env.AI_PROVIDER || 'openai',
        model: process.env.AI_VISION_MODEL || 'gpt-4o',
        rawResponse: parsed,
        estimatedWidth: parsed.estimatedWidth ?? null,
        estimatedHeight: parsed.estimatedHeight ?? null,
        confidenceScore: parsed.confidence ?? null,
        status: 'COMPLETED',
        processingMs: Date.now() - startMs,
      } as any,
    });

    return {
      estimatedWidth:    Number(parsed.estimatedWidth  ?? 0),
      estimatedHeight:   Number(parsed.estimatedHeight ?? 0),
      confidence:        Number(parsed.confidence      ?? 0),
      referenceValid:    Boolean(parsed.referenceValid),
      referenceWarning:  parsed.referenceWarning ?? null,
      windowType:        String(parsed.windowType ?? 'UNKNOWN'),
      measurementNotes:  String(parsed.measurementNotes ?? ''),
      aiAnalysisId: analysis.id,
    };
  }
}

export const aiService = new AiService();
