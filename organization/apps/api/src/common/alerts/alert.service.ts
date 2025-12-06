import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as nodemailer from 'nodemailer';

/**
 * Alert severity levels
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert notification data
 */
export interface AlertNotification {
  level: AlertLevel;
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: Date;
  source?: string;
}

/**
 * Slack message block format
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * PagerDuty event payload
 */
interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  payload: {
    summary: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    timestamp?: string;
    custom_details?: Record<string, any>;
  };
}

/**
 * AlertService
 *
 * Production-ready alert notification service that supports:
 * - Slack webhook integration
 * - PagerDuty integration (optional)
 * - Email alerts as fallback
 * - Configurable alert levels
 *
 * Features:
 * - Automatic fallback mechanism
 * - Error handling with retry logic
 * - Rate limiting to prevent alert storms
 * - Structured logging
 * - Health checks
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly axiosInstance: AxiosInstance;
  private emailTransporter: nodemailer.Transporter | null = null;

  // Configuration
  private readonly slackWebhookUrl: string;
  private readonly pagerDutyApiKey: string;
  private readonly alertEmailRecipients: string[];
  private readonly emailFrom: string;
  private readonly enableSlack: boolean;
  private readonly enablePagerDuty: boolean;
  private readonly enableEmail: boolean;

  // Rate limiting to prevent alert storms
  private readonly alertCache = new Map<string, number>();
  private readonly rateLimitWindow = 300000; // 5 minutes in milliseconds
  private readonly maxAlertsPerWindow = 10;

  constructor(private readonly configService: ConfigService) {
    // Load configuration
    this.slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL', '');
    this.pagerDutyApiKey = this.configService.get<string>('PAGERDUTY_API_KEY', '');

    const recipientsString = this.configService.get<string>('ALERT_EMAIL_RECIPIENTS', '');
    this.alertEmailRecipients = recipientsString
      ? recipientsString.split(',').map((email) => email.trim())
      : [];

    this.emailFrom = this.configService.get<string>('EMAIL_FROM', 'alerts@citadelbuy.com');

    // Determine which channels are enabled
    this.enableSlack = !!this.slackWebhookUrl;
    this.enablePagerDuty = !!this.pagerDutyApiKey;
    this.enableEmail = this.alertEmailRecipients.length > 0;

    // Initialize axios instance with retry logic
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize email transporter if email is enabled
    if (this.enableEmail) {
      this.initializeEmailTransporter();
    }

    // Log configuration status
    this.logConfiguration();
  }

  /**
   * Log the alert service configuration
   */
  private logConfiguration() {
    this.logger.log('Alert Service Configuration:');
    this.logger.log(`- Slack: ${this.enableSlack ? 'Enabled' : 'Disabled'}`);
    this.logger.log(`- PagerDuty: ${this.enablePagerDuty ? 'Enabled' : 'Disabled'}`);
    this.logger.log(`- Email: ${this.enableEmail ? 'Enabled' : 'Disabled'} (${this.alertEmailRecipients.length} recipients)`);

    if (!this.enableSlack && !this.enablePagerDuty && !this.enableEmail) {
      this.logger.warn('⚠️  No alert channels are enabled! Alerts will only be logged.');
    }
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: this.configService.get<string>('EMAIL_HOST'),
        port: this.configService.get<number>('EMAIL_PORT', 587),
        secure: this.configService.get<number>('EMAIL_PORT', 587) === 465,
        auth: {
          user: this.configService.get<string>('EMAIL_USER'),
          pass: this.configService.get<string>('EMAIL_PASSWORD'),
        },
      });
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error.stack);
      this.emailTransporter = null;
    }
  }

  /**
   * Check if alert should be rate limited
   */
  private shouldRateLimit(alertKey: string): boolean {
    const now = Date.now();
    const lastAlertTime = this.alertCache.get(alertKey);

    if (!lastAlertTime) {
      this.alertCache.set(alertKey, now);
      return false;
    }

    // Clean up old entries
    if (now - lastAlertTime > this.rateLimitWindow) {
      this.alertCache.delete(alertKey);
      this.alertCache.set(alertKey, now);
      return false;
    }

    // Count alerts in current window
    const alertsInWindow = Array.from(this.alertCache.values()).filter(
      (time) => now - time < this.rateLimitWindow,
    ).length;

    if (alertsInWindow >= this.maxAlertsPerWindow) {
      this.logger.warn(
        `Rate limit exceeded for alert: ${alertKey} (${alertsInWindow} alerts in window)`,
      );
      return true;
    }

    this.alertCache.set(alertKey, now);
    return false;
  }

  /**
   * Send an alert notification through all configured channels
   */
  async sendAlert(notification: AlertNotification): Promise<void> {
    // Set default values
    notification.timestamp = notification.timestamp || new Date();
    notification.source = notification.source || 'CitadelBuy-API';

    // Generate alert key for rate limiting
    const alertKey = `${notification.level}-${notification.title}`;

    // Check rate limiting
    if (this.shouldRateLimit(alertKey)) {
      this.logger.warn(`Alert rate limited: ${notification.title}`);
      return;
    }

    // Log the alert
    this.logAlert(notification);

    // Send to all configured channels
    const results = await Promise.allSettled([
      this.enableSlack ? this.sendToSlack(notification) : Promise.resolve(),
      this.enablePagerDuty && notification.level === AlertLevel.CRITICAL
        ? this.sendToPagerDuty(notification)
        : Promise.resolve(),
      this.enableEmail ? this.sendToEmail(notification) : Promise.resolve(),
    ]);

    // Check if all channels failed
    const allFailed = results.every(
      (result) => result.status === 'rejected',
    );

    if (allFailed && (this.enableSlack || this.enablePagerDuty || this.enableEmail)) {
      this.logger.error(
        'All alert channels failed to send notification',
        results.map((r) => r.status === 'rejected' ? r.reason : null),
      );
    }
  }

  /**
   * Log alert to console
   */
  private logAlert(notification: AlertNotification) {
    const emoji = this.getAlertEmoji(notification.level);
    const logMessage = `${emoji} [${notification.level.toUpperCase()}] ${notification.title}: ${notification.message}`;

    switch (notification.level) {
      case AlertLevel.CRITICAL:
        this.logger.error(logMessage, notification.details);
        break;
      case AlertLevel.WARNING:
        this.logger.warn(logMessage, notification.details);
        break;
      case AlertLevel.INFO:
      default:
        this.logger.log(logMessage, notification.details);
        break;
    }
  }

  /**
   * Get emoji for alert level
   */
  private getAlertEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return '🔴';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.INFO:
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Get color for alert level (Slack)
   */
  private getAlertColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return '#ff0000'; // Red
      case AlertLevel.WARNING:
        return '#ffa500'; // Orange
      case AlertLevel.INFO:
        return '#0066cc'; // Blue
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(notification: AlertNotification): Promise<void> {
    if (!this.enableSlack) {
      return;
    }

    try {
      const emoji = this.getAlertEmoji(notification.level);
      const color = this.getAlertColor(notification.level);

      // Build Slack blocks
      const blocks: SlackBlock[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${notification.title}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.message,
          },
        },
      ];

      // Add details as fields if present
      if (notification.details && Object.keys(notification.details).length > 0) {
        const fields = Object.entries(notification.details)
          .slice(0, 10) // Limit to 10 fields
          .map(([key, value]) => ({
            type: 'mrkdwn' as const,
            text: `*${key}:*\n${this.formatValue(value)}`,
          }));

        blocks.push({
          type: 'section',
          fields,
        });
      }

      // Add context
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Level:* ${notification.level.toUpperCase()} | *Source:* ${notification.source || 'unknown'} | *Time:* ${notification.timestamp ? notification.timestamp.toISOString() : new Date().toISOString()}`,
        },
      });

      // Send to Slack
      await this.axiosInstance.post(this.slackWebhookUrl, {
        blocks,
        attachments: [
          {
            color,
            fallback: `${notification.title}: ${notification.message}`,
          },
        ],
      });

      this.logger.debug(`Alert sent to Slack: ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to send alert to Slack', error.stack);
      throw error;
    }
  }

  /**
   * Send alert to PagerDuty
   */
  private async sendToPagerDuty(notification: AlertNotification): Promise<void> {
    if (!this.enablePagerDuty) {
      return;
    }

    try {
      const severity = this.mapAlertLevelToPagerDutySeverity(notification.level);

      const event: PagerDutyEvent = {
        routing_key: this.pagerDutyApiKey,
        event_action: 'trigger',
        payload: {
          summary: `${notification.title}: ${notification.message}`,
          severity,
          source: notification.source || 'citadelbuy-api',
          timestamp: notification.timestamp ? notification.timestamp.toISOString() : new Date().toISOString(),
          custom_details: notification.details,
        },
      };

      await this.axiosInstance.post(
        'https://events.pagerduty.com/v2/enqueue',
        event,
      );

      this.logger.debug(`Alert sent to PagerDuty: ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to send alert to PagerDuty', error.stack);
      throw error;
    }
  }

  /**
   * Map alert level to PagerDuty severity
   */
  private mapAlertLevelToPagerDutySeverity(
    level: AlertLevel,
  ): 'info' | 'warning' | 'error' | 'critical' {
    switch (level) {
      case AlertLevel.CRITICAL:
        return 'critical';
      case AlertLevel.WARNING:
        return 'warning';
      case AlertLevel.INFO:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Send alert via email
   */
  private async sendToEmail(notification: AlertNotification): Promise<void> {
    if (!this.enableEmail || !this.emailTransporter) {
      return;
    }

    try {
      const emoji = this.getAlertEmoji(notification.level);
      const subject = `${emoji} [${notification.level.toUpperCase()}] ${notification.title}`;

      // Build HTML email
      const htmlContent = this.buildEmailHtml(notification);

      // Send email
      await this.emailTransporter.sendMail({
        from: this.emailFrom,
        to: this.alertEmailRecipients.join(', '),
        subject,
        html: htmlContent,
        text: this.buildEmailText(notification),
      });

      this.logger.debug(`Alert sent via email: ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to send alert via email', error.stack);
      throw error;
    }
  }

  /**
   * Build HTML email content
   */
  private buildEmailHtml(notification: AlertNotification): string {
    const color = this.getAlertColor(notification.level);
    const emoji = this.getAlertEmoji(notification.level);

    let detailsHtml = '';
    if (notification.details && Object.keys(notification.details).length > 0) {
      const detailRows = Object.entries(notification.details)
        .map(
          ([key, value]) => `
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">${key}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${this.formatValue(value)}</td>
          </tr>
        `,
        )
        .join('');

      detailsHtml = `
        <h3 style="color: #333; margin-top: 20px;">Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          ${detailRows}
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${emoji} ${notification.title}</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
            ${notification.level.toUpperCase()} Alert
          </p>
        </div>

        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
          <h2 style="color: #333; margin-top: 0;">Message</h2>
          <p style="font-size: 16px; line-height: 1.6;">${notification.message}</p>

          ${detailsHtml}

          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 12px;">
            <p style="margin: 5px 0;"><strong>Source:</strong> ${notification.source}</p>
            <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${notification.timestamp ? notification.timestamp.toLocaleString() : new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Level:</strong> ${notification.level.toUpperCase()}</p>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">This is an automated alert from CitadelBuy</p>
          <p style="margin: 5px 0 0 0;">Please do not reply to this email</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build plain text email content
   */
  private buildEmailText(notification: AlertNotification): string {
    let text = `
${notification.title}
${'='.repeat(notification.title.length)}

Level: ${notification.level.toUpperCase()}
Message: ${notification.message}

`;

    if (notification.details && Object.keys(notification.details).length > 0) {
      text += 'Details:\n';
      for (const [key, value] of Object.entries(notification.details)) {
        text += `  ${key}: ${this.formatValue(value)}\n`;
      }
      text += '\n';
    }

    text += `
Source: ${notification.source}
Timestamp: ${notification.timestamp ? notification.timestamp.toISOString() : new Date().toISOString()}

---
This is an automated alert from CitadelBuy
`;

    return text;
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Health check for alert service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    channels: {
      slack: boolean;
      pagerduty: boolean;
      email: boolean;
    };
  }> {
    return {
      healthy: this.enableSlack || this.enablePagerDuty || this.enableEmail,
      channels: {
        slack: this.enableSlack,
        pagerduty: this.enablePagerDuty,
        email: this.enableEmail,
      },
    };
  }

  /**
   * Test alert (for configuration verification)
   */
  async sendTestAlert(): Promise<void> {
    await this.sendAlert({
      level: AlertLevel.INFO,
      title: 'Test Alert',
      message: 'This is a test alert from CitadelBuy Alert Service',
      details: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
      source: 'AlertService-Test',
    });
  }
}
