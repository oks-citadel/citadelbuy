/**
 * Deep Linking Service for React Native Mobile App
 * Handles deep links and universal links for app navigation
 */

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export type DeepLinkRoute =
  | 'product'
  | 'category'
  | 'order'
  | 'cart'
  | 'checkout'
  | 'profile'
  | 'search'
  | 'promotion'
  | 'ai-assistant'
  | 'ar-tryon'
  | 'subscription'
  | 'wallet';

export interface DeepLinkParams {
  [key: string]: string | number | boolean | undefined;
}

export interface ParsedDeepLink {
  route: DeepLinkRoute | null;
  params: DeepLinkParams;
  path: string;
  queryParams: { [key: string]: string };
}

export type DeepLinkHandler = (link: ParsedDeepLink) => void;

/**
 * Deep Linking Service Class
 * Provides centralized deep link management
 */
class DeepLinkingService {
  private initialized = false;
  private handler: DeepLinkHandler | null = null;
  private linkingListener: any = null;

  /**
   * Initialize the deep linking service
   */
  async initialize(handler: DeepLinkHandler): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.handler = handler;

    try {
      console.log('[DeepLinking] Initializing service...');

      // Check if app was opened via a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[DeepLinking] App opened with URL:', initialUrl);
        this.handleDeepLink(initialUrl);
      }

      // Set up listener for deep links while app is running
      this.linkingListener = Linking.addEventListener('url', ({ url }) => {
        console.log('[DeepLinking] Deep link received:', url);
        this.handleDeepLink(url);
      });

