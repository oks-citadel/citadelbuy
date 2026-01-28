# Testing Quick Reference Card

Quick commands and tips for load testing and security testing.

## Load Testing (k6)

### Setup
```bash
# Install k6
brew install k6  # macOS
choco install k6  # Windows

# Set environment
export BASE_URL=http://localhost:3000
export API_URL=http://localhost:4000
cd tests/load
```

### Run Tests
```bash
npm run test:auth       # Authentication tests
npm run test:checkout   # Checkout flow tests
npm run test:search     # Product search tests
npm run test:stress     # API stress tests
npm run test:all        # Run all tests

# Custom run
k6 run --vus 50 --duration 5m scenarios/checkout.js
```

### Test Types
| Command | Type | VUs | Duration |
|---------|------|-----|----------|
| `npm run test:smoke` | Smoke | 1 | 1m |
| `npm run test:load` | Load | 10 | 5m |
| `npm run test:spike` | Spike | 10→100 | Variable |
| `npm run test:soak` | Soak | 20 | 30m |

### Interpret Results
- **Good**: p(95) < 500ms, error rate < 1%, checks > 95%
- **Acceptable**: p(95) < 1s, error rate < 5%, checks > 90%
- **Action Required**: Any critical threshold failures

## Security Testing

### Quick Security Scans
```bash
# Secrets scan
gitleaks detect --source . --verbose

# Dependency check
cd apps/api && npm audit --audit-level=high
cd apps/web && npm audit --audit-level=high

# OWASP ZAP baseline
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:4000

# Check security headers
curl -I http://localhost:4000/health | grep -i security
```

### Common Security Tests
```bash
# SQL Injection test
curl -X POST http://localhost:4000/auth/login \
  -d '{"email":"admin'\'' OR '\''1'\''='\''1","password":"test"}'

# XSS test
curl "http://localhost:4000/products/search?q=<script>alert(1)</script>"

# CSRF test (should fail without token)
curl -X PUT http://localhost:4000/users/profile \
  -H "Authorization: Bearer <token>" \
  -d '{"firstName":"Test"}'

# Rate limiting test
for i in {1..100}; do
  curl -X POST http://localhost:4000/auth/login \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Pre-Deployment Checklist
```bash
# 1. Secrets
gitleaks detect --source .

# 2. Dependencies
npm audit --audit-level=high

# 3. No .env in git
git ls-files | grep -E "\.env$"  # Should be empty

# 4. Tests pass
npm test

# 5. Security headers (if deployed)
curl -I https://staging.broxiva.com | grep -i "strict-transport"
```

## GitHub Actions

### Trigger Manually
1. Go to Actions tab
2. Select "Security Scanning"
3. Click "Run workflow"

### Check Results
- **Dependency Scan**: Check for vulnerabilities
- **Secret Scan**: Look for exposed secrets
- **CodeQL**: Review code security issues
- **Docker Scan**: Check container vulnerabilities

### Common Fixes
```bash
# Fix npm vulnerabilities
npm audit fix

# Update dependencies
npm update

# Remove secrets from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" HEAD
```

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| p(95) Response Time | < 500ms | < 1000ms |
| Checkout p(95) | < 1500ms | < 2500ms |
| Error Rate | < 1% | < 5% |
| Checks Pass Rate | > 95% | > 90% |

## Security Targets

| Check | Status |
|-------|--------|
| Critical Vulnerabilities | 0 |
| High Vulnerabilities | 0 |
| Secrets in Code | 0 |
| Security Headers | All present |
| SSL Grade | A or better |

## Common Issues

### Load Testing
**Connection refused**: Ensure API is running
```bash
cd apps/api && npm run start:dev
```

**High error rate**: Check logs, reduce VUs
```bash
tail -f apps/api/logs/error.log
k6 run --vus 5 scenarios/auth.js
```

### Security Testing
**npm audit failures**: Update dependencies
```bash
npm audit fix
npm audit fix --force  # If needed
```

**GitLeaks failures**: Remove secrets, update .gitignore
```bash
git rm .env
echo ".env" >> .gitignore
```

## Documentation

| Document | Purpose |
|----------|---------|
| [tests/load/README.md](tests/load/README.md) | Load testing guide |
| [docs/SECURITY_TESTING.md](docs/SECURITY_TESTING.md) | Security testing procedures |
| [docs/SECURITY_AUDIT_CHECKLIST.md](docs/SECURITY_AUDIT_CHECKLIST.md) | Pre-deployment checklist |
| [TESTING_SETUP_GUIDE.md](TESTING_SETUP_GUIDE.md) | Complete setup guide |

## Key Files

```
organization/
├── tests/load/
│   ├── k6-config.js           # Configuration
│   ├── scenarios/             # Test scenarios
│   │   ├── auth.js
│   │   ├── checkout.js
│   │   ├── search.js
│   │   └── api-stress.js
│   └── package.json           # NPM scripts
├── docs/
│   ├── SECURITY_TESTING.md
│   └── SECURITY_AUDIT_CHECKLIST.md
└── .github/workflows/
    └── security.yml           # Security CI/CD
```

## Support

- Load Testing Issues: Review [tests/load/README.md](tests/load/README.md)
- Security Issues: Review [docs/SECURITY_TESTING.md](docs/SECURITY_TESTING.md)
- CI/CD Issues: Check GitHub Actions logs
- Critical Security: security@broxiva.com

---

**Quick Links**
- [Load Testing Guide](tests/load/README.md)
- [Security Testing Guide](docs/SECURITY_TESTING.md)
- [Security Audit Checklist](docs/SECURITY_AUDIT_CHECKLIST.md)
- [Full Setup Guide](TESTING_SETUP_GUIDE.md)
