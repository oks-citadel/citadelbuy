'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return 'denied' as NotificationPermission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as NotificationPermission;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Get the VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      setIsSubscribed(true);

      // Send subscription to backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }, [isSupported, permission]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);

        // Notify backend
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  }, []);

  const showNotification = useCallback(
    async (options: NotificationOptions) => {
      if (!isSupported) {
        console.warn('Notifications not supported');
        return;
      }

      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          console.warn('Notification permission not granted');
          return;
        }
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        // Use ServiceWorkerRegistration.showNotification which supports more options
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/badge-72x72.png',
          tag: options.tag,
          data: options.data,
          actions: options.actions,
          requireInteraction: options.requireInteraction,
          silent: options.silent,
          vibrate: options.vibrate || [100, 50, 100],
        } as globalThis.NotificationOptions);
      } catch (error) {
        // Fallback to standard Notification API
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag,
          data: options.data,
          silent: options.silent,
        });
      }
    },
    [isSupported, permission, requestPermission]
  );

  // Predefined notification types
  const notifyOrderPlaced = useCallback(
    (orderId: string, total: string) => {
      showNotification({
        title: 'Order Placed Successfully! 🎉',
        body: `Your order #${orderId} for ${total} has been confirmed.`,
        tag: `order-${orderId}`,
        data: { type: 'order', orderId },
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  const notifyOrderShipped = useCallback(
    (orderId: string, trackingNumber?: string) => {
      showNotification({
        title: 'Your Order Has Shipped! 📦',
        body: trackingNumber
          ? `Order #${orderId} is on its way. Tracking: ${trackingNumber}`
          : `Order #${orderId} is on its way!`,
        tag: `shipped-${orderId}`,
        data: { type: 'shipped', orderId, trackingNumber },
        actions: [
          { action: 'track', title: 'Track Order' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  const notifyOrderDelivered = useCallback(
    (orderId: string) => {
      showNotification({
        title: 'Order Delivered! 🎁',
        body: `Your order #${orderId} has been delivered. Enjoy!`,
        tag: `delivered-${orderId}`,
        data: { type: 'delivered', orderId },
        actions: [
          { action: 'review', title: 'Leave Review' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  const notifyPriceDrop = useCallback(
    (productName: string, productId: string, newPrice: string, oldPrice: string) => {
      showNotification({
        title: 'Price Drop Alert! 💰',
        body: `${productName} dropped from ${oldPrice} to ${newPrice}`,
        tag: `price-${productId}`,
        data: { type: 'price-drop', productId },
        actions: [
          { action: 'buy', title: 'Buy Now' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  const notifyBackInStock = useCallback(
    (productName: string, productId: string) => {
      showNotification({
        title: 'Back in Stock! 🔔',
        body: `${productName} is now available`,
        tag: `stock-${productId}`,
        data: { type: 'back-in-stock', productId },
        actions: [
          { action: 'buy', title: 'Buy Now' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  const notifyPromotion = useCallback(
    (title: string, message: string, promoCode?: string) => {
      showNotification({
        title: `🎊 ${title}`,
        body: promoCode ? `${message} Use code: ${promoCode}` : message,
        tag: 'promotion',
        data: { type: 'promotion', promoCode },
        actions: [
          { action: 'shop', title: 'Shop Now' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    },
    [showNotification]
  );

  return {
    permission,
    isSupported,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    notifyOrderPlaced,
    notifyOrderShipped,
    notifyOrderDelivered,
    notifyPriceDrop,
    notifyBackInStock,
    notifyPromotion,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
