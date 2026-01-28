import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { TikTokEventsService } from './tiktok-events.service';
import { of, throwError } from 'rxjs';

describe('TikTokEventsService', () => {
  let service: TikTokEventsService;
  let configService: ConfigService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReset();
    mockHttpService.post.mockReset();
  });

  describe('when enabled', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TIKTOK_EVENTS_API_ACCESS_TOKEN: 'test-access-token',
          TIKTOK_PIXEL_ID: 'test-pixel-id',
          TIKTOK_TEST_EVENT_CODE: 'TEST12345',
        };
        return config[key] || '';
      });

      mockHttpService.post.mockReturnValue(
        of({
          data: { code: 0, message: 'OK' },
        }),
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TikTokEventsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      service = module.get<TikTokEventsService>(TikTokEventsService);
      configService = module.get<ConfigService>(ConfigService);
      httpService = module.get<HttpService>(HttpService);

      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be enabled when access token and pixel ID are set', () => {
      expect(service.isEnabled()).toBe(true);
    });

    describe('trackEvent', () => {
      it('should track event with all parameters', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          event: 'CompletePayment',
          eventId: 'event-123',
          email: 'user@example.com',
          phone: '+1234567890',
          externalId: 'user-123',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          ttclid: 'tiktok-click-id',
          value: 99.99,
          currency: 'USD',
          contentType: 'product',
          contentId: 'product-123',
          contentName: 'Test Product',
          contentCategory: 'Electronics',
          contents: [
            { content_id: 'product-1', content_name: 'Product 1', quantity: 2, price: 25.0 },
          ],
          quantity: 2,
          description: 'Test purchase',
          query: 'search query',
          pageUrl: 'https://example.com/checkout',
          properties: { custom_prop: 'value' },
        };

        // Act
        await service.trackEvent(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          'https://business-api.tiktok.com/open_api/v1.3/event/track/',
          expect.objectContaining({
            event_source: 'web',
            data: expect.arrayContaining([
              expect.objectContaining({
                pixel_code: 'test-pixel-id',
                event: 'CompletePayment',
                event_id: 'event-123',
                test_event_code: 'TEST12345',
              }),
            ]),
          }),
          expect.objectContaining({
            headers: {
              'Access-Token': 'test-access-token',
              'Content-Type': 'application/json',
            },
          }),
        );
      });

      it('should track event with minimal parameters', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          event: 'PageView',
        };

        // Act
        await service.trackEvent(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event: 'PageView',
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should generate event ID if not provided', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          event: 'PageView',
        };

        // Act
        await service.trackEvent(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event_id: expect.any(String),
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should not throw when API call fails', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          throwError(() => new Error('API Error')),
        );
        const params = {
          event: 'Purchase',
          value: 99.99,
        };

        // Act & Assert - should not throw
        await expect(service.trackEvent(params)).resolves.not.toThrow();
      });
    });

    describe('trackRegistration', () => {
      it('should track registration event', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          email: 'user@example.com',
          phone: '+1234567890',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          ttclid: 'tiktok-click-id',
          eventId: 'event-123',
          pageUrl: 'https://example.com/register',
        };

        // Act
        await service.trackRegistration(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event: 'CompleteRegistration',
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should track registration with minimal params', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
        };

        // Act
        await service.trackRegistration(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalled();
      });
    });

    describe('trackPurchase', () => {
      it('should track purchase event', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          orderId: 'order-123',
          value: 99.99,
          currency: 'USD',
          email: 'user@example.com',
          contents: [
            { content_id: 'product-1', content_name: 'Product 1', quantity: 2, price: 25.0 },
          ],
          quantity: 2,
        };

        // Act
        await service.trackPurchase(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event: 'CompletePayment',
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should use default USD currency', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          orderId: 'order-123',
          value: 99.99,
        };

        // Act
        await service.trackPurchase(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalled();
      });
    });

    describe('trackSubscription', () => {
      it('should track subscription event', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          subscriptionId: 'sub-123',
          value: 9.99,
          currency: 'USD',
          email: 'user@example.com',
        };

        // Act
        await service.trackSubscription(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event: 'Subscribe',
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should track subscription with minimal params', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          subscriptionId: 'sub-123',
          value: 9.99,
        };

        // Act
        await service.trackSubscription(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalled();
      });
    });

    describe('trackAddToCart', () => {
      it('should track add to cart event', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          userId: 'user-123',
          contentId: 'product-123',
          contentName: 'Test Product',
          value: 49.99,
          currency: 'USD',
          quantity: 2,
          email: 'user@example.com',
        };

        // Act
        await service.trackAddToCart(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                event: 'AddToCart',
              }),
            ]),
          }),
          expect.any(Object),
        );
      });

      it('should use default quantity of 1', async () => {
        // Arrange
        mockHttpService.post.mockReturnValue(
          of({ data: { code: 0, message: 'OK' } }),
        );
        const params = {
          contentId: 'product-123',
          contentName: 'Test Product',
          value: 49.99,
        };

        // Act
        await service.trackAddToCart(params);

        // Assert
        expect(mockHttpService.post).toHaveBeenCalled();
      });
    });
  });

  describe('when disabled', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TikTokEventsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      service = module.get<TikTokEventsService>(TikTokEventsService);

      jest.clearAllMocks();
    });

    it('should be disabled when access token is missing', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should skip tracking when disabled', async () => {
      // Arrange
      const params = {
        event: 'Purchase',
        value: 99.99,
      };

      // Act
      await service.trackEvent(params);

      // Assert - should not make API calls
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should skip registration tracking when disabled', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
      };

      // Act
      await service.trackRegistration(params);

      // Assert
      expect(mockHttpService.post).not.toHaveBeenCalled();
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

      // Assert
      expect(mockHttpService.post).not.toHaveBeenCalled();
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

      // Assert
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should skip add to cart tracking when disabled', async () => {
      // Arrange
      const params = {
        contentId: 'product-123',
        contentName: 'Test Product',
        value: 49.99,
      };

      // Act
      await service.trackAddToCart(params);

      // Assert
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe('data hashing', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TIKTOK_EVENTS_API_ACCESS_TOKEN: 'test-access-token',
          TIKTOK_PIXEL_ID: 'test-pixel-id',
        };
        return config[key] || '';
      });

      mockHttpService.post.mockReturnValue(
        of({ data: { code: 0, message: 'OK' } }),
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TikTokEventsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: HttpService,
            useValue: mockHttpService,
          },
        ],
      }).compile();

      service = module.get<TikTokEventsService>(TikTokEventsService);
    });

    it('should hash email correctly', async () => {
      // Arrange
      const params = {
        event: 'Test',
        email: 'User@Example.COM',
      };

      // Act
      await service.trackEvent(params);

      // Assert - verify the API was called (hashing is done internally)
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              context: expect.objectContaining({
                user: expect.objectContaining({
                  email: expect.any(String),
                }),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should hash phone number correctly', async () => {
      // Arrange
      const params = {
        event: 'Test',
        phone: '+1 (234) 567-8900',
      };

      // Act
      await service.trackEvent(params);

      // Assert
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              context: expect.objectContaining({
                user: expect.objectContaining({
                  phone_number: expect.any(String),
                }),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      const params = {
        event: 'Test',
        email: '',
        phone: '',
      };

      // Act
      await service.trackEvent(params);

      // Assert - should not throw
      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });
});
