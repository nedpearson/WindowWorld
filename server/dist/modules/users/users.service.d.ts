import { UserRole } from '@prisma/client';
export declare class UsersService {
    list(organizationId: string, options: {
        role?: UserRole;
        search?: string;
        isActive?: boolean;
    }): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        territories: ({
            territory: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            userId: string;
            territoryId: string;
            isPrimary: boolean;
            assignedAt: Date;
        })[];
        _count: {
            assignedLeads: number;
        };
    }[]>;
    getById(id: string): Promise<{
        id: string;
        email: string;
        organizationId: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        territories: ({
            territory: {
                description: string | null;
                id: string;
                organizationId: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                state: string;
                parishes: string[];
                zipCodes: string[];
                centerLat: number | null;
                centerLng: number | null;
                radiusMiles: number | null;
            };
        } & {
            id: string;
            userId: string;
            territoryId: string;
            isPrimary: boolean;
            assignedAt: Date;
        })[];
        _count: {
            assignedLeads: number;
        };
    }>;
    create(data: {
        organizationId: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        phone?: string;
    }, createdById: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }>;
    update(id: string, data: any, updatedById: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }>;
    deactivate(id: string, adminId: string): Promise<{
        id: string;
        email: string;
        googleId: string | null;
        organizationId: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        notifPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getLeaderboard(organizationId: string, period?: 'week' | 'month' | 'quarter'): Promise<{
        id: string;
        name: string;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        closedDeals: number;
        revenue: number;
        totalLeads: number;
    }[]>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=users.service.d.ts.map