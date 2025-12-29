# CitadelBuy - Pipeline Templates Implementation Guide

## Overview

This guide outlines the template structure referenced by the main unified pipeline. Each template file needs to be created in the `templates/stages/` directory.

## Template Directory Structure

```
.azuredevops/pipelines/templates/stages/
├── validate.yml              # Code quality & linting
├── test.yml                  # Unit & integration tests
├── security-scan.yml         # Security scanning (Trivy, SAST)
├── build.yml                 # Application compilation
├── docker-build.yml          # Docker image build & push
├── deploy-dev.yml            # Development deployment
├── deploy-staging.yml        # Staging deployment
├── deploy-production.yml     # Production deployment (Blue-Green)
├── e2e-tests.yml             # End-to-end tests (Playwright)
├── post-deploy-verify.yml    # Post-deployment validation
└── terraform.yml             # Infrastructure as Code
```

---

## Template Specifications

### 1. validate.yml

**Purpose:** Code quality validation, linting, and type checking

**Parameters:**
```yaml
parameters:
  - name: skipLinting
    type: boolean
    default: false
  - name: skipTypeCheck
    type: boolean
    default: false
  - name: skipFormatCheck
    type: boolean
    default: false
```

**Jobs:**
- Lint job (ESLint, Prettier)
- Type check job (TypeScript)
- Code complexity analysis

**Key Tasks:**
- Setup Node.js and pnpm
- Cache dependencies
- Run linting tools
- Publish lint reports

---

### 2. test.yml

**Purpose:** Unit and integration testing with service dependencies

**Parameters:**
```yaml
parameters:
  - name: runUnitTests
    type: boolean
    default: true
  - name: runIntegrationTests
    type: boolean
    default: true
  - name: enableCodeCoverage
    type: boolean
    default: true
  - name: publishCoverageReports
    type: boolean
    default: true
  - name: services
    type: object
```

**Services:**
- PostgreSQL 16-alpine
- Redis 7-alpine

**Jobs:**
- Unit test job
- Integration test job
- Coverage reporting job

**Key Tasks:**
- Setup test services
- Run Prisma migrations
- Execute Jest tests
- Publish coverage reports
- Upload test results

---

### 3. security-scan.yml

**Purpose:** Security vulnerability scanning and analysis

**Parameters:**
```yaml
parameters:
  - name: runTrivy
    type: boolean
    default: true
  - name: runDependencyAudit
    type: boolean
    default: true
  - name: runSAST
    type: boolean
    default: true
  - name: failOnHighSeverity
    type: boolean
    default: false
  - name: failOnCriticalSeverity
    type: boolean
    default: true
```

**Jobs:**
- Trivy vulnerability scan
- NPM dependency audit
- SAST analysis

**Key Tasks:**
- Install Trivy scanner
- Scan codebase for vulnerabilities
- Run npm audit
- Generate SARIF reports
- Publish security findings

---

### 4. build.yml

**Purpose:** Compile applications and prepare artifacts

**Parameters:**
```yaml
parameters:
  - name: buildConfiguration
    type: string
    default: Release
  - name: publishArtifacts
    type: boolean
    default: true
  - name: microservices
    type: string
    default: 'all'
```

**Jobs:**
- Build API (NestJS)
- Build Web (Next.js)
- Build Workers
- Build Microservices

**Key Tasks:**
- Setup Node.js and pnpm
- Install dependencies
- Run TypeScript compilation
- Build Next.js applications
- Publish build artifacts

---

### 5. docker-build.yml

**Purpose:** Build Docker images and push to Azure Container Registry

**Parameters:**
```yaml
parameters:
  - name: registry
    type: string
  - name: serviceConnection
    type: string
  - name: acrServiceConnection
    type: string
  - name: buildContext
    type: string
  - name: microservices
    type: string
    default: 'all'
  - name: tags
    type: object
  - name: scanImages
    type: boolean
    default: true
  - name: pushToRegistry
    type: boolean
    default: true
```

**Jobs:**
- Build Docker images (parallel)
- Scan images with Trivy
- Push to ACR

