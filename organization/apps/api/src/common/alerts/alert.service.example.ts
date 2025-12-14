/**
 * AlertService Usage Examples
 *
 * This file contains practical examples of how to use the AlertService
 * in various scenarios throughout the Broxiva application.
 *
 * NOTE: This is an example file for reference only. Do not import in production code.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AlertService, AlertLevel } from './alert.service';

@Injectable()
export class AlertServiceExamples {
  private readonly logger = new Logger(AlertServiceExamples.name);

  constructor(private readonly alertService: AlertService) {}

  /**
   * Example 1: Critical Email Failure Alert
   * Used in EmailProcessor when critical emails fail to send
   */
  async exampleCriticalEmailFailure() {
    await this.alertService.sendAlert({
      level: AlertLevel.CRITICAL,
      title: 'Critical Email Delivery Failure',
      message: 'Failed to deliver password reset email',
      details: {
        recipient: 'user@example.com',
        emailType: 'PASSWORD_RESET',
        error: 'SMTP connection timeout',
        attemptsMade: 3,
        maxAttempts: 3,
      },
      source: 'EmailProcessor',
    });
  }

  /**
   * Example 2: Payment Processing Failure
   * Used when payment transactions fail
   */
  async examplePaymentFailure(orderId: string, amount: number, error: Error) {
    await this.alertService.sendAlert({
      level: AlertLevel.CRITICAL,
      title: 'Payment Processing Failed',
      message: `Failed to process payment of $${amount} for order ${orderId}`,
      details: {
        orderId,
        amount,
        currency: 'USD',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      source: 'PaymentService',
    });
  }

  /**
   * Example 3: Database Connection Warning
   * Used when database connections are running low
   */
  async exampleDatabaseWarning() {
    await this.alertService.sendAlert({
      level: AlertLevel.WARNING,
      title: 'Database Connection Pool Warning',
      message: 'Database connection pool usage exceeded 80%',
      details: {
        currentConnections: 85,
        maxConnections: 100,
        utilizationPercentage: 85,
        activeQueries: 42,
      },
      source: 'DatabaseMonitor',
    });
  }

  /**
   * Example 4: Low Inventory Alert
   * Used when product inventory falls below threshold
   */
  async exampleLowInventory(productId: string, productName: string, stock: number) {
    await this.alertService.sendAlert({
      level: AlertLevel.WARNING,
      title: 'Low Inventory Alert',
      message: `Product "${productName}" is running low on stock`,
      details: {
        productId,
        productName,
        currentStock: stock,
        minimumThreshold: 10,
        recommendedAction: 'Reorder from supplier',
      },
      source: 'InventoryService',
    });
  }

  /**
   * Example 5: Successful Deployment Info
   * Used to notify successful deployments
   */
  async exampleSuccessfulDeployment(version: string) {
    await this.alertService.sendAlert({
      level: AlertLevel.INFO,
      title: 'Deployment Successful',
      message: `Broxiva API v${version} deployed successfully`,
      details: {
        version,
        environment: process.env.NODE_ENV,
        deployedAt: new Date().toISOString(),
        deployedBy: 'CI/CD Pipeline',
      },
      source: 'DeploymentService',
    });
  }

  /**
   * Example 6: Security Alert - Multiple Failed Login Attempts
   * Used when detecting potential security threats
   */
  async exampleSecurityAlert(userId: string, ipAddress: string, attempts: number) {
    await this.alertService.sendAlert({
      level: AlertLevel.CRITICAL,
      title: 'Security Alert: Multiple Failed Login Attempts',
      message: `User account ${userId} has ${attempts} failed login attempts`,
      details: {
        userId,
        ipAddress,
        attempts,
        lastAttempt: new Date().toISOString(),
        action: 'Account temporarily locked',
        recommendedAction: 'Review and verify user identity',
      },
      source: 'SecurityMonitor',
    });
  }

  /**
   * Example 7: API Rate Limit Warning
   * Used when API rate limits are being approached
   */
  async exampleRateLimitWarning(apiKey: string, usage: number, limit: number) {
    await this.alertService.sendAlert({
      level: AlertLevel.WARNING,
      title: 'API Rate Limit Warning',
      message: `API key ${apiKey} has used ${usage} of ${limit} requests`,
      details: {
        apiKey,
        currentUsage: usage,
        limit,
        utilizationPercentage: Math.round((usage / limit) * 100),
        resetTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      },
      source: 'APIGateway',
    });
  }

  /**
   * Example 8: Scheduled Maintenance Complete
   * Used to notify completion of maintenance tasks
   */
  async exampleMaintenanceComplete(taskName: string, duration: number) {
    await this.alertService.sendAlert({
      level: AlertLevel.INFO,
      title: 'Scheduled Maintenance Complete',
      message: `${taskName} completed successfully`,
      details: {
        taskName,
        duration: `${duration} minutes`,
        completedAt: new Date().toISOString(),
        status: 'Success',
      },
      source: 'MaintenanceService',
    });
  }

  /**
   * Example 9: File Upload Failure
   * Used when file uploads to S3/Azure fail
   */
  async exampleFileUploadFailure(fileName: string, error: Error) {
    await this.alertService.sendAlert({
      level: AlertLevel.WARNING,
      title: 'File Upload Failed',
      message: `Failed to upload ${fileName} to storage`,
      details: {
        fileName,
        error: error.message,
        storageProvider: process.env.STORAGE_PROVIDER || 'S3',
        attemptedAt: new Date().toISOString(),
      },
      source: 'StorageService',
    });
  }

  /**
   * Example 10: External API Timeout
   * Used when third-party API calls timeout
   */
  async exampleExternalAPITimeout(apiName: string, endpoint: string) {
    await this.alertService.sendAlert({
      level: AlertLevel.WARNING,
      title: 'External API Timeout',
      message: `Request to ${apiName} API timed out`,
      details: {
        apiName,
        endpoint,
        timeout: '30 seconds',
        occurredAt: new Date().toISOString(),
        impact: 'Feature temporarily unavailable',
      },
      source: 'ExternalAPIService',
    });
  }

  /**
   * Example 11: Health Check with Error Handling
   * Demonstrates proper error handling when sending alerts
   */
  async exampleHealthCheckWithErrorHandling() {
    try {
      const health = await this.alertService.healthCheck();

      if (!health.healthy) {
        this.logger.warn('Alert service is not healthy', health);
        // Handle unhealthy state - maybe use fallback logging
      } else {
        this.logger.log('Alert service is healthy', health.channels);
      }
    } catch (error) {
      this.logger.error('Failed to check alert service health', error);
    }
  }

  /**
   * Example 12: Test Alert (Configuration Verification)
   * Used to test alert configuration during setup
   */
  async exampleTestAlert() {
    try {
      await this.alertService.sendTestAlert();
      this.logger.log('Test alert sent successfully');
    } catch (error) {
      this.logger.error('Failed to send test alert', error);
    }
  }

  /**
   * Example 13: Graceful Error Handling
   * Demonstrates how to handle alert failures gracefully
   */
  async exampleGracefulErrorHandling() {
    try {
      // Your critical business logic here
      throw new Error('Something went wrong');
    } catch (error) {
      // Try to send alert, but don't let alert failure crash the application
      try {
        await this.alertService.sendAlert({
          level: AlertLevel.CRITICAL,
          title: 'Critical Error',
          message: error.message,
          details: {
            error: error.message,
            stack: error.stack,
          },
          source: 'ExampleService',
        });
      } catch (alertError) {
        // Alert service failed - log but continue
        this.logger.error('Failed to send alert, continuing anyway', alertError);
      }

      // Your error recovery logic here
      this.logger.error('Error occurred but handled gracefully', error);
    }
  }

  /**
   * Example 14: Conditional Alerting Based on Environment
   * Only send certain alerts in production
   */
  async exampleConditionalAlerting() {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      await this.alertService.sendAlert({
        level: AlertLevel.WARNING,
        title: 'Production Warning',
        message: 'This alert is only sent in production',
        details: {
          environment: process.env.NODE_ENV,
        },
        source: 'ExampleService',
      });
    } else {
      // In development, just log
      this.logger.warn('Would send alert in production');
    }
  }

  /**
   * Example 15: Aggregated Alerts
   * Collect multiple issues and send a single aggregated alert
   */
  async exampleAggregatedAlerts(failures: Array<{ id: string; error: string }>) {
    if (failures.length > 0) {
      await this.alertService.sendAlert({
        level: AlertLevel.WARNING,
        title: 'Multiple Operation Failures',
        message: `${failures.length} operations failed in the last hour`,
        details: {
          totalFailures: failures.length,
          failures: failures.slice(0, 10), // Limit to first 10
          timeWindow: '1 hour',
          aggregatedAt: new Date().toISOString(),
        },
        source: 'BatchProcessor',
      });
    }
  }
}

/**
 * INTEGRATION NOTES:
 *
 * 1. Always inject AlertService via constructor:
 *    constructor(private readonly alertService: AlertService) {}
 *
 * 2. Wrap alert calls in try-catch to prevent failures from crashing your app:
 *    try { await this.alertService.sendAlert(...); } catch (e) { logger.error(e); }
 *
 * 3. Use appropriate alert levels:
 *    - CRITICAL: Payment failures, security breaches, data loss
 *    - WARNING: Performance issues, approaching limits, non-critical errors
 *    - INFO: Successful operations, scheduled tasks, state changes
 *
 * 4. Include relevant context in details object
 *
 * 5. Set meaningful source names for easy identification
 *
 * 6. Test your alerts during development with sendTestAlert()
 *
 * 7. Monitor alert frequency to avoid alert fatigue
 *
 * 8. Configure rate limiting appropriately for your use case
 */
