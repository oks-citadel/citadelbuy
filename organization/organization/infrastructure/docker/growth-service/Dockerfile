# Growth Service Dockerfile
# Handles user growth, retention, and experimentation

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

# Add security enhancements
RUN apk add --no-cache dumb-init tini curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set environment variables
ENV NODE_ENV=production \
    PORT=4001 \
    SERVICE_NAME=growth-service \
    LOG_LEVEL=info \
    ENABLE_AB_TESTING=true \
    ENABLE_FEATURE_FLAGS=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Use non-root user
USER nodejs

# Expose port
EXPOSE 4001

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Labels for metadata
LABEL maintainer="DevOps Team <devops@broxiva.com>" \
      service="growth-service" \
      version="1.0.0" \
      description="User growth and experimentation service" \
      com.broxiva.team="growth" \
      com.broxiva.tier="application"
