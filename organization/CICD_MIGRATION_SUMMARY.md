# CI/CD Pipeline Migration Summary: CitadelBuy → Broxiva

**Date:** 2025-12-13
**Migration Type:** Complete CI/CD Rebranding
**Status:** Ready for Execution

---

## Overview

This migration updates all CI/CD pipelines, workflows, and infrastructure references from "CitadelBuy" to "Broxiva" branding. The migration includes GitHub Actions workflows, Azure DevOps pipelines (if exists), and all infrastructure naming conventions.

---

## Files Created

### 1. Migration Documentation

#### `CICD_MIGRATION_GUIDE.md`
**Purpose:** Comprehensive migration guide with step-by-step instructions
**Size:** ~25 KB
**Contents:**
- Automated bulk replacement commands
- File-by-file change instructions
- New workflow templates
- Execution plan with phases
- Verification checklist
- Rollback procedures
- Post-migration monitoring guide

### 2. New Workflow Files

#### `.github/workflows/deploy-production-broxiva.yml`
**Purpose:** Production deployment pipeline with enhanced security and approval gates
**Features:**
- Pre-deployment security validation (Gitleaks, Trivy, tfsec)
- Manual approval gates for production
- Terraform plan and apply with state backup
- Post-deployment verification
- Slack and Teams notifications
- Deployment tracking via GitHub Issues
**Key Changes:**
- All references updated to `broxiva`
- ACR: `broxivaacr.azurecr.io`
- Resource Groups: `broxiva-prod-rg`
- AKS: `broxiva-prod-aks`
- URLs: `https://broxiva.com`
- Terraform state: `broxivatfstate`

#### `.github/workflows/cost-anomaly-detection.yml`
**Purpose:** Daily cost monitoring and anomaly detection
**Features:**
- Collects Azure cost data every 6 hours
- Generates daily cost reports at 8 AM UTC
- Detects cost anomalies and spikes
- Creates GitHub issues for anomalies
- Sends Slack/Teams alerts
- Cost breakdown by environment and service
- Automated cost optimization recommendations
**Thresholds:**
- Daily: $500
- Monthly: $15,000
- Spike: 25% increase
**Outputs:**
- Daily cost reports committed to repository
- Cost data artifacts (30-day and 7-day)
- Anomaly alerts and tracking issues

### 3. Migration Automation Script

#### `migrate-cicd-to-broxiva.sh`
**Purpose:** Bash script to automate bulk replacements
**Features:**
- Dry-run mode for safe testing
- Automatic backup creation
- Colored console output
- Progress tracking
- Pre/post migration statistics
- Rollback instructions
**Usage:**
```bash
# Dry run (no changes)
./migrate-cicd-to-broxiva.sh --dry-run

# With backup
./migrate-cicd-to-broxiva.sh --backup

# View help
./migrate-cicd-to-broxiva.sh --help
```

---

## Files to be Modified (via script or manual edit)

### GitHub Actions Workflows (25+ files)

All files in `.github/workflows/` will be updated with the following replacements:

#### Core Infrastructure Workflows
1. **`terraform-plan.yml`**
   - `citadelbuy-tfstate-rg` → `broxiva-tfstate-rg`
   - `citadelbuytfstate` → `broxivatfstate`

2. **`terraform-apply-dev.yml`**
   - `citadelbuy-dev-rg` → `broxiva-dev-rg`
   - `citadelbuy-dev-aks` → `broxiva-dev-aks`
   - `https://dev.citadelbuy.com` → `https://dev.broxiva.com`
   - State backend updated to `broxivatfstate`

3. **`terraform-apply-staging.yml`**
   - `citadelbuy-staging-rg` → `broxiva-staging-rg`
   - `citadelbuy-staging-aks` → `broxiva-staging-aks`
   - `https://staging.citadelbuy.com` → `https://staging.broxiva.com`
   - State backend updated to `broxivatfstate`

