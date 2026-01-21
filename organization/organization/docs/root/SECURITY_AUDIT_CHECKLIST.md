# Security Audit Checklist

Comprehensive security audit checklist for Broxiva e-commerce platform deployments.

## Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Payment Flow Security Verification](#payment-flow-security-verification)
3. [API Security Headers Check](#api-security-headers-check)
4. [Database Security Verification](#database-security-verification)
5. [Infrastructure Security](#infrastructure-security)
6. [Application Security](#application-security)
7. [Compliance & Privacy](#compliance--privacy)

---

## Pre-Deployment Security Checklist

Use this checklist before every production deployment.

### Code & Dependencies

- [ ] **All dependencies up to date**
  ```bash
  cd apps/api && npm audit
  cd apps/web && npm audit
  ```

- [ ] **No critical/high vulnerabilities**
  ```bash
  npm audit --audit-level=high
  ```

- [ ] **Code review completed**
  - Security-focused code review
  - No hardcoded credentials
  - No commented-out security controls

- [ ] **SAST scanning completed**
  ```bash
  # CodeQL or SonarQube scan results reviewed
  ```

- [ ] **Dependency license compliance**
  ```bash
  npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC"
  ```

### Secrets & Configuration

- [ ] **No secrets in code repository**
  ```bash
  git secrets --scan
  gitleaks detect --source .
  ```

- [ ] **Environment variables properly configured**
  - [ ] `NODE_ENV=production`
  - [ ] Strong `JWT_SECRET` (min 32 characters)
  - [ ] Unique `SESSION_SECRET`
  - [ ] Database credentials secured
  - [ ] API keys stored in secrets manager

- [ ] **`.env` files not in git**
  ```bash
  git ls-files | grep -E "\.env$|\.env\.production$"
  # Should return nothing
  ```

- [ ] **Secrets rotation schedule defined**
  - Database passwords: 90 days
  - API keys: 180 days
  - JWT secrets: 365 days

### Authentication & Authorization

- [ ] **Password policy enforced**
  - Minimum 8 characters
  - Complexity requirements (uppercase, lowercase, numbers, special chars)
  - Password history (prevent reuse of last 5 passwords)

- [ ] **Multi-factor authentication available**
  - MFA enabled for admin accounts
  - MFA encouraged for all users

- [ ] **Session management secure**
  - [ ] Session timeout configured (30 minutes idle)
  - [ ] Absolute session timeout (24 hours)
  - [ ] Secure session storage (Redis with encryption)
  - [ ] Session invalidation on logout

- [ ] **JWT token security**
  - [ ] Short-lived access tokens (15 minutes)
  - [ ] Long-lived refresh tokens (7 days)
  - [ ] Token rotation on refresh
  - [ ] Token revocation mechanism

- [ ] **Rate limiting configured**
  - [ ] Login attempts: 5 per 15 minutes
  - [ ] Registration: 3 per hour
  - [ ] Password reset: 3 per hour
  - [ ] API calls: 100 per minute

- [ ] **Account lockout mechanism**
  - Lock after 5 failed login attempts
  - Unlock after 30 minutes or admin intervention

### Input Validation & Sanitization

- [ ] **All user inputs validated**
  - Server-side validation (never trust client)
  - Type checking
  - Length limits
  - Format validation (email, phone, etc.)

- [ ] **SQL injection prevention**
  - [ ] Parameterized queries (no string concatenation)
  - [ ] ORM/Query builder used correctly
  - [ ] Input sanitization

- [ ] **XSS prevention**
  - [ ] Output encoding
  - [ ] Content Security Policy (CSP) configured
  - [ ] HTML sanitization for user-generated content

- [ ] **CSRF protection enabled**
  - [ ] CSRF tokens on all state-changing operations
  - [ ] SameSite cookie attribute set

- [ ] **File upload security**
  - [ ] File type validation
  - [ ] File size limits
  - [ ] Virus scanning
  - [ ] Secure file storage (outside web root)

### Error Handling & Logging

- [ ] **Error handling configured**
  - [ ] Generic error messages to users
  - [ ] Detailed errors logged server-side
  - [ ] No stack traces in production
  - [ ] Custom error pages (404, 500, etc.)

- [ ] **Security logging enabled**
  - [ ] Failed login attempts logged
  - [ ] Access denied events logged
  - [ ] Admin actions logged
  - [ ] Data modifications logged
  - [ ] Payment transactions logged

- [ ] **Log management**
  - [ ] Logs stored securely
  - [ ] Log rotation configured
  - [ ] Log retention policy (90 days minimum)
  - [ ] Log monitoring and alerting

### Testing

- [ ] **Security tests passed**
  - [ ] Unit tests for security controls
  - [ ] Integration tests for authentication
  - [ ] E2E tests for critical flows

- [ ] **Penetration testing completed**
  - [ ] OWASP Top 10 tested
  - [ ] Automated scans (OWASP ZAP)
  - [ ] Manual testing
  - [ ] Third-party pen test (annually)

- [ ] **Load testing completed**
  - [ ] System handles expected load
  - [ ] DDoS protection tested
  - [ ] Rate limiting validated

---

## Payment Flow Security Verification

Critical security checks for payment processing.

### Payment Gateway Integration

- [ ] **PCI DSS compliance**
  - [ ] No card data stored on servers
  - [ ] Payment tokens used instead of raw card data
  - [ ] Stripe/PayPal handles card processing

- [ ] **Secure payment gateway communication**
  - [ ] HTTPS only
  - [ ] TLS 1.2 or higher
  - [ ] Certificate validation
  - [ ] Webhook signature verification

- [ ] **Payment API security**
  - [ ] API keys secured (environment variables)
  - [ ] Webhook endpoints authenticated
  - [ ] Idempotency keys used
  - [ ] Request signing implemented

### Checkout Process

- [ ] **Cart security**
  - [ ] Cart tied to user session
  - [ ] Price validation on server
  - [ ] Inventory checks before payment
  - [ ] No client-side price manipulation

- [ ] **Order validation**
  - [ ] Server-side total calculation
  - [ ] Tax calculation verified
  - [ ] Shipping cost validation
  - [ ] Coupon/discount validation

- [ ] **Payment processing**
  - [ ] Double-payment prevention (idempotency)
  - [ ] Payment amount validation
  - [ ] Currency validation
  - [ ] Transaction timeout handling

### Order Completion

- [ ] **Order confirmation**
  - [ ] Secure order ID generation (UUID, not sequential)
  - [ ] Order status tracking
  - [ ] Email confirmations sent
  - [ ] Order history secure

- [ ] **Refund security**
  - [ ] Authorization required
  - [ ] Refund amount validation
  - [ ] Audit logging
  - [ ] Notification to customer

### Testing Payment Flow

```bash
# Test payment validation
curl -X POST http://localhost:4000/payments/process \
  -H "Authorization: Bearer <token>" \
  -d '{"orderId": "test", "amount": -100}' # Negative amount should fail

# Test price manipulation
# 1. Add item to cart
# 2. Change price in client
# 3. Process payment - should use server-side price

# Test double payment
# Send same payment request twice with same idempotency key
# Second request should return same result, not charge twice
```

**Checklist:**

- [ ] Negative amounts rejected
- [ ] Price manipulation prevented
- [ ] Double payments prevented
- [ ] Invalid coupon codes rejected
- [ ] Out-of-stock items cannot be purchased
- [ ] Payment timeout handled gracefully
- [ ] Failed payments logged
- [ ] Successful payments confirmed

---

## API Security Headers Check

Essential security headers for API endpoints.

### Required Headers

Test with:
```bash
curl -I https://api.broxiva.com/health
```

- [ ] **Strict-Transport-Security (HSTS)**
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```
  - Forces HTTPS
  - Minimum 1 year (31536000 seconds)
  - Includes subdomains

- [ ] **X-Frame-Options**
  ```
  X-Frame-Options: DENY
  ```
  - Prevents clickjacking
  - Or use `SAMEORIGIN` if needed

- [ ] **X-Content-Type-Options**
  ```
  X-Content-Type-Options: nosniff
  ```
  - Prevents MIME-sniffing attacks

- [ ] **Content-Security-Policy (CSP)**
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com;
  ```
  - Restricts resource loading
  - Prevents XSS attacks

- [ ] **X-XSS-Protection**
  ```
  X-XSS-Protection: 1; mode=block
  ```
  - Enables XSS filter (legacy browsers)

- [ ] **Referrer-Policy**
  ```
  Referrer-Policy: strict-origin-when-cross-origin
  ```
  - Controls referrer information

- [ ] **Permissions-Policy**
  ```
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  ```
  - Controls browser features

### CORS Configuration

- [ ] **CORS properly configured**
  ```
  Access-Control-Allow-Origin: https://broxiva.com
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Allow-Credentials: true
  Access-Control-Max-Age: 86400
  ```

- [ ] **No wildcard origins with credentials**
  ```bash
  # This should NOT be present:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Credentials: true
  ```

### Implementation Check

Verify in NestJS (apps/api/src/main.ts):

```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com']
    }
  },
  frameguard: { action: 'deny' }
}));
```

**Checklist:**

- [ ] All security headers present
- [ ] HSTS configured correctly
- [ ] CSP restrictive enough
- [ ] CORS not overly permissive
- [ ] Headers tested with securityheaders.com
- [ ] Headers tested with observatory.mozilla.org

---

## Database Security Verification

Security checks for PostgreSQL database.

### Database Configuration

- [ ] **Database access control**
  - [ ] Strong passwords (min 16 characters)
  - [ ] Password rotation schedule
  - [ ] Principle of least privilege
  - [ ] No default accounts enabled

- [ ] **Network security**
  - [ ] Database not publicly accessible
  - [ ] Firewall rules configured
  - [ ] VPC/private network only
  - [ ] SSL/TLS connections required

- [ ] **Connection pooling**
  - [ ] Max connections limited
  - [ ] Connection timeout configured
  - [ ] Idle connection cleanup

### PostgreSQL Security Settings

```sql
-- Check SSL enforcement
SHOW ssl;
-- Should be 'on'

-- Check password encryption
SHOW password_encryption;
-- Should be 'scram-sha-256'

-- Check connection limit
SELECT rolname, rolconnlimit FROM pg_roles WHERE rolname = 'broxiva_user';
-- Should have reasonable limit

-- Check user privileges
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public';
-- Verify least privilege
```

**Checklist:**

- [ ] SSL/TLS required for connections
- [ ] Password encryption enabled (scram-sha-256)
- [ ] Connection limits configured
- [ ] User privileges minimal
- [ ] No superuser access for application
- [ ] Audit logging enabled

### Data Protection

- [ ] **Encryption at rest**
  - [ ] Database encryption enabled
  - [ ] Backup encryption enabled
  - [ ] Key management configured

- [ ] **Sensitive data handling**
  - [ ] Passwords hashed (bcrypt/argon2)
  - [ ] PII encrypted if stored
  - [ ] Payment data NOT stored (use tokens)
  - [ ] Secure data disposal process

- [ ] **Backup security**
  - [ ] Regular backups (daily minimum)
  - [ ] Backup encryption
  - [ ] Backup testing (restore drills)
  - [ ] Off-site backup storage
  - [ ] Backup retention policy

### Query Security

```sql
-- Check for SQL injection vulnerabilities
-- All queries should use parameterized statements

-- Example GOOD (using Prisma ORM):
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

-- Example BAD (string concatenation):
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

**Checklist:**

- [ ] No raw SQL with string concatenation
- [ ] Parameterized queries only
- [ ] ORM used correctly
- [ ] Input validation before queries
- [ ] Stored procedures secured

### Database Monitoring

- [ ] **Monitoring configured**
  - [ ] Query performance monitoring
  - [ ] Failed login attempts tracking
  - [ ] Unusual query patterns alerting
  - [ ] Database resource monitoring

- [ ] **Audit logging**
  - [ ] DDL changes logged
  - [ ] Privilege changes logged
  - [ ] Data modifications logged (for sensitive tables)

```sql
-- Enable audit logging (PostgreSQL)
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'ddl';
SELECT pg_reload_conf();
```

**Checklist:**

- [ ] Connection logging enabled
- [ ] Query logging configured
- [ ] Slow query logging enabled
- [ ] Failed authentication logged
- [ ] Alerts configured

---

## Infrastructure Security

Security checks for hosting infrastructure.

### Server Security

- [ ] **Operating system hardening**
  - [ ] OS patches up to date
  - [ ] Unnecessary services disabled
  - [ ] Firewall configured (UFW/iptables)
  - [ ] SSH hardened (key-based auth only)

- [ ] **Network security**
  - [ ] Private networking for internal services
  - [ ] Security groups/firewall rules
  - [ ] DDoS protection (CloudFlare, AWS Shield)
  - [ ] Load balancer configured

- [ ] **Container security** (if using Docker/Kubernetes)
  - [ ] Base images scanned (Trivy, Snyk)
  - [ ] No privileged containers
  - [ ] Resource limits set
  - [ ] Security contexts configured
  - [ ] Secrets management (not in images)

### Cloud Security (AWS/Azure/GCP)

- [ ] **IAM/Access control**
  - [ ] MFA enabled for all accounts
  - [ ] Principle of least privilege
  - [ ] Regular access reviews
  - [ ] Service accounts for applications

- [ ] **Encryption**
  - [ ] Encryption in transit (TLS)
  - [ ] Encryption at rest (EBS, S3, etc.)
  - [ ] Key management (KMS, Key Vault)

- [ ] **Monitoring & Logging**
  - [ ] CloudTrail/Azure Monitor enabled
  - [ ] Log aggregation (ELK, CloudWatch)
  - [ ] Security alerts configured
  - [ ] Anomaly detection

### CDN & Edge Security

- [ ] **CDN configuration** (CloudFlare, CloudFront)
  - [ ] DDoS protection enabled
  - [ ] WAF rules configured
  - [ ] Rate limiting
  - [ ] SSL/TLS enforcement
  - [ ] Cache poisoning prevention

- [ ] **DNS security**
  - [ ] DNSSEC enabled
  - [ ] DNS provider DDoS protection
  - [ ] CAA records configured

### SSL/TLS

- [ ] **Certificate management**
  - [ ] Valid SSL certificate
  - [ ] Auto-renewal configured (Let's Encrypt)
  - [ ] Certificate expiry monitoring
  - [ ] Strong cipher suites only

```bash
# Test SSL configuration
ssllabs-scan --quiet broxiva.com

# Check certificate
openssl s_client -connect broxiva.com:443 -servername broxiva.com

# Verify TLS version
nmap --script ssl-enum-ciphers -p 443 broxiva.com
```

**Checklist:**

- [ ] TLS 1.2 minimum (prefer 1.3)
- [ ] Strong cipher suites only
- [ ] Certificate valid and trusted
- [ ] HSTS enabled
- [ ] SSL Labs grade A or better

---

## Application Security

Security checks for application code and runtime.

### Code Security

- [ ] **Secure coding practices**
  - [ ] Input validation on all inputs
  - [ ] Output encoding
  - [ ] Error handling (no info leakage)
  - [ ] Secure defaults

- [ ] **Authentication & Session**
  - [ ] Secure password storage (bcrypt/argon2)
  - [ ] Session management secure
  - [ ] Remember me tokens secure
  - [ ] Password reset secure (time-limited tokens)

- [ ] **Authorization**
  - [ ] RBAC implemented
  - [ ] Resource ownership verified
  - [ ] API authorization on all endpoints
  - [ ] Admin functions protected

### Third-Party Integrations

- [ ] **API integrations secured**
  - [ ] API keys in environment variables
  - [ ] Webhook signature verification
  - [ ] Rate limiting on webhooks
  - [ ] Input validation on webhook data

- [ ] **Payment providers**
  - [ ] Stripe/PayPal official SDK used
  - [ ] Webhook endpoints secured
  - [ ] Test mode vs production separation

- [ ] **Social authentication**
  - [ ] OAuth2 implemented correctly
  - [ ] State parameter validated (CSRF)
  - [ ] Redirect URI validation
  - [ ] Token validation

### Frontend Security

- [ ] **React/Next.js security**
  - [ ] No `dangerouslySetInnerHTML` without sanitization
  - [ ] XSS prevention
  - [ ] Sensitive data not in localStorage
  - [ ] API tokens not exposed

- [ ] **Client-side validation**
  - [ ] Never trust client validation alone
  - [ ] Server-side validation always
  - [ ] Form tampering prevention

### API Security

- [ ] **REST API security**
  - [ ] Authentication required
  - [ ] Authorization on all endpoints
  - [ ] Input validation
  - [ ] Rate limiting
  - [ ] CORS configured
  - [ ] API versioning

- [ ] **GraphQL security** (if applicable)
  - [ ] Query depth limiting
  - [ ] Query complexity limiting
  - [ ] Introspection disabled in production
  - [ ] Authorization on resolvers

---

## Compliance & Privacy

Legal and regulatory compliance checks.

### GDPR Compliance (EU)

- [ ] **User rights**
  - [ ] Right to access (data export)
  - [ ] Right to erasure (account deletion)
  - [ ] Right to rectification (data correction)
  - [ ] Right to portability (data download)

- [ ] **Consent management**
  - [ ] Cookie consent banner
  - [ ] Clear privacy policy
  - [ ] Explicit consent for marketing
  - [ ] Consent tracking

- [ ] **Data protection**
  - [ ] Data minimization
  - [ ] Purpose limitation
  - [ ] Storage limitation
  - [ ] Data breach notification process

### PCI DSS Compliance (Payment Cards)

- [ ] **PCI requirements**
  - [ ] No card data stored
  - [ ] Secure network (firewall, TLS)
  - [ ] Protect stored data (encryption)
  - [ ] Regularly test security
  - [ ] Maintain security policy

- [ ] **SAQ (Self-Assessment Questionnaire)**
  - [ ] Determine SAQ type (likely SAQ A)
  - [ ] Complete SAQ annually
  - [ ] Maintain compliance documentation

### CCPA Compliance (California)

- [ ] **Consumer rights**
  - [ ] Right to know (data disclosure)
  - [ ] Right to delete
  - [ ] Right to opt-out (data sale)
  - [ ] Non-discrimination

- [ ] **Privacy notice**
  - [ ] Clear privacy policy
  - [ ] Data collection notice
  - [ ] "Do Not Sell My Info" link

### General Compliance

- [ ] **Privacy policy**
  - [ ] Comprehensive and up-to-date
  - [ ] Clearly written
  - [ ] Easily accessible
  - [ ] Covers data collection, use, sharing

- [ ] **Terms of service**
  - [ ] Up-to-date
  - [ ] Legally reviewed
  - [ ] User acceptance required

- [ ] **Data retention**
  - [ ] Retention policy defined
  - [ ] Automated data deletion
  - [ ] Audit logs retained (compliance requirements)

---

## Security Audit Tools

Automated tools to assist with security audits:

### Quick Security Check Script

```bash
#!/bin/bash
# security-check.sh

echo "Broxiva Security Quick Check"
echo "================================"

# Check for secrets in code
echo "[1/10] Checking for secrets in code..."
if grep -r "api.*key.*=.*['\"]" apps/ --include="*.ts" --include="*.js" | grep -v "process.env"; then
  echo "❌ Potential API keys found in code"
else
  echo "✅ No hardcoded API keys found"
fi

# Check for .env files in git
echo "[2/10] Checking for .env files in git..."
if git ls-files | grep -E "\.env$"; then
  echo "❌ .env files found in git"
else
  echo "✅ No .env files in git"
fi

# Run npm audit
echo "[3/10] Running npm audit (API)..."
cd apps/api && npm audit --audit-level=moderate && echo "✅ No moderate+ vulnerabilities" || echo "❌ Vulnerabilities found"
cd ../..

echo "[4/10] Running npm audit (Web)..."
cd apps/web && npm audit --audit-level=moderate && echo "✅ No moderate+ vulnerabilities" || echo "❌ Vulnerabilities found"
cd ../..

# Check SSL/TLS if URL provided
if [ -n "$1" ]; then
  echo "[5/10] Checking SSL/TLS configuration..."
  curl -I "https://$1" 2>&1 | grep -i "strict-transport-security" && echo "✅ HSTS enabled" || echo "❌ HSTS not found"
fi

# Check for security headers
if [ -n "$1" ]; then
  echo "[6/10] Checking security headers..."
  curl -I "https://$1" 2>&1 | grep -i "x-frame-options" && echo "✅ X-Frame-Options present" || echo "❌ X-Frame-Options missing"
  curl -I "https://$1" 2>&1 | grep -i "x-content-type-options" && echo "✅ X-Content-Type-Options present" || echo "❌ X-Content-Type-Options missing"
  curl -I "https://$1" 2>&1 | grep -i "content-security-policy" && echo "✅ CSP present" || echo "⚠️  CSP missing"
fi

echo ""
echo "Security check complete!"
echo "Run full security audit for comprehensive results."
```

Usage:
```bash
chmod +x security-check.sh
./security-check.sh broxiva.com
```

---

## Sign-Off

After completing all checks, document and sign off:

```
Security Audit Completed

Deployment: Production v1.2.3
Date: 2024-01-15
Auditor: [Name]

Summary:
- Total checks: 150
- Passed: 148
- Failed: 0
- Warnings: 2

Critical Issues: None
High Issues: None
Medium Issues: None
Low Issues: 2 (CSP could be more restrictive, monitoring alerts to be configured)

Approval: ✅ Approved for deployment

Signature: ________________
Date: ________________
```

---

## Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [GDPR Checklist](https://gdpr.eu/checklist/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
