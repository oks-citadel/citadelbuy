/**
 * Push Notifications Service for React Native Mobile App
 * Handles notification registration, scheduling, and handling
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  orders: boolean;
  promotions: boolean;
  priceDrops: boolean;
  backInStock: boolean;
  recommendations: boolean;
  aiInsights: boolean;
  reviews: boolean;
  loyalty: boolean;
  security: boolean;
  account: boolean;
}

export interface PushNotificationToken {
  token: string;
  type: 'expo' | 'apns' | 'fcm';
}

/**
 * Notification Service Class
 * Provides centralized notification management
 */
class NotificationService {
  private initialized = false;
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[Notifications] Initializing service...');

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up notification listeners
      this.setupListeners();

      this.initialized = true;
      console.log('[Notifications] Service initialized successfully');
    } catch (error: any) {
      console.error('[Notifications] Failed to initialize:', error);
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('[Notifications] Push notifications require a physical device');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted');
        return null;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('[Notifications] No project ID found for push notifications');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = tokenData.data;
      console.log('[Notifications] Push token obtained:', this.pushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);

      // Set notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return this.pushToken;
    } catch (error: any) {
      console.error('[Notifications] Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      description: 'Notifications about your orders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Deals',
      description: 'Special offers and discounts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      description: 'General app notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('important', {
      name: 'Important',
      description: 'Important updates that require attention',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    console.log('[Notifications] Android channels configured');
  }

  /**
   * Register push token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await api.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        deviceId: Device.deviceName || 'unknown',
      });
      console.log('[Notifications] Token registered with backend');
    } catch (error) {
      console.error('[Notifications] Failed to register token with backend:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for user interacting with notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Notifications] Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );

    console.log('[Notifications] Listeners set up');
  }

  /**
   * Handle notification received in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    console.log('[Notifications] Received:', { title, body, data });

    // You can add custom handling here
    // For example, update a notification badge, show in-app banner, etc.
  }

  /**
   * Handle user tapping on notification
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const { data } = notification.request.content;

    console.log('[Notifications] User tapped notification with data:', data);

    // Handle navigation based on notification type
    if (data?.type) {
      this.navigateBasedOnNotificationType(data.type, data);
    }
  }

  /**
   * Navigate based on notification type
   */
  private navigateBasedOnNotificationType(type: string, data: any): void {
    // This would typically use navigation service
    // For now, just log the action
    console.log('[Notifications] Navigate to:', type, data);

    // Example handling:
    // switch (type) {
    //   case 'order_update':
    //     navigationRef.navigate('OrderDetail', { orderId: data.orderId });
    //     break;
    //   case 'promotion':
    //     navigationRef.navigate('ProductDetail', { productId: data.productId });
    //     break;
    //   // ... other cases
    // }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: trigger || null, // null means immediate
      });

      console.log('[Notifications] Local notification scheduled:', id);
      return id;
    } catch (error) {
      console.error('[Notifications] Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('[Notifications] Notification cancelled:', notificationId);
    } catch (error) {
      console.error('[Notifications] Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notifications] All notifications cancelled');
    } catch (error) {
      console.error('[Notifications] Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('[Notifications] Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('[Notifications] Badge count set to:', count);
    } catch (error) {
      console.error('[Notifications] Failed to set badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await api.post('/notifications/preferences', preferences);
      console.log('[Notifications] Preferences updated:', preferences);
    } catch (error) {
      console.error('[Notifications] Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('[Notifications] Failed to get preferences:', error);
      throw error;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Clean up notification service
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    console.log('[Notifications] Service cleaned up');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export convenience functions
export const initializeNotifications = () => notificationService.initialize();
export const registerForPushNotifications = () => notificationService.registerForPushNotifications();
export const scheduleNotification = (title: string, body: string, data?: any, trigger?: any) =>
  notificationService.scheduleLocalNotification(title, body, data, trigger);
export const updateNotificationPreferences = (preferences: Partial<NotificationPreferences>) =>
  notificationService.updatePreferences(preferences);
export const getNotificationPreferences = () => notificationService.getPreferences();
export const requestNotificationPermissions = () => notificationService.requestPermissions();
export const areNotificationsEnabled = () => notificationService.areNotificationsEnabled();

export default notificationService;