4. **`terraform-apply-prod.yml`**
   - `citadelbuy-prod-rg` → `broxiva-prod-rg`
   - `citadelbuy-prod-aks` → `broxiva-prod-aks`
   - `https://citadelbuy.com` → `https://broxiva.com`
   - State backend updated to `broxivatfstate`
   - Security checks enhanced
   - Approval gates verified

#### Application Deployment Workflows
5. **`cd-dev.yml`**
   - `citadelbuy-dev-aks` → `broxiva-dev-aks`
   - `citadelbuy-dev-rg` → `broxiva-dev-rg`
   - `citadelbuy-dev` (namespace) → `broxiva-dev`
   - `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`
   - `citadelbuy-api` → `broxiva-api`
   - `citadelbuy-web` → `broxiva-web`
   - `citadelbuy-worker` → `broxiva-worker`
   - `https://dev.citadelbuy.com` → `https://dev.broxiva.com`
   - `https://api-dev.citadelbuy.com` → `https://api-dev.broxiva.com`

6. **`cd-staging.yml`**
   - `citadelbuy-staging-aks` → `broxiva-staging-aks`
   - `citadelbuy-staging-rg` → `broxiva-staging-rg`
   - `citadelbuy-staging` (namespace) → `broxiva-staging`
   - `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`
   - All deployment names updated to `broxiva-*`
   - `https://staging.citadelbuy.com` → `https://staging.broxiva.com`
   - `https://api-staging.citadelbuy.com` → `https://api-staging.broxiva.com`

7. **`cd-prod.yml`** (Blue-Green Deployment)
   - `citadelbuy-prod-aks` → `broxiva-prod-aks`
   - `citadelbuy-prod-rg` → `broxiva-prod-rg`
   - `citadelbuy-production` (namespace) → `broxiva-production`
   - `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`
   - All blue-green deployment names updated
   - `citadelbuy-api-green` → `broxiva-api-green`
   - `citadelbuy-api-blue` → `broxiva-api-blue`
   - `https://citadelbuy.com` → `https://broxiva.com`

