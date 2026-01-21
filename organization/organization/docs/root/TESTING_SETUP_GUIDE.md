# Load Testing and Security Testing Setup Guide

This guide provides quick start instructions for the load testing and security testing infrastructure added to Broxiva.

## Overview

The testing infrastructure includes:

1. **Load Testing with k6** - Performance and stress testing
2. **Security Testing Documentation** - Comprehensive security testing procedures
3. **Security CI/CD Pipeline** - Automated security scanning
4. **Security Audit Checklist** - Pre-deployment security verification

---

## Load Testing Setup

### Prerequisites

Install k6:

**macOS:**
```bash
brew install k6
```

**Windows:**
```bash
choco install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Quick Start

1. **Set environment variables:**
```bash
export BASE_URL=http://localhost:3000
export API_URL=http://localhost:4000
```

2. **Run your first load test:**
```bash
cd tests/load
k6 run scenarios/auth.js
```

3. **Run all load tests:**
```bash
npm run test:all
```

### Available Test Scenarios

| Scenario | Description | Command |
|----------|-------------|---------|
| **Authentication** | Tests login, registration, token refresh | `npm run test:auth` |
| **Checkout Flow** | Tests complete shopping and checkout | `npm run test:checkout` |
| **Search & Discovery** | Tests product search and browsing | `npm run test:search` |
| **API Stress** | Comprehensive API stress testing | `npm run test:stress` |

### Test Types

| Type | Virtual Users | Duration | Command |
|------|---------------|----------|---------|
| **Smoke Test** | 1 VU | 1 minute | `npm run test:smoke` |
| **Load Test** | 10 VUs | 5 minutes | `npm run test:load` |
| **Spike Test** | 10-100 VUs | Variable | `npm run test:spike` |
| **Soak Test** | 20 VUs | 30 minutes | `npm run test:soak` |

### Interpreting Results

After running a test, look for these key metrics:

```
✓ login: status is 200 or 201
✓ login: has access token

http_req_duration..............: avg=245ms  p(95)=456ms  p(99)=678ms
http_req_failed................: 2.34%
checks.........................: 95.23%
```

**Good Performance:**
- p(95) < 500ms for most endpoints
- Error rate < 1%
- Check success rate > 95%

**See full documentation:** [tests/load/README.md](tests/load/README.md)

---

## Security Testing Setup

### Recommended Tools

Install these security testing tools:

1. **OWASP ZAP** (Free)
```bash
# Download from https://www.zaproxy.org/download/
# Or use Docker:
docker pull owasp/zap2docker-stable
```

2. **Burp Suite Community** (Free)
```bash
# Download from https://portswigger.net/burp/communitydownload
```

3. **SQLMap** (SQL Injection Testing)
```bash
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git
cd sqlmap
python sqlmap.py --version
```

4. **GitLeaks** (Secret Scanning)
```bash
# macOS
brew install gitleaks

# Linux
wget https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz
tar -xzf gitleaks_linux_x64.tar.gz
```

### Quick Security Checks

1. **Scan for secrets in code:**
```bash
gitleaks detect --source . --verbose
```

2. **Check for dependency vulnerabilities:**
```bash
cd apps/api && npm audit
cd apps/web && npm audit
```

3. **Run OWASP ZAP baseline scan:**
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:4000
```

4. **Check security headers:**
```bash
curl -I http://localhost:4000/health | grep -i "strict-transport-security"
```

### Security Testing Procedures

Follow the comprehensive guide in [docs/SECURITY_TESTING.md](docs/SECURITY_TESTING.md):

- OWASP Top 10 Testing
- SQL Injection Testing
- XSS/CSRF Testing
- Authentication & Authorization Testing
- Rate Limiting Verification

---

## Security CI/CD Pipeline

The security workflow (`.github/workflows/security.yml`) runs automatically on:
- Push to main/master/develop branches
- Pull requests
- Daily schedule (2 AM UTC)
- Manual trigger

### Security Scans Included

1. **Dependency Scanning** - npm audit for vulnerabilities
2. **Secret Scanning** - GitLeaks for hardcoded secrets
3. **SAST** - CodeQL static analysis
4. **Container Scanning** - Trivy for Docker vulnerabilities
5. **License Compliance** - Check for license violations

### Viewing Results

After a workflow run:
1. Go to GitHub Actions tab
2. Select "Security Scanning" workflow
3. Review each job for results
4. Check "Security" tab for CodeQL findings

### Required Secrets

For full functionality, add these GitHub secrets:

```
SNYK_TOKEN - Snyk API token (optional)
STAGING_URL - Staging environment URL (optional)
STAGING_API_URL - Staging API URL (optional)
```

---

## Pre-Deployment Security Audit

Before every production deployment, complete the security audit checklist:

### Quick Pre-Deployment Check

