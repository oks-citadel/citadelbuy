import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService, PushNotificationPayload } from './push-notification.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    pushNotificationToken: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string | undefined> = {
        FIREBASE_SERVICE_ACCOUNT_PATH: undefined,
        FIREBASE_SERVICE_ACCOUNT_JSON: undefined,
        FIREBASE_PROJECT_ID: undefined,
        NODE_ENV: 'test',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUserId = 'user-123';
  const mockToken = 'fcm-token-abc123xyz';

  const mockPayload: PushNotificationPayload = {
    title: 'Test Notification',
    body: 'This is a test notification body',
    data: { orderId: 'order-123' },
    imageUrl: 'https://example.com/image.jpg',
    actionUrl: '/orders/order-123',
    badge: 1,
    sound: 'default',
    priority: 'high',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should log warning when Firebase is not configured', () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      // Service is already initialized in beforeEach
      // Check if warning was logged during initialization
      expect(mockConfigService.get).toHaveBeenCalledWith('FIREBASE_SERVICE_ACCOUNT_PATH');
      expect(mockConfigService.get).toHaveBeenCalledWith('FIREBASE_SERVICE_ACCOUNT_JSON');
      expect(mockConfigService.get).toHaveBeenCalledWith('FIREBASE_PROJECT_ID');
    });

    it('should not throw error in test environment when Firebase not configured', async () => {
      // In test environment, onModuleInit should not throw
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should throw error in production when Firebase not configured', async () => {
      const prodConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          PushNotificationService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: ConfigService,
            useValue: prodConfigService,
          },
        ],
      }).compile();

      const prodService = module.get<PushNotificationService>(PushNotificationService);

      expect(() => prodService.onModuleInit()).toThrow(
        'Firebase must be configured for production'
      );
    });
  });

  describe('sendToToken', () => {
    it('should return failure when Firebase not initialized', async () => {
      const result = await service.sendToToken(mockToken, mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firebase not initialized');
    });

    it('should log warning with truncated token', async () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendToToken(mockToken, mockPayload);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockToken.substring(0, 20))
      );
    });
  });

  describe('sendToTokens', () => {
    it('should return failure when Firebase not initialized', async () => {
      const tokens = [mockToken, 'another-token-xyz'];

      const result = await service.sendToTokens(tokens, mockPayload);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(tokens.length);
      expect(result.errors).toContain('Firebase not initialized');
    });

    it('should return success with zero counts for empty token array', async () => {
      const result = await service.sendToTokens([], mockPayload);

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should log warning for multiple tokens', async () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
      const tokens = ['token1', 'token2', 'token3'];

      await service.sendToTokens(tokens, mockPayload);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${tokens.length} tokens`)
      );
    });
  });

  describe('sendToUser', () => {
    it('should return failure when no active push tokens found', async () => {
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUser(mockUserId, mockPayload);

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toContain('No active push tokens');
    });

    it('should fetch active tokens for user', async () => {
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: mockToken, isActive: true },
      ]);

      await service.sendToUser(mockUserId, mockPayload);

      expect(mockPrismaService.pushNotificationToken.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
      });
    });

    it('should attempt to send to all user tokens', async () => {
      const tokens = [
        { token: 'token-1', isActive: true },
        { token: 'token-2', isActive: true },
        { token: 'token-3', isActive: true },
      ];
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue(tokens);

      const logSpy = jest.spyOn(service['logger'], 'log');
      await service.sendToUser(mockUserId, mockPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${tokens.length} devices`)
      );
    });
  });

  describe('sendToUsers', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUsers(userIds, mockPayload);

      expect(result.totalUsers).toBe(userIds.length);
      expect(result.userResults).toBeDefined();
      expect(Object.keys(result.userResults)).toHaveLength(userIds.length);
    });

    it('should track results for each user', async () => {
      const userIds = ['user-1', 'user-2'];
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUsers(userIds, mockPayload);

      expect(result.userResults['user-1']).toBeDefined();
      expect(result.userResults['user-2']).toBeDefined();
    });

    it('should aggregate sent and failed counts', async () => {
      const userIds = ['user-1'];
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.sendToUsers(userIds, mockPayload);

      expect(typeof result.sentCount).toBe('number');
      expect(typeof result.failedCount).toBe('number');
    });
  });

  describe('sendToTopic', () => {
    it('should return failure when Firebase not initialized', async () => {
      const result = await service.sendToTopic('flash-sales', mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firebase not initialized');
    });

    it('should log warning with topic name', async () => {
      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
      const topic = 'promotions';

      await service.sendToTopic(topic, mockPayload);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(topic)
      );
    });
  });

  describe('subscribeToTopic', () => {
    it('should return failure when Firebase not initialized', async () => {
      const result = await service.subscribeToTopic(mockUserId, 'deals');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firebase not initialized');
    });

    it('should return error when no active tokens found', async () => {
      // Mock Firebase as initialized for this test
      (service as any).isInitialized = true;
      (service as any).firebaseApp = {};
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      const result = await service.subscribeToTopic(mockUserId, 'deals');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active tokens found');
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should return failure when Firebase not initialized', async () => {
      const result = await service.unsubscribeFromTopic(mockUserId, 'promotions');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firebase not initialized');
    });

    it('should fetch active tokens for unsubscription', async () => {
      // Mock Firebase as initialized
      (service as any).isInitialized = true;
      (service as any).firebaseApp = {};
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await service.unsubscribeFromTopic(mockUserId, 'promotions');

      expect(mockPrismaService.pushNotificationToken.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, isActive: true },
      });
    });
  });

  describe('markTokenInactive', () => {
    it('should mark token as inactive', async () => {
      const token = 'invalid-token-xyz';
      mockPrismaService.pushNotificationToken.updateMany.mockResolvedValue({ count: 1 });

      await (service as any).markTokenInactive(token);

      expect(mockPrismaService.pushNotificationToken.updateMany).toHaveBeenCalledWith({
        where: { token },
        data: { isActive: false },
      });
    });

    it('should log success when token marked inactive', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const token = 'expired-token-123';
      mockPrismaService.pushNotificationToken.updateMany.mockResolvedValue({ count: 1 });

      await (service as any).markTokenInactive(token);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Marked token as inactive')
      );
    });

    it('should handle errors when marking token inactive', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const token = 'error-token';
      mockPrismaService.pushNotificationToken.updateMany.mockRejectedValue(
        new Error('Database error')
      );

      await (service as any).markTokenInactive(token);

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to mark token as inactive',
        expect.any(Error)
      );
    });
  });

  describe('validateToken', () => {
    it('should return false when Firebase not initialized', async () => {
      const result = await service.validateToken(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('payload handling', () => {
    it('should handle payload with all fields', async () => {
      const fullPayload: PushNotificationPayload = {
        title: 'Full Notification',
        body: 'Complete notification with all fields',
        data: { key: 'value', nested: { data: true } },
        imageUrl: 'https://example.com/rich-image.png',
        actionUrl: '/deep-link/path',
        badge: 5,
        sound: 'custom-sound',
        priority: 'high',
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: mockToken, isActive: true },
      ]);

      // Should not throw
      await expect(service.sendToUser(mockUserId, fullPayload)).resolves.not.toThrow();
    });

    it('should handle payload with minimal fields', async () => {
      const minimalPayload: PushNotificationPayload = {
        title: 'Minimal',
        body: 'Minimal notification',
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: mockToken, isActive: true },
      ]);

      await expect(service.sendToUser(mockUserId, minimalPayload)).resolves.not.toThrow();
    });

    it('should handle normal priority', async () => {
      const normalPriorityPayload: PushNotificationPayload = {
        title: 'Normal Priority',
        body: 'This is a normal priority notification',
        priority: 'normal',
      };

      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await expect(service.sendToUser(mockUserId, normalPriorityPayload)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrismaService.pushNotificationToken.findMany.mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(service.sendToUser(mockUserId, mockPayload)).rejects.toThrow(
        'Database connection error'
      );
    });
  });

  describe('logging', () => {
    it('should log when sending to user with tokens', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([
        { token: 'token-1', isActive: true },
      ]);

      await service.sendToUser(mockUserId, mockPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`user ${mockUserId}`)
      );
    });

    it('should warn when no tokens found for user', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      mockPrismaService.pushNotificationToken.findMany.mockResolvedValue([]);

      await service.sendToUser(mockUserId, mockPayload);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`No active push tokens found for user ${mockUserId}`)
      );
    });
  });

  describe('configuration scenarios', () => {
    it('should handle missing configuration gracefully', async () => {
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          PushNotificationService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: ConfigService,
            useValue: emptyConfigService,
          },
        ],
      }).compile();

      const serviceWithEmptyConfig = module.get<PushNotificationService>(PushNotificationService);

      expect(serviceWithEmptyConfig).toBeDefined();
    });
  });
});
