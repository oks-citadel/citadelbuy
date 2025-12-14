# CitadelBuy to Broxiva CI/CD Migration - Execution Summary

## Current Status: READY FOR EXECUTION ⚠️

### Working Directory
```
C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization
```

## 📋 Migration Script Status

### ✅ Script Found and Verified
- **Location**: `migrate-cicd-to-broxiva.sh`
- **Type**: Bash shell script (UTF-8, executable)
- **Size**: 250 lines
- **Status**: Ready to execute
- **Supports**: --dry-run, --backup, --help flags

### 🔧 Alternative Scripts Created
1. **Python version**: `run_migration.py` (created)
2. **Windows batch wrapper**: `run-migration.bat` (created)
3. **PowerShell version**: Available at parent directory level

## 📊 Pre-Migration Analysis

### Files Requiring Changes
**19 workflow YAML files** contain citadelbuy/CitadelBuy references:

1. build-and-push-acr.yml (8 occurrences)
2. cd-dev.yml (22 occurrences)
3. cd-prod.yml (40 occurrences)
4. cd-staging.yml (26 occurrences)
5. cost-optimization-shutdown.yml (11 occurrences)
6. docker-build.yml (2 occurrences)
7. docker-build-and-push-acr.yml (6 occurrences)
8. drift-detection.yml (10 occurrences)
9. drift-repair.yml (9 occurrences)
10. e2e-tests.yml (6 occurrences)
11. secret-rotation.yml (10 occurrences)
12. smoke-test.yml (9 occurrences)
13. terraform-apply-dev.yml (6 occurrences)
14. terraform-apply-prod.yml (12 occurrences)
15. terraform-apply-staging.yml (10 occurrences)
16. terraform-deploy-production.yml (19 occurrences)
17. terraform-drift-detection.yml (2 occurrences)
18. terraform-plan.yml (2 occurrences)
19. webhook-monitoring.yml (3 occurrences)

### Reference Count Summary
- **citadelbuy/CitadelBuy**: ~364 occurrences
- **citadelplatforms**: ~5 occurrences
- **Total workflow files**: 28 (19 need changes, 9 already clean)

### Replacement Patterns
The migration script will perform these replacements:

| Current | New | Scope |
|---------|-----|-------|
| `citadelbuy` | `broxiva` | All lowercase references |
| `CitadelBuy` | `Broxiva` | Title case references |
| `citadelplatforms` | `broxiva` | Container registry org |
| `citadelbuyacr.azurecr.io` | `broxivaacr.azurecr.io` | Azure Container Registry |
| `citadelbuytfstate` | `broxivatfstate` | Terraform state storage |
| `citadelbuy.com` | `broxiva.com` | Domain references |
| `ghcr.io/citadelplatforms` | `ghcr.io/broxiva` | GitHub Container Registry |

## 🚀 Execution Instructions

### Step 1: Dry-Run (Preview Changes)
**This will show what would be changed WITHOUT making any modifications.**

Open Git Bash and run:
```bash
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization"
bash migrate-cicd-to-broxiva.sh --dry-run
```

**Expected Output:**
- Lists all files that would be modified
- Shows current occurrence counts
- No files are actually changed
- Preview of what replacements would occur

### Step 2: Execute Migration with Backup
**This will create a backup and perform the actual migration.**

If dry-run looks good, execute:
```bash
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization"
bash migrate-cicd-to-broxiva.sh --backup
```

**What Happens:**
1. Creates timestamped backup directory: `.github-workflows-backup-YYYYMMDD-HHMMSS`
2. Copies all current .yml files to backup
3. Performs all replacements across workflow files
4. Shows post-migration occurrence counts
5. Saves backup location to `.last-backup-location`

### Step 3: Verify Migration Success
Run these verification commands:

```bash
# Check for remaining citadelbuy references (should be 0)
grep -ri "citadelbuy" .github/workflows/*.yml | wc -l

# Check for citadelplatforms references (should be 0)
grep -ri "citadelplatforms" .github/workflows/*.yml | wc -l

# Check broxiva references exist (should be ~369)
grep -ri "broxiva" .github/workflows/*.yml | wc -l

# View git changes
git diff .github/workflows/

# Check specific critical files
git diff .github/workflows/cd-dev.yml
git diff .github/workflows/cd-prod.yml
git diff .github/workflows/build-and-push-acr.yml
```

### Step 4: Review Changes
**Before committing, manually review:**
- All deployment URLs are correct
- Azure resource names are updated consistently
- Container registry paths are accurate
- Kubernetes namespaces are correct
- No broken references or typos

## 📁 Changes by Category

### Infrastructure Components

