import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const createMockExecutionContext = (
    method = 'GET',
    url = '/api/test',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const context = createMockExecutionContext();

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toEqual(mockUser);
    });

    it('should throw the error when err is provided', () => {
      const context = createMockExecutionContext();
      const error = new Error('Custom auth error');

      expect(() => guard.handleRequest(error, null, null, context)).toThrow(
        'Custom auth error',
      );
    });

    it('should throw UnauthorizedException with TOKEN_EXPIRED code when token is expired', () => {
      const context = createMockExecutionContext('POST', '/api/orders');
      const expiredError = new TokenExpiredError('jwt expired', new Date());

      try {
        guard.handleRequest(null, null, expiredError, context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has expired. Please login again.',
          errorCode: 'TOKEN_EXPIRED',
        });
      }
    });

    it('should throw UnauthorizedException with INVALID_TOKEN code for JWT errors', () => {
      const context = createMockExecutionContext();
      const jwtError = new JsonWebTokenError('invalid signature');

      try {
        guard.handleRequest(null, null, jwtError, context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid authentication token.',
          errorCode: 'INVALID_TOKEN',
        });
      }
    });

    it('should throw UnauthorizedException with TOKEN_MISSING code when no auth token', () => {
      const context = createMockExecutionContext();
      const info = { message: 'No auth token' };

      try {
        guard.handleRequest(null, null, info, context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required. Please provide a valid token.',
          errorCode: 'TOKEN_MISSING',
        });
      }
    });

    it('should throw UnauthorizedException with AUTH_FAILED code for unknown errors', () => {
      const context = createMockExecutionContext();
      const info = { message: 'Some unknown error' };

      try {
        guard.handleRequest(null, null, info, context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Some unknown error',
          errorCode: 'AUTH_FAILED',
        });
      }
    });

    it('should throw UnauthorizedException with generic message when no info provided', () => {
      const context = createMockExecutionContext();

      try {
        guard.handleRequest(null, null, null, context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const response = (error as UnauthorizedException).getResponse();
        expect(response).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication failed',
          errorCode: 'AUTH_FAILED',
        });
      }
    });

    it('should handle various HTTP methods correctly', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const mockUser = { id: 'user-123' };

      methods.forEach((method) => {
        const context = createMockExecutionContext(method, '/api/resource');
        const result = guard.handleRequest(null, mockUser, null, context);
        expect(result).toEqual(mockUser);
      });
    });

    it('should handle user object with various properties', () => {
      const context = createMockExecutionContext();
      const complexUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
        permissions: ['read', 'write'],
        metadata: { lastLogin: new Date() },
      };

      const result = guard.handleRequest(null, complexUser, null, context);

      expect(result).toEqual(complexUser);
    });
  });
});
