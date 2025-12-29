# Broxiva Platform - Docker Build Guide

## Overview

This guide provides instructions for building Docker images for the Broxiva e-commerce platform. The platform consists of:

- **Main Applications**: Web frontend (Next.js) and API backend (NestJS)
- **13 Microservices**: AI agents, AI engine, Analytics, Chatbot, Fraud Detection, Inventory, Media, Notification, Personalization, Pricing, Recommendation, Search, and Supplier Integration

## Prerequisites

### Required Software

1. **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
   - Version: 20.10 or higher
   - Download: https://www.docker.com/products/docker-desktop

2. **Azure CLI** (for pushing to Azure Container Registry)
   ```bash
   # Install Azure CLI
   # Windows: Download from https://aka.ms/installazurecliwindows
   # macOS: brew install azure-cli
   # Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Sufficient Disk Space**
   - Minimum: 20 GB free
   - Recommended: 50 GB free

### System Requirements

- **RAM**: 8 GB minimum, 16 GB recommended
- **CPU**: 4 cores minimum, 8 cores recommended
- **OS**: Windows 10/11, macOS 10.15+, or Linux

## Quick Start

### Option 1: Using Build Scripts (Recommended)

#### Windows (PowerShell)

```powershell
# Navigate to the project directory
cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization

# Run the build script
.\build-broxiva-images.ps1
```

#### Linux/macOS/Git Bash

```bash
# Navigate to the project directory
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization

# Make script executable
chmod +x build-broxiva-images.sh

# Run the build script
./build-broxiva-images.sh
```

### Option 2: Using Docker Compose

```bash
# Build all services defined in docker-compose
docker-compose -f docker-compose.production.yml build

# Build with no cache (clean build)
docker-compose -f docker-compose.production.yml build --no-cache

# Build specific service
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml build api
```

### Option 3: Manual Docker Build

#### Build Web Application

```bash
cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization

docker build -f apps/web/Dockerfile.production \
  -t broxiva-web:latest \
  -t broxivaacr.azurecr.io/broxiva-web:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.broxiva.com \
  --build-arg NEXT_PUBLIC_APP_NAME=Broxiva \
  apps/web
```

#### Build API Application

```bash
docker build -f apps/api/Dockerfile.production \
  -t broxiva-api:latest \
  -t broxivaacr.azurecr.io/broxiva-api:latest \
  apps/api
```

#### Build Individual Microservices

```bash
# AI Agents Service
docker build -f apps/services/ai-agents/Dockerfile \
  -t broxiva-ai-agents:latest \
  -t broxivaacr.azurecr.io/broxiva-ai-agents:latest \
  apps/services/ai-agents

# Analytics Service
docker build -f apps/services/analytics/Dockerfile \
  -t broxiva-analytics:latest \
  -t broxivaacr.azurecr.io/broxiva-analytics:latest \
  apps/services/analytics

# Recommendation Service
docker build -f apps/services/recommendation/Dockerfile \
  -t broxiva-recommendation:latest \
  -t broxivaacr.azurecr.io/broxiva-recommendation:latest \
  apps/services/recommendation

# ... repeat for other services
```

## Image Inventory

### Main Applications

| Service | Image Name | Port | Base Image | Size (Approx) |
|---------|------------|------|------------|---------------|
| Web Frontend | broxiva-web | 3000 | node:20-alpine | 150-250 MB |
| API Backend | broxiva-api | 4000 | node:20-alpine | 200-300 MB |

### Microservices

| Service | Image Name | Port | Base Image | Size (Approx) |
|---------|------------|------|------------|---------------|
| AI Agents | broxiva-ai-agents | 8020 | python:3.11-slim | 300-500 MB |
| AI Engine | broxiva-ai-engine | 8010 | python:3.11-slim | 300-500 MB |
| Analytics | broxiva-analytics | 8005 | python:3.11-slim | 250-400 MB |
| Chatbot | broxiva-chatbot | 8009 | python:3.11-slim | 300-500 MB |
| Fraud Detection | broxiva-fraud-detection | 8008 | python:3.11-slim | 250-400 MB |
| Inventory | broxiva-inventory | 8004 | python:3.11-slim | 200-350 MB |
| Media | broxiva-media | 8006 | python:3.11-slim | 250-400 MB |
| Notification | broxiva-notification | 8003 | python:3.11-slim | 200-350 MB |
| Personalization | broxiva-personalization | 8002 | python:3.11-slim | 250-400 MB |
| Pricing | broxiva-pricing | 8011 | python:3.11-slim | 200-350 MB |
| Recommendation | broxiva-recommendation | 8001 | python:3.11-slim | 300-500 MB |
| Search | broxiva-search | 8007 | python:3.11-slim | 300-500 MB |
| Supplier Integration | broxiva-supplier-integration | 8012 | python:3.11-slim | 200-350 MB |

**Total Storage Required**: Approximately 4-8 GB for all images

## Tagging Strategy

### Image Naming Convention

```
[registry]/[image-name]:[tag]

