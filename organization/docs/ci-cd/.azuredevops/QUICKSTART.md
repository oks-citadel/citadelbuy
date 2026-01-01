# Broxiva - Pipeline Quick Start Guide

## Getting Started in 5 Minutes

This guide will help you understand and use the Broxiva Unified Pipeline quickly.

---

## What is the Unified Pipeline?

The Unified Pipeline (`main.yml`) is the **single entry point** for all CI/CD operations in Broxiva. It automatically:

- ✅ Validates code quality
- ✅ Runs tests
- ✅ Scans for security vulnerabilities
- ✅ Builds Docker images
- ✅ Deploys to dev/staging/production
- ✅ Runs end-to-end tests
- ✅ Manages infrastructure with Terraform

---

## Automatic Pipeline Triggers

The pipeline automatically runs when you:

### 1. Push to Feature Branch
```bash
git checkout -b feature/my-new-feature
# Make changes
git push origin feature/my-new-feature
```
**Pipeline runs:** Validate → Test → SecurityScan → Build → DockerBuild → DeployDev

### 2. Push to Develop Branch
```bash
git checkout develop
git merge feature/my-new-feature
git push origin develop
```
**Pipeline runs:** Full pipeline → DeployDev → DeployStaging → E2ETests

### 3. Push to Main Branch (Production)
```bash
git checkout main
git merge develop
git push origin main
```
**Pipeline runs:** Full pipeline → DeployProduction (requires manual approval) → PostDeployVerify

### 4. Create Pull Request
```bash
# Create PR from feature branch to develop or main
```
**Pipeline runs:** Validate → Test → SecurityScan (no deployments)

---

## Manual Pipeline Runs

### How to Run Pipeline Manually

1. Go to Azure DevOps: https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
2. Click "Pipelines" → "Broxiva-Unified-Pipeline"
3. Click "Run pipeline"
4. Configure parameters (see below)
5. Click "Run"

### Common Manual Run Scenarios

#### Deploy to Staging Only
```yaml
Parameters:
  deployEnvironment: staging
  skipTests: false
  runE2E: true
```

#### Deploy to Production
```yaml
Parameters:
  deployEnvironment: prod
  skipTests: false
  runE2E: false
```
*Note: Requires manual approval*

#### Build Specific Microservices
```yaml
Parameters:
  buildMicroservices: api,web,worker
  deployEnvironment: dev
```

#### Run Terraform Plan
```yaml
Parameters:
  terraformAction: plan
  deployEnvironment: none
```

#### Emergency Hotfix Deploy
```yaml
Parameters:
  deployEnvironment: prod
  skipTests: true  # NOT recommended
  buildMicroservices: api  # Only critical service
```
*Use only for critical production issues*

---

## Pipeline Parameters Reference

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `skipTests` | true/false | false | Skip all tests (not recommended) |
| `deployEnvironment` | none/dev/staging/prod | none | Force deployment to specific environment |
| `buildMicroservices` | all or comma-separated | all | Build specific services (e.g., "api,web") |
| `runE2E` | true/false | false | Run end-to-end tests on staging |
| `terraformAction` | none/plan/apply/destroy | none | Terraform infrastructure action |
| `skipSecurityScan` | true/false | false | Skip security scanning (not recommended) |
| `pushToRegistry` | true/false | true | Push Docker images to ACR |

---

## Understanding Pipeline Stages

### Stage 1: Validate (Always Runs)
- **What:** Code quality checks, linting, type checking
- **Duration:** ~2-3 minutes
- **Fails if:** Linting errors, type errors, formatting issues

### Stage 2: Test (Runs unless skipped)
- **What:** Unit and integration tests
- **Duration:** ~5-10 minutes
- **Fails if:** Test failures, coverage below threshold

### Stage 3: SecurityScan (Runs unless skipped)
- **What:** Vulnerability scanning, dependency audit
- **Duration:** ~3-5 minutes
- **Fails if:** Critical vulnerabilities found

### Stage 4: Build (Runs for deployment branches)
- **What:** Compile TypeScript, build applications
- **Duration:** ~5-8 minutes
- **Fails if:** Build errors, compilation failures

