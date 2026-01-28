import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PushNotificationService } from './push-notification.service';
import { SmsService } from './sms.service';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let pushNotificationService: PushNotificationService;
  let smsService: SmsService;

  const mockPrismaService = {
    mobileNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    pushNotificationToken: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockPushNotificationService = {
    sendToUser: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    sendToTopic: jest.fn(),
  };

  const mockSmsService = {
    sendSmsToUser: jest.fn(),
    sendSms: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockNotificationId = 'notification-456';

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    title: 'Test Notification',
    body: 'This is a test notification body',
    category: NotificationCategory.ORDER,
    priority: NotificationPriority.NORMAL,
    isRead: false,
    isSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPreferences = {
    id: 'pref-1',
    userId: mockUserId,
    orderConfirmation: true,
    shippingUpdates: true,
    deliveryNotifications: true,
    newsletters: false,
    promotionalEmails: true,
    priceDropAlerts: true,
    pushEnabled: true,
    smsEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PushNotificationService,
          useValue: mockPushNotificationService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    pushNotificationService = module.get<PushNotificationService>(PushNotificationService);
    smsService = module.get<SmsService>(SmsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const createDto = {
        title: 'New Order',
        body: 'Your order has been placed',
        category: NotificationCategory.ORDER,
      };

      const createdNotification = {
        ...mockNotification,
        ...createDto,
      };

      mockPrismaService.mobileNotification.create.mockResolvedValue(createdNotification);

      const result = await service.createNotification(mockUserId, createDto);

      expect(result).toEqual(createdNotification);
      expect(mockPrismaService.mobileNotification.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          title: createDto.title,
          body: createDto.body,
          category: createDto.category,
          priority: NotificationPriority.NORMAL,
          data: undefined,
          imageUrl: undefined,
          actionUrl: undefined,
        },
      });
    });

    it('should create notification with priority', async () => {
      const createDto = {
        title: 'Urgent Alert',
        body: 'Important notification',
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.HIGH,
      };

      mockPrismaService.mobileNotification.create.mockResolvedValue({
        ...mockNotification,
        ...createDto,
      });

      await service.createNotification(mockUserId, createDto);

      expect(mockPrismaService.mobileNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: NotificationPriority.HIGH,
        }),
      });
    });

    it('should create notification with optional fields', async () => {
      const createDto = {
        title: 'Promo Alert',
        body: 'Check out our new deals',
        category: NotificationCategory.PROMOTION,
        data: { promoCode: 'SAVE20' },
        imageUrl: 'https://example.com/image.jpg',
        actionUrl: '/deals',
      };

      mockPrismaService.mobileNotification.create.mockResolvedValue({
        ...mockNotification,
        ...createDto,
      });

      await service.createNotification(mockUserId, createDto);

      expect(mockPrismaService.mobileNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: createDto.data,
          imageUrl: createDto.imageUrl,
          actionUrl: createDto.actionUrl,
        }),
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications with defaults', async () => {
      const notifications = [mockNotification];
      mockPrismaService.mobileNotification.findMany.mockResolvedValue(notifications);
      mockPrismaService.mobileNotification.count.mockResolvedValue(1);

      const result = await service.getNotifications(mockUserId);

      expect(result).toEqual({
        notifications,
        total: 1,
        unreadCount: 1,
      });
      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply custom limit and offset', async () => {
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);
      mockPrismaService.mobileNotification.count.mockResolvedValue(0);

      await service.getNotifications(mockUserId, { limit: 10, offset: 20 });

      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should filter by unread only', async () => {
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);
      mockPrismaService.mobileNotification.count.mockResolvedValue(0);

      await service.getNotifications(mockUserId, { unreadOnly: true });

      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by category', async () => {
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);
      mockPrismaService.mobileNotification.count.mockResolvedValue(0);

      await service.getNotifications(mockUserId, { category: NotificationCategory.ORDER });

      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, category: NotificationCategory.ORDER },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should combine filters', async () => {
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);
      mockPrismaService.mobileNotification.count.mockResolvedValue(0);

      await service.getNotifications(mockUserId, {
        unreadOnly: true,
        category: NotificationCategory.PROMOTION,
        limit: 5,
        offset: 10,
      });

      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isRead: false,
          category: NotificationCategory.PROMOTION,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        skip: 10,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.mobileNotification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(5);
      expect(mockPrismaService.mobileNotification.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
      });
    });

    it('should return zero when no unread notifications', async () => {
      mockPrismaService.mobileNotification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrismaService.mobileNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.mobileNotification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead(mockUserId, mockNotificationId);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockPrismaService.mobileNotification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.mobileNotification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(mockUserId, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should only mark user\'s own notification', async () => {
      mockPrismaService.mobileNotification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('different-user', mockNotificationId)).rejects.toThrow(
        NotFoundException
      );

      expect(mockPrismaService.mobileNotification.findFirst).toHaveBeenCalledWith({
        where: { id: mockNotificationId, userId: 'different-user' },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrismaService.mobileNotification.updateMany.mockResolvedValue({ count: 10 });

      const result = await service.markAllAsRead(mockUserId);

      expect(result.count).toBe(10);
      expect(mockPrismaService.mobileNotification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should return count of 0 when no unread notifications', async () => {
      mockPrismaService.mobileNotification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead(mockUserId);

      expect(result.count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockPrismaService.mobileNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.mobileNotification.delete.mockResolvedValue(mockNotification);

      const result = await service.deleteNotification(mockUserId, mockNotificationId);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.mobileNotification.delete).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.mobileNotification.findFirst.mockResolvedValue(null);

      await expect(service.deleteNotification(mockUserId, 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for a user', async () => {
      mockPrismaService.mobileNotification.deleteMany.mockResolvedValue({ count: 15 });

      const result = await service.deleteAllNotifications(mockUserId);

      expect(result.count).toBe(15);
      expect(mockPrismaService.mobileNotification.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(mockPrismaService.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should create default preferences if not exist', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue({
        id: 'new-pref',
        userId: mockUserId,
      });

      const result = await service.getPreferences(mockUserId);

      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId: mockUserId },
      });
      expect(result.userId).toBe(mockUserId);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const updateDto = {
        orderConfirmation: false,
        pushEnabled: false,
      };

      const updatedPreferences = { ...mockPreferences, ...updateDto };
      mockPrismaService.notificationPreference.upsert.mockResolvedValue(updatedPreferences);

      const result = await service.updatePreferences(mockUserId, updateDto);

      expect(result).toEqual(updatedPreferences);
      expect(mockPrismaService.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: updateDto,
        create: { userId: mockUserId, ...updateDto },
      });
    });

    it('should create preferences if not exist', async () => {
      const updateDto = { newsletters: true };

      mockPrismaService.notificationPreference.upsert.mockResolvedValue({
        userId: mockUserId,
        ...updateDto,
      });

      await service.updatePreferences(mockUserId, updateDto);

      expect(mockPrismaService.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: updateDto,
        create: { userId: mockUserId, newsletters: true },
      });
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification successfully', async () => {
      const dto = {
        userId: mockUserId,
        title: 'Order Update',
        body: 'Your order has shipped',
        category: NotificationCategory.ORDER,
      };

      const mockTokens = [
        { id: 'token-1', token: 'fcm-token-1', userId: mockUserId, isActive: true },
      ];

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue(mockTokens);
      mockPrismaService.mobileNotification.create.mockResolvedValue(mockNotification);
      mockPushNotificationService.sendToUser.mockResolvedValue({
        success: true,
        sentCount: 1,
        failedCount: 0,
      });
      mockPrismaService.mobileNotification.update.mockResolvedValue({
        ...mockNotification,
        isSent: true,
      });

      const result = await service.sendPushNotification(dto);

      expect(result.sent).toBe(true);
      expect(result.notificationId).toBe(mockNotificationId);
      expect(mockPushNotificationService.sendToUser).toHaveBeenCalledWith(mockUserId, {
        title: dto.title,
        body: dto.body,
        data: undefined,
        imageUrl: undefined,
        actionUrl: undefined,
        priority: 'normal',
      });
    });

    it('should return failure when no active push tokens', async () => {
      const dto = {
        userId: mockUserId,
        title: 'Test',
        body: 'Test body',
        category: NotificationCategory.SYSTEM,
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendPushNotification(dto);

      expect(result.sent).toBe(false);
      expect(result.reason).toBe('No active push tokens');
    });

    it('should handle push notification failures', async () => {
      const dto = {
        userId: mockUserId,
        title: 'Test',
        body: 'Test body',
        category: NotificationCategory.ORDER,
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: 'invalid-token', isActive: true },
      ]);
      mockPrismaService.mobileNotification.create.mockResolvedValue(mockNotification);
      mockPushNotificationService.sendToUser.mockResolvedValue({
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: ['Invalid token'],
      });
      mockPrismaService.mobileNotification.update.mockResolvedValue({
        ...mockNotification,
        isSent: false,
        deliveryStatus: 'failed',
      });

      const result = await service.sendPushNotification(dto);

      expect(result.sent).toBe(false);
      expect(result.errors).toContain('Invalid token');
    });
  });

  describe('sendBulkNotification', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notification = {
        title: 'Broadcast',
        body: 'Important announcement',
        category: NotificationCategory.SYSTEM,
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: 'token-1', isActive: true },
      ]);
      mockPrismaService.mobileNotification.create.mockResolvedValue(mockNotification);
      mockPushNotificationService.sendToUser.mockResolvedValue({
        success: true,
        sentCount: 1,
        failedCount: 0,
      });
      mockPrismaService.mobileNotification.update.mockResolvedValue(mockNotification);

      const result = await service.sendBulkNotification(userIds, notification);

      expect(result.total).toBe(3);
      expect(result.successful).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial failures in bulk send', async () => {
      const userIds = ['user-1', 'user-2'];
      const notification = {
        title: 'Test',
        body: 'Test body',
        category: NotificationCategory.PROMOTION,
      };

      // First user has no tokens
      mockPrismaService.pushNotificationToken.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ token: 'token', isActive: true }]);

      mockPrismaService.mobileNotification.create.mockResolvedValue(mockNotification);
      mockPushNotificationService.sendToUser.mockResolvedValue({
        success: true,
        sentCount: 1,
        failedCount: 0,
      });
      mockPrismaService.mobileNotification.update.mockResolvedValue(mockNotification);

      const result = await service.sendBulkNotification(userIds, notification);

      expect(result.total).toBe(2);
    });
  });

  describe('sendNotificationBySegment', () => {
    it('should send notification to all users', async () => {
      const notification = {
        title: 'Platform Update',
        body: 'New features available',
        category: NotificationCategory.SYSTEM,
      };

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendNotificationBySegment('all', notification);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(result.total).toBe(2);
    });

    it('should send notification to promotions segment', async () => {
      const notification = {
        title: 'Special Offer',
        body: '20% off today',
        category: NotificationCategory.PROMOTION,
      };

      mockPrismaService.notificationPreference.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await service.sendNotificationBySegment('promotions', notification);

      expect(mockPrismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { promotionalEmails: true },
        select: { userId: true },
      });
    });

    it('should send notification to orders segment', async () => {
      const notification = {
        title: 'Order Policy Update',
        body: 'New shipping options',
        category: NotificationCategory.ORDER,
      };

      mockPrismaService.notificationPreference.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await service.sendNotificationBySegment('orders', notification);

      expect(mockPrismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { orderConfirmation: true },
        select: { userId: true },
      });
    });

    it('should send notification to deals segment', async () => {
      const notification = {
        title: 'Flash Sale',
        body: 'Limited time offer',
        category: NotificationCategory.PROMOTION,
      };

      mockPrismaService.notificationPreference.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await service.sendNotificationBySegment('deals', notification);

      expect(mockPrismaService.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { priceDropAlerts: true },
        select: { userId: true },
      });
    });
  });

  describe('registerPushToken', () => {
    it('should register a new push token', async () => {
      const deviceId = 'device-abc';
      const token = 'fcm-token-xyz';
      const platform = 'IOS' as const;

      const mockToken = {
        id: 'token-1',
        userId: mockUserId,
        deviceId,
        token,
        platform,
        isActive: true,
      };

      mockPrismaService.pushNotificationToken.upsert.mockResolvedValue(mockToken);

      const result = await service.registerPushToken(mockUserId, deviceId, token, platform);

      expect(result).toEqual(mockToken);
      expect(mockPrismaService.pushNotificationToken.upsert).toHaveBeenCalledWith({
        where: { userId_deviceId: { userId: mockUserId, deviceId } },
        update: { token, lastUsedAt: expect.any(Date), isActive: true },
        create: { userId: mockUserId, deviceId, token, platform },
      });
    });

    it('should update existing push token', async () => {
      const deviceId = 'existing-device';
      const newToken = 'new-fcm-token';
      const platform = 'ANDROID' as const;

      mockPrismaService.pushNotificationToken.upsert.mockResolvedValue({
        userId: mockUserId,
        deviceId,
        token: newToken,
        platform,
        isActive: true,
      });

      await service.registerPushToken(mockUserId, deviceId, newToken, platform);

      expect(mockPrismaService.pushNotificationToken.upsert).toHaveBeenCalled();
    });
  });

  describe('unregisterPushToken', () => {
    it('should deactivate push token', async () => {
      const deviceId = 'device-abc';

      mockPrismaService.pushNotificationToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.unregisterPushToken(mockUserId, deviceId);

      expect(result.count).toBe(1);
      expect(mockPrismaService.pushNotificationToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, deviceId },
        data: { isActive: false },
      });
    });
  });

  describe('sendSmsNotification', () => {
    it('should send SMS notification', async () => {
      const message = 'Your verification code is 123456';
      const smsType = 'verification';

      mockSmsService.sendSmsToUser.mockResolvedValue({
        success: true,
        messageId: 'sms-123',
      });

      const result = await service.sendSmsNotification(mockUserId, message, smsType);

      expect(result.success).toBe(true);
      expect(mockSmsService.sendSmsToUser).toHaveBeenCalledWith(mockUserId, message, smsType);
    });
  });

  describe('sendOrderUpdateSms', () => {
    it('should send order update SMS with tracking', async () => {
      const orderNumber = 'ORD-123';
      const status = 'SHIPPED';
      const trackingNumber = 'TRACK-456';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: '+1234567890',
        phoneVerified: true,
      });
      mockSmsService.sendSms.mockResolvedValue({ success: true });

      const result = await service.sendOrderUpdateSms(mockUserId, orderNumber, status, trackingNumber);

      expect(result.success).toBe(true);
      expect(mockSmsService.sendSms).toHaveBeenCalledWith({
        to: '+1234567890',
        message: expect.stringContaining(orderNumber),
      });
    });

    it('should return error when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.sendOrderUpdateSms(mockUserId, 'ORD-123', 'SHIPPED');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error when phone number not available', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: null,
      });

      const result = await service.sendOrderUpdateSms(mockUserId, 'ORD-123', 'SHIPPED');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have a phone number');
    });

    it('should return error when phone not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: '+1234567890',
        phoneVerified: false,
      });

      const result = await service.sendOrderUpdateSms(mockUserId, 'ORD-123', 'SHIPPED');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number not verified');
    });
  });

  describe('sendDeliveryNotificationSms', () => {
    it('should send delivery notification SMS', async () => {
      const orderNumber = 'ORD-789';
      const estimatedDelivery = 'Today by 5 PM';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUserId,
        phoneNumber: '+1234567890',
        phoneVerified: true,
      });
      mockSmsService.sendSms.mockResolvedValue({ success: true });

      const result = await service.sendDeliveryNotificationSms(mockUserId, orderNumber, estimatedDelivery);

      expect(result.success).toBe(true);
      expect(mockSmsService.sendSms).toHaveBeenCalledWith({
        to: '+1234567890',
        message: expect.stringContaining(estimatedDelivery),
      });
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe user to topic', async () => {
      mockPushNotificationService.subscribeToTopic.mockResolvedValue({ success: true });

      const result = await service.subscribeToTopic(mockUserId, 'deals');

      expect(result.success).toBe(true);
      expect(mockPushNotificationService.subscribeToTopic).toHaveBeenCalledWith(mockUserId, 'deals');
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe user from topic', async () => {
      mockPushNotificationService.unsubscribeFromTopic.mockResolvedValue({ success: true });

      const result = await service.unsubscribeFromTopic(mockUserId, 'promotions');

      expect(result.success).toBe(true);
      expect(mockPushNotificationService.unsubscribeFromTopic).toHaveBeenCalledWith(mockUserId, 'promotions');
    });
  });

  describe('sendPushToTopic', () => {
    it('should send push notification to topic', async () => {
      const topic = 'flash-sale';
      const title = 'Flash Sale!';
      const body = '50% off all items';
      const data = { saleId: 'sale-123' };

      mockPushNotificationService.sendToTopic.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await service.sendPushToTopic(topic, title, body, data);

      expect(result.success).toBe(true);
      expect(mockPushNotificationService.sendToTopic).toHaveBeenCalledWith(topic, {
        title,
        body,
        data,
      });
    });
  });
});
