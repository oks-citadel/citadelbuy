# Pre-Production Security Checklist

This checklist must be completed before any production deployment of the Broxiva Global Marketplace platform. Each item should be verified by the security team and signed off.

## Authentication

### JWT Configuration
- [ ] JWT secrets are 64+ characters (use `openssl rand -base64 64`)
- [ ] JWT access tokens have short expiry (15 minutes recommended)
- [ ] JWT refresh tokens have reasonable expiry (7-30 days)
- [ ] Refresh token rotation enabled (new token on each refresh)
- [ ] Tokens are signed with RS256 or ES256 (not HS256 in production)
- [ ] Token claims include only necessary information (no PII in tokens)
- [ ] Token claims are validated on each request

### Multi-Factor Authentication
- [ ] MFA required for all admin accounts
- [ ] MFA required for all vendor accounts
- [ ] MFA backup codes provided and hashed before storage
- [ ] TOTP secrets are encrypted at rest
- [ ] MFA verification is rate-limited (max 5 attempts/minute)
- [ ] MFA bypass codes require additional verification

### Password Policy
- [ ] Minimum password length: 8 characters
- [ ] Password complexity requirements enforced
- [ ] Passwords hashed with bcrypt (cost factor 12+) or Argon2
- [ ] Password history prevents reuse of last 5 passwords
- [ ] Compromised password check (via HaveIBeenPwned API)

### Account Protection
- [ ] Account lockout after 5 failed attempts
- [ ] Lockout duration: 15+ minutes
- [ ] Account lockout notification via email
- [ ] Suspicious login detection (new device/location)
- [ ] Session invalidation on password change
- [ ] Concurrent session limits enforced

## Authorization

### Tenant Isolation
- [ ] Tenant context enforced at query level (all DB queries filtered by organizationId)
- [ ] Tenant context extracted from JWT, not from request parameters
- [ ] Cross-tenant access attempts logged and alerted
- [ ] No global admin bypass for tenant boundaries (except emergency procedures)
- [ ] Tenant isolation verified in automated tests

### Role-Based Access Control
- [ ] RBAC properly implemented for all endpoints
- [ ] Roles defined: CUSTOMER, VENDOR, ADMIN, SUPER_ADMIN
- [ ] Permission checks happen before business logic
- [ ] No privilege escalation paths identified
- [ ] Role changes logged to audit trail

### API Authorization
- [ ] All endpoints protected (no accidental public endpoints)
- [ ] Rate limiting applied per user and per IP
- [ ] API key scoping implemented
- [ ] Webhook endpoints have signature verification
- [ ] GraphQL query depth limiting (if applicable)

## Data Protection

### Encryption
- [ ] All PII encrypted at rest (AES-256)
- [ ] Database connections use TLS
- [ ] Backup files encrypted
- [ ] Encryption keys rotated annually
- [ ] Key management uses HSM or KMS

### Transport Security
- [ ] TLS 1.2 minimum (TLS 1.3 preferred)
- [ ] HSTS header enabled with long max-age
- [ ] HSTS preload submitted (after testing)
- [ ] HTTP redirects to HTTPS
- [ ] Secure WebSocket connections (WSS)

### Data Handling
- [ ] Sensitive data masked in logs (SecretScannerService)
- [ ] PII not exposed in error messages
- [ ] No sensitive data in URLs
- [ ] Data retention policies implemented
- [ ] GDPR right-to-erasure functional

## API Security

### Rate Limiting
- [ ] Global rate limiting enabled
- [ ] Per-tenant rate limiting enabled
- [ ] Different limits for different endpoints
- [ ] Rate limit headers included in responses
- [ ] Rate limit exceeded logged

### Input Validation
- [ ] All inputs validated (whitelist approach)
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (input sanitization + output encoding)
- [ ] File upload validation (type, size, content)
- [ ] JSON schema validation for API requests

### CORS Configuration
- [ ] CORS origin whitelist configured
- [ ] Credentials mode properly set
- [ ] Preflight caching configured
- [ ] No wildcard origins in production

### CSRF Protection
- [ ] CSRF tokens required for state-changing operations
- [ ] Double-submit cookie pattern implemented
- [ ] SameSite cookie attribute set
- [ ] CSRF validation on all non-GET requests

## Security Headers

### Required Headers
- [ ] Content-Security-Policy (restrictive policy)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy configured

### Cache Control
- [ ] No-cache on sensitive endpoints
- [ ] No sensitive data cached by CDN
- [ ] Clear-Site-Data on logout

