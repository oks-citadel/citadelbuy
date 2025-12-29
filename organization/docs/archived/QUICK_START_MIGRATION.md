# Quick Start: CI/CD Migration to Broxiva

**Time Required:** 15-30 minutes for automated migration
**Recommended For:** DevOps engineers familiar with the codebase

---

## TL;DR - Execute Migration Now

```bash
# Navigate to organization directory
cd /c/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization

# Make script executable
chmod +x migrate-cicd-to-broxiva.sh

# Run migration with backup
./migrate-cicd-to-broxiva.sh --backup

# Review changes
git diff --stat .github/workflows/

# Commit and push
git checkout -b cicd/migrate-to-broxiva
git add .
git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva"
git push origin cicd/migrate-to-broxiva

# Create PR
gh pr create --title "CI/CD Migration: CitadelBuy → Broxiva" --label "cicd,migration"
```

---

## Pre-Migration Checklist (2 minutes)

- [ ] Git working directory is clean (`git status`)
- [ ] On correct branch (create new: `git checkout -b cicd/migrate-to-broxiva`)
- [ ] Have permissions to push to repository
- [ ] Have reviewed `CICD_MIGRATION_SUMMARY.md` (optional but recommended)

---

## Migration Steps (10 minutes)

### Step 1: Run Dry Run (Optional)
```bash
./migrate-cicd-to-broxiva.sh --dry-run
```
This shows what will change without modifying files.

### Step 2: Execute Migration
```bash
./migrate-cicd-to-broxiva.sh --backup
```
This creates a backup and performs all replacements.

### Step 3: Verify Changes
```bash
# Check what was changed
git diff --stat

# Verify key files
git diff .github/workflows/terraform-plan.yml
git diff .github/workflows/cd-prod.yml
git diff .github/workflows/deploy-production-broxiva.yml

# Check for missed references
grep -r "citadelbuy" .github/workflows/ || echo "✓ No old references found"
```

### Step 4: Commit Changes
```bash
git add .
git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva

- Replace all citadelbuy references with broxiva
- Update Azure resource group names
- Update AKS cluster references
- Update ACR registry references
- Update deployment URLs
- Add production deployment workflow with approval gates
- Add cost anomaly detection workflow

BREAKING CHANGE: All infrastructure resource names updated"
```

### Step 5: Push and Create PR
```bash
git push origin cicd/migrate-to-broxiva

# If you have GitHub CLI
gh pr create \
  --title "CI/CD Migration: CitadelBuy → Broxiva" \
  --body "See CICD_MIGRATION_SUMMARY.md for details" \
  --label "cicd,migration,breaking-change"
```

---

## Post-Migration Verification (5-10 minutes)

### Quick Tests
```bash
# Test workflow syntax
cd .github/workflows
for file in *.yml; do
  echo "Checking $file..."
  # GitHub Actions workflow validator (if available)
  # actionlint $file
done

# Or use GitHub CLI
gh workflow list
```

### Key Workflows to Test (in order)
1. **Secret Scan** - Non-destructive, safe to test first
   ```bash
   gh workflow run secret-scan.yml
   ```

2. **Terraform Plan (Dev)** - Read-only, shows what would change
   ```bash
   gh workflow run terraform-plan.yml
   ```

3. **Drift Detection** - Monitors infrastructure, safe to run
   ```bash
   gh workflow run drift-detection.yml
   ```

4. **Cost Monitoring** - Just collects data, safe
   ```bash
   gh workflow run cost-anomaly-detection.yml
   ```

---

## What Changed?

### Summary of Key Changes

| Type | Old | New | Count |
|------|-----|-----|-------|
| Resource Groups | `citadelbuy-*-rg` | `broxiva-*-rg` | ~10 |
| AKS Clusters | `citadelbuy-*-aks` | `broxiva-*-aks` | ~5 |
| Databases | `citadelbuy-*-postgres` | `broxiva-*-postgres` | ~3 |
| ACR | `citadelbuyacr.azurecr.io` | `broxivaacr.azurecr.io` | ~20 |
| URLs | `*.citadelbuy.com` | `*.broxiva.com` | ~30 |
| Container Images | `ghcr.io/citadelplatforms` | `ghcr.io/broxiva` | ~30 |
| Terraform State | `citadelbuytfstate` | `broxivatfstate` | ~40 |

