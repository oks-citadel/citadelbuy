import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from './security.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

jest.mock('bcryptjs');
jest.mock('crypto');
jest.mock('speakeasy');
jest.mock('qrcode');

describe('SecurityService', () => {
  let service: SecurityService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    twoFactorAuth: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
    },
    ipBlacklist: {
      findFirst: jest.fn(),
    },
    dataExportRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    securityEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
    wishlistCollection: {
      findMany: jest.fn(),
    },
    cart: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Audit Logging ====================

  describe('logActivity', () => {
    it('should create an audit log entry', async () => {
      const params = {
        userId: 'user-123',
        activityType: ActivityType.LOGIN,
        action: 'User logged in',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = { id: 'log-123', ...params, createdAt: new Date() };
      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.logActivity(params);

      expect(result).toEqual(mockAuditLog);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: params,
      });
    });

    it('should log activity with suspicious flag', async () => {
      const params = {
        userId: 'user-123',
        activityType: ActivityType.LOGIN,
        action: 'Suspicious login attempt',
        isSuspicious: true,
        riskScore: 85,
      };

      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-456', ...params });

      await service.logActivity(params);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSuspicious: true,
          riskScore: 85,
        }),
      });
    });

    it('should log activity with metadata', async () => {
      const params = {
        userId: 'user-123',
        activityType: ActivityType.PROFILE_UPDATE,
        action: 'Profile updated',
        metadata: { fieldsChanged: ['name', 'email'] },
      };

      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'log-789', ...params });

      await service.logActivity(params);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { fieldsChanged: ['name', 'email'] },
        }),
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with pagination', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'Login', userId: 'user-123' },
        { id: 'log-2', action: 'Logout', userId: 'user-123' },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(2);

      const result = await service.getAuditLogs({ page: 1, limit: 50 });

      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter audit logs by userId', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ userId: 'user-456' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-456' }),
        }),
      );
    });

    it('should filter audit logs by activityType', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ activityType: ActivityType.LOGIN });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ activityType: ActivityType.LOGIN }),
        }),
      );
    });

    it('should filter audit logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ startDate, endDate });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({});

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });
  });

  // ==================== API Key Management ====================

  describe('createApiKey', () => {
    it('should create an API key', async () => {
      const mockKey = 'a'.repeat(64);
      const mockHashedKey = 'hashedKey123';

      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => mockKey,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedKey);

      const mockApiKey = {
        id: 'key-123',
        userId: 'user-123',
        name: 'Test Key',
        key: mockHashedKey,
        keyPrefix: mockKey.substring(0, 8),
        scopes: ['read:products'],
        expiresAt: null,
      };

      mockPrismaService.apiKey.create.mockResolvedValue(mockApiKey);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.createApiKey('user-123', 'Test Key', ['read:products']);

      expect(result.apiKey).toBeDefined();
      expect(result.plainKey).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith(mockKey, 10);
    });

    it('should create API key with expiration', async () => {
      const mockKey = 'b'.repeat(64);
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => mockKey,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedKey');

      mockPrismaService.apiKey.create.mockResolvedValue({
        id: 'key-456',
        expiresAt: expect.any(Date),
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.createApiKey('user-123', 'Expiring Key', ['read:products'], 30);

      expect(mockPrismaService.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should log API key creation activity', async () => {
      const mockKey = 'c'.repeat(64);
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => mockKey,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedKey');

      mockPrismaService.apiKey.create.mockResolvedValue({ id: 'key-789' });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.createApiKey('user-123', 'Logged Key', ['write:orders']);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: ActivityType.API_KEY_CREATED,
          action: 'API key created',
        }),
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'hashedKey',
        scopes: ['read:products'],
        isActive: true,
        expiresAt: null,
      };

      mockPrismaService.apiKey.findMany.mockResolvedValue([mockApiKey]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.apiKey.update.mockResolvedValue({});

      const result = await service.validateApiKey('plainKey123');

      expect(result).toEqual(mockApiKey);
      expect(mockPrismaService.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: {
          lastUsedAt: expect.any(Date),
          usageCount: { increment: 1 },
        },
      });
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockPrismaService.apiKey.findMany.mockResolvedValue([
        { id: 'key-123', key: 'hashedKey', isActive: true },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateApiKey('invalidKey')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired API key', async () => {
      const expiredDate = new Date(Date.now() - 86400000); // Yesterday
      mockPrismaService.apiKey.findMany.mockResolvedValue([
        { id: 'key-123', key: 'hashedKey', isActive: true, expiresAt: expiredDate },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateApiKey('validKey')).rejects.toThrow(
        new UnauthorizedException('API key expired'),
      );
    });

    it('should throw UnauthorizedException for insufficient scopes', async () => {
      mockPrismaService.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-123',
          key: 'hashedKey',
          scopes: ['read:products'],
          isActive: true,
          expiresAt: null,
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateApiKey('validKey', ['write:orders']),
      ).rejects.toThrow(new UnauthorizedException('Insufficient permissions'));
    });

    it('should validate API key with matching scopes', async () => {
      const mockApiKey = {
        id: 'key-123',
        key: 'hashedKey',
        scopes: ['read:products', 'write:orders'],
        isActive: true,
        expiresAt: null,
      };

      mockPrismaService.apiKey.findMany.mockResolvedValue([mockApiKey]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.apiKey.update.mockResolvedValue({});

      const result = await service.validateApiKey('plainKey', ['read:products']);

      expect(result).toEqual(mockApiKey);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      mockPrismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key-123',
        userId: 'user-123',
      });
      mockPrismaService.apiKey.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.revokeApiKey('key-123', 'user-123');

      expect(result).toEqual({ message: 'API key revoked successfully' });
      expect(mockPrismaService.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-123' },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException if API key not found', async () => {
      mockPrismaService.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.revokeApiKey('key-999', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user does not own API key', async () => {
      mockPrismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key-123',
        userId: 'different-user',
      });

      await expect(service.revokeApiKey('key-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log API key revocation', async () => {
      mockPrismaService.apiKey.findUnique.mockResolvedValue({
        id: 'key-123',
        userId: 'user-123',
      });
      mockPrismaService.apiKey.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.revokeApiKey('key-123', 'user-123');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: ActivityType.API_KEY_DELETED,
          action: 'API key revoked',
        }),
      });
    });
  });

  // ==================== Two-Factor Authentication ====================

  describe('setup2FA', () => {
    it('should setup 2FA and return QR code', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/Broxiva?secret=JBSWY3DPEHPK3PXP',
      };

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => 'ABC12345',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedBackupCode');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,iVBORw0KGgo...');
      mockPrismaService.twoFactorAuth.upsert.mockResolvedValue({});

      const result = await service.setup2FA('user-123');

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCode).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should generate 10 backup codes', async () => {
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => 'BACKUP12',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image');
      mockPrismaService.twoFactorAuth.upsert.mockResolvedValue({});

      const result = await service.setup2FA('user-123');

      expect(result.backupCodes).toHaveLength(10);
    });

    it('should hash backup codes before storing', async () => {
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => 'CODE1234',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedCode');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image');
      mockPrismaService.twoFactorAuth.upsert.mockResolvedValue({});

      await service.setup2FA('user-123');

      expect(bcrypt.hash).toHaveBeenCalledTimes(10);
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA with valid token', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: false,
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.enable2FA('user-123', '123456');

      expect(result).toEqual({ message: '2FA enabled successfully' });
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { isEnabled: true },
      });
    });

    it('should throw BadRequestException if 2FA not set up', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue(null);

      await expect(service.enable2FA('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA not set up'),
      );
    });

    it('should throw BadRequestException for invalid verification code', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: false,
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.enable2FA('user-123', '000000')).rejects.toThrow(
        new BadRequestException('Invalid verification code'),
      );
    });

    it('should log 2FA enablement', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.enable2FA('user-123', '123456');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: '2FA enabled',
        }),
      });
    });
  });

  describe('verify2FA', () => {
    it('should verify valid TOTP token', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: [],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      const result = await service.verify2FA('user-123', '123456');

      expect(result).toBe(true);
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should verify valid backup code', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: ['hashedBackupCode'],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verify2FA('user-123', 'ABC12345');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: ['hashedCode'],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verify2FA('user-123', '000000');

      expect(result).toBe(false);
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: false,
      });

      await expect(service.verify2FA('user-123', '123456')).rejects.toThrow(
        new BadRequestException('2FA not enabled'),
      );
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA with valid token', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: [],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.disable2FA('user-123', '123456');

      expect(result).toEqual({ message: '2FA disabled successfully' });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: ['hashedCode'],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.disable2FA('user-123', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should log 2FA disablement', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'user-123',
        secret: 'SECRET',
        isEnabled: true,
        backupCodes: [],
      });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.disable2FA('user-123', '123456');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: '2FA disabled',
        }),
      });
    });
  });

  // ==================== Session Management ====================

  describe('createSession', () => {
    it('should create a new session', async () => {
      const mockToken = 'sessionToken123';
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => mockToken,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedToken');

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        token: 'hashedToken',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.userSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession('user-123', '192.168.1.1', 'Chrome/120');

      expect(result.session).toEqual(mockSession);
      expect(result.plainToken).toBe(mockToken);
    });

    it('should set session expiration to 7 days', async () => {
      (crypto.randomBytes as jest.Mock).mockReturnValue({
        toString: () => 'token',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedToken');
      mockPrismaService.userSession.create.mockResolvedValue({});

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await service.createSession('user-123', '192.168.1.1');

      expect(mockPrismaService.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        }),
      });

      jest.restoreAllMocks();
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        token: 'hashedToken',
        isActive: true,
        isRevoked: false,
        expiresAt: futureDate,
      };

      mockPrismaService.userSession.findMany.mockResolvedValue([mockSession]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.userSession.update.mockResolvedValue({});

      const result = await service.validateSession('plainToken');

      expect(result).toEqual(mockSession);
      expect(mockPrismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException for invalid session', async () => {
      mockPrismaService.userSession.findMany.mockResolvedValue([
        { id: 'session-123', token: 'hashedToken', isActive: true, isRevoked: false },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateSession('invalidToken')).rejects.toThrow(
        new UnauthorizedException('Invalid session'),
      );
    });

    it('should throw UnauthorizedException for expired session', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      mockPrismaService.userSession.findMany.mockResolvedValue([
        {
          id: 'session-123',
          token: 'hashedToken',
          isActive: true,
          isRevoked: false,
          expiresAt: pastDate,
        },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.userSession.update.mockResolvedValue({});

      await expect(service.validateSession('expiredToken')).rejects.toThrow(
        new UnauthorizedException('Session expired'),
      );
    });
  });

  describe('revokeSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.revokeSessions('user-123');

      expect(result).toEqual({ message: 'Sessions revoked successfully' });
      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          id: undefined,
        },
        data: { isRevoked: true, isActive: false },
      });
    });

    it('should revoke sessions except current session', async () => {
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 2 });

      await service.revokeSessions('user-123', 'current-session-id');

      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          id: { not: 'current-session-id' },
        },
        data: { isRevoked: true, isActive: false },
      });
    });
  });

  // ==================== Brute Force Protection ====================

  describe('recordLoginAttempt', () => {
    it('should record a successful login attempt', async () => {
      mockPrismaService.loginAttempt.create.mockResolvedValue({});

      await service.recordLoginAttempt(
        'test@example.com',
        '192.168.1.1',
        true,
        'Chrome/120',
      );

      expect(mockPrismaService.loginAttempt.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          success: true,
          userAgent: 'Chrome/120',
          failureReason: undefined,
        },
      });
    });

    it('should record a failed login attempt with reason', async () => {
      mockPrismaService.loginAttempt.create.mockResolvedValue({});
      mockPrismaService.loginAttempt.count.mockResolvedValue(3);

      await service.recordLoginAttempt(
        'test@example.com',
        '192.168.1.1',
        false,
        'Chrome/120',
        'Invalid password',
      );

      expect(mockPrismaService.loginAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          failureReason: 'Invalid password',
        }),
      });
    });

    it('should create security event after 5 failed attempts', async () => {
      mockPrismaService.loginAttempt.create.mockResolvedValue({});
      mockPrismaService.loginAttempt.count.mockResolvedValue(5);
      mockPrismaService.securityEvent.create.mockResolvedValue({});

      await service.recordLoginAttempt(
        'test@example.com',
        '192.168.1.1',
        false,
      );

      expect(mockPrismaService.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'BRUTE_FORCE',
          severity: 'HIGH',
        }),
      });
    });

    it('should not create security event for fewer than 5 failed attempts', async () => {
      mockPrismaService.loginAttempt.create.mockResolvedValue({});
      mockPrismaService.loginAttempt.count.mockResolvedValue(4);

      await service.recordLoginAttempt(
        'test@example.com',
        '192.168.1.1',
        false,
      );

      expect(mockPrismaService.securityEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('isIpBlocked', () => {
    it('should return true for blocked IP', async () => {
      mockPrismaService.ipBlacklist.findFirst.mockResolvedValue({
        id: 'block-123',
        ipAddress: '192.168.1.100',
        isActive: true,
      });

      const result = await service.isIpBlocked('192.168.1.100');

      expect(result).toBe(true);
    });

    it('should return false for non-blocked IP', async () => {
      mockPrismaService.ipBlacklist.findFirst.mockResolvedValue(null);

      const result = await service.isIpBlocked('192.168.1.1');

      expect(result).toBe(false);
    });
  });

  // ==================== GDPR Compliance ====================

  describe('requestDataExport', () => {
    it('should create a data export request with JSON format', async () => {
      const mockRequest = {
        id: 'export-123',
        userId: 'user-123',
        format: 'JSON',
        status: 'PENDING',
      };

      mockPrismaService.dataExportRequest.create.mockResolvedValue(mockRequest);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.requestDataExport('user-123', 'JSON');

      expect(result).toEqual(mockRequest);
      expect(mockPrismaService.dataExportRequest.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          format: 'JSON',
          status: 'PENDING',
        },
      });
    });

    it('should create a data export request with CSV format', async () => {
      mockPrismaService.dataExportRequest.create.mockResolvedValue({
        id: 'export-456',
        format: 'CSV',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.requestDataExport('user-123', 'CSV');

      expect(mockPrismaService.dataExportRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          format: 'CSV',
        }),
      });
    });

    it('should log data export request', async () => {
      mockPrismaService.dataExportRequest.create.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.requestDataExport('user-123');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          activityType: ActivityType.DATA_EXPORT,
          action: 'Data export requested',
        }),
      });
    });
  });

  describe('processDataExport', () => {
    it('should process data export request successfully', async () => {
      const mockRequest = {
        id: 'export-123',
        userId: 'user-123',
        user: { email: 'test@example.com' },
      };

      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.wishlistCollection.findMany.mockResolvedValue([]);
      mockPrismaService.cart.findMany.mockResolvedValue([]);
      mockPrismaService.dataExportRequest.update.mockResolvedValue({});

      const result = await service.processDataExport('export-123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('reviews');
    });

    it('should throw BadRequestException if request not found', async () => {
      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue(null);

      await expect(service.processDataExport('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update request status on failure', async () => {
      mockPrismaService.dataExportRequest.findUnique.mockResolvedValue({
        id: 'export-123',
        userId: 'user-123',
      });
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));
      mockPrismaService.dataExportRequest.update.mockResolvedValue({});

      await expect(service.processDataExport('export-123')).rejects.toThrow();

      expect(mockPrismaService.dataExportRequest.update).toHaveBeenCalledWith({
        where: { id: 'export-123' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });
  });

  // ==================== Security Events ====================

  describe('createSecurityEvent', () => {
    it('should create a security event', async () => {
      const params = {
        type: 'BRUTE_FORCE',
        severity: 'HIGH',
        description: 'Multiple failed login attempts detected',
        ipAddress: '192.168.1.100',
      };

      mockPrismaService.securityEvent.create.mockResolvedValue({
        id: 'event-123',
        ...params,
      });

      const result = await service.createSecurityEvent(params);

      expect(result.type).toBe('BRUTE_FORCE');
      expect(mockPrismaService.securityEvent.create).toHaveBeenCalledWith({
        data: params,
      });
    });

    it('should create security event with user ID', async () => {
      const params = {
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'CRITICAL',
        description: 'Unauthorized access attempt',
        userId: 'user-123',
        metadata: { attemptedResource: '/admin/users' },
      };

      mockPrismaService.securityEvent.create.mockResolvedValue({ id: 'event-456', ...params });

      await service.createSecurityEvent(params);

      expect(mockPrismaService.securityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
        }),
      });
    });
  });

  describe('getSecurityEvents', () => {
    it('should return security events with pagination', async () => {
      const mockEvents = [
        { id: 'event-1', type: 'BRUTE_FORCE', severity: 'HIGH' },
        { id: 'event-2', type: 'UNAUTHORIZED_ACCESS', severity: 'CRITICAL' },
      ];

      mockPrismaService.securityEvent.findMany.mockResolvedValue(mockEvents);
      mockPrismaService.securityEvent.count.mockResolvedValue(2);

      const result = await service.getSecurityEvents({ page: 1, limit: 50 });

      expect(result.events).toEqual(mockEvents);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter security events by type', async () => {
      mockPrismaService.securityEvent.findMany.mockResolvedValue([]);
      mockPrismaService.securityEvent.count.mockResolvedValue(0);

      await service.getSecurityEvents({ type: 'BRUTE_FORCE' });

      expect(mockPrismaService.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'BRUTE_FORCE' }),
        }),
      );
    });

    it('should filter security events by severity', async () => {
      mockPrismaService.securityEvent.findMany.mockResolvedValue([]);
      mockPrismaService.securityEvent.count.mockResolvedValue(0);

      await service.getSecurityEvents({ severity: 'CRITICAL' });

      expect(mockPrismaService.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: 'CRITICAL' }),
        }),
      );
    });

    it('should filter security events by resolved status', async () => {
      mockPrismaService.securityEvent.findMany.mockResolvedValue([]);
      mockPrismaService.securityEvent.count.mockResolvedValue(0);

      await service.getSecurityEvents({ resolved: false });

      expect(mockPrismaService.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resolved: false }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.securityEvent.findMany.mockResolvedValue([]);
      mockPrismaService.securityEvent.count.mockResolvedValue(0);

      await service.getSecurityEvents({});

      expect(mockPrismaService.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });
  });
});
