export declare class OrganizationService {
    getById(id: string): Promise<{
        territories: {
            id: string;
            name: string;
            parishes: string[];
        }[];
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            lastLoginAt: Date | null;
        }[];
    } & {
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logoUrl: string | null;
        brandColor: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        website: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(id: string, userId: string, data: {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        website?: string;
        brandColor?: string;
        settings?: Record<string, any>;
    }): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logoUrl: string | null;
        brandColor: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        website: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getStats(id: string): Promise<{
        leadCount: number;
        activeUsers: number;
        proposalCount: number;
    }>;
}
export declare const organizationService: OrganizationService;
//# sourceMappingURL=organizations.service.d.ts.map