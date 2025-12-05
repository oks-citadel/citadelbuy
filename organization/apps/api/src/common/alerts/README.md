# Alert Notification System

## Overview

The Alert Notification System provides production-ready alerting capabilities for CitadelBuy, enabling real-time notifications for critical system events through multiple channels.

## Features

- **Multi-Channel Support**
  - Slack webhook integration
  - PagerDuty integration (for critical alerts)
  - Email alerts as fallback

- **Alert Levels**
  - `INFO`: Informational messages
  - `WARNING`: Warning conditions that require attention
  - `CRITICAL`: Critical failures requiring immediate action

- **Production Features**
  - Automatic fallback mechanism if primary channels fail
  - Rate limiting to prevent alert storms (max 10 alerts per 5 minutes per alert type)
  - Structured logging
  - Retry logic with exponential backoff
  - Health check endpoint
  - Test alert functionality

## Installation

The AlertModule is already registered as a global module and available throughout the application.

```typescript
// AlertModule is @Global(), so no need to import in every module
// Just inject AlertService where needed
constructor(private readonly alertService: AlertService) {}
```

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Slack Webhook URL (Required for Slack alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# PagerDuty API Key (Optional - for critical alerts only)
PAGERDUTY_API_KEY=your_pagerduty_routing_key_here

# Email Alert Recipients (Comma-separated)
ALERT_EMAIL_RECIPIENTS=ops@citadelbuy.com,engineering@citadelbuy.com

# SMTP Settings (required if using email alerts)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=alerts@citadelbuy.com
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM=alerts@citadelbuy.com
```

### Slack Setup

1. Go to your Slack workspace settings
2. Navigate to **Apps & Integrations** > **Manage**
3. Search for "Incoming Webhooks" and add it
4. Create a new webhook for your desired channel
5. Copy the webhook URL and set it as `SLACK_WEBHOOK_URL`

Reference: https://api.slack.com/messaging/webhooks

### PagerDuty Setup (Optional)

1. Log in to your PagerDuty account
2. Navigate to **Services** > **Service Directory**
3. Create a new service or select an existing one
4. Add an integration with type "Events API V2"
5. Copy the Integration Key and set it as `PAGERDUTY_API_KEY`

Reference: https://support.pagerduty.com/docs/services-and-integrations

### Email Setup

Email alerts use the existing SMTP configuration. Ensure your SMTP settings are properly configured in the environment variables.

## Usage

### Basic Alert

```typescript
import { Injectable } from '@nestjs/common';
import { AlertService, AlertLevel } from '@/common/alerts/alert.service';

@Injectable()
export class YourService {
  constructor(private readonly alertService: AlertService) {}

  async someMethod() {
    try {
      // Your business logic
    } catch (error) {
      // Send a critical alert
      await this.alertService.sendAlert({
        level: AlertLevel.CRITICAL,
        title: 'Payment Processing Failed',
        message: 'Unable to process payment for order #12345',
        details: {
          orderId: '12345',
          error: error.message,
          userId: 'user_123',
          amount: 99.99,
        },
        source: 'PaymentService',
      });
    }
  }
}
```

### Warning Alert

```typescript
await this.alertService.sendAlert({
  level: AlertLevel.WARNING,
  title: 'High Memory Usage',
  message: 'Server memory usage exceeded 80%',
  details: {
    currentUsage: '85%',
    threshold: '80%',
    server: 'api-server-1',
  },
  source: 'MonitoringService',
});
```

### Info Alert

```typescript
await this.alertService.sendAlert({
  level: AlertLevel.INFO,
  title: 'Scheduled Maintenance',
  message: 'Database backup completed successfully',
  details: {
    duration: '45 minutes',
    backupSize: '2.3 GB',
    timestamp: new Date().toISOString(),
  },
  source: 'MaintenanceService',
});
```

## Alert Channels

### Channel Priority

1. **Slack** - Primary notification channel for all alert levels
2. **PagerDuty** - Only triggered for CRITICAL alerts
3. **Email** - Fallback channel if other channels fail

### Rate Limiting

To prevent alert storms, the system implements rate limiting:

- **Window**: 5 minutes
- **Max Alerts**: 10 per alert type per window
- Duplicate alerts are automatically suppressed

### Automatic Fallback

If the primary alert channel (Slack) fails, the system automatically falls back to:

1. PagerDuty (for critical alerts)
2. Email (for all alerts)

## Health Check

Check the health status of the alert service:

```typescript
const health = await this.alertService.healthCheck();
console.log(health);
// Output:
// {
//   healthy: true,
//   channels: {
//     slack: true,
//     pagerduty: true,
//     email: true
//   }
// }
```

## Test Alert

Send a test alert to verify configuration:

```typescript
await this.alertService.sendTestAlert();
```

This will send a test notification through all configured channels.

## Alert Format

### Slack

Alerts in Slack are formatted with:
- Color-coded header (red for critical, orange for warning, blue for info)
- Alert title and message
- Structured details fields
- Timestamp and source information

### PagerDuty

PagerDuty incidents include:
- Summary with alert title and message
- Severity level
- Source system
- Custom details object with all metadata

### Email

Email alerts include:
- HTML-formatted message with color-coded header
- Plain text fallback
- All alert details in a table format
- Timestamp and source information

## Integration Examples

### Email Processor Integration

```typescript
// Already implemented in email.processor.ts
private async sendFailureAlert(job: Job<EmailJobData>, error: Error) {
  await this.alertService.sendAlert({
    level: AlertLevel.CRITICAL,
    title: 'Critical Email Delivery Failure',
    message: `Failed to deliver critical email: ${job.data.subject}`,
    details: {
      jobId: job.id.toString(),
      recipient: job.data.to,
      subject: job.data.subject,
      emailType: job.data.type,
      error: error.message,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts || 1,
      failedAt: new Date().toISOString(),
    },
    source: 'EmailProcessor',
  });
}
```

### Custom Service Integration

```typescript
@Injectable()
export class CustomService {
  constructor(private readonly alertService: AlertService) {}

  async monitorInventory() {
    const lowStockItems = await this.findLowStockItems();

    if (lowStockItems.length > 0) {
      await this.alertService.sendAlert({
        level: AlertLevel.WARNING,
        title: 'Low Inventory Alert',
        message: `${lowStockItems.length} items are running low on stock`,
        details: {
          items: lowStockItems.map(item => ({
            id: item.id,
            name: item.name,
            currentStock: item.stock,
            threshold: item.minStock,
          })),
        },
        source: 'InventoryService',
      });
    }
  }
}
```

## Best Practices

### 1. Use Appropriate Alert Levels

- **CRITICAL**: System failures, data loss, security breaches, payment failures
- **WARNING**: Performance degradation, approaching limits, non-critical errors
- **INFO**: Successful operations, scheduled tasks, state changes

### 2. Provide Context

Always include relevant details in the `details` object:

```typescript
details: {
  orderId: '12345',
  userId: 'user_123',
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
}
```

### 3. Use Descriptive Titles

Good: "Payment Processing Failed for Order #12345"
Bad: "Error"

### 4. Set Appropriate Source

Use the service or module name as the source:

```typescript
source: 'PaymentService'
source: 'EmailProcessor'
source: 'AuthenticationService'
```

### 5. Handle Alert Failures Gracefully

```typescript
try {
  await this.alertService.sendAlert({
    level: AlertLevel.CRITICAL,
    title: 'Critical Error',
    message: error.message,
    details: { error: error.stack },
    source: 'YourService',
  });
} catch (alertError) {
  // Alert service failed - log but don't throw
  this.logger.error('Failed to send alert', alertError);
}
```

## Monitoring

### Logs

All alert activity is logged:

```
[AlertService] 🔴 [CRITICAL] Payment Processing Failed: Unable to process payment for order #12345
[AlertService] Alert sent to Slack: Payment Processing Failed
[AlertService] Alert sent to PagerDuty: Payment Processing Failed
[AlertService] Alert sent via email: Payment Processing Failed
```

### Rate Limit Warnings

```
[AlertService] Alert rate limited: CRITICAL-Payment Processing Failed (12 alerts in window)
```

## Troubleshooting

### Slack Alerts Not Received

1. Verify `SLACK_WEBHOOK_URL` is set correctly
2. Check the webhook is active in Slack settings
3. Verify network connectivity to Slack API
4. Check logs for error messages

### PagerDuty Incidents Not Created

1. Verify `PAGERDUTY_API_KEY` is set correctly
2. Ensure the routing key is valid
3. Check PagerDuty service is active
4. Verify alert level is CRITICAL (PagerDuty only triggers for critical alerts)

### Email Alerts Not Received

1. Verify SMTP settings are correct
2. Check `ALERT_EMAIL_RECIPIENTS` is set
3. Verify email addresses are valid
4. Check spam/junk folders

### All Channels Failed

If all channels fail:
1. Check network connectivity
2. Verify all credentials are correct
3. Check application logs for specific errors
4. Verify the AlertService is properly initialized

## Security Considerations

1. **Webhook URLs**: Store Slack webhook URLs as secrets, never commit to version control
2. **API Keys**: Store PagerDuty API keys securely using environment variables or secrets manager
3. **Email Credentials**: Use app-specific passwords for SMTP authentication
4. **Rate Limiting**: Prevents alert flooding and potential DoS scenarios
5. **Error Handling**: Alert failures are logged but don't crash the application

## Performance

- Alert sending is asynchronous and doesn't block the main application flow
- Rate limiting prevents excessive API calls
- Failed alerts are logged but don't throw exceptions
- Template caching reduces rendering overhead

## Future Enhancements

Potential additions to consider:

- Microsoft Teams integration
- Discord webhook support
- SMS alerts via Twilio
- Custom webhook endpoints
- Alert aggregation and batching
- Alert acknowledgment tracking
- Alert escalation policies

## Support

For issues or questions:

1. Check the logs for error messages
2. Verify configuration settings
3. Test with `sendTestAlert()` method
4. Review the health check status
5. Contact the platform team

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
