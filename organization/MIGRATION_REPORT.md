# CitadelBuy to Broxiva Migration Report
## Working Directory: C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization

## Migration Status: READY TO EXECUTE

### 1. Migration Script Found
- **Location**: `C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization\migrate-cicd-to-broxiva.sh`
- **Type**: Bash script
- **Status**: Verified and ready to execute

### 2. Pre-Migration Analysis

#### Files to be Modified (28 workflow files):
1. api-security-test.yml
2. build-and-push-acr.yml
3. cd-dev.yml
4. cd-prod.yml
5. cd-staging.yml
6. ci.yml
7. compliance-check.yml
8. container-scan.yml
9. cost-anomaly-detection.yml
10. cost-optimization-shutdown.yml
11. dependency-scan.yml
12. deploy-production-broxiva.yml
13. docker-build-and-push-acr.yml
14. docker-build.yml
15. drift-detection.yml
16. drift-repair.yml
17. e2e-tests.yml
18. sast.yml
19. secret-rotation.yml
20. secret-scan.yml
21. smoke-test.yml
22. terraform-apply-dev.yml
23. terraform-apply-prod.yml
24. terraform-apply-staging.yml
25. terraform-deploy-production.yml
26. terraform-drift-detection.yml
27. terraform-plan.yml
28. webhook-monitoring.yml

#### Current References Found:
- **citadelbuy** (case-insensitive): 364 occurrences across 25 files
- **citadelplatforms**: 5 occurrences across 5 files

#### Replacement Patterns (from migration script):
1. `citadelbuy` → `broxiva`
2. `CitadelBuy` → `Broxiva`
3. `citadelplatforms` → `broxiva`
4. `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
5. `citadelbuytfstate` → `broxivatfstate`
6. `citadelbuy.com` → `broxiva.com`
7. `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`

### 3. Execution Instructions

#### Option A: Using Bash Script (RECOMMENDED)
```bash
# Step 1: Navigate to the organization directory
cd "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization"

# Step 2: Run dry-run to preview changes
bash migrate-cicd-to-broxiva.sh --dry-run

# Step 3: If dry-run looks good, run with backup
bash migrate-cicd-to-broxiva.sh --backup

# Step 4: Verify the changes
bash migrate-cicd-to-broxiva.sh --dry-run  # Should show 0 occurrences
```

#### Option B: Using PowerShell (Alternative)
Created PowerShell script at: `C:\Users\Dell\OneDrive\Documents\Citadelbuy\rebrand_workflows.ps1`
(Note: This script targets a different directory, would need path adjustment)

#### Option C: Using Python Script (Alternative)
Created Python script at: `C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization\run_migration.py`

```bash
# Navigate to organization directory
cd "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization"

# Run dry-run
python3 run_migration.py --dry-run

# Run actual migration with backup
python3 run_migration.py --backup
```

#### Option D: Using Windows Batch File
Created batch wrapper at: `C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization\run-migration.bat`

Simply double-click the file or run:
```cmd
cd "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization"
run-migration.bat
```

### 4. Post-Migration Verification Steps

After running the migration, verify:

1. **Check for remaining citadelbuy references**:
   ```bash
   grep -ri "citadelbuy" .github/workflows/*.yml
   ```
   Expected result: No matches (or only in comments/documentation)

2. **Check for citadelplatforms references**:
   ```bash
   grep -ri "citadelplatforms" .github/workflows/*.yml
   ```
   Expected result: No matches

3. **Verify broxiva references exist**:
   ```bash
   grep -ri "broxiva" .github/workflows/*.yml | wc -l
   ```
   Expected result: ~369 matches (sum of original citadelbuy + citadelplatforms)

4. **Review git diff**:
   ```bash
   git diff .github/workflows/
   ```

5. **Check specific critical files**:
   - cd-dev.yml
   - cd-staging.yml
   - cd-prod.yml
   - build-and-push-acr.yml
   - terraform-deploy-production.yml

### 5. Files Changed Summary

Once migration is complete, these categories of changes will occur:

#### A. AKS Cluster Names:
- `citadelbuy-dev-aks` → `broxiva-dev-aks`
- `citadelbuy-staging-aks` → `broxiva-staging-aks`
- `citadelbuy-prod-aks` → `broxiva-prod-aks`

#### B. Resource Groups:
- `citadelbuy-dev-rg` → `broxiva-dev-rg`
- `citadelbuy-staging-rg` → `broxiva-staging-rg`
- `citadelbuy-prod-rg` → `broxiva-prod-rg`

#### C. Kubernetes Namespaces:
- `citadelbuy-dev` → `broxiva-dev`
- `citadelbuy-staging` → `broxiva-staging`
- `citadelbuy-production` → `broxiva-production`

#### D. Container Registries:
- `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
- `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`

#### E. Deployment URLs:
- `dev.citadelbuy.com` → `dev.broxiva.com`
- `staging.citadelbuy.com` → `staging.broxiva.com`
- `citadelbuy.com` → `broxiva.com`
- `api-dev.citadelbuy.com` → `api-dev.broxiva.com`

#### F. Terraform State:
- `citadelbuytfstate` → `broxivatfstate`

#### G. Service Names:
- `citadelbuy-api` → `broxiva-api`
- `citadelbuy-web` → `broxiva-web`
- `citadelbuy-worker` → `broxiva-worker`

### 6. Backup Information

The migration script will create a backup directory:
- Format: `.github-workflows-backup-YYYYMMDD-HHMMSS`
- Location: Saved in `.last-backup-location` file
- Rollback command: `cp -r <backup-dir>/* .github/workflows/`

### 7. Important Notes

1. **Dry-run first**: Always run with `--dry-run` flag first to preview changes
2. **Create backup**: Use `--backup` flag for actual migration to create automatic backup
3. **Review changes**: Use `git diff` to review all changes before committing
4. **Test workflows**: Ensure workflow syntax is valid before pushing
5. **Azure Resources**: This script only updates workflow files. Azure resources (AKS, ACR, etc.) must be renamed separately through Azure Portal or Terraform

### 8. Next Steps After Migration

1. Review all changes with git diff
2. Commit changes:
   ```bash
   git add .github/workflows/
   git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva"
   ```
3. Create feature branch and push:
   ```bash
   git checkout -b cicd/migrate-to-broxiva
   git push origin cicd/migrate-to-broxiva
   ```
4. Create pull request for review
5. Update Azure resources to match new naming convention
6. Update any external references (DNS, CDN, etc.)

---

## Execution Command (Copy-Paste Ready)

### For Dry-Run (Preview):
```bash
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization" && bash migrate-cicd-to-broxiva.sh --dry-run
```

### For Actual Migration with Backup:
```bash
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization" && bash migrate-cicd-to-broxiva.sh --backup
```

### For Verification After Migration:
```bash
cd "/c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization" && grep -ri "citadelbuy" .github/workflows/*.yml | wc -l
```

Expected result after migration: 0

---

**Migration Script Ready**: All prerequisites met. Execute the commands above to proceed with the rebrand migration.
