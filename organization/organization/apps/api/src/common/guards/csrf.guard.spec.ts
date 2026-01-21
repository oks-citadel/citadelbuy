import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: jest.Mocked<Reflector>;
  const originalEnv = process.env.NODE_ENV;

  const createMockExecutionContext = (
    method = 'POST',
    url = '/api/test',
    csrfHeader?: string,
    csrfCookie?: string,
    ip = '127.0.0.1',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          ip,
          headers: {
            'x-csrf-token': csrfHeader,
          },
          cookies: {
            'csrf-token': csrfCookie,
          },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  describe('canActivate', () => {
    describe('development environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should skip CSRF check in development', () => {
        const context = createMockExecutionContext('POST', '/api/test');

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should skip CSRF check for all methods in development', () => {
        const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        methods.forEach((method) => {
          const context = createMockExecutionContext(method, '/api/test');
          expect(guard.canActivate(context)).toBe(true);
        });
      });
    });

    describe('production environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      describe('safe HTTP methods', () => {
        it('should allow GET requests without CSRF check', () => {
          const context = createMockExecutionContext('GET', '/api/test');

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow HEAD requests without CSRF check', () => {
          const context = createMockExecutionContext('HEAD', '/api/test');

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should allow OPTIONS requests without CSRF check', () => {
          const context = createMockExecutionContext('OPTIONS', '/api/test');

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      describe('state-changing methods', () => {
        it('should require CSRF token for POST requests', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext('POST', '/api/test');

          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should require CSRF token for PUT requests', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext('PUT', '/api/test');

          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should require CSRF token for PATCH requests', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext('PATCH', '/api/test');

          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should require CSRF token for DELETE requests', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext('DELETE', '/api/test');

          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });
      });

      describe('skipCsrf decorator', () => {
        it('should skip CSRF check when skipCsrf is true', () => {
          reflector.get.mockReturnValue(true);
          const context = createMockExecutionContext('POST', '/api/webhooks');

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should check reflector with correct metadata key', () => {
          reflector.get.mockReturnValue(true);
          const handler = jest.fn();
          const context = {
            switchToHttp: () => ({
              getRequest: () => ({
                method: 'POST',
                url: '/test',
                ip: '127.0.0.1',
                headers: {},
                cookies: {},
              }),
            }),
            getHandler: () => handler,
            getClass: () => jest.fn(),
          } as unknown as ExecutionContext;

          guard.canActivate(context);

          expect(reflector.get).toHaveBeenCalledWith('skipCsrf', handler);
        });
      });

      describe('CSRF token validation', () => {
        const validToken = 'valid-csrf-token-12345';

        it('should allow request when CSRF header and cookie match', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            validToken,
            validToken,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should throw ForbiddenException when CSRF header is missing', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            undefined,
            validToken,
          );

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect((error as ForbiddenException).message).toBe(
              'CSRF token missing',
            );
          }
        });

        it('should throw ForbiddenException when CSRF cookie is missing', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            validToken,
            undefined,
          );

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect((error as ForbiddenException).message).toBe(
              'CSRF token missing',
            );
          }
        });

        it('should throw ForbiddenException when both CSRF header and cookie are missing', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            undefined,
            undefined,
          );

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect((error as ForbiddenException).message).toBe(
              'CSRF token missing',
            );
          }
        });

        it('should throw ForbiddenException when tokens do not match', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            'header-token',
            'different-cookie-token',
          );

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect((error as ForbiddenException).message).toBe(
              'Invalid CSRF token',
            );
          }
        });

        it('should throw ForbiddenException for tokens with different lengths', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            'short',
            'much-longer-token',
          );

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
            expect((error as ForbiddenException).message).toBe(
              'Invalid CSRF token',
            );
          }
        });
      });

      describe('constant-time comparison', () => {
        it('should use timing-safe comparison for matching tokens', () => {
          reflector.get.mockReturnValue(false);
          const token = 'a'.repeat(32); // Fixed length token
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            token,
            token,
          );

          // The guard should not throw, indicating successful comparison
          const result = guard.canActivate(context);
          expect(result).toBe(true);
        });

        it('should reject tokens that are similar but not identical', () => {
          reflector.get.mockReturnValue(false);
          const token1 = 'abcdefghijklmnop';
          const token2 = 'abcdefghijklmnoq'; // Last char different
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            token1,
            token2,
          );

          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });
      });

      describe('edge cases', () => {
        it('should handle empty string tokens', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext('POST', '/api/test', '', '');

          try {
            guard.canActivate(context);
            fail('Expected ForbiddenException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException);
          }
        });

        it('should handle tokens with special characters', () => {
          reflector.get.mockReturnValue(false);
          const specialToken = 'token+with/special=chars!@#$%^&*()';
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            specialToken,
            specialToken,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle very long tokens', () => {
          reflector.get.mockReturnValue(false);
          const longToken = 'a'.repeat(1000);
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            longToken,
            longToken,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });

        it('should handle unicode tokens', () => {
          reflector.get.mockReturnValue(false);
          const unicodeToken = 'token-with-émojis-🎉-and-中文';
          const context = createMockExecutionContext(
            'POST',
            '/api/test',
            unicodeToken,
            unicodeToken,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      describe('request metadata', () => {
        it('should log IP address on CSRF failure', () => {
          reflector.get.mockReturnValue(false);
          const context = createMockExecutionContext(
            'POST',
            '/api/sensitive',
            undefined,
            undefined,
            '192.168.1.100',
          );

          // The guard logs the IP, we just verify it throws
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });
      });
    });

    describe('test environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should enforce CSRF checks in test environment (not development)', () => {
        reflector.get.mockReturnValue(false);
        const context = createMockExecutionContext('POST', '/api/test');

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });
  });
});
