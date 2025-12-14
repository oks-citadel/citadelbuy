# CI/CD Migration Execution Instructions
# CitadelBuy → Broxiva

## Overview
This document provides step-by-step instructions to execute the CI/CD pipeline migration from CitadelBuy to Broxiva branding.

## Migration Status
- **Total Files to Migrate**: 19 workflow files
- **Total Occurrences**: 213 references to citadelbuy/CitadelBuy
- **Backup**: Automatic backup will be created before migration

## Files Requiring Migration

### High Priority (Most References):
1. `cd-prod.yml` - 40 occurrences
2. `cd-staging.yml` - 26 occurrences
3. `cd-dev.yml` - 22 occurrences
4. `terraform-deploy-production.yml` - 19 occurrences
5. `terraform-apply-prod.yml` - 12 occurrences
6. `cost-optimization-shutdown.yml` - 11 occurrences

### Medium Priority:
7. `terraform-apply-staging.yml` - 10 occurrences
8. `drift-detection.yml` - 10 occurrences
9. `secret-rotation.yml` - 10 occurrences
10. `drift-repair.yml` - 9 occurrences
11. `smoke-test.yml` - 9 occurrences

### Lower Priority:
12. `build-and-push-acr.yml` - 8 occurrences
13. `e2e-tests.yml` - 6 occurrences
14. `docker-build-and-push-acr.yml` - 6 occurrences
15. `terraform-apply-dev.yml` - 6 occurrences
16. `webhook-monitoring.yml` - 3 occurrences
17. `terraform-plan.yml` - 2 occurrences
18. `terraform-drift-detection.yml` - 2 occurrences
19. `docker-build.yml` - 2 occurrences

## Execution Options

### ⭐ RECOMMENDED: Option 1 - PowerShell Script (Windows)

This is the most reliable option for Windows environments.

```powershell
# Navigate to the organization directory
cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization

# Run the PowerShell migration script
powershell -ExecutionPolicy Bypass -File .\Migrate-CICD.ps1
```

**Features:**
- ✅ Automatic backup creation
- ✅ Detailed progress reporting
- ✅ Verification of changes
- ✅ Rollback instructions
- ✅ Summary of all modified files

---

### Option 2 - Batch Script (Windows)

Alternative for Windows if PowerShell has restrictions.

```cmd
cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization
migrate_manual.bat
```

---

### Option 3 - Python Script

Cross-platform option using Python.

```bash
cd C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization
python manual_migration.py
```

---

### Option 4 - Original Scripts

If bash/python environment is properly configured:

```bash
# Bash script
cd organization
bash migrate-cicd-to-broxiva.sh --backup

# OR Python script
python run_migration.py --backup
```

---

### Option 5 - Manual PowerShell One-Liner

For quick execution without a script file:

```powershell
cd "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization\.github\workflows"

# Create backup
$backup = "..\..\workflows-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
mkdir $backup
copy *.yml $backup

# Perform migration
Get-ChildItem -Filter "*.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'citadelbuy', 'broxiva'
    $content = $content -replace 'CitadelBuy', 'Broxiva'
    $content = $content -replace 'citadelplatforms', 'broxiva'
    Set-Content -Path $_.FullName -Value $content -NoNewline
    Write-Host "Modified: $($_.Name)" -ForegroundColor Green
}
```

---

## Replacement Patterns

The migration will perform these replacements:

1. `citadelbuy` → `broxiva` (lowercase)
2. `CitadelBuy` → `Broxiva` (title case)
3. `citadelplatforms` → `broxiva` (GitHub container registry org)

### Specific Examples:
- `citadelbuy-prod-aks` → `broxiva-prod-aks`
- `citadelbuy-prod-rg` → `broxiva-prod-rg`
- `citadelbuy-production` → `broxiva-production`
- `ghcr.io/citadelplatforms` → `ghcr.io/broxiva`
- `citadelbuyacr.azurecr.io` → `broxivaacr.azurecr.io`
- `https://citadelbuy.com` → `https://broxiva.com`

