export declare class TerritoriesService {
    list(organizationId: string): Promise<({
        _count: {
            leads: number;
        };
        users: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatarUrl: string | null;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            userId: string;
            territoryId: string;
            isPrimary: boolean;
            assignedAt: Date;
        })[];
    } & {
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
    })[]>;
    getById(id: string): Promise<{
        _count: {
            leads: number;
        };
        users: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatarUrl: string | null;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            userId: string;
            territoryId: string;
            isPrimary: boolean;
            assignedAt: Date;
        })[];
    } & {
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
    }>;
    create(data: any, userId: string): Promise<{
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
    }>;
    update(id: string, data: any, userId: string): Promise<{
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
    }>;
    assignRep(territoryId: string, userId: string, isPrimary: boolean): Promise<{
        id: string;
        userId: string;
        territoryId: string;
        isPrimary: boolean;
        assignedAt: Date;
    }>;
    removeRep(territoryId: string, userId: string): Promise<{
        id: string;
        userId: string;
        territoryId: string;
        isPrimary: boolean;
        assignedAt: Date;
    }>;
    getLeadHeatmap(id: string): Promise<{
        territory: {
            _count: {
                leads: number;
            };
            users: ({
                user: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    avatarUrl: string | null;
                    role: import(".prisma/client").$Enums.UserRole;
                };
            } & {
                id: string;
                userId: string;
                territoryId: string;
                isPrimary: boolean;
                assignedAt: Date;
            })[];
        } & {
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
        leads: {
            leadScore: number | null;
            id: string;
            zip: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            parish: string | null;
            lat: number | null;
            lng: number | null;
            urgencyScore: number | null;
            isStormLead: boolean;
        }[];
        byParish: Record<string, {
            count: number;
            avgScore: number;
            leads: any[];
        }>;
    }>;
}
export declare const territoriesService: TerritoriesService;
//# sourceMappingURL=territories.service.d.ts.map