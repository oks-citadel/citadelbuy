import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  KYBService,
  KYBStatus,
  BusinessVerificationLevel,
  KYBVerificationRequest,
  KYBVerificationResult,
} from './kyb.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('KYBService', () => {
  let service: KYBService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorApplication: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    vendorProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockVerificationRequest = (
    overrides: Partial<KYBVerificationRequest> = {},
  ): KYBVerificationRequest => ({
    vendorId: 'vendor-123',
    businessName: 'Test Business Inc',
    registrationNumber: 'REG123456',
    taxId: 'TAX987654',
    businessType: 'LLC',
    country: 'US',
    jurisdiction: 'Delaware',
    incorporationDate: new Date('2020-01-15'),
    registeredAddress: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    beneficialOwners: [
      {
        name: 'John Doe',
        ownershipPercentage: 60,
        dateOfBirth: new Date('1985-05-15'),
        nationality: 'US',
        isPEP: false,
      },
    ],
    documents: {
      certificateOfIncorporation: 'https://docs.example.com/incorporation.pdf',
      taxCertificate: 'https://docs.example.com/tax.pdf',
    },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KYBService,
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

    service = module.get<KYBService>(KYBService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateVerification', () => {
    it('should initiate KYB verification and return application ID', async () => {
      const request = createMockVerificationRequest();
      const mockApplication = {
        id: 'app-123',
        status: 'UNDER_REVIEW',
        applicationData: {
          ...request,
          kybInitiatedAt: expect.any(String),
        },
      };

      mockPrismaService.vendorApplication.update.mockResolvedValue(mockApplication);

      const result = await service.initiateVerification(request);

      expect(result).toBe('app-123');
      expect(mockPrismaService.vendorApplication.update).toHaveBeenCalledWith({
        where: { vendorProfileId: request.vendorId },
        data: {
          status: 'UNDER_REVIEW',
          applicationData: expect.objectContaining({
            vendorId: request.vendorId,
            businessName: request.businessName,
          }),
        },
      });
    });

    it('should update application status to UNDER_REVIEW', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({
        id: 'app-123',
        status: 'UNDER_REVIEW',
      });

      await service.initiateVerification(request);

      expect(mockPrismaService.vendorApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'UNDER_REVIEW',
          }),
        }),
      );
    });
  });

  describe('performVerification', () => {
    it('should perform full KYB verification and return result', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.verificationLevel).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.reviewedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should return APPROVED status for high score', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      // With all checks passing, score should be >= 75
      expect(result.status).toBe(KYBStatus.APPROVED);
      expect(result.score).toBeGreaterThanOrEqual(75);
    });

    it('should include all verification checks in result', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.businessRegistration).toBeDefined();
      expect(result.checks.taxIdValidation).toBeDefined();
      expect(result.checks.addressVerification).toBeDefined();
      expect(result.checks.uboVerification).toBeDefined();
      expect(result.checks.sanctionsCheck).toBeDefined();
      expect(result.checks.adverseMediaCheck).toBeDefined();
    });

    it('should set expiry date to 1 year from now', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(result.expiresAt.getTime() - oneYearFromNow.getTime());

      // Allow 1 second tolerance
      expect(diff).toBeLessThan(1000);
    });

    it('should store verification result in database', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      await service.performVerification('app-123', request);

      expect(mockPrismaService.vendorApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        data: expect.objectContaining({
          applicationData: expect.objectContaining({
            kybVerification: expect.any(Object),
          }),
        }),
      });
    });

    it('should return BASIC verification level when minimal checks pass', async () => {
      const request = createMockVerificationRequest({
        beneficialOwners: [], // No UBO provided
        documents: {}, // No documents
      });
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect([
        BusinessVerificationLevel.BASIC,
        BusinessVerificationLevel.STANDARD,
      ]).toContain(result.verificationLevel);
    });

    it('should return ENHANCED verification level with all documents', async () => {
      const request = createMockVerificationRequest({
        documents: {
          certificateOfIncorporation: 'https://docs.example.com/inc.pdf',
          taxCertificate: 'https://docs.example.com/tax.pdf',
          financialStatements: 'https://docs.example.com/financials.pdf',
          uboCertificate: 'https://docs.example.com/ubo.pdf',
        },
      });
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.verificationLevel).toBe(BusinessVerificationLevel.ENHANCED);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification result when available', async () => {
      const mockApplication = {
        id: 'app-123',
        applicationData: {
          kybVerification: {
            status: KYBStatus.APPROVED,
            score: 85,
            verificationLevel: BusinessVerificationLevel.STANDARD,
          },
        },
      };

      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(mockApplication);

      const result = await service.getVerificationStatus('app-123');

      expect(result).toBeDefined();
      expect(result?.status).toBe(KYBStatus.APPROVED);
      expect(result?.score).toBe(85);
    });

    it('should return null when application not found', async () => {
      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(null);

      const result = await service.getVerificationStatus('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when no verification data exists', async () => {
      const mockApplication = {
        id: 'app-123',
        applicationData: {},
      };

      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(mockApplication);

      const result = await service.getVerificationStatus('app-123');

      expect(result).toBeNull();
    });

    it('should return null when applicationData is null', async () => {
      const mockApplication = {
        id: 'app-123',
        applicationData: null,
      };

      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(mockApplication);

      const result = await service.getVerificationStatus('app-123');

      expect(result).toBeNull();
    });
  });

  describe('renewVerification', () => {
    it('should initiate renewal for existing vendor', async () => {
      const mockVendor = {
        id: 'vendor-123',
        application: {
          id: 'app-123',
          applicationData: createMockVerificationRequest(),
        },
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendorApplication.update.mockResolvedValue({
        id: 'app-123',
      });

      const result = await service.renewVerification('vendor-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.vendorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendor-123' },
        include: { application: true },
      });
    });

    it('should throw error when vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.renewVerification('nonexistent')).rejects.toThrow(
        'Vendor or application not found',
      );
    });

    it('should throw error when application not found', async () => {
      const mockVendor = {
        id: 'vendor-123',
        application: null,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendor);

      await expect(service.renewVerification('vendor-123')).rejects.toThrow(
        'Vendor or application not found',
      );
    });
  });

  describe('risk calculation', () => {
    it('should add risk for missing UBO information', async () => {
      const request = createMockVerificationRequest({
        beneficialOwners: [],
      });
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.risks.some((r) => r.type === 'UBO')).toBe(true);
    });

    it('should generate recommendations based on risks', async () => {
      const request = createMockVerificationRequest({
        beneficialOwners: [],
      });
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some((r) => r.includes('beneficial ownership')),
      ).toBe(true);
    });

    it('should clear sanctions check for compliant entity', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.sanctionsCheck.cleared).toBe(true);
      expect(result.checks.sanctionsCheck.matches).toHaveLength(0);
    });

    it('should clear adverse media check for compliant entity', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.adverseMediaCheck.cleared).toBe(true);
      expect(result.checks.adverseMediaCheck.findings).toHaveLength(0);
    });
  });

  describe('verification checks', () => {
    it('should verify business registration', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.businessRegistration.verified).toBe(true);
      expect(result.checks.businessRegistration.confidence).toBeGreaterThan(0);
      expect(result.checks.businessRegistration.source).toContain('Business Registry');
    });

    it('should verify tax ID', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.taxIdValidation.verified).toBe(true);
      expect(result.checks.taxIdValidation.confidence).toBeGreaterThan(0);
      expect(result.checks.taxIdValidation.source).toContain('Tax Authority');
    });

    it('should verify address', async () => {
      const request = createMockVerificationRequest();
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      expect(result.checks.addressVerification.verified).toBe(true);
      expect(result.checks.addressVerification.confidence).toBeGreaterThan(0);
    });

    it('should verify UBO when provided', async () => {
      const request = createMockVerificationRequest({
        beneficialOwners: [
          {
            name: 'Owner One',
            ownershipPercentage: 30,
            dateOfBirth: new Date('1980-01-01'),
            nationality: 'US',
            isPEP: false,
          },
          {
            name: 'Owner Two',
            ownershipPercentage: 30,
            dateOfBirth: new Date('1975-06-15'),
            nationality: 'US',
            isPEP: false,
          },
        ],
      });
      mockPrismaService.vendorApplication.update.mockResolvedValue({});

      const result = await service.performVerification('app-123', request);

      // Total ownership >= 25% threshold
      expect(result.checks.uboVerification.verified).toBe(true);
    });
  });

  describe('KYBStatus enum', () => {
    it('should have all expected status values', () => {
      expect(KYBStatus.PENDING).toBe('PENDING');
      expect(KYBStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
      expect(KYBStatus.APPROVED).toBe('APPROVED');
      expect(KYBStatus.REJECTED).toBe('REJECTED');
      expect(KYBStatus.REQUIRES_ADDITIONAL_INFO).toBe('REQUIRES_ADDITIONAL_INFO');
    });
  });

  describe('BusinessVerificationLevel enum', () => {
    it('should have all expected verification levels', () => {
      expect(BusinessVerificationLevel.BASIC).toBe('BASIC');
      expect(BusinessVerificationLevel.STANDARD).toBe('STANDARD');
      expect(BusinessVerificationLevel.ENHANCED).toBe('ENHANCED');
      expect(BusinessVerificationLevel.ENTERPRISE).toBe('ENTERPRISE');
    });
  });
});
