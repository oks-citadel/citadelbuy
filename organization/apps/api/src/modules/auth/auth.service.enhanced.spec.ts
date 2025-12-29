import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';

jest.mock('bcryptjs');

describe('AuthService - Enhanced Tests', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;
  let emailService: EmailService;
  let configService: ConfigService;
  let trackingService: ServerTrackingService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordReset: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '30d',
        GOOGLE_CLIENT_ID: 'google-client-id',
        FACEBOOK_APP_ID: 'facebook-app-id',
        FACEBOOK_APP_SECRET: 'facebook-app-secret',
        APPLE_CLIENT_ID: 'com.broxiva.app',
      };
      return config[key];
    }),
  };

  const mockTrackingService = {
    isEnabled: jest.fn().mockReturnValue(false),
    getClientIp: jest.fn(),
    getUserAgent: jest.fn(),
    trackRegistration: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ServerTrackingService,
          useValue: mockTrackingService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    trackingService = module.get<ServerTrackingService>(ServerTrackingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Refresh Token Operations', () => {
    describe('login', () => {
      it('should return access token and refresh token', async () => {
        // Arrange
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
        };

        const mockAccessToken = 'jwt-access-token';
        const mockRefreshToken = 'jwt-refresh-token';

        mockJwtService.sign
          .mockReturnValueOnce(mockAccessToken)
          .mockReturnValueOnce(mockRefreshToken);

        // Act
        const result = await service.login(mockUser);

        // Assert
        expect(result).toEqual({
          user: mockUser,
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
        });

        expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(1, {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'CUSTOMER',
        });
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          2,
          { sub: 'user-123', type: 'refresh' },
          {
            secret: 'test-refresh-secret',
            expiresIn: '30d',
          },
        );
      });

      it('should use JWT_SECRET as fallback for refresh token', async () => {
        // Arrange
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
        };

        mockConfigService.get = jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          if (key === 'JWT_REFRESH_SECRET') return undefined;
          if (key === 'JWT_REFRESH_EXPIRES_IN') return undefined;
          return undefined;
        });

        mockJwtService.sign.mockReturnValue('token');

        // Act
        await service.login(mockUser);

        // Assert
        expect(mockJwtService.sign).toHaveBeenNthCalledWith(
          2,
          { sub: 'user-123', type: 'refresh' },
          {
            secret: 'test-secret',
            expiresIn: '30d',
          },
        );
      });
    });

    describe('refreshToken', () => {
      it('should refresh tokens successfully', async () => {
        // Arrange
        const refreshToken = 'valid-refresh-token';
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'CUSTOMER',
        };

        const mockPayload = {
          sub: 'user-123',
          type: 'refresh',
        };

        const newAccessToken = 'new-access-token';
        const newRefreshToken = 'new-refresh-token';

        mockJwtService.verify.mockReturnValue(mockPayload);
        mockUsersService.findById.mockResolvedValue(mockUser);
        mockJwtService.sign
          .mockReturnValueOnce(newAccessToken)
          .mockReturnValueOnce(newRefreshToken);

        // Act
        const result = await service.refreshToken(refreshToken);

        // Assert
        expect(result).toEqual({
          user: mockUser,
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        });

        expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
          secret: 'test-refresh-secret',
        });
        expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
      });

      it('should throw UnauthorizedException for invalid token type', async () => {
        // Arrange
        const refreshToken = 'invalid-token';
        const mockPayload = {
          sub: 'user-123',
          type: 'access', // Wrong type
        };

        mockJwtService.verify.mockReturnValue(mockPayload);

        // Act & Assert
        await expect(service.refreshToken(refreshToken)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken(refreshToken)).rejects.toThrow(
          'Invalid token type',
        );
      });

      it('should throw UnauthorizedException if user not found', async () => {
        // Arrange
        const refreshToken = 'valid-token';
        const mockPayload = {
          sub: 'nonexistent-user',
          type: 'refresh',
        };

        mockJwtService.verify.mockReturnValue(mockPayload);
        mockUsersService.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.refreshToken(refreshToken)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken(refreshToken)).rejects.toThrow(
          'User not found',
        );
      });

      it('should throw UnauthorizedException for expired token', async () => {
        // Arrange
        const expiredToken = 'expired-token';
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('Token expired');
        });

        // Act & Assert
        await expect(service.refreshToken(expiredToken)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken(expiredToken)).rejects.toThrow(
          'Invalid or expired refresh token',
        );
      });

      it('should throw UnauthorizedException for malformed token', async () => {
        // Arrange
        const malformedToken = 'malformed-token';
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('jwt malformed');
        });

        // Act & Assert
        await expect(service.refreshToken(malformedToken)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('Password Reset Operations', () => {
    describe('forgotPassword', () => {
      it('should create password reset token and send email', async () => {
        // Arrange
        const email = 'test@example.com';
        const mockUser = {
          id: 'user-123',
          email,
          name: 'Test User',
        };

        const mockResetRecord = {
          id: 'reset-123',
          email,
          token: 'hashed-token',
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        };

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
        mockPrismaService.passwordReset.create.mockResolvedValue(mockResetRecord);

        // Act
        const result = await service.forgotPassword(email);

        // Assert
        expect(result).toEqual({
          message: 'If the email exists, a password reset link has been sent',
        });

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
        expect(mockPrismaService.passwordReset.create).toHaveBeenCalled();
        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
          email,
          expect.objectContaining({
            name: 'Test User',
            resetToken: expect.any(String),
          }),
        );
      });

      it('should not reveal if email does not exist', async () => {
        // Arrange
        const email = 'nonexistent@example.com';
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act
        const result = await service.forgotPassword(email);

        // Assert
        expect(result).toEqual({
          message: 'If the email exists, a password reset link has been sent',
        });

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
        expect(mockPrismaService.passwordReset.create).not.toHaveBeenCalled();
        expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it('should set token expiration to 1 hour', async () => {
        // Arrange
        const email = 'test@example.com';
        const mockUser = {
          id: 'user-123',
          email,
          name: 'Test User',
        };

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
        mockPrismaService.passwordReset.create.mockResolvedValue({});

        // Act
        await service.forgotPassword(email);

        // Assert
        expect(mockPrismaService.passwordReset.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            email,
            expiresAt: expect.any(Date),
          }),
        });

        const callArgs = mockPrismaService.passwordReset.create.mock.calls[0][0];
        const expiresAt = callArgs.data.expiresAt;
        const expectedExpiry = Date.now() + 3600000; // 1 hour
        const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry);

        // Allow 1 second tolerance
        expect(timeDiff).toBeLessThan(1000);
      });
    });

    describe('resetPassword', () => {
      it('should reset password successfully', async () => {
        // Arrange
        const token = 'plain-token';
        const newPassword = 'newPassword123';

        const mockResetRecord = {
          id: 'reset-123',
          email: 'test@example.com',
          token: 'hashed-token',
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        };

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        };

        mockPrismaService.passwordReset.findMany.mockResolvedValue([mockResetRecord]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
        mockPrismaService.user.update.mockResolvedValue(mockUser);
        mockPrismaService.passwordReset.update.mockResolvedValue({});

        // Act
        const result = await service.resetPassword(token, newPassword);

        // Assert
        expect(result).toEqual({
          message: 'Password has been reset successfully',
        });

        expect(mockPrismaService.user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { password: 'new-hashed-password' },
        });

        expect(mockPrismaService.passwordReset.update).toHaveBeenCalledWith({
          where: { id: 'reset-123' },
          data: { used: true },
        });
      });

      it('should throw BadRequestException for invalid token', async () => {
        // Arrange
        const token = 'invalid-token';
        const newPassword = 'newPassword123';

        mockPrismaService.passwordReset.findMany.mockResolvedValue([]);

        // Act & Assert
        await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
          'Invalid or expired reset token',
        );
      });

      it('should throw BadRequestException for expired token', async () => {
        // Arrange
        const token = 'expired-token';
        const newPassword = 'newPassword123';

        mockPrismaService.passwordReset.findMany.mockResolvedValue([]); // No valid records

        // Act & Assert
        await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw NotFoundException if user not found', async () => {
        // Arrange
        const token = 'valid-token';
        const newPassword = 'newPassword123';

        const mockResetRecord = {
          id: 'reset-123',
          email: 'test@example.com',
          token: 'hashed-token',
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        };

        mockPrismaService.passwordReset.findMany.mockResolvedValue([mockResetRecord]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockUsersService.findByEmail.mockResolvedValue(null);

        // Act & Assert
        await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.resetPassword(token, newPassword)).rejects.toThrow(
          'User not found',
        );
      });

      it('should hash new password with bcrypt salt rounds of 10', async () => {
        // Arrange
        const token = 'plain-token';
        const newPassword = 'newPassword123';

        const mockResetRecord = {
          id: 'reset-123',
          email: 'test@example.com',
          token: 'hashed-token',
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        };

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
        };

        mockPrismaService.passwordReset.findMany.mockResolvedValue([mockResetRecord]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
        mockPrismaService.user.update.mockResolvedValue({});
        mockPrismaService.passwordReset.update.mockResolvedValue({});

        // Act
        await service.resetPassword(token, newPassword);

        // Assert
        expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      });

      it('should mark reset token as used', async () => {
        // Arrange
        const token = 'plain-token';
        const newPassword = 'newPassword123';

        const mockResetRecord = {
          id: 'reset-123',
          email: 'test@example.com',
          token: 'hashed-token',
          expiresAt: new Date(Date.now() + 3600000),
          used: false,
        };

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
        };

        mockPrismaService.passwordReset.findMany.mockResolvedValue([mockResetRecord]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
        mockPrismaService.user.update.mockResolvedValue({});
        mockPrismaService.passwordReset.update.mockResolvedValue({});

        // Act
        await service.resetPassword(token, newPassword);

        // Assert
        expect(mockPrismaService.passwordReset.update).toHaveBeenCalledWith({
          where: { id: 'reset-123' },
          data: { used: true },
        });
      });
    });
  });

  describe('Social Login Operations', () => {
    describe('socialLogin', () => {
      it('should login existing user with Google', async () => {
        // Arrange
        const socialLoginDto = {
          provider: 'google' as const,
          accessToken: 'google-token',
        };

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashed-password',
          role: 'CUSTOMER',
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            email: 'test@example.com',
            name: 'Test User',
            sub: 'google-123',
            picture: 'https://example.com/photo.jpg',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }) as any;

        mockUsersService.findByEmail.mockResolvedValue(mockUser);
        mockJwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        // Act
        const result = await service.socialLogin(socialLoginDto);

        // Assert
        expect(result).toEqual({
          user: expect.not.objectContaining({ password: expect.anything() }),
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        });

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
        expect(mockUsersService.create).not.toHaveBeenCalled();
        expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
      });

      it('should create new user for first-time social login', async () => {
        // Arrange
        const socialLoginDto = {
          provider: 'google' as const,
          accessToken: 'google-token',
        };

        const mockNewUser = {
          id: 'user-new',
          email: 'newuser@example.com',
          name: 'New User',
          password: 'random-hashed-password',
          role: 'CUSTOMER',
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            email: 'newuser@example.com',
            name: 'New User',
            sub: 'google-456',
            picture: 'https://example.com/photo.jpg',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        }) as any;

        mockUsersService.findByEmail.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('random-hashed-password');
        mockUsersService.create.mockResolvedValue(mockNewUser);
        mockJwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        // Act
        const result = await service.socialLogin(socialLoginDto);

        // Assert
        expect(result).toEqual({
          user: expect.not.objectContaining({ password: expect.anything() }),
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        });

        expect(mockUsersService.create).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'random-hashed-password',
          name: 'New User',
        });

        expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
          'newuser@example.com',
          'New User',
        );
      });

      it('should throw UnauthorizedException for invalid social token', async () => {
        // Arrange
        const socialLoginDto = {
          provider: 'google' as const,
          accessToken: 'invalid-token',
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 401,
        }) as any;

        // Act & Assert
        await expect(service.socialLogin(socialLoginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException for token without email', async () => {
        // Arrange
        const socialLoginDto = {
          provider: 'google' as const,
          accessToken: 'token-without-email',
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            sub: 'google-789',
            name: 'User Without Email',
            // Missing email
          }),
        }) as any;

        // Act & Assert
        await expect(service.socialLogin(socialLoginDto)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should handle email send failure during social registration', async () => {
        // Arrange
        const socialLoginDto = {
          provider: 'facebook' as const,
          accessToken: 'facebook-token',
        };

        const mockNewUser = {
          id: 'user-new',
          email: 'newuser@example.com',
          name: 'New User',
          password: 'random-hashed-password',
          role: 'CUSTOMER',
        };

        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: { is_valid: true, app_id: 'facebook-app-id' } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: 'fb-123',
              email: 'newuser@example.com',
              name: 'New User',
              picture: { data: { url: 'https://example.com/photo.jpg' } },
            }),
          }) as any;

        mockUsersService.findByEmail.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('random-hashed-password');
        mockUsersService.create.mockResolvedValue(mockNewUser);
        mockJwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');
        mockEmailService.sendWelcomeEmail.mockRejectedValue(
          new Error('Email service unavailable'),
        );

        // Act - Should not throw error
        const result = await service.socialLogin(socialLoginDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.user.email).toBe('newuser@example.com');
      });
    });
  });

  describe('Registration with Tracking', () => {
    it('should track registration when tracking is enabled', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'John Doe';

      const mockRequest = {
        query: { fbclid: 'facebook-click-id' },
        cookies: { _fbp: 'facebook-pixel', ttclid: 'tiktok-click-id' },
        headers: {
          'user-agent': 'Mozilla/5.0',
          origin: 'https://broxiva.com',
        },
      };

      const mockUser = {
        id: 'user-new',
        email,
        password: 'hashed-password',
        name,
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockTrackingService.isEnabled.mockReturnValue(true);
      mockTrackingService.getClientIp.mockReturnValue('192.168.1.1');
      mockTrackingService.getUserAgent.mockReturnValue('Mozilla/5.0');

      // Act
      await service.register(email, password, name, mockRequest);

      // Assert
      expect(mockTrackingService.trackRegistration).toHaveBeenCalledWith({
        userId: 'user-new',
        email,
        phone: undefined,
        firstName: 'John',
        lastName: 'Doe',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        fbc: expect.stringContaining('facebook-click-id'),
        fbp: 'facebook-pixel',
        ttclid: 'tiktok-click-id',
        pageUrl: 'https://broxiva.com/auth/register',
      });
    });

    it('should not track when tracking is disabled', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'John Doe';
      const mockRequest = {};

      const mockUser = {
        id: 'user-new',
        email,
        password: 'hashed-password',
        name,
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockTrackingService.isEnabled.mockReturnValue(false);

      // Act
      await service.register(email, password, name, mockRequest);

      // Assert
      expect(mockTrackingService.trackRegistration).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'John Doe';
      const mockRequest = {};

      const mockUser = {
        id: 'user-new',
        email,
        password: 'hashed-password',
        name,
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockTrackingService.isEnabled.mockReturnValue(true);
      mockTrackingService.getClientIp.mockReturnValue('192.168.1.1');
      mockTrackingService.getUserAgent.mockReturnValue('Mozilla/5.0');
      mockTrackingService.trackRegistration.mockRejectedValue(
        new Error('Tracking service unavailable'),
      );

      // Act - Should not throw error
      const result = await service.register(email, password, name, mockRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(email);
    });
  });
});
