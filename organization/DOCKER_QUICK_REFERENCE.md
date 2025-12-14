# Broxiva Docker - Quick Reference

## Check Docker Status

```bash
# Check Docker version
docker --version

# Check Docker daemon status
docker info

# View Docker disk usage
docker system df
```

## Build Commands

### Using Build Script

```powershell
# Windows PowerShell
.\build-broxiva-images.ps1
```

```bash
# Linux/macOS/Git Bash
./build-broxiva-images.sh
```

### Using Docker Compose

```bash
# Build all services
docker-compose -f docker-compose.production.yml build

# Build without cache
docker-compose -f docker-compose.production.yml build --no-cache

# Build specific service
docker-compose -f docker-compose.production.yml build web
```

### Manual Build Commands

```bash
# Web (Next.js)
docker build -f apps/web/Dockerfile.production -t broxiva-web:latest -t broxivaacr.azurecr.io/broxiva-web:latest apps/web

# API (NestJS)
docker build -f apps/api/Dockerfile.production -t broxiva-api:latest -t broxivaacr.azurecr.io/broxiva-api:latest apps/api

# AI Agents Service
docker build -f apps/services/ai-agents/Dockerfile -t broxiva-ai-agents:latest -t broxivaacr.azurecr.io/broxiva-ai-agents:latest apps/services/ai-agents

# Analytics Service
docker build -f apps/services/analytics/Dockerfile -t broxiva-analytics:latest -t broxivaacr.azurecr.io/broxiva-analytics:latest apps/services/analytics

# Recommendation Service
docker build -f apps/services/recommendation/Dockerfile -t broxiva-recommendation:latest -t broxivaacr.azurecr.io/broxiva-recommendation:latest apps/services/recommendation

# Search Service
docker build -f apps/services/search/Dockerfile -t broxiva-search:latest -t broxivaacr.azurecr.io/broxiva-search:latest apps/services/search

# Chatbot Service
docker build -f apps/services/chatbot/Dockerfile -t broxiva-chatbot:latest -t broxivaacr.azurecr.io/broxiva-chatbot:latest apps/services/chatbot

# Inventory Service
docker build -f apps/services/inventory/Dockerfile -t broxiva-inventory:latest -t broxivaacr.azurecr.io/broxiva-inventory:latest apps/services/inventory

# Media Service
docker build -f apps/services/media/Dockerfile -t broxiva-media:latest -t broxivaacr.azurecr.io/broxiva-media:latest apps/services/media

# Notification Service
docker build -f apps/services/notification/Dockerfile -t broxiva-notification:latest -t broxivaacr.azurecr.io/broxiva-notification:latest apps/services/notification

# Personalization Service
docker build -f apps/services/personalization/Dockerfile -t broxiva-personalization:latest -t broxivaacr.azurecr.io/broxiva-personalization:latest apps/services/personalization

# Pricing Service
docker build -f apps/services/pricing/Dockerfile -t broxiva-pricing:latest -t broxivaacr.azurecr.io/broxiva-pricing:latest apps/services/pricing

# Fraud Detection Service
docker build -f apps/services/fraud-detection/Dockerfile -t broxiva-fraud-detection:latest -t broxivaacr.azurecr.io/broxiva-fraud-detection:latest apps/services/fraud-detection

# Supplier Integration Service
docker build -f apps/services/supplier-integration/Dockerfile -t broxiva-supplier-integration:latest -t broxivaacr.azurecr.io/broxiva-supplier-integration:latest apps/services/supplier-integration

# AI Engine Service
docker build -f apps/services/ai-engine/Dockerfile -t broxiva-ai-engine:latest -t broxivaacr.azurecr.io/broxiva-ai-engine:latest apps/services/ai-engine
```

## List Images

```bash
# List all images
docker images

# List Broxiva images only
docker images | grep broxiva

# List with size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep broxiva

# Count Broxiva images
docker images --format "{{.Repository}}" | grep broxiva | wc -l
```

## Tag Images

```bash
# Tag for ACR
docker tag broxiva-web:latest broxivaacr.azurecr.io/broxiva-web:latest
docker tag broxiva-api:latest broxivaacr.azurecr.io/broxiva-api:latest

# Tag with version
docker tag broxiva-web:latest broxiva-web:v1.0.0
docker tag broxiva-web:latest broxivaacr.azurecr.io/broxiva-web:v1.0.0

# Tag all at once (loop)
for service in web api ai-agents analytics recommendation search; do
  docker tag broxiva-$service:latest broxivaacr.azurecr.io/broxiva-$service:latest
done
```

## Push to ACR

```bash
# Login to ACR
az acr login --name broxivaacr

# Push single image
docker push broxivaacr.azurecr.io/broxiva-web:latest

# Push all images (loop)
for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep broxivaacr); do
  docker push $image
done

# Using docker-compose
docker-compose -f docker-compose.production.yml push
```

## Run Containers

```bash
# Run web
docker run -p 3000:3000 broxiva-web:latest

# Run API with env file
docker run -p 4000:4000 --env-file .env.production broxiva-api:latest

# Run in background (detached)
docker run -d -p 3000:3000 --name broxiva-web broxiva-web:latest

# Run with custom environment variables
docker run -p 4000:4000 -e NODE_ENV=production -e PORT=4000 broxiva-api:latest
```

