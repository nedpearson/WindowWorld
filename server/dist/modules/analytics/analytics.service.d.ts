export declare class AnalyticsService {
    getRevenueSummary(organizationId: string, periodDays?: number): Promise<{
        period: {
            days: number;
            since: Date;
        };
        revenue: {
            totalInvoiced: number;
            totalCollected: number;
            outstanding: number;
            paidInvoiceCount: number;
            overdueCount: number;
            overdueAmount: number;
        };
        pipeline: {
            proposalValue: number;
            closedValue: number;
            closeRate: number;
            sentCount: number;
            acceptedCount: number;
            totalProposals: number;
        };
        leads: {
            total: number;
            new: number;
            closed: number;
            closeRate: number;
            avgCloseProb: number;
            pipelineValue: number;
        };
        appointments: {
            total: number;
            completed: number;
            noShows: number;
            showRate: number;
        };
    }>;
    getRepPerformance(organizationId: string, periodDays?: number): Promise<{
        id: string;
        name: string;
        role: import(".prisma/client").$Enums.UserRole;
        metrics: {
            leadsAssigned: number;
            proposalsSent: number;
            dealsClosed: number;
            revenue: number;
            closeRate: number;
            avgDealSize: number;
        };
    }[]>;
    getLeadSourceBreakdown(organizationId: string, periodDays?: number): Promise<any[]>;
    getRevenueTrend(organizationId: string, periodDays?: number): Promise<{
        week: string;
        amount: number;
    }[]>;
    getConversionFunnel(organizationId: string, periodDays?: number): Promise<{
        pct: number;
        key: string;
        label: string;
        count: number;
    }[]>;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map