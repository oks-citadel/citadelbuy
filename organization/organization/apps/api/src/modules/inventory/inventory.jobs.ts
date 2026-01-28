import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class InventoryJobs {
  private readonly logger = new Logger(InventoryJobs.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Check low stock alerts every hour
   * Runs at the top of every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStockAlerts() {
    this.logger.log('🔔 Running low stock alerts check...');

    try {
      const alerts = await this.inventoryService.checkLowStockAlerts();

      if (alerts.length > 0) {
        this.logger.warn(`⚠️  Generated ${alerts.length} new stock alerts`);

        // Log alert details
        for (const alert of alerts) {
          this.logger.warn(
            `Alert ${alert.alertNumber}: ${alert.alertType} - Product ${alert.productId} at Warehouse ${alert.warehouseId}`,
          );
        }
      } else {
        this.logger.log('✅ No new low stock alerts');
      }
    } catch (error) {
      this.logger.error('❌ Error checking low stock alerts:', error);
    }
  }

  /**
   * Check reorder points daily at 2 AM
   * Automatically creates reorder requests for items below reorder point
   */
  @Cron('0 2 * * *')
  async checkReorderPoints() {
    this.logger.log('📦 Running reorder points check...');

    try {
      const reorders = await this.inventoryService.checkReorderPoints();

      if (reorders.length > 0) {
        this.logger.log(`✅ Created ${reorders.length} new reorder requests`);

        // Log reorder details
        for (const reorder of reorders) {
          this.logger.log(
            `Reorder ${reorder.requestNumber}: Product ${reorder.productId}, Quantity: ${reorder.quantityRequested}`,
          );
        }
      } else {
        this.logger.log('✅ No reorder requests needed');
      }
    } catch (error) {
      this.logger.error('❌ Error checking reorder points:', error);
    }
  }

  /**
   * Generate weekly forecasts every Sunday at 3 AM
   * Creates forecasts for all active products with sales history
   */
  @Cron('0 3 * * 0')
  async generateWeeklyForecasts() {
    this.logger.log('📊 Running weekly forecast generation...');

    try {
      // Get all products with inventory tracking enabled
      const products = await this.prisma.product.findMany({
        where: {
          trackInventory: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Get all active warehouses
      const warehouses = await this.prisma.warehouse.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
      });

      let forecastsGenerated = 0;
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Generate forecasts for each product-warehouse combination
      for (const product of products) {
        // Generate warehouse-specific forecasts
        for (const warehouse of warehouses) {
          try {
            await this.inventoryService.generateForecast(
              product.id,
              warehouse.id,
              'WEEKLY',
              nextWeek,
            );
            forecastsGenerated++;
          } catch (_error) {
            this.logger.warn(
              `Failed to generate forecast for product ${product.id} at warehouse ${warehouse.id}`,
            );
          }
        }

        // Generate overall forecast (all warehouses combined)
        try {
          await this.inventoryService.generateForecast(
            product.id,
            null,
            'WEEKLY',
            nextWeek,
          );
          forecastsGenerated++;
        } catch (_error) {
          this.logger.warn(
            `Failed to generate overall forecast for product ${product.id}`,
          );
        }
      }

      this.logger.log(`✅ Generated ${forecastsGenerated} forecasts for ${products.length} products`);
    } catch (error) {
      this.logger.error('❌ Error generating weekly forecasts:', error);
    }
  }

  /**
   * Clean up old resolved alerts monthly (1st day at 4 AM)
   * Removes alerts older than 90 days
   */
  @Cron('0 4 1 * *')
  async cleanupOldAlerts() {
    this.logger.log('🧹 Running alert cleanup...');

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await this.prisma.stockAlert.deleteMany({
        where: {
          isResolved: true,
          resolvedDate: {
            lt: ninetyDaysAgo,
          },
        },
      });

      this.logger.log(`✅ Cleaned up ${result.count} old resolved alerts`);
    } catch (error) {
      this.logger.error('❌ Error cleaning up old alerts:', error);
    }
  }

  /**
   * Clean up expired forecasts daily at 1 AM
   * Removes forecasts that have passed their validUntil date
   */
  @Cron('0 1 * * *')
  async cleanupExpiredForecasts() {
    this.logger.log('🧹 Running forecast cleanup...');

    try {
      const result = await this.prisma.inventoryForecast.deleteMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`✅ Cleaned up ${result.count} expired forecasts`);
    } catch (error) {
      this.logger.error('❌ Error cleaning up expired forecasts:', error);
    }
  }

  /**
   * Generate monthly reports on 1st day at 5 AM
   * Logs inventory statistics and insights
   */
  @Cron('0 5 1 * *')
  async generateMonthlyReport() {
    this.logger.log('📈 Generating monthly inventory report...');

    try {
      // Get inventory statistics
      const totalProducts = await this.prisma.product.count({
        where: { trackInventory: true },
      });

      const lowStockCount = await this.prisma.inventoryItem.count({
        where: { status: 'LOW_STOCK' },
      });

      const outOfStockCount = await this.prisma.inventoryItem.count({
        where: { status: 'OUT_OF_STOCK' },
      });

      const activeBackorders = await this.prisma.backorder.count({
        where: { isActive: true },
      });

      const pendingReorders = await this.prisma.reorderRequest.count({
        where: { status: 'PENDING' },
      });

      const activeAlerts = await this.prisma.stockAlert.count({
        where: { isActive: true, isResolved: false },
      });

      // Get transfer statistics
      const pendingTransfers = await this.prisma.stockTransfer.count({
        where: { status: 'PENDING' },
      });

      const inTransitTransfers = await this.prisma.stockTransfer.count({
        where: { status: 'IN_TRANSIT' },
      });

      this.logger.log('📊 Monthly Inventory Report:');
      this.logger.log(`   Total Products: ${totalProducts}`);
      this.logger.log(`   Low Stock Items: ${lowStockCount}`);
      this.logger.log(`   Out of Stock Items: ${outOfStockCount}`);
      this.logger.log(`   Active Backorders: ${activeBackorders}`);
      this.logger.log(`   Pending Reorders: ${pendingReorders}`);
      this.logger.log(`   Active Alerts: ${activeAlerts}`);
      this.logger.log(`   Pending Transfers: ${pendingTransfers}`);
      this.logger.log(`   In-Transit Transfers: ${inTransitTransfers}`);
      this.logger.log('✅ Monthly report generated');
    } catch (error) {
      this.logger.error('❌ Error generating monthly report:', error);
    }
  }
}
