# ══════════════════════════════════════════════════════════
# Window World Assistant — Production Dockerfile
# Builds the Vite frontend + serves it + runs the API
# Single container — deploy anywhere (Cloud Run, Railway, Render, VPS)
# ══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install root workspace deps ──────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build the frontend ───────────────────────────
FROM base AS frontend-build
COPY apps/web/package.json ./apps/web/
RUN cd apps/web && npm ci --ignore-scripts
COPY apps/web ./apps/web
# Point the frontend API proxy at the local server (same container)
ENV VITE_API_URL=/api
RUN cd apps/web && npm run build

# ── Stage 3: Build the server ─────────────────────────────
FROM base AS server-build
COPY server/package.json ./server/
RUN cd server && npm ci --ignore-scripts
COPY server ./server
RUN cd server && npm run build

# ── Stage 4: Production runtime ───────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install only production server deps
COPY server/package.json ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=frontend-build /app/apps/web/dist ./server/dist/public

# Copy Prisma client (generated during server build)
COPY --from=server-build /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=server-build /app/server/node_modules/@prisma ./server/node_modules/@prisma

# Serve static frontend files from the Express server
# The server will be updated to serve ./dist/public
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