### Stage 5: DockerBuild (Runs after successful build)
- **What:** Build and push Docker images to ACR
- **Duration:** ~10-15 minutes
- **Fails if:** Docker build errors, registry push failures

### Stage 6: DeployDev (Auto on develop/feature)
- **What:** Deploy to development AKS cluster
- **Duration:** ~5-8 minutes
- **Fails if:** Deployment failures, health check failures

### Stage 7: DeployStaging (Auto on develop/release)
- **What:** Deploy to staging AKS cluster
- **Duration:** ~8-12 minutes
- **Fails if:** Deployment failures, health check failures

### Stage 8: E2ETests (Optional, runs if enabled)
- **What:** End-to-end tests with Playwright
- **Duration:** ~15-20 minutes
- **Fails if:** Test failures, timeout

### Stage 9: DeployProduction (Manual approval required)
- **What:** Blue-Green deployment to production
- **Duration:** ~15-20 minutes
- **Requires:** Manual approval (24-hour timeout)
- **Fails if:** Deployment failures, smoke tests fail

### Stage 10: PostDeployVerify (After production)
- **What:** Health checks, performance validation
- **Duration:** ~5-10 minutes
- **Fails if:** Endpoints unreachable, performance degradation

### Stage 11: Terraform (Parallel, when requested)
- **What:** Infrastructure as Code changes
- **Duration:** Varies (5-30 minutes)
- **Requires:** Manual approval for apply/destroy
- **Fails if:** Plan errors, apply failures

---

## Common Workflows

### Standard Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/add-payment-gateway

# 2. Make changes and commit
git add .
git commit -m "Add payment gateway integration"

# 3. Push to trigger pipeline
git push origin feature/add-payment-gateway
# Pipeline runs: Validate → Test → SecurityScan → Build → DockerBuild → DeployDev

# 4. Verify in dev environment
# https://dev.broxiva.com

# 5. Create PR to develop
# PR triggers validation pipeline (no deployment)

# 6. After approval, merge to develop
git checkout develop
git pull origin develop
git merge feature/add-payment-gateway
git push origin develop
# Pipeline runs: Full pipeline → DeployStaging → E2ETests

# 7. Verify in staging
# https://staging.broxiva.com

# 8. When ready, merge to main for production
git checkout main
git pull origin main
git merge develop
git push origin main
# Pipeline runs: Full pipeline → DeployProduction (awaits approval)

# 9. Approve production deployment in Azure DevOps UI

# 10. Verify in production
# https://broxiva.com
```

### Hotfix Process

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make critical fix
git add .
git commit -m "Fix critical payment processing bug"

# 3. Push and test
git push origin hotfix/critical-bug-fix
# Pipeline deploys to dev for quick testing

# 4. Merge directly to main (skip staging for emergencies)
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# 5. Approve immediate production deployment

# 6. Backport to develop
git checkout develop
git merge hotfix/critical-bug-fix
git push origin develop
```

### Infrastructure Changes

```bash
# 1. Make Terraform changes
# Edit files in infrastructure/terraform/

# 2. Commit changes
git add infrastructure/terraform/
git commit -m "Add Redis cache cluster"

# 3. Push to feature branch
git push origin feature/add-redis-cache

# 4. Run pipeline with Terraform plan
# Manual run with: terraformAction=plan

# 5. Review plan output in pipeline logs

# 6. If approved, run with apply
# Manual run with: terraformAction=apply
# Requires manual approval

# 7. Verify infrastructure changes
```

---

## Monitoring Pipeline Runs

### View Pipeline Status

**Azure DevOps:**
1. Navigate to: https://dev.azure.com/broxivacloudmanagement/Broxiva/_build
2. Click on your pipeline run
3. View stage-by-stage progress

**Build Badge:**
```markdown
[![Build Status](https://dev.azure.com/broxivacloudmanagement/Broxiva/_apis/build/status/Broxiva-Unified-Pipeline)](https://dev.azure.com/broxivacloudmanagement/Broxiva/_build/latest?definitionId=<pipeline-id>)
```

### Get Notifications

