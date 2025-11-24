/**
 * Comprehensive Tracking Service
 * Unified interface for tracking events across multiple platforms
 */

import { UAParser } from 'ua-parser-js';
import { trackGA4Event, GA4Events, type GA4EventParams } from './ga4';
import { trackMetaEvent, MetaEvents, type MetaEventParams } from './metaPixel';
import { trackTikTokEvent, TikTokEvents, type TikTokEventParams } from './tiktokPixel';
import { pushToDataLayer } from './dataLayer';

export interface EventProperties {
  [key: string]: any;
}

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
}

export interface DeviceInfo {
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
}

export interface UserContext {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

class TrackingService {
  private userContext: UserContext = {};
  private utmParams: UTMParams = {};
  private deviceInfo: DeviceInfo | null = null;
  private sessionId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSession();
      this.captureUTMParams();
      this.captureDeviceInfo();
    }
  }

  /**
   * Initialize session tracking
   */
  private initializeSession(): void {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('tracking_session_id', sessionId);
    }
    this.sessionId = sessionId;

    // Store first visit timestamp
    if (!localStorage.getItem('first_visit_timestamp')) {
      localStorage.setItem('first_visit_timestamp', new Date().toISOString());
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Capture UTM parameters from URL
   */
  private captureUTMParams(): void {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const utmParams: UTMParams = {};

    const utmKeys: (keyof UTMParams)[] = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'utm_id',
    ];

    utmKeys.forEach(key => {
      const value = params.get(key);
      if (value) {
        utmParams[key] = value;
      }
    });

    // Store in session storage for persistence
    if (Object.keys(utmParams).length > 0) {
      sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
      this.utmParams = utmParams;
    } else {
      // Try to retrieve from session storage
      const stored = sessionStorage.getItem('utm_params');
      if (stored) {
        this.utmParams = JSON.parse(stored);
      }
    }
  }

  /**
   * Capture device and browser information
   */
  private captureDeviceInfo(): void {
    if (typeof window === 'undefined') return;

    const parser = new UAParser();
    const result = parser.getResult();

    this.deviceInfo = {
      device_type: this.getDeviceType(),
      browser: result.browser.name || 'Unknown',
      browser_version: result.browser.version || 'Unknown',
      os: result.os.name || 'Unknown',
      os_version: result.os.version || 'Unknown',
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
    };
  }

  /**
   * Determine device type
   */
  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';

    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  /**
   * Get referrer information
   */
  private getReferrer(): string {
    if (typeof document === 'undefined') return '';
    return document.referrer || '';
  }

  /**
   * Get page information
   */
  private getPageInfo(): {
    page_path: string;
    page_title: string;
    page_location: string;
  } {
    if (typeof window === 'undefined') {
      return {
        page_path: '',
        page_title: '',
        page_location: '',
      };
    }

    return {
      page_path: window.location.pathname,
      page_title: document.title,
      page_location: window.location.href,
    };
  }

  /**
   * Set user context
   */
  setUserContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };

    if (process.env.NODE_ENV === 'development') {
      console.log('[Tracking] User context set:', this.userContext);
    }
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    this.userContext = {};

    if (process.env.NODE_ENV === 'development') {
      console.log('[Tracking] User context cleared');
    }
  }

  /**
   * Get enriched properties with context
   */
  private getEnrichedProperties(properties?: EventProperties): EventProperties {
    const enriched: EventProperties = {
      ...properties,
      ...this.utmParams,
      ...this.deviceInfo,
      ...this.getPageInfo(),
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      referrer: this.getReferrer(),
    };

    // Add user context if available
    if (this.userContext.userId) {
      enriched.user_id = this.userContext.userId;
    }

    return enriched;
  }

  /**
   * Track a generic event across all platforms
   */
  track(eventName: string, properties?: EventProperties): void {
    const enrichedProperties = this.getEnrichedProperties(properties);

    // Push to DataLayer (for GTM)
    pushToDataLayer({
      event: eventName,
      ...enrichedProperties,
    });

    // Track in GA4
    trackGA4Event(eventName, enrichedProperties as GA4EventParams);

    // Track platform-specific events
    this.trackPlatformSpecific(eventName, enrichedProperties);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Tracking] Event tracked:', eventName, enrichedProperties);
    }
  }

  /**
   * Track platform-specific events based on event name
   */
  private trackPlatformSpecific(eventName: string, properties: EventProperties): void {
    // Map to Meta Pixel events
    switch (eventName) {
      case GA4Events.COMPLETE_REGISTRATION:
        trackMetaEvent(MetaEvents.COMPLETE_REGISTRATION, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.COMPLETE_REGISTRATION, properties as TikTokEventParams);
        break;
      case GA4Events.PURCHASE:
        trackMetaEvent(MetaEvents.PURCHASE, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.COMPLETE_PAYMENT, properties as TikTokEventParams);
        break;
      case GA4Events.ADD_TO_CART:
        trackMetaEvent(MetaEvents.ADD_TO_CART, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.ADD_TO_CART, properties as TikTokEventParams);
        break;
      case GA4Events.BEGIN_CHECKOUT:
        trackMetaEvent(MetaEvents.INITIATE_CHECKOUT, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.INITIATE_CHECKOUT, properties as TikTokEventParams);
        break;
      case GA4Events.SEARCH:
        trackMetaEvent(MetaEvents.SEARCH, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.SEARCH, properties as TikTokEventParams);
        break;
      case GA4Events.VIEW_ITEM:
        trackMetaEvent(MetaEvents.VIEW_CONTENT, properties as MetaEventParams);
        trackTikTokEvent(TikTokEvents.VIEW_CONTENT, properties as TikTokEventParams);
        break;
    }
  }

  /**
   * Track page view
   */
  trackPageView(pagePath?: string): void {
    const properties: EventProperties = {};
    if (pagePath) {
      properties.page_path = pagePath;
    }

    this.track(GA4Events.PAGE_VIEW, properties);
  }

  /**
   * Track registration start
   */
  trackRegistrationStart(): void {
    this.track(GA4Events.BEGIN_REGISTRATION, {
      method: 'email',
    });
  }

  /**
   * Track registration completion
   */
  trackRegistrationComplete(userId: string, method: string = 'email'): void {
    this.setUserContext({ userId });
    this.track(GA4Events.COMPLETE_REGISTRATION, {
      user_id: userId,
      method,
      value: 0,
      currency: 'USD',
    });
  }

  /**
   * Track email verification
   */
  trackEmailVerified(userId: string): void {
    this.track(GA4Events.EMAIL_VERIFIED, {
      user_id: userId,
    });
  }

  /**
   * Track login
   */
  trackLogin(userId: string, method: string = 'email'): void {
    this.setUserContext({ userId });
    this.track(GA4Events.LOGIN, {
      user_id: userId,
      method,
    });
  }

  /**
   * Track purchase
   */
  trackPurchase(
    transactionId: string,
    value: number,
    currency: string = 'USD',
    items?: any[]
  ): void {
    this.track(GA4Events.PURCHASE, {
      transaction_id: transactionId,
      value,
      currency,
      items,
    });
  }

  /**
   * Track search
   */
  trackSearch(searchTerm: string): void {
    this.track(GA4Events.SEARCH, {
      search_term: searchTerm,
    });
  }

  /**
   * Get current UTM parameters
   */
  getUTMParams(): UTMParams {
    return { ...this.utmParams };
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo ? { ...this.deviceInfo } : null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Singleton instance
let trackingInstance: TrackingService | null = null;

/**
 * Get the global tracking service instance
 */
export const getTrackingService = (): TrackingService => {
  if (!trackingInstance) {
    trackingInstance = new TrackingService();
  }
  return trackingInstance;
};

/**
 * Track an event (convenience function)
 */
export const track = (eventName: string, properties?: EventProperties): void => {
  const service = getTrackingService();
  service.track(eventName, properties);
};

/**
 * Set user context (convenience function)
 */
export const setUserContext = (context: UserContext): void => {
  const service = getTrackingService();
  service.setUserContext(context);
};

/**
 * Clear user context (convenience function)
 */
export const clearUserContext = (): void => {
  const service = getTrackingService();
  service.clearUserContext();
};

export default TrackingService;
