# CitadelBuy to Broxiva Migration - Remaining References Summary

**Generated:** 2025-12-13
**Working Directory:** C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization

## Executive Summary

This document summarizes all remaining `citadelbuy` and `citadelplatforms` references found in the codebase that need to be updated to `broxiva`.

## Statistics Overview

### CitadelBuy References
Based on comprehensive grep scan:
- **Environment Files**: ~40+ occurrences across .env files
- **GitHub Workflows**: References found but most already updated to broxiva
- **Azure Pipelines**: ~10 occurrences in azure-pipelines/*.yml
- **Documentation**: ~100+ occurrences in .md files (migration guides, docs, etc.)
- **Scripts**: ~10 occurrences in deployment scripts
- **Configuration Files**: ~5 occurrences (.gitignore, build scripts)

### CitadelPlatforms References
- **GitHub Workflows**: ~5 occurrences (container registry references)
- **Azure Pipelines**: ~8 occurrences
- **Deployment Scripts**: ~6 occurrences
- **Documentation**: ~30+ occurrences

**Total Estimated References**: 200+ across all file types

---

## Detailed Breakdown by Category

### 1. Environment Files ✅ UPDATED

#### Files Updated:
- ✅ `.env.production.example` - **COMPLETED**
  - Updated header comment: CitadelBuy → Broxiva
  - Updated FRONTEND_URL: citadelbuy.com → broxiva.com
  - Updated CORS_ORIGINS: citadelbuy.com → broxiva.com
  - Updated POSTGRES_USER: citadelbuy → broxiva
  - Updated POSTGRES_DB: citadelbuy_production → broxiva_production
  - Updated DATABASE_URL with new database name
  - Updated REDIS_KEY_PREFIX: citadelbuy: → broxiva:
  - Updated RABBITMQ_USER: citadelbuy → broxiva
  - Updated MINIO_ROOT_USER: citadelbuy_admin → broxiva_admin
  - Updated MINIO_BUCKET: citadelbuy-uploads → broxiva-uploads
  - Updated AWS_S3_BUCKET: citadelbuy-production-uploads → broxiva-production-uploads
  - Updated AZURE_STORAGE_ACCOUNT_NAME: citadelbuy → broxiva
  - Updated AZURE_STORAGE_CONTAINER: citadelbuy-documents → broxiva-documents
  - Updated APPLE_MERCHANT_ID: merchant.com.citadelbuy → merchant.com.broxiva
  - Updated email addresses: *@citadelbuy.com → *@broxiva.com
  - Updated SENDGRID_FROM_NAME: CitadelBuy → Broxiva
  - Updated OAuth redirect URIs: citadelbuy.com → broxiva.com
  - Updated APPLE_CLIENT_ID: com.citadelbuy.app → com.broxiva.app
  - Updated ELASTICSEARCH_NODE: elasticsearch.citadelbuy.com → elasticsearch.broxiva.com
  - Updated ELASTICSEARCH_INDEX_PREFIX: citadelbuy → broxiva
  - Updated ALGOLIA_INDEX_NAME: citadelbuy_products_production → broxiva_products_production
  - Updated LOG_FILE_PATH: /var/log/citadelbuy → /var/log/broxiva
  - Updated NEW_RELIC_APP_NAME: CitadelBuy Production → Broxiva Production
  - Updated PGADMIN_DEFAULT_EMAIL: admin@citadelbuy.com → admin@broxiva.com
  - Updated APPLE_BUNDLE_ID: com.citadelbuy.app → com.broxiva.app
  - Updated GOOGLE_PACKAGE_NAME: com.citadelbuy.app → com.broxiva.app
  - Updated BACKUP_S3_BUCKET: citadelbuy-backups → broxiva-backups

- ✅ `.env.example` - **COMPLETED**
  - Updated header: CitadelBuy → Broxiva
  - Updated POSTGRES_USER, POSTGRES_DB, DATABASE_URL
  - Updated SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME
  - Updated AZURE_STORAGE_CONTAINER
  - Updated ELASTICSEARCH_INDEX
  - Updated PGADMIN_DEFAULT_EMAIL
  - Updated RABBITMQ_USER
  - Updated MINIO_ROOT_USER

#### Files Still Need Update:
- ⚠️ `.env.docker.example` - **PENDING**
  - Line 2: Header comment "CitadelBuy - Docker Compose"
  - Line 39: POSTGRES_USER=citadelbuy
  - Line 41: POSTGRES_DB=citadelbuy_dev
  - Line 44: MONGO_USER=citadelbuy
  - Line 88: PGADMIN_DEFAULT_EMAIL=admin@citadelbuy.com
  - Line 100: MINIO_ROOT_USER=citadelbuy_admin
  - Line 108: RABBITMQ_USER=citadelbuy
  - Line 132: AWS_S3_BUCKET=citadelbuy-uploads
  - Line 158: EMAIL_USER=noreply@citadelbuy.com

- ⚠️ `.env.payment.example` - **PENDING**
  - Line 86-88: APPLE_MERCHANT_ID=merchant.com.citadelbuy
  - Line 111: APP_NAME=CitadelBuy

### 2. Configuration Files ⚠️ PARTIALLY UPDATED

#### Files Need Update:
- ⚠️ `.gitignore` - **PENDING**
  - Line 2: "# CitadelBuy E-Commerce Platform - Git Ignore"
  - Line 373: "# This .gitignore is configured for the CitadelBuy platform"

- ⚠️ `.gitignore.enhanced` - **PENDING**
  - Line 2: "# CitadelBuy E-Commerce Platform - Git Ignore"
  - Line 505: "# This .gitignore is configured for the CitadelBuy platform"

### 3. Build Scripts ⚠️ NEED UPDATE

- ⚠️ `build-broxiva-images.sh` - **PENDING**
  - Line 15: BASE_DIR="C:/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization"
  - Path references in comments

- ⚠️ `build-broxiva-images.ps1` - **PENDING**
  - Line 15: $BASE_DIR = "C:\Users\Dell\OneDrive\Documents\Citadelbuy\CitadelBuy\organization"
  - Path references in comments

### 4. GitHub Workflows ✅ MOSTLY UPDATED

Most GitHub workflow files have been updated to use `broxiva` for:
- AKS cluster names
- Resource groups
- Kubernetes namespaces
- Container registry: `ghcr.io/broxiva`

**Status**: Most workflows appear updated based on cd-dev.yml and cd-prod.yml inspection.

### 5. Azure Pipelines ⚠️ NEED UPDATE

Files with `citadelplatforms` references:

- ⚠️ `azure-pipelines/staging-deployment.yml`
  - Line 27: value: 'citadelplatforms/citadelbuy'

- ⚠️ `azure-pipelines/organization-module.yml`
  - Line 35: value: 'citadelplatforms/citadelbuy-organization'

- ⚠️ `azure-pipelines/dropshipping-services.yml`
  - Line 31: value: 'citadelplatforms/citadelbuy'

- ⚠️ `azure-pipelines/ci-pipeline.yml`
  - Line 340: repository: 'citadelplatforms/citadelbuy-ecommerce'
  - Line 351: repository: 'citadelplatforms/citadelbuy-ecommerce'

### 6. Deployment Scripts ⚠️ NEED UPDATE

- ⚠️ `scripts/deploy.sh`
  - Line 18: REGISTRY="citadelplatforms"

- ⚠️ `scripts/deploy-staging.sh`
  - Line 26: readonly IMAGE_NAME="${IMAGE_NAME:-citadelplatforms/citadelbuy}"

### 7. Documentation Files 📝 EXTENSIVE UPDATES NEEDED

Major documentation files with `citadelbuy` or `citadelplatforms` references:

#### Migration Guides (These document the migration itself)
- `CICD_MIGRATION_GUIDE.md` - Contains examples of both old and new names (intentional)
- `MIGRATION_REPORT.md` - Migration documentation
- `MIGRATION_READY_TO_EXECUTE.md` - Migration instructions
- `MIGRATION_FILES_REPORT.md` - Migration tracking
- `MIGRATION_EXECUTION_SUMMARY.md` - Migration summary
- `MIGRATION_EXECUTION_INSTRUCTIONS.md` - Migration steps
- `QUICK_START_MIGRATION.md` - Quick migration guide
- `CICD_MIGRATION_SUMMARY.md` - CI/CD migration summary
- `manual_migration.py` - Migration script
- `run_migration.py` - Migration runner
- `migrate-cicd-to-broxiva.sh` - Migration bash script
- `Migrate-CICD.ps1` - Migration PowerShell script
- `migrate_manual.bat` - Migration batch file

**Note**: These files document the migration process and show both old/new names as examples.

#### Operational Documentation
- ⚠️ `docs/root/TROUBLESHOOTING.md` - Multiple docker image references
- ⚠️ `docs/root/STAGING_QUICK_REFERENCE.md` - Container image references
- ⚠️ `docs/root/DOCKER_SECURITY.md` - Security scan examples
- ⚠️ `docs/root/STAGING_INFRASTRUCTURE_SUMMARY.md` - Infrastructure docs
- ⚠️ `docs/root/STAGING_DEPLOYMENT.md` - Deployment instructions
- ⚠️ `docs/root/DEPLOYMENT_RUNBOOK.md` - Deployment procedures
- ⚠️ `docs/OPERATIONS_MANUAL.md` - Operations guide
- ⚠️ `docs/root/OPERATIONS_CHECKLIST.md` - Operations checklist
- ⚠️ `docs/infrastructure/kubernetes/README.md` - K8s documentation
- ⚠️ `docs/infrastructure/kubernetes/DEPLOYMENT_CHECKLIST.md` - Deployment checks
- ⚠️ `docs/infrastructure/docker/README.md` - Docker documentation
- ⚠️ `docs/root/DOCKER_SECURITY_UPDATES.md` - Security updates

#### Build and Setup Documentation
- ⚠️ `BUILD_CHECKLIST.md` - Line 9: Directory path reference
- ⚠️ `BUILD_INSTRUCTIONS.txt` - Multiple path references

### 8. Other Directories

**Note**: App-specific files in `apps/`, `packages/`, `tests/`, and `n8n-workflows/` likely have additional .env.example files that need review but are outside the current organization-level scope.

---

## Update Priority Recommendations

### HIGH PRIORITY (Production Critical)
1. ✅ **Environment Templates** - COMPLETED
   - `.env.production.example` ✅
   - `.env.example` ✅

2. ⚠️ **CI/CD Pipelines** - PARTIALLY COMPLETE
   - Update Azure Pipeline files (4 files)
   - Verify all GitHub workflow files

3. ⚠️ **Deployment Scripts** - PENDING
   - `scripts/deploy.sh`
   - `scripts/deploy-staging.sh`

### MEDIUM PRIORITY (Development/Operations)
4. ⚠️ **Configuration Files** - PENDING
   - `.env.docker.example`
   - `.env.payment.example`
   - `.gitignore` files

5. ⚠️ **Build Scripts** - PENDING
   - `build-broxiva-images.sh`
   - `build-broxiva-images.ps1`

### LOW PRIORITY (Documentation)
6. 📝 **Operational Documentation** - PENDING
   - Update all docs/ directory markdown files
   - Update README files
   - Update troubleshooting guides

7. 📝 **Migration Documentation** - REVIEW ONLY
   - Keep migration guides as-is (they document the transition)
   - Or clearly mark them as historical/reference

---

## Batch Update Strategy

### Recommended Approach:

1. **Manual Updates** (Completed for critical files):
   - ✅ Core environment templates (.env.production.example, .env.example)

2. **Automated Batch Updates** (Recommended for remaining files):
   ```bash
   # For simple text replacements in specific files:
   find . -type f \( -name "*.yml" -o -name "*.sh" -o -name "*.ps1" \) \
     -not -path "*/node_modules/*" \
     -not -path "*/.git/*" \
     -exec sed -i 's/citadelplatforms/broxiva/g' {} +

   find . -type f \( -name ".env*" -o -name "*.md" \) \
     -not -path "*/node_modules/*" \
     -not -path "*/.git/*" \
     -exec sed -i 's/citadelbuy/broxiva/g' {} + \
     -exec sed -i 's/CitadelBuy/Broxiva/g' {} +
   ```

3. **Manual Review** (Required after automated updates):
   - Review all changed files
   - Verify no broken references
   - Test build and deployment scripts
   - Validate configuration files

---

## Testing Checklist

After completing all updates:

- [ ] Environment files validate correctly
- [ ] Build scripts execute without errors
- [ ] Docker images build with new names
- [ ] CI/CD pipelines reference correct registries
- [ ] Deployment scripts use correct image names
- [ ] Documentation accurately reflects new branding
- [ ] No broken links or references
- [ ] Database connection strings are correct
- [ ] Email addresses use new domain
- [ ] OAuth redirect URIs updated
- [ ] Mobile app bundle IDs updated
- [ ] Container registry references point to broxiva

---

## Files Updated in This Session

### Completed Updates:
1. ✅ `.env.production.example` - 40+ replacements
2. ✅ `.env.example` - 12+ replacements

### Remaining High-Priority Files:
3. ⚠️ `.env.docker.example` - ~9 replacements needed
4. ⚠️ `.env.payment.example` - ~3 replacements needed
5. ⚠️ `.gitignore` - 2 replacements needed
6. ⚠️ `.gitignore.enhanced` - 2 replacements needed
7. ⚠️ `build-broxiva-images.sh` - Path updates needed
8. ⚠️ `build-broxiva-images.ps1` - Path updates needed
9. ⚠️ `scripts/deploy.sh` - Registry update needed
10. ⚠️ `scripts/deploy-staging.sh` - Image name update needed
11. ⚠️ Azure Pipeline files (4 files) - Repository references needed
12. 📝 Documentation files (50+ files) - Comprehensive branding updates needed

---

## Next Steps

1. **Complete remaining environment files** - Run batch update script
2. **Update CI/CD pipeline files** - Manual review recommended for each
3. **Update deployment scripts** - Test after each update
4. **Update build scripts** - Verify paths are correct
5. **Update documentation** - Can be done in batches
6. **Final validation** - Run complete test suite
7. **Commit changes** - Create migration commit with detailed description

---

## Notes

- Migration guides intentionally contain both old and new names as examples
- Some documentation may need to remain as reference material
- Path references in scripts may need environment-specific adjustments
- Test all critical functionality after updates
- Consider a staged rollout for production deployments

---

**Report Generated By:** Claude Opus 4.5
**Total References Found:** ~200+
**Files Updated:** 2/50+
**Completion Status:** ~10% Complete