**Microservices:**
- citadelbuy-api
- citadelbuy-web
- citadelbuy-worker
- citadelbuy-notification
- citadelbuy-payment
- citadelbuy-inventory

**Key Tasks:**
- Login to ACR
- Build multi-stage Docker images
- Tag images (BuildId, SHA, Branch, Latest)
- Scan images for vulnerabilities
- Push images to registry

---

### 6. deploy-dev.yml

**Purpose:** Deploy to Development AKS cluster

**Parameters:**
```yaml
parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string
  - name: aksResourceGroup
    type: string
  - name: aksClusterName
    type: string
  - name: namespace
    type: string
  - name: imageTag
    type: string
  - name: runMigrations
    type: boolean
    default: true
  - name: healthCheckEnabled
    type: boolean
    default: true
```

**Deployment Strategy:** Rolling update

**Key Tasks:**
- Get AKS credentials
- Apply Kubernetes manifests
- Update deployment images
- Run database migrations
- Wait for rollout completion
- Verify health endpoints

---

### 7. deploy-staging.yml

**Purpose:** Deploy to Staging AKS cluster

**Parameters:**
```yaml
parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string
  - name: aksResourceGroup
    type: string
  - name: aksClusterName
    type: string
  - name: namespace
    type: string
  - name: imageTag
    type: string
  - name: runMigrations
    type: boolean
    default: true
  - name: healthCheckEnabled
    type: boolean
    default: true
  - name: requireApproval
    type: boolean
    default: false
```

**Deployment Strategy:** Rolling update

**Key Tasks:**
- Get AKS credentials
- Apply Kubernetes manifests
- Update deployment images
- Run database migrations
- Wait for rollout completion
- Verify health endpoints
- Test service endpoints

---

### 8. deploy-production.yml

**Purpose:** Deploy to Production AKS cluster with Blue-Green strategy

**Parameters:**
```yaml
parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string
  - name: aksResourceGroup
    type: string
  - name: aksClusterName
    type: string
  - name: namespace
    type: string
  - name: imageTag
    type: string
  - name: deploymentStrategy
    type: string
    default: blueGreen
  - name: runMigrations
    type: boolean
    default: true
  - name: requireApproval
    type: boolean
    default: true
  - name: healthCheckEnabled
    type: boolean
    default: true
  - name: smokeTestsEnabled
    type: boolean
    default: true
  - name: canaryPercentage
    type: number
    default: 0
  - name: approvalTimeout
    type: number
    default: 1440
```

**Deployment Strategy:** Blue-Green with manual approval

**Key Tasks:**
- Manual approval gate (environment protection)
- Get AKS credentials
- Deploy to green environment
- Run database migrations
- Smoke tests on green environment
- Switch traffic to green
- Verify production endpoints
- Keep blue environment for rollback

---

### 9. e2e-tests.yml

**Purpose:** End-to-end testing with Playwright

**Parameters:**
```yaml
parameters:
  - name: environment
    type: string
  - name: baseUrl
    type: string
  - name: browser
    type: string
    default: chromium
  - name: parallelWorkers
    type: number
    default: 4
  - name: retries
    type: number
    default: 2
  - name: publishReports
    type: boolean
    default: true
```

**Jobs:**
- E2E test execution (Playwright)
- Visual regression tests
- Cross-browser testing

**Key Tasks:**
- Setup Node.js and pnpm
- Install Playwright browsers
- Run E2E test suites
- Capture screenshots/videos
- Publish test reports
- Upload artifacts

---

### 10. post-deploy-verify.yml

**Purpose:** Post-deployment health checks and validation

**Parameters:**
```yaml
parameters:
  - name: environment
    type: string
  - name: endpoints
    type: object
  - name: performanceTests
    type: boolean
    default: true
  - name: metricsValidation
    type: boolean
    default: true
  - name: rollbackOnFailure
    type: boolean
    default: true
```

**Jobs:**
- Health check verification
- Performance baseline testing
- Metrics validation

**Key Tasks:**
- Verify all service endpoints
- Check response times
- Validate error rates
- Monitor resource utilization
- Automated rollback on failure

