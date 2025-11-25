# ==================================
# CitadelBuy Backend - Production Dockerfile
# Multi-stage build: Dependencies → Build → Runtime
# ==================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=deps

WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install --legacy-peer-deps && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    npm prune --production

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
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

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
