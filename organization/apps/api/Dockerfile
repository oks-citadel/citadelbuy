# ==================================
# Broxiva Backend - Production Dockerfile
# Optimized for Azure ACR and monorepo builds
# ENCODING-HARDENED: UTF-8 safe across all environments
# ==================================
# IMPORTANT: Large file transforms are handled by Git autocrlf
# DO NOT use sed/iconv on data/model/asset directories

# Stage 1: Builder
FROM public.ecr.aws/docker/library/node:20-slim AS builder
LABEL stage=builder

# Set UTF-8 locale (debian-based - more reliable than Alpine)
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    LANGUAGE=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (support both monorepo and standalone contexts)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies from API directory
# HUSKY=0 prevents husky install from running during Docker builds
WORKDIR /app/apps/api
RUN HUSKY=0 npm install --legacy-peer-deps --ignore-scripts && npm rebuild

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
FROM public.ecr.aws/docker/library/node:20-slim AS production

# Build arguments for OCI labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=2.0.0

# OCI Image Labels for traceability
LABEL maintainer="Broxiva Platform <dev@broxiva.com>" \
      version="${VERSION}" \
      description="Broxiva Backend - NestJS API Server" \
      org.opencontainers.image.title="broxiva-api" \
      org.opencontainers.image.description="Broxiva Backend API Server" \
      org.opencontainers.image.url="https://github.com/broxiva/broxiva" \
      org.opencontainers.image.source="https://github.com/broxiva/broxiva" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="Broxiva" \
      org.opencontainers.image.licenses="MIT"

# Set UTF-8 locale for runtime
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    LANGUAGE=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs

# Copy package files and prisma schema
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma

# Copy all node_modules from builder root (npm hoists dependencies to monorepo root)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist

# Set environment
ENV NODE_ENV=production \
    PORT=4000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start application
CMD ["node", "dist/main.js"]

# ==========================================
# BUILD NOTES:
# - Uses debian-slim for better UTF-8 support
# - No sed/iconv transforms on large files
# - Large files handled by Git autocrlf
# - Runtime assets mounted from Azure Blob/Files
# - Production dependencies installed fresh
# - Prisma client copied from builder stage
# ==========================================
