# Vendor Data Processing Agreement (DPA) Tracker

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Classification:** Internal - Confidential
**Owner:** Data Protection Officer / Legal Team

---

## Table of Contents

1. [Overview](#overview)
2. [Vendor DPA Summary Table](#vendor-dpa-summary-table)
3. [Detailed Vendor Profiles](#detailed-vendor-profiles)
4. [Sub-Processor Management](#sub-processor-management)
5. [Review Schedule](#review-schedule)
6. [DPA Requirements Checklist](#dpa-requirements-checklist)
7. [Data Transfer Mechanisms](#data-transfer-mechanisms)
8. [Incident Response Coordination](#incident-response-coordination)

---

## Overview

### Purpose

This document tracks all third-party vendors that process personal data on behalf of Broxiva. It ensures compliance with:

- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Payment Card Industry Data Security Standard (PCI DSS)
- Other applicable data protection regulations

### Definitions

| Term | Definition |
|------|------------|
| **DPA** | Data Processing Agreement - contractual agreement governing data processing |
| **Data Controller** | Broxiva - determines purposes and means of processing |
| **Data Processor** | Third-party vendor processing data on our behalf |
| **Sub-Processor** | Third party engaged by a processor to process data |
| **SCC** | Standard Contractual Clauses for international data transfers |
| **BCR** | Binding Corporate Rules for intra-group data transfers |

---

## Vendor DPA Summary Table

### Primary Vendors

| Vendor | Category | DPA Status | Data Types | Sub-Processors | Last Review | Next Review | Risk Level |
|--------|----------|------------|------------|----------------|-------------|-------------|------------|
| **Stripe** | Payment Processing | Signed | Payment, Customer, Transaction | Yes (40+) | 2025-10-15 | 2026-04-15 | High |
| **SendGrid (Twilio)** | Email Delivery | Signed | Email, Customer, Marketing | Yes (10+) | 2025-09-01 | 2026-03-01 | Medium |
| **AWS** | Cloud Infrastructure | Signed | All Data Types | Yes (varies by service) | 2025-11-01 | 2026-05-01 | Critical |
| **Google Analytics** | Analytics | Signed | Behavioral, Device | Yes (Google entities) | 2025-08-15 | 2026-02-15 | Medium |
| **Zendesk** | Customer Support | Signed | Customer, Support Tickets | Yes (20+) | 2025-07-20 | 2026-01-20 | Medium |
| **Sentry** | Error Monitoring | Signed | Technical, User Session | Yes (5+) | 2025-10-01 | 2026-04-01 | Low |

### Secondary Vendors

| Vendor | Category | DPA Status | Data Types | Sub-Processors | Last Review | Next Review | Risk Level |
|--------|----------|------------|------------|----------------|-------------|-------------|------------|
| **Cloudflare** | CDN/Security | Signed | Traffic, IP Addresses | Yes (limited) | 2025-09-15 | 2026-03-15 | Medium |
| **Twilio** | SMS/Communications | Signed | Phone, Customer | Yes (10+) | 2025-08-01 | 2026-02-01 | Medium |
| **Algolia** | Search | Signed | Product, Search Queries | Yes (5+) | 2025-11-15 | 2026-05-15 | Low |
| **Segment** | Data Pipeline | Signed | All Event Data | Yes (varies) | 2025-10-20 | 2026-04-20 | High |
| **Datadog** | Monitoring | Signed | Technical, Logs | Yes (10+) | 2025-09-30 | 2026-03-30 | Low |
| **Intercom** | Customer Messaging | Pending | Customer, Chat | Yes (15+) | N/A | N/A | Medium |

### Status Legend

| Status | Description |
|--------|-------------|
| **Signed** | DPA executed and on file |
| **Pending** | DPA under negotiation or review |
| **Not Required** | No personal data processing or controller-to-controller relationship |
| **Expired** | DPA needs renewal |
| **Under Review** | Annual review in progress |

---

## Detailed Vendor Profiles

### Stripe

| Field | Details |
|-------|---------|
| **Legal Entity** | Stripe, Inc. |
| **Headquarters** | San Francisco, CA, USA |
| **DPA Location** | [Stripe DPA](https://stripe.com/legal/dpa) |
| **DPA Signed Date** | 2025-03-15 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Finance / Legal |
| **Primary Contact** | Account Manager |
| **Support Contact** | support@stripe.com |
| **Emergency Contact** | +1-888-926-2289 |

**Data Processing Categories:**
- Payment card data (PCI DSS scope)
- Customer identification data
- Transaction records
- Bank account information (for payouts)
- Fraud detection signals

**Data Residency:**
- Primary: US data centers
- EU data available via Stripe Atlas
- Data localization options available

**Sub-Processor Notification:**
- URL: https://stripe.com/legal/service-providers
- Notification Method: Website updates + email
- Objection Period: 30 days

**Security Certifications:**
- PCI DSS Level 1
- SOC 1 Type II
- SOC 2 Type II
- ISO 27001

**Data Deletion:**
- Retention Period: As required by law (7 years for financial records)
- Deletion Process: Automated after retention period
- Deletion Confirmation: Available upon request

---

### SendGrid (Twilio)

| Field | Details |
|-------|---------|
| **Legal Entity** | Twilio Inc. (SendGrid) |
| **Headquarters** | San Francisco, CA, USA |
| **DPA Location** | [Twilio DPA](https://www.twilio.com/legal/data-protection-addendum) |
| **DPA Signed Date** | 2025-04-01 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Engineering / Marketing |
| **Primary Contact** | Account Manager |
| **Support Contact** | support@sendgrid.com |
| **Emergency Contact** | Enterprise Support Line |

**Data Processing Categories:**
- Email addresses
- Email content (transactional and marketing)
- Email engagement metrics
- Recipient metadata
- Bounce and complaint data

**Data Residency:**
- Primary: US data centers
- EU processing available on request
- No guaranteed data residency

**Sub-Processor Notification:**
- URL: https://www.twilio.com/legal/sub-processors
- Notification Method: Website updates
- Objection Period: 30 days

**Security Certifications:**
- SOC 2 Type II
- ISO 27001
- CSA STAR

**Email Compliance Features:**
- CAN-SPAM compliance tools
- GDPR consent management
- Unsubscribe handling
- Suppression list management

---

### Amazon Web Services (AWS)

| Field | Details |
|-------|---------|
| **Legal Entity** | Amazon Web Services, Inc. |
| **Headquarters** | Seattle, WA, USA |
| **DPA Location** | [AWS DPA](https://aws.amazon.com/compliance/data-processing-addendum/) |
| **DPA Signed Date** | 2025-02-01 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Engineering / DevOps |
| **Primary Contact** | AWS Account Manager |
| **Support Contact** | AWS Support Console |
| **Emergency Contact** | AWS Enterprise Support |

**Data Processing Categories:**
- All application data
- Customer personal data
- Employee data
- Log and monitoring data
- Backup and disaster recovery data

**Data Residency:**
- Primary Region: us-east-1 (N. Virginia)
- DR Region: us-west-2 (Oregon)
- EU Region: eu-west-1 (Ireland) - for EU customers
- Data residency guaranteed per region selection

**Sub-Processor Notification:**
- URL: https://aws.amazon.com/compliance/sub-processors/
- Notification Method: Website + AWS notifications
- Objection Period: 30 days

**Security Certifications:**
- SOC 1, 2, 3
- ISO 27001, 27017, 27018
- PCI DSS Level 1
- FedRAMP
- HIPAA eligible
- C5 (Germany)
- Many more region-specific

**AWS Services in Use:**
| Service | Data Type | Purpose |
|---------|-----------|---------|
| EC2/EKS | All | Compute |
| RDS | All DB data | Database |
| S3 | Files, Backups | Storage |
| CloudFront | Static assets | CDN |
| SES | Email | Email delivery |
| SNS/SQS | Messages | Messaging |
| CloudWatch | Logs | Monitoring |
| Secrets Manager | Credentials | Secret storage |
| KMS | Encryption keys | Key management |

---

### Google Analytics

| Field | Details |
|-------|---------|
| **Legal Entity** | Google LLC |
| **Headquarters** | Mountain View, CA, USA |
| **DPA Location** | [Google Ads DPA](https://privacy.google.com/businesses/processorterms/) |
| **DPA Signed Date** | 2025-05-15 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Marketing |
| **Primary Contact** | Google Account Manager |
| **Support Contact** | Google Support Console |
| **Emergency Contact** | N/A |

**Data Processing Categories:**
- Website usage data
- User behavior patterns
- Device and browser information
- IP addresses (anonymized)
- Conversion tracking data

**Data Residency:**
- Global data centers
- EU data storage available (GA4)
- IP anonymization enabled

**Configuration for Compliance:**
- [ ] IP anonymization enabled
- [ ] Data retention set to 14 months
- [ ] User-ID feature disabled (or consented)
- [ ] Remarketing disabled (or consented)
- [ ] Data sharing settings reviewed
- [ ] Google Signals disabled (or consented)

**Sub-Processor Notification:**
- URL: https://privacy.google.com/businesses/subprocessors/
- Notification Method: Website updates
- Objection Period: 30 days

**Security Certifications:**
- ISO 27001
- SOC 2
- SOC 3

---

### Zendesk

| Field | Details |
|-------|---------|
| **Legal Entity** | Zendesk, Inc. |
| **Headquarters** | San Francisco, CA, USA |
| **DPA Location** | [Zendesk DPA](https://www.zendesk.com/company/agreements-and-terms/data-processing-agreement/) |
| **DPA Signed Date** | 2025-06-01 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Customer Success |
| **Primary Contact** | Account Manager |
| **Support Contact** | support@zendesk.com |
| **Emergency Contact** | Enterprise Support |

**Data Processing Categories:**
- Customer contact information
- Support ticket content
- Chat transcripts
- Customer satisfaction data
- Agent performance data

**Data Residency:**
- US data center (default)
- EU data center available
- Australia data center available

**Sub-Processor Notification:**
- URL: https://www.zendesk.com/company/agreements-and-terms/sub-processors/
- Notification Method: Website + email
- Objection Period: 30 days

**Security Certifications:**
- SOC 2 Type II
- ISO 27001
- ISO 27018
- CSA STAR

**Data Deletion:**
- Retention: Configurable (30-365 days after closure)
- Deletion: Automatic or manual
- Export: Available via API

---

### Sentry

| Field | Details |
|-------|---------|
| **Legal Entity** | Functional Software, Inc. (dba Sentry) |
| **Headquarters** | San Francisco, CA, USA |
| **DPA Location** | [Sentry DPA](https://sentry.io/legal/dpa/) |
| **DPA Signed Date** | 2025-07-15 |
| **DPA Expiration** | Perpetual (with terms) |
| **Contract Owner** | Engineering |
| **Primary Contact** | Account Manager |
| **Support Contact** | support@sentry.io |
| **Emergency Contact** | Enterprise Support |

**Data Processing Categories:**
- Error and exception data
- Stack traces
- User session data (breadcrumbs)
- Device and browser information
- Custom context data

**Data Minimization Measures:**
- [ ] PII scrubbing enabled
- [ ] IP address collection disabled
- [ ] User ID hashing enabled
- [ ] Sensitive data filters configured
- [ ] Data retention set to 30 days

**Data Residency:**
- US data center (default)
- EU data center available (Business plan)

**Sub-Processor Notification:**
- URL: https://sentry.io/legal/subprocessors/
- Notification Method: Website updates
- Objection Period: 30 days

**Security Certifications:**
- SOC 2 Type II
- ISO 27001

---

## Sub-Processor Management

### Sub-Processor Notification Tracking

| Vendor | Last Notification | Changes | Action Required | Action Taken |
|--------|-------------------|---------|-----------------|--------------|
| Stripe | 2025-12-01 | Added 2 sub-processors | Review required | Reviewed 2025-12-15 |
| AWS | 2025-11-15 | No material changes | None | N/A |
| SendGrid | 2025-10-20 | Added 1 sub-processor | Review required | Pending |
| Google | 2025-09-01 | No material changes | None | N/A |
| Zendesk | 2025-11-01 | Added 3 sub-processors | Review required | Reviewed 2025-11-20 |
| Sentry | 2025-08-15 | No changes | None | N/A |

### Sub-Processor Review Process

1. **Notification Received**
   - Monitor vendor sub-processor pages
   - Subscribe to email notifications
   - Calendar reminders for manual checks

2. **Assessment Criteria**
   - Nature of data processed
   - Geographic location
   - Security certifications
   - Data handling practices

3. **Decision**
   - Accept: No action needed
   - Object: Raise within objection period
   - Escalate: Involve legal/DPO

4. **Documentation**
   - Record decision in this tracker
   - Update risk assessment if needed
   - Notify internal stakeholders

### Objection Template

```markdown
To: [Vendor Legal/Privacy Contact]
Subject: Objection to Sub-Processor Addition - [Sub-Processor Name]

Dear [Vendor],

Pursuant to our Data Processing Agreement dated [DATE], we are writing to
formally object to the addition of [SUB-PROCESSOR NAME] as a sub-processor
for the following reasons:

1. [Reason 1 - e.g., data residency concerns]
2. [Reason 2 - e.g., security certification gaps]
3. [Reason 3 - e.g., regulatory concerns]

We request that you:
[ ] Provide additional information about data handling
[ ] Confirm data will not be processed by this sub-processor
[ ] Discuss alternative arrangements

Please respond within [TIMEFRAME] to discuss resolution.

Sincerely,
[Name]
[Title]
Broxiva
```

---

## Review Schedule

### Annual Review Calendar

| Month | Vendors for Review | Reviewer | Due Date |
|-------|-------------------|----------|----------|
| January | Zendesk, Intercom | Legal | Jan 20 |
| February | Google Analytics, Segment | Marketing + Legal | Feb 15 |
| March | SendGrid, Twilio | Engineering + Legal | Mar 1 |
| April | Stripe, Sentry | Finance + Legal | Apr 15 |
| May | AWS | DevOps + Legal | May 1 |
| June | Cloudflare, Algolia | Engineering + Legal | Jun 15 |
| July | All vendors - Mid-year audit | DPO | Jul 31 |
| August | New vendor assessments | Legal | Ongoing |
| September | Sub-processor updates review | Legal | Sep 30 |
| October | Security certification validation | Security | Oct 31 |
| November | Data retention compliance check | DPO | Nov 30 |
| December | Annual compliance report | DPO | Dec 15 |

### Review Checklist

For each vendor review:

- [ ] DPA still valid and current
- [ ] Terms have not materially changed
- [ ] Sub-processor list is current
- [ ] Security certifications are valid
- [ ] Data processing purposes unchanged
- [ ] No new regulatory concerns
- [ ] Incident history reviewed
- [ ] Data deletion requests honored
- [ ] Contact information current
- [ ] Contract renewal date noted

---

## DPA Requirements Checklist

### Minimum DPA Requirements

Every vendor DPA must include:

#### Article 28 GDPR Requirements

- [ ] **Processing Instructions** - Clear documentation of processing purposes
- [ ] **Confidentiality** - Personnel confidentiality obligations
- [ ] **Security Measures** - Appropriate technical and organizational measures
- [ ] **Sub-Processor Consent** - Prior authorization for sub-processors
- [ ] **Data Subject Rights** - Assistance with rights requests
- [ ] **Deletion/Return** - Data deletion at end of processing
- [ ] **Audit Rights** - Controller audit and inspection rights
- [ ] **Breach Notification** - Timely breach notification obligations

#### Additional Requirements

- [ ] **Data Residency** - Clear data location provisions
- [ ] **Transfer Mechanisms** - SCCs or adequacy decision for international transfers
- [ ] **Liability** - Clear liability and indemnification terms
- [ ] **Insurance** - Adequate insurance coverage
- [ ] **Termination** - Clear termination and transition provisions

### DPA Scoring Matrix

| Requirement | Weight | Stripe | SendGrid | AWS | Google | Zendesk | Sentry |
|-------------|--------|--------|----------|-----|--------|---------|--------|
| Processing Instructions | 10% | 10 | 10 | 10 | 9 | 10 | 10 |
| Confidentiality | 10% | 10 | 10 | 10 | 10 | 10 | 10 |
| Security Measures | 15% | 10 | 9 | 10 | 10 | 9 | 9 |
| Sub-Processor Consent | 10% | 9 | 9 | 9 | 8 | 9 | 9 |
| Data Subject Rights | 10% | 10 | 9 | 9 | 9 | 10 | 9 |
| Deletion/Return | 10% | 9 | 9 | 10 | 8 | 9 | 10 |
| Audit Rights | 10% | 8 | 8 | 9 | 7 | 8 | 8 |
| Breach Notification | 15% | 10 | 9 | 10 | 9 | 9 | 9 |
| Transfer Mechanisms | 10% | 10 | 10 | 10 | 10 | 10 | 10 |
| **Total Score** | 100% | **9.5** | **9.2** | **9.7** | **8.9** | **9.3** | **9.3** |

---

## Data Transfer Mechanisms

### International Transfer Summary

| Vendor | Primary Location | Transfer Mechanism | Adequacy Decision | SCCs Version |
|--------|------------------|-------------------|-------------------|--------------|
| Stripe | USA | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |
| SendGrid | USA | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |
| AWS | USA (configurable) | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |
| Google | USA | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |
| Zendesk | USA (configurable) | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |
| Sentry | USA (configurable) | EU-US DPF + SCCs | EU-US DPF | 2021 SCCs |

### Transfer Impact Assessment Summary

For each vendor, a Transfer Impact Assessment (TIA) has been conducted:

| Vendor | TIA Date | Risk Level | Supplementary Measures | Next Review |
|--------|----------|------------|----------------------|-------------|
| Stripe | 2025-06-01 | Low | Encryption at rest/transit | 2026-06-01 |
| SendGrid | 2025-06-15 | Low | Data minimization | 2026-06-15 |
| AWS | 2025-05-01 | Low | Encryption, access controls | 2026-05-01 |
| Google | 2025-07-01 | Medium | IP anonymization, data minimization | 2026-01-01 |
| Zendesk | 2025-06-20 | Low | Data minimization, EU hosting | 2026-06-20 |
| Sentry | 2025-07-15 | Low | PII scrubbing, EU hosting | 2026-07-15 |

---

## Incident Response Coordination

### Vendor Breach Notification Procedures

| Vendor | Notification SLA | Contact Method | Internal Escalation |
|--------|------------------|----------------|---------------------|
| Stripe | 72 hours | Email + Portal | Security Lead -> DPO -> Legal |
| SendGrid | 72 hours | Email | Security Lead -> DPO |
| AWS | 24 hours (enterprise) | Support Case | Security Lead -> DPO -> Legal |
| Google | 72 hours | Email | Marketing -> DPO |
| Zendesk | 72 hours | Email + Portal | CS Lead -> DPO |
| Sentry | 72 hours | Email | Engineering -> DPO |

### Incident Response Contact Matrix

| Role | Name | Email | Phone | Backup |
|------|------|-------|-------|--------|
| DPO | TBD | dpo@broxiva.com | [PHONE] | Legal Counsel |
| Security Lead | TBD | security@broxiva.com | [PHONE] | DevOps Lead |
| Legal Counsel | TBD | legal@broxiva.com | [PHONE] | External Counsel |
| CTO | TBD | cto@broxiva.com | [PHONE] | CEO |

### Vendor Breach Response Checklist

When notified of a vendor breach:

1. **Immediate (0-4 hours)**
   - [ ] Acknowledge receipt of notification
   - [ ] Assess if Broxiva data is affected
   - [ ] Notify internal incident response team
   - [ ] Document initial findings

2. **Short-term (4-24 hours)**
   - [ ] Request detailed incident report from vendor
   - [ ] Determine scope of data affected
   - [ ] Assess notification obligations
   - [ ] Brief executive team

3. **Medium-term (24-72 hours)**
   - [ ] Determine if regulatory notification required
   - [ ] Prepare data subject notifications if needed
   - [ ] Document all communications
   - [ ] Coordinate with vendor on remediation

4. **Follow-up (72+ hours)**
   - [ ] Review vendor's root cause analysis
   - [ ] Assess need for additional security measures
   - [ ] Update risk assessment
   - [ ] Schedule post-incident review

---

## Appendices

### Appendix A: New Vendor Assessment Template

```markdown
# New Vendor Privacy Assessment

**Vendor Name:** _______________________
**Assessment Date:** _______________________
**Assessor:** _______________________

## Basic Information
- Legal Entity Name:
- Headquarters:
- Website:
- Primary Contact:

## Data Processing Scope
- Types of data processed:
- Volume of data:
- Processing purposes:
- Data residency:

## Compliance Assessment

### DPA Availability
- [ ] Standard DPA available
- [ ] Custom DPA negotiation required
- [ ] DPA reviewed by legal

### Security Certifications
- [ ] SOC 2 Type II
- [ ] ISO 27001
- [ ] PCI DSS (if applicable)
- [ ] Other: _______

### Sub-Processors
- [ ] Sub-processor list available
- [ ] Notification mechanism in place
- [ ] Objection rights included

### Data Subject Rights
- [ ] Can assist with access requests
- [ ] Can assist with deletion requests
- [ ] Can assist with portability requests

### International Transfers
- [ ] Data stays in EU/EEA
- [ ] EU-US DPF certified
- [ ] SCCs in place
- [ ] TIA required

## Risk Assessment
- Overall Risk Level: [ ] Low [ ] Medium [ ] High [ ] Critical
- Approval Required From: _______
- Conditions/Restrictions: _______

## Recommendation
- [ ] Approved
- [ ] Approved with conditions
- [ ] Not approved
- [ ] Further review required

## Sign-off
- Assessor: ________ Date: ________
- Legal: ________ Date: ________
- DPO: ________ Date: ________
```

### Appendix B: DPA Clause Library

#### Standard Processing Instructions Clause

> The Processor shall process Personal Data only on documented instructions from the Controller, including with regard to transfers of Personal Data to a third country or an international organization, unless required to do so by applicable law; in such a case, the Processor shall inform the Controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest.

#### Standard Breach Notification Clause

> The Processor shall notify the Controller without undue delay, and in any event within 48 hours, after becoming aware of a Personal Data Breach. Such notification shall include: (a) a description of the nature of the breach; (b) the categories and approximate number of data subjects concerned; (c) the likely consequences of the breach; and (d) the measures taken or proposed to address the breach.

#### Standard Audit Rights Clause

> The Processor shall make available to the Controller all information necessary to demonstrate compliance with this Agreement and allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller, subject to reasonable notice and during normal business hours.

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Broxiva Team | Initial release |

**Next Review Date:** 2026-04-05

**Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| DPO | | | |
| Legal Counsel | | | |
| CTO | | | |
