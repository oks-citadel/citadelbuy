import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MeService, SessionInfo } from './me.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

describe('MeService', () => {
  let service: MeService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    token: crypto.createHash('sha256').update('test-token').digest('hex'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    deviceInfo: { browser: 'Chrome', os: 'Windows' },
    isActive: true,
    isRevoked: false,
    lastActivityAt: new Date('2025-01-15T10:00:00Z'),
    createdAt: new Date('2025-01-01T10:00:00Z'),
    expiresAt: new Date('2025-01-22T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MeService>(MeService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockSessions = [mockSession];
      mockPrismaService.userSession.findMany.mockResolvedValue(mockSessions);

      // Act
      const result = await service.getUserSessions(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockSession.id,
        ipAddress: mockSession.ipAddress,
        userAgent: mockSession.userAgent,
        deviceInfo: mockSession.deviceInfo,
        isCurrent: false,
        lastActiveAt: mockSession.lastActivityAt,
        createdAt: mockSession.createdAt,
      });
      expect(mockPrismaService.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
      });
    });

    it('should mark current session when currentToken is provided', async () => {
      // Arrange
      const userId = 'user-123';
      const currentToken = 'test-token';
      const mockSessions = [mockSession];
      mockPrismaService.userSession.findMany.mockResolvedValue(mockSessions);

      // Act
      const result = await service.getUserSessions(userId, currentToken);

      // Assert
      expect(result[0].isCurrent).toBe(true);
    });

    it('should return empty array when no sessions exist', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.userSession.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUserSessions(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should not mark session as current when token does not match', async () => {
      // Arrange
      const userId = 'user-123';
      const currentToken = 'different-token';
      const mockSessions = [mockSession];
      mockPrismaService.userSession.findMany.mockResolvedValue(mockSessions);

      // Act
      const result = await service.getUserSessions(userId, currentToken);

      // Assert
      expect(result[0].isCurrent).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';
      const differentTokenSession = {
        ...mockSession,
        token: crypto.createHash('sha256').update('different-token').digest('hex'),
      };
      mockPrismaService.userSession.findFirst.mockResolvedValue(differentTokenSession);
      mockPrismaService.userSession.update.mockResolvedValue({
        ...differentTokenSession,
        isActive: false,
        isRevoked: true,
      });

      // Act
      const result = await service.revokeSession(userId, sessionId, 'test-token');

      // Assert
      expect(result).toEqual({ message: 'Session revoked successfully' });
      expect(mockPrismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          isActive: false,
          isRevoked: true,
        },
      });
    });

    it('should throw NotFoundException when session does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'non-existent-session';
      mockPrismaService.userSession.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revokeSession(userId, sessionId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.revokeSession(userId, sessionId)).rejects.toThrow(
        'Session not found',
      );
    });

    it('should throw BadRequestException when trying to revoke current session', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';
      const currentToken = 'test-token';
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(
        service.revokeSession(userId, sessionId, currentToken),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.revokeSession(userId, sessionId, currentToken),
      ).rejects.toThrow('Cannot revoke current session. Use logout instead.');
    });

    it('should revoke session without currentToken check', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';
      mockPrismaService.userSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.userSession.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
        isRevoked: true,
      });

      // Act
      const result = await service.revokeSession(userId, sessionId);

      // Assert
      expect(result).toEqual({ message: 'Session revoked successfully' });
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all sessions except current one', async () => {
      // Arrange
      const userId = 'user-123';
      const currentToken = 'test-token';
      mockPrismaService.userSession.count.mockResolvedValue(3);
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await service.revokeAllOtherSessions(userId, currentToken);

      // Assert
      expect(result).toEqual({
        message: 'All other sessions revoked',
        revokedCount: 3,
      });
      const expectedTokenHash = crypto
        .createHash('sha256')
        .update(currentToken)
        .digest('hex');
      expect(mockPrismaService.userSession.count).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          token: { not: expectedTokenHash },
        },
      });
      expect(mockPrismaService.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          token: { not: expectedTokenHash },
        },
        data: {
          isActive: false,
          isRevoked: true,
        },
      });
    });

    it('should revoke all sessions when no currentToken provided', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.userSession.count.mockResolvedValue(5);
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.revokeAllOtherSessions(userId);

      // Assert
      expect(result).toEqual({
        message: 'All other sessions revoked',
        revokedCount: 5,
      });
      expect(mockPrismaService.userSession.count).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
        },
      });
    });

    it('should return revokedCount of 0 when no other sessions exist', async () => {
      // Arrange
      const userId = 'user-123';
      const currentToken = 'test-token';
      mockPrismaService.userSession.count.mockResolvedValue(0);
      mockPrismaService.userSession.updateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.revokeAllOtherSessions(userId, currentToken);

      // Assert
      expect(result.revokedCount).toBe(0);
    });
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'new-token';
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        deviceInfo: { browser: 'Firefox', os: 'Linux' },
      };
      mockPrismaService.userSession.create.mockResolvedValue({
        id: 'new-session-id',
        userId,
        token: crypto.createHash('sha256').update(token).digest('hex'),
        ...metadata,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Act
      await service.createSession(userId, token, metadata);

      // Assert
      const expectedTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      expect(mockPrismaService.userSession.create).toHaveBeenCalledWith({
        data: {
          userId,
          token: expectedTokenHash,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceInfo: metadata.deviceInfo,
          isActive: true,
          lastActivityAt: expect.any(Date),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should create session with minimal metadata', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'new-token';
      const metadata = {
        ipAddress: '192.168.1.100',
      };
      mockPrismaService.userSession.create.mockResolvedValue({
        id: 'new-session-id',
        userId,
        token: crypto.createHash('sha256').update(token).digest('hex'),
        ipAddress: metadata.ipAddress,
        userAgent: undefined,
        deviceInfo: undefined,
        isActive: true,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Act
      await service.createSession(userId, token, metadata);

      // Assert
      expect(mockPrismaService.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          ipAddress: metadata.ipAddress,
          userAgent: undefined,
          deviceInfo: undefined,
        }),
      });
    });

    it('should hash the token before storing', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'plain-text-token';
      const metadata = { ipAddress: '10.0.0.1' };
      mockPrismaService.userSession.create.mockResolvedValue({});

      // Act
      await service.createSession(userId, token, metadata);

      // Assert
      const expectedHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      expect(mockPrismaService.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expectedHash,
        }),
      });
    });

    it('should set expiration to 7 days from creation', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'test-token';
      const metadata = { ipAddress: '10.0.0.1' };
      const beforeCall = Date.now();
      mockPrismaService.userSession.create.mockResolvedValue({});

      // Act
      await service.createSession(userId, token, metadata);

      // Assert
      const afterCall = Date.now();
      const createCall = mockPrismaService.userSession.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + sevenDaysMs);
      expect(expiresAt).toBeLessThanOrEqual(afterCall + sevenDaysMs);
    });
  });
});
