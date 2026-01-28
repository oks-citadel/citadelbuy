import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

// Mock UserRole enum since Prisma client may not be available
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  MODERATOR = 'MODERATOR',
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    user?: { id: string; role: string },
    method = 'GET',
    url = '/api/test',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          method,
          url,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    describe('when no roles are required', () => {
      it('should allow access when requiredRoles is undefined', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when requiredRoles is empty array', () => {
        reflector.getAllAndOverride.mockReturnValue([]);
        const context = createMockExecutionContext();

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('when user is not authenticated', () => {
      it('should throw UnauthorizedException when no user in request', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext(undefined);

        try {
          guard.canActivate(context);
          fail('Expected UnauthorizedException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          const response = (error as UnauthorizedException).getResponse();
          expect(response).toMatchObject({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Authentication required to access this resource.',
            errorCode: 'AUTH_REQUIRED',
          });
        }
      });
    });

    describe('when user has required role', () => {
      it('should allow access when user has exact required role', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.ADMIN,
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when user has one of multiple required roles', () => {
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.VENDOR,
        ]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.VENDOR,
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access for first role in required roles list', () => {
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MODERATOR,
          UserRole.VENDOR,
        ]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.ADMIN,
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access for last role in required roles list', () => {
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MODERATOR,
          UserRole.VENDOR,
        ]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.VENDOR,
        });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('when user lacks required role', () => {
      it('should throw ForbiddenException when user role does not match', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.USER,
        });

        try {
          guard.canActivate(context);
          fail('Expected ForbiddenException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenException);
          const response = (error as ForbiddenException).getResponse();
          expect(response).toMatchObject({
            statusCode: 403,
            error: 'Forbidden',
            errorCode: 'INSUFFICIENT_ROLE',
            requiredRoles: [UserRole.ADMIN],
            userRole: UserRole.USER,
          });
        }
      });

      it('should include all required roles in error response', () => {
        const requiredRoles = [UserRole.ADMIN, UserRole.VENDOR];
        reflector.getAllAndOverride.mockReturnValue(requiredRoles);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.USER,
        });

        try {
          guard.canActivate(context);
          fail('Expected ForbiddenException to be thrown');
        } catch (error) {
          const response = (error as ForbiddenException).getResponse();
          expect(response).toMatchObject({
            requiredRoles,
            userRole: UserRole.USER,
            message: expect.stringContaining('ADMIN'),
          });
          expect((response as any).message).toContain('VENDOR');
        }
      });

      it('should throw ForbiddenException when user has different role than any required', () => {
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MODERATOR,
        ]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.VENDOR,
        });

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    describe('reflector usage', () => {
      it('should call reflector with correct metadata key and targets', () => {
        const handler = jest.fn();
        const classRef = jest.fn();
        reflector.getAllAndOverride.mockReturnValue([]);

        const context = {
          switchToHttp: () => ({
            getRequest: () => ({ user: null, method: 'GET', url: '/test' }),
          }),
          getHandler: () => handler,
          getClass: () => classRef,
        } as unknown as ExecutionContext;

        guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
          handler,
          classRef,
        ]);
      });
    });

    describe('edge cases', () => {
      it('should handle user object with additional properties', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({
          id: 'user-123',
          role: UserRole.ADMIN,
        });
        // Add extra properties to the request user
        const req = context.switchToHttp().getRequest();
        (req as any).user.email = 'test@example.com';
        (req as any).user.permissions = ['read', 'write'];

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle various HTTP methods', () => {
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        methods.forEach((method) => {
          const context = createMockExecutionContext(
            { id: 'user-123', role: UserRole.ADMIN },
            method,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });
      });

      it('should handle various URL paths', () => {
        const urls = [
          '/api/admin',
          '/api/products/123',
          '/api/orders?status=pending',
          '/api/users/abc-def-ghi',
        ];
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        urls.forEach((url) => {
          const context = createMockExecutionContext(
            { id: 'user-123', role: UserRole.ADMIN },
            'GET',
            url,
          );

          const result = guard.canActivate(context);

          expect(result).toBe(true);
        });
      });
    });
  });
});