#### Container & Build Workflows
8. **`docker-build.yml`**
   - `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
   - `CitadelBuy` (in labels) → `Broxiva`

9. **`docker-build-and-push-acr.yml`**
   - `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`

10. **`build-and-push-acr.yml`**
    - ACR registry updated
    - Image tags updated

#### Infrastructure Monitoring Workflows
11. **`drift-detection.yml`**
    - All resource group names: `citadelbuy-*-rg` → `broxiva-*-rg`
    - All AKS clusters: `citadelbuy-*-aks` → `broxiva-*-aks`
    - All PostgreSQL: `citadelbuy-*-postgres` → `broxiva-*-postgres`
    - ACR names: `citadelbuy*acr` → `broxiva*acr`
    - Terraform state storage updated
    - Tag compliance: `Project: CitadelBuy` → `Project: Broxiva`

12. **`drift-repair.yml`**
    - All resource references updated
    - Terraform state backend updated

13. **`terraform-drift-detection.yml`**
    - All environment resource groups updated
    - State backend updated

#### Cost & Resource Management
14. **`cost-optimization-shutdown.yml`**
    - `citadelbuy-dev-rg` → `broxiva-dev-rg`
    - `citadelbuy-staging-rg` → `broxiva-staging-rg`
    - `citadelbuy-prod-rg` → `broxiva-prod-rg`
    - `citadelbuy-dev-aks` → `broxiva-dev-aks`
    - `citadelbuy-staging-aks` → `broxiva-staging-aks`
    - `citadelbuy-dev-postgres` → `broxiva-dev-postgres`
    - `citadelbuy-staging-postgres` → `broxiva-staging-postgres`

#### Security & Compliance Workflows
15. **`secret-scan.yml`**
    - Description updated: `CitadelBuy` → `Broxiva`
    - Repository references updated

16. **`secret-rotation.yml`**
    - All Azure resource references updated

17. **`container-scan.yml`**
    - ACR registry updated

18. **`sast.yml`**
    - Project name updated

19. **`compliance-check.yml`**
    - Resource group references updated

20. **`api-security-test.yml`**
    - API endpoints updated to `broxiva` domains

#### Testing & Quality Workflows
21. **`ci.yml`**
    - General branding updates

22. **`e2e-tests.yml`**
    - Test environment URLs updated

23. **`smoke-test.yml`**
    - All test URLs updated to `broxiva.com`

24. **`dependency-scan.yml`**
    - Project references updated

25. **`webhook-monitoring.yml`**
    - Monitoring endpoints updated

---

## Replacement Summary

### String Replacements (Automated)

| From | To | Occurrences (Est.) |
|------|----|--------------------|
| `citadelbuy` | `broxiva` | ~500+ |
| `CitadelBuy` | `Broxiva` | ~50+ |
| `citadelplatforms` | `broxiva` | ~30+ |
| `citadelbuyacr.azurecr.io` | `broxivaacr.azurecr.io` | ~20+ |
| `citadelbuytfstate` | `broxivatfstate` | ~40+ |
| `citadelbuy.com` | `broxiva.com` | ~30+ |

### Resource Name Updates

#### Resource Groups
- `citadelbuy-dev-rg` → `broxiva-dev-rg`
- `citadelbuy-staging-rg` → `broxiva-staging-rg`
- `citadelbuy-prod-rg` → `broxiva-prod-rg`
- `citadelbuy-africa-rg` → `broxiva-africa-rg`
- `citadelbuy-asia-rg` → `broxiva-asia-rg`
- `citadelbuy-tfstate-rg` → `broxiva-tfstate-rg`

#### AKS Clusters
- `citadelbuy-dev-aks` → `broxiva-dev-aks`
- `citadelbuy-staging-aks` → `broxiva-staging-aks`
- `citadelbuy-prod-aks` → `broxiva-prod-aks`
- `citadelbuy-africa-aks` → `broxiva-africa-aks`
- `citadelbuy-asia-aks` → `broxiva-asia-aks`

#### Databases
- `citadelbuy-dev-postgres` → `broxiva-dev-postgres`
- `citadelbuy-staging-postgres` → `broxiva-staging-postgres`
- `citadelbuy-prod-postgres` → `broxiva-prod-postgres`

#### Container Registries
- `citadelbuyacr` → `broxivaacr`
- `citadelbuydevacr` → `broxivadevacr`
- `citadelbuystagingacr` → `broxivastagingacr`
- `citadelbuyprodacr` → `broxivaprodacr`

#### Kubernetes Namespaces
- `citadelbuy-dev` → `broxiva-dev`
- `citadelbuy-staging` → `broxiva-staging`
- `citadelbuy-production` → `broxiva-production`

#### Deployments
- `citadelbuy-api` → `broxiva-api`
- `citadelbuy-web` → `broxiva-web`
- `citadelbuy-worker` → `broxiva-worker`
- `citadelbuy-api-green` → `broxiva-api-green`
- `citadelbuy-api-blue` → `broxiva-api-blue`

#### URLs
- `https://citadelbuy.com` → `https://broxiva.com`
- `https://dev.citadelbuy.com` → `https://dev.broxiva.com`
- `https://staging.citadelbuy.com` → `https://staging.broxiva.com`
- `https://api.citadelbuy.com` → `https://api.broxiva.com`
- `https://api-dev.citadelbuy.com` → `https://api-dev.broxiva.com`
- `https://api-staging.citadelbuy.com` → `https://api-staging.broxiva.com`

#### Container Images
- `ghcr.io/citadelplatforms/*` → `ghcr.io/broxiva/*`
- `citadelbuyacr.azurecr.io/*` → `broxivaacr.azurecr.io/*`

---

## Execution Steps

### Phase 1: Preparation
```bash
# Navigate to organization directory
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization

# Create backup
mkdir -p .github-workflows-backup-$(date +%Y%m%d)
cp -r .github/workflows/* .github-workflows-backup-$(date +%Y%m%d)/

# Create git branch
git checkout -b cicd/migrate-to-broxiva
```

