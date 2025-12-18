# Security Scanning Workflows Documentation

## Overview

This directory contains comprehensive security scanning workflows that automatically detect vulnerabilities, secrets, and compliance issues in your codebase. These workflows help maintain a strong security posture by catching issues early in the development lifecycle.

## Quick Reference

| Workflow | Purpose | When It Runs | Blocks PR? |
|----------|---------|--------------|------------|
| `sast.yml` | Static code analysis | Push, PR, Weekly | Yes (Critical/High) |
| `dependency-scan.yml` | Dependency vulnerabilities | Push, PR, Weekly | Yes (Critical/High) |
| `container-scan.yml` | Container security | Push, PR, Weekly | Yes (Critical) |
| `secret-scan.yml` | Secret detection | Push, PR, Weekly | Yes (Any secrets) |
| `api-security-test.yml` | API security testing | Push, PR, Weekly | No (Reports only) |
| `compliance-check.yml` | Compliance validation | Push, PR, Weekly | No (Reports only) |

## Workflows Overview

### 1. SAST - Static Application Security Testing (`sast.yml`)

**Purpose**: Analyzes source code for security vulnerabilities without executing it.

**Tools Used**:
- **CodeQL**: GitHub's semantic code analysis engine
- **Semgrep**: Fast, customizable static analysis
- **ESLint Security**: JavaScript/TypeScript security linting

**What It Detects**:
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Insecure cryptography usage
- Command injection
- Path traversal
- Authentication/authorization flaws
- Security misconfigurations

**Results**: Uploaded to GitHub Security tab in SARIF format

### 2. Dependency Vulnerability Scanning (`dependency-scan.yml`)

**Purpose**: Identifies known vulnerabilities in third-party dependencies.

**Tools Used**:
- **NPM Audit**: Built-in npm vulnerability checker
- **Snyk**: Commercial vulnerability database (optional)
- **OSV Scanner**: Google's Open Source Vulnerabilities scanner
- **License Checker**: Validates license compliance

**What It Checks**:
- Known CVEs in dependencies
- Outdated packages
- Vulnerable transitive dependencies
- License compliance
- Dependency tree analysis

**Auto-remediation**: Provides fix suggestions for vulnerable packages

### 3. Container Security Scanning (`container-scan.yml`)

**Purpose**: Scans Docker images and configurations for security issues.

**Tools Used**:
- **Trivy**: Comprehensive container vulnerability scanner
- **Grype**: Vulnerability scanner for container images
- **Hadolint**: Dockerfile linter
- **Dockle**: Docker image security checker
- **Docker Bench Security**: CIS Docker Benchmark validation

**What It Detects**:
- Vulnerabilities in base images
- Vulnerabilities in installed packages
- Dockerfile best practice violations
- Container misconfigurations
- Exposed secrets in images
- Compliance with CIS Docker Benchmark

**Results**: SARIF reports uploaded to GitHub Security

### 4. Secret Detection (`secret-scan.yml`)

**Purpose**: Prevents accidental exposure of secrets, credentials, and sensitive data.

**Tools Used**:
- **Gitleaks**: Fast secret scanner for git repositories
- **TruffleHog**: High-entropy string detector
- **Detect-Secrets**: Pattern-based secret detection
- **Secretlint**: Configurable secret linting
- **Git-Secrets**: AWS-focused secret prevention

**What It Detects**:
- API keys and tokens
- AWS credentials
- Database connection strings
- Private keys
- Passwords and authentication tokens
- OAuth secrets
- JWT tokens
- Webhook URLs with secrets

**Critical**: This workflow BLOCKS all PRs if secrets are detected

### 5. API Security Testing (`api-security-test.yml`)

**Purpose**: Tests API endpoints for security vulnerabilities.

**Tools Used**:
- **OWASP ZAP**: Industry-standard security scanner
- **Custom Fuzzing**: Tests with malicious payloads
- **Authentication Testing**: Validates auth mechanisms
- **Rate Limiting Tests**: Checks DoS protection

**What It Tests**:
- SQL injection in API endpoints
- Cross-site scripting (XSS)
- Authentication bypass
- Authorization flaws
- API rate limiting
- Input validation
- OWASP API Security Top 10

**Coverage**: Tests against OWASP API Security Top 10 2023

### 6. Compliance Validation (`compliance-check.yml`)

**Purpose**: Validates compliance with security standards and frameworks.

**Frameworks Covered**:
- **OWASP Top 10 2021**: Web application security risks
- **CIS Benchmarks**: Docker and Node.js configuration standards
- **PCI-DSS**: Payment card data security requirements
- **Security Headers**: HTTP security headers validation

**What It Validates**:
- Security control implementation
- Configuration best practices
- Logging and monitoring setup
- Access control mechanisms
- Data protection measures
- Vulnerability management
- Trend analysis over time

