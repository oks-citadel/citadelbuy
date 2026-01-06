/**
 * Meta Conversions API Service
 * Server-side event tracking for Facebook/Instagram advertising
 * Provides iOS 14+ resilient tracking and improved attribution
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ServerEvent, EventRequest, UserData, CustomData, Content } from 'facebook-nodejs-business-sdk';

export interface MetaConversionParams {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;

  // User Data (will be hashed automatically)
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // External IDs
  externalId?: string;
  userId?: string;

  // Client Data
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string; // Facebook Click ID
  fbp?: string; // Facebook Browser ID

  // Event Data
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    price?: number;
  }>;
  numItems?: number;

  // Custom Properties
  customProperties?: Record<string, any>;
}

@Injectable()
export class MetaConversionsService {
  private readonly logger = new Logger(MetaConversionsService.name);
  private readonly accessToken: string;
  private readonly pixelId: string;
  private readonly testEventCode?: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('META_CONVERSIONS_API_ACCESS_TOKEN') || '';
    this.pixelId = this.configService.get<string>('META_PIXEL_ID') || '';
    this.testEventCode = this.configService.get<string>('META_TEST_EVENT_CODE');
    this.enabled = !!this.accessToken && !!this.pixelId;

    if (!this.enabled) {
      this.logger.warn('Meta Conversions API is not configured. Set META_CONVERSIONS_API_ACCESS_TOKEN and META_PIXEL_ID environment variables.');
    } else {
      this.logger.log('Meta Conversions API initialized');
    }
  }

  /**
   * Hash data using SHA-256 for Meta's Advanced Matching
   * @param data - Data to hash (email, phone, name, etc.)
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
   * Track a conversion event to Meta
   * @param params - Event parameters
   * @returns Promise<void>
   */
  async trackConversion(params: MetaConversionParams): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Meta Conversions API disabled, skipping event');
      return;
    }

    try {
      // Build UserData with hashed PII
      const userData = new UserData();

      if (params.email) {
        userData.setEmails([this.hashData(params.email)]);
      }
      if (params.phone) {
        userData.setPhones([this.hashPhone(params.phone)]);
      }
      if (params.firstName) {
        userData.setFirstNames([this.hashData(params.firstName)]);
      }
      if (params.lastName) {
        userData.setLastNames([this.hashData(params.lastName)]);
      }
      if (params.city) {
        userData.setCities([this.hashData(params.city)]);
      }
      if (params.state) {
        userData.setStates([this.hashData(params.state)]);
      }
      if (params.zipCode) {
        // @ts-expect-error - Facebook SDK type definitions may be outdated
        userData.setZipCode([this.hashData(params.zipCode)]);
      }
      if (params.country) {
        // @ts-ignore - Facebook SDK type definitions may be outdated
        userData.setCountry([this.hashData(params.country)]);
      }
      if (params.externalId) {
        userData.setExternalIds([params.externalId]);
      }
      if (params.clientIpAddress) {
        userData.setClientIpAddress(params.clientIpAddress);
      }
      if (params.clientUserAgent) {
        userData.setClientUserAgent(params.clientUserAgent);
      }
      if (params.fbc) {
        userData.setFbc(params.fbc);
      }
      if (params.fbp) {
        userData.setFbp(params.fbp);
      }

      // Build CustomData for conversion details
      const customData = new CustomData();

      if (params.value !== undefined) {
        customData.setValue(params.value);
      }
      if (params.currency) {
        customData.setCurrency(params.currency);
      }
      if (params.contentName) {
        customData.setContentName(params.contentName);
      }
      if (params.contentCategory) {
        customData.setContentCategory(params.contentCategory);
      }
      if (params.contentIds && params.contentIds.length > 0) {
        customData.setContentIds(params.contentIds);
      }
      if (params.contentType) {
        customData.setContentType(params.contentType);
      }
      if (params.numItems !== undefined) {
        customData.setNumItems(params.numItems);
      }

      // Add contents if provided
      if (params.contents && params.contents.length > 0) {
        const contents = params.contents.map(item => {
          const content = new Content();
          content.setId(item.id);
          content.setQuantity(item.quantity);
          if (item.price !== undefined) {
            content.setItemPrice(item.price);
          }
          return content;
        });
        customData.setContents(contents);
      }

      // Add custom properties
      if (params.customProperties) {
        Object.entries(params.customProperties).forEach(([key, value]) => {
          // @ts-ignore - Facebook SDK type definitions may be outdated
          customData.setCustomProperties(key, value);
        });
      }

      // Build ServerEvent
      const serverEvent = new ServerEvent();
      serverEvent.setEventName(params.eventName);
      serverEvent.setEventTime(Math.floor(Date.now() / 1000));
      serverEvent.setUserData(userData);
      serverEvent.setCustomData(customData);
      serverEvent.setActionSource('website');

      if (params.eventId) {
        serverEvent.setEventId(params.eventId);
      }
      if (params.eventSourceUrl) {
        serverEvent.setEventSourceUrl(params.eventSourceUrl);
      }

      // Create EventRequest
      const eventRequest = new EventRequest(
        this.accessToken,
        this.pixelId
      );
      eventRequest.setEvents([serverEvent]);

      // Add test event code if in test mode
      if (this.testEventCode) {
        eventRequest.setTestEventCode(this.testEventCode);
      }

      // Send event
      const response = await eventRequest.execute();

      this.logger.log(`Meta conversion tracked: ${params.eventName}`, {
        eventId: params.eventId,
        response: response,
      });

    } catch (error) {
      this.logger.error(`Failed to track Meta conversion: ${error.message}`, error.stack);
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
    firstName?: string;
    lastName?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string;
    fbp?: string;
    eventId?: string;
    eventSourceUrl?: string;
  }): Promise<void> {
    await this.trackConversion({
      eventName: 'CompleteRegistration',
      eventId: params.eventId,
      eventSourceUrl: params.eventSourceUrl,
      email: params.email,
      phone: params.phone,
      firstName: params.firstName,
      lastName: params.lastName,
      externalId: params.userId,
      clientIpAddress: params.clientIpAddress,
      clientUserAgent: params.clientUserAgent,
      fbc: params.fbc,
      fbp: params.fbp,
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
    firstName?: string;
    lastName?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string;
    fbp?: string;
    eventId?: string;
    eventSourceUrl?: string;
    contents?: Array<{
      id: string;
      quantity: number;
      price?: number;
    }>;
    contentIds?: string[];
    numItems?: number;
  }): Promise<void> {
    await this.trackConversion({
      eventName: 'Purchase',
      eventId: params.eventId,
      eventSourceUrl: params.eventSourceUrl,
      email: params.email,
      phone: params.phone,
      firstName: params.firstName,
      lastName: params.lastName,
      externalId: params.userId,
      clientIpAddress: params.clientIpAddress,
      clientUserAgent: params.clientUserAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      value: params.value,
      currency: params.currency || 'USD',
      contentType: 'product',
      contentIds: params.contentIds,
      contents: params.contents,
      numItems: params.numItems,
      customProperties: {
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
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbc?: string;
    fbp?: string;
    eventId?: string;
    eventSourceUrl?: string;
    predictedLtv?: number;
  }): Promise<void> {
    await this.trackConversion({
      eventName: 'Subscribe',
      eventId: params.eventId,
      eventSourceUrl: params.eventSourceUrl,
      email: params.email,
      phone: params.phone,
      externalId: params.userId,
      clientIpAddress: params.clientIpAddress,
      clientUserAgent: params.clientUserAgent,
      fbc: params.fbc,
      fbp: params.fbp,
      value: params.value,
      currency: params.currency || 'USD',
      customProperties: {
        subscription_id: params.subscriptionId,
        predicted_ltv: params.predictedLtv,
      },
    });
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
