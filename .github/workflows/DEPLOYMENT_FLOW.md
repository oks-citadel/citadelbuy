# AKS Deployment Flow Diagrams

## Overall Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline Overview                          │
└─────────────────────────────────────────────────────────────────────────┘

 develop branch          staging branch           main branch
      │                        │                        │
      ▼                        ▼                        ▼
 ┌──────────┐            ┌──────────┐            ┌──────────┐
 │ CI Tests │            │ CI Tests │            │ CI Tests │
 └─────┬────┘            └─────┬────┘            └─────┬────┘
       │                       │                        │
       ▼                       ▼                        ▼
 ┌──────────┐            ┌──────────┐            ┌──────────┐
 │  Build   │            │  Build   │            │  Build   │
 │  Images  │            │  Images  │            │  Images  │
 └─────┬────┘            └─────┬────┘            └─────┬────┘
       │                       │                        │
       ▼                       ▼                        ▼
 ┌──────────┐            ┌──────────┐            ┌──────────┐
 │ Push to  │            │ Push to  │            │ Push to  │
 │   GHCR   │            │   GHCR   │            │   GHCR   │
 └─────┬────┘            └─────┬────┘            └─────┬────┘
       │                       │                        │
       ▼                       ▼                        ▼
 ┌──────────┐            ┌──────────┐            ┌──────────┐
 │  Deploy  │            │  Manual  │            │  Manual  │
 │   Dev    │            │ Approval │            │ Approval │
 │   AKS    │            └─────┬────┘            └─────┬────┘
 └──────────┘                  │                        │
    Automatic                  ▼                        ▼
                         ┌──────────┐            ┌──────────┐
                         │  Deploy  │            │  Deploy  │
                         │ Staging  │            │   Prod   │
                         │   AKS    │            │   AKS    │
                         └─────┬────┘            │(Blue-Green)
                               │                 └─────┬────┘
                               ▼                       │
                         ┌──────────┐                  ▼
                         │  Smoke   │            ┌──────────┐
                         │  Tests   │            │Production│
                         └──────────┘            │ Validation
                                                 └──────────┘
```

## Development Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Development Deployment (cd-dev.yml)                  │
└─────────────────────────────────────────────────────────────────────────┘

  Push to develop
        │
        ▼
  ┌──────────────┐
  │  Checkout    │
  │     Code     │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Setup Node  │
  │   Install    │
  │ Dependencies │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Azure Login  │
  │  (via OIDC)  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Connect to  │
  │  Dev AKS via │
  │  kubelogin   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Run DB     │
  │  Migrations  │
  │  (Prisma)    │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Build      │
  │  Kustomize   │
  │  Manifests   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    Apply     │
  │ Deployments  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Wait for   │
  │   Rollout    │
  │   Complete   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    Health    │
  │    Checks    │
  │  (API & Web) │
  └──────┬───────┘
         │
         ├─────── Success ──────┐
         │                      │
         ▼                      ▼
  ┌──────────────┐      ┌──────────────┐
  │    Smoke     │      │   Notify     │
  │    Tests     │      │    Slack     │
  └──────┬───────┘      └──────────────┘
         │
         ├─────── Failure ──────┐
         │                      │
         ▼                      ▼
  ┌──────────────┐      ┌──────────────┐
  │   Rollback   │      │   Notify     │
  │  Deployment  │      │    Slack     │
  └──────────────┘      └──────────────┘
```

## Staging Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Staging Deployment (cd-staging.yml)                    │
└─────────────────────────────────────────────────────────────────────────┘

  Push to staging
        │
        ▼
  ┌──────────────────────────────────────┐
  │  Pre-Deployment Validation (Job 1)   │
  ├──────────────────────────────────────┤
  │  • Validate manifests                │
  │  • Security scans                    │
  │  • Lint Kustomize                    │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │    Manual Approval (Job 2)           │
  │  (Optional - can be skipped)         │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │      Deployment (Job 3)               │
  ├──────────────────────────────────────┤
  │  1. Azure OIDC Login                 │
  │  2. Connect to AKS                   │
  │  3. Backup current state             │
  │  4. Run DB migrations                │
  │  5. Build Kustomize                  │
  │  6. Apply deployments                │
  │  7. Wait for rollout                 │
  │  8. Health checks                    │
  │  9. Annotate deployments             │
  └─────────────────┬────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
  ┌──────────────┐      ┌──────────────┐
  │    Smoke     │      │ Integration  │
  │    Tests     │      │    Tests     │
  │   (Job 4)    │      │   (Job 5)    │
  └──────┬───────┘      └──────┬───────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
              ┌──────────┐
              │  Notify  │
              │  Results │
              └──────────┘