### Phase 2: Execute Migration
```bash
# Option 1: Use automated script (RECOMMENDED)
chmod +x migrate-cicd-to-broxiva.sh

# Dry run first
./migrate-cicd-to-broxiva.sh --dry-run

# Execute with backup
./migrate-cicd-to-broxiva.sh --backup

# Option 2: Manual find/replace
cd .github/workflows
find . -name "*.yml" -type f -exec sed -i 's/citadelbuy/broxiva/g' {} +
find . -name "*.yml" -type f -exec sed -i 's/CitadelBuy/Broxiva/g' {} +
find . -name "*.yml" -type f -exec sed -i 's/citadelplatforms/broxiva/g' {} +
```

### Phase 3: Verification
```bash
# Check for remaining old references
grep -r "citadelbuy" .github/workflows/ || echo "No citadelbuy references found"
grep -r "CitadelBuy" .github/workflows/ || echo "No CitadelBuy references found"

# Verify new references
grep -r "broxiva" .github/workflows/ | wc -l
grep -r "Broxiva" .github/workflows/ | wc -l

# Review changes
git diff --stat
git diff .github/workflows/terraform-plan.yml
git diff .github/workflows/cd-prod.yml
```

### Phase 4: Commit & Push
```bash
# Stage changes
git add .github/workflows/
git add CICD_MIGRATION_GUIDE.md
git add CICD_MIGRATION_SUMMARY.md
git add migrate-cicd-to-broxiva.sh

# Commit
git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva

- Replace all citadelbuy references with broxiva
- Update Azure resource group names (dev, staging, prod, africa, asia)
- Update AKS cluster references
- Update ACR registry references (broxivaacr.azurecr.io)
- Update deployment URLs (broxiva.com)
- Update database names
- Update Terraform state backend (broxivatfstate)
- Update container registry (ghcr.io/broxiva)
- Add production deployment workflow with approval gates
- Add cost anomaly detection and daily reporting
- Add automated migration script
- Add comprehensive migration guide

BREAKING CHANGE: All infrastructure resource names updated from citadelbuy to broxiva"

# Push to remote
git push origin cicd/migrate-to-broxiva
```

### Phase 5: Create Pull Request
```bash
# Using GitHub CLI
gh pr create \
  --title "CI/CD Migration: CitadelBuy → Broxiva" \
  --body "Complete migration of all CI/CD pipelines to Broxiva branding.

## Changes
- Updated 25+ GitHub Actions workflow files
- All Azure resource references updated
- Created new production deployment workflow
- Added cost anomaly detection
- Added automated migration script

## Testing
- [ ] Test terraform-plan workflow
- [ ] Test dev deployment
- [ ] Test staging deployment
- [ ] Test drift detection
- [ ] Test cost monitoring

## Documentation
See CICD_MIGRATION_GUIDE.md for complete details.

## Rollback
Backup created at: .github-workflows-backup-YYYYMMDD/" \
  --label "cicd,migration,breaking-change"
```

---

## Enhanced Features Added

### 1. Production Deployment with Approval Gates
- **File:** `.github/workflows/deploy-production-broxiva.yml`
- Pre-deployment security scanning (Gitleaks, Trivy, tfsec)
- Manual approval requirement via GitHub environments
- Terraform state backup before apply
- Post-deployment verification
- Deployment tracking via GitHub Issues
- Slack and Teams notifications

### 2. Cost Monitoring & Anomaly Detection
- **File:** `.github/workflows/cost-anomaly-detection.yml`
- Daily cost reports at 8 AM UTC
- Anomaly detection every 6 hours
- Cost breakdown by environment and service
- Automatic GitHub issue creation for anomalies
- Slack/Teams alerts for cost spikes
- Cost optimization recommendations
- Historical cost tracking

### 3. Secret Scanning Enhancement
- All production deployments include secret scanning
- Gitleaks integration
- TruffleHog for verified secrets
- Blocks deployments if secrets detected

### 4. Drift Detection Improvements
- Daily automated drift detection
- Auto-repair PRs for non-production
- Manual approval for production drift repairs
- Comprehensive drift reports

