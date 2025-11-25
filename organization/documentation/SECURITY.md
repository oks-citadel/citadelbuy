# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to **security@citadelbuy.com** with the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

### What to Expect

- **Initial Response**: Within 48 hours, we will acknowledge receipt of your report
- **Investigation**: We will investigate and validate the vulnerability
- **Updates**: You'll receive updates on the progress every 5-7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: We will credit you in our security advisory (unless you prefer to remain anonymous)

### Responsible Disclosure

- Allow us reasonable time to address the vulnerability before public disclosure
- Make a good faith effort to avoid privacy violations, data destruction, and service interruption
- Do not exploit the vulnerability beyond what is necessary to demonstrate it

## Security Best Practices

### Environment Variables

- **NEVER** commit `.env` files to version control
- Use strong, unique values for all secrets
- Rotate secrets regularly (at least every 90 days)
- Use different credentials for development, staging, and production
- Store production secrets in a secure vault (Azure Key Vault, AWS Secrets Manager, etc.)

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=                    # PostgreSQL connection string
REDIS_URL=                       # Redis connection string

# Authentication
JWT_SECRET=                      # Strong random string (min 32 chars)
JWT_EXPIRATION=                  # Token expiration time

# Payment
STRIPE_SECRET_KEY=              # Stripe secret key
STRIPE_PUBLISHABLE_KEY=         # Stripe publishable key
STRIPE_WEBHOOK_SECRET=          # Stripe webhook secret

# Email
SENDGRID_API_KEY=               # SendGrid API key
SENDGRID_FROM_EMAIL=            # Verified sender email

# Application
FRONTEND_URL=                   # Frontend URL for CORS
BACKEND_PORT=                   # Backend server port
NODE_ENV=                       # Environment (development/production)
```

### Authentication & Authorization

#### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, numbers, and special characters
- Hashed with bcrypt (cost factor: 10)
- Never store plain text passwords
- Implement account lockout after failed attempts

#### JWT Tokens
- Use strong secrets (256-bit minimum)
- Short expiration times (15 minutes for access tokens)
- Implement refresh token rotation
- Validate tokens on every request
- Include CSRF protection

#### Session Management
- Use secure, HttpOnly cookies
- Implement proper session timeout
- Invalidate sessions on logout
- Use SameSite cookie attribute

### API Security

#### Rate Limiting
- 100 requests per minute per IP (default)
- Lower limits for sensitive endpoints (login, register)
- Implement exponential backoff for failed attempts

```typescript
// Example: Rate limit configuration
@Throttle(5, 60)  // 5 requests per minute
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // Login logic
}
```

#### Input Validation
- Validate all inputs with class-validator
- Sanitize user inputs
- Use DTOs for type safety
- Whitelist allowed properties

```typescript
// Example: DTO validation
export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}
```

#### CORS Configuration
- Whitelist specific origins (never use '*' in production)
- Restrict allowed HTTP methods
- Set appropriate headers

```typescript
// Example: CORS configuration
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

### Data Protection

#### Encryption
- Use HTTPS in production (TLS 1.2+)
- Encrypt sensitive data at rest
- Use encrypted connections to databases
- Implement end-to-end encryption for sensitive communications

#### Data Privacy
- Follow GDPR/CCPA guidelines
- Implement data retention policies
- Allow users to export/delete their data
- Anonymize data for analytics

#### Database Security
- Use parameterized queries (Prisma handles this)
- Implement least privilege access
- Regular backups with encryption
- Audit database access logs

```typescript
// Example: Safe database query
const user = await prisma.user.findUnique({
  where: { email: email }, // Parameterized, safe from SQL injection
});
```

### File Upload Security

```typescript
// Example: Secure file upload configuration
{
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
}
```

- Validate file types and sizes
- Scan for malware
- Store files outside web root
- Use unique, non-guessable filenames
- Serve files through a CDN with proper headers

### Frontend Security

#### XSS Prevention
- Sanitize all user inputs
- Use React's built-in XSS protection
- Set Content-Security-Policy headers
- Avoid dangerouslySetInnerHTML

#### CSRF Protection
- Use CSRF tokens for state-changing operations
- Implement SameSite cookie attribute
- Validate Origin and Referer headers

```typescript
// Example: CSRF protection in NestJS
app.use(csurf({ cookie: true }));
```

