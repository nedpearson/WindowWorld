import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestId } from './shared/middleware/requestId';
import { wsService } from './shared/services/websocket.service';

// Module routers
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { organizationsRouter } from './modules/organizations/organizations.routes';
import { territoriesRouter } from './modules/territories/territories.routes';
import { leadsRouter } from './modules/leads/leads.routes';
import { leadscoresRouter } from './modules/lead-scores/lead-scores.routes';
import { contactsRouter } from './modules/contacts/contacts.routes';
import { propertiesRouter } from './modules/properties/properties.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { inspectionsRouter } from './modules/inspections/inspections.routes';
import { openingsRouter } from './modules/openings/openings.routes';
import { measurementsRouter } from './modules/measurements/measurements.routes';
import { productsRouter } from './modules/products/products.routes';
import { quotesRouter } from './modules/quotes/quotes.routes';
import { proposalsRouter } from './modules/proposals/proposals.routes';
import { invoicesRouter } from './modules/invoices/invoices.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { aiAnalysisRouter } from './modules/ai-analysis/ai-analysis.routes';
import { automationsRouter } from './modules/automations/automations.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { campaignsRouter } from './modules/campaigns/campaigns.routes';
import { adminRouter } from './modules/admin/admin.routes';

// Background jobs
import { initializeJobQueues } from './jobs';

dotenv.config();

const app = express();
const httpServer = createServer(app);

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

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Google OAuth popup requires being able to postMessage back to us
  crossOriginOpenerPolicy: false,
}));
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Device-Id'],
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(requestId);
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
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// â”€â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const apiV1 = '/api/v1';

app.use(`${apiV1}/auth`, authRouter);
app.use(`${apiV1}/users`, usersRouter);
app.use(`${apiV1}/teams`, organizationsRouter);
app.use(`${apiV1}/territories`, territoriesRouter);
app.use(`${apiV1}/leads`, leadsRouter);
app.use(`${apiV1}/lead-scores`, leadscoresRouter);
app.use(`${apiV1}/contacts`, contactsRouter);
app.use(`${apiV1}/properties`, propertiesRouter);
app.use(`${apiV1}/appointments`, appointmentsRouter);
app.use(`${apiV1}/inspections`, inspectionsRouter);
app.use(`${apiV1}/openings`, openingsRouter);
app.use(`${apiV1}/measurements`, measurementsRouter);
app.use(`${apiV1}/products`, productsRouter);
app.use(`${apiV1}/quotes`, quotesRouter);
app.use(`${apiV1}/proposals`, proposalsRouter);
app.use(`${apiV1}/invoices`, invoicesRouter);
app.use(`${apiV1}/documents`, documentsRouter);
app.use(`${apiV1}/ai-analysis`, aiAnalysisRouter);
app.use(`${apiV1}/ai`, aiAnalysisRouter);        // Also mount on /ai for pitch coach + scoring
app.use(`${apiV1}/automations`, automationsRouter);
app.use(`${apiV1}/analytics`, analyticsRouter);
app.use(`${apiV1}/notifications`, notificationsRouter);
app.use(`${apiV1}/campaigns`, campaignsRouter);
app.use(`${apiV1}/admin`, adminRouter);

// â”€â”€â”€ Error handler (must be last) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(errorHandler);

// â”€â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function start() {
  try {
    // Initialize background job queues
    if (process.env.REDIS_URL) {
      await initializeJobQueues();
      logger.info('Background job queues initialized');
    } else {
      logger.warn('REDIS_URL not set â€” background jobs disabled');
    }

    // Initialize WebSocket integration
    wsService.initialize(httpServer, CORS_ORIGINS);

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`WindowWorld API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API: http://localhost:${PORT}/api/v1`);
      logger.info(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, httpServer };
