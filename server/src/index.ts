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
import * as Sentry from '@sentry/node';

import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestId } from './shared/middleware/requestId';
import { wsService } from './shared/services/websocket.service';
import { rateLimiter, authRateLimiter } from './shared/middleware/rateLimiter';
import { prisma } from './shared/services/prisma';

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
import { pushRouter } from './modules/push/push.routes';

// Background jobs
import { initializeJobQueues } from './jobs';

dotenv.config();

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

const app = express();
const httpServer = createServer(app);

// â”€â”€â”€ Sentry (init before any middleware so it captures all errors) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });
  app.use(Sentry.expressErrorHandler() as any);
  logger.info('Sentry error tracking enabled');
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
  let dbLatencyMs: number | undefined;
  try {
    const t = Date.now();
    await (prisma as any).$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t;
  } catch (err) {
    logger.error('Health check DB query failed:', err);
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Google OAuth popup requires being able to postMessage back to us
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: {
    directives: process.env.NODE_ENV === 'production' ? {
      defaultSrc:              ["'self'"],
      // Google Sign-In (GSI) requires accounts.google.com for scripts, styles, frames
      // and googleapis.com / googleusercontent.com for token verification + avatars
      scriptSrc:               ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
      styleSrc:                ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'blob:', 'https:', 'https://lh3.googleusercontent.com'],
      connectSrc:              ["'self'",
                                'https://api.openai.com',
                                'https://accounts.google.com',
                                'https://oauth2.googleapis.com',
                                'https://identitytoolkit.googleapis.com',
                                'wss:', 'ws:'],
      frameSrc:                ["'self'", 'https://accounts.google.com'],
      objectSrc:               ["'none'"],
      baseUri:                 ["'self'"],
      formAction:              ["'self'", 'https://accounts.google.com'],
      upgradeInsecureRequests: [],
    } : {
      // Dev: permissive CSP â€” allows Vite HMR + devtools, but CSP is still present
      // (CodeQL flags contentSecurityPolicy: false as a high severity issue)
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
}));

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Device-Id'],
}));

app.use(compression());
// JSON limit is 2mb â€” file uploads are handled by multer separately (not limited here)
// 50mb JSON bodies would be a DDoS amplification vector
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(requestId);
// Rate limiting â€” Railway-safe (validate.xForwardedForHeader = false in rateLimiter.ts)
app.use(rateLimiter);


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Static file serving (uploads) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API Routes Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const apiV1 = '/api/v1';

app.use(`${apiV1}/auth`, authRateLimiter, authRouter);
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
app.use(`${apiV1}/push`, pushRouter);

// ── SPA — serve built React app ─────────────────────────────────────────────
// Must come AFTER all /api/ routes so they take priority.
// In production the frontend is built into ./public by the nixpacks build step.
const webDistPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(webDistPath)) {
  // 1. Serve ONLY the hashed /assets/* files with long-lived immutable cache.
  //    These filenames change on every build so stale cache is impossible.
  app.use(
    '/assets',
    express.static(path.join(webDistPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      index: false,
    })
  );

  // 2. Serve service-worker files and index.html with NO cache so the browser
  //    always gets the latest entrypoint (which references the new chunk hashes).
  //    Without this, browsers cache index.html for a year and request deleted chunks.
  const noCache = (_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };

  // sw.js + workbox runtime files must never be cached long-term
  app.get(['/sw.js', '/workbox-*.js', '/manifest.webmanifest'], noCache, express.static(webDistPath));

  // All other non-asset static files (icons, fonts, etc.) — short cache
  app.use(
    express.static(webDistPath, {
      maxAge: '1d',
      index: false,
    })
  );

  // SPA fallback — all remaining GETs serve index.html with no-cache
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  logger.info(`[SPA] Serving React app from ${webDistPath}`);
} else {
  logger.warn('[SPA] No built frontend found at ./public — SPA serving skipped (dev or separate web service)');
}

app.use(errorHandler);


// ———— Start ——————————————————————————————————————————————————————————————————
async function start() {
  try {
    // Initialize background job queues
    if (process.env.REDIS_URL) {
      await initializeJobQueues();
      logger.info('Background job queues initialized');
    } else {
      logger.warn('REDIS_URL not set Ã¢â‚¬â€ background jobs disabled');
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
      const activateResult = await prisma.user.updateMany({
        where: { email: { in: seedEmails } },
        data: { isActive: true },
      });
      if (activateResult.count > 0) {
        logger.info(`[Startup] Activated ${activateResult.count} seed user account(s)`);
      }
    } catch (activateErr) {
      logger.warn('[Startup] Could not activate seed accounts:', activateErr);
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

// â”€â”€â”€ Graceful Shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Railway (and Docker) send SIGTERM before killing a container during deploys.
// We drain in-flight requests, then close DB connections cleanly.
function shutdown(signal: string) {
  logger.info(`[${signal}] Graceful shutdown initiated...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed, cleaning up...');
    try {
      const { prisma } = await import('./shared/services/prisma');
      await (prisma as any).$disconnect();
      logger.info('Database connection closed.');
    } catch (e) {
      logger.warn('Could not cleanly disconnect Prisma:', e);
    }
    process.exit(0);
  });

  // Force exit after 10s if drain takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s â€” forcing exit.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export { app, httpServer };


