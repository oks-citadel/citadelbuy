# CI/CD Migration Files Report
# Complete List of Files to be Modified

**Date**: 2025-12-13
**Migration**: CitadelBuy → Broxiva
**Total Files**: 19 workflow files
**Total Occurrences**: 213 references

---

## Files to be Modified (Sorted by Impact)

### 1. cd-prod.yml
**Occurrences**: 40
**Path**: `.github/workflows/cd-prod.yml`
**Impact**: HIGH - Production deployment workflow
**Changes**:
- AKS cluster name: `citadelbuy-prod-aks` → `broxiva-prod-aks`
- Resource group: `citadelbuy-prod-rg` → `broxiva-prod-rg`
- Namespace: `citadelbuy-production` → `broxiva-production`
- Container registry: `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`
- Image names: `citadelbuy-api`, `citadelbuy-web`, `citadelbuy-worker` → `broxiva-*`
- Service names in kubectl commands
- Deployment names
- URL: `https://citadelbuy.com` → `https://broxiva.com`

---

### 2. cd-staging.yml
**Occurrences**: 26
**Path**: `.github/workflows/cd-staging.yml`
**Impact**: HIGH - Staging deployment workflow
**Changes**:
- AKS cluster name: `citadelbuy-staging-aks` → `broxiva-staging-aks`
- Resource group: `citadelbuy-staging-rg` → `broxiva-staging-rg`
- Namespace: `citadelbuy-staging` → `broxiva-staging`
- Container images
- Service and deployment names

---

### 3. cd-dev.yml
**Occurrences**: 22
**Path**: `.github/workflows/cd-dev.yml`
**Impact**: HIGH - Development deployment workflow
**Changes**:
- AKS cluster name: `citadelbuy-dev-aks` → `broxiva-dev-aks`
- Resource group: `citadelbuy-dev-rg` → `broxiva-dev-rg`
- Namespace: `citadelbuy-development` → `broxiva-development`
- Container images
- Service and deployment names

---

### 4. terraform-deploy-production.yml
**Occurrences**: 19
**Path**: `.github/workflows/terraform-deploy-production.yml`
**Impact**: HIGH - Production infrastructure deployment
**Changes**:
- Terraform workspace names
- Resource naming
- State file references
- Environment variables

---

### 5. terraform-apply-prod.yml
**Occurrences**: 12
**Path**: `.github/workflows/terraform-apply-prod.yml`
**Impact**: HIGH - Production Terraform application
**Changes**:
- Terraform backend configuration
- Resource group references
- State file names

---

### 6. cost-optimization-shutdown.yml
**Occurrences**: 11
**Path**: `.github/workflows/cost-optimization-shutdown.yml`
**Impact**: MEDIUM - Cost management workflow
**Changes**:
- AKS cluster references
- Resource group names
- Namespace references

---

### 7. terraform-apply-staging.yml
**Occurrences**: 10
**Path**: `.github/workflows/terraform-apply-staging.yml`
**Impact**: MEDIUM - Staging Terraform application
**Changes**:
- Terraform backend configuration
- Resource references

---

### 8. drift-detection.yml
**Occurrences**: 10
**Path**: `.github/workflows/drift-detection.yml`
**Impact**: MEDIUM - Infrastructure drift detection
**Changes**:
- Resource group references
- AKS cluster names
- Terraform state references

---

### 9. secret-rotation.yml
**Occurrences**: 10
**Path**: `.github/workflows/secret-rotation.yml`
**Impact**: MEDIUM - Secret management workflow
**Changes**:
- Key vault references
- Resource group names
- Secret naming conventions

---

### 10. drift-repair.yml
**Occurrences**: 9
**Path**: `.github/workflows/drift-repair.yml`
**Impact**: MEDIUM - Infrastructure drift repair
**Changes**:
- Resource references
- Terraform state
- AKS cluster names

---

### 11. smoke-test.yml
**Occurrences**: 9
**Path**: `.github/workflows/smoke-test.yml`
**Impact**: MEDIUM - Testing workflow
**Changes**:
- Environment URLs
- Service endpoints
- Test target references

---

### 12. build-and-push-acr.yml
**Occurrences**: 8
**Path**: `.github/workflows/build-and-push-acr.yml`
**Impact**: MEDIUM - Container build and push
**Changes**:
- ACR registry: `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
- Image names
- Container tags

---

### 13. e2e-tests.yml
**Occurrences**: 6
**Path**: `.github/workflows/e2e-tests.yml`
**Impact**: LOW - End-to-end testing
**Changes**:
- Test environment URLs
- Service endpoints
- Application references

---

### 14. docker-build-and-push-acr.yml
**Occurrences**: 6
**Path**: `.github/workflows/docker-build-and-push-acr.yml`
**Impact**: LOW - Docker build workflow
**Changes**:
- ACR registry name
- Image naming
- Container tags

---

### 15. terraform-apply-dev.yml
**Occurrences**: 6
**Path**: `.github/workflows/terraform-apply-dev.yml`
**Impact**: LOW - Development Terraform
**Changes**:
- Terraform backend
- Resource references
- Environment naming

---

### 16. webhook-monitoring.yml
**Occurrences**: 3
**Path**: `.github/workflows/webhook-monitoring.yml`
**Impact**: LOW - Monitoring workflow
**Changes**:
- Service references
- Monitoring endpoints

---

### 17. terraform-plan.yml
**Occurrences**: 2
**Path**: `.github/workflows/terraform-plan.yml`
**Impact**: LOW - Terraform planning
**Changes**:
- Backend configuration
- Workspace references

---

### 18. terraform-drift-detection.yml
**Occurrences**: 2
**Path**: `.github/workflows/terraform-drift-detection.yml`
**Impact**: LOW - Drift detection
**Changes**:
- Resource references
- State configuration

---

### 19. docker-build.yml
**Occurrences**: 2
**Path**: `.github/workflows/docker-build.yml`
**Impact**: LOW - Docker build
**Changes**:
- Registry: `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
- Image description: `CitadelBuy` → `Broxiva`

