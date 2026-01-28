import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DevicePlatform, NotificationCategory } from '@prisma/client';

describe('MobileService', () => {
  let service: MobileService;
  let prisma: PrismaService;

  const mockPrismaService = {
    pushNotificationToken: {
      upsert: jest.fn(),
    },
    mobileNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    deepLink: {
      create: jest.fn(),
      update: jest.fn(),
    },
    appConfig: {
      findMany: jest.fn(),
    },
  };

  const mockPushNotificationToken = {
    id: 'token-123',
    userId: 'user-123',
    deviceId: 'device-123',
    platform: DevicePlatform.IOS,
    token: 'fcm-token-abc123',
    lastUsedAt: new Date('2025-01-15T10:00:00Z'),
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockNotification = {
    id: 'notification-123',
    userId: 'user-123',
    title: 'Order Shipped',
    body: 'Your order has been shipped',
    category: NotificationCategory.ORDER,
    data: { orderId: 'order-123' },
    isRead: false,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockDeepLink = {
    id: 'deeplink-123',
    linkId: 'abc1234',
    targetType: 'product',
    targetId: 'product-123',
    campaign: 'summer-sale',
    clickCount: 0,
    lastClickedAt: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockAppConfig = {
    id: 'config-123',
    key: 'min_version',
    value: '1.0.0',
    platform: DevicePlatform.IOS,
    isActive: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should register a new device successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        deviceId: 'device-123',
        platform: DevicePlatform.IOS,
        token: 'fcm-token-abc123',
      };
      mockPrismaService.pushNotificationToken.upsert.mockResolvedValue(
        mockPushNotificationToken,
      );

      // Act
      const result = await service.registerDevice(userId, dto);

      // Assert
      expect(result).toEqual(mockPushNotificationToken);
      expect(mockPrismaService.pushNotificationToken.upsert).toHaveBeenCalledWith({
        where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
        update: { token: dto.token, platform: dto.platform, lastUsedAt: expect.any(Date) },
        create: {
          userId,
          deviceId: dto.deviceId,
          platform: dto.platform,
          token: dto.token,
        },
      });
    });

    it('should update existing device token', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        deviceId: 'device-123',
        platform: DevicePlatform.ANDROID,
        token: 'new-fcm-token',
      };
      const updatedToken = {
        ...mockPushNotificationToken,
        platform: DevicePlatform.ANDROID,
        token: 'new-fcm-token',
      };
      mockPrismaService.pushNotificationToken.upsert.mockResolvedValue(updatedToken);

      // Act
      const result = await service.registerDevice(userId, dto);

      // Assert
      expect(result.token).toBe('new-fcm-token');
      expect(result.platform).toBe(DevicePlatform.ANDROID);
    });

    it('should handle different platforms', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        deviceId: 'device-456',
        platform: DevicePlatform.ANDROID,
        token: 'android-token',
      };
      mockPrismaService.pushNotificationToken.upsert.mockResolvedValue({
        ...mockPushNotificationToken,
        platform: DevicePlatform.ANDROID,
      });

      // Act
      const result = await service.registerDevice(userId, dto);

      // Assert
      expect(mockPrismaService.pushNotificationToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            platform: DevicePlatform.ANDROID,
          }),
        }),
      );
    });
  });

  describe('sendNotification', () => {
    it('should create a notification successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const title = 'Order Shipped';
      const body = 'Your order has been shipped';
      const category = NotificationCategory.ORDER;
      const data = { orderId: 'order-123' };
      mockPrismaService.mobileNotification.create.mockResolvedValue(mockNotification);

      // Act
      const result = await service.sendNotification(userId, title, body, category, data);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.mobileNotification.create).toHaveBeenCalledWith({
        data: { userId, title, body, category, data },
      });
    });

    it('should create notification without data', async () => {
      // Arrange
      const userId = 'user-123';
      const title = 'Welcome';
      const body = 'Welcome to our app';
      const category = NotificationCategory.MARKETING;
      mockPrismaService.mobileNotification.create.mockResolvedValue({
        ...mockNotification,
        title,
        body,
        category,
        data: undefined,
      });

      // Act
      const result = await service.sendNotification(userId, title, body, category);

      // Assert
      expect(mockPrismaService.mobileNotification.create).toHaveBeenCalledWith({
        data: { userId, title, body, category, data: undefined },
      });
    });

    it('should handle different notification categories', async () => {
      // Arrange
      const userId = 'user-123';
      const categories = [
        NotificationCategory.ORDER,
        NotificationCategory.MARKETING,
        NotificationCategory.SYSTEM,
      ];

      for (const category of categories) {
        mockPrismaService.mobileNotification.create.mockResolvedValue({
          ...mockNotification,
          category,
        });

        // Act
        const result = await service.sendNotification(
          userId,
          'Test',
          'Test body',
          category,
        );

        // Assert
        expect(result.category).toBe(category);
      }
    });
  });

  describe('getNotifications', () => {
    it('should return notifications for a user with default limit', async () => {
      // Arrange
      const userId = 'user-123';
      const mockNotifications = [mockNotification];
      mockPrismaService.mobileNotification.findMany.mockResolvedValue(mockNotifications);

      // Act
      const result = await service.getNotifications(userId);

      // Assert
      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should return notifications with custom limit', async () => {
      // Arrange
      const userId = 'user-123';
      const limit = 10;
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([mockNotification]);

      // Act
      const result = await service.getNotifications(userId, limit);

      // Assert
      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when no notifications exist', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getNotifications(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should order notifications by creation date descending', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.mobileNotification.findMany.mockResolvedValue([]);

      // Act
      await service.getNotifications(userId);

      // Assert
      expect(mockPrismaService.mobileNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('createDeepLink', () => {
    it('should create a deep link successfully', async () => {
      // Arrange
      const targetType = 'product';
      const targetId = 'product-123';
      const campaign = 'summer-sale';
      mockPrismaService.deepLink.create.mockResolvedValue(mockDeepLink);

      // Act
      const result = await service.createDeepLink(targetType, targetId, campaign);

      // Assert
      expect(result).toEqual(mockDeepLink);
      expect(mockPrismaService.deepLink.create).toHaveBeenCalledWith({
        data: {
          linkId: expect.any(String),
          targetType,
          targetId,
          campaign,
        },
      });
    });

    it('should create deep link without campaign', async () => {
      // Arrange
      const targetType = 'category';
      const targetId = 'category-123';
      mockPrismaService.deepLink.create.mockResolvedValue({
        ...mockDeepLink,
        targetType,
        targetId,
        campaign: undefined,
      });

      // Act
      const result = await service.createDeepLink(targetType, targetId);

      // Assert
      expect(mockPrismaService.deepLink.create).toHaveBeenCalledWith({
        data: {
          linkId: expect.any(String),
          targetType,
          targetId,
          campaign: undefined,
        },
      });
    });

    it('should generate unique linkId', async () => {
      // Arrange
      const createCalls: any[] = [];
      mockPrismaService.deepLink.create.mockImplementation((args) => {
        createCalls.push(args);
        return Promise.resolve(mockDeepLink);
      });

      // Act
      await service.createDeepLink('product', 'p1');
      await service.createDeepLink('product', 'p2');

      // Assert
      expect(createCalls[0].data.linkId).toBeDefined();
      expect(createCalls[1].data.linkId).toBeDefined();
    });
  });

  describe('trackDeepLink', () => {
    it('should increment click count and update lastClickedAt', async () => {
      // Arrange
      const linkId = 'abc1234';
      const updatedDeepLink = {
        ...mockDeepLink,
        clickCount: 1,
        lastClickedAt: new Date(),
      };
      mockPrismaService.deepLink.update.mockResolvedValue(updatedDeepLink);

      // Act
      const result = await service.trackDeepLink(linkId);

      // Assert
      expect(result).toEqual(updatedDeepLink);
      expect(mockPrismaService.deepLink.update).toHaveBeenCalledWith({
        where: { linkId },
        data: { clickCount: { increment: 1 }, lastClickedAt: expect.any(Date) },
      });
    });

    it('should track multiple clicks', async () => {
      // Arrange
      const linkId = 'abc1234';
      mockPrismaService.deepLink.update
        .mockResolvedValueOnce({ ...mockDeepLink, clickCount: 1 })
        .mockResolvedValueOnce({ ...mockDeepLink, clickCount: 2 })
        .mockResolvedValueOnce({ ...mockDeepLink, clickCount: 3 });

      // Act
      await service.trackDeepLink(linkId);
      await service.trackDeepLink(linkId);
      const result = await service.trackDeepLink(linkId);

      // Assert
      expect(result.clickCount).toBe(3);
      expect(mockPrismaService.deepLink.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('getAppConfig', () => {
    it('should return all active app configs', async () => {
      // Arrange
      const mockConfigs = [mockAppConfig];
      mockPrismaService.appConfig.findMany.mockResolvedValue(mockConfigs);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result).toEqual(mockConfigs);
      expect(mockPrismaService.appConfig.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should filter by platform when provided', async () => {
      // Arrange
      const platform = DevicePlatform.IOS;
      const mockConfigs = [mockAppConfig];
      mockPrismaService.appConfig.findMany.mockResolvedValue(mockConfigs);

      // Act
      const result = await service.getAppConfig(platform);

      // Assert
      expect(result).toEqual(mockConfigs);
      expect(mockPrismaService.appConfig.findMany).toHaveBeenCalledWith({
        where: { isActive: true, platform },
      });
    });

    it('should return empty array when no configs exist', async () => {
      // Arrange
      mockPrismaService.appConfig.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle Android platform filter', async () => {
      // Arrange
      const platform = DevicePlatform.ANDROID;
      mockPrismaService.appConfig.findMany.mockResolvedValue([
        { ...mockAppConfig, platform: DevicePlatform.ANDROID },
      ]);

      // Act
      const result = await service.getAppConfig(platform);

      // Assert
      expect(mockPrismaService.appConfig.findMany).toHaveBeenCalledWith({
        where: { isActive: true, platform: DevicePlatform.ANDROID },
      });
    });
  });
});
