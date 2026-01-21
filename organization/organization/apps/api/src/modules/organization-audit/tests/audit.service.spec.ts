import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../services/audit.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    organizationAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create audit log entry successfully', async () => {
      const logEntry = {
        organizationId: 'org-123',
        userId: 'user-123',
        action: 'user.created',
        resource: 'user',
        resourceId: 'user-456',
        oldValue: null,
        newValue: { name: 'John Doe', email: 'john@example.com' },
        metadata: { source: 'admin-panel' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.organizationAuditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...logEntry,
        createdAt: new Date(),
      } as any);

      await service.log(logEntry);

      expect(mockPrismaService.organizationAuditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-123',
          userId: 'user-123',
          action: 'user.created',
          resource: 'user',
          resourceId: 'user-456',
          oldValue: null,
          newValue: { name: 'John Doe', email: 'john@example.com' },
          metadata: { source: 'admin-panel' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should log entry without optional fields', async () => {
      const minimalLogEntry = {
        organizationId: 'org-123',
        action: 'settings.updated',
        resource: 'settings',
      };

      mockPrismaService.organizationAuditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...minimalLogEntry,
      } as any);

      await service.log(minimalLogEntry);

      expect(mockPrismaService.organizationAuditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-123',
          action: 'settings.updated',
          resource: 'settings',
          userId: undefined,
          resourceId: undefined,
          oldValue: undefined,
          newValue: undefined,
          metadata: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });

    it('should log entry with complex metadata', async () => {
      const logEntry = {
        organizationId: 'org-123',
        action: 'billing.subscription_updated',
        resource: 'billing',
        metadata: {
          oldPlan: 'starter',
          newPlan: 'pro',
          price: 99.99,
          currency: 'USD',
          changes: ['plan', 'billing_cycle'],
        },
      };

      mockPrismaService.organizationAuditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...logEntry,
      } as any);

      await service.log(logEntry);

      expect(mockPrismaService.organizationAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: logEntry.metadata,
        }),
      });
    });
  });

  describe('query', () => {
    const organizationId = 'org-123';

    it('should query audit logs with basic filters', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          organizationId,
          userId: 'user-1',
          action: 'user.created',
          resource: 'user',
          resourceId: 'user-2',
          createdAt: new Date('2021-01-01'),
          organization: {
            id: organizationId,
            name: 'Test Org',
            slug: 'test-org',
          },
        },
      ];

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue(mockLogs as any);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(1);

      const result = await service.query(organizationId, {});

      expect(result).toEqual({
        data: mockLogs,
        total: 1,
        limit: 50,
        offset: 0,
      });

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it('should filter by userId', async () => {
      const query = { userId: 'user-123' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
          }),
        }),
      );
    });

    it('should filter by action with case-insensitive search', async () => {
      const query = { action: 'created' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'created', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by resource', async () => {
      const query = { resource: 'user' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resource: 'user',
          }),
        }),
      );
    });

    it('should filter by resourceId', async () => {
      const query = { resourceId: 'user-456' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resourceId: 'user-456',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2021-01-01');
      const endDate = new Date('2021-12-31');
      const query = { startDate: '2021-01-01', endDate: '2021-12-31' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter by start date only', async () => {
      const query = { startDate: '2021-01-01' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter by end date only', async () => {
      const query = { endDate: '2021-12-31' };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should apply custom limit and offset', async () => {
      const query = { limit: 25, offset: 50 };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(100);

      const result = await service.query(organizationId, query);

      expect(result.limit).toBe(25);
      expect(result.offset).toBe(50);
      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, {});

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should combine multiple filters', async () => {
      const query = {
        userId: 'user-123',
        action: 'update',
        resource: 'product',
        startDate: '2021-01-01',
        endDate: '2021-12-31',
      };

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);

      await service.query(organizationId, query);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId,
            userId: 'user-123',
            action: { contains: 'update', mode: 'insensitive' },
            resource: 'product',
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      );
    });
  });

  describe('getRecentActivity', () => {
    const organizationId = 'org-123';

    it('should get recent activity with default limit', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          action: 'user.login',
          createdAt: new Date('2021-01-03'),
        },
        {
          id: 'audit-2',
          action: 'product.created',
          createdAt: new Date('2021-01-02'),
        },
      ];

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.getRecentActivity(organizationId);

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get recent activity with custom limit', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity(organizationId, 10);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no activity', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity(organizationId);

      expect(result).toEqual([]);
    });
  });

  describe('getResourceHistory', () => {
    const organizationId = 'org-123';
    const resource = 'product';
    const resourceId = 'product-456';

    it('should get resource history successfully', async () => {
      const mockHistory = [
        {
          id: 'audit-1',
          action: 'product.updated',
          oldValue: { price: 99.99 },
          newValue: { price: 89.99 },
          createdAt: new Date('2021-01-03'),
        },
        {
          id: 'audit-2',
          action: 'product.created',
          oldValue: null,
          newValue: { name: 'Product A', price: 99.99 },
          createdAt: new Date('2021-01-01'),
        },
      ];

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.getResourceHistory(organizationId, resource, resourceId);

      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          resource,
          resourceId,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no history', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getResourceHistory(organizationId, resource, resourceId);

      expect(result).toEqual([]);
    });
  });

  describe('getUserActivity', () => {
    const organizationId = 'org-123';
    const userId = 'user-123';

    it('should get user activity with default limit', async () => {
      const mockActivity = [
        {
          id: 'audit-1',
          action: 'user.login',
          createdAt: new Date('2021-01-03'),
        },
        {
          id: 'audit-2',
          action: 'product.viewed',
          createdAt: new Date('2021-01-02'),
        },
      ];

      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue(mockActivity as any);

      const result = await service.getUserActivity(organizationId, userId);

      expect(result).toEqual(mockActivity);
      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          userId,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get user activity with custom limit', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      await service.getUserActivity(organizationId, userId, 25);

      expect(mockPrismaService.organizationAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          userId,
        },
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no activity', async () => {
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getUserActivity(organizationId, userId);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    const organizationId = 'org-123';

    it('should get statistics for default 30 days', async () => {
      const mockActionsByType = [
        { action: 'user.login', _count: { action: 150 } },
        { action: 'product.created', _count: { action: 25 } },
      ];

      const mockActionsByUser = [
        { userId: 'user-1', _count: { userId: 100 } },
        { userId: 'user-2', _count: { userId: 75 } },
      ];

      mockPrismaService.organizationAuditLog.count.mockResolvedValue(175);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce(mockActionsByType as any)
        .mockResolvedValueOnce(mockActionsByUser as any);

      const result = await service.getStats(organizationId);

      expect(result.totalActions).toBe(175);
      expect(result.actionsByType).toEqual([
        { action: 'user.login', count: 150 },
        { action: 'product.created', count: 25 },
      ]);
      expect(result.actionsByUser).toEqual([
        { userId: 'user-1', count: 100 },
        { userId: 'user-2', count: 75 },
      ]);
      expect(result.period.days).toBe(30);
    });

    it('should get statistics for custom time period', async () => {
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(500);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats(organizationId, 7);

      expect(result.period.days).toBe(7);

      const daysDiff = Math.floor(
        (result.period.end.getTime() - result.period.start.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should query with correct date range', async () => {
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getStats(organizationId, 30);

      expect(mockPrismaService.organizationAuditLog.count).toHaveBeenCalledWith({
        where: {
          organizationId,
          createdAt: { gte: expect.any(Date) },
        },
      });
    });

    it('should limit actionsByType to top 10', async () => {
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(1000);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getStats(organizationId);

      expect(mockPrismaService.organizationAuditLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should order actionsByType by count descending', async () => {
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getStats(organizationId);

      expect(mockPrismaService.organizationAuditLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { _count: { action: 'desc' } },
        }),
      );
    });

    it('should return empty stats if no data', async () => {
      mockPrismaService.organizationAuditLog.count.mockResolvedValue(0);
      mockPrismaService.organizationAuditLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats(organizationId);

      expect(result.totalActions).toBe(0);
      expect(result.actionsByType).toEqual([]);
      expect(result.actionsByUser).toEqual([]);
    });
  });
});
