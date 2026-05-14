# ══════════════════════════════════════════════════════════
# Window World Assistant — Production Dockerfile
# Single container: Vite frontend + Express API
# Deploy: Railway, Cloud Run, Render, or any Docker host
# ══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install ALL workspace deps ───────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY server/package.json ./server/
RUN npm ci

# ── Stage 2: Generate Prisma Client ───────────────────────
FROM deps AS prisma
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# ── Stage 3: Build the frontend ──────────────────────────
FROM prisma AS frontend-build
COPY apps/web ./apps/web
ENV VITE_API_URL=/api
RUN cd apps/web && npx vite build

# ── Stage 4: Build the server ────────────────────────────
FROM prisma AS server-build
COPY server ./server
RUN cd server && npx tsc

# ── Stage 5: Production runtime ──────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# To properly install only production dependencies in a workspace environment,
# we need the root package.json and package-lock.json, and the workspace packages.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma client (generated during prisma stage)
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built frontend into server's public dir
COPY --from=frontend-build /app/apps/web/dist ./server/dist/public

# Copy prisma schema (needed at runtime for some Prisma features)
COPY server/prisma ./server/prisma

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