```

## Production Blue-Green Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Production Blue-Green Deployment (cd-prod.yml)              │
└─────────────────────────────────────────────────────────────────────────┘

  Push to main / Manual trigger
            │
            ▼
  ┌──────────────────────────────────────┐
  │  Pre-Deployment Validation            │
  ├──────────────────────────────────────┤
  │  • Validate version tag              │
  │  • Verify staging deployment         │
  │  • Check image availability          │
  │  • Security scans                    │
  │  • Vulnerability scanning            │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │     Production Approval               │
  │  (Creates tracking issue)             │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌────────────────────────────────────────────────────────┐
  │                Current State: BLUE Active              │
  │                                                         │
  │   ┌─────────────────┐      ┌─────────────────┐       │
  │   │  BLUE (Active)  │      │  GREEN (New)     │       │
  │   │                 │      │                  │       │
  │   │   API: v1.0.0   │      │   API: v1.1.0    │       │
  │   │   Web: v1.0.0   │      │   Web: v1.1.0    │       │
  │   │   Replicas: 5   │      │   Replicas: 5    │       │
  │   └─────────────────┘      └─────────────────┘       │
  │          │                         │                   │
  │          │                         │                   │
  │   ┌──────▼──────────────────────────▼───────┐         │
  │   │         Load Balancer                    │         │
  │   │      (Routes to BLUE)                    │         │
  │   └──────────────────────────────────────────┘         │
  └────────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │    Deploy GREEN Environment           │
  ├──────────────────────────────────────┤
  │  1. Backup current state             │
  │  2. Run DB migrations                │
  │  3. Deploy GREEN alongside BLUE      │
  │  4. Wait for GREEN rollout           │
  │  5. Annotate GREEN deployments       │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │      Test GREEN Environment           │
  ├──────────────────────────────────────┤
  │  1. Port forward to GREEN services   │
  │  2. Run smoke tests                  │
  │  3. Run integration tests            │
  │  4. Performance validation           │
  │  5. Health checks                    │
  └─────────────────┬────────────────────┘
                    │
                    ├── Tests Pass ─────┐
                    │                   │
                    ▼                   ▼
  ┌────────────────────────────────────────────────────────┐
  │              Switch Traffic to GREEN                    │
  │                                                         │
  │   ┌─────────────────┐      ┌─────────────────┐       │
  │   │  BLUE (Standby) │      │  GREEN (Active)  │       │
  │   │                 │      │                  │       │
  │   │   API: v1.0.0   │      │   API: v1.1.0    │       │
  │   │   Web: v1.0.0   │      │   Web: v1.1.0    │       │
  │   │   Replicas: 5   │      │   Replicas: 5    │       │
  │   └─────────────────┘      └─────────────────┘       │
  │          │                         │                   │
  │          │                         │                   │
  │   ┌──────▼──────────────────────────▼───────┐         │
  │   │         Load Balancer                    │         │
  │   │      (Routes to GREEN)                   │         │
  │   └──────────────────────────────────────────┘         │
  └────────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │      Monitor GREEN (2 minutes)        │
  ├──────────────────────────────────────┤
  │  • Check pod health                  │
  │  • Monitor error rates               │
  │  • Verify traffic routing            │
  └─────────────────┬────────────────────┘
                    │
                    ├── All Good ───────┐
                    │                   │
                    ▼                   ▼
  ┌──────────────────────────────────────┐
  │     Wait 10 minutes                   │
  │  (Safety period for rollback)         │
  └─────────────────┬────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────┐
  │    Scale Down BLUE                    │
  │  (Keep for quick rollback)            │
  └─────────────────┬────────────────────┘
                    │
                    ▼
              ┌──────────┐
              │  Notify  │
              │ Success  │
              └──────────┘
```

