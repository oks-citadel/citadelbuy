import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookService } from './webhook.service';
import { WebhookEventDto } from './dto';

/**
 * Webhook Events Service
 *
 * Listens to application events and automatically triggers webhooks.
 * This service bridges the application's event system with the webhook delivery system.
 *
 * Supported Events:
 * - order.created
 * - order.updated
 * - order.cancelled
 * - order.fulfilled
 * - payment.succeeded
 * - payment.failed
 * - product.created
 * - product.updated
 * - product.deleted
 * - user.created
 * - user.updated
 * - And more...
 *
 * Usage:
 * Just emit an event anywhere in the application:
 *   this.eventEmitter.emit('order.created', { order: orderData });
 *
 * And this service will automatically trigger webhooks for subscribed endpoints.
 */
@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Generate a unique event ID
   */
  private generateEventId(eventType: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `evt_${eventType.replace(/\./g, '_')}_${timestamp}_${random}`;
  }

  /**
   * Trigger webhook for any event
   */
  private async triggerWebhookEvent(
    eventType: string,
    payload: any,
    source?: string,
    triggeredBy?: string,
  ) {
    try {
      const eventDto: WebhookEventDto = {
        eventType,
        eventId: this.generateEventId(eventType),
        payload,
        source: source || 'system',
        triggeredBy,
      };

      await this.webhookService.triggerEvent(eventDto);
    } catch (error) {
      this.logger.error(
        `Failed to trigger webhook for ${eventType}:`,
        error.stack,
      );
    }
  }

  // ============================================
  // ORDER EVENTS
  // ============================================

  @OnEvent('order.created')
  async handleOrderCreated(payload: any) {
    this.logger.debug('Order created event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.created',
      payload,
      'order_service',
      payload.userId,
    );
  }

  @OnEvent('order.updated')
  async handleOrderUpdated(payload: any) {
    this.logger.debug('Order updated event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.updated',
      payload,
      'order_service',
      payload.userId,
    );
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(payload: any) {
    this.logger.debug('Order cancelled event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.cancelled',
      payload,
      'order_service',
      payload.userId,
    );
  }

  @OnEvent('order.fulfilled')
  async handleOrderFulfilled(payload: any) {
    this.logger.debug('Order fulfilled event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.fulfilled',
      payload,
      'order_service',
      payload.userId,
    );
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(payload: any) {
    this.logger.debug('Order shipped event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.shipped',
      payload,
      'shipping_service',
      payload.userId,
    );
  }

  @OnEvent('order.delivered')
  async handleOrderDelivered(payload: any) {
    this.logger.debug('Order delivered event received', payload.order?.id);
    await this.triggerWebhookEvent(
      'order.delivered',
      payload,
      'shipping_service',
      payload.userId,
    );
  }

  // ============================================
  // PAYMENT EVENTS
  // ============================================

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(payload: any) {
    this.logger.debug('Payment succeeded event received', payload.payment?.id);
    await this.triggerWebhookEvent(
      'payment.succeeded',
      payload,
      'payment_service',
      payload.userId,
    );
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: any) {
    this.logger.debug('Payment failed event received', payload.payment?.id);
    await this.triggerWebhookEvent(
      'payment.failed',
      payload,
      'payment_service',
      payload.userId,
    );
  }

  @OnEvent('payment.refunded')
  async handlePaymentRefunded(payload: any) {
    this.logger.debug('Payment refunded event received', payload.payment?.id);
    await this.triggerWebhookEvent(
      'payment.refunded',
      payload,
      'payment_service',
      payload.userId,
    );
  }

  // ============================================
  // PRODUCT EVENTS
  // ============================================

  @OnEvent('product.created')
  async handleProductCreated(payload: any) {
    this.logger.debug('Product created event received', payload.product?.id);
    await this.triggerWebhookEvent(
      'product.created',
      payload,
      'product_service',
      payload.userId,
    );
  }

  @OnEvent('product.updated')
  async handleProductUpdated(payload: any) {
    this.logger.debug('Product updated event received', payload.product?.id);
    await this.triggerWebhookEvent(
      'product.updated',
      payload,
      'product_service',
      payload.userId,
    );
  }

  @OnEvent('product.deleted')
  async handleProductDeleted(payload: any) {
    this.logger.debug('Product deleted event received', payload.product?.id);
    await this.triggerWebhookEvent(
      'product.deleted',
      payload,
      'product_service',
      payload.userId,
    );
  }

  @OnEvent('product.out_of_stock')
  async handleProductOutOfStock(payload: any) {
    this.logger.debug('Product out of stock event received', payload.product?.id);
    await this.triggerWebhookEvent(
      'product.out_of_stock',
      payload,
      'inventory_service',
      payload.userId,
    );
  }

  @OnEvent('product.low_stock')
  async handleProductLowStock(payload: any) {
    this.logger.debug('Product low stock event received', payload.product?.id);
    await this.triggerWebhookEvent(
      'product.low_stock',
      payload,
      'inventory_service',
      payload.userId,
    );
  }

  // ============================================
  // USER EVENTS
  // ============================================

  @OnEvent('user.created')
  async handleUserCreated(payload: any) {
    this.logger.debug('User created event received', payload.user?.id);
    await this.triggerWebhookEvent(
      'user.created',
      payload,
      'user_service',
    );
  }

  @OnEvent('user.updated')
  async handleUserUpdated(payload: any) {
    this.logger.debug('User updated event received', payload.user?.id);
    await this.triggerWebhookEvent(
      'user.updated',
      payload,
      'user_service',
      payload.user?.id,
    );
  }

  @OnEvent('user.deleted')
  async handleUserDeleted(payload: any) {
    this.logger.debug('User deleted event received', payload.user?.id);
    await this.triggerWebhookEvent(
      'user.deleted',
      payload,
      'user_service',
    );
  }

  // ============================================
  // CART EVENTS
  // ============================================

  @OnEvent('cart.abandoned')
  async handleCartAbandoned(payload: any) {
    this.logger.debug('Cart abandoned event received', payload.cart?.id);
    await this.triggerWebhookEvent(
      'cart.abandoned',
      payload,
      'cart_service',
      payload.userId,
    );
  }

  @OnEvent('cart.recovered')
  async handleCartRecovered(payload: any) {
    this.logger.debug('Cart recovered event received', payload.cart?.id);
    await this.triggerWebhookEvent(
      'cart.recovered',
      payload,
      'cart_service',
      payload.userId,
    );
  }

  // ============================================
  // INVENTORY EVENTS
  // ============================================

  @OnEvent('inventory.updated')
  async handleInventoryUpdated(payload: any) {
    this.logger.debug('Inventory updated event received');
    await this.triggerWebhookEvent(
      'inventory.updated',
      payload,
      'inventory_service',
      payload.userId,
    );
  }

  @OnEvent('inventory.restocked')
  async handleInventoryRestocked(payload: any) {
    this.logger.debug('Inventory restocked event received');
    await this.triggerWebhookEvent(
      'inventory.restocked',
      payload,
      'inventory_service',
      payload.userId,
    );
  }

  // ============================================
  // SUBSCRIPTION EVENTS
  // ============================================

  @OnEvent('subscription.created')
  async handleSubscriptionCreated(payload: any) {
    this.logger.debug('Subscription created event received', payload.subscription?.id);
    await this.triggerWebhookEvent(
      'subscription.created',
      payload,
      'subscription_service',
      payload.userId,
    );
  }

  @OnEvent('subscription.updated')
  async handleSubscriptionUpdated(payload: any) {
    this.logger.debug('Subscription updated event received', payload.subscription?.id);
    await this.triggerWebhookEvent(
      'subscription.updated',
      payload,
      'subscription_service',
      payload.userId,
    );
  }

  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(payload: any) {
    this.logger.debug('Subscription cancelled event received', payload.subscription?.id);
    await this.triggerWebhookEvent(
      'subscription.cancelled',
      payload,
      'subscription_service',
      payload.userId,
    );
  }

  // ============================================
  // REVIEW EVENTS
  // ============================================

  @OnEvent('review.created')
  async handleReviewCreated(payload: any) {
    this.logger.debug('Review created event received', payload.review?.id);
    await this.triggerWebhookEvent(
      'review.created',
      payload,
      'review_service',
      payload.userId,
    );
  }

  @OnEvent('review.updated')
  async handleReviewUpdated(payload: any) {
    this.logger.debug('Review updated event received', payload.review?.id);
    await this.triggerWebhookEvent(
      'review.updated',
      payload,
      'review_service',
      payload.userId,
    );
  }

  // ============================================
  // RETURN EVENTS
  // ============================================

  @OnEvent('return.requested')
  async handleReturnRequested(payload: any) {
    this.logger.debug('Return requested event received', payload.return?.id);
    await this.triggerWebhookEvent(
      'return.requested',
      payload,
      'return_service',
      payload.userId,
    );
  }

  @OnEvent('return.approved')
  async handleReturnApproved(payload: any) {
    this.logger.debug('Return approved event received', payload.return?.id);
    await this.triggerWebhookEvent(
      'return.approved',
      payload,
      'return_service',
      payload.userId,
    );
  }

  @OnEvent('return.rejected')
  async handleReturnRejected(payload: any) {
    this.logger.debug('Return rejected event received', payload.return?.id);
    await this.triggerWebhookEvent(
      'return.rejected',
      payload,
      'return_service',
      payload.userId,
    );
  }
}
