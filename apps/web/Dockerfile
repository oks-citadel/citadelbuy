# Broxiva Web - Production Dockerfile
# Multi-stage build optimized for Azure ACR and monorepo
# ENCODING-HARDENED: UTF-8 safe across all environments

# Stage 1: Dependencies
FROM public.ecr.aws/docker/library/node:20-slim AS deps

# Set UTF-8 locale
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    LANGUAGE=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Copy package files (support monorepo context)
COPY apps/web/package*.json ./

# Install production dependencies only
RUN npm install --legacy-peer-deps --omit=dev

# Stage 2: Build
FROM public.ecr.aws/docker/library/node:20-slim AS builder

# Set UTF-8 locale
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    LANGUAGE=C.UTF-8

WORKDIR /app

# Copy package files and install all deps
COPY apps/web/package*.json ./
RUN npm install --legacy-peer-deps

# Copy application files
COPY apps/web/ ./

# Build arguments for environment variables and metadata
ARG NEXT_PUBLIC_API_URL=http://broxiva-api:4000/api
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=2.0.0

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true

# Inject build info for frontend UI
RUN echo "{\"version\":\"${VERSION}\",\"commit\":\"${VCS_REF}\",\"buildDate\":\"${BUILD_DATE}\",\"environment\":\"${NODE_ENV}\"}" > public/build-info.json

# Build the application
RUN npm run build

# Stage 3: Production
FROM public.ecr.aws/docker/library/node:20-slim AS runner

# Build arguments for OCI labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=2.0.0

# OCI Image Labels for traceability
LABEL maintainer="Broxiva Platform <dev@broxiva.com>" \
      version="${VERSION}" \
      description="Broxiva Web - Next.js Frontend" \
      org.opencontainers.image.title="broxiva-web" \
      org.opencontainers.image.description="Broxiva Frontend Application" \
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

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || curl -f http://localhost:3000/ || exit 1

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["node", "server.js"]

# ==========================================
# BUILD NOTES:
# - Uses debian-slim for better UTF-8 support
# - build-info.json embedded for UI version display
# - Large files handled by Git autocrlf
# - Runtime assets mounted from Azure Blob/Files
# ==========================================
