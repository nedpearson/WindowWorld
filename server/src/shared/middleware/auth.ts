import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
    firstName: string;
    lastName: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No authentication token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as any;

    (req as AuthenticatedRequest).user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };

    next();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      throw new UnauthorizedError();
    }

    // Super admin bypasses all role checks
    if (user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role(s): ${roles.join(', ')}`
      );
    }

    next();
  };
}

export function requireSameOrg(req: Request, res: Response, next: NextFunction): void {
  // Middleware to ensure requests are scoped to the user's organization
  // Used on routes that expose org-level data
  const user = (req as AuthenticatedRequest).user;
  if (!user) throw new UnauthorizedError();

  // Inject org filter into query params for downstream handlers
  (req as any).organizationId = user.organizationId;
  next();
}

// Compose helper for chaining auth + role
export const auth = {
  required: requireAuth,
  role: (...roles: UserRole[]) => [requireAuth, requireRole(...roles)],
  adminOnly: [requireAuth, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN)],
  superAdmin: [requireAuth, requireRole(UserRole.SUPER_ADMIN)],
  manager: [requireAuth, requireRole(UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER)],
  repOrAbove: [requireAuth, requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_REP,
    UserRole.FIELD_MEASURE_TECH,
    UserRole.OFFICE_ADMIN
  )],
  finance: [requireAuth, requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.FINANCE_BILLING,
    UserRole.OFFICE_ADMIN
  )],
};
