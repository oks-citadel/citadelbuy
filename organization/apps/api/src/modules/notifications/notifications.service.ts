import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationCategory, NotificationPriority } from '@prisma/client';
import {
  CreateNotificationDto,
  UpdateNotificationPreferencesDto,
  SendPushNotificationDto,
} from './dto';
import { PushNotificationService } from './push-notification.service';
import { SmsService } from './sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private pushNotificationService: PushNotificationService,
    private smsService: SmsService,
  ) {}

  /**
   * Create a new notification for a user
   */
  async createNotification(userId: string, dto: CreateNotificationDto) {
    return this.prisma.mobileNotification.create({
      data: {
        userId,
        title: dto.title,
        body: dto.body,
        category: dto.category,
        priority: dto.priority || NotificationPriority.NORMAL,
        data: dto.data,
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      category?: NotificationCategory;
    } = {}
  ) {
    const { limit = 50, offset = 0, unreadOnly = false, category } = options;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }
    if (category) {
      where.category = category;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.mobileNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.mobileNotification.count({ where }),
    ]);

    return {
      notifications,
      total,
      unreadCount: await this.getUnreadCount(userId),
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    return this.prisma.mobileNotification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.mobileNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.mobileNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    return this.prisma.mobileNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.mobileNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.mobileNotification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string) {
    return this.prisma.mobileNotification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  /**
   * Send a push notification to a user
   */
  async sendPushNotification(dto: SendPushNotificationDto) {
    const { userId, title, body, category, data, imageUrl, actionUrl } = dto;

    // Get user's push tokens
    const tokens = await this.prisma.pushNotificationToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No active push tokens found for user ${userId}`);
      return { sent: false, reason: 'No active push tokens' };
    }

    // Create notification record
    const notification = await this.createNotification(userId, {
      title,
      body,
      category,
      data,
      imageUrl,
      actionUrl,
    });

    // Send push notification using the PushNotificationService
    const pushResult = await this.pushNotificationService.sendToUser(userId, {
      title,
      body,
      data,
      imageUrl,
      actionUrl,
      priority: (dto as any).priority === NotificationPriority.HIGH ? 'high' : 'normal',
    });

    // Update notification record based on result
    await this.prisma.mobileNotification.update({
      where: { id: notification.id },
      data: {
        isSent: pushResult.success,
        sentAt: pushResult.success ? new Date() : null,
        deliveryStatus: pushResult.success ? 'sent' : 'failed',
        failureReason: pushResult.errors?.join(', '),
      },
    });

    this.logger.log(
      `Push notification ${pushResult.success ? 'sent' : 'failed'} to user ${userId}: ${title}`,
    );

    return {
      sent: pushResult.success,
      notificationId: notification.id,
      tokenCount: tokens.length,
      sentCount: pushResult.sentCount,
      failedCount: pushResult.failedCount,
      errors: pushResult.errors,
    };
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    notification: Omit<CreateNotificationDto, 'userId'>
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.sendPushNotification({
          userId,
          ...notification,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { successful, failed, total: userIds.length };
  }

  /**
   * Send notification by segment (e.g., all users with specific preferences)
   */
  async sendNotificationBySegment(
    segment: 'all' | 'promotions' | 'orders' | 'deals',
    notification: Omit<CreateNotificationDto, 'userId'>
  ) {
    let userIds: string[] = [];

    switch (segment) {
      case 'all':
        const allUsers = await this.prisma.user.findMany({
          select: { id: true },
        });
        userIds = allUsers.map((u) => u.id);
        break;

      case 'promotions':
        const promoUsers = await this.prisma.notificationPreference.findMany({
          where: { promotionalEmails: true },
          select: { userId: true },
        });
        userIds = promoUsers.map((u) => u.userId);
        break;

      case 'orders':
        const orderUsers = await this.prisma.notificationPreference.findMany({
          where: { orderConfirmation: true },
          select: { userId: true },
        });
        userIds = orderUsers.map((u) => u.userId);
        break;

      case 'deals':
        const dealUsers = await this.prisma.notificationPreference.findMany({
          where: { priceDropAlerts: true },
          select: { userId: true },
        });
        userIds = dealUsers.map((u) => u.userId);
        break;
    }

    return this.sendBulkNotification(userIds, notification);
  }

  /**
   * Register a push token for a device
   */
  async registerPushToken(
    userId: string,
    deviceId: string,
    token: string,
    platform: 'IOS' | 'ANDROID' | 'WEB'
  ) {
    return this.prisma.pushNotificationToken.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: { token, lastUsedAt: new Date(), isActive: true },
      create: { userId, deviceId, token, platform },
    });
  }

  /**
   * Unregister a push token
   */
  async unregisterPushToken(userId: string, deviceId: string) {
    return this.prisma.pushNotificationToken.updateMany({
      where: { userId, deviceId },
      data: { isActive: false },
    });
  }

  /**
   * Send SMS notification to a user
   */
  async sendSmsNotification(
    userId: string,
    message: string,
    smsType: string = 'general',
  ) {
    return this.smsService.sendSmsToUser(userId, message, smsType);
  }

  /**
   * Send order update SMS
   */
  async sendOrderUpdateSms(
    userId: string,
    orderNumber: string,
    status: string,
    trackingNumber?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phoneNumber: true, phoneVerified: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }


    if (!user.phoneNumber) {
      return { success: false, error: 'User does not have a phone number' };
    }

    if (!user.phoneVerified) {
      this.logger.warn(`SMS not sent - phone number not verified for user ${userId}`);
      return { success: false, error: 'Phone number not verified' };
    }

    // Construct SMS message
    let message = `Order Update: Your order #${orderNumber} status is now ${status}.`;
    if (trackingNumber) {
      message += ` Tracking: ${trackingNumber}`;
    }

    // Send SMS
    return this.smsService.sendSms({ to: user.phoneNumber, message });
  }

  /**
   * Send delivery notification SMS
   */
  async sendDeliveryNotificationSms(
    userId: string,
    orderNumber: string,
    estimatedDelivery?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phoneNumber: true, phoneVerified: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }


    if (!user.phoneNumber) {
      return { success: false, error: 'User does not have a phone number' };
    }

    if (!user.phoneVerified) {
      this.logger.warn(`SMS not sent - phone number not verified for user ${userId}`);
      return { success: false, error: 'Phone number not verified' };
    }

    // Construct SMS message
    let message = `Delivery Update: Your order #${orderNumber} is on its way!`;
    if (estimatedDelivery) {
      message += ` Estimated delivery: ${estimatedDelivery}`;
    }

    // Send SMS
    return this.smsService.sendSms({ to: user.phoneNumber, message });
  }

  /**
   * Subscribe user to push notification topic
   */
  async subscribeToTopic(userId: string, topic: string) {
    return this.pushNotificationService.subscribeToTopic(userId, topic);
  }

  /**
   * Unsubscribe user from push notification topic
   */
  async unsubscribeFromTopic(userId: string, topic: string) {
    return this.pushNotificationService.unsubscribeFromTopic(userId, topic);
  }

  /**
   * Send push notification to a topic
   */
  async sendPushToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    return this.pushNotificationService.sendToTopic(topic, {
      title,
      body,
      data,
    });
  }
}
