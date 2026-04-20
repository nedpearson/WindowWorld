interface AuditLogParams {
    userId?: string;
    entityType: string;
    entityId: string;
    action: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    log(params: AuditLogParams): Promise<void>;
    getHistory(entityType: string, entityId: string): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        userId: string | null;
        entityType: string;
        entityId: string;
        action: string;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        deviceId: string | null;
        occurredAt: Date;
    })[]>;
}
export declare const auditService: AuditService;
export {};
//# sourceMappingURL=audit.service.d.ts.map