**Reports**: Comprehensive checklists and automated validation

## Setup Instructions

### 1. Required Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# Optional but recommended
SNYK_TOKEN                    # For Snyk scanning (get from snyk.io)
GITLEAKS_LICENSE             # For Gitleaks premium features (optional)

# For notifications (optional)
SLACK_SECURITY_WEBHOOK       # Slack webhook URL for security alerts
TEAMS_SECURITY_WEBHOOK       # Microsoft Teams webhook URL
```

### 2. Enable GitHub Security Features

1. Go to `Settings > Code security and analysis`
2. Enable:
   - **Dependency graph**
   - **Dependabot alerts**
   - **Dependabot security updates**
   - **Code scanning** (for CodeQL)
   - **Secret scanning**

### 3. Configure Branch Protection

Recommended settings for `main` and `develop` branches:

```yaml
# Settings > Branches > Branch protection rules
Require status checks to pass before merging:
  - SAST - CodeQL Security Analysis
  - Semgrep Security Scan
  - NPM Audit
  - Gitleaks Secret Scanning
  - TruffleHog Secret Scanning

Require branches to be up to date before merging: ✓
```

### 4. Customize Scan Configurations

#### For SAST (CodeQL):
Create `.github/codeql/codeql-config.yml`:
```yaml
name: "CodeQL Config"
queries:
  - uses: security-and-quality
  - uses: security-extended
paths-ignore:
  - node_modules
  - dist
  - test
