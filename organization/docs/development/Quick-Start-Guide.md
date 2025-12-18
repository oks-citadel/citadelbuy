# CitadelBuy Quick Start & Deployment Guide
## From Zero to Production in 8 Weeks

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [8-Week Implementation Plan](#8-week-implementation-plan)
3. [Local Development Setup](#local-development-setup)
4. [Azure Deployment](#azure-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Production Checklist](#production-checklist)
7. [Troubleshooting](#troubleshooting)

---

## ✅ PREREQUISITES

### Required Tools & Accounts

**Development Tools**
```bash
# Install Homebrew (macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node@20
brew install terraform
brew install azure-cli
brew install kubectl
brew install helm
brew install docker
brew install git

# Verify installations
node --version      # v20.x.x
npm --version       # 10.x.x
terraform --version # 1.7+
az --version        # 2.50+
kubectl version     # 1.29+
docker --version    # 24.x.x
```

**Azure Account Setup**
```bash
# Login to Azure
az login

# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR-SUBSCRIPTION-ID"

# Verify
az account show
```

**Required Accounts**
- [ ] Azure Subscription (Pay-as-you-go or Enterprise)
- [ ] GitHub Account (for CI/CD)
- [ ] Docker Hub Account
- [ ] Stripe Account (payment processing)
- [ ] SendGrid Account (email service)
- [ ] Google Analytics Account
- [ ] Sentry Account (error tracking)

---

## 📅 8-WEEK IMPLEMENTATION PLAN

### Week 1: Infrastructure Foundation

**Day 1-2: Azure Account Setup**
```bash
# Create resource group for Terraform state
az group create --name citadelbuy-tfstate-rg --location eastus

# Create storage account for Terraform state
az storage account create \
  --name citadelbuytfstate \
  --resource-group citadelbuy-tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container for state files
az storage container create \
  --name tfstate-dev \
  --account-name citadelbuytfstate
```

**Day 3-4: Deploy Base Infrastructure**
```bash
# Clone repository
git clone https://github.com/your-org/citadelbuy.git
cd citadelbuy

# Navigate to dev environment
cd infrastructure/terraform/environments/dev

# Copy variables template
cp terraform.tfvars.example terraform.tfvars

# Edit variables (use your preferred editor)
nano terraform.tfvars

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Review plan carefully!
# Check: resource types, costs, regions

# Apply infrastructure
terraform apply tfplan

# This will create:
# - Resource Group
# - Virtual Network
# - AKS Cluster (takes 10-15 minutes)
# - Azure SQL Database
# - Cosmos DB
# - Redis Cache
# - Storage Accounts
# - Service Bus
# - Key Vault
# - Container Registry
# - Monitoring (Application Insights)

# Save outputs
terraform output -json > ../../../outputs/terraform-outputs-dev.json
```

**Day 5-7: Database Setup & Initial Data**
```bash
# Get SQL connection details
SQL_SERVER=$(terraform output -raw sql_server_name)
SQL_DB=$(terraform output -raw sql_database_name)

# Run database migrations
cd ../../../../database

# Install dependencies
npm install

# Run migrations
npm run migrate:dev

# Seed initial data
npm run seed:dev

# Verify
sqlcmd -S $SQL_SERVER -d $SQL_DB -U citadeladmin -P <password> \
  -Q "SELECT COUNT(*) FROM Users"
```

**Deliverables:**
- ✅ Azure infrastructure provisioned
- ✅ Databases created and migrated
- ✅ Secrets stored in Key Vault
- ✅ Monitoring configured

### Week 2: Backend Development

**Day 1-2: Core Services Setup**
```bash
cd services

# Install dependencies for all services
npm run install:all

# Or manually for each service
cd auth-service && npm install && cd ..
cd product-service && npm install && cd ..
cd order-service && npm install && cd ..
cd payment-service && npm install && cd ..
```

**Day 3-5: Implement Core APIs**
```bash
# Start development servers
npm run dev:all

# This starts all services:
# - auth-service: http://localhost:3001
# - product-service: http://localhost:3002
# - order-service: http://localhost:3003
# - payment-service: http://localhost:3004

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3002/health
```

**Day 6-7: Testing & Documentation**
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Generate API documentation
npm run docs:generate

# View docs at http://localhost:8080
```

**Deliverables:**
- ✅ Auth service (login, register, JWT)
- ✅ Product service (CRUD, search)
- ✅ Order service (create, track)
- ✅ Payment service (Stripe integration)
- ✅ 80%+ test coverage

### Week 3: Frontend Development

**Day 1-2: Project Setup**
```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Add:
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
```

**Day 3-5: Core Pages**
```bash
# Start development server
npm run dev

# App running at http://localhost:3000

# Implement pages:
# - Homepage
# - Product Listing
# - Product Detail
# - Shopping Cart
# - Checkout
# - User Dashboard
```

**Day 6-7: Components & Testing**
```bash
# Run component tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production (test)
npm run build
npm run start
```

**Deliverables:**
- ✅ Responsive homepage
- ✅ Product catalog & search
- ✅ Shopping cart
- ✅ Checkout flow
- ✅ User authentication
- ✅ Lighthouse score > 90

### Week 4: Integration & Testing

**Day 1-3: End-to-End Integration**
```bash
# Start all services
docker-compose up -d

# Run integration tests
npm run test:integration:all

# Test flows:
# 1. User registration
# 2. Product search
# 3. Add to cart
# 4. Checkout
# 5. Order tracking
```

**Day 4-5: Performance Testing**
```bash
# Install k6
brew install k6

# Run load tests
cd tests/load
k6 run --vus 100 --duration 5m checkout.js

# Monitor metrics
# - Response time < 200ms (p95)
# - Error rate < 0.1%
# - Throughput > 1000 req/s
```

**Day 6-7: Security Audit**
```bash
# Run security scans
npm audit
npm audit fix

# Scan Docker images
docker scan citadelbuy/backend:latest

# Check dependencies
npm install -g snyk
snyk test
```

**Deliverables:**
- ✅ All integration tests passing
- ✅ Performance benchmarks met
- ✅ Security vulnerabilities fixed
- ✅ Load testing completed

### Week 5-6: Production Deployment

**Day 1-2: Container Build & Push**
```bash
# Get ACR credentials
ACR_NAME=$(terraform output -raw acr_name)
az acr login --name $ACR_NAME

# Build and push all services
./scripts/build-and-push.sh production v1.0.0

# This builds and pushes:
# - auth-service
# - product-service
# - order-service
# - payment-service
# - notification-service
# - frontend
```

**Day 3-5: Kubernetes Deployment**
```bash
# Get AKS credentials
AKS_NAME=$(terraform output -raw aks_cluster_name)
AKS_RG=$(terraform output -raw resource_group_name)

az aks get-credentials \
  --resource-group $AKS_RG \
  --name $AKS_NAME

# Verify connection
kubectl get nodes

# Deploy applications
kubectl apply -k k8s/overlays/production

# Wait for rollout
kubectl rollout status deployment/auth-service -n citadelbuy-prod
kubectl rollout status deployment/product-service -n citadelbuy-prod
kubectl rollout status deployment/order-service -n citadelbuy-prod

# Verify pods
kubectl get pods -n citadelbuy-prod
```

**Day 6-7: DNS & SSL Configuration**
```bash
# Get Front Door endpoint
FRONTDOOR_ENDPOINT=$(terraform output -raw frontdoor_endpoint)

echo "Configure DNS records:"
echo "CNAME www.citadelbuy.com -> $FRONTDOOR_ENDPOINT"
echo "CNAME api.citadelbuy.com -> $FRONTDOOR_ENDPOINT"

# Azure Front Door automatically provisions SSL certificates
# via Let's Encrypt after DNS propagation

# Verify SSL (after DNS propagation)
curl -I https://www.citadelbuy.com
curl -I https://api.citadelbuy.com
```

**Day 8-10: Smoke Testing & Monitoring**
```bash
# Run smoke tests
./scripts/smoke-tests.sh production

# Check health endpoints
curl https://api.citadelbuy.com/health
curl https://api.citadelbuy.com/ready

# Verify monitoring
az monitor metrics list \
  --resource $(terraform output -raw aks_resource_id) \
  --metric CPUUsagePercentage \
  --interval PT1M

# Check logs
kubectl logs -l app=product-service -n citadelbuy-prod --tail=100
```

**Deliverables:**
- ✅ All services deployed to production
- ✅ DNS configured
- ✅ SSL certificates active
- ✅ Monitoring & alerts configured
- ✅ Smoke tests passing

### Week 7: Launch Preparation

**Day 1-3: Final Testing**
- Load testing with production-like traffic
- Security penetration testing
- Disaster recovery testing
- Backup & restore verification

**Day 4-5: Documentation**
- API documentation
- User guides
- Admin guides
- Runbooks for operations

**Day 6-7: Soft Launch**
- Beta users (100-1000)
- Limited geographic area
- Monitor closely
- Gather feedback

**Deliverables:**
- ✅ Production-ready system
- ✅ Documentation complete
- ✅ Beta feedback collected
- ✅ Launch plan finalized

### Week 8: Public Launch

**Day 1: Final Preparations**
```bash
# Final backup
./scripts/backup.sh production

# Review monitoring dashboards
# Review alert configurations
# Brief support team
```

**Day 2: Launch Day**
```bash
# 9:00 AM: Final system check
./scripts/health-check.sh production

# 10:00 AM: DNS cutover (if needed)
# 10:30 AM: Announce on social media
# 11:00 AM: Press release
# 12:00 PM: Monitor dashboards closely

# Throughout day: Support team ready
```

**Day 3-7: Post-Launch**
- Monitor metrics & logs 24/7
- Address any issues immediately
- Collect user feedback
- Optimize based on real traffic

**Deliverables:**
- ✅ Successful public launch
- ✅ No critical issues
- ✅ Positive user feedback
- ✅ Traffic growing steadily

---

## 💻 LOCAL DEVELOPMENT SETUP

### Complete Setup Script

```bash
#!/bin/bash
# setup-local.sh

set -e

echo "🚀 Setting up CitadelBuy local development environment..."

# Clone repository
if [ ! -d "citadelbuy" ]; then
  git clone https://github.com/your-org/citadelbuy.git
fi
cd citadelbuy

# Backend setup
echo "📦 Setting up backend services..."
cd services

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start databases with Docker
docker-compose up -d postgres redis

# Wait for databases
echo "⏳ Waiting for databases..."
sleep 10

# Run migrations
npm run migrate:dev
npm run seed:dev

# Frontend setup
echo "🎨 Setting up frontend..."
cd ../frontend

npm install
cp .env.example .env.local

# Build
npm run build

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  cd services && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
```

### Docker Compose for Local Development

**`docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: citadelbuy_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

---

## 🚀 AZURE DEPLOYMENT

### Automated Deployment Script

**`scripts/deploy.sh`**
```bash
#!/bin/bash

ENVIRONMENT=$1
VERSION=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./deploy.sh <environment> <version>"
    echo "Example: ./deploy.sh production v1.0.0"
    exit 1
fi

set -e

echo "🚀 Deploying CitadelBuy to $ENVIRONMENT (version: $VERSION)"

# 1. Deploy Terraform infrastructure
echo "📦 Deploying infrastructure..."
cd infrastructure/terraform/environments/$ENVIRONMENT
terraform init
terraform plan -out=tfplan
terraform apply -auto-approve tfplan
cd -

# 2. Build and push Docker images
echo "🐳 Building and pushing images..."
az acr login --name citadelbuyacr

services=("auth" "product" "order" "payment" "notification")
for service in "${services[@]}"; do
    echo "Building $service-service..."
    docker build \
      -t citadelbuyacr.azurecr.io/$service-service:$VERSION \
      -t citadelbuyacr.azurecr.io/$service-service:latest \
      -f services/$service-service/Dockerfile \
      services/$service-service
    
    docker push citadelbuyacr.azurecr.io/$service-service:$VERSION
    docker push citadelbuyacr.azurecr.io/$service-service:latest
done

# 3. Build and push frontend
echo "Building frontend..."
docker build \
  -t citadelbuyacr.azurecr.io/frontend:$VERSION \
  -t citadelbuyacr.azurecr.io/frontend:latest \
  -f frontend/Dockerfile \
  frontend

docker push citadelbuyacr.azurecr.io/frontend:$VERSION
docker push citadelbuyacr.azurecr.io/frontend:latest

# 4. Deploy to Kubernetes
echo "☸️  Deploying to AKS..."
az aks get-credentials \
  --resource-group citadelbuy-$ENVIRONMENT-rg \
  --name citadelbuy-$ENVIRONMENT-aks

# Update image tags
cd k8s/overlays/$ENVIRONMENT
kustomize edit set image \
  auth-service=citadelbuyacr.azurecr.io/auth-service:$VERSION \
  product-service=citadelbuyacr.azurecr.io/product-service:$VERSION \
  order-service=citadelbuyacr.azurecr.io/order-service:$VERSION \
  frontend=citadelbuyacr.azurecr.io/frontend:$VERSION

# Apply manifests
kubectl apply -k .
cd -

# 5. Wait for rollout
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/auth-service -n citadelbuy-$ENVIRONMENT
kubectl rollout status deployment/product-service -n citadelbuy-$ENVIRONMENT
kubectl rollout status deployment/order-service -n citadelbuy-$ENVIRONMENT

# 6. Run smoke tests
echo "🧪 Running smoke tests..."
./scripts/smoke-tests.sh $ENVIRONMENT

echo "✅ Deployment complete!"
```

---

## 🔧 TROUBLESHOOTING

### Common Issues & Solutions

**Issue: Terraform state locked**
```bash
# Solution: Force unlock
terraform force-unlock <LOCK_ID>

# Prevention: Always use proper cleanup
terraform destroy
```

**Issue: Pod CrashLoopBackOff**
```bash
# Check pod logs
kubectl logs <pod-name> -n citadelbuy-prod

# Check pod events
kubectl describe pod <pod-name> -n citadelbuy-prod

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Memory limits too low
```

**Issue: Database connection timeout**
```bash
# Check connectivity from AKS
kubectl run -it --rm debug \
  --image=postgres:16 \
  --restart=Never \
  -- psql -h <SQL_SERVER> -U citadeladmin -d orders

# Check firewall rules
az sql server firewall-rule list \
  --resource-group citadelbuy-prod-rg \
  --server citadelbuy-prod-sql
```

**Issue: High response times**
```bash
# Check Redis connection
kubectl exec -it <pod-name> -n citadelbuy-prod -- redis-cli ping

# Check database query performance
# Enable slow query log
# Review indexes

# Scale pods
kubectl scale deployment/product-service \
  --replicas=10 \
  -n citadelbuy-prod
```

**Issue: Out of memory**
```bash
# Check resource usage
kubectl top pods -n citadelbuy-prod

# Increase memory limits
kubectl set resources deployment/product-service \
  --limits=memory=1Gi \
  -n citadelbuy-prod
```

### Getting Help

**Documentation**
- Platform docs: `docs/README.md`
- API docs: `https://api.citadelbuy.com/docs`
- Azure docs: https://docs.microsoft.com/azure

**Support Channels**
- Slack: #citadelbuy-support
- Email: devops@citadelbuy.com
- On-call: +1-XXX-XXX-XXXX

---

## ✅ PRODUCTION CHECKLIST

### Pre-Launch Checklist

**Infrastructure**
- [ ] All resources provisioned
- [ ] Backup configured and tested
- [ ] Disaster recovery plan documented
- [ ] Auto-scaling configured
- [ ] Monitoring & alerts configured
- [ ] Cost alerts configured

**Security**
- [ ] All secrets in Key Vault
- [ ] SSL certificates configured
- [ ] WAF rules configured
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Audit logging enabled
- [ ] Security scan completed
- [ ] Penetration test completed

**Application**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance benchmarks met
- [ ] Load testing completed
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured (GA4)
- [ ] API documentation published
- [ ] Rate limiting configured

**Operations**
- [ ] Runbooks created
- [ ] On-call rotation scheduled
- [ ] Incident response plan ready
- [ ] Rollback procedure documented
- [ ] Support team trained

**Business**
- [ ] Payment gateway activated
- [ ] Email service configured
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] GDPR compliance verified

**Communication**
- [ ] Status page configured
- [ ] Social media accounts ready
- [ ] Press release prepared
- [ ] Launch announcement ready

---

Continue to Operational Handbook for day-to-day operations...
