# WindowWorld Deployment Guide

This guide describes how to correctly and safely deploy the WindowWorld application to production using Railway (or any Docker/Nixpacks compatible host).

## Architecture overview
WindowWorld is a monorepo that contains:
1. `apps/web`: The Vite React frontend.
2. `server`: The Express Node.js backend & Prisma ORM.

The production deployment runs **both** the built frontend SPA and the backend API from a single Node.js process (the Express server hosts the static SPA files under `/*`).

## Prerequisites (Environment Variables)

The following environment variables **MUST** be set in your production environment (e.g. Railway Variables):

### Required for Startup
- `DATABASE_URL`: Your PostgreSQL connection string. Must include connection pooling if required by your provider.
- `JWT_SECRET`: A secure random string (minimum 32 characters). Run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` to generate one.
- `NODE_ENV`: Must be set to `production`.

### Highly Recommended / Feature Flags
- `OPENAI_API_KEY`: Required for Pitch Coach and document analysis.
- `RESEND_API_KEY`: Required for sending proposals, invoices, and invites.
- `GOOGLE_CLIENT_ID`: Required for Google Calendar integration and SSO.
- `VITE_GOOGLE_CLIENT_ID`: The same as `GOOGLE_CLIENT_ID`. This is embedded in the frontend at build time.
- `REDIS_URL`: Required for BullMQ background jobs (automated emails, Instagram posting, etc).

## The Build Process
Our deployment uses `nixpacks.toml` and `railway.toml`.

1. **Install:** `npm install --legacy-peer-deps` runs in the root.
2. **Build Web:** `npm run build` inside `apps/web`. The Vite SPA is compiled to `apps/web/dist`.
3. **Build Server:** `npm run build` inside `server`. Prisma generates the client, and TypeScript compiles the server.
4. **Assemble:** The SPA `dist/` is copied to `server/spa_build/` so the Express server can serve it predictably.

## The Deployment / Boot Sequence
1. **Migration (Pre-Deploy):** `railway.toml` uses `preDeployCommand` to safely resolve any legacy migrations.
2. **Boot (Start Command):** `npx prisma migrate deploy && node dist/index.js`
   - `migrate deploy` safely applies any pending SQL migrations. **We NEVER use `db push --accept-data-loss` in production.**
   - The Express server starts and verifies required environment variables.
   - The server verifies that the SPA `index.html` exists. If it does not exist, the server will **FAIL TO START** (exits with code 1) to prevent a broken release.

## CI/CD Pipeline
The repository includes a GitHub Action `.github/workflows/ci.yml` that validates every commit to `main`.
It enforces:
- Prisma validation and generation.
- Database seeding on a test container.
- TypeScript lints (`npm run typecheck` on both web and server).
- Unit tests (`npm test` on server).
- Full production builds of web and server to ensure build deterministic success.

## Troubleshooting
- **Frontend not updating?** Vite creates a unique build hash in `version.json`. The frontend polls this file every 5 minutes and auto-refreshes if it detects a new build. No manual cache clearing is needed.
- **Server crashing on boot?** Check the Railway logs. The `server/src/index.ts` script includes strict startup validations and will explicitly state which environment variable is missing or invalid.
