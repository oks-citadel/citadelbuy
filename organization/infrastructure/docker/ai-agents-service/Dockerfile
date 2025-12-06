# AI Agents Service Dockerfile
# Handles AI-powered agents for customer support, recommendations, and automation

# Stage 1: Python dependencies
FROM python:3.11-slim AS python-builder

WORKDIR /python-app

# Install system dependencies for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Node.js build
FROM node:20-alpine AS node-builder

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

# Stage 3: Production (Multi-runtime)
FROM node:20-alpine

# Install Python runtime and required tools
RUN apk add --no-cache \
    python3 \
    py3-pip \
    dumb-init \
    tini \
    curl \
    ca-certificates \
    libpq

# Create non-root user
RUN addgroup -g 1001 -S aiagents && \
    adduser -S aiagents -u 1001

WORKDIR /app

# Copy Python dependencies from python-builder
COPY --from=python-builder --chown=aiagents:aiagents /root/.local /home/aiagents/.local

# Copy Node.js application from node-builder
COPY --from=node-builder --chown=aiagents:aiagents /app/dist ./dist
COPY --from=node-builder --chown=aiagents:aiagents /app/node_modules ./node_modules
COPY --from=node-builder --chown=aiagents:aiagents /app/package.json ./package.json

# Copy AI models and configuration
COPY --chown=aiagents:aiagents models ./models
COPY --chown=aiagents:aiagents config/ai ./config/ai

# Copy Python scripts
COPY --chown=aiagents:aiagents python ./python

# Set Python path
ENV PATH=/home/aiagents/.local/bin:$PATH \
    PYTHONPATH=/app/python:$PYTHONPATH

# Set environment variables
ENV NODE_ENV=production \
    PORT=4003 \
    SERVICE_NAME=ai-agents-service \
    LOG_LEVEL=info \
    ENABLE_AI_AGENTS=true \
    ENABLE_RECOMMENDATIONS=true \
    ENABLE_CHATBOT=true \
    AI_MODEL_PATH=/app/models \
    MAX_CONCURRENT_AGENTS=10

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Use non-root user
USER aiagents

# Expose port
EXPOSE 4003

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Labels for metadata
LABEL maintainer="DevOps Team <devops@citadelbuy.com>" \
      service="ai-agents-service" \
      version="1.0.0" \
      description="AI-powered agents and automation service" \
      com.citadelbuy.team="ai-ml" \
      com.citadelbuy.tier="application" \
      com.citadelbuy.ai-enabled="true" \
      com.citadelbuy.runtime="nodejs,python"
