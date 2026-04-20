import { Request, Response, NextFunction } from 'express';
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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireSameOrg(req: Request, res: Response, next: NextFunction): void;
export declare const auth: {
    required: typeof requireAuth;
    role: (...roles: UserRole[]) => ((req: Request, res: Response, next: NextFunction) => void)[];
    adminOnly: ((req: Request, res: Response, next: NextFunction) => void)[];
    superAdmin: ((req: Request, res: Response, next: NextFunction) => void)[];
    manager: ((req: Request, res: Response, next: NextFunction) => void)[];
    repOrAbove: ((req: Request, res: Response, next: NextFunction) => void)[];
    finance: ((req: Request, res: Response, next: NextFunction) => void)[];
};
//# sourceMappingURL=auth.d.ts.map