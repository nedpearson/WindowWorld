"use strict";
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
const logger_1 = require("./shared/utils/logger");
const errorHandler_1 = require("./shared/middleware/errorHandler");
const requestId_1 = require("./shared/middleware/requestId");
const websocket_service_1 = require("./shared/services/websocket.service");
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
// Background jobs
const jobs_1 = require("./jobs");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Force HTTPS in production
app.enable('trust proxy');
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Google OAuth popup requires being able to postMessage back to us
    crossOriginOpenerPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Device-Id'],
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_1.logger.http(msg.trim()) } }));
app.use(requestId_1.requestId);
// Rate limiting disabled temporarily - Railway proxy causes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// app.use(rateLimiter);
// â”€â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        env: process.env.NODE_ENV,
    });
});
// â”€â”€â”€ Static file serving (uploads) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadDir = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadDir));
// â”€â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const apiV1 = '/api/v1';
app.use(`${apiV1}/auth`, auth_routes_1.authRouter);
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
// â”€â”€â”€ Error handler (must be last) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(errorHandler_1.errorHandler);
// â”€â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function start() {
    try {
        // Initialize background job queues
        if (process.env.REDIS_URL) {
            await (0, jobs_1.initializeJobQueues)();
            logger_1.logger.info('Background job queues initialized');
        }
        else {
            logger_1.logger.warn('REDIS_URL not set â€” background jobs disabled');
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
//# sourceMappingURL=index.js.map