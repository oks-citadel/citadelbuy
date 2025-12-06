# Sanctions Screening Policy

## Policy Statement

CitadelBuy maintains a zero-tolerance policy for transactions involving sanctioned individuals, entities, or countries. All vendors, buyers, and transactions are screened against global sanctions lists to ensure compliance with international law and prevent illegal activities.

## Scope

This policy applies to:
- All vendor onboarding
- All buyer registrations
- Every transaction on the platform
- Third-party service providers
- Beneficial owners and key personnel

## Sanctions Lists Monitored

### United States
**OFAC (Office of Foreign Assets Control)**
- Specially Designated Nationals (SDN) List
- Sectoral Sanctions Identifications (SSI) List
- Foreign Sanctions Evaders (FSE) List
- Non-SDN Lists (e.g., Palestinian Legislative Council, Syrian Sanctions)

**BIS (Bureau of Industry and Security)**
- Entity List
- Denied Persons List
- Unverified List

### United Nations
- UN Security Council Consolidated List
- Al-Qaeda Sanctions List
- Taliban Sanctions List
- ISIL (Da'esh) & Al-Qaeda Sanctions List

### European Union
- EU Consolidated Financial Sanctions List
- EU Restrictive Measures (by country)

### United Kingdom
- UK HM Treasury Sanctions List
- UK Consolidated List of Targets

### Other Jurisdictions
- Canada OSFI Consolidated List
- Australia DFAT Sanctions
- Japan METI/MOFFA Lists
- Singapore MAS Sanctions

## Screening Procedures

### Vendor Onboarding (KYB)

**Initial Screening:**
1. Business name against all sanctions lists
2. Beneficial owners (25%+ ownership)
3. Key management personnel
4. Business address and registration location

**Data Collected:**
- Legal business name
- Trading names / DBA
- Registration number
- Tax ID
- Address
- Beneficial ownership structure
- Director/officer names and DOB

**Matching:**
- Exact match: Auto-reject
- Fuzzy match (>80%): Manual review
- Partial match (50-80%): Enhanced due diligence
- No match: Approve

**Frequency:**
- Initial: During onboarding
- Ongoing: Quarterly for all active vendors
- Event-based: When sanctions lists updated

### Buyer Screening

**Data Collected:**
- Full name
- Email address
- Phone number
- Billing address
- IP address / geolocation

**Frequency:**
- Initial: At registration
- Ongoing: Every transaction
- Event-based: Sanctions list updates

### Transaction Screening

**Real-Time Screening:**
Every transaction screened before completion:
1. Sender (vendor) screening
2. Recipient (buyer) screening
3. Destination country check
4. Product category check (dual-use, controlled goods)
5. Transaction amount (unusual patterns)

**Automated Blocking:**
- Sanctioned entity: Transaction auto-blocked
- Sanctioned country: Transaction auto-blocked
- High-risk match: Hold for manual review

## Prohibited Countries

### Comprehensive Sanctions (No Transactions Allowed)
- North Korea (DPRK)
- Syria
- Crimea region (Ukraine)
- Iran (comprehensive US sanctions)
- Cuba (partial - US vendors only)

### Sectoral Sanctions (Restricted Transactions)
- Russia (specific sectors: energy, defense, finance)
- Venezuela (specific entities and petroleum sector)
- Belarus (specific entities)

**Platform Rule:** When in doubt, block. Better to miss a legitimate transaction than violate sanctions.

## Screening Technology

### Provider
**Primary:** [Dow Jones Risk & Compliance / Refinitiv World-Check / ComplyAdvantage]
**Backup:** OFAC XML Direct Integration

### Methodology
**Fuzzy Matching Algorithms:**
- Levenshtein distance
- Soundex / Metaphone
- N-gram similarity
- Alias matching
- Transliteration handling

**Match Threshold:**
- 95-100%: High confidence match
- 85-94%: Medium confidence match
- 70-84%: Low confidence match
- <70%: No match

## Politically Exposed Persons (PEP)

**Definition:** Individuals holding prominent public positions or their close associates.

**Categories:**
- Foreign PEPs (heads of state, senior politicians)
- Domestic PEPs (high-level government officials)
- International organization PEPs (UN, World Bank, etc.)
- Family members and close associates

**Action:**
- PEP status flagged
- Enhanced due diligence
- Source of funds verification
- Senior management approval required
- Ongoing monitoring

## Adverse Media Screening

**Sources Monitored:**
- Global news databases
- Legal proceedings databases
- Regulatory actions
- Criminal records (where legally accessible)
- Industry-specific watchlists

**Risk Categories:**
- Financial crime
- Corruption / bribery
- Money laundering
- Terrorism financing
- Fraud
- Sanctions violations
- Human rights violations

**Action:**
- High-risk findings: Block pending investigation
- Medium-risk findings: Enhanced due diligence
- Low-risk findings: Document and monitor

## False Positive Management

**Common False Positives:**
- Common names (e.g., "Mohammed Ahmed")
- Partial address matches
- Date of birth discrepancies
- Transliteration variations

**Resolution Process:**
1. Collect additional identifying information
2. Compare against full sanctions entry (DOB, nationality, address)
3. Document analysis and decision
4. Whitelist if confirmed non-match
5. Notify affected party

**Timeline:** Resolved within 48 hours

## Whitelisting

**Eligible for Whitelist:**
- Confirmed false positive after investigation
- Multiple data points confirming different entity
- Government/regulatory body clearance

**Whitelist Review:**
- Quarterly re-validation
- Removed if new information emerges
- Senior compliance officer approval required

## Sanctions Violations

### Immediate Actions
1. **Block Transaction:** Immediate halt
2. **Freeze Account:** Suspend vendor/buyer account
3. **Asset Hold:** Freeze any funds in escrow
4. **Investigation:** Compliance team review

### Reporting
**Internal:**
- Chief Compliance Officer notified within 1 hour
- Legal team notified within 2 hours
- Executive leadership within 4 hours

**External:**
- OFAC (US): Within 10 days if US person involved
- Other regulators: As required by jurisdiction
- Law enforcement: If criminal activity suspected

### Penalties
**Regulatory:**
- OFAC: Up to $307,922 per violation or 2x transaction value
- EU: Up to €20 million or 4% of turnover
- Criminal: Up to $1 million and 20 years imprisonment (US)

**Platform:**
- Permanent account termination
- Blacklist (ban on future registration)
- Fund forfeiture
- Legal action for damages

## Record Keeping

**Retention Period:** 7 years (longer if legally required)

**Records Maintained:**
- Screening results (match/no-match)
- Data used for screening
- Match analysis and decision rationale
- Whitelist entries and justifications
- False positive determinations
- Communications with sanctioned parties (if any)
- Regulatory filings

**Storage:**
- Encrypted database
- Access-controlled (compliance team only)
- Audit trail of all access
- Quarterly backup to secure archive

## Training

**Required For:** All employees

**Topics:**
- Sanctions overview and purpose
- Platform screening procedures
- Red flag identification
- Escalation process
- Regulatory requirements

**Frequency:**
- New hire: Within 30 days
- Annual refresher: All staff
- Ad-hoc: When regulations change

**Certification:** Completion certificate issued

## Governance

**Ownership:** Chief Compliance Officer

**Sanctions Committee:**
- Chief Compliance Officer (Chair)
- General Counsel
- Head of Risk
- Head of Operations
- External sanctions advisor

**Meeting Frequency:** Monthly + ad-hoc for urgent matters

**Responsibilities:**
- Policy review and updates
- Complex case decisions
- Whitelist approvals
- Regulatory liaison
- Training oversight

## Continuous Monitoring

**Automated:**
- Daily sanctions list updates
- Real-time list integration
- Batch screening of existing accounts (weekly)
- Transaction pattern analysis

**Manual:**
- Monthly vendor high-risk reviews
- Quarterly PEP re-screening
- Semi-annual policy review
- Annual third-party audit

## Exceptions and Escalations

**Exception Criteria:**
- Humanitarian aid (licensed)
- Journalistic activities (licensed)
- Legal services (specific exemptions)
- Diplomatic exemptions

**Escalation Path:**
1. Compliance Analyst: Initial screening
2. Senior Compliance Officer: Match review
3. Chief Compliance Officer: High-risk decisions
4. Legal Counsel: Potential violations
5. Sanctions Committee: Complex cases
6. Board of Directors: Material violations

## Geographic Restrictions

### Comprehensive Blocks
- Platform not available in: North Korea, Syria, Crimea
- Vendor registration prohibited from: Iran, Cuba (US sanctions)

### Restricted Access
- Russia: Sectoral restrictions apply
- Venezuela: Enhanced screening
- Lebanon: AML concerns, enhanced due diligence
- Yemen: Conflict zone, case-by-case

## Customer Communication

**If Account Suspended:**
- Email notification within 24 hours
- General reason provided (sanctions compliance)
- Specific match details NOT disclosed (TIPPING OFF prohibited)
- Appeals process outlined

**Appeals:**
- Submit additional identifying information
- 30-day review period
- Final decision by Chief Compliance Officer
- Right to regulatory complaint if decision challenged

## Regulatory Liaison

**Primary Contacts:**
- **US:** OFAC Compliance Division
- **EU:** European Commission DG FISMA
- **UK:** HM Treasury - Office of Financial Sanctions Implementation

**Proactive Engagement:**
- Quarterly compliance certifications
- Annual sanctions audit
- Immediate violation reporting
- Voluntary disclosures as appropriate

## Technology Stack

**Screening Engine:** [Provider Name]
**Integration:** Real-time API
**Fallback:** Batch file processing
**Uptime SLA:** 99.9%
**Data Updates:** Real-time (< 15 minutes from list publication)

## Policy Review

**Frequency:** Semi-annual
**Last Reviewed:** 2025-12-06
**Next Review:** 2026-06-01
**Owner:** Chief Compliance Officer
**Approver:** Board of Directors

## Contact

**Sanctions Compliance Team:**
- Email: sanctions@citadelbuy.com
- Phone: +1-XXX-XXX-XXXX (24/7 hotline)
- Emergency: compliance-emergency@citadelbuy.com

**External Counsel:**
- [Law Firm Name]
- [Sanctions Specialist Name]
- Email: [specialist@lawfirm.com]

---

**Acknowledgment:** All employees must annually acknowledge understanding of this policy.

**Certification:** This policy has been reviewed and approved by external sanctions counsel and regulatory advisors.