#### Dependency Security
- Regularly update dependencies
- Run security audits
- Use Snyk or similar tools
- Review dependency licenses

```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Update dependencies
npm update
```

### Infrastructure Security

#### Docker Security
- Use official base images
- Run containers as non-root user
- Scan images for vulnerabilities
- Keep images updated
- Use multi-stage builds to reduce image size

```dockerfile
# Example: Secure Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs
COPY --from=builder --chown=nestjs:nodejs /app /app
CMD ["node", "dist/main"]
```

#### Network Security
- Use private networks for internal services
- Implement firewall rules
- Use VPN for remote access
- Monitor network traffic

### Monitoring & Logging

#### Security Logging
- Log authentication attempts (success and failure)
- Log authorization failures
- Log suspicious activities
- Never log sensitive data (passwords, tokens, credit cards)

```typescript
// Example: Secure logging
logger.log({
  action: 'LOGIN_SUCCESS',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  // NEVER log: password, token, credit card
});
```

#### Monitoring
- Set up alerts for suspicious activities
- Monitor failed login attempts
- Track unusual traffic patterns
- Implement intrusion detection

### Incident Response

#### Preparation
1. Have a security incident response plan
2. Designate incident response team
3. Keep contact information updated
4. Conduct regular security drills

#### Detection
- Monitor security logs
- Set up automated alerts
- Regular security audits
- Penetration testing

#### Response Steps
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope of breach
3. **Eradicate**: Remove threat
4. **Recover**: Restore services
5. **Review**: Post-incident analysis

#### Communication
- Notify affected users promptly
- Be transparent about the breach
- Provide clear instructions
- Report to relevant authorities if required

## Security Checklist

### Before Deployment

- [ ] All secrets moved to environment variables
- [ ] No hardcoded credentials in code
- [ ] HTTPS enabled with valid certificate
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection enabled
- [ ] Authentication and authorization working
- [ ] Password hashing implemented
- [ ] Session management secure
- [ ] File upload restrictions in place
- [ ] Error messages don't leak sensitive info
- [ ] Security headers configured
- [ ] Dependencies scanned for vulnerabilities
- [ ] Database backups configured
- [ ] Logging and monitoring set up
- [ ] Security testing completed
- [ ] Incident response plan in place

### Ongoing Security

- [ ] Regular dependency updates
- [ ] Weekly security scans
- [ ] Monthly access reviews
- [ ] Quarterly penetration testing
- [ ] Regular backup testing
- [ ] Security training for team
- [ ] Review and update security policies

## Common Vulnerabilities (OWASP Top 10)

### 1. Broken Access Control
**Prevention:**
- Implement proper authorization checks
- Use role-based access control (RBAC)
- Default deny principle
- Verify user permissions server-side

### 2. Cryptographic Failures
**Prevention:**
- Use strong encryption algorithms
- Protect data in transit (HTTPS)
- Encrypt sensitive data at rest
- Use secure random number generators

### 3. Injection
**Prevention:**
- Use parameterized queries (Prisma)
- Validate and sanitize all inputs
- Use ORM/query builders
- Implement input whitelisting

### 4. Insecure Design
**Prevention:**
- Security by design principles
- Threat modeling
- Security requirements in planning
- Use proven security patterns

### 5. Security Misconfiguration
**Prevention:**
- Remove default accounts and passwords
- Keep software updated
- Implement least privilege
- Review cloud storage permissions

### 6. Vulnerable Components
**Prevention:**
- Keep dependencies updated
- Remove unused dependencies
- Use components from trusted sources
- Regular security audits

### 7. Identification and Authentication Failures
**Prevention:**
- Multi-factor authentication
- Strong password policies
- Secure session management
- Rate limiting on authentication

### 8. Software and Data Integrity Failures
**Prevention:**
- Use integrity checks
- Verify software updates
- Use CI/CD pipeline security
- Sign and verify artifacts

### 9. Security Logging and Monitoring Failures
**Prevention:**
- Log all security events
- Centralized log management
- Real-time monitoring
- Incident response plan

### 10. Server-Side Request Forgery (SSRF)
**Prevention:**
- Validate and sanitize all URLs
- Use allowlists for external requests
- Disable HTTP redirections
- Network segmentation

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Next.js Security](https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Contact

For security concerns, contact: **security@citadelbuy.com**

---

**Last Updated:** 2025-01-16