#### Azure Kubernetes Service (AKS) Clusters
- `citadelbuy-dev-aks` → `broxiva-dev-aks`
- `citadelbuy-staging-aks` → `broxiva-staging-aks`
- `citadelbuy-prod-aks` → `broxiva-prod-aks`

#### Resource Groups
- `citadelbuy-dev-rg` → `broxiva-dev-rg`
- `citadelbuy-staging-rg` → `broxiva-staging-rg`
- `citadelbuy-prod-rg` → `broxiva-prod-rg`
- `citadelbuy-tfstate-rg` → `broxiva-tfstate-rg`

#### Kubernetes Namespaces
- `citadelbuy-dev` → `broxiva-dev`
- `citadelbuy-staging` → `broxiva-staging`
- `citadelbuy-production` → `broxiva-production`

#### Container Registries
- `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
- `ghcr.io/citadelplatforms/*` → `ghcr.io/broxiva/*`

#### Terraform State Storage
- `citadelbuytfstate` → `broxivatfstate`

#### Service Names
- `citadelbuy-api` → `broxiva-api`
- `citadelbuy-web` → `broxiva-web`
- `citadelbuy-worker` → `broxiva-worker`
- `citadelbuy-redis` → `broxiva-redis`

#### Deployment URLs
- `dev.citadelbuy.com` → `dev.broxiva.com`
- `staging.citadelbuy.com` → `staging.broxiva.com`
- `citadelbuy.com` → `broxiva.com`
- `api-dev.citadelbuy.com` → `api-dev.broxiva.com`
- `api-staging.citadelbuy.com` → `api-staging.broxiva.com`
- `api.citadelbuy.com` → `api.broxiva.com`

## 🔄 Rollback Procedure

If migration needs to be rolled back:

```bash
# Find backup location
BACKUP_DIR=$(cat .last-backup-location)

# Restore from backup
cp -r $BACKUP_DIR/*.yml .github/workflows/

# Verify restoration
git diff .github/workflows/
```

## 📝 Post-Migration Checklist

After successful migration:

- [ ] All workflow files updated (19 files)
- [ ] No citadelbuy references remain (verify with grep)
- [ ] No citadelplatforms references remain (verify with grep)
- [ ] Git diff reviewed and approved
- [ ] Workflow syntax validated (no YAML errors)
- [ ] Changes committed to git
- [ ] Feature branch created and pushed
- [ ] Pull request created for review
- [ ] Azure resources renamed (separate task)
- [ ] DNS and CDN updated (separate task)
- [ ] Environment secrets updated if needed

## ⚠️ Important Notes

### What This Migration DOES:
✅ Updates all CI/CD workflow file references
✅ Changes deployment target names in workflows
✅ Updates container registry paths in workflows
✅ Modifies Kubernetes resource references
✅ Updates domain URLs in health checks

### What This Migration DOES NOT Do:
❌ Does NOT rename actual Azure resources
❌ Does NOT update DNS records
❌ Does NOT modify Kubernetes deployments
❌ Does NOT change container images
❌ Does NOT update application code
❌ Does NOT modify Terraform state files

**After this migration, you will need to separately:**
1. Rename Azure resources (AKS, ACR, Resource Groups) via Azure Portal or Terraform
2. Update DNS records to point to broxiva.com
3. Update Kubernetes manifests if they exist outside workflows
4. Re-deploy applications with new naming

## 🎯 Quick Execution (Copy-Paste)

### Full Migration Sequence
```bash
# Navigate to directory
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization"

# Step 1: Preview (dry-run)
bash migrate-cicd-to-broxiva.sh --dry-run

# Step 2: Execute with backup (if dry-run looks good)
bash migrate-cicd-to-broxiva.sh --backup

# Step 3: Verify (should show 0)
grep -ri "citadelbuy" .github/workflows/*.yml | wc -l

# Step 4: Review changes
git diff .github/workflows/

# Step 5: Commit (if everything looks good)
git add .github/workflows/
git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva

- Updated all AKS cluster and resource group references
- Changed container registry from citadelbuyacr to broxivaacr
- Updated deployment URLs from citadelbuy.com to broxiva.com
- Migrated GitHub Container Registry org from citadelplatforms to broxiva
- Updated Kubernetes namespace references
- Modified Terraform state storage references

Total files updated: 19 workflow files
Total replacements: ~369 occurrences"
```

---

## 📞 Support

If you encounter issues during migration:
1. Check the backup directory created by --backup flag
2. Review migration script logs for errors
3. Verify bash is available: `bash --version`
4. Try Python alternative: `python3 run_migration.py --backup`
5. Use Windows batch wrapper: `run-migration.bat`

---

**Status**: All prerequisites verified. Migration script is ready to execute.
**Next Action**: Run the dry-run command above to preview changes.
