# PCI DSS Compliance Checklist

**Document Version:** 1.0
**Last Updated:** December 3, 2025
**Platform:** CitadelBuy E-Commerce Platform
**Compliance Level:** SAQ A-EP (E-commerce with Outsourced Payment Processing)

---

## Table of Contents

1. [Pre-Go-Live Checklist](#pre-go-live-checklist)
2. [Quarterly Review Checklist](#quarterly-review-checklist)
3. [Annual Assessment Requirements](#annual-assessment-requirements)
4. [Monthly Operations Checklist](#monthly-operations-checklist)
5. [Incident Response Checklist](#incident-response-checklist)
6. [Vendor Management Checklist](#vendor-management-checklist)
7. [Documentation Requirements](#documentation-requirements)

---

## Pre-Go-Live Checklist

**Complete before launching to production**

### 1. Payment Integration

**Stripe Integration:**
- [ ] Stripe account verified and activated
- [ ] Production API keys configured (not test keys)
- [ ] Stripe Elements implemented (not deprecated Checkout)
- [ ] Payment flows tested end-to-end
- [ ] Webhook endpoints configured and secured
- [ ] Webhook signature verification implemented
- [ ] Stripe Radar enabled for fraud detection
- [ ] 3D Secure/SCA enabled for applicable regions
- [ ] Refund process tested
- [ ] Dispute handling process documented

**PayPal Integration:**
- [ ] PayPal Business account verified
- [ ] Production credentials configured
- [ ] PayPal SDK properly integrated
- [ ] Sandbox testing completed
- [ ] Production testing completed
- [ ] Webhook verification implemented
- [ ] IPN (Instant Payment Notification) configured
- [ ] Refund process tested

**Payment Data Handling:**
- [ ] Verified NO card data stored in database
- [ ] Database schema reviewed (no PAN, CVV, track data columns)
- [ ] Only payment tokens stored
- [ ] Code review completed for payment flows
- [ ] No card data in logs
- [ ] No card data in error messages
- [ ] No card data in analytics/monitoring

### 2. Network Security

**Infrastructure:**
- [ ] Firewall configured and tested
- [ ] Web Application Firewall (WAF) enabled
- [ ] Network segmentation implemented
- [ ] DMZ configured for web/API servers
- [ ] Database isolated from public internet
- [ ] VPN configured for admin access
- [ ] SSH access restricted to authorized IPs
- [ ] Default passwords changed
- [ ] Unused ports/services disabled

**SSL/TLS:**
- [ ] Valid SSL certificate installed
- [ ] TLS 1.2 or higher required
- [ ] TLS 1.0 and 1.1 disabled
- [ ] Weak cipher suites disabled
- [ ] Strong cipher suites configured
- [ ] Certificate expiration monitoring enabled
- [ ] Auto-renewal configured (Let's Encrypt)
- [ ] HSTS header enabled
- [ ] SSL Labs scan: Grade A or A+

**DNS and Domain:**
- [ ] Domain registered with reputable registrar
- [ ] DNSSEC enabled (if supported)
- [ ] Domain auto-renewal enabled
- [ ] DNS records properly configured
- [ ] SPF record configured for email
- [ ] DKIM configured for email
- [ ] DMARC policy configured

### 3. Application Security

**Security Headers:**
- [ ] Content-Security-Policy configured
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Strict-Transport-Security configured
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured
- [ ] X-Powered-By header removed
- [ ] Server header removed/obscured
- [ ] SecurityHeaders.com scan: Grade A
- [ ] Mozilla Observatory scan: Grade A

**Authentication & Authorization:**
- [ ] Strong password policy enforced (12+ chars, complexity)
- [ ] Password hashing with bcrypt/argon2
- [ ] Multi-factor authentication (MFA) available
- [ ] MFA required for admin accounts
- [ ] Session timeout configured (30 minutes)
- [ ] Absolute session timeout (8 hours)
- [ ] JWT tokens with short expiration
- [ ] Refresh token rotation implemented
- [ ] Account lockout after 5 failed attempts
- [ ] Lockout duration: 30 minutes
- [ ] Role-based access control (RBAC) implemented
- [ ] Least privilege principle enforced

**Input Validation & Output Encoding:**
- [ ] All inputs validated server-side
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection enabled
- [ ] File upload validation
- [ ] File type whitelist enforced
- [ ] File size limits configured
- [ ] Request size limits configured
- [ ] Rate limiting enabled
- [ ] API throttling configured

**Secure Coding:**
- [ ] No hardcoded credentials
- [ ] Environment variables for secrets
- [ ] Secret management system configured
- [ ] No sensitive data in client-side code
- [ ] No sensitive data in URLs
- [ ] Error handling doesn't expose internals
- [ ] Stack traces disabled in production
- [ ] Verbose errors disabled in production

### 4. Data Protection

**Database Security:**
- [ ] Database encryption at rest enabled
- [ ] Database connections encrypted (SSL/TLS)
- [ ] Database user permissions minimized
- [ ] Application uses least-privilege DB account
- [ ] Admin DB account separate from app account
- [ ] Database access logging enabled
- [ ] Automated backups configured
- [ ] Backup encryption enabled
- [ ] Backup restoration tested
- [ ] Backup retention policy defined (7 years min)

**Logging & Monitoring:**
- [ ] Centralized logging configured
- [ ] Authentication events logged
- [ ] Authorization failures logged
- [ ] Payment events logged (no card data)
- [ ] Admin actions logged
- [ ] System errors logged
- [ ] Log retention configured (12 months min)
- [ ] Logs protected from modification
- [ ] Log review process defined
- [ ] Real-time alerts configured
- [ ] Failed login alerts enabled
- [ ] Suspicious activity alerts enabled

**Data Privacy:**
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if in EU)
- [ ] GDPR compliance (if applicable)
- [ ] CCPA compliance (if applicable)
- [ ] Data retention policy defined
- [ ] Data deletion process implemented
- [ ] User data export capability
- [ ] Data breach notification process defined

### 5. Vulnerability Management

**Security Scanning:**
- [ ] Internal vulnerability scan completed
- [ ] External vulnerability scan completed (ASV)
- [ ] All high/critical vulnerabilities remediated
- [ ] Medium vulnerabilities documented
- [ ] Penetration test completed
- [ ] Pen test findings remediated
- [ ] SAST (Static Analysis) configured in CI/CD
- [ ] Dependency scanning configured
- [ ] Container scanning configured (if using Docker)

**Patch Management:**
- [ ] OS patching process defined
- [ ] Critical patches applied within 30 days
- [ ] Application dependency update process
- [ ] Security advisory monitoring configured
- [ ] Emergency patching process defined

### 6. Access Control

**User Management:**
- [ ] Default accounts removed/disabled
- [ ] Shared accounts eliminated
- [ ] User access review process defined
- [ ] Termination procedure defined
- [ ] Access provisioning documented
- [ ] Access de-provisioning documented

**Administrative Access:**
- [ ] Admin accounts separate from regular accounts
- [ ] Admin access logged
- [ ] Admin MFA required
- [ ] Admin session timeout: 15 minutes
- [ ] Admin access from secure locations only
- [ ] VPN required for remote admin access
- [ ] Privileged access management (PAM) considered

**Physical Security:**
- [ ] Server room access controlled
- [ ] Visitor logs maintained
- [ ] Security cameras installed (if applicable)
- [ ] Equipment disposal policy defined
- [ ] Secure media destruction process

### 7. Documentation

**Required Documentation:**
- [ ] Network diagram created and current
- [ ] Data flow diagram created
- [ ] System architecture documented
- [ ] Security policies written
- [ ] Incident response plan documented
- [ ] Business continuity plan documented
- [ ] Disaster recovery plan documented
- [ ] Change management policy documented
- [ ] Risk assessment completed
- [ ] Asset inventory maintained

**Training & Awareness:**
- [ ] Security awareness training program created
- [ ] All employees completed training
- [ ] Training records maintained
- [ ] Annual training scheduled
- [ ] New hire training process defined
- [ ] Specialized training for IT staff
- [ ] PCI DSS awareness training

### 8. Third-Party Compliance

**Service Providers:**
- [ ] Stripe AOC (Attestation of Compliance) obtained
- [ ] PayPal AOC obtained
- [ ] Hosting provider security verified
- [ ] CDN provider security verified
- [ ] Email service provider security verified
- [ ] Service provider contracts include security clauses
- [ ] Service provider list maintained
- [ ] Annual service provider review scheduled

### 9. PCI DSS Self-Assessment

**SAQ A-EP Completion:**
- [ ] All 178 questions answered
- [ ] Supporting evidence gathered
- [ ] Executive attestation signed
- [ ] Submission to acquiring bank completed
- [ ] AOC received and filed
- [ ] Compliance validation certificate obtained

### 10. Production Deployment

**Final Checks:**
- [ ] Production environment matches tested environment
- [ ] Environment variables verified
- [ ] API keys are production keys
- [ ] Debug mode disabled
- [ ] Logging configured correctly
- [ ] Monitoring configured and tested
- [ ] Alerts configured and tested
- [ ] Backup system verified
- [ ] Rollback plan documented
- [ ] Emergency contacts documented
- [ ] On-call rotation established

---

## Quarterly Review Checklist

**Complete every 3 months**

### Q1 (January - March)

**Security Scanning:**
- [ ] Internal vulnerability scan completed
- [ ] External vulnerability scan completed (ASV)
- [ ] Scan reports reviewed
- [ ] Critical vulnerabilities remediated
- [ ] High vulnerabilities remediated or documented
- [ ] Scan reports filed

**Access Review:**
- [ ] User access list reviewed
- [ ] Inactive accounts disabled
- [ ] Excessive permissions removed
- [ ] Admin accounts verified
- [ ] Service accounts reviewed
- [ ] Access review documented

**Log Review:**
- [ ] Authentication logs reviewed
- [ ] Payment logs reviewed (weekly during quarter)
- [ ] Error logs reviewed
- [ ] Anomalies investigated
- [ ] Log review documented

**System Updates:**
- [ ] OS security patches applied
- [ ] Application dependencies updated
- [ ] Security advisories reviewed
- [ ] Update log maintained

**Monitoring:**
- [ ] Alert configurations reviewed
- [ ] Alert effectiveness evaluated
- [ ] False positive rate assessed
- [ ] Monitoring coverage verified

### Q2 (April - June)

**All Q1 items, plus:**

**Penetration Testing:**
- [ ] Annual penetration test scheduled
- [ ] Pen test scoping completed
- [ ] Pen test executed
- [ ] Findings documented
- [ ] Remediation plan created
- [ ] Critical findings remediated

**Training:**
- [ ] Annual security training completed
- [ ] Training attendance documented
- [ ] Training effectiveness assessed
- [ ] Training materials updated

**Policy Review:**
- [ ] Security policies reviewed
- [ ] Policy updates documented
- [ ] Policy changes communicated
- [ ] Policy acknowledgments obtained

### Q3 (July - September)

**All Q1 items, plus:**

**SAQ Completion:**
- [ ] SAQ A-EP questionnaire completed
- [ ] All 178 questions answered
- [ ] Supporting evidence gathered
- [ ] Compliance gaps identified
- [ ] Remediation plan for gaps
- [ ] Executive attestation obtained
- [ ] SAQ submitted to acquiring bank
- [ ] AOC received

**Risk Assessment:**
- [ ] Annual risk assessment completed
- [ ] Threats identified and rated
- [ ] Vulnerabilities identified and rated
- [ ] Risk treatment decisions made
- [ ] Risk register updated
- [ ] Executive review completed

**Business Continuity:**
- [ ] Business continuity plan reviewed
- [ ] Disaster recovery plan reviewed
- [ ] Backup restoration tested
- [ ] Failover procedures tested
- [ ] Recovery time objectives (RTO) met
- [ ] Recovery point objectives (RPO) met

### Q4 (October - December)

**All Q1 items, plus:**

**Service Provider Review:**
- [ ] Service provider list updated
- [ ] Stripe AOC verified current
- [ ] PayPal AOC verified current
- [ ] Other service providers verified
- [ ] Service provider security assessed
- [ ] Contracts reviewed for security clauses

**Firewall Review:**
- [ ] Firewall rules reviewed
- [ ] Unnecessary rules removed
- [ ] Rule documentation updated
- [ ] Firewall logs reviewed
- [ ] Rule changes documented

**Year-End Planning:**
- [ ] Next year's compliance calendar created
- [ ] Budget for security tools/services
- [ ] Training schedule for next year
- [ ] Audit/assessment schedule
- [ ] Resource allocation planned

---

## Annual Assessment Requirements

**Complete once per year**

### SAQ A-EP Self-Assessment Questionnaire

**Requirement 1: Install and Maintain Network Security Controls**
- [ ] Firewalls installed and configured
- [ ] Firewall rules documented
- [ ] Network diagram current
- [ ] Configuration standards defined
- [ ] Firewall rule changes controlled

**Requirement 2: Apply Secure Configurations**
- [ ] Configuration standards documented
- [ ] Default passwords changed
- [ ] Unnecessary services disabled
- [ ] Security parameters configured
- [ ] Configuration management process

**Requirement 3: Protect Stored Account Data**
- [ ] Cardholder data inventory completed
- [ ] Storage minimization verified
- [ ] PAN truncation/masking implemented
- [ ] Encryption for storage (if applicable)
- [ ] Key management (if applicable)

**Requirement 4: Protect Cardholder Data with Strong Cryptography**
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Strong cryptography implemented
- [ ] Certificate management process
- [ ] End-user messaging encryption

**Requirement 5: Protect All Systems from Malware**
- [ ] Anti-malware deployed
- [ ] Anti-malware updates current
- [ ] Scans performed regularly
- [ ] Audit logs reviewed

**Requirement 6: Develop and Maintain Secure Systems**
- [ ] Vulnerability management process
- [ ] Secure development practices
- [ ] Change control procedures
- [ ] Web application firewall (if applicable)

**Requirement 7: Restrict Access to System Components**
- [ ] Access control implemented
- [ ] Least privilege enforced
- [ ] Access documented
- [ ] Default deny principle

**Requirement 8: Identify Users and Authenticate Access**
- [ ] Unique IDs assigned
- [ ] Strong authentication implemented
- [ ] MFA for admin/remote access
- [ ] Password policies enforced

**Requirement 9: Restrict Physical Access**
- [ ] Physical access controls
- [ ] Visitor authorization
- [ ] Media controls
- [ ] Device inventory

**Requirement 10: Log and Monitor All Access**
- [ ] Audit logs enabled
- [ ] Log review process
- [ ] Time synchronization
- [ ] Log protection implemented

**Requirement 11: Test Security of Systems Regularly**
- [ ] Internal vulnerability scans (quarterly)
- [ ] External vulnerability scans (quarterly, ASV)
- [ ] Penetration testing (annual)
- [ ] Intrusion detection/prevention
- [ ] File integrity monitoring

**Requirement 12: Support Information Security with Policies**
- [ ] Security policy established
- [ ] Risk assessment (annual)
- [ ] User awareness program
- [ ] Background checks for personnel
- [ ] Incident response plan
- [ ] Service provider management

### External Vulnerability Scan (ASV)

**Approved Scanning Vendor Requirements:**
- [ ] ASV selected from PCI SSC approved list
- [ ] Scan scheduled quarterly
- [ ] Q1 scan completed and passed
- [ ] Q2 scan completed and passed
- [ ] Q3 scan completed and passed
- [ ] Q4 scan completed and passed
- [ ] All vulnerabilities remediated
- [ ] Passing scan reports obtained
- [ ] Reports submitted to acquiring bank

### Internal Vulnerability Scan

**Quarterly Internal Scans:**
- [ ] Scanning tool selected/configured
- [ ] Scan scope defined
- [ ] Q1 scan completed
- [ ] Q2 scan completed
- [ ] Q3 scan completed
- [ ] Q4 scan completed
- [ ] Vulnerabilities remediated
- [ ] Re-scans confirm fixes
- [ ] Scan reports maintained

### Penetration Testing

**Annual Pen Test Requirements:**
- [ ] Tester qualifications verified
- [ ] Scope includes network and applications
- [ ] Test methodology documented (PTES, OWASP)
- [ ] Segmentation testing included
- [ ] Test executed
- [ ] Results documented
- [ ] Findings remediated
- [ ] Re-test confirms fixes
- [ ] Report filed

**Pen Test After Significant Changes:**
- [ ] Define "significant change" criteria
- [ ] Track system changes
- [ ] Trigger pen test when needed
- [ ] Document change-triggered tests

### Risk Assessment

**Annual Risk Assessment Process:**
- [ ] Asset identification
- [ ] Threat identification
- [ ] Vulnerability identification
- [ ] Risk analysis (likelihood × impact)
- [ ] Risk evaluation
- [ ] Risk treatment decisions
- [ ] Residual risk acceptance
- [ ] Documentation
- [ ] Executive review
- [ ] Board presentation (if applicable)

**Risk Register:**
- [ ] All identified risks documented
- [ ] Risk ratings assigned
- [ ] Treatment plans defined
- [ ] Risk owners assigned
- [ ] Review schedule established
- [ ] Updates tracked

### Security Awareness Training

**Annual Training Program:**
- [ ] Training content developed/updated
- [ ] Training schedule published
- [ ] All employees trained
- [ ] New hires trained within 30 days
- [ ] Specialized training for IT staff
- [ ] Training effectiveness measured
- [ ] Attendance records maintained
- [ ] Certificates issued
- [ ] Next year's training planned

**Training Topics:**
- [ ] PCI DSS overview
- [ ] Acceptable use policy
- [ ] Password security
- [ ] Social engineering awareness
- [ ] Phishing recognition
- [ ] Incident reporting
- [ ] Data handling
- [ ] Clean desk policy

---

## Monthly Operations Checklist

**Complete every month**

### Security Operations

**System Monitoring:**
- [ ] Review monitoring dashboards
- [ ] Analyze security alerts
- [ ] Investigate anomalies
- [ ] Document incidents
- [ ] Update alert rules as needed

**Log Review:**
- [ ] Authentication logs reviewed
- [ ] Payment transaction logs reviewed
- [ ] Error logs reviewed
- [ ] Admin action logs reviewed
- [ ] Anomalies investigated
- [ ] Log review documented

**Access Management:**
- [ ] New user accounts reviewed
- [ ] Terminated user accounts verified disabled
- [ ] Permission changes reviewed
- [ ] Shared account usage checked (should be zero)

**Backup Verification:**
- [ ] Backup completion verified
- [ ] Backup integrity checked
- [ ] Backup encryption verified
- [ ] Off-site storage confirmed
- [ ] Restoration test (monthly random sample)

### Vulnerability Management

**Security Updates:**
- [ ] Critical OS patches applied (within 30 days)
- [ ] Application patches applied
- [ ] Dependency updates reviewed
- [ ] Security advisories monitored
- [ ] Patch deployment documented

**Vulnerability Tracking:**
- [ ] New vulnerabilities identified
- [ ] Remediation progress tracked
- [ ] Overdue items escalated
- [ ] Compensating controls documented
- [ ] Vulnerability register updated

### Service Provider Management

**Provider Monitoring:**
- [ ] Stripe service status checked
- [ ] PayPal service status checked
- [ ] Hosting provider status checked
- [ ] CDN provider status checked
- [ ] Issues escalated as needed

**Payment Processing:**
- [ ] Payment success rate monitored
- [ ] Failed payments reviewed
- [ ] Fraud alerts reviewed
- [ ] Chargeback rate monitored
- [ ] Refund processing verified

### Compliance Monitoring

**PCI DSS Controls:**
- [ ] Security header verification
- [ ] SSL certificate expiration check
- [ ] Firewall rule compliance
- [ ] No card data in database verified
- [ ] Encryption in transit verified

**Documentation:**
- [ ] Network diagram accuracy verified
- [ ] System changes documented
- [ ] Policy changes documented
- [ ] Compliance documentation updated

---

## Incident Response Checklist

**Use when security incident occurs**

### Immediate Response (0-1 Hour)

**Detection & Assessment:**
- [ ] Incident detected and reported
- [ ] Incident response team notified
- [ ] Initial severity assessment
- [ ] Incident commander assigned
- [ ] War room established (virtual or physical)

**Containment:**
- [ ] Affected systems identified
- [ ] Isolation decisions made
- [ ] Network segmentation utilized
- [ ] Access revoked if necessary
- [ ] Prevent further damage

**Communication:**
- [ ] Internal notification sent
- [ ] Stakeholders informed
- [ ] Communication log started
- [ ] External communication assessed
- [ ] Legal counsel notified (if needed)

### Investigation (1-24 Hours)

**Evidence Collection:**
- [ ] Logs collected and preserved
- [ ] System snapshots/images taken
- [ ] Network traffic captured
- [ ] User actions documented
- [ ] Chain of custody maintained

**Root Cause Analysis:**
- [ ] Attack vector identified
- [ ] Exploit method determined
- [ ] Timeline constructed
- [ ] Affected data identified
- [ ] Scope determined

**Impact Assessment:**
- [ ] Systems affected documented
- [ ] Data accessed/exfiltrated identified
- [ ] User accounts compromised identified
- [ ] Payment data involvement assessed
- [ ] Business impact evaluated

### Eradication (1-3 Days)

**Threat Removal:**
- [ ] Malware removed
- [ ] Backdoors eliminated
- [ ] Compromised accounts disabled
- [ ] Vulnerabilities patched
- [ ] Security controls strengthened

**System Hardening:**
- [ ] Configurations reviewed
- [ ] Passwords changed
- [ ] Certificates rotated (if needed)
- [ ] Firewall rules updated
- [ ] Monitoring enhanced

### Recovery (3-7 Days)

**System Restoration:**
- [ ] Systems rebuilt/restored
- [ ] Services restored
- [ ] Functionality verified
- [ ] Performance validated
- [ ] Monitoring confirmed operational

**User Communication:**
- [ ] Users notified (if applicable)
- [ ] Password reset required (if needed)
- [ ] MFA enrollment required (if not already)
- [ ] Support resources provided

### Post-Incident (1-2 Weeks)

**Notification Requirements:**
- [ ] Determine notification obligations
- [ ] Notify card brands (if cardholder data involved)
- [ ] Notify customers (if personal data involved)
- [ ] Notify regulators (as required by law)
- [ ] Notify acquiring bank
- [ ] Document all notifications

**Lessons Learned:**
- [ ] Post-mortem meeting scheduled
- [ ] Incident timeline documented
- [ ] Response effectiveness assessed
- [ ] Gaps identified
- [ ] Improvements identified
- [ ] Action items assigned
- [ ] Documentation completed

**Remediation:**
- [ ] Preventive measures implemented
- [ ] Detective controls enhanced
- [ ] Policies updated
- [ ] Training updated
- [ ] Technology improvements deployed

---

## Vendor Management Checklist

**For all third-party service providers**

### Vendor Onboarding

**Due Diligence:**
- [ ] Vendor security questionnaire completed
- [ ] PCI DSS compliance verified (for payment vendors)
- [ ] SOC 2 report reviewed (if applicable)
- [ ] ISO certifications verified
- [ ] References checked
- [ ] Financial stability assessed

**Contractual Requirements:**
- [ ] Security requirements in contract
- [ ] Data protection clauses included
- [ ] Incident notification requirements
- [ ] Right to audit included
- [ ] Compliance maintenance required
- [ ] Liability and indemnification addressed
- [ ] Contract signed and filed

**Technical Integration:**
- [ ] Integration architecture reviewed
- [ ] Data flows documented
- [ ] Security controls verified
- [ ] API key management established
- [ ] Monitoring configured
- [ ] Testing completed

### Ongoing Vendor Management

**Quarterly Review:**
- [ ] Service performance assessed
- [ ] Security incidents reviewed
- [ ] SLA compliance verified
- [ ] Support responsiveness evaluated
- [ ] Documentation updates received

**Annual Assessment:**
- [ ] AOC (Attestation of Compliance) verified
- [ ] SOC 2 report updated
- [ ] Security questionnaire updated
- [ ] Contract renewal review
- [ ] Pricing review
- [ ] Alternative vendor evaluation

**Critical Vendors (Stripe, PayPal):**
- [ ] Monthly service status review
- [ ] Quarterly compliance verification
- [ ] Annual AOC collection
- [ ] Security bulletin monitoring
- [ ] API version updates tracked
- [ ] Integration health verified

### Vendor Off-boarding

**Data Handling:**
- [ ] Data return/destruction requested
- [ ] Data deletion verified
- [ ] Certificates of destruction obtained
- [ ] Backup data removed

**Access Revocation:**
- [ ] API keys revoked
- [ ] Accounts disabled
- [ ] Access tokens invalidated
- [ ] Firewall rules removed
- [ ] DNS entries removed

**Documentation:**
- [ ] Off-boarding documented
- [ ] Lessons learned captured
- [ ] Vendor removed from active list
- [ ] Records archived

---

## Documentation Requirements

**Maintain current documentation**

### Required Documents

**Network & Architecture:**
- [ ] Network diagram (updated at least annually)
- [ ] Data flow diagram
- [ ] System architecture diagram
- [ ] Cardholder data flow diagram
- [ ] Network segmentation documentation

**Policies & Procedures:**
- [ ] Information security policy
- [ ] Acceptable use policy
- [ ] Access control policy
- [ ] Password policy
- [ ] Change management policy
- [ ] Incident response plan
- [ ] Business continuity plan
- [ ] Disaster recovery plan
- [ ] Vendor management policy
- [ ] Data retention policy
- [ ] Clean desk/clear screen policy

**Operational Documents:**
- [ ] System configuration standards
- [ ] Firewall rule set documentation
- [ ] User access list
- [ ] Admin access list
- [ ] Service account list
- [ ] Asset inventory
- [ ] Software inventory
- [ ] Service provider list

**Compliance Documents:**
- [ ] PCI DSS SAQ A-EP
- [ ] Attestation of Compliance (AOC)
- [ ] Vulnerability scan reports (quarterly)
- [ ] Penetration test report (annual)
- [ ] Risk assessment (annual)
- [ ] Training records
- [ ] Access review logs
- [ ] Incident reports

### Document Retention

**Retention Periods:**
- [ ] Audit logs: 12 months minimum
- [ ] Compliance documents: 3 years minimum
- [ ] Financial records: 7 years minimum
- [ ] Training records: 3 years minimum
- [ ] Incident reports: 3 years minimum

**Document Storage:**
- [ ] Secure storage location defined
- [ ] Access controls implemented
- [ ] Backup copies maintained
- [ ] Retention schedule enforced
- [ ] Secure disposal process defined

---

## Quick Reference: Critical Dates

### Monthly
- 1st of month: Log review
- 15th of month: Backup verification
- Last day: Security monitoring review

### Quarterly
- Q1 (Jan-Mar): Vulnerability scans, access review
- Q2 (Apr-Jun): Penetration test, annual training
- Q3 (Jul-Sep): SAQ completion, risk assessment
- Q4 (Oct-Dec): Vendor review, firewall review

### Annually
- January: Plan year's compliance activities
- March: Begin penetration test planning
- June: Complete annual training
- September: Submit SAQ A-EP
- December: Year-end compliance review

---

## Checklist Completion Tracking

**Use this section to track overall progress:**

### Pre-Go-Live Compliance
- [ ] All pre-go-live items completed
- [ ] Executive sign-off obtained
- [ ] Ready for production deployment

### Ongoing Compliance Status
- [ ] Q1 checklist completed
- [ ] Q2 checklist completed
- [ ] Q3 checklist completed
- [ ] Q4 checklist completed
- [ ] Annual assessment completed
- [ ] Compliant for current year

### Next Actions
- [ ] Next vulnerability scan scheduled
- [ ] Next training session scheduled
- [ ] Next policy review scheduled
- [ ] Next risk assessment scheduled

---

## Contact Information

**Compliance Team:**
- **Compliance Officer:** compliance@citadelbuy.com
- **Security Team:** security@citadelbuy.com
- **IT Operations:** devops@citadelbuy.com

**External Contacts:**
- **Acquiring Bank:** [Bank contact info]
- **ASV (Approved Scanning Vendor):** [ASV contact info]
- **Penetration Tester:** [Tester contact info]
- **Legal Counsel:** [Legal contact info]

**Emergency Contacts:**
- **Security Incidents:** security@citadelbuy.com
- **After-hours:** [Phone number]
- **Incident Commander:** [Contact info]

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | CitadelBuy Compliance Team | Initial checklist creation |

**Next Review Date:** 2026-03-03

---

**Document Classification:** Internal Use Only
**Owner:** Chief Information Security Officer (CISO)
**Approved By:** [Executive Signature]

---

**End of Document**
