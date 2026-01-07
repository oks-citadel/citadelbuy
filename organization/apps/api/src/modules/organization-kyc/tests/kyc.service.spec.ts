import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from '../services/kyc.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../../organization-audit/services/audit.service';
import { KycVerificationProcessor } from '../processors/kyc-verification.processor';
import { ConfigService } from '@nestjs/config';
import { DocumentStorageService } from '../services/document-storage.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { KycReviewDecision } from '../dto/review-kyc.dto';

describe('KycService', () => {
  let service: KycService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let verificationProcessor: jest.Mocked<KycVerificationProcessor>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    kycApplication: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockVerificationProcessor = {
    processVerification: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: KycVerificationProcessor,
          useValue: mockVerificationProcessor,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DocumentStorageService,
          useValue: {
            uploadDocument: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.pdf', key: 'doc-key' }),
            deleteDocument: jest.fn().mockResolvedValue(undefined),
            getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com'),
          },
        },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);
    verificationProcessor = module.get(KycVerificationProcessor);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitKyc', () => {
    const organizationId = 'org-123';
    const userId = 'user-123';
    const kycDto = {
      idType: 'BUSINESS_REGISTRATION',
      businessType: 'LLC',
      businessAddress: '123 Main St',
      businessCity: 'New York',
      businessState: 'NY',
      businessPostalCode: '10001',
      businessCountry: 'US',
      taxId: '12-3456789',
      businessRegistrationNumber: 'REG123456',
    };

    it('should submit KYC application successfully for new application', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
      };

      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        status: 'DOCUMENTS_SUBMITTED',
        idType: 'BUSINESS_REGISTRATION',
        submittedAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue(mockKycApplication as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.submitKyc(organizationId, userId, kycDto, '127.0.0.1');

      expect(result).toEqual({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
        submittedAt: mockKycApplication.submittedAt,
      });

      expect(mockPrismaService.kycApplication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          idType: 'BUSINESS_REGISTRATION',
          status: 'DOCUMENTS_SUBMITTED',
          submittedAt: expect.any(Date),
        }),
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          userId,
          action: 'kyc.submitted',
          resource: 'kyc_application',
          resourceId: 'kyc-123',
        }),
      );
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.submitKyc(organizationId, userId, kycDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if KYC already submitted', async () => {
      const mockOrganization = { id: organizationId };
      const existingKyc = {
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(existingKyc as any);

      await expect(service.submitKyc(organizationId, userId, kycDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow resubmission if KYC was rejected', async () => {
      const mockOrganization = { id: organizationId };
      const rejectedKyc = {
        id: 'kyc-123',
        status: 'REJECTED',
        organizationId,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(rejectedKyc as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...rejectedKyc,
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.submitKyc(organizationId, userId, kycDto);

      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
      expect(mockPrismaService.kycApplication.update).toHaveBeenCalled();
    });

    it('should allow resubmission if KYC is in NOT_STARTED status', async () => {
      const mockOrganization = { id: organizationId };
      const notStartedKyc = {
        id: 'kyc-123',
        status: 'NOT_STARTED',
        organizationId,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(notStartedKyc as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...notStartedKyc,
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.submitKyc(organizationId, userId, kycDto);

      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
    });

    it('should encrypt sensitive data (taxId and registration number)', async () => {
      const mockOrganization = { id: organizationId };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.submitKyc(organizationId, userId, kycDto);

      expect(mockPrismaService.kycApplication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          verificationData: expect.objectContaining({
            encryptedTaxId: expect.objectContaining({
              encrypted: expect.any(String),
              iv: expect.any(String),
              authTag: expect.any(String),
            }),
            encryptedRegNumber: expect.objectContaining({
              encrypted: expect.any(String),
              iv: expect.any(String),
              authTag: expect.any(String),
            }),
          }),
        }),
      });
    });

    it('should mask PII in audit logs', async () => {
      const mockOrganization = { id: organizationId };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.submitKyc(organizationId, userId, kycDto);

      const auditCall = mockAuditService.log.mock.calls[0][0];
      // PII masking shows first 2 and last 2 characters: "12******89"
      expect(auditCall.metadata.taxId).toMatch(/^\d{2}\*+\d{2}$/);
      expect(auditCall.metadata.taxId).not.toBe(kycDto.taxId);
    });
  });

  describe('getKycStatus', () => {
    const organizationId = 'org-123';

    it('should return KYC status successfully', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        status: 'APPROVED',
        idType: 'BUSINESS_REGISTRATION',
        idVerified: true,
        addressVerified: true,
        businessVerified: true,
        submittedAt: new Date('2021-01-01'),
        reviewedAt: new Date('2021-01-05'),
        reviewNotes: 'All documents verified',
        rejectionReason: null,
        verificationScore: 95,
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);

      const result = await service.getKycStatus(organizationId);

      expect(result).toEqual({
        id: 'kyc-123',
        status: 'APPROVED',
        idType: 'BUSINESS_REGISTRATION',
        idVerified: true,
        addressVerified: true,
        businessVerified: true,
        submittedAt: mockKycApplication.submittedAt,
        reviewedAt: mockKycApplication.reviewedAt,
        reviewNotes: 'All documents verified',
        rejectionReason: null,
        verificationScore: 95,
      });
    });

    it('should throw NotFoundException if KYC application not found', async () => {
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);

      await expect(service.getKycStatus(organizationId)).rejects.toThrow(NotFoundException);
    });

    it('should not include encrypted data in response', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        status: 'APPROVED',
        verificationData: {
          encryptedTaxId: { encrypted: 'xxx', iv: 'xxx', authTag: 'xxx' },
        },
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);

      const result = await service.getKycStatus(organizationId);

      expect(result).not.toHaveProperty('verificationData');
    });
  });

  describe('uploadDocument', () => {
    const organizationId = 'org-123';
    const userId = 'user-123';
    const uploadDto = {
      documentType: 'id_document' as const,
      fileName: 'passport.pdf',
      contentType: 'application/pdf',
    };

    it('should generate upload URL successfully', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue(mockKycApplication as any);
      mockAuditService.log.mockResolvedValue(undefined);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const result = await service.uploadDocument(organizationId, userId, uploadDto);

      expect(result).toEqual({
        uploadUrl: expect.stringMatching(/^http:\/\/localhost:3000\/api\/kyc\/upload\/.+$/),
        expiresAt: expect.any(Date),
        documentType: 'id_document',
      });

      expect(mockPrismaService.kycApplication.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if KYC application not found', async () => {
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);

      await expect(service.uploadDocument(organizationId, userId, uploadDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject invalid file types when uploading with buffer', async () => {
      const mockKycApplication = { id: 'kyc-123' };
      const invalidDto = {
        ...uploadDto,
        contentType: 'application/exe',
      };
      const mockBuffer = Buffer.from('test');

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);

      // The DocumentStorageService validates file types and throws BadRequestException
      const documentStorageService = service['documentStorage'];
      jest.spyOn(documentStorageService, 'uploadDocument').mockRejectedValue(
        new BadRequestException('Invalid file type. Only PDF and images (JPEG, PNG, HEIC) are allowed.')
      );

      await expect(
        service.uploadDocument(organizationId, userId, invalidDto, mockBuffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid image types (JPEG, PNG)', async () => {
      const mockKycApplication = { id: 'kyc-123', organizationId };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue(mockKycApplication as any);
      mockAuditService.log.mockResolvedValue(undefined);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      const jpegDto = { ...uploadDto, contentType: 'image/jpeg' };
      const result1 = await service.uploadDocument(organizationId, userId, jpegDto);
      expect(result1.uploadUrl).toBeDefined();

      const pngDto = { ...uploadDto, contentType: 'image/png' };
      const result2 = await service.uploadDocument(organizationId, userId, pngDto);
      expect(result2.uploadUrl).toBeDefined();
    });

    it('should update correct document field based on document type', async () => {
      const mockKycApplication = { id: 'kyc-123', organizationId };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue(mockKycApplication as any);
      mockAuditService.log.mockResolvedValue(undefined);
      mockConfigService.get.mockReturnValue('http://localhost:3000');

      await service.uploadDocument(organizationId, userId, uploadDto);

      expect(mockPrismaService.kycApplication.update).toHaveBeenCalledWith({
        where: { id: 'kyc-123' },
        data: expect.objectContaining({
          idDocumentUrl: expect.any(String),
        }),
      });
    });

    it('should trigger verification when documents are uploaded with buffer', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        idDocumentUrl: 'existing-url',
      };
      const mockBuffer = Buffer.from('test document content');

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.findUnique.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue(mockKycApplication as any);
      mockAuditService.log.mockResolvedValue(undefined);
      mockConfigService.get.mockReturnValue('http://localhost:3000');
      mockVerificationProcessor.processVerification.mockResolvedValue(undefined);

      await service.uploadDocument(organizationId, userId, uploadDto, mockBuffer);

      expect(mockVerificationProcessor.processVerification).toHaveBeenCalledWith('kyc-123');
    });
  });

  describe('reviewKyc', () => {
    const organizationId = 'org-123';
    const reviewerId = 'admin-123';

    it('should approve KYC successfully', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        status: 'DOCUMENTS_SUBMITTED',
      };

      const reviewDto = {
        decision: KycReviewDecision.APPROVE,
        reviewNotes: 'All documents verified',
        idVerified: true,
        addressVerified: true,
        businessVerified: true,
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...mockKycApplication,
        status: 'APPROVED',
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.reviewKyc(organizationId, reviewerId, reviewDto);

      expect(result.status).toBe('APPROVED');
      expect(result.expiresAt).toBeDefined();
      expect(mockPrismaService.kycApplication.update).toHaveBeenCalledWith({
        where: { id: 'kyc-123' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewerId,
          reviewNotes: 'All documents verified',
          idVerified: true,
          addressVerified: true,
          businessVerified: true,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should reject KYC with reason', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        status: 'UNDER_REVIEW',
      };

      const reviewDto = {
        decision: KycReviewDecision.REJECT,
        reviewNotes: 'Invalid documents',
        rejectionReason: 'Documents are blurry and unreadable',
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...mockKycApplication,
        status: 'REJECTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.reviewKyc(organizationId, reviewerId, reviewDto);

      expect(result.status).toBe('REJECTED');
      expect(mockPrismaService.kycApplication.update).toHaveBeenCalledWith({
        where: { id: 'kyc-123' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Documents are blurry and unreadable',
        }),
      });
    });

    it('should throw BadRequestException if rejecting without reason', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      };

      const reviewDto = {
        decision: KycReviewDecision.REJECT,
        reviewNotes: 'Rejected',
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);

      await expect(
        service.reviewKyc(organizationId, reviewerId, reviewDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should request more info', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        status: 'UNDER_REVIEW',
      };

      const reviewDto = {
        decision: KycReviewDecision.REQUEST_MORE_INFO,
        reviewNotes: 'Please provide clearer photos',
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...mockKycApplication,
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.reviewKyc(organizationId, reviewerId, reviewDto);

      expect(result.status).toBe('DOCUMENTS_SUBMITTED');
    });

    it('should throw NotFoundException if KYC application not found', async () => {
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);

      const reviewDto = {
        decision: KycReviewDecision.APPROVE,
      };

      await expect(service.reviewKyc(organizationId, reviewerId, reviewDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if KYC not in reviewable state', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        status: 'APPROVED',
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);

      const reviewDto = {
        decision: KycReviewDecision.APPROVE,
      };

      await expect(service.reviewKyc(organizationId, reviewerId, reviewDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log audit event for review', async () => {
      const mockKycApplication = {
        id: 'kyc-123',
        organizationId,
        status: 'DOCUMENTS_SUBMITTED',
      };

      const reviewDto = {
        decision: KycReviewDecision.APPROVE,
        reviewNotes: 'Approved',
      };

      mockPrismaService.kycApplication.findFirst.mockResolvedValue(mockKycApplication as any);
      mockPrismaService.kycApplication.update.mockResolvedValue({
        ...mockKycApplication,
        status: 'APPROVED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.reviewKyc(organizationId, reviewerId, reviewDto, '127.0.0.1');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          userId: reviewerId,
          action: `kyc.${KycReviewDecision.APPROVE}`,
          resource: 'kyc_application',
          ipAddress: '127.0.0.1',
        }),
      );
    });
  });

  describe('getPendingApplications', () => {
    it('should return pending applications with pagination', async () => {
      const mockApplications = [
        {
          id: 'kyc-1',
          organizationId: 'org-1',
          status: 'DOCUMENTS_SUBMITTED',
          idType: 'PASSPORT',
          submittedAt: new Date('2021-01-01'),
          idVerified: false,
          addressVerified: false,
          businessVerified: false,
          organization: {
            id: 'org-1',
            name: 'Org 1',
            primaryEmail: 'org1@example.com',
          },
        },
        {
          id: 'kyc-2',
          organizationId: 'org-2',
          status: 'UNDER_REVIEW',
          idType: 'BUSINESS_REGISTRATION',
          submittedAt: new Date('2021-01-02'),
          idVerified: true,
          addressVerified: false,
          businessVerified: false,
          organization: {
            id: 'org-2',
            name: 'Org 2',
            primaryEmail: 'org2@example.com',
          },
        },
      ];

      mockPrismaService.kycApplication.findMany.mockResolvedValue(mockApplications as any);
      mockPrismaService.kycApplication.count.mockResolvedValue(2);

      const result = await service.getPendingApplications(10, 0);

      expect(result).toEqual({
        data: mockApplications.map((app) => ({
          id: app.id,
          organizationId: app.organizationId,
          organizationName: app.organization.name,
          status: app.status,
          idType: app.idType,
          submittedAt: app.submittedAt,
          idVerified: app.idVerified,
          addressVerified: app.addressVerified,
          businessVerified: app.businessVerified,
        })),
        total: 2,
        limit: 10,
        offset: 0,
      });
    });

    it('should filter by DOCUMENTS_SUBMITTED and UNDER_REVIEW statuses', async () => {
      mockPrismaService.kycApplication.findMany.mockResolvedValue([]);
      mockPrismaService.kycApplication.count.mockResolvedValue(0);

      await service.getPendingApplications();

      expect(mockPrismaService.kycApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              in: ['DOCUMENTS_SUBMITTED', 'UNDER_REVIEW'],
            },
          },
        }),
      );
    });

    it('should order by submittedAt ascending', async () => {
      mockPrismaService.kycApplication.findMany.mockResolvedValue([]);
      mockPrismaService.kycApplication.count.mockResolvedValue(0);

      await service.getPendingApplications();

      expect(mockPrismaService.kycApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            submittedAt: 'asc',
          },
        }),
      );
    });

    it('should apply custom limit and offset', async () => {
      mockPrismaService.kycApplication.findMany.mockResolvedValue([]);
      mockPrismaService.kycApplication.count.mockResolvedValue(100);

      await service.getPendingApplications(25, 50);

      expect(mockPrismaService.kycApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        }),
      );
    });

    it('should return empty array if no pending applications', async () => {
      mockPrismaService.kycApplication.findMany.mockResolvedValue([]);
      mockPrismaService.kycApplication.count.mockResolvedValue(0);

      const result = await service.getPendingApplications();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('encryption and PII masking', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';
      const sensitiveData = 'sensitive-tax-id-123';

      const kycDto = {
        idType: 'BUSINESS_REGISTRATION',
        businessType: 'LLC',
        businessAddress: '123 Main St',
        businessCity: 'New York',
        businessState: 'NY',
        businessPostalCode: '10001',
        businessCountry: 'US',
        taxId: sensitiveData,
        businessRegistrationNumber: 'REG123',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue({ id: organizationId } as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.submitKyc(organizationId, userId, kycDto);

      const createCall = mockPrismaService.kycApplication.create.mock.calls[0][0];
      const encryptedTaxId = createCall.data.verificationData.encryptedTaxId;

      expect(encryptedTaxId).toHaveProperty('encrypted');
      expect(encryptedTaxId).toHaveProperty('iv');
      expect(encryptedTaxId).toHaveProperty('authTag');
      expect(encryptedTaxId.encrypted).not.toBe(sensitiveData);
    });

    it('should mask PII correctly', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';

      const kycDto = {
        idType: 'BUSINESS_REGISTRATION',
        businessType: 'LLC',
        businessAddress: '123 Main St',
        businessCity: 'New York',
        businessState: 'NY',
        businessPostalCode: '10001',
        businessCountry: 'US',
        taxId: '123456789',
        businessRegistrationNumber: 'REG123',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue({ id: organizationId } as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.submitKyc(organizationId, userId, kycDto);

      const auditCall = mockAuditService.log.mock.calls[0][0];
      expect(auditCall.metadata.taxId).toMatch(/^12\*+89$/);
    });

    it('should handle short PII strings', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';

      const kycDto = {
        idType: 'BUSINESS_REGISTRATION',
        businessType: 'LLC',
        businessAddress: '123 Main St',
        businessCity: 'New York',
        businessState: 'NY',
        businessPostalCode: '10001',
        businessCountry: 'US',
        taxId: 'ABC',
        businessRegistrationNumber: 'REG123',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue({ id: organizationId } as any);
      mockPrismaService.kycApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.kycApplication.create.mockResolvedValue({
        id: 'kyc-123',
        status: 'DOCUMENTS_SUBMITTED',
      } as any);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.submitKyc(organizationId, userId, kycDto);

      const auditCall = mockAuditService.log.mock.calls[0][0];
      expect(auditCall.metadata.taxId).toBe('***');
    });
  });
});
