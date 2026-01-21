import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WishlistService } from './wishlist.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

/**
 * Service to handle wishlist-related notifications
 * Checks for price drops and stock availability
 */
@Injectable()
export class WishlistNotificationService {
  private readonly logger = new Logger(WishlistNotificationService.name);

  constructor(
    private readonly wishlistService: WishlistService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check for price drops on wishlisted items
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkPriceDrops() {
    this.logger.log('Checking for price drops on wishlisted items...');

    try {
      const items = await this.wishlistService.getItemsForPriceDropNotification();

      for (const item of items) {
        const currentPrice = item.variant?.price || item.product.price;
        const priceAtAddition = item.priceAtAddition;

        // Check if price has dropped
        const hasPriceDropped = currentPrice < priceAtAddition;

        // Check if price is below target price (if set)
        const isBelowTargetPrice = item.targetPrice
          ? currentPrice <= item.targetPrice
          : false;

        if (hasPriceDropped || isBelowTargetPrice) {
          const priceDiff = priceAtAddition - currentPrice;
          const percentageOff = Math.round((priceDiff / priceAtAddition) * 100);

          await this.notificationsService.createNotification(
            item.wishlist.user.id,
            {
              title: 'Price Drop Alert!',
              body: `${item.product.name} is now ${percentageOff}% off! Was $${priceAtAddition.toFixed(2)}, now $${currentPrice.toFixed(2)}`,
              category: NotificationCategory.PRICE_DROP,
              priority: isBelowTargetPrice
                ? NotificationPriority.HIGH
                : NotificationPriority.NORMAL,
              actionUrl: `/products/${item.product.slug || item.product.id}`,
              data: {
                productId: item.product.id,
                oldPrice: priceAtAddition,
                newPrice: currentPrice,
                percentageOff,
              },
            },
          );

          this.logger.log(
            `Price drop notification sent to user ${item.wishlist.user.id} for product ${item.product.name}`,
          );
        }
      }

      this.logger.log(`Price drop check completed. Checked ${items.length} items.`);
    } catch (error) {
      this.logger.error('Error checking price drops:', error);
    }
  }

  /**
   * Check for back-in-stock items
   * Runs every 2 hours
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async checkBackInStock() {
    this.logger.log('Checking for back-in-stock wishlisted items...');

    try {
      const items = await this.wishlistService.getItemsForStockNotification();

      for (const item of items) {
        const currentStock = item.variant?.stock || item.product.stock;

        // Check if item is now in stock
        if (currentStock > 0) {
          await this.notificationsService.createNotification(
            item.wishlist.user.id,
            {
              title: 'Back in Stock!',
              body: `${item.product.name} is now available! Hurry, limited stock available.`,
              category: NotificationCategory.BACK_IN_STOCK,
              priority: NotificationPriority.HIGH,
              actionUrl: `/products/${item.product.slug || item.product.id}`,
              data: {
                productId: item.product.id,
                stock: currentStock,
              },
            },
          );

          this.logger.log(
            `Back-in-stock notification sent to user ${item.wishlist.user.id} for product ${item.product.name}`,
          );

          // Optionally disable notification after sending once
          // This prevents spam notifications
          await this.wishlistService.updateWishlistItem(
            item.id,
            item.wishlist.user.id,
            {
              notifyWhenInStock: false,
            },
          );
        }
      }

      this.logger.log(`Back-in-stock check completed. Checked ${items.length} items.`);
    } catch (error) {
      this.logger.error('Error checking back-in-stock items:', error);
    }
  }

  /**
   * Manually trigger price drop check for a specific user
   */
  async checkUserPriceDrops(userId: string) {
    this.logger.log(`Manually checking price drops for user ${userId}`);

    const items = await this.wishlistService.getItemsForPriceDropNotification();
    const userItems = items.filter((item) => item.wishlist.user.id === userId);

    let notificationsSent = 0;

    for (const item of userItems) {
      const currentPrice = item.variant?.price || item.product.price;
      const priceAtAddition = item.priceAtAddition;

      const hasPriceDropped = currentPrice < priceAtAddition;
      const isBelowTargetPrice = item.targetPrice
        ? currentPrice <= item.targetPrice
        : false;

      if (hasPriceDropped || isBelowTargetPrice) {
        const priceDiff = priceAtAddition - currentPrice;
        const percentageOff = Math.round((priceDiff / priceAtAddition) * 100);

        await this.notificationsService.createNotification(userId, {
          title: 'Price Drop Alert!',
          body: `${item.product.name} is now ${percentageOff}% off!`,
          category: NotificationCategory.PRICE_DROP,
          priority: isBelowTargetPrice
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
          actionUrl: `/products/${item.product.slug || item.product.id}`,
          data: {
            productId: item.product.id,
            oldPrice: priceAtAddition,
            newPrice: currentPrice,
            percentageOff,
          },
        });

        notificationsSent++;
      }
    }

    return {
      message: `Checked ${userItems.length} items, sent ${notificationsSent} notifications`,
      notificationsSent,
    };
  }
}
