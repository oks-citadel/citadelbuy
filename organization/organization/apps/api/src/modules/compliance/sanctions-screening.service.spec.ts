import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import {
  SanctionsScreeningService,
  SanctionsListType,
  ScreeningResult,
} from './sanctions-screening.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('SanctionsScreeningService', () => {
  let service: SanctionsScreeningService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    vendor: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        SANCTIONS_PROVIDER: 'mock',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctionsScreeningService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SanctionsScreeningService>(SanctionsScreeningService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('screenEntity', () => {
    it('should return CLEAR status for non-sanctioned entity', async () => {
      const result = await service.screenEntity(
        'Acme Corporation',
        'BUSINESS',
        'US',
        { taxId: '123456789' },
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('CLEAR');
      expect(result.riskLevel).toBe('LOW');
      expect(result.recommendation).toBe('APPROVE');
      expect(result.matches).toHaveLength(0);
      expect(result.requiresManualReview).toBe(false);
    });

    it('should include all sanctions lists in screening', async () => {
      const result = await service.screenEntity(
        'Test Business',
        'BUSINESS',
        'US',
      );

      expect(result.listsChecked).toContain(SanctionsListType.OFAC_SDN);
      expect(result.listsChecked).toContain(SanctionsListType.UN_SANCTIONS);
      expect(result.listsChecked).toContain(SanctionsListType.EU_SANCTIONS);
      expect(result.listsChecked).toContain(SanctionsListType.UK_HMT);
      expect(result.listsChecked).toContain(SanctionsListType.ADVERSE_MEDIA);
    });

    it('should include PEP screening for individuals', async () => {
      const result = await service.screenEntity(
        'John Doe',
        'INDIVIDUAL',
        'US',
        { dateOfBirth: '1990-01-01' },
      );

      expect(result.listsChecked).toContain(SanctionsListType.PEP);
    });

    it('should not include PEP screening for businesses', async () => {
      const result = await service.screenEntity(
        'Test Corporation',
        'BUSINESS',
        'UK',
      );

      expect(result.listsChecked).not.toContain(SanctionsListType.PEP);
    });

    it('should return match for sanctioned entity keywords', async () => {
      const result = await service.screenEntity(
        'SPECIALLY DESIGNATED NATIONALS TEST',
        'BUSINESS',
        'US',
      );

      expect(result.status).toBe('MATCH');
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.recommendation).toBe('REJECT');
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should set next screening due date to 90 days in the future', async () => {
      const result = await service.screenEntity(
        'Test Company',
        'BUSINESS',
        'US',
      );

      const now = new Date();
      const expectedDueDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(result.nextScreeningDue.getTime() - expectedDueDate.getTime());

      // Allow 1 second tolerance
      expect(diff).toBeLessThan(1000);
    });

    it('should include entity details in result', async () => {
      const result = await service.screenEntity(
        'My Business',
        'BUSINESS',
        'Germany',
        { registrationNumber: 'DE123456' },
      );

      expect(result.screenedEntity.name).toBe('My Business');
      expect(result.screenedEntity.type).toBe('BUSINESS');
      expect(result.screenedEntity.country).toBe('Germany');
      expect(result.screenedEntity.identifiers).toEqual({ registrationNumber: 'DE123456' });
    });
  });

  describe('continuousMonitoring', () => {
    it('should screen vendor when found', async () => {
      const mockVendor = {
        id: 'vendor-123',
        name: 'Test Vendor',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const result = await service.continuousMonitoring('vendor-123');

      expect(result).toBeDefined();
      expect(result.screenedEntity.name).toBe('Test Vendor');
      expect(result.screenedEntity.type).toBe('BUSINESS');
      expect(mockPrismaService.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendor-123' },
      });
    });

    it('should screen user when vendor not found', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.continuousMonitoring('user-123');

      expect(result).toBeDefined();
      expect(result.screenedEntity.name).toBe('Test User');
      expect(result.screenedEntity.type).toBe('INDIVIDUAL');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException when entity not found', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.continuousMonitoring('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkScreen', () => {
    it('should screen multiple entities', async () => {
      const entities = [
        { id: '1', name: 'Company A', type: 'BUSINESS' as const, country: 'US' },
        { id: '2', name: 'Company B', type: 'BUSINESS' as const, country: 'UK' },
        { id: '3', name: 'John Smith', type: 'INDIVIDUAL' as const, country: 'DE' },
      ];

      const results = await service.bulkScreen(entities);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(3);
      expect(results.has('1')).toBe(true);
      expect(results.has('2')).toBe(true);
      expect(results.has('3')).toBe(true);
    });

    it('should return empty map for empty input', async () => {
      const results = await service.bulkScreen([]);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(0);
    });
  });

  describe('screenTransaction', () => {
    it('should approve transaction when both parties are clear', async () => {
      const transaction = {
        senderId: 'sender-123',
        senderName: 'Sender Corp',
        senderCountry: 'US',
        recipientId: 'recipient-456',
        recipientName: 'Recipient Inc',
        recipientCountry: 'UK',
        amount: 10000,
        currency: 'USD',
      };

      const result = await service.screenTransaction(transaction);

      expect(result.approved).toBe(true);
      expect(result.senderScreening.status).toBe('CLEAR');
      expect(result.recipientScreening.status).toBe('CLEAR');
      expect(result.riskLevel).toBe('LOW');
    });

    it('should reject transaction when sender matches sanctions', async () => {
      const transaction = {
        senderId: 'sender-123',
        senderName: 'SPECIALLY DESIGNATED NATIONALS',
        senderCountry: 'US',
        recipientId: 'recipient-456',
        recipientName: 'Recipient Inc',
        recipientCountry: 'UK',
        amount: 10000,
        currency: 'USD',
      };

      const result = await service.screenTransaction(transaction);

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe('CRITICAL');
    });

    it('should reject transaction when recipient matches sanctions', async () => {
      const transaction = {
        senderId: 'sender-123',
        senderName: 'Safe Sender Corp',
        senderCountry: 'US',
        recipientId: 'recipient-456',
        recipientName: 'BLOCKED PERSONS LIST',
        recipientCountry: 'RU',
        amount: 50000,
        currency: 'USD',
      };

      const result = await service.screenTransaction(transaction);

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe('CRITICAL');
    });
  });

  describe('getScreeningHistory', () => {
    it('should return empty array when no history exists', async () => {
      const history = await service.getScreeningHistory('new-entity-id');

      expect(history).toEqual([]);
    });
  });

  describe('exportScreeningReport', () => {
    it('should export report in JSON format', async () => {
      const mockVendor = {
        id: 'vendor-123',
        name: 'Test Vendor',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const report = await service.exportScreeningReport('vendor-123', 'JSON');

      expect(report).toBeDefined();
      expect(typeof report).toBe('object');
      expect((report as any).entityId).toBe('vendor-123');
      expect((report as any).entityName).toBe('Test Vendor');
      expect((report as any).entityType).toBe('VENDOR');
      expect((report as any).reportGeneratedAt).toBeDefined();
      expect((report as any).screeningHistory).toBeInstanceOf(Array);
    });

    it('should export report as PDF buffer', async () => {
      const mockVendor = {
        id: 'vendor-123',
        name: 'Test Vendor',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const report = await service.exportScreeningReport('vendor-123', 'PDF');

      expect(report).toBeInstanceOf(Buffer);
    });

    it('should include summary in report', async () => {
      const mockVendor = {
        id: 'vendor-123',
        name: 'Test Vendor',
      };

      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const report = await service.exportScreeningReport('vendor-123', 'JSON') as any;

      expect(report.summary).toBeDefined();
      expect(typeof report.summary.totalMatches).toBe('number');
      expect(report.summary.highestRiskLevel).toBeDefined();
      expect(typeof report.summary.requiresAction).toBe('boolean');
    });
  });

  describe('isProviderConfigured', () => {
    it('should return false for mock provider', () => {
      expect(service.isProviderConfigured()).toBe(false);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration', () => {
      const config = service.getProviderConfig();

      expect(config.provider).toBe('mock');
      expect(config.isProduction).toBe(false);
      expect(config.capabilities).toBeInstanceOf(Array);
      expect(config.capabilities).toContain('OFAC Screening');
      expect(config.capabilities).toContain('PEP Screening');
      expect(config.capabilities).toContain('Continuous Monitoring');
    });
  });
});