```bash
#!/bin/bash
# Run this script before deployment

echo "Pre-Deployment Security Check"
echo "=============================="

# 1. Check for secrets
echo "[1/5] Scanning for secrets..."
gitleaks detect --source . || exit 1

# 2. Dependency audit
echo "[2/5] Checking dependencies..."
cd apps/api && npm audit --audit-level=high || exit 1
cd ../web && npm audit --audit-level=high || exit 1
cd ../..

# 3. Check .env files
echo "[3/5] Checking for .env in git..."
if git ls-files | grep -E "\.env$"; then
  echo "ERROR: .env files found in git"
  exit 1
fi

# 4. Run tests
echo "[4/5] Running tests..."
cd apps/api && npm test || exit 1
cd ../web && npm test || exit 1
cd ../..

# 5. Security headers check (if staging URL available)
if [ -n "$STAGING_URL" ]; then
  echo "[5/5] Checking security headers..."
  curl -I "$STAGING_URL" | grep -i "strict-transport-security" || echo "WARNING: HSTS not found"
fi

echo ""
echo "✅ Pre-deployment security check passed!"
```

### Full Audit Checklist

Complete the comprehensive checklist in [docs/SECURITY_AUDIT_CHECKLIST.md](docs/SECURITY_AUDIT_CHECKLIST.md):

- [ ] Code & Dependencies
- [ ] Secrets & Configuration
- [ ] Authentication & Authorization
- [ ] Payment Flow Security
- [ ] API Security Headers
- [ ] Database Security
- [ ] Infrastructure Security

---

## Testing Schedule Recommendations

### Development Phase

**Daily:**
- Run unit and integration tests
- Quick security scan with `npm audit`

**Before Each PR:**
- Run load tests for affected features
- Check for secrets with GitLeaks
- Review security checklist

### Pre-Production

**Before Deployment:**
- Full load testing suite
- Complete security audit checklist
- OWASP ZAP scan
- Manual penetration testing

### Production

**Weekly:**
- Review security logs
- Check for new vulnerabilities
- Monitor performance metrics

**Monthly:**
- Full load test
- Security scan (OWASP ZAP)
- Review and update security policies

**Quarterly:**
- Third-party penetration testing
- Security training for team
- Review and update incident response plan

---

## File Structure

```
organization/
├── tests/
│   └── load/
│       ├── k6-config.js              # k6 configuration
│       ├── package.json               # Load test scripts
│       ├── README.md                  # Load testing guide
│       └── scenarios/
│           ├── auth.js                # Authentication tests
│           ├── checkout.js            # Checkout flow tests
│           ├── search.js              # Search tests
│           └── api-stress.js          # API stress tests
├── docs/
│   ├── SECURITY_TESTING.md            # Security testing guide
│   ├── SECURITY_AUDIT_CHECKLIST.md    # Pre-deployment checklist
│   └── SECURITY_SETUP.md              # Security infrastructure setup
└── .github/
    └── workflows/
        └── security.yml               # Security CI/CD pipeline
```

---

## Common Issues and Solutions

### Issue: k6 not found

**Solution:**
```bash
# Install k6 using package manager
brew install k6  # macOS
choco install k6  # Windows
```

### Issue: Connection refused during load tests

**Solution:**
```bash
# Ensure API is running
cd apps/api
npm run start:dev

# Check if port is correct
export API_URL=http://localhost:4000
```

### Issue: High error rates in load tests

**Solution:**
1. Check application logs for errors
2. Verify database is running
3. Check Redis/cache availability
4. Reduce virtual users (VUs)

### Issue: Security workflow failing

**Solution:**
1. Check GitHub Actions tab for specific error
2. Review SECURITY_SCANNING.md for requirements
3. Ensure all dependencies are up to date
4. Check if secrets are configured

---

## Resources

### Load Testing
- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Guide](tests/load/README.md)
- [k6 Examples](https://k6.io/docs/examples/)

### Security Testing
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Testing Guide](docs/SECURITY_TESTING.md)
- [Security Audit Checklist](docs/SECURITY_AUDIT_CHECKLIST.md)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

### Tools
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)
- [SQLMap](https://sqlmap.org/)
- [GitLeaks](https://github.com/zricethezav/gitleaks)

---

## Support

For questions or issues:
1. Check the documentation in `/docs` and `/tests/load`
2. Review GitHub Actions workflow logs
3. Contact the DevOps team
4. For security concerns: security@broxiva.com

---

## Next Steps

1. **Install k6** and run your first load test
2. **Install security tools** (OWASP ZAP, GitLeaks)
3. **Review security documentation** thoroughly
4. **Set up GitHub secrets** for CI/CD
5. **Run pre-deployment checklist** before next release
6. **Schedule regular security audits**

Happy testing! 🚀
