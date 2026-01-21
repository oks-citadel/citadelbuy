# Broxiva Deployment Security Policy

**Version:** 1.0.0
**Effective Date:** 2026-01-05
**Owner:** Platform Engineering & Security Teams
**Review Cycle:** Quarterly

---

## 1. Purpose

This policy establishes mandatory security controls and governance requirements for all deployments to the Broxiva E-Commerce Platform infrastructure. Compliance is mandatory for all engineering personnel.

---

## 2. Scope

This policy applies to:
- All production deployments
- All staging deployments
- All development environment changes
- Infrastructure as Code (IaC) modifications
- Container image builds and pushes
- Kubernetes manifest changes

---

## 3. Deployment Governance Principles

### 3.1 Separation of Duties
- **Principle:** No single individual can both develop and deploy code to production
- **Implementation:**
  - Pull request author cannot approve their own PR
  - Production deployments require approval from CODEOWNERS
  - Deployment automation uses service accounts, not personal credentials

### 3.2 Least Privilege
- **Principle:** Access should be limited to the minimum necessary
- **Implementation:**
  - OIDC federation for CI/CD (no static credentials)
  - Time-limited session tokens
  - Environment-scoped secrets

### 3.3 Defense in Depth
- **Principle:** Multiple security layers must be passed
- **Implementation:**
  - CodeQL SAST analysis required
  - Container vulnerability scanning required
  - Multiple quality gates before deployment

---

## 4. Pipeline Security Requirements

### 4.1 Required Quality Gates

All deployments MUST pass the following gates in sequence:

| Gate | Description | Failure Action |
|------|-------------|----------------|
| Lint | ESLint code quality | Block deployment |
| Type Check | TypeScript validation | Block deployment |
| Unit Tests | Test suite execution | Block deployment |
| Build | Application compilation | Block deployment |
| CodeQL | Static security analysis | Block deployment |
| Trivy Scan | Container vulnerability scan | Block deployment (CRITICAL/HIGH) |

### 4.2 Security Scanning Requirements

**Static Application Security Testing (SAST):**
- CodeQL analysis must pass with no HIGH or CRITICAL findings
- Security queries enabled for JavaScript/TypeScript
- Results uploaded to GitHub Security tab

**Container Scanning:**
- Trivy scanner with exit-code: 1 on CRITICAL/HIGH
- Scan both API and Web images before push
- Results stored as build artifacts

**Software Bill of Materials (SBOM):**
- Generated using Syft for each build
- CycloneDX JSON format
- Retained for compliance audits

### 4.3 Artifact Integrity

**Container Image Tags:**
- Production: Only SHA-based immutable tags
- Format: `${{ github.sha }}`
- Mutable tags (e.g., `latest`) are PROHIBITED in production

**Build Artifacts:**
- Versioned with commit SHA
- Stored for 7 days minimum
- Signed artifacts recommended for high-security deployments

---

## 5. Environment Promotion Policy

### 5.1 Environment Hierarchy

```
Development -> Staging -> Production
```

### 5.2 Promotion Requirements

| Transition | Requirements |
|------------|--------------|
| Dev -> Staging | All quality gates pass, main branch only |
| Staging -> Production | Staging health check pass, manual approval, scheduled window |

### 5.3 Production Deployment Windows

**Scheduled Deployments:**
- Primary: Tuesday evenings (9 PM CST / 03:00 UTC Wednesday)
- Unified releases bundle accumulated changes

**Emergency Deployments:**
- Require `force_deploy` flag
- Require documented justification
- Require incident commander approval

---

## 6. Approval Requirements

### 6.1 Code Review

| Change Type | Minimum Reviewers | Required Teams |
|-------------|-------------------|----------------|
| Application code | 1 | Team leads |
| Infrastructure (Terraform) | 2 | Platform, Security |
| CI/CD workflows | 2 | Platform, Security |
| Security-sensitive files | 2 | Security team mandatory |
| Database schema | 2 | Backend, DBA |

### 6.2 Deployment Approval

**Staging Environment:**
- Automatic after build success
- No manual approval required

**Production Environment:**
- Manual trigger required (workflow_dispatch)
- Minimum 2 reviewers from different teams
- Non-author approval enforced
- Optional: 10-minute wait timer

### 6.3 CODEOWNERS Configuration

Critical paths requiring security team review:
```
/.github/                    @broxiva/platform-team @broxiva/security-team
/organization/infrastructure/ @broxiva/platform-team @broxiva/security-team
*.env*                       @broxiva/security-team
**/secrets*                  @broxiva/security-team
```

---

## 7. Rollback Policy