---

## Post-Migration Verification

After running the migration, verify the changes:

### 1. Check for Remaining References
```powershell
cd .github\workflows
Get-ChildItem -Filter "*.yml" | Select-String -Pattern "citadelbuy" -CaseSensitive
```

Expected result: **No matches found**

### 2. Count Broxiva References
```powershell
(Get-ChildItem -Filter "*.yml" | Select-String -Pattern "broxiva" -CaseSensitive).Count
```

Expected result: **~213 matches**

### 3. Review Changes with Git
```bash
git diff .github/workflows/
```

### 4. Check Specific Files
```bash
git diff .github/workflows/cd-prod.yml
git diff .github/workflows/cd-staging.yml
git diff .github/workflows/cd-dev.yml
```

---

## Rollback Instructions

If you need to rollback the changes:

### Using Backup Directory
```powershell
# Find your backup directory (will be named workflows-backup-TIMESTAMP)
$backup = Get-ChildItem -Directory -Filter "workflows-backup-*" | Sort-Object -Descending | Select-Object -First 1

# Restore from backup
Copy-Item "$($backup.FullName)\*.yml" -Destination ".github\workflows\" -Force
```

### Using Git
```bash
git checkout .github/workflows/
```

---

## Troubleshooting

### Issue: "Execution Policy" Error (PowerShell)
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\Migrate-CICD.ps1
```

### Issue: "File in use" Error
**Solution:**
1. Close all editors/IDEs that might have workflow files open
2. Pause OneDrive sync temporarily
3. Run the migration script again

### Issue: Permission Denied
**Solution:**
```powershell
# Run PowerShell as Administrator
# Then execute the migration script
```

### Issue: OneDrive Sync Conflicts
**Solution:**
1. Pause OneDrive sync
2. Run migration
3. Verify changes
4. Resume OneDrive sync

---

## Next Steps After Migration

1. **Commit Changes**
   ```bash
   git add .github/workflows/
   git commit -m "ci: migrate CI/CD pipelines from CitadelBuy to Broxiva"
   ```

2. **Create Feature Branch** (Optional but recommended)
   ```bash
   git checkout -b cicd/migrate-to-broxiva
   git push origin cicd/migrate-to-broxiva
   ```

3. **Test Workflows**
   - Trigger a test workflow run
   - Verify no errors occur
   - Check that branding appears correctly

4. **Update Azure Resources**
   - Update Azure Container Registry name
   - Update AKS cluster names
   - Update resource group names
   - Update domain configurations

5. **Update Secrets/Variables**
   - Review GitHub repository secrets
   - Update any CitadelBuy-specific values
   - Verify environment variables

---

## Support

If you encounter any issues:

1. Check the backup directory location
2. Review the git diff output
3. Verify file permissions
4. Check OneDrive sync status
5. Contact DevOps team for assistance

---

## Migration Checklist

- [ ] Read these instructions completely
- [ ] Choose execution option (PowerShell recommended)
- [ ] Pause OneDrive sync (if applicable)
- [ ] Run migration script
- [ ] Verify no citadelbuy references remain
- [ ] Review git diff output
- [ ] Test a sample workflow
- [ ] Commit changes
- [ ] Update Azure resources
- [ ] Update repository secrets
- [ ] Resume OneDrive sync
- [ ] Mark migration as complete

---

## Success Criteria

Migration is successful when:
- ✅ 0 occurrences of "citadelbuy" (case-insensitive)
- ✅ ~213 occurrences of "broxiva"
- ✅ All 19 workflow files modified
- ✅ Backup created successfully
- ✅ Git diff shows expected changes
- ✅ No syntax errors in YAML files

---

**Last Updated**: 2025-12-13
**Migration Scripts**: `Migrate-CICD.ps1`, `migrate_manual.bat`, `manual_migration.py`
**Backup Location**: `workflows-backup-TIMESTAMP/`
