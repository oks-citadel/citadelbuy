import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertService } from './alert.service';

/**
 * AlertModule
 *
 * Global module that provides alert notification services across the application.
 * This module is marked as @Global() so that AlertService is available throughout
 * the application without needing to import AlertModule in every module.
 *
 * Features:
 * - Slack webhook integration
 * - PagerDuty integration (optional)
 * - Email alerts as fallback
 * - Configurable alert levels
 * - Rate limiting to prevent alert storms
 *
 * Configuration:
 * Set the following environment variables:
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 * - PAGERDUTY_API_KEY: PagerDuty routing key (optional)
 * - ALERT_EMAIL_RECIPIENTS: Comma-separated list of email addresses
 * - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD: SMTP settings
 * - EMAIL_FROM: Sender email address
 *
 * Usage:
 * 1. Import AlertModule in AppModule (done automatically via @Global())
 * 2. Inject AlertService in any service or controller
 * 3. Call alertService.sendAlert() to send alerts
 *
 * Example:
 * ```typescript
 * constructor(private readonly alertService: AlertService) {}
 *
 * async someMethod() {
 *   try {
 *     // ... some operation
 *   } catch (error) {
 *     await this.alertService.sendAlert({
 *       level: AlertLevel.CRITICAL,
 *       title: 'Critical Error',
 *       message: 'Something went wrong',
 *       details: { error: error.message },
 *     });
 *   }
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
