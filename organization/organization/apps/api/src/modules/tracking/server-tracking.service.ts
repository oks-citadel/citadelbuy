/**
 * Server-Side Tracking Service
 * Unified interface for server-side event tracking across multiple platforms
 */

import { Injectable, Logger } from '@nestjs/common';
import { MetaConversionsService } from './meta-conversions.service';
import { TikTokEventsService } from './tiktok-events.service';

export interface ServerTrackingContext {
  // User Data
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;

  // Request Data
  ipAddress?: string;
  userAgent?: string;

  // Click IDs
  fbc?: string; // Facebook Click ID
  fbp?: string; // Facebook Browser ID
  ttclid?: string; // TikTok Click ID

  // Page Context
  pageUrl?: string;

  // Event Deduplication
  eventId?: string;
}

export interface RegistrationEventParams extends ServerTrackingContext {
  // Required
  userId: string;
}

export interface PurchaseEventParams extends ServerTrackingContext {
  // Required
  userId: string;
  orderId: string;
  value: number;

  // Optional
  currency?: string;
  items?: Array<{
    id: string;
    name?: string;
    quantity: number;
    price?: number;
  }>;
  numItems?: number;
}

export interface SubscriptionEventParams extends ServerTrackingContext {
  // Required
  userId: string;
  subscriptionId: string;
  value: number;

  // Optional
  currency?: string;
  predictedLtv?: number;
}

@Injectable()
export class ServerTrackingService {
  private readonly logger = new Logger(ServerTrackingService.name);

  constructor(
    private metaConversionsService: MetaConversionsService,
    private tiktokEventsService: TikTokEventsService,
  ) {
    this.logger.log('Server-Side Tracking Service initialized');
  }

  /**
   * Track user registration across all platforms
   * @param params - Registration event parameters
   */
  async trackRegistration(params: RegistrationEventParams): Promise<void> {
    this.logger.log(`Tracking registration for user: ${params.userId}`);

    // Track in parallel for better performance
    await Promise.allSettled([
      this.metaConversionsService.trackRegistration({
        userId: params.userId,
        email: params.email,
        phone: params.phone,
        firstName: params.firstName,
        lastName: params.lastName,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: params.fbp,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
      }),
      this.tiktokEventsService.trackRegistration({
        userId: params.userId,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
      }),
    ]);
  }

  /**
   * Track purchase/order completion across all platforms
   * @param params - Purchase event parameters
   */
  async trackPurchase(params: PurchaseEventParams): Promise<void> {
    this.logger.log(`Tracking purchase for order: ${params.orderId}`);

    // Prepare contents for tracking
    const metaContents = params.items?.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const tiktokContents = params.items?.map(item => ({
      content_id: item.id,
      content_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    const contentIds = params.items?.map(item => item.id);

    // Track in parallel
    await Promise.allSettled([
      this.metaConversionsService.trackPurchase({
        userId: params.userId,
        orderId: params.orderId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        firstName: params.firstName,
        lastName: params.lastName,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: params.fbp,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
        contents: metaContents,
        contentIds,
        numItems: params.numItems,
      }),
      this.tiktokEventsService.trackPurchase({
        userId: params.userId,
        orderId: params.orderId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
        contents: tiktokContents,
        quantity: params.numItems,
      }),
    ]);
  }

  /**
   * Track subscription start across all platforms
   * @param params - Subscription event parameters
   */
  async trackSubscription(params: SubscriptionEventParams): Promise<void> {
    this.logger.log(`Tracking subscription: ${params.subscriptionId}`);

    // Track in parallel
    await Promise.allSettled([
      this.metaConversionsService.trackSubscription({
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: params.fbp,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
        predictedLtv: params.predictedLtv,
      }),
      this.tiktokEventsService.trackSubscription({
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
      }),
    ]);
  }

  /**
   * Extract client IP address from request
   * @param request - Express request object
   * @returns Client IP address
   */
  getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      ''
    );
  }

  /**
   * Extract user agent from request
   * @param request - Express request object
   * @returns User agent string
   */
  getUserAgent(request: any): string {
    return request.headers['user-agent'] || '';
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return (
      this.metaConversionsService.isEnabled() ||
      this.tiktokEventsService.isEnabled()
    );
  }

  /**
   * Get status of tracking services
   */
  getStatus(): {
    meta: boolean;
    tiktok: boolean;
    overall: boolean;
  } {
    return {
      meta: this.metaConversionsService.isEnabled(),
      tiktok: this.tiktokEventsService.isEnabled(),
      overall: this.isEnabled(),
    };
  }
}
