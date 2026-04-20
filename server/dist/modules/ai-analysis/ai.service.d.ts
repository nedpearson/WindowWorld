export declare class AiService {
    private provider;
    constructor();
    analyzeWindowPhoto(params: {
        imageBase64: string;
        openingId?: string;
        leadId?: string;
        context?: string;
    }): Promise<any>;
    generateLeadPitch(lead: any): Promise<any>;
    scoreLead(lead: any): Promise<any>;
    analyzeMeasurementPhoto(params: {
        imageBase64: string;
        referenceObjectDescription?: string;
        referenceObjectSizeInches?: number;
        openingId?: string;
    }): Promise<any>;
    generateInspectionSummary(params: {
        leadId: string;
        inspectionId: string;
        openings: any[];
        photos: any[];
    }): Promise<any>;
    generateProposalContent(params: {
        lead: any;
        quote: any;
        openings: any[];
        brandingMode?: string;
    }): Promise<any>;
    generatePitchCoach(lead: any): Promise<any>;
    generateLeadSummary(lead: any): Promise<any>;
}
export declare const aiService: AiService;
//# sourceMappingURL=ai.service.d.ts.map