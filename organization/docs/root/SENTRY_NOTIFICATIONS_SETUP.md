# Sentry Team Notifications Setup Guide

## Overview

This guide provides detailed instructions for setting up team notifications for CitadelBuy's Sentry monitoring. It covers Slack integration, email alerts, PagerDuty on-call rotation, and webhook configurations.

## Table of Contents

- [Slack Integration](#slack-integration)
- [Email Notifications](#email-notifications)
- [PagerDuty Integration](#pagerduty-integration)
- [Microsoft Teams Integration](#microsoft-teams-integration)
- [Custom Webhooks](#custom-webhooks)
- [Notification Rules](#notification-rules)
- [Best Practices](#best-practices)

---

## Slack Integration

### Prerequisites

- Slack workspace admin access
- Sentry organization admin or manager role
- Appropriate Slack channels created

### Step 1: Install Sentry Slack App

1. **Navigate to Sentry Integrations:**
   - Go to **Settings** → **Integrations**
   - Search for "Slack"
   - Click **Add to Slack**

2. **Authorize Sentry:**
   - Select your Slack workspace
   - Review permissions:
     - Post messages
     - Read channel information
     - Add slash commands
   - Click **Allow**

3. **Configure Default Settings:**
   - Default channel: `#sentry-notifications`
   - Default notification type: All new issues
   - Save configuration

### Step 2: Create Slack Channels

Create dedicated channels for different alert types:

```
#incidents-critical      → Critical production issues requiring immediate response
#platform-alerts         → Warning-level platform alerts
#payments-team          → Payment-specific issues
#frontend-team          → Frontend-specific issues
#backend-team           → Backend-specific issues
#mobile-team            → Mobile app issues
#security-alerts        → Security-related events
#releases               → Deployment and release notifications
#weekly-metrics         → Scheduled reports and summaries
#sentry-resolved        → Resolved issues (optional)
```

**Channel Settings:**

For critical channels (`#incidents-critical`):
- Enable @channel and @here mentions
- Pin runbook links
- Set channel topic with escalation contacts
- Configure retention: Keep all messages

For regular alert channels:
- Enable notifications for all messages
- Pin relevant documentation
- Configure retention: 90 days

### Step 3: Configure Channel Alerts

#### Option A: Alert Rules (Recommended)

Configure alerts at the project level to route to specific channels.

**Example: Critical Errors to #incidents-critical**

1. Navigate to **Project** → **Alerts** → **Create Alert Rule**
2. Configure alert (see Alert Templates document)
3. In **Actions** section:
   - Select **Send a Slack notification**
   - Choose workspace: **CitadelBuy**
   - Select channel: **#incidents-critical**
   - Configure message format (see below)

#### Option B: Issue Alerts

Configure issue-level notifications:

1. Navigate to **Project** → **Settings** → **Issue Alerts**
2. Click **Create New Rule**
3. Configure conditions:
   ```
   When: An event is first seen
   If: level equals error OR fatal
   Then: Send a notification to Slack workspace CitadelBuy and channel #platform-alerts
   ```

### Step 4: Customize Slack Message Format

**Navigate to:** Alert Rule → Actions → Edit Slack Message

**Recommended Template:**

```
{% if level == 'error' %}:x:{% elif level == 'warning' %}:warning:{% else %}:information_source:{% endif %} *{{ title }}*

*Project:* {{ project_name }}
*Environment:* {{ environment }}
*Severity:* {{ level }}

{% if count %}*Count:* {{ count }} events in {{ window }}{% endif %}
{% if unique_users %}*Affected Users:* {{ unique_users }}{% endif %}

{% if message %}*Error:* {{ message|truncate(200) }}{% endif %}
{% if culprit %}*Location:* `{{ culprit }}`{% endif %}

{% if tags.http_method and tags.url %}
*Request:* `{{ tags.http_method }} {{ tags.url }}`
{% endif %}

{% if tags.transaction %}*Transaction:* {{ tags.transaction }}{% endif %}
{% if tags.release %}*Release:* {{ tags.release }}{% endif %}

<{{ url }}|:sentry: View in Sentry> | <{{ project_link }}|:file_folder: Project Dashboard>

{% if level == 'error' or level == 'fatal' %}
:rotating_light: *Action Required*: Please investigate immediately
{% endif %}
```

**For Critical Alerts (with @channel mention):**

```
<!channel> :rotating_light: *PRODUCTION INCIDENT*

*{{ title }}*

*Severity:* CRITICAL
*Project:* {{ project_name }}
*Environment:* {{ environment }}
*Time:* {{ timestamp }}

*Impact:*
• {{ count }} errors in {{ window }}
• {{ unique_users }} users affected

*Error Details:*
{{ message|truncate(300) }}

*Stack Trace:*
```
{{ culprit }}
```

*Immediate Actions:*
1. Check application health: <https://status.citadelbuy.com|Status Page>
2. Review error details: <{{ url }}|View in Sentry>
3. Follow incident runbook: <https://docs.citadelbuy.com/runbooks/incidents|Runbook>

*On-Call:* @oncall-engineer

<{{ url }}|:sentry: View Full Details in Sentry>
```

### Step 5: Set Up Slack Commands

After installation, Sentry provides slash commands in Slack:

**Available Commands:**

```
/sentry link [issue-url]           → Link Slack thread to Sentry issue
/sentry unlink                     → Unlink current thread
/sentry assign @user               → Assign issue to user
/sentry resolve                    → Mark issue as resolved
/sentry ignore                     → Ignore issue
/sentry status                     → Check Sentry status
```

**Usage Example:**

```
User: /sentry link https://sentry.io/organizations/citadelbuy/issues/123/
Bot: ✓ Linked to issue CITADEL-123. Future updates will appear in this thread.

User: /sentry assign @john
Bot: ✓ Assigned issue CITADEL-123 to John Doe

User: /sentry resolve
Bot: ✓ Marked issue CITADEL-123 as resolved
```

### Step 6: Configure Thread Replies

Enable thread replies to keep conversations organized:

1. Navigate to **Settings** → **Integrations** → **Slack** → **Edit**
2. Enable **Reply in Thread**
3. Configure threading options:
   - ☑ New issue: Create new message
   - ☑ Issue updates: Reply to thread
   - ☑ Resolved: Reply to thread
   - ☑ Assigned: Reply to thread

### Step 7: Test Slack Integration

**Test Message:**

1. Navigate to **Settings** → **Integrations** → **Slack**
2. Click **Test Integration**
3. Select channel: `#platform-alerts`
4. Click **Send Test Message**
5. Verify message appears in Slack

**Trigger Real Alert:**

```bash
# Trigger test error in development
curl -X POST http://localhost:4000/api/test/sentry-error

# Check Slack channel for notification
```

---

## Email Notifications

### Step 1: Configure Organization Email Settings

1. Navigate to **Settings** → **Mail**
2. Configure SMTP settings (if self-hosted):
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   Username: apikey
   Password: [SendGrid API Key]
   From Email: sentry@citadelbuy.com
   From Name: CitadelBuy Sentry
   ```

3. For Sentry.io (cloud), default email is pre-configured

### Step 2: Create Email Distribution Lists

Create email groups for different teams:

**Engineering Leadership:**
- `engineering-leads@citadelbuy.com`
  - VP Engineering
  - Engineering Managers
  - Tech Leads

**Team Distribution Lists:**
- `platform-team@citadelbuy.com`
- `frontend-team@citadelbuy.com`
- `mobile-team@citadelbuy.com`
- `payments-team@citadelbuy.com`
- `infrastructure-team@citadelbuy.com`
- `security-team@citadelbuy.com`

**On-Call:**
- `oncall@citadelbuy.com` (forwards to current on-call engineer via PagerDuty)

**All Hands:**
- `engineering-all@citadelbuy.com` (weekly reports only)

### Step 3: Configure Individual Email Preferences

Each team member should configure their preferences:

1. Navigate to **User Settings** → **Notifications**
2. Configure email settings:

**Recommended Settings:**

| Notification Type | Setting | Notes |
|------------------|---------|-------|
| Deploy Notifications | Enabled | Get notified of deployments |
| Issue Alerts | Assigned issues only | Reduce noise |
| Workflow Notifications | Enabled | Comments, assignments, resolutions |
| Weekly Reports | Enabled | Sunday summary email |
| Spike Protection | Enabled (10/hour) | Prevent email flooding |
| Quota Notifications | Enabled | Warn when quota is low |

**Fine-Grained Control:**

```
Personal Alerts:
☑ Only assigned issues
☑ Issues I'm watching
☑ Issues in my teams' projects
☐ All unresolved issues (too noisy)

Workflow:
☑ Comments on my issues
☑ Assigned to me
☑ Status changes on my issues
☑ Mentioned in comments

Reports:
☑ Weekly summary
☑ Deploy notifications
☑ Quota warnings
```

### Step 4: Configure Project Email Rules

**Navigate to:** Project → Alerts → Create Alert Rule

**Example: High Priority Email Alert**

```yaml
Name: "[Production] High Priority Issue - Email Alert"
Conditions:
  - Number of events >= 20 in 5 minutes
  - Level: error or fatal
  - Environment: production

Actions:
  - Send email to: platform-team@citadelbuy.com
  - Send email to: oncall@citadelbuy.com
  - Frequency: Every 5 minutes (max)
```

### Step 5: Email Templates

**Critical Issue Email Template:**

```
Subject: [CRITICAL] Production Issue: {{ title }}

Dear Team,

A critical issue has been detected in production:

PROJECT: {{ project_name }}
ENVIRONMENT: {{ environment }}
SEVERITY: {{ level }}

ISSUE DETAILS:
{{ message }}

IMPACT:
- Events: {{ count }} in {{ window }}
- Affected Users: {{ unique_users }}
- First Seen: {{ first_seen }}

LOCATION:
{{ culprit }}

STACK TRACE:
{{ exception }}

ACTIONS REQUIRED:
1. Investigate immediately
2. Check system health dashboard
3. Review recent deployments
4. Follow incident response protocol

VIEW IN SENTRY:
{{ url }}

This is an automated message from CitadelBuy Sentry.
To update your notification preferences: {{ settings_url }}
```

**Weekly Summary Email Template:**

```
Subject: [Weekly Summary] CitadelBuy Sentry Report - Week of {{ week }}

Hello {{ recipient_name }},

Here's your weekly Sentry summary for CitadelBuy:

=== NEW ISSUES ===
• {{ new_issues_count }} new issues detected
• {{ critical_issues_count }} critical issues
• Top error: {{ top_error }}

=== RESOLVED ISSUES ===
• {{ resolved_issues_count }} issues resolved this week
• Top resolver: {{ top_resolver }}

=== PERFORMANCE ===
• Average error rate: {{ avg_error_rate }}%
• P95 response time: {{ p95_response_time }}ms
• Total events: {{ total_events }}

=== TOP ISSUES ===
1. {{ issue_1_title }} ({{ issue_1_count }} events)
2. {{ issue_2_title }} ({{ issue_2_count }} events)
3. {{ issue_3_title }} ({{ issue_3_count }} events)

=== ACTION ITEMS ===
• {{ open_high_priority }} high priority issues need attention
• {{ unassigned_count }} unassigned issues

VIEW FULL DASHBOARD:
{{ dashboard_url }}

Best regards,
CitadelBuy Monitoring Team
```

---

## PagerDuty Integration

### Step 1: Install PagerDuty Integration

1. Navigate to **Settings** → **Integrations**
2. Search for "PagerDuty"
3. Click **Add Integration**
4. Follow OAuth flow to connect PagerDuty account

### Step 2: Create PagerDuty Services

In PagerDuty, create services for each CitadelBuy component:

**Services:**

```
Service Name: CitadelBuy Backend - Production
Integration Type: Events API V2
Escalation Policy: Platform Team Escalation
Incident Urgency: High urgency for all incidents
```

```
Service Name: CitadelBuy Frontend - Production
Integration Type: Events API V2
Escalation Policy: Frontend Team Escalation
Incident Urgency: High urgency for all incidents
```

```
Service Name: CitadelBuy Mobile - Production
Integration Type: Events API V2
Escalation Policy: Mobile Team Escalation
Incident Urgency: High urgency for all incidents
```

```
Service Name: CitadelBuy Payments - Production
Integration Type: Events API V2
Escalation Policy: Payments Team Escalation
Incident Urgency: High urgency for all incidents
```

### Step 3: Configure Escalation Policies

**Platform Team Escalation:**

```
Level 1: On-call Platform Engineer (5 minutes)
├─ Notification: Push + SMS + Phone call
└─ If no acknowledgment → Escalate to Level 2

Level 2: Platform Team Lead (5 minutes)
├─ Notification: Push + SMS + Phone call
└─ If no acknowledgment → Escalate to Level 3

Level 3: Engineering Manager (10 minutes)
├─ Notification: Push + SMS + Phone call
└─ If no acknowledgment → Escalate to Level 4

Level 4: VP Engineering + All Platform Engineers
└─ Notification: Push + SMS + Phone call
```

**Create similar escalation policies for other teams**

### Step 4: Map Sentry Projects to PagerDuty Services

In Sentry:

1. Navigate to **Project** → **Settings** → **Integrations** → **PagerDuty**
2. Click **Add Service**
3. Map services:

| Sentry Project | PagerDuty Service |
|---------------|-------------------|
| citadelbuy-backend-prod | CitadelBuy Backend - Production |
| citadelbuy-web-prod | CitadelBuy Frontend - Production |
| citadelbuy-mobile-prod | CitadelBuy Mobile - Production |

### Step 5: Configure PagerDuty Alert Rules

**Navigate to:** Project → Alerts → Create Alert Rule

**Example: Critical Error PagerDuty Alert**

```yaml
Name: "[Production] Critical Errors - PagerDuty"
Conditions:
  - Number of events >= 50 in 5 minutes
  - Level: error or fatal
  - Environment: production

Actions:
  - Send PagerDuty notification
  - Service: CitadelBuy Backend - Production
  - Severity: critical
  - Include custom details:
    • Project: {{ project_name }}
    • Error Count: {{ count }}
    • Affected Users: {{ unique_users }}
    • Sentry URL: {{ url }}
```

### Step 6: Set Up On-Call Schedules

In PagerDuty, create rotation schedules:

**Platform Team Schedule:**

```
Schedule Name: Platform Team On-Call
Timezone: America/New_York
Rotation Type: Weekly

Week 1: John Doe
Week 2: Jane Smith
Week 3: Bob Johnson
Week 4: Alice Williams
Week 5: Charlie Brown
```

**Coverage:**
- 24/7 coverage
- Handoff time: Monday 9:00 AM
- Override support: Yes (for vacation/PTO)

**Create similar schedules for other teams**

### Step 7: Configure PagerDuty Notification Rules

In PagerDuty user settings:

**High-Urgency Incidents:**
```
1 minute:   Push notification
2 minutes:  SMS
3 minutes:  Phone call
5 minutes:  Escalate (if no acknowledgment)
```

**Low-Urgency Incidents:**
```
1 minute:   Push notification
10 minutes: SMS
20 minutes: Phone call
```

### Step 8: Test PagerDuty Integration

1. Navigate to **Project** → **Settings** → **Integrations** → **PagerDuty**
2. Click **Send Test Alert**
3. Verify:
   - Incident created in PagerDuty
   - On-call engineer received notification
   - Acknowledgment flows back to Sentry

---

## Microsoft Teams Integration

### Step 1: Install Microsoft Teams Integration

1. Navigate to **Settings** → **Integrations**
2. Search for "Microsoft Teams"
3. Click **Add to Microsoft Teams**
4. Authorize Sentry app in Teams

### Step 2: Configure Teams Channels

Create channels similar to Slack structure:

```
Critical Incidents
Platform Alerts
Payments Team
Frontend Team
Backend Team
Mobile Team
Release Notifications
```

### Step 3: Add Sentry Connector

In Microsoft Teams:

1. Go to channel → **Connectors**
2. Search for "Sentry"
3. Click **Configure**
4. Enter webhook URL from Sentry
5. Save configuration

### Step 4: Configure Alert Rules

Similar to Slack, configure alert rules to send notifications to Teams channels.

---

## Custom Webhooks

### Use Cases

- Internal incident management system
- Custom logging service
- Slack alternatives
- Automated remediation
- Data analytics pipelines

### Step 1: Create Webhook Endpoint

**Example: Node.js/Express Webhook Handler**

```typescript
import express from 'express';
import { validateSentrySignature } from './utils/sentry';

const app = express();

app.post('/webhooks/sentry', express.json(), async (req, res) => {
  // Validate Sentry signature
  const signature = req.headers['sentry-hook-signature'];
  if (!validateSentrySignature(signature, req.body)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { action, data } = req.body;

  switch (action) {
    case 'issue.created':
      await handleNewIssue(data.issue);
      break;

    case 'issue.resolved':
      await handleResolvedIssue(data.issue);
      break;

    case 'issue.assigned':
      await handleAssignedIssue(data.issue);
      break;

    case 'metric.alert':
      await handleMetricAlert(data.metric_alert);
      break;

    default:
      console.log('Unknown action:', action);
  }

  res.status(200).json({ success: true });
});

async function handleNewIssue(issue) {
  // Custom logic
  console.log('New issue:', issue.title);

  // Example: Post to internal system
  await fetch('https://internal.citadelbuy.com/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: issue.title,
      severity: issue.level,
      url: issue.web_url,
      project: issue.project.name,
    }),
  });
}
```

### Step 2: Configure Webhook in Sentry

1. Navigate to **Settings** → **Integrations** → **Webhooks**
2. Click **Add Webhook**
3. Configure:
   ```
   URL: https://api.citadelbuy.com/webhooks/sentry
   Events:
     ☑ issue.created
     ☑ issue.resolved
     ☑ issue.assigned
     ☑ metric.alert
   Secret: [Generate secure secret]
   ```

### Step 3: Validate Webhook Signatures

**Python Example:**

```python
import hmac
import hashlib

def validate_sentry_signature(signature, body, secret):
    """Validate Sentry webhook signature"""
    expected = hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
```

**Node.js Example:**

```typescript
import crypto from 'crypto';

function validateSentrySignature(
  signature: string,
  body: any,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Step 4: Test Webhook

1. Navigate to **Settings** → **Integrations** → **Webhooks**
2. Click **Test** next to your webhook
3. Select event type: `issue.created`
4. Click **Send Test Event**
5. Verify your endpoint receives the payload

---

## Notification Rules

### Personal Notification Rules

Each user can configure personal notification preferences:

1. Navigate to **User Settings** → **Notifications**
2. Configure per-project rules:

**Example Rules:**

```
Project: citadelbuy-backend-prod
Rule: Notify me when:
  • An issue is assigned to me
  • Someone mentions me in a comment
  • An issue I'm subscribed to changes status
  • A new high-severity issue is created

Delivery:
  ☑ Email (immediate)
  ☑ Slack DM (immediate)
  ☐ Browser notification
```

### Team Notification Rules

Configure team-wide notification rules:

1. Navigate to **Settings** → **Teams** → [Team Name] → **Notifications**
2. Configure team rules:

**Platform Team Example:**

```
Notify team when:
  • New high-severity issue in backend projects
  • Performance degradation detected
  • Critical error rate threshold exceeded

Delivery:
  ☑ Slack channel: #platform-alerts
  ☑ Email: platform-team@citadelbuy.com
  ☐ PagerDuty (only for critical)

Frequency:
  • Immediate for critical
  • Digest every 4 hours for medium/low
```

### Project Notification Rules

Configure default notification behavior for each project:

1. Navigate to **Project** → **Settings** → **Alerts**
2. Configure default rules:

**Production Project Example:**

```
Default Issue Alert:
  When: A new issue is created
  If: level is error OR fatal
  Then:
    • Assign to: Issue owner (based on ownership rules)
    • Send Slack notification to: #platform-alerts
    • Send email to: platform-team@citadelbuy.com
    • Create PagerDuty incident (if critical)

Default Metric Alert:
  When: Error rate exceeds threshold
  Threshold: 50 errors in 5 minutes
  Then:
    • Send Slack notification to: #incidents-critical
    • Send PagerDuty alert to: CitadelBuy Backend - Production
    • Trigger webhook: https://api.citadelbuy.com/webhooks/high-error-rate
```

---

## Best Practices

### 1. Alert Fatigue Prevention

**Strategies:**
- Start with conservative thresholds
- Use spike protection (limit notifications per hour)
- Filter out known noise (validation errors, 404s)
- Use digest mode for low-priority alerts
- Regular review and tuning of alert rules

**Warning Signs of Alert Fatigue:**
- Low acknowledgment rates
- Delayed response times
- Alerts being ignored
- Team complaints about notification volume

**Solutions:**
- Increase thresholds
- Add more specific filters
- Route to appropriate channels
- Use scheduled digests for non-critical issues

### 2. Channel Organization

**Do's:**
- Separate critical from informational channels
- Use clear, consistent naming conventions
- Pin important resources in channels
- Set appropriate notification levels per channel
- Archive inactive channels

**Don'ts:**
- Don't mix critical and low-priority alerts
- Don't use personal DMs for team-wide issues
- Don't create too many channels (causes fragmentation)
- Don't forget to document channel purposes

### 3. On-Call Rotation

**Best Practices:**
- Rotate weekly or bi-weekly
- Ensure adequate coverage (24/7 for production)
- Provide clear handoff procedures
- Document common issues in runbooks
- Compensate on-call engineers appropriately
- Have escalation path for complex issues

**Handoff Checklist:**
```
☐ Review open critical issues
☐ Check upcoming deployments
☐ Verify PagerDuty schedule
☐ Share any ongoing investigations
☐ Update on-call contact in Slack
☐ Confirm availability and backup contact
```

### 4. Notification Testing

**Regular Testing:**
- Test all integrations monthly
- Verify escalation policies work
- Check notification delivery times
- Validate webhook signatures
- Test during non-business hours

**Fire Drills:**
- Simulate production incidents quarterly
- Test entire escalation chain
- Verify response times
- Document gaps and improve

### 5. Documentation

**Maintain Documentation For:**
- Alert meanings and response procedures
- Escalation contacts
- Runbooks for common issues
- Integration configuration
- Change history

**Keep Updated:**
- Review quarterly
- Update after incidents
- Include in onboarding
- Version control in Git

### 6. Metrics and Monitoring

**Track These Metrics:**
- Mean time to acknowledge (MTTA)
- Mean time to resolve (MTTR)
- Alert acknowledgment rate
- False positive rate
- Notification delivery success rate

**Review Monthly:**
- Alert effectiveness
- Response times
- Team satisfaction
- Notification volumes
- Integration health

---

## Troubleshooting

### Slack Integration Issues

**Issue: Messages not appearing in Slack**

Solutions:
1. Verify Slack app is installed and authorized
2. Check channel permissions (Sentry bot must be invited)
3. Review inbound filters (may be blocking events)
4. Test with manual notification
5. Check Sentry status page

**Issue: Delayed Slack notifications**

Solutions:
1. Check Slack workspace status
2. Verify network connectivity
3. Review Sentry processing queue
4. Check if spike protection is active
5. Contact Sentry support

### Email Delivery Issues

**Issue: Emails not being received**

Solutions:
1. Check spam/junk folders
2. Verify email address is correct
3. Check email quota in Sentry
4. Review user notification preferences
5. Check SMTP configuration (self-hosted)
6. Whitelist sentry.io domain

**Issue: Too many emails**

Solutions:
1. Enable spike protection
2. Adjust notification preferences
3. Use digest mode
4. Increase alert thresholds
5. Filter out noise

### PagerDuty Issues

**Issue: Incidents not creating in PagerDuty**

Solutions:
1. Verify PagerDuty integration is active
2. Check service mapping configuration
3. Review alert rule actions
4. Test integration manually
5. Check PagerDuty API key validity

**Issue: Notifications not reaching on-call**

Solutions:
1. Verify on-call schedule
2. Check user notification rules in PagerDuty
3. Verify phone numbers and email addresses
4. Test with manual page
5. Review escalation policy

---

## Support and Escalation

### Internal Support

**First Line of Support:**
- DevOps Team: devops-team@citadelbuy.com
- Documentation: https://docs.citadelbuy.com/monitoring

**Escalation Path:**
1. Team Lead (< 1 hour)
2. Engineering Manager (< 2 hours)
3. VP Engineering (< 4 hours)

### External Support

**Sentry Support:**
- Documentation: https://docs.sentry.io
- Community: https://forum.sentry.io
- Support Ticket: https://sentry.io/support
- Status Page: https://status.sentry.io

**Integration Vendor Support:**
- Slack: https://slack.com/help
- PagerDuty: https://support.pagerduty.com
- Microsoft Teams: https://support.microsoft.com

---

**Last Updated:** 2024-12-04
**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
