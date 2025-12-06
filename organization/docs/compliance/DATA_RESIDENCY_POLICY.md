# Data Residency Policy

## Executive Summary

CitadelBuy Global B2B Marketplace operates a multi-region data infrastructure to comply with data localization laws and ensure optimal data sovereignty for all users worldwide.

## Data Storage Locations

### Primary Data Centers

| Region | Location | Provider | Certifications | Compliance |
|--------|----------|----------|---------------|------------|
| Europe | Dublin, Ireland (eu-west-1) | AWS | ISO 27001, SOC 2, GDPR | GDPR, eIDAS |
| North America | Virginia, US (us-east-1) | AWS | ISO 27001, SOC 2, HIPAA | CCPA, HIPAA |
| Africa | Cape Town, South Africa (af-south-1) | AWS | ISO 27001, SOC 2 | POPIA |
| Middle East | Bahrain (me-south-1) | AWS | ISO 27001, SOC 2 | UAE Data Protection |
| Asia-Pacific | Singapore (ap-southeast-1) | AWS | ISO 27001, MTCS Tier 3 | PDPA |

## Regional Data Residency Requirements

### Europe (GDPR)
**Storage:** EU/EEA member states
**Cross-Border Transfers:** Only to adequate countries or via SCC/BCR
**Data Localization:** Not required, but EU storage preferred
**Compliance Mechanisms:**
- Standard Contractual Clauses (SCC)
- Binding Corporate Rules (BCR)
- EU-US Data Privacy Framework
- Adequacy decisions

**User Rights:**
- Right to data portability
- Right to erasure
- Right to know storage location
- Right to object to transfers

### United States (CCPA/CPRA)
**Storage:** US or global
**Cross-Border Transfers:** Disclosure required
**Data Localization:** Not required
**Compliance Requirements:**
- Transparency about international transfers
- Consumer right to know where data is stored
- "Do Not Sell" opt-out mechanism

### Africa

#### Nigeria (NDPR)
**Storage:** Primary storage MUST be in Nigeria
**Cross-Border Transfers:** Requires approval
**Data Localization:** MANDATORY for all Nigerian user data
**Implementation:** Local database instance in Lagos data center (planned 2026)

#### South Africa (POPIA)
**Storage:** South Africa or adequate protection countries
**Cross-Border Transfers:** Only with data subject consent or adequate protection
**Data Localization:** Not mandatory but recommended
**Current Setup:** af-south-1 (Cape Town) primary storage

#### Kenya (Data Protection Act)
**Storage:** Kenya or adequate countries
**Cross-Border Transfers:** Requires comparable protection
**Data Localization:** Not mandatory
**Current Setup:** af-south-1 with replication to ap-southeast-1

### Middle East

#### UAE
**Storage:** UAE or approved international locations
**Cross-Border Transfers:** Permitted with safeguards
**Data Localization:** Required for government data only
**Current Setup:** me-south-1 (Bahrain)

#### Saudi Arabia
**Storage:** Within Kingdom for critical data
**Cross-Border Transfers:** Requires approval for sensitive data
**Data Localization:** Mandatory for government and financial data
**Implementation:** Local partner data center (planned 2026)

### Asia-Pacific

#### Singapore (PDPA)
**Storage:** Singapore or globally
**Cross-Border Transfers:** With comparable protection
**Data Localization:** Not required
**Current Setup:** ap-southeast-1 (Singapore)

#### China (PIPL)
**Storage:** MUST be in China
**Cross-Border Transfers:** Security assessment required
**Data Localization:** MANDATORY
**Implementation:** Local data center required (planned 2027)

## Data Classification

### PUBLIC
**Storage:** Any region
**Encryption:** TLS in transit
**Examples:** Product listings, public profiles, marketing content

### INTERNAL
**Storage:** Region-specific
**Encryption:** TLS + AES-256 at rest
**Examples:** Business analytics, operational data

### CONFIDENTIAL
**Storage:** User's home region only
**Encryption:** TLS + AES-256 + field-level encryption
**Examples:** Business documents, contracts, financial records

### RESTRICTED
**Storage:** User's home region with strict access controls
**Encryption:** TLS + AES-256 + field-level + encryption keys in HSM
**Examples:** Authentication credentials, payment information

### PII (Personally Identifiable Information)
**Storage:** User's home region
**Encryption:** Full encryption + pseudonymization
**Examples:** Names, emails, addresses, phone numbers, ID documents
**Retention:** As per regional law (GDPR: purpose limitation)

