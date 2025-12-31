import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { NotificationCategory } from '@prisma/client';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    deleteAllNotifications: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockNotificationId = 'notification-456';

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    title: 'Test Notification',
    body: 'This is a test notification',
    category: NotificationCategory.ORDER,
    isRead: false,
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
    promotionalEmails: false,
    pushEnabled: true,
    smsEnabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockResponse = {
        notifications: [mockNotification],
        total: 1,
        unreadCount: 1,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResponse);

      const result = await controller.getNotifications(mockUserId);

      expect(result).toEqual(mockResponse);
      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(mockUserId, {
        limit: undefined,
        offset: undefined,
        unreadOnly: false,
        category: undefined,
      });
    });

    it('should apply limit and offset parameters', async () => {
      const mockResponse = {
        notifications: [mockNotification],
        total: 10,
        unreadCount: 5,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResponse);

      await controller.getNotifications(mockUserId, 10, 20);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(mockUserId, {
        limit: 10,
        offset: 20,
        unreadOnly: false,
        category: undefined,
      });
    });

    it('should filter by unread only when specified', async () => {
      const mockResponse = {
        notifications: [mockNotification],
        total: 5,
        unreadCount: 5,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResponse);

      await controller.getNotifications(mockUserId, undefined, undefined, true);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(mockUserId, {
        limit: undefined,
        offset: undefined,
        unreadOnly: true,
        category: undefined,
      });
    });

    it('should filter by category when specified', async () => {
      const mockResponse = {
        notifications: [mockNotification],
        total: 3,
        unreadCount: 2,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResponse);

      await controller.getNotifications(mockUserId, undefined, undefined, undefined, NotificationCategory.ORDER);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(mockUserId, {
        limit: undefined,
        offset: undefined,
        unreadOnly: false,
        category: NotificationCategory.ORDER,
      });
    });

    it('should handle string "true" for unreadOnly parameter', async () => {
      const mockResponse = {
        notifications: [],
        total: 0,
        unreadCount: 0,
      };

      mockNotificationsService.getNotifications.mockResolvedValue(mockResponse);

      await controller.getNotifications(mockUserId, undefined, undefined, 'true' as any);

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(mockUserId, {
        limit: undefined,
        offset: undefined,
        unreadOnly: true,
        category: undefined,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockUserId);

      expect(result).toEqual({ unreadCount: 5 });
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(mockUserId);
    });

    it('should return zero when no unread notifications', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount(mockUserId);

      expect(result).toEqual({ unreadCount: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const updatedNotification = { ...mockNotification, isRead: true, readAt: new Date() };
      mockNotificationsService.markAsRead.mockResolvedValue(updatedNotification);

      const result = await controller.markAsRead(mockUserId, mockNotificationId);

      expect(result).toEqual(updatedNotification);
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(mockUserId, mockNotificationId);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockResult = { count: 5 };
      mockNotificationsService.markAllAsRead.mockResolvedValue(mockResult);

      const result = await controller.markAllAsRead(mockUserId);

      expect(result).toEqual(mockResult);
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockNotificationsService.deleteNotification.mockResolvedValue(mockNotification);

      const result = await controller.deleteNotification(mockUserId, mockNotificationId);

      expect(result).toEqual(mockNotification);
      expect(mockNotificationsService.deleteNotification).toHaveBeenCalledWith(mockUserId, mockNotificationId);
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications for a user', async () => {
      const mockResult = { count: 10 };
      mockNotificationsService.deleteAllNotifications.mockResolvedValue(mockResult);

      const result = await controller.deleteAllNotifications(mockUserId);

      expect(result).toEqual(mockResult);
      expect(mockNotificationsService.deleteAllNotifications).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getPreferences', () => {
    it('should return notification preferences', async () => {
      mockNotificationsService.getPreferences.mockResolvedValue(mockPreferences);

      const result = await controller.getPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(mockNotificationsService.getPreferences).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const updateDto = {
        orderConfirmation: false,
        pushEnabled: false,
        smsEnabled: true,
      };

      const updatedPreferences = { ...mockPreferences, ...updateDto };
      mockNotificationsService.updatePreferences.mockResolvedValue(updatedPreferences);

      const result = await controller.updatePreferences(mockUserId, updateDto);

      expect(result).toEqual(updatedPreferences);
      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith(mockUserId, updateDto);
    });

    it('should update individual preference fields', async () => {
      const updateDto = {
        newsletters: true,
      };

      const updatedPreferences = { ...mockPreferences, newsletters: true };
      mockNotificationsService.updatePreferences.mockResolvedValue(updatedPreferences);

      const result = await controller.updatePreferences(mockUserId, updateDto);

      expect(result.newsletters).toBe(true);
      expect(mockNotificationsService.updatePreferences).toHaveBeenCalledWith(mockUserId, updateDto);
    });
  });

  describe('registerPushToken', () => {
    it('should register a push notification token', async () => {
      const registerDto = {
        deviceId: 'device-abc',
        token: 'fcm-token-xyz',
        platform: 'IOS' as const,
      };

      const mockToken = {
        id: 'token-1',
        userId: mockUserId,
        ...registerDto,
        isActive: true,
        createdAt: new Date(),
      };

      mockNotificationsService.registerPushToken.mockResolvedValue(mockToken);

      const result = await controller.registerPushToken(mockUserId, registerDto);

      expect(result).toEqual(mockToken);
      expect(mockNotificationsService.registerPushToken).toHaveBeenCalledWith(
        mockUserId,
        registerDto.deviceId,
        registerDto.token,
        registerDto.platform
      );
    });

    it('should register token for Android platform', async () => {
      const registerDto = {
        deviceId: 'android-device',
        token: 'fcm-token-android',
        platform: 'ANDROID' as const,
      };

      mockNotificationsService.registerPushToken.mockResolvedValue({
        id: 'token-2',
        userId: mockUserId,
        ...registerDto,
        isActive: true,
      });

      await controller.registerPushToken(mockUserId, registerDto);

      expect(mockNotificationsService.registerPushToken).toHaveBeenCalledWith(
        mockUserId,
        registerDto.deviceId,
        registerDto.token,
        'ANDROID'
      );
    });

    it('should register token for Web platform', async () => {
      const registerDto = {
        deviceId: 'web-device',
        token: 'web-push-token',
        platform: 'WEB' as const,
      };

      mockNotificationsService.registerPushToken.mockResolvedValue({
        id: 'token-3',
        userId: mockUserId,
        ...registerDto,
        isActive: true,
      });

      await controller.registerPushToken(mockUserId, registerDto);

      expect(mockNotificationsService.registerPushToken).toHaveBeenCalledWith(
        mockUserId,
        registerDto.deviceId,
        registerDto.token,
        'WEB'
      );
    });
  });

  describe('unregisterPushToken', () => {
    it('should unregister a push notification token', async () => {
      const deviceId = 'device-abc';
      const mockResult = { count: 1 };

      mockNotificationsService.unregisterPushToken.mockResolvedValue(mockResult);

      const result = await controller.unregisterPushToken(mockUserId, deviceId);

      expect(result).toEqual(mockResult);
      expect(mockNotificationsService.unregisterPushToken).toHaveBeenCalledWith(mockUserId, deviceId);
    });
  });
});