---

## Summary Statistics

### By Impact Level:
- **HIGH Impact**: 5 files (119 occurrences)
- **MEDIUM Impact**: 7 files (74 occurrences)
- **LOW Impact**: 7 files (20 occurrences)

### By Workflow Type:
- **Deployment (CD)**: 3 files (88 occurrences)
- **Terraform**: 6 files (51 occurrences)
- **Docker/Container**: 3 files (16 occurrences)
- **Testing**: 2 files (15 occurrences)
- **Operations**: 5 files (43 occurrences)

### Replacement Patterns Applied:
1. `citadelbuy` → `broxiva` (lowercase, ~150 replacements)
2. `CitadelBuy` → `Broxiva` (title case, ~5 replacements)
3. `citadelplatforms` → `broxiva` (organization, ~58 replacements)

---

## Critical Resources Affected

### Azure Resources:
- **AKS Clusters**:
  - `citadelbuy-prod-aks` → `broxiva-prod-aks`
  - `citadelbuy-staging-aks` → `broxiva-staging-aks`
  - `citadelbuy-dev-aks` → `broxiva-dev-aks`

- **Resource Groups**:
  - `citadelbuy-prod-rg` → `broxiva-prod-rg`
  - `citadelbuy-staging-rg` → `broxiva-staging-rg`
  - `citadelbuy-dev-rg` → `broxiva-dev-rg`

- **Container Registry**:
  - `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`

- **Kubernetes Namespaces**:
  - `citadelbuy-production` → `broxiva-production`
  - `citadelbuy-staging` → `broxiva-staging`
  - `citadelbuy-development` → `broxiva-development`

### Container Images:
- `citadelbuy-api` → `broxiva-api`
- `citadelbuy-web` → `broxiva-web`
- `citadelbuy-worker` → `broxiva-worker`

### URLs and Domains:
- `https://citadelbuy.com` → `https://broxiva.com`

### GitHub Container Registry:
- `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`

### Terraform State:
- `citadelbuytfstate` → `broxivatfstate`

---

## Pre-Migration Verification

Before running the migration, verify these files exist:

```powershell
Test-Path ".github/workflows/cd-prod.yml"
Test-Path ".github/workflows/cd-staging.yml"
Test-Path ".github/workflows/cd-dev.yml"
Test-Path ".github/workflows/terraform-deploy-production.yml"
# ... etc
```

---

## Post-Migration Verification Commands

### Count References:
```powershell
# Should return 0
(Get-ChildItem .github/workflows/*.yml | Select-String "citadelbuy" -CaseSensitive).Count

# Should return ~213
(Get-ChildItem .github/workflows/*.yml | Select-String "broxiva" -CaseSensitive).Count
```

### List Modified Files:
```bash
git diff --name-only .github/workflows/
```

### Show Changes Summary:
```bash
git diff --stat .github/workflows/
```

---

## Risk Assessment

### Low Risk:
- Documentation references
- Test configuration
- Monitoring endpoints

### Medium Risk:
- Build and container workflows
- Development environment configs
- Non-critical infrastructure

### High Risk:
- Production deployment workflows
- Terraform state configuration
- Database migration references
- Production URLs and endpoints

**Recommendation**: Test in development environment first, then staging, before applying to production workflows.

---

## Backup Strategy

1. **Automatic Backup**: Created by migration scripts
   - Location: `workflows-backup-TIMESTAMP/`
   - Contains: All .yml files from `.github/workflows/`
   - Retention: Keep until migration verified

2. **Git Backup**: Version control
   - Current state preserved in git history
   - Can rollback with: `git checkout .github/workflows/`

3. **Manual Backup** (Optional):
   - Create: `Copy-Item .github\workflows\*.yml -Destination backup-manual\`

---

## Timeline Estimate

- **Script Execution**: < 1 minute
- **Verification**: 5-10 minutes
- **Testing**: 30-60 minutes
- **Rollback (if needed)**: < 5 minutes
- **Total**: ~1 hour (including thorough verification)

---

**Report Generated**: 2025-12-13
**Ready for Execution**: Yes
**Backup Required**: Yes (automatic)
**Approval Required**: Recommended for production changes
