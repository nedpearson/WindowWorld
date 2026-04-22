"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const logger_1 = require("../../shared/utils/logger");
const google_auth_library_1 = require("google-auth-library");
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const SALT_ROUNDS = 12;
function generateTokens(payload) {
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
    const refreshToken = (0, uuid_1.v4)();
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    return { accessToken, refreshToken, expiresIn };
}
class AuthService {
    async login(email, password) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                firstName: true,
                lastName: true,
                role: true,
                organizationId: true,
                avatarUrl: true,
                isActive: true,
            },
        });
        if (!user) {
            // Timing-safe: still compare against dummy hash to prevent timing attacks
            await bcryptjs_1.default.compare(password, '$2b$12$invalidhashtopreventtimingattacksonuserlookup');
            throw new errorHandler_1.UnauthorizedError('Invalid email or password');
        }
        if (!user.isActive) {
            throw new errorHandler_1.UnauthorizedError('Account is deactivated. Contact your administrator.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errorHandler_1.UnauthorizedError('Invalid email or password');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        const tokens = generateTokens(payload);
        // Store refresh token
        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
        await prisma_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: tokens.refreshToken,
                expiresAt: refreshExpiresAt,
            },
        });
        // Update last login
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        logger_1.logger.info(`User logged in: ${user.email}`);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                avatarUrl: user.avatarUrl,
            },
            tokens,
        };
    }
    async googleLogin(token) {
        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error('Google SSO is not configured on the server');
        }
        // Verify the access_token via Google's userinfo endpoint
        // (useGoogleLogin with flow='implicit' returns an access_token, not an id_token)
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!userInfoRes.ok) {
            throw new errorHandler_1.UnauthorizedError('Invalid Google token — could not fetch user info');
        }
        const userInfo = await userInfoRes.json();
        if (!userInfo.email || !userInfo.email_verified) {
            throw new errorHandler_1.UnauthorizedError('Google account email not verified');
        }
        const email = userInfo.email.toLowerCase().trim();
        const googleId = userInfo.sub;
        let user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email }, { googleId }],
            },
        });
        if (!user) {
            // Auto-provision: find or bootstrap org, then create user
            let org = await prisma_1.prisma.organization.findFirst();
            if (!org) {
                // First-ever login: bootstrap the organization
                logger_1.logger.info(`[Google SSO] No organization found - bootstrapping WindowWorld organization`);
                org = await prisma_1.prisma.organization.create({
                    data: {
                        name: 'WindowWorld Louisiana',
                        slug: 'windowworld-la',
                        phone: '(225) 555-0100',
                        email: 'admin@windowworldla.com',
                        address: 'Baton Rouge, LA',
                        isActive: true,
                    },
                });
                logger_1.logger.info(`[Google SSO] Organization created: ${org.id}`);
            }
            logger_1.logger.info(`[Google SSO] Creating new SUPER_ADMIN user for ${email}`);
            user = await prisma_1.prisma.user.create({
                data: {
                    email,
                    googleId,
                    passwordHash: await bcryptjs_1.default.hash((0, uuid_1.v4)(), 12),
                    firstName: userInfo.given_name || email.split('@')[0],
                    lastName: userInfo.family_name || 'User',
                    role: 'SUPER_ADMIN',
                    organizationId: org.id,
                    avatarUrl: userInfo.picture ?? null,
                    isActive: true,
                },
            });
            logger_1.logger.info(`[Google SSO] User created: ${user.id} (${user.email})`);
        }
        if (!user.isActive) {
            throw new errorHandler_1.UnauthorizedError('Account is deactivated. Contact your administrator.');
        }
        // Link google ID if not linked yet
        if (!user.googleId) {
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { googleId },
            });
        }
        const tokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        const tokens = generateTokens(tokenPayload);
        // Store refresh token
        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
        await prisma_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: tokens.refreshToken,
                expiresAt: refreshExpiresAt,
            },
        });
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        logger_1.logger.info(`User logged in via Google SSO: ${user.email}`);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                organizationId: user.organizationId,
                avatarUrl: user.avatarUrl || userInfo.picture || null, // Auto sync picture if missing
            },
            tokens,
        };
    }
    async refreshTokens(refreshToken) {
        const storedToken = await prisma_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
            throw new errorHandler_1.UnauthorizedError('Invalid or expired refresh token');
        }
        if (!storedToken.user.isActive) {
            throw new errorHandler_1.UnauthorizedError('Account is deactivated');
        }
        // Revoke old refresh token (rotation)
        await prisma_1.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });
        const payload = {
            sub: storedToken.user.id,
            email: storedToken.user.email,
            role: storedToken.user.role,
            organizationId: storedToken.user.organizationId,
            firstName: storedToken.user.firstName,
            lastName: storedToken.user.lastName,
        };
        const tokens = generateTokens(payload);
        // Store new refresh token
        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
        await prisma_1.prisma.refreshToken.create({
            data: {
                userId: storedToken.user.id,
                token: tokens.refreshToken,
                expiresAt: refreshExpiresAt,
            },
        });
        return tokens;
    }
    async logout(refreshToken, userId) {
        await prisma_1.prisma.refreshToken.updateMany({
            where: {
                token: refreshToken,
                userId,
            },
            data: { revokedAt: new Date() },
        });
    }
    async logoutAll(userId) {
        await prisma_1.prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
    }
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, SALT_ROUNDS);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new errorHandler_1.UnauthorizedError('Current password is incorrect');
        }
        if (newPassword.length < 8) {
            throw new errorHandler_1.AppError('Password must be at least 8 characters', 422);
        }
        const newHash = await this.hashPassword(newPassword);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });
        // Revoke all existing refresh tokens on password change
        await this.logoutAll(userId);
    }
    async getMe(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                organizationId: true,
                avatarUrl: true,
                phone: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                        brandColor: true,
                    },
                },
                territories: {
                    include: {
                        territory: {
                            select: { id: true, name: true, parishes: true, zipCodes: true },
                        },
                    },
                },
            },
        });
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        return user;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map