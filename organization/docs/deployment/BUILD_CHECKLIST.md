# Broxiva Platform - Docker Build Checklist

## Pre-Build Checklist

- [ ] Docker Desktop is installed
- [ ] Docker Desktop is running
- [ ] At least 20 GB of free disk space available
- [ ] Internet connection is stable
- [ ] Located in correct directory: `C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization`

### Verify Docker Installation

```bash
# Check Docker version
docker --version

# Check Docker daemon
docker info

# Check disk space
docker system df
```

---

## Build Process Checklist

### Option 1: Automated Build (Recommended)

- [ ] Open PowerShell / Terminal
- [ ] Navigate to project directory
- [ ] Run build script: `.\build-broxiva-images.ps1` (Windows) or `./build-broxiva-images.sh` (Linux/Mac)
- [ ] Wait for build completion (30-60 minutes)
- [ ] Review build summary

### Option 2: Docker Compose Build

- [ ] Open PowerShell / Terminal
- [ ] Navigate to project directory
- [ ] Run: `docker-compose -f docker-compose.production.yml build`
- [ ] Wait for build completion
- [ ] Verify images: `docker images | grep broxiva`

---

## Image Verification Checklist

### Main Applications (2)

- [ ] **broxiva-web:latest** - Next.js frontend (~200MB)
- [ ] **broxiva-api:latest** - NestJS backend (~300MB)

### Microservices (13)

- [ ] **broxiva-ai-agents:latest** - AI agents service (~400MB)
- [ ] **broxiva-ai-engine:latest** - AI engine service (~400MB)
- [ ] **broxiva-analytics:latest** - Analytics service (~350MB)
- [ ] **broxiva-chatbot:latest** - Chatbot service (~400MB)
- [ ] **broxiva-fraud-detection:latest** - Fraud detection (~350MB)
- [ ] **broxiva-inventory:latest** - Inventory service (~300MB)
- [ ] **broxiva-media:latest** - Media service (~350MB)
- [ ] **broxiva-notification:latest** - Notification service (~300MB)
- [ ] **broxiva-personalization:latest** - Personalization service (~350MB)
- [ ] **broxiva-pricing:latest** - Pricing service (~300MB)
- [ ] **broxiva-recommendation:latest** - Recommendation engine (~400MB)
- [ ] **broxiva-search:latest** - Search service (~400MB)
- [ ] **broxiva-supplier-integration:latest** - Supplier integration (~300MB)

### Verification Commands

```bash
# List all Broxiva images
docker images | grep broxiva

# Count images (should be 15 or 30 with ACR tags)
docker images --format "{{.Repository}}" | grep broxiva | wc -l

# Check total size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep broxiva
```

---

## ACR (Azure Container Registry) Tagging Checklist

### All images should have both tags:

#### Local Tags (broxiva-*:latest)
- [ ] broxiva-web:latest
- [ ] broxiva-api:latest
- [ ] broxiva-ai-agents:latest
- [ ] broxiva-ai-engine:latest
- [ ] broxiva-analytics:latest
- [ ] broxiva-chatbot:latest
- [ ] broxiva-fraud-detection:latest
- [ ] broxiva-inventory:latest
- [ ] broxiva-media:latest
- [ ] broxiva-notification:latest
- [ ] broxiva-personalization:latest
- [ ] broxiva-pricing:latest
- [ ] broxiva-recommendation:latest
- [ ] broxiva-search:latest
- [ ] broxiva-supplier-integration:latest

#### ACR Tags (broxivaacr.azurecr.io/broxiva-*:latest)
- [ ] broxivaacr.azurecr.io/broxiva-web:latest
- [ ] broxivaacr.azurecr.io/broxiva-api:latest
- [ ] broxivaacr.azurecr.io/broxiva-ai-agents:latest
- [ ] broxivaacr.azurecr.io/broxiva-ai-engine:latest
- [ ] broxivaacr.azurecr.io/broxiva-analytics:latest
- [ ] broxivaacr.azurecr.io/broxiva-chatbot:latest
- [ ] broxivaacr.azurecr.io/broxiva-fraud-detection:latest
- [ ] broxivaacr.azurecr.io/broxiva-inventory:latest
- [ ] broxivaacr.azurecr.io/broxiva-media:latest
- [ ] broxivaacr.azurecr.io/broxiva-notification:latest
- [ ] broxivaacr.azurecr.io/broxiva-personalization:latest
- [ ] broxivaacr.azurecr.io/broxiva-pricing:latest
- [ ] broxivaacr.azurecr.io/broxiva-recommendation:latest
- [ ] broxivaacr.azurecr.io/broxiva-search:latest
- [ ] broxivaacr.azurecr.io/broxiva-supplier-integration:latest

---

## Local Testing Checklist

### Test Web Application

