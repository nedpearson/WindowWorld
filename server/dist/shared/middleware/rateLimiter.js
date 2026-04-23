"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Global limit per IP
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }, // Railway runs behind a proxy
    message: {
        success: false,
        error: {
            message: 'Too many requests, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            statusCode: 429,
        },
    },
    skip: (req) => process.env.NODE_ENV === 'test',
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20, // Stricter for auth endpoints
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }, // Railway runs behind a proxy; trust proxy is set to 1 at app level
    message: {
        success: false,
        error: {
            message: 'Too many authentication attempts, please try again later.',
            code: 'AUTH_RATE_LIMIT',
            statusCode: 429,
        },
    },
});
//# sourceMappingURL=rateLimiter.js.map