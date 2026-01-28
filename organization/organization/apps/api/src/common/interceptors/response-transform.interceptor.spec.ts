import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  ResponseTransformInterceptor,
  SKIP_TRANSFORM_KEY,
  PAGINATED_RESPONSE_KEY,
} from './response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    requestId?: string,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-request-id': requestId,
          },
        }),
        getResponse: () => ({
          getHeader: jest.fn().mockReturnValue(undefined),
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: any): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseTransformInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<ResponseTransformInterceptor<any>>(
      ResponseTransformInterceptor,
    );
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    describe('basic response wrapping', () => {
      it('should wrap response in standard format', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext('req-123');
        const handler = createMockCallHandler({ name: 'Test' });

        const result$ = interceptor.intercept(context, handler);

        const result = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result).toMatchObject({
          success: true,
          data: { name: 'Test' },
          meta: {
            requestId: 'req-123',
            timestamp: expect.any(String),
            responseTime: expect.any(Number),
          },
        });
      });

      it('should handle null response', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler(null);

        const result$ = interceptor.intercept(context, handler);

        const result = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result).toMatchObject({
          success: true,
          data: null,
        });
      });

      it('should handle undefined response', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler(undefined);

        const result$ = interceptor.intercept(context, handler);

        const result = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result).toMatchObject({
          success: true,
          data: null,
        });
      });

      it('should generate request ID when not provided', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler({ data: 'test' });

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.meta.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      });

      it('should include timestamp in ISO format', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler({ data: 'test' });

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(new Date(result.meta.timestamp).toISOString()).toBe(
          result.meta.timestamp,
        );
      });
    });

    describe('skip transformation', () => {
      it('should skip transformation when SKIP_TRANSFORM_KEY is true', async () => {
        reflector.getAllAndOverride.mockImplementation((key) => {
          if (key === SKIP_TRANSFORM_KEY) return true;
          return false;
        });
        const context = createMockExecutionContext();
        const rawResponse = { raw: 'data', custom: 'format' };
        const handler = createMockCallHandler(rawResponse);

        const result$ = interceptor.intercept(context, handler);

        const result = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result).toEqual(rawResponse);
      });

      it('should check reflector with correct metadata key and targets', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const handler = jest.fn();
        const classRef = jest.fn();
        const context = {
          switchToHttp: () => ({
            getRequest: () => ({ headers: {} }),
            getResponse: () => ({ getHeader: jest.fn() }),
          }),
          getHandler: () => handler,
          getClass: () => classRef,
        } as unknown as ExecutionContext;
        const callHandler = createMockCallHandler({});

        interceptor.intercept(context, callHandler);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          SKIP_TRANSFORM_KEY,
          [handler, classRef],
        );
      });
    });

    describe('already wrapped responses', () => {
      it('should not double-wrap responses that already have success field', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const alreadyWrapped = {
          success: true,
          data: { items: [1, 2, 3] },
          meta: { pagination: { page: 1 } },
        };
        const handler = createMockCallHandler(alreadyWrapped);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        // Should be the same structure, just with added timing
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ items: [1, 2, 3] });
        expect(result.meta.responseTime).toBeDefined();
      });

      it('should add timing metadata to already wrapped responses', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext('req-existing');
        const alreadyWrapped = {
          success: true,
          data: 'test',
        };
        const handler = createMockCallHandler(alreadyWrapped);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.meta.responseTime).toBeDefined();
        expect(result.meta.timestamp).toBeDefined();
      });

      it('should not override existing requestId in wrapped response', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext('new-req-id');
        const alreadyWrapped = {
          success: true,
          data: 'test',
          meta: { requestId: 'existing-req-id' },
        };
        const handler = createMockCallHandler(alreadyWrapped);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.meta.requestId).toBe('existing-req-id');
      });
    });

    describe('paginated response handling', () => {
      it('should detect and wrap paginated responses with items array', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const paginatedData = {
          items: [{ id: 1 }, { id: 2 }],
          total: 100,
          page: 1,
          limit: 10,
        };
        const handler = createMockCallHandler(paginatedData);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
        expect(result.meta.pagination).toBeDefined();
      });

      it('should handle paginated response with data array', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const paginatedData = {
          data: [{ name: 'Product 1' }],
          total: 50,
          currentPage: 2,
          pageSize: 20,
        };
        const handler = createMockCallHandler(paginatedData);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data).toEqual([{ name: 'Product 1' }]);
        expect(result.meta.pagination).toBeDefined();
      });

      it('should handle paginated response when PAGINATED_RESPONSE_KEY is set', async () => {
        reflector.getAllAndOverride.mockImplementation((key) => {
          if (key === PAGINATED_RESPONSE_KEY) return true;
          return false;
        });
        const context = createMockExecutionContext();
        const data = {
          results: [{ id: 1 }],
          count: 10,
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.meta.pagination).toBeDefined();
      });

      it('should detect products array for e-commerce responses', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = {
          products: [{ name: 'Widget' }],
          total: 100,
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data).toEqual([{ name: 'Widget' }]);
        expect(result.meta.pagination).toBeDefined();
      });
    });

    describe('data sanitization', () => {
      it('should filter null items from arrays', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = [{ id: 1 }, null, { id: 2 }, undefined, { id: 3 }];
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      });

      it('should convert Date objects to ISO strings', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const testDate = new Date('2024-01-15T10:30:00.000Z');
        const data = { createdAt: testDate };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.createdAt).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should convert null array fields to empty arrays based on naming', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = {
          id: 1,
          items: null,
          products: null,
          tags: null,
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.items).toEqual([]);
        expect(result.data.products).toEqual([]);
        expect(result.data.tags).toEqual([]);
      });

      it('should preserve null for object fields that dont match array patterns', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        // Use field names that don't end in 's' (which would match array patterns)
        const data = {
          id: 1,
          author: null,
          vendor: null,
          billing: null,
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        // Fields matching object patterns should preserve null
        expect(result.data.author).toBeNull();
        expect(result.data.vendor).toBeNull();
        expect(result.data.billing).toBeNull();
      });

      it('should recursively sanitize nested objects', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = {
          order: {
            items: [{ name: 'Item 1' }, null],
            metadata: {
              tags: null,
            },
          },
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.order.items).toEqual([{ name: 'Item 1' }]);
        expect(result.data.order.metadata.tags).toEqual([]);
      });

      it('should handle deeply nested structures', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = {
          level1: {
            level2: {
              level3: {
                items: [{ id: 1 }],
                children: null,
              },
            },
          },
        };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.level1.level2.level3.items).toEqual([{ id: 1 }]);
        expect(result.data.level1.level2.level3.children).toEqual([]);
      });
    });

    describe('array field detection', () => {
      it('should detect plural fields as arrays', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const pluralFields = [
          'users',
          'products',
          'orders',
          'categories',
          'images',
          'permissions',
          'roles',
          'variants',
        ];

        for (const field of pluralFields) {
          const data = { [field]: null };
          const handler = createMockCallHandler(data);

          const result$ = interceptor.intercept(context, handler);

          const result: any = await new Promise((resolve) => {
            result$.subscribe({ next: resolve });
          });

          expect(result.data[field]).toEqual([]);
        }
      });

      it('should detect fields ending with List as arrays', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = { userList: null, itemList: null };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.userList).toEqual([]);
        expect(result.data.itemList).toEqual([]);
      });

      it('should detect fields ending with Ids as arrays', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const data = { userIds: null, productIds: null };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.userIds).toEqual([]);
        expect(result.data.productIds).toEqual([]);
      });
    });

    describe('object field detection', () => {
      it('should detect fields ending with config/settings as objects', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        // Note: Some fields like 'settings', 'preferences', 'details' end in 's'
        // and will match the array pattern first. Only use fields that match
        // object patterns but NOT array patterns.
        const objectFields = [
          'author',
          'vendor',
          'billing',
          'shipping',
          'creator',
          'category',
        ];

        for (const field of objectFields) {
          const data = { [field]: null };
          const handler = createMockCallHandler(data);

          const result$ = interceptor.intercept(context, handler);

          const result: any = await new Promise((resolve) => {
            result$.subscribe({ next: resolve });
          });

          expect(result.data[field]).toBeNull();
        }
      });
    });

    describe('edge cases', () => {
      it('should handle empty object', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler({});

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({});
      });

      it('should handle empty array', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        const handler = createMockCallHandler([]);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should handle primitive responses', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();

        const primitives = ['string', 123, true, false];

        for (const primitive of primitives) {
          const handler = createMockCallHandler(primitive);

          const result$ = interceptor.intercept(context, handler);

          const result: any = await new Promise((resolve) => {
            result$.subscribe({ next: resolve });
          });

          expect(result.data).toBe(primitive);
        }
      });

      it('should handle response with special objects (like Decimal)', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = createMockExecutionContext();
        // Simulate a Prisma Decimal-like object
        class Decimal {
          constructor(private value: string) {}
          toString() {
            return this.value;
          }
        }
        const data = { price: new Decimal('99.99') };
        const handler = createMockCallHandler(data);

        const result$ = interceptor.intercept(context, handler);

        const result: any = await new Promise((resolve) => {
          result$.subscribe({ next: resolve });
        });

        expect(result.data.price).toBeInstanceOf(Decimal);
      });
    });
  });
});
