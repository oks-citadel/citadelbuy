# ==================================
# CitadelBuy Backend - Production Dockerfile (Monorepo)
# Multi-stage build: Dependencies → Build → Runtime
# ==================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=deps

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.23.0

# Copy workspace configuration
COPY package.json pnpm-lock.yaml* package-lock.json* ./
COPY pnpm-workspace.yaml* ./
COPY turbo.json* ./

# Copy API package files
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile || pnpm install

# Generate Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
LABEL stage=builder

# Install pnpm
RUN npm install -g pnpm@10.23.0

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app ./

# Copy source code
COPY apps/api ./apps/api

# Build application
WORKDIR /app/apps/api
RUN pnpm run build

# Stage 3: Production Runtime
FROM node:20-alpine AS production
LABEL maintainer="CitadelBuy Platform <dev@citadelbuy.com>"
LABEL version="2.0.0"
LABEL description="CitadelBuy Backend - NestJS API Server"
LABEL org.opencontainers.image.source="https://github.com/citadel/citadelbuy"

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tini \
    postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies and Prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./root_node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/main.js"]