**Slack:**
- Join #broxiva-deployments channel
- Notifications for all pipeline runs
- @mention on failures affecting your code

**Email:**
- Configure in Azure DevOps user settings
- Get notified on:
  - Your pipeline runs
  - Failed builds
  - Approval requests

---

## Troubleshooting

### Pipeline Stuck at Approval

**Issue:** DeployProduction stage waiting for approval

**Solution:**
1. Go to Azure DevOps pipeline run
2. Click "Review" on the DeployProduction stage
3. Review deployment details
4. Click "Approve" or "Reject"

### Tests Failing

**Issue:** Test stage failing

**Solution:**
1. Click on "Test" stage in pipeline
2. Click on failed job
3. Review test output logs
4. Fix failing tests locally:
   ```bash
   pnpm test
   ```
5. Commit and push fix

### Docker Build Failing

**Issue:** DockerBuild stage failing

**Solution:**
1. Check error in pipeline logs
2. Common issues:
   - Dockerfile syntax errors
   - Missing dependencies
   - Base image pull failures
3. Test build locally:
   ```bash
   docker build -t test-image -f apps/api/Dockerfile apps/api
   ```
4. Fix and push

### Deployment Failing

**Issue:** Deploy stage failing

**Solution:**
1. Check deployment logs
2. Common issues:
   - Image pull errors (check ACR credentials)
   - Resource quota exceeded
   - Health check failures
3. Verify cluster access:
   ```bash
   az aks get-credentials --resource-group broxiva-dev-rg --name broxiva-dev-aks
   kubectl get pods -n broxiva-dev
   ```

### Security Scan Blocking

**Issue:** SecurityScan stage failing

**Solution:**
1. Review Trivy scan results
2. Check vulnerability severity
3. Options:
   - Update vulnerable dependencies
   - Add exception (with justification)
   - Fix code issues
4. Re-run pipeline after fixes

---

## Best Practices

### ✅ Do's

- **Do** run the full pipeline before merging to main
- **Do** wait for staging E2E tests to pass
- **Do** review security scan results
- **Do** test changes in dev before staging
- **Do** use feature branches for all changes
- **Do** write tests for new features
- **Do** review pipeline logs when issues occur

### ❌ Don'ts

- **Don't** skip tests in production deployments
- **Don't** bypass security scans
- **Don't** approve production deployments without verification
- **Don't** commit secrets or credentials
- **Don't** merge PRs with failing pipelines
- **Don't** use skipTests=true except for emergencies
- **Don't** deploy directly to production without staging

---

## Getting Help

### Documentation
- [Full README](.azuredevops/README.md)
- [Templates Guide](.azuredevops/TEMPLATES_GUIDE.md)
- [Implementation Checklist](.azuredevops/PIPELINE_CHECKLIST.md)

### Support Channels
- **Slack:** #devops-support
- **Email:** devops@broxiva.com
- **On-Call:** [Contact DevOps on-call engineer]

### Common Questions

**Q: How long does a full pipeline run take?**
A: Typically 30-45 minutes for a complete run through production.

**Q: Can I deploy only specific microservices?**
A: Yes, use the `buildMicroservices` parameter (e.g., "api,web").

**Q: How do I rollback a production deployment?**
A: The blue environment is kept for 24 hours. Contact DevOps to switch traffic back to blue.

**Q: Can I run E2E tests before merging to develop?**
A: Yes, run the pipeline manually with `runE2E=true` on your feature branch.

**Q: What happens if deployment fails?**
A: The pipeline stops, and the previous version continues running. No automatic rollback for dev/staging.

---

## Next Steps

1. **Read the full README:** [.azuredevops/README.md](README.md)
2. **Review template specifications:** [.azuredevops/TEMPLATES_GUIDE.md](TEMPLATES_GUIDE.md)
3. **Complete implementation checklist:** [.azuredevops/PIPELINE_CHECKLIST.md](PIPELINE_CHECKLIST.md)
4. **Join Slack channels:** #broxiva-deployments, #devops-support
5. **Set up notifications:** Configure Azure DevOps and Slack preferences

---

**Happy Deploying! 🚀**