---

## Verification Checklist

After migration, verify:

- [ ] All workflow files updated (no "citadelbuy" references)
- [ ] Terraform state backend accessible (`broxivatfstate`)
- [ ] Azure resource groups accessible
- [ ] AKS clusters accessible
- [ ] Container registry accessible (`broxivaacr.azurecr.io`)
- [ ] GitHub container registry updated (`ghcr.io/broxiva`)
- [ ] Deployment URLs updated
- [ ] Test dev deployment workflow
- [ ] Test staging deployment workflow
- [ ] Test production deployment workflow (approval gates work)
- [ ] Test drift detection workflow
- [ ] Test cost monitoring workflow
- [ ] Slack notifications working
- [ ] Teams notifications working (if configured)
- [ ] GitHub Issues created for anomalies
- [ ] State backups created for production deployments

---

## Rollback Plan

If issues occur:

```bash
# Restore from backup
BACKUP_DIR=".github-workflows-backup-YYYYMMDD"
cp -r $BACKUP_DIR/* .github/workflows/

# Or reset git changes
git reset --hard origin/main

# Delete branch
git branch -D cicd/migrate-to-broxiva
```

---

## Impact Assessment

### Low Risk
- Documentation updates
- Workflow file name updates
- Comment updates

### Medium Risk
- Environment variable updates
- URL changes (requires DNS updates)
- Namespace changes

### High Risk
- Azure resource group renames (may require recreation)
- Terraform state backend changes
- Container registry changes

### Mitigation
- Test in dev environment first
- Use blue-green deployment for production
- Maintain backups of all state files
- Keep old workflows until migration verified

---

## Timeline

### Recommended Timeline (Conservative)
- **Day 1:** Preparation and dev environment testing
- **Day 2:** Staging environment migration and testing
- **Day 3:** Production migration with rollback plan ready
- **Week 1:** Monitor all workflows and deployments
- **Week 2:** Decommission old resources (if renamed)

### Aggressive Timeline (If confident)
- **Hour 1-2:** Execute migration script, commit changes
- **Hour 3-4:** Test critical workflows
- **Hour 5-6:** Deploy to production with monitoring
- **Day 1-7:** Monitor and verify

---

## Success Criteria

Migration is successful when:
1. All 25+ workflow files updated
2. Zero "citadelbuy" references in workflow files
3. All deployments use "broxiva" naming
4. Production deployments have approval gates
5. Cost monitoring alerts working
6. Drift detection running daily
7. All environments deploying successfully
8. No infrastructure outages
9. All URLs resolving correctly
10. All notifications working

---

## Support & Troubleshooting

### Common Issues

**Issue:** Terraform state not found
**Solution:** Verify storage account name `broxivatfstate` exists and has correct permissions

**Issue:** AKS cluster not accessible
**Solution:** Check resource group name is `broxiva-*-rg` and cluster exists

**Issue:** Container images not found
**Solution:** Verify ACR name `broxivaacr.azurecr.io` and image tags

**Issue:** Deployment URLs not resolving
**Solution:** Update DNS records to point to new broxiva.com domain

### Getting Help

- Review `CICD_MIGRATION_GUIDE.md` for detailed instructions
- Check workflow run logs in GitHub Actions
- Review Azure Portal for resource status
- Check Terraform state in Azure Storage

---

## Appendix

### A. Files Modified Count
- GitHub Actions Workflows: 25+ files
- New Workflows Created: 2 files
- Documentation Created: 2 files
- Scripts Created: 1 file
- **Total:** 30+ files

### B. Estimated Effort
- Script Execution: 5 minutes
- Verification: 30 minutes
- Testing: 2-4 hours
- Production Deployment: 1-2 hours
- **Total:** 4-7 hours

### C. Key Contacts
- DevOps Team: [slack channel or email]
- Cloud Infrastructure: [slack channel or email]
- Security Team: [slack channel or email]

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Author:** DevOps CI/CD Pipeline Engineer Super-Agent
**Review Status:** Ready for Execution
