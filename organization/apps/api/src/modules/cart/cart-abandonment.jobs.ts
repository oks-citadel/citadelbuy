import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CartAbandonmentService } from './cart-abandonment.service';

@Injectable()
export class CartAbandonmentJobs {
  private readonly logger = new Logger(CartAbandonmentJobs.name);

  constructor(private readonly abandonmentService: CartAbandonmentService) {}

  /**
   * Detect abandoned carts every 15 minutes
   * Scans for carts that have been inactive for more than 1 hour
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async detectAbandonedCarts() {
    this.logger.log('Scanning for abandoned carts...');

    try {
      const count = await this.abandonmentService.detectAbandonedCarts();

      if (count > 0) {
        this.logger.log(`Detected and processed ${count} abandoned carts`);
      } else {
        this.logger.debug('No new abandoned carts found');
      }
    } catch (error) {
      this.logger.error('Error detecting abandoned carts:', error);
    }
  }

  /**
   * Process abandonment emails every 5 minutes
   * Sends scheduled recovery emails for abandoned carts
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async processAbandonmentEmails() {
    this.logger.log('Processing abandonment email queue...');

    try {
      const result = await this.abandonmentService.processAbandonmentEmails();

      if (result.sent > 0 || result.failed > 0) {
        this.logger.log(
          `Processed abandonment emails - Sent: ${result.sent}, Failed: ${result.failed}`,
        );
      } else {
        this.logger.debug('No abandonment emails to process');
      }
    } catch (error) {
      this.logger.error('Error processing abandonment emails:', error);
    }
  }

  /**
   * Clean up old abandonment records monthly
   * Removes records older than 90 days
   */
  @Cron('0 3 1 * *') // 3 AM on the 1st of each month
  async cleanupOldAbandonments() {
    this.logger.log('Cleaning up old abandonment records...');

    try {
      const count = await this.abandonmentService.cleanupOldAbandonments(90);
      this.logger.log(`Cleaned up ${count} old abandonment records`);
    } catch (error) {
      this.logger.error('Error cleaning up old abandonments:', error);
    }
  }

  /**
   * Generate weekly abandonment report
   * Logs cart recovery statistics for monitoring
   */
  @Cron('0 9 * * 1') // 9 AM every Monday
  async generateWeeklyReport() {
    this.logger.log('Generating weekly cart abandonment report...');

    try {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const analytics = await this.abandonmentService.getAbandonmentAnalytics(
        lastWeek,
        new Date(),
      );

      this.logger.log('=== Weekly Cart Abandonment Report ===');
      this.logger.log(`Total Abandoned Carts: ${analytics.totalAbandoned}`);
      this.logger.log(`Recovered Carts: ${analytics.totalRecovered}`);
      this.logger.log(`Recovery Rate: ${analytics.recoveryRate.toFixed(2)}%`);
      this.logger.log(`Recovered Value: $${analytics.recoveredValue.toFixed(2)}`);
      this.logger.log('');
      this.logger.log('Email Performance:');

      for (const stat of analytics.emailStats) {
        this.logger.log(`  ${stat.type}:`);
        this.logger.log(`    Sent: ${stat.sent}, Opened: ${stat.opened} (${stat.openRate.toFixed(1)}%)`);
        this.logger.log(`    Clicked: ${stat.clicked} (${stat.clickRate.toFixed(1)}%), Converted: ${stat.converted} (${stat.conversionRate.toFixed(1)}%)`);
      }

      this.logger.log('=====================================');
    } catch (error) {
      this.logger.error('Error generating weekly report:', error);
    }
  }
}
