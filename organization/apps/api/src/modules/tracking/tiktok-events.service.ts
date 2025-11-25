/**
 * TikTok Events API Service
 * Server-side event tracking for TikTok advertising
 * Provides improved attribution and iOS 14+ resilient tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

export interface TikTokEventParams {
  event: string;
  eventId?: string;

  // User Data (will be hashed automatically)
  email?: string;
  phone?: string;

  // External IDs
  externalId?: string;
  userId?: string;

  // Client Data
  ip?: string;
  userAgent?: string;
  ttclid?: string; // TikTok Click ID

  // Event Data
  value?: number;
  currency?: string;
  contentType?: string;
  contentId?: string;
  contentName?: string;
  contentCategory?: string;
  contents?: Array<{
    content_id: string;
    content_name?: string;
    price?: number;
    quantity?: number;
  }>;
  quantity?: number;
  description?: string;
  query?: string;

  // Page Info
  pageUrl?: string;

  // Custom Properties
  properties?: Record<string, any>;
}

interface TikTokEventPayload {
  pixel_code: string;
  event: string;
  event_id?: string;
  timestamp?: string;
  test_event_code?: string;
  context: {
    user_agent?: string;
    ip?: string;
    page?: {
      url?: string;
    };
    user?: {
      email?: string;
      phone_number?: string;
      external_id?: string;
      ttclid?: string;
    };
  };
  properties?: {
    value?: number;
    currency?: string;
    content_type?: string;
    content_id?: string;
    content_name?: string;
    content_category?: string;
    contents?: any[];
    quantity?: number;
    description?: string;
    query?: string;
    [key: string]: any;
  };
}

@Injectable()
export class TikTokEventsService {
  private readonly logger = new Logger(TikTokEventsService.name);
  private readonly accessToken: string;
  private readonly pixelId: string;
  private readonly testEventCode?: string;
  private readonly enabled: boolean;
  private readonly apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.accessToken = this.configService.get<string>('TIKTOK_EVENTS_API_ACCESS_TOKEN') || '';
    this.pixelId = this.configService.get<string>('TIKTOK_PIXEL_ID') || '';
    this.testEventCode = this.configService.get<string>('TIKTOK_TEST_EVENT_CODE');
    this.enabled = !!this.accessToken && !!this.pixelId;

    if (!this.enabled) {
      this.logger.warn('TikTok Events API is not configured. Set TIKTOK_EVENTS_API_ACCESS_TOKEN and TIKTOK_PIXEL_ID environment variables.');
    } else {
      this.logger.log('TikTok Events API initialized');
    }
  }

  /**
   * Hash data using SHA-256 for TikTok's Advanced Matching
   * @param data - Data to hash (email, phone)
   * @returns Hashed data in hex format
   */
  private hashData(data: string): string {
    if (!data) return '';

    // Normalize: lowercase and trim
    const normalized = data.toLowerCase().trim();

    // Hash with SHA-256
    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  /**
   * Hash phone number (remove non-numeric characters first)
   * @param phone - Phone number to hash
   * @returns Hashed phone number
   */
  private hashPhone(phone: string): string {
    if (!phone) return '';

    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');

    // Hash the digits
    return this.hashData(digits);
  }

  /**
   * Generate a unique event ID
   * @returns Unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track an event to TikTok
   * @param params - Event parameters
   * @returns Promise<void>
   */
  async trackEvent(params: TikTokEventParams): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('TikTok Events API disabled, skipping event');
      return;
    }

    try {
      // Build event payload
      const payload: TikTokEventPayload = {
        pixel_code: this.pixelId,
        event: params.event,
        event_id: params.eventId || this.generateEventId(),
        timestamp: new Date().toISOString(),
        context: {
          user_agent: params.userAgent,
          ip: params.ip,
          page: params.pageUrl ? { url: params.pageUrl } : undefined,
          user: {
            email: params.email ? this.hashData(params.email) : undefined,
            phone_number: params.phone ? this.hashPhone(params.phone) : undefined,
            external_id: params.externalId || params.userId,
            ttclid: params.ttclid,
          },
        },
      };

      // Add event properties
      if (params.value !== undefined || params.contentId || params.query) {
        payload.properties = {
          value: params.value,
          currency: params.currency,
          content_type: params.contentType,
          content_id: params.contentId,
          content_name: params.contentName,
          content_category: params.contentCategory,
          contents: params.contents,
          quantity: params.quantity,
          description: params.description,
          query: params.query,
          ...params.properties,
        };
      }

      // Add test event code if in test mode
      if (this.testEventCode) {
        payload.test_event_code = this.testEventCode;
      }

      // Send request to TikTok Events API
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            event_source: 'web',
            data: [payload],
          },
          {
            headers: {
              'Access-Token': this.accessToken,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      this.logger.log(`TikTok event tracked: ${params.event}`, {
        eventId: payload.event_id,
        response: response.data,
      });

    } catch (error) {
      this.logger.error(`Failed to track TikTok event: ${error.message}`, error.stack);
      // Don't throw - tracking failures shouldn't break the main flow
    }
  }

  /**
   * Track user registration
   */
  async trackRegistration(params: {
    userId: string;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    ttclid?: string;
    eventId?: string;
    pageUrl?: string;
  }): Promise<void> {
    await this.trackEvent({
      event: 'CompleteRegistration',
      eventId: params.eventId,
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      ttclid: params.ttclid,
      pageUrl: params.pageUrl,
      value: 0,
      currency: 'USD',
      contentName: 'User Registration',
    });
  }

  /**
   * Track purchase/order completion
   */
  async trackPurchase(params: {
    userId: string;
    orderId: string;
    value: number;
    currency?: string;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    ttclid?: string;
    eventId?: string;
    pageUrl?: string;
    contents?: Array<{
      content_id: string;
      content_name?: string;
      price?: number;
      quantity?: number;
    }>;
    quantity?: number;
  }): Promise<void> {
    await this.trackEvent({
      event: 'CompletePayment',
      eventId: params.eventId,
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      ttclid: params.ttclid,
      pageUrl: params.pageUrl,
      value: params.value,
      currency: params.currency || 'USD',
      contentType: 'product',
      contents: params.contents,
      quantity: params.quantity,
      properties: {
        order_id: params.orderId,
      },
    });
  }

  /**
   * Track subscription start
   */
  async trackSubscription(params: {
    userId: string;
    subscriptionId: string;
    value: number;
    currency?: string;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    ttclid?: string;
    eventId?: string;
    pageUrl?: string;
  }): Promise<void> {
    await this.trackEvent({
      event: 'Subscribe',
      eventId: params.eventId,
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      ttclid: params.ttclid,
      pageUrl: params.pageUrl,
      value: params.value,
      currency: params.currency || 'USD',
      properties: {
        subscription_id: params.subscriptionId,
      },
    });
  }

  /**
   * Track add to cart
   */
  async trackAddToCart(params: {
    userId?: string;
    contentId: string;
    contentName: string;
    value: number;
    currency?: string;
    quantity?: number;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    eventId?: string;
    pageUrl?: string;
  }): Promise<void> {
    await this.trackEvent({
      event: 'AddToCart',
      eventId: params.eventId,
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      pageUrl: params.pageUrl,
      contentId: params.contentId,
      contentName: params.contentName,
      contentType: 'product',
      value: params.value,
      currency: params.currency || 'USD',
      quantity: params.quantity || 1,
    });
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