## Test & Debug

```bash
# Check container logs
docker logs <container-id>
docker logs -f <container-id>  # Follow logs

# Execute command in running container
docker exec -it <container-id> /bin/sh
docker exec -it <container-id> node -v

# Inspect container
docker inspect <container-id>

# Test health endpoints
curl http://localhost:3000/api/health
curl http://localhost:4000/api/health

# View container stats
docker stats
docker stats <container-id>
```

## Cleanup

```bash
# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a

# Remove build cache
docker builder prune

# Remove specific image
docker rmi broxiva-web:latest

# Remove all Broxiva images
docker rmi $(docker images --format "{{.Repository}}:{{.Tag}}" | grep broxiva)

# Full cleanup (WARNING: removes all stopped containers, networks, etc.)
docker system prune -a
```

## Inspect Images

```bash
# View image history
docker history broxiva-web:latest

# View image details
docker inspect broxiva-web:latest

# Check image size
docker images broxiva-web:latest --format "{{.Size}}"

# Scan for vulnerabilities
docker scout cves broxiva-web:latest
trivy image broxiva-web:latest
```

## Docker Compose Commands

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Scale services
docker-compose -f docker-compose.production.yml up -d --scale api=3 --scale web=2

# Restart specific service
docker-compose -f docker-compose.production.yml restart web

# View running services
docker-compose -f docker-compose.production.yml ps
```

## ACR Commands

```bash
# Login
az acr login --name broxivaacr

# List repositories
az acr repository list --name broxivaacr --output table

# Show tags for repository
az acr repository show-tags --name broxivaacr --repository broxiva-web --output table

# Delete image
az acr repository delete --name broxivaacr --image broxiva-web:old-tag

# Show repository details
az acr repository show --name broxivaacr --repository broxiva-web
```

## Complete Build & Push Workflow

```bash
# 1. Navigate to project
cd C:/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization

# 2. Build all images
./build-broxiva-images.sh
# or
.\build-broxiva-images.ps1

# 3. Login to ACR
az acr login --name broxivaacr

# 4. Push all images
for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep broxivaacr); do
  echo "Pushing $image..."
  docker push $image
done

# 5. Verify in ACR
az acr repository list --name broxivaacr --output table
```

## One-Line Commands

```bash
# Build all main services
docker build -f apps/web/Dockerfile.production -t broxiva-web:latest apps/web && docker build -f apps/api/Dockerfile.production -t broxiva-api:latest apps/api

# Tag all for ACR
for img in web api ai-agents analytics recommendation; do docker tag broxiva-$img:latest broxivaacr.azurecr.io/broxiva-$img:latest; done

# Push all to ACR
docker images --format "{{.Repository}}:{{.Tag}}" | grep broxivaacr | xargs -I {} docker push {}

# Clean and rebuild
docker system prune -af && docker-compose -f docker-compose.production.yml build --no-cache
```

## Troubleshooting

```bash
# Check Docker daemon
docker info

# View disk usage
docker system df

# Clean up space
docker system prune -a --volumes

# Restart Docker (Windows)
Restart-Service docker

# View build with detailed output
docker build --progress=plain -t broxiva-web:latest apps/web

# Build without cache
docker build --no-cache -t broxiva-web:latest apps/web
```

## Environment Variables for Builds

```bash
# Enable BuildKit for better performance
export DOCKER_BUILDKIT=1

# Set build timeout
export COMPOSE_HTTP_TIMEOUT=200

# Set parallel builds
export COMPOSE_PARALLEL_LIMIT=4
```

## Image Summary

| Image | Size | Port | Type |
|-------|------|------|------|
| broxiva-web | ~200MB | 3000 | Node.js |
| broxiva-api | ~300MB | 4000 | Node.js |
| broxiva-ai-agents | ~400MB | 8020 | Python |
| broxiva-ai-engine | ~400MB | 8010 | Python |
| broxiva-analytics | ~350MB | 8005 | Python |
| broxiva-chatbot | ~400MB | 8009 | Python |
| broxiva-fraud-detection | ~350MB | 8008 | Python |
| broxiva-inventory | ~300MB | 8004 | Python |
| broxiva-media | ~350MB | 8006 | Python |
| broxiva-notification | ~300MB | 8003 | Python |
| broxiva-personalization | ~350MB | 8002 | Python |
| broxiva-pricing | ~300MB | 8011 | Python |
| broxiva-recommendation | ~400MB | 8001 | Python |
| broxiva-search | ~400MB | 8007 | Python |
| broxiva-supplier-integration | ~300MB | 8012 | Python |

**Total**: 15 images, ~5GB total storage

---

**Quick Links**:
- Full Guide: [DOCKER_BUILD_GUIDE.md](./DOCKER_BUILD_GUIDE.md)
- Build Script (Windows): [build-broxiva-images.ps1](./build-broxiva-images.ps1)
- Build Script (Linux/Mac): [build-broxiva-images.sh](./build-broxiva-images.sh)