Examples:
- broxiva-web:latest
- broxiva-web:v1.0.0
- broxiva-web:v1.0.0-rc1
- broxivaacr.azurecr.io/broxiva-web:latest
- broxivaacr.azurecr.io/broxiva-web:v1.0.0
```

### Recommended Tags

1. **latest** - Most recent stable build
2. **v{major}.{minor}.{patch}** - Semantic versioning (e.g., v1.0.0)
3. **{git-commit-sha}** - Specific commit (e.g., abc123f)
4. **dev** - Development builds
5. **staging** - Staging environment builds

### Tagging Images

```bash
# Tag with version
docker tag broxiva-web:latest broxiva-web:v1.0.0

# Tag for ACR
docker tag broxiva-web:latest broxivaacr.azurecr.io/broxiva-web:latest
docker tag broxiva-web:latest broxivaacr.azurecr.io/broxiva-web:v1.0.0

# Tag for multiple registries
docker tag broxiva-web:latest docker.io/broxiva/web:latest
docker tag broxiva-web:latest ghcr.io/broxiva/web:latest
```

## Pushing to Azure Container Registry

### Login to ACR

```bash
# Using Azure CLI
az login
az acr login --name broxivaacr

# Or using Docker directly
docker login broxivaacr.azurecr.io -u <username> -p <password>
```

### Push Individual Images

```bash
# Push main applications
docker push broxivaacr.azurecr.io/broxiva-web:latest
docker push broxivaacr.azurecr.io/broxiva-api:latest

# Push microservices
docker push broxivaacr.azurecr.io/broxiva-ai-agents:latest
docker push broxivaacr.azurecr.io/broxiva-analytics:latest
docker push broxivaacr.azurecr.io/broxiva-recommendation:latest
# ... continue for all services
```

### Push All Images (Docker Compose)

```bash
# Push all images defined in docker-compose.production.yml
docker-compose -f docker-compose.production.yml push
```

### Batch Push Script

```bash
# Create a script to push all images
for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep broxiva); do
  echo "Pushing $image..."
  docker push $image
done
```

## Verification

### List Built Images

```bash
# List all Broxiva images
docker images | grep broxiva

# List images with size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep broxiva

# Count images
docker images --format "{{.Repository}}" | grep broxiva | wc -l
```

### Test Images Locally

```bash
# Run web application
docker run -p 3000:3000 broxiva-web:latest

# Run API application
docker run -p 4000:4000 --env-file .env.production broxiva-api:latest

# Run specific microservice
docker run -p 8001:8001 broxiva-recommendation:latest

# Check health endpoint
curl http://localhost:3000/api/health
curl http://localhost:4000/api/health
```

### Inspect Images

```bash
# View image details
docker inspect broxiva-web:latest

# View image layers
docker history broxiva-web:latest

# Check image size
docker images broxiva-web:latest --format "{{.Size}}"

