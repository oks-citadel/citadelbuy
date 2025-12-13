# ==================================
# CitadelBuy Backend - Production Dockerfile
# Standalone build for API service
# ==================================

# Stage 1: Builder
FROM node:20-alpine AS builder
LABEL stage=builder

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy API package files only (standalone build)
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma/

# Install all dependencies with npm
RUN npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY apps/api/src ./src
COPY apps/api/tsconfig*.json ./
COPY apps/api/nest-cli.json ./

# Build application with increased memory
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# Stage 2: Production Runtime
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
