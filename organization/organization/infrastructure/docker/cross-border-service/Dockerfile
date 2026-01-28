# Cross-Border Service Dockerfile
# Handles international trade, customs, and cross-border payments

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine

# Add security enhancements and required tools
RUN apk add --no-cache dumb-init tini curl openssl ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy customs and regulatory data
COPY --chown=nodejs:nodejs data/customs ./data/customs
COPY --chown=nodejs:nodejs data/regulations ./data/regulations

# Set environment variables
ENV NODE_ENV=production \
    PORT=4002 \
    SERVICE_NAME=cross-border-service \
    LOG_LEVEL=info \
    ENABLE_CUSTOMS_INTEGRATION=true \
    ENABLE_CURRENCY_CONVERSION=true \
    ENABLE_TAX_CALCULATION=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Use non-root user
USER nodejs

# Expose port
EXPOSE 4002

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Labels for metadata
LABEL maintainer="DevOps Team <devops@broxiva.com>" \
      service="cross-border-service" \
      version="1.0.0" \
      description="Cross-border trade and compliance service" \
      com.broxiva.team="international" \
      com.broxiva.tier="application" \
      com.broxiva.compliance="customs,tax,regulations"
