export declare class SiloAiService {
    generateMorningBrief(repId: string): Promise<{
        bestLeadsToWork: {
            id: string;
            name: string;
            reason: string;
        }[];
        hottestProposals: {
            id: string;
            name: string;
            value: number;
            action: string;
        }[];
        overdueFollowUps: {
            id: string;
            name: string;
            daysOverdue: number;
        }[];
        dealsAtRisk: never[];
        moneyLikelyThisWeek: number;
        fastestWins: never[];
        highestTicketOpportunities: never[];
        dailyActionPlan: string[];
        scores: {
            todayScore: number;
            pipelineScore: number;
            closingMomentum: number;
            followUpDiscipline: number;
            revenuePace: number;
            appointmentReadiness: number;
        };
    }>;
    generateAppointmentPrep(appointmentId: string): Promise<{
        homeownerSummary: string;
        propertySummary: string;
        likelyNeeds: string[];
        likelyObjections: string[];
        budgetSensitivityEstimate: string;
        financingLikelihood: string;
        bestPitchAngle: string;
        bestProductRecommendation: string;
        upsellOpportunity: string;
        trustBuildingTalkingPoints: string[];
        opener: string;
        closingStrategy: string;
        questionsToAsk: string[];
        risksToWatchFor: string[];
    }>;
    getFollowUpQueue(repId: string): Promise<{
        id: string;
        type: string;
        leadName: string;
        value: number;
        reason: string;
        recommendedAction: string;
        recommendedMessage: string;
        urgencyAngle: string;
        probabilityOfResponse: string;
    }[]>;
    getLiveAssist(promptType: string, context?: any): Promise<any>;
    analyzeProposal(proposalId: string): Promise<{
        underpricedOpportunities: boolean;
        premiumUpgradeOpportunities: string[];
        financingAngleOpportunities: string;
        packageBundleOpportunities: string;
        urgencyOpportunities: string;
        objectionRisks: string[];
        likelyDiscountTrapRisks: boolean;
        recommendedAction: string;
    }>;
}
export declare const siloAiService: SiloAiService;
//# sourceMappingURL=silo-ai.service.d.ts.map