# Scan for vulnerabilities (requires Docker Scout or Trivy)
docker scout cves broxiva-web:latest
# or
trivy image broxiva-web:latest
```

## Build Optimization

### Multi-stage Builds

All Dockerfiles use multi-stage builds to minimize image size:

1. **deps stage**: Install all dependencies
2. **builder stage**: Build application
3. **prod-deps stage** (API only): Install production dependencies only
4. **runner stage**: Final minimal runtime image

### Build Cache

```bash
# Use BuildKit for better caching
export DOCKER_BUILDKIT=1

# Build with cache
docker build --cache-from broxiva-web:latest -t broxiva-web:latest .

# Pull base images for faster builds
docker pull node:20-alpine
docker pull python:3.11-slim
```

### Parallel Builds

```bash
# Build multiple images in parallel using docker-compose
docker-compose -f docker-compose.production.yml build --parallel

# Or use xargs for manual builds
echo "ai-agents analytics recommendation" | xargs -n 1 -P 3 -I {} \
  docker build -f apps/services/{}/Dockerfile -t broxiva-{}:latest apps/services/{}
```

## Troubleshooting

### Common Issues

#### 1. Build Fails - Out of Space

```bash
# Clean up unused images
docker image prune -a

# Clean up build cache
docker builder prune

# Clean up everything (WARNING: removes all stopped containers, networks, etc.)
docker system prune -a
```

#### 2. Build Fails - Network Timeout

```bash
# Increase timeout
export COMPOSE_HTTP_TIMEOUT=200

# Use specific DNS
docker build --network host ...
```

#### 3. Context Too Large

```bash
# Create/update .dockerignore file
cat > .dockerignore <<EOF
node_modules
.git
.env
.env.*
*.log
dist
.next
coverage
EOF
```

#### 4. Permission Denied (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker
```

### Build Logs

```bash
# Save build logs
docker build -t broxiva-web:latest . 2>&1 | tee build.log

# Debug build
docker build --progress=plain -t broxiva-web:latest .

# No cache build (for debugging)
docker build --no-cache -t broxiva-web:latest .
```

## Security Best Practices

### Image Scanning

```bash
# Scan with Trivy
trivy image broxiva-web:latest

# Scan with Docker Scout
docker scout cves broxiva-web:latest

# Scan with Snyk
snyk container test broxiva-web:latest
```

### Security Features

All images include:

- Non-root users (nextjs:1001, nestjs:1001, appuser)
- Multi-stage builds (no source code in final image)
- Alpine/Slim base images (minimal attack surface)
- Health checks
- No development dependencies in production
- Proper signal handling (dumb-init)

### Secrets Management

**NEVER** include secrets in Docker images. Use:

1. **Environment variables** at runtime
2. **Docker secrets** (Swarm mode)
3. **Kubernetes secrets** (K8s deployments)
4. **Azure Key Vault** (Azure deployments)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main, staging]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to ACR
        uses: azure/docker-login@v1
        with:
          login-server: broxivaacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push
        run: |
          docker build -t broxivaacr.azurecr.io/broxiva-web:${{ github.sha }} -f apps/web/Dockerfile.production apps/web
          docker push broxivaacr.azurecr.io/broxiva-web:${{ github.sha }}
```

### Azure DevOps Pipeline Example

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: Docker@2
    inputs:
      containerRegistry: 'broxivaacr'
      repository: 'broxiva-web'
      command: 'buildAndPush'
      Dockerfile: 'apps/web/Dockerfile.production'
      tags: |
        $(Build.BuildId)
        latest
```

## Monitoring

### Image Registry Monitoring

```bash
# List images in ACR
az acr repository list --name broxivaacr --output table

# Show image tags
az acr repository show-tags --name broxivaacr --repository broxiva-web --output table

# Show image manifest
az acr repository show-manifests --name broxivaacr --repository broxiva-web
```

### Runtime Monitoring

```bash
# Monitor running containers
docker stats

# View container logs
docker logs -f <container-id>

# Container resource usage
docker top <container-id>
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [NestJS Docker Documentation](https://docs.nestjs.com/recipes/dockerfile)
- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Docker logs: `docker logs <container-id>`
3. Check Docker daemon status: `docker info`
4. Contact DevOps team

---

**Last Updated**: 2025-12-13
**Version**: 1.0.0
