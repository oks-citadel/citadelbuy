# Security Workflows Setup Checklist

Use this checklist to ensure your security scanning workflows are properly configured and operational.

## ✅ Pre-Deployment Checklist

### GitHub Repository Settings

- [ ] **Enable GitHub Security Features**
  - [ ] Navigate to `Settings > Code security and analysis`
  - [ ] Enable "Dependency graph"
  - [ ] Enable "Dependabot alerts"
  - [ ] Enable "Dependabot security updates"
  - [ ] Enable "Code scanning" (CodeQL)
  - [ ] Enable "Secret scanning"
  - [ ] Enable "Push protection" for secrets

### Required Secrets Configuration

- [ ] **Add Optional Secrets** (recommended for enhanced scanning)
  - [ ] `SNYK_TOKEN` - Get from [snyk.io](https://snyk.io) (free tier available)
  - [ ] `GITLEAKS_LICENSE` - Optional premium features
  - [ ] `SLACK_SECURITY_WEBHOOK` - For security alerts
  - [ ] `TEAMS_SECURITY_WEBHOOK` - For Microsoft Teams alerts

**How to add secrets**:
1. Go to `Settings > Secrets and variables > Actions`
2. Click "New repository secret"
3. Enter name and value
4. Click "Add secret"

### Branch Protection Rules

- [ ] **Configure for `main` branch**
  - [ ] Go to `Settings > Branches > Add rule`
  - [ ] Branch name pattern: `main`
  - [ ] ✅ Require status checks to pass before merging
  - [ ] Select required checks:
    - [ ] `CodeQL Security Analysis`
    - [ ] `Semgrep Security Scan`
    - [ ] `NPM Audit`
    - [ ] `Gitleaks Secret Scanning`
    - [ ] `TruffleHog Secret Scanning`
  - [ ] ✅ Require branches to be up to date
  - [ ] ✅ Require conversation resolution before merging

- [ ] **Configure for `develop` branch** (same settings as main)

### Workflow Files Verification

- [ ] Verify all workflow files are present:
  - [ ] `sast.yml` (13KB)
  - [ ] `dependency-scan.yml` (17KB)
  - [ ] `container-scan.yml` (20KB)
  - [ ] `secret-scan.yml` (21KB)
  - [ ] `api-security-test.yml` (25KB)
  - [ ] `compliance-check.yml` (38KB)

## 🔧 Configuration Files

### Create Configuration Files (Optional but Recommended)

#### 1. CodeQL Configuration
- [ ] Create `.github/codeql/codeql-config.yml`

```yaml
name: "CodeQL Config"
queries:
  - uses: security-and-quality
  - uses: security-extended

paths-ignore:
  - node_modules
  - dist
  - build
  - coverage
  - '**/*.test.ts'
  - '**/*.test.js'
  - '**/*.spec.ts'
  - '**/*.spec.js'
```

#### 2. Gitleaks Configuration
- [ ] Create `.gitleaks.toml`

```toml
title = "Gitleaks Config"

[allowlist]
description = "Allowlisted files and patterns"
paths = [
  '''node_modules/''',
  '''\.git/''',
  '''dist/''',
  '''build/''',
]

# Allowlist specific findings
[[allowlist.regexes]]
description = "Ignore test tokens"
regex = '''test-token-[a-zA-Z0-9]{16}'''

[allowlist.commits]
description = "Known safe commits"
commits = []
```

#### 3. Trivy Configuration
- [ ] Create `.trivyignore` (for known false positives)

```
# Example: Suppress specific CVEs that are false positives or accepted risks
# CVE-2021-12345

# Document why each CVE is ignored
```

#### 4. Docker Configuration
- [ ] Create `.dockerignore` (if not exists)

```
node_modules
npm-debug.log
.env
.env.*
!.env.example
.git
.gitignore
README.md
.github
coverage
dist
build
*.test.ts
*.test.js
*.spec.ts
*.spec.js
```

#### 5. ESLint Security Configuration
- [ ] Update `.eslintrc.json` or `.eslintrc.js`

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:security/recommended"
  ],
  "plugins": [
    "security",
    "no-secrets"
  ],
  "rules": {
    "no-secrets/no-secrets": "error",
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error"
  }
}
```

## 🧪 Initial Testing

### Test Each Workflow

- [ ] **Test SAST Workflow**
  ```bash
  # Trigger manually or push to trigger branch
  git add .
  git commit -m "test: trigger SAST workflow"
  git push
  ```
  - [ ] Verify CodeQL runs successfully
  - [ ] Check Semgrep results
  - [ ] Review Security tab for findings

- [ ] **Test Dependency Scan**
  ```bash
  # Run npm audit locally first
  npm audit

  # Fix if possible
  npm audit fix

  # Then commit and push
  git add package-lock.json
  git commit -m "chore: update dependencies"
  git push
  ```
  - [ ] Verify npm audit runs
  - [ ] Check OSV scanner results
  - [ ] Review dependency reports

- [ ] **Test Container Scan**
  ```bash
  # Ensure Dockerfile exists and builds
  docker build -t test-image .

  # Trigger workflow
  git add Dockerfile
  git commit -m "chore: update Dockerfile"
  git push
  ```
  - [ ] Verify Trivy scan completes
  - [ ] Check Hadolint results
  - [ ] Review container security findings

- [ ] **Test Secret Scan**
  ```bash
  # Test locally first (should find no secrets)
  gitleaks detect --source . --verbose

  # Trigger workflow
  git push
  ```
  - [ ] Verify Gitleaks runs
  - [ ] Check TruffleHog results
  - [ ] Ensure no secrets detected

- [ ] **Test API Security** (if applicable)
  - [ ] Ensure API endpoints are available
  - [ ] Verify OWASP ZAP scan runs
  - [ ] Review API security findings

- [ ] **Test Compliance Check**
  - [ ] Verify OWASP Top 10 check runs
  - [ ] Check CIS benchmark results
  - [ ] Review compliance report

### Verify Results

- [ ] **Check GitHub Security Tab**
  - [ ] Navigate to `Security > Code scanning alerts`
  - [ ] Verify alerts are appearing
  - [ ] Review and triage findings

- [ ] **Check Workflow Artifacts**
  - [ ] Go to `Actions > [Workflow Run]`
  - [ ] Download artifacts
  - [ ] Review JSON/HTML reports

- [ ] **Check Notifications** (if configured)
  - [ ] Verify Slack/Teams notifications work
  - [ ] Test failure notifications
  - [ ] Adjust notification settings if needed

## 🔐 Local Development Setup

### Install Pre-commit Hooks

- [ ] **Install pre-commit framework**
  ```bash
  pip install pre-commit
  # or
  brew install pre-commit
  ```

- [ ] **Create `.pre-commit-config.yaml`**
  ```yaml
  repos:
    - repo: https://github.com/gitleaks/gitleaks
      rev: v8.18.1
      hooks:
        - id: gitleaks

    - repo: https://github.com/pre-commit/pre-commit-hooks
      rev: v4.5.0
      hooks:
        - id: check-added-large-files
        - id: check-json
        - id: check-yaml
        - id: detect-private-key
        - id: end-of-file-fixer
        - id: trailing-whitespace

    - repo: https://github.com/hadolint/hadolint
      rev: v2.12.0
      hooks:
        - id: hadolint-docker
  ```

- [ ] **Install hooks**
  ```bash
  pre-commit install
  pre-commit run --all-files
  ```

### Install Security Tools Locally

- [ ] **Install Gitleaks**
  ```bash
  # macOS
  brew install gitleaks

  # Linux
  wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
  tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
  sudo mv gitleaks /usr/local/bin/

  # Windows
  choco install gitleaks
  ```

- [ ] **Install Trivy**
  ```bash
  # macOS
  brew install trivy

  # Linux
  wget https://github.com/aquasecurity/trivy/releases/download/v0.48.0/trivy_0.48.0_Linux-64bit.tar.gz
  tar -xzf trivy_0.48.0_Linux-64bit.tar.gz
  sudo mv trivy /usr/local/bin/

  # Windows
  choco install trivy
  ```

- [ ] **Install Hadolint**
  ```bash
  # macOS
  brew install hadolint

  # Linux
  wget -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64
  chmod +x /usr/local/bin/hadolint

  # Windows
  choco install hadolint
  ```

- [ ] **Install Semgrep**
  ```bash
  pip install semgrep
  # or
  brew install semgrep
  ```

## 📊 Monitoring and Maintenance

### Weekly Tasks

- [ ] **Review Security Alerts**
  - [ ] Check GitHub Security tab
  - [ ] Triage new findings
  - [ ] Assign remediation tasks

- [ ] **Review Dependabot PRs**
  - [ ] Check for dependency updates
  - [ ] Review and test updates
  - [ ] Merge security updates

- [ ] **Check Workflow Status**
  - [ ] Review failed workflows
  - [ ] Fix any configuration issues
  - [ ] Update ignored findings

### Monthly Tasks

- [ ] **Review Compliance Status**
  - [ ] Check OWASP Top 10 compliance
  - [ ] Review CIS benchmark results
  - [ ] Update compliance documentation

- [ ] **Update Security Tools**
  - [ ] Check for workflow action updates
  - [ ] Update tool versions
  - [ ] Test after updates

- [ ] **Security Metrics Review**
  - [ ] Track MTTR (Mean Time to Remediate)
  - [ ] Review vulnerability trends
  - [ ] Update security dashboard

### Quarterly Tasks

- [ ] **Security Policy Review**
  - [ ] Review and update security policies
  - [ ] Update severity thresholds if needed
  - [ ] Adjust blocking rules

- [ ] **Tool Evaluation**
  - [ ] Evaluate new security tools
  - [ ] Review false positive rates
  - [ ] Optimize workflow performance

- [ ] **Security Training**
  - [ ] Conduct team security training
  - [ ] Share security findings and lessons
  - [ ] Update security documentation

## 🚨 Incident Response

### If Secrets Are Detected

- [ ] **Immediate Actions** (within 1 hour)
  - [ ] DO NOT merge the PR/commit
  - [ ] Revoke/rotate the exposed secret immediately
  - [ ] Check logs for unauthorized access
  - [ ] Notify security team

- [ ] **Remediation** (within 24 hours)
  - [ ] Remove secret from code
  - [ ] Clean git history if already committed
  - [ ] Update secret management documentation
  - [ ] Add to .gitignore if applicable

- [ ] **Prevention** (within 1 week)
  - [ ] Review how secret was exposed
  - [ ] Update processes to prevent recurrence
  - [ ] Conduct team training if needed

### If Critical Vulnerabilities Found

- [ ] **Assessment** (within 4 hours)
  - [ ] Verify the vulnerability is real
  - [ ] Assess impact and exploitability
  - [ ] Determine affected systems

- [ ] **Remediation** (within 24 hours)
  - [ ] Apply security patches
  - [ ] Update vulnerable dependencies
  - [ ] Test fixes thoroughly
  - [ ] Deploy to all environments

- [ ] **Verification** (within 48 hours)
  - [ ] Re-scan to confirm fix
  - [ ] Document the incident
  - [ ] Update security procedures

## 📚 Documentation

- [ ] **Update README.md**
  - [ ] Add security section
  - [ ] Link to security workflows
  - [ ] Document security requirements

- [ ] **Create SECURITY.md**
  - [ ] Security policy
  - [ ] Vulnerability reporting process
  - [ ] Security contact information

- [ ] **Document Exceptions**
  - [ ] List accepted security risks
  - [ ] Document why each risk is accepted
  - [ ] Set review dates for exceptions

## 🎓 Team Training

- [ ] **Security Awareness**
  - [ ] Share OWASP Top 10 with team
  - [ ] Conduct secure coding training
  - [ ] Review common vulnerabilities

- [ ] **Tool Training**
  - [ ] Demo security workflows
  - [ ] Show how to read scan results
  - [ ] Explain how to fix common issues

- [ ] **Process Training**
  - [ ] Document security procedures
  - [ ] Share incident response plan
  - [ ] Practice security drills

## ✅ Final Verification

- [ ] All workflows are enabled and running
- [ ] Branch protection rules are active
- [ ] Security tab shows scan results
- [ ] Notifications are working (if configured)
- [ ] Team is aware of new security processes
- [ ] Documentation is complete and accessible
- [ ] Local development tools are installed
- [ ] Pre-commit hooks are active

## 🎉 You're All Set!

Your security scanning workflows are now configured and ready to protect your codebase.

**Next Steps**:
1. Monitor the Security tab regularly
2. Respond to alerts promptly
3. Keep security tools updated
4. Conduct regular security reviews

**Need Help?**
- Review `SECURITY-WORKFLOWS-README.md` for detailed documentation
- Check workflow run logs for errors
- Contact your security team for questions

---

**Last Updated**: 2025-12-10

**Checklist Status**: Ready for Production ✅