## Integration Security

### Webhook Security
- [ ] All incoming webhooks verified with signatures
- [ ] Provider-specific signature algorithms (Stripe, PayPal, Shopify)
- [ ] Webhook replay protection (idempotency keys)
- [ ] Webhook timestamp validation (reject old webhooks)
- [ ] Webhook processing logged

### Domain Security
- [ ] Domain ownership verification required (TXT + CNAME)
- [ ] Re-verification on domain transfer
- [ ] Domain hijacking prevention (check existing owners)
- [ ] Domain operations rate-limited
- [ ] Domain changes logged to audit

### FX Rate Security
- [ ] FX rates captured at order creation (immutable)
- [ ] FX rates never recalculated after order placed
- [ ] Refunds use original FX rate
- [ ] FX rate source auditable

### External API Security
- [ ] API keys stored securely (encrypted)
- [ ] API key rotation procedure documented
- [ ] Outbound API calls use TLS
- [ ] External API errors don't expose internals

## Monitoring & Audit

### Security Logging
- [ ] All authentication events logged
- [ ] All authorization failures logged
- [ ] Admin actions logged
- [ ] Data access logged (for PII)
- [ ] Log integrity protected (hash chain)

### Alerting
- [ ] Failed login threshold alerts
- [ ] Cross-tenant access attempt alerts
- [ ] Rate limit exceeded alerts
- [ ] Error rate spike alerts
- [ ] Security event SIEM integration

### Audit Trail
- [ ] Immutable audit log implemented
- [ ] Trace IDs for request correlation
- [ ] No secrets in audit logs
- [ ] Audit log retention: 1+ years
- [ ] Audit log tamper detection

## Infrastructure Security

### Server Hardening
- [ ] Non-root process execution
- [ ] Minimal installed packages
- [ ] Security updates automated
- [ ] File system permissions restricted
- [ ] Network segmentation in place

### Container Security
- [ ] Base images scanned for vulnerabilities
- [ ] No secrets in container images
- [ ] Container runs as non-root
- [ ] Read-only file system where possible
- [ ] Resource limits configured

### Database Security
- [ ] Database not publicly accessible
- [ ] Database user has minimal privileges
- [ ] Database connections encrypted
- [ ] Database backups encrypted
- [ ] Database audit logging enabled

### Secrets Management
- [ ] No hardcoded secrets in code
- [ ] Secrets in environment variables or vault
- [ ] Secret rotation procedure documented
- [ ] Secret scanning in CI/CD pipeline
- [ ] No secrets committed to git

## Compliance

### PCI DSS
- [ ] No direct card number storage
- [ ] Payment tokenization via Stripe
- [ ] Quarterly vulnerability scans scheduled
- [ ] Annual penetration test scheduled

### GDPR
- [ ] Data processing agreement in place
- [ ] Privacy policy updated
- [ ] Consent management implemented
- [ ] Data portability functional
- [ ] Right to erasure functional
- [ ] 72-hour breach notification process

### SOC 2
- [ ] Access control documentation
- [ ] Change management process
- [ ] Incident response plan
- [ ] Business continuity plan

## Testing & Verification

### Security Testing
- [ ] Automated security tests passing
- [ ] Tenant isolation tests passing
- [ ] Authentication tests passing
- [ ] Authorization tests passing
- [ ] XSS prevention tests passing

### Penetration Testing
- [ ] Last penetration test date: ____________
- [ ] Critical findings remediated: [ ] Yes [ ] No
- [ ] High findings remediated: [ ] Yes [ ] No
- [ ] Next penetration test scheduled: ____________

### Dependency Security
- [ ] npm audit shows no critical vulnerabilities
- [ ] Dependabot/Snyk enabled
- [ ] Dependency update process documented

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | | | |
| Engineering Lead | | | |
| DevOps Lead | | | |
| CTO/VP Engineering | | | |

---

## Emergency Contacts

- Security Team: security@broxiva.com
- On-Call Security: [Phone Number]
- Incident Response: incident@broxiva.com

## Related Documents

- [Security Threat Model](/docs/security.md)
- [Incident Response Plan](/docs/security/incident-response.md)
- [Security Architecture](/docs/security/architecture.md)
- [Penetration Test Schedule](/docs/security/PENETRATION_TEST_SCHEDULE.md)

---

*Document Version: 1.0*
*Last Updated: 2026-01-27*
*Review Frequency: Before each major release*
