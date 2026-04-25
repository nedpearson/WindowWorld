"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = require("./shared/utils/logger");
const errorHandler_1 = require("./shared/middleware/errorHandler");
const requestId_1 = require("./shared/middleware/requestId");
const websocket_service_1 = require("./shared/services/websocket.service");
const rateLimiter_1 = require("./shared/middleware/rateLimiter");
const prisma_1 = require("./shared/services/prisma");
// Module routers
const auth_routes_1 = require("./modules/auth/auth.routes");
const users_routes_1 = require("./modules/users/users.routes");
const organizations_routes_1 = require("./modules/organizations/organizations.routes");
const territories_routes_1 = require("./modules/territories/territories.routes");
const leads_routes_1 = require("./modules/leads/leads.routes");
const lead_scores_routes_1 = require("./modules/lead-scores/lead-scores.routes");
const contacts_routes_1 = require("./modules/contacts/contacts.routes");
const properties_routes_1 = require("./modules/properties/properties.routes");
const appointments_routes_1 = require("./modules/appointments/appointments.routes");
const inspections_routes_1 = require("./modules/inspections/inspections.routes");
const openings_routes_1 = require("./modules/openings/openings.routes");
const measurements_routes_1 = require("./modules/measurements/measurements.routes");
const products_routes_1 = require("./modules/products/products.routes");
const quotes_routes_1 = require("./modules/quotes/quotes.routes");
const proposals_routes_1 = require("./modules/proposals/proposals.routes");
const invoices_routes_1 = require("./modules/invoices/invoices.routes");
const documents_routes_1 = require("./modules/documents/documents.routes");
const ai_analysis_routes_1 = require("./modules/ai-analysis/ai-analysis.routes");
const automations_routes_1 = require("./modules/automations/automations.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const notifications_routes_1 = require("./modules/notifications/notifications.routes");
const campaigns_routes_1 = require("./modules/campaigns/campaigns.routes");
const admin_routes_1 = require("./modules/admin/admin.routes");
const push_routes_1 = require("./modules/push/push.routes");
// Background jobs
const jobs_1 = require("./jobs");
dotenv_1.default.config();
// â”€â”€â”€ Startup Validation (fail fast, fail loud) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
    console.error(`FATAL: Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('Set these in your .env file or Railway environment variables.');
    process.exit(1);
}
if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET || '').length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters in production.');
    console.warn('Generate a better one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
}
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// â”€â”€â”€ Sentry (init before any middleware so it captures all errors) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    });
    app.use(Sentry.expressErrorHandler());
    logger_1.logger.info('Sentry error tracking enabled');
}
const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Health check (MUST be first - before HTTPS redirect or any middleware) â”€
// Railway healthcheck sends plain HTTP internally; must respond 200 unconditionally
app.get('/health', async (_req, res) => {
    let dbStatus = 'ok';
    let dbLatencyMs;
    try {
        const t = Date.now();
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        dbLatencyMs = Date.now() - t;
    }
    catch (err) {
        logger_1.logger.error('Health check DB query failed:', err);
        dbStatus = 'error';
    }
    const status = dbStatus === 'ok' ? 'ok' : 'degraded';
    res.status(dbStatus === 'ok' ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        env: process.env.NODE_ENV,
        db: { status: dbStatus, latencyMs: dbLatencyMs },
    });
});
// Force HTTPS in production
// Railway sits behind exactly 1 reverse-proxy hop.
// Setting to `1` (not `true`) satisfies express-rate-limit's trust-proxy validator
// and prevents attackers from spoofing X-Forwarded-For to bypass rate limits.
app.set('trust proxy', 1);
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production'
        && req.headers['x-forwarded-proto'] !== 'https'
        && req.path !== '/health') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Google OAuth popup requires being able to postMessage back to us
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
        directives: process.env.NODE_ENV === 'production' ? {
            defaultSrc: ["'self'"],
            // Google Sign-In (GSI) requires accounts.google.com for scripts, styles, frames
            // and googleapis.com / googleusercontent.com for token verification + avatars
            scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'https://lh3.googleusercontent.com'],
            connectSrc: ["'self'",
                'https://api.openai.com',
                'https://accounts.google.com',
                'https://oauth2.googleapis.com',
                'https://identitytoolkit.googleapis.com',
                'wss:', 'ws:'],
            frameSrc: ["'self'", 'https://accounts.google.com'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'", 'https://accounts.google.com'],
            upgradeInsecureRequests: [],
        } : {
            // Dev: permissive CSP â€” allows Vite HMR + devtools, but CSP is still present
            // (CodeQL flags contentSecurityPolicy: false as a high severity issue)
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
            imgSrc: ["'self'", 'data:', 'blob:'],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Device-Id'],
}));
app.use((0, compression_1.default)());
// JSON limit is 2mb â€” file uploads are handled by multer separately (not limited here)
// 50mb JSON bodies would be a DDoS amplification vector
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '2mb' }));
app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_1.logger.http(msg.trim()) } }));
app.use(requestId_1.requestId);
// Rate limiting â€” Railway-safe (validate.xForwardedForHeader = false in rateLimiter.ts)
app.use(rateLimiter_1.rateLimiter);
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Static file serving (uploads) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadDir = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir));
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API Routes Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const apiV1 = '/api/v1';
app.use(`${apiV1}/auth`, rateLimiter_1.authRateLimiter, auth_routes_1.authRouter);
app.use(`${apiV1}/users`, users_routes_1.usersRouter);
app.use(`${apiV1}/teams`, organizations_routes_1.organizationsRouter);
app.use(`${apiV1}/territories`, territories_routes_1.territoriesRouter);
app.use(`${apiV1}/leads`, leads_routes_1.leadsRouter);
app.use(`${apiV1}/lead-scores`, lead_scores_routes_1.leadscoresRouter);
app.use(`${apiV1}/contacts`, contacts_routes_1.contactsRouter);
app.use(`${apiV1}/properties`, properties_routes_1.propertiesRouter);
app.use(`${apiV1}/appointments`, appointments_routes_1.appointmentsRouter);
app.use(`${apiV1}/inspections`, inspections_routes_1.inspectionsRouter);
app.use(`${apiV1}/openings`, openings_routes_1.openingsRouter);
app.use(`${apiV1}/measurements`, measurements_routes_1.measurementsRouter);
app.use(`${apiV1}/products`, products_routes_1.productsRouter);
app.use(`${apiV1}/quotes`, quotes_routes_1.quotesRouter);
app.use(`${apiV1}/proposals`, proposals_routes_1.proposalsRouter);
app.use(`${apiV1}/invoices`, invoices_routes_1.invoicesRouter);
app.use(`${apiV1}/documents`, documents_routes_1.documentsRouter);
app.use(`${apiV1}/ai-analysis`, ai_analysis_routes_1.aiAnalysisRouter);
app.use(`${apiV1}/ai`, ai_analysis_routes_1.aiAnalysisRouter); // Also mount on /ai for pitch coach + scoring
app.use(`${apiV1}/automations`, automations_routes_1.automationsRouter);
app.use(`${apiV1}/analytics`, analytics_routes_1.analyticsRouter);
app.use(`${apiV1}/notifications`, notifications_routes_1.notificationsRouter);
app.use(`${apiV1}/campaigns`, campaigns_routes_1.campaignsRouter);
app.use(`${apiV1}/admin`, admin_routes_1.adminRouter);
app.use(`${apiV1}/push`, push_routes_1.pushRouter);
// ── SPA — serve built React app ─────────────────────────────────────────────
// Must come AFTER all /api/ routes so they take priority.
// In production the frontend is built into ./public by the nixpacks build step.
const webDistPath = path_1.default.join(__dirname, '..', 'public');
if (fs_1.default.existsSync(webDistPath)) {
    // 1. Serve ONLY the hashed /assets/* files with long-lived immutable cache.
    //    These filenames change on every build so stale cache is impossible.
    app.use('/assets', express_1.default.static(path_1.default.join(webDistPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
        index: false,
    }));
    // 2. Serve service-worker files and index.html with NO cache so the browser
    //    always gets the latest entrypoint (which references the new chunk hashes).
    //    Without this, browsers cache index.html for a year and request deleted chunks.
    const noCache = (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    };
    // sw.js + workbox runtime files must never be cached long-term
    app.get(['/sw.js', '/workbox-*.js', '/manifest.webmanifest'], noCache, express_1.default.static(webDistPath));
    // All other non-asset static files (icons, fonts, etc.) — short cache
    app.use(express_1.default.static(webDistPath, {
        maxAge: '1d',
        index: false,
    }));
    // SPA fallback — all remaining GETs serve index.html with no-cache
    app.get('*', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path_1.default.join(webDistPath, 'index.html'));
    });
    logger_1.logger.info(`[SPA] Serving React app from ${webDistPath}`);
}
else {
    logger_1.logger.warn('[SPA] No built frontend found at ./public — SPA serving skipped (dev or separate web service)');
}
app.use(errorHandler_1.errorHandler);
// ———— Start ——————————————————————————————————————————————————————————————————
async function start() {
    try {
        // Initialize background job queues
        if (process.env.REDIS_URL) {
            await (0, jobs_1.initializeJobQueues)();
            logger_1.logger.info('Background job queues initialized');
        }
        else {
            logger_1.logger.warn('REDIS_URL not set Ã¢â‚¬â€ background jobs disabled');
        }
        // ── Ensure all seeded admin accounts are active on every boot ──────────
        // Safety net: activate seed accounts that may have isActive=false from
        // a failed/partial seed, Google SSO auto-provision, or older migration.
        try {
            const seedEmails = [
                'nedpearson@gmail.com',
                'admin@windowworldla.com',
                'manager@windowworldla.com',
                'rep1@windowworldla.com',
                'rep2@windowworldla.com',
                'tech@windowworldla.com',
                'finance@windowworldla.com',
            ];
            const activateResult = await prisma_1.prisma.user.updateMany({
                where: { email: { in: seedEmails } },
                data: { isActive: true },
            });
            if (activateResult.count > 0) {
                logger_1.logger.info(`[Startup] Activated ${activateResult.count} seed user account(s)`);
            }
        }
        catch (activateErr) {
            logger_1.logger.warn('[Startup] Could not activate seed accounts:', activateErr);
        }
        // Initialize WebSocket integration
        websocket_service_1.wsService.initialize(httpServer, CORS_ORIGINS);
        httpServer.listen(Number(PORT), '0.0.0.0', () => {
            logger_1.logger.info(`WindowWorld API server running on port ${PORT}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger_1.logger.info(`API: http://localhost:${PORT}/api/v1`);
            logger_1.logger.info(`Health: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
start();
// â”€â”€â”€ Graceful Shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Railway (and Docker) send SIGTERM before killing a container during deploys.
// We drain in-flight requests, then close DB connections cleanly.
function shutdown(signal) {
    logger_1.logger.info(`[${signal}] Graceful shutdown initiated...`);
    // Stop accepting new connections
    httpServer.close(async () => {
        logger_1.logger.info('HTTP server closed, cleaning up...');
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('./shared/services/prisma')));
            await prisma.$disconnect();
            logger_1.logger.info('Database connection closed.');
        }
        catch (e) {
            logger_1.logger.warn('Could not cleanly disconnect Prisma:', e);
        }
        process.exit(0);
    });
    // Force exit after 10s if drain takes too long
    setTimeout(() => {
        logger_1.logger.error('Graceful shutdown timed out after 10s â€” forcing exit.');
        process.exit(1);
    }, 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
//# sourceMappingURL=index.js.map