### FINANCIAL DATA
**Storage:** User's home region + PCI-DSS compliant
**Encryption:** End-to-end encryption + tokenization
**Examples:** Payment methods, transaction history, tax records
**Retention:** Minimum 7 years for tax compliance

## Cross-Border Data Transfer Mechanisms

### Standard Contractual Clauses (SCC)
**Used For:** EU to non-adequate countries
**Implementation:** Executed between CitadelBuy entities
**Review:** Annual Transfer Impact Assessment

### Binding Corporate Rules (BCR)
**Used For:** Intra-company EU transfers
**Status:** In development (target Q2 2026)

### Adequacy Decisions
**Approved Countries:**
- EU adequacy: UK, Switzerland, Japan, Canada, South Korea, New Zealand, Argentina, Uruguay, Israel
- Automatic approval for transfers to these countries

### Explicit Consent
**Used For:** One-off transfers or specific use cases
**Implementation:** Clear consent mechanism with withdrawal option

## Technical Implementation

### Data Routing
```
User Location → Determines Primary Region → Data stored in regional database
                                          → Encrypted backups in secondary region
                                          → Cross-border transfers only if legally permitted
```

### Regional Database Architecture
- **Primary:** Active read/write database in user's region
- **Secondary:** Read replicas for performance (within compliant regions)
- **Backup:** Encrypted backups in same region + one compliant region
- **Disaster Recovery:** Warm standby in compliant secondary region

### Encryption Standards
- **In Transit:** TLS 1.3
- **At Rest:** AES-256-GCM
- **Field-Level:** AES-256 for PII/Financial data
- **Key Management:** AWS KMS with customer-managed keys (CMK)

## User Data Location Preferences

Users can specify data storage preferences:
1. **Automatic:** Based on account country (default)
2. **Strict Local:** Data never leaves home country (where available)
3. **EU Only:** For EU users concerned about non-EU transfers
4. **Multi-Region:** For performance (with legal safeguards)

## Compliance Monitoring

### Automated Checks
- Daily scan of data storage locations
- Verification against residency requirements
- Alert on non-compliant data placement
- Quarterly compliance reports

### Manual Audits
- Semi-annual data residency audit
- Annual compliance certification review
- Third-party penetration testing
- Regulatory audit support

## Data Retention by Region

| Region | PII Retention | Financial Data | Business Records |
|--------|---------------|----------------|------------------|
| EU (GDPR) | Purpose limitation + 30 days | 7 years (tax law) | 7 years |
| US (CCPA) | No limit | 7 years (IRS) | 7 years |
| South Africa (POPIA) | Purpose + reasonable period | 7 years | 5 years |
| Nigeria (NDPR) | Purpose limitation | 7 years | 6 years |
| UAE | No specific limit | 7 years | 5 years |
| Singapore (PDPA) | Purpose + reasonable period | 7 years | 5 years |

## Breach Notification

### EU (GDPR)
- **Regulator:** Within 72 hours
- **Data Subjects:** Without undue delay if high risk
- **Cross-border:** Lead supervisory authority notified

### Other Regions
- Varies by jurisdiction (documented in incident response plan)

## User Rights

### Right to Know Data Location
**Implementation:** User dashboard shows:
- Primary storage location
- Backup locations
- Any cross-border transfers
- Legal basis for transfers

### Right to Request Local Storage
**Process:**
1. User requests strict local storage
2. System migrates data to local region
3. Cross-border transfers blocked
4. Confirmation provided within 30 days

### Right to Data Portability
**Implementation:**
- Export data in JSON format
- Includes data location metadata
- Available on demand

## Exceptions

### Payment Processing
Card data processed via PCI-DSS compliant processors:
- Stripe (US, EU, Singapore)
- PayPal (US, EU)
- Tokenized; full card data not stored

### CDN and Edge Caching
Non-sensitive public data may be cached globally via CloudFront for performance. PII never cached.

### Third-Party Services
Documented Data Processing Agreements (DPA) with:
- Email service (SendGrid - US/EU)
- Analytics (anonymized only)
- Customer support (Zendesk - US/EU)

## Contact

**Data Protection Officer:**
- Email: dpo@citadelbuy.com
- EU Representative: eu-representative@citadelbuy.com
- UK Representative: uk-representative@citadelbuy.com

**Data Residency Inquiries:**
- Email: data-residency@citadelbuy.com
- Support Portal: https://support.citadelbuy.com/data-residency

## Document Control

- **Version:** 2.0
- **Last Updated:** 2025-12-06
- **Next Review:** 2026-06-01
- **Owner:** Chief Compliance Officer
- **Approval:** Legal & Compliance Committee