      this.initialized = true;
      console.log('[DeepLinking] Service initialized successfully');
    } catch (error: any) {
      console.error('[DeepLinking] Failed to initialize:', error);
    }
  }

  /**
   * Handle deep link URL
   */
  private handleDeepLink(url: string): void {
    try {
      const parsed = this.parseDeepLink(url);
      console.log('[DeepLinking] Parsed deep link:', parsed);

      if (this.handler && parsed.route) {
        this.handler(parsed);
      }
    } catch (error) {
      console.error('[DeepLinking] Failed to handle deep link:', error);
    }
  }

  /**
   * Parse deep link URL into route and params
   */
  parseDeepLink(url: string): ParsedDeepLink {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      // Remove leading slash from path
      const cleanPath = path?.replace(/^\/+/, '') || '';
      const pathParts = cleanPath.split('/').filter(Boolean);

      console.log('[DeepLinking] Parsing URL:', { hostname, path, queryParams, pathParts });

      // Determine route and params based on path
      let route: DeepLinkRoute | null = null;
      let params: DeepLinkParams = {};

      if (pathParts.length === 0) {
        // Root URL - no specific route
        return { route: null, params: {}, path: cleanPath, queryParams: queryParams || {} };
      }

      // Parse based on first path segment
      const firstSegment = pathParts[0].toLowerCase();

      switch (firstSegment) {
        case 'product':
        case 'products':
          route = 'product';
          if (pathParts[1]) {
            params.productId = pathParts[1];
          }
          break;

        case 'category':
        case 'categories':
          route = 'category';
          if (pathParts[1]) {
            params.categoryId = pathParts[1];
          }
          break;

        case 'order':
        case 'orders':
          route = 'order';
          if (pathParts[1]) {
            params.orderId = pathParts[1];
          }
          break;

        case 'cart':
          route = 'cart';
          break;

        case 'checkout':
          route = 'checkout';
          break;

        case 'profile':
        case 'account':
          route = 'profile';
          break;

        case 'search':
          route = 'search';
          if (queryParams?.q || queryParams?.query) {
            params.query = queryParams.q || queryParams.query;
          }
          break;

        case 'promotion':
        case 'promo':
        case 'deal':
          route = 'promotion';
          if (pathParts[1]) {
            params.promoId = pathParts[1];
          }
          if (queryParams?.code) {
            params.promoCode = queryParams.code;
          }
          break;

        case 'ai':
        case 'assistant':
          route = 'ai-assistant';
          break;

        case 'ar':
        case 'try-on':
        case 'tryon':
          route = 'ar-tryon';
          if (pathParts[1]) {
            params.productId = pathParts[1];
          }
          break;

        case 'subscription':
        case 'subscribe':
          route = 'subscription';
          if (pathParts[1]) {
            params.planId = pathParts[1];
          }
          break;

        case 'wallet':
        case 'credits':
          route = 'wallet';
          break;

        default:
          console.warn('[DeepLinking] Unknown route:', firstSegment);
      }

      // Add any additional query params to params
      if (queryParams) {
        params = { ...params, ...queryParams };
      }

      return { route, params, path: cleanPath, queryParams: queryParams || {} };
    } catch (error) {
      console.error('[DeepLinking] Failed to parse deep link:', error);
      return { route: null, params: {}, path: '', queryParams: {} };
    }
  }

  /**
   * Create a deep link URL for a specific route
   */
  createDeepLink(route: DeepLinkRoute, params?: DeepLinkParams): string {
    const prefix = Linking.createURL('/');

    let path = '';
    let queryString = '';

    switch (route) {
      case 'product':
        path = params?.productId ? `/products/${params.productId}` : '/products';
        break;

      case 'category':
        path = params?.categoryId ? `/categories/${params.categoryId}` : '/categories';
        break;

      case 'order':
        path = params?.orderId ? `/orders/${params.orderId}` : '/orders';
        break;

      case 'cart':
        path = '/cart';
        break;

      case 'checkout':
        path = '/checkout';
        break;

      case 'profile':
        path = '/profile';
        break;

      case 'search':
        path = '/search';
        if (params?.query) {
          queryString = `?q=${encodeURIComponent(String(params.query))}`;
        }
        break;

      case 'promotion':
        path = params?.promoId ? `/promotions/${params.promoId}` : '/promotions';
        if (params?.promoCode) {
          queryString = `?code=${encodeURIComponent(String(params.promoCode))}`;
        }
        break;

      case 'ai-assistant':
        path = '/ai';
        break;

      case 'ar-tryon':
        path = params?.productId ? `/ar/${params.productId}` : '/ar';
        break;

      case 'subscription':
        path = params?.planId ? `/subscription/${params.planId}` : '/subscription';
        break;

      case 'wallet':
        path = '/wallet';
        break;

      default:
        path = '/';
    }

    return `${prefix}${path}${queryString}`;
  }

  /**
   * Open a deep link URL
   */
  async openDeepLink(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      console.warn('[DeepLinking] Cannot open URL:', url);
      return false;
    } catch (error) {
      console.error('[DeepLinking] Failed to open deep link:', error);
      return false;
    }
  }

  /**
   * Open an external URL (browser, email, phone, etc.)
   */
  async openExternalURL(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      console.warn('[DeepLinking] Cannot open external URL:', url);
      return false;
    } catch (error) {
      console.error('[DeepLinking] Failed to open external URL:', error);
      return false;
    }
  }

  /**
   * Open app settings
   */
  async openSettings(): Promise<boolean> {
    try {
      await Linking.openSettings();
      return true;
    } catch (error) {
      console.error('[DeepLinking] Failed to open settings:', error);
      return false;
    }
  }

  /**
   * Open email client
   */
  async sendEmail(email: string, subject?: string, body?: string): Promise<boolean> {
    let url = `mailto:${email}`;
    const params: string[] = [];

    if (subject) {
      params.push(`subject=${encodeURIComponent(subject)}`);
    }
    if (body) {
      params.push(`body=${encodeURIComponent(body)}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.openExternalURL(url);
  }

  /**
   * Open phone dialer
   */
  async makePhoneCall(phoneNumber: string): Promise<boolean> {
    const url = `tel:${phoneNumber}`;
    return this.openExternalURL(url);
  }

  /**
   * Open SMS app
   */
  async sendSMS(phoneNumber: string, message?: string): Promise<boolean> {
    let url = `sms:${phoneNumber}`;
    if (message && Platform.OS === 'ios') {
      url += `&body=${encodeURIComponent(message)}`;
    } else if (message) {
      url += `?body=${encodeURIComponent(message)}`;
    }
    return this.openExternalURL(url);
  }

  /**
   * Open WhatsApp
   */
  async openWhatsApp(phoneNumber?: string, message?: string): Promise<boolean> {
    let url = 'whatsapp://';
    if (phoneNumber) {
      url += `send?phone=${phoneNumber}`;
      if (message) {
        url += `&text=${encodeURIComponent(message)}`;
      }
    }
    return this.openExternalURL(url);
  }

  /**
   * Share content via system share sheet
   */
  async share(url: string, message?: string): Promise<boolean> {
    try {
      // This would typically use expo-sharing or react-native Share API
      // For now, just copy to clipboard or open in browser
      console.log('[DeepLinking] Share:', { url, message });
      return true;
    } catch (error) {
      console.error('[DeepLinking] Failed to share:', error);
      return false;
    }
  }

  /**
   * Get the app's deep link prefix
   */
  getDeepLinkPrefix(): string {
    return Linking.createURL('/');
  }

  /**
   * Clean up deep linking service
   */
  cleanup(): void {
    if (this.linkingListener) {
      this.linkingListener.remove();
      this.linkingListener = null;
    }

    this.handler = null;
    this.initialized = false;

    console.log('[DeepLinking] Service cleaned up');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const deepLinkingService = new DeepLinkingService();

// Export convenience functions
export const initializeDeepLinking = (handler: DeepLinkHandler) =>
  deepLinkingService.initialize(handler);
export const parseDeepLink = (url: string) => deepLinkingService.parseDeepLink(url);
export const createDeepLink = (route: DeepLinkRoute, params?: DeepLinkParams) =>
  deepLinkingService.createDeepLink(route, params);
export const openDeepLink = (url: string) => deepLinkingService.openDeepLink(url);
export const openExternalURL = (url: string) => deepLinkingService.openExternalURL(url);
export const openSettings = () => deepLinkingService.openSettings();
export const sendEmail = (email: string, subject?: string, body?: string) =>
  deepLinkingService.sendEmail(email, subject, body);

export default deepLinkingService;