### 7.1 Automatic Rollback

Deployments automatically rollback when:
- Health check fails after deployment
- Rollout timeout exceeded (300s)
- Container crash loop detected

### 7.2 Manual Rollback

Manual rollback is available for:
- Performance degradation detected
- Business logic issues discovered
- Security vulnerability identified

**Rollback Command:**
```bash
./organization/infrastructure/scripts/rollback-release.sh prod [target]
```

**Target Options:**
- `previous` - Roll back to previous revision
- `revision-N` - Roll back to specific revision number
- `v1.2.3` - Roll back to specific version tag

### 7.3 Production Rollback Requirements

1. Type "ROLLBACK PRODUCTION" to confirm
2. Complete pre-rollback checklist:
   - Root cause identified
   - Incident documented
   - Stakeholders notified
   - Backup created
3. Incident report auto-generated

---

## 8. Access Control

### 8.1 CI/CD Authentication

**AWS Access:**
- OIDC federation preferred
- GitHub Actions Identity Provider configured
- Session tokens valid for single workflow run

**Kubernetes Access:**
- Service account with limited RBAC
- Namespace-scoped permissions
- No cluster-admin access

### 8.2 Secret Management

**Prohibited:**
- Secrets in code or configuration files
- Long-lived credentials in CI/CD
- Shared credentials across environments

**Required:**
- GitHub Secrets for sensitive values
- AWS Secrets Manager for runtime secrets
- Rotation every 90 days minimum

---

## 9. Monitoring and Audit

### 9.1 Deployment Tracking

All deployments are tracked with:
- Git commit SHA
- Kubernetes change-cause annotation
- Deployment timestamp
- Deploying user/service

### 9.2 Audit Logs

Maintained records of:
- GitHub Actions workflow runs
- AWS CloudTrail for infrastructure changes
- Kubernetes audit logs for cluster operations

### 9.3 Alerting

Alerts configured for:
- Failed deployments
- Rollback events
- Unauthorized deployment attempts
- Security scan failures

---

## 10. Compliance Requirements

### 10.1 Pre-Deployment Checklist

Before any production deployment:
- [ ] All quality gates passed
- [ ] CodeQL analysis completed
- [ ] Container scans clean
- [ ] Staging deployment successful
- [ ] Staging health checks passed
- [ ] Required approvals obtained
- [ ] Deployment window confirmed

### 10.2 Post-Deployment Verification

After production deployment:
- [ ] Health endpoints responding
- [ ] No new errors in monitoring
- [ ] Performance metrics stable
- [ ] Customer-facing functionality verified

### 10.3 Documentation Requirements

- Change request documented
- Deployment notes updated
- Runbook modifications (if applicable)
- Incident report (if emergency deployment)

---

## 11. Exceptions

### 11.1 Exception Process

Exceptions to this policy require:
1. Written justification
2. Security team approval
3. Time-limited scope
4. Compensating controls documented

### 11.2 Emergency Procedures

In case of critical security incident:
1. Security team can authorize immediate deployment
2. `force_deploy` flag enabled
3. Post-incident review required within 24 hours
4. Exception documented in incident report

---

## 12. Policy Violations

### 12.1 Violation Response

| Severity | Example | Response |
|----------|---------|----------|
| Critical | Bypassing security scans | Immediate access revocation, incident report |
| High | Deploying without approval | Warning, mandatory retraining |
| Medium | Skipping staging | Warning, process review |
| Low | Documentation incomplete | Feedback, process improvement |

### 12.2 Reporting

Report policy violations to:
- security@broxiva.com
- Platform Engineering Lead
- CISO (for Critical violations)

---

## 13. Review and Updates

This policy is reviewed:
- Quarterly for routine updates
- After security incidents
- After major infrastructure changes
- Upon regulatory requirement changes

---

## Appendix A: Quick Reference

### Deployment Commands

```bash
# Trigger production deployment (GitHub CLI)
gh workflow run ci-cd.yml -f deploy=true

# View deployment status
gh run list --workflow=ci-cd.yml

# Manual rollback
./organization/infrastructure/scripts/rollback-release.sh prod previous

# View deployment history
kubectl rollout history deployment/broxiva-api -n broxiva
```

### Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci-cd.yml` | Main CI/CD pipeline |
| `.github/CODEOWNERS` | Review requirements |
| `organization/infrastructure/scripts/rollback-release.sh` | Rollback script |
| `organization/infrastructure/scripts/promote-release.sh` | Environment promotion |

---

**Document Control:**
- Created: 2026-01-05
- Last Modified: 2026-01-05
- Next Review: 2026-04-05
- Classification: Internal
