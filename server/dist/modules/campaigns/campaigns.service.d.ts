export declare const CAMPAIGN_TEMPLATES: {
    'new-lead-welcome': {
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
    };
    'proposal-sent-followup': {
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
    };
    'storm-lead-urgency': {
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
    };
    'post-install-review': {
        name: string;
        description: string;
        triggerStatus: string;
        steps: {
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        }[];
    };
    'no-answer-sequence': {
        name: string;
        description: string;
        triggerStatus: null;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        } | {
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        })[];
    };
};
export declare const EMAIL_TEMPLATES: Record<string, (data: any) => {
    subject?: string;
    text: string;
    html: string;
}>;
export declare const SMS_TEMPLATES: Record<string, (data: any) => string>;
export declare class CampaignsService {
    list(organizationId: string): Promise<({
        [x: string]: ({
            leadScore: number | null;
            id: string;
            email: string | null;
            organizationId: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            state: string | null;
            zip: string | null;
            territoryId: string | null;
            assignedRepId: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            source: string | null;
            sourceDetail: string | null;
            campaignId: string | null;
            phone2: string | null;
            parish: string | null;
            lat: number | null;
            lng: number | null;
            urgencyScore: number | null;
            closeProbability: number | null;
            financingPropensity: number | null;
            estimatedRevenue: number | null;
            isStormLead: boolean;
            stormEventId: string | null;
            isDuplicate: boolean;
            duplicateOfId: string | null;
            lastContactedAt: Date | null;
            nextFollowUpAt: Date | null;
            followUpCount: number;
            lostReason: string | null;
            lostToCompetitor: string | null;
            referredById: string | null;
            notes: string | null;
            tags: string[];
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            deletedAt: Date | null;
        } | {
            leadScore: number | null;
            id: string;
            email: string | null;
            organizationId: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            state: string | null;
            zip: string | null;
            territoryId: string | null;
            assignedRepId: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            source: string | null;
            sourceDetail: string | null;
            campaignId: string | null;
            phone2: string | null;
            parish: string | null;
            lat: number | null;
            lng: number | null;
            urgencyScore: number | null;
            closeProbability: number | null;
            financingPropensity: number | null;
            estimatedRevenue: number | null;
            isStormLead: boolean;
            stormEventId: string | null;
            isDuplicate: boolean;
            duplicateOfId: string | null;
            lastContactedAt: Date | null;
            nextFollowUpAt: Date | null;
            followUpCount: number;
            lostReason: string | null;
            lostToCompetitor: string | null;
            referredById: string | null;
            notes: string | null;
            tags: string[];
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            deletedAt: Date | null;
        })[] | {
            leadScore: number | null;
            id: string;
            email: string | null;
            organizationId: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            city: string | null;
            state: string | null;
            zip: string | null;
            territoryId: string | null;
            assignedRepId: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            source: string | null;
            sourceDetail: string | null;
            campaignId: string | null;
            phone2: string | null;
            parish: string | null;
            lat: number | null;
            lng: number | null;
            urgencyScore: number | null;
            closeProbability: number | null;
            financingPropensity: number | null;
            estimatedRevenue: number | null;
            isStormLead: boolean;
            stormEventId: string | null;
            isDuplicate: boolean;
            duplicateOfId: string | null;
            lastContactedAt: Date | null;
            nextFollowUpAt: Date | null;
            followUpCount: number;
            lostReason: string | null;
            lostToCompetitor: string | null;
            referredById: string | null;
            notes: string | null;
            tags: string[];
            customFields: import("@prisma/client/runtime/library").JsonValue | null;
            deletedAt: Date | null;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: string;
        stormEventId: string | null;
        notes: string | null;
        type: string;
        targetParishes: string[];
        targetZips: string[];
        targetLeadStatus: string[];
        isStormCampaign: boolean;
        leadCount: number;
        contactedCount: number;
        appointmentCount: number;
        closeCount: number;
        revenue: number;
        startDate: Date | null;
        endDate: Date | null;
    })[]>;
    templates(): Promise<({
        stepCount: number;
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
        id: string;
    } | {
        stepCount: number;
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
        id: string;
    } | {
        stepCount: number;
        name: string;
        description: string;
        triggerStatus: string;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        } | {
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        })[];
        id: string;
    } | {
        stepCount: number;
        name: string;
        description: string;
        triggerStatus: string;
        steps: {
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        }[];
        id: string;
    } | {
        stepCount: number;
        name: string;
        description: string;
        triggerStatus: null;
        steps: ({
            step: number;
            delayHours: number;
            type: string;
            templateKey: string;
            subject?: undefined;
        } | {
            step: number;
            delayHours: number;
            type: string;
            subject: string;
            templateKey: string;
        })[];
        id: string;
    })[]>;
    enroll(leadId: string, campaignTemplateKey: string, enrolledById: string): Promise<{
        enrolled: boolean;
        message: string;
        enrollmentId?: undefined;
    } | {
        enrolled: boolean;
        enrollmentId: any;
        message?: undefined;
    }>;
    executeStep(params: {
        automationId: string;
        leadId: string;
        step: number;
    }): Promise<void>;
    private scheduleNextStep;
    unenroll(leadId: string, reason?: string): Promise<void>;
    triggerForStatus(leadId: string, status: string, enrolledById: string): Promise<{
        triggered: string[];
    }>;
}
export declare const campaignsService: CampaignsService;
//# sourceMappingURL=campaigns.service.d.ts.map