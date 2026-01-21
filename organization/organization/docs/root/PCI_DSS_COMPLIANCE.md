# PCI DSS Compliance Documentation

**Document Version:** 1.0
**Last Updated:** December 3, 2025
**Compliance Standard:** PCI DSS v4.0
**Platform:** Broxiva E-Commerce Platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [PCI DSS Overview](#pci-dss-overview)
3. [Scope Determination](#scope-determination)
4. [SAQ (Self-Assessment Questionnaire) Type](#saq-type)
5. [Compliance Requirements](#compliance-requirements)
6. [Network Security Requirements](#network-security-requirements)
7. [Access Control Measures](#access-control-measures)
8. [Monitoring and Testing](#monitoring-and-testing)
9. [Information Security Policy](#information-security-policy)
10. [Third-Party Service Providers](#third-party-service-providers)
11. [Annual Compliance Activities](#annual-compliance-activities)
12. [Compliance Validation](#compliance-validation)

---

## Executive Summary

Broxiva is committed to maintaining the highest standards of payment card security in compliance with the Payment Card Industry Data Security Standard (PCI DSS). This document outlines our approach to PCI DSS compliance, leveraging industry-leading payment processors (Stripe and PayPal) to minimize our compliance scope and ensure cardholder data protection.

**Key Compliance Strategy:**
- **No Direct Card Data Handling:** All payment card data is processed directly by PCI DSS Level 1 compliant providers (Stripe and PayPal)
- **SAQ A-EP Qualification:** We qualify for the simplest compliance path through full payment page outsourcing
- **Tokenization Architecture:** We only store payment tokens, never raw card data
- **Minimal PCI Scope:** Our infrastructure is designed to keep cardholder data environment (CDE) outside our systems

---

## PCI DSS Overview

### What is PCI DSS?

The Payment Card Industry Data Security Standard (PCI DSS) is a set of security standards designed to ensure that all companies that accept, process, store, or transmit credit card information maintain a secure environment.

### PCI DSS v4.0 Goals

1. **Build and Maintain a Secure Network and Systems**
2. **Protect Account Data**
3. **Maintain a Vulnerability Management Program**
4. **Implement Strong Access Control Measures**
5. **Regularly Monitor and Test Networks**
6. **Maintain an Information Security Policy**

### Merchant Levels

Broxiva qualifies as a **Level 4 Merchant** (processing fewer than 1 million e-commerce transactions annually per card brand):

- **Level 1:** Over 6 million transactions/year
- **Level 2:** 1 to 6 million transactions/year
- **Level 3:** 20,000 to 1 million e-commerce transactions/year
- **Level 4:** Fewer than 20,000 e-commerce transactions/year or up to 1 million total transactions

---

## Scope Determination

### In-Scope Systems

Systems that could impact cardholder data security:

1. **Web Application (Next.js Frontend)**
   - Payment form integration with Stripe Elements
   - PayPal SDK integration
   - HTTPS/TLS enforcement
   - Security headers implementation

2. **API Backend (NestJS)**
   - Webhook handlers for payment events
   - Token storage in database
   - User authentication and session management
   - Access control and authorization

3. **Database (PostgreSQL)**
   - Payment token storage (tokenized data only)
   - User profile information
   - Order and transaction logs

4. **Infrastructure**
   - Load balancers with SSL/TLS termination
   - Network segmentation
   - Firewall configurations
   - Logging and monitoring systems

### Out-of-Scope Systems

Systems explicitly outside PCI DSS scope:

1. **Payment Processing:** Handled entirely by Stripe and PayPal
2. **Card Data Storage:** No primary account numbers (PANs) stored
3. **Payment Gateways:** Managed by third-party providers
4. **Fraud Detection:** Leveraged through Stripe Radar and PayPal's systems

---

## SAQ (Self-Assessment Questionnaire) Type

### SAQ A-EP: E-commerce Outsourced Payments

Broxiva qualifies for **SAQ A-EP** based on the following criteria:

#### Qualification Requirements

✅ **All cardholder data is outsourced** to PCI DSS validated third-party service providers
✅ **No electronic storage, processing, or transmission** of any cardholder data on merchant systems
✅ **Payment pages are fully hosted** by Stripe and PayPal (via Stripe Elements and PayPal SDK)
✅ **Merchant does not receive** cardholder data
✅ **Website is secured** with proper TLS/SSL certificates
✅ **Proper network segmentation** exists between website and payment processing

#### SAQ A-EP Requirements Summary

SAQ A-EP includes approximately **178 controls** across the following areas:

1. **Security Policies and Procedures** (Requirement 12)
2. **Network Security Controls** (Requirements 1 & 2)
3. **Physical Security** (Requirement 9)
4. **Access Controls** (Requirements 7 & 8)
5. **Logging and Monitoring** (Requirement 10)
6. **Vulnerability Management** (Requirement 6)
7. **Regular Testing** (Requirement 11)

---

## Compliance Requirements

### Requirement 1: Install and Maintain Network Security Controls

#### 1.1 Network Security Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  CDN / Load Balancer │
            │   (SSL/TLS Termination) │
            └──────────┬───────────┘
                       │
            ┌──────────▼───────────┐
            │   Web Firewall (WAF) │
            │  - Rate limiting     │
            │  - DDoS protection   │
            └──────────┬───────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐           ┌────────────────┐
│ Web Servers   │           │  API Servers   │
│ (Next.js)     │           │  (NestJS)      │
│               │◄─────────►│                │
│ - No card data│           │ - Token only   │
└───────┬───────┘           └────────┬───────┘
        │                            │
        │                            ▼
        │                   ┌────────────────┐
        │                   │   Database     │
        │                   │  (PostgreSQL)  │
        │                   │                │
        │                   │ - Tokenized    │
        │                   │   data only    │
        │                   └────────────────┘
        │
        └──────────────┐
                       ▼
            ┌──────────────────────┐
            │  External Payment    │
            │    Processors        │
            │                      │
            │  ┌───────────────┐  │
            │  │    Stripe     │  │
            │  │  (PCI Level 1)│  │
            │  └───────────────┘  │
            │                      │
            │  ┌───────────────┐  │
            │  │   PayPal      │  │
            │  │  (PCI Level 1)│  │
            │  └───────────────┘  │
            └──────────────────────┘
```

#### 1.2 Firewall Configuration

**Inbound Rules:**
- Port 443 (HTTPS): Allowed from Internet
- Port 80 (HTTP): Redirect to 443
- Port 22 (SSH): Restricted to admin IPs only
- Port 5432 (PostgreSQL): Internal network only
- Port 6379 (Redis): Internal network only

**Outbound Rules:**
- Port 443: Allowed to Stripe/PayPal APIs
- Port 587/465: Allowed for email services
- Port 443: Allowed for external APIs (within whitelist)

#### 1.3 Network Segmentation

- **DMZ (Demilitarized Zone):** Web and API servers
- **Internal Zone:** Database, Redis, internal services
- **Admin Zone:** Management and monitoring tools (restricted access)

### Requirement 2: Apply Secure Configurations

#### 2.1 Configuration Standards

**Web Servers (Next.js):**
```typescript
// next.config.js
{
  reactStrictMode: true,
  poweredByHeader: false, // Hide framework details
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Additional headers defined in security policy
        ]
      }
    ]
  }
}
```

**API Servers (NestJS):**
- Remove default credentials
- Disable unnecessary services
- Use environment variables for configuration
- Implement security middleware

#### 2.2 System Hardening

- **Operating System:** Use hardened Linux distributions (Ubuntu Server LTS)
- **Remove Unnecessary Services:** Disable unused ports and protocols
- **Keep Systems Updated:** Automated security patching
- **Change Default Passwords:** All defaults changed on deployment
- **Use Strong Encryption:** TLS 1.2+ only, strong cipher suites

### Requirement 3: Protect Stored Account Data

#### 3.1 Cardholder Data Handling Policy

**Strict Policy: NO CARD DATA STORAGE**

Broxiva **NEVER** stores the following:

❌ Full magnetic stripe data or equivalent on chip
❌ Card verification code (CVV2, CVC2, CID)
❌ Personal Identification Number (PIN) or PIN block
❌ Full Primary Account Number (PAN)

#### 3.2 Permitted Data Storage

We **ONLY** store:

✅ **Payment Tokens:** Provided by Stripe (`pm_xxx`) and PayPal
✅ **Last 4 Digits:** For display purposes only (from tokenization service)
✅ **Card Brand:** Visa, Mastercard, etc. (from tokenization service)
✅ **Expiration Date:** For user convenience (from tokenization service)
✅ **Cardholder Name:** As provided during checkout

**Database Schema Example:**

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),

  -- Tokenized reference ONLY
  stripe_payment_method_id VARCHAR(255) NOT NULL, -- e.g., pm_1234567890

  -- Display data only (safe to store)
  card_brand VARCHAR(50),        -- 'visa', 'mastercard'
  card_last4 VARCHAR(4),         -- '4242'
  card_exp_month INTEGER,        -- 12
  card_exp_year INTEGER,         -- 2025

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- NO PAN, CVV, PIN, or full track data
  CONSTRAINT no_pan_storage CHECK (LENGTH(card_last4) = 4)
);
```

#### 3.3 Data Encryption

**Data at Rest:**
- Database encryption using PostgreSQL's pgcrypto extension
- Full disk encryption on all servers
- Encrypted backups with separate encryption keys

**Data in Transit:**
- TLS 1.2+ for all connections
- Strong cipher suites only (AES-256)
- Certificate pinning for payment provider APIs

### Requirement 4: Protect Cardholder Data with Strong Cryptography

#### 4.1 Encryption Standards

**TLS Configuration:**

```typescript
// Minimum TLS version: 1.2
// Preferred cipher suites:
const CIPHER_SUITES = [
  'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256'
];

// Disable weak protocols
const DISABLED_PROTOCOLS = [
  'SSLv2', 'SSLv3', 'TLSv1.0', 'TLSv1.1'
];
```

#### 4.2 Certificate Management

- **Certificate Authority:** Let's Encrypt with auto-renewal
- **Key Length:** 2048-bit RSA minimum (prefer 4096-bit)
- **Certificate Validity:** 90-day renewal cycle
- **Certificate Monitoring:** Automated expiration alerts
- **HSTS Enabled:** Force HTTPS for all connections

### Requirement 5: Protect All Systems from Malware

#### 5.1 Anti-Malware Controls

- **Container Security:** Regular scanning of Docker images
- **Dependency Scanning:** Automated vulnerability detection (npm audit, Snyk)
- **Runtime Protection:** Application-level security monitoring
- **File Integrity Monitoring:** Detect unauthorized changes

#### 5.2 Update Procedures

```bash
# Automated security updates
apt-get update && apt-get upgrade -y --security

# Dependency updates
pnpm audit fix
pnpm update

# Docker image updates
docker pull latest && docker scan
```

### Requirement 6: Develop and Maintain Secure Systems

#### 6.1 Secure Development Lifecycle

**Code Review Process:**
- All code changes require peer review
- Security-focused review for authentication/authorization changes
- Automated security testing in CI/CD pipeline

**Vulnerability Management:**
- Regular dependency updates
- Security advisories monitoring
- CVE tracking and patching
- Bug bounty program (future consideration)

#### 6.2 Change Management

**Deployment Process:**

1. **Development:** Local testing with security checks
2. **Staging:** Full integration and security testing
3. **Production:** Controlled rollout with rollback plan
4. **Monitoring:** Real-time security event monitoring

**Change Control:**
- All changes documented in version control
- Change approval process for production
- Rollback procedures tested quarterly

---

## Network Security Requirements

### Firewall Rules

#### Web Application Firewall (WAF)

**Enabled Protections:**
- SQL injection prevention
- Cross-site scripting (XSS) blocking
- CSRF token validation
- Rate limiting per IP
- Geographic restrictions (if applicable)
- Bot detection and mitigation

**WAF Configuration:**

```yaml
waf_rules:
  - rule: block_sql_injection
    action: block
    sensitivity: paranoia_level_2

  - rule: block_xss
    action: block
    patterns:
      - <script>
      - javascript:
      - onerror=

  - rule: rate_limiting
    action: throttle
    requests_per_minute: 100
    burst: 20

  - rule: geo_blocking
    action: block
    countries: [] # Configure as needed
```

### Network Access Control

**Role-Based Network Access:**

| Role | SSH | Database | Redis | Monitoring |
|------|-----|----------|-------|------------|
| Developer | ❌ | ❌ | ❌ | ✅ (read-only) |
| DevOps | ✅ | ✅ | ✅ | ✅ |
| DBA | ❌ | ✅ | ❌ | ✅ |
| Security | ✅ | ✅ (read) | ❌ | ✅ |

---

## Access Control Measures

### Requirement 7: Restrict Access to System Components

#### 7.1 Role-Based Access Control (RBAC)

**User Roles:**

```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',      // Full system access
  ADMIN = 'ADMIN',                   // Platform management
  SUPPORT = 'SUPPORT',               // Customer support
  VENDOR = 'VENDOR',                 // Vendor management
  CUSTOMER = 'CUSTOMER'              // End user
}

enum Permission {
  // User management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Order management
  ORDER_READ = 'order:read',
  ORDER_WRITE = 'order:write',
  ORDER_REFUND = 'order:refund',

  // Payment management
  PAYMENT_READ = 'payment:read',
  PAYMENT_REFUND = 'payment:refund',

  // System access
  SYSTEM_ADMIN = 'system:admin',
  LOGS_READ = 'logs:read',
  AUDIT_READ = 'audit:read'
}
```

**Access Control Implementation:**

```typescript
@Injectable()
export class AccessControlGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requiredPermission = this.reflector.get<Permission>(
      'permission',
      context.getHandler()
    );

    return this.hasPermission(user, requiredPermission);
  }
}
```

#### 7.2 Least Privilege Principle

- **Default Deny:** All access denied unless explicitly granted
- **Need-to-Know:** Access granted only for job functions
- **Separation of Duties:** Critical functions require multiple approvals
- **Regular Reviews:** Quarterly access reviews and cleanup

### Requirement 8: Identify Users and Authenticate Access

#### 8.1 Authentication Requirements

**Password Policy:**

```typescript
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5, // Last 5 passwords
  maxAge: 90, // Days
  lockoutThreshold: 5, // Failed attempts
  lockoutDuration: 30 // Minutes
};
```

**Multi-Factor Authentication (MFA):**

- **Required for:** Admins, DevOps, Support staff
- **Recommended for:** All users
- **Methods:** TOTP (Google Authenticator, Authy), SMS backup
- **Enforcement:** MFA required for sensitive operations

#### 8.2 Session Management

```typescript
const SESSION_CONFIG = {
  secret: process.env.SESSION_SECRET, // 256-bit key
  maxAge: 3600000, // 1 hour
  rolling: true, // Reset on activity
  secure: true, // HTTPS only
  httpOnly: true, // Prevent XSS
  sameSite: 'strict', // CSRF protection

  // Automatic timeout
  idleTimeout: 900000, // 15 minutes
  absoluteTimeout: 28800000 // 8 hours
};
```

#### 8.3 Credential Management

**API Keys and Secrets:**

- Stored in secure secret management system (e.g., HashiCorp Vault, AWS Secrets Manager)
- Rotated every 90 days
- Never committed to version control
- Separate keys for production and non-production environments

**Database Credentials:**

```bash
# Environment-based credentials
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD_SECRET} # From secret manager
DB_NAME=${DB_NAME}

# Connection encryption
DB_SSL_MODE=require
DB_SSL_CERT=/path/to/cert
```

---

## Monitoring and Testing

### Requirement 10: Log and Monitor All Access

#### 10.1 Logging Requirements

**Events to Log:**

1. **User Authentication:**
   - Login attempts (success/failure)
   - Logout events
   - Password changes
   - MFA events

2. **Access to Cardholder Data Environment:**
   - Database queries accessing payment tokens
   - API calls to payment endpoints
   - Administrative actions

3. **System Events:**
   - Application starts/stops
   - Configuration changes
   - Security events (failed access, suspicious activity)
   - Error conditions

**Log Format:**

```json
{
  "timestamp": "2025-12-03T10:15:30.123Z",
  "level": "info",
  "event": "user.login",
  "userId": "user_abc123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "success": true,
  "mfaUsed": true,
  "sessionId": "sess_xyz789",
  "metadata": {
    "loginMethod": "password",
    "deviceFingerprint": "fp_device123"
  }
}
```

#### 10.2 Log Protection

- **Centralized Logging:** All logs sent to secure logging service
- **Immutable Logs:** Cannot be modified after creation
- **Encrypted Storage:** Logs encrypted at rest
- **Access Controls:** Audit logs accessible only to authorized personnel
- **Retention:** Logs retained for 12 months minimum

#### 10.3 Real-Time Monitoring

**Security Alerts:**

```typescript
const SECURITY_ALERTS = {
  // Authentication failures
  failedLoginThreshold: {
    count: 5,
    window: '5m',
    action: 'account_lock',
    notify: ['security@broxiva.com']
  },

  // Unusual activity
  suspiciousActivity: {
    triggers: [
      'multiple_failed_payments',
      'rapid_cart_changes',
      'unusual_ip_location'
    ],
    action: 'flag_for_review',
    notify: ['security@broxiva.com', 'fraud@broxiva.com']
  },

  // System security
  systemSecurity: {
    triggers: [
      'unauthorized_access_attempt',
      'configuration_change',
      'certificate_expiration_warning'
    ],
    action: 'immediate_alert',
    notify: ['security@broxiva.com', 'devops@broxiva.com']
  }
};
```

### Requirement 11: Test Security of Systems and Networks

#### 11.1 Vulnerability Scanning

**Internal Scanning:**
- Frequency: Quarterly and after significant changes
- Scope: All systems in cardholder data environment
- Tool: OpenVAS, Nessus, or equivalent
- Remediation: High/Critical within 30 days

**External Scanning:**
- Frequency: Quarterly
- Provider: Approved Scanning Vendor (ASV)
- Scope: All external-facing systems
- Compliance: Must pass ASV scan for compliance

#### 11.2 Penetration Testing

**Annual Pen Test:**
- Frequency: Annually and after significant changes
- Methodology: OWASP Testing Guide, PTES
- Scope: Application, network, social engineering
- Tester: Qualified internal team or external firm

**Test Areas:**

1. **Application Security:**
   - Authentication and authorization bypass
   - Injection attacks (SQL, NoSQL, XSS)
   - Business logic flaws
   - Session management

2. **Network Security:**
   - Firewall rule effectiveness
   - Network segmentation
   - Wireless security (if applicable)
   - SSL/TLS configuration

3. **Social Engineering:**
   - Phishing simulations
   - Physical security testing
   - Information disclosure

#### 11.3 Security Testing in CI/CD

```yaml
# .github/workflows/security.yml
name: Security Testing

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run SAST
        run: |
          npm run security:sast

      - name: Dependency scan
        run: |
          npm audit --audit-level=moderate

      - name: Container scan
        run: |
          docker scan broxiva:latest

      - name: Secret scan
        uses: trufflesecurity/trufflehog@main

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
```

---

## Information Security Policy

### Requirement 12: Support Information Security with Policies

#### 12.1 Security Policy Overview

**Policy Framework:**

1. **Acceptable Use Policy:** Guidelines for system use
2. **Access Control Policy:** User access management
3. **Change Management Policy:** System modification procedures
4. **Incident Response Policy:** Security incident handling
5. **Data Classification Policy:** Information sensitivity levels
6. **Vendor Management Policy:** Third-party security requirements

#### 12.2 Employee Security Awareness

**Training Program:**

- **Frequency:** Annual mandatory training, plus onboarding
- **Topics:**
  - PCI DSS basics and importance
  - Phishing and social engineering
  - Password security and MFA
  - Data handling procedures
  - Incident reporting

**Training Tracking:**

```typescript
interface SecurityTraining {
  employeeId: string;
  courseName: string;
  completionDate: Date;
  score: number;
  certificateId: string;
  nextRenewal: Date;
}
```

#### 12.3 Incident Response Plan

**Incident Response Team:**

| Role | Responsibilities |
|------|-----------------|
| Incident Commander | Overall coordination and decision-making |
| Security Lead | Technical investigation and containment |
| Communications Lead | Internal and external communications |
| Legal Counsel | Legal compliance and notifications |
| DevOps Lead | System recovery and restoration |

**Response Procedures:**

1. **Detection:** Identify and verify security incident
2. **Containment:** Isolate affected systems
3. **Investigation:** Determine scope and impact
4. **Eradication:** Remove threat and vulnerabilities
5. **Recovery:** Restore systems to normal operation
6. **Post-Incident:** Document lessons learned and improve

**Communication Plan:**

```typescript
const INCIDENT_NOTIFICATION = {
  // Internal notification
  internal: {
    severity: ['critical', 'high', 'medium', 'low'],
    channels: ['email', 'slack', 'sms'],
    recipients: {
      critical: ['cto', 'ciso', 'ceo', 'legal'],
      high: ['cto', 'ciso', 'devops_lead'],
      medium: ['ciso', 'security_team'],
      low: ['security_team']
    }
  },

  // External notification (if required)
  external: {
    triggers: ['data_breach', 'payment_compromise'],
    timeline: {
      cardBrands: '72 hours', // Visa, Mastercard, etc.
      customers: 'as required by law',
      regulators: 'as required by law'
    }
  }
};
```

#### 12.4 Risk Assessment

**Annual Risk Assessment Process:**

1. **Asset Identification:** Catalog all systems and data
2. **Threat Identification:** Identify potential threats
3. **Vulnerability Assessment:** Identify weaknesses
4. **Risk Analysis:** Calculate likelihood and impact
5. **Risk Treatment:** Accept, mitigate, transfer, or avoid
6. **Documentation:** Record findings and decisions

**Risk Matrix:**

| Likelihood | Impact Low | Impact Medium | Impact High |
|------------|-----------|---------------|-------------|
| Low | Low | Low | Medium |
| Medium | Low | Medium | High |
| High | Medium | High | Critical |

---

## Third-Party Service Providers

### PCI DSS Validated Service Providers

#### Stripe Integration

**Compliance Details:**
- **PCI DSS Level:** Level 1 Service Provider
- **Certification:** PCI DSS v4.0 compliant
- **AOC:** Available at https://stripe.com/docs/security/pci
- **Attestation Date:** Verified annually

**Secure Integration:**

```typescript
// Stripe.js loaded directly from Stripe's servers
// No card data touches our servers
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Stripe Elements handles all card data
const elements = stripe.elements();
const cardElement = elements.create('card', {
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
    }
  }
});
```

**Benefits:**
- Card data never enters our environment
- PCI scope significantly reduced
- Built-in fraud detection (Stripe Radar)
- Strong customer authentication (SCA) support

#### PayPal Integration

**Compliance Details:**
- **PCI DSS Level:** Level 1 Service Provider
- **Certification:** PCI DSS v4.0 compliant
- **AOC:** Available through PayPal developer documentation
- **Attestation Date:** Verified annually

**Secure Integration:**

```typescript
// PayPal SDK integration
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// All payment data handled by PayPal
<PayPalButtons
  createOrder={(data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: { value: '100.00' }
      }]
    });
  }}
  onApprove={(data, actions) => {
    // Capture order on our backend using order ID
    return capturePayPalOrder(data.orderID);
  }}
/>
```

### Service Provider Management

**Vendor Assessment Checklist:**

- [ ] PCI DSS compliance validation
- [ ] Current Attestation of Compliance (AOC)
- [ ] Security questionnaire completed
- [ ] Contract includes security requirements
- [ ] Data handling procedures documented
- [ ] Incident notification process established
- [ ] Annual compliance re-validation

---

## Annual Compliance Activities

### Compliance Calendar

| Activity | Frequency | Responsible Party | Documentation |
|----------|-----------|-------------------|---------------|
| SAQ Completion | Annual | CISO / Security Team | SAQ A-EP form |
| Risk Assessment | Annual | Security Team | Risk Assessment Report |
| Vulnerability Scan (External) | Quarterly | ASV | ASV Scan Report |
| Vulnerability Scan (Internal) | Quarterly | IT/Security | Internal Scan Report |
| Penetration Testing | Annual | Security Team or 3rd Party | Pen Test Report |
| Security Awareness Training | Annual | HR / Security | Training Records |
| Access Review | Quarterly | IT / Managers | Access Review Log |
| Log Review | Daily/Weekly | Security Team | Log Analysis Reports |
| Firewall Rule Review | Semi-Annual | Network Team | Firewall Review Doc |
| Policy Review | Annual | Legal / Security | Updated Policy Docs |

### Quarterly Tasks

**Q1 (January - March):**
- [ ] Conduct external vulnerability scan
- [ ] Conduct internal vulnerability scan
- [ ] Quarterly access review
- [ ] Review and update security policies
- [ ] Test incident response procedures

**Q2 (April - June):**
- [ ] Conduct external vulnerability scan
- [ ] Conduct internal vulnerability scan
- [ ] Annual penetration testing
- [ ] Quarterly access review
- [ ] Annual security awareness training

**Q3 (July - September):**
- [ ] Conduct external vulnerability scan
- [ ] Conduct internal vulnerability scan
- [ ] Complete annual SAQ A-EP
- [ ] Quarterly access review
- [ ] Annual risk assessment

**Q4 (October - December):**
- [ ] Conduct external vulnerability scan
- [ ] Conduct internal vulnerability scan
- [ ] Quarterly access review
- [ ] Review service provider compliance
- [ ] Update compliance documentation for new year

---

## Compliance Validation

### Self-Assessment Questionnaire (SAQ) Process

**Step 1: Prepare Documentation**
- Network diagrams
- Data flow diagrams
- Security policies
- Service provider AOCs
- Vulnerability scan reports
- Penetration test results

**Step 2: Complete SAQ A-EP**
- Answer all 178 questions honestly
- Provide evidence for each control
- Document compensating controls if needed
- Review with legal counsel

**Step 3: Executive Sign-Off**
- CEO or authorized executive signature
- Attestation of compliance date
- Responsibility acknowledgment

**Step 4: Submit to Acquiring Bank**
- Submit completed SAQ
- Include supporting documentation
- Receive compliance acknowledgment
- Maintain records for 3+ years

### Attestation of Compliance (AOC)

**Required Elements:**
- Company information
- Assessment type (SAQ A-EP)
- Compliance status (Compliant / Non-Compliant)
- Assessment date
- Executive signature
- Expiration date (12 months from completion)

### Continuous Compliance

**Ongoing Activities:**
- Real-time security monitoring
- Daily log review for anomalies
- Immediate patching of critical vulnerabilities
- Quarterly access reviews
- Regular security awareness reminders
- Incident response drills

---

## Conclusion

Broxiva maintains PCI DSS compliance through a defense-in-depth strategy that leverages PCI DSS Level 1 certified payment processors (Stripe and PayPal) to minimize our compliance scope. By never storing or processing raw cardholder data, we qualify for the simplest compliance path (SAQ A-EP) while still maintaining robust security controls across our platform.

**Key Compliance Strengths:**

✅ No direct cardholder data handling
✅ Tokenized payment architecture
✅ Strong encryption (TLS 1.2+)
✅ Comprehensive access controls
✅ Real-time monitoring and alerting
✅ Regular security testing
✅ Employee security awareness program
✅ Documented incident response procedures

**Commitment to Security:**

Broxiva is committed to maintaining and continuously improving our security posture to protect customer payment information and maintain PCI DSS compliance. This document is reviewed and updated annually or whenever significant changes occur to our systems or the PCI DSS standard.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | Broxiva Security Team | Initial documentation |

**Next Review Date:** 2026-12-03

**Contact Information:**
- **Security Team:** security@broxiva.com
- **Compliance Officer:** compliance@broxiva.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX (24/7)

---

**End of Document**
