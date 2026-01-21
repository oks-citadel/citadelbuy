import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService } from '@/common/redis/cache.service';
import {
  AuditStatus,
  SEOIssueSeverity,
  SEOIssueCategory,
} from '../dto/audit.dto';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;
  let cacheService: CacheService;
  let configService: ConfigService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://example.com'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleAudit', () => {
    it('should schedule a new audit and return audit result', async () => {
      const dto = { maxPages: 10 };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.scheduleAudit(dto);

      // Status may be PENDING or RUNNING depending on timing (audit runs in background)
      expect([AuditStatus.PENDING, AuditStatus.RUNNING, AuditStatus.COMPLETED]).toContain(result.status);
      expect(result.id).toBeDefined();
      expect(result.startedAt).toBeDefined();
    });

    it('should schedule audit with custom URLs', async () => {
      const dto = {
        urls: ['https://example.com/page1', 'https://example.com/page2'],
        maxPages: 5,
      };

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.scheduleAudit(dto);

      // Status may transition quickly due to background processing
      expect([AuditStatus.PENDING, AuditStatus.RUNNING, AuditStatus.COMPLETED]).toContain(result.status);
    });

    it('should handle empty product and category lists', async () => {
      const dto = {};

      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const result = await service.scheduleAudit(dto);

      // Status may transition quickly due to background processing
      expect([AuditStatus.PENDING, AuditStatus.RUNNING, AuditStatus.COMPLETED]).toContain(result.status);
    });
  });

  describe('getAuditResult', () => {
    it('should return null when audit does not exist', async () => {
      const result = await service.getAuditResult('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return audit result when it exists', async () => {
      // Schedule an audit first
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const audit = await service.scheduleAudit({});
      const result = await service.getAuditResult(audit.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(audit.id);
    });
  });

  describe('getLatestAudit', () => {
    it('should return null when no audits exist', async () => {
      // Clear existing audits
      await service.clearAuditData();

      const result = await service.getLatestAudit();

      expect(result).toBeNull();
    });

    it('should return the most recent audit', async () => {
      // Clear and schedule audits
      await service.clearAuditData();
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      const audit1 = await service.scheduleAudit({});
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const audit2 = await service.scheduleAudit({});

      const result = await service.getLatestAudit();

      expect(result?.id).toBe(audit2.id);
    });
  });

  describe('getAuditSummary', () => {
    it('should return audit summary with defaults when no audits exist', async () => {
      await service.clearAuditData();

      const result = await service.getAuditSummary();

      expect(result).toMatchObject({
        totalAudits: 0,
        currentScore: 0,
        scoreTrend: 0,
        openIssues: 0,
        resolvedIssues: 0,
        criticalIssues: 0,
      });
    });

    it('should return correct summary when audits exist', async () => {
      await service.clearAuditData();
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);

      await service.scheduleAudit({});

      const result = await service.getAuditSummary();

      expect(result.totalAudits).toBe(1);
      expect(result.topIssues).toBeInstanceOf(Array);
    });
  });

  describe('getIssues', () => {
    it('should return empty issues list when no issues exist', async () => {
      await service.clearAuditData();

      const result = await service.getIssues({});

      expect(result).toMatchObject({
        issues: [],
        total: 0,
        page: 1,
        limit: 50,
      });
    });

    it('should filter issues by severity', async () => {
      const query = { severity: SEOIssueSeverity.CRITICAL };

      const result = await service.getIssues(query);

      expect(result.issues.every((i) => i.severity === SEOIssueSeverity.CRITICAL || result.issues.length === 0)).toBe(true);
    });

    it('should filter issues by category', async () => {
      const query = { category: SEOIssueCategory.META };

      const result = await service.getIssues(query);

      expect(result.issues.every((i) => i.category === SEOIssueCategory.META || result.issues.length === 0)).toBe(true);
    });

    it('should filter issues by URL pattern', async () => {
      const query = { urlPattern: 'products' };

      const result = await service.getIssues(query);

      expect(result.issues.every((i) => /products/i.test(i.url) || result.issues.length === 0)).toBe(true);
    });

    it('should respect pagination parameters', async () => {
      const query = { page: 2, limit: 10 };

      const result = await service.getIssues(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should sort issues when sortBy is provided', async () => {
      const query = { sortBy: 'severity', sortOrder: 'desc' as const };

      const result = await service.getIssues(query);

      expect(result.issues).toBeInstanceOf(Array);
    });
  });

  describe('getBrokenLinks', () => {
    it('should return broken links array', async () => {
      const result = await service.getBrokenLinks();

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getRedirectChains', () => {
    it('should return redirect chains array', async () => {
      const result = await service.getRedirectChains();

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('resolveIssue', () => {
    it('should return false when issue does not exist', async () => {
      const result = await service.resolveIssue('nonexistent-issue-id');

      expect(result).toBe(false);
    });
  });

  describe('clearAuditData', () => {
    it('should clear all audit data', async () => {
      // Schedule an audit first
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.category.findMany.mockResolvedValue([]);
      await service.scheduleAudit({});

      await service.clearAuditData();

      const latestAudit = await service.getLatestAudit();
      expect(latestAudit).toBeNull();

      const brokenLinks = await service.getBrokenLinks();
      expect(brokenLinks).toHaveLength(0);

      const redirectChains = await service.getRedirectChains();
      expect(redirectChains).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should work with default APP_URL when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const newService = module.get<AuditService>(AuditService);
      expect(newService).toBeDefined();
    });
  });
});
