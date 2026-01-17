import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorCommission: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    cacheConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    rateLimit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockVendorCommission = {
    id: 'commission-123',
    vendorId: 'vendor-123',
    orderId: 'order-123',
    amount: 15.0,
    rate: 0.15,
    status: 'PENDING',
    paidAt: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockReferral = {
    id: 'referral-123',
    referrerId: 'user-123',
    refereeEmail: 'newuser@example.com',
    refereeId: null,
    referrerPoints: 100,
    refereePoints: 50,
    status: 'COMPLETED',
    expiresAt: new Date('2025-02-15T10:00:00Z'),
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockCacheConfig = {
    id: 'cache-123',
    key: 'products',
    ttl: 3600,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockRateLimit = {
    id: 'ratelimit-123',
    endpoint: '/api/products',
    maxRequests: 100,
    windowMs: 60000,
    isActive: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCommission', () => {
    it('should calculate and create vendor commission with default rate', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const orderId = 'order-123';
      const orderTotal = 100.0;
      mockPrismaService.vendorCommission.create.mockResolvedValue(mockVendorCommission);

      // Act
      const result = await service.calculateCommission(vendorId, orderId, orderTotal);

      // Assert
      expect(result).toEqual(mockVendorCommission);
      expect(mockPrismaService.vendorCommission.create).toHaveBeenCalledWith({
        data: {
          vendorId,
          orderId,
          amount: 15.0, // 100 * 0.15
          rate: 0.15,
        },
      });
    });

    it('should calculate commission with custom rate', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const orderId = 'order-123';
      const orderTotal = 200.0;
      const rate = 0.10;
      mockPrismaService.vendorCommission.create.mockResolvedValue({
        ...mockVendorCommission,
        amount: 20.0,
        rate: 0.10,
      });

      // Act
      const result = await service.calculateCommission(vendorId, orderId, orderTotal, rate);

      // Assert
      expect(mockPrismaService.vendorCommission.create).toHaveBeenCalledWith({
        data: {
          vendorId,
          orderId,
          amount: 20.0, // 200 * 0.10
          rate: 0.10,
        },
      });
    });

    it('should handle zero order total', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const orderId = 'order-123';
      const orderTotal = 0;
      mockPrismaService.vendorCommission.create.mockResolvedValue({
        ...mockVendorCommission,
        amount: 0,
      });

      // Act
      const result = await service.calculateCommission(vendorId, orderId, orderTotal);

      // Assert
      expect(mockPrismaService.vendorCommission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 0,
        }),
      });
    });
  });

  describe('getVendorCommissions', () => {
    it('should return all commissions for a vendor', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const mockCommissions = [mockVendorCommission];
      mockPrismaService.vendorCommission.findMany.mockResolvedValue(mockCommissions);

      // Act
      const result = await service.getVendorCommissions(vendorId);

      // Assert
      expect(result).toEqual(mockCommissions);
      expect(mockPrismaService.vendorCommission.findMany).toHaveBeenCalledWith({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no commissions exist', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      mockPrismaService.vendorCommission.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getVendorCommissions(vendorId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should order commissions by creation date descending', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      mockPrismaService.vendorCommission.findMany.mockResolvedValue([]);

      // Act
      await service.getVendorCommissions(vendorId);

      // Assert
      expect(mockPrismaService.vendorCommission.findMany).toHaveBeenCalledWith({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('payoutCommission', () => {
    it('should mark commission as paid', async () => {
      // Arrange
      const commissionId = 'commission-123';
      const paidCommission = {
        ...mockVendorCommission,
        status: 'PAID',
        paidAt: new Date(),
      };
      mockPrismaService.vendorCommission.update.mockResolvedValue(paidCommission);

      // Act
      const result = await service.payoutCommission(commissionId);

      // Assert
      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeDefined();
      expect(mockPrismaService.vendorCommission.update).toHaveBeenCalledWith({
        where: { id: commissionId },
        data: { status: 'PAID', paidAt: expect.any(Date) },
      });
    });
  });

  describe('createReferral', () => {
    it('should create a referral with 30-day expiration', async () => {
      // Arrange
      const userId = 'user-123';
      const refereeEmail = 'newuser@example.com';
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);

      // Act
      const result = await service.createReferral(userId, refereeEmail);

      // Assert
      expect(result).toEqual(mockReferral);
      expect(mockPrismaService.referral.create).toHaveBeenCalledWith({
        data: {
          referrerId: userId,
          refereeEmail,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should set expiration to approximately 30 days from now', async () => {
      // Arrange
      const userId = 'user-123';
      const refereeEmail = 'newuser@example.com';
      const beforeCall = Date.now();
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);

      // Act
      await service.createReferral(userId, refereeEmail);

      // Assert
      const afterCall = Date.now();
      const createCall = mockPrismaService.referral.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + thirtyDaysMs);
      expect(expiresAt).toBeLessThanOrEqual(afterCall + thirtyDaysMs);
    });
  });

  describe('getReferralStats', () => {
    it('should return referral statistics for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockReferrals = [
        { ...mockReferral, referrerPoints: 100 },
        { ...mockReferral, id: 'referral-456', referrerPoints: 150 },
      ];
      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);

      // Act
      const result = await service.getReferralStats(userId);

      // Assert
      expect(result).toEqual({
        total: 2,
        totalPoints: 250,
      });
      expect(mockPrismaService.referral.findMany).toHaveBeenCalledWith({
        where: { referrerId: userId, status: 'COMPLETED' },
      });
    });

    it('should return zero stats when no referrals exist', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.referral.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getReferralStats(userId);

      // Assert
      expect(result).toEqual({
        total: 0,
        totalPoints: 0,
      });
    });

    it('should handle referrals with null points', async () => {
      // Arrange
      const userId = 'user-123';
      const mockReferrals = [
        { ...mockReferral, referrerPoints: null },
        { ...mockReferral, id: 'referral-456', referrerPoints: 100 },
      ];
      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);

      // Act
      const result = await service.getReferralStats(userId);

      // Assert
      expect(result.totalPoints).toBe(100);
    });
  });

  describe('getCacheConfig', () => {
    it('should return cache config by key', async () => {
      // Arrange
      const key = 'products';
      mockPrismaService.cacheConfig.findUnique.mockResolvedValue(mockCacheConfig);

      // Act
      const result = await service.getCacheConfig(key);

      // Assert
      expect(result).toEqual(mockCacheConfig);
      expect(mockPrismaService.cacheConfig.findUnique).toHaveBeenCalledWith({
        where: { key },
      });
    });

    it('should return null when cache config not found', async () => {
      // Arrange
      const key = 'non-existent';
      mockPrismaService.cacheConfig.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getCacheConfig(key);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('upsertCacheConfig', () => {
    it('should create new cache config if not exists', async () => {
      // Arrange
      const key = 'new-key';
      const ttl = 7200;
      mockPrismaService.cacheConfig.upsert.mockResolvedValue({
        ...mockCacheConfig,
        key,
        ttl,
      });

      // Act
      const result = await service.upsertCacheConfig(key, ttl);

      // Assert
      expect(result.key).toBe(key);
      expect(result.ttl).toBe(ttl);
      expect(mockPrismaService.cacheConfig.upsert).toHaveBeenCalledWith({
        where: { key },
        update: { ttl },
        create: { key, ttl },
      });
    });

    it('should update existing cache config', async () => {
      // Arrange
      const key = 'products';
      const ttl = 1800;
      mockPrismaService.cacheConfig.upsert.mockResolvedValue({
        ...mockCacheConfig,
        ttl,
      });

      // Act
      const result = await service.upsertCacheConfig(key, ttl);

      // Assert
      expect(result.ttl).toBe(ttl);
    });
  });

  describe('getRateLimits', () => {
    it('should return all active rate limits', async () => {
      // Arrange
      const mockRateLimits = [mockRateLimit];
      mockPrismaService.rateLimit.findMany.mockResolvedValue(mockRateLimits);

      // Act
      const result = await service.getRateLimits();

      // Assert
      expect(result).toEqual(mockRateLimits);
      expect(mockPrismaService.rateLimit.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should return empty array when no rate limits exist', async () => {
      // Arrange
      mockPrismaService.rateLimit.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getRateLimits();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('upsertRateLimit', () => {
    it('should create new rate limit if not exists', async () => {
      // Arrange
      const endpoint = '/api/new-endpoint';
      const maxRequests = 50;
      const windowMs = 30000;
      mockPrismaService.rateLimit.findFirst.mockResolvedValue(null);
      mockPrismaService.rateLimit.create.mockResolvedValue({
        ...mockRateLimit,
        endpoint,
        maxRequests,
        windowMs,
      });

      // Act
      const result = await service.upsertRateLimit(endpoint, maxRequests, windowMs);

      // Assert
      expect(result.endpoint).toBe(endpoint);
      expect(result.maxRequests).toBe(maxRequests);
      expect(result.windowMs).toBe(windowMs);
      expect(mockPrismaService.rateLimit.create).toHaveBeenCalledWith({
        data: { endpoint, maxRequests, windowMs },
      });
    });

    it('should update existing rate limit', async () => {
      // Arrange
      const endpoint = '/api/products';
      const maxRequests = 200;
      const windowMs = 120000;
      mockPrismaService.rateLimit.findFirst.mockResolvedValue(mockRateLimit);
      mockPrismaService.rateLimit.update.mockResolvedValue({
        ...mockRateLimit,
        maxRequests,
        windowMs,
      });

      // Act
      const result = await service.upsertRateLimit(endpoint, maxRequests, windowMs);

      // Assert
      expect(result.maxRequests).toBe(maxRequests);
      expect(result.windowMs).toBe(windowMs);
      expect(mockPrismaService.rateLimit.update).toHaveBeenCalledWith({
        where: { id: mockRateLimit.id },
        data: { maxRequests, windowMs },
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.database).toBe('disconnected');
      expect(result.error).toBe('Connection refused');
    });

    it('should include error message when database check fails', async () => {
      // Arrange
      const errorMessage = 'ECONNREFUSED';
      mockPrismaService.$queryRaw.mockRejectedValue(new Error(errorMessage));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.error).toBe(errorMessage);
    });
  });
});
