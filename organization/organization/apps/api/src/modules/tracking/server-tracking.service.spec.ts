import { Test, TestingModule } from '@nestjs/testing';
import { ServerTrackingService } from './server-tracking.service';
import { MetaConversionsService } from './meta-conversions.service';
import { TikTokEventsService } from './tiktok-events.service';

describe('ServerTrackingService', () => {
  let service: ServerTrackingService;
  let metaConversionsService: MetaConversionsService;
  let tiktokEventsService: TikTokEventsService;

  const mockMetaConversionsService = {
    trackRegistration: jest.fn(),
    trackPurchase: jest.fn(),
    trackSubscription: jest.fn(),
    isEnabled: jest.fn(),
  };

  const mockTikTokEventsService = {
    trackRegistration: jest.fn(),
    trackPurchase: jest.fn(),
    trackSubscription: jest.fn(),
    isEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerTrackingService,
        {
          provide: MetaConversionsService,
          useValue: mockMetaConversionsService,
        },
        {
          provide: TikTokEventsService,
          useValue: mockTikTokEventsService,
        },
      ],
    }).compile();

    service = module.get<ServerTrackingService>(ServerTrackingService);
    metaConversionsService = module.get<MetaConversionsService>(MetaConversionsService);
    tiktokEventsService = module.get<TikTokEventsService>(TikTokEventsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackRegistration', () => {
    it('should track registration across all platforms', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        email: 'user@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        fbc: 'fb.1.12345',
        fbp: 'fb.2.67890',
        ttclid: 'tiktok-click-id',
        eventId: 'event-123',
        pageUrl: 'https://example.com/register',
      };
      mockMetaConversionsService.trackRegistration.mockResolvedValue(undefined);
      mockTikTokEventsService.trackRegistration.mockResolvedValue(undefined);

      // Act
      await service.trackRegistration(params);

      // Assert
      expect(mockMetaConversionsService.trackRegistration).toHaveBeenCalledWith({
        userId: params.userId,
        email: params.email,
        phone: params.phone,
        firstName: params.firstName,
        lastName: params.lastName,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: params.fbp,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
      });
      expect(mockTikTokEventsService.trackRegistration).toHaveBeenCalledWith({
        userId: params.userId,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
      });
    });

    it('should track registration with minimal params', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
      };
      mockMetaConversionsService.trackRegistration.mockResolvedValue(undefined);
      mockTikTokEventsService.trackRegistration.mockResolvedValue(undefined);

      // Act
      await service.trackRegistration(params);

      // Assert
      expect(mockMetaConversionsService.trackRegistration).toHaveBeenCalled();
      expect(mockTikTokEventsService.trackRegistration).toHaveBeenCalled();
    });

    it('should continue if one platform fails', async () => {
      // Arrange
      const params = { userId: 'user-123' };
      mockMetaConversionsService.trackRegistration.mockRejectedValue(
        new Error('Meta API error'),
      );
      mockTikTokEventsService.trackRegistration.mockResolvedValue(undefined);

      // Act & Assert - should not throw
      await expect(service.trackRegistration(params)).resolves.not.toThrow();
    });
  });

  describe('trackPurchase', () => {
    it('should track purchase across all platforms', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        orderId: 'order-123',
        value: 99.99,
        currency: 'USD',
        email: 'user@example.com',
        phone: '+1234567890',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        fbc: 'fb.1.12345',
        ttclid: 'tiktok-click-id',
        eventId: 'event-123',
        pageUrl: 'https://example.com/checkout/success',
        items: [
          { id: 'product-1', name: 'Product 1', quantity: 2, price: 25.0 },
          { id: 'product-2', name: 'Product 2', quantity: 1, price: 49.99 },
        ],
        numItems: 3,
      };
      mockMetaConversionsService.trackPurchase.mockResolvedValue(undefined);
      mockTikTokEventsService.trackPurchase.mockResolvedValue(undefined);

      // Act
      await service.trackPurchase(params);

      // Assert
      expect(mockMetaConversionsService.trackPurchase).toHaveBeenCalledWith({
        userId: params.userId,
        orderId: params.orderId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        firstName: undefined,
        lastName: undefined,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: undefined,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
        contents: [
          { id: 'product-1', quantity: 2, price: 25.0 },
          { id: 'product-2', quantity: 1, price: 49.99 },
        ],
        contentIds: ['product-1', 'product-2'],
        numItems: params.numItems,
      });
      expect(mockTikTokEventsService.trackPurchase).toHaveBeenCalledWith({
        userId: params.userId,
        orderId: params.orderId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
        contents: [
          { content_id: 'product-1', content_name: 'Product 1', quantity: 2, price: 25.0 },
          { content_id: 'product-2', content_name: 'Product 2', quantity: 1, price: 49.99 },
        ],
        quantity: params.numItems,
      });
    });

    it('should track purchase without items', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        orderId: 'order-123',
        value: 99.99,
      };
      mockMetaConversionsService.trackPurchase.mockResolvedValue(undefined);
      mockTikTokEventsService.trackPurchase.mockResolvedValue(undefined);

      // Act
      await service.trackPurchase(params);

      // Assert
      expect(mockMetaConversionsService.trackPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: undefined,
          contentIds: undefined,
        }),
      );
    });

    it('should continue if one platform fails', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        orderId: 'order-123',
        value: 99.99,
      };
      mockMetaConversionsService.trackPurchase.mockResolvedValue(undefined);
      mockTikTokEventsService.trackPurchase.mockRejectedValue(
        new Error('TikTok API error'),
      );

      // Act & Assert - should not throw
      await expect(service.trackPurchase(params)).resolves.not.toThrow();
    });
  });

  describe('trackSubscription', () => {
    it('should track subscription across all platforms', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        subscriptionId: 'sub-123',
        value: 9.99,
        currency: 'USD',
        email: 'user@example.com',
        phone: '+1234567890',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        fbc: 'fb.1.12345',
        ttclid: 'tiktok-click-id',
        eventId: 'event-123',
        pageUrl: 'https://example.com/subscribe/success',
        predictedLtv: 119.88,
      };
      mockMetaConversionsService.trackSubscription.mockResolvedValue(undefined);
      mockTikTokEventsService.trackSubscription.mockResolvedValue(undefined);

      // Act
      await service.trackSubscription(params);

      // Assert
      expect(mockMetaConversionsService.trackSubscription).toHaveBeenCalledWith({
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        clientIpAddress: params.ipAddress,
        clientUserAgent: params.userAgent,
        fbc: params.fbc,
        fbp: undefined,
        eventId: params.eventId,
        eventSourceUrl: params.pageUrl,
        predictedLtv: params.predictedLtv,
      });
      expect(mockTikTokEventsService.trackSubscription).toHaveBeenCalledWith({
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        value: params.value,
        currency: params.currency,
        email: params.email,
        phone: params.phone,
        ip: params.ipAddress,
        userAgent: params.userAgent,
        ttclid: params.ttclid,
        eventId: params.eventId,
        pageUrl: params.pageUrl,
      });
    });

    it('should track subscription with minimal params', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        subscriptionId: 'sub-123',
        value: 9.99,
      };
      mockMetaConversionsService.trackSubscription.mockResolvedValue(undefined);
      mockTikTokEventsService.trackSubscription.mockResolvedValue(undefined);

      // Act
      await service.trackSubscription(params);

      // Assert
      expect(mockMetaConversionsService.trackSubscription).toHaveBeenCalled();
      expect(mockTikTokEventsService.trackSubscription).toHaveBeenCalled();
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      // Arrange
      const request = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
        connection: {},
        socket: {},
      };

      // Act
      const result = service.getClientIp(request);

      // Assert
      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      // Arrange
      const request = {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
        connection: {},
        socket: {},
      };

      // Act
      const result = service.getClientIp(request);

      // Assert
      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from connection.remoteAddress', () => {
      // Arrange
      const request = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.1',
        },
        socket: {},
      };

      // Act
      const result = service.getClientIp(request);

      // Assert
      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from socket.remoteAddress', () => {
      // Arrange
      const request = {
        headers: {},
        connection: {},
        socket: {
          remoteAddress: '192.168.1.1',
        },
      };

      // Act
      const result = service.getClientIp(request);

      // Assert
      expect(result).toBe('192.168.1.1');
    });

    it('should return empty string when no IP found', () => {
      // Arrange
      const request = {
        headers: {},
        connection: {},
        socket: {},
      };

      // Act
      const result = service.getClientIp(request);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('getUserAgent', () => {
    it('should extract user agent from headers', () => {
      // Arrange
      const request = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      // Act
      const result = service.getUserAgent(request);

      // Assert
      expect(result).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('should return empty string when no user agent', () => {
      // Arrange
      const request = {
        headers: {},
      };

      // Act
      const result = service.getUserAgent(request);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('isEnabled', () => {
    it('should return true when at least one platform is enabled', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(true);
      mockTikTokEventsService.isEnabled.mockReturnValue(false);

      // Act
      const result = service.isEnabled();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when both platforms are enabled', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(true);
      mockTikTokEventsService.isEnabled.mockReturnValue(true);

      // Act
      const result = service.isEnabled();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no platforms are enabled', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(false);
      mockTikTokEventsService.isEnabled.mockReturnValue(false);

      // Act
      const result = service.isEnabled();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status of all platforms', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(true);
      mockTikTokEventsService.isEnabled.mockReturnValue(false);

      // Act
      const result = service.getStatus();

      // Assert
      expect(result).toEqual({
        meta: true,
        tiktok: false,
        overall: true,
      });
    });

    it('should return all disabled when no platforms enabled', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(false);
      mockTikTokEventsService.isEnabled.mockReturnValue(false);

      // Act
      const result = service.getStatus();

      // Assert
      expect(result).toEqual({
        meta: false,
        tiktok: false,
        overall: false,
      });
    });

    it('should return all enabled when both platforms enabled', () => {
      // Arrange
      mockMetaConversionsService.isEnabled.mockReturnValue(true);
      mockTikTokEventsService.isEnabled.mockReturnValue(true);

      // Act
      const result = service.getStatus();

      // Assert
      expect(result).toEqual({
        meta: true,
        tiktok: true,
        overall: true,
      });
    });
  });
});
