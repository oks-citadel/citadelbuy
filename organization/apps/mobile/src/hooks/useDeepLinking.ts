/**
 * React Hook for Deep Linking
 * Provides easy-to-use hooks for deep linking functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { deepLinkingService, DeepLinkRoute, DeepLinkParams, ParsedDeepLink } from '../services/deep-linking';

/**
 * Hook to handle deep linking
 */
export function useDeepLinking() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastDeepLink, setLastDeepLink] = useState<ParsedDeepLink | null>(null);

  const handleDeepLink = useCallback((link: ParsedDeepLink) => {
    console.log('[useDeepLinking] Deep link received:', link);
    setLastDeepLink(link);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        await deepLinkingService.initialize(handleDeepLink);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize deep linking:', error);
        setIsInitialized(true); // Mark as initialized even if failed
      }
    };

    initialize();

    return () => {
      deepLinkingService.cleanup();
    };
  }, [handleDeepLink]);

  const createLink = useCallback((route: DeepLinkRoute, params?: DeepLinkParams) => {
    return deepLinkingService.createDeepLink(route, params);
  }, []);

  const openLink = useCallback(async (url: string) => {
    return deepLinkingService.openDeepLink(url);
  }, []);

  const openExternal = useCallback(async (url: string) => {
    return deepLinkingService.openExternalURL(url);
  }, []);

  const clearLastLink = useCallback(() => {
    setLastDeepLink(null);
  }, []);

  return {
    isInitialized,
    lastDeepLink,
    createLink,
    openLink,
    openExternal,
    clearLastLink,
  };
}

/**
 * Hook to create and share deep links
 */
export function useShareDeepLink() {
  const createProductLink = useCallback((productId: string) => {
    return deepLinkingService.createDeepLink('product', { productId });
  }, []);

  const createCategoryLink = useCallback((categoryId: string) => {
    return deepLinkingService.createDeepLink('category', { categoryId });
  }, []);

  const createOrderLink = useCallback((orderId: string) => {
    return deepLinkingService.createDeepLink('order', { orderId });
  }, []);

  const createPromotionLink = useCallback((promoId?: string, promoCode?: string) => {
    return deepLinkingService.createDeepLink('promotion', { promoId, promoCode });
  }, []);

  const shareLink = useCallback(async (url: string, message?: string) => {
    return deepLinkingService.share(url, message);
  }, []);

  return {
    createProductLink,
    createCategoryLink,
    createOrderLink,
    createPromotionLink,
    shareLink,
  };
}

/**
 * Hook to handle external communications
 */
export function useExternalCommunication() {
  const sendEmail = useCallback(async (email: string, subject?: string, body?: string) => {
    return deepLinkingService.sendEmail(email, subject, body);
  }, []);

  const makePhoneCall = useCallback(async (phoneNumber: string) => {
    return deepLinkingService.makePhoneCall(phoneNumber);
  }, []);

  const sendSMS = useCallback(async (phoneNumber: string, message?: string) => {
    return deepLinkingService.sendSMS(phoneNumber, message);
  }, []);

  const openWhatsApp = useCallback(async (phoneNumber?: string, message?: string) => {
    return deepLinkingService.openWhatsApp(phoneNumber, message);
  }, []);

  const openSettings = useCallback(async () => {
    return deepLinkingService.openSettings();
  }, []);

  return {
    sendEmail,
    makePhoneCall,
    sendSMS,
    openWhatsApp,
    openSettings,
  };
}

export default useDeepLinking;