## Rollback Flow (Production)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Production Rollback                               │
└─────────────────────────────────────────────────────────────────────────┘

  Issue Detected
        │
        ▼
  ┌──────────────┐
  │   Decision:  │
  │   Rollback   │
  └──────┬───────┘
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │              Current State: GREEN Active                │
  │               (Having Issues)                           │
  │                                                         │
  │   ┌─────────────────┐      ┌─────────────────┐       │
  │   │  BLUE (Standby) │      │  GREEN (Active)  │       │
  │   │   (Working)     │      │    (Issues)      │       │
  │   │   Replicas: 0-5 │      │   Replicas: 5    │       │
  │   └─────────────────┘      └─────────────────┘       │
  └────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────┐
  │  Scale up    │
  │  BLUE (if    │
  │  needed)     │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Patch LB    │
  │  to route to │
  │    BLUE      │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Verify     │
  │  traffic on  │
  │    BLUE      │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    Health    │
  │   Checks on  │
  │    BLUE      │
  └──────┬───────┘
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │              Rollback Complete: BLUE Active             │
  │                                                         │
  │   ┌─────────────────┐      ┌─────────────────┐       │
  │   │  BLUE (Active)  │      │ GREEN (Standby)  │       │
  │   │   (Working)     │      │   (Issues)       │       │
  │   │   Replicas: 5   │      │   Replicas: 5    │       │
  │   └─────────────────┘      └─────────────────┘       │
  │          │                         │                   │
  │   ┌──────▼─────────────────────────────────┐          │
  │   │         Load Balancer                   │          │
  │   │      (Routes to BLUE)                   │          │
  │   └─────────────────────────────────────────┘          │
  └────────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────┐
  │    Notify    │
  │   Rollback   │
  │   Complete   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Investigate  │
  │    GREEN     │
  │   Issues     │
  └──────────────┘
```

## Database Migration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Database Migration Process                            │
└─────────────────────────────────────────────────────────────────────────┘

  Start Migration
        │
        ▼
  ┌──────────────┐
  │   Backup     │
  │   Database   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │    Run Migrations (Parallel)          │
  ├──────────────────────────────────────┤
  │                                       │
  │  ┌─────────────────────────────────┐ │
  │  │  schema.prisma                  │ │
  │  │  (Main application data)        │ │
  │  └──────────────┬──────────────────┘ │
  │                 │                     │
  │  ┌──────────────▼──────────────────┐ │
  │  │  schema-organization.prisma     │ │
  │  │  (Organization/tenant data)     │ │
  │  └──────────────┬──────────────────┘ │
  │                 │                     │
  │  ┌──────────────▼──────────────────┐ │
  │  │  schema-dropshipping.prisma     │ │
  │  │  (Dropshipping functionality)   │ │
  │  └──────────────┬──────────────────┘ │
  │                 │                     │
  │  ┌──────────────▼──────────────────┐ │
  │  │  schema-privacy.prisma          │ │
  │  │  (Privacy/compliance data)      │ │
  │  └──────────────┬──────────────────┘ │
  │                 │                     │
  └─────────────────┼─────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
      Success              Failure
         │                     │
         ▼                     ▼
  ┌──────────────┐      ┌──────────────┐
  │   Generate   │      │   Restore    │
  │   Prisma     │      │   Backup     │
  │   Clients    │      └──────┬───────┘
  └──────┬───────┘             │
         │                     ▼
         ▼              ┌──────────────┐
  ┌──────────────┐     │    Halt      │
  │   Continue   │     │  Deployment  │
  │  Deployment  │     └──────────────┘
  └──────────────┘
```

## Health Check Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Health Check Process                             │
└─────────────────────────────────────────────────────────────────────────┘

  Deployment Complete
        │
        ▼
  ┌──────────────┐
  │  Wait 30-45  │
  │   seconds    │
  │  (pod start) │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────┐
  │      API Health Check         │
  ├──────────────────────────────┤
  │                               │
  │  GET /api/health/live         │
  │  ┌────────────────────────┐  │
  │  │ Pod is alive?          │  │
  │  │ Database connected?    │  │
  │  │ Redis connected?       │  │
  │  └────┬───────────────────┘  │
  │       │                       │
  │       ├── 200 OK ──┐          │
  │       │            │          │
  │       ▼            │          │
  │  GET /api/health/ready        │
  │  ┌────────────────────────┐  │
  │  │ Ready to serve?        │  │
  │  │ All services up?       │  │
  │  │ Can handle traffic?    │  │
  │  └────┬───────────────────┘  │
  │       │                       │
  └───────┼───────────────────────┘
          │
          ▼
  ┌──────────────────────────────┐
  │      Web Health Check         │
  ├──────────────────────────────┤
  │                               │
  │  GET /health                  │
  │  ┌────────────────────────┐  │
  │  │ App is running?        │  │
  │  │ Next.js ready?         │  │
  │  │ API reachable?         │  │
  │  └────┬───────────────────┘  │
  │       │                       │
  └───────┼───────────────────────┘
          │
          ├── All Pass ──────┐
          │                  │
          ▼                  ▼
    ┌──────────┐      ┌──────────┐
    │ Continue │      │  Report  │
    │   With   │      │  Success │
    │   Tests  │      └──────────┘
    └──────────┘
          │
          ├── Any Fail ──────┐
          │                  │
          ▼                  ▼
    ┌──────────┐      ┌──────────┐
    │ Rollback │      │  Report  │
    │   Auto   │      │  Failure │
    └──────────┘      └──────────┘