### Files Modified
- **Existing Workflows:** 25+ files
- **New Workflows:** 2 files
- **Documentation:** 3 files
- **Scripts:** 1 file

---

## New Features Added

### 1. Production Deployment Workflow
**File:** `.github/workflows/deploy-production-broxiva.yml`

Features:
- ✅ Pre-deployment security scanning
- ✅ Manual approval gates
- ✅ Terraform state backup
- ✅ Post-deployment verification
- ✅ Slack/Teams notifications

### 2. Cost Anomaly Detection
**File:** `.github/workflows/cost-anomaly-detection.yml`

Features:
- ✅ Daily cost reports (8 AM UTC)
- ✅ Anomaly detection (every 6 hours)
- ✅ GitHub issue creation for alerts
- ✅ Cost breakdown by environment
- ✅ Optimization recommendations

---

## Rollback (if needed)

### Quick Rollback
```bash
# Option 1: Use backup created by script
BACKUP_DIR=".github-workflows-backup-YYYYMMDD-HHMMSS"
cp -r $BACKUP_DIR/* .github/workflows/

# Option 2: Git reset
git reset --hard HEAD~1

# Option 3: Restore from remote
git fetch origin main
git reset --hard origin/main
```

### Location of Backup
The script saves backup location in `.last-backup-location`:
```bash
cat .last-backup-location
```

---

## Troubleshooting

### Issue: Script won't execute
```bash
# Make it executable
chmod +x migrate-cicd-to-broxiva.sh

# Check file exists
ls -la migrate-cicd-to-broxiva.sh
```

### Issue: Git diff shows too many changes
```bash
# View just the summary
git diff --stat

# View specific file
git diff .github/workflows/terraform-plan.yml

# View just file names
git diff --name-only
```

### Issue: Want to see what will change before running
```bash
# Use dry-run mode
./migrate-cicd-to-broxiva.sh --dry-run
```

### Issue: Accidentally ran without backup
```bash
# Git history is your backup
git log --oneline -5

# Restore previous version
git checkout HEAD~1 .github/workflows/
```

---

## Next Steps After Migration

### Immediate (Day 1)
1. ✅ Merge PR after review
2. ✅ Test dev deployment
3. ✅ Monitor workflow runs
4. ✅ Verify notifications working

### Short-term (Week 1)
1. ✅ Test staging deployment
2. ✅ Verify drift detection
3. ✅ Review cost reports
4. ✅ Train team on new workflows

### Long-term (Month 1)
1. ✅ Deploy to production with new workflow
2. ✅ Decommission old CitadelBuy resources
3. ✅ Update DNS if needed
4. ✅ Archive old backups

---

## Need More Details?

- **Comprehensive Guide:** `CICD_MIGRATION_GUIDE.md`
- **Complete Summary:** `CICD_MIGRATION_SUMMARY.md`
- **Script Help:** `./migrate-cicd-to-broxiva.sh --help`

---

## Support

If you encounter issues:
1. Check the comprehensive guide (`CICD_MIGRATION_GUIDE.md`)
2. Review workflow logs in GitHub Actions
3. Check Azure Portal for resource status
4. Contact DevOps team via Slack
5. Create GitHub issue with `migration` label

---

## Success Indicators

You'll know the migration was successful when:
- ✅ No `citadelbuy` references in workflow files
- ✅ All workflows show green in GitHub Actions
- ✅ Deployments work to dev environment
- ✅ Cost monitoring creates reports
- ✅ Drift detection runs without errors
- ✅ Notifications arrive in Slack/Teams

---

**Estimated Time Commitment:**
- **Automated Migration:** 5 minutes
- **Verification:** 10 minutes
- **Testing:** 15-30 minutes
- **Total:** 30-45 minutes

**Recommended Approach:**
Run during low-traffic period with team available for support.

---

**Last Updated:** 2025-12-13
**Version:** 1.0
**Status:** Production Ready
