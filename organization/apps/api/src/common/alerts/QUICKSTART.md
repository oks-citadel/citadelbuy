# Alert System Quick Start Guide

## 5-Minute Setup

### Step 1: Configure Environment Variables (2 minutes)

Add to your `.env` file:

```bash
# Slack (Recommended)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty (Optional)
PAGERDUTY_API_KEY=your_routing_key_here

# Email Fallback
ALERT_EMAIL_RECIPIENTS=ops@citadelbuy.com,engineering@citadelbuy.com
```

### Step 2: Get Your Slack Webhook (1 minute)

1. Go to https://api.slack.com/messaging/webhooks
2. Click "Create your Slack app"
3. Choose "From scratch"
4. Name it "CitadelBuy Alerts"
5. Choose your workspace
6. Add "Incoming Webhooks" feature
7. Create webhook for #alerts channel
8. Copy the webhook URL

### Step 3: Test the Setup (1 minute)

```typescript
import { AlertService } from '@/common/alerts/alert.service';

// In any service
constructor(private alertService: AlertService) {}

// Test it
async testAlerts() {
  await this.alertService.sendTestAlert();
}
```

### Step 4: Start Using (1 minute)

```typescript
// Critical Alert
await this.alertService.sendAlert({
  level: AlertLevel.CRITICAL,
  title: 'Payment Failed',
  message: 'Unable to process payment',
  details: { orderId: '12345', error: 'timeout' },
  source: 'PaymentService',
});

// Warning Alert
await this.alertService.sendAlert({
  level: AlertLevel.WARNING,
  title: 'High CPU Usage',
  message: 'CPU usage at 85%',
  details: { usage: '85%', threshold: '80%' },
  source: 'MonitoringService',
});

// Info Alert
await this.alertService.sendAlert({
  level: AlertLevel.INFO,
  title: 'Backup Complete',
  message: 'Daily backup completed successfully',
  details: { size: '2.3GB', duration: '45min' },
  source: 'BackupService',
});
```

## That's It!

You're now ready to use the alert system. The EmailProcessor is already configured and will send alerts for critical email failures.

For more details, see:
- Full documentation: `README.md`
- Usage examples: `alert.service.example.ts`
- Implementation guide: `../../ALERT_SYSTEM_IMPLEMENTATION.md`

## Common Issues

**No alerts received?**
- Check `SLACK_WEBHOOK_URL` is set
- Run `await alertService.healthCheck()`
- Check logs for errors

**Too many alerts?**
- Rate limiting is automatic (10 per 5 minutes)
- Consider aggregating similar alerts
- Review alert levels (use WARNING for non-critical)

## Need Help?

```typescript
// Check if alert system is working
const health = await this.alertService.healthCheck();
console.log(health);
// { healthy: true, channels: { slack: true, pagerduty: true, email: true } }

// Send test alert
await this.alertService.sendTestAlert();
```
