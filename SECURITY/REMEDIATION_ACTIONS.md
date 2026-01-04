# BROXIVA REMEDIATION ACTION PLAN

**Generated:** 2025-12-28
**Status:** Action Required
**Priority:** CRITICAL

---

## PHASE 1: IMMEDIATE ACTIONS (24-48 Hours)

### 1.1 Secrets Rotation (CRITICAL)

**Action Required:** Rotate all exposed credentials

```bash
# Step 1: Generate new secure credentials
openssl rand -base64 64  # For JWT secrets
openssl rand -base64 32  # For passwords

# Step 2: Update in Azure Key Vault (or equivalent)
az keyvault secret set --vault-name broxiva-kv --name JWT-SECRET --value "NEW_VALUE"
az keyvault secret set --vault-name broxiva-kv --name JWT-REFRESH-SECRET --value "NEW_VALUE"
az keyvault secret set --vault-name broxiva-kv --name DB-PASSWORD --value "NEW_VALUE"

# Step 3: Remove .env from git history
# WARNING: This rewrites history - coordinate with team
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch organization/.env' \
  --prune-empty --tag-name-filter cat -- --all

# Alternative using BFG (faster)
# bfg --delete-files .env
```

**Credentials to Rotate:**
- [ ] JWT_SECRET
- [ ] JWT_REFRESH_SECRET
- [ ] POSTGRES_PASSWORD
- [ ] GRAFANA_ADMIN_PASSWORD
- [ ] PGADMIN_DEFAULT_PASSWORD
- [ ] RABBITMQ_PASSWORD
- [ ] MINIO_ROOT_PASSWORD
- [ ] KYC_ENCRYPTION_KEY

---

### 1.2 CORS Configuration Fix (CRITICAL)

**Files to Update:**

#### apps/services/ai-agents/main.py (Line 66)
```python
# BEFORE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    ...
)

# AFTER
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "https://broxiva.com",
    "https://api.broxiva.com",
    "https://admin.broxiva.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Apply Same Fix To:**
- [ ] `apps/services/notification/main.py` (Line 519)
- [ ] `apps/services/ai-engine/main.py` (Line 41)
- [ ] `apps/services/personalization/main.py` (Line 31)
- [ ] `azure-pipelines/variables/dev.yml` (Line 50)

---

### 1.3 Verify .gitignore

Ensure these entries exist in `.gitignore`:
```
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.production

# Secrets
*.pem
*.key
credentials.json
secrets.yaml
```

---

## PHASE 2: SHORT-TERM ACTIONS (1-2 Weeks)

### 2.1 CI/CD Pipeline Fixes

#### Remove Mutable Tags
```yaml
# BEFORE - azure-pipelines.yml
tags: |
  $(IMAGE_TAG)
  $(BRANCH_TAG)
  latest

# AFTER
tags: |
  v$(Build.BuildNumber)
  $(Build.SourceVersion)
```

#### Add Production Approval Gates
```yaml
# Azure DevOps - add to production stage
- stage: DeployProduction
  displayName: 'Deploy to Production'
  dependsOn: DeployStaging
  condition: succeeded()
  jobs:
  - deployment: DeployToProduction
    environment: 'broxiva-production'  # Requires approval
    strategy:
      runOnce:
        deploy:
          steps:
            # ... deployment steps
```

#### Remove continueOnError from Critical Stages
Files to update:
- [ ] `azure-pipelines.yml` (56+ instances)
- [ ] `organization/azure-pipelines.yml`
- [ ] `organization/.azuredevops/pipelines/cd-api.yml`
- [ ] `organization/.azuredevops/pipelines/cd-web.yml`

---

### 2.2 Network Configuration Fixes

#### Terraform - Restrict ACR Access
```hcl
# infrastructure/terraform/modules/compute/main.tf
# BEFORE (Line 45)
ip_rule {
  action   = "Allow"
  ip_range = "0.0.0.0/0"  # Will be restricted in production
}

# AFTER
ip_rule {
  action   = "Allow"
  ip_range = var.allowed_ip_ranges  # Specific IP ranges only
}

