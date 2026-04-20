"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireSameOrg = requireSameOrg;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const client_1 = require("@prisma/client");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new errorHandler_1.UnauthorizedError('No authentication token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error('JWT_SECRET not configured');
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            organizationId: payload.organizationId,
            firstName: payload.firstName,
            lastName: payload.lastName,
        };
        next();
    }
    catch (err) {
        throw new errorHandler_1.UnauthorizedError('Invalid or expired token');
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new errorHandler_1.UnauthorizedError();
        }
        // Super admin bypasses all role checks
        if (user.role === client_1.UserRole.SUPER_ADMIN) {
            return next();
        }
        if (!roles.includes(user.role)) {
            throw new errorHandler_1.ForbiddenError(`Access denied. Required role(s): ${roles.join(', ')}`);
        }
        next();
    };
}
function requireSameOrg(req, res, next) {
    // Middleware to ensure requests are scoped to the user's organization
    // Used on routes that expose org-level data
    const user = req.user;
    if (!user)
        throw new errorHandler_1.UnauthorizedError();
    // Inject org filter into query params for downstream handlers
    req.organizationId = user.organizationId;
    next();
}
// Compose helper for chaining auth + role
exports.auth = {
    required: requireAuth,
    role: (...roles) => [requireAuth, requireRole(...roles)],
    adminOnly: [requireAuth, requireRole(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OFFICE_ADMIN)],
    superAdmin: [requireAuth, requireRole(client_1.UserRole.SUPER_ADMIN)],
    manager: [requireAuth, requireRole(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SALES_MANAGER)],
    repOrAbove: [requireAuth, requireRole(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SALES_MANAGER, client_1.UserRole.SALES_REP, client_1.UserRole.FIELD_MEASURE_TECH, client_1.UserRole.OFFICE_ADMIN)],
    finance: [requireAuth, requireRole(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SALES_MANAGER, client_1.UserRole.FINANCE_BILLING, client_1.UserRole.OFFICE_ADMIN)],
};
//# sourceMappingURL=auth.js.map