---

### 11. terraform.yml

**Purpose:** Infrastructure as Code provisioning with Terraform

**Parameters:**
```yaml
parameters:
  - name: action
    type: string
  - name: serviceConnection
    type: string
  - name: environment
    type: string
  - name: workingDirectory
    type: string
  - name: backendResourceGroup
    type: string
  - name: backendStorageAccount
    type: string
  - name: backendContainer
    type: string
  - name: requireApproval
    type: boolean
```

**Actions:** plan, apply, destroy

**Key Tasks:**
- Install Terraform
- Initialize backend (Azure Storage)
- Run terraform plan
- Manual approval for apply/destroy
- Apply infrastructure changes
- Store state in Azure Storage
- Publish plan outputs

---

## Common Template Patterns

### Standard Job Structure

```yaml
jobs:
  - job: JobName
    displayName: 'Display Name'
    pool:
      vmImage: $(AGENT_VM_IMAGE)
    variables:
      - template: ../variables/common.yml
    steps:
      - checkout: self
        clean: true

      # Your steps here
```

### Service Container Pattern

```yaml
jobs:
  - job: TestJob
    services:
      postgres:
        image: postgres:16-alpine
        ports:
          - 5432:5432
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

### Deployment Job Pattern

```yaml
jobs:
  - deployment: DeploymentName
    displayName: 'Deploy to Environment'
    pool:
      vmImage: $(AGENT_VM_IMAGE)
    environment: 'environment-name'
    strategy:
      runOnce:
        deploy:
          steps:
            - checkout: self
            # Deployment steps
```

### Conditional Execution

```yaml
condition: |
  and(
    succeeded(),
    eq(variables['Build.SourceBranch'], 'refs/heads/main')
  )
```

---

## Variable References

### Using Common Variables

```yaml
variables:
  - template: ../variables/common.yml
```

### Environment-Specific Variables

```yaml
variables:
  - ${{ if eq(parameters.environment, 'dev') }}:
    - template: ../variables/dev.yml
  - ${{ elseif eq(parameters.environment, 'staging') }}:
    - template: ../variables/staging.yml
  - ${{ else }}:
    - template: ../variables/prod.yml
```

---

## Best Practices

### 1. Parameterization
- Make templates flexible with parameters
- Provide sensible defaults
- Use parameter validation

### 2. Error Handling
- Use `continueOnError` for non-critical tasks
- Implement proper condition checks
- Add fallback mechanisms

### 3. Logging
- Use descriptive display names
- Add informative echo statements
- Publish relevant artifacts

### 4. Security
- Never hardcode secrets
- Use Azure Key Vault references
- Implement least privilege access

### 5. Performance
- Use caching for dependencies
- Run independent jobs in parallel
- Optimize Docker layer caching

### 6. Maintainability
- Keep templates focused (single responsibility)
- Document parameters and behavior
- Use consistent naming conventions

---

## Next Steps

To complete the pipeline implementation:

1. **Create Template Files:**
   - Create each template file in `templates/stages/`
   - Implement according to specifications above
   - Test each template independently

2. **Create Environment Variables:**
   - `variables/dev.yml`
   - `variables/staging.yml`
   - `variables/prod.yml`

3. **Setup Azure DevOps:**
   - Create service connections
   - Setup variable groups
   - Configure environments with approvals
   - Setup notification rules

4. **Test Pipeline:**
   - Test on feature branch
   - Verify each stage independently
   - Test full pipeline flow
   - Validate deployment to each environment

5. **Documentation:**
   - Update runbooks
   - Create troubleshooting guides
   - Document rollback procedures

---

## Reference

**Existing Templates:**
- Reference: `organization/azure-pipelines/templates/`
- These can be adapted for the new unified structure

**Azure DevOps Documentation:**
- [YAML Schema Reference](https://docs.microsoft.com/azure/devops/pipelines/yaml-schema)
- [Template Expressions](https://docs.microsoft.com/azure/devops/pipelines/process/templates)
- [Deployment Jobs](https://docs.microsoft.com/azure/devops/pipelines/process/deployment-jobs)
