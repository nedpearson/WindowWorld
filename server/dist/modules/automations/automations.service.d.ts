export declare class AutomationService {
    list(organizationId: string): Promise<({
        runs: {
            status: import(".prisma/client").$Enums.JobStatus;
            errorMessage: string | null;
            completedAt: Date | null;
            triggeredAt: Date;
        }[];
    } & {
        description: string | null;
        id: string;
        organizationId: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        actions: import("@prisma/client/runtime/library").JsonValue;
        delayMinutes: number | null;
        runCount: number;
        lastRunAt: Date | null;
    })[]>;
    getById(id: string, organizationId: string): Promise<{
        runs: {
            id: string;
            result: import("@prisma/client/runtime/library").JsonValue | null;
            status: import(".prisma/client").$Enums.JobStatus;
            errorMessage: string | null;
            leadId: string | null;
            completedAt: Date | null;
            automationId: string;
            triggeredAt: Date;
        }[];
    } & {
        description: string | null;
        id: string;
        organizationId: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        actions: import("@prisma/client/runtime/library").JsonValue;
        delayMinutes: number | null;
        runCount: number;
        lastRunAt: Date | null;
    }>;
    create(organizationId: string, data: {
        name: string;
        description?: string;
        trigger: string;
        conditions?: any;
        actions: any;
        delayMinutes?: number;
    }): Promise<{
        description: string | null;
        id: string;
        organizationId: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        actions: import("@prisma/client/runtime/library").JsonValue;
        delayMinutes: number | null;
        runCount: number;
        lastRunAt: Date | null;
    }>;
    update(id: string, organizationId: string, data: Partial<{
        name: string;
        description: string;
        isActive: boolean;
        conditions: any;
        actions: any;
        delayMinutes: number;
    }>): Promise<{
        description: string | null;
        id: string;
        organizationId: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        actions: import("@prisma/client/runtime/library").JsonValue;
        delayMinutes: number | null;
        runCount: number;
        lastRunAt: Date | null;
    }>;
    toggle(id: string, organizationId: string): Promise<{
        description: string | null;
        id: string;
        organizationId: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        trigger: import(".prisma/client").$Enums.AutomationTrigger;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        actions: import("@prisma/client/runtime/library").JsonValue;
        delayMinutes: number | null;
        runCount: number;
        lastRunAt: Date | null;
    }>;
    getRuns(automationId: string, organizationId: string, limit?: number): Promise<{
        id: string;
        result: import("@prisma/client/runtime/library").JsonValue | null;
        status: import(".prisma/client").$Enums.JobStatus;
        errorMessage: string | null;
        leadId: string | null;
        completedAt: Date | null;
        automationId: string;
        triggeredAt: Date;
    }[]>;
}
export declare const automationService: AutomationService;
//# sourceMappingURL=automations.service.d.ts.map