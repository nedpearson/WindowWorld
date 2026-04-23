import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../shared/services/prisma';
import { AppError, UnauthorizedError, NotFoundError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';
// google-auth-library is retained for potential id_token verification in future;
// current flow uses fetch to the /oauth2/v3/userinfo endpoint instead.

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

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

function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = uuidv4();
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  return { accessToken, refreshToken, expiresIn };
}

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
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
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattacksonuserlookup');
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: TokenPayload = {
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

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

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

  async googleLogin(token: string): Promise<LoginResult> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google SSO is not configured on the server');
    }

    // Verify the access_token via Google's userinfo endpoint
    // (useGoogleLogin with flow='implicit' returns an access_token, not an id_token)
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userInfoRes.ok) {
      throw new UnauthorizedError('Invalid Google token — could not fetch user info');
    }

    const userInfo: {
      sub: string;
      email: string;
      email_verified: boolean;
      given_name?: string;
      family_name?: string;
      picture?: string;
      name?: string;
    } = await userInfoRes.json() as any;

    if (!userInfo.email || !userInfo.email_verified) {
      throw new UnauthorizedError('Google account email not verified');
    }

    const email = userInfo.email.toLowerCase().trim();
    const googleId = userInfo.sub;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
    });

    if (!user) {
      // Auto-provision: find or bootstrap org, then create user
      let org = await prisma.organization.findFirst();
      
      if (!org) {
        // First-ever login: bootstrap the organization
        logger.info(`[Google SSO] No organization found - bootstrapping WindowWorld organization`);
        org = await prisma.organization.create({
          data: {
            name: 'WindowWorld Louisiana',
            slug: 'windowworld-la',
            phone: '(225) 555-0100',
            email: 'admin@windowworldla.com',
            address: 'Baton Rouge, LA',
            isActive: true,
          } as any,
        });
        logger.info(`[Google SSO] Organization created: ${org.id}`);
      }

      logger.info(`[Google SSO] Creating new SUPER_ADMIN user for ${email}`);
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          passwordHash: await bcrypt.hash(uuidv4(), 12),
          firstName: userInfo.given_name || email.split('@')[0],
          lastName: userInfo.family_name || 'User',
          role: 'SUPER_ADMIN',
          organizationId: org.id,
          avatarUrl: userInfo.picture ?? null,
          isActive: true,
        } as any,
      });
      logger.info(`[Google SSO] User created: ${user.id} (${user.email})`);
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Contact your administrator.');
    }

    // Link google ID if not linked yet
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const tokenPayload: TokenPayload = {
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

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in via Google SSO: ${user.email}`);

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

  async refreshTokens(refreshToken: string): Promise<AuthTokens & { user: LoginResult['user'] }> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const payload: TokenPayload = {
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

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: tokens.refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      ...tokens,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        role: storedToken.user.role,
        organizationId: storedToken.user.organizationId,
        avatarUrl: (storedToken.user as any).avatarUrl ?? null,
      },
    };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        userId,
      },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) throw new NotFoundError('User');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 422);
    }

    const newHash = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all existing refresh tokens on password change
    await this.logoutAll(userId);
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
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

    if (!user) throw new NotFoundError('User');
    return user;
  }
}

export const authService = new AuthService();
