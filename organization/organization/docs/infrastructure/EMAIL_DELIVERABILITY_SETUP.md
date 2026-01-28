# Email Deliverability Setup Guide

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Classification:** Internal - Technical
**Owner:** DevOps Lead / Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [DMARC Configuration Guide](#dmarc-configuration-guide)
3. [SPF Record Setup](#spf-record-setup)
4. [DKIM Signing Configuration](#dkim-signing-configuration)
5. [Complete DNS Records](#complete-dns-records)
6. [Verification Steps](#verification-steps)
7. [Monitoring and Reporting](#monitoring-and-reporting)
8. [Bounce and Complaint Handling](#bounce-and-complaint-handling)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

This document provides comprehensive guidance for configuring email authentication protocols to ensure maximum email deliverability for Broxiva's transactional and marketing emails.

### Email Authentication Stack

| Protocol | Purpose | Priority |
|----------|---------|----------|
| **SPF** | Sender Policy Framework - Authorizes sending servers | Required |
| **DKIM** | DomainKeys Identified Mail - Cryptographic signing | Required |
| **DMARC** | Domain-based Message Authentication - Policy enforcement | Required |
| **BIMI** | Brand Indicators for Message Identification - Logo display | Recommended |
| **MTA-STS** | Strict Transport Security - Enforce TLS | Recommended |

### Sending Infrastructure

| Purpose | Service | Domain | Notes |
|---------|---------|--------|-------|
| Transactional Email | AWS SES | ses.broxiva.com | Order confirmations, receipts |
| Transactional Email | SendGrid | sendgrid.broxiva.com | Password resets, notifications |
| Marketing Email | SendGrid | marketing.broxiva.com | Newsletters, promotions |
| System Alerts | AWS SES | alerts.broxiva.com | Internal system notifications |

### Domain Strategy

| Domain | Type | SPF | DKIM | DMARC |
|--------|------|-----|------|-------|
| broxiva.com | Primary | Yes | Yes | Yes |
| mail.broxiva.com | Sending subdomain | Yes | Yes | Inherit |
| notifications.broxiva.com | Transactional | Yes | Yes | Inherit |
| marketing.broxiva.com | Marketing | Yes | Yes | Inherit |

---

## DMARC Configuration Guide

### What is DMARC?

DMARC (Domain-based Message Authentication, Reporting & Conformance) is an email authentication protocol that:

- Builds on SPF and DKIM
- Provides a policy for receiving servers
- Generates reports on authentication results
- Protects against email spoofing

### DMARC Policy Levels

| Policy | Tag | Description | Use Case |
|--------|-----|-------------|----------|
| None | `p=none` | Monitor only, no action | Initial deployment |
| Quarantine | `p=quarantine` | Send to spam folder | Transition period |
| Reject | `p=reject` | Block failed messages | Full protection |

### DMARC Implementation Phases

#### Phase 1: Monitoring (Weeks 1-4)

```dns
; Initial DMARC record - monitoring only
_dmarc.broxiva.com. IN TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@broxiva.com; ruf=mailto:dmarc-forensic@broxiva.com; fo=1; adkim=r; aspf=r; pct=100"
```

**Parameters Explained:**

| Tag | Value | Description |
|-----|-------|-------------|
| `v` | DMARC1 | Protocol version (required) |
| `p` | none | Policy for organizational domain |
| `rua` | mailto:... | Aggregate report destination |
| `ruf` | mailto:... | Forensic report destination |
| `fo` | 1 | Forensic options (1 = generate if any fail) |
| `adkim` | r | DKIM alignment (r = relaxed) |
| `aspf` | r | SPF alignment (r = relaxed) |
| `pct` | 100 | Percentage of messages to apply policy |

#### Phase 2: Quarantine (Weeks 5-8)

```dns
; Transition to quarantine
_dmarc.broxiva.com. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@broxiva.com; ruf=mailto:dmarc-forensic@broxiva.com; fo=1; adkim=r; aspf=r; pct=25"
```

Gradual rollout:
- Week 5: `pct=25`
- Week 6: `pct=50`
- Week 7: `pct=75`
- Week 8: `pct=100`

#### Phase 3: Reject (Weeks 9+)

```dns
; Full enforcement
_dmarc.broxiva.com. IN TXT "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@broxiva.com; ruf=mailto:dmarc-forensic@broxiva.com; fo=1; adkim=s; aspf=s; pct=100"
```

### DMARC Record for Subdomains

```dns
; Subdomain-specific DMARC (optional, inherits from parent)
_dmarc.mail.broxiva.com. IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc-reports@broxiva.com"
```

### DMARC Report Processing

#### Setting Up Report Receiving

1. **Create dedicated email addresses:**
   ```
   dmarc-reports@broxiva.com    - Aggregate reports (RUA)
   dmarc-forensic@broxiva.com   - Forensic reports (RUF)
   ```

2. **Configure report processing:**
   - Use a DMARC report analyzer service
   - Recommended services:
     - dmarcian
     - Valimail
     - Agari
     - PostmarkApp DMARC

3. **External domain authorization:**
   If using external report processing:
   ```dns
   ; Allow external domain to receive reports for broxiva.com
   broxiva.com._report._dmarc.reportdomain.com. IN TXT "v=DMARC1"
   ```

---

## SPF Record Setup

### What is SPF?

SPF (Sender Policy Framework) specifies which mail servers are authorized to send email on behalf of your domain.

### SPF Record Syntax

```
v=spf1 [mechanisms] [modifiers] [qualifier]all
```

| Component | Description |
|-----------|-------------|
| `v=spf1` | Version (required) |
| `ip4:` | IPv4 address/range |
| `ip6:` | IPv6 address/range |
| `a:` | A record lookup |
| `mx` | MX record servers |
| `include:` | Include another domain's SPF |
| `redirect=` | Use another domain's SPF |
| `-all` | Fail all others (strict) |
| `~all` | Soft fail (less strict) |
| `?all` | Neutral |

### Broxiva SPF Configuration

#### Primary Domain SPF

```dns
; Primary SPF record for broxiva.com
broxiva.com. IN TXT "v=spf1 include:amazonses.com include:sendgrid.net include:_spf.google.com ip4:xxx.xxx.xxx.xxx/32 -all"
```

**Breakdown:**

| Mechanism | Purpose |
|-----------|---------|
| `include:amazonses.com` | AWS SES sending |
| `include:sendgrid.net` | SendGrid sending |
| `include:_spf.google.com` | Google Workspace (if used) |
| `ip4:xxx.xxx.xxx.xxx/32` | Direct server IP (if any) |
| `-all` | Reject all other senders |

#### SPF for Subdomains

```dns
; Subdomain SPF records
mail.broxiva.com. IN TXT "v=spf1 include:amazonses.com include:sendgrid.net -all"
notifications.broxiva.com. IN TXT "v=spf1 include:amazonses.com -all"
marketing.broxiva.com. IN TXT "v=spf1 include:sendgrid.net -all"
```

### SPF Lookup Limit

**Important:** SPF has a maximum of 10 DNS lookups. Exceeding this causes SPF to fail.

| Mechanism Type | DNS Lookups |
|----------------|-------------|
| `include:` | 1+ (recursive) |
| `a:` | 1 |
| `mx` | 1+ (per MX record) |
| `redirect=` | 1+ (recursive) |
| `ip4:`/`ip6:` | 0 |

#### Counting Lookups Example

```
v=spf1
  include:amazonses.com      (1 + amazonses.com's includes)
  include:sendgrid.net       (1 + sendgrid.net's includes)
  include:_spf.google.com    (1 + google's includes)
  mx                         (1 + number of MX records)
  -all

Total: Could easily exceed 10!
```

#### SPF Flattening Solution

For complex SPF records, use SPF flattening:

```dns
; Flattened SPF (IPs instead of includes)
broxiva.com. IN TXT "v=spf1 ip4:199.255.192.0/22 ip4:199.127.232.0/22 ip4:54.240.0.0/18 ip4:69.169.224.0/20 ip4:168.245.0.0/16 -all"
```

**Automation required:** Use an SPF flattening service that auto-updates IPs:
- AutoSPF
- SPF Wizard
- Valimail

---

## DKIM Signing Configuration

### What is DKIM?

DKIM (DomainKeys Identified Mail) adds a digital signature to emails, allowing recipients to verify the message hasn't been altered and originated from an authorized server.

### DKIM Key Pair Generation

#### Generating DKIM Keys (2048-bit recommended)

```bash
# Generate private key
openssl genrsa -out broxiva-dkim-private.pem 2048

# Extract public key
openssl rsa -in broxiva-dkim-private.pem -pubout -out broxiva-dkim-public.pem

# Format public key for DNS (remove headers and newlines)
cat broxiva-dkim-public.pem | grep -v '^-' | tr -d '\n'
```

### AWS SES DKIM Configuration

AWS SES provides Easy DKIM with automatic key management.

#### Step 1: Enable DKIM in SES Console

```bash
# Using AWS CLI
aws ses verify-domain-dkim --domain broxiva.com
```

#### Step 2: Add DKIM CNAME Records

AWS SES will provide three CNAME records:

```dns
; AWS SES DKIM records (example - actual values from SES console)
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx._domainkey.broxiva.com. IN CNAME xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.dkim.amazonses.com.
yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy._domainkey.broxiva.com. IN CNAME yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.dkim.amazonses.com.
zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz._domainkey.broxiva.com. IN CNAME zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz.dkim.amazonses.com.
```

#### Step 3: Verify DKIM Status

```bash
# Check DKIM verification status
aws ses get-identity-dkim-attributes --identities broxiva.com
```

### SendGrid DKIM Configuration

#### Step 1: Authenticate Domain in SendGrid

1. Navigate to Settings > Sender Authentication
2. Click "Authenticate Your Domain"
3. Select DNS host (manual/automatic)
4. Enter domain: broxiva.com

#### Step 2: Add SendGrid DNS Records

SendGrid will provide CNAME records:

```dns
; SendGrid DKIM records (example - actual values from SendGrid)
s1._domainkey.broxiva.com. IN CNAME s1.domainkey.u12345678.wl.sendgrid.net.
s2._domainkey.broxiva.com. IN CNAME s2.domainkey.u12345678.wl.sendgrid.net.
```

### Custom DKIM Implementation

For self-hosted mail servers:

```dns
; Custom DKIM TXT record
selector1._domainkey.broxiva.com. IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
```

**DKIM Record Tags:**

| Tag | Value | Description |
|-----|-------|-------------|
| `v` | DKIM1 | Version |
| `k` | rsa | Key type |
| `p` | [base64] | Public key |
| `t` | y | Testing mode (optional) |
| `t` | s | Strict domain match |

### DKIM Key Rotation

Rotate DKIM keys annually or when compromised:

1. Generate new key pair with new selector
2. Add new DKIM record to DNS
3. Wait for DNS propagation (24-48 hours)
4. Update sending infrastructure to use new selector
5. Monitor for issues
6. Remove old DKIM record after 30 days

---

## Complete DNS Records

### Full DNS Configuration for broxiva.com

```dns
; ============================================================
; Broxiva Email Authentication DNS Records
; Domain: broxiva.com
; Last Updated: 2026-01-05
; ============================================================

; ------------------------------------------------------------
; SPF RECORDS
; ------------------------------------------------------------

; Primary domain SPF
broxiva.com.                    IN TXT     "v=spf1 include:amazonses.com include:sendgrid.net -all"

; Subdomain SPF records
mail.broxiva.com.               IN TXT     "v=spf1 include:amazonses.com include:sendgrid.net -all"
notifications.broxiva.com.      IN TXT     "v=spf1 include:amazonses.com -all"
marketing.broxiva.com.          IN TXT     "v=spf1 include:sendgrid.net -all"

; ------------------------------------------------------------
; DKIM RECORDS
; ------------------------------------------------------------

; AWS SES DKIM (replace with actual values from SES console)
xxxxxxxx._domainkey.broxiva.com.    IN CNAME   xxxxxxxx.dkim.amazonses.com.
yyyyyyyy._domainkey.broxiva.com.    IN CNAME   yyyyyyyy.dkim.amazonses.com.
zzzzzzzz._domainkey.broxiva.com.    IN CNAME   zzzzzzzz.dkim.amazonses.com.

; SendGrid DKIM (replace with actual values from SendGrid)
s1._domainkey.broxiva.com.      IN CNAME   s1.domainkey.uXXXXXXXX.wl.sendgrid.net.
s2._domainkey.broxiva.com.      IN CNAME   s2.domainkey.uXXXXXXXX.wl.sendgrid.net.

; ------------------------------------------------------------
; DMARC RECORDS
; ------------------------------------------------------------

; Primary DMARC record
_dmarc.broxiva.com.             IN TXT     "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@broxiva.com; ruf=mailto:dmarc-forensic@broxiva.com; fo=1; adkim=s; aspf=s; pct=100"

; ------------------------------------------------------------
; MX RECORDS (if using email receiving)
; ------------------------------------------------------------

broxiva.com.                    IN MX      10 mail1.broxiva.com.
broxiva.com.                    IN MX      20 mail2.broxiva.com.

; Or for Google Workspace:
; broxiva.com.                  IN MX      1 aspmx.l.google.com.
; broxiva.com.                  IN MX      5 alt1.aspmx.l.google.com.
; broxiva.com.                  IN MX      5 alt2.aspmx.l.google.com.

; ------------------------------------------------------------
; MTA-STS RECORDS (recommended)
; ------------------------------------------------------------

_mta-sts.broxiva.com.           IN TXT     "v=STSv1; id=20260105"
mta-sts.broxiva.com.            IN A       xxx.xxx.xxx.xxx  ; Points to MTA-STS policy host

; ------------------------------------------------------------
; BIMI RECORDS (optional - requires VMC)
; ------------------------------------------------------------

default._bimi.broxiva.com.      IN TXT     "v=BIMI1; l=https://broxiva.com/.well-known/bimi/logo.svg; a=https://broxiva.com/.well-known/bimi/certificate.pem"

; ------------------------------------------------------------
; REPORTING TXT RECORDS
; ------------------------------------------------------------

; TLS Reporting
_smtp._tls.broxiva.com.         IN TXT     "v=TLSRPTv1; rua=mailto:tls-reports@broxiva.com"
```

### DNS Record Summary Table

| Record Type | Host | Value | Purpose | TTL |
|-------------|------|-------|---------|-----|
| TXT | broxiva.com | v=spf1... | SPF | 3600 |
| TXT | _dmarc.broxiva.com | v=DMARC1... | DMARC | 3600 |
| CNAME | xxx._domainkey | xxx.dkim... | DKIM (SES) | 3600 |
| CNAME | s1._domainkey | s1.domainkey... | DKIM (SendGrid) | 3600 |
| TXT | _mta-sts | v=STSv1... | MTA-STS | 3600 |
| TXT | default._bimi | v=BIMI1... | BIMI | 3600 |

---

## Verification Steps

### Pre-Deployment Verification Checklist

Before sending email, verify:

- [ ] All DNS records published
- [ ] DNS propagation complete (24-48 hours)
- [ ] SPF record syntax valid
- [ ] SPF lookup count < 10
- [ ] DKIM records match provider configuration
- [ ] DMARC record syntax valid
- [ ] Report email addresses working

### Verification Tools

#### 1. SPF Verification

```bash
# Using dig
dig TXT broxiva.com +short

# Using nslookup
nslookup -type=TXT broxiva.com

# Online tools
# - https://mxtoolbox.com/spf.aspx
# - https://dmarcian.com/spf-survey/
```

**Expected Output:**
```
"v=spf1 include:amazonses.com include:sendgrid.net -all"
```

#### 2. DKIM Verification

```bash
# Using dig
dig CNAME s1._domainkey.broxiva.com +short

# For TXT-based DKIM
dig TXT selector._domainkey.broxiva.com +short

# Online tools
# - https://mxtoolbox.com/dkim.aspx
# - https://dmarcian.com/dkim-inspector/
```

#### 3. DMARC Verification

```bash
# Using dig
dig TXT _dmarc.broxiva.com +short

# Online tools
# - https://mxtoolbox.com/DMARC.aspx
# - https://dmarcian.com/dmarc-inspector/
```

**Expected Output:**
```
"v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@broxiva.com; ..."
```

#### 4. Full Email Authentication Test

Send test emails to:
- mail-tester.com
- check-auth.microsoft.com (for Microsoft 365)
- postmaster.google.com (for Gmail)

### Verification Script

```bash
#!/bin/bash
# Email Authentication Verification Script

DOMAIN="broxiva.com"

echo "=== Email Authentication Check for $DOMAIN ==="
echo ""

echo "--- SPF Record ---"
dig TXT $DOMAIN +short | grep spf

echo ""
echo "--- DMARC Record ---"
dig TXT _dmarc.$DOMAIN +short

echo ""
echo "--- DKIM Records ---"
echo "AWS SES DKIM:"
dig CNAME xxxxxxxx._domainkey.$DOMAIN +short
echo "SendGrid DKIM:"
dig CNAME s1._domainkey.$DOMAIN +short

echo ""
echo "--- MX Records ---"
dig MX $DOMAIN +short

echo ""
echo "=== Verification Complete ==="
```

### Post-Deployment Verification

After deployment, send test emails and verify:

| Test | Tool | Expected Result |
|------|------|-----------------|
| SPF Pass | Email headers | `spf=pass` |
| DKIM Pass | Email headers | `dkim=pass` |
| DMARC Pass | Email headers | `dmarc=pass` |
| Not spam | Gmail/Outlook | Delivered to inbox |
| Authentication score | mail-tester.com | 9+/10 |

### Reading Email Headers

Example authenticated email headers:

```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@broxiva.com header.s=s1 header.b=XXXXX;
       spf=pass (google.com: domain of notifications@broxiva.com designates
           149.72.XXX.XXX as permitted sender) smtp.mailfrom=notifications@broxiva.com;
       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=broxiva.com
```

---

## Monitoring and Reporting

### DMARC Report Analysis

#### Aggregate Reports (RUA)

Aggregate reports are XML files sent daily containing:
- Sending IP addresses
- SPF/DKIM/DMARC results
- Message counts

**Sample Aggregate Report Structure:**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <report_id>12345678901234567890</report_id>
    <date_range>
      <begin>1704067200</begin>
      <end>1704153600</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>broxiva.com</domain>
    <adkim>s</adkim>
    <aspf>s</aspf>
    <p>reject</p>
    <sp>reject</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>xxx.xxx.xxx.xxx</source_ip>
      <count>1234</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
  </record>
</feedback>
```

#### Forensic Reports (RUF)

Individual failure reports containing:
- Message headers
- Authentication failure details
- Potentially message body

### Monitoring Dashboard Setup

#### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| DMARC Pass Rate | % of emails passing DMARC | < 99% |
| SPF Pass Rate | % of emails passing SPF | < 99% |
| DKIM Pass Rate | % of emails passing DKIM | < 99% |
| Unknown Senders | IPs not in SPF | > 100/day |
| Policy Failures | Messages failing policy | > 10/day |
| Bounce Rate | Hard bounces | > 2% |
| Complaint Rate | Spam complaints | > 0.1% |

#### Recommended Monitoring Services

| Service | Features | Cost |
|---------|----------|------|
| dmarcian | Full DMARC analytics | $$ |
| Valimail | DMARC + automation | $$$ |
| Postmark DMARC | Basic monitoring | Free |
| Google Postmaster | Gmail-specific | Free |
| Microsoft SNDS | Outlook-specific | Free |

### Setting Up Google Postmaster Tools

1. Visit https://postmaster.google.com
2. Add and verify broxiva.com
3. Monitor:
   - Spam rate
   - IP reputation
   - Domain reputation
   - Authentication rates

### Setting Up Microsoft SNDS

1. Visit https://sendersupport.olc.protection.outlook.com/snds/
2. Request access for your IP ranges
3. Monitor:
   - Spam complaint rates
   - Trap hits
   - IP status

### Monitoring Alerts Configuration

```yaml
# Example alerting rules

alerts:
  - name: dmarc_pass_rate_low
    condition: dmarc_pass_rate < 0.99
    severity: warning
    notification:
      - email: devops@broxiva.com
      - slack: #email-alerts

  - name: unknown_sender_spike
    condition: unknown_sender_count > 100
    severity: critical
    notification:
      - email: security@broxiva.com
      - pagerduty: email-security

  - name: high_bounce_rate
    condition: bounce_rate > 0.02
    severity: warning
    notification:
      - email: devops@broxiva.com
```

---

## Bounce and Complaint Handling

### Bounce Types and Handling

| Bounce Type | Code | Description | Action |
|-------------|------|-------------|--------|
| **Hard Bounce** | 5xx | Permanent failure | Remove from list immediately |
| Mailbox not found | 550 | Address doesn't exist | Remove from list |
| Domain not found | 550 | Domain doesn't exist | Remove from list |
| Blocked | 550 | Sender blocked | Investigate, remove |
| **Soft Bounce** | 4xx | Temporary failure | Retry, then remove |
| Mailbox full | 452 | Storage exceeded | Retry 3x over 72 hours |
| Server unavailable | 451 | Temporary issue | Retry with backoff |
| Rate limited | 450 | Too many messages | Slow down sending |

### AWS SES Bounce Handling

#### Configure SNS Notifications

```bash
# Create SNS topic for bounces
aws sns create-topic --name broxiva-email-bounces

# Subscribe endpoint
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:broxiva-email-bounces \
  --protocol https \
  --notification-endpoint https://api.broxiva.com/webhooks/ses-bounce
```

#### Configure SES Notifications

```bash
# Set up bounce notifications
aws ses set-identity-notification-topic \
  --identity broxiva.com \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:us-east-1:ACCOUNT:broxiva-email-bounces
```

#### Bounce Handler Implementation

```typescript
// Example bounce handler endpoint
interface SESBounceNotification {
  notificationType: 'Bounce';
  bounce: {
    bounceType: 'Permanent' | 'Transient';
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action: string;
      status: string;
      diagnosticCode: string;
    }>;
    timestamp: string;
  };
}

async function handleBounce(notification: SESBounceNotification) {
  for (const recipient of notification.bounce.bouncedRecipients) {
    if (notification.bounce.bounceType === 'Permanent') {
      // Hard bounce - immediately suppress
      await suppressEmail(recipient.emailAddress, 'hard_bounce');
      await logBounce(recipient, 'permanent');
    } else {
      // Soft bounce - track and suppress after threshold
      const bounceCount = await incrementSoftBounceCount(recipient.emailAddress);
      if (bounceCount >= 3) {
        await suppressEmail(recipient.emailAddress, 'soft_bounce_threshold');
      }
      await logBounce(recipient, 'transient');
    }
  }
}
```

### SendGrid Event Handling

#### Configure Event Webhook

```bash
# In SendGrid UI or via API
curl -X PATCH https://api.sendgrid.com/v3/user/webhooks/event/settings \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://api.broxiva.com/webhooks/sendgrid-events",
    "bounce": true,
    "spam_report": true,
    "unsubscribe": true
  }'
```

### Complaint (Feedback Loop) Handling

#### Complaint Sources

| Provider | FBL Name | How to Register |
|----------|----------|-----------------|
| Gmail | n/a | Via Postmaster Tools |
| Microsoft | JMRP | https://sendersupport.olc.protection.outlook.com/snds/ |
| Yahoo | CFL | https://help.yahoo.com/kb/postmaster |
| AOL | FBL | https://postmaster.aol.com |

#### Complaint Handler Implementation

```typescript
// Example complaint handler
async function handleComplaint(email: string, source: string) {
  // 1. Immediately unsubscribe
  await unsubscribeEmail(email, 'spam_complaint');

  // 2. Add to suppression list
  await addToSuppressionList(email, 'complaint');

  // 3. Log for analysis
  await logComplaint({
    email,
    source,
    timestamp: new Date(),
  });

  // 4. Alert if complaint rate exceeds threshold
  const complaintRate = await calculateComplaintRate();
  if (complaintRate > 0.001) { // 0.1%
    await alertHighComplaintRate(complaintRate);
  }
}
```

### Suppression List Management

```typescript
// Suppression list schema
interface SuppressionEntry {
  email: string;
  reason: 'hard_bounce' | 'soft_bounce_threshold' | 'complaint' | 'unsubscribe' | 'manual';
  source: 'ses' | 'sendgrid' | 'manual';
  timestamp: Date;
  originalBounceCode?: string;
}

// Check suppression before sending
async function canSendTo(email: string): Promise<boolean> {
  const suppression = await checkSuppressionList(email);
  return suppression === null;
}

// Sync suppression lists across providers
async function syncSuppressionLists() {
  // Get suppressions from all sources
  const sesSuppressions = await getSESSuppressions();
  const sendgridSuppressions = await getSendGridSuppressions();

  // Merge into master list
  await mergeSuppressionLists([sesSuppressions, sendgridSuppressions]);

  // Push to all providers
  await pushToSES(masterList);
  await pushToSendGrid(masterList);
}
```

### Email Hygiene Best Practices

| Practice | Frequency | Tool |
|----------|-----------|------|
| List cleaning | Before major campaigns | NeverBounce, ZeroBounce |
| Suppression sync | Daily | Automated job |
| Bounce review | Weekly | Manual review |
| Complaint analysis | Weekly | Dashboard review |
| Inactive cleanup | Monthly | Re-engagement campaign |

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: SPF Failing

**Symptoms:**
- `spf=fail` in email headers
- Emails going to spam

**Diagnosis:**
```bash
# Check SPF record
dig TXT broxiva.com +short | grep spf

# Test with specific IP
# Use https://mxtoolbox.com/spf.aspx
```

**Solutions:**

| Problem | Solution |
|---------|----------|
| Missing include | Add `include:provider.com` |
| IP not listed | Add `ip4:x.x.x.x` |
| Too many lookups | Flatten SPF record |
| Syntax error | Validate with online tool |

#### Issue: DKIM Failing

**Symptoms:**
- `dkim=fail` in email headers
- Signature verification errors

**Diagnosis:**
```bash
# Check DKIM record
dig TXT selector._domainkey.broxiva.com +short

# Verify CNAME resolution
dig CNAME s1._domainkey.broxiva.com +short
```

**Solutions:**

| Problem | Solution |
|---------|----------|
| Record not found | Add/verify DNS record |
| Key mismatch | Regenerate keys |
| Selector wrong | Verify selector with provider |
| Message modified | Check for content filters |

#### Issue: DMARC Failing

**Symptoms:**
- `dmarc=fail` in headers
- Messages rejected or quarantined

**Diagnosis:**
```bash
# Check DMARC record
dig TXT _dmarc.broxiva.com +short

# Review DMARC reports for failure reasons
```

**Solutions:**

| Problem | Solution |
|---------|----------|
| Alignment failure | Check From domain matches SPF/DKIM domain |
| SPF or DKIM failing | Fix underlying SPF/DKIM issues |
| Policy too strict | Temporarily reduce to p=none |
| Third-party sender | Add to SPF or use custom DKIM |

#### Issue: Low Sender Reputation

**Symptoms:**
- High bounce rates
- Emails going to spam
- Deliverability dropping

**Solutions:**

1. **Clean your list**
   - Remove hard bounces
   - Re-engage or remove inactive subscribers
   - Use email verification service

2. **Warm up IP/domain**
   - Start with low volume
   - Gradually increase over 4-6 weeks
   - Focus on engaged recipients first

3. **Improve engagement**
   - Segment by engagement
   - Optimize send times
   - Improve content relevance

4. **Monitor and react**
   - Check postmaster tools daily
   - React quickly to reputation drops

### Troubleshooting Flowchart

```
Email Deliverability Issue
         │
         ▼
   Check Headers
         │
    ┌────┴────┐
    │ SPF OK? │──No──► Fix SPF Record
    └────┬────┘
         │ Yes
         ▼
   ┌─────┴─────┐
   │ DKIM OK?  │──No──► Fix DKIM Config
   └─────┬─────┘
         │ Yes
         ▼
   ┌─────┴─────┐
   │ DMARC OK? │──No──► Fix Alignment
   └─────┬─────┘
         │ Yes
         ▼
   ┌─────────────┐
   │ Reputation  │──Low──► Clean List,
   │   Check     │         Warm Up
   └─────┬───────┘
         │ OK
         ▼
   ┌─────────────┐
   │  Content    │──Bad──► Review Content
   │   Check     │         Remove Spam Triggers
   └─────────────┘
```

### Support Resources

| Resource | Purpose | URL |
|----------|---------|-----|
| AWS SES Docs | SES configuration | docs.aws.amazon.com/ses |
| SendGrid Docs | SendGrid setup | docs.sendgrid.com |
| MXToolbox | DNS verification | mxtoolbox.com |
| mail-tester | Full email test | mail-tester.com |
| dmarcian | DMARC analysis | dmarcian.com |
| Google Postmaster | Gmail reputation | postmaster.google.com |

---

## Appendices

### Appendix A: DNS Record Quick Reference

```dns
; Quick reference - copy and customize

; SPF
domain.com. TXT "v=spf1 include:amazonses.com include:sendgrid.net -all"

; DMARC (start with p=none)
_dmarc.domain.com. TXT "v=DMARC1; p=none; rua=mailto:dmarc@domain.com"

; DKIM (get from provider)
selector._domainkey.domain.com. CNAME selector.provider.com.
```

### Appendix B: Testing Checklist

```markdown
## Email Deliverability Testing Checklist

### DNS Records
- [ ] SPF record published and valid
- [ ] SPF lookup count verified (< 10)
- [ ] DKIM records published
- [ ] DMARC record published
- [ ] DNS propagation complete

### Authentication Tests
- [ ] Test email passes SPF
- [ ] Test email passes DKIM
- [ ] Test email passes DMARC
- [ ] mail-tester.com score > 9/10

### Provider Tests
- [ ] Gmail delivery (personal account)
- [ ] Outlook delivery (personal account)
- [ ] Corporate email delivery
- [ ] Yahoo/AOL delivery (if applicable)

### Monitoring Setup
- [ ] DMARC reports configured
- [ ] Bounce handling configured
- [ ] Complaint handling configured
- [ ] Monitoring dashboards setup

### Documentation
- [ ] DNS records documented
- [ ] Provider configurations documented
- [ ] Runbooks created
- [ ] Team trained
```

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Alignment** | Matching of domains in From header with SPF/DKIM domains |
| **BIMI** | Brand Indicators for Message Identification |
| **DKIM** | DomainKeys Identified Mail |
| **DMARC** | Domain-based Message Authentication, Reporting & Conformance |
| **FBL** | Feedback Loop - complaint notification system |
| **MTA-STS** | Mail Transfer Agent Strict Transport Security |
| **PTR** | Pointer record - reverse DNS |
| **SPF** | Sender Policy Framework |
| **TLS** | Transport Layer Security |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Broxiva Team | Initial release |

**Next Review Date:** 2026-07-05

**Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| DevOps Lead | | | |
| CTO | | | |
