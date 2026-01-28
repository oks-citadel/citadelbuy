import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  VendorVerificationService,
  VerificationTier,
  VendorVerificationProfile,
} from './vendor-verification.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('VendorVerificationService', () => {
  let service: VendorVerificationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorVerificationService,
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

    service = module.get<VendorVerificationService>(VendorVerificationService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRegionalRequirements', () => {
    it('should return Africa regional requirements', () => {
      const requirements = service.getRegionalRequirements('AFRICA');

      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.some((r) => r.country === 'Nigeria')).toBe(true);
      expect(requirements.some((r) => r.country === 'Kenya')).toBe(true);
      expect(requirements.some((r) => r.country === 'South Africa')).toBe(true);
    });

    it('should return North America regional requirements', () => {
      const requirements = service.getRegionalRequirements('NORTH_AMERICA');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'US')).toBe(true);
      expect(requirements.some((r) => r.country === 'CA')).toBe(true);
    });

    it('should return Europe regional requirements', () => {
      const requirements = service.getRegionalRequirements('EUROPE');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'EU')).toBe(true);
      expect(requirements.some((r) => r.country === 'UK')).toBe(true);
    });

    it('should return Middle East regional requirements', () => {
      const requirements = service.getRegionalRequirements('MIDDLE_EAST');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'UAE')).toBe(true);
      expect(requirements.some((r) => r.country === 'SA')).toBe(true);
    });

    it('should return Asia Pacific regional requirements', () => {
      const requirements = service.getRegionalRequirements('ASIA_PACIFIC');

      expect(requirements).toBeDefined();
      expect(requirements.some((r) => r.country === 'SG')).toBe(true);
      expect(requirements.some((r) => r.country === 'AU')).toBe(true);
    });

    it('should filter by country when provided', () => {
      const requirements = service.getRegionalRequirements('AFRICA', 'Nigeria');

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(1);
      expect(requirements[0].country).toBe('Nigeria');
    });

    it('should return empty array for unknown region', () => {
      const requirements = service.getRegionalRequirements('UNKNOWN_REGION');

      expect(requirements).toEqual([]);
    });

    it('should include required document types for Nigeria', () => {
      const requirements = service.getRegionalRequirements('AFRICA', 'Nigeria');

      expect(requirements[0].documentTypes).toContain('CAC Certificate');
      expect(requirements[0].documentTypes).toContain('Tax Clearance');
      expect(requirements[0].documentTypes).toContain('NAFDAC Registration');
    });

    it('should include regulatory bodies for US', () => {
      const requirements = service.getRegionalRequirements('NORTH_AMERICA', 'US');

      expect(requirements[0].regulatoryBodies).toContain('IRS');
      expect(requirements[0].regulatoryBodies).toContain('SEC');
    });
  });

  describe('verifyVendorForRegion', () => {
    it('should verify vendor with all required documents', async () => {
      const vendorId = 'vendor-123';
      const documents = new Map<string, string>();
      documents.set('CAC Certificate', 'https://docs.example.com/cac.pdf');
      documents.set('Tax Clearance', 'https://docs.example.com/tax.pdf');
      documents.set('NAFDAC Registration', 'https://docs.example.com/nafdac.pdf');

      mockPrismaService.vendorProfile.update.mockResolvedValue({});

      const result = await service.verifyVendorForRegion(
        vendorId,
        'AFRICA',
        'Nigeria',
        documents,
      );

      expect(result.verified).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });

    it('should return missing requirements when documents are incomplete', async () => {
      const vendorId = 'vendor-123';
      const documents = new Map<string, string>();
      documents.set('CAC Certificate', 'https://docs.example.com/cac.pdf');

      mockPrismaService.vendorProfile.update.mockResolvedValue({});

      const result = await service.verifyVendorForRegion(
        vendorId,
        'AFRICA',
        'Nigeria',
        documents,
      );

      expect(result.verified).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
      expect(result.missingRequirements.some((r) => r.includes('Tax Clearance'))).toBe(true);
    });

    it('should return error for undefined region', async () => {
      const vendorId = 'vendor-123';
      const documents = new Map<string, string>();

      const result = await service.verifyVendorForRegion(
        vendorId,
        'UNDEFINED_REGION',
        'XX',
        documents,
      );

      expect(result.verified).toBe(false);
      expect(result.missingRequirements).toContain('No regional requirements defined');
    });
  });

  describe('createVerificationProfile', () => {
    it('should create verification profile for verified vendor', async () => {
      const mockVendor = {
        id: 'vendor-123',
        isVerified: true,
        status: 'ACTIVE',
        stripeAccountId: 'acct_123',
        totalOrders: 150,
        averageRating: 4.7,
        totalRevenue: 25000,
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
        bankName: 'Test Bank',
        application: null,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      const profile = await service.createVerificationProfile('vendor-123');

      expect(profile).toBeDefined();
      expect(profile.vendorId).toBe('vendor-123');
      expect(profile.tier).toBeDefined();
      expect(profile.verifications).toBeDefined();
      expect(profile.verifications.identity.verified).toBe(true);
      expect(profile.verifications.business.verified).toBe(true);
      expect(profile.verifications.financial.verified).toBe(true);
      expect(profile.trustScore).toBeGreaterThan(0);
    });

    it('should throw error when vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.createVerificationProfile('nonexistent')).rejects.toThrow(
        'Vendor not found',
      );
    });

    it('should include badges based on vendor performance', async () => {
      const mockVendor = {
        id: 'vendor-123',
        isVerified: true,
        status: 'ACTIVE',
        stripeAccountId: 'acct_123',
        totalOrders: 1500,
        averageRating: 4.9,
        totalRevenue: 100000,
        createdAt: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000), // 800 days ago
        bankName: 'Test Bank',
        application: null,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      const profile = await service.createVerificationProfile('vendor-123');

      expect(profile.badges).toContain('VERIFIED_BUSINESS');
      expect(profile.badges).toContain('TRUSTED_SELLER');
      expect(profile.badges).toContain('TOP_RATED');
      expect(profile.badges).toContain('ESTABLISHED_VENDOR');
    });

    it('should set appropriate verification tier based on trust score', async () => {
      const mockVendor = {
        id: 'vendor-123',
        isVerified: true,
        status: 'ACTIVE',
        stripeAccountId: 'acct_123',
        totalOrders: 1500,
        averageRating: 4.9,
        totalRevenue: 100000,
        createdAt: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000),
        bankName: 'Test Bank',
        application: null,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      const profile = await service.createVerificationProfile('vendor-123');

      expect([
        VerificationTier.PLATINUM,
        VerificationTier.GOLD,
        VerificationTier.SILVER,
        VerificationTier.BRONZE,
      ]).toContain(profile.tier);
    });
  });

  describe('verifyMultiRegional', () => {
    it('should verify vendor across multiple regions', async () => {
      const vendorId = 'vendor-123';
      const targetRegions = [
        { region: 'AFRICA', country: 'Nigeria' },
        { region: 'EUROPE', country: 'EU' },
      ];

      const mockVendor = {
        id: vendorId,
        application: {
          documentsSubmitted: [],
        },
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendorProfile.update.mockResolvedValue({});

      const results = await service.verifyMultiRegional(vendorId, targetRegions);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);
      expect(results.has('AFRICA-Nigeria')).toBe(true);
      expect(results.has('EUROPE-EU')).toBe(true);
    });
  });

  describe('upgradeTier', () => {
    it('should upgrade tier when requirements are met', async () => {
      const mockVendor = {
        id: 'vendor-123',
        isVerified: true,
        status: 'ACTIVE',
        stripeAccountId: 'acct_123',
        totalOrders: 100,
        averageRating: 4.5,
        totalRevenue: 10000,
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        bankName: 'Test Bank',
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendorProfile.update.mockResolvedValue(mockVendor);

      const result = await service.upgradeTier('vendor-123', VerificationTier.SILVER);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.requirements).toBeDefined();
    });

    it('should throw error when vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.upgradeTier('nonexistent', VerificationTier.GOLD),
      ).rejects.toThrow('Vendor not found');
    });

    it('should return requirements when upgrade fails', async () => {
      const mockVendor = {
        id: 'vendor-123',
        isVerified: false,
        status: 'PENDING',
        stripeAccountId: null,
        totalOrders: 0,
        averageRating: 0,
        totalRevenue: 0,
        createdAt: new Date(),
        bankName: null,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      const result = await service.upgradeTier('vendor-123', VerificationTier.PLATINUM);

      expect(result.success).toBe(false);
      expect(result.requirements.length).toBeGreaterThan(0);
    });
  });

  describe('getRegionalVerifications', () => {
    it('should return regional verifications for vendor', async () => {
      const mockVendor = {
        id: 'vendor-123',
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      const result = await service.getRegionalVerifications('vendor-123');

      expect(result).toBeDefined();
      expect(result.vendorId).toBe('vendor-123');
      expect(result.regions).toBeDefined();
      expect(result.verifiedRegions).toBeDefined();
      expect(result.pendingRegions).toBeDefined();
    });
  });
});