- [ ] Run: `docker run -p 3000:3000 broxiva-web:latest`
- [ ] Open browser: http://localhost:3000
- [ ] Verify application loads
- [ ] Check health endpoint: http://localhost:3000/api/health
- [ ] Stop container: `docker stop <container-id>`

### Test API Application

- [ ] Run: `docker run -p 4000:4000 broxiva-api:latest`
- [ ] Check health endpoint: http://localhost:4000/api/health
- [ ] Verify API responds
- [ ] Stop container: `docker stop <container-id>`

### Test Sample Microservice

- [ ] Run: `docker run -p 8001:8001 broxiva-recommendation:latest`
- [ ] Check health endpoint: http://localhost:8001/health
- [ ] Verify service responds
- [ ] Stop container: `docker stop <container-id>`

---

## Push to ACR Checklist

### Prerequisites

- [ ] Azure CLI is installed
- [ ] Logged into Azure: `az login`
- [ ] ACR credentials are available

### Login to ACR

- [ ] Run: `az acr login --name broxivaacr`
- [ ] Verify login success

### Push Images

#### PowerShell Method
- [ ] Run push script:
  ```powershell
  docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "broxivaacr" | ForEach-Object {
      docker push $_
  }
  ```

#### Bash Method
- [ ] Run push script:
  ```bash
  for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep broxivaacr); do
      docker push $image
  done
  ```

#### Individual Push (Alternative)
- [ ] Push broxiva-web: `docker push broxivaacr.azurecr.io/broxiva-web:latest`
- [ ] Push broxiva-api: `docker push broxivaacr.azurecr.io/broxiva-api:latest`
- [ ] Push all microservices (repeat for each)

### Verify in ACR

- [ ] List repositories: `az acr repository list --name broxivaacr --output table`
- [ ] Verify all 15 images are present
- [ ] Check specific tags: `az acr repository show-tags --name broxivaacr --repository broxiva-web`

---

## Post-Build Checklist

### Documentation Review

- [ ] Read `DOCKER_BUILD_GUIDE.md` for comprehensive information
- [ ] Review `DOCKER_QUICK_REFERENCE.md` for quick commands
- [ ] Keep `BUILD_INSTRUCTIONS.txt` for reference

### Cleanup (Optional)

- [ ] Remove dangling images: `docker image prune`
- [ ] Clean build cache: `docker builder prune`
- [ ] Check disk usage: `docker system df`

### Next Steps

- [ ] Set up CI/CD pipeline for automated builds
- [ ] Configure deployment to staging environment
- [ ] Set up monitoring for containers
- [ ] Create backup strategy for images
- [ ] Document deployment procedures

---

## Troubleshooting Checklist

### If Build Fails

- [ ] Check Docker daemon is running: `docker info`
- [ ] Check disk space: `docker system df`
- [ ] Review error logs
- [ ] Try building without cache: `docker build --no-cache ...`
- [ ] Check internet connection
- [ ] Verify Dockerfile paths are correct

### If Push Fails

- [ ] Verify ACR login: `az acr login --name broxivaacr`
- [ ] Check Azure credentials are valid
- [ ] Verify image tags are correct: `docker images | grep broxivaacr`
- [ ] Check network connectivity
- [ ] Verify ACR exists and is accessible

### If Container Fails to Start

- [ ] Check logs: `docker logs <container-id>`
- [ ] Verify port is not in use: `netstat -an | grep <port>`
- [ ] Check environment variables are set
- [ ] Verify health check endpoint exists
- [ ] Review container configuration

---

## Success Criteria

### Build Success

✅ All 15 images built successfully
✅ All images tagged with both local and ACR tags
✅ Total size is within expected range (5-8 GB)
✅ No build errors in logs
✅ Images appear in `docker images` list

### Push Success

✅ All 15 images pushed to ACR
✅ All images visible in ACR: `az acr repository list --name broxivaacr`
✅ Tags are correct (latest and/or version tags)
✅ No push errors in logs

### Testing Success

✅ Web container starts successfully
✅ API container starts successfully
✅ Sample microservice starts successfully
✅ Health endpoints respond correctly
✅ No errors in container logs

---

## Quick Reference Commands

### Build
```bash
.\build-broxiva-images.ps1  # Windows
./build-broxiva-images.sh   # Linux/Mac
```

### Verify
```bash
docker images | grep broxiva
```

### Push
```bash
az acr login --name broxivaacr
# Then run appropriate push script
```

### Test
```bash
docker run -p 3000:3000 broxiva-web:latest
```

### Cleanup
```bash
docker system prune -a
```

---

## Sign-Off

- [ ] All images built successfully
- [ ] All images tested locally
- [ ] All images pushed to ACR
- [ ] Documentation reviewed
- [ ] Cleanup performed
- [ ] Ready for deployment

**Build Date**: _______________
**Built By**: _______________
**Notes**: _______________________________________________

---

**Total Checklist Items**: 100+
**Estimated Time**: 1-2 hours (including build time)
**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed
