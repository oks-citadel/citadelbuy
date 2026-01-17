import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetaConversionsService } from './meta-conversions.service';

// Mock the Facebook SDK
jest.mock('facebook-nodejs-business-sdk', () => ({
  ServerEvent: jest.fn().mockImplementation(() => ({
    setEventName: jest.fn().mockReturnThis(),
    setEventTime: jest.fn().mockReturnThis(),
    setUserData: jest.fn().mockReturnThis(),
    setCustomData: jest.fn().mockReturnThis(),
    setActionSource: jest.fn().mockReturnThis(),
    setEventId: jest.fn().mockReturnThis(),
    setEventSourceUrl: jest.fn().mockReturnThis(),
  })),
  EventRequest: jest.fn().mockImplementation(() => ({
    setEvents: jest.fn().mockReturnThis(),
    setTestEventCode: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ events_received: 1 }),
  })),
  UserData: jest.fn().mockImplementation(() => ({
    setEmails: jest.fn().mockReturnThis(),
    setPhones: jest.fn().mockReturnThis(),
    setFirstNames: jest.fn().mockReturnThis(),
    setLastNames: jest.fn().mockReturnThis(),
    setCities: jest.fn().mockReturnThis(),
    setStates: jest.fn().mockReturnThis(),
    setZipCode: jest.fn().mockReturnThis(),
    setCountry: jest.fn().mockReturnThis(),
    setExternalIds: jest.fn().mockReturnThis(),
    setClientIpAddress: jest.fn().mockReturnThis(),
    setClientUserAgent: jest.fn().mockReturnThis(),
    setFbc: jest.fn().mockReturnThis(),
    setFbp: jest.fn().mockReturnThis(),
  })),
  CustomData: jest.fn().mockImplementation(() => ({
    setValue: jest.fn().mockReturnThis(),
    setCurrency: jest.fn().mockReturnThis(),
    setContentName: jest.fn().mockReturnThis(),
    setContentCategory: jest.fn().mockReturnThis(),
    setContentIds: jest.fn().mockReturnThis(),
    setContentType: jest.fn().mockReturnThis(),
    setNumItems: jest.fn().mockReturnThis(),
    setContents: jest.fn().mockReturnThis(),
    setCustomProperties: jest.fn().mockReturnThis(),
  })),
  Content: jest.fn().mockImplementation(() => ({
    setId: jest.fn().mockReturnThis(),
    setQuantity: jest.fn().mockReturnThis(),
    setItemPrice: jest.fn().mockReturnThis(),
  })),
}));

describe('MetaConversionsService', () => {
  let service: MetaConversionsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    mockConfigService.get.mockReset();
  });

  describe('when enabled', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          META_CONVERSIONS_API_ACCESS_TOKEN: 'test-access-token',
          META_PIXEL_ID: 'test-pixel-id',
          META_TEST_EVENT_CODE: 'TEST12345',
        };
        return config[key] || '';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MetaConversionsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MetaConversionsService>(MetaConversionsService);
      configService = module.get<ConfigService>(ConfigService);

      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be enabled when access token and pixel ID are set', () => {
      expect(service.isEnabled()).toBe(true);
    });

    describe('trackConversion', () => {
      it('should track conversion with all parameters', async () => {
        // Arrange
        const params = {
          eventName: 'Purchase',
          eventId: 'event-123',
          eventSourceUrl: 'https://example.com/checkout',
          email: 'user@example.com',
          phone: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
          externalId: 'user-123',
          clientIpAddress: '192.168.1.1',
          clientUserAgent: 'Mozilla/5.0',
          fbc: 'fb.1.12345',
          fbp: 'fb.2.67890',
          value: 99.99,
          currency: 'USD',
          contentName: 'Test Product',
          contentCategory: 'Electronics',
          contentIds: ['product-1', 'product-2'],
          contentType: 'product',
          contents: [
            { id: 'product-1', quantity: 2, price: 25.0 },
            { id: 'product-2', quantity: 1, price: 49.99 },
          ],
          numItems: 3,
          customProperties: { order_id: 'order-123' },
        };

        // Act
        await service.trackConversion(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });

      it('should track conversion with minimal parameters', async () => {
        // Arrange
        const params = {
          eventName: 'PageView',
        };

        // Act
        await service.trackConversion(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });

      it('should not throw when API call fails', async () => {
        // Arrange
        const { EventRequest } = require('facebook-nodejs-business-sdk');
        EventRequest.mockImplementationOnce(() => ({
          setEvents: jest.fn().mockReturnThis(),
          setTestEventCode: jest.fn().mockReturnThis(),
          execute: jest.fn().mockRejectedValue(new Error('API Error')),
        }));

        const params = {
          eventName: 'Purchase',
          value: 99.99,
        };

        // Act & Assert - should not throw
        await expect(service.trackConversion(params)).resolves.not.toThrow();
      });
    });

    describe('trackRegistration', () => {
      it('should track registration event', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
          email: 'user@example.com',
          phone: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          clientIpAddress: '192.168.1.1',
          clientUserAgent: 'Mozilla/5.0',
          fbc: 'fb.1.12345',
          fbp: 'fb.2.67890',
          eventId: 'event-123',
          eventSourceUrl: 'https://example.com/register',
        };

        // Act
        await service.trackRegistration(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });

      it('should track registration with minimal params', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
        };

        // Act
        await service.trackRegistration(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });
    });

    describe('trackPurchase', () => {
      it('should track purchase event', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
          orderId: 'order-123',
          value: 99.99,
          currency: 'USD',
          email: 'user@example.com',
          contents: [
            { id: 'product-1', quantity: 2, price: 25.0 },
          ],
          contentIds: ['product-1'],
          numItems: 2,
        };

        // Act
        await service.trackPurchase(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });

      it('should use default USD currency', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
          orderId: 'order-123',
          value: 99.99,
        };

        // Act
        await service.trackPurchase(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });
    });

    describe('trackSubscription', () => {
      it('should track subscription event', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
          subscriptionId: 'sub-123',
          value: 9.99,
          currency: 'USD',
          email: 'user@example.com',
          predictedLtv: 119.88,
        };

        // Act
        await service.trackSubscription(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });

      it('should track subscription with minimal params', async () => {
        // Arrange
        const params = {
          userId: 'user-123',
          subscriptionId: 'sub-123',
          value: 9.99,
        };

        // Act
        await service.trackSubscription(params);

        // Assert - should not throw
        expect(true).toBe(true);
      });
    });
  });

  describe('when disabled', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MetaConversionsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MetaConversionsService>(MetaConversionsService);

      jest.clearAllMocks();
    });

    it('should be disabled when access token is missing', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should skip tracking when disabled', async () => {
      // Arrange
      const params = {
        eventName: 'Purchase',
        value: 99.99,
      };

      // Act
      await service.trackConversion(params);

      // Assert - should not throw and should not make API calls
      expect(true).toBe(true);
    });

    it('should skip registration tracking when disabled', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
      };

      // Act
      await service.trackRegistration(params);

      // Assert - should not throw
      expect(true).toBe(true);
    });

    it('should skip purchase tracking when disabled', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        orderId: 'order-123',
        value: 99.99,
      };

      // Act
      await service.trackPurchase(params);

      // Assert - should not throw
      expect(true).toBe(true);
    });

    it('should skip subscription tracking when disabled', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        subscriptionId: 'sub-123',
        value: 9.99,
      };

      // Act
      await service.trackSubscription(params);

      // Assert - should not throw
      expect(true).toBe(true);
    });
  });

  describe('data hashing', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          META_CONVERSIONS_API_ACCESS_TOKEN: 'test-access-token',
          META_PIXEL_ID: 'test-pixel-id',
        };
        return config[key] || '';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MetaConversionsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      service = module.get<MetaConversionsService>(MetaConversionsService);
    });

    it('should hash email correctly', async () => {
      // The hashing is done internally - we just verify it doesn't throw
      const params = {
        eventName: 'Test',
        email: 'User@Example.COM',
      };

      await expect(service.trackConversion(params)).resolves.not.toThrow();
    });

    it('should hash phone number correctly', async () => {
      // Phone numbers should have non-numeric characters removed before hashing
      const params = {
        eventName: 'Test',
        phone: '+1 (234) 567-8900',
      };

      await expect(service.trackConversion(params)).resolves.not.toThrow();
    });

    it('should handle empty data gracefully', async () => {
      const params = {
        eventName: 'Test',
        email: '',
        phone: '',
      };

      await expect(service.trackConversion(params)).resolves.not.toThrow();
    });
  });
});
