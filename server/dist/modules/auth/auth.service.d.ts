export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    organizationId: string;
    firstName: string;
    lastName: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface LoginResult {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        organizationId: string;
        avatarUrl: string | null;
    };
    tokens: AuthTokens;
}
export declare class AuthService {
    login(email: string, password: string): Promise<LoginResult>;
    googleLogin(token: string): Promise<LoginResult>;
    refreshTokens(refreshToken: string): Promise<AuthTokens & {
        user: LoginResult['user'];
    }>;
    logout(refreshToken: string, userId: string): Promise<void>;
    logoutAll(userId: string): Promise<void>;
    hashPassword(password: string): Promise<string>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    getMe(userId: string): Promise<{
        organization: {
            id: string;
            name: string;
            slug: string;
            logoUrl: string | null;
            brandColor: string | null;
        };
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
                id: string;
                name: string;
                parishes: string[];
                zipCodes: string[];
            };
        } & {
            id: string;
            userId: string;
            territoryId: string;
            isPrimary: boolean;
            assignedAt: Date;
        })[];
    }>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map