# Add to variables.tf
variable "allowed_ip_ranges" {
  type        = list(string)
  description = "Allowed IP ranges for ACR access"
  # No default - must be explicitly set per environment
}
```

#### Fix Redis Firewall
```hcl
# infrastructure/terraform/modules/database/main.tf
# BEFORE (Lines 190-197)
resource "azurerm_redis_firewall_rule" "allow_azure" {
  start_ip = "0.0.0.0"
  end_ip   = "0.0.0.0"
}

# AFTER - Use Private Endpoints instead
resource "azurerm_private_endpoint" "redis" {
  name                = "pe-redis-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "psc-redis"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names             = ["redisCache"]
  }
}
```

---

## PHASE 3: MEDIUM-TERM ACTIONS (1 Month)

### 3.1 Implement Secret Scanning

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scanning
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_NOTIFY_USER_LIST: "@security-team"
```

### 3.2 Implement Image Signing

```yaml
# Add to docker-build-push.yml
- script: |
    # Sign image with Cosign
    cosign sign --key cosign.key \
      $(AZURE_CONTAINER_REGISTRY)/broxiva-api:$(IMAGE_TAG)
  displayName: 'Sign Container Image'
  env:
    COSIGN_KEY: $(COSIGN_PRIVATE_KEY)
```

### 3.3 Implement Canary Deployments

```yaml
# Canary deployment strategy
- stage: CanaryDeploy
  jobs:
  - deployment: Canary
    strategy:
      canary:
        increments: [10, 25, 50, 100]
        preDeploy:
          steps:
            - script: echo "Pre-deploy checks"
        deploy:
          steps:
            - script: |
                kubectl set image deployment/api \
                  api=$(IMAGE_TAG) \
                  --record
        postRouteTraffic:
          pool: server
          steps:
            - task: AzureMonitor@0
              displayName: 'Monitor Error Rate'
              inputs:
                threshold: 1  # Rollback if error rate > 1%
        on:
          failure:
            steps:
              - script: kubectl rollout undo deployment/api
```

---

## VERIFICATION CHECKLIST

### After Phase 1
- [ ] All credentials rotated and verified working
- [ ] .env removed from git history
- [ ] CORS restricted and tested
- [ ] Applications functioning normally

### After Phase 2
- [ ] CI/CD pipelines updated
- [ ] Production approval gates working
- [ ] No continueOnError in critical stages
- [ ] Network access restricted

### After Phase 3
- [ ] Secret scanning enabled
- [ ] Image signing implemented
- [ ] Canary deployments operational
- [ ] Runtime security monitoring active

---

## MONITORING COMMANDS

### Check for Exposed Secrets
```bash
# Search for potential secrets in codebase
grep -r "sk_live\|sk_test\|password\|secret\|api_key" --include="*.ts" --include="*.py" --include="*.env*" .
```

### Verify CORS Headers
```bash
# Test CORS response
curl -I -X OPTIONS https://api.broxiva.com/health \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET"
# Should NOT return Access-Control-Allow-Origin: *
```

### Check Image Tags
```bash
# List images with 'latest' tag
az acr repository show-tags --name broxivaacr --repository broxiva-api | grep latest
# Should return empty
```

---

## TEAM ASSIGNMENTS

| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| Secrets rotation | Security Team | 24 hours | [ ] |
| CORS fix | Backend Team | 48 hours | [ ] |
| Pipeline updates | DevOps | 1 week | [ ] |
| Network restrictions | Infrastructure | 1 week | [ ] |
| Secret scanning | Security Team | 2 weeks | [ ] |
| Image signing | DevOps | 2 weeks | [ ] |

---

## ROLLBACK PROCEDURES

If any remediation causes issues:

### CORS Rollback
```bash
# Temporarily allow all origins (emergency only)
ALLOWED_ORIGINS="*" kubectl rollout restart deployment/api
```

### Pipeline Rollback
```bash
# Revert pipeline changes
git revert HEAD
git push origin main
```

### Credential Rollback
```bash
# Restore previous secrets from Key Vault backup
az keyvault secret recover --vault-name broxiva-kv --name JWT-SECRET
```

---

**Document Owner:** Security Team
**Review Date:** Weekly until all items complete
**Escalation:** [Security Lead Email]