```

#### For Secret Scanning (Gitleaks):
Create `.gitleaks.toml`:
```toml
[allowlist]
description = "Allowlisted files"
paths = [
  '''node_modules/''',
  '''\.git/'''
]
```

#### For Container Scanning (Trivy):
Create `.trivyignore` to suppress known issues:
```
# Example: Suppress specific CVE
CVE-2021-12345
```

## Usage

### Running Manually

You can trigger any workflow manually:

1. Go to `Actions` tab
2. Select the workflow
3. Click `Run workflow`
4. Choose branch and options

### Viewing Results

#### Security Tab
- Navigate to `Security > Code scanning alerts`
- View all SARIF-uploaded results
- Filter by severity, tool, or status

#### Workflow Artifacts
Each workflow uploads detailed reports as artifacts:
- Available for 30-90 days
- Download from workflow run page
- Includes JSON, HTML, and Markdown reports

#### Job Summaries
Quick overview visible in workflow run:
- Severity counts
- Key findings
- Remediation suggestions

## Handling Security Issues

### Critical/High Severity Vulnerabilities

1. **Review the finding**
   - Check the Security tab for details
   - Review SARIF results in workflow artifacts
   - Verify it's not a false positive

2. **Remediate immediately**
   - Update vulnerable dependencies
   - Fix code vulnerabilities
   - Apply security patches

3. **Verify the fix**
   - Re-run the workflow
   - Ensure issue is resolved
   - Check for regression

### Secret Detection Alerts

If secrets are detected:

1. **DO NOT MERGE THE PR**
2. **Immediately revoke/rotate the exposed secret**
3. **Remove from code and git history**:
   ```bash
   # Using git filter-repo (recommended)
   git filter-repo --path-glob '**/*secret*' --invert-paths

   # Or use BFG Repo-Cleaner
   bfg --delete-files secret.key
   ```
4. **Add to .gitignore**
5. **Use environment variables or secret management**

### Dependency Vulnerabilities

For vulnerable dependencies:

1. **Check for updates**:
   ```bash
   npm audit
   npm audit fix
   ```

2. **For breaking changes**:
   ```bash
   npm audit fix --force
   # Test thoroughly after forcing updates
   ```

3. **If no fix available**:
   - Look for alternative packages
   - Implement workarounds
   - Accept risk (document decision)

### Container Vulnerabilities

1. **Update base image**:
   ```dockerfile
   # Use specific versions, not 'latest'
   FROM node:20.10.0-alpine
   ```

2. **Minimize attack surface**:
   ```dockerfile
   # Use distroless or alpine images
   FROM gcr.io/distroless/nodejs20-debian11
   ```

3. **Multi-stage builds**:
   ```dockerfile
   FROM node:20 AS builder
   # ... build steps

   FROM node:20-alpine
   COPY --from=builder /app /app
   ```

## Notification Setup

### Slack Integration

1. Create Slack webhook:
   - Go to Slack Apps > Incoming Webhooks
   - Create webhook for #security channel
   - Copy webhook URL

2. Add to GitHub secrets:
   ```
   SLACK_SECURITY_WEBHOOK = https://hooks.slack.com/services/...
   ```

### Microsoft Teams Integration

1. Create Teams webhook:
   - Go to Teams channel > Connectors
   - Configure Incoming Webhook
   - Copy webhook URL

2. Add to GitHub secrets:
   ```
   TEAMS_SECURITY_WEBHOOK = https://outlook.office.com/webhook/...
   ```

## Best Practices

### Development Workflow

1. **Pre-commit hooks**: Install local security scanning
   ```bash
   # Install pre-commit
   pip install pre-commit

   # .pre-commit-config.yaml
   repos:
     - repo: https://github.com/gitleaks/gitleaks
       rev: latest
       hooks:
         - id: gitleaks
   ```

2. **Local scanning before push**:
   ```bash
   # Run npm audit
   npm audit

   # Scan for secrets
   gitleaks detect --source . --verbose

   # Lint Dockerfile
   hadolint Dockerfile
   ```

3. **Regular dependency updates**:
   - Enable Dependabot
   - Review and merge dependency PRs weekly
   - Test thoroughly after updates

### Security Response

1. **Triage process**:
   - Critical: Fix within 24 hours
   - High: Fix within 1 week
   - Medium: Fix within 1 month
   - Low: Fix in next release

2. **Documentation**:
   - Document all security decisions
   - Track false positives
   - Maintain security runbook

3. **Regular reviews**:
   - Weekly: Review open security alerts
   - Monthly: Review compliance status
   - Quarterly: Update security tools and policies

## Troubleshooting

### Common Issues

**Issue**: CodeQL runs too long
**Solution**: Exclude test files and large dependencies in config

**Issue**: Too many false positives
**Solution**: Configure tool-specific ignore files (`.trivyignore`, `.gitleaks.toml`)

**Issue**: Workflow fails on PR from fork
**Solution**: This is expected for security - forks don't have access to secrets

**Issue**: Container scan fails to load image
**Solution**: Ensure Docker build step completes successfully before scan

### Performance Optimization

1. **Cache dependencies**:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

2. **Run scans in parallel**:
   - Jobs are already parallelized
   - Independent scans run concurrently

3. **Use matrix strategies**:
   - CodeQL already uses matrix for multiple languages
   - Consider for multiple Node versions if needed

## Metrics and Reporting

### Key Metrics to Track

- **Mean Time to Remediate (MTTR)**: Time from detection to fix
- **Vulnerability Density**: Issues per 1000 lines of code
- **False Positive Rate**: False positives / Total findings
- **Scan Coverage**: Percentage of code scanned
- **Trend Analysis**: Vulnerability count over time

### Compliance Reporting

The workflows automatically generate:
- Weekly compliance summaries
- Vulnerability trend analysis
- Audit-ready reports
- SARIF for tool integration

## Additional Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [GitHub Security Features](https://docs.github.com/en/code-security)

### Tools Documentation
- [CodeQL](https://codeql.github.com/docs/)
- [Semgrep](https://semgrep.dev/docs/)
- [Trivy](https://aquasecurity.github.io/trivy/)
- [OWASP ZAP](https://www.zaproxy.org/docs/)
- [Gitleaks](https://github.com/gitleaks/gitleaks)

### Security Training
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/)
- [SANS Security Training](https://www.sans.org/)
- [Secure Code Warrior](https://www.securecodewarrior.com/)

## Support and Maintenance

### Regular Updates

Update security tools quarterly:

```yaml
# In workflows, update action versions
- uses: github/codeql-action/analyze@v3  # Check for v4
- uses: aquasecurity/trivy-action@master  # Pin to specific version
```

### Security Team Contacts

For security incidents or questions:
- **Security Team**: security@yourcompany.com
- **On-Call**: Use PagerDuty/Opsgenie
- **Slack**: #security-alerts

## Workflow Customization

### Adjusting Severity Thresholds

Edit the workflow files to change blocking behavior:

```yaml
# sast.yml - Change threshold
env:
  SEVERITY_THRESHOLD: 'critical'  # Only block critical, allow high
```

### Adding Custom Checks

Add job to existing workflow:

```yaml
jobs:
  custom-security-check:
    name: Custom Security Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run custom script
        run: ./scripts/custom-security-check.sh
```

### Integration with Other Tools

Example: Integrate with Jira for issue tracking:

```yaml
- name: Create Jira ticket for critical findings
  if: failure()
  uses: atlassian/gajira-create@v3
  with:
    project: SEC
    issuetype: Bug
    summary: "Critical security vulnerability detected"
```

## License and Attribution

These workflows use open-source security tools and GitHub Actions. Refer to individual tool licenses for usage terms.

## Changelog

- **2025-12-10**: Initial creation of security workflows
  - Added SAST with CodeQL and Semgrep
  - Added dependency scanning with multiple tools
  - Added container security scanning
  - Added secret detection workflows
  - Added API security testing
  - Added compliance validation

---

**Questions or Issues?**

- Open an issue in the repository
- Contact the security team
- Review the GitHub Actions documentation
