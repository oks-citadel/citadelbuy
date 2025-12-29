import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ServerTrackingService } from '../tracking/server-tracking.service';
import { AccountLockoutService } from './account-lockout.service';
import { TokenBlacklistService } from './token-blacklist.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
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
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockServerTrackingService = {
    trackEvent: jest.fn().mockResolvedValue(undefined),
    trackLogin: jest.fn().mockResolvedValue(undefined),
    trackRegistration: jest.fn().mockResolvedValue(undefined),
  };

  const mockAccountLockoutService = {
    recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
    resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    isLocked: jest.fn().mockResolvedValue(false),
    getLockoutStatus: jest.fn().mockResolvedValue({ isLocked: false, attempts: 0 }),
    checkLockout: jest.fn().mockResolvedValue(undefined),
  };

  const mockTokenBlacklistService = {
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    isBlacklisted: jest.fn().mockResolvedValue(false),
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
          useValue: mockServerTrackingService,
        },
        {
          provide: AccountLockoutService,
          useValue: mockAccountLockoutService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'CUSTOMER',
      });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
    });

    it('should not include password in returned user object', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      const mockCreatedUser = {
        id: 'user-new',
        email,
        password: 'hashedPassword123',
        name,
        role: 'CUSTOMER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockAccessToken = 'jwt-token-12345';

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockUsersService.create.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.register(email, password, name);

      expect(result).toEqual({
        user: {
          id: 'user-new',
          email,
          name,
          role: 'CUSTOMER',
          createdAt: mockCreatedUser.createdAt,
          updatedAt: mockCreatedUser.updatedAt,
        },
        access_token: mockAccessToken,
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email,
        password: 'hashedPassword123',
        name,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-new',
        email,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const name = 'Existing User';

      const mockExistingUser = {
        id: 'user-existing',
        email,
        password: 'hashedPassword',
        name,
        role: 'CUSTOMER',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockExistingUser);

      await expect(service.register(email, password, name)).rejects.toThrow(
        ConflictException,
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should hash password with bcrypt salt rounds of 10', async () => {
      const password = 'mySecurePassword123';

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue({
        id: 'user-new',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test',
        role: 'CUSTOMER',
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.register('test@example.com', password, 'Test');

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should not include password in returned user object', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue({
        id: 'user-new',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'CUSTOMER',
      });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.register('test@example.com', 'password', 'Test User');

      expect(result.user).not.toHaveProperty('password');
    });

    it('should return JWT access token', async () => {
      const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue({
        id: 'user-new',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'CUSTOMER',
      });
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.register('test@example.com', 'password', 'Test User');

      expect(result.access_token).toBe(mockAccessToken);
    });
  });

  describe('login', () => {
    it('should return user and access token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'CUSTOMER',
      };

      const mockAccessToken = 'jwt-token-12345';

      mockJwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.login(mockUser);

      expect(result).toEqual({
        user: mockUser,
        access_token: mockAccessToken,
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should create JWT payload with user id and email', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'another@example.com',
        name: 'Another User',
        role: 'ADMIN',
      };

      mockJwtService.sign.mockReturnValue('token');

      await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-456',
        email: 'another@example.com',
      });
    });

    it('should work for admin users', async () => {
      const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@broxiva.com',
        name: 'Admin User',
        role: 'ADMIN',
      };

      mockJwtService.sign.mockReturnValue('admin-token');

      const result = await service.login(mockAdminUser);

      expect(result.user.role).toBe('ADMIN');
      expect(result.access_token).toBe('admin-token');
    });

    it('should work for vendor users', async () => {
      const mockVendorUser = {
        id: 'vendor-123',
        email: 'vendor@example.com',
        name: 'Vendor User',
        role: 'VENDOR',
      };

      mockJwtService.sign.mockReturnValue('vendor-token');

      const result = await service.login(mockVendorUser);

      expect(result.user.role).toBe('VENDOR');
      expect(result.access_token).toBe('vendor-token');
    });
  });
});