```

## OIDC Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Azure OIDC Authentication Flow                              │
└─────────────────────────────────────────────────────────────────────────┘

  GitHub Actions Workflow Starts
            │
            ▼
  ┌──────────────────────┐
  │  GitHub generates    │
  │  OIDC token for      │
  │  workflow            │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │  azure/login action  │
  │  exchanges token     │
  │  with Azure AD       │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────────────────┐
  │     Azure AD Validation          │
  ├──────────────────────────────────┤
  │  • Verify token signature        │
  │  • Check issuer (GitHub)         │
  │  • Validate subject claim        │
  │  • Check audience                │
  └──────────┬───────────────────────┘
             │
             ├── Valid ──────────┐
             │                   │
             ▼                   ▼
  ┌──────────────────────┐
  │  Azure AD issues     │
  │  access token for    │
  │  Azure resources     │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │  Workflow accesses   │
  │  AKS cluster using   │
  │  Azure credentials   │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │  kubelogin converts  │
  │  kubeconfig to use   │
  │  Azure CLI auth      │
  └──────────┬───────────┘
             │
             ▼
  ┌──────────────────────┐
  │  kubectl commands    │
  │  use Azure auth      │
  │  automatically       │
  └──────────────────────┘
```

## Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Notification Flow                                   │
└─────────────────────────────────────────────────────────────────────────┘

  Deployment Event
        │
        ├─────── Success ───────┐
        │                       │
        ▼                       ▼
  ┌──────────────┐      ┌──────────────┐
  │   Slack      │      │   GitHub     │
  │ Notification │      │    Issue     │
  │  (Success)   │      │  (Prod only) │
  └──────┬───────┘      └──────┬───────┘
         │                     │
         ▼                     ▼
  ┌──────────────────────────────────┐
  │  Message includes:                │
  │  • Environment                    │
  │  • Deployment ID                  │
  │  • Image tag                      │
  │  • Deployer                       │
  │  • URL                            │
  │  • Commit SHA                     │
  └───────────────────────────────────┘
         │
         │
  ┌──────┴─── Failure ────────┐
  │                            │
  ▼                            ▼
┌──────────────┐      ┌──────────────┐
│   Slack      │      │  PagerDuty   │
│ Notification │      │   Alert      │
│  (Failure)   │      │  (Prod only) │
└──────┬───────┘      └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────────┐
│  Alert includes:                  │
│  • Environment                    │
│  • Error details                  │
│  • Workflow URL                   │
│  • Rollback status                │
│  • On-call engineer               │
└───────────────────────────────────┘
```

## Key Timing Metrics

### Development
- **Total Time:** 5-8 minutes
  - Setup & Auth: 1-2 min
  - Migrations: 30-60 sec
  - Deployment: 2-3 min
  - Health Checks: 1 min
  - Tests: 1-2 min

### Staging
- **Total Time:** 15-20 minutes
  - Pre-validation: 2-3 min
  - Approval: Variable (manual)
  - Setup & Auth: 1-2 min
  - Migrations: 1-2 min
  - Deployment: 3-5 min
  - Health Checks: 1-2 min
  - Smoke Tests: 3-5 min
  - Integration Tests: 2-3 min

### Production (Blue-Green)
- **Total Time:** 30-45 minutes
  - Pre-validation: 5 min
  - Approval: Variable (manual)
  - Deploy GREEN: 10-12 min
  - Test GREEN: 5-8 min
  - Switch Traffic: 1 min
  - Monitor: 2 min
  - Safety Period: 10 min
  - Cleanup: 2 min

### Production (Rolling)
- **Total Time:** 15-20 minutes
  - Pre-validation: 5 min
  - Approval: Variable (manual)
  - Deployment: 8-10 min
  - Health Checks: 2-3 min
  - Monitoring: 2 min
