import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';
import { aiService } from '../ai-analysis/ai.service'; // Use existing provider

export class SiloAiService {

  // Phase 2: Morning Brief — powered by Claude AI
  async generateMorningBrief(repId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch data for the rep
    const leads = await prisma.lead.findMany({
      where: { assignedRepId: repId, status: { notIn: ['SOLD', 'LOST', 'INSTALLED', 'PAID'] } },
      include: { leadScores: { take: 1, orderBy: { scoredAt: 'desc' } }, activities: { take: 1, orderBy: { createdAt: 'desc' } } }
    });

    const appointments = await prisma.appointment.findMany({
      where: { createdById: repId, scheduledAt: { gte: today } },
      include: { lead: true }
    });

    const proposals = await prisma.proposal.findMany({
      where: { createdById: repId, status: { in: ['SENT', 'VIEWED'] } },
      include: { lead: true, quote: true }
    });

    const hasData = leads.length > 0 || appointments.length > 0 || proposals.length > 0;

    // Build a rich context prompt for Claude
    const leadsContext = leads.slice(0, 10).map(l => {
      const lastActivity = l.activities?.[0]?.createdAt ? new Date(l.activities[0].createdAt).toLocaleDateString() : 'never';
      const score = l.leadScores?.[0]?.closeProbability ?? l.leadScore ?? 0;
      return `  - ${l.firstName} ${l.lastName} (${l.status}, score=${score}, lastContact=${lastActivity}, city=${l.city || 'unknown'})`;
    }).join('\n');

    const apptContext = appointments.map(a => {
      const lead = a.lead;
      return `  - ${lead.firstName} ${lead.lastName} at ${new Date(a.scheduledAt).toLocaleString()} (${a.type || 'appointment'}, city=${lead.city || 'unknown'})`;
    }).join('\n');

    const proposalContext = proposals.map(p => {
      return `  - ${p.lead.firstName} ${p.lead.lastName}: $${p.quote?.total || 0} (status=${p.status}, sent=${new Date(p.createdAt).toLocaleDateString()})`;
    }).join('\n');

    const prompt = `You are Silo AI, the personal sales coach for a window, door, and siding sales rep.
Generate a tactical morning brief based on this rep's real CRM data.

ACTIVE LEADS (${leads.length} total):
${leadsContext || '  (none)'}

TODAY'S APPOINTMENTS (${appointments.length}):
${apptContext || '  (none)'}

PENDING PROPOSALS (${proposals.length}):
${proposalContext || '  (none)'}

Return ONLY valid JSON matching this exact structure (no markdown fences):
{
  "bestLeadsToWork": [{"id": "string", "name": "string", "reason": "string"}],
  "hottestProposals": [{"id": "string", "name": "string", "value": number, "action": "string"}],
  "overdueFollowUps": [{"id": "string", "name": "string", "daysOverdue": number}],
  "dealsAtRisk": [{"id": "string", "name": "string", "riskFactor": "string"}],
  "moneyLikelyThisWeek": number,
  "fastestWins": [{"id": "string", "name": "string", "action": "string"}],
  "highestTicketOpportunities": [{"id": "string", "name": "string", "value": number}],
  "dailyActionPlan": ["action 1", "action 2", "action 3"],
  "scores": {
    "todayScore": 0-100,
    "pipelineScore": 0-100,
    "closingMomentum": 0-100,
    "followUpDiscipline": 0-100,
    "revenuePace": 0-100,
    "appointmentReadiness": 0-100
  }
}`;

    try {
      const raw = await aiService.generateText(prompt);
      const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(json);
    } catch (e) {
      // Fallback to rule-based if Claude is unavailable
      const moneyLikelyThisWeek = proposals.reduce((acc, p) => acc + (p.quote?.total || 0), 0) * 0.4;
      return {
        bestLeadsToWork: leads.slice(0, 3).map(l => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, reason: "High intent score" })),
        hottestProposals: proposals.slice(0, 2).map(p => ({ id: p.id, name: `${p.lead.firstName} ${p.lead.lastName}`, value: p.quote?.total || 0, action: "Call to close" })),
        overdueFollowUps: leads.filter(l => !l.lastContactedAt).slice(0, 2).map(l => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, daysOverdue: 3 })),
        dealsAtRisk: [],
        moneyLikelyThisWeek: hasData ? moneyLikelyThisWeek : 0,
        fastestWins: [],
        highestTicketOpportunities: [],
        dailyActionPlan: hasData ? [
          ...(appointments.length > 0 ? [`Prep for ${appointments.length} appointment(s) today`] : []),
          ...(proposals.length > 0 ? [`Follow up on ${proposals.length} active proposal(s)`] : []),
          ...(leads.length > 0 ? [`Call top ${Math.min(leads.length, 3)} leads`] : []),
        ] : ['Add your first lead', 'Explore the product catalog'],
        scores: hasData ? {
          todayScore: 85, pipelineScore: 90, closingMomentum: 75, followUpDiscipline: 60, revenuePace: 80, appointmentReadiness: 95
        } : {
          todayScore: 0, pipelineScore: 0, closingMomentum: 0, followUpDiscipline: 0, revenuePace: 0, appointmentReadiness: 0
        }
      };
    }
  }

  // Phase 3: Appointment Domination — powered by Claude AI
  async generateAppointmentPrep(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { lead: { include: { properties: true, activities: { take: 5, orderBy: { createdAt: 'desc' } } } } }
    });

    if (!appointment) throw new Error("Appointment not found");

    const lead = appointment.lead;
    const property = lead.properties?.[0];
    const propertyAge = property?.yearBuilt ? new Date().getFullYear() - property.yearBuilt : null;

    const prompt = `You are an expert window, door, and siding sales coach for a Baton Rouge, Louisiana company.
Generate a detailed appointment preparation briefing for this homeowner visit.

HOMEOWNER: ${lead.firstName} ${lead.lastName}
CITY: ${lead.city || 'unknown'}
LEAD SOURCE: ${lead.source || 'unknown'}
LEAD SCORE: ${lead.leadScore || 'N/A'}
STATUS: ${lead.status}
NOTES: ${lead.notes || 'none'}
PROPERTY YEAR BUILT: ${property?.yearBuilt || 'unknown'}
PROPERTY AGE: ${propertyAge ? `${propertyAge} years` : 'unknown'}
PROPERTY TYPE: ${property?.propertyType || 'residential'}
COMPETITOR MENTIONED: ${lead.competitorMentioned || 'none'}
STORM LEAD: ${lead.isStormLead ? 'YES' : 'no'}
APPOINTMENT TIME: ${new Date(appointment.scheduledAt).toLocaleString()}

Return ONLY valid JSON (no markdown fences):
{
  "homeownerSummary": "1-2 sentence summary of the homeowner",
  "propertySummary": "1-2 sentence summary of the property",
  "likelyNeeds": ["need1", "need2", "need3"],
  "likelyObjections": ["objection1", "objection2", "objection3"],
  "budgetSensitivityEstimate": "Low|Medium|High",
  "financingLikelihood": "Low|Medium|High",
  "bestPitchAngle": "the primary sales angle to lead with",
  "bestProductRecommendation": "specific product recommendation",
  "upsellOpportunity": "specific upsell opportunity",
  "trustBuildingTalkingPoints": ["point1", "point2", "point3"],
  "opener": "personalized opening line for the appointment",
  "closingStrategy": "recommended closing strategy",
  "questionsToAsk": ["question1", "question2", "question3"],
  "risksToWatchFor": ["risk1", "risk2"]
}`;

    try {
      const raw = await aiService.generateText(prompt);
      const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(json);
    } catch (e) {
      // Fallback to rule-based
      let pitchAngle = "Energy Savings & Draft Reduction";
      let productRec = "Series 4000 Double Hung Windows";
      let upsellOpportunity = "Therma-Tru Classic Craft Entry Door (Curb Appeal Bundle)";
      if (propertyAge && propertyAge > 40) {
        pitchAngle = "Complete Exterior Transformation (Curb Appeal)";
        productRec = "Premium Vinyl Siding + Window Bundle";
      } else if (lead.city?.toLowerCase() === 'new orleans' || lead.city?.toLowerCase() === 'mandeville') {
        pitchAngle = "Storm Protection & Coastal Durability";
        productRec = "Series 6000 Impact Windows";
        upsellOpportunity = "Impact-Rated Patio Doors";
      }
      return {
        homeownerSummary: `${lead.firstName} ${lead.lastName} is looking for exterior home improvements.`,
        propertySummary: `${property?.yearBuilt || 'Older'} home in ${lead.city || 'local area'}.`,
        likelyNeeds: ["Energy efficiency", "Curb appeal update", "Draft reduction"],
        likelyObjections: ["Price too high", "Need to think about it", "HOA approval needed"],
        budgetSensitivityEstimate: "Medium",
        financingLikelihood: "High",
        bestPitchAngle: pitchAngle,
        bestProductRecommendation: productRec,
        upsellOpportunity,
        trustBuildingTalkingPoints: ["Local Baton Rouge company", "Lifetime transferable warranty", "Factory-direct pricing"],
        opener: "Hi! Beautiful home you have here, I noticed...",
        closingStrategy: "Assume the close on financing to get the project locked in.",
        questionsToAsk: ["How long have you lived here?", "Are there drafts?", "Are you planning to paint the exterior soon?"],
        risksToWatchFor: ["Competitor quotes", "HOA restrictions on exterior modifications"]
      };
    }
  }

  // Phase 5: Follow-Up Money Engine
  async getFollowUpQueue(repId: string) {
    const proposals = await prisma.proposal.findMany({
      where: { createdById: repId, status: { in: ['SENT', 'VIEWED'] } },
      include: { lead: true, quote: true }
    });

    const priorityFollowUps = proposals.map(p => ({
      id: p.leadId,
      type: 'proposal_stalled',
      name: `${p.lead.firstName} ${p.lead.lastName}`,
      status: p.status,
      daysStale: Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 3600 * 24)),
      value: p.quote?.total || 0,
      siloReason: p.status === 'VIEWED' ? 'Opened proposal but no reply' : 'Proposal sent 3+ days ago',
      recommendedAction: 'text',
      recommendedMessage: `Hi ${p.lead.firstName}, just checking if you had any questions on the window quote?`,
      urgencyAngle: 'End of month promo',
      probabilityOfResponse: 'High'
    }));
    
    return { priorityFollowUps };
  }

  // Phase 4: Live Sales Assistant — powered by Claude AI
  async getLiveAssist(promptType: string, context?: any) {
    const prompt = `You are a real-time sales coach for a window, door, and siding company in Baton Rouge, LA.
A sales rep is in the field and needs immediate help with this objection or situation: "${promptType}"

${context ? `Additional context: ${JSON.stringify(context)}` : ''}

Return ONLY valid JSON (no markdown fences):
{
  "script": "The exact word-for-word script the rep should say right now",
  "tactic": "Brief name of the sales tactic being used",
  "followUp": "What to say if the customer pushes back again"
}`;

    try {
      const raw = await aiService.generateText(prompt);
      const json = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(json);
    } catch (e) {
      // Fallback to canned responses
      const responses: Record<string, any> = {
        'price_high': { script: "I completely understand. Quality windows are an investment. If we could get the monthly payment down to $150, would that make it comfortable?", tactic: "Pivot to monthly payment" },
        'think_about_it': { script: "Of course. Usually when folks say that, it's either the price or they aren't sure about the product. Which one is it for you?", tactic: "Isolate the objection" },
        'competitor_quote': { script: "It's smart to shop around. Did they quote you for a fully welded vinyl frame or mechanically fastened? Because that makes a huge difference in Louisiana heat.", tactic: "Introduce FUD on cheaper products" },
        'financing_ask': { script: "We have great options. Most of our customers go with the 18-months same-as-cash. It keeps your cash in the bank.", tactic: "Assume financing" }
      };
      return responses[promptType] || { script: "Let's explore that further...", tactic: "Ask clarifying question" };
    }
  }

  // Phase 6: Proposal Radar (Upsell/Risk)
  async analyzeProposal(proposalId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        quote: {
          include: {
            lineItems: { include: { product: true } }
          }
        }
      }
    });

    if (!proposal || !proposal.quote) {
      return {
        underpricedOpportunities: false,
        premiumUpgradeOpportunities: [],
        financingAngleOpportunities: "Offer Financing",
        packageBundleOpportunities: "None",
        urgencyOpportunities: "Lock in pricing",
        objectionRisks: [],
        likelyDiscountTrapRisks: false,
        recommendedAction: "Review proposal"
      };
    }

    const lineItems = proposal.quote.lineItems || [];
    const hasWindows = lineItems.some(l => l.product?.name.toLowerCase().includes('window') || l.description.toLowerCase().includes('window') || l.product?.categoryId != null);
    const hasDoors = lineItems.some(l => l.product?.name.toLowerCase().includes('door') || l.description.toLowerCase().includes('door'));
    const hasSiding = lineItems.some(l => l.product?.name.toLowerCase().includes('siding') || l.description.toLowerCase().includes('siding'));

    let packageBundleOpportunities = [];
    let premiumUpgradeOpportunities = [];
    let bestPitchAngle = "Curb Appeal & Home Value";

    if (hasWindows && !hasDoors && !hasSiding) {
      packageBundleOpportunities.push("Bundle Entry or Patio Door (Whole House Exterior Bundle)");
      premiumUpgradeOpportunities.push("Impact Glass Upgrade (Hurricane Protection)");
      bestPitchAngle = "Energy Efficiency & Window Aesthetics";
    } else if (hasWindows && hasDoors) {
      packageBundleOpportunities.push("Complete Exterior Transformation (Add Siding)");
      bestPitchAngle = "Complete Exterior Security & Comfort";
    } else if (hasSiding) {
      packageBundleOpportunities.push("Bundle Replacement Windows to maximize exterior thermal envelope");
      bestPitchAngle = "Maximum Thermal Envelope Insulation";
    } else {
      packageBundleOpportunities.push("Cross-sell Siding and Shutters");
      premiumUpgradeOpportunities.push("Lifetime Extended Warranty");
    }

    return {
      underpricedOpportunities: true,
      premiumUpgradeOpportunities: premiumUpgradeOpportunities.length ? premiumUpgradeOpportunities : ["Extended Warranty Package"],
      financingAngleOpportunities: "Offer 18-Mo Same-as-Cash",
      packageBundleOpportunities: packageBundleOpportunities.length ? packageBundleOpportunities.join(', ') : "Include Storm Protection Add-ons",
      urgencyOpportunities: "Lock in pre-season exterior product pricing",
      objectionRisks: ["Wife not present", "HOA approval needed for exterior changes"],
      likelyDiscountTrapRisks: false,
      recommendedAction: `Pitch the ${bestPitchAngle} angle first.`
    };
  }
}

export const siloAiService = new SiloAiService();
